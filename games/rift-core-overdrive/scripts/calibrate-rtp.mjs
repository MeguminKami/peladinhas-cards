import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {readFileSync,writeFileSync} from 'node:fs';
import {fresh,play,CONFIG,MATH_VERSION,scatterDistribution} from '../engine.js';
if(!isMainThread){
 const {n,seed,mode,bias,wild}=workerData;
 if(wild!==undefined)CONFIG.profiles[mode].wild=wild;
 if(bias)CONFIG.profiles[mode].reelWeights=CONFIG.profiles[mode].weights.map((_,c)=>CONFIG.profiles[mode].weights.map((w,i)=>w*(i===c?bias:1))).slice(0,6);
 const s=fresh(seed);s.bet=.1;s.settings.hunt=mode==='hunt';let sum=0,squares=0;
 for(let i=0;i<n;i++){s.balance=1e10;s.round=null;s.pending=null;const x=play(s,{capture:false}).win/s.bet;sum+=x;squares+=x*x;}
 parentPort.postMessage({mode,bias,wild,n,seed,mean:sum/n,variance:(squares-sum*sum/n)/(n-1)});
}else{
 const n=Number(process.argv[2]||200000),seed=Number(process.argv[3]||541026);
 const scenarios=[{mode:'base',bias:3.8},{mode:'base',bias:4.2},{mode:'base',bias:4.6},{mode:'hunt',bias:3.5},{mode:'hunt',bias:4},{mode:'hunt',bias:4.5}];
 const results=await Promise.all(scenarios.map((scenario,i)=>new Promise((resolve,reject)=>{
  const w=new Worker(new URL(import.meta.url),{workerData:{...scenario,n,seed:seed+i}});w.on('message',r=>{console.log(JSON.stringify(r));resolve(r)});w.on('error',reject);w.on('exit',c=>{if(c)reject(Error('Worker exit '+c))});
 })));
 writeFileSync(new URL('../paid-calibration.json',import.meta.url),JSON.stringify({date:new Date().toISOString(),version:MATH_VERSION,configuration:CONFIG,probabilities:scatterDistribution(),results},null,2)+'\n');
}

