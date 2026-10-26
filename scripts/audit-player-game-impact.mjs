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
const name = (process.argv[2] || 'Vitor Rocha').toLocaleLowerCase('pt-PT');
const user = collection('users').find(u=>(u.displayName || '').toLocaleLowerCase('pt-PT')===name);
if (!user) throw Error('Jogador não encontrado no snapshot local.');
const previous = collection(`users/${user.uid}/cardHistory`).sort((a,b)=>b.id.localeCompare(a.id))[0];
const games = collection('games'), summaries = collection('gameSummaries'), balances = collection('gameBalances');
const own = games.filter(g=>g.status==='closed' && participants(g).includes(user.uid));
const aggregates = own.map(g=>({...(summaries.find(s=>s.id===g.id)?.players?.[user.uid] || {}),...matchPerformance(user.uid,g),outcome:matchOutcome(user.uid,g),goalMargin:matchGoalMargin(user.uid,g),...matchEvolutionContext(user.uid,g,summaries.find(s=>s.id===g.id)?.players,balances.find(b=>b.id===g.id && balanceMatches(g,b))),gameId:g.id,date:asDate(g.closedAt || g.scheduledAt)}));
const initial = collection('initialRatings').find(d=>d.id===user.uid);
const votes = collection('communityRatings').filter(v=>v.targetId===user.uid && v.submitted && ATTRIBUTES.every(([k])=>Number.isFinite(v.ratings20?.[k])));
const community = vv => ({count:vv.length,ratings20:Object.fromEntries(ATTRIBUTES.map(([k])=>[k,vv.reduce((sum,v)=>sum+v.ratings20[k],0)/(vv.length||1)]))});
const cutoff = asDate(previous.sourceCutoffDate || previous.closesAt);
const oldVotes = votes.filter(v=>+asDate(v.submittedAt || v.createdAt)<=+cutoff);
const latest = [...aggregates].sort((a,b)=>a.date-b.date).at(-1);
const input = {uid:user.uid,initial:initial.ratings20,community:community(votes),games,aggregates,rewards:collection('eventRewards'),weights:collection('settings').find(d=>d.id==='ovr'),position:user.primaryPosition,createdAt:user.createdAt || initial.createdAt,date:new Date(snapshot.collectedAt)};
const current = calculatePlayerCard(input);
const beforeGame = calculatePlayerCard({...input,aggregates:aggregates.filter(a=>a.gameId!==latest.gameId)});
const withoutNewVotes = calculatePlayerCard({...input,community:community(oldVotes)});
const exactBefore = Object.fromEntries(current.progression.rows.map(r=>[r.key,r.baseline+r.contributions.slice(0,-1).reduce((s,v)=>s+v,0)]));
const stableExactBefore = Object.fromEntries(withoutNewVotes.progression.rows.map(r=>[r.key,r.baseline+r.contributions.slice(0,-1).reduce((s,v)=>s+v,0)]));
const noRelative = calculateGameDeltas(exactBefore,{...latest,teamRatings:{},opponentRatings:{}},{weights:input.weights,position:input.position});
console.log(JSON.stringify({stableExactBefore,weights:input.weights,exactBefore,collectedAt:snapshot.collectedAt,name:user.displayName,position:user.primaryPosition,previousOvr:previous.ovr,currentOvr:current.ovr,withoutRewardsOvr:calculatePlayerCard({...input,rewards:[]}).ovr,withoutNewVotesAndRewardsOvr:calculatePlayerCard({...input,community:community(oldVotes),rewards:[]}).ovr,withoutLastGameOvr:beforeGame.ovr,withoutNewVotesOvr:withoutNewVotes.ovr,oldVotes:oldVotes.length,newVotes:votes.length-oldVotes.length,game:own.find(g=>g.id===latest.gameId)?.title,latest,bonuses:performanceBonuses(latest),dimensions:FEEDBACK.map(([key,name])=>({name,own:latest[key],team:latest.teamRatings[key],opponents:latest.opponentRatings[key]})),rows:ATTRIBUTES.map(([key,name])=>({name,previous:previous.stats[key],now:current.stats[key],weeklyDelta:current.stats[key]-previous.stats[key],baseBefore:previous.baseStats[key],baseNow:current.baseStats[key],beforeLastGame:beforeGame.stats[key],lastGameExactDelta:current.progression.rows.find(r=>r.key===key).contributions.at(-1),lastGameWithoutComparisons:noRelative[key],withoutNewVotes:withoutNewVotes.stats[key],boost:current.eventBoosts[key]}))},null,2));
