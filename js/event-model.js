import {
  ATTRIBUTES,
  THEMES,
  asDate,
  participants,
  matchPerformance,
  matchOutcome,
  themeName,
  formatDate,
  formatDateTime,
} from "./utils.js";
export const EVENT_LIMITS = Object.freeze({
  winners: 20,
  votes: 10,
  weeklyStat: 10,
  weeklyTotal: 20,
  permanentLifetime: 10,
  repeats: 12,
});
export const OBJECTIVES = Object.freeze({
  games: "Jogar jogos",
  goals: "Marcar golos",
  assists: "Fazer assistências",
  wins: "Ganhar jogos",
  unbeatenWins: "Vitórias sem perder",
  winStreak: "Vitórias consecutivas",
  unbeatenGames: "Jogos sem perder",
  goalsAndAssists: "Golos e assistências",
  cleanSheets: "Jogos sem sofrer golos",
});
export function objectiveSummary(event) {
  const count = event.objective?.target || 1;
  const games = `${count} ${count === 1 ? "jogo" : "jogos"}`;
  const wins = `${count} ${count === 1 ? "vitória" : "vitórias"}`;
  const action = {
    games: `participar em ${games}`,
    goals: `marcar ${count} ${count === 1 ? "golo" : "golos"}`,
    assists: `fazer ${count} ${count === 1 ? "assistência" : "assistências"}`,
    wins: `ganhar ${games}`,
    unbeatenWins: `conseguir ${wins} numa sequência sem derrotas`,
    winStreak: `ganhar ${games}${count > 1 ? " seguidos" : ""}`,
    unbeatenGames: `jogar ${games}${count > 1 ? " seguidos" : ""} sem perder`,
    goalsAndAssists: `somar ${count} ${count === 1 ? "golo ou assistência" : "golos e assistências"}`,
    cleanSheets: `terminar ${games} sem sofrer golos`,
  }[event.objective?.metric];
  if (!action) return "Consulta as condições da missão.";
  if (event.scope === "collective") return `Objetivo coletivo: ${action}.`;
  const verbs = {
    participar: "Participa",
    marcar: "Marca",
    fazer: "Faz",
    ganhar: "Ganha",
    conseguir: "Consegue",
    jogar: "Joga",
    somar: "Soma",
    terminar: "Termina",
  };
  return `${action.replace(/^[a-z]+/, (word) => verbs[word])}.`;
}

export const medal = (position) =>
  ["🥇", "🥈", "🥉"][position - 1] || `${position}.º`;
export const hasTemporaryReward = (reward = {}) =>
  !!reward.specialId ||
  (reward.statDuration !== "permanent" &&
    Object.values(reward.boosts || {}).some((value) => value > 0));
export function rewardText(reward = {}) {
  const parts = ATTRIBUTES.filter(([key]) => reward.boosts?.[key] > 0).map(
    ([key, name]) =>
      `${name} +${reward.boosts[key]}${reward.statDuration === "permanent" ? " permanente" : " semanal"}`,
  );
  if (reward.specialId)
    parts.push(
      `${reward.cardTheme?.name || themeName(reward.specialId)} · carta semanal`,
    );
  return parts.join(" · ") || "Sem recompensa";
}
export function validEventReward(reward, themes = []) {
  if (!reward || typeof reward !== "object" || Array.isArray(reward))
    return false;
  if (!["stats", "card", "both"].includes(reward.mode)) return false;
  if (!["weekly", "permanent"].includes(reward.statDuration)) return false;
  if (
    !reward.boosts ||
    typeof reward.boosts !== "object" ||
    Array.isArray(reward.boosts)
  )
    return false;
  const values = Object.entries(reward.boosts),
    permanent = reward.statDuration === "permanent";
  if (
    !values.every(
      ([key, value]) =>
        ATTRIBUTES.some(([k]) => k === key) &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <=
          (permanent
            ? EVENT_LIMITS.permanentLifetime
            : EVENT_LIMITS.weeklyStat),
    )
  )
    return false;
  const total = values.reduce((sum, [, value]) => sum + value, 0);
  if (!permanent && total > EVENT_LIMITS.weeklyTotal) return false;
  const card = reward.specialId;
  if (
    card &&
    !THEMES.includes(card) &&
    !themes.some((theme) => card === `saved:${theme.id}`)
  )
    return false;
  if (reward.points || reward.badge || reward.title) return false;
  if (
    (reward.mode === "stats" && (!total || card)) ||
    (reward.mode === "card" && (!card || total)) ||
    (reward.mode === "both" && (!card || !total))
  )
    return false;
  return total > 0 || !!card;
}
export const eventEndMillis = (event) =>
  event.indefinite === true ? Infinity : +asDate(event.endsAt);
export const eventEndLabel = (event) =>
  event.indefinite === true
    ? "Sem prazo"
    : `${formatDateTime(event.endsAt)} · Lisboa`;
export function missionUnlockedAt(event, uid, completions = []) {
  const ids = event.prerequisites?.missionIds || [];
  if (event.kind !== "mission" || !ids.length)
    return asDate(event.startsAt) || new Date(0);
  const dates = ids.map((id) => {
    const credits = completions.filter(
      (row) =>
        row.uid === uid &&
        row.eventId === id &&
        typeof row.periodKey === "string" &&
        !row.revokedAt,
    );
    const times = credits
      .map((row) => +asDate(row.completedAt || row.createdAt || row.startsAt))
      .filter((time) => Number.isFinite(time) && time > 0);
    return times.length ? Math.min(...times) : null;
  });
  if (event.prerequisites.mode === "any") {
    const known = dates.filter((time) => time !== null);
    return known.length ? new Date(Math.min(...known)) : null;
  }
  return dates.every((time) => time !== null)
    ? new Date(Math.max(...dates))
    : null;
}
export const missionUnlocked = (event, uid, completions = []) =>
  missionUnlockedAt(event, uid, completions) !== null;
export function periodWindow(event, date = new Date()) {
  let start = asDate(event.startsAt),
    end = event.indefinite ? null : asDate(event.endsAt),
    key = "once";
  if (event.cadence === "daily" || event.cadence === "weekly") {
    const length = (event.cadence === "daily" ? 1 : 7) * 86400000;
    const index = Math.max(
      0,
      Math.floor(
        (Math.min(+date, end ? +end - 1 : Infinity) - +start) / length,
      ),
    );
    key = `period-${index}`;
    start = new Date(+start + index * length);
    end = new Date(Math.min(end ? +end : Infinity, +start + length));
  }
  return { start, end, key };
}
export function objectiveProgress(uid, event, games, date = new Date()) {
  const window = periodWindow(event, date);
  const matches = games
    .filter(
      (g) =>
        g.status === "closed" &&
        !g.deleting &&
        participants(g).includes(uid) &&
        +asDate(g.closedAt || g.scheduledAt) >=
          Math.max(+window.start, +asDate(event.progressStartsAt)) &&
        (!window.end || +asDate(g.closedAt || g.scheduledAt) < +window.end) &&
        +asDate(g.closedAt || g.scheduledAt) <= +date,
    )
    .sort(
      (a, b) =>
        +asDate(a.closedAt || a.scheduledAt) -
          +asDate(b.closedAt || b.scheduledAt) ||
        String(a.id).localeCompare(String(b.id)),
    );
  let value = 0,
    streak = 0;
  for (const game of matches) {
    const outcome = matchOutcome(uid, game),
      performance = matchPerformance(uid, game);
    switch (event.objective?.metric) {
      case "games":
        value++;
        break;
      case "goals":
        value += performance.goals;
        break;
      case "assists":
        value += performance.assists;
        break;
      case "goalsAndAssists":
        value += performance.goals + performance.assists;
        break;
      case "cleanSheets": {
        const ownA = [
          ...(game.teamA?.starters || []),
          ...(game.teamA?.bench || []),
        ].includes(uid);
        if (game.score?.[ownA ? "teamB" : "teamA"] === 0) value++;
        break;
      }
      case "unbeatenGames":
        streak = outcome >= 0 ? streak + 1 : 0;
        value = Math.max(value, streak);
        break;
      case "wins":
        if (outcome > 0) value++;
        break;
      case "unbeatenWins":
        if (outcome < 0) streak = 0;
        else if (outcome > 0) streak++;
        value = Math.max(value, streak);
        break;
      case "winStreak":
        streak = outcome > 0 ? streak + 1 : 0;
        value = Math.max(value, streak);
        break;
    }
  }
  return value;
}
export function objectiveReachedAt(uid, event, games, date = new Date()) {
  const times = [
    ...new Set(
      games
        .filter(
          (game) =>
            game.status === "closed" &&
            !game.deleting &&
            participants(game).includes(uid),
        )
        .map((game) => +asDate(game.closedAt || game.scheduledAt))
        .filter((time) => time <= +date),
    ),
  ].sort((a, b) => a - b);
  for (const time of times)
    if (
      objectiveProgress(uid, event, games, new Date(time)) >=
      event.objective.target
    )
      return new Date(time).toISOString();
  return null;
}

export function eventRanking(
  event,
  votes,
  games,
  manual = [],
  date = new Date(),
  completions = [],
) {
  const ids = [...new Set(event.participantIds || [])];
  const progressFor = (uid, mission = event) => {
    const unlocked = missionUnlockedAt(event, uid, completions);
    if (!unlocked) return 0;
    return objectiveProgress(
      uid,
      { ...mission, progressStartsAt: unlocked },
      games,
      date,
    );
  };
  const counts = Object.fromEntries(ids.map((uid) => [uid, 0]));
  if (event.method === "vote")
    for (const vote of votes) {
      if (
        !ids.includes(vote.id) ||
        +asDate(vote.submittedAt) >
          (event.votingEndsAt
            ? +asDate(event.votingEndsAt)
            : eventEndMillis(event))
      )
        continue;
      for (const uid of [...new Set(vote.selections || [])].slice(
        0,
        event.votesPerUser || 1,
      ))
        if (ids.includes(uid) && (event.allowSelfVote || uid !== vote.id))
          counts[uid]++;
    }
  const race = event.kind !== "mission" && event.method === "objective";
  const reached = Object.fromEntries(
    ids.map((uid) => [
      uid,
      race ? objectiveReachedAt(uid, event, games, date) : null,
    ]),
  );
  const scores = Object.fromEntries(
    ids.map((uid) => [
      uid,
      objectiveProgress(
        uid,
        {
          ...event,
          objective: { metric: event.tieBreak === "goals" ? "goals" : "games" },
        },
        games,
        race && reached[uid] ? new Date(reached[uid]) : date,
      ),
    ]),
  );
  const collective =
    event.scope === "collective"
      ? ids.reduce((sum, uid) => sum + progressFor(uid), 0)
      : null;
  const ranking = ids.map((uid) => ({
    uid,
    votes: counts[uid],
    progress: collective ?? progressFor(uid),
    tieScore: scores[uid],
    ...(race ? { reachedAt: reached[uid] } : {}),
  }));
  ranking.sort((a, b) => {
    const tie =
      (event.tieBreak === "uid" ? 0 : b.tieScore - a.tieScore) ||
      a.uid.localeCompare(b.uid);
    if (event.method === "admin")
      return (
        (manual.indexOf(a.uid) < 0 ? 999 : manual.indexOf(a.uid)) -
          (manual.indexOf(b.uid) < 0 ? 999 : manual.indexOf(b.uid)) || tie
      );
    if (race)
      return (
        (a.reachedAt ? +new Date(a.reachedAt) : Infinity) -
          (b.reachedAt ? +new Date(b.reachedAt) : Infinity) ||
        (a.reachedAt && b.reachedAt ? tie : b.progress - a.progress || tie)
      );
    return (
      (event.method === "vote" ? b.votes - a.votes : b.progress - a.progress) ||
      tie
    );
  });
  return ranking.map((row, index) => ({
    ...row,
    position: index + 1,
    eligible:
      event.method === "vote"
        ? row.votes >= (event.minVotes || 1)
        : event.method === "admin"
          ? manual.includes(row.uid)
          : missionUnlocked(event, row.uid, completions) &&
            row.progress >= (event.objective?.target || 1),
  }));
}
export function votingFlags(votes) {
  const flags = [];
  for (const vote of votes)
    for (const candidate of new Set(vote.selections || [])) {
      if (
        votes
          .find((other) => other.id === candidate)
          ?.selections?.includes(vote.id) &&
        vote.id.localeCompare(candidate) < 0
      )
        flags.push({
          kind: "reciprocal",
          users: [vote.id, candidate],
          message:
            "Votos recíprocos; verificar o contexto, sem presumir irregularidade.",
        });
    }
  return flags;
}
