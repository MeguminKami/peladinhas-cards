import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fresh,play,CONFIG,MATH_VERSION} from '../engine.js';
if(!isMainThread){
 const {mode,n,seed,bet}=workerData;const state=fresh(seed);state.bet=bet;let paidCents=0,costCents=0,sumSquares=0,freeSpins=0,retriggers=0,caps=0,activeSpins=0,randomPowerSpins=0,winningSpins=0,zeroRounds=0;const powers={},groups={};
 for(let i=0;i<n;i++){
  state.balance=1e10;const entry=play(state,{buy:mode,capture:false});let win=entry.win,record=entry;const cost=entry.cost;
  while(state.round){record=play(state,{capture:false});win+=record.win;freeSpins++;retriggers+=record.added>0?1:0;if(record.win>0)winningSpins++;const names=Object.keys(record.stats.powers);if(names.length)activeSpins++;if(names.some(name=>name!=='CORE IMPULSE'))randomPowerSpins++;for(const [name,count] of Object.entries(record.stats.powers))powers[name]=(powers[name]||0)+count;}
  const key=mode==='overdrive'&&entry.awarded===14?'overdrive14':mode;const g=groups[key]||={n:0,sum:0,squares:0};const x=win/bet;g.n++;g.sum+=x;g.squares+=x*x;
  if(!win)zeroRounds++;if(record.capped)caps++;const ratio=win/cost;paidCents+=Math.round(win*100);costCents+=Math.round(cost*100);sumSquares+=ratio*ratio;
 }
 const totalPaid=paidCents/100,totalCost=costCents/100,rtp=paidCents/costCents,variance=Math.max(0,(sumSquares-n*rtp*rtp)/(n-1)),se=Math.sqrt(variance/n);
 const components=Object.entries(groups).map(([scenario,g])=>({scenario,n:g.n,seed,bet,mean:g.sum/g.n,variance:Math.max(0,(g.squares-g.sum*g.sum/g.n)/(g.n-1))}));
 parentPort.postMessage({components,scenario:mode,rounds:n,seed,bet,totalPaid,totalCost,freeSpins,retriggers,caps,features:{activeSpins,randomPowerSpins,winningSpins,zeroRounds,powers},rtp,ci95:[rtp-1.96*se,rtp+1.96*se]});
}else{
 const n=Number(process.argv[2]||50000),bet=Number(process.argv[3]||.1),seed=Number(process.argv[4]||471026);
 if(!Number.isSafeInteger(n)||n<2||!Number.isFinite(bet)||bet<=0||!Number.isSafeInteger(seed))throw Error('Use rounds bet seed');
 const hash=name=>createHash('sha256').update(readFileSync(new URL('../'+name,import.meta.url))).digest('hex');
 const configurationHash=hash('math-config.js'),engineHash=hash('engine.js');
 const results=await Promise.all(['core','rift','overdrive'].map((mode,i)=>new Promise((resolve,reject)=>{
  const worker=new Worker(new URL(import.meta.url),{workerData:{mode,n,bet,seed:seed+i}});
  worker.on('message',r=>{console.log(JSON.stringify(r));resolve(r);});worker.on('error',reject);worker.on('exit',code=>{if(code)reject(Error('Worker exit '+code));});
 })));
 const report={calibration:process.argv.includes('--validation')?'Independent validation seeds after prices were fixed; no price fitting to this sample.':'Calibration sample; not independent validation.',date:new Date().toISOString(),version:MATH_VERSION,kind:'complete-purchased-bonus-rounds',configurationHash,engineHash,configuration:CONFIG,results};
 writeFileSync(new URL(process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'../purchases-50000.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}

