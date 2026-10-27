// Integer coins only. Casino outcomes never award participation coins.
import { matchPerformance } from "./utils.js";
export const CASINO_EDITION = "official-2026-10-27-reset-200";
export const DJABUCOIN = Object.freeze({
  scale: 100,
  initial: 20000,
  perMatch: 2000,
  recentLimit: 12,
});

export const SLOT_RULES = Object.freeze({
  version: "0.7.0",
  bets: [20, 40, 60, 80, 100, 150, 200, 300, 400, 500, 750, 1000],
  cap: 10000,
});

export function validateSlotTransaction(input) {
  const keys = [
    "id",
    "debit",
    "credit",
    "roundId",
    "spin",
    "configVersion",
    "bet",
    "mode",
    "bonusHunt",
    "streamId",
  ];
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !keys.includes(key)) ||
    typeof input.id !== "string" ||
    typeof input.streamId !== "string" ||
    !/^[\w-]{16,80}$/.test(input.id || "") ||
    !/^[\w-]{16,80}$/.test(input.streamId || "") ||
    input.configVersion !== SLOT_RULES.version ||
    !SLOT_RULES.bets.includes(input.bet) ||
    !["base", "normal", "superior"].includes(input.mode) ||
    typeof input.bonusHunt !== "boolean" ||
    (input.bonusHunt && input.mode !== "base") ||
    ![input.debit, input.credit, input.roundId, input.spin].every(
      Number.isSafeInteger,
    ) ||
    input.debit < 0 ||
    input.credit < 0 ||
    input.roundId < 1 ||
    input.spin < 1 ||
    input.spin > 10000 ||
    input.credit > input.bet * SLOT_RULES.cap
  )
    throw Error("Transação da slot inválida.");
  const cost =
    input.bet *
    (input.mode === "base"
      ? input.bonusHunt
        ? 3
        : 1
      : input.mode === "normal"
        ? 90
        : 220);
  if (input.debit !== (input.spin === 1 ? cost : 0))
    throw Error("Custo da jogada inválido.");
  return Object.fromEntries(keys.map((key) => [key, input[key]]));
}

// Structural wallet validation, not proof of a browser-generated game outcome.
export function settleCasinoSlot(wallet, input, round, now = Date.now()) {
  const tx = validateSlotTransaction(input);
  if (wallet.balance < tx.debit)
    throw Error("Djabucoins insuficientes para esta aposta.");
  if (
    tx.spin === 1
      ? !!round
      : !round ||
        round.spin + 1 !== tx.spin ||
        round.bet !== tx.bet ||
        round.mode !== tx.mode ||
        round.bonusHunt !== tx.bonusHunt
  )
    throw Error("A sequência da ronda não corresponde à carteira.");
  const paid = (round?.paid || 0) + tx.credit;
  if (paid > tx.bet * SLOT_RULES.cap)
    throw Error("O prémio excede o limite da ronda.");
  const balance = wallet.balance - tx.debit + tx.credit;
  if (!Number.isSafeInteger(balance) || balance > 1e12)
    throw Error("Limite de saldo atingido.");
  return {
    wallet: {
      ...wallet,
      balance,
      revision: wallet.revision + 1,
      recent: [
        { id: tx.id, kind: "slot", amount: tx.credit - tx.debit, at: now },
        ...wallet.recent,
      ].slice(0, DJABUCOIN.recentLimit),
    },
    round: {
      spin: tx.spin,
      paid,
      bet: tx.bet,
      mode: tx.mode,
      bonusHunt: tx.bonusHunt,
    },
  };
}

export function newCasinoWallet(now = Date.now()) {
  return {
    edition: CASINO_EDITION,
    sessionProtocol: 5,
    balance: DJABUCOIN.initial,
    earned: 0,
    matches: 0,
    revision: 1,
    recent: [
      { id: "welcome", kind: "welcome", amount: DJABUCOIN.initial, at: now },
    ],
  };
}

export function currentCasinoWallet(wallet, now = Date.now()) {
  return wallet?.edition === CASINO_EDITION ? wallet : newCasinoWallet(now);
}

export function casinoMatchReward(game, uid) {
  const side = ["teamA", "teamB"].find(key =>
    [...(game[key]?.starters || []), ...(game[key]?.bench || [])].includes(uid));
  if (!side || game.status !== "closed") return 0;
  const rival = side === "teamA" ? "teamB" : "teamA";
  const margin = Number(game.score?.[side] || 0) - Number(game.score?.[rival] || 0);
  const { goals, assists } = matchPerformance(uid, game);
  const coins = 50 + (margin > 0 ? 40 : margin === 0 ? 15 : 0)
    + Math.max(-30, Math.min(30, margin * 6)) + goals * 15 + assists * 10;
  return Math.max(20, Math.min(200, coins)) * DJABUCOIN.scale;
}

export function awardCasinoMatch(wallet, gameId, now = Date.now(), amount = DJABUCOIN.perMatch) {
  const current = currentCasinoWallet(wallet, now);
  return {
    ...current,
    balance: current.balance + amount,
    earned: current.earned + amount,
    matches: current.matches + 1,
    revision: current.revision + 1,
    recent: [
      { id: gameId, kind: "match", amount, at: now },
      ...current.recent,
    ].slice(0, DJABUCOIN.recentLimit),
  };
}
