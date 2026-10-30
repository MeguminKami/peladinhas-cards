import { policyAt } from "./system-policy.js";
import { FAIR_PROGRESSION_FROM, usesFairProgression, calculateFairGameDeltas } from "./game-progression.js";
import { usesExpectationProgression, calculateExpectationGameDeltas } from "./expectation-progression.js";
import { cardWeek } from "./card-week.js";
import { performanceWeek } from "./performance-week.js";
import {
  COLLECTION_EDITIONS,
  COLLECTION_THEME_IDS,
  ACTIVE_COLLECTION_IDS,
} from "./card-collection.js";
export { COLLECTION_EDITIONS } from "./card-collection.js";
export const ATTRIBUTES = [
  ["pace", "Velocidade", "VEL"],
  ["shooting", "Finalização", "FIN"],
  ["passing", "Passe", "PAS"],
  ["dribbling", "Drible", "DRI"],
  ["defending", "Defesa", "DEF"],
  ["physical", "Físico", "FIS"],
  ["goalkeeping", "Guarda-redes", "GR"],
  ["stamina", "Resistência", "RES"],
  ["vision", "Visão de jogo", "VIS"],
  ["positioning", "Posicionamento", "POS"],
  ["teamwork", "Jogo de equipa", "EQP"],
  ["composure", "Compostura", "COM"],
];
export const FEEDBACK = [
  ["overall", "Desempenho geral"],
  ["attack", "Ataque / Finalização"],
  ["passing", "Passe / Jogo colectivo"],
  ["defense", "Defesa"],
  ["physical", "Intensidade / Físico"],
  ["goalkeeping", "Guarda-redes"],
  ["attitude", "Atitude"],
];
export const CARD_SETTINGS = {
  get communityMinimum() { return policyAt().rules.communityMinimum; },
  get selfWeight() { return policyAt().rules.selfWeight; },
};
export function matchOutcome(uid, game) {
  if (game.status !== "closed" || !participants(game).includes(uid)) return 0;
  const team = [...game.teamA.starters, ...game.teamA.bench].includes(uid)
    ? "teamA"
    : "teamB";
  return Math.sign(
    game.score[team] - game.score[team === "teamA" ? "teamB" : "teamA"],
  );
}
export const COUNTRIES = [
  ["PT", "Portugal"],
  ["BR", "Brasil"],
  ["ES", "Espanha"],
  ["FR", "França"],
  ["GB", "Reino Unido"],
  ["AO", "Angola"],
  ["MZ", "Moçambique"],
  ["CV", "Cabo Verde"],
  ["DE", "Alemanha"],
  ["IT", "Itália"],
  ["NL", "Países Baixos"],
  ["BE", "Bélgica"],
  ["CH", "Suíça"],
  ["US", "Estados Unidos"],
  ["AR", "Argentina"],
];
export const THEMES = [
  ...ACTIVE_COLLECTION_IDS,
  "scrap",
  "bronze-common",
  "bronze-rare",
  "silver-common",
  "silver-rare",
  "gold-common",
  "gold-rare",
  "in-form",
  "hot-streak",
  "playmaker",
  "sniper",
  "the-wall",
  "engine",
  "safe-hands",
  "perfect-five",
  "mvp",
  "legend-form",
];
export const INFORM_THEMES = Object.freeze([
  "in-form-bronze",
  "in-form-silver",
  "in-form-gold",
]);
// In Form keeps one earned ID; its metal follows the player's base rarity.
export function informTheme(baseCard, ovr = 0) {
  const base = /^(bronze|silver|gold)-(common|rare)$/.test(baseCard || "")
    ? baseCard
    : calculateBaseCard(ovr);
  return `in-form-${base === "scrap" ? "bronze" : base.split("-")[0]}`;
}
export const CATALOG_THEMES = Object.freeze([
  ...new Set([
    ...THEMES.filter((id) => id !== "in-form"),
    ...INFORM_THEMES,
    ...COLLECTION_THEME_IDS,
  ]),
]);
const THEME_NAMES = {
  scrap: "Sucata",
  toty: "Apogeu · TOTY",
  tots: "Equipa da Época · TOTS",
  "fut-birthday": "Carnaval · FUT BIRTHDAY",
  "bronze-common": "Bronze comum",
  "bronze-rare": "Bronze rara",
  "silver-common": "Prata comum",
  "silver-rare": "Prata rara",
  "gold-common": "Ouro comum",
  "gold-rare": "Ouro rara",
  "in-form": "Em forma",
  "in-form-bronze": "Em forma · Bronze",
  "in-form-silver": "Em forma · Prata",
  "in-form-gold": "Em forma · Ouro",
  "hot-streak": "Série de ouro",
  playmaker: "Maestro",
  sniper: "Goleador",
  "the-wall": "A muralha",
  engine: "Motor da equipa",
  "safe-hands": "Mãos seguras",
  "perfect-five": "Cinco estrelas",
  mvp: "Melhor em campo",
  "legend-form": "Forma lendária",
  "custom-test": "Tema experimental",
};
export const themeName = (t) =>
  THEME_NAMES[t] || COLLECTION_EDITIONS[t]?.name || "Carta personalizada";
export const average = (a) =>
  a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
export const clamp = (n, min, max) =>
  Math.min(max, Math.max(min, Number(n) || 0));
export const convert20To99 = (n) => Math.round((clamp(n, 0, 20) * 99) / 20);
export const convert5To99 = (n) => Math.round((clamp(n, 0, 5) * 99) / 5);
export const completeInitial = (r) =>
  ATTRIBUTES.every(([k]) => Number.isFinite(r?.[k]) && r[k] >= 0 && r[k] <= 20);
export const completeFeedback = (r) =>
  FEEDBACK.filter(([k]) => k !== "goalkeeping").every(
    ([k]) => Number.isFinite(r?.[k]) && r[k] >= 0 && r[k] <= 5,
  ) &&
  (r?.goalkeeping === null ||
    (Number.isFinite(r?.goalkeeping) &&
      r.goalkeeping >= 0 &&
      r.goalkeeping <= 5));
export function matchPerformance(uid, game) {
  const side = ["teamA", "teamB"].find((side) =>
    [...(game[side]?.starters || []), ...(game[side]?.bench || [])].includes(
      uid,
    ),
  );
  const row = side && game.performance?.[side];
  return {
    goals: (row?.goals || []).filter((id) => id === uid).length,
    assists: (row?.assists || []).filter((id) => id === uid).length,
  };
}
export function matchGoalMargin(uid, game) {
  if (game.status !== "closed" || !participants(game).includes(uid)) return 0;
  const side = [
    ...(game.teamA?.starters || []),
    ...(game.teamA?.bench || []),
  ].includes(uid)
    ? "teamA"
    : "teamB";
  const scored = game.score?.[side],
    conceded = game.score?.[side === "teamA" ? "teamB" : "teamA"];
  return Number.isFinite(scored) && Number.isFinite(conceded)
    ? scored - conceded
    : 0;
}
export const PERFORMANCE_SETTINGS = Object.freeze({
  unit: 0.725,
  goalUnits: 0.25,
  assistUnits: 0.3,
  dribbleUnits: 0.1,
  shootingCap: 0.9,
  passingCap: 0.9,
  dribblingCap: 0.6,
  winAdjustment: 0.4,
  drawAdjustment: 0.1,
  lossAdjustment: -0.12,
  winMargin: 0.06,
  lossMargin: 0.05,
  personalWinMargin: 0.05,
  speed: 2.3,
  gainCap: 4,
  exceptionalGainStart: 3,
  lossCap: 0.45,
  absoluteWeight: 0.7,
  teamWeight: 0.3,
  opponentWeight: 0.2,
  weakRating: 2.5,
  weakRelative: -0.5,
  eliteRelative: 0.25,
});
export function performanceBonuses(a) {
  const goals = clamp(a.goals, 0, 999),
    assists = clamp(a.assists, 0, 999);
  const multiplier =
    a.outcome === 1
      ? 1 + PERFORMANCE_SETTINGS.personalWinMargin * clamp(a.goalMargin, 0, 5)
      : 1;
  return {
    shooting:
      Math.min(
        PERFORMANCE_SETTINGS.shootingCap,
        goals * PERFORMANCE_SETTINGS.goalUnits * PERFORMANCE_SETTINGS.unit,
      ) * multiplier,
    passing:
      Math.min(
        PERFORMANCE_SETTINGS.passingCap,
        assists * PERFORMANCE_SETTINGS.assistUnits * PERFORMANCE_SETTINGS.unit,
      ) * multiplier,
    dribbling:
      Math.min(
        PERFORMANCE_SETTINGS.dribblingCap,
        (goals + assists) *
          PERFORMANCE_SETTINGS.dribbleUnits *
          PERFORMANCE_SETTINGS.unit,
      ) * multiplier,
  };
}
// The caller supplies a validated closing snapshot; never use today's teammate OVR.
export function matchEvolutionContext(uid, game, players = {}, balance = null) {
  const side = [
    ...(game.teamA?.starters || []),
    ...(game.teamA?.bench || []),
  ].includes(uid)
    ? "teamA"
    : "teamB";
  const ids = (key) => [
    ...(game[key]?.starters || []),
    ...(game[key]?.bench || []),
  ];
  const colleagues = ids(side).filter((id) => id !== uid);
  const rivals = ids(side === "teamA" ? "teamB" : "teamA");
  const meanRatings = (list) =>
    Object.fromEntries(
      FEEDBACK.map(([key]) => {
        const values = list
          .map((id) => players[id]?.[key])
          .filter(Number.isFinite);
        return [key, values.length ? average(values) : null];
      }),
    );
  const ovrs = colleagues
    .map((id) => balance?.playerOvr?.[id])
    .filter(Number.isFinite);
  return {
    teamRatings: meanRatings(colleagues),
    opponentRatings: meanRatings(rivals),
    teamOvr: ovrs.length ? average(ovrs) : null,
  };
}
export function calculateInitialBaseline(
  self,
  community,
  settings = CARD_SETTINGS,
) {
  const selfWeight = initialSelfWeight(community?.count || 0, settings);
  return Object.fromEntries(
    ATTRIBUTES.map(([k]) => [
      k,
      community?.count >= 1
        ? (self?.[k] ?? community.ratings20[k]) * selfWeight +
          community.ratings20[k] * (1 - selfWeight)
        : (self?.[k] ?? 0),
    ]),
  );
}
export function initialSelfWeight(communityCount, settings = CARD_SETTINGS) {
  if (!(communityCount >= 1)) return 1;
  if (communityCount >= 5) {
    // One basis point = 0.01%. Truncate each external share; self receives the remainder.
    const eachExternal = Math.floor(9600 / communityCount);
    return (10000 - eachExternal * communityCount) / 10000;
  }
  return Math.min(0.2, settings.selfWeight ?? 0.2, 1 / (communityCount + 1));
}
export function calculateGameAggregate(feedback) {
  const noGoalkeeping = feedback.some(
    (f) =>
      f.submitted &&
      typeof f.targetId === "string" &&
      f.raterId === f.targetId &&
      f.ratings?.goalkeeping === null,
  );
  const ratings = Object.fromEntries(
    FEEDBACK.map(([k]) => {
      if (k === "goalkeeping" && noGoalkeeping) return [k, null];
      const a = feedback
        .filter((f) => f.submitted)
        .map((f) => f.ratings[k])
        .filter(Number.isFinite);
      return [k, a.length ? average(a) : null];
    }),
  );
  return {
    ...ratings,
    count: feedback.filter((vote) => vote.submitted).length,
    goalkeepingEligible: !noGoalkeeping,
    ratingCounts: Object.fromEntries(FEEDBACK.map(([key]) => [key,
      key === "goalkeeping" && noGoalkeeping ? 0 : feedback.filter((vote) => vote.submitted && Number.isFinite(vote.ratings?.[key])).length,
    ])),
  };
}
const ATTRIBUTE_FEEDBACK = Object.freeze({
  pace: "physical",
  shooting: "attack",
  passing: "passing",
  dribbling: "attack",
  defending: "defense",
  physical: "physical",
  goalkeeping: "goalkeeping",
  stamina: "physical",
  vision: "passing",
  positioning: "defense",
  teamwork: "passing",
  composure: "attack",
});
export function calculateGameDeltas(stats, aggregate, options = {}) {
  if (usesExpectationProgression(aggregate.date)) {
    return calculateExpectationGameDeltas(stats, aggregate);
  }
  if (usesFairProgression(aggregate.date)) {
    const normalized = normalizeOvrWeights(options.weights);
    return calculateFairGameDeltas(stats, aggregate, {
      weights: normalized.positions[options.position] || normalized.weights,
      settings: policyAt(asDate(aggregate.date)).progression,
    });
  }
  const a = aggregate,
    settings = {...PERFORMANCE_SETTINGS, ...policyAt(a.date || new Date(Date.parse(FAIR_PROGRESSION_FROM) - 1)).progression};
  const rounded = Object.fromEntries(
    ATTRIBUTES.map(([key]) => [key, Math.round(stats[key])]),
  );
  const ovr = calculateOverall(rounded, options.weights, options.position);
  const boost =
    1 + 0.1 * clamp((80 - ovr) / 5, 0, 1) + 0.5 * clamp((75 - ovr) / 15, 0, 1);
  const bonuses = performanceBonuses(a);
  const result =
    a.outcome === 1
      ? settings.winAdjustment + settings.winMargin * clamp(a.goalMargin, 0, 5)
      : a.outcome === -1
        ? settings.lossAdjustment -
          settings.lossMargin * clamp(-a.goalMargin, 0, 6)
        : a.outcome === 0
          ? settings.drawAdjustment
          : 0;
  return Object.fromEntries(
    ATTRIBUTES.map(([key]) => {
      const dimension =
        ["stamina", "composure"].includes(key) && Number.isFinite(a.attitude)
          ? "attitude"
          : ATTRIBUTE_FEEDBACK[key];
      if (!Number.isFinite(a[dimension])) return [key, null];
      const stars = clamp(a[dimension], 0, 5);
      // Missing reference ratings are neutral, rather than zero-star averages.
      const relative = Number.isFinite(a.teamRatings?.[dimension])
        ? stars - a.teamRatings[dimension]
        : 0;
      const opponentRelative = Number.isFinite(a.opponentRatings?.[dimension])
        ? stars - a.opponentRatings[dimension]
        : 0;
      const rating =
        settings.absoluteWeight * (stars - 3) +
        settings.teamWeight * relative +
        settings.opponentWeight * opponentRelative;
      const personal = bonuses[key] || 0;
      let delta = rating + result + personal;
      if (a.outcome === 1)
        delta =
          relative < settings.weakRelative || stars < settings.weakRating
            ? 0
            : Math.max(0.05, delta);
      const current = stats[key];
      if (delta > 0) {
        const catchup =
          relative > 0 && Number.isFinite(a.teamOvr)
            ? 1 +
              Math.min(0.25, Math.max(0, a.teamOvr - ovr) / 40) *
                Math.min(1, relative / 0.5)
            : 1;
        const tier =
          current < 75 ? 1 : current < 85 ? 0.7 : current < 90 ? 0.4 : 0.12;
        let gain = Math.min(
          settings.gainCap,
          delta * settings.speed * boost * catchup,
        );
        // The final point below 75 requires exceptional absolute AND relative ratings.
        if (current < 75 && gain > settings.exceptionalGainStart) {
          const excellence =
            clamp(stars - 4, 0, 1) *
            clamp(Math.max(relative, opponentRelative) / 0.5, 0, 1);
          gain =
            settings.exceptionalGainStart +
            (gain - settings.exceptionalGainStart) * excellence;
        }
        delta = gain * tier;
        if (
          relative < settings.eliteRelative &&
          opponentRelative < settings.eliteRelative &&
          !personal
        )
          delta = Math.min(delta, Math.max(0, 90 - current));
      } else if (delta < 0)
        delta = Math.max(-settings.lossCap, delta) * (current >= 85 ? 1 : 0.7);
      return [key, clamp(current + delta, 0, 99) - current];
    }),
  );
}
export function calculatePlayerStatsDetails(initial, aggregates, options = {}) {
  const rows = ATTRIBUTES.map(([key, name]) => ({
    key,
    name,
    initial20: initial[key] ?? 0,
    baseline: convert20To99(initial[key] ?? 0),
    contributions: [],
  }));
  const stats = Object.fromEntries(rows.map((r) => [r.key, r.baseline]));
  const games = [...aggregates].sort(
    (a, b) =>
      (+asDate(a.date) || 0) - (+asDate(b.date) || 0) ||
      String(a.gameId || "").localeCompare(String(b.gameId || "")),
  );
  for (const game of games) {
    const deltas = calculateGameDeltas(stats, game, options);
    for (const row of rows)
      if (Number.isFinite(deltas[row.key])) {
        row.contributions.push(deltas[row.key]);
        stats[row.key] += deltas[row.key];
      }
  }
  for (const row of rows) {
    row.exact = stats[row.key];
    row.value = Math.round(row.exact);
  }
  return {
    version: games.some(game => usesExpectationProgression(game.date)) ? "per-game-growth-v3" : games.some(game => usesFairProgression(game.date)) ? "per-game-growth-v2" : "per-game-growth-v1",
    rows,
    exactStats: { ...stats },
    stats: Object.fromEntries(rows.map((row) => [row.key, row.value])),
  };
}
export function calculatePlayerStats(initial, aggregates, options = {}) {
  return calculatePlayerStatsDetails(initial, aggregates, options).stats;
}
export const OVR_POSITIONS = Object.freeze(["GR", "DEF", "ALA", "MED", "AV"]);
const positionDefaults = {
  GR: [3, 1, 8, 2, 5, 10, 35, 5, 5, 12, 6, 8],
  DEF: [8, 2, 8, 3, 25, 15, 0, 10, 5, 12, 7, 5],
  ALA: [18, 10, 12, 18, 5, 8, 0, 12, 5, 4, 4, 4],
  MED: [6, 6, 22, 10, 8, 5, 0, 10, 15, 6, 8, 4],
  AV: [12, 25, 5, 15, 2, 10, 0, 7, 4, 10, 3, 7],
};
export const DEFAULT_OVR_WEIGHTS = Object.freeze({
  weights: Object.freeze(
    Object.fromEntries(
      ATTRIBUTES.map(([key], i) => [key, i < 4 ? 8.34 : 8.33]),
    ),
  ),
  positions: Object.freeze(
    Object.fromEntries(
      OVR_POSITIONS.map((position) => [
        position,
        Object.freeze(
          Object.fromEntries(
            ATTRIBUTES.map(([key], i) => [key, positionDefaults[position][i]]),
          ),
        ),
      ]),
    ),
  ),
});
function validStatWeights(weights) {
  return (
    !!weights &&
    typeof weights === "object" &&
    !Array.isArray(weights) &&
    Object.keys(weights).length === ATTRIBUTES.length &&
    ATTRIBUTES.every(
      ([key]) =>
        Number.isFinite(weights[key]) &&
        weights[key] >= 0 &&
        weights[key] <= 100 &&
        Math.abs(weights[key] * 100 - Math.round(weights[key] * 100)) < 1e-8,
    ) &&
    ATTRIBUTES.reduce(
      (sum, [key]) => sum + Math.round(weights[key] * 100),
      0,
    ) === 10000
  );
}
export function validOvrWeights(settings) {
  if (settings?.positions !== undefined) {
    return (
      !!settings.positions &&
      !Array.isArray(settings.positions) &&
      Object.keys(settings.positions).length === OVR_POSITIONS.length &&
      OVR_POSITIONS.every((position) =>
        validStatWeights(settings.positions[position]),
      )
    );
  }
  return validStatWeights(settings?.weights);
}
export function normalizeOvrWeights(settings) {
  const valid = validOvrWeights(settings);
  const weights = validStatWeights(settings?.weights)
    ? settings.weights
    : DEFAULT_OVR_WEIGHTS.weights;
  return {
    weights: { ...weights },
    positions: Object.fromEntries(
      OVR_POSITIONS.map((position) => [
        position,
        {
          ...(valid
            ? settings.positions?.[position] || weights
            : DEFAULT_OVR_WEIGHTS.positions[position]),
        },
      ]),
    ),
  };
}
export function calculateInactivity(uid, games, joinedAt, cutoff = new Date()) {
  const joined = +asDate(joinedAt) || 0;
  const closed = games
    .filter((g) => {
      const date = +asDate(g.closedAt || g.scheduledAt);
      return (
        g.status === "closed" &&
        Number.isFinite(date) &&
        date > 0 &&
        date >= joined &&
        date <= +cutoff
      );
    })
    .sort(
      (a, b) =>
        +asDate(b.closedAt || b.scheduledAt) -
          +asDate(a.closedAt || a.scheduledAt) ||
        String(b.id).localeCompare(String(a.id)),
    );
  let missed = 0;
  for (const game of closed) {
    if (participants(game).includes(uid)) break;
    missed++;
  }
  return {
    missed,
    // Keep attendance metadata, but absence no longer reduces a current card's OVR.
    // calculateOverallDetails still accepts stored penalties for historical cards.
    penalty: 0,
  };
}
export function calculateOverallDetails(stats, settings, position, inactivity) {
  if (typeof settings === "string") {
    position = settings;
    settings = undefined;
  }
  const normalized = normalizeOvrWeights(settings);
  const knownPosition = OVR_POSITIONS.includes(position) ? position : null;
  const weights = knownPosition
    ? normalized.positions[knownPosition]
    : normalized.weights;
  const rows = ATTRIBUTES.map(([key, name]) => {
    const value = clamp(stats[key], 0, 99),
      weight = weights[key];
    return {
      key,
      name,
      value,
      weight,
      contribution: value * Math.round(weight * 100),
    };
  });
  const total = rows.reduce((sum, row) => sum + row.contribution, 0),
    divisor = 10000;
  return {
    version: knownPosition ? "position-weights-v4" : "stat-weights-v3",
    position: knownPosition,
    weights,
    rows,
    total,
    divisor,
    rawExact: total / divisor,
    rawOvr: Math.round(total / divisor),
    inactivity: inactivity || { missed: 0, penalty: 0 },
    exact: clamp(total / divisor - (inactivity?.penalty || 0), 0, 99),
    ovr: clamp(Math.round(total / divisor) - (inactivity?.penalty || 0), 0, 99),
  };
}
export function calculateOverall(stats, settings, position, inactivity) {
  return calculateOverallDetails(stats, settings, position, inactivity).ovr;
}
export function calculateBaseCard(o) {
  return o < 50 ? "scrap" : o < 60
    ? "bronze-common"
    : o < 65
      ? "bronze-rare"
      : o < 70
        ? "silver-common"
        : o < 75
          ? "silver-rare"
          : o < 85
            ? "gold-common"
            : "gold-rare";
}
export function calculateSpecialCards(games) {
  const g = games.filter((x) => Number.isFinite(x.overall));
  const last = (n) => g.slice(-n);
  const awards = [];
  const add = (id, extra = {}) =>
    awards.push({ id, name: themeName(id), ...extra });
  if (
    last(5).length === 5 &&
    average(last(5).map((x) => x.overall)) >= 4.5 &&
    last(5).every((x) => x.overall >= 4)
  )
    add("legend-form");
  const perfect = FEEDBACK.find(
    ([k]) => last(3).length === 3 && last(3).every((x) => x[k] === 5),
  );
  if (perfect) add("perfect-five", { attribute: perfect[1] });
  if (g.some((x) => x.mvp)) add("mvp");
  if (last(3).length === 3 && last(3).every((x) => x.overall >= 4.2))
    add("hot-streak");
  if (last(2).length === 2 && last(2).every((x) => x.overall >= 4))
    add("in-form");
  for (const [id, key] of [
    ["playmaker", "passing"],
    ["sniper", "attack"],
    ["the-wall", "defense"],
    ["engine", "physical"],
  ]) {
    const v = g.filter((x) => Number.isFinite(x[key])).slice(-3);
    if (v.length === 3 && average(v.map((x) => x[key])) >= 4.7) add(id);
  }
  if (
    g
      .filter((x) => Number.isFinite(x.goalkeeping))
      .slice(-3)
      .filter((x) => x.goalkeeping >= 4.7).length >= 2
  )
    add("safe-hands");
  return awards;
}
export const asDate = (value) =>
  value?.toDate?.() || (value ? new Date(value) : null);
export const participants = (g) => [
  ...(g.teamA?.starters || []),
  ...(g.teamA?.bench || []),
  ...(g.teamB?.starters || []),
  ...(g.teamB?.bench || []),
];
export function calculateMatchStats(uid, games) {
  const s = {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals: 0,
    assists: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  };
  for (const g of games.filter(
    (x) => x.status === "closed" && participants(x).includes(uid),
  )) {
    const a = [...g.teamA.starters, ...g.teamA.bench].includes(uid);
    const f = g.score[a ? "teamA" : "teamB"],
      against = g.score[a ? "teamB" : "teamA"];
    s.played++;
    const performance = matchPerformance(uid, g);
    s.goals += performance.goals;
    s.assists += performance.assists;
    s.goalsFor += f;
    s.goalsAgainst += against;
    s[f > against ? "wins" : f === against ? "draws" : "losses"]++;
  }
  return {
    ...s,
    winRate: s.played ? Math.round((s.wins / s.played) * 100) : 0,
    goalDifference: s.goalsFor - s.goalsAgainst,
  };
}
export function isoWeek(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(asDate(date));
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const d = new Date(Date.UTC(+v.year, +v.month - 1, +v.day));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7)).padStart(2, "0")}`;
}
export function isoWeekEnd(weekId) {
  const [year, week] = weekId.split("-W").map(Number);
  const january4 = new Date(Date.UTC(year, 0, 4));
  const monday =
    Date.UTC(year, 0, 4) -
    ((january4.getUTCDay() + 6) % 7) * 86400000 +
    week * 7 * 86400000;
  const parts = Object.fromEntries(
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
      .formatToParts(new Date(monday))
      .map((p) => [p.type, p.value]),
  );
  const local = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second,
  );
  return new Date(monday - (local - monday) - 1);
}
export function calculateWeeklyTopPlayers(players, date = new Date()) {
  const period = performanceWeek(date);
  return players
    .map((p) => {
      const games = (p.aggregates || []).filter(
        (g) =>
          +asDate(g.date) >= +period.startsAt &&
          +asDate(g.date) < +period.endsAt &&
          g.count >= 2,
      );
      return {
        ...p,
        weeklyPerformance: games.length
          ? average(games.map((g) => g.overall))
          : null,
      };
    })
    .sort(
      (a, b) =>
        (b.weeklyPerformance ?? -1) - (a.weeklyPerformance ?? -1) ||
        b.ovr - a.ovr ||
        (a.username || "").localeCompare(b.username || ""),
    );
}
export function profileComplete(p) {
  return !!(
    p?.displayName?.trim() &&
    p.countryCode &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate || "") &&
    p.heightCm >= 120 &&
    p.heightCm <= 230 &&
    ["right", "left", "both"].includes(p.preferredFoot)
  );
}
export function age(birthDate) {
  if (!birthDate) return "—";
  const b = new Date(birthDate),
    n = new Date();
  return (
    n.getFullYear() -
    b.getFullYear() -
    (n.getMonth() < b.getMonth() ||
    (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())
      ? 1
      : 0)
  );
}
export const formatDate = (v) =>
  asDate(v)?.toLocaleDateString("pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "numeric",
    month: "short",
    year: "numeric",
  }) || "—";
export const formatDateTime = (v) =>
  asDate(v)?.toLocaleString("pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }) || "—";
export const flag = (c) =>
  c === "PT"
    ? '<img src="./assets/flags/pt.svg" alt="Portugal" width="30" height="20" style="display:inline-block;width:1.5em;height:1em;max-width:none;vertical-align:-.1em;object-fit:contain">'
    : /^[A-Z]{2}$/.test(c || "")
    ? String.fromCodePoint(...c.split("").map((x) => 127397 + x.charCodeAt(0)))
    : "";
// Manter o domínio técnico antigo para preservar o acesso das contas existentes.
export const technicalEmail = (u) => `${u}@auth.weeklyfc.app`;
export function normalizeUsername(u) {
  const v = u.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,20}$/.test(v))
    throw Error("Username: 3–20 letras sem acentos, números, _, - ou .");
  return v;
}
