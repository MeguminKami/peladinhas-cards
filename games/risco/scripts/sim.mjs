import { mkdir, writeFile } from 'node:fs/promises';
import { createRandom, createRound, resolveRound, timeAtMultiplier, MATH_VERSION } from '../src/engine.js';
const count = Number(process.argv.find(v => v.startsWith('--rounds='))?.split('=')[1] || 1000000);
const seed = process.argv.find(v => v.startsWith('--seed='))?.slice(7) || 'risco-validation-2026-11-05';
if (!Number.isSafeInteger(count) || count < 2) throw new Error('Amostra inválida');
const targets = [101, 150, 200, 500, 1000, 10000, 100000, 999900, null];
const rows = [];
for (const target of targets) {
  const rng = createRandom(`${seed}:${target ?? 'random'}`);
  let total = 0, squares = 0, instant = 0, maximum = 0;
  const distribution = { '1,00': 0, '1,01–1,99': 0, '2–9,99': 0, '10–99,99': 0, '100–999,99': 0, '1000–9999': 0 };
  for (let i = 0; i < count; i++) {
    const aim = target ?? 101 + Math.floor(rng() / 2 ** 52 * (999900 - 100));
    const round = createRound({ seed: `${seed}:${target ?? 'random'}:${i}`, betUnits: 100, autoCashoutCents: aim });
    const crash = round.crashCents;
    const gain = resolveRound(round, { elapsedMs: timeAtMultiplier(aim) }).payoutUnits / 100;
    total += gain; squares += gain * gain; maximum = Math.max(maximum, gain);
    if (crash === 100) instant++;
    distribution[crash === 100 ? '1,00' : crash < 200 ? '1,01–1,99' : crash < 1000 ? '2–9,99' : crash < 10000 ? '10–99,99' : crash < 100000 ? '100–999,99' : '1000–9999']++;
  }
  const mean = total / count;
  const error = 1.96 * Math.sqrt(Math.max(0, (squares - total * total / count) / (count - 1)) / count);
  rows.push({ strategy: target === null ? 'aleatório uniforme' : `${target / 100}×`, rounds: count, rtp: mean * 100, ci95Low: (mean - error) * 100, ci95High: (mean + error) * 100, instantFrequency: instant / count, maximum, distribution });
}
console.table(rows.map(({ distribution, ...row }) => row));
console.log('IC 95% normal aproximado. Caudas raras têm elevada incerteza, 1 M não garante ±0,2 pontos. Alvo teórico 99%, sem certificação.');
const report = { seed, version: MATH_VERSION, count, rows };
const dir = new URL('../relatorios/', import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(new URL('sim.json', dir), JSON.stringify(report, null, 2) + '\n');
await writeFile(new URL('sim.csv', dir), 'seed,version,strategy,rounds,rtp,ci95Low,ci95High,instantFrequency,maximum\n' + rows.map(r => [seed, MATH_VERSION, r.strategy, count, r.rtp, r.ci95Low, r.ci95High, r.instantFrequency, r.maximum].join(',')).join('\n') + '\n');
