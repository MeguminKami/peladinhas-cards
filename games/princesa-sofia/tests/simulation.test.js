import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/config.js';

test('simulations are reproducible and include complete bonuses in the correct denominator', () => {
  for (const mode of ['base', 'common', 'super', 'secret']) {
    const result = simulate({ mode, count: 20, seed: 4321 });
    assert.deepEqual(result, simulate({ mode, count: 20, seed: 4321 }));
    assert.equal(result.count, 20);
    assert.equal(result.totalCostBaseBets, 20 * (mode === 'base' ? 1 : DEFAULT_CONFIG.buyPrices[mode]));
    assert.ok(Math.abs(result.rtp - result.totalReturnBaseBets / result.totalCostBaseBets) < 1e-12);
    assert.ok(Math.abs(result.settledCreditRtp - result.rtp) < 1e-12);
    assert.ok(Math.abs(Object.values(result.contributionsRtp).reduce((a, b) => a + b, 0) - result.rtp) < 1e-12);
    assert.ok(result.spins >= (mode === 'base' ? 20 : 240));
    assert.equal(result.batches.reduce((n, b) => n + b.count, 0), 20);
    assert.equal(result.calibrated, false);
    assert.equal(result.configHash.length, 64);
  }
});

test('invalid samples and non-integer seeds cannot produce an RTP report', () => {
  for (const count of [0, 1, 1.5, NaN]) assert.throws(() => simulate({ count }));
  assert.throws(() => simulate({ count: 2, seed: .5 }));
});
