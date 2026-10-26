import test from 'node:test';
import assert from 'node:assert/strict';
import type {SpinResult} from '../src/engine.ts';
import {linePrizes} from '../web/line-prizes.ts';
const fixture=(paid:number,weights:number[])=>({paid,detail:{lines:weights.map(hundredths=>({hundredths}))}} as SpinResult);
test('valores das linhas somam o pagamento confirmado incluindo cêntimos e teto',()=>{
 assert.deepEqual(linePrizes(fixture(2,[1,1,1])),[1,1,0]);
 assert.deepEqual(linePrizes(fixture(17,[10,20,30])),[3,6,8]);
 for(let paid=0;paid<1000;paid++){const amounts=linePrizes(fixture(paid,[3,17,29,100]));assert.equal(amounts.reduce((a,b)=>a+b,0),paid);assert(amounts.every(n=>Number.isSafeInteger(n)&&n>=0));}
 assert.deepEqual(linePrizes(fixture(0,[])),[]);
});
