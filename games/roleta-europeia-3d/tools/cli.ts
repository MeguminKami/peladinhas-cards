import {readFileSync} from 'node:fs';
import {RNG} from '../shared/core';
import {BETS,settle,fresh,spin} from '../src/engine';
const [mode='spin',arg='1,2,3,4',file]=process.argv.slice(2);const plan=file?JSON.parse(readFileSync(file,'utf8')):{[BETS.find(b=>b.label==='Vermelho')!.id]:100};
if(mode==='catalog')console.log(JSON.stringify(BETS,null,2));
else if(mode==='exact')console.log(JSON.stringify(BETS.map(b=>({id:b.id,expectedNumerator:Array.from({length:37},(_,n)=>settle({[b.id]:100},n).gross).reduce((a,b)=>a+b,0),expectedDenominator:3700})),null,2));
else if(mode==='settle')console.log(JSON.stringify(settle(plan,Number(arg)),null,2));
else if(mode==='spin')console.log(JSON.stringify(spin(fresh(new RNG(arg.split(',').map(Number))),plan),null,2));
else throw new Error('catalog | exact | settle NUMERO [plano.json] | spin SEED [plano.json]');
