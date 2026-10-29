import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getPath, pathAction } from "../functions/index.js";
import { pathFunctions } from "../functions/paths.js";
import {
  emptyPathState,
  pathNode,
  createPathOffers,
} from "../js/path-model.js";

const db = getFirestore();
test("paths: legacy settlement stays idempotent and archived corrections preserve rewards without blocking new choices", async () => {
  const suffix = randomUUID().slice(0, 8),
    uid = `legacy-review-${suffix}`,
    admin = `review-admin-${suffix}`,
    gid = `review-game-${suffix}`;
  for (const id of [uid, admin])
    await db.doc(`users/${id}`).set({
      uid: id,
      role: id === admin ? "admin" : "member",
      disabled: false,
    });
  const endpoints = pathFunctions(async () => {});
  const call = async (action, values = {}, actor = uid) => {
    if (action === "sync") await endpoints.settlePaths.run({});
    return endpoints.pathAction.run({
      auth: { uid: actor },
      data: { action, ...values },
    });
  };
  await assert.rejects(pathAction.run({ data: { action: "offers" } }));
  assert.equal(
    (await getPath.run({ auth: { uid }, data: { uid: admin } })).uid,
    uid,
  );
  await assert.rejects(call("offers", { nodeId: "shooting-14-0" }));
  const state = emptyPathState(uid);
  state.nodes["shooting-0-0"] = { progress: 75 };
  state.active = {
    id: `attempt-${suffix}`,
    nodeId: "shooting-0-0",
    offer: { id: "old", advance: 25, objective: { kind: "goals", target: 1 } },
    gameId: gid,
    acceptedAt: new Date(Date.now() - 7200000).toISOString(),
  };
  await db.doc(`pathStates/${uid}`).set(state);
  await db.doc(`games/${gid}`).set({
    status: "closed",
    scheduledAt: Timestamp.fromMillis(Date.now() - 3600000),
    closedAt: Timestamp.now(),
    teamA: { starters: [uid], bench: [] },
    teamB: { starters: [admin], bench: [] },
    score: { teamA: 1, teamB: 0 },
    performance: { teamA: { goals: [uid], assists: [] } },
  });
  const settled = await call("sync");
  assert.equal(settled.lastResult.status, "success");
  await call("sync");
  assert.equal(
    (await db.collection("eventRewards").where("uid", "==", uid).get()).size,
    1,
  );
  const attemptId = settled.lastResult.id;
  await db.doc(`pathStates/${uid}`).update({ history: [] });
  await db.doc(`games/${gid}`).update({ score: { teamA: 2, teamB: 0 } });
  await endpoints.syncGame(gid);
  const reviewed = (await db.doc(`pathStates/${uid}`).get()).data();
  assert.ok(reviewed.reviews[attemptId]);
  assert.equal(reviewed.reviews[attemptId].decision, "preserve");
  assert.ok(reviewed.reviews[attemptId].acknowledgedAt);
  await call(
    "acknowledge",
    { uid, attemptId, reason: "Conservar a conquista validada." },
    admin,
  );
  assert.ok(
    (await call("offers", { nodeId: "passing-0-0" })).offers["passing-0-0"],
  );
});

test("paths: daily reroll and route selection persist, share one allowance and serialize concurrent requests", async (t) => {
  const uid = `path-reroll-${randomUUID().slice(0, 8)}`;
  await db.doc(`users/${uid}`).set({ uid, role: "member", disabled: false });
  const endpoints = pathFunctions(async () => {});
  const call = (action, values = {}) =>
    endpoints.pathAction.run({ auth: { uid }, data: { action, ...values } });
  await call("offers", { nodeId: "shooting-0-0" });
  const initial = await call("offers", { nodeId: "passing-0-0" });
  const selected = await call("select", { nodeId: "passing-0-0" });
  assert.equal(selected.selectedNode, "passing-0-0");
  assert.deepEqual(selected.offers, initial.offers);
  const concurrent = await Promise.allSettled([
    call("reroll", { nodeId: "shooting-0-0" }),
    call("reroll", { nodeId: "shooting-0-0" }),
  ]);
  assert.equal(
    concurrent.filter((row) => row.status === "fulfilled").length,
    1,
  );
  const state = (await db.doc(`pathStates/${uid}`).get()).data();
  assert.ok(state.rerollDay);
  assert.deepEqual(state.offers["passing-0-0"], initial.offers["passing-0-0"]);
  await assert.rejects(call("reroll", { nodeId: "passing-0-0" }), /hoje/);
  assert.deepEqual(
    (await call("offers", { nodeId: "shooting-0-0" })).offers,
    state.offers,
  );
  await db.doc(`pathStates/${uid}`).update({
    rerollDay: "2026-01-01",
    active: {
      id: "prepared",
      nodeId: "shooting-0-0",
      offer: state.offers["shooting-0-0"][0],
      acceptedAt: new Date().toISOString(),
      gameId: null,
    },
  });

  const renewed = await call("reroll", { nodeId: "passing-0-0" });
  assert.notEqual(renewed.rerollDay, "2026-01-01");
});

test("paths: multi-node overflow delivers capped rewards once in the same settlement", async () => {
  const suffix = randomUUID().slice(0, 8),
    uid = `path-overflow-${suffix}`,
    gid = `path-overflow-game-${suffix}`;
  await db.doc(`users/${uid}`).set({ uid, role: "member", disabled: false });
  const state = emptyPathState(uid);
  state.nodes["shooting-0-0"] = { progress: 75 };
  state.active = {
    id: `attempt-${suffix}`,
    nodeId: "shooting-0-0",
    offer: {
      id: "2",
      proposalVersion: 2,
      advance: 200,
      objective: { kind: "goals", target: 3 },
    },
    acceptedAt: "2026-10-01T10:00:00Z",
    gameId: gid,
  };
  await db.doc(`pathStates/${uid}`).set(state);
  await db.doc(`eventRewards/existing-${suffix}`).set({
    uid,
    source: "path",
    createdAt: "2026-10-01",
    reward: { statDuration: "permanent", boosts: { shooting: 14 } },
  });
  await db.doc(`games/${gid}`).set({
    status: "closed",
    scheduledAt: Timestamp.fromDate(new Date("2026-10-02T10:00:00Z")),
    closedAt: Timestamp.fromDate(new Date("2026-10-02T12:00:00Z")),
    teamA: { starters: [uid], bench: [] },
    teamB: { starters: [], bench: [] },
    score: { teamA: 3, teamB: 0 },
    performance: { teamA: { goals: [uid, uid, uid], assists: [] } },
    positions: { [uid]: "AV" },
  });
  const endpoints = pathFunctions(async () => {});
  const call = async () => {
    await endpoints.settlePaths.run({});
    return endpoints.pathAction.run({ auth: { uid }, data: { action: "sync" } });
  };
  const settled = await call();
  assert.deepEqual(settled.lastResult.completedNodeIds, [
    "shooting-0-0",
    "shooting-1-0",
  ]);
  assert.equal(settled.nodes["shooting-2-0"].progress, 75);
  const rewards = await db
    .collection("eventRewards")
    .where("uid", "==", uid)
    .get();
  assert.equal(rewards.size, 3);
  assert.equal(
    rewards.docs.reduce(
      (sum, doc) => sum + (doc.data().reward.boosts.shooting || 0),
      0,
    ),
    15,
  );
  assert.equal(settled.lastResult.rewards.length, 2);
  await call();
  assert.equal(
    (await db.collection("eventRewards").where("uid", "==", uid).get()).size,
    3,
  );
});

test("paths: a previously accepted tenth-stage proposal keeps its permanent card eligibility", async () => {
  const suffix = randomUUID().slice(0, 8),
    uid = `path-legacy-${suffix}`,
    gid = `path-legacy-game-${suffix}`;
  await db.doc(`users/${uid}`).set({ uid, role: "member", disabled: false });
  const state = emptyPathState(uid);
  for (let tier = 0; tier < 9; tier++)
    state.nodes[`shooting-${tier}-0`] = {
      progress: 100,
      completedAt: "2026-09-01",
    };
  state.active = {
    id: `legacy-${suffix}`,
    nodeId: "shooting-9-0",
    offer: { id: "2", advance: 100, objective: { kind: "goals", target: 1 } },
    acceptedAt: "2026-10-01T10:00:00Z",
    gameId: gid,
  };
  await db.doc(`pathStates/${uid}`).set(state);
  await db.doc(`games/${gid}`).set({
    status: "closed",
    scheduledAt: Timestamp.fromDate(new Date("2026-10-02T10:00:00Z")),
    closedAt: Timestamp.fromDate(new Date("2026-10-02T12:00:00Z")),
    teamA: { starters: [uid], bench: [] },
    teamB: { starters: [], bench: [] },
    score: { teamA: 1, teamB: 0 },
    performance: { teamA: { goals: [uid], assists: [] } },
  });
  const endpoints = pathFunctions(async () => {});
  await endpoints.settlePaths.run({});
  const result = await endpoints.pathAction.run({
    auth: { uid },
    data: { action: "sync" },
  });
  assert.equal(result.lastResult.reward.specialId, "path-shooting");
  assert.equal(result.selectedNode, "shooting-10-0");
});
