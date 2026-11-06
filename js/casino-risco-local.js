// The parent owns the clock, seed, deterministic round and durable wallet.
// The iframe receives only publicRound. This follows Sofia's local trust model.
import { createRound, resolveRound, publicRound } from "../assets/games/risco/src/engine.js";
const WALLET_SCALE = 100; // Wallet stores hundredths of DJC, the engine stakes whole DJC.

const fail = message => { throw Error(message); };
export async function seedCommitment(seed) {
  const bytes = new TextEncoder().encode(seed);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
}
export async function applyLocalRisco(previous, balance, { action, payload = {}, now }) {
  if (!["connect", "start", "poll", "cashout"].includes(action) || !Number.isFinite(now)) fail("Pedido inválido.");
  const session = previous ? structuredClone(previous) : { sessionId: crypto.randomUUID(), revision: 0, round: null, history: [] };
  let debit = 0, credit = 0, completed = null;
  const advance = cashout => {
    const item = session.round;
    if (!item || now < item.startedAt) return;
    const resolved = resolveRound(item.engine, { elapsedMs: Math.max(item.engine.elapsedMs, now - item.startedAt), cashout });
    // Between boundaries the public clock is derived, not written 5 times a second.
    if (resolved.status !== item.engine.status) item.engine = resolved;
    if (item.engine.status !== "running" && !item.settled) {
      item.settled = true;
      credit = item.engine.payoutUnits * WALLET_SCALE;
      completed = { id: item.id, costUnits: item.engine.betUnits * WALLET_SCALE, creditedUnits: credit };
      session.revision++;
    }
    const view = publicRound(item.engine, Math.max(item.engine.elapsedMs, now - item.startedAt));
    if (view.phase !== "running" && !item.recorded) {
      item.recorded = true;
      session.history = [view.crashCents, ...session.history].slice(0, 20);
    }
  };
  if (action === "cashout") {
    if (payload.sessionId !== session.sessionId || payload.roundId !== session.round?.id) fail("A ronda mudou. Recupera o jogo.");
    advance(true);
  } else advance(false);
  if (action === "start") {
    if (payload.sessionId !== session.sessionId || payload.expectedRevision !== session.revision) fail("A sessão mudou. Recupera o jogo.");
    if (session.round && (!session.round.recorded || !session.round.settled)) fail("Espera pelo fim da ronda.");
    if (!Number.isSafeInteger(payload.betUnits) || payload.betUnits < 1 || payload.betUnits > 10000 || payload.betUnits * WALLET_SCALE > balance) fail("Aposta ou saldo inválido.");
    const seed = Array.from(crypto.getRandomValues(new Uint32Array(8)), n => n.toString(16).padStart(8, "0")).join("");
    const engine = createRound({ seed, betUnits: payload.betUnits, autoCashoutCents: payload.autoCashoutCents ?? null });
    session.round = { id: crypto.randomUUID(), startedAt: now + 5000, commitment: await seedCommitment(seed), engine, settled: false, recorded: false };
    session.revision++;
    debit = payload.betUnits * WALLET_SCALE;
  }
  const nextBalance = balance - debit + credit;
  if (![nextBalance, credit, debit].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1e12)) fail("Limite de saldo atingido.");
  const item = session.round;
  let round = null;
  if (item) {
    const waiting = now < item.startedAt;
    // publicRound would reveal an instant crash at elapsed 0, so waiting has its own safe view.
    const view = waiting ? { status: "running", phase: "waiting", betUnits: item.engine.betUnits, autoCashoutCents: item.engine.autoCashoutCents, multiplierCents: 100, payoutUnits: 0, cashoutCents: null, version: item.engine.version } : publicRound(item.engine, Math.max(item.engine.elapsedMs, now - item.startedAt));
    round = { ...view, id: item.id, startedAt: item.startedAt, commitment: item.commitment };
  }
  return { session, balance: nextBalance, debit, credit, completed,
    result: { sessionId: session.sessionId, revision: session.revision, balance: nextBalance, serverNow: now, round, history: session.history } };
}
