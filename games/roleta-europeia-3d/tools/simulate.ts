import {writeFileSync,mkdirSync} from 'node:fs';
import {RNG} from '../shared/core';
import {BETS,settle,VERSION} from '../src/engine';
const rounds=Number(process.argv[2]||100000),seeds=[[1,2,3,4],[42,123,987,456],[1999,2026,31337,100]];
if(!Number.isSafeInteger(rounds)||rounds<2)throw new Error('Pelo menos duas rondas');
const bet=BETS.find(b=>b.label==='Vermelho')!;
const runs=seeds.map(seed=>{const rng=new RNG(seed),distribution=Array(37).fill(0);let sum=0,square=0;for(let i=0;i<rounds;i++){const n=rng.int(37),x=settle({[bet.id]:100},n).gross/100;distribution[n]++;sum+=x;square+=x*x;}const mean=sum/rounds,se=Math.sqrt((square-rounds*mean*mean)/(rounds-1)/rounds);return {seed,rounds,mean,ci95:[mean-1.96*se,mean+1.96*se],distribution};});
const report={version:VERSION,policy:'100 no vermelho, apostas fixas, sem paragem por saldo',theoretical:36/37,exact:BETS.every(b=>Array.from({length:37},(_,n)=>settle({[b.id]:100},n).gross).reduce((a,b)=>a+b,0)===3600),runs};mkdirSync('reports',{recursive:true});writeFileSync('reports/simulation.json',JSON.stringify(report,null,2));console.log(report);
