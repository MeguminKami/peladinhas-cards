import { randomInt, randomUUID } from "node:crypto";
import { CASINO_EDITION, DJABUCOIN } from "../js/casino-economy.js";

export const ROULETTE = Object.freeze({
  lease: 75000,
  bettingWindow: 30000,
  resultWindow: 12000,
  chatWindow: 30 * 60 * 1000,
  chatLimit: 100,
  chatLength: 180,
  maxPlayers: 12,
  maxPlanEntries: 250,
  maxBet: 100000,
  maxTotal: 500000,
});

export const ROULETTE_PRIVATE = "casinoRoulettePrivate/main";
export const ROULETTE_PUBLIC = "casinoRoulette/main";

const CHAT_COLORS = Object.freeze([
  "#f2a65a",
  "#74c0fc",
  "#da77f2",
  "#69db7c",
  "#ff8787",
  "#ffd43b",
  "#63e6be",
  "#b197fc",
  "#ffa8a8",
  "#91a7ff",
  "#e599f7",
  "#a9e34b",
]);
const redNumbers = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function catalog() {
  const bets = new Map();
  const add = (kind, numbers) => {
    const sorted = [...numbers].sort((a, b) => a - b);
    bets.set(`${kind}:${sorted.join("-")}`, sorted);
  };
  for (let n = 0; n <= 36; n++) add("straight", [n]);
  for (let n = 1; n <= 36; n++) {
    if (n % 3 !== 0) add("split", [n, n + 1]);
    if (n <= 33) add("split", [n, n + 3]);
  }
  for (let n = 1; n <= 3; n++) add("split", [0, n]);
  add("street", [0, 1, 2]);
  add("street", [0, 2, 3]);
  add("corner", [0, 1, 2, 3]);
  for (let n = 1; n <= 34; n += 3) {
    add("street", [n, n + 1, n + 2]);
    if (n < 34) {
      add("six", [n, n + 1, n + 2, n + 3, n + 4, n + 5]);
      for (let c = 0; c < 2; c++)
        add("corner", [n + c, n + c + 1, n + c + 3, n + c + 4]);
    }
  }
  for (let i = 0; i < 3; i++) {
    add(
      "dozen",
      Array.from({ length: 12 }, (_, j) => i * 12 + j + 1),
    );
    add(
      "column",
      Array.from({ length: 12 }, (_, j) => j * 3 + i + 1),
    );
  }
  add("outside", [...redNumbers]);
  add(
    "outside",
    Array.from({ length: 36 }, (_, i) => i + 1).filter(
      (n) => !redNumbers.has(n),
    ),
  );
  add("outside", Array.from({ length: 18 }, (_, i) => (i + 1) * 2));
  add("outside", Array.from({ length: 18 }, (_, i) => i * 2 + 1));
  add("outside", Array.from({ length: 18 }, (_, i) => i + 1));
  add("outside", Array.from({ length: 18 }, (_, i) => i + 19));
  return bets;
}

const bets = catalog();
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};

export function validateRoulettePlan(plan) {
  assert(
    plan && typeof plan === "object" && !Array.isArray(plan),
    "Apostas invÃ¡lidas.",
  );
  const entries = Object.entries(plan);
  assert(
    entries.length > 0 && entries.length <= ROULETTE.maxPlanEntries,
    "Coloque apostas vÃ¡lidas na mesa.",
  );
  let total = 0;
  for (const [id, amount] of entries) {
    assert(
      bets.has(id) &&
        Number.isSafeInteger(amount) &&
        amount >= 20 &&
        amount <= ROULETTE.maxBet &&
        amount % 10 === 0,
      "Aposta invÃ¡lida.",
    );
    total += amount;
  }
  assert(
    Number.isSafeInteger(total) && total <= ROULETTE.maxTotal,
    "ExposiÃ§Ã£o mÃ¡xima: 5 000,00.",
  );
  return { plan: Object.fromEntries(entries), total };
}

export function settleRoulettePlan(plan, number) {
  assert(Number.isInteger(number) && number >= 0 && number <= 36, "NÃºmero invÃ¡lido.");
  const { plan: validPlan, total } = validateRoulettePlan(plan);
  const lines = Object.entries(validPlan).map(([id, stake]) => {
    const selected = bets.get(id);
    const won = selected.includes(number);
    const gross = won ? (stake * 36) / selected.length : 0;
    assert(Number.isSafeInteger(gross), "Retorno invÃ¡lido.");
    return { id, stake, won, gross };
  });
  const gross = lines.reduce((sum, line) => sum + line.gross, 0);
  return {
    number,
    color: number === 0 ? "green" : redNumbers.has(number) ? "red" : "black",
    cost: total,
    gross,
    net: gross - total,
    lines,
  };
}

export function newRouletteTable(now = Date.now()) {
  return {
    id: randomUUID(),
    edition: CASINO_EDITION,
    revision: 0,
    roundId: 0,
    phase: "betting",
    deadline: 0,
    result: null,
    players: [],
    commands: [],
    updatedAt: now,
  };
}

export function chatColor(players, uid) {
  const used = new Set(
    players.filter((player) => player.uid !== uid).map((player) => player.color),
  );
  const choices = CHAT_COLORS.filter((color) => !used.has(color));
  return choices.length ? choices[randomInt(choices.length)] : CHAT_COLORS[0];
}

export function rouletteTableView(table, now = Date.now()) {
  if (!table) return null;
  const players = table.players
    .filter((player) => now - player.seenAt < ROULETTE.lease)
    .map(({ uid, name, color, seenAt, plan, total, ready }) => ({
      uid,
      name,
      color,
      activeUntil: seenAt + ROULETTE.lease,
      plan: plan || null,
      total: total || 0,
      ready: !!ready,
    }));
  return {
    id: table.id,
    revision: table.revision,
    phase: table.phase,
    deadline: table.deadline,
    roundId: table.roundId,
    result: table.result,
    players,
    serverNow: now,
  };
}

export function expiredTable(table, now = Date.now()) {
  return (
    !table ||
    (table.phase !== "closing" && !table.players.some(
      (player) => now - player.seenAt < ROULETTE.lease,
    ))
  );
}

export function nextRoundId(table) {
  return table.roundId + 1;
}

export function newChatMessage(uid, name, color, message, now = Date.now()) {
  const user = Array.from(String(name || "Jogador").trim()).slice(0, 30).join("");
  const body = String(message || "").trim();
  assert(user && body && body.length <= ROULETTE.chatLength, "Mensagem invÃ¡lida.");
  return {
    uid,
    user,
    color,
    message: body,
    createdAt: now,
  };
}

export function casinoRouletteReceipt(wallet, delta, id, now = Date.now()) {
  const balance = wallet.balance + delta;
  assert(
    Number.isSafeInteger(balance) && balance >= 0 && balance <= 1e12,
    "Saldo insuficiente ou limite de saldo atingido.",
  );
  return {
    ...wallet,
    balance,
    revision: wallet.revision + 1,
    recent: [
      { id, kind: "roulette", amount: delta, at: now },
      ...(wallet.recent || []),
    ].slice(0, DJABUCOIN.recentLimit),
  };
}
