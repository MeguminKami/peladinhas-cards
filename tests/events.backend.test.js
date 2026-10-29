import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  eventAction,
  voteEvent as rawVoteEvent,
  getEvent as rawGetEvent,
  listEvents,
  claimMission as rawClaimMission,
  closeEvents,
  onEventNotifications as rawOnEventNotifications,
  scheduledNotifications,
  onGame,
} from "../functions/index.js";
import { ATTRIBUTES } from "../js/utils.js";
import { checkObjectiveProgress } from "../functions/event-management.js";
import { applyEventRewards } from "../js/event-rules.js";
// These objective regression scenarios explicitly model a permitted check
// before reading/claiming. automation-cycle.backend.test.js verifies that real
// page reads and claims never trigger that check themselves.
const getEvent = { run: async request => {
  await checkObjectiveProgress(request.data.eventId);
  return rawGetEvent.run(request);
} };
const claimMission = { run: async request => {
  await checkObjectiveProgress(request.data.eventId);
  return rawClaimMission.run(request);
} };
const onEventNotifications = { run: async request => {
  const event = (await getFirestore().doc(`events/${request.params.eid}`).get()).data();
  await rawOnEventNotifications.run({ ...request, data: { after: { data: () => event } } });
  return scheduledNotifications.run({ cycle: true });
} };
const voteEvent = { run: async request => {
  const result = await rawVoteEvent.run(request);
  // The emulator's server clock is not changed by Node's mocked Date.
  await getFirestore().doc(`events/${request.data.eventId}/votes/${request.auth.uid}`)
    .update({ submittedAt: Timestamp.fromDate(new Date()) });
  return result;
} };
const db = getFirestore(),
  admin = "managed-admin",
  ids = ["managed-a", "managed-b", "managed-c", "managed-d"];
const prize = (variant) => ({
  mode: "card",
  statDuration: "weekly",
  boosts: {},
  specialId: variant === 9 ? "sniper" : "mvp",
});
const call = (action, data = {}) =>
  eventAction.run({ auth: { uid: admin }, data: { action, ...data } });
const payload = () => ({
  schemaVersion: 2,
  title: "Torneio da liga",
  kind: "event",
  method: "vote",
  startsAt: "2026-10-20T00:00:00Z",
  endsAt: "2026-10-24T00:00:00Z",
  audience: { mode: "selected", memberIds: ids },
  winnerCount: 3,
  positions: [prize(10), prize(7), prize(5)],
  votesPerUser: 2,
  minVotes: 1,
  needsConfirmation: true,
  tieBreak: "uid",
});

test("closed one-off mission claims use the saved result and deliver only once", async (t) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) throw Error("Emulador demo obrigatório.");
  t.mock.timers.enable({apis:["Date"],now:new Date("2026-10-23T12:00:00Z")});
  t.after(()=>t.mock.timers.reset());
  const owner="closed-mission-admin",uid="closed-mission-member",other="closed-mission-other";
  for(const id of [owner,uid,other]) await db.doc(`users/${id}`).set({uid:id,role:id===owner?"admin":"member",disabled:false});
  const {id}=await eventAction.run({auth:{uid:owner},data:{action:"create",...payload(),
    kind:"mission",method:"objective",scope:"individual",winnerCount:1,positions:[prize(5)],
    audience:{mode:"selected",memberIds:[uid,other]},objective:{metric:"games",target:1},
    cadence:"once",maxRepeats:1}});
  t.mock.timers.setTime(new Date("2026-10-26T12:00:00Z").getTime());
  const ref=db.doc(`events/${id}`);
  await ref.update({status:"closed",rewardsApplied:true,closedAt:Timestamp.fromDate(new Date("2026-10-24T00:00:00Z")),
    ranking:[{uid,position:1,progress:1,eligible:true},{uid:other,position:2,progress:0,eligible:false}],winners:[]});
  const detail=await getEvent.run({auth:{uid},data:{eventId:id}});
  assert.equal(detail.claimMode,"ready");
  assert.equal(detail.progress[0].eligible,true);
  await assert.rejects(claimMission.run({auth:{uid:other},data:{eventId:id,eligible:true,progress:999}}));
  await assert.rejects(claimMission.run({auth:{uid:owner},data:{eventId:id}}));
  await Promise.all([1,2].map(()=>claimMission.run({auth:{uid},data:{eventId:id}})));
  const rewards=await db.collection("eventRewards").where("eventId","==",id).get();
  assert.equal(rewards.size,1);
  assert.equal(rewards.docs[0].data().periodKey,"once");
  assert.equal((await ref.get()).data().winners[0].uid,uid);
  assert.equal((await getEvent.run({auth:{uid},data:{eventId:id}})).claimMode,"blocked");
  await ref.update({status:"cancelled"});
  await assert.rejects(claimMission.run({auth:{uid},data:{eventId:id}}));
  await ref.update({status:"closed",cadence:"weekly"});
  await assert.rejects(claimMission.run({auth:{uid},data:{eventId:id}}));
});

test("goal builder edits preserve counts, window, participants and delivered rewards", async (t) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) throw Error("Emulador demo obrigatório.");
  t.mock.timers.enable({apis:["Date"],now:new Date("2026-10-23T12:00:00Z")});t.after(()=>t.mock.timers.reset());
  const owner="goals-admin",uid="goals-member";
  for(const id of [owner,uid])await db.doc(`users/${id}`).set({uid:id,role:id===owner?"admin":"member",disabled:false});
  const action=(action,data={})=>eventAction.run({auth:{uid:owner},data:{action,...data}});
  await db.doc("games/goals-preserve").set({status:"closed",closedAt:Timestamp.fromDate(new Date("2026-10-21T09:00Z")),
    teamA:{starters:[uid],bench:[]},teamB:{starters:[owner],bench:[]},score:{teamA:3,teamB:0},
    performance:{teamA:{goals:[uid,uid,uid],assists:[]},teamB:{goals:[],assists:[]}}});
  const config={...payload(),kind:"mission",scope:"individual",method:"objective",winnerCount:1,positions:[prize(5)],audience:{mode:"selected",memberIds:[uid]},objective:{metric:"goals",target:3},cadence:"once",maxRepeats:1,openNow:true};
  const {id}=await action("create",config);
  await claimMission.run({auth:{uid},data:{eventId:id}});
  const goals=[{id:"legacy-primary",metric:"goals",target:7},{id:"extra",metric:"wins",target:2}];
  const update={...config,eventId:id,objective:{metric:"all",target:100,goals}};
  await action("update",update);
  let detail=await getEvent.run({auth:{uid},data:{eventId:id}});
  assert.equal(detail.progress[0].ratingState.goals.find(goal=>goal.id==="legacy-primary").progress,3);
  await action("update",{...update,title:"Renamed",objective:{...update.objective,goals:[...goals].reverse()}});
  detail=await getEvent.run({auth:{uid},data:{eventId:id}});
  assert.equal(detail.progress[0].ratingState.goals.find(goal=>goal.id==="legacy-primary").progress,3);
  await claimMission.run({auth:{uid},data:{eventId:id}});
  assert.equal((await db.collection("eventRewards").where("eventId","==",id).get()).size,1);
  for(const changed of [{startsAt:"2026-10-21"},{cadence:"weekly",maxRepeats:2},{scope:"group"}])
    await assert.rejects(action("update",{...update,...changed}));
  await action("update",{...update,audience:{mode:"selected",memberIds:[owner]}});
  assert.ok((await db.doc(`events/${id}`).get()).data().participantIds.includes(uid));
});

test("editing historical goals publishes preserved counts before any cycle or page check", async (t) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) throw Error("Emulador demo obrigatório.");
  t.mock.timers.enable({apis:["Date"],now:new Date("2026-10-23T12:00:00Z")});
  t.after(()=>t.mock.timers.reset());
  const owner="edit-total-admin",uid="edit-total-player";
  for (const id of [owner,uid]) await db.doc(`users/${id}`).set({uid:id,role:id===owner?"admin":"member",disabled:false});
  await db.doc("games/edit-total-old").set({status:"closed",closedAt:Timestamp.fromDate(new Date("2026-10-01T09:00Z")),
    teamA:{starters:[uid],bench:[]},teamB:{starters:[owner],bench:[]},score:{teamA:3,teamB:0},
    performance:{teamA:{goals:[uid,uid,uid],assists:[]},teamB:{goals:[],assists:[]}}});
  const action=(action,data)=>eventAction.run({auth:{uid:owner},data:{action,...data}});
  const config={...payload(),kind:"mission",scope:"individual",method:"objective",winnerCount:1,positions:[prize(5)],
    audience:{mode:"selected",memberIds:[uid]},objective:{metric:"totalGoals",target:5},cadence:"once",maxRepeats:1,openNow:true};
  const {id}=await action("create",config);
  await checkObjectiveProgress(id);
  const read=()=>rawGetEvent.run({auth:{uid},data:{eventId:id}});
  assert.equal((await read()).progress[0].progress,3);
  const update={...config,eventId:id,objective:{metric:"all",target:100,goals:[{id:"legacy-primary",metric:"totalGoals",countFrom:"history",target:7}]}};
  await action("update",update);
  let detail=await read();
  assert.equal(detail.progress[0].ratingState.goals[0].progress,3);
  assert.equal(detail.progress[0].eligible,false);
  await action("update",{...update,objective:{...update.objective,goals:[{...update.objective.goals[0],target:3}]}});
  detail=await read();
  assert.equal(detail.progress[0].ratingState.goals[0].progress,3);
  assert.equal(detail.progress[0].eligible,true);
  await rawClaimMission.run({auth:{uid},data:{eventId:id}});
  assert.equal((await db.collection("eventRewards").where("eventId","==",id).get()).size,1);
});

test("saving unchanged historical assists repairs an outdated published snapshot", async (t) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) throw Error("Emulador demo obrigatório.");
  t.mock.timers.enable({apis:["Date"],now:new Date("2026-10-23T12:00:00Z")});
  t.after(()=>t.mock.timers.reset());
  const owner="repair-assists-admin",uid="repair-assists-player";
  for (const id of [owner,uid]) await db.doc(`users/${id}`).set({uid:id,role:id===owner?"admin":"member",disabled:false});
  await db.doc("games/repair-assists-old").set({status:"closed",closedAt:Timestamp.fromDate(new Date("2026-10-01T09:00Z")),
    teamA:{starters:[uid],bench:[]},teamB:{starters:[owner],bench:[]},score:{teamA:3,teamB:0},
    performance:{teamA:{goals:[owner,owner,owner],assists:[uid,uid,uid]},teamB:{goals:[],assists:[]}}});
  const config={...payload(),kind:"mission",scope:"individual",method:"objective",winnerCount:1,positions:[prize(5)],
    audience:{mode:"selected",memberIds:[uid]},objective:{metric:"all",target:100,
      goals:[{id:"assists",metric:"totalAssists",countFrom:"history",target:14}]},cadence:"once",maxRepeats:1,openNow:true};
  const action=(action,data)=>eventAction.run({auth:{uid:owner},data:{action,...data}});
  const {id}=await action("create",config);
  await checkObjectiveProgress(id);
  const progressRef=db.doc(`events/${id}/private/progress`);
  await progressRef.update({version:"configuration-before-edit"});
  assert.deepEqual((await rawGetEvent.run({auth:{uid},data:{eventId:id}})).progress,[]);
  await action("update",{...config,eventId:id});
  const detail=await rawGetEvent.run({auth:{uid},data:{eventId:id}});
  assert.equal(detail.progress[0].ratingState.goals[0].progress,3);
  assert.equal(detail.participantProgress[0].goals[0].progress,3);
  // A snapshot without a version, or missing entirely, must also be repaired.
  await progressRef.delete();
  await action("update",{...config,eventId:id});
  assert.equal((await rawGetEvent.run({auth:{uid},data:{eventId:id}})).progress[0].ratingState.goals[0].progress,3);
});

test("mission reward edits replace delivered effects, preserve completion and validity, and respect other awards", async (t) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) throw Error("Emulador demo obrigatório.");
  t.mock.timers.enable({apis:["Date"],now:new Date("2026-10-23T12:00:00Z")});
  t.after(()=>t.mock.timers.reset());
  const owner="replace-admin",members=["replace-a","replace-b"];
  for (const uid of [owner,...members]) await db.doc(`users/${uid}`).set({uid,role:uid===owner?"admin":"member",disabled:false});
  for (const uid of members) await db.doc(`initialRatings/${uid}`).set({completed:true,ratings20:Object.fromEntries(ATTRIBUTES.map(([key])=>[key,15]))});
  await db.doc("games/replace-old").set({status:"closed",closedAt:Timestamp.fromDate(new Date("2026-10-01T09:00Z")),
    teamA:{starters:members,bench:[]},teamB:{starters:[owner],bench:[]},score:{teamA:1,teamB:0}});
  const action=(action,data)=>eventAction.run({auth:{uid:owner},data:{action,...data}});
  const configured={mode:"both",statDuration:"permanent",cardDuration:"weekly",boosts:{passing:6},specialId:"mvp"};
  const config={...payload(),kind:"mission",scope:"individual",method:"objective",winnerCount:1,positions:[configured],
    audience:{mode:"selected",memberIds:members},objective:{metric:"totalGames",target:1},cadence:"once",maxRepeats:1,openNow:true,indefinite:true,endsAt:null};
  const {id}=await action("create",config);
  for (const uid of members) {
    await db.doc(`eventRewards/replace-other-${uid}`).set({uid,eventId:"other-mission",source:"mission",schemaVersion:2,policyVersion:1,
      createdAt:Timestamp.fromDate(new Date()),startsAt:Timestamp.fromDate(new Date()),expiresAt:Timestamp.fromDate(new Date("2026-10-30")),
      reward:{mode:"stats",statDuration:"permanent",boosts:{passing:3}}});
    await claimMission.run({auth:{uid},data:{eventId:id}});
    // The emulator's server timestamp does not follow Node's historical clock.
    await db.doc(`eventRewards/${id}_mission_${uid}_once`).update({createdAt:Timestamp.fromDate(new Date())});
  }
  const deliveries=()=>db.collection("eventRewards").where("eventId","==",id).get();
  const before=await deliveries();
  const revoked={...before.docs[0].data(),revokedAt:Timestamp.fromDate(new Date())};
  await db.doc("eventRewards/replace-revoked").set(revoked);
  const update={...config,eventId:id,positions:[{...configured,boosts:{passing:8},specialId:"sniper"}]};
  t.mock.timers.setTime(+new Date("2026-10-24T12:00Z"));
  await action("update",update);
  for (const doc of before.docs) {
    const current=(await doc.ref.get()).data(),original=doc.data();
    assert.equal(current.reward.boosts.passing,7,"replaces the old six points; the other three still spend the limit");
    assert.equal(current.reward.specialId,"sniper");
    for (const field of ["createdAt","completedAt","periodKey","startsAt","cardStartsAt","expiresAt","weekId"])
      assert.deepEqual(current[field],original[field],field);
    const ledger=(await db.collection("eventRewards").where("uid","==",current.uid).get()).docs.map(doc=>doc.data());
    const effects=applyEventRewards({},ledger,current.uid);
    assert.equal(effects.boosts.passing,10);
    assert.ok(effects.specials.some(card=>card.id==="sniper"));
    assert.ok(!effects.specials.some(card=>card.id==="mvp"));
    assert.equal((await rawClaimMission.run({auth:{uid:current.uid},data:{eventId:id}})).reward.specialId,"sniper");
    assert.equal((await db.doc(`cardRefreshWork/${current.uid}`).get()).data().pending,true);
    assert.equal((await db.doc(`weeklyCards/${current.uid}`).get()).data().eventBoosts.passing,10,"saving publishes mission effects before returning");
  }
  assert.deepEqual((await db.doc("eventRewards/replace-revoked").get()).data(),revoked);
  const saved=(await before.docs[0].ref.get()).data();
  await action("update",update);
  assert.deepEqual((await before.docs[0].ref.get()).data(),saved,"repeated save is idempotent");
  assert.equal((await deliveries()).size,3,"same delivery IDs; no duplicate completions");
  // Saving also repairs an older configuration whose delivered rewards did not follow it.
  await db.doc(`events/${id}/private/rewards`).update({positions:[configured]});
  await action("update",{...config,eventId:id});
  assert.equal((await before.docs[0].ref.get()).data().reward.specialId,"mvp");
  // Changing duration uses the original start, rather than renewing a temporary award today.
  t.mock.timers.setTime(+new Date("2026-11-05T12:00Z"));
  await db.doc(`events/${id}`).update({status:"closed",ranking:[],winners:[{uid:members[0],uids:[members[0]],reward:configured}]});
  await action("update",{...update,positions:[{...configured,statDuration:"weekly",boosts:{shooting:4},specialId:"sniper"}]});
  const current=(await before.docs[0].ref.get()).data();
  assert.equal(current.expiresAt.toDate().toISOString(),"2026-10-30T12:00:00.000Z");
  assert.equal(current.expirationProcessed,true);
  const ledger=(await db.collection("eventRewards").where("uid","==",current.uid).get()).docs.map(doc=>doc.data());
  assert.equal(applyEventRewards({},ledger,current.uid).boosts.passing,3);
  assert.equal(applyEventRewards({},ledger,current.uid).boosts.shooting,0);
  const event=(await db.doc(`events/${id}`).get()).data();
  assert.equal(event.status,"closed");
  assert.equal(event.winners[0].reward.specialId,"sniper");
});

test("saving an event replaces delivered prizes and publishes the player's card immediately", async (t) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) throw Error("Emulador demo obrigatório.");
  t.mock.timers.enable({apis:["Date"],now:new Date("2026-10-29T13:00:00Z")});
  t.after(()=>t.mock.timers.reset());
  const owner="instant-reward-admin",uid="instant-reward-player";
  for (const id of [owner,uid]) await db.doc(`users/${id}`).set({uid:id,role:id===owner?"admin":"member",disabled:false,primaryPosition:"AV"});
  await db.doc(`initialRatings/${uid}`).set({completed:true,ratings20:Object.fromEntries(ATTRIBUTES.map(([key])=>[key,15]))});
  const original={mode:"both",statDuration:"monthly",cardDuration:"permanent",boosts:{shooting:10},specialId:"sniper"};
  const config={...payload(),kind:"event",method:"admin",winnerCount:1,votesPerUser:1,endsAt:"2026-11-05T18:00:00Z",positions:[original],audience:{mode:"selected",memberIds:[uid]},openNow:true};
  const action=(action,data)=>eventAction.run({auth:{uid:owner},data:{action,...data}});
  const {id}=await action("create",config);
  const issued=Timestamp.fromDate(new Date("2026-10-29T12:00Z"));
  const ref=db.doc(`eventRewards/${id}_position-1_${uid}`);
  await ref.set({uid,eventId:id,position:1,source:"event",schemaVersion:2,reward:original,configuredReward:original,createdAt:issued,startsAt:issued,cardStartsAt:issued,expiresAt:Timestamp.fromDate(new Date("2026-11-29T12:00Z"))});
  await db.doc(`events/${id}`).update({status:"closed",winners:[{uid,uids:[uid],position:1,reward:original}]});
  await action("update",{...config,eventId:id,positions:[{...original,mode:"card",boosts:{}}]});
  const delivery=(await ref.get()).data(),card=(await db.doc(`weeklyCards/${uid}`).get()).data();
  assert.equal(delivery.reward.boosts.shooting || 0,0);
  assert.equal(delivery.reward.specialId,"sniper");
  assert.deepEqual(delivery.startsAt,issued);
  assert.equal(card.eventBoosts.shooting,0);
  assert.equal(card.stats.shooting,card.gameStats.shooting);
  assert.equal((await db.doc(`events/${id}`).get()).data().winners[0].reward.boosts.shooting || 0,0);
  await action("update",{...config,eventId:id,positions:[{...original,boosts:{shooting:2}}]});
  assert.equal((await db.doc(`weeklyCards/${uid}`).get()).data().eventBoosts.shooting,2);
});

test("historical totals: old matches, authoritative claims, single completion and opening-time ranking", async (t) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) throw Error("Emulador demo obrigatório.");
  t.mock.timers.enable({apis:["Date"],now:new Date("2026-10-23T12:00:00Z")});
  t.after(()=>t.mock.timers.reset());
  const owner="totals-admin",uid="totals-member";
  for(const id of [owner,uid]) await db.doc(`users/${id}`).set({uid:id,role:id===owner?"admin":"member",disabled:false});
  const action=(action,data={})=>eventAction.run({auth:{uid:owner},data:{action,...data}});
  for(let i=0;i<2;i++) {
    const game={status:"closed",closedAt:Timestamp.fromDate(new Date(`2026-10-0${i+1}T09:00Z`)),teamA:{starters:[uid],bench:[]},teamB:{starters:[owner],bench:[]},score:{teamA:2,teamB:0},positions:{[uid]:i===0?"GR":"AV"}};
    await db.doc(`games/totals-${i}`).set(game);
    await db.doc(`gameSummaries/totals-${i}`).set({...game,players:{[uid]:{overall:4.5,evaluatedAt:`2026-10-0${i+1}T10:00Z`,ratingCounts:{overall:3}}}});
  }
  const config={...payload(),kind:"mission",scope:"individual",method:"objective",winnerCount:1,positions:[prize(5)],audience:{mode:"selected",memberIds:[uid]},objective:{metric:"totalGames",target:2},cadence:"once",maxRepeats:1,openNow:true};
  await assert.rejects(action("create",{...config,cadence:"weekly",maxRepeats:2}));
  await assert.rejects(action("create",{...config,objective:{metric:"totalGames",target:1000001}}));
  const {id}=await action("create",config);
  const detail=await getEvent.run({auth:{uid},data:{eventId:id}});
  assert.equal(detail.progress[0].progress,2);
  await claimMission.run({auth:{uid},data:{eventId:id}});
  await claimMission.run({auth:{uid},data:{eventId:id}});
  assert.equal((await db.collection("eventRewards").where("eventId","==",id).get()).size,1);
  const missing=await action("create",{...config,objective:{metric:"totalGames",target:3}});
  await assert.rejects(claimMission.run({auth:{uid},data:{eventId:missing.id,progress:999}}));
  const race=await action("create",{...config,kind:"event",needsConfirmation:true,objective:{metric:"totalWins",target:2}});
  await action("prepare",{eventId:race.id});
  const stored=(await db.doc(`events/${race.id}`).get()).data();
  assert.equal(stored.ranking[0].reachedAt,"2026-10-20T00:00:00.000Z");
  const stars={metric:"totalRatingWins",target:2,attributes:["overall"],threshold:4,comparison:"gte",combine:"all",minRatings:3};
  const historicalStars=await action("create",{...config,objective:stars});
  await claimMission.run({auth:{uid},data:{eventId:historicalStars.id}});
  const currentStars=await action("create",{...config,objective:{...stars,metric:"ratingWins"}});
  await assert.rejects(claimMission.run({auth:{uid},data:{eventId:currentStars.id}}));
});

test("combined missions and events: both goals, trusted ratings, claim idempotence and race completion time", async (t) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) throw Error("Emulador demo obrigatório.");
  t.mock.timers.enable({apis:["Date"],now:new Date("2026-10-23T12:00:00Z")});
  t.after(()=>t.mock.timers.reset());
  const owner="combined-admin", uid="combined-member";
  for(const id of [owner,uid]) await db.doc(`users/${id}`).set({uid:id,role:id===owner?"admin":"member",disabled:false});
  const action=(action,data={})=>eventAction.run({auth:{uid:owner},data:{action,...data}});
  const objective={metric:"combined",target:100,results:{metric:"goals",target:3},
    ratings:{metric:"ratingGames",target:2,attributes:["overall","passing"],threshold:4,comparison:"gte",combine:"all",minRatings:3}};
  const config={...payload(),kind:"mission",scope:"individual",method:"objective",winnerCount:1,positions:[prize(5)],audience:{mode:"selected",memberIds:[uid]},objective,openNow:true};
  await assert.rejects(action("create",{...config,scope:"group"}));
  await assert.rejects(action("create",{...config,objective:{...objective,target:1}}));
  await assert.rejects(action("create",{...config,objective:{...objective,ratings:{...objective.ratings,attributes:[]}}}));
  const {id}=await action("create",config);
  const claim=()=>claimMission.run({auth:{uid},data:{eventId:id,progress:100,eligible:true}});
  for(let i=0;i<3;i++) await db.doc(`games/combined-${i}`).set({status:"closed",closedAt:Timestamp.fromDate(new Date(`2026-10-${21+i}T09:00:00Z`)),
    teamA:{starters:[uid],bench:[]},teamB:{starters:[owner],bench:[]},score:{teamA:3,teamB:0},
    performance:{teamA:{goals:i===0?[uid,uid,uid]:[],assists:[]},teamB:{goals:[],assists:[]}}});
  await assert.rejects(claim());
  const summary=async(i,count=3)=>db.doc(`gameSummaries/combined-${i}`).set({...(await db.doc(`games/combined-${i}`).get()).data(),players:{[uid]:{
    overall:4.5,passing:4.5,evaluatedAt:`2026-10-${21+i}T10:00:00Z`,ratingCounts:{overall:count,passing:count}}}});
  await summary(1);
  let detail=await getEvent.run({auth:{uid},data:{eventId:id}});
  assert.equal(detail.progress[0].progress,50);
  assert.equal(detail.progress[0].ratingState.results.progress,3);
  assert.equal(detail.progress[0].ratingState.ratings.progress,1);
  await assert.rejects(claim());
  await summary(2,2);
  await assert.rejects(claim());
  await summary(2);
  await claim();await claim();
  assert.equal((await db.collection("eventRewards").where("eventId","==",id).get()).size,1);
  const race=await action("create",{...config,kind:"event",needsConfirmation:true});
  await action("prepare",{eventId:race.id});
  const stored=(await db.doc(`events/${race.id}`).get()).data();
  assert.equal(stored.ranking[0].eligible,true);
  assert.equal(stored.ranking[0].reachedAt,"2026-10-23T10:00:00.000Z");
  assert.equal(stored.objective.ratings.minRatings,3);
});

test("star missions: server validation, authoritative aggregates, rolling windows and one reward per period", async (t) => {
  t.mock.timers.enable({apis:["Date"],now:new Date("2026-10-23T12:00:00Z")});
  t.after(()=>t.mock.timers.reset());
  const owner="star-admin", uid="star-member";
  for (const id of [owner,uid]) await db.doc(`users/${id}`).set({uid:id,role:id===owner?"admin":"member",disabled:false});
  const action=(action,data={})=>eventAction.run({auth:{uid:owner},data:{action,...data}});
  const objective={metric:"ratingGames",target:2,attributes:["overall","passing"],threshold:4,comparison:"gte",combine:"all",minRatings:3};
  const config={...payload(),kind:"mission",method:"objective",winnerCount:1,positions:[prize(5)],audience:{mode:"selected",memberIds:[uid]},objective,openNow:true};
  await assert.rejects(action("create",{...config,objective:{...objective,attributes:["pace"]}}));
  await assert.rejects(action("create",{...config,scope:"group"}));
  const {id}=await action("create",config);
  const claim=()=>claimMission.run({auth:{uid},data:{eventId:id,progress:999}});
  for(let i=0;i<3;i++) await db.doc(`games/star-${i}`).set({status:"closed",closedAt:Timestamp.fromDate(new Date(`2026-10-${21+i}T09:00:00Z`)),teamA:{starters:[uid],bench:[]},teamB:{starters:[owner],bench:[]},score:{teamA:2,teamB:1}});
  await assert.rejects(claim());
  const summary=async(i,count=3,value=4.5)=>db.doc(`gameSummaries/star-${i}`).set({...(await db.doc(`games/star-${i}`).get()).data(),players:{[uid]:{overall:value,passing:value,evaluatedAt:`2026-10-${21+i}T10:00:00Z`,ratingCounts:{overall:count,passing:count}}}});
  await summary(0,2); await summary(1,2);
  await assert.rejects(claim());
  await summary(0); await summary(1);
  await claim(); await claim();
  assert.equal((await db.collection("eventRewards").where("eventId","==",id).get()).size,1);
  const rolling=await action("create",{...config,objective:{...objective,metric:"ratingAverage",target:3}});
  const rollingClaim=()=>claimMission.run({auth:{uid},data:{eventId:rolling.id}});
  await assert.rejects(rollingClaim());
  await summary(2,3,1);
  await assert.rejects(rollingClaim());
  await summary(2);
  const detail=await getEvent.run({auth:{uid},data:{eventId:rolling.id}});
  assert.equal(detail.progress[0].ratingState.averages.overall,4.5);
  await rollingClaim();
  const race=await action("create",{...config,kind:"event",needsConfirmation:true});
  await action("prepare",{eventId:race.id});
  const stored=(await db.doc(`events/${race.id}`).get()).data();
  assert.equal(stored.ranking[0].eligible,true);
  assert.equal(stored.ranking[0].reachedAt,"2026-10-22T10:00:00.000Z");
  const stale=await action("create",{...config,objective:{...objective,target:3}});
  await db.doc("games/star-2").update({closedAt:Timestamp.fromDate(new Date("2026-10-23T11:00:00Z"))});
  await assert.rejects(claimMission.run({auth:{uid},data:{eventId:stale.id}}));
});
test("eventos modernos: permissão, privacidade, votos, revisão, pódio, entrega única e anulação", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  for (const uid of [admin, ...ids]) {
    await db.doc(`users/${uid}`).set({
      uid,
      role: uid === admin ? "admin" : "member",
      disabled: false,
      primaryPosition: "AV",
    });
    await db.doc(`initialRatings/${uid}`).set({
      uid,
      ratings20: Object.fromEntries(ATTRIBUTES.map(([k]) => [k, 12])),
      completed: true,
      createdAt: Timestamp.fromDate(new Date("2026-10-01")),
    });
  }
  await assert.rejects(
    eventAction.run({
      auth: { uid: ids[0] },
      data: { action: "create", ...payload() },
    }),
  );
  const { id } = await call("create", {
    ...payload(),
    rarity: "ultimate",
    openNow: true,
  });
  const publicBefore = await getEvent.run({
    auth: { uid: ids[0] },
    data: { eventId: id },
  });
  assert.equal(publicBefore.configuration, undefined);
  assert.equal(publicBefore.rarity, "ultimate");
  await call("update", { ...payload(), eventId: id });
  assert.equal(
    (await getEvent.run({ auth: { uid: ids[0] }, data: { eventId: id } }))
      .rarity,
    "ultimate",
  );
  await assert.rejects(call("create", { ...payload(), rarity: "invalid" }));
  assert.equal(publicBefore.rewardPreview.length, 3);
  assert.equal(publicBefore.rewardPreview[0].specialId, "mvp");
  assert.equal(publicBefore.ballots, undefined);
  assert.deepEqual(publicBefore.winners, []);
  await assert.rejects(
    voteEvent.run({
      auth: { uid: ids[0] },
      data: { eventId: id, selections: [ids[1], ids[1]] },
    }),
  );
  await assert.rejects(
    voteEvent.run({
      auth: { uid: ids[0] },
      data: { eventId: id, selections: [ids[0]] },
    }),
  );
  for (const [uid, selections] of [
    [ids[0], [ids[1], ids[2]]],
    [ids[1], [ids[0], ids[2]]],
    [ids[2], [ids[0], ids[1]]],
    [ids[3], [ids[0], ids[1]]],
  ])
    await voteEvent.run({ auth: { uid }, data: { eventId: id, selections } });
  await voteEvent.run({
    auth: { uid: ids[3] },
    data: { eventId: id, selections: [ids[0], ids[1]] },
  });
  assert.equal(
    (await db.doc(`events/${id}`).collection("votes").get()).size,
    4,
  );
  await call("prepare", { eventId: id });
  assert.equal((await db.doc(`events/${id}`).get()).data().status, "review");
  assert.equal(
    (await db.collection("eventRewards").where("eventId", "==", id).get()).size,
    0,
  );
  const audited = await getEvent.run({
    auth: { uid: admin },
    data: { eventId: id },
  });
  assert.equal(audited.ballots.length, 4);
  assert.equal(audited.configuration.positions.length, 3);
  assert.ok(audited.flags.length);
  await assert.rejects(
    voteEvent.run({
      auth: { uid: ids[0] },
      data: { eventId: id, selections: [ids[1]] },
    }),
  );
  await call("confirm", { eventId: id });
  await call("confirm", { eventId: id });
  const result = await getEvent.run({
    auth: { uid: ids[0] },
    data: { eventId: id },
  });
  assert.deepEqual(
    result.winners.map((w) => [w.position, w.uid]),
    [
      [1, ids[0]],
      [2, ids[1]],
      [3, ids[2]],
    ],
  );
  assert.equal(result.winners[0].reward.specialId, "mvp");
  assert.equal(result.ballots, undefined);
  assert.equal(
    (await db.collection("eventRewards").where("eventId", "==", id).get()).size,
    3,
  );
  assert.ok(
    (
      await listEvents.run({
        auth: { uid: ids[0] },
        data: { scope: "history" },
      })
    ).some((e) => e.id === id),
  );
  await call("revoke", {
    eventId: id,
    reason: "Resultado anulado para revisão",
  });
  assert.ok(
    (
      await db.collection("eventRewards").where("eventId", "==", id).get()
    ).docs.every((d) => d.data().revokedAt),
  );
  assert.equal(
    (await db.doc(`events/${id}`).collection("votes").get()).size,
    4,
  );
});
test("missões: objetivos reais, limite de repetição, progresso coletivo e duplicação", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const stamp = Timestamp.fromDate(new Date("2026-10-22T12:00:00Z"));
  await db.doc("games/managed-mission-game").set({
    status: "closed",
    closedAt: stamp,
    scheduledAt: stamp,
    teamA: { starters: [ids[0], ids[1]], bench: [] },
    teamB: { starters: [ids[2]], bench: [] },
    score: { teamA: 7, teamB: 5 },
    performance: {
      teamA: { goals: [ids[0], ids[0], ids[1]], assists: [ids[0]] },
    },
  });
  const mission = {
    ...payload(),
    kind: "mission",
    method: "objective",
    winnerCount: 1,
    positions: [prize(5)],
    objective: { metric: "goals", target: 2 },
    openNow: true,
  };
  const { id } = await call("create", mission);
  await assert.rejects(
    claimMission.run({
      auth: { uid: ids[1] },
      data: { eventId: id, progress: 999 },
    }),
  );
  const first = await claimMission.run({
    auth: { uid: ids[0] },
    data: { eventId: id },
  });
  assert.equal(first.reward.specialId, "mvp");
  await claimMission.run({ auth: { uid: ids[0] }, data: { eventId: id } });
  assert.equal(
    (await db.collection("eventRewards").where("eventId", "==", id).get()).size,
    1,
  );
  const detail = await getEvent.run({
    auth: { uid: ids[0] },
    data: { eventId: id },
  });
  assert.equal(detail.progress[0].progress, 2);
  assert.deepEqual(detail.claimedPeriods, ["once"]);
  const publicBoard=await getEvent.run({auth:{uid:ids[1]},data:{eventId:id}});
  assert.deepEqual(publicBoard.progress.map(row=>row.uid),[ids[1]],"private detail stays restricted to the viewer");
  assert.deepEqual(publicBoard.participantProgress.map(row=>row.percent),[100,50,0,0]);
  assert.equal(publicBoard.participantProgress.find(row=>row.uid===ids[0]).claimed,true);
  assert.equal(publicBoard.participantProgress.find(row=>row.uid===ids[1]).progress,1);
  assert.ok(publicBoard.participantProgress.every(row=>!Object.hasOwn(row,"ratingState") && !Object.hasOwn(row,"reward") && !Object.hasOwn(row,"votes")));
  const collective = await call("create", {
    ...mission,
    title: "Objetivo da equipa",
    scope: "collective",
    objective: { metric: "goals", target: 3 },
  });
  await claimMission.run({
    auth: { uid: ids[1] },
    data: { eventId: collective.id },
  });
  for (const scope of ["team", "collective", "group"]) {
    const shared = await call("create", {
      ...mission, title: "Carregas ou és carregado", scope,
      objective: { metric: "goals", target: 10 },
    });
    const board = await getEvent.run({auth:{uid:ids[1]},data:{eventId:shared.id}});
    assert.equal(board.participantProgress.length, ids.length, `${scope}: all participants are visible`);
    assert.deepEqual(board.progress.map(row=>row.uid), [ids[1]], `${scope}: private progress remains restricted`);
    if (scope !== "group") {
      assert.deepEqual(board.participantProgress.map(row=>row.percent), [70,70,50,0]);
      assert.equal(board.participantProgress.find(row=>row.uid===ids[1]).progress, 7, "counts the player's team goals, not individual goals");
    }
    assert.ok(board.participantProgress.every(row=>!Object.hasOwn(row,"ratingState") && !Object.hasOwn(row,"reward")));
  }
  const copy = await call("duplicate", { eventId: id });
  assert.equal(
    (await db.doc(`events/${copy.id}`).get()).data().status,
    "draft",
  );
  await call("cancel", { eventId: id });
  assert.ok(
    (
      await db.collection("eventRewards").where("eventId", "==", id).get()
    ).docs[0].data().revokedAt,
  );
});
test("agendamento, limites e escolha ADMIN são validados no servidor", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  await assert.rejects(
    call("create", {
      ...payload(),
      positions: [
        { mode: "stats", statDuration: "permanent", boosts: { shooting: 11 } },
        prize(1),
        prize(1),
      ],
    }),
  );
  const { id } = await call("create", {
    ...payload(),
    method: "admin",
    startsAt: "2026-10-23T13:00:00Z",
    endsAt: "2026-10-24T00:00:00Z",
    openNow: true,
  });
  assert.equal((await db.doc(`events/${id}`).get()).data().status, "scheduled");
  t.mock.timers.setTime(+new Date("2026-10-23T14:00:00Z"));
  await closeEvents.run({});
  assert.equal((await db.doc(`events/${id}`).get()).data().status, "open");
  await call("prepare", { eventId: id, winnerIds: [ids[2], ids[0]] });
  await call("confirm", { eventId: id, winnerIds: [ids[2], ids[0]] });
  assert.deepEqual(
    (
      await getEvent.run({ auth: { uid: ids[0] }, data: { eventId: id } })
    ).winners.map((w) => w.uid),
    [ids[2], ids[0]],
  );
});

test("missões semanais renovam progresso; máximos permanentes e expiração são efetivos", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const mission = {
    ...payload(),
    kind: "mission",
    method: "objective",
    winnerCount: 1,
    positions: [
      {
        mode: "stats",
        statDuration: "permanent",
        boosts: { shooting: 2 },
      },
    ],
    objective: { metric: "goals", target: 2 },
    cadence: "weekly",
    maxRepeats: 2,
    endsAt: "2026-11-10T00:00:00Z",
    openNow: true,
  };
  const { id } = await call("create", mission);
  const claim = (eventId) =>
    claimMission.run({ auth: { uid: ids[0] }, data: { eventId } });
  await claim(id);
  const first = (
    await db.collection("eventRewards").where("eventId", "==", id).get()
  ).docs[0].data();
  assert.equal(first.reward.boosts.shooting, 2);
  assert.equal(
    first.expiresAt.toMillis() - first.startsAt.toMillis(),
    7 * 86400000,
  );
  t.mock.timers.setTime(+new Date("2026-10-30T12:00:00Z"));
  await assert.rejects(claim(id));
  const nextPeriod=await getEvent.run({auth:{uid:ids[0]},data:{eventId:id}});
  assert.equal(nextPeriod.participantProgress.find(row=>row.uid===ids[0]).percent,0,"last period completion does not complete the new period");
  const stamp = Timestamp.fromDate(new Date("2026-10-30T10:00:00Z"));
  await db.doc("games/managed-repeat-game").set({
    status: "closed",
    closedAt: stamp,
    scheduledAt: stamp,
    teamA: { starters: [ids[0]], bench: [] },
    teamB: { starters: [ids[2]], bench: [] },
    score: { teamA: 3, teamB: 1 },
    performance: { teamA: { goals: [ids[0], ids[0]], assists: [] } },
  });
  await claim(id);
  await claim(id);
  const completedLimit=await getEvent.run({auth:{uid:ids[0]},data:{eventId:id}});
  assert.equal(completedLimit.participantProgress.find(row=>row.uid===ids[0]).percent,100);
  assert.equal(
    (await db.collection("eventRewards").where("eventId", "==", id).get()).size,
    2,
  );
  for (const index of [1, 2, 3, 4]) {
    const extra = await call("create", {
      ...mission,
      startsAt: "2026-10-29T00:00:00Z",
      title: `Permanente ${index}`,
      cadence: "once",
      maxRepeats: 1,
    });
    const result = await claim(extra.id);
    assert.equal(result.reward.boosts.shooting, index <= 3 ? 2 : 0);
  }
  t.mock.timers.setTime(+new Date("2026-11-07T12:00:00Z"));
  await assert.rejects(claim(id));
  await closeEvents.run({});
  assert.equal(
    (
      await db.collection("eventRewards").where("eventId", "==", id).get()
    ).docs[0].data().expirationProcessed,
    true,
  );
});

test("notificações usam o pódio e prémios efetivos, sem recompensas de participação", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const { id } = await call("create", {
    ...payload(),
    method: "admin",
    winnerCount: 1,
    positions: [prize(8)],
    openNow: true,
  });
  await call("prepare", { eventId: id, winnerIds: [ids[2]] });
  await call("confirm", { eventId: id, winnerIds: [ids[2]] });
  await onEventNotifications.run({ params: { eid: id } });
  const notice = (
    await db.doc(`users/${ids[2]}/notifications/event-result-${id}`).get()
  ).data();
  assert.equal(notice.podium[0].position, 1);
  assert.match(notice.podium[0].reward, /Melhor em campo/);
  assert.match(notice.body, /🥇/);
  const received = (
    await db.doc(`users/${ids[2]}/notifications/event-reward-${id}`).get()
  ).data();
  assert.match(received.body, /Melhor em campo/);
  const details = await getEvent.run({
    auth: { uid: admin },
    data: { eventId: id },
  });
  assert.equal(details.participationAwards.length, 0);
});

test("indefinite missions unlock after all or any prerequisites and reject cycles", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const mission = {
    ...payload(),
    kind: "mission",
    method: "objective",
    indefinite: true,
    endsAt: null,
    winnerCount: 1,
    positions: [prize(1)],
    objective: { metric: "games", target: 1 },
    cadence: "once",
    openNow: true,
  };
  const first = await call("create", { ...mission, title: "Primeira" });
  const second = await call("create", { ...mission, title: "Segunda" });
  const prerequisites = { mode: "all", missionIds: [first.id, second.id] };
  const child = await call("create", {
    ...mission,
    title: "Todas",
    prerequisites,
  });
  const any = await call("create", {
    ...mission,
    title: "Uma",
    prerequisites: { ...prerequisites, mode: "any" },
  });
  const detail = (id) =>
    getEvent.run({ auth: { uid: ids[0] }, data: { eventId: id } });
  const claim = (id) =>
    claimMission.run({ auth: { uid: ids[0] }, data: { eventId: id } });
  assert.equal(await detail(child.id), null);
  await assert.rejects(claim(child.id));
  await db.doc("games/unlock-before").set({
    status: "closed",
    closedAt: Timestamp.fromDate(new Date("2026-10-22")),
    teamA: { starters: [ids[0]], bench: [] },
    teamB: { starters: [ids[1]], bench: [] },
    score: { teamA: 1, teamB: 0 },
  });
  await claim(first.id);
  assert.ok(await detail(any.id));
  assert.equal(await detail(child.id), null);
  await claim(second.id);
  const unlocked = await detail(child.id);
  assert.equal(unlocked.endsAt, null);
  await assert.rejects(claim(child.id));
  t.mock.timers.setTime(+new Date("2026-10-23T14:00:00Z"));
  await db.doc("games/unlock-after").set({
    status: "closed",
    closedAt: Timestamp.fromDate(new Date("2026-10-23T13:00:00Z")),
    teamA: { starters: [ids[0]], bench: [] },
    teamB: { starters: [ids[1]], bench: [] },
    score: { teamA: 1, teamB: 0 },
  });
  await claim(child.id);
  const draft = await call("create", {
    ...mission,
    openNow: false,
    title: "Raiz",
  });
  const dependent = await call("create", {
    ...mission,
    openNow: false,
    title: "Dependente",
    prerequisites: { mode: "all", missionIds: [draft.id] },
  });
  await assert.rejects(
    call("update", {
      ...mission,
      openNow: false,
      eventId: draft.id,
      prerequisites: { mode: "all", missionIds: [dependent.id] },
    }),
  );
  await assert.rejects(
    call("create", {
      ...mission,
      prerequisites: { mode: "all", missionIds: ["missing"] },
    }),
  );
  t.mock.timers.setTime(+new Date("2028-01-01"));
  await closeEvents.run({});
  assert.equal(
    (await db.doc(`events/${child.id}`).get()).data().status,
    "open",
  );
  assert.ok(await detail(child.id));
});

test("ADMIN edits published and ended missions without resetting status or awards", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T14:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const mission = {
    ...payload(),
    kind: "mission",
    method: "objective",
    indefinite: true,
    endsAt: null,
    winnerCount: 1,
    positions: [prize(2)],
    objective: { metric: "games", target: 1 },
    cadence: "once",
    openNow: true,
  };
  const { id } = await call("create", mission);
  const claim = () =>
    claimMission.run({ auth: { uid: ids[0] }, data: { eventId: id } });
  await claim();
  const before = (await db.doc(`events/${id}`).get()).data();
  const awards = await db
    .collection("eventRewards")
    .where("eventId", "==", id)
    .get();
  const changes = {
    ...mission,
    eventId: id,
    title: "Missão atualizada",
    description: "Nova descrição",
    rules: "Novas regras",
    image: "https://example.com/mission.png",
    objective: { metric: "goals", target: 10 },
    scope: "collective",
    difficulty: "hard",
    maxRepeats: 1,
    positions: [prize(9)],
    openNow: false,
  };
  await assert.rejects(
    eventAction.run({
      auth: { uid: ids[0] },
      data: { action: "update", ...changes },
    }),
  );
  await call("update", changes);
  const updated = (await db.doc(`events/${id}`).get()).data();
  assert.equal(updated.title, changes.title);
  assert.equal(updated.description, changes.description);
  assert.deepEqual(updated.objective, changes.objective);
  assert.equal(updated.scope, "collective");
  assert.equal(updated.difficulty, "hard");
  assert.equal(updated.status, "open");
  assert.deepEqual(updated.createdAt, before.createdAt);
  assert.deepEqual(updated.winners, before.winners);
  const existing = await claim();
  assert.equal(existing.reward.specialId, "sniper");
  assert.equal(
    (await db.collection("eventRewards").where("eventId", "==", id).get()).size,
    awards.size,
  );
  assert.equal(
    (await db.doc(`events/${id}/private/rewards`).get()).data().positions[0]
      .specialId,
    "sniper",
  );
  await call("close", { eventId: id });
  t.mock.timers.setTime(+new Date("2026-10-25"));
  await call("update", {
    ...changes,
    title: "Missão terminada editada",
    indefinite: false,
    endsAt: "2026-10-24T00:00:00Z",
    openNow: true,
  });
  assert.equal((await db.doc(`events/${id}`).get()).data().status, "closed");
  assert.equal((await claim()).reward.specialId, "sniper");
  assert.equal((await db.collection("eventRewards").where("eventId", "==", id).get()).size, awards.size);
  const cancelled = await call("create", {
    ...mission,
    title: "Para cancelar",
  });
  await call("cancel", { eventId: cancelled.id });
  await call("update", {
    ...changes,
    eventId: cancelled.id,
    title: "Missão cancelada editada",
  });
  assert.equal(
    (await db.doc(`events/${cancelled.id}`).get()).data().status,
    "cancelled",
  );
});

test("permanent prizes allow larger grants but clip each attribute at ten", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T14:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const base = {
    ...payload(),
    kind: "mission",
    method: "objective",
    indefinite: true,
    endsAt: null,
    winnerCount: 1,
    objective: { metric: "games", target: 1 },
    cadence: "once",
    openNow: true,
  };
  for (const [index, boost] of [7, 7].entries()) {
    const mission = await call("create", {
      ...base,
      title: `Grande recompensa ${index}`,
      positions: [
        {
          mode: "stats",
          statDuration: "permanent",
          boosts: { passing: boost, dribbling: boost },
        },
      ],
    });
    const result = await claimMission.run({
      auth: { uid: ids[0] },
      data: { eventId: mission.id },
    });
    assert.equal(result.reward.boosts.passing, index === 0 ? 7 : 3);
    assert.equal(result.reward.boosts.dribbling, index === 0 ? 7 : 3);
  }
  await assert.rejects(
    call("create", {
      ...base,
      positions: [
        { mode: "recognition", statDuration: "weekly", boosts: {}, points: 5 },
      ],
    }),
  );
});

test("only ADMIN deletes cancelled missions, removing children and protecting prerequisites", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T14:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const mission = {
    ...payload(),
    kind: "mission",
    method: "objective",
    indefinite: true,
    endsAt: null,
    winnerCount: 1,
    objective: { metric: "games", target: 1 },
    cadence: "once",
    positions: [prize(1)],
    openNow: true,
  };
  const { id } = await call("create", mission);
  await assert.rejects(call("delete", { eventId: id }));
  const dependent = await call("create", {
    ...mission,
    prerequisites: { mode: "all", missionIds: [id] },
  });
  await claimMission.run({ auth: { uid: ids[0] }, data: { eventId: id } });
  await call("cancel", { eventId: id });
  await assert.rejects(
    eventAction.run({
      auth: { uid: ids[0] },
      data: { action: "delete", schemaVersion: 2, eventId: id },
    }),
  );
  await assert.rejects(call("delete", { eventId: id }));
  await call("update", {
    ...mission,
    eventId: dependent.id,
    prerequisites: { mode: "all", missionIds: [] },
  });
  await db.doc(`events/${id}/votes/${ids[0]}`).set({ selections: [ids[1]] });
  await call("delete", { eventId: id, schemaVersion: 2 });
  assert.equal((await db.doc(`events/${id}`).get()).exists, false);
  for (const collection of ["private", "audit", "votes"])
    assert.equal(
      (await db.collection(`events/${id}/${collection}`).get()).size,
      0,
    );
  assert.equal(
    await getEvent.run({ auth: { uid: admin }, data: { eventId: id } }),
    null,
  );
  assert.ok(
    !(
      await listEvents.run({ auth: { uid: admin }, data: { scope: "all" } })
    ).some((event) => event.id === id),
  );
  const rewards = await db
    .collection("eventRewards")
    .where("eventId", "==", id)
    .get();
  assert.ok(rewards.docs.every((row) => row.data().revokedAt));
  await call("delete", { eventId: id, schemaVersion: 2 });
});

test("events support unlimited duration, live voting, complete editing and cancelled deletion", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T14:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const base = {
    ...payload(),
    indefinite: true,
    endsAt: null,
    votingEndsAt: null,
    winnerCount: 1,
    positions: [prize(1)],
    openNow: true,
  };
  const { id } = await call("create", base);
  await voteEvent.run({
    auth: { uid: ids[0] },
    data: { eventId: id, selections: [ids[1]] },
  });
  await call("update", {
    ...base,
    eventId: id,
    title: "Votação editada",
    openNow: false,
  });
  assert.equal((await db.doc(`events/${id}`).get()).data().status, "open");
  assert.equal(
    (await db.doc(`events/${id}/votes/${ids[0]}`).get()).exists,
    true,
  );
  await onEventNotifications.run({ params: { eid: id } });
  assert.doesNotMatch(
    (
      await db.doc(`users/${ids[0]}/notifications/mission-event-${id}`).get()
    ).data().body,
    /1970/,
  );
  await call("cancel", { eventId: id });
  await call("delete", { eventId: id, schemaVersion: 2 });
  assert.equal((await db.doc(`events/${id}`).get()).exists, false);
});

test("objective competition closes on first verified completion and preserves chronological podium", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T16:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const base = {
    ...payload(),
    title: "Corrida ao golo",
    method: "objective",
    indefinite: true,
    endsAt: null,
    startsAt: "2026-10-23T14:00:00Z",
    winnerCount: 1,
    positions: [prize(1)],
    objective: { metric: "goals", target: 2 },
    cadence: "once",
    liveResults: true,
    needsConfirmation: false,
    openNow: true,
  };
  const { id } = await call("create", base);
  for (const [index, uid] of [ids[1], ids[0]].entries())
    await db.doc(`games/race-goals-${index}`).set({
      title: `Jogo da competição ${index}`,
      scheduledAt: Timestamp.fromDate(
        new Date(`2026-10-23T${index === 0 ? "14:00" : "15:00"}:00Z`),
      ),
      status: "closed",
      closedAt: Timestamp.fromDate(
        new Date(`2026-10-23T${index === 0 ? "14:30" : "15:30"}:00Z`),
      ),
      teamA: { starters: [uid], bench: [] },
      teamB: { starters: [ids[2]], bench: [] },
      score: { teamA: index === 0 ? 2 : 5, teamB: 0 },
      performance: {
        teamA: { goals: Array(index === 0 ? 2 : 5).fill(uid), assists: [] },
      },
    });
  const before = await getEvent.run({
    auth: { uid: ids[0] },
    data: { eventId: id },
  });
  assert.equal(before.progress[0].progress, 5);
  assert.equal(before.ranking[0].uid, ids[1]);
  await assert.rejects(
    claimMission.run({ auth: { uid: ids[0] }, data: { eventId: id } }),
  );
  await onGame.run({
    params: { gid: "race-goals-1" },
    data: { before: { data: () => ({ status: "open" }) },
      after: { data: () => ({ status: "closed" }) } },
  });
  const ended = (await db.doc(`events/${id}`).get()).data();
  assert.equal(ended.status, "closed");
  assert.equal(ended.winners[0].uid, ids[1]);
  assert.equal(ended.winners[0].reachedAt, "2026-10-23T14:30:00.000Z");
  const awards = await db
    .collection("eventRewards")
    .where("eventId", "==", id)
    .get();
  assert.equal(awards.size, 1);
  await closeEvents.run({});
  assert.equal(
    (await db.collection("eventRewards").where("eventId", "==", id).get()).size,
    1,
  );
  await call("update", {
    ...base,
    eventId: id,
    title: "Competição terminada editada",
  });
  assert.equal((await db.doc(`events/${id}`).get()).data().status, "closed");
  await call("create", { ...base, scope: "team" });
  await call("create", { ...base, scope: "group" });
});

test("duração das recompensas: entrega semanal, mensal e permanente", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  await db
    .doc(`users/${admin}`)
    .set({ uid: admin, role: "admin", disabled: false });
  for (const duration of ["weekly", "monthly", "permanent"]) {
    const uid = `duration-${duration}`;
    await db
      .doc(`users/${uid}`)
      .set({ uid, role: "member", disabled: false, primaryPosition: "AV" });
    const stamp = Timestamp.fromDate(new Date("2026-10-22T12:00:00Z"));
    await db.doc(`games/duration-${duration}`).set({
      status: "closed",
      scheduledAt: stamp,
      closedAt: stamp,
      teamA: { starters: [uid], bench: [] },
      teamB: { starters: ["other"], bench: [] },
      score: { teamA: 1, teamB: 0 },
    });
    const { id } = await call("create", {
      ...payload(),
      kind: "mission",
      method: "objective",
      audience: { mode: "selected", memberIds: [uid] },
      winnerCount: 1,
      positions: [
        {
          mode: "both",
          statDuration: duration,
          specialId: "mvp",
          boosts: { shooting: 3 },
        },
      ],
      objective: { metric: "games", target: 1 },
      openNow: true,
    });
    await claimMission.run({ auth: { uid }, data: { eventId: id } });
    const ledger = (
      await db.collection("eventRewards").where("eventId", "==", id).get()
    ).docs[0].data();
    assert.equal(ledger.reward.statDuration, duration);
    assert.equal(ledger.reward.cardDuration, "weekly");
    assert.equal(ledger.reward.boosts.shooting, 3);
    assert.equal(
      ledger.startsAt.toDate().toISOString(),
      "2026-10-23T12:00:00.000Z",
    );
    if (duration !== "permanent")
      assert.equal(
        ledger.expiresAt.toDate().toISOString(),
        duration === "monthly"
          ? "2026-11-23T12:00:00.000Z"
          : "2026-10-30T12:00:00.000Z",
      );
  }
});

test("âmbitos em missões e eventos: grupo, equipa, adversários e data do jogo", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  await db
    .doc(`users/${admin}`)
    .set({ uid: admin, role: "admin", disabled: false });
  const members = ["scope-a", "scope-b", "scope-c", "scope-absent"];
  for (const uid of members)
    await db.doc(`users/${uid}`).set({ uid, role: "member", disabled: false });
  const match = {
    status: "closed",
    scheduledAt: Timestamp.fromDate(new Date("2026-10-22T20:00Z")),
    closedAt: Timestamp.fromDate(new Date("2026-10-22T22:00Z")),
    teamA: { starters: members.slice(0, 2), bench: [] },
    teamB: { starters: [members[2]], bench: [] },
    score: { teamA: 5, teamB: 7 },
    performance: {
      teamA: { goals: members.slice(0, 2), assists: [] },
      teamB: { goals: [members[2], members[2]], assists: [] },
    },
  };
  await db.doc("games/scope-current").set(match);
  await db.doc("games/scope-old-late-close").set({
    ...match,
    scheduledAt: Timestamp.fromDate(new Date("2026-10-19T20:00Z")),
    closedAt: Timestamp.fromDate(new Date("2026-10-19T22:00Z")),
    score: { teamA: 99, teamB: 99 },
  });
  for (const kind of ["mission", "event"]) {
    for (const scope of ["team", "collective", "group", "individual"]) {
      const { id } = await call("create", {
        ...payload(),
        title: `${kind} ${scope}`,
        kind,
        scope,
        method: "objective",
        winnerCount: 1,
        positions: [prize(5)],
        audience: { mode: "selected", memberIds: members },
        objective: { metric: "goals", target: 30 },
        openNow: true,
      });
      const detail = await getEvent.run({
        auth: { uid: admin },
        data: { eventId: id },
      });
      const actual = Object.fromEntries(
        detail.progress.map((row) => [row.uid, row.progress]),
      );
      const expected =
        scope === "group"
          ? [4, 4, 4, 4]
          : scope === "individual"
            ? [1, 1, 2, 0]
            : [5, 5, 7, 0];
      members.forEach((uid, index) =>
        assert.equal(actual[uid], expected[index], `${kind} ${scope} ${uid}`),
      );
    }
  }
});
