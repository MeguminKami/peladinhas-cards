import test from "node:test";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { communityRatingAction as queuedCommunityRatingAction, rebuildHistory, correctRating, grantCommunityRatingRetry, listCommunityRatingsForAdmin } from "../functions/index.js";
import { afterCheck, checkCycle } from "./cycle-fixtures.js";
const communityRatingAction = afterCheck(queuedCommunityRatingAction, checkCycle);
import { ATTRIBUTES } from "../js/utils.js";
const db = getFirestore(),
  all = (n) => Object.fromEntries(ATTRIBUTES.map(([key]) => [key, n]));
let sequence = 0;
async function setup(prefix) {
  prefix += `-${randomUUID().slice(0,8)}`;
  const author = `${prefix}-author`,
    target = `${prefix}-target`;
  const admin = `${prefix}-admin`;
  for (const uid of [author, target, admin])
    await db
      .doc(`users/${uid}`)
      .set({
        uid,
        displayName: uid,
        role: uid === admin ? "admin" : "member",
        disabled: false,
        primaryPosition: "ALA",
        createdAt: Timestamp.now(),
      });
  await db
    .doc(`initialRatings/${target}`)
    .set({ uid: target, ratings20: all(14), createdAt: Timestamp.now() });
  return {
    author,
    target,
    admin,
    grant: () => grantCommunityRatingRetry.run({ auth: { uid: admin }, data: { id: `${author}_${target}` } }),
    ref: db.doc(`communityRatings/${author}_${target}`),
    call: (ratings20, extra = {}) =>
      communityRatingAction.run({
        auth: { uid: author },
        data: {
          targetId: target,
          ratings20,
          submit: true,
          submissionId: `submission-${++sequence}`,
          ...extra,
        },
      }),
  };
}
test("first exclusion, free draft saves, one valid retry, idempotency and final lock", async () => {
  const s = await setup("retry-valid");
  const first = await s.call(all(0));
  assert.equal(first.reviewState, "invalid");
  let row = (await s.ref.get()).data();
  assert.equal(row.reviewAttempts, 1);
  assert.equal(
    (await db.doc(`communitySummaries/${s.target}`).get()).data().count,
    0,
  );
  const notice = (
    await db
      .doc(`users/${s.author}/notifications/community-review-${s.target}`)
      .get()
  ).data();
  assert.equal(notice.type, "COMMUNITY_RATING_NULL");
  assert.doesNotMatch(notice.body, /1[.,]9|mínimo|baixa/i);
  await assert.rejects(s.call(all(12)), /encerrada/);
  await assert.rejects(s.call(all(12), { submit: false }), /encerrada/);
  await s.grant();
  for (let i = 0; i < 3; i++) await s.call(all(12), { submit: false });
  row = (await s.ref.get()).data();
  assert.equal(row.reviewAttempts, 1);
  assert.equal(row.ratings20.pace, 0);
  assert.equal(row.draftRatings20.pace, 12);
  await assert.rejects(s.call(all(12)), /Atualiza o formulário/);
  const options = {
    reviewToken: row.reviewToken,
    submissionId: "valid-retry-idempotent",
  };
  assert.equal((await s.call(all(12), options)).reviewState, "accepted");
  assert.equal((await s.call(all(12), options)).repeated, true);
  assert.equal((await s.ref.get()).data().reviewAttempts, 2);
  assert.equal(
    (await db.doc(`communitySummaries/${s.target}`).get()).data().count,
    1,
  );
  assert.equal(
    (await db.collection(`users/${s.author}/notifications`).where("type", "==", "COMMUNITY_RATING_ACCEPTED").get()).size,
    1,
  );
  await assert.rejects(
    s.call(all(15), { reviewToken: row.reviewToken }),
    /encerrada/,
  );
  await assert.rejects(s.call(all(15), { submit: false }), /encerrada/);
});
test("second low submission remains excluded and cannot be replaced by a third", async () => {
  const s = await setup("retry-invalid");
  await s.call(all(0));
  await s.grant();
  const row = (await s.ref.get()).data();
  assert.equal(
    (await s.call(all(1), { reviewToken: row.reviewToken })).reviewState,
    "ignored",
  );
  assert.equal(
    (await db.doc(`communitySummaries/${s.target}`).get()).data().count,
    0,
  );
  assert.equal(
    (
      await db
        .doc(`users/${s.author}/notifications/community-review-${s.target}`)
        .get()
    ).data().type,
    "COMMUNITY_RATING_CLOSED",
  );
  await assert.rejects(
    s.call(all(20), { reviewToken: row.reviewToken }),
    /encerrada/,
  );
});
test("two concurrent retries consume only one final attempt", async () => {
  const s = await setup("retry-concurrent");
  await s.call(all(0));
  await s.grant();
  const row = (await s.ref.get()).data(),
    options = { reviewToken: row.reviewToken };
  const results = await Promise.allSettled([
    s.call(all(13), options),
    s.call(all(14), options),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await s.ref.get()).data().reviewAttempts, 2);
});
test("rebuilding excludes legacy low votes, grants one fresh review and preserves frozen cards", async () => {
  const s = await setup("legacy-low");
  const old = Timestamp.fromDate(new Date("2026-01-01"));
  await db.doc(`users/${s.author}`).update({ role: "admin" });
  await s.ref.set({
    raterId: s.author,
    targetId: s.target,
    ratings20: all(0),
    submitted: true,
    createdAt: old,
    submittedAt: old,
  });
  const frozen = db.doc(`users/${s.target}/cardHistory/2026-W01`);
  await frozen.set({
    weekId: "2026-W01",
    locked: true,
    ovr: 30,
    stats: all(30),
  });
  await rebuildHistory.run({
    auth: { uid: s.author },
    data: { uid: s.target },
  });
  const row = (await s.ref.get()).data();
  assert.equal(row.reviewAttempts, 1);
  assert.equal(row.reviewState, "invalid");
  await assert.rejects(correctRating.run({auth:{uid:s.author},data:{kind:"community",id:s.ref.id,ratings:all(20)}}),/revisão pelo seu autor/);
  assert.equal(row.reviewDeadline, null);
  assert.equal(
    (await db.doc(`communitySummaries/${s.target}`).get()).data().count,
    0,
  );
  await rebuildHistory.run({
    auth: { uid: s.author },
    data: { uid: s.target },
  });
  assert.equal((await s.ref.get()).data().reviewToken, row.reviewToken);
  assert.equal((await frozen.get()).data().ovr, 30);
  await s.grant();
  const authorized = (await s.ref.get()).data();
  assert.equal((await s.call(all(2), { reviewToken: authorized.reviewToken })).reviewState, "accepted");
});
test("a normal submitted evaluation keeps its value while drafts are edited", async () => {
  const s = await setup("normal-edit");
  await s.call(all(12));
  await s.call(all(0), { submit: false });
  assert.equal(
    (await db.doc(`communitySummaries/${s.target}`).get()).data().count,
    1,
  );
  assert.equal((await s.ref.get()).data().ratings20.pace, 12);
  assert.equal((await s.call(all(0))).reviewState, "invalid");
  await assert.rejects(
    communityRatingAction.run({
      auth: { uid: s.author },
      data: {
        targetId: s.author,
        ratings20: all(20),
        submit: true,
        submissionId: "self-rating-denied",
      },
    }),
    /inválida/,
  );
});

test("submission classifies 1.0 immediately; only an admin can grant the single final attempt", async () => {
  const s = await setup("immediate-null");
  const input = { targetId: s.target, ratings20: all(1), submit: true, submissionId: "immediate-null-submit" };
  const result = await queuedCommunityRatingAction.run({ auth: { uid: s.author }, data: input });
  assert.equal(result.reviewState, "invalid");
  assert.equal((await s.ref.get()).data().reviewState, "invalid");
  assert.equal((await db.doc(`communitySummaries/${s.target}`).get()).data().count, 0);
  await assert.rejects(grantCommunityRatingRetry.run({ auth: { uid: s.author }, data: { id: s.ref.id } }), /reservado/);
  const grants = await Promise.allSettled([s.grant(), s.grant()]);
  assert.equal(grants.filter(r => r.status === "fulfilled").length, 1);
  const row = (await s.ref.get()).data();
  assert.equal(row.reviewGrantedBy, s.admin);
  assert.ok(row.reviewDeadline.toMillis() > Date.now());
  assert.equal((await s.call(all(1.9), { reviewToken: row.reviewToken })).reviewState, "ignored");
  await assert.rejects(s.grant(), /outra tentativa/);
  await assert.rejects(s.call(all(20), { reviewToken: row.reviewToken }), /encerrada/);
});

test("admin listing classifies legacy low votes without writes; grants reject valid votes and restricted admins", async () => {
  const s = await setup("legacy-admin-list");
  await s.ref.set({ raterId: s.author, targetId: s.target, submitted: true, ratings20: all(1) });
  const request = { auth: { uid: s.admin }, data: {} };
  const { rows } = await listCommunityRatingsForAdmin.run(request);
  assert.equal(rows.find(row => row.id === s.ref.id).reviewState, "invalid");
  assert.equal((await s.ref.get()).data().reviewState, undefined);
  await assert.rejects(s.call(all(12)), /encerrada/);
  await assert.rejects(listCommunityRatingsForAdmin.run({ auth: { uid: s.author }, data: {} }), /reservado/);
  await db.doc(`users/${s.admin}`).update({ adminCapabilities: ["games"] });
  await assert.rejects(s.grant(), /reservado/);
  await db.doc(`users/${s.admin}`).update({ adminCapabilities: ["ratings"] });
  await s.ref.update({ ratings20: all(12) });
  await assert.rejects(s.grant(), /outra tentativa/);
  await s.ref.update({ ratings20: all(1) });
  await s.grant();
  const authorized = (await s.ref.get()).data();
  await s.call(all(12), { reviewToken: authorized.reviewToken });
  await assert.rejects(s.grant(), /outra tentativa/);
});
