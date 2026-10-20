import test from "node:test";
import { AsyncLocalStorage } from "node:async_hooks";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { ATTRIBUTES, FEEDBACK } from "../js/utils.js";
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) throw Error("Emulador demo obrigatório.");
const baseline = process.env.READ_BUDGET_BASELINE === "1";
const endpoints = await import(baseline ? "../test-results/read-baseline/functions/index.js" : "../functions/index.js");
const db = getFirestore();
test("read budgets: shared mission summaries and participant rebuilds preserve results", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-19T12:00:00Z") });
  t.after(() => t.mock.timers.reset());
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  // This suite owns a freshly started demo emulator, never a production database.
  const cleared = await fetch(`http://${host}/emulator/v1/projects/${process.env.GCLOUD_PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  assert.ok(cleared.ok);
  const ids = Array.from({length: 10}, (_, i) => `budget-${i}`);
  const when = Timestamp.fromDate(new Date("2026-10-18T12:00:00Z"));
  let batch = db.batch();
  for (const uid of ids) {
    batch.set(db.doc(`users/${uid}`), {uid, role: uid === ids[0] ? "admin" : "member", disabled:false, primaryPosition:"ALA", createdAt: when});
    batch.set(db.doc(`initialRatings/${uid}`), {uid, completed:true, ratings20:Object.fromEntries(ATTRIBUTES.map(([k])=>[k,14])), createdAt:when});
    batch.set(db.doc(`communitySummaries/${uid}`), {targetId:uid,count:0,ratings20:{}});
  }
  await batch.commit();
  for (let n = 0; n < 4; n++) {
    batch = db.batch();
    batch.set(db.doc(`games/budget-game-${n}`), {status:"closed", title:"Demo", scheduledAt:when, closedAt:when, teamA:{starters:ids.slice(0,5),bench:[]},teamB:{starters:ids.slice(5),bench:[]},score:{teamA:2,teamB:1}});
    for(const raterId of ids) for(const targetId of ids)
      batch.set(db.doc(`games/budget-game-${n}/feedback/${raterId}_${targetId}`), {submitted:true,raterId,targetId,ratings:Object.fromEntries(FEEDBACK.map(([k])=>[k,4])),submittedAt:when,updatedAt:when});
    await batch.commit();
  }
  // Measure SDK reads, including transaction attempts. This is not a cloud bill.
  let active = null;
  const record = (snap, path) => {
    if (!active) return;
    active.reads += Math.max(1, snap.docs ? snap.docs.length : 1);
    active.requests++;
    active.paths[path] = (active.paths[path] || 0) + 1;
  };
  const owners = new Set();
  const patch = value => {
    let owner = Object.getPrototypeOf(value);
    while (owner && !Object.hasOwn(owner,"get")) owner = Object.getPrototypeOf(owner);
    if (!owner || owners.has(owner)) return;
    owners.add(owner);
    const original = owner.get;
    t.mock.method(owner,"get",async function(...args) {
      const result = await original.apply(this,args);
      const target = args[0]?.path || this.path || this._queryOptions?.parentPath?.formattedName || "query";
      record(result,target);
      return result;
    });
  };
  patch(db.doc("users/x")); patch(db.collection("users"));
  // Query.get is inherited by CollectionReference.
  patch(db.collection("users").where("role","==","member"));
  const { Transaction } = await import("@google-cloud/firestore");
  const instrument = new AsyncLocalStorage();
  const get = Transaction.prototype.get;
  t.mock.method(Transaction.prototype,"get",async function(target,...args) {const result=await instrument.run(true,()=>get.call(this,target,...args));record(result,target.path || "query");return result;});
  const getAll = Transaction.prototype.getAll;
  t.mock.method(Transaction.prototype,"getAll",async function(...args) {const result=await getAll.apply(this,args);if(!instrument.getStore())for(let i=0;i<result.length;i++)record(result[i],args[i]?.path || "getAll");return result;});
  const measure = async work => {
    active={reads:0,requests:0,paths:{}};
    try {await work();return active;} finally {active=null;}
  };
  const vote = await db.doc(`games/budget-game-0/feedback/${ids[0]}_${ids[0]}`).get();
  const feedback = await measure(() => endpoints.onFeedback.run({params:{gid:"budget-game-0"},data:{after:vote,before:{data:()=>undefined}}}));
  const fingerprint = [];
  for(const uid of ids) {const value=(await db.doc(`weeklyCards/${uid}`).get()).data();assert.ok(value);fingerprint.push({uid,ovr:value.ovr,stats:value.stats,specials:value.specials.map(s=>s.id)});}
  const { cardWeek } = await import("../js/card-week.js");
  await db.doc(`users/${ids[0]}/cardHistory/${cardWeek().weekId}`).update({updatedAt:Timestamp.fromMillis(Date.now())});
  const warmHistory = await measure(() => endpoints.ensureHistory.run({auth:{uid:ids[0]}, data:{}}));
  for(let n=0;n<20;n++) {
    await endpoints.eventAction.run({auth:{uid:ids[0]},data:{action:"create",schemaVersion:2,title:`Budget ${n}`,kind:"mission",method:"objective",startsAt:"2026-10-18T00:00:00Z",endsAt:"2026-10-25T00:00:00Z",audience:{mode:"all"},winnerCount:1,positions:[{mode:"card",statDuration:"weekly",boosts:{},specialId:"sniper"}],scope:"individual",objective:{metric:"games",target:1},maxRepeats:1,openNow:true}});
  }
  let visible;
  const summaries = await measure(async () => {
    visible=await endpoints.listEvents.run({auth:{uid:ids[0]},data:baseline?{}:{summaries:true}});
    if(baseline) for(const event of visible)await endpoints.getEvent.run({auth:{uid:ids[0]},data:{eventId:event.id}});
  });
  batch = db.batch();
  for(let n=0;n<200;n++) {
    batch.set(db.doc(`events/archived-${n}`), {schemaVersion:2, status:"closed", rewardsApplied:true});
    batch.set(db.doc(`eventRewards/future-${n}`), {schemaVersion:2, uid:ids[0], expiresAt:Timestamp.fromDate(new Date("2026-11-01T00:00:00Z"))});
  }
  await batch.commit();
  const scheduled = await measure(() => endpoints.closeEvents.run({}));
  if(!baseline) {
    assert.equal(visible.length,20);
    assert.ok(visible.every(event=>event.missionSummary?.progress?.length===1));
    assert.ok(visible.every(event=>!event.missionSummary.configuration && !event.missionSummary.audit));
    // Increasing missions must not repeat global games or summary reads.
    assert.ok(summaries.reads < 100, JSON.stringify(summaries));
    assert.ok(feedback.reads < 1200, JSON.stringify(feedback));
    const old=JSON.parse((await import('node:fs')).readFileSync('test-results/read-budget-baseline.json','utf8'));
    assert.deepEqual(fingerprint,old.fingerprint);
    assert.ok(feedback.reads < old.feedback.reads);
    assert.ok(summaries.reads < old.summaries.reads);
    assert.ok(warmHistory.reads < 10, JSON.stringify(warmHistory));
    assert.ok(scheduled.reads < old.scheduled.reads);
    await db.doc(`users/${ids[2]}`).update({role:"dbs"});
    for (const uid of ids.slice(0,3)) {
      const own = await endpoints.listEvents.run({auth:{uid},data:{summaries:true}});
      assert.equal(own.length,20);
      for (const event of own) {
        assert.deepEqual(event.missionSummary.progress.map(row=>row.uid),[uid]);
        assert.ok(!("configuration" in event.missionSummary));
        assert.ok(!("ballots" in event.missionSummary));
      }
      const detail = await endpoints.getEvent.run({auth:{uid},data:{eventId:own[0].id}});
      assert.deepEqual(own[0].missionSummary.progress, detail.progress.filter(row=>row.uid===uid));
      assert.equal(own[0].missionSummary.claimable,detail.claimable);
    }
  }
  mkdirSync("test-results",{recursive:true});
  const output={mode:baseline?"baseline":"optimized",players:10,games:4,votes:400,missions:20,feedback,summaries,warmHistory,scheduled,fingerprint};
  writeFileSync(`test-results/read-budget-${baseline?"baseline":"optimized"}.json`,JSON.stringify(output,null,2));
  console.log(JSON.stringify({mode:output.mode,feedback:feedback.reads,summary:summaries.reads,warmHistory:warmHistory.reads,scheduled:scheduled.reads,requests:{feedback:feedback.requests,summary:summaries.requests}}));
});
