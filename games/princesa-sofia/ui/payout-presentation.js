// Win-number scale, driven by the hit multiple: cluster base pay × WILD
// multiplier, in bet units (rawPay100 / 100). Named steps up to 200×; past
// that the number keeps growing and the colour keeps shifting with every
// doubling, so ever-larger hits always look different.
const PRIZE_TIERS = [
  { min: 200, tier: 'colossal' },
  { min: 100, tier: 'huge' },
  { min: 50, tier: 'mega' },
  { min: 20, tier: 'epic' },
  { min: 5, tier: 'large' },
  { min: 1, tier: 'medium' },
  { min: 0, tier: 'small' },
];

export function prizeTier(multiple) {
  return PRIZE_TIERS.find(step => multiple >= step.min).tier;
}

// Base of the colossal step, mirrored by the data-tier rules in presentation.css.
const COLOSSAL = { min: 200, size: 68, hue: 300 };

export function prizeStyle(multiple) {
  if (!(multiple > COLOSSAL.min)) return null;
  const growth = Math.log2(multiple / COLOSSAL.min);
  return {
    fontSize: `${Math.min(COLOSSAL.size + 8 * growth, 96)}px`,
    color: `hsl(${(COLOSSAL.hue - 15 * growth + 360) % 360} 100% 76%)`,
  };
}

// Split only the already credited event amount. Difference-of-floors preserves
// the session's single cumulative rounding, including fractions and MAX WIN.
export function hitCredits(hits, credited100, previousPaid100, betUnits) {
  let remaining = credited100, cumulative = previousPaid100;
  const units = value => BigInt(value) * BigInt(betUnits) / 100n;
  return hits.map(hit => {
    const amount100 = Number(BigInt(hit.rawPay100) < BigInt(remaining) ? BigInt(hit.rawPay100) : BigInt(remaining));
    const receivedUnits = Number(units(cumulative + amount100) - units(cumulative));
    cumulative += amount100; remaining -= amount100;
    return { amount100, receivedUnits };
  });
}
