import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { ensureHistory as scheduledHistory, selectWeeklyCard, onFeedback, processFeedback as queuedFeedback } from "../functions/index.js";
import { afterCheck } from "./cycle-fixtures.js";
const ensureHistory = afterCheck(scheduledHistory);
const processFeedback = afterCheck(queuedFeedback);
import {
  refreshPlayerCollection,
  collectionContext,
  collectionPlayer,
  settleCollectionPeriods,
  ensureFuttiesVote,
} from "../functions/card-collection.js";
import { ATTRIBUTES, FEEDBACK, calculateOverall } from "../js/utils.js";
import { calculatePlayerCard } from "../js/player-calculation.js";
import { cardWeek } from "../js/card-week.js";
const db = getFirestore();
const all = (value) =>
  Object.fromEntries(ATTRIBUTES.map(([key]) => [key, value]));

test("Melhor em Campo exige sete votos e 4,5; uma nota superior sem amostra não bloqueia a conquista", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-18T14:00:00Z") });
  const uid = "mvp-seven", opponent = "mvp-six";
  const raters = Array.from({ length: 7 }, (_, i) => `mvp-rater-${i}`);
  const when = Timestamp.fromDate(new Date("2026-10-17T12:00:00Z"));
  for (const id of [uid, opponent, ...raters]) {
    await db.doc(`users/${id}`).set({ uid: id, role: "member", disabled: false, primaryPosition: "MED" });
    await db.doc(`initialRatings/${id}`).set({ uid: id, ratings20: all(12), completed: true, createdAt: when });
  }
  const gameId = "mvp-seven-game";
  await db.doc(`games/${gameId}`).set({ title: "Sete votos", status: "closed", scheduledAt: when, closedAt: when,
    teamA: { starters: [uid, ...raters.slice(0, 3)], bench: [] }, teamB: { starters: [opponent, ...raters.slice(3)], bench: [] }, score: { teamA: 3, teamB: 2 } });
  for (const targetId of [uid, opponent]) for (const [i, raterId] of raters.slice(0, 6).entries())
    await db.doc(`games/${gameId}/feedback/${raterId}_${targetId}`).set({ raterId, targetId, submitted: true, createdAt: when, submittedAt: when,
      ratings: Object.fromEntries(FEEDBACK.map(([key]) => [key, key === "goalkeeping" ? null : targetId === opponent ? 5 : i < 3 ? 4 : 5])) });
  const trigger = async () => onFeedback.run({ params: { gid: gameId }, data: { before: { data: () => undefined }, after: await db.doc(`games/${gameId}/feedback/${raters[0]}_${uid}`).get() } });
  await trigger();
  await processFeedback.run({});
  assert.equal((await db.doc(`gameSummaries/${gameId}`).get()).data().players[uid].mvp, false);
  await db.doc(`games/${gameId}/feedback/${uid}_${uid}`).set({ raterId: uid, targetId: uid, submitted: true, createdAt: when, submittedAt: when,
    ratings: Object.fromEntries(FEEDBACK.map(([key]) => [key, key === "goalkeeping" ? null : 5])) });
  await trigger();
  await processFeedback.run({});
  const summary = (await db.doc(`gameSummaries/${gameId}`).get()).data().players;
  assert.equal(summary[uid].count, 7); assert.equal(summary[uid].mvp, true); assert.equal(summary[opponent].mvp, false);
  await db.doc(`gameSummaries/${gameId}`).update({ [`players.${uid}.mvp`]: false });
  const context = await collectionContext();
  assert.equal(context.summaries.find(row => row.id === gameId).players[uid].mvp, true, "resumos anteriores também usam o novo limiar durante o recálculo");
  assert.ok((await db.doc(`cardCollections/${uid}`).get()).data().awards.some(award => award.id === "mvp"));
});

test("self non-keeper repairs stale summaries idempotently and collection fallback excludes goalkeeper votes",async()=>{
  const gid="keeper-stale-repair",uid="keeper.optout",peer="keeper.external";
  const when=Timestamp.fromDate(new Date("2026-10-15T12:00Z"));
  await db.doc(`games/${gid}`).set({status:"closed",closedAt:when,scheduledAt:when,teamA:{starters:[uid],bench:[]},teamB:{starters:[peer],bench:[]},score:{teamA:5,teamB:7}});
  for(const raterId of [uid,peer])await db.doc(`games/${gid}/feedback/${raterId}_${uid}`).set({submitted:true,raterId,targetId:uid,updatedAt:when,
    ratings:{...Object.fromEntries(FEEDBACK.map(([key])=>[key,4])),goalkeeping:raterId===uid?null:5}});
  const stale={goalkeeping:5,attack:4,count:2,evaluatedAt:when.toDate().toISOString(),ratingCounts:{goalkeeping:1,attack:2}};
  await db.doc(`gameSummaries/${gid}`).set({players:{[uid]:stale},status:"closed",sentinel:"preserve"});
  const context=await collectionContext(new Date(), { repair: true });
  const computed=context.summaries?.find(row=>row.id===gid)?.players?.[uid];
  assert.equal(computed.goalkeeping,null);
  assert.equal(computed.goalkeepingEligible,false);
  assert.equal(computed.ratingCounts.goalkeeping,0);
  const run=()=>promisify(execFile)(process.execPath,["scripts/audit-goalkeeping.mjs","--repair"],{env:process.env});
  await run();
  const repaired=(await db.doc(`gameSummaries/${gid}`).get()).data();
  assert.equal(repaired.players[uid].goalkeeping,null);
  assert.equal(repaired.players[uid].goalkeepingEligible,false);
  assert.equal(repaired.players[uid].ratingCounts.goalkeeping,0);
  assert.equal(repaired.players[uid].attack,4);assert.equal(repaired.players[uid].count,2);
  assert.equal(repaired.players[uid].ratingCounts.attack,2);assert.equal(repaired.sentinel,"preserve");
  const timestamp=(await db.doc(`gameSummaries/${gid}`).get()).updateTime.toMillis();
  const output=await run();
  assert.ok(!output.stdout.includes(uid));
  assert.equal((await db.doc(`gameSummaries/${gid}`).get()).updateTime.toMillis(),timestamp);
});

test("coleção permanente, expiração e seleção normal são autoritativas e idempotentes", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-23T12:00Z") });
  t.after(() => t.mock.timers.reset());
  const uid = "collection-owner",
    others = Array.from({ length: 6 }, (_, i) => `collection-voter${i + 1}`);
  for (const id of [uid, ...others])
    await db.doc(`users/${id}`).set({
      uid: id,
      primaryPosition: "MED",
      role: "member",
      disabled: false,
    });
  await db.doc(`initialRatings/${uid}`).set({
    uid,
    ratings20: all(12),
    completed: true,
    createdAt: Timestamp.fromDate(new Date("2026-08-01")),
  });
  for (let i = 0; i < 3; i++) {
    const gameId = `collection-proof-${i}`;
    await db.doc(`games/${gameId}`).set({
      status: "closed",
      teamA: { starters: [uid], bench: [] },
      teamB: { starters: others.slice(0, 5), bench: others.slice(5) },
      score: { teamA: 8, teamB: 4 },
      closedAt: Timestamp.fromDate(new Date(`2026-09-0${i + 1}T12:00Z`)),
    });
    for (const raterId of [uid, ...others])
      await db.doc(`games/${gameId}/feedback/${raterId}_${uid}`).set({
        gameId,
        raterId,
        targetId: uid,
        submitted: true,
        createdAt: Timestamp.fromDate(new Date(`2026-09-0${i + 1}T13:00Z`)),
        ratings: Object.fromEntries(
          FEEDBACK.map(([key]) => [
            key,
            key === "passing" ? 5 : key === "goalkeeping" ? null : 4,
          ]),
        ),
      });
  }
  await collectionContext(); // Queue imported legacy fixtures, as the first page visit would.
  await processFeedback.run({});
  await ensureHistory.run({ auth: { uid }, data: {} });
  const context = await collectionContext();
  const projected = collectionPlayer(context, uid);
  const actual = calculatePlayerCard({
    uid,
    initial: all(12),
    aggregates: projected.aggregates,
    games: context.games,
    rewards: [
      {
        uid,
        startsAt: new Date("2026-01-01"),
        createdAt: new Date("2026-01-01"),
        reward: { statDuration: "permanent", boosts: { shooting: 10 } },
      },
    ],
    weights: context.weights,
    position: "MED",
    date: context.date,
  });
  assert.equal(
    projected.ovr,
    calculateOverall(actual.rawStats, context.weights, "MED"),
  );
  const first = (await db.doc(`cardCollections/${uid}`).get()).data();
  const perfect = first.awards.find((row) => row.id === "perfect-five");
  assert.ok(perfect);
  assert.equal(perfect.duration, "permanent");
  assert.equal(perfect.expiresAt, null);
  assert.equal(
    first.awards.find((row) => row.id === "in-form").expiresAt,
    "2026-09-10T13:00:00.000Z",
  );
  const cycle = cardWeek(),
    select = (cardId) =>
      selectWeeklyCard.run({
        auth: { uid },
        data: { weekId: cycle.weekId, cardId },
      });
  await assert.rejects(select("in-form"));
  await select("perfect-five");
  await ensureHistory.run({ auth: { uid }, data: {} });
  const again = (await db.doc(`cardCollections/${uid}`).get()).data();
  assert.equal(
    again.awards.find((row) => row.id === "perfect-five").earnedAt,
    perfect.earnedAt,
  );
  assert.equal(again.awards.length, first.awards.length);
  await select("base");
  assert.equal(
    (await db.doc(`cardSelections/${uid}`).get()).data().selectedCardId,
    "base",
  );
  const historical = db.doc(`users/${uid}/cardHistory/${cycle.weekId}`);
  await historical.update({ locked: true, selectedCardId: "base" });
  await select("perfect-five");
  assert.equal((await historical.get()).data().selectedCardId, "base");
  assert.equal(
    (await db.doc(`cardSelections/${uid}`).get()).data().selectedCardId,
    "perfect-five",
  );
  await db.doc(`users/${uid}`).update({ disabled: true });
  await assert.rejects(select("base"));
});

test("prémios por posição fecham uma vez e a votação FUTTIES só inclui candidatos elegíveis", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-08T12:00Z") });
  t.after(() => t.mock.timers.reset());
  const uid = "period-collection-winner";
  await db
    .doc(`users/${uid}`)
    .set({ uid, primaryPosition: "AV", role: "member", disabled: false });
  await db
    .doc(`initialRatings/${uid}`)
    .set({ uid, completed: true, ratings20: all(12) });
  const context = await collectionContext();
  // Isolate a single league period with a deterministic test league.
  context.users = [
    { uid, primaryPosition: "AV", disabled: false },
    { uid: "voter-only", disabled: false },
  ];
  context.initials = [{ uid, completed: true, ratings20: all(12) }];
  context.games = Array.from({ length: 12 }, (_, i) => ({
    id: `period-game-${i}`,
    status: "closed",
    closedAt: new Date(Date.UTC(2026, 8, 1 + i * 4, 12)),
    teamA: { starters: [uid], bench: [] },
    teamB: { starters: ["voter-only"], bench: [] },
    score: { teamA: 8, teamB: 4 },
  }));
  context.summaries = context.games.map((game) => ({
    id: game.id,
    players: { [uid]: { count: 7, overall: 4.5, attack: 4.5, attitude: 4.5 } },
  }));
  await db.doc("cardPeriodAwards/2026-E5").delete();
  await settleCollectionPeriods(context);
  await settleCollectionPeriods(context);
  const awards = (await db.doc(`cardCollections/${uid}`).get()).data().awards;
  assert.equal(awards.filter((award) => award.id === "tots@2026-E5").length, 1);
  assert.equal(awards[0].duration, "year");
  context.date = new Date("2026-10-27T12:00Z");
  await db.doc("events/futties-2026-E5").delete();
  await ensureFuttiesVote(context);
  const ballot = (await db.doc("events/futties-2026-E5").get()).data();
  assert.deepEqual(ballot.questions[0].candidateIds, [uid]);
  assert.equal(ballot.automaticCollectionVote, true);
  assert.equal(
    (await db.doc("events/futties-2026-E5/private/rewards").get()).data()
      .questions.q1.cardDuration,
    "permanent",
  );
});
