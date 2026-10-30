import {writeFileSync} from 'node:fs';
import {simulate} from '../src/simulation.js';
import {DEFAULT_CONFIG} from '../src/config.js';
const reports=[];
for(const [i,mode] of ['base','common','super','secret'].entries()){
 const report=simulate({mode,count:mode==='base'?100000:10000,seed:815931+i*1000003});
 reports.push(report);
 console.log(JSON.stringify({mode,count:report.count,rtp:report.rtp,hitSpinFrequency:report.baseHitSpinFrequency??report.hitSpinFrequency,confidence95Approx:report.confidence95Approx}));
}
const empiricalTargetPassed=reports.every(r=>r.rtp>=.96&&r.rtp<=.99);
writeFileSync('rtp-evolution-validation.json',JSON.stringify({purpose:'local-calibration-validation-not-certification',date:'2026-10-30',target:[.96,.99],empiricalTargetPassed,limitations:'These seeds were used for fitting this revision. Point estimates are calibration evidence, not independent validation or certification. Confidence intervals do not establish a true RTP within the target. Hunt not recalibrated.',config:DEFAULT_CONFIG,reports},null,2));
if(!empiricalTargetPassed)process.exitCode=1;
