import { readFileSync } from 'node:fs';
import { auditAuth } from './firestore-audit-cache.mjs';
import { firebaseConfig } from '../js/config.js';
import { cardWeek } from '../js/card-week.js';
import { setPolicyDocument } from '../js/system-policy.js';
import { calculatePlayerCard } from '../js/player-calculation.js';
import { ATTRIBUTES, asDate, participants, initialSelfWeight, matchPerformance, matchOutcome, matchGoalMargin, matchEvolutionContext } from '../js/utils.js';
import { balanceMatches } from '../js/team-balance.js';

// Read-only supplement to audit-weekly-growth; reuses its local collection.
function decode(v) {
  if (v.mapValue) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k,v]) => [k,decode(v)]));
  if (v.arrayValue) return (v.arrayValue.values || []).map(decode);
  if (v.timestampValue) return new Date(v.timestampValue);
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  return v.stringValue ?? null;
}
const convert = d => ({...decode({mapValue:{fields:d.fields || {}}}), id:d.name.split('/').at(-1)});
const prior = JSON.parse(readFileSync('test-results/firestore-audits/audit-weekly-growth.mjs.json','utf8'));
const cached = Object.values(prior.responses).flatMap(r => {
  const value = JSON.parse(r.body);
  return value.documents || (value.name ? [value] : []);
});
const collection = path => cached.filter(d => d.name.split('/documents/')[1]?.split('/').slice(0,-1).join('/') === path).map(convert);
const auth = auditAuth, account = auth.getGlobalDefaultAccount();
if (!account) throw Error('Sem sessão Firebase.');
const token = await auth.getAccessToken(account.tokens.refresh_token, account.tokens.scopes);
const base = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
async function read(path) {
  const response = await fetch(`${base}/${path}`, {headers:{Authorization:`Bearer ${token.access_token}`}});
  if (!response.ok) throw Error(`HTTP ${response.status}: ${path}`);
  return convert(await response.json());
}
const system = await read('settings/system');
setPolicyDocument(system);
const users = collection('users').filter(u=>!u.disabled), games = collection('games'), summaries = collection('gameSummaries'), balances = collection('gameBalances');
const now = new Date(prior.collectedAt), cycle = cardWeek(now), previousWeek = cardWeek(new Date(+cycle.opensAt-1)).weekId;
const rows = [];
for (const user of users) {
  const previous = collection(`users/${user.uid}/cardHistory`).find(c=>c.id===previousWeek);
  if (!previous?.stats) continue;
  const played = games.filter(g=>g.status==='closed' && participants(g).includes(user.uid));
  const cutoff = asDate(previous.sourceCutoffDate || previous.closesAt);
  const thisWeek = played.filter(g=>+asDate(g.closedAt || g.scheduledAt)>+cutoff && +asDate(g.closedAt || g.scheduledAt)<=+now);
  if (thisWeek.length) continue;
  const published = await read(`weeklyCards/${user.uid}`);
  const initial = collection('initialRatings').find(i=>i.id===user.uid);
  const votes = collection('communityRatings').filter(v=>v.targetId===user.uid && v.submitted && ATTRIBUTES.every(([k])=>Number.isFinite(v.ratings20?.[k])));
  const oldVotes = votes.filter(v=>+asDate(v.submittedAt || v.createdAt)<=+cutoff);
  const community = vv => ({count:vv.length, ratings20:Object.fromEntries(ATTRIBUTES.map(([k])=>[k,vv.reduce((s,v)=>s+v.ratings20[k],0)/(vv.length||1)]))});
  const aggregates = played.map(g=>({...(summaries.find(s=>s.id===g.id)?.players?.[user.uid] || {}),...matchPerformance(user.uid,g),outcome:matchOutcome(user.uid,g),goalMargin:matchGoalMargin(user.uid,g),...matchEvolutionContext(user.uid,g,summaries.find(s=>s.id===g.id)?.players,balances.find(b=>b.id===g.id && balanceMatches(g,b))),gameId:g.id,date:asDate(g.closedAt || g.scheduledAt)}));
  const input = {uid:user.uid,initial:initial?.ratings20,community:community(votes),aggregates,games,rewards:collection('eventRewards'),weights:collection('settings').find(s=>s.id==='ovr'),position:user.primaryPosition,createdAt:user.createdAt || initial?.createdAt,date:now};
  const current = calculatePlayerCard(input), withoutNewVotes = calculatePlayerCard({...input,community:community(oldVotes)});
  const baselineChanged = previous.baseStats ? ATTRIBUTES.some(([k])=>previous.baseStats[k]!==current.baseStats[k]) : null;
  rows.push({name:user.displayName || user.username, previous:previous.ovr,published:published.ovr,recalculated:current.ovr,withoutNewVotes:withoutNewVotes.ovr,positionBefore:previous.primaryPosition,positionNow:user.primaryPosition,oldVotes:oldVotes.length,newVotes:votes.length-oldVotes.length,oldPenalty:previous.inactivity?.penalty,newPenalty:current.inactivity.penalty,missed:current.inactivity.missed,baselineChanged,publishedMatches:ATTRIBUTES.every(([k])=>published.stats[k]===current.stats[k]) && published.ovr===current.ovr,baseBefore:previous.baseStats,baseNow:current.baseStats,oldSelfWeight:initialSelfWeight(oldVotes.length),newSelfWeight:initialSelfWeight(votes.length)});
}
console.log(JSON.stringify({auditedAt:now,priorReads:prior.reads,week:cycle.weekId,previousWeek,games:games.filter(g=>g.status==='closed').map(g=>({title:g.title,date:g.closedAt || g.scheduledAt,players:participants(g).length})),rows},null,2));
