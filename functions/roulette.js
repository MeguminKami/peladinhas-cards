import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { HttpsError } from "firebase-functions/v2/https";
import { randomInt } from "node:crypto";
import { walletCall } from "./casino.js";
import {
  CASINO_EDITION,
  currentCasinoWallet,
} from "../js/casino-economy.js";
import {
  ROULETTE,
  ROULETTE_PRIVATE,
  ROULETTE_PUBLIC,
  casinoRouletteReceipt,
  chatColor,
  newChatMessage,
  newRouletteTable,
  nextRoundId,
  rouletteTableView,
  settleRoulettePlan,
  validateRoulettePlan,
} from "./roulette-table.js";

const commandId = (id) =>
  typeof id === "string" && /^[\w-]{16,80}$/.test(id);
const fingerprint = (value) => JSON.stringify(value);
const validateAction = (input) => {
  const allowed = {
    join: ["action", "id"],
    heartbeat: ["action", "id", "table"],
    leave: ["action", "id", "table"],
    balance: ["action", "id", "table"],
    spin: ["action", "id", "table", "plan"],
    tick: ["action", "id", "table"],
    chat: ["action", "id", "table", "message"],
  };
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    !Object.hasOwn(allowed, input.action) ||
    Object.keys(input).some((key) => !allowed[input.action].includes(key)) ||
    !commandId(input.id)
  )
    throw new HttpsError("invalid-argument", "Pedido inválido.");
  if (input.action !== "join" && typeof input.table !== "string")
    throw new HttpsError("invalid-argument", "A sala terminou. Volta ao casino.");
  if (input.action === "chat" && typeof input.message !== "string")
    throw new HttpsError("invalid-argument", "Escreve uma mensagem.");
};

function playerName(name) {
  return Array.from(String(name || "Jogador").trim()).slice(0, 30).join("") || "Jogador";
}

function validatedPlan(value) {
  try {
    return validateRoulettePlan(value);
  } catch (error) {
    throw new HttpsError(
      "invalid-argument",
      error instanceof Error ? error.message : "Aposta inválida.",
      { definitive: true },
    );
  }
}

function validatedMessage(uid, name, color, value, now) {
  try {
    return newChatMessage(uid, name, color, value, now);
  } catch (error) {
    throw new HttpsError(
      "invalid-argument",
      error instanceof Error ? error.message : "Mensagem inválida.",
      { definitive: true },
    );
  }
}

function resolveRound(table, wallets, walletChanged, now, number) {
  const players = table.players.filter((player) => player.plan);
  if (!players.length) {
    table.phase = "betting";
    table.deadline = 0;
    table.players.forEach((player) => {
      player.plan = null;
      player.total = 0;
      player.ready = false;
    });
    return false;
  }
  const results = players.map((player) => {
    const outcome = settleRoulettePlan(player.plan, number);
    if (outcome.gross) {
      const current = wallets[player.uid];
      wallets[player.uid] = casinoRouletteReceipt(
        current,
        outcome.gross,
        `roulette:${table.id}:${table.roundId}:${player.uid}:return`,
        now,
      );
      walletChanged.add(player.uid);
    }
    return {
      uid: player.uid,
      name: player.name,
      color: player.color,
      plan: player.plan,
      total: outcome.cost,
      gross: outcome.gross,
      net: outcome.net,
      lines: outcome.lines,
    };
  });
  table.phase = "betting";
  table.deadline = 0;
  table.players.forEach((player) => {
    player.plan = null;
    player.total = 0;
    player.ready = false;
  });
  table.result = {
    id: table.roundId,
    number,
    color: number === 0 ? "green" : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(number) ? "red" : "black",
    at: now,
    players: results,
  };
  return true;
}

function activePlayers(table, now) {
  return table.players.filter((player) => now - player.seenAt < ROULETTE.lease);
}

function walletFor(wallets, uid, snapshot) {
  const data = snapshot?.data();
  if (!snapshot?.exists || data?.edition !== CASINO_EDITION)
    throw new HttpsError(
      "failed-precondition",
      "Abre primeiro a carteira do casino.",
      { definitive: true },
    );
  const current = currentCasinoWallet(data);
  if (current.edition !== CASINO_EDITION || !Number.isSafeInteger(current.balance))
    throw new HttpsError("failed-precondition", "Carteira indisponível.");
  wallets[uid] ||= current;
  return wallets[uid];
}

export async function runRoulette(input, uid, name, now = Date.now(), db = getFirestore(), forcedNumber) {
  validateAction(input);
  const privateRef = db.doc(ROULETTE_PRIVATE);
  const publicRef = db.doc(ROULETTE_PUBLIC);
  const chatRef =
    input.action === "chat"
      ? publicRef.collection("rouletteMessages").doc(`${uid}_${input.id}`)
      : null;

  return db.runTransaction(async (tx) => {
    const reads = [privateRef];
    if (chatRef) reads.push(chatRef);
    const snapshots = await tx.getAll(...reads);
    const original = snapshots[0].data();
    const chatSnapshot = chatRef ? snapshots[1] : null;
    let table = original ? structuredClone(original) : newRouletteTable(now);
    if (table.edition !== CASINO_EDITION)
      throw new HttpsError("failed-precondition", "A edição da mesa mudou.");
    if (input.action !== "join" && input.table !== table.id)
      throw new HttpsError("failed-precondition", "A sala terminou. Volta ao casino.");

    if (input.action === "chat" && chatSnapshot.exists)
      return {
        table: rouletteTableView(table, now),
        balance: null,
        serverNow: now,
      };

    const previousCommand =
      input.action === "spin"
        ? table.commands.find((command) => command.uid === uid && command.id === input.id)
        : null;
    if (previousCommand) {
      const { plan } = validatedPlan(input.plan);
      if (previousCommand.fingerprint !== fingerprint(plan))
        throw new HttpsError(
          "already-exists",
          "Este pedido já foi usado com outra aposta.",
          { definitive: true },
        );
      const walletSnapshot = await tx.get(db.doc(`casinoWallets/${uid}`));
      const wallet = walletFor({}, uid, walletSnapshot);
      return {
        table: rouletteTableView(table, now),
        roundId: previousCommand.roundId,
        balance: wallet.balance,
        serverNow: now,
      };
    }

    const willAttemptResolve =
      (input.action === "spin" && table.phase === "closing") ||
      (input.action === "tick" &&
        table.phase === "closing" &&
        table.deadline <= now);
    const walletIds = new Set();
    if (["join", "balance", "spin"].includes(input.action) && uid)
      walletIds.add(uid);
    if (willAttemptResolve) {
      for (const player of table.players) if (player.plan) walletIds.add(player.uid);
      if (input.action === "spin" && uid) walletIds.add(uid);
    }
    const walletRefs = [...walletIds].map((id) => db.doc(`casinoWallets/${id}`));
    const walletSnapshots = walletRefs.length
      ? await tx.getAll(...walletRefs)
      : [];
    const wallets = {};
    const walletChanged = new Set();
    for (let i = 0; i < walletRefs.length; i++)
      walletFor(wallets, [...walletIds][i], walletSnapshots[i]);

    let changed = !original;
    let publicChanged = !original;
    let stale = false;
    let spinRoundId = null;
    let balance = uid ? wallets[uid]?.balance ?? null : null;

    if (table.phase === "closing" && table.deadline <= now) {
      changed = resolveRound(table, wallets, walletChanged, now, forcedNumber ?? randomInt(37)) || changed;
      table.revision++;
      publicChanged = true;
      stale = input.action === "spin";
      if (stale) input.action = "tick";
    }

    if (input.action === "join") {
      const wallet = wallets[uid];
      const existing = table.players.find((player) => player.uid === uid);
      const nowActive = activePlayers(table, now);
      if (!existing && nowActive.length >= ROULETTE.maxPlayers)
        throw new HttpsError("resource-exhausted", "A mesa está cheia. Tenta novamente mais tarde.");
      if (existing) {
        existing.name = playerName(name);
        existing.seenAt = now;
      } else {
        table.players = table.players.filter(
          (player) =>
            now - player.seenAt < ROULETTE.lease ||
            (table.phase === "closing" && player.plan),
        );
        table.players.push({
          uid,
          name: playerName(name),
          color: chatColor(table.players, uid),
          seenAt: now,
          plan: null,
          total: 0,
          ready: false,
          lastChatAt: 0,
          leaving: false,
        });
      }
      changed = true;
      publicChanged = true;
      table.revision++;
      balance = wallet.balance;
    } else if (input.action === "balance") {
      if (!table.players.some((player) => player.uid === uid))
        throw new HttpsError("failed-precondition", "Entra primeiro na mesa.");
      return {
        table: rouletteTableView(table, now),
        balance: wallets[uid].balance,
        serverNow: now,
      };
    } else if (input.action === "heartbeat") {
      const player = table.players.find((entry) => entry.uid === uid);
      if (!player) throw new HttpsError("failed-precondition", "Entra primeiro na mesa.");
      player.seenAt = now;
      player.leaving = false;
      changed = true;
      publicChanged = true;
      table.revision++;
    } else if (input.action === "leave") {
      const player = table.players.find((entry) => entry.uid === uid);
      if (!player) return { table: rouletteTableView(table, now), balance, serverNow: now };
      if (table.phase === "closing" && player.plan) {
        player.seenAt = now - ROULETTE.lease;
        player.leaving = true;
      } else {
        table.players = table.players.filter((entry) => entry.uid !== uid);
      }
      changed = true;
      publicChanged = true;
      table.revision++;
    } else if (input.action === "chat") {
      const player = table.players.find((entry) => entry.uid === uid);
      if (!player || now - player.seenAt >= ROULETTE.lease)
        throw new HttpsError("failed-precondition", "Entra novamente na mesa para conversar.");
      if (now - (player.lastChatAt || 0) < 1000)
        throw new HttpsError("resource-exhausted", "Aguarda um instante antes de enviar outra mensagem.");
      const message = validatedMessage(uid, player.name, player.color, input.message, now);
      player.lastChatAt = now;
      player.seenAt = now;
      tx.create(chatRef, {
        ...message,
        expireAt: Timestamp.fromMillis(now + ROULETTE.chatWindow),
      });
      tx.set(privateRef, table);
      return {
        table: rouletteTableView(table, now),
        balance: null,
        serverNow: now,
      };
    } else if (input.action === "spin") {
      const player = table.players.find((entry) => entry.uid === uid);
      if (!player) throw new HttpsError("failed-precondition", "Entra primeiro na mesa.");
      if (player.plan)
        throw new HttpsError("already-exists", "A tua aposta já está fechada nesta ronda.");
      const { plan, total } = validatedPlan(input.plan);
      const wallet = wallets[uid];
      if (wallet.balance < total)
        throw new HttpsError("failed-precondition", "Saldo insuficiente.");
      table.roundId = table.phase === "betting" ? nextRoundId(table) : table.roundId;
      const roundId = table.roundId;
      player.plan = plan;
      player.total = total;
      player.ready = true;
      player.seenAt = now;
      player.leaving = false;
      wallets[uid] = casinoRouletteReceipt(
        wallet,
        -total,
        `roulette:${table.id}:${table.roundId}:${uid}:bet`,
        now,
      );
      walletChanged.add(uid);
      if (table.phase === "betting") {
        const active = activePlayers(table, now);
        if (active.length <= 1) {
          resolveRound(table, wallets, walletChanged, now, forcedNumber ?? randomInt(37));
        } else {
          table.phase = "closing";
          table.deadline = now + ROULETTE.bettingWindow;
        }
      } else {
        const active = activePlayers(table, now);
        if (active.length && active.every((entry) => entry.plan && entry.ready))
          resolveRound(table, wallets, walletChanged, now, forcedNumber ?? randomInt(37));
      }
      table.commands.push({
        uid,
        id: input.id,
        roundId,
        fingerprint: fingerprint(plan),
      });
      table.commands = table.commands.slice(-300);
      changed = true;
      publicChanged = true;
      table.revision++;
      balance = wallets[uid].balance;
      spinRoundId = roundId;
    } else if (input.action === "tick") {
      const player = table.players.find((entry) => entry.uid === uid);
      if (player) player.seenAt = now;
      if (table.phase === "closing" && table.deadline <= now) {
        resolveRound(table, wallets, walletChanged, now, forcedNumber ?? randomInt(37));
        table.revision++;
        changed = true;
        publicChanged = true;
      }
    }

    if (changed) {
      if (publicChanged) {
        table.updatedAt = now;
        tx.set(publicRef, rouletteTableView(table, now));
      }
      tx.set(privateRef, table);
      for (const id of walletChanged)
        tx.set(db.doc(`casinoWallets/${id}`), wallets[id]);
    }
    balance = uid ? wallets[uid]?.balance ?? balance : null;
    return {
      table: rouletteTableView(table, now),
      balance,
      stale,
      roundId: spinRoundId,
      serverNow: now,
    };
  });
}

export function rouletteFunctions() {
  const rouletteAction = walletCall((request, user) =>
    runRoulette(
      request.data,
      request.auth.uid,
      user.displayName || user.username,
    ),
  );

  const rouletteSweep = onSchedule(
    { schedule: "every 1 minutes", region: "europe-west1", maxInstances: 1 },
    async () => {
      const db = getFirestore();
      const snapshot = await db.doc(ROULETTE_PRIVATE).get();
      if (!snapshot.exists) return;
      const table = snapshot.data();
      if (
        table.phase === "closing" &&
        table.deadline <= Date.now()
      )
        await runRoulette(
          { action: "tick", id: `sweep-${Date.now()}`, table: table.id },
          null,
          null,
        );
    },
  );
  return { rouletteAction, rouletteSweep };
}
