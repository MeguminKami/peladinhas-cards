import test from 'node:test';
import assert from 'node:assert/strict';
import {config} from '../src/config.ts';
import {generate,type Board} from '../src/board.ts';
import {start,spin,round} from '../src/engine.ts';
import {createSession,execute,restoreSession} from '../src/session.ts';
import {SeededRandom} from '../src/random.ts';
import {makeBonusActivationBoard} from '../web/presentation.ts';

test('5 Scatters naturais em colunas distintas ativam Lendas do Bairro',()=>{
 const b=generate('base',[],{next:()=>.99999});
 const positions=b.flatMap((s,i)=>s==='S'?[i]:[]);
 assert.equal(positions.length,5);assert.equal(new Set(positions.map(p=>p%6)).size,5);
 const r=spin(start('base'),20,{next:()=>.99},config,true,b);
 assert.equal(r.next.mode,'legend');assert.equal(r.next.remaining,10);
 assert.equal(makeBonusActivationBoard('legend').filter(s=>s==='S').length,5);
});
test('Wild a 7% e sticky 25% apenas no nascimento',()=>{
 const chance=(mode:'legend'|'superior')=>config.weights[mode][8]/config.weights[mode].reduce((a,b)=>a+b);
 assert.ok(Math.abs(chance('legend')-.07)<1e-12);
 const previous=[470160,421185,362415,303645,156720,107745,68565,39180];
 for(let i=1;i<8;i++)assert.ok(Math.abs(config.weights.legend[i]/config.weights.legend[0]-previous[i]/previous[0])<1e-12);
 const b=Array(24).fill('N1') as Board;b[8]='W';
 assert.deepEqual(spin(start('legend'),20,{next:()=>.24999},config,true,b).next.sticky,[8]);
 assert.deepEqual(spin(start('legend'),20,{next:()=>.25},config,true,b).next.sticky,[]);
 const s={...start('legend'),sticky:[8]};
 assert.deepEqual(spin(s,20,{next:()=>.99},config,true,b).next.sticky,[8]);
 b[0]=b[1]=b[2]='S';
 const r=spin(s,20,{next:()=>.99},config,true,b);
 assert.equal(r.retrigger?.awarded,5);assert.equal(r.next.mode,'legend');assert.deepEqual(r.next.sticky,[8]);
});
test('compra 450× é idempotente, retoma RNG e mantém teto pela aposta base',()=>{
 const initial=createSession('legend-wallet'),s=execute(initial,{type:'start',mode:'legend'},'buy','date');
 assert.equal(s.history[0].cost,9000);assert.equal(s.balance,initial.balance-9000+s.history[0].paid);
 assert.deepEqual(execute(s,{type:'start',mode:'legend'},'buy','date'),s);
 const restored=restoreSession(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored,s);
 const a=round('legend',20,new SeededRandom('replay')),b=round('legend',20,new SeededRandom('replay'));
 assert.deepEqual(a,b);assert.ok(a.paid<=200000);assert.equal(a.cost,9000);
 const old={...createSession('migration-070'),configVersion:'0.7.0'};
 const migrated=restoreSession(old);assert.equal(migrated.rngState,old.rngState);assert.equal(migrated.balance,old.balance);assert.equal(migrated.configVersion,config.version);
 const prior={...s,configVersion:'0.8.1'};const updated=restoreSession(prior);
 assert.equal(updated.rngState,prior.rngState);assert.equal(updated.balance,prior.balance);
 assert.deepEqual(updated.active,prior.active);assert.deepEqual(updated.history[0].spins,prior.history[0].spins);
});
