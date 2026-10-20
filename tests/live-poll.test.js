import test from "node:test";
import assert from "node:assert/strict";
import { startLivePoll } from "../js/live-poll.js";

test("live refresh skips hidden/offline tabs, overlaps and departed pages", async () => {
  let tick, delay, cleared = 0, calls = 0, current = true, connected = true, release;
  const page = { visibilityState: "visible" };
  const scheduler = {
    setInterval(fn, ms) { tick = fn; delay = ms; return 1; },
    clearInterval(id) { assert.equal(id, 1); cleared++; },
  };
  const stop = startLivePoll(async valid => {
    calls++;
    await new Promise(resolve => { release = resolve; });
    assert.equal(valid(), current);
  }, { page, scheduler, online: () => connected, isCurrent: () => current });
  assert.equal(delay, 60000);
  assert.equal(calls, 0);
  page.visibilityState = "hidden";
  await tick();
  page.visibilityState = "visible";
  connected = false;
  await tick();
  assert.equal(calls, 0);
  connected = true;
  const pending = tick();
  await tick();
  assert.equal(calls, 1);
  current = false;
  release();
  await pending;
  await tick();
  assert.equal(cleared, 1);
  await tick();
  assert.equal(calls, 1);
  stop();
});

test("live refresh retries after failure and discards responses after disposal", async () => {
  let tick, calls = 0, release, validAfter;
  const stop = startLivePoll(async valid => {
    if (++calls === 1) throw Error("offline");
    await new Promise(resolve => { release = resolve; });
    validAfter = valid();
  }, { page: { visibilityState: "visible" }, online: () => true,
    scheduler: { setInterval(fn) { tick = fn; return 1; }, clearInterval() {} } });
  await tick();
  const pending = tick();
  stop();
  release();
  await pending;
  assert.equal(calls, 2);
  assert.equal(validAfter, false);
});
