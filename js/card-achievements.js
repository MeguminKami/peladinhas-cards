import { asDate, average, participants } from "./utils.js";
import { PATH_CARD_EDITIONS } from "./path-card-designs.js";
import { ULTIMATE_CARD_EDITIONS } from "./card-ultimate-designs.js";
import { policyAt } from "./system-policy.js";
import { lisbonDateInput, parseLisbonDateInput } from "./match-time.js";

export const RESERVED_CARD_IDS = Object.freeze([
  "apogee",
  "legacy",
  "titan",
  "carnival",
]);
export const CARD_POLICY = Object.freeze({
  ...Object.fromEntries(Object.entries(ULTIMATE_CARD_EDITIONS).map(([id,edition])=>[id,{duration:"permanent",hint:edition.hint}])),
  ...Object.fromEntries(Object.keys(PATH_CARD_EDITIONS).map(id => [id, { duration: "permanent", hint: "Conquista a prova final em Escolhe o teu caminho!" }])),
  "in-form": {
    duration: "weekly",
    hint: "Duas boas exibições podem mudar a tua carta.",
  },
  mvp: { duration: "weekly", hint: "Sê a referência de um jogo." },
  "hot-streak": {
    duration: "monthly",
    hint: "Mantém o nível durante três jogos.",
  },
  playmaker: { duration: "monthly", hint: "Faz a equipa jogar." },
  sniper: { duration: "monthly", hint: "Mostra qualidade na finalização." },
  "the-wall": {
    duration: "monthly",
    hint: "Fecha os caminhos para a tua baliza.",
  },
  engine: { duration: "monthly", hint: "Dá intensidade à equipa." },
  "safe-hands": {
    duration: "monthly",
    hint: "Ganha a confiança de quem joga à tua frente.",
  },
  "legend-form": { duration: "season", hint: "Cinco jogos de excelência." },
  dynasty: {
    duration: "season",
    hint: "As vitórias precisam de consistência individual.",
  },
  tots: {
    duration: "year",
    hint: "Destaca-te na tua posição ao longo da época.",
  },
  "perfect-five": {
    duration: "permanent",
    hint: "A perfeição repetida deixa uma marca.",
  },
  icon: {
    duration: "permanent",
    hint: "Constrói uma história de qualidade na liga.",
  },
  "fut-heroes": {
    duration: "permanent",
    hint: "Decide quando o adversário parece mais forte.",
  },
  "fut-birthday": {
    duration: "permanent",
    hint: "Uma boa entrada merece uma celebração.",
  },
  otw: { duration: "permanent", hint: "As primeiras impressões contam." },
  "future-stars": {
    duration: "permanent",
    hint: "Faz a tua carta oficial crescer dentro de campo.",
  },
  futties: {
    duration: "permanent",
    hint: "A comunidade reconhece quem joga com atitude.",
  },
  shapeshifters: {
    duration: "permanent",
    hint: "Mostra qualidade em posições diferentes.",
  },
  supernova: {
    duration: "permanent",
    hint: "Uma exibição ofensiva fora de série.",
  },
  aurora: {
    duration: "permanent",
    hint: "Volta a brilhar depois de uma fase difícil.",
  },
  eclipse: {
    duration: "permanent",
    hint: "Supera equipas favoritas mais de uma vez.",
  },
  inferno: {
    duration: "permanent",
    hint: "Mantém o fogo durante três participações.",
  },
  glacial: {
    duration: "permanent",
    hint: "Na baliza, mantém a cabeça fria e o nível alto.",
  },
  toty: {
    duration: "permanent",
    hint: "O ano da liga distingue os melhores por posição.",
  },
});
export const durationName = (duration) =>
  ({
    weekly: "Semanal",
    monthly: "Mensal",
    season: "Época · 2 meses",
    year: "Ano · 4 meses",
    permanent: "Permanente",
  })[duration] || "Especial";
export function cardExpiry(start, duration) {
  if (duration === "permanent") return null;
  const value = asDate(start);
  if (duration === "weekly") return new Date(+value + 7 * 86400000);
  const months = { monthly: 1, season: policyAt(value).cycle.seasonMonths, year: policyAt(value).cycle.yearMonths }[duration];
  if (!months) throw Error("Duração de carta inválida.");
  const text = lisbonDateInput(value),
    day = Number(text.slice(8, 10));
  const target = new Date(
    Date.UTC(
      Number(text.slice(0, 4)),
      Number(text.slice(5, 7)) - 1 + months,
      1,
    ),
  );
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const date = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
  let expiry;
  try {
    expiry = parseLisbonDateInput(`${date}T${text.slice(11)}`);
  } catch {
    expiry = parseLisbonDateInput(`${date}T02:00`);
  }
  expiry.setUTCSeconds(value.getUTCSeconds(), value.getUTCMilliseconds());
  return expiry;
}
export function leaguePeriod(value, months = 2) {
  const duration=months===4 ? "year" : "season",original=months;
  months=policyAt(value).cycle[duration==="year" ? "yearMonths" : "seasonMonths"];
  const local = lisbonDateInput(value),
    year = Number(local.slice(0, 4));
  const month = Math.floor((Number(local.slice(5, 7)) - 1) / months) * months;
  const start = parseLisbonDateInput(
    `${year}-${String(month + 1).padStart(2, "0")}-01T00:00`,
  );
  return {
    id: `${year}-${duration === "year" ? "A" : "E"}${month / months + 1}${months!==original?`-M${months}`:""}`,
    startsAt: start,
    endsAt: cardExpiry(start, duration),
  };
}
const time = (value) => (value == null ? NaN : +asDate(value));
export const qualifiedCardGame = (row) =>
  Number.isFinite(row.overall) &&
  row.count >= 3 &&
  (row.ratingCounts?.overall ?? row.count) >= 3 &&
  Number.isFinite(time(row.date));
export function mergeCardAchievements(existing = [], incoming = []) {
  const records = new Map();
  for (const award of [...existing, ...incoming]) {
    if (!award?.id) continue;
    const key = award.id;
    const prior = records.get(key);
    if (prior?.revokedAt) continue;
    if (award.revokedAt) {
      records.set(key, award);
      continue;
    }
    if (
      !prior ||
      (award.duration !== "permanent" &&
        time(award.sourceDate || award.earnedAt) >
          time(prior.sourceDate || prior.earnedAt))
    )
      records.set(key, award);
  }
  return [...records.values()];
}
export function availableCardAchievements(awards = [], date = new Date()) {
  return awards.filter(
    (award) =>
      !award.revokedAt &&
      time(award.earnedAt) <= +date &&
      (award.duration === "permanent" || time(award.expiresAt) > +date),
  );
}
export function availableSpecials(
  earned = [],
  eventSpecials = [],
  date = new Date(),
) {
  const cards = [...availableCardAchievements(earned, date), ...eventSpecials];
  const result = new Map();
  for (const card of cards) {
    const prior = result.get(card.id);
    if (
      !prior ||
      (prior.duration !== "permanent" &&
        (card.duration === "permanent" ||
          time(card.expiresAt) > time(prior.expiresAt)))
    )
      result.set(card.id, card);
  }
  return [...result.values()];
}
export function validCardSelection(selected, specials = []) {
  if (selected === "base") return "base";
  return specials.some((card) => card.id === selected) ? selected : "base";
}

export function gameCardContext(uid, game, balance = null) {
  const ownSide = [
    ...(game.teamA?.starters || []),
    ...(game.teamA?.bench || []),
  ].includes(uid)
    ? "teamA"
    : "teamB";
  const otherSide = ownSide === "teamA" ? "teamB" : "teamA";
  const sideOvr = (side) => {
    const ids = [...(game[side]?.starters || []), ...(game[side]?.bench || [])];
    const values = ids.map((id) => balance?.playerOvr?.[id]);
    return ids.length && values.every(Number.isFinite) ? average(values) : null;
  };
  const own = sideOvr(ownSide),
    other = sideOvr(otherSide);
  return {
    position: game.positions?.[uid] || null,
    teamGoals: game.score?.[ownSide] ?? null,
    conceded: game.score?.[otherSide] ?? null,
    teamOvrGap: own != null && other != null ? other - own : null,
    participates: participants(game).includes(uid),
  };
}
