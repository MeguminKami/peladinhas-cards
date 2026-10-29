import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { newCasinoWallet } from "../js/casino-economy.js";
import { rouletteAction } from "../functions/index.js";
import {
  runRoulette,
  settleIdleRoulette,
} from "../functions/roulette.js";
import { ROULETTE_PRIVATE, ROULETTE_PUBLIC } from "../functions/roulette-table.js";

const db = getFirestore();

async function clearRoom() {
  await Promise.all([
    db.doc(ROULETTE_PRIVATE).delete(),
    db.doc(ROULETTE_PUBLIC).delete(),
  ]);
}

async function player(uid) {
  await db.doc(`users/${uid}`).set({
    uid,
    username: uid,
    displayName: uid,
    disabled: false,
    role: "member",
  });
  await db.doc(`casinoWallets/${uid}`).set(newCasinoWallet());
}

function request(uid, action, table, extra = {}) {
  return runRoulette(
    { action, id: randomUUID(), ...(table ? { table } : {}), ...extra },
    uid,
    uid,
    Date.now(),
    db,
  );
}

test("a solo spin is server-drawn, paid atomically, and idempotent", async () => {
  await clearRoom();
  const uid = `roulette-solo-${randomUUID()}`;
  await player(uid);
  const joined = await request(uid, "join");
  const plan = { "straight:1": 20 };
  const id = randomUUID();
  const spin = (number) =>
    runRoulette(
      { action: "spin", id, table: joined.table.id, plan },
      uid,
      uid,
      Date.now(),
      db,
      number,
    );
  const result = await spin(1);
  assert.equal(result.table.phase, "betting");
  assert.equal(result.table.result.number, 1);
  assert.equal(result.balance, 20700);
  assert.equal((await db.doc(`casinoWallets/${uid}`).get()).data().balance, 20700);
  assert.equal((await spin(1)).balance, 20700);
});

test("players share one number and receive their own atomic returns", async () => {
  await clearRoom();
  const first = `roulette-first-${randomUUID()}`,
    second = `roulette-second-${randomUUID()}`;
  await Promise.all([player(first), player(second)]);
  const [a, b] = await Promise.all([
    request(first, "join"),
    request(second, "join"),
  ]);
  assert.equal(a.table.id, b.table.id);
  assert.notEqual(
    a.table.players.find((player) => player.uid === first).color,
    a.table.players.find((player) => player.uid === second).color,
  );
  const table = a.table.id;
  const plan = { "straight:0": 20 };
  const closing = await runRoulette(
    { action: "spin", id: randomUUID(), table, plan },
    first,
    first,
    Date.now(),
    db,
    0,
  );
  assert.equal(closing.table.phase, "closing");
  assert.equal(closing.balance, 19980);
  const result = await runRoulette(
    { action: "spin", id: randomUUID(), table, plan },
    second,
    second,
    Date.now() + 100,
    db,
    0,
  );
  assert.equal(result.table.phase, "betting");
  assert.equal(result.table.deadline, 0);
  assert.ok(result.table.players.every((entry) => !entry.plan && !entry.ready));
  assert.equal(result.table.result.number, 0);
  assert.equal(result.table.result.players.length, 2);
  assert.equal(result.balance, 20700);
  assert.equal((await db.doc(`casinoWallets/${first}`).get()).data().balance, 20700);
  assert.equal((await db.doc(`casinoWallets/${second}`).get()).data().balance, 20700);
});

test("chat stores short-lived text with the server-assigned player color", async () => {
  await clearRoom();
  const uid = `roulette-chat-${randomUUID()}`;
  await player(uid);
  const joined = await request(uid, "join");
  const id = randomUUID();
  const sent = await runRoulette(
    { action: "chat", id, table: joined.table.id, message: "Olá, mesa!" },
    uid,
    uid,
    Date.now(),
    db,
  );
  const message = (
    await db
      .doc(ROULETTE_PUBLIC)
      .collection("rouletteMessages")
      .doc(`${uid}_${id}`)
      .get()
  ).data();
  assert.equal(message.user, joined.table.players[0].name);
  assert.equal(message.message, "Olá, mesa!");
  assert.equal(message.color, joined.table.players[0].color);
  assert.equal(message.expireAt.toMillis() - message.createdAt, 30 * 60 * 1000);
  assert.equal(sent.table.id, joined.table.id);
  await db.doc(ROULETTE_PRIVATE).delete();
  await db.doc(ROULETTE_PUBLIC).delete();
});

test("betting reopens immediately after the result and closes after 30 seconds", async () => {
  await clearRoom();
  const first = `roulette-fast-a-${randomUUID()}`,
    second = `roulette-fast-b-${randomUUID()}`;
  const startedAt = Date.now();
  await Promise.all([player(first), player(second)]);
  const joined = await runRoulette({ action: "join", id: randomUUID() }, first, first, startedAt, db);
  await runRoulette({ action: "join", id: randomUUID() }, second, second, startedAt, db);
  const table = joined.table.id;
  const plan = { "straight:0": 20 };
  const bet = (uid, at) =>
    runRoulette({ action: "spin", id: randomUUID(), table, plan }, uid, uid, at, db, 0);
  const closing = await bet(first, startedAt + 1);
  assert.equal(closing.table.phase, "closing");
  assert.equal(closing.table.deadline, startedAt + 1 + 30000);
  const resolved = await runRoulette(
    { action: "tick", id: randomUUID(), table },
    second,
    second,
    startedAt + 30002,
    db,
    0,
  );
  assert.equal(resolved.table.phase, "betting");
  assert.equal(resolved.table.result.players.length, 1);
  const next = await bet(first, startedAt + 30003);
  assert.equal(next.table.phase, "closing");
  assert.equal(next.table.roundId, resolved.table.result.id + 1);
});

test("the authenticated callable exposes the online room action", async () => {
  await clearRoom();
  const uid = `roulette-call-${randomUUID()}`;
  await player(uid);
  const response = await rouletteAction.run({
    auth: {
      uid,
      token: { auth_time: Math.floor(Date.now() / 1000) },
    },
    data: { action: "join", id: randomUUID() },
  });
  assert.equal(response.table.players[0].uid, uid);
  assert.equal(response.balance, 20000);
  await clearRoom();
});

// Without a scheduler, abandoned rounds settle on the next table action or
// casino opening. Every bettor's wallet must be loaded for that settlement.
async function abandonedRound() {
  await clearRoom();
  const bettor = `roulette-gone-${randomUUID()}`,
    other = `roulette-idle-${randomUUID()}`;
  await Promise.all([player(bettor), player(other)]);
  const joined = await request(bettor, "join");
  await request(other, "join");
  const startedAt = Date.now();
  await runRoulette({ action: "spin", id: randomUUID(), table: joined.table.id,
    plan: { "straight:0": 20 } }, bettor, bettor, startedAt, db, 0);
  assert.equal((await db.doc(`casinoWallets/${bettor}`).get()).data().balance, 19980);
  return { bettor, later: startedAt + 31000 };
}

test("a join after an abandoned round pays the absent bettor", async () => {
  const { bettor, later } = await abandonedRound();
  const newcomer = `roulette-new-${randomUUID()}`;
  await player(newcomer);
  const joined = await runRoulette({ action: "join", id: randomUUID() }, newcomer, newcomer, later, db, 0);
  assert.equal(joined.table.phase, "betting");
  assert.equal((await db.doc(`casinoWallets/${bettor}`).get()).data().balance, 20700);
});

test("opening the casino settles an abandoned round once", async () => {
  const { bettor, later } = await abandonedRound();
  await settleIdleRoulette(db, later);
  const table = (await db.doc(ROULETTE_PRIVATE).get()).data();
  assert.equal(table.phase, "betting");
  const settled = (await db.doc(`casinoWallets/${bettor}`).get()).data().balance;
  assert.ok([19980, 20700].includes(settled));
  await settleIdleRoulette(db, later + 1000);
  assert.equal((await db.doc(`casinoWallets/${bettor}`).get()).data().balance, settled);
});
