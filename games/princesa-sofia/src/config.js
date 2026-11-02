export const MODES = Object.freeze(['base', 'common', 'super', 'secret']);
export const ENTRY_MODES = Object.freeze([...MODES, 'hunt']);
export const SYMBOLS = Object.freeze(['N1', 'N2', 'N3', 'N4', 'N5', 'P1', 'P2', 'P3', 'P4', 'P5']);
export const SCATTER = 'S';
export const WILD = 'W';
export const PPM = 1_000_000;

export function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

const SYMBOL_PAY100 = [
  [10, 20, 50, 100, 200, 500],
  [10, 20, 50, 100, 200, 500],
  [10, 20, 50, 100, 200, 1000],
  [20, 40, 70, 150, 300, 1000],
  [20, 40, 70, 150, 300, 1000],
  [50, 80, 150, 300, 1000, 5000],
  [50, 80, 150, 300, 1000, 5000],
  [80, 120, 250, 500, 1500, 7500],
  [80, 120, 250, 500, 1500, 10000],
  [100, 150, 500, 1000, 2500, 15000]
];

// Payments and XP use hundredths; probabilities use parts per million.
export const DEFAULT_CONFIG = deepFreeze({
  version: 'sofia-entry-clusters-balanced-hunt-v33',
  calibrated: false,
  columns: 6,
  rows: 5,
  tierMinimums: [5, 6, 8, 11, 14, 18],
  weights: [155000, 137000, 121000, 119000, 103000, 95000, 85000, 80000, 65000, 40000],
  pay100: SYMBOL_PAY100,
  xpPerCluster100: {
    normal: [300, 500, 700, 900, 1100, 1300],
    premium: [500, 700, 900, 1100, 1300, 1500],
  },
  xpThreshold100: { base: 4000, common: 1800, super: 1700, secret: 1800 },
  scatterPPM: {
    base: [30100, 20100, 6100, 1500, 400],
    common: [18000, 1800, 23000],
    super: [18000, 1800, 21000],
    secret: [18000, 1270, 18000],
  },
  pairPPM: 700000,
  premiumPairPPM: 450000,
  repeatPairPPM: 450000,
  extraCopyPPM: { normal: [180000, 50000, 10000], premium: [100000, 40000, 10000] },
  baseCopyScalePPM: 800000,
  maxWilds: 10,
  magic: {
    common: { startWilds: 2, wildCap: 10, startMultiplier: 1, rewardRolls: 1, wildGainWeights: [1000000, 0, 0], multiplierGainWeights: [1000000, 0, 0, 0] },
    super: { startWilds: 2, wildCap: 10, startMultiplier: 2, rewardRolls: 1, wildGainWeights: [1000000, 0, 0], multiplierGainWeights: [0, 1000000, 0, 0] },
    secret: { startWilds: 2, wildCap: 10, startMultiplier: 2, rewardRolls: 1, wildGainWeights: [0, 1000000, 0], multiplierGainWeights: [0, 1000000, 0, 0], multiplierGainCycle: [2, 3] },
  },
  baseWildWeights: [500000, 350000, 150000],
  bonusSpins: 12,
  buyPrices: { common: 95, super: 237, secret: 754 },
  bonusHunt: { spinCostMultiplier: 4, scatterMultiplier: 2.09 },
  maxWin100: 1000000,
});

export function validateConfig(c) {
  const integer = (n, min, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= min && n <= max;
  const vector = (xs, length, min, max) => Array.isArray(xs) && xs.length === length && xs.every(n => integer(n, min, max));
  if (typeof c.version !== 'string' || !c.version || typeof c.calibrated !== 'boolean' || c.columns !== 6 || c.rows !== 5 ||
      JSON.stringify(c.tierMinimums) !== '[5,6,8,11,14,18]' || c.maxWin100 !== 1000000 || c.bonusSpins !== 12 ||
      c.bonusHunt?.spinCostMultiplier !== 4 ||
      !Number.isFinite(c.bonusHunt?.scatterMultiplier) || c.bonusHunt.scatterMultiplier <= 1 || c.bonusHunt.scatterMultiplier > 6 ||
      !vector(c.weights, 10, 0, PPM) || c.weights.reduce((a, b) => a + b, 0) !== PPM ||
      !Array.isArray(c.pay100) || c.pay100.length !== 10 || c.pay100.some(xs => !vector(xs, 6, 1, c.maxWin100)) ||
      c.pay100.some(xs => xs.some((v, i) => i > 0 && v <= xs[i - 1])) ||
      !['normal', 'premium'].every(type => vector(c.xpPerCluster100?.[type], 6, 100, 1000000) && c.xpPerCluster100[type].every((v, i, row) => v % 100 === 0 && (!i || v > row[i - 1]))) ||
      !integer(c.premiumPairPPM, 0, PPM) || !integer(c.pairPPM, 0, PPM) || !integer(c.repeatPairPPM, 0, PPM) || c.maxWilds !== 10 ||
      !integer(c.baseCopyScalePPM, 0, PPM) ||
      !['normal', 'premium'].every(type => vector(c.extraCopyPPM?.[type], 3, 0, PPM)) ||
      !vector(c.baseWildWeights, 3, 0, PPM) || c.baseWildWeights.reduce((a, b) => a + b, 0) !== PPM) {
    throw new TypeError('Invalid mathematical configuration');
  }
  if ('bonusPay100' in c || c.pay100.some((row, i) => i > 0 && row.some((v, tier) => v < c.pay100[i - 1][tier]))) throw new TypeError('Payouts must not decrease by symbol and use one shared table');
  for (const mode of ['common', 'super', 'secret']) {
    const rule = c.magic?.[mode];
    if (rule?.multiplierGainCycle !== undefined && !vector(rule.multiplierGainCycle, 2, 1, 4)) throw new TypeError('Invalid multiplier gain cycle');
    if (!rule || !integer(rule.startWilds, 1, c.maxWilds) || rule.wildCap !== c.maxWilds || !integer(rule.startMultiplier, 1, 1000) || !integer(rule.rewardRolls, 1, 2) || ![[rule.wildGainWeights,3], [rule.multiplierGainWeights,4]].every(([xs,n]) => vector(xs, n, 0, PPM) && xs.reduce((a,b) => a+b, 0) === PPM)) throw new TypeError('Invalid magic progression');
  }
  for (const mode of MODES) {
    if (!integer(c.xpThreshold100?.[mode], 1, 1000000000) ||
        !vector(c.scatterPPM?.[mode], mode === 'base' ? 5 : 3, 0, PPM)) throw new TypeError('Invalid mode configuration');
  }
  if (!integer(c.buyPrices?.common, 80, 100) || !integer(c.buyPrices?.super, 200, 250) || !integer(c.buyPrices?.secret, 1, 800)) {
    throw new TypeError('Bonus price outside its permitted range');
  }
  return c;
}

export function entryCostMultiplier(mode, config = DEFAULT_CONFIG) {
  if (!ENTRY_MODES.includes(mode)) throw new TypeError('Unknown entry mode');
  return mode === 'base' ? 1 : mode === 'hunt' ? config.bonusHunt.spinCostMultiplier : config.buyPrices[mode];
}
