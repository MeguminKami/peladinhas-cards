import {writeFileSync} from 'node:fs';
import {simulate} from '../src/simulation.js';
import {DEFAULT_CONFIG} from '../src/config.js';
const proposed = process.argv.includes('--proposed-prices');
if (process.argv.slice(2).some(arg => arg !== '--proposed-prices')) throw new Error('Usage: node scripts/validate-rtp.js [--proposed-prices]');
const config = structuredClone(DEFAULT_CONFIG);
if (proposed) { config.buyPrices = { common: 98, super: 222, secret: 800 }; config.version += '-price-proposal'; }
const reports=[];
for(const [i,mode] of ['base','hunt','common','super','secret'].entries()){
 const report=simulate({config,mode,count:mode==='base'||mode==='hunt'?100000:10000,seed:815931+i*1000003});reports.push(report);
 console.log(JSON.stringify({mode,count:report.count,rtp:report.rtp,mean:report.meanReturnBaseBets,retriggers:report.retriggersByScatters,natural:report.naturalBonuses,contributions:report.contributionsRtp}));
}
const empiricalTargetPassed=reports.every(r=>r.rtp>=.96&&r.rtp<=.98);
writeFileSync(proposed ? 'rtp-premium-clusters-proposal.json' : 'rtp-premium-clusters-validation.json',JSON.stringify({purpose:'local-calibration-not-certification',date:'2026-10-31',target:[.96,.98],empiricalTargetPassed,limitations:'Calibration samples; point estimates are not independent validation or certification. Confidence intervals do not establish a true RTP within the target.',priceProposalOnly:proposed,config,reports},null,2)+'\n');
if(!empiricalTargetPassed)process.exitCode=1;
