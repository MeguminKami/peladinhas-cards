// Read-only production audit. Never writes Firestore documents or prints tokens.
import { createRequire } from "node:module";
import { calculatePlayerCard } from "../js/player-calculation.js";
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
const auth = require("firebase-tools/lib/auth.js");
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
const users = await read("users", true);
const user = users.find(user => /carlos/i.test(user.displayName || user.username || ""));
if (!user) throw Error("Carlos não encontrado.");
const cycle = cardWeek();
const previousWeek = cardWeek(new Date(+cycle.opensAt - 1)).weekId;
const [initial, community, games, summaries, balances, rewards, previous, current, published, settings] = await Promise.all([
  read(`initialRatings/${user.uid}`), read(`communitySummaries/${user.uid}`), ...["games", "gameSummaries", "gameBalances", "eventRewards"].map(path => read(path,true)),
  read(`users/${user.uid}/cardHistory/${previousWeek}`), read(`users/${user.uid}/cardHistory/${cycle.weekId}`), read(`weeklyCards/${user.uid}`), read("settings/ovr"),
]);
const ownGames = games.filter(game => game.status === "closed" && participants(game).includes(user.uid));
const aggregates = ownGames.map(game => ({
  ...(summaries.find(row => row.id === game.id)?.players?.[user.uid] || {}), ...matchPerformance(user.uid,game), outcome: matchOutcome(user.uid,game), goalMargin: matchGoalMargin(user.uid,game),
  ...matchEvolutionContext(user.uid,game,summaries.find(row => row.id === game.id)?.players,balances.find(row=>row.id===game.id && balanceMatches(game,row))), date:asDate(game.closedAt || game.scheduledAt), gameId:game.id,
}));
const input = { uid:user.uid, initial:initial?.ratings20 || {}, community, aggregates, games, rewards, weights:settings,position:user.primaryPosition,createdAt:user.createdAt || initial?.createdAt };
const calculated = calculatePlayerCard(input);
const withoutGames = calculatePlayerCard({...input,aggregates:[]});
const oldRule = calculatePlayerCard({ ...input, community: { ...community, count: community?.count ? 1 : 0 } });
const previousWeights = previous?.ovrCalculation?.weights;
const previousCalculation = calculateOverallDetails(previous.stats, previousWeights ? { weights:previousWeights,positions:{[previous.primaryPosition]:previousWeights} } : settings, previous.primaryPosition, previous.inactivity);
const publishedCalculation = calculateOverallDetails(published?.stats || current?.stats || {}, settings, user.primaryPosition, published?.inactivity || current?.inactivity);
const rows = ATTRIBUTES.map(([key,name]) => ({
  key,name,previous:previous?.stats?.[key],published:published?.stats?.[key] ?? current?.stats?.[key],difference:(published?.stats?.[key] ?? current?.stats?.[key])-previous?.stats?.[key],self20:initial?.ratings20?.[key],community20:community?.ratings20?.[key],weight:calculated.ovrCalculation.weights[key],
  oldRuleBase:oldRule.baseStats[key],oldRuleGame:oldRule.progression.rows.find(row=>row.key===key).contributions,oldRuleFinal:oldRule.stats[key],newBase20:calculated.progression.rows.find(row=>row.key===key).initial20,newBase99:calculated.baseStats[key],gameDeltas:calculated.progression.rows.find(row=>row.key===key).contributions,newFinal:calculated.stats[key],
}));
console.log(JSON.stringify({ checkedAt:new Date(), name:user.displayName, position:user.primaryPosition,previousWeek, currentWeek:cycle.weekId,selfUpdated:initial?.updatedAt,communityCount:community?.count,communityUpdated:community?.updatedAt,oldRuleSelfWeight:.2,newRuleSelfWeight:Math.min(.2,1/(community.count+1)),previousOvr:previous?.ovr,publishedOvr:published?.ovr,currentStoredOvr:current?.ovr,previousExact:previous?.ovrCalculation?.rawExact ?? ATTRIBUTES.reduce((sum,[key])=>sum+(previous.stats[key]||0)*(previousWeights?.[key]||0),0)/100,publishedExact:publishedCalculation.rawExact,oldRuleCalculatedOvr:oldRule.ovr,newRuleCalculatedOvr:calculated.ovr,newRuleExact:calculated.ovrCalculation.rawExact,inactivity:calculated.inactivity,rewards:calculated.eventBoosts,rows},null,2));
console.log(JSON.stringify({ gameReferences: balances.filter(row=>row.playerOvr?.[user.uid]!==undefined).map(row=>({gameId:row.id,title:games.find(game=>game.id===row.id)?.title,ovrAtMatch:row.playerOvr[user.uid]})), weeklyHistory:(await read(`users/${user.uid}/cardHistory`,true)).map(row=>({week:row.weekId,ovr:row.ovr,locked:row.locked})) },null,2));
