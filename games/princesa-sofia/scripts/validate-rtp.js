// Mede o RTP da configuracao atual (contrato em AGENTS.md: apresentar sempre os cinco modos).
//   npm.cmd run validate:rtp                    100 000 base, 100 000 Hunt, 10 000 compras de cada bonus
//   npm.cmd run validate:rtp -- --independent   o mesmo com outras seeds
//   npm.cmd run validate:rtp -- --large         1 000 000 base e Hunt
// Grava relatorios/rtp-<versao>-<tipo>.json. Medicao local: nao e certificacao do RTP real.
import { writeFileSync, mkdirSync } from 'node:fs';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/config.js';

const independent = process.argv.includes('--independent');
const large = process.argv.includes('--large');
if (process.argv.slice(2).some(arg => !['--independent', '--large'].includes(arg))) throw Error('Uso: npm.cmd run validate:rtp -- [--independent] [--large]');
const reports = [];
for (const [i, mode] of (large ? ['base', 'hunt'] : ['base', 'hunt', 'common', 'super', 'secret']).entries()) {
  const report = simulate({ mode, count: large ? 1000000 : mode === 'base' || mode === 'hunt' ? 100000 : 10000,
    seed: (independent ? 15723419 : large ? 7310011 : 20261031) + i * 1000003,
    onProgress: large ? p => { if (p.completed % 250000 === 0) console.log(JSON.stringify({ mode, completed: p.completed, rtp: p.rtp })); } : undefined });
  reports.push(report);
  console.log(JSON.stringify({ mode, entradas: report.count, rtp: report.rtp, retrigger: report.bonusRetriggerFrequency, bonusNaturais: report.naturalBonuses }));
}
const version = DEFAULT_CONFIG.version.match(/v\d+$/)?.[0] ?? DEFAULT_CONFIG.version;
const kind = large && independent ? 'large-independent' : large ? 'large' : independent ? 'independent' : 'validation';
mkdirSync(new URL('../relatorios/', import.meta.url), { recursive: true });
const output = new URL(`../relatorios/rtp-${version}-${kind}.json`, import.meta.url);
writeFileSync(output, JSON.stringify({ purpose: 'local-calibration-not-certification', sample: independent ? 'additional-seeds' : 'calibration-seeds',
  date: new Date().toISOString().slice(0, 10), config: DEFAULT_CONFIG, reports }, null, 2) + '\n');
console.log('\nModo       RTP');
for (const r of reports) console.log(`${r.mode.padEnd(10)} ${(r.rtp * 100).toFixed(3)}%`);
console.log(`\nGravado em relatorios/rtp-${version}-${kind}.json`);
