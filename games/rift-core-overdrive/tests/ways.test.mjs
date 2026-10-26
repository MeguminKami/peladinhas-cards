import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,PAY,CONFIG,fresh,play} from '../engine.js';
const board=(counts,symbol=0)=>Array.from({length:6},(_,c)=>Array.from({length:5},(_,r)=>({id:`${c}-${r}`,s:r<(counts[c]||0)?symbol:11})));
test('3 x 3 x 3 pays 27 ways and six columns only doubles the same 27 ways',()=>{
 const short=evaluate(board([3,3,3])),long=evaluate(board([3,3,3,1,1,1]));
 assert.equal(short.wins[0].ways,27);assert.equal(short.wins[0].length,3);assert.equal(short.amount,2.97);
 assert.equal(long.wins[0].ways,27);assert.equal(long.wins[0].length,6);assert.equal(long.amount,5.94);
 assert.equal(Math.round(short.amount*.1*11*100)/100,3.27);
});
test('minimum one-way payment is 0.11x and every symbol has modest distance growth',()=>{
 assert.equal(evaluate(board([1,1,1 ])).amount,.11);
 for(const row of PAY){assert.ok(row[3]>=.11);assert.equal(row[6],row[3]*2);}
});
test('only consecutive reels count and right-hand extras do not multiply short ways',()=>{
 assert.equal(evaluate(board([3,3,3,0,5,5])).wins[0].ways,27);
 assert.equal(evaluate(board([5,0,5,5,5,5])).amount,0);
 assert.equal(evaluate(board([5,5,5])).wins[0].ways,125);
});
test('all-Wild prefix extended by a natural symbol is not paid again as a shorter win',()=>{
 const grid=board([3,3,3],10);grid[3][0].s=0;const result=evaluate(grid);
 assert.equal(result.wins.length,1);assert.equal(result.wins[0].symbol,0);assert.equal(result.wins[0].length,4);
 assert.equal(result.wins[0].ways,27);assert.equal(result.amount,3.7125);
});
test('unextended all-Wild ways pay the highest symbol exactly once',()=>{
 const result=evaluate(board([3,3,3],10));assert.equal(result.wins.length,1);
 assert.equal(result.wins[0].symbol,9);assert.equal(result.wins[0].ways,27);assert.equal(result.amount,20.79);
});
// Enumerate actual row choices instead of multiplying counts, as an independent oracle.
function oracle(grid){
 let total=0;
 for(let symbol=0;symbol<10;symbol++){
  const paths=[];let length=0;
  for(const column of grid){const rows=column.flatMap((t,r)=>t.s===symbol?[r]:[]);if(!rows.length)break;paths.push(rows);length++;}
  if(length<3)continue;
  const visit=(c)=>c===length?1:paths[c].reduce((sum)=>sum+visit(c+1),0);
  total+=visit(0)*Math.round(PAY[symbol][length]*CONFIG.payDenominator);
 }
 return total/CONFIG.payDenominator;
}
test('random mixed boards match independent path enumeration',()=>{
 let seed=629126;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed};
 for(let i=0;i<1000;i++){
  const grid=Array.from({length:6},(_,c)=>Array.from({length:5},(_,r)=>({id:`${c}-${r}`,s:rand()%4})));
  assert.equal(evaluate(grid).amount,oracle(grid));assert.equal(evaluate(grid,false).amount,oracle(grid));
 }
});
test('new paid spins and bonus free spins never apply a cascade multiplier',()=>{
 for(const mode of ['base','hunt','core','rift','overdrive']){
  const s=fresh(631026);s.bet=.1;s.balance=1e9;s.settings.hunt=mode==='hunt';
  if(!['base','hunt'].includes(mode)){play(s,{buy:mode});s.pending=null;}
  let wins=0;
  for(let i=0;i<100;i++){
   s.pending=null;s.balance=1e9;
   if(['base','hunt'].includes(mode))s.round=null;
   else if(!s.round){play(s,{buy:mode});s.pending=null;}
   const record=play(s);
   for(const e of record.events.filter(e=>e.type==='win')){wins++;assert.equal(e.cm,1);assert.equal(e.raw,Math.round(e.payUnits*Math.round(s.bet*100)*e.gm/CONFIG.payDenominator)/100);}
  }
  assert.ok(wins>0,mode);
 }
});


