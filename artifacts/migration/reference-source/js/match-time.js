import { asDate } from "./utils.js";
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Lisbon",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function lisbonDateInput(value) {
  const date = asDate(value);
  if (!date || !Number.isFinite(date.getTime())) return "";
  const p = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function parseLisbonDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw Error("Escolhe uma data e hora válidas para o jogo.");
  const target = Date.parse(value + "Z");
  if (!Number.isFinite(target))
    throw Error("Escolhe uma data e hora válidas para o jogo.");
  let guess = target;
  for (let i = 0; i < 3; i++)
    guess += target - Date.parse(lisbonDateInput(new Date(guess)) + "Z");
  const candidate = [guess - 3600000, guess, guess + 3600000]
    .sort((a, b) => a - b)
    .find((time) => lisbonDateInput(new Date(time)) === value);
  if (candidate == null)
    throw Error(
      "Esta hora não existe em Lisboa devido à mudança para o horário de verão. Escolhe outra hora.",
    );
  return new Date(candidate);
}
export function formatMatchDate(value) {
  const date = asDate(value);
  if (!date || !Number.isFinite(date.getTime())) return "Data a definir";
  return (
    date.toLocaleString("pt-PT", {
      timeZone: "Europe/Lisbon",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }) + " · Lisboa"
  );
}
