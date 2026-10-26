import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,execute,renewSeed,restoreSession} from '../src/session.ts';
import {SeededRandom} from '../src/random.ts';

test('seed persistida continua RNG e só muda a pedido entre rondas',()=>{
 let s=createSession('primeira');const initial=s.rngState;
 s=execute(s,{type:'start',mode:'base'},'one','date');
 assert.equal(s.seed!.value,'primeira');assert.notEqual(s.rngState,initial);
 const restored=restoreSession(JSON.parse(JSON.stringify(s)));assert.equal(restored.rngState,s.rngState);assert.deepEqual(restored.seed,s.seed);
 if(s.active)assert.throws(()=>renewSeed(s,'outra','date'));
 const idle={...s,active:null,pendingRetrigger:null};
 const renewed=renewSeed(idle,'segunda','today');assert.equal(renewed.rngState,new SeededRandom('segunda').state());assert.equal(renewed.seed!.generation,2);assert.equal(renewed.balance,idle.balance);assert.deepEqual(renewed.history,idle.history);assert.equal(renewed.counter,idle.counter);
 assert.throws(()=>renewSeed(renewed,'segunda','date'));
});
