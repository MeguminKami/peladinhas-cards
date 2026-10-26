import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RNG} from '../shared/core';
import * as EU from '../src/engine';
import {trajectory} from '../src/scene';
const seed=()=>new RNG([1,2,3,4]);
function cloneJSON<T>(x:T):T{return JSON.parse(JSON.stringify(x));}
test('roulette catalog all legal payouts exactly 36/37 over all 37 outcomes',()=>{assert.equal(ORDERUnique(),37);assert.equal(EU.RED.length,18);assert.equal(EU.BETS.length,157);const cover=new Set<string>();for(const b of EU.BETS){assert(!cover.has(b.numbers.join(',')));cover.add(b.numbers.join(','));let returned=0;for(let n=0;n<37;n++){const r=EU.settle({[b.id]:20},n);assert.equal(r.gross,b.numbers.includes(n)?20*b.multiplier:0);returned+=r.gross;}assert.equal(returned,720);assert.equal(new Set(b.numbers).size,b.numbers.length);}});
function ORDERUnique(){return new Set(EU.ORDER).size;}
test('roulette zero loses every external, exact overlapping returns',()=>{for(const b of EU.BETS.filter(b=>['outside','dozen','column'].includes(b.kind)))assert.equal(EU.settle({[b.id]:20},0).gross,0);const red=EU.BETS.find(b=>b.label==='Vermelho')!;const r=EU.settle({[red.id]:20,'straight:1':20},1);assert.equal(r.cost,40);assert.equal(r.gross,760);assert.equal(r.net,720);assert.throws(()=>EU.settle({'invented:1':20},1));assert.throws(()=>EU.settle({'straight:1':21},1));});
test('all 37 angular targets match pockets across rotations, full trajectory continuous',()=>{for(const n of EU.ORDER)for(const start of [-30,-.1,0,1.4,100]){const end=trajectory(1,start,.4,n);assert.equal(EU.numberAt(end.angle,end.rotor),n);assert(Math.abs(end.radius-2.45)<1e-10);let prev=trajectory(0,start,.4,n);for(let i=1;i<=1000;i++){const p=trajectory(i/1000,start,.4,n);assert(Math.abs(p.angle-prev.angle)<.2);assert(Math.abs(p.radius-prev.radius)<.02);assert(Math.abs(p.height-prev.height)<.02);prev=p;}}});
test('roulette session RNG progresses and reload never pays twice',()=>{let s=EU.fresh(seed());s=EU.spin(s,{'straight:1':20});const ledger=cloneJSON(s.ledger),rng=[...s.rng];s=EU.reveal(cloneJSON(s),2);assert.deepEqual(s.ledger,ledger);assert.throws(()=>EU.spin(s,{'straight:2':20}));s=EU.acknowledge(s);s=EU.spin(s,{'straight:1':20});assert.notDeepEqual(s.rng,rng);assert.equal(s.counter,2);});
test('roulette neighbours wrap and costs validate atomically',()=>{assert.deepEqual(EU.neighbours(0,2),[3,26,0,32,15]);assert.equal(EU.neighbours(0,4).length,9);assert.throws(()=>EU.validate({'straight:1':200},100));assert.throws(()=>EU.validate({'straight:1':100020},200000));assert.throws(()=>EU.validate({},100));});
