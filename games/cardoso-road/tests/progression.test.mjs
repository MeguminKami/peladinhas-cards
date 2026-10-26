import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stagePosition,visualDestination,progressionPose,TRAVEL_MS,FIGHT_MS} from '../progression.mjs';
test('safe start precedes every prize, and an earned step stands on its actual value',()=>{
 assert.equal(visualDestination(null),0);assert.equal(stagePosition(0),1);
 for(let step=0;step<=10;step++){const r={step,status:step===10?'won':'active'};assert.equal(visualDestination(r),step);if(step>0)assert.equal(stagePosition(step-1),step);if(step<10)assert.equal(stagePosition(step),step+1);}
});
test('both outcomes travel to the attempted value before fighting its opponent',()=>{
 for(let step=0;step<10;step++)for(const lost of [false,true]){
  const round={step:lost?step:step+1,status:lost?'lost':step===9?'won':'active'},event=lost?'lost':step===9?'won':'step';
  const start=progressionPose({round,event,age:0,from:step});assert.equal(start.position,step);assert.equal(start.phase,'travel');
  const midway=progressionPose({round,event,age:TRAVEL_MS/2,from:step});assert.ok(midway.position>step&&midway.position<step+1);assert.equal(midway.phase,'travel');
  const fight=progressionPose({round,event,age:TRAVEL_MS,from:step});assert.equal(fight.phase,'fight');assert.equal(fight.position,stagePosition(step));assert.equal(fight.stage,step);
  const end=progressionPose({round,event,age:TRAVEL_MS+FIGHT_MS+1,from:step});assert.equal(end.position,step+1);assert.equal(end.phase,lost?'fight':step===9?'celebration':'idle');
 }
});
test('reload and reduced motion resolve to the same location, including failed steps',()=>{
 for(let step=0;step<10;step++){
  const round={step,status:'lost'};const restored=progressionPose({round}),reduced=progressionPose({round,event:'lost',age:0,from:step,reduced:true});assert.deepEqual(restored,reduced);assert.equal(restored.position,step+1);assert.equal(restored.stage,step);
 }
});
