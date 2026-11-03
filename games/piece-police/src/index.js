// API pública do motor (usada pela interface, pela carteira e pelo simulador).
import { config, MATH_VERSION, CONFIG_HASH } from './config.js';
import { seedState } from './random.js';
import { playRound } from './engine.js';
import { SCENARIOS } from './scenarios.js';

export { config, MATH_VERSION, CONFIG_HASH, playRound, seedState };

/** Nova sessão local de teste. O saldo real é da carteira, não do motor. */
export function newState(seed = Date.now()) {
  return { rng: seedState(seed), seed: String(seed) };
}

/** Lista dos cenários de diagnóstico disponíveis. */
export function scenarioNames() {
  return Object.keys(SCENARIOS);
}

/**
 * Cenário de diagnóstico: uma jogada com grelha/acontecimentos forçados.
 * NUNCA entra em relatórios nem liquida saldo (resultado marcado forced: true).
 */
export function scenario(name, opts = {}) {
  const sc = SCENARIOS[name];
  if (!sc) throw new Error(`Cenário desconhecido: ${name}. Disponíveis: ${scenarioNames().join(', ')}`);
  const rng = seedState(opts.seed ?? `scenario:${name}`);
  return playRound(rng, { bet: opts.bet ?? 100, mode: sc.mode || 'base', force: sc.force, roundId: `scenario-${name}` });
}
