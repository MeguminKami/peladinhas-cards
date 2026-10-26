// Versioned game rules. Old games retain their original calculation.
export const FAIR_PROGRESSION_FROM = "2026-10-26T00:00:00.000Z";
export const FAIR_PROGRESSION = Object.freeze({
  speed: 2.6,
  gainCap: 5,
  lossCap: 0.6,
  performanceCap: 3.2,
  actionScale: 1.25,
  ovrGainCap: 2.5,
});
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const dimensions = {
  pace: "physical",
  shooting: "attack",
  passing: "passing",
  dribbling: "attack",
  defending: "defense",
  physical: "physical",
  goalkeeping: "goalkeeping",
  stamina: "physical",
  vision: "passing",
  positioning: "defense",
  teamwork: "passing",
  composure: "attack",
};
export function usesFairProgression(date) {
  const value = date?.toDate?.() || date;
  return (
    value != null &&
    Number.isFinite(+new Date(value)) &&
    +new Date(value) >= Date.parse(FAIR_PROGRESSION_FROM)
  );
}
export function contributionBonus(count) {
  const n = clamp(Number.isFinite(count) ? Math.floor(count) : 0, 0, 999);
  if (!n) return 0;
  if (n <= 3) return 0.3 + (n - 1) * 0.05;
  if (n <= 5) return 0.4 + (n - 3) * 0.2;
  return Math.min(1.5, 1.15 + (n - 6) * 0.1);
}
export function relativeGainFactor(difference, stars) {
  const anchors = [
    [-2, 0.25],
    [-1.5, 0.5],
    [-1, 0.85],
    [-0.75, 1],
  ];
  let factor = 1;
  if (difference <= -2) factor = 0.25;
  else
    for (let i = 1; i < anchors.length; i++)
      if (difference < anchors[i][0]) {
        const [a, x] = anchors[i - 1],
          [b, y] = anchors[i];
        factor = x + ((y - x) * (difference - a)) / (b - a);
        break;
      }
  return stars >= 3.5 ? Math.max(0.75, factor) : factor;
}
export function gameResultFactors(a) {
  const margin = clamp(
    Number.isFinite(a.goalMargin) ? Math.abs(a.goalMargin) : 0,
    0,
    5,
  );
  return a.outcome === 1
    ? { gain: 0.9 + 0.02 * margin, loss: 0.75 }
    : a.outcome === 0
      ? { gain: 0.75, loss: 1 }
      : a.outcome === -1
        ? { gain: 0.65 - 0.05 * margin, loss: 1.1 + 0.08 * margin }
        : { gain: 0.75, loss: 1 };
}
export function calculateFairGameDeltas(
  stats,
  a,
  { weights, settings = FAIR_PROGRESSION } = {},
) {
  const model = { ...FAIR_PROGRESSION, ...settings };
  const result = gameResultFactors(a);
  const goals = contributionBonus(a.goals) * model.actionScale;
  const assists = contributionBonus(a.assists) * model.actionScale;
  const values = Object.fromEntries(
    Object.keys(dimensions).map((key) => {
      const dimension =
        ["stamina", "composure"].includes(key) && Number.isFinite(a.attitude)
          ? "attitude"
          : dimensions[key];
      if (!Number.isFinite(a[dimension])) return [key, null];
      const stars = clamp(a[dimension], 0, 5);
      const relative = Number.isFinite(a.teamRatings?.[dimension])
        ? stars - a.teamRatings[dimension]
        : 0;
      const opponent = Number.isFinite(a.opponentRatings?.[dimension])
        ? stars - a.opponentRatings[dimension]
        : 0;
      const reference =
        1 + 0.15 * clamp(relative, 0, 1) + 0.05 * clamp(opponent, 0, 1);
      const performance =
        Math.min(
          model.performanceCap,
          Math.max(0, stars - 3) * model.speed * reference,
        ) * relativeGainFactor(relative, stars);
      const quality = 0.25 + 0.75 * clamp((stars - 2) / 1.5, 0, 1);
      const personal =
        (key === "shooting"
          ? goals
          : key === "passing"
            ? assists
            : key === "dribbling"
              ? Math.min(0.5, 0.25 * (goals + assists))
              : 0) * quality;
      const current = stats[key];
      let tier =
        current < 75 ? 1 : current < 85 ? 0.7 : current < 90 ? 0.4 : 0.12;
      if (current >= 90) tier *= clamp((99 - current) / 9, 0, 1);
      const gain = Math.min(model.gainCap, performance + personal) * tier;
      const loss =
        Math.max(0, 3 - stars) * 0.5 * (1 + 0.1 * clamp(-relative, 0, 1));
      return [key, { gain: Math.min(gain, 99 - current), loss }];
    }),
  );
  // The budget uses unrounded positive attribute gains and the player's own
  // OVR weights. Negative deltas are never reduced by this ceiling.
  if (weights) {
    const gain = Object.keys(values).reduce(
      (sum, key) =>
        sum + ((values[key]?.gain || 0) * (weights[key] || 0)) / 100,
      0,
    );
    if (gain > model.ovrGainCap)
      for (const key of Object.keys(values))
        if (values[key]) values[key].gain *= model.ovrGainCap / gain;
  }
  // Apply the result after budgeting. Otherwise different clipping at the cap
  // could give an individual attribute a larger gain in a draw than in a win.
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      value === null
        ? null
        : clamp(
            stats[key] +
              value.gain * result.gain -
              Math.min(model.lossCap, value.loss * result.loss),
            0,
            99,
          ) - stats[key],
    ]),
  );
}
