import { cardWeek } from "./card-week.js";
export function nextHomeBoundary(value, now = Date.now()) {
  const cycle = cardWeek(new Date(now));
  const dates = [+cycle.closesAt, +cycle.nextOpensAt];
  // Both UTC and Lisbon midnight matter to existing date-based calculations.
  const day = (date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(
      date,
    );
  for (let hour = 1; hour <= 25; hour++) {
    const next = Math.floor(now / 3600000) * 3600000 + hour * 3600000;
    if (day(next) !== day(now)) {
      dates.push(next);
      break;
    }
  }
  dates.push(Math.floor(now / 86400000) * 86400000 + 86400000);
  const visit = (item) => {
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item)) {
      if (
        [
          "startsAt",
          "cardStartsAt",
          "endsAt",
          "expiresAt",
          "scheduledAt",
          "effectiveAt",
          "reviewDeadline",
        ].includes(key)
      ) {
        const time =
          child?.toMillis?.() ??
          (typeof child === "number" ? child : +new Date(child));
        if (Number.isFinite(time) && time > now) dates.push(time);
      } else if (typeof child === "object") visit(child);
    }
  };
  visit(value);
  return Math.min(...dates.filter((time) => time > now));
}
