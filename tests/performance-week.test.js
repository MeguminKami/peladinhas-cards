import test from "node:test";
import assert from "node:assert/strict";
import { performanceWeek } from "../js/performance-week.js";
import { componentWeeklyTopPlayers } from "../js/match-rating-summary.js";
import { DEFAULT_POLICY, setPolicyDocument } from "../js/system-policy.js";

test("performance rolls over at Wednesday's closing, without waiting for Thursday's opening",()=>{
  const before = performanceWeek(new Date("2026-10-21T16:59:59Z"));
  assert.equal(before.startsAt.toISOString(),"2026-10-14T11:00:00.000Z");
  assert.equal(before.endsAt.toISOString(),"2026-10-21T17:00:00.000Z");
  const after = performanceWeek(new Date("2026-10-21T17:00:00Z"));
  assert.equal(after.startsAt.toISOString(),"2026-10-21T17:00:00.000Z");
  assert.equal(after.endsAt.toISOString(),"2026-10-28T18:00:00.000Z");
  assert.deepEqual(performanceWeek(new Date("2026-10-22T12:00:00Z")),after);
});

test("games between closing and opening contribute to both ranking and component averages",()=>{
  const players = [{uid:"a",ovr:70,aggregates:[
    {date:"2026-10-21T16:59:59Z",count:3,overall:1,attack:1},
    {date:"2026-10-21T17:00:00Z",count:3,overall:4,attack:4},
    {date:"2026-10-21T20:00:00Z",count:3,overall:2,attack:4},
    {date:"2026-10-22T08:00:00Z",count:1,overall:5,attack:5},
    {date:"2026-10-28T18:00:00Z",count:3,overall:5,attack:5},
  ]}];
  for(const time of ["2026-10-21T21:00:00Z","2026-10-22T12:00:00Z"]) {
    const row = componentWeeklyTopPlayers(players,new Date(time))[0];
    assert.equal(row.weeklyPerformance,3.5);
    assert.equal(row.weeklyComponentAverages.count,2);
    assert.equal(row.aggregates,players[0].aggregates);
  }
});

test("custom weekdays and minutes determine consecutive closing-to-closing periods",t=>{
  const config=structuredClone(DEFAULT_POLICY);
  Object.assign(config.cycle,{openDay:1,openHour:19,openMinute:30,closeDay:5,closeHour:20,closeMinute:45});
  setPolicyDocument({timeline:[{version:1,effectiveAt:"2026-10-26T19:30:00Z",config}]});
  t.after(()=>setPolicyDocument(null));
  const period=performanceWeek(new Date("2026-10-31T12:00:00Z"));
  assert.equal(period.startsAt.toISOString(),"2026-10-30T20:45:00.000Z");
  assert.equal(period.endsAt.toISOString(),"2026-11-06T20:45:00.000Z");
});

test("year boundaries keep the next period without changing card opening",()=>{
  const period=performanceWeek(new Date("2026-12-30T19:00:00Z"));
  assert.equal(period.startsAt.toISOString(),"2026-12-30T18:00:00.000Z");
  assert.equal(period.endsAt.toISOString(),"2027-01-06T18:00:00.000Z");
});
