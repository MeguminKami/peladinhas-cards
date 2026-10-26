import test from 'node:test';
import assert from 'node:assert/strict';
import * as browser from '../engine.js';
import * as server from '../integration/server-engine.mjs';
import * as old from '../engine-v4.3.js';
import * as previous44 from '../engine-v4.4.js';
import * as previous45 from '../engine-v4.5.js';
import * as previous46 from '../engine-v4.6.js';
import * as previous413 from '../engine-v4.13.js';
import * as previous412 from '../engine-v4.12.js';
import * as previous411 from '../engine-v4.11.js';
import * as previous410 from '../engine-v4.10.js';
import * as previous49 from '../engine-v4.9.js';
import * as previous48 from '../engine-v4.8.js';
import * as previous47 from '../engine-v4.7.js';

test('new paytable grows clearly for every extra column and matches the server',()=>{
 assert.deepEqual(browser.CONFIG,server.CONFIG);
 for(const row of browser.PAY){
  for(let length=4;length<=6;length++)assert.ok(row[length]>row[length-1]);
  assert.ok(row[6]<=row[3]*2.001);
 }
 assert.deepEqual(browser.CONFIG.precision,[.94,.98]);
 assert.deepEqual(browser.PAY[0].slice(3),[.1,.125,.15,.2]);
 assert.equal(browser.PAY[9][6],1.4);
 for(const row of browser.PAY)assert.ok(row[3]>=.1);
});

test('existing 4.7 bonuses keep their original math and balance',()=>{
 const state=previous47.fresh(713);previous47.play(state,{buy:'overdrive'});state.pending=null;const copy=structuredClone(state);assert.deepEqual(browser.play(state),previous47.play(copy));assert.deepEqual(state,copy);
});

test('existing 4.6 bonuses keep their original math and balance',()=>{
 const state=previous46.fresh(712);previous46.play(state,{buy:'overdrive'});state.pending=null;const copy=structuredClone(state);assert.deepEqual(browser.play(state),previous46.play(copy));assert.deepEqual(state,copy);
});

test('existing 4.5 bonuses keep their original payments and wallet results',()=>{
 const state=previous45.fresh(812);previous45.play(state,{buy:'overdrive'});state.pending=null;
 const copy=structuredClone(state);
 assert.deepEqual(browser.play(state),previous45.play(copy));assert.deepEqual(state,copy);
});

test('existing 4.4 bonuses retain their original math and wallet results',()=>{
 const state=previous44.fresh(812);previous44.play(state,{buy:'overdrive'});state.pending=null;
 const copy=structuredClone(state);
 assert.deepEqual(browser.play(state),previous44.play(copy));
 assert.deepEqual(state,copy);
});

test('analytical column distribution matches the requested Overdrive frequencies',()=>{
 const d=browser.scatterDistribution(),h=browser.scatterDistribution(true);
 assert.ok(Math.abs(d.reduce((a,b)=>a+b,0)-1)<1e-12);
 assert.ok(d[5]>0);
 for(let k=1;k<=6;k++)assert.ok(Math.abs(d[k]-previous410.scatterDistribution()[k]/2.47)<1e-12);
 for(const k of [3,4,5])assert.ok(d[k]>d[6],`bonus ${k} is more frequent than six Scatters`);
 assert.ok(1/d.slice(3).reduce((a,b)=>a+b,0)<617,'any natural bonus averages fewer than 617 spins');
 assert.ok(Math.abs(d[6]/d[5]-.5)<.001);
 for(let k=1;k<=6;k++)assert.ok(Math.abs(h[k]-d[k]*3)<1e-12);
 assert.deepEqual(server.scatterDistribution(),d);
 for(const p of browser.CONFIG.scatterChance)assert.equal(Math.round(p*10000),p*10000);
});

for(const [name,engine] of [['browser',browser],['server',server]]){
 test(`${name}: purchases use the correct portals, spins and one debit`,()=>{
  const seen=new Set();
  for(let i=1;i<=120;i++)for(const mode of ['core','rift','overdrive']){
   const s=engine.fresh(i);s.balance=10000;
   const r=engine.play(s,{buy:mode});
   assert.equal(r.intro,mode);
   assert.equal(r.cost,engine.CONFIG.prices[mode]);
   assert.equal(s.balance,10000-r.cost);
   assert.equal(r.win,0);assert.equal(r.cascades,0);
   assert.ok(r.start.every(c=>c.filter(t=>t.s===11).length<=1));
   if(mode==='overdrive'){seen.add(r.scatters);assert.equal(r.awarded,r.scatters===5?12:14);}
   else{assert.equal(r.scatters,mode==='core'?3:4);assert.equal(r.awarded,mode==='core'?8:10);}
   s.pending=null;const fs=engine.play(s);assert.equal(fs.cost,0);assert.equal(fs.played,1);
  }
  assert.deepEqual([...seen].sort(),[5,6]);
 });
 test(`${name}: natural triggers and no new portals in cascades`,()=>{
  const original=engine.CONFIG.scatterChance,originalScale=engine.CONFIG.naturalScatterScale;engine.CONFIG.naturalScatterScale=1;
  try{for(const count of [3,4,5,6]){
   engine.CONFIG.scatterChance=Array.from({length:6},(_,i)=>i<count?1:0);
   const s=engine.fresh(9821+count);s.balance=100000;const r=engine.play(s);
   assert.equal(r.scatters,count);assert.ok(r.start.every(c=>c.filter(t=>t.s===11).length<=1));
   const portals=r.start.flat().filter(t=>t.s===11).map(t=>t.id).sort();
   for(const e of r.events)if(e.type==='fall')assert.deepEqual(e.grid.flat().filter(t=>t.s===11).map(t=>t.id).sort(),portals);
   assert.equal(r.intro,count===3?'core':count===4?'rift':'overdrive');
   assert.equal(r.awarded,({3:8,4:10,5:12,6:14})[count]);
  }}finally{engine.CONFIG.scatterChance=original;engine.CONFIG.naturalScatterScale=originalScale;}
 });
}

test('existing 4.3 bonuses keep their original deterministic math',()=>{
 const s=old.fresh(440);old.play(s,{buy:'overdrive'});s.pending=null;
 const copy=structuredClone(s);
 assert.deepEqual(browser.play(s),old.play(copy));
 assert.deepEqual(s,copy);
});

test('FS scatter and retrigger profiles stay unchanged',()=>{
 for(const mode of ['core','rift','overdrive'])assert.deepEqual(browser.scatterDistribution(false,mode),old.scatterDistribution(false,mode));
 for(const [name,engine] of [['browser',browser],['server',server]]){
  const s=engine.fresh(581);engine.play(s,{buy:'overdrive'});s.pending=null;
  s.round.awarded=39;
  const profile=engine.CONFIG.profiles.overdrive,previous=profile.scatterK;
  try{profile.scatterK=[0,0,0,1,0,0,0];const r=engine.play(s);assert.equal(r.added,1,name);assert.equal(r.awarded,40,name);}
  finally{profile.scatterK=previous;}
 }
});


test('six-column yellow wins apply the displayed x20 core multiplier in every bonus',()=>{
 for(const engine of [browser])for(const [mode,seed] of [['core',19],['rift',36],['overdrive',8]]){
  const state=engine.fresh(seed);state.bet=.1;state.balance=10000;
  engine.play(state,{buy:mode});state.pending=null;state.round.global=20;
  const balance=state.balance,record=engine.play(state);
  const event=record.events.find(e=>e.type==='win'&&e.gm===20&&e.wins.some(w=>w.symbol===2&&w.length===6));
  assert.ok(event,mode+' has six yellow columns at x20');
  assert.equal(event.raw,engine.money(event.payUnits*record.bet*event.cm*20/engine.CONFIG.payDenominator));
  assert.equal(state.balance,engine.money(balance+record.win));
  assert.equal(event.wins.reduce((sum,w)=>sum+w.paidCents,0),Math.round(event.win*100));
 }
});


test('one six-column way pays 0.2x minimum and 1.4x for the strongest symbol before multipliers',()=>{
 for(const symbol of [0,9]){
  const grid=Array.from({length:6},(_,c)=>Array.from({length:5},(_,r)=>({id:`${c}-${r}`,s:r===0?symbol:11})));
  const result=browser.evaluate(grid);assert.equal(result.wins.length,1);assert.equal(result.wins[0].ways,1);
  assert.equal(result.amount,symbol===0?.2:1.4);assert.equal(browser.money(result.amount*.1*20),symbol===0?.4:2.8);
 }
});

test('fixed per-reel probabilities sum to one and differ from the displayed average',()=>{
 for(const mode of ['base','hunt','core','rift','overdrive']){
  const average=browser.symbolProbabilities(mode);
  for(let c=0;c<6;c++){const p=browser.symbolProbabilities(mode,c);assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-12);if(mode!=='hunt')assert.ok(p[c]>average[c]);}
 }
});


test('existing 4.8 bonuses retain their original math',()=>{
 const state=previous48.fresh(714);previous48.play(state,{buy:'overdrive'});state.pending=null;const copy=structuredClone(state);assert.deepEqual(browser.play(state),previous48.play(copy));assert.deepEqual(state,copy);
});

test('paid Normal and Hunt have no powers while bonus powers are enhanced',()=>{
 assert.deepEqual(browser.CONFIG.profiles.base.powers,[0,0,0,0]);
 assert.equal(browser.CONFIG.profiles.base.pulse,0);
 for(const mode of ['core','rift','overdrive'])for(let i=0;i<4;i++)assert.ok(browser.CONFIG.profiles[mode].powers[i]>previous413.CONFIG.profiles[mode].powers[i]);
 
 
 for(const engine of [browser,server]){
  const state=engine.fresh(262026);state.bet=.1;
  for(let i=0;i<2000;i++){
   state.settings.hunt=i>=1000;
   state.round=null;state.pending=null;state.balance=100000;
   const result=engine.play(state);assert.deepEqual(result.stats.powers,{});
  }
 }
});

test('existing 4.9 bonuses retain their original math',()=>{
 const state=previous49.fresh(715);previous49.play(state,{buy:'overdrive'});state.pending=null;const copy=structuredClone(state);assert.deepEqual(browser.play(state),previous49.play(copy));assert.deepEqual(state,copy);
});

test('existing 4.10 bonuses retain their original math',()=>{
 const state=previous410.fresh(716);previous410.play(state,{buy:'overdrive'});state.pending=null;const copy=structuredClone(state);assert.deepEqual(browser.play(state),previous410.play(copy));assert.deepEqual(state,copy);
});


test('existing 4.11 bonuses retain their original math',()=>{
 const state=previous411.fresh(717);previous411.play(state,{buy:'overdrive'});state.pending=null;const copy=structuredClone(state);assert.deepEqual(browser.play(state),previous411.play(copy));assert.deepEqual(state,copy);
});

test('existing 4.12 bonuses retain their paytable and cascade multipliers',()=>{
 const state=previous412.fresh(718);previous412.play(state,{buy:'overdrive'});state.pending=null;const copy=structuredClone(state);assert.deepEqual(browser.play(state),previous412.play(copy));assert.deepEqual(state,copy);
});

test('bonus prices stay locked at 80x, 220x and 450x',()=>{
 assert.deepEqual(browser.CONFIG.prices,{core:80,rift:220,overdrive:450});
 for(const mode of ['core','rift','overdrive'])assert.equal(browser.purchasePrice(mode,.1),browser.CONFIG.prices[mode]*.1);
 assert.deepEqual(browser.PAY,previous413.PAY);
});
test('existing 4.13 bonuses preserve their original price and feature profile',()=>{
 const state=previous413.fresh(719);previous413.play(state,{buy:'overdrive'});state.pending=null;const copy=structuredClone(state);assert.deepEqual(browser.play(state),previous413.play(copy));assert.deepEqual(state,copy);
});
