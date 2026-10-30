import { createHash } from 'node:crypto';
import { DEFAULT_CONFIG, MODES, entryCostMultiplier } from './config.js';
import { createEngine } from './engine.js';

export function simulate({ mode = 'base', count, seed = 1, betUnits = 100, config = DEFAULT_CONFIG, onProgress } = {}) {
  if (!Number.isSafeInteger(count) || count < 2 || count > 100000000) throw new RangeError('Simulation count must be between 2 and 100000000');
  const engine = createEngine({ config, seed });
  const samples = new Float64Array(count);
  let mean = 0, m2 = 0, cost = 0, paid = 0, creditedUnits = 0, maxWin = 0, returns = 0, profits = 0;
  let hitSpins = 0, baseHitSpins = 0;
  let spins = 0, cascades = 0, magics = 0, retriggers = 0, addedSpins = 0, maxLevel = 0, maxDuration = 0;
  const contributions100 = Object.fromEntries(MODES.map(m => [m, 0]));
  const naturalBonuses = { common: 0, super: 0, secret: 0 };
  const batches = [];
  let batchPay = 0, batchCost = 0, batchN = 0;
  const batchSize = Math.max(1, Math.ceil(count / 20));
  for (let i = 0; i < count; i++) {
    const { state, settlement } = engine.play({ mode, betUnits });
    const normalized = state.paid100 / 100;
    const price = entryCostMultiplier(mode, engine.config);
    const ratio = normalized / price;
    samples[i] = normalized;
    const delta = ratio - mean;
    mean += delta / (i + 1);
    m2 += delta * (ratio - mean);
    cost += price;
    paid += normalized;
    creditedUnits += settlement.creditedUnits;
    maxWin += Number(state.maxWin);
    returns += Number(state.paid100 > 0);
    profits += Number(normalized > price);
    spins += state.spins; hitSpins += state.hitSpins; baseHitSpins += state.baseHitSpins;
    cascades += state.cascades;
    magics += state.magicActivations;
    retriggers += state.retriggers;
    addedSpins += state.addedSpins;
    maxLevel = Math.max(maxLevel, state.maxMagicLevel);
    maxDuration = Math.max(maxDuration, state.bonusSpinsPlayed);
    for (const m of MODES) contributions100[m] += state.paidByMode100[m];
    if ((mode === 'base' || mode === 'hunt') && state.bonusType) naturalBonuses[state.bonusType]++;
    batchPay += normalized; batchCost += price; batchN++;
    if (batchN === batchSize || i === count - 1) {
      batches.push({ count: batchN, rtp: batchPay / batchCost });
      batchPay = batchCost = batchN = 0;
      onProgress?.({ mode, completed: i + 1, count, rtp: mean });
    }
  }
  if (!Number.isSafeInteger(cost * betUnits) || !Number.isSafeInteger(creditedUnits)) throw new RangeError('Simulation credit totals exceed safe integers');
  const variance = m2 / (count - 1), se = Math.sqrt(variance / count);
  samples.sort();
  const quantile = p => samples[Math.floor((count - 1) * p)];
  const interval = z => [mean - z * se, mean + z * se];
  return {
    configVersion: engine.config.version, configHash: createHash('sha256').update(JSON.stringify(engine.config)).digest('hex'),
    calibrated: engine.config.calibrated, mode, count, seed, rng: 'mulberry32', betUnits,
    totalCostBaseBets: cost, totalReturnBaseBets: paid, rtp: mean,
    settledCreditRtp: creditedUnits / (cost * betUnits),
    sampleVariance: variance, standardError: se, confidence95Approx: interval(1.96),
    confidenceJoint95Approx: interval(2.50),
    precisionGatePassed: interval(2.50)[0] >= .98 && interval(2.50)[1] <= 1,
    // Passing this numerical gate alone does not certify rare-event coverage.
    nonzeroReturnFrequency: returns / count, profitFrequency: profits / count,
    meanReturnBaseBets: paid / count, maxWinCount: maxWin,
    quantilesBaseBets: { median: quantile(.5), p90: quantile(.9), p95: quantile(.95), p99: quantile(.99), p999: quantile(.999) },
    hitSpins, hitSpinFrequency: hitSpins / spins, baseHitSpinFrequency: mode === 'base' || mode === 'hunt' ? baseHitSpins / count : null,
    spins, cascades, magicActivations: magics, retriggers, addedSpins, maxMagicLevel: maxLevel, maxBonusDuration: maxDuration,
    naturalBonuses, contributionsRtp: Object.fromEntries(MODES.map(m => [m, contributions100[m] / 100 / cost])),
    batches,
  };
}
