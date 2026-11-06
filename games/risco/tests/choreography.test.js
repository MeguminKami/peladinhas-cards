import test from 'node:test';
import assert from 'node:assert/strict';
import {characterMotion} from '../ui/choreography.js';
test('inhales throughout the rise and stops immediately on a public crash',()=>{
  for(const multiplierCents of [100,200,1000,100000,999899]){
    const rising=characterMotion({phase:'running',time:900,multiplierCents});
    assert.equal(rising.inhaling,true);assert.ok(rising.inhaleStrength>0);assert.ok(rising.frame>=4&&rising.frame<=11);
    const stopped=characterMotion({phase:'crashed',phaseTime:0,time:900,multiplierCents});
    assert.equal(stopped.inhaling,false);assert.equal(stopped.inhaleStrength,0);assert.equal(stopped.powderFlow,0);
  }
});
test('reduced motion keeps the narrative states without shake, drift or pose cycling',()=>{
  for(const phase of ['idle','waiting','running','crashed','max-win']){
    const state=characterMotion({phase,reduced:true,time:987654,phaseTime:400,multiplierCents:100000});
    assert.equal(state.shake,0);assert.equal(state.cameraZoom,1);assert.equal(state.lean,0);assert.equal(state.headLift,0);assert.equal(state.mix,0);assert.equal(state.powderFlow,0);assert.equal(state.frame,state.next);
  }
});
test('stop poses settle rather than looping and depend only on public presentation state',()=>{
  assert.equal(characterMotion({phase:'crashed',phaseTime:2500}).frame,15);
  assert.equal(characterMotion({phase:'crashed',phaseTime:60000}).frame,15);
  const args={phase:'running',time:1500,multiplierCents:500};
  assert.deepEqual(characterMotion(args),characterMotion({...args,crashCents:501,seed:'hidden'}));
});
