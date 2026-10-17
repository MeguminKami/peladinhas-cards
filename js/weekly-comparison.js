import { ATTRIBUTES, asDate, calculateOverallDetails } from "./utils.js";
import { applyEventRewards } from "./event-rules.js";
import { cardWeek, cardWeekBounds } from "./card-week.js";

// Use pre-bonus values, never stats minus boosts: the displayed value may be capped at 99.
export function permanentCardValues(
  source,
  { rewards = [], uid = source?.uid, date } = {},
) {
  if (!source) return { stats: null, ovr: null };
  let stats;
  if (
    Object.hasOwn(source, "permanentStats") &&
    source.permanentStats !== undefined
  )
    stats = source.permanentStats;
  else {
    const raw =
      source.gameStats || source.rawStats || source.progression?.stats;
    const cutoff =
      date ||
      asDate(source.sourceCutoffDate) ||
      asDate(source.closesAt) ||
      (source.weekId ? cardWeekBounds(source.weekId).closesAt : new Date());
    if (raw)
      stats = applyEventRewards(
        raw,
        rewards.filter((r) => r.reward?.statDuration === "permanent"),
        uid,
        cutoff,
      ).stats;
    else {
      const temporary = applyEventRewards(
        {},
        rewards.filter((r) => r.reward?.statDuration !== "permanent"),
        uid,
        cutoff,
      ).boosts;
      const permanent = applyEventRewards(
        {},
        rewards.filter((r) => r.reward?.statDuration === "permanent"),
        uid,
        cutoff,
      ).boosts;
      const unknownBoost =
        Object.values(source.eventBoosts || {}).some((value) => value !== 0) &&
        !ATTRIBUTES.every(
          ([key]) => (source.eventBoosts?.[key] || 0) === permanent[key],
        );
      // Without pre-bonus values, capped temporary boosts cannot be reversed safely.
      stats =
        unknownBoost || Object.values(temporary).some((value) => value !== 0)
          ? null
          : source.stats || null;
    }
  }
  if (!stats) return { stats: null, ovr: null };
  if (Number.isFinite(source.permanentOvr))
    return { stats, ovr: source.permanentOvr };
  if (ATTRIBUTES.every(([key]) => stats[key] === source.stats?.[key]))
    return { stats, ovr: source.ovr ?? null };
  const calculation = source.ovrCalculation || source.cardCalculation;
  // Replay each week's own formula and inactivity penalty, rather than today's settings.
  const ovr = ["stat-weights-v3", "position-weights-v4"].includes(
    calculation?.version,
  )
    ? calculateOverallDetails(
        stats,
        { weights: calculation.weights },
        null,
        calculation.inactivity || source.inactivity,
      ).ovr
    : null;
  return { stats, ovr };
}

export function weeklyComparison(current, previous, options = {}) {
  if (current?.weekId && previous?.weekId) {
    const priorWeek = cardWeek(
      new Date(+cardWeekBounds(current.weekId).opensAt - 1),
    ).weekId;
    if (previous.weekId !== priorWeek) previous = null;
  }
  const now = permanentCardValues(current, options),
    before = permanentCardValues(previous, { ...options, date: undefined });
  return {
    permanentStats: now.stats,
    permanentOvr: now.ovr,
    previousStats: before.stats,
    ovrDelta:
      Number.isFinite(now.ovr) && Number.isFinite(before.ovr)
        ? now.ovr - before.ovr
        : null,
  };
}
