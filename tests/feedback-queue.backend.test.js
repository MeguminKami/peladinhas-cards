import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { writeFeedbackRevision } from "../functions/game-flow.js";
import { drainFeedbackQueue } from "../functions/feedback-queue.js";
import { collectionContext } from "../functions/card-collection.js";
import { FEEDBACK } from "../js/utils.js";

// Other integration suites also run hourly jobs. Give this queue an isolated
// emulator namespace so a sibling process cannot drain its pending assertions.
if (process.env.GCLOUD_PROJECT?.startsWith("demo-"))
  process.env.GCLOUD_PROJECT = `${process.env.GCLOUD_PROJECT}-queue-${process.pid}`;
const { onFeedback, processFeedback } = await import("../functions/index.js");
const db = getFirestore();
const event = (gid, before, after) => ({ params: { gid }, data: {
  before: { data: () => before }, after: { data: () => after },
} });
const vote = (value = 4) => ({ submitted: true, raterId: "rater", targetId: "target",
  ratings: Object.fromEntries(FEEDBACK.map(([key]) => [key, key === "goalkeeping" ? null : value])),
  submittedAt: Timestamp.now(),
});

test("submitted evaluations queue atomically, publish hourly, and duplicate triggers do not reschedule", async () => {
  const gid = "hourly-game", ref = db.doc(`games/${gid}/feedback/rater_target`);
  await db.doc(`games/${gid}`).set({ status: "closed", closedAt: Timestamp.now(), scheduledAt: Timestamp.now(),
    teamA: { starters: ["rater"], bench: [] }, teamB: { starters: ["target"], bench: [] }, score: { teamA: 2, teamB: 1 } });
  for (let i = 0; i < 20; i++) await db.runTransaction(async tx => {
    const previous = (await tx.get(ref)).data();
    writeFeedbackRevision(tx, ref, previous, vote(i % 2 ? 5 : 4));
  });
  const latest = (await ref.get()).data();
  const token = (await db.doc(`feedbackWork/${gid}`).get()).data().token;
  await db.runTransaction(async tx => {
    const previous = (await tx.get(ref)).data();
    writeFeedbackRevision(tx, ref, previous, { ...previous, updatedAt: Timestamp.now() });
  });
  assert.equal((await db.doc(`feedbackWork/${gid}`).get()).data().token, token, "identical submissions do not create another generation");
  await onFeedback.run(event(gid, undefined, latest));
  assert.equal((await db.doc(`gameSummaries/${gid}`).get()).exists, false, "no synchronous aggregation");
  assert.equal((await db.collection("feedbackWork").where("pending", "==", true).get()).size, 1);
  await processFeedback.run({});
  const summary = (await db.doc(`gameSummaries/${gid}`).get()).data();
  assert.equal(summary.players.target.overall, 5);
  assert.equal(summary.players.target.goalkeeping, null);
  assert.equal((await db.doc(`feedbackWork/${gid}`).get()).data().pending, false);
  await onFeedback.run(event(gid, undefined, latest));
  assert.equal((await db.doc(`feedbackWork/${gid}`).get()).data().pending, false);
  assert.equal((await processFeedback.run({})).processed, 0);
});

test("drafts and timestamp-only updates do not schedule work; legacy edits and deletions do", async () => {
  const gid = "legacy-game";
  await onFeedback.run(event(gid, undefined, { ...vote(), submitted: false }));
  assert.equal((await db.doc(`feedbackWork/${gid}`).get()).exists, false);
  const previous = vote();
  await onFeedback.run(event(gid, previous, { ...previous, updatedAt: Timestamp.now() }));
  assert.equal((await db.doc(`feedbackWork/${gid}`).get()).exists, false);
  await onFeedback.run(event(gid, previous, undefined));
  assert.equal((await db.doc(`feedbackWork/${gid}`).get()).data().pending, true);
  await drainFeedbackQueue({ aggregate: async () => [], rebuild: async () => {} });
});

test("new input during processing stays pending; one rebuild shares all changed games", async () => {
  const first = db.doc("feedbackWork/race-a"), second = db.doc("feedbackWork/race-b");
  await first.set({ pending: true, token: "old" });
  await second.set({ pending: true, token: "second" });
  const rebuilt = [], aggregated = [];
  const result = await drainFeedbackQueue({ aggregate: async gid => {
    aggregated.push(gid);
    if (gid === "race-a") await first.update({ token: "new", pending: true });
    return ["shared-player"];
  }, rebuild: async ids => rebuilt.push(ids) });
  assert.equal(result.processed, 2);
  assert.deepEqual(aggregated.sort(), ["race-a", "race-b"]);
  assert.deepEqual(rebuilt, [["shared-player"]]);
  assert.equal((await first.get()).data().pending, true);
  await assert.rejects(drainFeedbackQueue({ aggregate: async () => ["shared-player"], rebuild: async () => { throw Error("history retry"); } }), /history retry/);
  assert.equal((await first.get()).data().pending, true);
  assert.equal((await second.get()).data().pending, false);
  await assert.rejects(drainFeedbackQueue({ aggregate: async () => { throw Error("retry"); }, rebuild: async () => {} }), /retry/);
  assert.equal((await first.get()).data().pending, true);
  await drainFeedbackQueue({ aggregate: async () => [], rebuild: async () => {} });
});

test("opening a collection uses published summaries and queues legacy repair without reading votes", async () => {
  const gid = "legacy-summary";
  await db.doc(`games/${gid}`).set({ status: "closed", closedAt: Timestamp.now(), scheduledAt: Timestamp.now(),
    teamA: { starters: ["target"], bench: [] }, teamB: { starters: ["rater"], bench: [] } });
  await db.doc(`games/${gid}/feedback/rater_target`).set(vote(5));
  await db.doc(`games/${gid}/feedback/legacy_missing_ratings`).set({ submitted: true, raterId: "target", targetId: "target" });
  const context = await collectionContext();
  assert.equal(context.summaries.some(summary => summary.id === gid), false, "raw votes must not bypass hourly publication");
  assert.equal((await db.doc(`feedbackWork/${gid}`).get()).data().pending, true);
  await processFeedback.run({});
  assert.equal((await db.doc(`gameSummaries/${gid}`).get()).data().players.target.overall, 5);
  assert.equal((await db.doc(`gameSummaries/${gid}`).get()).data().players.target.count, 1, "malformed historical rows do not poison the batch");
});

test("a closed game with no participants or summary does not break collection reads", async () => {
  const gid = "empty-roster";
  await db.doc(`games/${gid}`).set({ status: "closed", closedAt: Timestamp.now(),
    teamA: { starters: [], bench: [] }, teamB: { starters: [], bench: [] } });
  await collectionContext();
  assert.equal((await db.doc(`feedbackWork/${gid}`).get()).data().pending, true);
  await processFeedback.run({});
  assert.deepEqual((await db.doc(`gameSummaries/${gid}`).get()).data().players, {});
  await collectionContext();
  assert.equal((await db.doc(`feedbackWork/${gid}`).get()).data().pending, false);
});
