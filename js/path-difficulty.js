// Reviewed manually against the dated audit; never adapts an accepted mission.
export const PATH_DIFFICULTY_REVISION = "2026-10-21-position-fusions";
export const PATH_GOAL_TARGETS = Object.freeze({
  goals: [[1,2,3],[1,2,3],[2,3,4]],
  mixedGoals: [[1,1,2],[1,1,2],[1,2,2]],
  assists: [[1,1,2],[1,1,2],[1,2,2]],
  contributions: [[2,3,4],[2,3,4],[3,4,5]],
  teamGoals: [[5,7,8],[6,7,9],[7,8,9]],
  conceded: [[8,7,5],[8,6,5],[7,6,5]],
});

// Icon keeps its existing step; Ultimate adds one further, route-aware requirement.
export function pathRareObjective(objective, advance, routeId = "") {
  if (advance <= 100 || objective.kind !== "conditions") return objective;
  const conditions = objective.conditions;
  let index = conditions.findIndex(row =>
    ["rating", "ratingMean"].includes(row.metric) && row.target <= 4.75);
  const rating = index >= 0;
  if (!rating) index = conditions.findIndex(row =>
    ["goals", "assists", "contributions", "teamGoals"].includes(row.metric));
  if (index < 0) throw Error("A missão rara precisa de um requisito graduável.");
  const icon = {
    ...objective,
    conditions: conditions.map((row, i) => i === index
      ? { ...row, target: row.target + (rating ? 0.25 : 1),
          ...(rating && row.target === 4.75 && row.comparison === "gt"
            ? { comparison: "gte" } : {}) }
      : row),
  };
  if (advance < 200) return icon;
  const rows = icon.conditions.map(row => ({ ...row }));
  const find = metric => rows.find(row => row.metric === metric);
  const increase = metric => {
    const row = find(metric);
    if (!row) return false;
    row.target++;
    return true;
  };
  const addAssist = () => {
    if (find("assists")) return increase("assists");
    rows.push({metric:"assists",target:1});
    return true;
  };
  const rate = criterion => {
    const row = rows.find(row => row.metric === "rating" && row.criterion === criterion && row.target <= 4.75);
    if (!row) return false;
    row.target += 0.25;
    if (row.target === 5 && row.comparison === "gt") row.comparison = "gte";
    return true;
  };
  let changed = false;
  if (routeId === "shooting")
    changed = find("goals")?.target >= 4 ? addAssist() : increase("goals");
  else if (routeId === "fusion-predator") changed = find("goals") ? addAssist() : increase("contributions");
  else if (["pace","dribbling","stamina","fusion-winger"].includes(routeId)) changed = increase("contributions");
  else if (["vision","fusion-maestro"].includes(routeId) && find("assists")?.target >= 2 && !find("goals")) {
    rows.push({metric:"goals",target:1}); changed = true;
  } else if (routeId === "composure") changed = increase("goals");
  else if (routeId === "fusion-keeper" && find("conceded")?.target > 5) {
    find("conceded").target--; changed = true;
  }
  const primary = {pace:"physical",shooting:"attack",passing:"passing",dribbling:"attack",defending:"defense",physical:"physical",goalkeeping:"goalkeeping",stamina:"physical",vision:"passing",positioning:"defense",teamwork:"attitude",composure:"attitude","fusion-predator":"attack","fusion-keeper":"goalkeeping","fusion-central":"defense","fusion-winger":"physical","fusion-maestro":"passing"}[routeId];
  if (!changed && primary) changed = rate(primary);
  if (!changed) {
    const row = rows.find(row => ["rating","ratingMean"].includes(row.metric) && row.target <= 4.75);
    if (row) {
      row.target += 0.25;
      if (row.target === 5 && row.comparison === "gt") row.comparison = "gte";
      changed = true;
    }
  }
  if (!changed) changed = ["goals","assists","contributions","teamGoals"].some(increase);
  if (!changed) {
    // Rating ceiling: add a meaningful action instead of requiring >5 stars.
    const minimum = (find("goals")?.target || 0) + (find("assists")?.target || 0);
    rows.push({metric:"contributions",target:Math.max(3,minimum+1)});
  }
  return {...icon, conditions:rows};
}
