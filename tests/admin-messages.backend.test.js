import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore } from "firebase-admin/firestore";
import { adminMessage } from "../functions/index.js";

test("admin messages restrict delivery to the chosen audience", async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.GCLOUD_PROJECT?.startsWith("demo-"));
  const db = getFirestore();
  for (const [uid, role, disabled] of [["msg-admin", "admin", false], ["msg-a", "member", false], ["msg-b", "member", false], ["msg-out", "member", false], ["msg-disabled", "member", true]])
    await db.doc(`users/${uid}`).set({ uid, role, disabled });
  await db.doc("games/message-game").set({ teamA: { starters: ["msg-a"], bench: ["msg-b"] }, teamB: { starters: ["msg-disabled"], bench: ["msg-a"] } });
  const call = (data, uid = "msg-admin") => adminMessage.run({ auth: { uid }, data: { title: "Audience test", body: "Test", ...data } });
  const count = async uid => (await db.collection(`users/${uid}/notifications`).where("title", "==", "Audience test").get()).size;
  await assert.rejects(call({ audience: "all" }, "msg-a"));
  const game = await call({ audience: "game", gameId: "message-game", recipientIds: ["msg-out"] });
  assert.equal(game.sent, 2);
  assert.equal(await count("msg-a"), 1);
  assert.equal(await count("msg-b"), 1);
  assert.equal(await count("msg-out"), 0);
  assert.equal(await count("msg-disabled"), 0);
  const selected = await call({ audience: "selected", recipientIds: ["msg-out", "msg-out", "msg-disabled", "missing"] });
  assert.equal(selected.sent, 1);
  assert.equal(await count("msg-out"), 1);
  assert.equal(await count("msg-a"), 1);
  for (const payload of [{ audience: "unknown" }, { audience: "selected", recipientIds: [] }, { audience: "game", gameId: "missing" }, { audience: "game", gameId: "bad/path" }, { audience: "selected", recipientIds: ["msg-disabled"] }])
    await assert.rejects(call(payload));
  const all = await call({ audience: "all" });
  assert.ok(all.sent >= 4);
  assert.equal(await count("msg-a"), 2);
  assert.equal(await count("msg-b"), 2);
  assert.equal(await count("msg-out"), 2);
  assert.equal(await count("msg-disabled"), 0);
});
