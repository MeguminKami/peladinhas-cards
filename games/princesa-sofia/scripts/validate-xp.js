import { writeFileSync } from 'node:fs';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/config.js';

const independent = process.argv.includes('--independent');
if (process.argv.slice(2).some(arg => arg !== '--independent')) throw Error('Usage: npm.cmd run validate:xp -- [--independent]');
const reports = [];
for (const [i, mode] of ['base', 'hunt', 'common', 'super', 'secret'].entries()) {
  const report = simulate({ mode, count: mode === 'base' || mode === 'hunt' ? 100000 : 10000,
    seed: (independent ? 3198127 : 20261031) + i * 1000003 });
  reports.push(report);
  console.log(JSON.stringify({ mode, rtp: report.rtp, retrigger: report.bonusRetriggerFrequency }));
}
const output = `rtp-individual-bonus-xp-v31-${independent ? 'independent' : 'validation'}.json`;
writeFileSync(output, JSON.stringify({ purpose: independent ? 'independent-local-sample-not-certification' : 'local-calibration-not-certification',
  date: '2026-10-31', target: [.96, .98], config: DEFAULT_CONFIG, reports }, null, 2) + '\n');
