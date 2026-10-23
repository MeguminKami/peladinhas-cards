import { FEEDBACK, calculateWeeklyTopPlayers, asDate } from "./utils.js";
import { performanceWeek } from "./performance-week.js";
import { matchStars } from "./match-stars.js";
const valid = (value) => Number.isFinite(value) && value >= 0 && value <= 5;
const format = (value) =>
  value.toLocaleString("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
export function matchComponentAverages(summary = {}) {
  const values = FEEDBACK.filter(([key]) => key !== "goalkeeping")
    .map(([key]) => summary?.[key])
    .filter(valid);
  const withoutGoalkeeping = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
  const hasGoalkeeping =
    summary?.goalkeepingEligible !== false && valid(summary?.goalkeeping);
  return {
    withoutGoalkeeping,
    withGoalkeeping:
      values.length && hasGoalkeeping
        ? (values.reduce((sum, value) => sum + value, 0) +
            summary.goalkeeping) /
          (values.length + 1)
        : null,
    count: values.length,
  };
}
export function matchRatingSummary(summary) {
  const result = matchComponentAverages(summary);
  if (result.withoutGoalkeeping === null) return matchStars(null);
  const label = `Média de ${result.count} de 6 componentes, sem Guarda-redes: ${format(result.withoutGoalkeeping)} de 5 estrelas${result.withGoalkeeping === null ? "" : `. Com Guarda-redes: ${format(result.withGoalkeeping)} de 5 estrelas`}.`;
  return `<span class="match-rating-average" role="img" aria-label="${label}" title="${label}">${matchStars(result.withoutGoalkeeping)}${result.withGoalkeeping === null ? "" : `<small class="match-rating-with-gk">(${format(result.withGoalkeeping)} com GR)</small>`}</span>`;
}

// Average each game first: every game has equal weight in multi-game summaries.
export function matchSeriesAverages(rows = []) {
  const results = rows
    .map(matchComponentAverages)
    .filter((row) => row.withoutGoalkeeping !== null);
  if (!results.length)
    return { withoutGoalkeeping: null, withGoalkeeping: null, count: 0 };
  return {
    withoutGoalkeeping:
      results.reduce((sum, row) => sum + row.withoutGoalkeeping, 0) /
      results.length,
    withGoalkeeping: results.some((row) => row.withGoalkeeping !== null)
      ? results.reduce(
          (sum, row) => sum + (row.withGoalkeeping ?? row.withoutGoalkeeping),
          0,
        ) / results.length
      : null,
    count: results.length,
  };
}
export function matchAverageSummary(
  result,
  { digits = 1, label = "Média das componentes" } = {},
) {
  if (result.withoutGoalkeeping === null) return "—";
  const numeric = (value) =>
    value.toLocaleString("pt-PT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  const description = `${label}, sem Guarda-redes: ${numeric(result.withoutGoalkeeping)} de 5${result.withGoalkeeping === null ? "" : `. Incluindo Guarda-redes quando aplicável: ${numeric(result.withGoalkeeping)} de 5`}.`;
  return `<span class="match-rating-average" role="img" aria-label="${description}" title="${description}"><span class="match-rating-number">${numeric(result.withoutGoalkeeping)}</span>${result.withGoalkeeping === null ? "" : `<small class="match-rating-with-gk">(${numeric(result.withGoalkeeping)} com GR)</small>`}</span>`;
}
export const matchRatingSeries = (rows, options) =>
  matchAverageSummary(matchSeriesAverages(rows), options);
export function componentWeeklyTopPlayers(players, date = new Date()) {
  // Feed the existing weekly eligibility and sort routine a display-only projection.
  // Restore the original player/aggregate objects in the result.
  const originals = new Map(players.map((player) => [player.uid, player]));
  const projected = players.map((player) => ({
    ...player,
    aggregates: (player.aggregates || []).flatMap((row) => {
      const mean = matchComponentAverages(row).withoutGoalkeeping;
      return mean === null ? [] : [{ ...row, overall: mean }];
    }),
  }));
  const period = performanceWeek(date);
  return calculateWeeklyTopPlayers(projected, date).map((row) => {
    const player = originals.get(row.uid);
    const games = (player.aggregates || []).filter(
      (game) =>
        +asDate(game.date) >= +period.startsAt &&
        +asDate(game.date) < +period.endsAt &&
        game.count >= 2,
    );
    return {
      ...player,
      weeklyPerformance: row.weeklyPerformance,
      weeklyComponentAverages: matchSeriesAverages(games),
    };
  });
}
