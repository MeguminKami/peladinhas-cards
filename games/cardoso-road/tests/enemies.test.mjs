import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stageVillain,defeatVillain,villainPose,defeatPose,VILLAINS} from '../enemies.mjs';
import {fresh,transition} from '../engine.mjs';
test('all 10 failed steps use the visible enemy, for every difficulty and after serialization',()=>{
 for(const mode of ['easy','normal','hard','extreme'])for(let failAt=0;failAt<10;failAt++){
  let state=transition(fresh(),{type:'start',bet:1000,mode});const id=state.round.id;
  for(let step=0;step<failAt;step++)state=transition(state,{type:'step',id},()=>0);
  const expected=stageVillain(state.round.step,state.round);state=transition(state,{type:'step',id},()=>.999999);
  assert.equal(defeatVillain(state.round),expected);assert.equal(defeatVillain(JSON.parse(JSON.stringify(state.round))),expected);
  assert.equal(state.round.step,failAt);assert.equal(state.round.status,'lost');assert.ok(VILLAINS[expected].line);
 }
});
test('attack starts at the stage enemy and ends at the hero without changing identity or duplicating randomness',()=>{
 for(let stage=0;stage<10;stage++){
  const origin=villainPose(stage,{base:20,lane:90,height:500,mobile:true,time:1234,reduced:false});
  const start=defeatPose(origin,{playerX:110,floor:420,playerHeight:300,age:0,reduced:false});
  assert.equal(start.x,origin.x);assert.equal(start.y,origin.y);assert.equal(start.size,origin.size);
  const end=defeatPose(origin,{playerX:110,floor:420,playerHeight:300,age:1000,reduced:false});
  assert.equal(end.type,origin.type);assert.equal(end.x,161);assert.equal(end.y,381);
  const reduced=defeatPose(origin,{playerX:110,floor:420,playerHeight:300,age:0,reduced:true});
  assert.deepEqual(reduced,end);
 }
 assert.equal(VILLAINS[stageVillain(8)].tier,3);assert.equal(defeatVillain({status:'active',step:3}),null);
});

test('18 distinct characters form three complete tiers with persistent varied lineups',()=>{
 assert.equal(VILLAINS.length,18);assert.equal(new Set(VILLAINS.map(v=>v.id)).size,18);
 for(let tier=1;tier<=3;tier++)assert.equal(VILLAINS.filter(v=>v.tier===tier).length,6);
 const lineups=new Set(),seen=new Set();
 for(let n=0;n<120;n++){
  const round={id:`round-${n}`},lineup=Array.from({length:10},(_,stage)=>stageVillain(stage,round));lineups.add(lineup.join(','));
  for(let stage=0;stage<10;stage++){
   seen.add(lineup[stage]);assert.equal(VILLAINS[lineup[stage]].tier,stage<3?1:stage<6?2:3);
   assert.equal(stageVillain(stage,JSON.parse(JSON.stringify(round))),lineup[stage]);
   assert.equal(villainPose(stage,{base:0,lane:100,height:500,mobile:false,time:0,reduced:true,round}).type,lineup[stage]);
  }
  for(const chunk of [lineup.slice(0,3),lineup.slice(3,6),lineup.slice(6)])assert.equal(new Set(chunk).size,chunk.length);
 }
 assert.ok(lineups.size>20);assert.equal(seen.size,18);
});
