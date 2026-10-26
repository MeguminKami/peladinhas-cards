import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as EU from '../src/engine';
import {chipValues} from '../src/chip-model';
import {SELECTABLE_CHIPS} from '../src/chip-selector';
import {outcome,spinPhase} from '../src/presentation';
test('0.50-compatible stake ladder preserves exact 36/37 on every canonical bet',()=>{
  for(const value of SELECTABLE_CHIPS)EU.validate({'straight:1':value},1e9);
  EU.validate({'straight:1':30},100);assert.throws(()=>EU.validate({'straight:1':10},100));assert.throws(()=>EU.validate({'straight:1':21},100));
  for(const bet of EU.BETS){let sum=0;for(let n=0;n<37;n++){const r=EU.settle({[bet.id]:50},n);assert(Number.isSafeInteger(r.gross));sum+=r.gross;}assert.equal(sum,1800);}
});
test('outcomes distinguish profit, partial return, balanced exposure and zero losses without inventing push',()=>{
  const red=EU.BETS.find(b=>b.label==='Vermelho')!,black=EU.BETS.find(b=>b.label==='Preto')!;
  const make=(p:EU.Plan,n:number)=>({...EU.settle(p,n),id:1,plan:p,phase:'result' as const,rotor:0});
  assert.equal(outcome(make({'straight:1':50},1)).kind,'win');
  const partial=make({[red.id]:100,'straight:2':1000},1);assert.equal(partial.gross,200);assert.equal(partial.net,-900);assert.equal(outcome(partial).kind,'partial');
  assert.equal(outcome(make({[red.id]:100,[black.id]:100},1)).kind,'balanced');
  assert.equal(outcome(make({[red.id]:100},0)).kind,'loss');assert.equal(outcome(make({'straight:0':100},0)).title,'Pleno vencedor!');
  assert(!outcome(make({[red.id]:100,[black.id]:100},1)).title.includes('Empate'));
});
test('chip geometry denominations reconcile tiny changes, high stakes and full uncapped payouts',()=>{
  for(let amount=0;amount<=500000;amount+=137)assert.equal(chipValues(amount).reduce((a,b)=>a+b,0),amount);
  for(const value of SELECTABLE_CHIPS)assert.deepEqual(chipValues(value),[value]);
  assert.equal(chipValues(18000000).reduce((a,b)=>a+b,0),18000000);assert.throws(()=>chipValues(-1));assert.throws(()=>chipValues(.5));
  assert.equal(spinPhase(.1),'Apostas encerradas');assert.equal(spinPhase(.7),'A bola entra nos compartimentos');assert.equal(spinPhase(1),'A bola acomoda-se');
});
