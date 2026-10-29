import { ratingQuorum, ratingQuorumCount } from "./rating-quorum.js";
// Immutable game attempts and historical votes. No browser clock decides results.
import { pathObjectiveRequirements } from "./path-missions.js";
import { pathNode } from "./path-model.js";
import {
  FEEDBACK,
  participants,
  asDate,
  calculateGameAggregate,
} from "./utils.js";

export const PATH_REVIEW_MS = 48 * 60 * 60 * 1000;
export const pathMillis = (value) =>
  value ? (value.toMillis?.() ?? +asDate(value)) : 0;
export const pathReviewDeadline = (game) =>
  pathMillis(game?.closedAt) ? pathMillis(game.closedAt) + PATH_REVIEW_MS : 0;
export const pathUsesRatings = (objective) =>
  pathObjectiveRequirements(objective).criteria.length > 0;

export function freezePathForGame(state, game, now) {
  if (!state?.active || !participants(game).includes(state.uid)) return state;
  if (
    (state.excludedGameIds || []).includes(game.id) ||
    (state.history || []).some((row) => row.gameId === game.id) ||
    (state.pending || []).some((row) => row.gameId === game.id)
  )
    return state;
  if (pathMillis(state.active.acceptedAt) > pathMillis(now)) return state;
  const next = structuredClone(state);
  next.pending ||= [];
  next.pending.push({
    ...next.active,
    gameId: game.id,
    frozenAt: now,
    windowVersion: next.active.offer.proposalVersion >= 3 ? 3 : 1,
  });
  next.active = null;
  const route = pathNode(state.active.nodeId)?.route;
  if (route && state.active.offer.family) {
    next.recentPathFamilies ||= {};
    next.recentPathFamilies[route] = [
      ...(next.recentPathFamilies[route] || []),
      state.active.offer.family,
    ].slice(-3);
  }
  next.revision++;
  return next;
}

// Each trusted revision contains the complete vote at that instant. Baselines
// allow the first edit of a pre-journal vote without losing its old contents.
export function pathVotesAt(votes, revisions, cutoff) {
  const latest = new Map();
  const take = (vote, recordedAt, order = "") => {
    const at = pathMillis(recordedAt);
    if (!at || at > cutoff || !vote?.raterId || !vote.targetId) return;
    const key = JSON.stringify([vote.raterId, vote.targetId]);
    const previous = latest.get(key);
    if (
      !previous ||
      at > previous.at ||
      (at === previous.at && order > previous.order)
    )
      latest.set(key, { vote, at, order });
  };
  for (const vote of votes)
    take(vote, vote.updatedAt || vote.submittedAt || vote.createdAt, "0");
  for (const row of revisions)
    take(
      row.vote,
      row.recordedAt,
      row.order === "baseline" ? "000000000000" : row.order || "1",
    );
  return [...latest.values()].map((row) => row.vote);
}

export function pathHistoricalSummary(game, votes, revisions, cutoff) {
  const roster = participants(game);
  const historical = pathVotesAt(votes, revisions, cutoff)
    .filter(
      (vote) =>
        vote.submitted &&
        pathMillis(vote.submittedAt || vote.createdAt || vote.updatedAt) >=
          pathMillis(game.closedAt) &&
        roster.includes(vote.raterId) &&
        roster.includes(vote.targetId) &&
        vote.ratings &&
        typeof vote.ratings === "object",
    )
    .map((vote) => ({
      ...vote,
      ratings: Object.fromEntries(
        Object.entries(vote.ratings).map(([key, value]) => [
          key,
          (key === "goalkeeping" && value === null) ||
          (Number.isInteger(value) && value >= 0 && value <= 5)
            ? value
            : undefined,
        ]),
      ),
    }));
  return {
    status: game.status,
    closedAt: game.closedAt,
    teamA: game.teamA,
    teamB: game.teamB,
    players: Object.fromEntries(
      roster.map((uid) => {
        const own = historical.filter((vote) => vote.targetId === uid);
        const eligible = !own.some(
          (vote) => vote.raterId === uid && vote.ratings?.goalkeeping === null,
        );
        return [
          uid,
          {
            ...calculateGameAggregate(own),
            goalkeepingEligible: eligible,
            // Exact integer sums avoid reconstructing a total from a rounded mean.
            ratingSums: Object.fromEntries(FEEDBACK.map(([key]) => [key,
              own.reduce((sum, vote) => sum + (Number.isFinite(vote.ratings?.[key]) ? vote.ratings[key] : 0), 0),
            ])),
            selfGoalkeepingRated: own.some(vote => vote.raterId === uid && Number.isFinite(vote.ratings?.goalkeeping)),
            ...(game.ratingWaivers ? {ratingQuorumCounts: ratingQuorum(game, historical, uid, eligible, pathMillis(cutoff))} : {}),
            ratingCounts: Object.fromEntries(
              FEEDBACK.map(([key]) => [
                key,
                key === "goalkeeping" && !eligible
                  ? 0
                  : own.filter((vote) => Number.isFinite(vote.ratings?.[key]))
                      .length,
              ]),
            ),
          },
        ];
      }),
    ),
  };
}

export function pathWindowResult(objective, game, summary, uid, now, evaluate) {
  if (
    !game ||
    !["open", "closed"].includes(game.status) ||
    game.deleting ||
    !participants(game).includes(uid)
  )
    return {
      status: "cancelled",
      reason: !game
        ? "O jogo associado a esta missão já não está disponível. O progresso anterior mantém-se."
        : game.deleting
          ? "O jogo associado a esta missão foi eliminado. O progresso anterior mantém-se."
          : !["open", "closed"].includes(game.status)
            ? "O jogo associado a esta missão foi cancelado ou voltou a rascunho. O progresso anterior mantém-se."
            : "Deixaste de constar nos participantes do jogo desta missão. O progresso anterior mantém-se.",
    };
  if (game.status !== "closed")
    return {
      status: "waiting",
      reason: "Missão bloqueada: este jogo está aberto.",
    };
  const requirements = pathObjectiveRequirements(objective);
  if (
    requirements.conditions?.some(
      (row) =>
        row.metric === "position" && game.positions?.[uid] !== row.target,
    )
  )
    return {
      status: "cancelled",
      reason:
        "Tentativa cancelada: posição de jogo diferente da exigida. O progresso foi preservado.",
    };
  if (
    objective.kind === "conditions" &&
    requirements.goalkeeper &&
    game.positions?.[uid] !== "GR"
  )
    return {
      status: "cancelled",
      reason:
        "Tentativa cancelada: não jogaste na posição GR. O progresso foi preservado.",
    };
  if (!pathUsesRatings(objective))
    return evaluate(objective, game, summary, uid);
  const deadline = pathReviewDeadline(game);
  const player = summary?.players?.[uid];
  const criteria = requirements.criteria;
  if (deadline && now < deadline && player) {
    const total = new Set(participants(game)).size;
    // Early settlement assumes two stars for each outstanding vote (league rule).
    // Waiver credit meets the final quorum only; it cannot supply early real votes.
    const enough = criteria.every(key =>
      Number.isInteger(player.ratingCounts?.[key]) && player.ratingCounts[key] >= 7 &&
      player.ratingCounts[key] <= total && Number.isFinite(player.ratingSums?.[key]),
    );
    if (enough && (!requirements.goalkeeper || player.selfGoalkeepingRated)) {
      const worstPlayer = { ...player };
      for (const key of criteria) worstPlayer[key] =
        (player.ratingSums[key] + 2 * (total - player.ratingCounts[key])) / total;
      const worst = evaluate({ ...objective, minRatings: 7 }, game,
        { ...summary, players: { ...summary.players, [uid]: worstPlayer } }, uid);
      if (worst.status === "success") {
        const actual = evaluate({ ...objective, minRatings: 7 }, game, summary, uid);
        if (actual.status === "success") return {
          ...actual,
          reason: `Sucesso antecipado garantido. ${actual.reason}`,
          earlySettlement: true,
          missingVoteStars: 2,
          evaluatedAt: now,
          guaranteedRatings: Object.fromEntries(criteria.map(key => [key, worstPlayer[key]])),
          reviewDeadline: deadline,
        };
      }
    }
  }
  if (!deadline || now < deadline)
    return {
      status: "waiting",
      reason: "Avaliações em curso. Entrega antecipada com sete votos por critério e sucesso garantido; caso contrário, apuramento às 48 horas.",
      reviewDeadline: deadline,
    };
  if (
    objective.kind === "conditions" &&
    requirements.goalkeeper &&
    player?.goalkeepingEligible === false
  )
    return {
      status: "cancelled",
      reason:
        "Tentativa cancelada: participação a GR não elegível. O progresso foi preservado.",
      reviewDeadline: deadline,
    };
  if (
    criteria.some(
      (key) =>
        !Number.isFinite(player?.[key]) ||
        ratingQuorumCount(player,key,0) < 7,
    )
  )
    return {
      status: "cancelled",
      reason:
        "Tentativa cancelada: faltaram sete votos válidos em cada critério às 48 horas. O progresso foi preservado.",
      reviewDeadline: deadline,
    };
  return {
    ...evaluate({ ...objective, minRatings: 7 }, game, summary, uid),
    reviewDeadline: deadline,
  };
}
