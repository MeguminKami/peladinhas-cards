import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import "../functions/index.js";
import { pathFunctions } from "../functions/paths.js";
import { gameFlowFunctions } from "../functions/game-flow.js";
import { emptyPathState } from "../js/path-model.js";
import { pathMissionTemplates } from "../js/path-missions.js";

const db = getFirestore();
test.before(async () => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST &&
      process.env.GCLOUD_PROJECT?.startsWith("demo-"),
    "Emulador demo obrigatório.",
  );
  const open = await db.collection("games").where("status", "==", "open").get();
  for (const doc of open.docs) await doc.ref.update({ status: "draft" });
});
const endpoints = pathFunctions(async () => {});
const call = (uid, action, values = {}) =>
  endpoints.pathAction.run({ auth: { uid }, data: { action, ...values } });
const player = async () => {
  const uid = `variety-${randomUUID().slice(0, 8)}`;
  await db.doc(`users/${uid}`).set({ uid, role: "admin", disabled: false });
  return uid;
};
const offer = (route, id) => ({
  ...pathMissionTemplates(route, 0, 1).find(
    (row) => row.templateId === `${route}:${id}`,
  ),
  id: "1",
  proposalVersion: 4,
  advance: 50,
  rarity: "silver",
  difficulty: 1,
});

test("v4 backend: saved authoritative offers survive refresh; forged objectives are ignored; reroll is atomic", async () => {
  const uid = await player();
  const first = await call(uid, "offers", { nodeId: "shooting-0-0" });
  const saved = first.offers["shooting-0-0"];
  assert.ok(
    saved.every(
      (row) => row.proposalVersion === 4 && row.templateId && row.family,
    ),
  );
  assert.deepEqual(
    (await call(uid, "offers", { nodeId: "shooting-0-0" })).offers[
      "shooting-0-0"
    ],
    saved,
  );
  const chosen = await call(uid, "accept", {
    nodeId: "shooting-0-0",
    offerId: "1",
    objective: { kind: "wins", target: 0 },
    advance: 200,
  });
  assert.deepEqual(chosen.active.offer, saved[1]);
  const results = await Promise.allSettled([
    call(uid, "reroll", { nodeId: "shooting-0-0" }),
    call(uid, "reroll", { nodeId: "shooting-0-0" }),
  ]);
  assert.equal(results.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal((await db.doc(`pathStates/${uid}`).get()).data().active, null);
});

test("v4 backend: opening freezes full objective and recent family; compound numeric result settles once at close", async () => {
  const uid = await player(),
    opponent = await player(),
    state = emptyPathState(uid),
    selected = offer("shooting", "serve");
  state.nodes["shooting-0-0"] = { progress: 25 };
  state.active = {
    id: randomUUID(),
    nodeId: "shooting-0-0",
    offer: selected,
    acceptedAt: new Date(Date.now() - 60000).toISOString(),
    gameId: null,
  };
  await db.doc(`pathStates/${uid}`).set(state);
  const flow = gameFlowFunctions(endpoints.syncGame);
  const save = (gameId, game) =>
    flow.gameAction.run({ auth: { uid }, data: { gameId, game } });
  const game = {
    title: "Variedade v4",
    location: "",
    notes: "",
    scheduledAt: new Date().toISOString(),
    teamA: { starters: [uid], bench: [] },
    teamB: { starters: [opponent], bench: [] },
    score: { teamA: 0, teamB: 0 },
    positions: { [uid]: "AV" },
    performance: {
      teamA: { goals: [], assists: [] },
      teamB: { goals: [], assists: [] },
    },
    status: "draft",
  };
  const gid = (await save(null, game)).id;
  await save(gid, { ...game, status: "open" });
  const frozen = (await db.doc(`pathStates/${uid}`).get()).data();
  assert.equal(frozen.active, null);
  assert.deepEqual(frozen.pending[0].offer, selected);
  assert.deepEqual(frozen.recentPathFamilies.shooting, [selected.family]);
  await save(gid, {
    ...game,
    status: "closed",
    score: { teamA: 2, teamB: 0 },
    performance: {
      teamA: { goals: [uid, uid], assists: [uid] },
      teamB: { goals: [], assists: [] },
    },
  });
  const settled = await call(uid, "sync");
  assert.equal(settled.lastResult.status, "success");
  assert.equal(settled.nodes["shooting-0-0"].progress, 75);
  assert.ok(
    settled.lastResult.conditionResults.every(
      (row) => row.status === "success",
    ),
  );
  assert.equal(
    (await call(uid, "sync")).history.length,
    settled.history.length,
  );
});

test("v4 backend: historical ratings settle old, mean, overall and strict conditions; insufficient samples cancel", async () => {
  for (const template of [
    "quality",
    "next-mean",
    "next-overall",
    "next-strict",
  ])
    for (const sufficient of [true, false]) {
      const uid = await player(),
        gid = `mixed-${uid}`,
        state = emptyPathState(uid),
        selected = offer("shooting", template);
      const closedAt = Timestamp.fromMillis(Date.now() - 49 * 3600000),
        submittedAt = Timestamp.fromMillis(Date.now() - 48.5 * 3600000);
      const voters = Array.from({ length: 7 }, (_, i) => `${uid}-v${i}`);
      const game = {
        status: "closed",
        scheduledAt: Timestamp.fromMillis(Date.now() - 50 * 3600000),
        closedAt,
        teamA: { starters: [uid, ...voters.slice(0, 3)], bench: [] },
        teamB: { starters: voters.slice(3), bench: [] },
        score: { teamA: 1, teamB: 0 },
        positions: { [uid]: "AV" },
        performance: {
          teamA: { goals: sufficient ? [uid] : [voters[0]], assists: [] },
          teamB: { goals: [], assists: [] },
        },
      };
      state.nodes["shooting-0-0"] = { progress: 25 };
      state.pending = [
        {
          id: randomUUID(),
          nodeId: "shooting-0-0",
          offer: selected,
          gameId: gid,
          acceptedAt: new Date(Date.now() - 51 * 3600000).toISOString(),
          frozenAt: new Date(Date.now() - 50 * 3600000).toISOString(),
          windowVersion: 3,
        },
      ];
      await db.doc(`games/${gid}`).set(game);
      await db.doc(`pathStates/${uid}`).set(state);
      for (const raterId of voters.slice(0, sufficient ? 7 : 6))
        await db.doc(`games/${gid}/feedback/${raterId}`).set({
          raterId,
          targetId: uid,
          submitted: true,
          submittedAt,
          updatedAt: submittedAt,
          ratings: { attack: 4, passing: 4, overall: 4 },
        });
      const result = await call(uid, "sync");
      assert.equal(
        result.lastResult.status,
        sufficient ? "success" : "cancelled",
      );
      assert.equal(result.nodes["shooting-0-0"].progress, sufficient ? 75 : 25);
    }
});
