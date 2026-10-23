import test from "node:test";
import assert from "node:assert/strict";
import {getFirestore,Timestamp} from "firebase-admin/firestore";
import {ATTRIBUTES} from "../js/utils.js";
if(!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) throw Error("Local demo emulator required");
process.env.GCLOUD_PROJECT += `-scrap-${process.pid}`;
const {ensureHistory,rebuildHistory,getHome}=await import("../functions/index.js");
const db=getFirestore();

test("server snapshots and home agree on Sucata; rebuilding preserves locked historical records",async t=>{
  t.mock.timers.enable({apis:["Date"],now:new Date("2026-10-23T12:00:00Z")});
  const createdAt=Timestamp.fromDate(new Date("2026-10-22T12:00:00Z"));
  await db.doc("users/admin").set({role:"admin"});
  for(const [uid,value] of [["low",9],["bronze",10]]) {
    await db.doc(`users/${uid}`).set({uid,username:uid,role:"member",primaryPosition:"MED",createdAt});
    await db.doc(`initialRatings/${uid}`).set({uid,ratings20:Object.fromEntries(ATTRIBUTES.map(([key])=>[key,value])),submitted:true,createdAt});
    await ensureHistory.run({auth:{uid},data:{}});
  }
  const low=(await db.doc("weeklyCards/low").get()).data(),bronze=(await db.doc("weeklyCards/bronze").get()).data();
  assert.equal(low.baseCard,"scrap"); assert.equal(low.ovr,45);
  assert.equal(bronze.baseCard,"bronze-common"); assert.equal(bronze.ovr,50);
  const historical={weekId:"2026-W42",locked:true,baseCard:"bronze-common",ovr:45,stats:{passing:45}};
  await db.doc("users/low/cardHistory/2026-W42").set(historical);
  await rebuildHistory.run({auth:{uid:"admin"},data:{uid:"low"}});
  assert.deepEqual((await db.doc("users/low/cardHistory/2026-W42").get()).data(),historical);
  const home=await getHome.run({auth:{uid:"low"},data:{}});
  assert.equal(home.league.players.find(row=>row.uid==="low").cardType,"scrap");
  assert.equal(home.league.players.find(row=>row.uid==="bronze").cardType,"bronze-common");
});
