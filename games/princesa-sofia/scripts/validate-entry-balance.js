import { writeFileSync } from 'node:fs';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/config.js';

const independent = process.argv.includes('--independent');
const large = process.argv.includes('--large');
if (process.argv.slice(2).some(arg => !['--independent','--large'].includes(arg))) throw Error('Usage: npm.cmd run validate:entries -- [--independent|--large]');
const reports = [];
for (const [i, mode] of (large ? ['base','hunt'] : ['base', 'hunt', 'common', 'super', 'secret']).entries()) {
  const report = simulate({ mode, count: large ? 1000000 : mode === 'base' || mode === 'hunt' ? 100000 : 10000,
    seed: (independent ? 15723419 : large ? 7310011 : 20261031) + i * 1000003,
    onProgress: large ? p => { if(p.completed % 250000 === 0) console.log(JSON.stringify({mode,completed:p.completed,rtp:p.rtp})); } : undefined });
  reports.push(report);
  console.log(JSON.stringify({ mode, rtp: report.rtp, retrigger: report.bonusRetriggerFrequency,
    naturalBonuses: report.naturalBonuses, baseHitSpinFrequency: report.baseHitSpinFrequency }));
}
const output = `rtp-entry-clusters-balanced-hunt-v33-${large && independent ? 'large-independent' : large ? 'large' : independent ? 'independent' : 'validation'}.json`;
writeFileSync(output, JSON.stringify({ purpose: 'local-calibration-not-certification',
  sample: independent ? 'additional-seeds-used-during-calibration' : 'calibration-seeds',
  date: '2026-10-31', config: DEFAULT_CONFIG, reports }, null, 2) + '\n');
