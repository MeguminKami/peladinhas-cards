// Reviewed manually against the dated audit; never adapts an accepted mission.
export const PATH_DIFFICULTY_REVISION = "2026-10-20-rare-step";
export const PATH_GOAL_TARGETS = Object.freeze({
  goals: [[1,2,3],[1,2,3],[2,3,4]],
  mixedGoals: [[1,1,2],[1,1,2],[1,2,2]],
  assists: [[1,1,2],[1,1,2],[1,2,2]],
  contributions: [[2,3,4],[2,3,4],[3,4,5]],
  teamGoals: [[5,7,8],[6,7,9],[7,8,9]],
  conceded: [[8,7,5],[8,6,5],[7,6,5]],
});

// One small increase for both rare advances; never compound every requirement.
export function pathRareObjective(objective, advance) {
  if (advance <= 100 || objective.kind !== "conditions") return objective;
  const conditions = objective.conditions;
  let index = conditions.findIndex(row =>
    ["rating", "ratingMean"].includes(row.metric) && row.target <= 4.75);
  const rating = index >= 0;
  if (!rating) index = conditions.findIndex(row =>
    ["goals", "assists", "contributions", "teamGoals"].includes(row.metric));
  if (index < 0) throw Error("A missão rara precisa de um requisito graduável.");
  return {
    ...objective,
    conditions: conditions.map((row, i) => i === index
      ? { ...row, target: row.target + (rating ? 0.25 : 1),
          ...(rating && row.target === 4.75 && row.comparison === "gt"
            ? { comparison: "gte" } : {}) }
      : row),
  };
}
