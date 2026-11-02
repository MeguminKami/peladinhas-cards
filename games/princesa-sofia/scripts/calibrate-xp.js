import { writeFileSync } from 'node:fs';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/config.js';

const mode = process.argv[2];
if (!['common', 'super'].includes(mode) || process.argv.length !== 3) throw Error('Usage: node scripts/calibrate-xp.js common|super');
const seed = mode === 'common' ? 22261037 : 23261040;
const minimumPrice = mode === 'common' ? 80 : 200;
const maximumPrice = mode === 'common' ? 100 : 250;
const candidates = [];
let selected;
for (let xp = mode === 'common' ? 25 : 20; xp >= 1; xp--) {
  const config = structuredClone(DEFAULT_CONFIG);
  config.xpThreshold100[mode] = xp * 100;
  config.buyPrices[mode] = minimumPrice;
  const report = simulate({ config, mode, count: 10000, seed });
  const candidate = { xp, report };
  candidates.push(candidate);
  if (!selected || Math.abs(report.rtp - .97) < Math.abs(selected.report.rtp - .97)) selected = candidate;
  console.log(JSON.stringify({ mode, xp, rtp: report.rtp, retrigger: report.bonusRetriggerFrequency }));
  const insideTarget = report.rtp >= .96 && report.rtp <= .98;
  if (insideTarget) selected = candidate;
  const feasiblePrices = Array.from({length:maximumPrice - minimumPrice + 1}, (_, i) => i + minimumPrice)
    .filter(price => report.meanReturnBaseBets / price >= .96 && report.meanReturnBaseBets / price <= .98)
    .sort((a,b) => Math.abs(report.meanReturnBaseBets / a - .97) - Math.abs(report.meanReturnBaseBets / b - .97));
  if (feasiblePrices.length) selected = { ...candidate, price: feasiblePrices[0], pricedRtp: report.meanReturnBaseBets / feasiblePrices[0] };
  const output = { purpose: 'local-xp-calibration-not-certification', date: '2026-10-31',
    mode, countPerCandidate: 10000, seed, target: [.96, .98],
    stoppingRule: 'Decrease XP one by one at the minimum price; select the first XP allowing 96%-98% with an integer price in the mandatory range, nearest 97%. Stop at first crossing if no price is feasible.',
    sourceConfig: DEFAULT_CONFIG, selectedXp: selected.xp, selectedPrice: selected.price ?? minimumPrice,
    selectedRtp: selected.pricedRtp ?? selected.report.rtp,
    observedTargetPassed: (selected.pricedRtp ?? selected.report.rtp) >= .96 && (selected.pricedRtp ?? selected.report.rtp) <= .98, candidates };
  writeFileSync(`xp-${mode}-v31-calibration.json`, JSON.stringify(output, null, 2) + '\n');
  if (feasiblePrices.length || report.rtp > .98) break;
}
