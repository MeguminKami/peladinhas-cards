import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../src/config.js';
import { createEngine, fillBoard, evaluateBoard } from '../src/engine.js';
import { simulate } from '../src/simulation.js';

const quiet = () => Array.from({ length: 30 }, (_, p) => (Math.floor(p / 6) + p % 6) % 2 ? 'P3' : 'P2');

test('hunt applies the calibrated scatter boost to all five probabilities, keeping the cap', () => {
  for (let count = 0; count <= 5; count++) {
    const board = quiet();
    for (let p = 0; p < count; p++) board[29 - p] = 'S';
    board[0] = null;
    const chance = DEFAULT_CONFIG.scatterPPM.base[count] ?? 0;
    const draw = chance ? 1.25 * chance / 1000000 : .5;
    const base = [...board], hunt = [...board];
    fillBoard(base, 'base', { next: () => draw });
    fillBoard(hunt, 'base', { next: () => draw }, DEFAULT_CONFIG, DEFAULT_CONFIG.bonusHunt.scatterMultiplier);
    assert.notEqual(base[0], 'S');
    assert.equal(hunt[0] === 'S', count < 5);
  }
});

test('hunt charges four times once, uses normal rules and gives a bonus no boosted retriggers', () => {
  const engine = createEngine();
  const start = engine.start({ mode: 'hunt', betUnits: 123 });
  assert.equal(start.entryMode, 'hunt');
  assert.equal(start.mode, 'base');
  assert.equal(start.remainingSpins, 1);
  assert.equal(start.costUnits, 492);
  assert.equal(start.bonusType, null);
  const board = quiet(); board[0] = board[1] = board[2] = 'S';
  const trigger = engine.step(start, { initialBoard: board });
  assert.equal(trigger.events[0].scatterMultiplier, DEFAULT_CONFIG.bonusHunt.scatterMultiplier);
  assert.equal(trigger.state.mode, 'common');
  assert.equal(trigger.state.remainingSpins, 12);
  const bonusBoard = quiet(); bonusBoard[0] = bonusBoard[1] = 'S';
  const bonus = engine.step(trigger.state, { initialBoard: bonusBoard });
  assert.equal(bonus.events[0].scatterMultiplier, 1);
  assert.equal(bonus.state.remainingSpins, 13);
  assert.equal(bonus.state.costUnits, 492);
  assert.deepEqual(evaluateBoard(quiet(), 'base'), []);
});

test('hunt boosts refills too, without changing symbol payouts or XP', () => {
  // First two replacements become scatters only with the hunt boost;
  // the remaining cells use varied premiums to terminate the cascade.
  let fallbackIndex = 0;
  const refill = [.04, .025, .99, .90, .99, .94, .99, .90];
  const fixtureEngine = createEngine({ rng: { next: () => refill[fallbackIndex++] ?? .99 } });
  const board = quiet(); for (let p = 0; p < 5; p++) board[p] = 'N1';
  const result = fixtureEngine.step(fixtureEngine.start({ mode: 'hunt' }), { initialBoard: board });
  const hit = result.events.find(e => e.type === 'hits').hits.find(h => h.symbol === 'N1');
  assert.equal(hit.rawPay100, String(DEFAULT_CONFIG.pay100[0][0]));
  assert.equal(hit.xp100, 500);
  const generated = result.events.find(e => e.type === 'refill').generated;
  assert.equal(generated[0].symbol, 'S');
  assert.equal(generated[1].symbol, 'S');
  assert.equal(fixtureEngine.config.xpThreshold100.base, 3900);
});

test('hunt keeps MAX WIN relative to the base bet, not the fourfold spin cost', () => {
  const engine = createEngine();
  const trigger = quiet(); trigger[0] = trigger[1] = trigger[2] = trigger[3] = 'S';
  const first = engine.step(engine.start({ mode: 'hunt', betUnits: 123 }), { initialBoard: trigger });
  assert.equal(first.state.mode, 'super');
  const outcome = engine.step(first.state, { initialBoard: Array.from({ length: 30 }, () => ({ symbol: 'W', multiplier: 100 })) });
  assert.equal(outcome.state.paid100, 1000000);
  const end = outcome.events.at(-1);
  assert.equal(end.costUnits, 492);
  assert.equal(end.creditedUnits, 10000 * 123);
});

test('hunt simulation denominator includes the 4x cost and records natural bonuses', () => {
  const result = simulate({ mode: 'hunt', count: 200, seed: 20270101 });
  assert.equal(result.totalCostBaseBets, 800);
  assert.ok(Math.abs(result.rtp - result.totalReturnBaseBets / 800) < 1e-12);
  assert.ok(Math.abs(result.rtp - result.settledCreditRtp) < 1e-12);
  assert.ok(Object.values(result.naturalBonuses).reduce((a, b) => a + b, 0) > 0);
  assert.ok(result.spins > 200);
  assert.ok(Math.abs(Object.values(result.contributionsRtp).reduce((a, b) => a + b, 0) - result.rtp) < 1e-12);
});
