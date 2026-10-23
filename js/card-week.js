import { policyAt } from "./system-policy.js";
const DAY = 86400000;
function localParts(date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Lisbon",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
}
function lisbonTime(day, hour, minute = 0) {
  const target = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    hour,
    minute,
  );
  let value = target;
  const candidates = [];
  for (let i = 0; i < 3; i++) {
    candidates.push(value);
    const p = localParts(new Date(value));
    const actual = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour,
      +p.minute,
      +p.second,
    );
    value += target - actual;
  }
  // Spring's missing clock hour moves forward, never backwards into the
  // previous hour. In autumn the later occurrence is chosen consistently.
  const final = localParts(new Date(value));
  if (+final.hour !== hour || +final.minute !== minute)
    value = Math.max(value, ...candidates);
  return new Date(value);
}
function weekId(thursday) {
  const year = thursday.getUTCFullYear(),
    jan4 = new Date(Date.UTC(year, 0, 4));
  const firstThursday =
    Date.UTC(year, 0, 4) + (3 - ((jan4.getUTCDay() + 6) % 7)) * DAY;
  return `${year}-W${String(Math.floor((thursday - firstThursday) / (7 * DAY)) + 1).padStart(2, "0")}`;
}
function opening(thursday) {
  const monday = new Date(+thursday - 3 * DAY);
  // A scheduled calendar defines the whole upcoming ISO cycle, avoiding two
  // openings with the same week ID when its weekday changes.
  const config = policyAt(lisbonTime(new Date(+monday + 6 * DAY), 23)).cycle;
  const day = new Date(+monday + ((config.openDay + 6) % 7) * DAY);
  return { day, config, at: lisbonTime(day, config.openHour, config.openMinute) };
}
function bounds(thursday) {
  const current = opening(thursday);
  const next = opening(new Date(+thursday + 7 * DAY));
  let offset = (current.config.closeDay - current.config.openDay + 7) % 7;
  if (!offset && current.config.closeHour * 60 + current.config.closeMinute <= current.config.openHour * 60 + current.config.openMinute) offset = 7;
  const closeDay = new Date(+current.day + offset * DAY);
  const closing = policyAt(lisbonTime(closeDay, 23)).cycle;
  const close = lisbonTime(closeDay, closing.closeHour, closing.closeMinute);
  return { opensAt:current.at, closesAt:new Date(Math.min(+close,+next.at)), nextOpensAt:next.at };
}
export function cardWeek(date = new Date()) {
  const p = localParts(date);
  const day = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
  const thursday = new Date(+day + (3 - ((day.getUTCDay() + 6) % 7)) * DAY);
  let anchor = thursday;
  while (+opening(anchor).at > +date) anchor = new Date(+anchor - 7 * DAY);
  const cycle = bounds(anchor);
  return {weekId:weekId(anchor),...cycle,phase:+date < +cycle.closesAt ? "open" : "closed"};
}
export function cardWeekBounds(id) {
  if (!/^\d{4}-W\d{2}$/.test(id)) throw Error("Semana inv\u00e1lida.");
  const [year,week] = id.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(year,0,4));
  const thursday = new Date(+jan4 - ((jan4.getUTCDay()+6)%7)*DAY + ((week-1)*7+3)*DAY);
  return bounds(thursday);
}
export function canReopenWeeklyCard(snapshot, cycle) {
  const millis=value=>value?.toMillis?.() ?? +new Date(value);
  return !!snapshot?.locked && snapshot.weekId===cycle.weekId && cycle.phase==="open" &&
    millis(snapshot.closesAt)===Date.parse("2026-10-21T11:00:00Z") && +cycle.closesAt===Date.parse("2026-10-21T17:00:00Z");
}
