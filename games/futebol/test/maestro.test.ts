import test from 'node:test';
import {config} from '../src/config.ts';
import assert from 'node:assert/strict';
import {resolve} from '../src/powers.ts';
import type {Board} from '../src/board.ts';
import {createSession,execute,restoreSession} from '../src/session.ts';

test('Maestro sorteia quatro intervalos iguais e partilha o premium entre ativações',()=>{
 for(const [i,symbol] of ['P1','P2','P3','P4'].entries()){
  const board=Array(24).fill('N1') as Board;
  board[0]='W';board[1]='P3';board[22]='P3';board[23]='W';
  let calls=0;
  const result=resolve(board,'superior',{next:()=>++calls===5?(i+.5)/4:0});
  const events=result.events.filter(e=>e.power==='P3');
  assert.equal(events.length,2);
  for(const event of events){assert.equal(event.conversionSymbol,symbol);assert.equal(event.targets.length,2);for(const p of event.targets)assert.equal(result.board[p],symbol);}
  assert.equal(new Set(events.flatMap(e=>e.targets)).size,4);
 }
});

test('Maestro volta a sortear em cada spin e não cria novos roubos em cadeia',()=>{
 const board=Array(24).fill('N1') as Board;board[0]='W';board[1]='P3';
 for(const value of [.01,.99]){
  let calls=0;const result=resolve(board,'superior',{next:()=>++calls===3?value:0});
  assert.equal(result.events[0].conversionSymbol,value<.5?'P1':'P4');assert.equal(result.events.length,1);
 }
});

test('restauro 0.5.0 preserva retrigger, RNG e histórico confirmado',()=>{
 const saved=execute(createSession('retrigger-fixture-125'),{type:'start',mode:'normal'},'start','date');
 saved.configVersion='0.5.0';const restored=restoreSession(saved);
 assert.equal(restored.configVersion,config.version);assert.equal(restored.rngState,saved.rngState);assert.equal(restored.balance,saved.balance);
 assert.deepEqual(restored.pendingRetrigger,saved.pendingRetrigger);assert.deepEqual(restored.active,saved.active);assert.deepEqual(restored.history[0].spins,saved.history[0].spins);
});
