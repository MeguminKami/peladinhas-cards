import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { assertTestEmulator } from "../functions/test-environment.js";
import {
  invalidateHome,
  plain,
  homeProjection,
} from "../functions/home-cache.js";
import { runChangedMaintenance } from "../functions/maintenance-gate.js";
import { ATTRIBUTES } from "../js/utils.js";
import { cardWeek } from "../js/card-week.js";

assertTestEmulator();
// This test asserts exact population/read budgets. Give its worker an isolated
// demo namespace even when it runs after the full backend regression suite.
process.env.GCLOUD_PROJECT = `demo-home-${Date.now().toString(36)}-${process.pid}`;
const {
  getHome,
  closeEvents,
  eventAction,
  onHomeSource,
  onHomeFeedback,
  onHomeVote,
} = await import("../functions/index.js");

test("home caches isolate personal missions, reuse the league and invalidate only on meaningful writes", async (t) => {
  for (const endpoint of [getHome, onHomeSource, onHomeFeedback, onHomeVote]) {
    assert.deepEqual(endpoint.__endpoint.region, ["europe-west1"]);
    assert.equal(endpoint.__endpoint.maxInstances, 3);
  }
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-18T14:00:00Z"),
  });
  const db = getFirestore(),
    ids = Array.from({ length: 20 }, (_, i) => `home-${i}`);
  const when = Timestamp.fromDate(new Date("2026-10-17T14:00:00Z"));
  const batch = db.batch();
  for (const uid of ids) {
    batch.set(db.doc(`users/${uid}`), {
      uid,
      username: uid,
      displayName: uid,
      role: uid === ids[0] ? "admin" : "member",
      disabled: false,
      country: "Portugal",
      countryCode: "PT",
      birthDate: "1998-01-01",
      heightCm: 178,
      preferredFoot: "right",
      primaryPosition: "MED",
      photoURL: "",
      tokensValidAfter: 0,
      privateField: "do not publish",
      createdAt: when,
    });
    batch.set(db.doc(`initialRatings/${uid}`), {
      uid,
      ratings20: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 14])),
      createdAt: when,
    });
  }
  batch.set(db.doc("games/home-game"), {
    title: "Teste local",
    status: "closed",
    scheduledAt: when,
    closedAt: when,
    teamA: { starters: ids.slice(0, 5), bench: [] },
    teamB: { starters: ids.slice(5, 10), bench: [] },
    score: { teamA: 5, teamB: 4 },
  });
  await batch.commit();
  const mission = await eventAction.run({
    auth: { uid: ids[0] },
    data: {
      action: "create",
      schemaVersion: 2,
      title: "Duas presenças",
      kind: "mission",
      method: "objective",
      startsAt: "2026-10-16T00:00:00Z",
      endsAt: "2026-10-25T00:00:00Z",
      audience: { mode: "all" },
      winnerCount: 1,
      positions: [
        {
          mode: "card",
          statDuration: "weekly",
          boosts: {},
          specialId: "sniper",
        },
      ],
      scope: "individual",
      objective: { metric: "games", target: 2 },
      maxRepeats: 1,
      openNow: true,
    },
  });
  const call = (uid) => getHome.run({ auth: { uid }, data: {} });
  const [first, concurrent] = await Promise.all([call(ids[0]), call(ids[0])]);
  assert.deepEqual(first, concurrent, "concurrent opens share the same build");
  assert.equal(first.league.players.length, 20);
  assert.equal(first.league.games.length, 1);
  assert.ok(first.missions.some((m) => m.type === "GAME_FEEDBACK"));
  assert.equal(
    first.missions.find((m) => m.id === `event-${mission.id}`).done,
    1,
  );
  assert.ok(
    first.league.players.every(
      (player) =>
        !Object.hasOwn(player, "privateField") &&
        !Object.hasOwn(player, "tokensValidAfter") &&
        !Object.hasOwn(player, "initial"),
    ),
  );
  assert.ok(first.validUntil > Date.now());
  assert.equal(first.league.cycle.weekId, cardWeek().weekId);
  const weekly = Array.from({ length: 8 }, (_, index) => ({
    gameId: `weekly-${index}`,
    date: "2026-10-17T14:00:00Z",
    attack: 4,
    count: 3,
  }));
  const projected = homeProjection(
    {
      ...first.league,
      players: [{ ...first.league.players[0], aggregates: weekly }],
    },
    ids[0],
  );
  assert.equal(
    projected.players[0].aggregates.length,
    8,
    "the podium retains the entire current week, including the owner's games",
  );

  let reads = 0,
    queries = 0,
    queryCollections = [];
  const originalGetAll = db.getAll;
  t.mock.method(db, "getAll", async function (...refs) {
    reads += refs.filter((ref) => typeof ref?.path === "string").length;
    return originalGetAll.apply(this, refs);
  });
  const prototype = Object.getPrototypeOf(
    db.collection("users").where("disabled", "==", false),
  );
  const queryGet = prototype.get;
  t.mock.method(prototype, "get", async function (...args) {
    queries++;
    queryCollections.push(this._queryOptions?.collectionId);
    return queryGet.apply(this, args);
  });
  const warm = await call(ids[0]);
  assert.deepEqual(warm, first);
  assert.equal(queries, 0, "warm home never queries a collection");
  assert.equal(
    reads,
    5,
    "settings, actor, two revision docs and one cached result",
  );
  t.diagnostic(
    `Warm home: ${reads} document reads, ${queries} collection queries (20 players).`,
  );
  reads = 0;
  queries = 0;
  queryCollections = [];
  const second = await call(ids[10]);
  assert.equal(
    second.missions.find((m) => m.id === `event-${mission.id}`).done,
    0,
  );
  assert.ok(!second.missions.some((m) => m.type === "GAME_FEEDBACK"));
  assert.ok(second.missions.some((m) => m.id === `new-${ids[0]}`));
  assert.ok(!second.missions.some((m) => m.id === `new-${ids[10]}`));
  assert.ok(
    !queryCollections.includes("users") &&
      !queryCollections.includes("initialRatings") &&
      !queryCollections.includes("gameSummaries"),
    "another player reuses the shared league context",
  );

  const third = await call(ids[11]);
  const leaseRef = db.doc(`homeCache/player-${ids[11]}`);
  const published = (await leaseRef.get()).data();
  await leaseRef.set({
    leaseId: "another-instance",
    leaseUntil: Date.now() + 180000,
  });
  const delivery = new Promise((resolve) => setTimeout(resolve, 200)).then(() =>
    leaseRef.set(published),
  );
  const [waited] = await Promise.all([call(ids[11]), delivery]);
  assert.deepEqual(
    waited,
    third,
    "another instance's completed cache is shared without rebuilding",
  );
  const cardsVersion = (await db.doc("homeCache/league").get()).data().version;
  const oldEvent = (await db.doc(`events/${mission.id}`).get()).data();
  await db.doc(`events/${mission.id}`).update({ title: "Objetivo atualizado" });
  await invalidateHome("events", mission.id, oldEvent, {
    ...oldEvent,
    title: "Objetivo atualizado",
  });
  const eventUpdated = await call(ids[0]);
  assert.equal(
    eventUpdated.missions.find((m) => m.id === `event-${mission.id}`).title,
    "Objetivo atualizado",
  );
  assert.equal(
    (await db.doc("homeCache/league").get()).data().version,
    cardsVersion,
    "event edits refresh missions without recalculating league cards",
  );

  const previous = (await db.doc(`users/${ids[0]}`).get()).data();
  await db.doc(`users/${ids[0]}`).update({ displayName: "Nome atualizado" });
  await invalidateHome("users", ids[0], previous, {
    ...previous,
    displayName: "Nome atualizado",
  });
  const updated = await call(ids[0]);
  assert.equal(
    updated.league.players.find((p) => p.uid === ids[0]).displayName,
    "Nome atualizado",
  );
  const signalsBefore = (await db.doc("homeSignals/global").get()).data();
  await invalidateHome("users", ids[0], previous, {
    ...previous,
    updatedAt: Timestamp.now(),
  });
  assert.deepEqual(
    (await db.doc("homeSignals/global").get()).data(),
    signalsBefore,
  );
  await invalidateHome("votes", ids[10], null, {
    uid: ids[10],
    eventId: "live-vote",
    answers: { winner: ids[0] },
  });
  assert.ok((await db.doc("eventSignals/live-vote").get()).data().version);
  assert.deepEqual(
    (await db.doc("homeSignals/global").get()).data(),
    signalsBefore,
    "a vote updates the event without rebuilding league cards",
  );

  const otherBefore = (
    await db.doc(`homeCache/player-${ids[10]}`).get()
  ).data();
  const otherSignal = (await db.doc(`homeSignals/${ids[10]}`).get()).data();
  await invalidateHome("pathStates", ids[0], null, {
    uid: ids[0],
    revision: 1,
  });
  assert.deepEqual(
    (await db.doc(`homeSignals/${ids[10]}`).get()).data(),
    otherSignal,
  );
  assert.deepEqual(
    (await db.doc(`homeCache/player-${ids[10]}`).get()).data(),
    otherBefore,
  );
  assert.deepEqual(
    (await db.doc("homeSignals/global").get()).data(),
    signalsBefore,
  );
  await db.doc(`users/${ids[0]}`).update({ disabled: true });
  await assert.rejects(call(ids[0]), { code: "permission-denied" });
  await db.doc(`users/${ids[10]}`).update({ tokensValidAfter: 100 });
  await assert.rejects(call(ids[10]), { code: "unauthenticated" });
  await assert.rejects(getHome.run({ data: {} }), { code: "unauthenticated" });
  assert.deepEqual(plain({ date: when }), { date: "2026-10-17T14:00:00.000Z" });
});

test("durable maintenance checkpoints honor deadlines, failures and writes during work", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-18T14:00:00Z"),
  });
  const db = getFirestore();
  let calls = 0;
  const work = async () => {
    calls++;
    return { ok: true, nextAt: Date.now() + 3600000 };
  };
  await runChangedMaintenance("settlePaths", work);
  assert.equal(
    (await runChangedMaintenance("settlePaths", work)).current,
    true,
  );
  assert.equal(calls, 1);
  t.mock.timers.tick(3600001);
  await runChangedMaintenance("settlePaths", work);
  assert.equal(calls, 2);
  await invalidateHome("games", "changed", null, { status: "closed" });
  await assert.rejects(
    runChangedMaintenance("settlePaths", async () => {
      throw Error("retry");
    }),
    /retry/,
  );
  await runChangedMaintenance("settlePaths", async () => {
    calls++;
    await invalidateHome("games", "during", null, { status: "closed" });
    return { ok: true, nextAt: Date.now() + 3600000 };
  });
  await runChangedMaintenance("settlePaths", work);
  assert.equal(
    calls,
    4,
    "a write during calculation is still pending afterwards",
  );
  const events = await closeEvents.run({ incremental: true });
  assert.equal(events.ok, true);
  assert.equal((await closeEvents.run({ incremental: true })).current, true);
  assert.equal(
    (await closeEvents.run({ scheduleTime: new Date().toISOString() })).current,
    true,
  );
  await invalidateHome("pathStates", "only-this-player", null, { revision: 1 });
  assert.equal(
    (await closeEvents.run({ incremental: true })).current,
    true,
    "a path choice does not enqueue event maintenance",
  );
});
