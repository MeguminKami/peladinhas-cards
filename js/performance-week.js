import { cardWeek } from "./card-week.js";

// Performance periods are consecutive: the gap while cards are locked still
// belongs to the next ranking. Card editing keeps its separate opening time.
export function performanceWeek(date = new Date()) {
  const cycle = cardWeek(date);
  if (+date >= +cycle.closesAt)
    return {startsAt:cycle.closesAt,endsAt:cardWeek(cycle.nextOpensAt).closesAt};
  return {
    startsAt:cardWeek(new Date(+cycle.opensAt - 1)).closesAt,
    endsAt:cycle.closesAt,
  };
}
