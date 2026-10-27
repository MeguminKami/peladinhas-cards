import { randomInt, randomUUID } from "node:crypto";
import {
  fresh,
  start,
  act,
  deck,
  publicRound,
  available,
} from "./blackjack-engine.js";
import {
  CASINO_EDITION,
  currentCasinoWallet,
  DJABUCOIN,
} from "../js/casino-economy.js";

export const BJ = Object.freeze({
  turn: 30000,
  betting: 15000,
  summary: 6500,
  lease: 60000,
  idle: 120000,
  roomIdle: 60000,
});
const roundInProgress = (table) =>
  table.session.round && table.session.round.phase !== "summary";
export const roomExpired = (table, now) =>
  !roundInProgress(table) &&
  now >= (table.lastPlayAt ?? table.updatedAt) + BJ.roomIdle;
export const expiredPlayer = (p, table, now) =>
  now - p.seenAt >= BJ.lease ||
  (now - p.activeAt >= BJ.idle &&
    !(
      table.session.round?.phase !== "summary" &&
      table.session.round?.seats.some((s) => s.number === p.seat)
    ));
const check = (ok, text) => {
  if (!ok) throw Error(text);
};
export function newTable(now = Date.now()) {
  return {
    id: randomUUID(),
    edition: CASINO_EDITION,
    revision: 0,
    bettingRevision: 0,
    players: [],
    session: fresh(),
    deadline: 0,
    commands: [],
    updatedAt: now,
    lastPlayAt: now,
  };
}
function shoe() {
  const cards = deck();
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
export function tableView(table) {
  if (!table) return null;
  return {
    id: table.id,
    edition: table.edition,
    revision: table.revision,
    deadline: table.deadline,
    idleDeadline: roundInProgress(table)
      ? 0
      : (table.lastPlayAt ?? table.updatedAt) + BJ.roomIdle,
    players: table.players.map(
      ({ uid, name, seat, bet, activeAt, leaving }) => ({
        uid,
        name,
        seat,
        bet,
        activeUntil: activeAt + BJ.idle,
        leaving,
      }),
    ),
    round: publicRound(table.session),
  };
}
export function walletIds(table, uid) {
  return [
    ...new Set([uid, ...table.players.map((p) => p.uid)].filter(Boolean)),
  ];
}

/** One deterministic transaction plan. Wallet changes and table state commit together. */
export function tableCommand(
  input,
  uid,
  name,
  original,
  walletData,
  now = Date.now(),
  forcedShoe,
) {
  check(
    input && typeof input === "object" && !Array.isArray(input),
    "Pedido inválido.",
  );
  check(
    [
      "join",
      "occupy",
      "bet",
      "hit",
      "stand",
      "double",
      "split",
      "insure",
      "decline",
      "heartbeat",
      "tick",
      "leave",
    ].includes(input.action),
    "Ação inválida.",
  );
  check(
    typeof input.id === "string" && /^[\w-]{16,80}$/.test(input.id),
    "Identificador inválido.",
  );
  const table = structuredClone(original || newTable(now));
  check(table.edition === CASINO_EDITION, "A edição da mesa mudou.");
  const fingerprint = JSON.stringify([
    uid,
    input.action,
    input.table,
    input.revision,
    input.amount,
    ...(input.seat === undefined ? [] : [input.seat]),
  ]);
  const previous = table.commands.find(
    (c) => c.id === input.id && c.uid === uid,
  );
  if (previous) {
    check(
      previous.fingerprint === fingerprint,
      "Pedido repetido com dados diferentes.",
    );
    return { table, wallets: {}, publicChanged: false, changed: false };
  }
  if (input.action !== "join")
    check(input.table === table.id, "A mesa terminou. Volta ao casino.");
  if (input.seat !== undefined)
    check(
      Number.isInteger(input.seat) && input.seat >= 1 && input.seat <= 5,
      "Lugar inválido.",
    );
  if (input.action === "heartbeat" && !roomExpired(table, now)) {
    const owned = table.players.filter((p) => p.uid === uid && !p.leaving);
    check(
      owned.length && owned.some((p) => !expiredPlayer(p, table, now)),
      "Saíste da mesa por inatividade.",
    );
    if (owned.every((p) => now - p.seenAt < 20000))
      return { table, wallets: {}, publicChanged: false, changed: false };
    owned.forEach((p) => (p.seenAt = now));
    return { table, wallets: {}, publicChanged: false, changed: true };
  }
  const wallets = {},
    credits = {};
  const wallet = (id) => {
    check(walletData[id] !== undefined, "Carteira indisponível.");
    return (wallets[id] ||= structuredClone(
      currentCasinoWallet(walletData[id]),
    ));
  };
  function money(id, delta, kind) {
    const w = wallet(id),
      balance = w.balance + delta;
    check(
      Number.isSafeInteger(balance) && balance >= 0 && balance <= 1e12,
      "Saldo insuficiente ou limite de saldo atingido.",
    );
    w.balance = balance;
    w.revision++;
    w.recent = [
      {
        id: `${table.id}:${table.session.counter}:${input.id}:${kind}`,
        kind: "blackjack",
        amount: delta,
        at: now,
      },
      ...w.recent,
    ].slice(0, DJABUCOIN.recentLimit);
  }
  function pay(initialDeal = false) {
    const r = table.session.round;
    if (r?.phase !== "summary" || table.paid === r.id) return;
    for (const p of r.seats) {
      const owner = table.players.find((x) => x.seat === p.number);
      check(owner, "Lugar sem jogador.");
      const gross = p.insuranceGross + p.hands.reduce((n, h) => n + h.gross, 0);
      if (gross) money(owner.uid, gross, `return:${p.number}`);
      credits[owner.uid] = (credits[owner.uid] || 0) + gross;
      if (!owner.leaving && now - owner.seenAt < BJ.lease) owner.activeAt = now;
    }
    table.paid = r.id;
    table.lastPlayAt = now;
    const presentationTime = initialDeal
      ? r.events.filter((e) => e.type === "card" || e.type === "reveal")
          .length *
          650 +
        1800
      : 0;
    table.deadline = now + Math.max(BJ.summary, presentationTime);
  }
  function decision(action, player) {
    const before = table.session.round;
    table.session.balance = ["double", "split", "insure"].includes(action)
      ? wallet(player.uid).balance
      : 1e12;
    const spent = before.cost;
    table.session = act(table.session, {
      round: before.id,
      revision: before.revision,
      hand: before.active || undefined,
      seat: player.seat,
      action,
    });
    const debit = table.session.round.cost - spent;
    if (debit) money(player.uid, -debit, action);
    table.deadline = now + BJ.turn;
    pay();
  }
  function begin() {
    const bets = Array(5).fill(0);
    table.players.forEach((p) => {
      bets[p.seat - 1] = p.bet;
    });
    check(bets.some(Boolean), "Sem apostas confirmadas.");
    table.session.balance = 1e12;
    table.session = start(table.session, bets, forcedShoe || shoe());
    table.deadline = now + BJ.turn;
    pay(true);
  }
  // A live round never expires the room. Idle time starts again at settlement.
  if (original && roomExpired(table, now)) {
    if (!table.session.round)
      for (const p of table.players) if (p.bet) money(p.uid, p.bet, "refund");
    table.players = [];
    table.revision++;
    return { table, wallets, publicChanged: true, changed: true, closed: true };
  }
  // Advance deadlines before processing a user command. Expired commands never play a new hand.
  const beforeView = JSON.stringify(tableView(table));
  const expired = table.players.filter((p) => expiredPlayer(p, table, now));
  const r = table.session.round;
  if (r && r.phase !== "summary" && table.deadline <= now) {
    if (r.phase === "insurance") {
      for (const p of [...r.seats].filter((p) => p.insured === null))
        decision(
          "decline",
          table.players.find((x) => x.seat === p.number),
        );
    } else {
      const owner = table.players.find((p) =>
        r.seats
          .find((s) => s.number === p.seat)
          ?.hands.some((h) => h.id === r.active),
      );
      decision("stand", owner);
    }
  }
  if (table.session.round?.phase === "summary" && table.deadline <= now) {
    table.session.history = [];
    table.session.ledger = [];
    table.session.round = null;
    table.players.forEach((p) => (p.bet = 0));
    table.deadline = 0;
    table.bettingRevision = table.revision + 1;
  }
  // Departing hands remain owned until settlement; empty seats can then be reclaimed.
  for (const p of expired) {
    p.leaving = true;
    if (!table.session.round) {
      if (p.bet) money(p.uid, p.bet, "refund");
      table.players = table.players.filter((x) => x.seat !== p.seat);
    }
  }
  const owned = table.players.filter((p) => p.uid === uid);
  const activeSeat = table.session.round?.seats.find((s) =>
    s.hands.some((h) => h.id === table.session.round.active),
  )?.number;
  let player =
    owned.find((p) => p.seat === (input.seat ?? activeSeat)) ||
    (input.seat === undefined ? owned[0] : undefined);
  if (input.action === "join") player = owned[0];
  if (input.action === "leave")
    player = owned.find((p) => !p.leaving) || owned[0];
  const passive = ["tick", "heartbeat", "leave", "join", "occupy"].includes(
    input.action,
  );
  if (!passive)
    check(
      Number.isSafeInteger(input.revision) && input.revision >= 0,
      "Revisão inválida.",
    );
  const oldBet =
    input.action === "bet" &&
    input.revision <
      Math.max(table.bettingRevision || 0, player?.joinedRevision || 0);
  const advanced = JSON.stringify(tableView(table)) !== beforeView;
  // A deadline advancement commits even if the requested decision is now stale.
  if (
    !passive &&
    (advanced ||
      oldBet ||
      (input.action !== "bet" && input.revision !== table.revision))
  ) {
    if (advanced) table.revision++;
    table.updatedAt = now;
    return {
      table,
      wallets,
      publicChanged: advanced,
      changed: advanced,
      stale: true,
    };
  }
  if (input.action === "join" || input.action === "occupy") {
    if (input.action === "occupy") {
      check(
        owned.some((p) => !p.leaving),
        "Entra primeiro na mesa.",
      );
      check(
        input.seat && !table.players.some((p) => p.seat === input.seat),
        "O lugar já está ocupado.",
      );
      player = undefined;
    }
    if (!player) {
      check(
        table.players.length < 5,
        "A mesa está cheia. Tenta novamente quando houver um lugar livre.",
      );
      const seat =
        input.action === "occupy"
          ? input.seat
          : [1, 2, 3, 4, 5].find(
              (n) => !table.players.some((p) => p.seat === n),
            );
      player = {
        uid,
        name: Array.from(String(name || "Jogador"))
          .slice(0, 30)
          .join(""),
        seat,
        bet: 0,
        seenAt: now,
        activeAt: now,
        leaving: false,
        joinedRevision: table.revision + 1,
      };
      table.players.push(player);
    } else {
      owned.forEach((p) => {
        if (p.leaving) p.joinedRevision = table.revision + 1;
        p.seenAt = now;
        p.activeAt = now;
        p.leaving = false;
      });
    }
  } else if (input.action === "tick") {
    // Scheduler or connected client: only advance elapsed server deadlines.
  } else {
    check(player && !player.leaving, "Saíste da mesa por inatividade.");
    if (input.action === "bet" && owned.length > 1)
      check(input.seat !== undefined, "Escolhe o lugar da aposta.");
    player.seenAt = now;
    if (input.action !== "heartbeat") player.activeAt = now;
    if (input.action === "bet") {
      check(!table.session.round && !player.bet, "Aguarda pela próxima ronda.");
      check(
        Number.isSafeInteger(input.amount) &&
          input.amount >= 20 &&
          input.amount <= 100000 &&
          input.amount % 2 === 0,
        "Aposta inválida.",
      );
      money(uid, -input.amount, "bet");
      player.bet = input.amount;
      if (!table.deadline) table.deadline = now + BJ.betting;
    } else if (input.action === "leave") {
      owned.forEach((p) => {
        p.leaving = true;
        p.seenAt = now - BJ.lease;
      });
      if (!table.session.round) {
        for (const p of owned) if (p.bet) money(uid, p.bet, "refund");
        table.players = table.players.filter((p) => p.uid !== uid);
      }
    } else if (input.action !== "heartbeat") {
      const round = table.session.round;
      check(round && round.phase !== "summary", "Aguarda pela próxima ronda.");
      if (round.phase === "play")
        check(
          round.seats
            .find((p) => p.number === player.seat)
            ?.hands.some((h) => h.id === round.active),
          "Aguarda pela tua vez.",
        );
      else
        check(
          ["insure", "decline"].includes(input.action) &&
            !!round.seats.find((p) => p.number === player.seat),
          "Decide o seguro primeiro.",
        );
      decision(input.action, player);
    }
    if (
      ["bet", "hit", "stand", "double", "split", "insure", "decline"].includes(
        input.action,
      )
    )
      table.lastPlayAt = now;
  }
  if (
    !table.session.round &&
    table.players.some((p) => p.bet) &&
    (table.deadline <= now || table.players.every((p) => p.bet || p.leaving))
  )
    begin();
  if (!table.session.round && !table.players.some((p) => p.bet))
    table.deadline = 0;
  const publicChanged = JSON.stringify(tableView(table)) !== beforeView;
  if (publicChanged) table.revision++;
  table.updatedAt = now;
  if (!["heartbeat", "tick"].includes(input.action))
    table.commands = [
      ...table.commands,
      { id: input.id, uid, fingerprint },
    ].slice(-64);
  // The game engine ledger is internal; balances are always the real individual wallets.
  table.session.ledger = [];
  table.session.history = [];
  return {
    table,
    wallets,
    credits,
    publicChanged,
    changed: publicChanged || input.action !== "tick",
    closed: !table.players.length,
  };
}

export function playerView(table, uid, balance) {
  const player = table?.players.find((p) => p.uid === uid);
  const session = table?.session;
  return {
    table: tableView(table),
    balance,
    seat: player?.seat || null,
    available: session ? available({ ...session, balance: balance || 0 }) : {},
  };
}
