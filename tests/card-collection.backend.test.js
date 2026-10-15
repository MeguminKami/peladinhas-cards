import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { ensureHistory, selectWeeklyCard } from "../functions/index.js";
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

test("coleção permanente, expiração e seleção normal são autoritativas e idempotentes", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-23T12:00Z") });
  t.after(() => t.mock.timers.reset());
  const uid = "collection-owner",
    others = ["collection-voter1", "collection-voter2"];
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
      teamB: { starters: others, bench: [] },
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
    players: { [uid]: { count: 3, overall: 4.5, attack: 4.5, attitude: 4.5 } },
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
