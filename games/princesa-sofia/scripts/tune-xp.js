import {writeFileSync} from 'node:fs';
import {simulate} from '../src/simulation.js';
import {DEFAULT_CONFIG} from '../src/config.js';

const count = 10000;
const config = structuredClone(DEFAULT_CONFIG);
const result = {
  purpose: 'sequential-xp-calibration-not-independent-validation',
  date: '2026-10-31', count, targetExclusive: .99, stepXp: 1,
  limitations: 'Fixed seeds reused across candidates. Stop at the first observed RTP strictly below 99%; not a guarantee of true RTP or a 96%-98% band.',
  initialConfig: structuredClone(config), candidates: [], selected: {}, complete: false,
};
const save = () => writeFileSync('rtp-xp-first-below-99.json', JSON.stringify(result, null, 2) + '\n');
save();
for (const [i, mode] of ['common', 'super', 'secret'].entries()) {
  const seed = 815931 + (i + 2) * 1000003;
  const startXp = config.xpThreshold100[mode] / 100;
  if (!Number.isInteger(startXp)) throw new Error('Starting XP must be integral');
  for (let xp = startXp + 1; xp <= 10000; xp++) {
    config.xpThreshold100[mode] = xp * 100;
    config.version = `sofia-ten-wilds-xp-search-${mode}-${xp}`;
    const report = simulate({config, mode, count, seed});
    result.candidates.push({mode, xp, report});
    console.log(JSON.stringify({mode, xp, count, seed, rtp:report.rtp, below99:report.rtp < .99}));
    if (report.rtp < .99) {
      result.selected[mode] = {xp, report}; save(); break;
    }
    save();
  }
  if (!result.selected[mode]) throw new Error(`No result below 99% for ${mode}`);
}
config.version = 'sofia-ten-wilds-xp-first-below-99-v11';
result.config = config;
result.complete = true;
save();
console.log(JSON.stringify({complete:true, selected:Object.fromEntries(Object.entries(result.selected).map(([mode,r])=>[mode,{xp:r.xp,rtp:r.report.rtp}]))}));
