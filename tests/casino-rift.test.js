import test from "node:test";
import assert from "node:assert/strict";
import { applyLocalRift } from "../js/casino-rift-local.js";
import { fresh, purchasePrice } from "../games/rift-core-overdrive/engine.js";

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
  assert.equal(next.debit, Math.round(purchasePrice("core", .1) * 100));
  let count = 0;
  while (next.session.state.round) {
    next = applyLocalRift(next.session, next.balance, input(next.session, null, .1));
    assert.equal(next.debit, 0);
    assert.ok(++count <= 40);
  }
  assert.ok(count > 0);
});


test("Rift resumes a 4.6 bonus with its archived engine and credits the same amount", async () => {
  const old = await import("../games/rift-core-overdrive/engine-v4.6.js");
  const state = old.fresh(847);old.play(state,{buy:"core"});
  const current = {sessionId:"legacy-rift",revision:1,state};
  const expected = structuredClone(state);expected.pending=null;
  const record = old.play(expected),balance=Math.round(state.balance*100);
  const next = applyLocalRift(current,balance,{action:"play",payload:{sessionId:current.sessionId,expectedRevision:1,previousRecordId:state.pending.id,bet:state.bet,hunt:false,buy:null}});
  assert.equal(next.debit,0);assert.equal(next.credit,Math.round(record.win*100));
  assert.equal(next.balance,balance+next.credit);assert.equal(next.result.state.history[0].mathVersion,"rift-4.6");
});

test("Rift resumes a 4.7 bonus with its archived engine and credits the same amount", async () => {
  const old = await import("../games/rift-core-overdrive/engine-v4.7.js");
  const state = old.fresh(847);old.play(state,{buy:"core"});
  const current = {sessionId:"legacy-rift",revision:1,state};
  const expected = structuredClone(state);expected.pending=null;
  const record = old.play(expected),balance=Math.round(state.balance*100);
  const next = applyLocalRift(current,balance,{action:"play",payload:{sessionId:current.sessionId,expectedRevision:1,previousRecordId:state.pending.id,bet:state.bet,hunt:false,buy:null}});
  assert.equal(next.debit,0);assert.equal(next.credit,Math.round(record.win*100));
  assert.equal(next.balance,balance+next.credit);assert.equal(next.result.state.history[0].mathVersion,"rift-4.7");
});

test("Rift resumes a 4.11 bonus without applying the reduced 4.12 paytable", async () => {
  const old = await import("../games/rift-core-overdrive/engine-v4.11.js");
  const state = old.fresh(847); old.play(state, { buy: "core" });
  const current = { sessionId: "legacy-rift-411", revision: 1, state };
  const expected = structuredClone(state); expected.pending = null;
  const record = old.play(expected), balance = Math.round(state.balance * 100);
  const next = applyLocalRift(current, balance, { action: "play", payload: {
    sessionId: current.sessionId, expectedRevision: 1, previousRecordId: state.pending.id,
    bet: state.bet, hunt: false, buy: null,
  } });
  assert.equal(next.debit, 0);
  assert.equal(next.credit, Math.round(record.win * 100));
  assert.equal(next.balance, balance + next.credit);
  assert.equal(next.result.state.history[0].mathVersion, "rift-4.11");
});

test("Rift resumes a 4.12 bonus with its original ways table and cascade multiplier", async () => {
  const old = await import("../games/rift-core-overdrive/engine-v4.12.js");
  const state = old.fresh(847); old.play(state, { buy: "core" });
  const current = { sessionId: "legacy-rift-412", revision: 1, state };
  const expected = structuredClone(state); expected.pending = null;
  const record = old.play(expected), balance = Math.round(state.balance * 100);
  const next = applyLocalRift(current, balance, { action: "play", payload: {
    sessionId: current.sessionId, expectedRevision: 1, previousRecordId: state.pending.id,
    bet: state.bet, hunt: false, buy: null,
  } });
  assert.equal(next.debit, 0); assert.equal(next.credit, Math.round(record.win * 100));
  assert.equal(next.balance, balance + next.credit);
  assert.equal(next.result.state.history[0].mathVersion, "rift-4.12");
});

test("Rift resumes a 4.13 bonus with its original price and feature profile", async () => {
  const old = await import("../games/rift-core-overdrive/engine-v4.13.js");
  const state = old.fresh(847); old.play(state, { buy: "core" });
  const current = { sessionId: "legacy-rift-413", revision: 1, state };
  const expected = structuredClone(state); expected.pending = null;
  const record = old.play(expected), balance = Math.round(state.balance * 100);
  const next = applyLocalRift(current, balance, { action: "play", payload: {
    sessionId: current.sessionId, expectedRevision: 1, previousRecordId: state.pending.id,
    bet: state.bet, hunt: false, buy: null,
  } });
  assert.equal(next.debit, 0); assert.equal(next.credit, Math.round(record.win * 100));
  assert.equal(next.balance, balance + next.credit);
  assert.equal(next.result.state.history[0].mathVersion, "rift-4.13");
});
