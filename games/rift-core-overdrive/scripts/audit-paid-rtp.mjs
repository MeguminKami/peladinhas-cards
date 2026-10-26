import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fresh,play,CONFIG,MATH_VERSION,scatterDistribution} from '../engine.js';
if(!isMainThread){
 const {mode,n,seed,bet}=workerData,s=fresh(seed);s.bet=bet;s.settings.hunt=mode==='hunt';let sum=0,squares=0,entrySum=0,entrySquares=0;
 for(let i=0;i<n;i++){
  s.balance=1e10;s.round=null;s.pending=null;const r=play(s,{capture:false}),x=r.win/bet,entry=r.intro?x:0;
  sum+=x;squares+=x*x;entrySum+=entry;entrySquares+=entry*entry;
 }
 parentPort.postMessage({scenario:mode,n,seed,bet,mean:sum/n,variance:(squares-sum*sum/n)/(n-1),entryPaidMean:entrySum/n,entryPaidVariance:(entrySquares-entrySum*entrySum/n)/(n-1)});
}else{
 const n=Number(process.argv[2]||1000000),bet=Number(process.argv[3]||.1),seed=Number(process.argv[4]||481026);
 if(!Number.isSafeInteger(n)||n<2||!Number.isSafeInteger(seed)||!Number.isFinite(bet)||bet<=0)throw Error('Use n bet seed');
 const hash=file=>createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex');
 const configurationHash=hash('math-config.js'),engineHash=hash('engine.js');
 const results=await Promise.all(['base','hunt'].map((mode,i)=>new Promise((resolve,reject)=>{
  const w=new Worker(new URL(import.meta.url),{workerData:{mode,n,bet,seed:seed+i}});w.on('message',r=>{console.log(JSON.stringify(r));resolve(r);});w.on('error',reject);w.on('exit',code=>{if(code)reject(Error('Worker exit '+code));});
 })));
 const purchase=JSON.parse(readFileSync(new URL('../purchases-50000.json',import.meta.url),'utf8'));
 const reuse=process.argv.includes('--reuse-bonus-sample');
 if(reuse){
  const withoutEntryScatters=c=>{const copy=structuredClone(c);delete copy.scatterChance;delete copy.huntScatterBoost;delete copy.profiles.base;delete copy.profiles.hunt;delete copy.naturalScatterScale;return JSON.stringify(copy)};
  if(withoutEntryScatters(purchase.configuration)!==withoutEntryScatters(CONFIG))throw Error('Cannot reuse bonus sample: other math parameters changed');
  // Only entry Scatter logic and archived dispatch may differ; FS settlement must match.
  const normalized=code=>code.trim().replaceAll('\r\n','\n').replace(/^import \* as previous4(?:[789]|10).*\n/gm,'').replace(/s\.round\.mathVersion==='rift-4\.(?:7|8|9|10)'\?previous4(?:7|8|9|10):/g,'').replace(/export function scatterChance\([\s\S]*?\n}\n/,'').replace("'./math-config-v4.7.js'","'./math-config.js'");
  if(purchase.engineHash!==engineHash&&normalized(readFileSync(new URL('../engine.js',import.meta.url),'utf8'))!==normalized(readFileSync(new URL('../engine-v4.7.js',import.meta.url),'utf8')))throw Error('Cannot reuse bonus sample: settlement engine changed');
 }else if(purchase.configurationHash!==configurationHash||purchase.engineHash!==engineHash)throw Error('Purchase sample is stale: rerun measure-purchases first');
 const components=Object.fromEntries(purchase.results.flatMap(r=>r.components).map(r=>[r.scenario,r]));
 const summaries=Object.fromEntries(purchase.results.map(r=>[r.scenario,{rtp:r.rtp,ci95:r.ci95,n:r.rounds,kind:reuse?'reused-purchased-bonus-sample':'complete-purchased-bonus-rounds',sampleVersion:purchase.version}]));
 for(const paid of results){
  const d=scatterDistribution(paid.scenario==='hunt'),terms=[['core',d[3]],['rift',d[4]],['overdrive',d[5]],['overdrive14',d[6]]],divisor=paid.scenario==='hunt'?3:1;
  const mean=(paid.mean+terms.reduce((sum,[mode,p])=>sum+p*components[mode].mean,0))/divisor;
  const se=Math.sqrt(paid.variance/paid.n+terms.reduce((sum,[mode,p])=>sum+p*p*components[mode].variance/components[mode].n,0))/divisor;
  const entryUpper=(paid.entryPaidMean+1.96*Math.sqrt(paid.entryPaidVariance/paid.n))/divisor;
  summaries[paid.scenario]={rtp:mean,ci95:[mean-1.96*se-entryUpper,mean+1.96*se],n:paid.n,kind:'stratified-paid-spin-plus-natural-bonus',naturalEntryCapCorrectionBound:entryUpper};
 }
 const probabilities=Object.fromEntries(['base','hunt','core','rift','overdrive'].map(mode=>[mode,scatterDistribution(mode==='hunt',['base','hunt'].includes(mode)?'base':mode)]));
 const report={purchaseSample:{reused:reuse,validation:purchase.calibration,version:purchase.version,configurationHash:purchase.configurationHash,engineHash:purchase.engineHash},date:new Date().toISOString(),version:MATH_VERSION,bet,configurationHash,engineHash,configuration:CONFIG,note:'Purchases: complete rounds per mode; see purchaseSample.validation for calibration versus independent validation. Reuse mode verifies that only paid profiles or natural entry Scatter parameters changed and the settlement engine is unchanged; original sample version/hashes remain in purchaseSample. Base/Hunt: independent paid-spin samples plus bonus expectations weighted by exact trigger probabilities, with conservative entry-cap correction. Confidence intervals are normal approximations, not certification; estimates share bonus samples.',results,bonusComponents:Object.values(components),probabilities,summaries};
 writeFileSync(new URL('../local-math-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(summaries,null,2));
}


