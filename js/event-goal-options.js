import { TOTAL_OBJECTIVES, isLifetimeObjective } from "./event-totals.js";

// Keep stored metrics compatible with existing missions. The editor separates
// what is counted from when counting starts.
export function goalOptions(objectives) {
  const entries = Object.entries(objectives).filter(([id]) => !["all", "combined"].includes(id) && !TOTAL_OBJECTIVES[id]);
  return entries.map(([id, label]) => ({id, label, historical:Object.keys(TOTAL_OBJECTIVES).find(key => !TOTAL_OBJECTIVES[key].position && TOTAL_OBJECTIVES[key].metric === id)}))
    .concat(Object.entries(TOTAL_OBJECTIVES).filter(([id]) => !entries.some(([key]) => !TOTAL_OBJECTIVES[id].position && TOTAL_OBJECTIVES[id].metric === key))
      .map(([id, definition]) => ({id, label:definition.label.replace(/^Total de /, ""), historical:id})));
}
export function goalSelection(goal, choices) {
  return {metric:choices.find(choice => choice.id === goal.metric || choice.historical === goal.metric)?.id || goal.metric,
    countFrom:isLifetimeObjective(goal) ? "history" : "challenge"};
}
export function storedGoalMetric(metric, countFrom, choices) {
  const choice=choices.find(choice=>choice.id===metric);
  return {metric:countFrom === "history" ? choice?.historical || metric : metric,
    countFrom:countFrom === "history" ? "history" : "challenge"};
}
