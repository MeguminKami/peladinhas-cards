import { playRound, seedState, scenario } from '../src/index.js';
import { fromRows } from '../src/scenarios.js';
export { playRound, seedState, scenario, fromRows };
export const allEvents = (r) => r.steps.flatMap((s) => s.events);
export const ofType = (r, t) => allEvents(r).filter((e) => e.type === t);
export function forced(rows, extra = {}, mode = 'base', seed = 'teste') {
  return playRound(seedState(seed), { bet: 100, mode, force: { grid: fromRows(rows), ...extra } });
}
