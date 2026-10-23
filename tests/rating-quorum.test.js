import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { ratingQuorum, ratingQuorumCount, hasRatingWaiver } from "../js/rating-quorum.js";
import { calculateGameAggregate, FEEDBACK } from "../js/utils.js";
import { gameFeedbackProgress } from "../js/game-feedback-status.js";
import { qualifiedCardGame } from "../js/card-achievements.js";
import { markCardMvps } from "../functions/card-unlock-rules.js";
import { ratingObjectiveState } from "../js/event-model.js";
import { pathHistoricalSummary } from "../js/path-window.js";

mock.timers.enable({apis:["Date"],now:new Date("2026-10-22T12:00:00Z")});
const date = "2026-10-22T12:00:00Z";
const roster = ["a","b","c","d","e","f","g","h"];
const game = {status:"closed",closedAt:"2026-10-21T12:00:00Z",teamA:{starters:roster.slice(0,4)},teamB:{starters:roster.slice(4)},ratingWaivers:{g:[{at:date}]}};
const votes = roster.slice(0,6).map(raterId=>({raterId,targetId:"a",submitted:true,submittedAt:"2026-10-21T13:00:00Z",ratings:Object.fromEntries(FEEDBACK.map(([key])=>[key,5]))}));

test("six real evaluations and one missing waived vote qualify without changing any mean or real count",()=>{
  const before = calculateGameAggregate(votes);
  const counts = ratingQuorum(game,votes,"a",true,+new Date(date));
  assert.equal(counts.overall,7);
  assert.deepEqual(calculateGameAggregate(votes),before);
  const player = {...before,count:6,ratingCounts:{overall:6},ratingQuorumCounts:counts,date};
  assert.equal(qualifiedCardGame(player),true);
  assert.equal(markCardMvps({a:player}).a.mvp,true);
  assert.equal(player.count,6);
});

test("real submission replaces the missing quorum credit; drafts do not contribute a rating",()=>{
  assert.equal(ratingQuorum(game,[...votes,{...votes[0],raterId:"g"}],"a").overall,7);
  assert.equal(ratingQuorum(game,[...votes,{...votes[0],raterId:"g",submitted:false}],"a").overall,7);
  assert.equal(ratingQuorum(game,votes,"a",false).goalkeeping,0);
});

test("waiver intervals preserve the 48-hour cutoff and reversal history",()=>{
  const past = +new Date(date)-1;
  assert.equal(hasRatingWaiver(game,"g",past),false);
  assert.equal(ratingQuorum(game,votes,"a",true,past).attack,6);
  const reversed = {...game,ratingWaivers:{g:[{at:date,until:"2026-10-22T13:00:00Z"}]}};
  assert.equal(hasRatingWaiver(reversed,"g",+new Date(date)),true);
  assert.equal(hasRatingWaiver(reversed,"g",+new Date("2026-10-22T13:00:00Z")),false);
  assert.equal(pathHistoricalSummary(game,votes,[],past).players.a.ratingQuorumCounts.attack,6);
  assert.equal(pathHistoricalSummary(game,votes,[],+new Date(date)).players.a.ratingQuorumCounts.attack,7);
});

test("missing ratings stop reminders without being described as submitted; no ratings cannot earn a card",()=>{
  const progress = gameFeedbackProgress(game,votes).find(row=>row.uid === "g");
  assert.equal(progress.pending,0); assert.equal(progress.submitted,0); assert.equal(progress.waived,8);
  assert.equal(qualifiedCardGame({overall:null,count:0,date,ratingQuorumCounts:{overall:8}}),false);
  assert.equal(ratingQuorumCount({count:3},"overall"),3);
});

test("event and mission rating goals use the quorum but keep the real criterion average",()=>{
  const player = {...calculateGameAggregate(votes),evaluatedAt:date,ratingCounts:{attack:6},ratingQuorumCounts:ratingQuorum(game,votes,"a")};
  const matches = [{...game,ratingSummary:{a:player}}];
  const goal = {metric:"ratingGames",target:1,attributes:["attack"],threshold:4,combine:"all",comparison:"gte",minRatings:7};
  assert.equal(ratingObjectiveState("a",goal,matches,new Date(date)).progress,1);
  delete player.ratingQuorumCounts;
  assert.equal(ratingObjectiveState("a",goal,matches,new Date(date)).progress,0);
});
