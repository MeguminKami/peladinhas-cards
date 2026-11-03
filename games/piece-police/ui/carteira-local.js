/**
 * Carteira local do Peace Police: a lógica de dinheiro e de jogadas que vive DO LADO DO SITE.
 *
 * Função pura (sem DOM, sem rede): recebe o estado guardado e o saldo, aplica um pedido
 * (connect / start / step) e devolve o novo estado, o novo saldo e a resposta para o jogo.
 * É usada por:
 *  - TestSession (ui/session.js): créditos de teste no próprio browser;
 *  - a carteira simulada (carteira.html), que faz de site para testar o HostSession;
 *  - no futuro, a carteira do casino Peladinhas (js/casino-pp-local.js), como a Princesa Sofia.
 *
 * Regras:
 *  - O `start` resolve a jogada inteira com o motor (playRound) e debita o custo UMA vez.
 *  - A jogada guarda-se como o estado do gerador antes dela + o pedido. Cada `step` volta a jogar
 *    a mesma jogada (o motor é determinístico) e devolve o passo pedido: nada se sorteia de novo.
 *  - O prémio é creditado quando o último passo é entregue.
 *  - Se a versão da matemática mudar com uma jogada pendente, liquida-se o prémio guardado.
 */
import { config, MATH_VERSION, playRound, seedState } from '../src/index.js';

export const ACOES = Object.freeze(['connect', 'start', 'step']);
export const MODOS = Object.freeze(Object.keys(config.modes));

function falha(code, message) {
  const error = Error(message);
  error.code = code; error.publicMessage = message;
  throw error;
}

const uuid = () => (globalThis.crypto?.randomUUID?.() ?? `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

/** Custo de uma entrada em cêntimos (aposta base × custo do modo). */
export function custo(mode, bet) {
  const m = config.modes[mode];
  if (!m) return NaN;
  return (bet * m.costMils) / 1000;
}

// A jogada resolvida fica em memória: os passos seguintes não voltam a correr o motor.
let memo = null;
function resolver(round) {
  if (memo && memo.id === round.id && memo.key === String(round.rngStart)) return memo.result;
  const result = playRound(round.rngStart.slice(), { bet: round.bet, mode: round.mode, roundId: round.id });
  memo = { id: round.id, key: String(round.rngStart), result };
  return result;
}

function publicRound(round) {
  return round ? { id: round.id, mode: round.mode, bet: round.bet, cost: round.cost, cursor: round.cursor, version: round.version } : null;
}

/**
 * @param previous estado guardado da carteira (ou null)
 * @param balance  saldo em cêntimos
 * @param request  { action, payload }
 * @param opts     { seed } (só para uma sessão nova)
 */
export function aplicarCarteira(previous, balance, { action, payload = {} }, opts = {}) {
  if (!ACOES.includes(action)) falha('INVALID_ACTION', 'Pedido inválido.');
  const session = previous ? structuredClone(previous) : {
    sessionId: uuid(), revision: 0, seed: String(opts.seed ?? uuid()), rng: null, round: null,
  };
  if (!session.rng) session.rng = Array.from(seedState(session.seed));
  let debit = 0, credit = 0, completed = null, notice = '', step = null, last = false, totalWin = null;

  if (action === 'connect' && session.round && session.round.version !== MATH_VERSION) {
    // Nunca se volta a jogar uma jogada paga com outra matemática: liquida-se o resultado guardado.
    credit = session.round.totalWin;
    completed = session.round; session.round = null; session.revision++;
    notice = 'A jogada pendente foi concluída com o resultado original.';
  }
  if (action === 'start') {
    if (payload.sessionId !== session.sessionId) falha('SESSION_MISMATCH', 'A sessão mudou. Volta a abrir o jogo.');
    if (payload.expectedRevision !== session.revision) falha('STALE_REVISION', 'A sessão mudou. A recuperar a jogada.');
    if (session.round) falha('ROUND_IN_PROGRESS', 'Conclui primeiro a jogada em curso.');
    if (!MODOS.includes(payload.mode) || !config.bets.includes(payload.bet)) falha('INVALID_ACTION', 'Aposta ou modo inválido.');
    const cost = custo(payload.mode, payload.bet);
    if (!Number.isSafeInteger(cost)) falha('INVALID_ACTION', 'Custo inválido para esta aposta.');
    if (balance < cost) falha('INSUFFICIENT_BALANCE', 'Saldo insuficiente para esta jogada.');
    const id = uuid();
    const rngStart = session.rng.slice();
    const result = playRound(rngStart.slice(), { bet: payload.bet, mode: payload.mode, roundId: id });
    if (result.cost !== cost) falha('ENGINE_ERROR', 'O custo da jogada não confere.');
    memo = { id, key: String(rngStart), result };
    session.round = {
      id, mode: payload.mode, bet: payload.bet, cost, version: MATH_VERSION, rngStart,
      steps: result.steps.length, cursor: 0, totalWin: result.totalWin, totalWinMils: result.totalWinMils,
      bonus: result.steps.some(s => s.kind === 'bonus'), capped: result.capped,
    };
    session.rng = Array.from(result.rngAfter);
    session.revision++;
    debit = cost;
  }
  if (action === 'step') {
    const round = session.round;
    if (payload.sessionId !== session.sessionId) falha('SESSION_MISMATCH', 'A sessão mudou. Volta a abrir o jogo.');
    if (!round || payload.roundId !== round.id) falha('NO_ROUND', 'Esta jogada já terminou. Volta a abrir o jogo.');
    if (round.version !== MATH_VERSION) falha('VERSION_MISMATCH', 'O jogo foi atualizado. Volta a abrir o jogo para concluir a jogada.');
    if (payload.index !== round.cursor) falha('STALE_REVISION', 'A sessão mudou. A recuperar a jogada.');
    const result = resolver(round);
    step = result.steps[round.cursor];
    round.cursor++;
    if (round.cursor >= round.steps) {
      last = true; totalWin = round.totalWin;
      credit = round.totalWin; completed = round; session.round = null;
    }
    session.revision++;
  }
  const next = balance - debit + credit;
  if (![debit, credit, next].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1e13) || balance < debit) falha('INVALID_BALANCE', 'Saldo ou limite inválido.');
  return {
    session, balance: next, debit, credit, completed,
    result: { sessionId: session.sessionId, revision: session.revision, balance: next, round: publicRound(session.round), step, last, totalWin, notice },
  };
}
