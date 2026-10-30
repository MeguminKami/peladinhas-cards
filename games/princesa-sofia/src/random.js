// Reproducible local/test RNG. This is not a real-money production RNG.
export function createRandom(seed = 1) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new TypeError('Seed must be uint32');
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    snapshot: () => state,
  };
}

export function randomIndex(rng, length) {
  if (!Number.isSafeInteger(length) || length < 1) throw new RangeError('Empty random choice');
  const value = rng.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('RNG must return a value in [0,1)');
  return Math.floor(value * length);
}

export function weightedIndex(rng, weights) {
  let ticket = randomIndex(rng, weights.reduce((a, b) => a + b, 0));
  for (let i = 0; i < weights.length; i++) {
    if (ticket < weights[i]) return i;
    ticket -= weights[i];
  }
  throw new Error('Invalid weighted choice');
}
