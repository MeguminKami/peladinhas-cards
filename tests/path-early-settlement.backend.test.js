import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import "../functions/index.js";
import { pathFunctions } from "../functions/paths.js";
import { emptyPathState } from "../js/path-model.js";

test.before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.GCLOUD_PROJECT?.startsWith("demo-"), "Emulador demo obrigatório.");
});

test("hourly settlement applies to existing v3/v4 attempts, ignores stale summaries and delivers once", async () => {
  const db = getFirestore();
  const endpoints = pathFunctions(async () => {});
  for (const proposalVersion of [3, 4]) {
    const uid = `early-${randomUUID()}`, gid = `game-${uid}`;
    const roster = [uid, ...Array.from({ length: 9 }, (_, i) => `${uid}-${i}`)];
    const closedAt = Timestamp.fromMillis(Date.now() - 3600000);
    const submittedAt = Timestamp.fromMillis(Date.now() - 1800000);
    const game = {
      status: "closed", closedAt,
      scheduledAt: Timestamp.fromMillis(Date.now() - 7200000),
      teamA: { starters: roster.slice(0, 5), bench: [] },
      teamB: { starters: roster.slice(5), bench: [] },
      score: { teamA: 2, teamB: 0 },
    };
    await db.doc(`users/${uid}`).set({ uid, role: "member", disabled: false });
    await db.doc(`games/${gid}`).set(game);
    // A published summary is deliberately missing: original votes must suffice.
    const state = emptyPathState(uid);
    const offer = { id: "1", proposalVersion, advance: 100,
      objective: { kind: "rating", criterion: "attack", target: 4.1, minRatings: 7 } };
    state.pending = [{ id: `attempt-${uid}`, nodeId: "shooting-0-0", gameId: gid,
      acceptedAt: new Date(Date.now() - 10800000).toISOString(),
      frozenAt: game.scheduledAt.toDate().toISOString(), windowVersion: 3,
      reviewDeadline: closedAt.toMillis() + 48 * 3600000, offer }];
    state.active = { id: `next-${uid}`, nodeId: "passing-0-0", acceptedAt: new Date().toISOString(),
      offer: { ...offer, proposalVersion: 4 } };
    await db.doc(`pathStates/${uid}`).set(state);
    for (const raterId of roster.slice(1, 7)) await db.doc(`games/${gid}/feedback/${raterId}`).set({
      raterId, targetId: uid, submitted: true, submittedAt, updatedAt: submittedAt, ratings: { attack: 5 },
    });
    await endpoints.settlePaths.run({});
    let current = (await db.doc(`pathStates/${uid}`).get()).data();
    assert.equal(current.pending.length, 1);
    assert.deepEqual(current.pending[0].offer, offer);
    assert.equal(current.pending[0].reviewDeadline, state.pending[0].reviewDeadline);
    const seventh = roster[7];
    await db.doc(`games/${gid}/feedback/${seventh}`).set({
      raterId: seventh, targetId: uid, submitted: true, submittedAt, updatedAt: submittedAt, ratings: { attack: 5 },
    });
    await endpoints.settlePaths.run({});
    current = (await db.doc(`pathStates/${uid}`).get()).data();
    assert.equal(current.pending.length, 0);
    assert.equal(current.active.id, state.active.id);
    assert.equal(current.lastResult.status, "success");
    assert.equal(current.lastResult.earlySettlement, true);
    assert.equal(current.lastResult.guaranteedRatings.attack, 4.1);
    assert.equal(current.lastResult.missingVoteStars, 2);
    assert.deepEqual(current.lastResult.offer, offer);
    assert.equal(current.nodes["shooting-0-0"].progress, 100);
    const rewardCount = async () => (await db.collection("eventRewards").where("uid", "==", uid).get()).size;
    assert.equal(await rewardCount(), 1);
    // Later zero votes and edits cannot reopen, revoke or duplicate this result.
    for (const raterId of roster) await db.doc(`games/${gid}/feedback/${raterId}`).set({
      raterId, targetId: uid, submitted: true, submittedAt, updatedAt: submittedAt, ratings: { attack: 0 },
    });
    await endpoints.settlePaths.run({});
    const again = (await db.doc(`pathStates/${uid}`).get()).data();
    assert.deepEqual(again.lastResult, current.lastResult);
    assert.equal(Object.keys(again.reviews || {}).length, 0);
    assert.equal(await rewardCount(), 1);
  }
});
