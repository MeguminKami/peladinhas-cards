import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { assertTestEmulator } from "../functions/test-environment.js";
import { signalMaintenance } from "../functions/maintenance-inputs.js";
import {
  expireRewards,
  writeRewardExpiration,
} from "../functions/reward-expirations.js";
import { acknowledgeCardRefresh } from "../functions/card-refresh.js";
import { ATTRIBUTES } from "../js/utils.js";
import { emptyPathState } from "../js/path-model.js";

assertTestEmulator();
process.env.GCLOUD_PROJECT = `demo-selective-${process.pid}`;
const { refreshCardCollection, systemHeartbeat, settlePaths } =
  await import("../functions/index.js");
const db = getFirestore();

function forbidFullScans(t, paths) {
  const collection = db.collection.bind(db);
  t.mock.method(db, "collection", (path) => {
    const ref = collection(path);
    if (paths.includes(path))
      return new Proxy(ref, {
        get(target, key) {
          if (key === "get")
            return () => {
              throw Error(`Full scan forbidden: ${path}`);
            };
          const value = Reflect.get(target, key);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    return ref;
  });
}

test("idle checks skip scans and one changed player does not enumerate users or rewards", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-14T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  for (const uid of ["selective-a", "selective-b"]) {
    await db
      .doc(`users/${uid}`)
      .set({ uid, role: "member", primaryPosition: "MED" });
    await db
      .doc(`initialRatings/${uid}`)
      .set({
        uid,
        ratings20: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 12])),
      });
  }
  await refreshCardCollection.run({ cycle: true, incremental: true });
  const untouched = (await db.doc("cardCollections/selective-b").get())
    .updateTime;
  forbidFullScans(t, ["users", "eventRewards"]);
  assert.equal(
    (await refreshCardCollection.run({ cycle: true, incremental: true }))
      .current,
    true,
  );
  await signalMaintenance("initialRatings", "selective-a", null, {
    uid: "selective-a",
    changed: true,
  });
  await refreshCardCollection.run({ cycle: true, incremental: true });
  assert.equal(
    (await db.doc("cardRefreshWork/selective-a").get()).data().pending,
    false,
  );
  assert.equal(
    (await db.doc("cardCollections/selective-b").get()).updateTime.isEqual(
      untouched,
    ),
    true,
  );
  assert.equal(
    (await refreshCardCollection.run({ cycle: true, incremental: true }))
      .current,
    true,
  );
  const expiresAt = Date.now() + 3600000;
  await db.doc("cardRefreshWork/selective-a").update({ nextAt: expiresAt });
  await signalMaintenance("games", "no-players", null, { status: "open" });
  assert.equal(
    (await refreshCardCollection.run({ cycle: true, incremental: true })).nextAt,
    expiresAt,
    "an unrelated signal must not postpone an existing card expiry",
  );
});

test("acknowledging an old card generation preserves a concurrent update", async () => {
  await signalMaintenance("initialRatings", "selective-a", null, {
    uid: "selective-a",
    revision: 1,
  });
  const old = await db.doc("cardRefreshWork/selective-a").get();
  await signalMaintenance("initialRatings", "selective-a", null, {
    uid: "selective-a",
    revision: 2,
  });
  await acknowledgeCardRefresh("selective-a", old, { rewards: [] });
  assert.equal(
    (await db.doc("cardRefreshWork/selective-a").get()).data().pending,
    true,
  );
});

test("idle paths and an individual path change do not enumerate every state", async (t) => {
  await db.doc("pathStates/selective-a").set(emptyPathState("selective-a"));
  await db.doc("pathStates/selective-b").set(emptyPathState("selective-b"));
  await settlePaths.run({ cycle: true, incremental: true });
  forbidFullScans(t, ["pathStates", "users", "eventRewards"]);
  assert.equal(
    (await settlePaths.run({ cycle: true, incremental: true })).current,
    true,
  );
  await signalMaintenance("pathStates", "selective-a", null, { revision: 1 });
  await settlePaths.run({ cycle: true, incremental: true });
  assert.equal(
    (await db.doc("pathRefreshWork/selective-a").get()).data().pending,
    false,
  );
});

test("legacy expirations bootstrap once and processed rewards are never rescanned", async (t) => {
  await db
    .doc("eventRewards/old-expiry")
    .set({
      uid: "selective-a",
      schemaVersion: 2,
      expiresAt: Timestamp.fromMillis(Date.now() - 1000),
      reward: { boosts: { dribbling: 1 } },
    });
  const first = await expireRewards();
  assert.deepEqual(first.uids, ["selective-a"]);
  assert.equal(
    (await db.doc("eventRewards/old-expiry").get()).data().expirationProcessed,
    true,
  );
  forbidFullScans(t, ["eventRewards"]);
  assert.deepEqual((await expireRewards()).uids, []);
  const reward = {
    uid: "selective-a",
    schemaVersion: 2,
    expiresAt: Timestamp.fromMillis(Date.now() - 1),
    reward: { boosts: {}, statDuration: "weekly" },
  };
  const batch = db.batch();
  batch.set(db.doc("eventRewards/new-expiry"), reward);
  writeRewardExpiration(batch, "new-expiry", reward);
  await batch.commit();
  assert.deepEqual((await expireRewards()).uids, ["selective-a"]);
});

test("a deferred reward delivered in a cycle queues its card for that same cycle", async () => {
  await db
    .doc("eventRewards/deferred-selective")
    .set({
      uid: "selective-a",
      schemaVersion: 2,
      pending: true,
      source: "mission",
      configuredReward: { boosts: { dribbling: 1 }, statDuration: "weekly" },
      reward: { boosts: { dribbling: 0 }, statDuration: "weekly" },
    });
  await systemHeartbeat.run({ cycle: true, incremental: true });
  assert.equal(
    (await db.doc("eventRewards/deferred-selective").get()).data().pending,
    false,
  );
  assert.equal(
    (await db.doc("cardRefreshWork/selective-a").get()).data().pending,
    true,
  );
  await refreshCardCollection.run({ cycle: true, incremental: true });
  assert.equal(
    (await db.doc("cardRefreshWork/selective-a").get()).data().pending,
    false,
  );
});
