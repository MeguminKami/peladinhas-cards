import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {writeFileSync} from 'node:fs';
import {CONFIG,fresh,play,MATH_VERSION} from '../engine.js';
if(!isMainThread){
 const {mode,bias,n,seed,profile}=workerData;Object.assign(CONFIG.profiles[mode],profile);
 CONFIG.profiles[mode].reelWeights=Array.from({length:6},(_,c)=>CONFIG.profiles[mode].weights.map((w,i)=>w*(i===c?bias:1)));
 const s=fresh(seed);s.bet=.1;let sum=0,squares=0,spins=0,active=0,empty=0;const powers={};
 for(let i=0;i<n;i++){s.balance=1e10;play(s,{buy:mode,capture:false});let total=0;while(s.round){const r=play(s,{capture:false});total+=r.win;spins++;if(Object.keys(r.stats.powers).length)active++;for(const [k,v]of Object.entries(r.stats.powers))powers[k]=(powers[k]||0)+v;}const x=total/s.bet;sum+=x;squares+=x*x;if(!total)empty++;}
 parentPort.postMessage({mode,bias,n,seed,profile,mean:sum/n,se:Math.sqrt((squares-sum*sum/n)/(n-1)/n),active:active/spins,spins,empty,powers});
}else{
 const profiles={core:{wild:.015,powers:[.015,.08,.12,.10],pulse:.35},rift:{wild:.02,powers:[.02,.10,.14,.12],pulse:.45},overdrive:{wild:.02,powers:[.025,.12,.16,.14],pulse:.6}};
 const jobs=Object.entries(profiles).flatMap(([mode,profile])=>[({core:2.65,rift:3.2,overdrive:6})[mode]].map(bias=>({mode,profile,bias,n:Number(process.argv[2]||3000)})));
 let i=0;const results=[];
 await Promise.all(Array.from({length:3},async()=>{while(i<jobs.length){const index=i++,job={...jobs[index],seed:711026+index};const r=await new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:job});w.on('message',resolve);w.on('error',reject);w.on('exit',c=>{if(c)reject(Error('Worker '+c))});});results.push(r);console.log(JSON.stringify(r));}}));
 writeFileSync(new URL('../bonus-calibration-v4.14.json',import.meta.url),JSON.stringify({version:MATH_VERSION,date:new Date().toISOString(),results},null,2)+'\n');
}
