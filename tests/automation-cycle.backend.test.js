import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { assertTestEmulator } from "../functions/test-environment.js";
import { AUTOMATION_SCHEDULE, CYCLE_JOBS, runAutomationCycle } from "../functions/automation-cycle.js";
import { registeredJobs } from "../functions/policy-runtime.js";

assertTestEmulator();
process.env.GCLOUD_PROJECT = `demo-cycles-${process.pid}`;
const { getEvent, claimMission, closeEvents, systemHeartbeat, onGame, ensureHistory,
  onPathGame, onPathSummary, getPath, pathAction, onGameNotifications, scheduledNotifications } = await import("../functions/index.js");
const db = getFirestore();

test("four Lisbon checks share one checkpoint; failures and overlapping game closures retry", async () => {
  for (const name of CYCLE_JOBS)
    assert.equal(registeredJobs().get(name).schedule, AUTOMATION_SCHEDULE, name);
  let calls = 0;
  await runAutomationCycle(db, "first", async () => { calls++; });
  assert.equal((await runAutomationCycle(db, "first", async () => { calls++; })).current, true);
  assert.equal(calls, 1);
  await assert.rejects(runAutomationCycle(db, "retry", async () => { throw Error("interrupted"); }), /interrupted/);
  await runAutomationCycle(db, "retry", async () => { calls++; });
  let release, started;
  const ready = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const running = runAutomationCycle(db, "schedule", async () => { started(); await gate; });
  await ready;
  await assert.rejects(runAutomationCycle(db, "game", async () => {}), { code: "aborted" });
  release(); await running;
  await runAutomationCycle(db, "game", async () => { calls++; });
  assert.equal(calls, 3);
});

test("page reads do not check objectives; cycles use latest games and delay elapsed events", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-26T11:00:00Z") });
  t.after(() => t.mock.timers.reset());
  const uid = "cycle-player";
  await db.doc(`users/${uid}`).set({ uid, role: "member", disabled: false });
  const event = { schemaVersion: 2, title: "Mission", kind: "mission", method: "objective",
    status: "open", startsAt: Timestamp.fromDate(new Date("2026-10-25T00:00Z")),
    endsAt: Timestamp.fromDate(new Date("2026-10-27T00:00Z")),
    cadence: "once", maxRepeats: 1, scope: "individual", participantIds: [uid],
    objective: { metric: "goals", target: 3 }, prerequisites: { mode: "all", missionIds: [] } };
  await db.doc("events/cycle-mission").set(event);
  await db.doc("events/cycle-mission/private/rewards").set({ positions: [] });
  const game = { status: "closed", closedAt: Timestamp.fromDate(new Date("2026-10-26T10:00Z")),
    scheduledAt: Timestamp.fromDate(new Date("2026-10-26T09:00Z")),
    teamA: { starters: [uid], bench: [] }, teamB: { starters: [], bench: [] },
    score: { teamA: 1, teamB: 0 }, performance: { teamA: { goals: [uid], assists: [] }, teamB: { goals: [], assists: [] } } };
  await db.doc("games/cycle-game").set(game);
  const request = { auth: { uid }, data: { eventId: "cycle-mission" } };
  assert.deepEqual((await getEvent.run(request)).progress, []);
  await closeEvents.run({ cycle: true });
  assert.equal((await getEvent.run(request)).progress[0].progress, 1);
  await db.doc("games/cycle-game").update({ "performance.teamA.goals": [uid, uid, uid] });
  assert.equal((await getEvent.run(request)).progress[0].progress, 1, "reads reuse the published result");
  await assert.rejects(claimMission.run(request), /objetivo/);
  await closeEvents.run({ cycle: true });
  assert.equal((await getEvent.run(request)).progress[0].progress, 3);
  assert.equal((await ensureHistory.run({ auth: { uid } })).scheduled, true);
  assert.equal((await db.doc(`weeklyCards/${uid}`).get()).exists, false);
  await onPathGame.run({}); await onPathSummary.run({});
  assert.deepEqual(await pathAction.run({ auth: { uid }, data: { action: "sync" } }), await getPath.run({ auth: { uid } }));
  await db.doc("events/cycle-mission").update({ endsAt: Timestamp.fromDate(new Date("2026-10-26T10:30Z")) });
  await getEvent.run(request);
  assert.equal((await db.doc("events/cycle-mission").get()).data().status, "open");
  await closeEvents.run({ cycle: true });
  assert.equal((await db.doc("events/cycle-mission").get()).data().status, "closed");
});

test("all scheduled endpoints coalesce and closing a game starts another full cycle", async () => {
  const event = { scheduleTime: "2026-10-26T12:00:00Z" };
  await systemHeartbeat.run(event);
  assert.equal((await closeEvents.run(event)).current, true);
  const game = (await db.doc("games/cycle-game").get()).data();
  await onGame.run({ id: "closed-delivery", params: { gid: "cycle-game" }, data: {
    before: { data: () => ({ ...game, status: "open" }) }, after: { data: () => game },
  } });
  const count = (await db.collection("automationCycles").get()).size;
  await onGame.run({ id: "closed-delivery", params: { gid: "cycle-game" }, data: {
    before: { data: () => ({ ...game, status: "open" }) }, after: { data: () => game },
  } });
  assert.equal((await db.collection("automationCycles").get()).size, count);
});

test("queued announcements survive quiet hours and duplicate deliveries keep their identity", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-26T23:00:00Z") });
  t.after(() => t.mock.timers.reset());
  const uid = "notice-cycle-player", gid = "notice-cycle-game";
  await db.doc(`users/${uid}`).set({ uid, role: "member", disabled: false });
  const game = { title: "Next game", location: "Pitch", status: "open",
    scheduledAt: Timestamp.fromDate(new Date("2026-10-27T20:00Z")),
    teamA: { starters: [uid], bench: [] }, teamB: { starters: [], bench: [] } };
  await db.doc(`games/${gid}`).set(game);
  const delivery = { id: "same-notice-delivery", params: { gid }, data: {
    before: { data: () => ({ ...game, status: "draft" }) }, after: { data: () => game },
  } };
  await onGameNotifications.run(delivery);
  assert.equal((await db.collection(`users/${uid}/notifications`).get()).size, 0);
  await scheduledNotifications.run({ cycle: true });
  await onGameNotifications.run(delivery);
  await scheduledNotifications.run({ cycle: true });
  assert.equal((await db.collection(`users/${uid}/notifications`).where("type", "==", "GAME_CALLUP").get()).size, 1);
  assert.equal((await db.collection(`users/${uid}/notifications`).where("type", "==", "GAME_REMINDER").get()).size, 0);
});
