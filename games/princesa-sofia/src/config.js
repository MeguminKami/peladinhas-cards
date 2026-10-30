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
  [
    26,
    26,
    26,
    26,
    26,
    64
  ],
  [
    26,
    26,
    26,
    26,
    26,
    81
  ],
  [
    26,
    26,
    26,
    26,
    26,
    96
  ],
  [
    26,
    26,
    26,
    26,
    32,
    130
  ],
  [
    26,
    26,
    26,
    26,
    43,
    162
  ],
  [
    26,
    26,
    26,
    26,
    64,
    258
  ],
  [
    26,
    26,
    26,
    26,
    96,
    387
  ],
  [
    26,
    26,
    26,
    32,
    130,
    515
  ],
  [
    26,
    26,
    26,
    40,
    162,
    645
  ],
  [
    26,
    26,
    26,
    64,
    258,
    967
  ]
];

// Payments and XP use hundredths; probabilities use parts per million.
export const DEFAULT_CONFIG = deepFreeze({
  version: 'sofia-xp-evolution-6-52-25-v2',
  calibrated: false,
  columns: 6,
  rows: 5,
  tierMinimums: [5, 6, 8, 11, 15, 18],
  weights: [180000, 160000, 140000, 120000, 100000, 90000, 70000, 60000, 50000, 30000],
  pay100: SYMBOL_PAY100,
  bonusPay100: {
    "common": [
      [
        29,
        29,
        84,
        303,
        1203,
        4810
      ],
      [
        29,
        34,
        100,
        363,
        1445,
        6014
      ],
      [
        29,
        42,
        132,
        484,
        1922,
        7219
      ],
      [
        29,
        57,
        166,
        603,
        2407,
        9624
      ],
      [
        29,
        77,
        215,
        785,
        3129,
        12032
      ],
      [
        45,
        113,
        333,
        1203,
        4810,
        19251
      ],
      [
        68,
        169,
        498,
        1803,
        7219,
        28874
      ],
      [
        91,
        226,
        662,
        2407,
        9624,
        38497
      ],
      [
        113,
        283,
        830,
        3008,
        12032,
        48120
      ],
      [
        169,
        470,
        1324,
        4810,
        19251,
        72181
      ]
    ],
    "super": [
      [
        52,
        52,
        104,
        375,
        1494,
        5990
      ],
      [
        52,
        52,
        123,
        448,
        1799,
        7487
      ],
      [
        52,
        52,
        163,
        601,
        2401,
        8985
      ],
      [
        52,
        70,
        203,
        746,
        2999,
        11980
      ],
      [
        52,
        93,
        266,
        967,
        3893,
        14981
      ],
      [
        55,
        141,
        414,
        1494,
        5990,
        23964
      ],
      [
        86,
        206,
        618,
        2247,
        8985,
        35947
      ],
      [
        114,
        280,
        820,
        2999,
        11980,
        47932
      ],
      [
        141,
        350,
        1026,
        3745,
        14981,
        59912
      ],
      [
        206,
        585,
        1644,
        5990,
        23964,
        89866
      ]
    ],
    "secret": [
      [
        30,
        30,
        30,
        105,
        404,
        1618
      ],
      [
        30,
        30,
        36,
        123,
        486,
        2025
      ],
      [
        30,
        30,
        47,
        167,
        648,
        2432
      ],
      [
        30,
        30,
        57,
        205,
        811,
        3239
      ],
      [
        30,
        30,
        73,
        263,
        1052,
        4051
      ],
      [
        30,
        40,
        115,
        404,
        1618,
        6482
      ],
      [
        30,
        59,
        172,
        605,
        2432,
        9722
      ],
      [
        31,
        76,
        224,
        811,
        3239,
        12964
      ],
      [
        40,
        100,
        280,
        1014,
        4051,
        16204
      ],
      [
        59,
        164,
        444,
        1618,
        6482,
        24308
      ]
    ]
  },
  xpPerCell100: [100, 102, 104, 106, 108, 110, 112, 114, 116, 118],
  xpThreshold100: { base: 3900, common: 1880, super: 1710, secret: 1650 },
  scatterPPM: {
    base: [30100, 20100, 6550, 1500, 400],
    common: [30000, 12000, 3000],
    super: [30000, 12000, 3000],
    secret: [30000, 12000, 3000],
  },
  pairPPM: 520000,
  repeatPairPPM: 250000,
  maxWilds: 6,
  baseWildWeights: [500000, 350000, 150000],
  bonusSpins: 12,
  buyPrices: { common: 80, super: 225, secret: 316 },
  bonusHunt: { spinCostMultiplier: 4, scatterMultiplier: 1.94 },
  maxWin100: 1000000,
});

export function validateConfig(c) {
  const integer = (n, min, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= min && n <= max;
  const vector = (xs, length, min, max) => Array.isArray(xs) && xs.length === length && xs.every(n => integer(n, min, max));
  if (typeof c.version !== 'string' || !c.version || typeof c.calibrated !== 'boolean' || c.columns !== 6 || c.rows !== 5 ||
      JSON.stringify(c.tierMinimums) !== '[5,6,8,11,15,18]' || c.maxWin100 !== 1000000 || c.bonusSpins !== 12 ||
      c.bonusHunt?.spinCostMultiplier !== 4 ||
      !Number.isFinite(c.bonusHunt?.scatterMultiplier) || c.bonusHunt.scatterMultiplier <= 1 || c.bonusHunt.scatterMultiplier > 3 ||
      !vector(c.weights, 10, 0, PPM) || c.weights.reduce((a, b) => a + b, 0) !== PPM ||
      !Array.isArray(c.pay100) || c.pay100.length !== 10 || c.pay100.some(xs => !vector(xs, 6, 1, c.maxWin100)) ||
      c.pay100.some(xs => xs.some((v, i) => i > 0 && v < xs[i - 1])) ||
      !vector(c.xpPerCell100, 10, 1, 1000000) || !integer(c.pairPPM, 0, PPM) || !integer(c.repeatPairPPM, 0, PPM) || !integer(c.maxWilds, 1, 30) ||
      !vector(c.baseWildWeights, 3, 0, PPM) || c.baseWildWeights.reduce((a, b) => a + b, 0) !== PPM) {
    throw new TypeError('Invalid mathematical configuration');
  }
  if (c.bonusPay100 && ['common', 'super', 'secret'].some(mode => !c.bonusPay100[mode])) throw new TypeError('Missing bonus payout table');
  for (const table of Object.values(c.bonusPay100 ?? {})) {
    if (!Array.isArray(table) || table.length !== 10 || table.some(xs => !vector(xs, 6, 1, c.maxWin100) || xs.some((v, i) => i > 0 && v < xs[i - 1]))) throw new TypeError('Invalid bonus payout table');
  }
  for (const mode of MODES) {
    if (!integer(c.xpThreshold100?.[mode], 1, 1000000000) ||
        !vector(c.scatterPPM?.[mode], mode === 'base' ? 5 : 3, 0, PPM)) throw new TypeError('Invalid mode configuration');
  }
  if (!integer(c.buyPrices?.common, 80, 100) || !integer(c.buyPrices?.super, 200, 240) || !integer(c.buyPrices?.secret, 300)) {
    throw new TypeError('Bonus price outside its permitted range');
  }
  return c;
}

export function entryCostMultiplier(mode, config = DEFAULT_CONFIG) {
  if (!ENTRY_MODES.includes(mode)) throw new TypeError('Unknown entry mode');
  return mode === 'base' ? 1 : mode === 'hunt' ? config.bonusHunt.spinCostMultiplier : config.buyPrices[mode];
}
