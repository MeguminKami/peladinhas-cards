import {config} from '../src/config.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SeededRandom} from '../src/random.ts';
import {createSession,restoreSession,acknowledgeRetrigger,execute,setBet,topUp,prizeClass} from '../src/session.ts';
test('restauro RNG retoma exatamente a sequência, sem voltar ao primeiro sorteio',()=>{const r=new SeededRandom('restore');const first=r.next();r.next();const restored=SeededRandom.restore(r.state());for(let i=0;i<100;i++)assert.equal(restored.next(),r.next());assert.notEqual(restored.next(),first);assert.throws(()=>SeededRandom.restore(-1));});
test('sessão cobra só uma vez, guarda resultado e impede repetição idempotente',()=>{const before=createSession('session');const after=execute(before,{type:'start',mode:'normal'},'purchase','2026-10-24T10:00:00Z');assert.equal(before.balance,100000);assert.equal(after.balance,100000-1800+after.history[0].paid);assert.equal(after.history[0].cost,1800);assert.equal(after.active?.remaining,9);assert.deepEqual(execute(after,{type:'start',mode:'normal'},'purchase','x'),after);assert.throws(()=>execute(after,{type:'start',mode:'base'},'other','x'));assert.throws(()=>setBet(after,40));assert.throws(()=>topUp(after));});
test('serializar e restaurar sessão a meio do bónus reproduz continuação e saldo',()=>{let a=execute(createSession('bonus'),{type:'start',mode:'superior'},'buy','date');let b=JSON.parse(JSON.stringify(a));for(let i=0;a.active;i++){if(a.pendingRetrigger){a=acknowledgeRetrigger(a,a.pendingRetrigger);b=acknowledgeRetrigger(b,b.pendingRetrigger!);}a=execute(a,{type:'next'},String(i),'date');b=execute(b,{type:'next'},String(i),'date');assert.deepEqual(a,b);}assert.equal(a.active,null);assert.equal(a.history[0].spins.length,10+a.history[0].spins.reduce((n,r)=>n+(r.retrigger?.awarded??0),0));assert.equal(a.balance,100000-4400+a.history[0].paid);assert.equal(a.history[0].complete,true);assert.throws(()=>execute(a,{type:'next'},'extra','date'));});
test('saldo insuficiente não altera sessão/RNG e controlos respeitam aposta',()=>{const s=setBet(createSession('bet'),1000);s.balance=1;const copy=structuredClone(s);assert.throws(()=>execute(s,{type:'start',mode:'base'},'bad','date'));assert.deepEqual(s,copy);assert.throws(()=>setBet(s,21));assert.equal(topUp(s).balance,100001);});
test('classificação de prémios é apenas apresentação, com fronteiras exatas',()=>{assert.equal(prizeClass(0,20),'Sem pagamento');assert.equal(prizeClass(399,20),'Pagamento');assert.equal(prizeClass(400,20),'Prémio alto');assert.equal(prizeClass(1000,20),'Prémio muito alto');assert.equal(prizeClass(2000,20),'Prémio extraordinário');assert.equal(prizeClass(200000,20,true),'Máximo da ronda');});

test('migração 0.3.1 preserva saldo, RNG e global da ronda em curso',()=>{
 const old=JSON.parse(JSON.stringify(execute(createSession('migration'),{type:'start',mode:'superior'},'buy','date')));
 old.configVersion='0.3.1';delete old.active.global;old.history[0].spins[0].detail.global=7;
 const next=restoreSession(old);assert.equal(next.configVersion,config.version);assert.equal(next.active!.global,7);
 assert.equal(next.balance,old.balance);assert.equal(next.rngState,old.rngState);assert.equal(next.counter,old.counter);
 assert.equal(next.history[0].spins.length,1);assert.deepEqual(restoreSession(next),next);
});

test('restauro 0.7.0 preserva saldo, RNG, escolhas e bónus ao atualizar sticky',()=>{
 const original=createSession('sticky-070');original.configVersion='0.7.0';
 const upgraded=restoreSession(original);
 assert.equal(upgraded.configVersion,'0.7.1');assert.equal(upgraded.balance,original.balance);
 assert.deepEqual(upgraded.rngState,original.rngState);assert.deepEqual(upgraded.seed,original.seed);
});
