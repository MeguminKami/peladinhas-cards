import test from 'node:test';
import assert from 'node:assert/strict';
import {config} from '../src/config.ts';
import {generate,type Board} from '../src/board.ts';
import {createSession,execute,restoreSession} from '../src/session.ts';
import {start,spin,round} from '../src/engine.ts';
import {SeededRandom} from '../src/random.ts';
import {simulate} from '../src/simulate.ts';

test('Hunt aumenta exatamente 50% as probabilidades de 1 a 5 scatters',()=>{
 const frequencies=(hunt:boolean,count:number)=>{const counts=[0,0,0,0,0,0];for(let i=0;i<count;i++){let first=true;const board=generate('base',[],{next:()=>{if(first){first=false;return (i+.5)/count;}return .99;}},config,hunt);counts[board.filter(s=>s==='S').length]++;}return counts;};
 assert.deepEqual(frequencies(false,200000),config.scatterWeights);assert.deepEqual(frequencies(true,400000),config.huntScatterWeights);
 for(let i=1;i<6;i++)assert.equal(config.huntScatterWeights[i],config.scatterWeights[i]*3);
});

test('Hunt cobra 3×, conserva a referência dos prémios e só se aplica ao base',()=>{
 const initial=createSession('hunt-cost'),normal=execute(initial,{type:'start',mode:'base'},'normal','date'),hunt=execute(initial,{type:'start',mode:'base',bonusHunt:true},'hunt','date');
 assert.equal(normal.history[0].cost,20);assert.equal(hunt.history[0].cost,60);assert.equal(hunt.history[0].bet,20);assert.equal(hunt.history[0].bonusHunt,true);assert.equal(hunt.balance,initial.balance-60+hunt.history[0].paid);
 const board=Array(24).fill('N1') as Board;
 assert.equal(spin(start('base',config,true),20,{next:()=>0},config,true,board).paid,spin(start('base'),20,{next:()=>0},config,true,board).paid);
 assert.throws(()=>execute(initial,{type:'start',mode:'normal',bonusHunt:true},'bad','date'));
 assert.throws(()=>execute({...initial,balance:59},{type:'start',mode:'base',bonusHunt:true},'poor','date'));
});

test('FS ganhos no Hunt são grátis, sem boost extra, e a simulação inclui o custo real',()=>{
 let s=createSession('hunt');
 for(let i=0;i<5000;i++){s=execute(createSession('hunt-fs-'+i),{type:'start',mode:'base',bonusHunt:true},'start','date');if(s.active)break;}
 assert(s.active);assert.equal(s.active.bonusHunt,undefined);const next=execute(s,{type:'next'},'fs','date');assert.equal(next.history[0].cost,60);assert.equal(next.balance,s.balance+next.history[0].spins.at(-1)!.paid);assert.equal(next.history[0].spins.at(-1)!.bonusHunt,false);
 assert.equal(round('base',20,new SeededRandom('hunt'),config,false,true).cost,60);
 const report=simulate('base',20,20,'hunt-report',config,true);assert.equal(report.bonusHunt,true);assert.equal(report.totalCostCents,'1200');
 const saved=createSession('old');saved.configVersion='0.5.1';assert.equal(restoreSession(saved).configVersion,config.version);
});
