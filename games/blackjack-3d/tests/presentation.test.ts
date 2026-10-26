import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RNG} from '../shared/core';
import * as BJ from '../src/engine';
import {presentationSteps} from '../src/presentation';
import {SELECTABLE_CHIPS} from '../src/chip-selector';
import {chipValues} from '../src/chips';
function shoe(ranks:number[]){const d=BJ.deck();return [...ranks.map(rank=>d.splice(d.findIndex(c=>c.rank===rank),1)[0]),...d];}
test('player hit reaching 21 is exposed before hole-card reveal or dealer cards',()=>{
  const a=BJ.start(BJ.fresh(new RNG([1,2,3,4])),[100,0,0,0,0],shoe([10,6,5,10,6,5]));const r=a.round!;
  const b=BJ.act(a,{round:r.id,revision:r.revision,hand:r.active!,action:'hit'});const steps=presentationSteps(r,b.round!);
  assert.equal(steps[0].seat,1);assert.equal(steps[0].terminal,true);assert.equal(steps[0].round.reveal,false);assert.equal(steps[0].round.dealer.length,2);assert.equal(BJ.total(steps[0].round.seats[0].hands[0].cards).value,21);assert.equal(steps[1].type,'reveal');assert.equal(steps[2].dealer,true);
  assert(steps.every(s=>s.round.gross===0&&s.round.seats.every(p=>p.hands.every(h=>!h.result))));
});
test('initial distribution projections reveal only cards already dealt, in the actual event order',()=>{
  const s=BJ.start(BJ.fresh(new RNG([1,2,3,4])),[100,100,0,0,0],shoe([2,3,6,4,5,10]));const steps=presentationSteps(null,s.round!);
  assert.equal(steps.length,6);assert.deepEqual(steps.map(s=>[s.seat,s.dealer,s.hidden]),[[1,false,false],[2,false,false],[undefined,true,false],[1,false,false],[2,false,false],[undefined,true,true]]);
  assert.equal(steps[0].round.seats[0].hands[0].cards.length,1);assert.equal(steps[0].round.seats[1].hands[0].cards.length,0);assert.equal(steps[0].round.dealer.length,0);
  assert.equal(steps[5].round.reveal,false);assert.equal(steps[5].round.dealer.length,2);
});
test('all requested chip denominations are selectable and rendered as exact denomination meshes',()=>{
  for(const value of [50,1000,5000,50000]){assert(SELECTABLE_CHIPS.includes(value));assert.deepEqual(chipValues(value),[value]);}
});
