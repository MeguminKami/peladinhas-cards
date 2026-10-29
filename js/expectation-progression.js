// Shared, deterministic model. Activation follows the match closing date, not vote time.
export const EXPECTATION_PROGRESSION_FROM = "2026-10-29T00:00:00.000Z";
export const ASSISTS_PER_GOAL = 44 / 76;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const noteCurve = [
  [0, 3],
  [60, 3],
  [75, 3.6],
  [80, 3.8],
  [85, 4],
  [90, 4.3],
  [95, 4.7],
  [98, 4.9],
  [99, 5],
];
const gainCurve = [
  [0, 3],
  [60, 3],
  [75, 2.5],
  [85, 1.8],
  [90, 1],
  [95, 0.7],
  [98, 0.5],
  [99, 0],
];
const lossCurve = [
  [0, 1],
  [60, 1],
  [75, 3],
  [85, 6.5],
  [90, 8],
  [95, 9],
  [98, 9.75],
  [99, 10],
];
const attitudeGainCurve = [
  [0, 1.2],
  [75, 1.2],
  [80, 1],
  [85, 0.85],
  [90, 0.75],
  [99, 0.75],
];
function interpolate(value, points) {
  const n = clamp(value, 0, 99);
  for (let i = 1; i < points.length; i++) {
    if (n <= points[i][0]) {
      const [x, a] = points[i - 1],
        [y, b] = points[i];
      return a + ((b - a) * (n - x)) / (y - x);
    }
  }
  return points.at(-1)[1];
}
export const expectedRating = (value) => interpolate(value, noteCurve);
export const expectedGoals = (value) =>
  1.5 * 2 ** ((clamp(value, 0, 99) - 80) / 12);
export const expectedAssists = (value) =>
  ASSISTS_PER_GOAL * expectedGoals(value);
export function usesExpectationProgression(date) {
  const value = date?.toDate?.() || date;
  return (
    value != null &&
    Number.isFinite(+new Date(value)) &&
    +new Date(value) >= Date.parse(EXPECTATION_PROGRESSION_FROM)
  );
}
// Sources, gain evidence, loss evidence, positive cap, negative cap.
export const EXPECTATION_ATTRIBUTES = Object.freeze({
  pace: {
    sources: { physical: 1 },
    gain: 0.12,
    loss: 0.05,
    gainCap: 0.2,
    lossCap: 0.2,
  },
  shooting: {
    sources: { attack: 1 },
    gain: 1,
    loss: 1,
    gainCap: 4,
    lossCap: 4.8,
  },
  passing: {
    sources: { passing: 1 },
    gain: 1,
    loss: 0.85,
    gainCap: 4,
    lossCap: 4,
  },
  dribbling: {
    sources: { attack: 1 },
    gain: 0.5,
    loss: 0.2,
    gainCap: 2,
    lossCap: 0.8,
  },
  defending: {
    sources: { defense: 1 },
    gain: 1,
    loss: 0.65,
    gainCap: 4,
    lossCap: 2.4,
  },
  physical: {
    sources: { physical: 1 },
    gain: 0.8,
    loss: 0.45,
    gainCap: 3,
    lossCap: 1.6,
  },
  goalkeeping: {
    sources: { goalkeeping: 1 },
    gain: 1,
    loss: 0.7,
    gainCap: 4,
    lossCap: 2.4,
  },
  stamina: {
    sources: { physical: 1 },
    gain: 0.5,
    loss: 0.2,
    gainCap: 2,
    lossCap: 0.64,
  },
  vision: {
    sources: { passing: 1 },
    gain: 0.6,
    loss: 0.25,
    gainCap: 2,
    lossCap: 0.8,
  },
  positioning: {
    sources: { defense: 1 },
    gain: 0.6,
    loss: 0.25,
    gainCap: 2,
    lossCap: 0.8,
  },
  teamwork: {
    sources: { attitude: 0.6, passing: 0.4 },
    gain: 0.75,
    loss: 0.45,
    gainCap: 3,
    lossCap: 1.6,
  },
  composure: {
    sources: { attitude: 0.8, overall: 0.2 },
    gain: 0.75,
    loss: 0.35,
    gainCap: 3,
    lossCap: 1.2,
  },
});

function observedRating(aggregate, sources) {
  // A missing dimension is omitted, never interpreted as a zero-star vote.
  const entries = Object.entries(sources).filter(([key]) =>
    Number.isFinite(aggregate[key]),
  );
  const weight = entries.reduce((sum, [, w]) => sum + w, 0);
  if (!weight) return null;
  let value = 0,
    confidence = 0;
  for (const [key, w] of entries) {
    const count = aggregate.ratingCounts?.[key] ?? aggregate.count;
    const q = Number.isFinite(count) ? clamp(count / 5, 0, 1) : 0;
    value += (clamp(aggregate[key], 0, 5) * w) / weight;
    confidence += (q * w) / weight;
  }
  return { value, confidence };
}

export function calculateExpectationGameDeltas(stats, aggregate) {
  return Object.fromEntries(
    Object.entries(EXPECTATION_ATTRIBUTES).map(([key, rule]) => {
      const observation = observedRating(aggregate, rule.sources);
      if (
        !observation ||
        (key === "goalkeeping" && aggregate.goalkeepingEligible === false)
      )
        return [key, null];
      const current = stats[key];
      if (!Number.isFinite(current)) return [key, null];
      const level = clamp(current, 0, 99);
      let balance = clamp(
        (observation.value - expectedRating(level)) / 2,
        -1,
        1,
      );
      if (key === "shooting" || key === "passing") {
        const actions = aggregate[key === "shooting" ? "goals" : "assists"];
        // Missing statistics are not equivalent to a recorded zero contribution.
        if (Number.isFinite(actions) && actions >= 0) {
          const expected =
            key === "shooting" ? expectedGoals(level) : expectedAssists(level);
          const difference = actions - expected;
          balance =
            0.6 * balance + (0.4 * difference) / (1 + Math.abs(difference));
        }
      }
      const gainEvidence = ["teamwork", "composure"].includes(key)
        ? interpolate(level, attitudeGainCurve)
        : rule.gain;
      const delta =
        balance > 0
          ? Math.min(1, balance / 0.3) *
            interpolate(level, gainCurve) *
            gainEvidence
          : balance * interpolate(level, lossCurve) * rule.loss * 0.8;
      const bounded =
        clamp(delta, -rule.lossCap, rule.gainCap) * observation.confidence;
      return [key, clamp(current + bounded, 0, 99) - current];
    }),
  );
}
