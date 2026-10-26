import { readFileSync } from 'node:fs';
import { auditAuth } from './firestore-audit-cache.mjs';
import { firebaseConfig } from '../js/config.js';
import { cardWeek } from '../js/card-week.js';
import { eligibleCommunityRating } from '../functions/community-rating-policy.js';

// Authorized read-only scope: this player's profile, summary, current card,
// current-week history and at most 26 incoming community ratings (30 total).
function decode(v) {
  if (v.mapValue) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k,x])=>[k,decode(x)]));
  if (v.arrayValue) return (v.arrayValue.values || []).map(decode);
  if (v.timestampValue) return v.timestampValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  return v.stringValue ?? null;
}
const cached = JSON.parse(readFileSync('test-results/firestore-audits/audit-weekly-growth.mjs.json','utf8'));
const users = Object.values(cached.responses).flatMap(r=>{
  const value=JSON.parse(r.body);
  return (value.documents || []).filter(d=>d.name.split('/documents/')[1]?.split('/').length===2 && d.name.includes('/documents/users/')).map(d=>({id:d.name.split('/').at(-1),...decode({mapValue:{fields:d.fields}})}));
});
const user = users.find(u=>u.displayName?.startsWith('Chabeca'));
if (!user) throw Error('Player absent from local snapshot.');
const account=auditAuth.getGlobalDefaultAccount();
if (!account) throw Error('No Firebase session.');
const token=await auditAuth.getAccessToken(account.tokens.refresh_token,account.tokens.scopes);
const base=`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const headers={Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'};
async function get(path) {
  const r=await fetch(`${base}/${path}`,{headers});
  if(r.status===404)return null;
  if(!r.ok)throw Error(`HTTP ${r.status}: ${path}`);
  const d=await r.json();return decode({mapValue:{fields:d.fields}});
}
const uid=user.uid || user.id;
const profile=await get(`users/${uid}`);
const summary=await get(`communitySummaries/${uid}`);
const card=await get(`weeklyCards/${uid}`);
const history=await get(`users/${uid}/cardHistory/${cardWeek(new Date()).weekId}`);
const response=await fetch(`${base}:runQuery`,{method:'POST',headers,body:JSON.stringify({structuredQuery:{from:[{collectionId:'communityRatings'}],where:{fieldFilter:{field:{fieldPath:'targetId'},op:'EQUAL',value:{stringValue:uid}}},limit:26}})});
if(!response.ok)throw Error(`Query HTTP ${response.status}`);
const votes=(await response.json()).filter(r=>r.document).map(r=>decode({mapValue:{fields:r.document.fields}}));
console.log(JSON.stringify({uid,name:profile?.displayName,profile:{ovr:profile?.ovr,updatedAt:profile?.updatedAt},summary,card,history,votes:votes.map(v=>({submitted:v.submitted,mean:Object.values(v.ratings20 || {}).reduce((s,x)=>s+x,0)/12,eligible:eligibleCommunityRating(v),reviewState:v.reviewState,reviewAttempts:v.reviewAttempts,submittedAt:v.submittedAt})),truncated:votes.length===26},null,2));
