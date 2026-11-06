import {TABLES,exact,playRound,choose,MATH_VERSION} from '../src/engine.js';
import {writeFileSync,mkdirSync} from 'node:fs';
const sample=Number(process.env.GANZA_SAMPLE||1000000), seed=`validacao-${MATH_VERSION}-20261106`;
const results=[];
for(const t of TABLES){
 let sum=0,sq=0,max=0;const counts=Array(t.rows+1).fill(0);
 for(let i=0;i<sample;i++) {const r=playRound(`${seed}:${t.rows}:${t.risk}:${i}`,{...t,bet:10000}); const x=r.payment/10000;sum+=x;sq+=x*x;max=Math.max(max,x);counts[r.k]++;}
 const mean=sum/sample,sd=Math.sqrt((sq-sum*sum/sample)/(sample-1)),ci=1.96*sd/Math.sqrt(sample);
 const r={rows:t.rows,risk:t.risk,exact:exact(t),simulated:mean*100,ci95:[(mean-ci)*100,(mean+ci)*100],sd,max,sample,bins:counts.map((observed,k)=>({k,observed,expected:sample*choose(t.rows,k)/2**t.rows}))};
 results.push(r);console.log(`${t.rows} ${t.risk}: exato ${r.exact.toFixed(6)}%, sim ${r.simulated.toFixed(4)}%, IC95 [${r.ci95.map(x=>x.toFixed(4))}], DP ${sd.toFixed(4)}, maior ${max}×`);
 console.table(r.bins);
}
mkdirSync(new URL('../relatorios/',import.meta.url),{recursive:true});
writeFileSync(new URL('../relatorios/simulacao.json',import.meta.url),JSON.stringify({seed,version:MATH_VERSION,sample,results},null,2));
writeFileSync(new URL('../relatorios/simulacao.csv',import.meta.url),'rows,risk,exact,simulated,ciLow,ciHigh,sample,sd,max\n'+results.map(r=>[r.rows,r.risk,r.exact,r.simulated,...r.ci95,r.sample,r.sd,r.max].join(',')).join('\n'));
