import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve,neighbors} from '../src/powers.ts';
import type {Board} from '../src/board.ts';
import {config} from '../src/config.ts';
import {createSession,execute,restoreSession} from '../src/session.ts';
import {generate} from '../src/board.ts';
const zero={next:()=>0};
test('normal 0.9.2 aumenta ambas as chances 25%: 25 Wilds/414 e roubo 50%',()=>{
 let wilds=0;
 for(let i=0;i<414;i++){
  let call=0;const b=generate('normal',[],{next:()=>++call===1?0:(i+.5)/414});
  if(b[0]==='W')wilds++;
 }
 assert.equal(wilds,25);
 const b=Array(24).fill('S') as Board;b[7]='W';b[6]='P1';
 for(const [roll,success] of [[.49999,true],[.5,false]] as const){
  let call=0;assert.equal(resolve(b,'normal',{next:()=>++call===2?roll:0}).steals[0].success,success);
 }
});
test('Passe Curto só converte um normal ortogonal e não amplifica o Wild',()=>{
 const b=Array(24).fill('S') as Board;b[7]='W';b[6]='P1';b[1]='N2';b[8]='P4';b[0]='N1';
 const r=resolve(b,'superior',zero,config,9);
 assert.deepEqual(r.events[0].targets,[1]);assert.equal(r.board[1],'P1');assert.equal(r.board[0],'N1');
 assert.equal(r.global,9);assert.equal(r.amplified.size,0);assert.equal(r.board[8],'P4');
 b[1]='S';assert.deepEqual(resolve(b,'superior',zero).events[0].targets,[]);
});
test('P2 sorteia 1 ou 2 a 50/50 e alvos ortogonais sem reposição',()=>{
 for(const [roll,count] of [[.49999,1],[.5,2]]){
  const b=Array(24).fill('N1') as Board;b[7]='W';b[6]='P2';let calls=0;
  const r=resolve(b,'superior',{next:()=>++calls===3?roll:0}),e=r.events[0];
  assert.equal(e.requested,count);assert.equal(e.targets.length,count);assert.equal(new Set(e.targets).size,count);
  assert.ok(e.targets.every(p=>neighbors(7).includes(p)));assert.equal(r.steals.length,1);
 }
 for(const choice of [0,.26,.51,.99]){
  const b=Array(24).fill('N1') as Board;b[7]='W';b[6]='P2';let calls=0;
  const r=resolve(b,'superior',{next:()=>++calls===4?choice:0});
  assert.equal(r.events[0].targets[0],neighbors(7)[Math.floor(choice*4)]);
 }
 const b=Array(24).fill('S') as Board;b[0]='W';b[1]='P2';let calls=0;
 const r=resolve(b,'superior',{next:()=>++calls===3?.99:0});
 assert.equal(r.events[0].requested,2);assert.deepEqual(r.events[0].targets,[1]);assert.equal(r.board[6],'S');
});
test('P3 converte a fonte além da quota e fontes partilhadas só uma vez',()=>{
 const b=Array(24).fill('N1') as Board;b[0]='W';b[1]='P3';b[2]='W';
 const r=resolve(b,'superior',zero),events=r.events.filter(e=>e.power==='P3');
 assert.equal(events.length,2);assert.equal(r.board[1],'P1');
 assert.equal(events[0].targets.length,3);assert.equal(events[0].sourceTargets?.length,1);
 assert.equal(events[1].targets.length,2);assert.equal(events[1].sourceTargets?.length,0);
 assert.equal(new Set(events.flatMap(e=>e.targets)).size,5);
});
test('migração 0.8.2 conserva resultado confirmado, saldo, RNG e estado ativo',()=>{
 const s=execute(createSession('powers-migration'),{type:'start',mode:'legend'},'buy','date');s.configVersion='0.8.2';
 const r=restoreSession(s);assert.equal(r.configVersion,config.version);assert.equal(r.balance,s.balance);assert.equal(r.rngState,s.rngState);
 assert.deepEqual(r.active,s.active);assert.deepEqual(r.history[0].spins,s.history[0].spins);
});
