import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TABLES,exact,choose,playRound} from '../src/engine.js';
test('doze tabelas, binomial, simetria, RTP e máximo',()=>{
 assert.equal(TABLES.length,12);
 for(const t of TABLES){
  assert.equal(t.values.length,t.rows+1);assert.ok(Math.abs(exact(t)-99)<=.01);
  assert.equal(t.values.reduce((s,_,k)=>s+choose(t.rows,k),0),2**t.rows);
  for(let k=0;k<=t.rows;k++){assert.equal(t.values[k],t.values[t.rows-k]);assert.ok(Number.isSafeInteger(t.values[k])&&t.values[k]>0);if(k<t.rows/2)assert.ok(t.values[k]>=t.values[k+1]);}
  assert.equal(Math.max(...t.values)===999900,t.rows===16&&t.risk==='extremo');
 }
});
test('todos os percursos têm a distribuição binomial enumerada',()=>{
 for(const rows of [8,12,16]){const bins=Array(rows+1).fill(0);for(let bits=0;bits<2**rows;bits++){let k=0;for(let j=0;j<rows;j++)k+=(bits>>>j)&1;bins[k]++;}bins.forEach((v,k)=>assert.equal(v,choose(rows,k)));}
});
test('determinismo, percurso decide lancha, inteiros e independência',()=>{
 for(let i=0;i<1000;i++)for(const t of TABLES){const req={rows:t.rows,risk:t.risk,bet:137},r=playRound(`teste:${i}`,req);assert.deepEqual(r,playRound(`teste:${i}`,req));assert.equal(r.k,r.path.reduce((a,b)=>a+b,0));assert.equal(r.payment,Math.floor(137*t.values[r.k]/100));assert.ok(Number.isSafeInteger(r.payment));playRound('outra',req);assert.deepEqual(r,playRound(`teste:${i}`,req));}
 assert.throws(()=>playRound('x',{bet:1.2}));assert.throws(()=>playRound('x',{rows:9}));
});
