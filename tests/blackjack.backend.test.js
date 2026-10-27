import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { getFirestore } from "firebase-admin/firestore";
import { blackjackAction, casinoSession } from "../functions/index.js";
import {
  runBlackjack,
  BLACKJACK_PRIVATE,
  BLACKJACK_PUBLIC,
} from "../functions/blackjack.js";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { BJ } from "../functions/blackjack-table.js";
import { deck } from "../functions/blackjack-engine.js";
import { writeFileSync, mkdirSync } from "node:fs";
const db = getFirestore();
const req = (uid, data) => ({
  auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
  data,
});

test("chat stores short-lived text with the server-assigned color, idempotently and rate limited", async () => {
  await db.doc(BLACKJACK_PRIVATE).delete();
  await db.doc(BLACKJACK_PUBLIC).delete();
  const uid = `bj-chat-${randomUUID()}`;
  await db.doc(`users/${uid}`).set({ uid, displayName: uid, role: "member", disabled: false });
  const joined = await blackjackAction.run(req(uid, { action: "join", id: randomUUID() }));
  const id = randomUUID();
  const body = { action: "chat", id, table: joined.table.id, message: "  Olá, mesa!  " };
  await blackjackAction.run(req(uid, body));
  await blackjackAction.run(req(uid, body));
  const stored = (await db.doc(BLACKJACK_PUBLIC).collection("blackjackMessages").doc(`${uid}_${id}`).get()).data();
  assert.equal(stored.message, "Olá, mesa!");
  assert.equal(stored.color, joined.table.players[0].color);
  assert.equal(stored.expireAt.toMillis() - stored.createdAt, 30 * 60 * 1000);
  assert.equal((await db.doc(BLACKJACK_PUBLIC).collection("blackjackMessages").get()).size, 1);
  await assert.rejects(blackjackAction.run(req(uid, { ...body, id: randomUUID() })), /Aguarda um instante/);
  await assert.rejects(
    blackjackAction.run(req(uid, { ...body, id: randomUUID(), message: "x".repeat(181) })),
    /Mensagem inválida|Aguarda/,
  );
  await db.doc(BLACKJACK_PRIVATE).delete();
  await db.doc(BLACKJACK_PUBLIC).delete();
});
test("an edition reset replaces the old table without refunding its wagers", async () => {
  const uid = `reset-${randomUUID()}`;
  await db.doc(`users/${uid}`).set({uid, role:"member", disabled:false});
  await db.doc(`casinoWallets/${uid}`).set({edition:"official-2026-10-26-cardoso-reset",balance:999999});
  await db.doc(BLACKJACK_PRIVATE).set({edition:"official-2026-10-26-cardoso-reset",id:"old-table",players:[]});
  const result = await blackjackAction.run(req(uid,{action:"join",id:randomUUID()}));
  assert.equal(result.balance,20000);
  assert.notEqual((await db.doc(BLACKJACK_PRIVATE).get()).data().id,"old-table");
});
test("multiple seats transact against one wallet and competing claims cannot overwrite an owner", async () => {
  await db.doc(BLACKJACK_PRIVATE).delete();
  await db.doc(BLACKJACK_PUBLIC).delete();
  const a = `multi-${randomUUID()}`,
    b = `multi-${randomUUID()}`;
  for (const uid of [a, b])
    await db
      .doc(`users/${uid}`)
      .set({ uid, displayName: uid, role: "member", disabled: false });
  const command = async (uid, action, extra = {}, shoe) => {
    const table = (await db.doc(BLACKJACK_PRIVATE).get()).data();
    const body = {
      action,
      id: randomUUID(),
      ...(table ? { table: table.id, revision: table.revision } : {}),
      ...extra,
    };
    return shoe
      ? runBlackjack(body, uid, uid, Date.now(), db, shoe)
      : blackjackAction.run(req(uid, body));
  };
  await command(a, "join");
  await command(b, "join");
  const claims = await Promise.allSettled([
    command(a, "occupy", { seat: 3 }),
    command(b, "occupy", { seat: 3 }),
  ]);
  assert.equal(claims.filter((r) => r.status === "fulfilled").length, 1);
  const third = (await db.doc(BLACKJACK_PRIVATE).get())
    .data()
    .players.find((p) => p.seat === 3).uid;
  const shoe = deck(),
    ordered = [];
  for (const rank of [2, 2, 2, 10, 8, 8, 8, 7, 9, 9, 9])
    ordered.push(
      ...shoe.splice(
        shoe.findIndex((c) => c.rank === rank),
        1,
      ),
    );
  await command(a, "bet", { seat: 1, amount: 100 });
  await command(b, "bet", { seat: 2, amount: 100 });
  await command(third, "bet", { seat: 3, amount: 100 }, [...ordered, ...shoe]);
  for (const seat of [1, 2, 3]) {
    const uid = seat === 1 ? a : seat === 2 ? b : third;
    await command(uid, "hit", { seat });
    await command(uid, "stand", { seat });
  }
  assert.equal(
    (await db.doc(`casinoWallets/${a}`).get()).data().balance,
    20000 + (third === a ? 200 : 100),
  );
  assert.equal(
    (await db.doc(`casinoWallets/${b}`).get()).data().balance,
    20000 + (third === b ? 200 : 100),
  );
  await db.doc(BLACKJACK_PRIVATE).delete();
  await db.doc(BLACKJACK_PUBLIC).delete();
});
test("real transactions: simultaneous joins, wallet reservations, retries, permissions and orphan recovery", async () => {
  await db.doc(BLACKJACK_PRIVATE).delete();
  await db.doc(BLACKJACK_PUBLIC).delete();
  const ids = Array.from({ length: 5 }, () => `bj-${randomUUID()}`);
  for (const uid of ids)
    await db
      .doc(`users/${uid}`)
      .set({ uid, displayName: uid, role: "member", disabled: false });
  const action = async (uid, action, extra = {}) => {
    const snapshot = await db.doc(BLACKJACK_PRIVATE).get(),
      table = snapshot.data();
    return blackjackAction.run(
      req(uid, {
        id: randomUUID(),
        action,
        ...(table ? { table: table.id, revision: table.revision } : {}),
        ...extra,
      }),
    );
  };
  await Promise.all(ids.map((uid) => action(uid, "join")));
  let snapshot = await db.doc(BLACKJACK_PRIVATE).get();
  assert.equal(snapshot.data().players.length, 5);
  const table = snapshot.data();
  const body = {
    id: randomUUID(),
    action: "bet",
    amount: 100,
    table: table.id,
    revision: table.revision,
  };
  await Promise.all([
    blackjackAction.run(req(ids[0], body)),
    blackjackAction.run(req(ids[0], body)),
  ]);
  assert.equal(
    (await db.doc(`casinoWallets/${ids[0]}`).get()).data().balance,
    19900,
  );
  // Existing session checkpoints apply their delta to the actual server wallet.
  await casinoSession.run(
    req(ids[0], { action: "open", id: randomUUID(), owner: ids[0] }),
  );
  await Promise.all(
    ids.slice(1).map((uid) => action(uid, "bet", { amount: 100 })),
  );
  snapshot = await db.doc(BLACKJACK_PRIVATE).get();
  const publicData = (await db.doc(BLACKJACK_PUBLIC).get()).data();
  assert.equal(publicData.round.dealer[1], null);
  assert.equal(publicData.round.shoe, undefined);
  assert.equal(publicData.session, undefined);
  const env = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT,
    firestore: {
      host: "127.0.0.1",
      port: 8188,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
  try {
    const signed = env
      .authenticatedContext(ids[0], {
        auth_time: Math.floor(Date.now() / 1000),
      })
      .firestore();
    await assertSucceeds(getDoc(doc(signed, BLACKJACK_PUBLIC)));
    await assertFails(getDoc(doc(signed, BLACKJACK_PRIVATE)));
    await assertFails(
      setDoc(doc(signed, BLACKJACK_PUBLIC), { round: "forged" }),
    );
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), BLACKJACK_PUBLIC)),
    );
  } finally {
    await env.cleanup();
  }
  let now = Date.now();
  for (let i = 0; i < 20; i++) {
    const table = (await db.doc(BLACKJACK_PRIVATE).get()).data();
    if (!table) break;
    now += BJ.lease + 1;
    await runBlackjack(
      { action: "tick", id: randomUUID(), table: table.id },
      null,
      null,
      now,
    );
  }
  assert.equal((await db.doc(BLACKJACK_PRIVATE).get()).exists, false);
  assert.equal((await db.doc(BLACKJACK_PUBLIC).get()).exists, false);
  for (const uid of ids)
    assert.ok((await db.doc(`casinoWallets/${uid}`).get()).data().balance >= 0);
});
test("operation budget: five people, five hands, one hit and stand each", async () => {
  await db.doc(BLACKJACK_PRIVATE).delete();
  await db.doc(BLACKJACK_PUBLIC).delete();
  const ids = Array.from({ length: 5 }, () => `budget-${randomUUID()}`);
  let reads = 0,
    writes = 0,
    publicWrites = 0,
    calls = 0;
  const measured = {
    doc: (path) => db.doc(path),
    runTransaction: (fn) =>
      db.runTransaction((tx) =>
        fn({
          get: (ref) => {
            reads++;
            return tx.get(ref);
          },
          getAll: (...refs) => {
            reads += refs.length;
            return tx.getAll(...refs);
          },
          set: (ref, value) => {
            writes++;
            if (ref.path === BLACKJACK_PUBLIC) publicWrites++;
            return tx.set(ref, value);
          },
          delete: (ref) => tx.delete(ref),
        }),
      ),
  };
  let table,
    now = Date.now();
  const request = async (uid, action, extra = {}, shoe) => {
    calls++;
    const data = await runBlackjack(
      {
        action,
        id: randomUUID(),
        table: table?.id,
        revision: table?.revision,
        ...extra,
      },
      uid,
      uid,
      now,
      measured,
      shoe,
    );
    table = data.table;
    return data;
  };
  for (const uid of ids) await request(uid, "join");
  reads = 0;
  writes = 0;
  publicWrites = 0;
  calls = 0;
  const remaining = deck(),
    ordered = [];
  for (const rank of [2, 2, 2, 2, 2, 10, 8, 8, 8, 8, 8, 7, 9, 9, 9, 9, 9]) {
    const i = remaining.findIndex((c) => c.rank === rank);
    ordered.push(...remaining.splice(i, 1));
  }
  const shoe = [...ordered, ...remaining];
  for (const uid of ids) await request(uid, "bet", { amount: 100 }, shoe);
  for (const uid of table.players
    .sort((a, b) => a.seat - b.seat)
    .map((p) => p.uid)) {
    await request(uid, "hit");
    await request(uid, "stand");
  }
  assert.equal(table.round.phase, "summary");
  const round = {
    transactionReads: reads,
    writes,
    publicWrites,
    calls,
    listenerReads: publicWrites * 5,
    policyAndAccountReads: calls * 2,
    listenerRuleReads: publicWrites * 5,
  };
  // Five private balance refreshes, one per player after settlement.
  for (const uid of ids) await request(uid, "balance");
  now += BJ.summary + 1;
  await request(ids[0], "tick");
  const result = {
    date: new Date().toISOString(),
    scenario:
      "5 bets, 10 decisions, 5 private balance refreshes, next betting phase; no retries or presence",
    round,
    total: {
      transactionReads: reads,
      writes,
      publicWrites,
      calls,
      listenerReads: publicWrites * 5,
      policyAndAccountReads: calls * 2,
      listenerRuleReads: publicWrites * 5,
    },
    notes:
      "Transaction operations measured in emulator. Listener and policy/account reads are derived; active() reads the user profile. Not a production billing measurement.",
  };
  assert.equal(round.calls, 15);
  assert.equal(round.writes, 40);
  mkdirSync("test-results/blackjack", { recursive: true });
  writeFileSync(
    "test-results/blackjack/budget.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  for (const uid of ids) await request(uid, "leave");
});
