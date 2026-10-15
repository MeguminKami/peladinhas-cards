import {
  evaluateCardAchievements,
  periodCardAwards,
} from "./card-unlock-rules.js";
import { CARD_CRITERIA } from "./card-unlock-rules.js";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  mergeCardAchievements,
  availableCardAchievements,
  gameCardContext,
  leaguePeriod,
  qualifiedCardGame,
  cardExpiry,
} from "../js/card-achievements.js";
import {
  ATTRIBUTES,
  FEEDBACK,
  asDate,
  participants,
  matchPerformance,
  matchOutcome,
  matchGoalMargin,
  matchEvolutionContext,
  calculateInitialBaseline,
  convert20To99,
  calculateGameDeltas,
  calculateOverall,
  normalizeOvrWeights,
  completeInitial,
  average,
} from "../js/utils.js";
import { calculateGameAggregate } from "../js/utils.js";
import { applyEventRewards } from "../js/event-rules.js";
import { balanceMatches } from "../js/team-balance.js";
const rows = (snap) => snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
const dateValue = (value) => +asDate(value);

export async function collectionContext(date = new Date()) {
  const db = getFirestore();
  const [
    users,
    games,
    summaries,
    balances,
    initials,
    communities,
    weights,
    rewards,
  ] = await Promise.all([
    db.collection("users").get(),
    db.collection("games").get(),
    db.collection("gameSummaries").get(),
    db.collection("gameBalances").get(),
    db.collection("initialRatings").get(),
    db.collection("communitySummaries").get(),
    db.doc("settings/ovr").get(),
    db.collection("eventRewards").get(),
  ]);
  const summaryRows = rows(summaries);
  for (const game of rows(games).filter(
    (game) => game.status === "closed" && !game.deleting,
  )) {
    const summary = summaryRows.find((row) => row.id === game.id);
    if (
      participants(game).every(
        (uid) =>
          summary?.players?.[uid]?.ratingCounts &&
          summary?.players?.[uid]?.evaluatedAt,
      )
    )
      continue;
    const feedback = rows(
      await db.collection(`games/${game.id}/feedback`).get(),
    ).filter(
      (vote) =>
        vote.submitted &&
        vote.ratings &&
        typeof vote.ratings === "object" &&
        participants(game).includes(vote.raterId),
    );
    const players = Object.fromEntries(
      participants(game).map((uid) => {
        const votes = feedback.filter((vote) => vote.targetId === uid);
        return [
          uid,
          {
            ...calculateGameAggregate(votes),
            count: votes.length,
            evaluatedAt: new Date(
              Math.max(
                dateValue(game.closedAt || game.scheduledAt),
                ...votes.map(
                  (vote) =>
                    dateValue(
                      vote.updatedAt || vote.submittedAt || vote.createdAt,
                    ) || 0,
                ),
              ),
            ).toISOString(),
            ratingCounts: Object.fromEntries(
              FEEDBACK.map(([key]) => [
                key,
                votes.filter((vote) => Number.isFinite(vote.ratings?.[key]))
                  .length,
              ]),
            ),
          },
        ];
      }),
    );
    const best = Math.max(
      0,
      ...Object.values(players).map((player) => player.overall || 0),
    );
    for (const player of Object.values(players))
      player.mvp =
        player.count >= 3 && player.overall >= 4.8 && player.overall === best;
    if (summary) summary.players = players;
    else summaryRows.push({ id: game.id, players });
  }
  return {
    date,
    users: rows(users).filter((user) => !user.disabled),
    games: rows(games)
      .filter(
        (game) =>
          game.status === "closed" &&
          !game.deleting &&
          dateValue(game.closedAt || game.scheduledAt) <= +date,
      )
      .sort(
        (a, b) =>
          dateValue(a.closedAt || a.scheduledAt) -
            dateValue(b.closedAt || b.scheduledAt) || a.id.localeCompare(b.id),
      ),
    summaries: summaryRows,
    balances: rows(balances),
    initials: rows(initials),
    communities: rows(communities),
    rewards: rows(rewards),
    weights: normalizeOvrWeights(weights.data()),
  };
}
export function collectionPlayer(context, uid, officialSince = null) {
  const user = context.users.find((user) => user.uid === uid);
  const initial = context.initials.find(
    (initial) => initial.uid === uid || initial.id === uid,
  );
  if (!user || !completeInitial(initial?.ratings20)) return null;
  const community = context.communities.find(
    (community) => community.id === uid,
  );
  const stats = Object.fromEntries(
    Object.entries(calculateInitialBaseline(initial.ratings20, community)).map(
      ([key, value]) => [key, convert20To99(value)],
    ),
  );
  let anchorOvr = null;
  const currentOverall = () =>
    calculateOverall(
      Object.fromEntries(
        Object.entries(stats).map(([key, value]) => [key, Math.round(value)]),
      ),
      context.weights,
      user.primaryPosition,
    );
  const aggregates = context.games
    .filter((game) => participants(game).includes(uid))
    .map((game) => {
      const summary =
        context.summaries.find((summary) => summary.id === game.id)?.players?.[
          uid
        ] || {};
      const balance = context.balances.find(
        (balance) => balance.id === game.id && balanceMatches(game, balance),
      );
      const row = {
        ...summary,
        ...matchPerformance(uid, game),
        ...gameCardContext(uid, game, balance),
        ...matchEvolutionContext(
          uid,
          game,
          context.summaries.find((summary) => summary.id === game.id)
            ?.players || {},
          balance,
        ),
        outcome: matchOutcome(uid, game),
        goalMargin: matchGoalMargin(uid, game),
        gameId: game.id,
        date: asDate(game.closedAt || game.scheduledAt),
      };
      if (
        officialSince &&
        +row.date >= dateValue(officialSince) &&
        anchorOvr === null
      )
        anchorOvr = currentOverall();
      const deltas = calculateGameDeltas(stats, row, {
        weights: context.weights,
        position: user.primaryPosition,
      });
      for (const [key, delta] of Object.entries(deltas))
        if (Number.isFinite(delta)) stats[key] += delta;
      row.progressionGain =
        anchorOvr === null ? null : currentOverall() - anchorOvr;
      row.ovr = currentOverall();
      return row;
    });
  return {
    uid,
    user,
    position: user.primaryPosition,
    ovr: currentOverall(),
    aggregates,
  };
}
export async function refreshPlayerCollection(uid, context = null) {
  context ||= await collectionContext();
  const db = getFirestore(),
    ref = db.doc(`cardCollections/${uid}`);
  const old = await ref.get();
  const community = context.communities.find((row) => row.id === uid);
  let officialSince = old.data()?.officialSince || null;
  if (!officialSince && community?.count >= 3) {
    const votes = rows(
      await db
        .collection("communityRatings")
        .where("targetId", "==", uid)
        .get(),
    )
      .filter((row) => row.submitted && completeInitial(row.ratings20))
      .map((row) => asDate(row.submittedAt || row.createdAt))
      .filter((date) => date && Number.isFinite(+date))
      .sort((a, b) => a - b);
    officialSince = (votes[2] || context.date).toISOString();
  }
  const player = collectionPlayer(context, uid, officialSince);
  if (!player) return [];
  const incoming = evaluateCardAchievements(player.aggregates, {
    date: context.date,
    officialSince,
  });
  return db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    const selectionRef = db.doc(`cardSelections/${uid}`);
    const selection = await tx.get(selectionRef);
    const existing = fresh.data()?.awards || [];
    const awards = mergeCardAchievements(existing, incoming);
    const selectedId = selection.data()?.selectedCardId;
    const eventCards = applyEventRewards(
      {},
      context.rewards || [],
      uid,
      context.date,
    ).specials;
    if (
      selectedId &&
      selectedId !== "base" &&
      ![
        ...availableCardAchievements(existing, context.date),
        ...eventCards,
      ].some((card) => card.id === selectedId)
    ) {
      tx.set(selectionRef, {
        uid,
        selectedCardId: "base",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.set(ref, {
      uid,
      version: 1,
      officialSince,
      awards,
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const award of awards.filter(
      (award) => !existing.some((prior) => prior.id === award.id),
    )) {
      tx.set(
        db.doc(
          `users/${uid}/notifications/collection-${award.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
        ),
        {
          type: "SPECIAL_CARD_UNLOCKED",
          title: "Nova carta conquistada",
          body: `Desbloqueaste ${award.name}.`,
          href: "#/profile",
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        },
      );
    }
    return availableCardAchievements(awards, context.date);
  });
}

// Calendar seasons: Jan–Feb, Mar–Apr, ...; league years: Jan–Apr, May–Aug, Sep–Dec.
export async function settleCollectionPeriods(context = null) {
  context ||= await collectionContext();
  const db = getFirestore();
  const players = context.users
    .map((user) => collectionPlayer(context, user.uid))
    .filter(Boolean);
  if (!context.games.length) return;
  const first = asDate(
    context.games[0].closedAt || context.games[0].scheduledAt,
  );
  for (const months of [2, 4]) {
    let period = leaguePeriod(first, months);
    while (+period.endsAt + 7 * 86400000 <= +context.date) {
      const ref = db.doc(`cardPeriodAwards/${period.id}`);
      const awards = periodCardAwards(
        players.map((player) => ({
          ...player,
          // Use the closing game OVR, not today's OVR, for the final tie-breaker.
          ovr:
            player.aggregates.filter((row) => +row.date < +period.endsAt).at(-1)
              ?.ovr || 0,
        })),
        period,
        months === 4 ? "toty" : "tots",
      );
      await db.runTransaction(async (tx) => {
        const settled = await tx.get(ref);
        if (settled.exists) return;
        const winners = await Promise.all(
          awards.map((award) => tx.get(db.doc(`cardCollections/${award.uid}`))),
        );
        tx.set(ref, {
          periodId: period.id,
          startsAt: period.startsAt,
          endsAt: period.endsAt,
          winners: awards.map((award) => award.uid),
          settledAt: FieldValue.serverTimestamp(),
        });
        awards.forEach((award, i) => {
          const { uid, ...record } = award;
          record.earnedAt = context.date.toISOString();
          record.expiresAt =
            record.duration === "permanent"
              ? null
              : cardExpiry(context.date, record.duration).toISOString();
          tx.set(
            db.doc(`cardCollections/${uid}`),
            {
              uid,
              awards: mergeCardAchievements(winners[i].data()?.awards || [], [
                record,
              ]),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          tx.set(db.doc(`users/${uid}/notifications/collection-${period.id}`), {
            type: "SPECIAL_CARD_UNLOCKED",
            title: "Prémio de ciclo",
            body: `Conquistaste ${record.name}.`,
            href: "#/profile",
            read: false,
            createdAt: FieldValue.serverTimestamp(),
          });
        });
      });
      period = leaguePeriod(period.endsAt, months);
    }
  }
}

export async function ensureFuttiesVote(context = null) {
  context ||= await collectionContext();
  const db = getFirestore(),
    period = leaguePeriod(context.date, 2);
  // Open the community ballot during the final week of each two-month season.
  if (+context.date < +period.endsAt - 7 * 86400000) return;
  const players = context.users
    .map((user) => collectionPlayer(context, user.uid))
    .filter(Boolean);
  const eligible = players
    .filter((player) => {
      const games = player.aggregates.filter(
        (row) =>
          qualifiedCardGame(row) &&
          +row.date >= +period.startsAt &&
          +row.date < +period.endsAt &&
          Number.isFinite(row.attitude) &&
          (row.ratingCounts?.attitude ?? row.count) >= 3,
      );
      return (
        games.length >= 4 && average(games.map((row) => row.attitude)) >= 4.3
      );
    })
    .map((player) => player.uid);
  if (!eligible.length || context.users.length < 2) return;
  const ref = db.doc(`events/futties-${period.id}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    tx.set(ref, {
      title: `FUTTIES · ${period.id}`,
      description:
        "Escolhe o favorito da comunidade. Os candidatos têm pelo menos quatro jogos avaliados e média de Atitude de 4,3 nesta época.",
      kind: "custom",
      audience: { mode: "all" },
      status: "open",
      rewardPrivacy: 1,
      minVotes: Math.max(1, Math.ceil(context.users.length / 3)),
      automaticCollectionVote: true,
      questions: [
        { id: "q1", label: "Favorito da comunidade", candidateIds: eligible },
      ],
      endsAt: Timestamp.fromDate(period.endsAt),
      createdAt: FieldValue.serverTimestamp(),
      createdBy: "system",
    });
    tx.set(ref.collection("private").doc("rewards"), {
      questions: {
        q1: {
          boosts: {},
          specialId: "futties",
          cardDuration: "permanent",
          criterion: CARD_CRITERIA.futties,
        },
      },
    });
  });
}
