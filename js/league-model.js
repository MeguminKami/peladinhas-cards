import { matchComponentAverages } from "./match-rating-summary.js";
import { policyAt } from "./system-policy.js";
import { weeklyComparison } from "./weekly-comparison.js";
import { calculatePlayerCard } from "./player-calculation.js";
import { cardWeek } from "./card-week.js";
import { balanceMatches } from "./team-balance.js";
import { availableSpecials, validCardSelection } from "./card-achievements.js";
import {
  asDate,
  normalizeOvrWeights,
  calculateBaseCard,
  calculateMatchStats,
  completeInitial,
  participants,
  matchOutcome,
  matchGoalMargin,
  matchEvolutionContext,
  matchPerformance,
} from "./utils.js";

export function assembleLeague({
  users,
  initials,
  community,
  games,
  summaries,
  settings,
  balances,
  weeklyCards,
  weeklyPhotos,
  events = [],
  eventRewards,
  collections,
  selections,
  previousCards,
  cycle = cardWeek(),
}) {
  const ovrWeights = normalizeOvrWeights(settings);
  const players = users
    .filter((u) => !u.disabled)
    .map((u) => {
      const initial = initials.find((x) => x.uid === u.uid)?.ratings20 || {},
        cs = community.find((x) => x.targetId === u.uid),
        matches = games.filter((g) => participants(g).includes(u.uid));
      const aggregates = matches
        .filter(
          (g) =>
            g.status === "closed" &&
            !g.deleting &&
            +asDate(g.closedAt || g.scheduledAt) <= Date.now(),
        )
        .map((g) => ({
          ...(summaries.find((x) => x.id === g.id)?.players?.[u.uid] || {}),
          ...matchPerformance(u.uid, g),
          outcome: matchOutcome(u.uid, g),
          goalMargin: matchGoalMargin(u.uid, g),
          ...matchEvolutionContext(
            u.uid,
            g,
            summaries.find((x) => x.id === g.id)?.players,
            balances.find((b) => b.id === g.id && balanceMatches(g, b)),
          ),
          date: asDate(g.closedAt || g.scheduledAt),
          gameId: g.id,
        }))
        .sort((a, b) => a.date - b.date);
      const calculation = calculatePlayerCard({
        uid: u.uid,
        initial,
        community: cs,
        aggregates,
        games,
        rewards: eventRewards,
        weights: ovrWeights,
        position: u.primaryPosition,
        createdAt:
          u.createdAt || initials.find((x) => x.uid === u.uid)?.createdAt,
      });
      const { stats, inactivity, ovr } = calculation;
      const player = {
        ...u,
        cardPhoto: weeklyPhotos.find((photo) => photo.uid === u.uid) || null,
        initial,
        communityCount: cs?.count || 0,
        community: cs,
        official: (cs?.count || 0) >= policyAt().rules.communityMinimum,
        hasCard: completeInitial(initial),
        stats,
        selectedCardId:
          weeklyCards.find((c) => c.uid === u.uid && c.weekId === cycle.weekId)
            ?.selectedCardId || null,
        ...weeklyComparison(
          { ...calculation, ovrCalculation: calculation.ovrCalculation },
          previousCards[u.uid],
          { rewards: eventRewards, uid: u.uid, date: new Date() },
        ),
        inactivity,
        ovr,
        cardType: calculateBaseCard(ovr),
        specials: [],
        eventBoosts: calculation.eventBoosts,
        progression: calculation.progression,
        cardCalculation: calculation.ovrCalculation,
        cardAggregates: aggregates,
        aggregates: aggregates.filter(
          (a) => matchComponentAverages(a).withoutGoalkeeping !== null,
        ),
        matches,
        matchStats: calculateMatchStats(u.uid, games),
        ...(cycle.phase === "closed"
          ? (() => {
              const snapshot = weeklyCards.find(
                (c) => c.uid === u.uid && c.weekId === cycle.weekId,
              );
              return snapshot
                ? {
                    ...snapshot.appearance,
                    stats: snapshot.stats,
                    selectedCardId: snapshot.selectedCardId || null,
                    eventBoosts: snapshot.eventBoosts || {},
                    cardPhoto: snapshot.cardPhoto || null,
                    ovr: snapshot.ovr,
                    ...weeklyComparison(snapshot, previousCards[u.uid], {
                      rewards: eventRewards,
                      uid: u.uid,
                    }),
                    inactivity: snapshot.inactivity || {
                      missed: 0,
                      penalty: 0,
                    },
                    cardType: snapshot.baseCard,
                    specials: snapshot.specials || [],
                    primaryPosition:
                      snapshot.primaryPosition || u.primaryPosition,
                    official: snapshot.official,
                    hasCard: true,
                    cardLocked: true,
                    cardCalculation: snapshot.ovrCalculation,
                  }
                : { hasCard: false, cardLocked: true };
            })()
          : {}),
      };
      if (player.hasCard && Number.isFinite(player.ovr) && player.ovr < 50) player.cardType = "scrap";
      const earnedCards =
        collections.find((row) => row.uid === u.uid || row.id === u.uid)
          ?.awards || [];
      const specials = availableSpecials(
        earnedCards,
        calculation.rewardSpecials,
      );
      return {
        ...player,
        specials,
        earnedCards,
        selectedCardId: validCardSelection(
          selections.find((row) => row.uid === u.uid || row.id === u.uid)
            ?.selectedCardId || player.selectedCardId,
          specials,
        ),
      };
    });
  return {
    systemPolicy: policyAt(),
    cycle,
    events,
    eventRewards,
    catalogSources: { collections, weeklyCards, previousCards },
    balances,
    ovrWeights,
    users,
    players,
    games: games.sort(
      (a, b) => (asDate(b.scheduledAt) || 0) - (asDate(a.scheduledAt) || 0),
    ),
    initials,
    community,
    summaries,
  };
}
