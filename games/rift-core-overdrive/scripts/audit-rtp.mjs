import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fresh,play,CONFIG,MATH_VERSION,scatterDistribution} from '../engine.js';
if(!isMainThread){
 const {scenario,n,seed,bet}=workerData,s=fresh(seed);s.bet=bet;s.settings.hunt=scenario==='hunt';let sum=0,sq=0;
 for(let i=0;i<n;i++){
  s.balance=1e10;s.round=null;s.pending=null;
  if(!['base','hunt'].includes(scenario)){
   const mode=scenario==='overdrive14'?'overdrive':scenario,b=CONFIG.bonuses[mode];
   s.round={id:'audit',mathVersion:MATH_VERSION,bet,total:0,mode,played:0,awarded:scenario==='overdrive14'?14:b.spins,global:b.startGlobal,thresholds:[],nextWilds:0,evolution:false};
  }
  let r=play(s,{capture:false}),win=r.win;
  if(!['base','hunt'].includes(scenario))while(s.round){r=play(s,{capture:false});win+=r.win;}
  const x=win/bet;sum+=x;sq+=x*x;
 }
 parentPort.postMessage({scenario,n,seed,bet,mean:sum/n,variance:Math.max(0,(sq-sum*sum/n)/(n-1))});
}else{
 const hash=file=>createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex');
 const configurationHash=hash('math-config.js'),engineHash=hash('engine.js');
 const n=Number(process.argv[2]||20000),bet=Number(process.argv[3]||1),seed=Number(process.argv[4]||761026),results=[];
 if(!Number.isSafeInteger(n)||n<1000||!Number.isFinite(bet)||bet<=0||!Number.isSafeInteger(seed))throw Error('Use: audit-rtp.mjs rounds>=1000 bet seed');
 for(const batch of [['base','hunt'],['core','rift','overdrive','overdrive14']]){
  await Promise.all(batch.map((scenario,i)=>new Promise((resolve,reject)=>{
   const w=new Worker(new URL(import.meta.url),{workerData:{scenario,n,bet,seed:seed+i+batch.length*100}});
   w.on('message',r=>{results.push(r);console.log(JSON.stringify(r));resolve();});w.on('error',reject);w.on('exit',c=>{if(c)reject(Error('Worker exit '+c));});
  })));
 }
 const by=Object.fromEntries(results.map(r=>[r.scenario,r]));
 const weighted=(terms,divisor=1)=>{const mean=terms.reduce((a,[key,p])=>a+p*by[key].mean,0)/divisor,se=Math.sqrt(terms.reduce((a,[key,p])=>a+p*p*by[key].variance/n,0))/divisor;return {rtp:mean,ci95:[mean-1.96*se,mean+1.96*se]};};
 const summaries={};
 for(const mode of ['base','hunt']){const d=scatterDistribution(mode==='hunt');summaries[mode]=weighted([[mode,1],['core',d[3]],['rift',d[4]],['overdrive',d[5]],['overdrive14',d[6]]],mode==='hunt'?3:1);}
 for(const mode of ['core','rift','overdrive'])summaries[mode]=weighted(mode==='overdrive'?[['overdrive',1-CONFIG.purchaseSixScatterChance],['overdrive14',CONFIG.purchaseSixScatterChance]]:[[mode,1]],CONFIG.prices[mode]);
 const report={date:new Date().toISOString(),version:MATH_VERSION,kind:'stratified-local-rtp',n,bet,configurationHash,engineHash,configuration:CONFIG,note:'Base payout plus independently sampled bonus expectation weighted by exact trigger probabilities. Normal approximation CI; natural entry payout and bonus cap correlation require full-round cross-check.',results,summaries};
 writeFileSync(new URL(process.argv[5]||'../local-math-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(summaries,null,2));
}
