// Web Worker do painel de diagnóstico. Corre o MESMO motor da Fase 1 (src/index.js).
//  - simulação rápida: { n, mode, seed } -> RTP, frequência de bónus, prémio máximo
//  - procura: { find, mode, max, prefix } -> a primeira seed cuja jogada cumpre a condição
//    (retrigger, ganho grande ≥ 20×, sem prémio, limite atingido, bónus). A jogada encontrada é
//    depois apresentada a partir dessa seed: é um resultado real do motor, não fabricado.
import { newState, playRound, seedState, MATH_VERSION } from '../src/index.js';

const CONDICAO = {
  retrigger: r => r.steps.some(s => s.events.some(e => e.type === 'bonus.retrigger')),
  grande: r => r.steps.some(s => s.kind === 'base' && s.win >= 20000),
  'sem-premio': r => r.totalWinMils === 0,
  limite: r => r.capped,
  bonus: r => r.steps.some(s => s.kind === 'bonus'),
  calmer: r => r.steps.some(s => s.events.some(e => e.type === 'police.enter' && e.mode === 'calmer')),
  joiner: r => r.steps.some(s => s.events.some(e => e.type === 'police.enter' && e.mode === 'joiner')),
  'total-chemistry': r => r.steps.some(s => s.events.some(e => e.type === 'chemistry.total')),
};
export const CONDICOES = Object.keys(CONDICAO);

self.onmessage = ({ data }) => {
  if (data.find) {
    const test = CONDICAO[data.find];
    const prefix = data.prefix ?? `procura-${Date.now()}`;
    for (let k = 0; k < data.max; k++) {
      const seed = `${prefix}-${k}`;
      const r = playRound(seedState(seed), { bet: 100, mode: data.mode });
      if (test(r)) { self.postMessage({ done: true, found: true, seed, tries: k + 1, x: r.totalWinMils / 1000 }); return; }
      if (k % 500 === 0) self.postMessage({ progress: k / data.max });
    }
    self.postMessage({ done: true, found: false, tries: data.max });
    return;
  }
  const { n, mode, bet = 100, seed } = data;
  const st = newState(seed);
  let cost = 0, win = 0, bonus = 0, hits = 0, max = 0, capped = 0;
  const t0 = performance.now();
  for (let i = 1; i <= n; i++) {
    const r = playRound(st.rng, { bet, mode });
    st.rng = r.rngAfter;
    cost += r.costMils; win += r.totalWinMils;
    if (r.totalWinMils > 0) hits++;
    if (r.totalWinMils > max) max = r.totalWinMils;
    if (r.capped) capped++;
    if (r.steps.some(s => s.events.some(e => e.type === 'bonus.trigger'))) bonus++;
    if (i % 2000 === 0 || i === n) self.postMessage({ progress: i / n });
  }
  self.postMessage({ done: true, version: MATH_VERSION, mode, n, seed: String(seed), rtp: 100 * win / cost, hitRate: 100 * hits / n, bonusEvery: bonus ? n / bonus : null, bonus, maxX: max / 1000, capped, ms: Math.round(performance.now() - t0) });
};
