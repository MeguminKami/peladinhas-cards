import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getHome } from "../functions/index.js";
import { pathFunctions } from "../functions/paths.js";
import { emptyPathState } from "../js/path-model.js";
import { pathGameCoreSignature } from "../functions/path-game-signature.js";

const db = getFirestore();
test.before(() => assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.GCLOUD_PROJECT?.startsWith("demo-")));
async function fixture() {
  const uid = "correction-" + randomUUID(), admin = "admin-" + randomUUID(), gid = "game-" + uid;
  for (const id of [uid, admin]) await db.doc("users/" + id).set({ uid: id, role: id === admin ? "admin" : "member", disabled: false });
  const game = { status: "closed", scheduledAt: Timestamp.fromMillis(Date.now()-7200000),
    closedAt: Timestamp.fromMillis(Date.now()-3600000),
    teamA: {starters:[uid],bench:[]}, teamB:{starters:[],bench:[]},
    score:{teamA:1,teamB:0}, performance:{teamA:{goals:[uid],assists:[]}} };
  await db.doc("games/" + gid).set(game);
  const state = emptyPathState(uid);
  state.activePath = "shooting";
  state.nodes["shooting-0-0"] = {progress:75};
  state.pending = [{id:"attempt-"+uid,nodeId:"shooting-0-0",gameId:gid,
    frozenAt:new Date(Date.now()-7200000).toISOString(), acceptedAt:new Date(Date.now()-10800000).toISOString(),
    windowVersion:3,closedCoreSignature:pathGameCoreSignature(game),
    closedGame:{status:"closed",scheduledAt:game.scheduledAt.toDate().toISOString(),score:game.score,teamA:game.teamA,teamB:game.teamB},
    offer:{id:"test",proposalVersion:4,advance:25,objective:{kind:"goals",target:1}}}];
  const endpoints=pathFunctions(async()=>{});
  const call=(action,values={},actor=uid)=>endpoints.pathAction.run({auth:{uid:actor},data:{action,...values}});
  const save=()=>db.doc("pathStates/"+uid).set(state);
  const read=async()=>(await db.doc("pathStates/"+uid).get()).data();
  await save();
  return {uid,admin,gid,game,state,endpoints,call,save,read};
}

test("corrected pending results settle automatically and never use obsolete closing evidence",async()=>{
  const f=await fixture();
  f.state.reviews={[f.state.pending[0].id]:{pending:true,nodeId:"shooting-0-0",gameId:f.gid}};
  await f.save();
  await db.doc("games/"+f.gid).update({performance:{teamA:{goals:[],assists:[]}}});
  await f.endpoints.settlePaths.run({});
  const current=await f.read();
  assert.equal(current.lastResult.status,"failure");
  assert.equal(current.pending.length,0);
  assert.equal(current.nodes["shooting-0-0"].progress,0);
  assert.equal(current.reviews[f.state.pending[0].id].decision,"automatic");
  assert.equal((await db.collection("eventRewards").where("uid","==",f.uid).get()).size,0);
});

test("exceptional missing-game reviews reserve only their attempt; admin can grant or decline once",async()=>{
  for(const decision of ["grant","cancel"]){
    const f=await fixture(),id=f.state.pending[0].id;
    await db.doc("games/"+f.gid).delete();
    await f.endpoints.settlePaths.run({});
    assert.ok((await f.read()).reviews[id]);
    const next=await f.call("offers",{nodeId:"passing-0-0"});
    assert.ok(next.offers["passing-0-0"]);
    await assert.rejects(f.call("resolveReview",{uid:f.uid,attemptId:id,decision,reason:"Decisão fundamentada."}),/reservado/);
    await assert.rejects(f.call("resolveReview",{uid:f.uid,attemptId:id,decision:"invalid",reason:"Decisão fundamentada."},f.admin));
    await assert.rejects(f.call("resolveReview",{uid:f.uid,attemptId:id,decision,reason:"x"},f.admin));
    await f.call("resolveReview",{uid:f.uid,attemptId:id,decision,reason:"Verificação administrativa do jogo."},f.admin);
    const current=await f.read();
    assert.equal(current.pending.length,0);
    assert.equal(current.nodes["shooting-0-0"].progress,decision==="grant"?100:75);
    assert.equal(current.lastResult.status,decision==="grant"?"success":"cancelled");
    assert.equal(current.reviews[id].decision,decision);
    assert.equal(current.lastResult.gameId,f.gid);
    if(decision === "grant") assert.equal((await db.doc("eventRewards/path-"+f.uid+"-shooting-0-0").get()).data().gameId,f.gid);
    await assert.rejects(f.call("resolveReview",{uid:f.uid,attemptId:id,decision,reason:"Segunda decisão rejeitada."},f.admin));
    await f.endpoints.settlePaths.run({});
    assert.equal((await db.collection("eventRewards").where("uid","==",f.uid).get()).size,decision==="grant"?1:0);
  }
});

test("switching routes removes preparation atomically, preserves pending attempts and immediately invalidates home",async()=>{
  const f=await fixture();
  const first=await f.call("offers",{nodeId:"passing-0-0"});
  await f.call("accept",{nodeId:"passing-0-0",offerId:first.offers["passing-0-0"][0].id});
  const before=(await db.doc("homeSignals/"+f.uid).get()).data().version;
  const next=await f.call("select",{nodeId:"vision-0-0"});
  assert.equal(next.active,null);
  assert.equal(next.activePath,"vision");
  assert.equal(next.selectedNode,"vision-0-0");
  assert.equal(next.pending.length,1);
  assert.equal(next.nodes["shooting-0-0"].progress,75);
  assert.deepEqual(next.offers["passing-0-0"],first.offers["passing-0-0"]);
  assert.notEqual((await db.doc("homeSignals/"+f.uid).get()).data().version,before);
});

test("a corrected close date never extends the original 48-hour voting cutoff",async()=>{
  const f=await fixture();
  f.state.pending[0].reviewDeadline=Date.now()-3600000;
  f.state.pending[0].offer.objective={kind:"rating",criterion:"attack",target:4,minRatings:7};
  await f.save();
  await db.doc("games/"+f.gid).update({closedAt:Timestamp.now()});
  await f.endpoints.settlePaths.run({});
  const current=await f.read();
  assert.equal(current.pending.length,0);
  assert.equal(current.lastResult.status,"cancelled");
  assert.equal(current.nodes["shooting-0-0"].progress,75);
  assert.equal(current.lastResult.reviewDeadline,f.state.pending[0].reviewDeadline);
});

test("cached home immediately reflects choosing, switching and choosing again without triggers",async()=>{
  const f=await fixture();
  f.state.pending=[];
  await f.save();
  const home=async()=>(await getHome.run({auth:{uid:f.uid},data:{}})).missions.find(row=>row.type==="PLAYER_PATH");
  assert.equal((await home()).mission,null);
  const offers=await f.call("offers",{nodeId:"shooting-0-0"});
  await f.call("accept",{nodeId:"shooting-0-0",offerId:offers.offers["shooting-0-0"][0].id});
  assert.equal((await home()).mission.nodeId,"shooting-0-0");
  await f.call("select",{nodeId:"vision-0-0"});
  const switched=await home();
  assert.equal(switched.mission,null);
  assert.equal(switched.routeLabel,"Visão de jogo");
  const next=await f.call("offers",{nodeId:"vision-0-0"});
  await f.call("accept",{nodeId:"vision-0-0",offerId:next.offers["vision-0-0"][0].id});
  assert.equal((await home()).mission.nodeId,"vision-0-0");
});
