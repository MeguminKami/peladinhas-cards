import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve,neighbors,shortestPass,shotPath} from '../src/powers.ts';
import type {Board} from '../src/board.ts';
import {config} from '../src/config.ts';
import {createSession,execute,restoreSession} from '../src/session.ts';
import {generate} from '../src/board.ts';
const zero={next:()=>0};
test('Passe Curto escolhe um P1 aleatório e converte o caminho mínimo preservando especiais',()=>{
 const b=Array(24).fill('N1') as Board;b[7]='W';b[6]=b[23]='P1';b[13]='S';b[19]='P4';b[21]='W';
 let calls=0;const r=resolve(b,'superior',{next:()=>++calls===3?.99:0},config,9),e=r.events[0];
 assert.equal(e.destination,23);assert.deepEqual(e.path,[7,13,19,20,21,22,23]);assert.deepEqual(e.targets,[19,20,22]);
 assert.equal(r.board[7],'W');assert.equal(r.board[21],'W');assert.equal(r.board[13],'S');
 assert.ok(e.targets.every(p=>r.board[p]==='P1'));assert.equal(r.global,9);assert.equal(r.amplified.size,0);
 const other=resolve(b,'superior',zero).events[0];assert.equal(other.destination,23);assert.equal(other.passKind,'pass');
});
test('sem outro P1, remate sorteia as 8 direções e não converte premiums ou Wilds',()=>{
 const directions=[[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1]];
 for(let i=0;i<8;i++){
  const b=Array(24).fill('N1') as Board;b[7]='W';b[6]='P1';let calls=0;
  const r=resolve(b,'superior',{next:()=>++calls===3?(i+.5)/8:0}),e=r.events[0];
  assert.equal(e.passKind,'shot');assert.deepEqual(e.direction,directions[i]);assert.equal(e.destination,undefined);
  assert.deepEqual(e.path,shotPath(7,directions[i][0],directions[i][1],b));assert.equal(r.board[7],'W');assert.equal(r.board[6],'P1');
 }
 for(const blocker of ['P1','P2','P3','P4','W'] as const){
  const b=Array(24).fill('N1') as Board;b[7]='W';b[6]='P1';b[9]=blocker;let calls=0;
  // Another P1 is a normal pass destination; other blockers exercise the shot.
  if(blocker==='P1')continue;
  const r=resolve(b,'superior',{next:()=>++calls===3?2.5/8:0}),e=r.events[0];
  assert.deepEqual(e.path,[7,8,9]);assert.deepEqual(e.targets,[8]);assert.equal(r.board[8],'P1');assert.equal(r.board[9],blocker);
 }
});
test('remate diagonal termina na margem e preserva Scatters; saída imediata não faz wrap',()=>{
 const b=Array(24).fill('N1') as Board;b[7]='W';b[6]='P1';b[14]='S';let calls=0;
 const r=resolve(b,'superior',{next:()=>++calls===3?3.5/8:0}),e=r.events[0];
 assert.deepEqual(e.path,[7,14,21]);assert.deepEqual(e.targets,[21]);assert.equal(r.board[14],'S');
 assert.deepEqual(shotPath(5,0,1,b),[5]);assert.deepEqual(shotPath(0,-1,-1,b),[0]);
 const blocked=[...b];blocked[14]='P1';assert.deepEqual(shotPath(7,1,1,blocked),[7,14]);
});
test('rotas mínimas usam vizinhos válidos sem diagonais, repetição ou wrap',()=>{
 for(const roll of [0,.49,.99])for(let from=0;from<24;from++)for(let to=0;to<24;to++){
  const path=shortestPass(from,to,{next:()=>roll});
  assert.equal(path.length-1,Math.abs(Math.trunc(from/6)-Math.trunc(to/6))+Math.abs(from%6-to%6));
  assert.equal(path[0],from);assert.equal(path.at(-1),to);assert.equal(new Set(path).size,path.length);
  for(let i=1;i<path.length;i++)assert.ok(neighbors(path[i-1]).includes(path[i]));
 }
});
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
