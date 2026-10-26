// Browser engine for the explicitly temporary fixture site. No server module.
import { fresh, initial, play, BETS, MATH_VERSION } from "../assets/games/rift/engine.js";

function fail(code, message) {
  const error = Error(message);
  error.code = code;
  error.publicMessage = message;
  throw error;
}
export function applyLocalRift(previous, balance, { action, payload = {} }) {
  if (!["connect", "play"].includes(action)) fail("INVALID_ACTION", "Pedido inválido.");
  const session = previous ? structuredClone(previous) : {
    sessionId: crypto.randomUUID(), revision: 0,
    state: fresh(crypto.getRandomValues(new Uint32Array(1))[0]),
  };
  if (!session.state.grid) session.state.grid = initial(session.state);
  session.state.balance = balance / 100;
  if (session.state.round && session.state.round.mathVersion !== MATH_VERSION)
    fail("VERSION_MISMATCH", "Conclui a ronda com a versão original do jogo.");
  let debit = 0, credit = 0;
  if (action === "play") {
    if (payload.sessionId !== session.sessionId) fail("SESSION_MISMATCH", "A sessão mudou. Volta a ligar o jogo.");
    if (payload.expectedRevision !== session.revision) fail("STALE_REVISION", "A sessão mudou. A recuperar a jogada.");
    if (!BETS.includes(payload.bet) || typeof payload.hunt !== "boolean" ||
        !(payload.buy === null || ["core", "rift", "overdrive"].includes(payload.buy)))
      fail("INVALID_ACTION", "Aposta ou bónus inválido.");
    const state = session.state;
    if (state.pending) {
      if (payload.previousRecordId !== state.pending.id) fail("PENDING_PRESENTATION", "Existe uma jogada por apresentar.");
      state.pending = null;
    }
    if (state.round && (payload.buy || payload.bet !== state.round.bet))
      fail("ROUND_IN_PROGRESS", "Conclui primeiro o bónus atual.");
    if (!state.round) { state.bet = payload.bet; state.settings.hunt = payload.hunt; }
    let record;
    try { record = play(state, { buy: payload.buy }); }
    catch (error) {
      if (error.message === "Insufficient credits") fail("INSUFFICIENT_BALANCE", "Saldo insuficiente.");
      throw error;
    }
    record.id = crypto.randomUUID();
    if (state.round && !record.played) state.round.id = crypto.randomUUID();
    debit = Math.round(record.cost * 100);
    credit = Math.round(record.win * 100);
    session.revision++;
  }
  const nextBalance = balance - debit + credit;
  if (![debit, credit, nextBalance].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1e12) || balance < debit)
    fail("INVALID_BALANCE", "Saldo ou limite inválido.");
  session.state.balance = nextBalance / 100;
  const client = structuredClone(session.state);
  for (const key of ["prng", "rng", "seed", "draws", "serial"]) delete client[key];
  return { session, balance: nextBalance, debit, credit,
    result: { sessionId: session.sessionId, revision: session.revision, state: client },
  };
}
