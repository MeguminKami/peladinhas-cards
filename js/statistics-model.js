import {
  ATTRIBUTES,
  asDate,
  participants,
  matchPerformance,
  OVR_POSITIONS,
} from "./utils.js";

const result = (
  id,
  label,
  description,
  format = "integer",
  group = "results",
) => ({ id, label, description, format, group });
export const RATING_METRICS = [
  ["overall", "Geral"],
  ["attack", "Ataque"],
  ["passing", "Passe"],
  ["defense", "Defesa"],
  ["physical", "Físico"],
  ["attitude", "Atitude"],
  ["goalkeeping", "Guarda-redes"],
];
export const STAT_GROUPS = {
  results: "Resultados",
  efficiency: "Por jogo e eficácia",
  ratings: "Avaliações · 0 a 5★",
  card: "Carta · 0 a 99",
};
export const STAT_METRICS = Object.freeze([
  result("played", "Jogos", "Participações em jogos encerrados."),
  result("wins", "Vitórias", "Jogos ganhos."),
  result("draws", "Empates", "Jogos empatados."),
  result("losses", "Derrotas", "Jogos perdidos."),
  result("goals", "Golos", "Golos individuais registados."),
  result("assists", "Assistências", "Assistências individuais registadas."),
  result(
    "contributions",
    "Golos + assistências",
    "Soma das ações individuais registadas.",
  ),
  result(
    "goalsFor",
    "Golos da equipa",
    "Golos da equipa nos jogos em que o jogador participou.",
  ),
  result(
    "goalsAgainst",
    "Golos sofridos",
    "Golos sofridos pela equipa nos jogos do jogador.",
  ),
  result(
    "goalDifference",
    "Saldo de golos",
    "Golos da equipa menos golos sofridos.",
    "signed",
  ),
  result(
    "cleanSheets",
    "Jogos sem sofrer",
    "Jogos em que a equipa não sofreu golos.",
  ),
  result(
    "scoringGames",
    "Jogos a marcar",
    "Jogos com pelo menos um golo individual.",
  ),
  result(
    "assistingGames",
    "Jogos a assistir",
    "Jogos com pelo menos uma assistência individual.",
  ),
  result(
    "winRate",
    "Vitórias (%)",
    "Percentagem de vitórias nas participações.",
    "percent",
    "efficiency",
  ),
  result(
    "goalsPerGame",
    "Golos / jogo",
    "Golos individuais divididos pelos jogos.",
    "decimal",
    "efficiency",
  ),
  result(
    "assistsPerGame",
    "Assistências / jogo",
    "Assistências individuais divididas pelos jogos.",
    "decimal",
    "efficiency",
  ),
  result(
    "contributionsPerGame",
    "Contribuições / jogo",
    "Golos + assistências divididos pelos jogos.",
    "decimal",
    "efficiency",
  ),
  result(
    "teamGoalsPerGame",
    "Equipa / jogo",
    "Média de golos da equipa nos jogos do jogador.",
    "decimal",
    "efficiency",
  ),
  result(
    "concededPerGame",
    "Sofridos / jogo",
    "Média de golos sofridos pela equipa.",
    "decimal",
    "efficiency",
  ),
  result(
    "form",
    "Média das componentes",
    "Média por jogo de Geral, Ataque, Passe, Defesa, Físico e Atitude disponíveis. Exclui GR; cada jogo tem o mesmo peso.",
    "rating",
    "ratings",
  ),
  ...RATING_METRICS.map(([key, label]) =>
    result(
      `rating${key[0].toUpperCase() + key.slice(1)}`,
      `${label} · média`,
      `Média de ${label} por jogo com a amostra mínima escolhida. Cada jogo tem o mesmo peso; GR não aplicável é excluído.`,
      "rating",
      "ratings",
    ),
  ),
  result(
    "ratedGames",
    "Jogos avaliados",
    "Jogos com pelo menos uma componente válida após o filtro de votos.",
    "integer",
    "ratings",
  ),
  result(
    "ovr",
    "OVR",
    "OVR da carta apresentada atualmente. Não muda com o período da consulta.",
    "card",
    "card",
  ),
  ...ATTRIBUTES.map(([key, label]) =>
    result(
      `card${key[0].toUpperCase() + key.slice(1)}`,
      label,
      `Atributo ${label} da carta atual; não é uma avaliação em estrelas nem um valor histórico.`,
      "card",
      "card",
    ),
  ),
]);
export const STAT_BY_ID = Object.fromEntries(
  STAT_METRICS.map((metric) => [metric.id, metric]),
);
export const STAT_PRESETS = Object.freeze({
  overview: {
    label: "Visão geral",
    icon: "chart",
    columns: ["played", "wins", "goals", "assists", "ratingPhysical", "form"],
    sort: "goals",
  },
  attack: {
    label: "Ataque",
    icon: "goals",
    columns: [
      "played",
      "goals",
      "assists",
      "contributionsPerGame",
      "ratingAttack",
      "ratingPassing",
    ],
    sort: "contributionsPerGame",
  },
  ratings: {
    label: "Avaliações",
    icon: "ratingAverage",
    columns: [
      "ratingPhysical",
      "ratingAttack",
      "ratingPassing",
      "ratingDefense",
      "ratingAttitude",
      "ratingGoalkeeping",
      "ratingOverall",
      "ratedGames",
    ],
    sort: "ratingPhysical",
  },
  defense: {
    label: "Defesa",
    icon: "shield",
    columns: [
      "played",
      "goalsAgainst",
      "concededPerGame",
      "cleanSheets",
      "ratingDefense",
      "ratingPhysical",
      "ratingGoalkeeping",
    ],
    sort: "ratingDefense",
  },
});
export const STAT_OPERATORS = { gte: "≥", gt: ">", lte: "≤", lt: "<", eq: "=" };
export const defaultStatQuery = () => ({
  columns: [...STAT_PRESETS.overview.columns],
  sort: "goals",
  direction: "desc",
  search: "",
  position: "",
  period: "all",
  from: "",
  to: "",
  gameId: "",
  minVotes: 1,
  filters: [],
});
export const normalizeSearch = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT");
export function normalizeStatQuery(value) {
  const query = {
    ...defaultStatQuery(),
    ...(value && typeof value === "object" ? value : {}),
  };
  query.columns = Array.isArray(query.columns)
    ? [
        ...new Set(
          query.columns.filter(
            (id) => typeof id === "string" && Object.hasOwn(STAT_BY_ID, id),
          ),
        ),
      ]
    : [...STAT_PRESETS.overview.columns];
  if (!query.columns.length) query.columns = ["played"];
  query.sort =
    query.sort === "name" ||
    (typeof query.sort === "string" && Object.hasOwn(STAT_BY_ID, query.sort))
      ? query.sort
      : "goals";
  query.direction = query.direction === "asc" ? "asc" : "desc";
  query.search =
    typeof query.search === "string" ? query.search.slice(0, 160) : "";
  query.position = OVR_POSITIONS.includes(query.position) ? query.position : "";
  query.period = ["all", "30", "90", "year", "custom"].includes(query.period)
    ? query.period
    : "all";
  for (const key of ["from", "to"])
    query[key] = /^\d{4}-\d{2}-\d{2}$/.test(query[key]) ? query[key] : "";
  query.gameId = typeof query.gameId === "string" ? query.gameId : "";
  query.minVotes = [1, 3, 7].includes(Number(query.minVotes))
    ? Number(query.minVotes)
    : 1;
  query.filters = (Array.isArray(query.filters) ? query.filters : [])
    .filter(
      (rule) =>
        rule &&
        Object.hasOwn(STAT_BY_ID, rule.metric) &&
        Object.hasOwn(STAT_OPERATORS, rule.operator) &&
        rule.value !== "" &&
        rule.value !== null &&
        Number.isFinite(Number(rule.value)),
    )
    .slice(0, 12)
    .map((rule) => ({
      metric: rule.metric,
      operator: rule.operator,
      value: Number(rule.value),
    }));
  return query;
}
export const statDay = (date) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(asDate(date));
export function statisticsGames(games, query, now = new Date()) {
  const today = statDay(now);
  let from = "",
    to = today;
  if (query.period === "30" || query.period === "90") {
    const calendarDay = new Date(`${today}T12:00:00Z`);
    calendarDay.setUTCDate(
      calendarDay.getUTCDate() - (Number(query.period) - 1),
    );
    from = calendarDay.toISOString().slice(0, 10);
  }
  if (query.period === "year") from = today.slice(0, 4) + "-01-01";
  if (query.period === "custom") {
    from = query.from;
    to = query.to || today;
  }
  return games
    .filter((game) => {
      if (
        game.status !== "closed" ||
        game.deleting ||
        !game.closedAt ||
        +asDate(game.closedAt) > +now
      )
        return false;
      const date = asDate(game.scheduledAt || game.closedAt);
      if (!Number.isFinite(+date)) return false;
      const day = statDay(date);
      return (
        (!query.gameId || game.id === query.gameId) &&
        (!from || day >= from) &&
        day <= to &&
        Number.isFinite(game.score?.teamA) &&
        Number.isFinite(game.score?.teamB)
      );
    })
    .sort(
      (a, b) =>
        +asDate(a.scheduledAt || a.closedAt) -
        +asDate(b.scheduledAt || b.closedAt),
    );
}
const average = (values) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
const validRating = (value) =>
  Number.isFinite(value) && value >= 0 && value <= 5;
export function statisticsRows(league, query, now = new Date()) {
  const games = statisticsGames(league.games || [], query, now),
    summaries = new Map((league.summaries || []).map((row) => [row.id, row]));
  return (league.players || []).map((player) => {
    const own = games.filter((game) => participants(game).includes(player.uid));
    const row = {
      uid: player.uid,
      name: player.displayName || player.username || "Jogador",
      username: player.username || "",
      position: player.primaryPosition || "—",
      samples: {},
      played: own.length,
      wins: 0,
      draws: 0,
      losses: 0,
      goals: 0,
      assists: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      cleanSheets: 0,
      scoringGames: 0,
      assistingGames: 0,
    };
    const ratings = Object.fromEntries(
        RATING_METRICS.map(([key]) => [key, []]),
      ),
      components = [];
    for (const game of own) {
      const side = [
        ...(game.teamA?.starters || []),
        ...(game.teamA?.bench || []),
      ].includes(player.uid)
        ? "teamA"
        : "teamB";
      const scored = game.score[side],
        conceded = game.score[side === "teamA" ? "teamB" : "teamA"];
      const performance = matchPerformance(player.uid, game);
      row[
        scored > conceded ? "wins" : scored === conceded ? "draws" : "losses"
      ]++;
      row.goals += performance.goals;
      row.assists += performance.assists;
      row.goalsFor += scored;
      row.goalsAgainst += conceded;
      row.cleanSheets += Number(conceded === 0);
      row.scoringGames += Number(performance.goals > 0);
      row.assistingGames += Number(performance.assists > 0);
      const summary =
        summaries.get(game.id)?.players?.[player.uid] ||
        (player.aggregates || []).find(
          (aggregate) => aggregate.gameId === game.id,
        );
      const ownComponents = [];
      for (const [key] of RATING_METRICS) {
        const count = summary?.ratingCounts?.[key] ?? summary?.count ?? 0;
        if (key === "goalkeeping" && summary?.goalkeepingEligible === false)
          continue;
        if (!validRating(summary?.[key]) || count < query.minVotes) continue;
        ratings[key].push(summary[key]);
        if (key !== "goalkeeping") ownComponents.push(summary[key]);
      }
      if (ownComponents.length) components.push(average(ownComponents));
    }
    row.contributions = row.goals + row.assists;
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    for (const [id, total] of [
      ["goalsPerGame", "goals"],
      ["assistsPerGame", "assists"],
      ["contributionsPerGame", "contributions"],
      ["teamGoalsPerGame", "goalsFor"],
      ["concededPerGame", "goalsAgainst"],
    ])
      row[id] = row.played ? row[total] / row.played : null;
    row.winRate = row.played ? (100 * row.wins) / row.played : null;
    row.form = average(components);
    row.samples.form = components.length;
    row.ratedGames = components.length;
    for (const [key] of RATING_METRICS) {
      const id = `rating${key[0].toUpperCase() + key.slice(1)}`;
      row[id] = average(ratings[key]);
      row.samples[id] = ratings[key].length;
    }
    row.ovr = player.hasCard && Number.isFinite(player.ovr) ? player.ovr : null;
    for (const [key] of ATTRIBUTES)
      row[`card${key[0].toUpperCase() + key.slice(1)}`] =
        player.hasCard && Number.isFinite(player.stats?.[key])
          ? player.stats[key]
          : null;
    return row;
  });
}
export function filterStatRows(rows, query) {
  const words = normalizeSearch(query.search).split(/\s+/).filter(Boolean);
  return rows
    .filter(
      (row) =>
        (!query.position || row.position === query.position) &&
        words.every((word) =>
          normalizeSearch(`${row.name} ${row.username}`).includes(word),
        ) &&
        query.filters.every((rule) => {
          const value = row[rule.metric];
          if (!Number.isFinite(value)) return false;
          return {
            gte: () => value >= rule.value,
            gt: () => value > rule.value,
            lte: () => value <= rule.value,
            lt: () => value < rule.value,
            eq: () => Math.abs(value - rule.value) < 1e-9,
          }[rule.operator]();
        }),
    )
    .sort((a, b) => {
      const x = a[query.sort],
        y = b[query.sort];
      if (x == null && y != null) return 1;
      if (y == null && x != null) return -1;
      const difference =
        x == null && y == null
          ? 0
          : typeof x === "string"
            ? x.localeCompare(y, "pt-PT")
            : x - y;
      return (
        difference * (query.direction === "asc" ? 1 : -1) ||
        a.name.localeCompare(b.name, "pt-PT") ||
        a.uid.localeCompare(b.uid)
      );
    });
}
export function statNumber(value, metric) {
  if (!Number.isFinite(value)) return "—";
  const format = STAT_BY_ID[metric]?.format;
  const digits = ["rating", "decimal"].includes(format)
    ? 2
    : format === "percent"
      ? 1
      : 0;
  const number = value.toLocaleString("pt-PT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return format === "percent"
    ? `${number}%`
    : format === "signed" && value > 0
      ? `+${number}`
      : number;
}
export function statisticsCSV(rows, columns) {
  const cell = (value) =>
    `"${String(value ?? "")
      .replace(/^[\t\r ]*[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`;
  return (
    "\uFEFF" +
    [
      ["Jogador", "Posição", ...columns.map((id) => STAT_BY_ID[id].label)],
      ...rows.map((row) => [
        row.name,
        row.position,
        ...columns.map((id) => statNumber(row[id], id)),
      ]),
    ]
      .map((row) => row.map(cell).join(";"))
      .join("\r\n")
  );
}
