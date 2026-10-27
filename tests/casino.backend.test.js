import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import {
  getCasinoWallet,
  settleCasinoSlot,
  onCasinoGame,
  casinoSession,
  grantCasinoCoins,
} from "../functions/index.js";
import {
  initializeTestEnvironment,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
const db = getFirestore();
const request = (uid, data = {}) => ({
  auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
  data,
});
async function player(disabled = false) {
  const uid = `casino-${randomUUID()}`;
  await db.doc(`users/${uid}`).set({ uid, role: "member", disabled });
  return uid;
}
const transaction = (values = {}) => ({
  id: randomUUID(),
  streamId: randomUUID(),
  debit: 20,
  credit: 8,
  roundId: 1,
  spin: 1,
  configVersion: "0.7.0",
  bet: 20,
  mode: "base",
  bonusHunt: false,
  ...values,
});
test("local casino checkpoints allow devices, survive lost responses and preserve football rewards", async () => {
  const uid = await player(),
    id = randomUUID();
  const open = { action: "open", id, owner: uid };
  await assert.rejects(
    casinoSession.run(request(uid, { ...open, owner: "another" })),
  );
  const started = await casinoSession.run(request(uid, open));
  assert.equal(started.wallet.balance, 20000);
  await casinoSession.run(request(uid, { ...open, id: randomUUID() }));
  await assert.rejects(
    settleCasinoSlot.run(request(uid, transaction())),
    /carteira local/,
  );
  const input = {
    action: "sync",
    id,
    owner: uid,
    sequence: 1,
    spent: 1000,
    won: 300,
    release: false,
  };
  const results = await Promise.all([
    casinoSession.run(request(uid, input)),
    casinoSession.run(request(uid, input)),
  ]);
  assert.equal(results[0].wallet.balance, 24300);
  assert.equal(results[1].wallet.balance, 24300);
  await db.doc(`casinoWallets/${uid}`).update({ balance: 26300 });
  const repeated = await casinoSession.run(request(uid, input));
  assert.equal(repeated.wallet.balance, 26300);
  await assert.rejects(casinoSession.run(request(uid, { ...input, won: 301 })));
  const closed = await casinoSession.run(
    request(uid, {
      ...input,
      sequence: 2,
      spent: 1200,
      won: 400,
      release: true,
    }),
  );
  assert.equal(closed.wallet.balance, 26200);
  assert.equal(closed.closed, true);
  const next = await casinoSession.run(
    request(uid, { ...open, id: randomUUID() }),
  );
  assert.equal(next.wallet.balance, 26200);
  assert.equal(
    (
      await casinoSession.run(
        request(uid, {
          ...input,
          sequence: 2,
          spent: 1200,
          won: 400,
          release: true,
        }),
      )
    ).closed,
    true,
  );
});
test("official edition resets once and rejects legacy per-spin writes", async () => {
 const uid=await player();
 await db.doc(`casinoWallets/${uid}`).set({balance:900000,revision:20,recent:[],activeCasinoSession:"old"});
 const first=await getCasinoWallet.run(request(uid));
 assert.equal(first.balance,20000);
 await db.doc(`casinoWallets/${uid}`).update({balance:12500});
 assert.equal((await getCasinoWallet.run(request(uid))).balance,12500);
 await assert.rejects(settleCasinoSlot.run(request(uid,transaction())),/carteira local/);
});
test("shared wallet applies competing batches atomically without negative balances", async () => {
 const uid=await player(),ids=[randomUUID(),randomUUID()];
 const opened=await Promise.all(ids.map(id=>casinoSession.run(request(uid,{action:"open",owner:uid,id}))));
 assert.equal(opened[0].wallet.balance,20000);
 assert.equal(opened[1].wallet.balance,20000);
 await db.doc(`casinoWallets/${uid}`).update({balance:10000});
 const inputs=ids.map(id=>({action:"sync",owner:uid,id,sequence:1,spent:7000,won:0,release:false}));
 const outcomes=await Promise.allSettled(inputs.map(input=>casinoSession.run(request(uid,input))));
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 assert.equal((await getCasinoWallet.run(request(uid))).balance,3000);
 const index=outcomes.findIndex(x=>x.status==='rejected');
 assert.equal(outcomes[index].reason.details.reason,'insufficient-balance');
 assert.equal((await db.doc(`casinoWallets/${uid}/sessions/${ids[index]}`).get()).data().sequence,0);
 await db.doc(`casinoWallets/${uid}`).update({balance:10000});
 await casinoSession.run(request(uid,inputs[index]));
 await casinoSession.run(request(uid,inputs[index]));
 assert.equal((await getCasinoWallet.run(request(uid))).balance,3000);
});
test("admin grants authorize, validate boundaries and replay without duplicates", async () => {
 const admin=await player(),uid=await player();
 await db.doc(`users/${admin}`).update({role:"admin"});
 const input={uid,id:randomUUID(),amount:1000000};
 await assert.rejects(grantCasinoCoins.run(request(uid,input)),e=>e.code==='permission-denied');
 for(const amount of [-1,1000001,0.1]) await assert.rejects(grantCasinoCoins.run(request(admin,{...input,amount})),e=>e.code==='invalid-argument');
 const results=await Promise.all([grantCasinoCoins.run(request(admin,input)),grantCasinoCoins.run(request(admin,input))]);
 assert.equal(results[0].balance,1020000);
 assert.equal(results[1].balance,1020000);
 assert.equal((await getCasinoWallet.run(request(uid))).balance,1020000);
 await assert.rejects(grantCasinoCoins.run(request(admin,{...input,amount:1})),e=>e.code==='already-exists');
 assert.equal((await grantCasinoCoins.run(request(admin,{uid:admin,id:randomUUID(),amount:0}))).balance,20000);
 assert.equal((await grantCasinoCoins.run(request(admin,{uid:admin,id:randomUUID(),amount:2500}))).balance,27500);
});
test("wallet checks revocation, App Check, read-only mode and its transactional quota", async (t) => {
  const settings = db.doc("settings/system");
  const previous = await settings.get();
  t.after(async () =>
    previous.exists ? settings.set(previous.data()) : settings.delete(),
  );
  const uid = await player();
  await db
    .doc(`users/${uid}`)
    .update({ tokensValidAfter: Math.floor(Date.now() / 1000) + 1 });
  await assert.rejects(
    getCasinoWallet.run(request(uid)),
    (e) => e.code === "unauthenticated",
  );
  await db.doc(`users/${uid}`).update({ tokensValidAfter: 0 });
  const policy = (patch) => ({
    timeline: [
      {
        effectiveAt: new Date(Date.now() - 1000).toISOString(),
        version: 1,
        patch,
      },
    ],
  });
  await settings.set(policy({ security: { requireAppCheck: true } }));
  await assert.rejects(
    getCasinoWallet.run(request(uid)),
    (e) => e.code === "unauthenticated",
  );
  await settings.delete();
  await getCasinoWallet.run(request(uid));
  await settings.set(policy({ features: { mode: "readOnly" } }));
  assert.equal((await getCasinoWallet.run(request(uid))).balance, 20000);
  await assert.rejects(
    settleCasinoSlot.run(request(uid, transaction())),
    (e) => e.code === "failed-precondition",
  );
  await settings.delete();
  await db.doc(`casinoWallets/${uid}`).update({
    requestWindow: { minute: Math.floor(Date.now() / 60000), count: 3000 },
  });
  await assert.rejects(
    settleCasinoSlot.run(request(uid, transaction())),
    (e) => e.code === "resource-exhausted" && e.details.definitive,
  );
  assert.equal(
    (await db.doc(`casinoWallets/${uid}`).get()).data().balance,
    20000,
  );
});
test("football rewards include bench, skip disabled users and survive duplicate/reopen events", async () => {
  const uid = await player(),
    bench = await player(),
    disabled = await player(true),
    gid = randomUUID();
  const after = {
    status: "closed",
    teamA: { starters: [uid], bench: [bench] },
    teamB: { starters: [disabled], bench: [] },
  };
  const event = (before, next = after) => ({
    params: { gid },
    data: { before: { data: () => before }, after: { data: () => next } },
  });
  await onCasinoGame.run(event({ status: "open" }));
  await onCasinoGame.run(event({ status: "open" }));
  await onCasinoGame.run(event({ status: "closed" }));
  for (const id of [uid, bench]) {
    const wallet = await getCasinoWallet.run(request(id));
    assert.equal(wallet.balance, 31500);
    assert.equal(wallet.matches, 1);
  }
  assert.equal((await db.doc(`casinoWallets/${disabled}`).get()).exists, false);
  await onCasinoGame.run(event(after, undefined));
});
test("Firestore rules deny direct wallet and receipt access, including administrators", async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  const environment = await initializeTestEnvironment({
    projectId: "demo-casino-private-rules",
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
  try {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/member"), {
        role: "member",
        disabled: false,
      });
      await setDoc(doc(context.firestore(), "users/admin"), {
        role: "admin",
        disabled: false,
      });
      await setDoc(doc(context.firestore(), "casinoWallets/member"), {
        balance: 10000,
      });
    });
    for (const context of [
      environment.authenticatedContext("member"),
      environment.authenticatedContext("admin"),
      environment.unauthenticatedContext(),
    ]) {
      await assertFails(
        getDoc(doc(context.firestore(), "casinoWallets/member")),
      );
      await assertFails(
        setDoc(doc(context.firestore(), "casinoWallets/member"), {
          balance: 999999,
        }),
      );
      await assertFails(
        getDoc(
          doc(context.firestore(), "casinoWallets/member/operations/receipt"),
        ),
      );
      await assertFails(
        getDoc(
          doc(context.firestore(), "casinoWallets/member/sessions/session"),
        ),
      );
      await assertFails(
        setDoc(
          doc(context.firestore(), "casinoWallets/member/sessions/session"),
          { closed: true },
        ),
      );
      await assertFails(
        setDoc(
          doc(context.firestore(), "casinoWallets/member/matchAwards/game"),
          { amount: 2000 },
        ),
      );
    }
  } finally {
    await environment.cleanup();
  }
});
