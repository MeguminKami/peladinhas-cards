import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CONFIG,MATH_VERSION,scatterDistribution} from '../engine.js';
const url=name=>new URL('../'+name,import.meta.url),read=name=>JSON.parse(readFileSync(url(name),'utf8'));
const report=read('local-math-report.json'),extra=read('rtp-components.json'),hunt=read('rtp-hunt.json');
// Purchase prices do not affect the sampled free-spin outcomes. Reprice the
// independent samples explicitly; reject changes to any outcome distribution.
const outcomes=config=>{const copy=structuredClone(config);delete copy.prices;return JSON.stringify(copy)};
if(outcomes(report.configuration)!==outcomes(CONFIG)||outcomes(extra.configuration)!==outcomes(CONFIG)||outcomes(hunt.configuration)!==outcomes(CONFIG))throw Error('Outcome configuration changed; resample before combining');
const samples=report.componentSamples||[...report.results,...extra.results,...hunt.results];
const by={};
for(const r of samples){
 const a=by[r.scenario];if(!a){by[r.scenario]={...r,seeds:[r.seed]};continue;}
 if(a.bet!==r.bet)throw Error('Cannot pool different bets');
 const n=a.n+r.n,delta=r.mean-a.mean;
 a.variance=((a.n-1)*a.variance+(r.n-1)*r.variance+delta*delta*a.n*r.n/n)/(n-1);
 a.mean=(a.n*a.mean+r.n*r.mean)/n;a.n=n;a.seeds.push(r.seed);delete a.seed;
}
const weighted=(terms,divisor=1)=>{
 const mean=terms.reduce((a,[key,p])=>a+p*by[key].mean,0)/divisor;
 const se=Math.sqrt(terms.reduce((a,[key,p])=>a+p*p*by[key].variance/by[key].n,0))/divisor;
 const ci95=[mean-1.96*se,mean+1.96*se];
 return {rtp:mean,ci95,n:terms.reduce((a,[key])=>a+by[key].n,0),withinRange:mean>=CONFIG.precision[0]&&mean<=CONFIG.precision[1],intervalWithinRange:ci95[0]>=CONFIG.precision[0]&&ci95[1]<=CONFIG.precision[1]};
};
const summaries={};
for(const mode of ['base','hunt']){const d=scatterDistribution(mode==='hunt');summaries[mode]=weighted([[mode,1],['core',d[3]],['rift',d[4]],['overdrive',d[5]],['overdrive14',d[6]]],mode==='hunt'?3:1);}
for(const mode of ['core','rift','overdrive'])summaries[mode]=weighted(mode==='overdrive'?[['overdrive',1-CONFIG.purchaseSixScatterChance],['overdrive14',CONFIG.purchaseSixScatterChance]]:[[mode,1]],CONFIG.prices[mode]);
const hash=file=>createHash('sha256').update(readFileSync(url(file))).digest('hex');
const output={...report,date:new Date().toISOString(),version:MATH_VERSION,configurationHash:hash('math-config.js'),engineHash:hash('engine.js'),configuration:CONFIG,results:Object.values(by),componentSamples:samples,summaries,note:report.note+' Additional independent CORE/RIFT samples pooled; purchase returns divided by final prices. Outcome configuration equality verified excluding prices.'};
writeFileSync(url('local-math-report.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(summaries,null,2));
if(Object.values(summaries).some(r=>!r.withinRange))process.exitCode=1;
