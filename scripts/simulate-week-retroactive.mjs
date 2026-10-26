import { readFileSync } from 'node:fs';
import { calculatePlayerCard } from '../js/player-calculation.js';
import { setPolicyDocument } from '../js/system-policy.js';
import { ATTRIBUTES, FEEDBACK, asDate, participants, matchPerformance, matchOutcome, matchGoalMargin, matchEvolutionContext, performanceBonuses, calculateGameDeltas } from '../js/utils.js';
import { balanceMatches } from '../js/team-balance.js';

// Offline only: the two existing audit snapshots are the complete input.
function decode(v) {
  if (v.mapValue) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k,v])=>[k,decode(v)]));
  if (v.arrayValue) return (v.arrayValue.values || []).map(decode);
  if (v.timestampValue) return new Date(v.timestampValue);
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  return v.stringValue ?? null;
}
const snapshot = JSON.parse(readFileSync('test-results/firestore-audits/audit-weekly-growth.mjs.json','utf8'));
const supplement = JSON.parse(readFileSync('test-results/firestore-audits/audit-weekly-ovr-causes.mjs.json','utf8'));
const docs = [snapshot,supplement].flatMap(s=>Object.values(s.responses).flatMap(r=>{
  const value = JSON.parse(r.body);
  return (value.documents || (value.name ? [value] : [])).map(d=>({...decode({mapValue:{fields:d.fields || {}}}),path:d.name.split('/documents/')[1],id:d.name.split('/').at(-1)}));
}));
const collection = path => docs.filter(d=>d.path.split('/').slice(0,-1).join('/')===path);
setPolicyDocument(docs.find(d=>d.path==='settings/system'));

// Offline counterfactual only. No database access and no changes to game records.
import { writeFileSync } from 'node:fs';
import { performanceWeek } from '../js/performance-week.js';
import { eligibleCommunityRating } from '../functions/community-rating-policy.js';
const now = new Date(snapshot.collectedAt), period = performanceWeek(now);
const games = collection('games'), summaries = collection('gameSummaries'), balances = collection('gameBalances');
const weekly = games.filter(g=>g.status==='closed' && +asDate(g.closedAt || g.scheduledAt)>=+period.startsAt && +asDate(g.closedAt || g.scheduledAt)<=+now);
const ids = new Set(weekly.map(g=>g.id));
const community = vv => ({count:vv.length,ratings20:Object.fromEntries(ATTRIBUTES.map(([k])=>[k,vv.reduce((sum,v)=>sum+v.ratings20[k],0)/(vv.length||1)]))});
const rows = [];
for (const user of collection('users').filter(u=>!u.disabled)) {
 const initial = collection('initialRatings').find(d=>d.id===user.uid);
 if (!initial?.ratings20) continue;
 const own = games.filter(g=>g.status==='closed' && participants(g).includes(user.uid));
 const aggregates = own.map(g=>({...(summaries.find(s=>s.id===g.id)?.players?.[user.uid] || {}),...matchPerformance(user.uid,g),outcome:matchOutcome(user.uid,g),goalMargin:matchGoalMargin(user.uid,g),...matchEvolutionContext(user.uid,g,summaries.find(s=>s.id===g.id)?.players,balances.find(b=>b.id===g.id && balanceMatches(g,b))),gameId:g.id,date:asDate(g.closedAt || g.scheduledAt)}));
 const votes = collection('communityRatings').filter(v=>v.targetId===user.uid && v.submitted && ATTRIBUTES.every(([k])=>Number.isFinite(v.ratings20?.[k])));
 const accepted = votes.filter(eligibleCommunityRating);
 const input = {uid:user.uid,initial:initial.ratings20,community:community(votes),games,aggregates,rewards:collection('eventRewards'),weights:collection('settings').find(d=>d.id==='ovr'),position:user.primaryPosition,createdAt:user.createdAt || initial.createdAt,date:now};
 // Shift only the simulated aggregate dates to activate the production V2 engine.
 // All weekly aggregates remain in chronological order; original game records stay unchanged.
 const simulated = aggregates.map(a=>ids.has(a.gameId)?{...a,date:new Date(Date.parse('2026-10-26T00:00:00Z')+(+a.date-+period.startsAt)/1e6)}:a);
 const old = calculatePlayerCard(input);
 const fair = calculatePlayerCard({...input,aggregates:simulated});
 const filtered = calculatePlayerCard({...input,community:community(accepted)});
 const combined = calculatePlayerCard({...input,community:community(accepted),aggregates:simulated});
 const previous = collection('users/'+user.uid+'/cardHistory').sort((a,b)=>b.id.localeCompare(a.id))[0];
 rows.push({name:user.displayName,played:own.filter(g=>ids.has(g.id)).length,previous:previous?.ovr,old:old.ovr,newGames:fair.ovr,communityOnly:filtered.ovr,combined:combined.ovr,excluded:votes.length-accepted.length,attributes:ATTRIBUTES.map(([k,name])=>({name,old:old.stats[k],newGames:fair.stats[k],combined:combined.stats[k]}))});
}
const result = {collectedAt:snapshot.collectedAt,period,games:weekly.map(g=>({id:g.id,title:g.title,date:asDate(g.closedAt || g.scheduledAt)})),rows};
writeFileSync('test-results/weekly-retroactive-simulation.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,rows:rows.map(({attributes,...r})=>r)},null,2));
