import { auditAuth } from "./firestore-audit-cache.mjs";
// Read-only production audit. Never writes Firestore documents or prints tokens.
import { createRequire } from "node:module";
import { eventRanking } from "../js/event-model.js";
import { firebaseConfig } from "../js/config.js";
import { cardWeek } from "../js/card-week.js";
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
const [events, games, rewards] = await Promise.all(["events", "games", "eventRewards"].map(path => read(path, true)));
for (const event of events.filter(e => /carreg/i.test(e.title))) {
  console.log(JSON.stringify({id:event.id,title:event.title,status:event.status,scope:event.scope,kind:event.kind,metric:event.objective,startsAt:event.startsAt,endsAt:event.endsAt,cadence:event.cadence,prerequisites:event.prerequisites,participants:event.participantIds?.length,progress:eventRanking(event,[],games,[],new Date(),rewards).map(row=>({progress:row.progress,eligible:row.eligible})),games:games.filter(g=>g.status==="closed").map(g=>({title:g.title,scheduledAt:g.scheduledAt,closedAt:g.closedAt,score:g.score}))},null,2));
}
