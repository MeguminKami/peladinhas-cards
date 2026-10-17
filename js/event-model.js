import {
  ATTRIBUTES,
  FEEDBACK,
  THEMES,
  asDate,
  participants,
  matchPerformance,
  matchOutcome,
  themeName,
  formatDate,
  formatDateTime,
} from "./utils.js";
import { CARD_POLICY, durationName, cardExpiry } from "./card-achievements.js";
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
  ratingGames: "Estrelas · jogos com mínimo",
  ratingAverage: "Estrelas · média dos últimos jogos",
  ratingStreak: "Estrelas · jogos consecutivos",
  ratingWins: "Estrelas · vitórias com mínimo",
});
export const isRatingObjective = (objective) =>
  ["ratingGames", "ratingAverage", "ratingStreak", "ratingWins"].includes(
    objective?.metric,
  );

export function validRatingObjective(objective, scope = "individual") {
  if (!isRatingObjective(objective)) return true;
  return (
    scope === "individual" &&
    Array.isArray(objective.attributes) &&
    objective.attributes.length > 0 &&
    objective.attributes.length <= FEEDBACK.length &&
    new Set(objective.attributes).size === objective.attributes.length &&
    objective.attributes.every((key) => FEEDBACK.some(([id]) => id === key)) &&
    ["all", "mean"].includes(objective.combine) &&
    ["gte", "gt"].includes(objective.comparison) &&
    Number.isFinite(objective.threshold) &&
    objective.threshold >= 0 &&
    objective.threshold <= 5 &&
    !(objective.comparison === "gt" && objective.threshold === 5) &&
    Number.isInteger(objective.minRatings) &&
    objective.minRatings >= 1 &&
    objective.minRatings <= 100
  );
}

// Only server-produced community aggregates are used; missing dimensions never become zeroes.
export function ratingObjectiveState(
  uid,
  objective,
  matches,
  date = new Date(),
) {
  const attributes = objective.attributes || [];
  const valueFor = (game) => {
    const row = game.ratingSummary?.[uid];
    if (
      !row ||
      !row.evaluatedAt ||
      +asDate(row.evaluatedAt) > +date ||
      !attributes.length
    )
      return null;
    const values = attributes.map((key) =>
      Number.isFinite(row[key]) &&
      row[key] >= 0 &&
      row[key] <= 5 &&
      (row.ratingCounts?.[key] || 0) >= objective.minRatings
        ? row[key]
        : null,
    );
    return values.every((value) => value !== null) ? values : null;
  };
  const passes = (values) => {
    if (!values) return false;
    const selected =
      objective.combine === "mean"
        ? [values.reduce((sum, value) => sum + value, 0) / values.length]
        : values;
    return selected.every((value) =>
      objective.comparison === "gt"
        ? value > objective.threshold
        : value >= objective.threshold,
    );
  };
  if (objective.metric === "ratingAverage") {
    const recent = matches.slice(-objective.target);
    const rows = recent.map(valueFor);
    const complete = recent.length === objective.target && rows.every(Boolean);
    const averages = complete
      ? attributes.map(
          (_, index) =>
            rows.reduce((sum, row) => sum + row[index], 0) / rows.length,
        )
      : null;
    return {
      progress: passes(averages) ? objective.target : 0,
      games: recent.length,
      ratedGames: rows.filter(Boolean).length,
      averages: averages
        ? Object.fromEntries(attributes.map((key, i) => [key, averages[i]]))
        : null,
    };
  }
  let progress = 0,
    streak = 0;
  for (const game of matches) {
    const qualified =
      passes(valueFor(game)) &&
      (objective.metric !== "ratingWins" || matchOutcome(uid, game) > 0);
    if (objective.metric === "ratingStreak") {
      streak = qualified ? streak + 1 : 0;
      progress = Math.max(progress, streak);
    } else if (qualified) progress++;
  }
  return { progress };
}
export function objectiveSummary(event) {
  const count = event.objective?.target || 1;
  if (isRatingObjective(event.objective)) {
    const o = event.objective;
    const attributes = (o.attributes || [])
      .map((key) => FEEDBACK.find(([id]) => id === key)?.[1] || key)
      .join(" + ");
    const criterion = `${o.comparison === "gt" ? "mais de" : "pelo menos"} ${o.threshold} estrelas ${o.combine === "mean" ? "na média de" : "em cada dimensão:"} ${attributes}`;
    const mode = {
      ratingGames: `Completa ${count} jogos com`,
      ratingStreak: `Completa ${count} jogos consecutivos com`,
      ratingWins: `Ganha ${count} jogos com`,
      ratingAverage: `Nos últimos ${count} jogos, mantém uma média de`,
    }[o.metric];
    return `${mode} ${criterion}. Mínimo de ${o.minRatings} avaliações por dimensão e jogo. Só contam jogos encerrados neste período, após o desbloqueio; dimensões sem avaliação não contam. ${o.metric === "ratingAverage" ? "A janela inclui os últimos jogos disputados, mesmo quando ainda aguardam avaliações; o mínimo tem de estar cumprido no momento da verificação." : o.metric === "ratingStreak" ? "Um jogo abaixo do mínimo ou por avaliar interrompe a sequência." : "Os jogos não precisam de ser consecutivos."}`;
  }
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
  if (["collective", "team"].includes(event.scope))
    return `Objetivo da equipa: ${action}.`;
  if (event.scope === "group") return `Objetivo do grupo: ${action}.`;
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
export const positionLabel = (position) =>
  position <= 3 ? `${medal(position)} ${position}.º` : `${position}.º`;

// Shared live positions do not change the order used to award prizes.
export function sharedRankingPositions(event, rows) {
  if (
    event.method === "admin" ||
    ["closed", "cancelled"].includes(event.status)
  )
    return rows;
  const key = event.method === "vote" ? "votes" : "progress";
  const positions = new Map();
  return rows.map((row, index) => {
    // Reaching the objective fixes the official chronological podium.
    if (event.method === "objective" && row.reachedAt) return row;
    const value = row[key] ?? 0;
    if (!positions.has(value)) positions.set(value, index + 1);
    return { ...row, position: positions.get(value) };
  });
}
export const hasTemporaryReward = (reward = {}) =>
  (!!reward.specialId &&
    (CARD_POLICY[reward.specialId]?.duration ||
      reward.cardDuration ||
      reward.statDuration) !== "permanent") ||
  (reward.statDuration !== "permanent" &&
    Object.values(reward.boosts || {}).some((value) => value > 0));
export function rewardText(reward = {}) {
  const parts = ATTRIBUTES.filter(([key]) => reward.boosts?.[key] > 0).map(
    ([key, name]) =>
      `${name} +${reward.boosts[key]} ${reward.statDuration === "permanent" ? "permanente" : reward.statDuration === "monthly" ? "mensal" : "semanal"}`,
  );
  if (reward.specialId)
    parts.push(
      `${reward.cardTheme?.name || themeName(reward.specialId)} · ${durationName(CARD_POLICY[reward.specialId]?.duration || reward.cardDuration || reward.statDuration)}`,
    );
  return parts.join(" · ") || "Sem recompensa";
}
export function rewardExpiry(start, duration) {
  const expiry = new Date(+start);
  if (duration !== "monthly") return new Date(+expiry + 7 * 86400000);
  const day = expiry.getUTCDate();
  expiry.setUTCDate(1);
  expiry.setUTCMonth(expiry.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth() + 1, 0),
  ).getUTCDate();
  expiry.setUTCDate(Math.min(day, lastDay));
  return expiry;
}
export function validEventReward(reward, themes = []) {
  if (!reward || typeof reward !== "object" || Array.isArray(reward))
    return false;
  if (!["stats", "card", "both"].includes(reward.mode)) return false;
  if (!["weekly", "monthly", "permanent"].includes(reward.statDuration))
    return false;
  if (
    reward.cardDuration &&
    !["weekly", "monthly", "season", "year", "permanent"].includes(
      reward.cardDuration,
    )
  )
    return false;
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
  event.indefinite === true ? "Sem prazo" : formatDateTime(event.endsAt);
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
export function objectiveProgress(
  uid,
  event,
  games,
  date = new Date(),
  teamStats = ["team", "collective"].includes(event.scope),
  ratingDetails = false,
) {
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
  if (isRatingObjective(event.objective)) {
    const state = ratingObjectiveState(
      uid,
      event.objective,
      matches,
      new Date(Math.min(+date, window.end ? +window.end - 1 : Infinity)),
    );
    return ratingDetails ? state : state.progress;
  }
  let value = 0,
    streak = 0;
  for (const game of matches) {
    const outcome = matchOutcome(uid, game);
    const side = ["teamA", "teamB"].find((side) =>
      [...(game[side]?.starters || []), ...(game[side]?.bench || [])].includes(
        uid,
      ),
    );
    const performance = teamStats
      ? {
          goals: game.score?.[side] || 0,
          assists: game.performance?.[side]?.assists?.length || 0,
        }
      : matchPerformance(uid, game);
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
export function scopedObjectiveProgress(
  uid,
  event,
  games,
  date = new Date(),
  completions = [],
) {
  const progressFor = (id) => {
    const unlocked = missionUnlockedAt(event, id, completions);
    if (!unlocked) return 0;
    return objectiveProgress(
      id,
      { ...event, progressStartsAt: unlocked },
      games,
      date,
    );
  };
  return event.scope === "group"
    ? [...new Set(event.participantIds || [])].reduce(
        (sum, id) => sum + progressFor(id),
        0,
      )
    : progressFor(uid);
}
export function objectiveReachedAt(
  uid,
  event,
  games,
  date = new Date(),
  completions = [],
) {
  if (
    isRatingObjective(event.objective) &&
    scopedObjectiveProgress(uid, event, games, date, completions) <
      event.objective.target
  )
    return null;
  const times = [
    ...new Set(
      games
        .filter(
          (game) =>
            game.status === "closed" &&
            !game.deleting &&
            (event.scope === "group"
              ? participants(game).some((id) =>
                  event.participantIds?.includes(id),
                )
              : participants(game).includes(uid)),
        )
        .flatMap((game) => [
          +asDate(game.closedAt || game.scheduledAt),
          ...(isRatingObjective(event.objective)
            ? [+asDate(game.ratingSummary?.[uid]?.evaluatedAt)]
            : []),
        ])
        .filter((time) => time <= +date),
    ),
  ].sort((a, b) => a - b);
  for (const time of times)
    if (
      scopedObjectiveProgress(uid, event, games, new Date(time), completions) >=
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
  const progressFor = (uid) =>
    scopedObjectiveProgress(uid, event, games, date, completions);
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
      race ? objectiveReachedAt(uid, event, games, date, completions) : null,
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
  const ranking = ids.map((uid) => ({
    uid,
    votes: counts[uid],
    progress: progressFor(uid),
    ...(isRatingObjective(event.objective)
      ? {
          ratingState: missionUnlockedAt(event, uid, completions)
            ? objectiveProgress(
                uid,
                {
                  ...event,
                  progressStartsAt: missionUnlockedAt(event, uid, completions),
                },
                games,
                date,
                false,
                true,
              )
            : null,
        }
      : {}),
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
