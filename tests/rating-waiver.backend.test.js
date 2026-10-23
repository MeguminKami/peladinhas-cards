import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-"))
  throw Error("Dedicated local demo emulator required");
process.env.GCLOUD_PROJECT += `-waiver-${process.pid}`;
const {ratingWaiverAction,processFeedback,onGame} = await import("../functions/index.js");
const {FEEDBACK} = await import("../js/utils.js");
const db = getFirestore();
const roster = ["a","b","c","d","e","f","g","h"];
const gid = "waiver-game";
const call = (actor,uid,waive) => ratingWaiverAction.run({auth:{uid:actor},data:{gameId:gid,uid,waive}});

test("admin waiver is audited, idempotent, queued hourly, reversible and does not invent ratings",async()=>{
  await db.doc("users/admin").set({role:"admin"});
  await db.doc("users/a").set({role:"member"});
  await db.doc("users/restricted").set({role:"admin",adminCapabilities:["cards"]});
  const game = {status:"closed",closedAt:Timestamp.fromMillis(Date.now()-3600000),scheduledAt:Timestamp.fromMillis(Date.now()-7200000),teamA:{starters:roster.slice(0,4),bench:[]},teamB:{starters:roster.slice(4),bench:[]},score:{teamA:1,teamB:0}};
  await db.doc(`games/${gid}`).set(game);
  const batch = db.batch();
  for(const rater of roster.slice(0,6)) batch.set(db.doc(`games/${gid}/feedback/${rater}_a`),{
    raterId:rater,targetId:"a",submitted:true,ratings:Object.fromEntries(FEEDBACK.map(([key])=>[key,4])),submittedAt:Timestamp.fromMillis(Date.now()-1000),
  });
  await batch.commit();
  await assert.rejects(call("a","g",true),/permiss/i);
  await assert.rejects(call("restricted","g",true));
  await assert.rejects(call("admin","outsider",true));
  assert.equal((await call("admin","g",true)).changed,true);
  const queued = await db.doc(`feedbackWork/${gid}`).get();
  assert.equal(queued.data().pending,true);
  assert.equal((await call("admin","g",true)).changed,false);
  assert.equal((await db.doc(`feedbackWork/${gid}`).get()).data().token,queued.data().token);
  assert.equal((await db.collection(`games/${gid}/feedback`).get()).size,6);
  assert.equal((await db.collection("systemAudit").where("action","==","rating-waiver").get()).size,1);
  const after = (await db.doc(`games/${gid}`).get()).data();
  await onGame.run({params:{gid},data:{before:{data:()=>game},after:{data:()=>after}}});
  assert.equal((await db.doc(`gameSummaries/${gid}`).get()).exists,false,"waiver-only game changes never run immediate aggregation");
  await processFeedback.run({});
  const player = (await db.doc(`gameSummaries/${gid}`).get()).data().players.a;
  assert.equal(player.count,6); assert.equal(player.ratingCounts.overall,6);
  assert.equal(player.ratingQuorumCounts.overall,7); assert.equal(player.overall,4);
  await call("admin","g",false);
  await processFeedback.run({});
  const restored = (await db.doc(`gameSummaries/${gid}`).get()).data().players.a;
  assert.equal(restored.ratingQuorumCounts.overall,6); assert.equal(restored.overall,4);
  assert.equal((await db.doc(`games/${gid}`).get()).data().ratingWaivers.g.length,1);
  assert.ok((await db.doc(`games/${gid}`).get()).data().ratingWaivers.g[0].until);
});
