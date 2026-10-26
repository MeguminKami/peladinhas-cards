import test from 'node:test';
import assert from 'node:assert/strict';
import {config,type Mode} from '../src/config.ts';
import {generate,type Board} from '../src/board.ts';
import {start,spin} from '../src/engine.ts';
import {SeededRandom} from '../src/random.ts';
import {createSession,execute,acknowledgeRetrigger,restoreSession} from '../src/session.ts';
const zero={next:()=>0};
function board(count:number):Board{const b=Array(24).fill('N1') as Board;for(let i=0;i<count;i++)b[i*7]='S';return b;}
test('três scatters gerados no bónus ocupam colunas distintas e não substituem sticky',()=>{
 const c={...config,bonusScatterWeights:[0,0,0,1]};
 for(const mode of ['normal','superior'] as Mode[])for(let i=0;i<100;i++){
  const sticky=[0,6,12,18,1,7,13,19],b=generate(mode,sticky,new SeededRandom('scatter-'+i),c),positions=b.flatMap((s,p)=>s==='S'?[p]:[]);
  assert.equal(positions.length,3);assert.equal(new Set(positions.map(p=>p%6)).size,3);for(const p of sticky)assert.equal(b[p],'W');
 }
 assert.equal(generate('superior',Array.from({length:24},(_,i)=>i),zero,c).filter(s=>s==='S').length,0);
});
test('retrigger no último FS dá cinco, preserva global, sticky e modo, e pode repetir',()=>{
 for(const mode of ['normal','superior'] as const){
  const s={...start(mode),remaining:1,global:7,sticky:mode==='superior'?[5]:[]};const b=board(3);if(mode==='superior')b[5]='W';
  const a=spin(s,20,zero,config,true,b);assert.equal(a.retrigger!.awarded,5);assert.equal(a.next.remaining,5);assert.equal(a.next.totalFreeSpins,15);assert.equal(a.next.global,7);assert.equal(a.next.mode,mode);assert.equal(a.next.done,false);assert.deepEqual(a.next.sticky,s.sticky);
  const again=spin(a.next,20,zero,config,true,b);assert.equal(again.next.remaining,9);assert.equal(again.next.totalFreeSpins,20);assert.equal(again.metrics.retriggers,1);
 }
});
test('menos de três scatters não reativa; teto da ronda tem prioridade',()=>{
 for(let n=0;n<3;n++){const r=spin({...start('normal'),remaining:1},20,zero,config,true,board(n));assert.equal(r.retrigger,null);assert.equal(r.next.done,true);}
 const r=spin({...start('superior'),accumulated:199999},20,zero,config,true,board(3));assert.equal(r.paid,1);assert.equal(r.retrigger,null);assert.equal(r.next.done,true);assert.equal(r.next.remaining,0);
});
test('retrigger confirmado não cobra, não repete e aguarda reconhecimento persistente',()=>{
 let initial=createSession('');let result=execute(initial,{type:'start',mode:'normal'},'buy','date');
 for(let i=0;!result.pendingRetrigger;i++){initial=createSession('pending-'+i);result=execute(initial,{type:'start',mode:'normal'},'buy','date');assert.ok(i<2000);}
 assert.equal(result.history[0].cost,1800);assert.equal(result.active!.remaining,14);assert.equal(result.active!.totalFreeSpins,15);
 const restored=restoreSession(JSON.parse(JSON.stringify(result)));assert.deepEqual(restored,result);
 assert.throws(()=>execute(restored,{type:'next'},'next','date'));assert.deepEqual(execute(restored,{type:'start',mode:'normal'},'buy','date'),restored);
 const ack=acknowledgeRetrigger(restored,restored.pendingRetrigger!);assert.equal(ack.pendingRetrigger,null);assert.equal(ack.balance,result.balance);assert.equal(ack.rngState,result.rngState);assert.equal(ack.active!.remaining,14);assert.deepEqual(acknowledgeRetrigger(ack,restored.pendingRetrigger!),ack);
 const next=execute(ack,{type:'next'},'next','date');assert.equal(next.history[0].cost,1800);
});
