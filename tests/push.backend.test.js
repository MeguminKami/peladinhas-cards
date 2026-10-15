import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import webpush from "web-push";
import "../functions/index.js";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  pushFunctions,
  normalizePushSubscription,
  allowedPushScope,
} from "../functions/push.js";

const keys = webpush.generateVAPIDKeys(),
  db = getFirestore();
const uid = "push-member",
  other = "push-other";
const scope = "https://pedalinhas-cards.web.app/";
const subscription = (id) => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/push-test-${id}`,
  keys: { p256dh: keys.publicKey, auth: randomBytes(16).toString("base64url") },
});
const notifications = () => db.collection(`users/${uid}/notifications`);
test("push: secure devices, delivery retries, private read receipts and account changes", async (t) => {
  await db.doc(`users/${uid}`).set({ disabled: false });
  await db.doc(`users/${other}`).set({ disabled: false });
  for (const name of ["pushDevices", "pushDeliveries"]) {
    const docs = await db
      .collection(name)
      .where("uid", "in", [uid, other])
      .get();
    await Promise.all(docs.docs.map((d) => d.ref.delete()));
  }
  const delivered = [];
  let failure = null;
  const functions = pushFunctions({
    projectId: "pedalinhas-cards",
    publicKey: keys.publicKey,
    privateKey: () => keys.privateKey,
    send: async (sub, payload, options) => {
      if (failure) {
        const current = failure;
        failure = null;
        throw current;
      }
      // Build the real encrypted/signed HTTP request without sending it over the network.
      const request = webpush.generateRequestDetails(sub, payload, options);
      assert.ok(Buffer.isBuffer(request.body));
      delivered.push({ sub, payload: JSON.parse(payload), options });
    },
  });
  const call = (data, account = uid) =>
    functions.pushDeviceAction.run({
      auth: account ? { uid: account } : undefined,
      data,
    });
  const fire = (nid) =>
    functions.onNotificationPush.run({ params: { uid, nid } });
  const create = async (nid, extras = {}) =>
    notifications()
      .doc(nid)
      .set({
        type: "GAME",
        title: "Novo jogo",
        body: "Convocatória da liga",
        href: "#/games",
        createdAt: Timestamp.now(),
        read: false,
        ...extras,
      });
  const ack = (payload) =>
    functions.ackPushNotification.run({
      data: {
        receiptId: payload.receiptId,
        receiptToken: payload.receiptToken,
      },
    });
  const first = subscription("one"),
    second = subscription("two");
  let device1, device2;
  await t.test(
    "requires an enabled account and rejects unsafe endpoints and scopes",
    async () => {
      await assert.rejects(
        call({ action: "register", subscription: first, scope }, null),
        /Inicia/,
      );
      await db.doc("users/push-disabled").set({ disabled: true });
      await assert.rejects(
        call(
          { action: "register", subscription: first, scope },
          "push-disabled",
        ),
        /Conta/,
      );
      for (const endpoint of [
        "http://fcm.googleapis.com/a",
        "https://fcm.googleapis.com.evil.test/a",
        "https://127.0.0.1/a",
        "https://fcm.googleapis.com:444/a",
        "https://user@web.push.apple.com/a",
      ])
        assert.throws(() => normalizePushSubscription({ ...first, endpoint }));
      assert.throws(() =>
        normalizePushSubscription({
          ...first,
          keys: { ...first.keys, p256dh: "A".repeat(87) },
        }),
      );
      for (const value of [
        "https://evil.test/",
        "https://pedalinhas-cards.web.app.evil.test/",
        "https://pedalinhas-cards.web.app/?x=1",
        "https://meguminkami.github.io/",
      ])
        assert.throws(() => allowedPushScope(value, "pedalinhas-cards"));
      assert.equal(
        allowedPushScope(
          "https://meguminkami.github.io/demos/peladinha-cards/",
          "pedalinhas-cards",
        ),
        "https://meguminkami.github.io/demos/peladinha-cards/",
      );
      device1 = (await call({ action: "register", subscription: first, scope }))
        .deviceId;
      device2 = (
        await call({ action: "register", subscription: second, scope })
      ).deviceId;
      assert.equal(
        (await call({ action: "register", subscription: first, scope }))
          .deviceId,
        device1,
      );
      assert.equal(
        (await db.collection("pushDevices").where("uid", "==", uid).get()).size,
        2,
      );
      await assert.rejects(
        call({ action: "unregister", deviceId: device1 }, other),
        /pertence/,
      );
    },
  );
  await t.test(
    "invalid production configuration fails the test before creating a notification and records a safe diagnostic",
    async () => {
      const invalid = pushFunctions({
        projectId: "pedalinhas-cards",
        publicKey: keys.publicKey,
        privateKey: () => keys.publicKey,
        send: async () => {
          throw Error("Transport must not be called");
        },
      });
      const before = (
        await notifications().where("type", "==", "PUSH_TEST").get()
      ).size;
      await assert.rejects(
        invalid.pushDeviceAction.run({
          auth: { uid },
          data: { action: "test", deviceId: device1 },
        }),
        (error) =>
          error.code === "failed-precondition" &&
          error.details.reason === "push-configuration",
      );
      assert.equal(
        (await notifications().where("type", "==", "PUSH_TEST").get()).size,
        before,
      );
      await create("invalid-configuration");
      await assert.rejects(
        invalid.onNotificationPush.run({
          params: { uid, nid: "invalid-configuration" },
        }),
      );
      const receipts = await db
        .collection("pushDeliveries")
        .where("notificationId", "==", "invalid-configuration")
        .get();
      assert.equal(receipts.size, 2);
      for (const doc of receipts.docs) {
        assert.equal(doc.data().failure, "configuration");
        assert.equal(doc.data().sentAt, undefined);
      }
    },
  );
  await t.test(
    "delivers once per device and a native tap marks exactly that notification read",
    async () => {
      await create("one");
      await fire("one");
      await fire("one");
      assert.equal(delivered.length, 2);
      const receipt = delivered[0].payload;
      assert.equal(delivered[0].options.TTL, 86400);
      assert.equal(receipt.notificationId, "one");
      await assert.rejects(
        ack({ ...receipt, receiptToken: "X".repeat(43) }),
        /inválida/,
      );
      assert.equal((await notifications().doc("one").get()).data().read, false);
      assert.deepEqual(await ack(receipt), { read: true });
      assert.deepEqual(await ack(receipt), { read: true });
      assert.equal((await notifications().doc("one").get()).data().read, true);
      await create("already-read", { read: true });
      await fire("already-read");
      assert.equal(delivered.length, 2);
    },
  );
  await t.test(
    "retries only the failed device, preserves the capability and suppresses duplicates",
    async () => {
      await create("retry");
      failure = Object.assign(Error("unavailable"), { statusCode: 503 });
      await assert.rejects(fire("retry"));
      const before = await db
        .collection("pushDeliveries")
        .where("notificationId", "==", "retry")
        .get();
      const tokenById = new Map(before.docs.map((d) => [d.id, d.data().token]));
      await fire("retry");
      await fire("retry");
      const pushes = delivered.filter(
        (d) => d.payload.notificationId === "retry",
      );
      assert.equal(pushes.length, 2);
      for (const item of pushes)
        assert.equal(
          item.payload.receiptToken,
          tokenById.get(item.payload.receiptId),
        );
      const recovered = await db
        .collection("pushDeliveries")
        .where("notificationId", "==", "retry")
        .get();
      for (const doc of recovered.docs) {
        assert.ok(doc.data().sentAt);
        assert.equal(doc.data().lastError, undefined);
        assert.equal(doc.data().failure, undefined);
      }
    },
  );
  await t.test(
    "old or expired alerts cannot mark a changed notification read",
    async () => {
      await create("changed");
      await fire("changed");
      const old = delivered.find(
        (d) => d.payload.notificationId === "changed",
      ).payload;
      await notifications()
        .doc("changed")
        .update({ title: "Nova convocatória", read: false });
      assert.deepEqual(await ack(old), { obsolete: true });
      assert.equal(
        (await notifications().doc("changed").get()).data().read,
        false,
      );
      await create("expired");
      await fire("expired");
      const expired = delivered.find(
        (d) => d.payload.notificationId === "expired",
      ).payload;
      await db
        .doc(`pushDeliveries/${expired.receiptId}`)
        .update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
      assert.deepEqual(await ack(expired), { expired: true });
      assert.equal(
        (await notifications().doc("expired").get()).data().read,
        false,
      );
    },
  );
  await t.test(
    "test alerts target one device and enforce a cooldown",
    async () => {
      await call({ action: "test", deviceId: device1 });
      await call({ action: "register", subscription: first, scope });
      await assert.rejects(
        call({ action: "test", deviceId: device1 }),
        /minuto/,
      );
      const tests = await notifications()
        .where("type", "==", "PUSH_TEST")
        .get();
      const latest = tests.docs.sort(
        (a, b) => b.data().createdAt.toMillis() - a.data().createdAt.toMillis(),
      )[0];
      const start = delivered.length;
      await fire(latest.id);
      assert.equal(delivered.length, start + 1);
      assert.equal(delivered.at(-1).sub.endpoint, first.endpoint);
    },
  );
  await t.test(
    "unsubscribed devices are removed and account transfers prevent stale sends",
    async () => {
      await call({ action: "unregister", deviceId: device2 });
      await create("gone");
      failure = Object.assign(Error("gone"), { statusCode: 410 });
      await fire("gone");
      assert.equal(
        (await db.doc(`pushDevices/${device1}`).get()).exists,
        false,
      );
      await call({ action: "register", subscription: first, scope });
      await call({ action: "register", subscription: first, scope }, other);
      await create("wrong-account");
      const start = delivered.length;
      await fire("wrong-account");
      assert.equal(delivered.length, start);
      await assert.rejects(
        call({ action: "unregister", deviceId: device1 }),
        /pertence/,
      );
      assert.equal(
        (await db.doc(`pushDevices/${device1}`).get()).data().uid,
        other,
      );
    },
  );
});
