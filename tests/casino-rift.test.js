import test from "node:test";
import assert from "node:assert/strict";
import { applyLocalRift } from "../js/casino-rift-local.js";
import { fresh } from "../games/rift-core-overdrive/engine.js";

const session = () => ({ sessionId: "test-rift-session", revision: 0, state: fresh(12345) });
const input = (current, buy = null, bet = 1) => ({ action: "play", payload: {
  sessionId: current.sessionId, expectedRevision: current.revision,
  previousRecordId: current.state.pending?.id || null, bet, hunt: false, buy,
} });

test("Rift local uses the shared balance and leaves the previous snapshot untouched", () => {
  const original = session(), snapshot = structuredClone(original);
  const next = applyLocalRift(original, 100000, input(original));
  assert.deepEqual(original, snapshot);
  assert.equal(next.debit, 100);
  assert.equal(next.balance, 100000 - next.debit + next.credit);
  assert.equal(next.result.revision, 1);
  assert.equal(next.result.state.balance * 100, next.balance);
  assert.ok(!("rng" in next.result.state));
  assert.throws(() => applyLocalRift(next.session, next.balance, input(original)), /sessão mudou/i);
});

test("Rift local rejects unaffordable purchases before changing money or the RNG", () => {
  const original = session(), snapshot = structuredClone(original);
  assert.throws(() => applyLocalRift(original, 20, input(original, "overdrive", 100)), /insuficiente/i);
  assert.deepEqual(original, snapshot);
});

test("Rift local charges a bonus purchase once and free spins have zero debit", () => {
  const original = session();
  let next = applyLocalRift(original, 100000, input(original, "core", .1));
  assert.equal(next.debit, 790);
  let count = 0;
  while (next.session.state.round) {
    next = applyLocalRift(next.session, next.balance, input(next.session, null, .1));
    assert.equal(next.debit, 0);
    assert.ok(++count <= 40);
  }
  assert.ok(count > 0);
});
