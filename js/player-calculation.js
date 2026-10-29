import {
  asDate,
  participants,
  calculateInitialBaseline,
  calculatePlayerStatsDetails,
  calculateInactivity,
  calculateOverallDetails,
} from "./utils.js";
import { applyEventRewards } from "./event-rules.js";

// Current calculations deliberately have no dependency on weekly cards/history.
export function calculatePlayerCard({
  uid,
  initial,
  community,
  aggregates = [],
  games = [],
  rewards = [],
  weights,
  position,
  createdAt,
  date = new Date(),
}) {
  const eligibleGames = games.filter(
    (game) =>
      game.status === "closed" &&
      !game.deleting &&
      +asDate(game.closedAt || game.scheduledAt) <= +date,
  );
  const ownGames = new Set(
    eligibleGames
      .filter((game) => participants(game).includes(uid))
      .map((game) => game.id),
  );
  const progression = calculatePlayerStatsDetails(
    calculateInitialBaseline(initial, community),
    aggregates.filter(
      (row) => ownGames.has(row.gameId) && +asDate(row.date) <= +date,
    ),
    { weights, position },
  );
  const rawStats = progression.version === "per-game-growth-v3" ? progression.exactStats : progression.stats;
  const applied = applyEventRewards(rawStats, rewards, uid, date);
  const inactivity = calculateInactivity(uid, eligibleGames, createdAt, date);
  const overall = calculateOverallDetails(
    applied.stats,
    weights,
    position,
    inactivity,
  );
  return {
    // Presentation remains integer-based; calculations and persisted gameStats retain decimals.
    stats: Object.fromEntries(Object.entries(applied.stats).map(([key, value]) => [key, Math.round(value)])),
    exactStats: applied.stats,
    baseStats: Object.fromEntries(
      progression.rows.map((row) => [row.key, row.baseline]),
    ),
    rawStats,
    progression,
    eventBoosts: applied.boosts,
    rewardSpecials: applied.specials,
    inactivity,
    ovr: overall.ovr,
    ovrCalculation: overall,
  };
}
