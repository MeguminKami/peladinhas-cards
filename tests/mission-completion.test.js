import test from "node:test";
import assert from "node:assert/strict";
import { buildMissions } from "../js/mission-model.js";
const user = {uid:"owner"};
const base = { id:"mission-one", schemaVersion:2, kind:"mission", method:"objective", title:"Duas assistências", status:"open", participantIds:[user.uid], startsAt:"2020-01-01", indefinite:true, maxRepeats:1, objective:{metric:"assists",target:2}, rarity:"gold" };
const detail = {...base, progress:[{uid:user.uid,progress:2,eligible:true}], claimedPeriods:[], claimable:true};
const db = {myFeedback:async()=>[],myCommunity:async()=>[],read:async()=>null,eventDetails:async()=>{throw Error("No per-mission reads allowed");}};
const league = event => ({players:[user],games:[],events:[event],eventRewards:[]});
test("completed objectives expose a claim action only when the server allows it", async()=>{
  const rows = await buildMissions(user,league({...base,missionSummary:detail}),db);
  const mission = rows.find(row=>row.eventId===base.id);
  assert.equal(mission.claimable,true);
  assert.equal(mission.eventId,base.id);
  const blocked = await buildMissions(user,league({...base,missionSummary:{...detail,claimable:false}}),db);
  assert.equal(blocked.find(row=>row.eventId===base.id).claimable,false,"100% alone does not authorize a claim");
});
test("claimed missions disappear instead of creating a completed history",async()=>{
  const rows=await buildMissions(user,league({...base,missionSummary:{...detail,claimedPeriods:["previous"]}}),db);
  assert.equal(rows.some(row=>row.eventId===base.id),false);
});
test("reward records do not create archived mission cards",async()=>{
  const data=league({...base,status:"closed"});
  data.eventRewards=[{eventId:base.id,uid:user.uid,completedAt:"2026-10-21",periodKey:"one",reward:{boosts:{passing:1}}}];
  const rows=await buildMissions(user,data,db);
  assert.equal(rows.some(row=>row.completed || row.eventId===base.id),false);
});
