// Immutable game attempts and historical votes. No browser clock decides results.
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
  !["goals", "assists", "wins"].includes(objective.kind);

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
      reason:
        "Tentativa cancelada sem perder progresso: o jogo ou a participação deixou de ser elegível.",
    };
  if (game.status !== "closed")
    return {
      status: "waiting",
      reason: "Missão bloqueada: este jogo está aberto.",
    };
  if (!pathUsesRatings(objective))
    return evaluate(objective, game, summary, uid);
  const deadline = pathReviewDeadline(game);
  if (!deadline || now < deadline)
    return {
      status: "waiting",
      reason: "Avaliações em curso. Apuramento no fim das 48 horas.",
      reviewDeadline: deadline,
    };
  const player = summary?.players?.[uid];
  const criteria = objective.criteria || [objective.criterion];
  if (
    criteria.some(
      (key) =>
        !Number.isFinite(player?.[key]) ||
        (player?.ratingCounts?.[key] || 0) < 7,
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
