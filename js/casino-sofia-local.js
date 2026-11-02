// Princesa Sofia: browser engine backed by the shared durable wallet (same model as the Rift).
// The iframe only presents; the RNG, the round and the money live here.
import { createEngine, createRandom, entryCostMultiplier, ENTRY_MODES, DEFAULT_CONFIG } from "../assets/games/princesa-sofia/src/index.js";
import { BET_UNITS } from "../assets/games/princesa-sofia/ui/session.js";

export const SOFIA_ACTIONS = Object.freeze(["connect", "start", "step"]);

function fail(code, message) {
  const error = Error(message);
  error.code = code;
  error.publicMessage = message;
  throw error;
}
const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];

// The engine is deterministic for a given RNG snapshot, so a round is stored as
// its starting snapshot and replayed up to the requested step (no event dumps).
function replay(round, upto) {
  const engine = createEngine({ rng: createRandom(round.rngStart) });
  let state = engine.start({ mode: round.entryMode, betUnits: round.betUnits });
  let last = null;
  for (let i = 0; i < upto; i++) {
    last = engine.step(state);
    state = last.state;
  }
  return { state, last };
}

function publicRound(round) {
  if (!round) return null;
  return { id: round.id, entryMode: round.entryMode, betUnits: round.betUnits, cursor: round.cursor,
    state: replay(round, round.cursor).state };
}

export function applyLocalSofia(previous, balance, { action, payload = {} }) {
  if (!SOFIA_ACTIONS.includes(action)) fail("INVALID_ACTION", "Pedido inválido.");
  const session = previous ? structuredClone(previous) : {
    sessionId: crypto.randomUUID(), revision: 0, rng: seed(), round: null,
  };
  let debit = 0, credit = 0, completed = null, notice = "";

  if (action === "connect" && session.round && session.round.configVersion !== DEFAULT_CONFIG.version) {
    // Never replay a paid round with different maths: settle its stored result.
    credit = session.round.creditedUnits;
    completed = session.round;
    session.round = null;
    session.revision++;
    notice = "A jogada pendente foi concluída com o resultado original.";
  }
  if (action === "start") {
    if (payload.sessionId !== session.sessionId) fail("SESSION_MISMATCH", "A sessão mudou. Volta a abrir o jogo.");
    if (payload.expectedRevision !== session.revision) fail("STALE_REVISION", "A sessão mudou. A recuperar a jogada.");
    if (session.round) fail("ROUND_IN_PROGRESS", "Conclui primeiro a jogada em curso.");
    if (!ENTRY_MODES.includes(payload.mode) || !BET_UNITS.includes(payload.betUnits))
      fail("INVALID_ACTION", "Aposta ou bónus inválido.");
    const cost = entryCostMultiplier(payload.mode) * payload.betUnits;
    if (!Number.isSafeInteger(cost) || balance < cost) fail("INSUFFICIENT_BALANCE", "Saldo insuficiente.");
    // Resolve the whole round now: its cost, length and credit are fixed at purchase.
    const rng = createRandom(session.rng);
    const engine = createEngine({ rng });
    let state = engine.start({ mode: payload.mode, betUnits: payload.betUnits });
    let steps = 0, settlement = null;
    while (!state.complete) {
      const result = engine.step(state);
      state = result.state;
      steps++;
      settlement = result.events.find(event => event.type === "round-end") || settlement;
    }
    if (!settlement) fail("ENGINE_ERROR", "Não foi possível resolver a jogada.");
    session.round = {
      id: crypto.randomUUID(), entryMode: payload.mode, betUnits: payload.betUnits,
      costUnits: state.costUnits, configVersion: DEFAULT_CONFIG.version,
      rngStart: session.rng, steps, cursor: 0, creditedUnits: settlement.creditedUnits,
      bonus: Boolean(state.bonusType),
    };
    session.rng = rng.snapshot();
    session.revision++;
    debit = state.costUnits;
  }
  let step = null;
  if (action === "step") {
    const round = session.round;
    if (payload.sessionId !== session.sessionId) fail("SESSION_MISMATCH", "A sessão mudou. Volta a abrir o jogo.");
    if (!round || payload.roundId !== round.id) fail("NO_ROUND", "Esta jogada já terminou. Volta a abrir o jogo.");
    if (round.configVersion !== DEFAULT_CONFIG.version) fail("VERSION_MISMATCH", "O jogo foi atualizado. Volta a abrir o jogo para concluir a jogada.");
    if (payload.index !== round.cursor) fail("STALE_REVISION", "A sessão mudou. A recuperar a jogada.");
    const { last } = replay(round, round.cursor + 1);
    step = { state: last.state, events: last.events };
    round.cursor++;
    if (round.cursor >= round.steps) {
      if (!last.state.complete) fail("ENGINE_ERROR", "A jogada não terminou como previsto.");
      credit = round.creditedUnits;
      completed = round;
      session.round = null;
    }
    session.revision++;
  }
  const nextBalance = balance - debit + credit;
  if (![debit, credit, nextBalance].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1e12) || balance < debit)
    fail("INVALID_BALANCE", "Saldo ou limite inválido.");
  return {
    session, balance: nextBalance, debit, credit, completed,
    result: { sessionId: session.sessionId, revision: session.revision, balance: nextBalance,
      round: publicRound(session.round), step, notice },
  };
}
