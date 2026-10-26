import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  ratingSubmissionStatus,
  sendRatingReminders,
  scheduledNotifications,
} from "../functions/index.js";
import { DEFAULT_POLICY } from "../js/system-policy.js";
const db = getFirestore();
if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw Error("Usar apenas o emulador Firestore.");
const gameId = "rating-admin-game",
  ids = ["rating-admin", "rating-partial", "rating-pending", "rating-inactive"];
const call = (endpoint, data = {}, uid = ids[0]) =>
  endpoint.run({ auth: { uid }, data: { gameId, ...data } });
const submit = async (uid, target, submitted = true) =>
  db.doc(`games/${gameId}/feedback/${uid}_${target}`).set({
    raterId: uid,
    targetId: target,
    submitted,
    ratings: { overall: 4 },
  });
test("administrative game submissions and shared reminders", async (t) => {
  const config = structuredClone(DEFAULT_POLICY);
  config.notifications.quietStart = config.notifications.quietEnd = 0;
  const save = () =>
    db.doc("settings/system").set({
      revision: 1,
      timeline: [{ version: 1, effectiveAt: "1970-01-01", config }],
    });
  await save();
  await Promise.all(
    ids.map((uid, index) =>
      db.doc(`users/${uid}`).set({
        uid,
        displayName: uid,
        role: index ? "member" : "admin",
        disabled: index === 3,
      }),
    ),
  );
  await db
    .doc("users/rating-staff")
    .set({ role: "admin", adminCapabilities: ["games"] });
  await db
    .doc("users/rating-other")
    .set({ role: "admin", adminCapabilities: ["messages"] });
  await db.doc(`games/${gameId}`).set({
    title: "Jogo de controlo",
    status: "closed",
    closedAt: Timestamp.fromMillis(Date.now() - 25 * 3600000),
    teamA: { starters: ids.slice(0, 2), bench: [] },
    teamB: { starters: ids.slice(2), bench: [] },
  });
  for (const target of ids) await submit(ids[0], target);
  await submit(ids[1], ids[0]);
  await submit(ids[1], ids[1]);
  await submit(ids[1], ids[2], false);
  await t.test(
    "status counts full, partial, drafts, self and inactive accounts without exposing scores",
    async () => {
      const status = await call(ratingSubmissionStatus);
      assert.deepEqual(
        status.users.map((row) => [row.status, row.submitted, row.total]),
        [
          ["complete", 4, 4],
          ["partial", 2, 4],
          ["pending", 0, 4],
          ["pending", 0, 4],
        ],
      );
      assert.equal(status.users[1].drafts, 1);
      assert.equal(status.users[3].canRemind, false);
      assert.equal(JSON.stringify(status).includes('"ratings"'), false);
      await call(ratingSubmissionStatus, {}, "rating-staff");
    },
  );
  await t.test(
    "members and unrelated capabilities cannot read or send; roster is validated",
    async () => {
      for (const uid of [ids[1], "rating-other"]) {
        await assert.rejects(
          call(ratingSubmissionStatus, {}, uid),
          (error) => error.code === "permission-denied",
        );
        await assert.rejects(
          call(
            sendRatingReminders,
            { uids: [ids[2]], requestId: "request-denied" },
            uid,
          ),
          (error) => error.code === "permission-denied",
        );
      }
      await assert.rejects(
        call(sendRatingReminders, {
          uids: [ids[2], "outsider"],
          requestId: "invalid-roster",
        }),
        (error) => error.code === "invalid-argument",
      );
      assert.equal(
        (await db.collection(`users/${ids[2]}/notifications`).get()).size,
        0,
      );
    },
  );
  await t.test(
    "group sends reach only active pending raters; concurrent retries cannot duplicate",
    async () => {
      const data = { uids: ids, requestId: "same-batch-request" };
      const results = await Promise.all([
        call(sendRatingReminders, data),
        call(sendRatingReminders, data),
      ]);
      assert.equal(
        results.reduce((sum, row) => sum + row.sent, 0),
        2,
      );
      for (const uid of ids) {
        const notes = await db.collection(`users/${uid}/notifications`).get();
        assert.equal(notes.size, uid === ids[1] || uid === ids[2] ? 1 : 0);
        if (notes.size) {
          assert.equal(notes.docs[0].data().href, `#/game/${gameId}/feedback`);
          assert.equal(notes.docs[0].data().type, "RATING_REQUIRED");
        }
      }
      assert.equal(
        (await call(ratingSubmissionStatus)).users[1].canRemind,
        false,
      );
    },
  );
  await t.test(
    "automatic reminders reuse the same quota and cannot immediately repeat admin reminders",
    async () => {
      await scheduledNotifications.run({});
      assert.equal(
        (await db.collection(`users/${ids[1]}/notifications`).where("type", "==", "RATING_REQUIRED").get()).size,
        1,
      );
      assert.equal(
        (await db.collection(`users/${ids[2]}/notifications`).where("type", "==", "RATING_REQUIRED").get()).size,
        1,
      );
    },
  );
  await t.test(
    "completion after opening the status is rechecked during delivery",
    async () => {
      await db.doc(`notificationQuotas/${ids[1]}`).delete();
      for (const target of ids) await submit(ids[1], target);
      assert.equal(
        (
          await call(sendRatingReminders, {
            uids: [ids[1]],
            requestId: "fresh-completion",
          })
        ).sent,
        0,
      );
    },
  );
  await t.test(
    "daily caps, quiet time and global switches are respected",
    async () => {
      config.notifications.cooldownMinutes = 0;
      config.notifications.maxDaily = 1;
      await save();
      assert.equal(
        (
          await call(sendRatingReminders, {
            uids: [ids[2]],
            requestId: "daily-cap-test",
          })
        ).sent,
        0,
      );
      config.notifications.enabled = false;
      await save();
      assert.equal(
        (await call(ratingSubmissionStatus)).users[2].canRemind,
        false,
      );
      assert.equal(
        (
          await call(sendRatingReminders, {
            uids: [ids[2]],
            requestId: "paused-notifications",
          })
        ).sent,
        0,
      );
      config.notifications.enabled = true;
      config.notifications.quietStart = +new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Lisbon",
        hour: "numeric",
        hourCycle: "h23",
      }).format(new Date());
      config.notifications.quietEnd =
        (config.notifications.quietStart + 1) % 24;
      await save();
      assert.equal(
        (
          await call(sendRatingReminders, {
            uids: [ids[2]],
            requestId: "quiet-hour-test",
          })
        ).results[0].reason,
        "quiet",
      );
      config.notifications.quietStart = config.notifications.quietEnd = 0;
      config.features.ratings = false;
      await save();
      await assert.rejects(
        call(sendRatingReminders, {
          uids: [ids[2]],
          requestId: "paused-feedback",
        }),
        (error) => error.code === "failed-precondition",
      );
      config.features.ratings = true;
      config.features.mode = "readOnly";
      await save();
      await call(ratingSubmissionStatus);
      await assert.rejects(
        call(sendRatingReminders, {
          uids: [ids[2]],
          requestId: "read-only-mode",
        }),
      );
      config.features.mode = "normal";
      config.security.requireAppCheck = true;
      await save();
      await assert.rejects(
        call(sendRatingReminders, {
          uids: [ids[2]],
          requestId: "unverified-client",
        }),
        (error) => error.code === "unauthenticated",
      );
    },
  );
  await t.test("reopened games cannot receive rating reminders", async () => {
    config.security.requireAppCheck = false;
    await save();
    await db.doc(`games/${gameId}`).update({ status: "open" });
    assert.equal(
      (await call(ratingSubmissionStatus)).users[2].canRemind,
      false,
    );
    await assert.rejects(
      call(sendRatingReminders, { uids: [ids[2]], requestId: "reopened-game" }),
      (error) => error.code === "failed-precondition",
    );
  });
  await db.doc("settings/system").delete();
});
