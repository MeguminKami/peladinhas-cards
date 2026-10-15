import {
  ATTRIBUTES,
  FEEDBACK,
  calculatePlayerStats,
  calculateOverall,
} from "../js/utils.js";
export function progressionScenario() {
  const initial = Object.fromEntries(
    ATTRIBUTES.map(([key]) => [key, (60 * 20) / 99]),
  );
  const ratings = Object.fromEntries(
    FEEDBACK.map(([key]) => [key, key === "goalkeeping" ? null : 4]),
  );
  const reference = Object.fromEntries(
    FEEDBACK.map(([key]) => [key, key === "goalkeeping" ? null : 3.8]),
  );
  const aggregates = [],
    rows = [{ games: 0, wins: 0, ovr: 60 }];
  let wins = 0;
  for (let games = 1; games <= 30; games++) {
    const outcome = [1, 1, -1, 1, 1, -1, 1, 1, -1, 1][(games - 1) % 10];
    if (outcome === 1) wins++;
    aggregates.push({
      ...ratings,
      goals: 3,
      assists: 2,
      outcome,
      goalMargin: outcome * 2,
      teamRatings: reference,
      opponentRatings: reference,
      teamOvr: 70,
      date: new Date(Date.UTC(2026, 0, games)),
      gameId: String(games),
    });
    const stats = calculatePlayerStats(initial, aggregates, { position: "AV" });
    rows.push({
      games,
      wins,
      ovr: calculateOverall(stats, undefined, "AV"),
      shooting: stats.shooting,
      passing: stats.passing,
      dribbling: stats.dribbling,
    });
  }
  return rows;
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/simulate-evolution.mjs"))
  console.table(progressionScenario());
