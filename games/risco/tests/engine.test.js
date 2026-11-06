import test from 'node:test';
import assert from 'node:assert/strict';
import { createRound, crashFromUniform52, crashFromSeed, multiplierAt, timeAtMultiplier, payout, resolveRound, publicRound, MAX_MULTIPLIER_CENTS } from '../src/engine.js';
test('52-bit boundaries use exact integer division and cap', () => {
  assert.equal(crashFromUniform52(0), 100);
  assert.equal(crashFromUniform52(2 ** 52 - 1), MAX_MULTIPLIER_CENTS);
  for (const cents of [101, 150, 200, 10000, 999900]) {
    const threshold = Number(((1n << 52n) * BigInt(cents - 99) + BigInt(cents) - 1n) / BigInt(cents));
    assert.ok(crashFromUniform52(threshold) >= cents);
    assert.ok(crashFromUniform52(threshold - 1) < cents);
  }
});
test('seed determinism and integer payment', () => {
  assert.equal(crashFromSeed('regression'), crashFromSeed('regression'));
  assert.equal(payout(3, 150), 4);
  assert.equal(payout(123, 999900), 1229877);
  assert.throws(() => payout(1.5, 100));
});
const base = () => ({ ...createRound({ seed: 'test', betUnits: 100 }), crashCents: 200 });
test('manual strict boundary, auto inclusive boundary and late polling', () => {
  assert.equal(resolveRound(base(), { elapsedMs: timeAtMultiplier(199), cashout: true }).payoutUnits, 199);
  assert.equal(resolveRound(base(), { elapsedMs: timeAtMultiplier(200), cashout: true }).status, 'crashed');
  assert.equal(resolveRound({ ...base(), autoCashoutCents: 200 }, { elapsedMs: timeAtMultiplier(500) }).payoutUnits, 200);
  assert.equal(resolveRound({ ...base(), crashCents: 100 }, { elapsedMs: 0, cashout: true }).status, 'crashed');
  assert.equal(resolveRound(base(), { elapsedMs: 0, cashout: true }).status, 'running');
});
test('forced ceiling and monotonic time', () => {
  const round = { ...base(), crashCents: MAX_MULTIPLIER_CENTS };
  assert.equal(resolveRound(round, { elapsedMs: timeAtMultiplier(MAX_MULTIPLIER_CENTS) }).payoutUnits, 999900);
  assert.equal(multiplierAt(1e9), MAX_MULTIPLIER_CENTS);
  assert.throws(() => resolveRound({ ...round, elapsedMs: 10 }, { elapsedMs: 9 }));
});
test('public view conceals outcome before crash including after cashout', () => {
  const round = resolveRound(base(), { elapsedMs: timeAtMultiplier(150), cashout: true });
  assert.equal('seed' in publicRound(round), false);
  assert.equal('crashCents' in publicRound(round), false);
  assert.equal(publicRound(round, timeAtMultiplier(200)).crashCents, 200);
});
