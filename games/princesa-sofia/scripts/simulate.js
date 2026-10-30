import { writeFileSync } from 'node:fs';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, MODES, ENTRY_MODES } from '../src/config.js';

const options = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  if (!['--mode', '--count', '--seed', '--bet-units', '--out'].includes(key) || !process.argv[i + 1] || options[key] !== undefined) {
    throw new Error('Usage: npm.cmd run simulate -- --mode base|hunt|common|super|secret|all --count N --seed UINT32 [--bet-units N] [--out result.json]');
  }
  options[key] = process.argv[i + 1];
}
const mode = options['--mode'] ?? 'all';
if (mode !== 'all' && !ENTRY_MODES.includes(mode)) throw new Error('Unknown simulation mode');
const seed = Number(options['--seed'] ?? 20261030);
if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Seed must be uint32');
const count = options['--count'] === undefined ? null : Number(options['--count']);
const reports = [];
for (const [i, selected] of (mode === 'all' ? MODES : [mode]).entries()) {
  const report = simulate({
    mode: selected,
    count: count ?? (selected === 'base' || selected === 'hunt' ? 1000000 : 100000),
    seed: (seed + i * 1000003) >>> 0,
    betUnits: Number(options['--bet-units'] ?? 100),
    onProgress: p => process.stderr.write(`${p.mode}: ${p.completed}/${p.count}; RTP ${(100 * p.rtp).toFixed(3)}%\n`),
  });
  reports.push(report);
}
// A failed round throws and no apparently complete report is written.
const output = JSON.stringify({ purpose: 'local-simulation-not-rtp-certification', config: DEFAULT_CONFIG, reports }, null, 2);
if (options['--out']) writeFileSync(options['--out'], `${output}\n`, 'utf8');
process.stdout.write(`${options['--out'] ? JSON.stringify({ output: options['--out'], results: reports.map(r => ({ mode: r.mode, count: r.count, rtp: r.rtp, precisionGatePassed: r.precisionGatePassed })) }, null, 2) : output}\n`);
