import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { correctRating, processFeedback } from "../functions/index.js";
import {
  gameFlowFunctions,
  validateGameInput,
} from "../functions/game-flow.js";
import { pathFunctions } from "../functions/paths.js";
import {
  emptyPathState,
  createPathOffers,
  pathNode,
  pathVisibleRoute,
} from "../js/path-model.js";
import { pathReviewDeadline } from "../js/path-window.js";

const db = getFirestore();
test.before(async () => {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.GCLOUD_PROJECT?.startsWith("demo-")
  )
    throw Error("Emulator demo obrigatório.");
  const open = await db.collection("games").where("status", "==", "open").get();
  for (const doc of open.docs) await doc.ref.update({ status: "draft" });
});
const ratings = {
  overall: 4,
  attack: 4,
  passing: 4,
  defense: 4,
  physical: 4,
  goalkeeping: null,
  attitude: 4,
};
test("game input: roster, position, performance, score, date and protected metadata validation", () => {
  const valid = {
    title: "Teste",
    location: "",
    notes: "",
    scheduledAt: "2026-10-19T12:00:00Z",
    teamA: { starters: ["a"], bench: [] },
    teamB: { starters: ["b"], bench: [] },
    score: { teamA: 1, teamB: 0 },
    positions: { a: "AV" },
    performance: {
      teamA: { goals: ["a"], assists: [] },
      teamB: { goals: [], assists: [] },
    },
    status: "draft",
  };
  assert.ok(validateGameInput(valid).scheduledAt instanceof Timestamp);
  assert.equal(validateGameInput(valid).teamSize, 5);
  for (let teamSize = 5; teamSize <= 12; teamSize++) {
    const teamA = { starters: Array.from({length: teamSize}, (_, i) => i ? `a${i}` : "a"), bench: ["subA"] };
    const teamB = { starters: Array.from({length: teamSize}, (_, i) => i ? `b${i}` : "b"), bench: ["subB"] };
    const input = { ...valid, teamSize, teamA, teamB, status: "closed" };
    assert.equal(validateGameInput(input).teamSize, teamSize);
    assert.throws(() => validateGameInput({...input, teamA: {...teamA, starters: [...teamA.starters, "extra"]}}));
  }
  for (const change of [
    ...[4, 13, 5.5, "12", null].map(teamSize => ({teamSize})),
    { positions: { a: "INVALID" } },
    { positions: { outsider: "AV" } },
    { teamB: { starters: ["a"], bench: [] } },
    {
      teamA: {
        starters: Array.from({ length: 6 }, (_, i) => `a${i}`),
        bench: [],
      },
    },
    { score: { teamA: -1, teamB: 0 } },
    { score: { teamA: 1000, teamB: 0 } },
    { scheduledAt: "invalid" },
    { creatorId: "forged" },
    { openedAt: "forged" },
    { youtubeVideoId: "javascript:bad" },
    {
      performance: {
        teamA: { goals: ["b"], assists: [] },
        teamB: { goals: [], assists: [] },
      },
    },
    {
      performance: {
        teamA: { goals: ["a", "a"], assists: [] },
        teamB: { goals: [], assists: [] },
      },
    },
  ])
    assert.throws(() => validateGameInput({ ...valid, ...change }));
});
test("game flow: 12x12 persists through opening and closing; concurrent opens remain exclusive", async () => {
  const uid = `open-admin-${randomUUID().slice(0, 8)}`;
  await db.doc(`users/${uid}`).set({ uid, role: "admin", disabled: false });
  const flow = gameFlowFunctions();
  const game = {
    title: "Concorrência",
    location: "",
    notes: "",
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    teamSize: 12,
    teamA: { starters: [uid, ...Array.from({length: 11}, (_, i) => `home-${i}`)], bench: ["home-sub"] },
    teamB: { starters: Array.from({length: 12}, (_, i) => `away-${i}`), bench: ["away-sub"] },
    score: { teamA: 0, teamB: 0 },
    status: "draft",
  };
  const call = (gameId, value) =>
    flow.gameAction.run({ auth: { uid }, data: { gameId, game: value } });
  const ids = [(await call(null, game)).id, (await call(null, game)).id];
  const results = await Promise.allSettled(
    ids.map((id) => call(id, { ...game, status: "open" })),
  );
  assert.equal(results.filter((row) => row.status === "fulfilled").length, 1);
  const winner = ids[results.findIndex((row) => row.status === "fulfilled")];
  assert.equal(
    (await db.collection("games").where("status", "==", "open").get()).size,
    1,
  );
  await call(winner, { ...game, status: "closed" });
  const stored = (await db.doc(`games/${winner}`).get()).data();
  assert.equal(stored.teamSize, 12);
  assert.deepEqual(stored.teamA, game.teamA);
  assert.deepEqual(stored.teamB, game.teamB);
  assert.equal(stored.status, "closed");
});
test("game flow: atomic freeze, singleton opening, immediate numeric settlement and 48-hour qualified ratings", async (t) => {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.GCLOUD_PROJECT?.startsWith("demo-")
  )
    throw Error("Emulator demo obrigatório.");
  const open = await db.collection("games").where("status", "==", "open").get();
  for (const doc of open.docs) await doc.ref.update({ status: "draft" });
  const suffix = randomUUID().slice(0, 8),
    uid = `flow-player-${suffix}`,
    admin = `flow-admin-${suffix}`;
  const voters = Array.from(
    { length: 7 },
    (_, i) => `flow-voter-${i}-${suffix}`,
  );
  for (const id of [uid, ...voters, admin])
    await db.doc(`users/${id}`).set({
      uid: id,
      role: id === admin ? "admin" : "member",
      disabled: false,
    });
  const paths = pathFunctions(async () => {});
  const path = (action, values = {}) =>
    paths.pathAction.run({ auth: { uid }, data: { action, ...values } });
  const flow = gameFlowFunctions(() => path("sync"));
  const gameCall = (gameId, game) =>
    flow.gameAction.run({ auth: { uid: admin }, data: { gameId, game } });
  const game = {
    title: "Jogo de teste",
    location: "Campo",
    notes: "",
    scheduledAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    teamA: { starters: [uid, ...voters.slice(0, 4)], bench: [] },
    teamB: { starters: voters.slice(4), bench: [] },
    score: { teamA: 3, teamB: 0 },
    performance: {
      teamA: { goals: [uid, uid, uid], assists: [] },
      teamB: { goals: [], assists: [] },
    },
    positions: { [uid]: "AV" },
    status: "draft",
  };
  const { id: first } = await gameCall(null, game),
    { id: second } = await gameCall(null, game);
  const state = emptyPathState(uid);
  state.nodes["shooting-0-0"] = { progress: 75 };
  state.offers["shooting-0-0"] = [
    {
      id: "0",
      proposalVersion: 3,
      advance: 100,
      objective: { kind: "goals", target: 2 },
    },
    {
      id: "1",
      proposalVersion: 3,
      advance: 50,
      objective: { kind: "goals", target: 1 },
    },
  ];
  await db.doc(`pathStates/${uid}`).set(state);
  await path("accept", { nodeId: "shooting-0-0", offerId: "1" });
  const prepared = await path("accept", {
    nodeId: "shooting-0-0",
    offerId: "0",
  });
  assert.equal(prepared.active.offer.id, "0");
  await gameCall(first, { ...game, status: "open" });
  const frozen = (await db.doc(`pathStates/${uid}`).get()).data();
  assert.equal(frozen.active, null);
  assert.equal(frozen.pending.length, 1);
  assert.equal(frozen.pending[0].gameId, first);
  await assert.rejects(
    gameCall(second, { ...game, status: "open" }),
    /existe um jogo aberto/,
  );
  await assert.rejects(
    path("accept", { nodeId: "passing-0-0", offerId: "0" }),
    /aberto/,
  );
  await assert.rejects(path("reroll", { nodeId: "passing-0-0" }), /aberto/);
  await gameCall(first, { ...game, status: "closed" });
  const numeric = (await db.doc(`pathStates/${uid}`).get()).data();
  assert.equal(numeric.lastResult.status, "success");
  assert.equal(numeric.nodes["shooting-1-0"].progress, 75);
  assert.equal(numeric.pending.length, 0);
  const current = (await db.doc(`pathStates/${uid}`).get()).data();
  current.offers["passing-0-0"] = [
    {
      id: "0",
      proposalVersion: 3,
      advance: 100,
      objective: {
        kind: "rating",
        criterion: "passing",
        target: 4,
        minRatings: 7,
      },
    },
  ];
  await db.doc(`pathStates/${uid}`).set(current);
  await path("accept", { nodeId: "passing-0-0", offerId: "0" });
  await gameCall(second, { ...game, status: "open" });
  await gameCall(second, { ...game, status: "closed" });
  const closed = (await db.doc(`games/${second}`).get()).data();
  for (const rater of voters)
    await flow.feedbackAction.run({
      auth: { uid: rater },
      data: { gameId: second, targetId: uid, ratings, submit: true },
    });
  const journal = await db
    .collection(`games/${second}/pathVoteRevisions`)
    .get();
  assert.equal(journal.size, 7);
  assert.ok(
    journal.docs.every((doc) => doc.data().recordedAt instanceof Timestamp),
  );
  const unpublished = await path("sync");
  assert.equal(unpublished.pending[0].ratingCounts.passing, 7, "explicit settlement checks original votes even before hourly summary publication");
  assert.equal(unpublished.pending.length, 1, "seven 4-star votes out of eight cannot guarantee a 4-star result");
  await processFeedback.run({});
  const waiting = await path("sync");
  assert.equal(waiting.pending.length, 1);
  assert.equal(waiting.pending[0].ratingCounts.passing, 7);
  assert.equal(waiting.pending[0].reviewDeadline, pathReviewDeadline(closed));
  await gameCall(second, {
    ...game,
    status: "closed",
    score: { teamA: 4, teamB: 0 },
  });
  const corrected = (await db.doc(`pathStates/${uid}`).get()).data();
  assert.equal(corrected.reviews[waiting.pending[0].id].pending, true);
  await assert.rejects(path("offers", { nodeId: "pace-0-0" }), /corrigido/);
  await paths.pathAction.run({
    auth: { uid: admin },
    data: {
      action: "acknowledge",
      uid,
      attemptId: waiting.pending[0].id,
      reason: "Conservar os dados registados no fecho e apurar.",
    },
  });
  await path("offers", { nodeId: "pace-0-0" });
  const next = await path("accept", { nodeId: "pace-0-0", offerId: "0" });
  assert.equal(next.active.nodeId, "pace-0-0");
  assert.equal(next.pending.length, 1);
  t.mock.timers.enable({ apis: ["Date"], now: pathReviewDeadline(closed) });
  t.after(() => t.mock.timers.reset());
  const settled = await path("sync");
  assert.equal(settled.lastResult.status, "success");
  assert.equal(settled.pending.length, 0);
  assert.equal(settled.active.nodeId, "pace-0-0");
  assert.ok(
    (await db.doc(`eventRewards/path-${uid}-passing-0-0`).get()).exists,
  );
});

test("feedback flow: corrections append a baseline and a new committed version; untrusted writers are rejected", async () => {
  const suffix = randomUUID().slice(0, 8),
    uid = `journal-player-${suffix}`,
    rater = `journal-rater-${suffix}`,
    admin = `journal-admin-${suffix}`,
    gid = `journal-game-${suffix}`;
  for (const id of [uid, rater, admin])
    await db.doc(`users/${id}`).set({
      uid: id,
      role: id === admin ? "admin" : "member",
      disabled: false,
    });
  await db.doc(`games/${gid}`).set({
    status: "closed",
    closedAt: Timestamp.now(),
    teamA: { starters: [uid], bench: [] },
    teamB: { starters: [rater], bench: [] },
  });
  const previous = {
    gameId: gid,
    raterId: rater,
    targetId: uid,
    ratings,
    submitted: true,
    createdAt: Timestamp.fromMillis(Date.now() - 86400000),
    updatedAt: Timestamp.fromMillis(Date.now() - 86400000),
    submittedAt: Timestamp.fromMillis(Date.now() - 86400000),
  };
  await db.doc(`games/${gid}/feedback/${rater}_${uid}`).set(previous);
  await correctRating.run({
    auth: { uid: admin },
    data: {
      kind: "game",
      gameId: gid,
      id: `${rater}_${uid}`,
      ratings: { ...ratings, passing: 3 },
    },
  });
  assert.equal(
    (await db.collection(`games/${gid}/pathVoteRevisions`).get()).size,
    2,
  );
  const flow = gameFlowFunctions();
  await assert.rejects(
    flow.feedbackAction.run({
      auth: { uid: admin },
      data: { gameId: gid, targetId: uid, ratings, submit: true },
    }),
    /participantes/,
  );
  await assert.rejects(flow.gameAction.run({ auth: { uid: rater }, data: {} }));
  await assert.rejects(
    flow.feedbackAction.run({
      auth: { uid: rater },
      data: {
        gameId: gid,
        targetId: uid,
        ratings: { ...ratings, passing: 6 },
        submit: true,
      },
    }),
    /escala/,
  );
});

test("path settlement: an edit committed after the cutoff uses its old baseline; six votes cancel without losing progress", async () => {
  const suffix = randomUUID().slice(0, 8),
    uid = `cutoff-player-${suffix}`,
    gid = `cutoff-game-${suffix}`,
    other = `six-game-${suffix}`;
  const voters = Array.from(
    { length: 7 },
    (_, i) => `cutoff-voter-${i}-${suffix}`,
  );
  for (const id of [uid, ...voters])
    await db
      .doc(`users/${id}`)
      .set({ uid: id, role: "member", disabled: false });
  const closedAt = Timestamp.fromMillis(Date.now() - 49 * 3600000),
    votedAt = Timestamp.fromMillis(Date.now() - 48.5 * 3600000);
  const game = {
    status: "closed",
    closedAt,
    teamA: { starters: [uid, ...voters.slice(0, 4)], bench: [] },
    teamB: { starters: voters.slice(4), bench: [] },
    score: { teamA: 2, teamB: 0 },
    positions: { [uid]: "AV" },
  };
  for (const id of [gid, other]) await db.doc(`games/${id}`).set(game);
  for (const [index, rater] of voters.entries())
    for (const id of [gid, other])
      if (id === gid || index < 6)
        await db.doc(`games/${id}/feedback/${rater}_${uid}`).set({
          gameId: id,
          raterId: rater,
          targetId: uid,
          ratings,
          submitted: true,
          createdAt: votedAt,
          updatedAt: votedAt,
          submittedAt: votedAt,
        });
  const state = emptyPathState(uid);
  state.nodes["passing-0-0"] = { progress: 75 };
  state.nodes["shooting-0-0"] = { progress: 50 };
  state.pending = [
    {
      id: `qualified-${suffix}`,
      nodeId: "passing-0-0",
      gameId: gid,
      frozenAt: "2026-10-01",
      windowVersion: 3,
      offer: {
        proposalVersion: 3,
        advance: 25,
        objective: {
          kind: "rating",
          criterion: "passing",
          target: 4,
          minRatings: 7,
        },
      },
    },
    {
      id: `six-${suffix}`,
      nodeId: "shooting-0-0",
      gameId: other,
      frozenAt: "2026-10-01",
      windowVersion: 3,
      offer: {
        proposalVersion: 3,
        advance: 100,
        objective: {
          kind: "rating",
          criterion: "attack",
          target: 4,
          minRatings: 7,
        },
      },
    },
  ];
  await db.doc(`pathStates/${uid}`).set(state);
  const flow = gameFlowFunctions();
  await flow.feedbackAction.run({
    auth: { uid: voters[0] },
    data: {
      gameId: gid,
      targetId: uid,
      ratings: { ...ratings, passing: 0 },
      submit: true,
    },
  });
  const paths = pathFunctions(async () => {});
  const settled = await paths.pathAction.run({
    auth: { uid },
    data: { action: "sync" },
  });
  assert.equal(settled.nodes["passing-0-0"].progress, 100);
  assert.equal(settled.nodes["shooting-0-0"].progress, 50);
  assert.equal(settled.pending.length, 0);
  assert.equal(
    settled.history.find((row) => row.id === `six-${suffix}`).status,
    "cancelled",
  );
  assert.equal(
    settled.history.find((row) => row.id === `qualified-${suffix}`).status,
    "success",
  );
});

test("feedback: all active participant roles can draft and submit; device does not grant or remove access",async()=>{
  const suffix=randomUUID().slice(0,8),gid=`mobile-access-${suffix}`;
  const roles=[...Array(7).fill("dbs"),"member","member","admin"];
  const ids=roles.map((_,index)=>`mobile-${suffix}-${index}`);
  for(const [index,uid] of ids.entries())await db.doc(`users/${uid}`).set({uid,role:roles[index],disabled:false});
  await db.doc(`games/${gid}`).set({status:"closed",teamA:{starters:ids.slice(0,5),bench:[]},teamB:{starters:ids.slice(5),bench:[]},closedAt:Timestamp.now()});
  const flow=gameFlowFunctions();
  for(const [index,uid] of ids.entries()){
    const targetId=ids[(index+1)%ids.length];
    await flow.feedbackAction.run({auth:{uid},data:{gameId:gid,targetId,ratings:{physical:4},submit:false}});
    await flow.feedbackAction.run({auth:{uid},data:{gameId:gid,targetId,ratings,submit:true}});
    const saved=(await db.doc(`games/${gid}/feedback/${uid}_${targetId}`).get()).data();
    assert.equal(saved.submitted,true);assert.equal(saved.raterId,uid);assert.equal(saved.ratings.physical,4);
  }
  const outsider=`outside-${suffix}`;
  await db.doc(`users/${outsider}`).set({uid:outsider,role:"admin",disabled:false});
  await assert.rejects(flow.feedbackAction.run({auth:{uid:outsider},data:{gameId:gid,targetId:ids[0],ratings,submit:true}}),error=>error.code==="permission-denied");
  await db.doc(`users/${ids[0]}`).update({disabled:true});
  await assert.rejects(flow.feedbackAction.run({auth:{uid:ids[0]},data:{gameId:gid,targetId:ids[1],ratings,submit:true}}),error=>error.code==="permission-denied");
});

test("feedback: self N/A forces peer goalkeeper N/A, complete valid dimensions are required and editing cannot restart the window", async () => {
  const suffix = randomUUID().slice(0, 8),
    uid = `na-player-${suffix}`,
    peer = `na-peer-${suffix}`,
    gid = `na-game-${suffix}`;
  for (const id of [uid, peer])
    await db
      .doc(`users/${id}`)
      .set({ uid: id, role: "member", disabled: false });
  await db.doc(`games/${gid}`).set({
    status: "closed",
    teamA: { starters: [uid], bench: [] },
    teamB: { starters: [peer], bench: [] },
    closedAt: Timestamp.now(),
  });
  const flow = gameFlowFunctions();
  const call = (rater, values) =>
    flow.feedbackAction.run({
      auth: { uid: rater },
      data: { gameId: gid, targetId: uid, ratings: values, submit: true },
    });
  await call(uid, ratings);
  await call(peer, { ...ratings, goalkeeping: 5 });
  const ref = db.doc(`games/${gid}/feedback/${peer}_${uid}`);
  const first = (await ref.get()).data();
  assert.equal(first.ratings.goalkeeping, null);
  await call(peer, { ...ratings, passing: 5 });
  assert.equal(
    (await ref.get()).data().submittedAt.toMillis(),
    first.submittedAt.toMillis(),
  );
  const { attitude, ...incomplete } = ratings;
  await assert.rejects(call(peer, incomplete), /obrigatórias/);
  await ref.update({
    submittedAt: Timestamp.fromMillis(Date.now() - 8 * 86400000),
    editDays: 7,
  });
  await assert.rejects(call(peer, ratings), /prazo/);
});

test("fusion flow: milestones gate activation, origins remain intact and final card survives capped stats", async () => {
  const suffix = randomUUID().slice(0, 8),
    uid = `fusion-player-${suffix}`,
    gid = `fusion-game-${suffix}`;
  await db.doc(`users/${uid}`).set({ uid, role: "member", disabled: false });
  const paths = pathFunctions(async () => {});
  const call = (action, data = {}) =>
    paths.pathAction.run({ auth: { uid }, data: { action, ...data } });
  await assert.rejects(call("unify", { routeId: "fusion-predator" }), /marco 5/);
  const state = emptyPathState(uid);
  state.nodes["shooting-4-0"] = { progress: 100, completedAt: "2026-10-01" };
  state.nodes["dribbling-4-0"] = { progress: 100, completedAt: "2026-10-01" };
  state.offers["shooting-0-0"] = createPathOffers(
    pathNode("shooting-0-0"),
    () => 0,
  );
  await db.doc(`pathStates/${uid}`).set(state);
  const unified = await call("unify", { routeId: "fusion-predator" });
  assert.equal(pathVisibleRoute(unified, "shooting"), "fusion-predator");
  assert.deepEqual(
    unified.offers["shooting-0-0"],
    state.offers["shooting-0-0"],
  );
  assert.equal(unified.activePath, "fusion-predator");
  await assert.rejects(
    call("offers", { nodeId: "fusion-predator-4" }),
    /disponível/,
  );
  const pending = {
    id: `fusion-final-${suffix}`,
    nodeId: "fusion-predator-4",
    gameId: gid,
    frozenAt: "2026-10-01",
    windowVersion: 3,
    offer: {
      proposalVersion: 3,
      advance: 25,
      objective: {
        kind: "hybrid",
        criteria: ["attack", "passing"],
        target: 4,
        minRatings: 7,
      },
    },
  };
  await db
    .doc(`pathStates/${uid}`)
    .update({ pending: [pending], "nodes.fusion-predator-4": { progress: 75 } });
  await db
    .doc(`eventRewards/fusion-prior-${suffix}`)
    .set({
      uid,
      source: "path",
      reward: {
        statDuration: "permanent",
        boosts: { shooting: 15, dribbling: 15 },
      },
    });
  const voters = Array.from(
    { length: 7 },
    (_, i) => `fusion-voter-${i}-${suffix}`,
  );
  const closedAt = Timestamp.fromMillis(Date.now() - 49 * 3600000),
    updatedAt = Timestamp.fromMillis(Date.now() - 48.5 * 3600000);
  await db
    .doc(`games/${gid}`)
    .set({
      status: "closed",
      closedAt,
      teamA: { starters: [uid, ...voters.slice(0, 4)], bench: [] },
      teamB: { starters: voters.slice(4), bench: [] },
      score: { teamA: 1, teamB: 0 },
    });
  for (const raterId of voters)
    await db
      .doc(`games/${gid}/feedback/${raterId}_${uid}`)
      .set({ raterId, targetId: uid, submitted: true, ratings, updatedAt });
  const result = await call("sync");
  assert.equal(result.lastResult.reward.specialId, "path-fusion-predator");
  assert.deepEqual(result.lastResult.reward.boosts, {
    shooting: 0,
    dribbling: 0,
  });
  await call("sync");
  assert.equal(
    (await db.collection("eventRewards").where("uid", "==", uid).get()).size,
    2,
  );
});
