import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stageVillain,defeatVillain,villainPose,defeatPose,VILLAINS} from '../enemies.mjs';
import {fresh,transition} from '../engine.mjs';
test('all 10 failed steps use the visible enemy, for every difficulty and after serialization',()=>{
 for(const mode of ['easy','normal','hard','extreme'])for(let failAt=0;failAt<10;failAt++){
  let state=transition(fresh(),{type:'start',bet:1000,mode});const id=state.round.id;
  for(let step=0;step<failAt;step++)state=transition(state,{type:'step',id},()=>0);
  const expected=stageVillain(state.round.step);state=transition(state,{type:'step',id},()=>.999999);
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
 assert.equal(stageVillain(8),0);assert.equal(defeatVillain({status:'active',step:3}),null);
});
