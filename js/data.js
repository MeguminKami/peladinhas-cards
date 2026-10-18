import * as Firebase from "./firebase.js";
import { setPolicyDocument, policyAt } from "./system-policy.js";
import { weeklyComparison } from "./weekly-comparison.js";
import { calculatePlayerCard } from "./player-calculation.js";
import { cardWeek } from "./card-week.js";
import { balanceMatches } from "./team-balance.js";
import * as DB from "./db.js";
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
export async function loadLeague() {
  const systemDocument = await DB.read("settings/system");
  setPolicyDocument(systemDocument);
  await Firebase.configureAppCheck?.(policyAt());

  const cycle = cardWeek();
  const usersTask = DB.users();
  const previousTask = usersTask.then((users) =>
    DB.previousCards(users, cycle),
  );
  const [
    users,
    initials,
    community,
    games,
    summaries,
    settings,
    balances,
    weeklyCards,
    weeklyPhotos,
    events,
    eventRewards,
    collections,
    selections,
    previousCards,
  ] = await Promise.all([
    usersTask,
    DB.initials(),
    DB.communitySummaries(),
    DB.games(),
    DB.gameSummaries(),
    DB.read("settings/ovr"),
    DB.list("gameBalances"),
    DB.list("weeklyCards"),
    DB.weeklyCardPhotos(cardWeek().weekId),
    DB.openEvents(),
    DB.list("eventRewards"),
    DB.list("cardCollections"),
    DB.list("cardSelections"),
    previousTask,
  ]);
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
        aggregates: aggregates.filter((a) => Number.isFinite(a.overall)),
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
