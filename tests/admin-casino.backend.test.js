import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { getCasinoPlayerBalance } from "../functions/index.js";
import { newCasinoWallet } from "../js/casino-economy.js";

const db = getFirestore();
const request = (uid, data) => ({auth:{uid,token:{auth_time:Math.floor(Date.now()/1000)}},data});
test("only an administrator can read a player's balance without changing their wallet", async()=>{
  const admin=randomUUID(),member=randomUUID(),target=randomUUID();
  await db.doc(`users/${admin}`).set({role:"admin"});
  await db.doc(`users/${member}`).set({role:"member"});
  const wallet={...newCasinoWallet(),balance:1234567};
  const ref=db.doc(`casinoWallets/${target}`);
  await ref.set(wallet);
  await assert.rejects(getCasinoPlayerBalance.run(request(member,{uid:target})),e=>e.code==='permission-denied');
  await assert.rejects(getCasinoPlayerBalance.run({data:{uid:target}}),e=>e.code==='unauthenticated');
  for(const input of [{uid:'../invalid'},{uid:target,extra:true},{},null])
    await assert.rejects(getCasinoPlayerBalance.run(request(admin,input)),e=>e.code==='invalid-argument');
  assert.deepEqual(await getCasinoPlayerBalance.run(request(admin,{uid:target})),{uid:target,balance:1234567});
  assert.deepEqual((await ref.get()).data(),wallet);
  const missing=randomUUID();
  assert.deepEqual(await getCasinoPlayerBalance.run(request(admin,{uid:missing})),{uid:missing,balance:20000});
  assert.equal((await db.doc(`casinoWallets/${missing}`).get()).exists,false);
  await ref.set({balance:999999,edition:'old'});
  assert.equal((await getCasinoPlayerBalance.run(request(admin,{uid:target}))).balance,20000);
  assert.deepEqual((await ref.get()).data(),{balance:999999,edition:'old'});
});
