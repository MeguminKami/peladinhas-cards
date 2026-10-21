import test from "node:test";
import assert from "node:assert/strict";
import { startRevisionUpdates } from "../js/revision-updates.js";
import { nextHomeBoundary } from "../js/data-boundary.js";
import { nextNotificationDeadline } from "../js/notification-deadline.js";

test("reminder checkpoints retain early games, the final voting day and feedback windows", () => {
  assert.equal(
    nextNotificationDeadline(
      [{ status: "open", scheduledAt: "2026-10-21T07:00:00Z" }],
      [],
      { now: +new Date("2026-10-21T00:00:00Z"), feedbackHours: 48 },
    ),
    +new Date("2026-10-21T05:00:00Z"),
  );
  assert.equal(
    nextNotificationDeadline(
      [],
      [{ status: "open", endsAt: "2026-10-21T16:00:00Z" }],
      { now: +new Date("2026-10-20T14:00:00Z"), feedbackHours: 48 },
    ),
    +new Date("2026-10-20T16:00:00Z"),
  );
  assert.equal(
    nextNotificationDeadline(
      [{ status: "closed", closedAt: "2026-10-18T14:00:00Z" }],
      [],
      { now: +new Date("2026-10-20T12:00:00Z"), feedbackHours: 48 },
    ),
    +new Date("2026-10-20T14:00:00Z"),
  );
});

function harness() {
  let change,
    visibility,
    subscriptions = 0,
    stops = 0,
    id = 0;
  const timers = new Map();
  const page = {
    visibilityState: "visible",
    addEventListener(_, fn) {
      visibility = fn;
    },
    removeEventListener() {
      visibility = null;
    },
  };
  const scheduler = {
    setTimeout(fn, delay) {
      timers.set(++id, { fn, delay });
      return id;
    },
    clearTimeout(key) {
      timers.delete(key);
    },
  };
  return {
    page,
    scheduler,
    timers,
    subscribe(fn) {
      subscriptions++;
      change = fn;
      return () => {
        stops++;
      };
    },
    change: (...args) => change(...args),
    hide() {
      page.visibilityState = "hidden";
      visibility();
    },
    show() {
      page.visibilityState = "visible";
      visibility();
    },
    get subscriptions() {
      return subscriptions;
    },
    get stops() {
      return stops;
    },
    async tick(delay) {
      const found = [...timers].find(([, timer]) => timer.delay === delay);
      assert.ok(found, `missing timer ${delay}`);
      timers.delete(found[0]);
      await found[1].fn();
    },
  };
}

test("revisions coalesce bursts; unchanged data and hidden pages cause no refresh", async () => {
  const h = harness();
  let calls = 0;
  const stop = startRevisionUpdates({
    ...h,
    versions: ["a", "b"],
    refresh: async () => {
      calls++;
      return { versions: ["c", "b"] };
    },
  });
  h.change(0, "a");
  h.change(1, "b");
  assert.equal(h.timers.size, 0);
  h.change(0, "c");
  h.change(0, "c");
  h.change(0, "c");
  assert.equal(h.timers.size, 1);
  await h.tick(800);
  assert.equal(calls, 1);
  h.hide();
  assert.equal(h.stops, 1);
  assert.equal(h.timers.size, 0);
  h.show();
  assert.equal(h.subscriptions, 2);
  await h.tick(0);
  assert.equal(calls, 2);
  stop();
  assert.equal(h.stops, 2);
  assert.equal(h.timers.size, 0);
});

test("responses after hiding cannot update the page; pending changes get one further pass", async () => {
  const h = harness();
  let release,
    calls = 0,
    valid;
  const stop = startRevisionUpdates({
    ...h,
    versions: ["a"],
    refresh: async (isCurrent) => {
      calls++;
      await new Promise((resolve) => {
        release = resolve;
      });
      valid = isCurrent();
      return { versions: ["b"] };
    },
  });
  h.change(0, "b");
  const request = h.tick(800);
  h.change(0, "c");
  assert.equal(calls, 1);
  h.hide();
  release();
  await request;
  assert.equal(valid, false);
  assert.equal(h.timers.size, 0);
  stop();
});

test("a past deadline is checked once, with no 100 ms polling loop", async () => {
  const h = harness();
  let calls = 0;
  const stop = startRevisionUpdates({
    ...h,
    validUntil: Date.now() - 1,
    ignoreInitial: true,
    refresh: async () => {
      calls++;
    },
  });
  h.change(0, "initial-token");
  assert.equal(h.timers.size, 1);
  await h.tick(100);
  await h.tick(0);
  assert.equal(calls, 1);
  assert.equal(h.timers.size, 0);
  stop();
});

test("deadlines include Lisbon midnight, the 18h close and pending reviews", () => {
  assert.equal(
    nextHomeBoundary([], +new Date("2026-10-20T22:30:00Z")),
    +new Date("2026-10-20T23:00:00Z"),
  );
  assert.equal(
    nextHomeBoundary([], +new Date("2026-10-21T16:59:00Z")),
    +new Date("2026-10-21T17:00:00Z"),
  );
  assert.equal(
    nextHomeBoundary(
      { pending: [{ reviewDeadline: +new Date("2026-10-20T16:30:00Z") }] },
      +new Date("2026-10-20T16:00:00Z"),
    ),
    +new Date("2026-10-20T16:30:00Z"),
  );
});
