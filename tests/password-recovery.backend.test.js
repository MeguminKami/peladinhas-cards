import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  passwordRecoveryAction,
  completePasswordRecovery,
} from "../functions/index.js";

const db = getFirestore(),
  auth = getAuth();
const suffix = randomUUID().slice(0, 8);
const admin = `reset-admin-${suffix}`,
  member = `reset-member-${suffix}`,
  limited = `reset-limited-${suffix}`;
const username = `reset-${suffix}`,
  original = "OriginalPassword123!",
  next = "ChosenPassword456!";
const approve = (uid = member, actor = admin, action = "authorize", age = 0) =>
  passwordRecoveryAction.run({
    auth: {
      uid: actor,
      token: { auth_time: Math.floor(Date.now() / 1000) - age },
    },
    data: { uid, action },
  });
const complete = (code, password = next, name = username, ip = randomUUID()) =>
  completePasswordRecovery.run({
    data: { username: name, code, password },
    rawRequest: { ip },
  });
const signIn = async (password) => {
  const response = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `${username}@auth.weeklyfc.app`,
        password,
        returnSecureToken: true,
      }),
    },
  );
  return { status: response.status, data: await response.json() };
};
test.before(async () => {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    !process.env.GCLOUD_PROJECT?.startsWith("demo-")
  )
    throw Error("Emuladores demo obrigatórios.");
  for (const [uid, role, capabilities] of [
    [admin, "admin"],
    [member, "member"],
    [limited, "admin", ["ratings"]],
  ]) {
    await db
      .doc(`users/${uid}`)
      .set({
        uid,
        role,
        disabled: false,
        ...(capabilities ? { adminCapabilities: capabilities } : {}),
      });
    await auth.createUser({
      uid,
      email: `${uid === member ? username : uid}@auth.weeklyfc.app`,
      password: original,
    });
  }
});

test("recovery: authority, recent login, disabled account and private approval", async () => {
  await assert.rejects(approve(member, member), { code: "permission-denied" });
  await assert.rejects(approve(member, limited), { code: "permission-denied" });
  await assert.rejects(approve(member, admin, "authorize", 400), {
    code: "unauthenticated",
  });
  await assert.rejects(approve("../forged"));
  await db.doc(`users/${member}`).update({ disabled: true });
  await assert.rejects(approve());
  await db.doc(`users/${member}`).update({ disabled: false });
  const approval = await approve();
  assert.equal(approval.code.length, 24);
  const row = (await db.doc(`passwordRecoveries/${member}`).get()).data();
  assert.equal(row.status, "authorized");
  assert.equal(row.codeHash.length, 64);
  assert.ok(!JSON.stringify(row).includes(approval.code));
  assert.equal((await signIn(original)).status, 200);
});

test("recovery: expired, revoked, substituted and invalid codes cannot change password", async () => {
  const first = await approve(),
    second = await approve();
  await assert.rejects(complete(first.code), { code: "permission-denied" });
  await assert.rejects(complete(second.code, next, "missing-user"), {
    code: "permission-denied",
  });
  await assert.rejects(complete("x".repeat(24)), { code: "permission-denied" });
  await assert.rejects(complete(second.code, "123"), {
    code: "invalid-argument",
  });
  await db
    .doc(`passwordRecoveries/${member}`)
    .update({ expiresAt: new Date(Date.now() - 1000) });
  await assert.rejects(complete(second.code), { code: "permission-denied" });
  const third = await approve();
  await approve(member, admin, "cancel");
  await assert.rejects(complete(third.code), { code: "permission-denied" });
  assert.equal((await signIn(original)).status, 200);
});

test("recovery: one concurrent claim wins, chosen password persists, original and replay fail", async () => {
  const approval = await approve();
  const results = await Promise.allSettled([
    complete(approval.code),
    complete(approval.code, "OtherPassword999!"),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const winner = results[0].status === "fulfilled" ? next : "OtherPassword999!";
  assert.equal((await signIn(winner)).status, 200);
  assert.equal((await signIn(original)).status, 400);
  await assert.rejects(complete(approval.code), { code: "permission-denied" });
  const row = (await db.doc(`passwordRecoveries/${member}`).get()).data();
  assert.equal(row.status, "consumed");
  assert.equal(row.codeHash, undefined);
  assert.equal(row.claim, undefined);
  assert.ok(!JSON.stringify(row).includes(winner));
  assert.ok(
    (await db.doc(`users/${member}`).get()).data().tokensValidAfter > 0,
  );
  const audit = await db
    .collection("systemAudit")
    .where("actorId", "==", member)
    .get();
  assert.ok(
    audit.docs.some((d) => d.data().action === "password-recovery-complete"),
  );
  assert.ok(
    audit.docs.every((d) => !JSON.stringify(d.data()).includes(winner)),
  );
});

test("recovery: public endpoint throttles unauthenticated guesses", async (t) => {
  const now = Date.now();
  t.mock.method(Date, "now", () => now);
  const ip = `rate-${suffix}`;
  for (let i = 0; i < 20; i++)
    await assert.rejects(complete("x".repeat(24), next, username, ip), {
      code: "permission-denied",
    });
  await assert.rejects(complete("x".repeat(24), next, username, ip), {
    code: "resource-exhausted",
  });
});

test("recovery: disabled users cannot consume an existing authorization; failed Auth mutations stay consumed", async () => {
  const approval = await approve();
  await auth.updateUser(member, { disabled: true });
  await assert.rejects(complete(approval.code), { code: "permission-denied" });
  await auth.updateUser(member, { disabled: false });
  await db.doc(`users/${member}`).update({ disabled: true });
  await assert.rejects(complete(approval.code), { code: "permission-denied" });
  await db.doc(`users/${member}`).update({ disabled: false });
  const update = auth.updateUser;
  auth.updateUser = async () => {
    throw Object.assign(Error("Auth unavailable"), {
      code: "auth/internal-error",
    });
  };
  try {
    await assert.rejects(complete(approval.code), { code: "internal" });
  } finally {
    auth.updateUser = update;
  }
  assert.equal(
    (await db.doc(`passwordRecoveries/${member}`).get()).data().status,
    "failed",
  );
  await assert.rejects(complete(approval.code), { code: "permission-denied" });
  assert.equal((await approve()).ok, true);
});

test("recovery: limited access admins cannot reset full administrators", async () => {
  await db.doc(`users/${limited}`).update({ adminCapabilities: ["access"] });
  await assert.rejects(approve(admin, limited), { code: "permission-denied" });
  assert.equal((await approve(member, limited)).ok, true);
});
