import test from 'node:test';
import assert from 'node:assert/strict';
import * as browser from '../engine.js';
import * as server from '../integration/server-engine.mjs';
import * as previous from '../engine-v4.15.js';
for(const [name,engine] of [['browser',browser],['server',server]]){
 for(const mode of ['core','rift','overdrive']){
  for(const count of [2,3,4,5,6])test(`${name} ${mode}: ${count} scatters`,()=>{
   const s=engine.fresh(123);engine.play(s,{buy:mode});s.pending=null;
   const before=s.round.awarded,profile=engine.CONFIG.profiles[mode],original=profile.scatterK;
   try{
    profile.scatterK=Array.from({length:7},(_,i)=>Number(i===count));
    const r=engine.play(s);
    const expected=count<3?0:engine.CONFIG.bonuses[mode].retrigger+2*(count-3);
    assert.equal(r.scatters,count);assert.equal(r.added,expected);assert.equal(r.awarded,before+expected);
   }finally{profile.scatterK=original;}
  });
  for(const awarded of [39,40])test(`${name} ${mode}: cap at ${awarded}`,()=>{
   const s=engine.fresh(321);engine.play(s,{buy:mode});s.pending=null;s.round.awarded=awarded;
   const profile=engine.CONFIG.profiles[mode],original=profile.scatterK;
   try{profile.scatterK=[0,0,0,0,0,0,1];const r=engine.play(s);assert.equal(r.added,40-awarded);assert.equal(r.awarded,40);}
   finally{profile.scatterK=original;}
  });
 }
}
test('ongoing 4.15 bonuses retain their rules and random sequence',()=>{
 for(const mode of ['core','rift','overdrive']){
  const state=previous.fresh(987);previous.play(state,{buy:mode});state.pending=null;
  const copy=structuredClone(state);assert.deepEqual(browser.play(state),previous.play(copy));assert.deepEqual(state,copy);
 }
});
