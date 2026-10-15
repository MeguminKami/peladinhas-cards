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
function lisbonTime(day, hour) {
  const target = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    hour,
  );
  let value = target;
  for (let i = 0; i < 3; i++) {
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
  return new Date(value);
}
function weekId(thursday) {
  const year = thursday.getUTCFullYear(),
    jan4 = new Date(Date.UTC(year, 0, 4));
  const firstThursday =
    Date.UTC(year, 0, 4) + (3 - ((jan4.getUTCDay() + 6) % 7)) * DAY;
  return `${year}-W${String(Math.floor((thursday - firstThursday) / (7 * DAY)) + 1).padStart(2, "0")}`;
}
export function cardWeek(date = new Date()) {
  const p = localParts(date),
    day = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
  let start = new Date(+day - ((day.getUTCDay() + 3) % 7) * DAY);
  if (day.getUTCDay() === 4 && +p.hour < 20) start = new Date(+start - 7 * DAY);
  const opensAt = lisbonTime(start, 20),
    closesAt = lisbonTime(new Date(+start + 6 * DAY), 12),
    nextOpensAt = lisbonTime(new Date(+start + 7 * DAY), 20);
  return {
    weekId: weekId(start),
    opensAt,
    closesAt,
    nextOpensAt,
    phase: +date < +closesAt ? "open" : "closed",
  };
}
export function cardWeekBounds(id) {
  if (!/^\d{4}-W\d{2}$/.test(id)) throw Error("Semana inválida.");
  const [year, week] = id.split("-W").map(Number),
    jan4 = new Date(Date.UTC(year, 0, 4));
  const start = new Date(
    Date.UTC(year, 0, 4) -
      ((jan4.getUTCDay() + 6) % 7) * DAY +
      ((week - 1) * 7 + 3) * DAY,
  );
  return {
    opensAt: lisbonTime(start, 20),
    closesAt: lisbonTime(new Date(+start + 6 * DAY), 12),
    nextOpensAt: lisbonTime(new Date(+start + 7 * DAY), 20),
  };
}
