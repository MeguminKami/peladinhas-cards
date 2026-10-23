import test from "node:test";
import assert from "node:assert/strict";
import { MAINTENANCE_PAGES,pageGroups,POLICY_FIELD_INDEX,nextPolicyOpening } from "../js/maintenance-pages.js";
import { DEFAULT_POLICY,validatePolicy,setPolicyDocument } from "../js/system-policy.js";
import { cardWeek,cardWeekBounds,canReopenWeeklyCard } from "../js/card-week.js";
test("every editable setting belongs to exactly one application page",()=>{
  const fields=MAINTENANCE_PAGES.flatMap(page=>pageGroups(page).flatMap(group=>group.fields.map(field=>field.name)));
  assert.equal(fields.length,new Set(fields).size);
  assert.deepEqual([...fields].sort(),[...POLICY_FIELD_INDEX.keys()].sort());
});
test("weekdays and minutes validate; old drafts normalize and impossible simultaneous boundaries reject",()=>{
  const config=structuredClone(DEFAULT_POLICY);
  config.cycle.openDay=1;config.cycle.openHour=19;config.cycle.openMinute=30;
  config.cycle.closeDay=5;config.cycle.closeHour=20;config.cycle.closeMinute=45;
  assert.equal(validatePolicy(config).cycle.openMinute,30);
  for(const [key,value] of [["openDay",7],["closeMinute",60],["openDay",null]]) assert.throws(()=>validatePolicy({...config,cycle:{...config.cycle,[key]:value}}));
  const legacy=structuredClone(DEFAULT_POLICY); for(const key of ["openDay","closeDay","openMinute","closeMinute"]) delete legacy.cycle[key];
  assert.equal(validatePolicy(legacy).cycle.openDay,4);
  assert.throws(()=>validatePolicy({...config,cycle:{...config.cycle,closeDay:1,closeHour:19,closeMinute:30}}));
});
test("custom Monday/Friday calendar switches at the exact minute and preserves historical weeks",t=>{
  const config=structuredClone(DEFAULT_POLICY);
  Object.assign(config.cycle,{openDay:1,openHour:19,openMinute:30,closeDay:5,closeHour:20,closeMinute:45});
  setPolicyDocument({timeline:[{version:1,effectiveAt:"2026-10-26T19:30:00Z",config}]});
  t.after(()=>setPolicyDocument(null));
  assert.equal(cardWeek(new Date("2026-10-26T19:29:59Z")).weekId,"2026-W43");
  const cycle=cardWeek(new Date("2026-10-26T19:30:00Z"));
  assert.equal(cycle.weekId,"2026-W44");assert.equal(cycle.opensAt.toISOString(),"2026-10-26T19:30:00.000Z");
  assert.equal(cycle.closesAt.toISOString(),"2026-10-30T20:45:00.000Z");
  assert.equal(cardWeek(new Date("2026-10-30T20:45:00Z")).phase,"closed");
  assert.deepEqual(cardWeekBounds(cycle.weekId).opensAt,cycle.opensAt);
  assert.equal(cardWeekBounds("2026-W41").opensAt.toISOString(),"2026-10-08T11:00:00.000Z");
  assert.equal(canReopenWeeklyCard({locked:true,weekId:cycle.weekId,closesAt:new Date("2026-10-28T18:00Z")},cycle),false);
});
test("scheduled Friday opening does not also open the same ISO week on Thursday",t=>{
  const config=structuredClone(DEFAULT_POLICY);Object.assign(config.cycle,{openDay:5,openHour:18,openMinute:15,closeDay:3,closeHour:18});
  setPolicyDocument({timeline:[{version:1,effectiveAt:"2026-10-30T18:15:00Z",config}]});t.after(()=>setPolicyDocument(null));
  assert.equal(cardWeek(new Date("2026-10-29T20:00Z")).weekId,"2026-W43");
  assert.equal(cardWeek(new Date("2026-10-30T18:15Z")).weekId,"2026-W44");
  assert.equal(cardWeekBounds("2026-W44").closesAt.toISOString(),"2026-11-04T18:00:00.000Z");
});
test("next opening uses Lisbon clock and future minute, including summer offset",()=>{
  const cycle={...DEFAULT_POLICY.cycle,openDay:1,openHour:19,openMinute:30};
  const next=nextPolicyOpening(cycle,new Date("2026-07-06T18:30Z"));
  assert.equal(next.input,"2026-07-13T19:30");assert.equal(next.date.toISOString(),"2026-07-13T18:30:00.000Z");
});
test("a recurring Sunday opening in the missing spring hour moves forward",t=>{
  const config=structuredClone(DEFAULT_POLICY);Object.assign(config.cycle,{openDay:0,openHour:1,openMinute:30,closeDay:6,closeHour:18});
  setPolicyDocument({timeline:[{version:1,effectiveAt:"2026-03-15T01:30Z",config}]});t.after(()=>setPolicyDocument(null));
  const boundary=cardWeekBounds("2026-W13").opensAt;
  assert.equal(boundary.toISOString(),"2026-03-29T01:30:00.000Z");
  assert.equal(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Lisbon",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(boundary),"02:30");
  assert.equal(cardWeekBounds("2026-W43").opensAt.toISOString(),"2026-10-25T01:30:00.000Z","autumn uses the later 01:30 occurrence");
});
