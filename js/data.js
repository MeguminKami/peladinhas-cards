import { applyEventRewards } from "./event-rules.js";
import { cardWeek } from "./card-week.js";
import { balanceMatches } from "./team-balance.js";
import * as DB from "./db.js";
import {
  asDate,
  calculateInitialBaseline,
  calculatePlayerStats,
  calculateInactivity,
  calculateOverall,
  normalizeOvrWeights,
  calculateBaseCard,
  calculateSpecialCards,
  calculateMatchStats,
  completeInitial,
  participants,
  matchOutcome,
  matchGoalMargin,
  matchEvolutionContext,
  matchPerformance,
} from "./utils.js";
export async function loadLeague() {
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
  ] = await Promise.all([
    DB.users(),
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
  ]);
  const cycle = cardWeek();
  const previousOvrs = await DB.previousOvrs(users, cycle);
  const ovrWeights = normalizeOvrWeights(settings);
  const players = users
    .filter((u) => !u.disabled)
    .map((u) => {
      const initial = initials.find((x) => x.uid === u.uid)?.ratings20 || {},
        cs = community.find((x) => x.targetId === u.uid),
        matches = games.filter((g) => participants(g).includes(u.uid));
      const aggregates = matches
        .filter((g) => g.status === "closed")
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
      const rawStats = calculatePlayerStats(
          calculateInitialBaseline(initial, cs),
          aggregates,
          { weights: ovrWeights, position: u.primaryPosition },
        ),
        rewards = applyEventRewards(rawStats, eventRewards, u.uid),
        stats = rewards.stats,
        inactivity = calculateInactivity(
          u.uid,
          games,
          u.createdAt || initials.find((x) => x.uid === u.uid)?.createdAt,
        ),
        ovr = calculateOverall(
          stats,
          ovrWeights,
          u.primaryPosition,
          inactivity,
        );
      return {
        ...u,
        cardPhoto: weeklyPhotos.find((photo) => photo.uid === u.uid) || null,
        initial,
        communityCount: cs?.count || 0,
        community: cs,
        official: (cs?.count || 0) >= 3,
        hasCard: completeInitial(initial),
        stats,
        inactivity,
        ovr,
        ovrDelta: Number.isFinite(previousOvrs[u.uid])
          ? ovr - previousOvrs[u.uid]
          : null,
        cardType: calculateBaseCard(ovr),
        specials: [
          ...rewards.specials,
          ...calculateSpecialCards(aggregates).filter(
            (s) => !rewards.specials.some((r) => r.id === s.id),
          ),
        ],
        eventBoosts: rewards.boosts,
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
                    eventBoosts: snapshot.eventBoosts || {},
                    cardPhoto: snapshot.cardPhoto || null,
                    ovr: snapshot.ovr,
                    ovrDelta: Number.isFinite(
                      snapshot.previousOvr ?? previousOvrs[u.uid],
                    )
                      ? snapshot.ovr -
                        (snapshot.previousOvr ?? previousOvrs[u.uid])
                      : null,
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
    });
  return {
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
