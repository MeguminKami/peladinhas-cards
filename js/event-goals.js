export const MAX_EVENT_GOALS = 12;
export const isGoalList = (objective) => objective?.metric === "all";
// Stable identifiers survive edits/reordering and migration from the old editors.
export function objectiveGoals(objective) {
  if (isGoalList(objective)) return objective.goals || [];
  if (objective?.metric === "combined") return [
    { ...objective.results, id:"legacy-results" },
    { ...objective.ratings, id:"legacy-ratings" },
  ];
  return objective ? [{...objective, id:objective.id || "legacy-primary"}] : [];
}
