import { MATH_VERSION, MAX_MULTIPLIER_CENTS, MIN_CASHOUT_CENTS, GROWTH_RATE } from '../tabelas/versao.js';
export { MATH_VERSION, MAX_MULTIPLIER_CENTS, MIN_CASHOUT_CENTS };
const RANGE = 1n << 52n;
function integer(value, min, max, name) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(name);
  return value;
}
// Two 32-bit words per sample. No clock, browser or shared mutable state.
export function createRandom(seed) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = 0xdeadbeef;
  for (const char of String(seed)) {
    const value = char.codePointAt(0);
    a = Math.imul(a ^ value, 16777619);
    b = Math.imul(b ^ value, 2246822507);
    c = Math.imul(c ^ value, 3266489909);
    d = Math.imul(d ^ value, 668265263);
  }
  function word() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b + d) | 0;
    d = (d + 1) | 0;
    a = b ^ b >>> 9;
    b = (c + (c << 3)) | 0;
    c = ((c << 21) | (c >>> 11));
    c = (c + t) | 0;
    return t >>> 0;
  }
  for (let i = 0; i < 20; i++) word();
  return () => (word() & 0xfffff) * 4294967296 + word();
}
export function crashFromUniform52(q) {
  integer(q, 0, Number(RANGE - 1n), 'Amostra de 52 bits inválida');
  const value = 99n * RANGE / (RANGE - BigInt(q));
  return Number(value < 100n ? 100n : value > BigInt(MAX_MULTIPLIER_CENTS) ? BigInt(MAX_MULTIPLIER_CENTS) : value);
}
export const crashFromSeed = seed => crashFromUniform52(createRandom(seed)());
export function multiplierAt(elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Tempo inválido');
  return Math.min(MAX_MULTIPLIER_CENTS, Math.max(100, Math.floor(Math.exp(GROWTH_RATE * elapsedMs) * 100 + 1e-9)));
}
export function timeAtMultiplier(cents) {
  integer(cents, 100, MAX_MULTIPLIER_CENTS, 'Multiplicador inválido');
  return Math.log(cents / 100) / GROWTH_RATE;
}
export function payout(betUnits, cents) {
  integer(betUnits, 1, Math.floor(Number.MAX_SAFE_INTEGER / 9999), 'Aposta inválida');
  integer(cents, 100, MAX_MULTIPLIER_CENTS, 'Multiplicador inválido');
  return Number(BigInt(betUnits) * BigInt(cents) / 100n);
}
export function createRound({ seed, betUnits, autoCashoutCents = null }) {
  payout(betUnits, 100);
  if (autoCashoutCents !== null) integer(autoCashoutCents, MIN_CASHOUT_CENTS, MAX_MULTIPLIER_CENTS, 'Auto-cashout inválido');
  if (typeof seed !== 'string' || !seed.length) throw new TypeError('Seed inválida');
  return { version: MATH_VERSION, seed, betUnits, autoCashoutCents, crashCents: crashFromSeed(seed), status: 'running', payoutUnits: 0, cashoutCents: null, elapsedMs: 0 };
}
export function resolveRound(previous, { elapsedMs, cashout = false }) {
  multiplierAt(elapsedMs);
  if (elapsedMs < previous.elapsedMs) throw new RangeError('O tempo não pode recuar');
  if (previous.status !== 'running') return { ...previous };
  const round = { ...previous, elapsedMs };
  const current = multiplierAt(elapsedMs);
  const target = round.autoCashoutCents;
  if (target !== null && target <= round.crashCents && current >= target) {
    round.status = 'cashed-out'; round.cashoutCents = target;
  } else if (round.crashCents === MAX_MULTIPLIER_CENTS && current === MAX_MULTIPLIER_CENTS) {
    round.status = 'max-win'; round.cashoutCents = MAX_MULTIPLIER_CENTS;
  } else if (current >= round.crashCents) {
    round.status = 'crashed';
  } else if (cashout && current >= MIN_CASHOUT_CENTS) {
    round.status = 'cashed-out'; round.cashoutCents = current;
  }
  if (round.cashoutCents !== null) round.payoutUnits = payout(round.betUnits, round.cashoutCents);
  return round;
}
export function publicRound(round, elapsedMs = round.elapsedMs) {
  const revealed = multiplierAt(elapsedMs) >= round.crashCents;
  return { version: round.version, betUnits: round.betUnits, autoCashoutCents: round.autoCashoutCents,
    phase: revealed ? (round.crashCents === MAX_MULTIPLIER_CENTS ? 'max-win' : 'crashed') : 'running',
    status: round.status, payoutUnits: round.payoutUnits, cashoutCents: round.cashoutCents,
    multiplierCents: Math.min(multiplierAt(elapsedMs), revealed ? round.crashCents : MAX_MULTIPLIER_CENTS),
    ...(revealed ? { seed: round.seed, crashCents: round.crashCents } : {}) };
}
