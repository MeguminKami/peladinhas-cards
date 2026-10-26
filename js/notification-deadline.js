import { nextHomeBoundary } from "./data-boundary.js";
import { asDate } from "./utils.js";
import { eventEndMillis } from "./event-model.js";

const hours = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Lisbon",
  hour: "2-digit",
  hourCycle: "h23",
});
export function nextNotificationDeadline(
  games,
  events,
  { now = Date.now(), feedbackHours } = {},
) {
  let morning = Math.floor(now / 3600000) * 3600000 + 3600000;
  while (Number(hours.format(morning)) !== 8) morning += 3600000;
  const deadlines = [morning];
  for (const game of games) {
    if (game.status === "closed" && game.closedAt)
      deadlines.push(
        +asDate(game.closedAt) + feedbackHours * 3600000,
        +asDate(game.closedAt) + (feedbackHours + 48) * 3600000,
      );
    if (
      game.status === "open" &&
      game.scheduledAt &&
      Number(hours.format(asDate(game.scheduledAt))) < 8
    )
      deadlines.push(+asDate(game.scheduledAt) - 2 * 3600000);
  }
  for (const event of events)
    if (!event.indefinite) deadlines.push(eventEndMillis(event) - 86400000);
  return nextHomeBoundary(
    [games, events, deadlines.map((reviewDeadline) => ({ reviewDeadline }))],
    now,
  );
}
