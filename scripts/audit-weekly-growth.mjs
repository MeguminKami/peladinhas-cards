import { auditAuth } from "./firestore-audit-cache.mjs";
// Read-only production audit. Never writes Firestore documents or prints tokens.
import { createRequire } from "node:module";
import { firebaseConfig } from "../js/config.js";
import { cardWeek } from "../js/card-week.js";
import { performanceWeek } from "../js/performance-week.js";
import {
  ATTRIBUTES,
  asDate,
  participants,
  calculateInitialBaseline,
  calculatePlayerStats,
  matchPerformance,
  matchOutcome,
  matchGoalMargin,
  matchEvolutionContext,
  calculateInactivity,
  calculateOverallDetails,
} from "../js/utils.js";
import { balanceMatches } from "../js/team-balance.js";
import { applyEventRewards } from "../js/event-rules.js";
const require = createRequire(import.meta.url);
const auth = auditAuth;
const account = auth.getGlobalDefaultAccount();
if (!account) throw Error("Sem sessão Firebase disponível.");
const token = await auth.getAccessToken(
  account.tokens.refresh_token,
  account.tokens.scopes,
);
const base = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
function decode(value) {
  if (value.mapValue)
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([k, v]) => [
        k,
        decode(v),
      ]),
    );
  if (value.arrayValue) return (value.arrayValue.values || []).map(decode);
  if (value.timestampValue) return new Date(value.timestampValue);
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  return value.stringValue ?? null;
}
async function read(path, list = false) {
  let docs = [],
    pageToken;
  do {
    const query = list
      ? `?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`
      : "";
    const response = await fetch(`${base}/${path}${query}`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (response.status === 404) return list ? [] : null;
    if (!response.ok) throw Error(`Leitura ${path}: HTTP ${response.status}`);
    const result = await response.json();
    const convert = (doc) => ({
      ...decode({ mapValue: { fields: doc.fields || {} } }),
      id: doc.name.split("/").at(-1),
    });
    if (!list) return convert(result);
    docs.push(...(result.documents || []).map(convert));
    pageToken = result.nextPageToken;
  } while (pageToken);
  return docs;
}
const [
  users,
  initials,
  community,
  games,
  summaries,
  balances,
  rewards,
  votes,
  settings,
] = await Promise.all([
  ...[
    "users",
    "initialRatings",
    "communitySummaries",
    "games",
    "gameSummaries",
    "gameBalances",
    "eventRewards",
    "communityRatings",
  ].map((path) => read(path, true)),
  read("settings/ovr"),
]);
const cycle = cardWeek();
const period = performanceWeek();
const previousWeek = cardWeek(new Date(+cycle.opensAt - 1)).weekId;
const findings = [];
for (const user of users.filter((u) => !u.disabled)) {
  const previous = await read(`users/${user.uid}/cardHistory/${previousWeek}`);
  if (!previous?.stats) continue;
  const matches = games.filter(
    (g) => g.status === "closed" && participants(g).includes(user.uid),
  );
  const aggregates = matches.map((g) => ({
    ...(summaries.find((s) => s.id === g.id)?.players?.[user.uid] || {}),
    ...matchPerformance(user.uid, g),
    outcome: matchOutcome(user.uid, g),
    goalMargin: matchGoalMargin(user.uid, g),
    ...matchEvolutionContext(
      user.uid,
      g,
      summaries.find((s) => s.id === g.id)?.players,
      balances.find((b) => b.id === g.id && balanceMatches(g, b)),
    ),
    date: asDate(g.closedAt || g.scheduledAt),
    gameId: g.id,
  }));
  const initialDocument = initials.find((i) => i.uid === user.uid);
  const initial = initialDocument?.ratings20 || {};
  const cs = community.find((c) => c.targetId === user.uid);
  const raw = calculatePlayerStats(
    calculateInitialBaseline(initial, cs),
    aggregates,
    { weights: settings, position: user.primaryPosition },
  );
  const applied = applyEventRewards(raw, rewards, user.uid);
  const inactivity = calculateInactivity(
    user.uid,
    games,
    user.createdAt || initialDocument?.createdAt,
  );
  const overall = calculateOverallDetails(
    applied.stats,
    settings,
    user.primaryPosition,
    inactivity,
  );
  const changes = ATTRIBUTES.filter(
    ([k]) => applied.stats[k] !== previous.stats[k],
  ).map(([k, name]) => ({
    name,
    before: previous.stats[k],
    now: applied.stats[k],
    delta: applied.stats[k] - previous.stats[k],
  }));
  const playedThisWeek = matches.filter(
    (g) => +asDate(g.closedAt || g.scheduledAt) >= +period.startsAt &&
      +asDate(g.closedAt || g.scheduledAt) < +period.endsAt,
  ).length;
  if (
    (playedThisWeek && overall.ovr >= previous.ovr) ||
    (!changes.length && overall.ovr === previous.ovr)
  )
    continue;
  const cutoff = previous.sourceCutoffDate || previous.closesAt;
  const actualVotes = votes.filter(
    (v) => v.targetId === user.uid && v.submitted,
  );
  const latestChange = (row) =>
    Math.max(
      ...[row.createdAt, row.submittedAt, row.updatedAt].map(
        (date) => +asDate(date) || 0,
      ),
    );
  const weightsChanged = ATTRIBUTES.some(
    ([key]) => previous.ovrCalculation?.weights?.[key] !== overall.weights[key],
  );
  findings.push({
    name: user.displayName || user.username,
    playedThisWeek,
    lifetimeGames: matches.length,
    beforeOvr: previous.ovr,
    nowOvr: overall.ovr,
    ovrDelta: overall.ovr - previous.ovr,
    selfRatingUpdated: initialDocument?.updatedAt,
    selfAttributesAtZero: Object.values(initial).filter((value) => value === 0)
      .length,
    communityRatingsCreatedAfterSnapshot: actualVotes.filter(
      (v) => +asDate(v.createdAt) > +asDate(cutoff),
    ).length,
    communityRatingsEditedAfterSnapshot: actualVotes.filter(
      (v) =>
        latestChange(v) > +asDate(cutoff) &&
        +asDate(v.createdAt) <= +asDate(cutoff),
    ).length,
    communityLastUpdate: cs?.updatedAt,
    weightsChanged,
    oldInactivityPenalty: previous.inactivity?.penalty || 0,
    newInactivityPenalty: inactivity.penalty,
    activeRewardBoosts: Object.fromEntries(
      Object.entries(applied.boosts).filter(([, value]) => value),
    ),
    changes,
  });
}
console.log(
  JSON.stringify(
    {
      auditedAt: new Date(),
      week: cycle.weekId,
      comparedWith: previousWeek,
      findings,
    },
    null,
    2,
  ),
);
