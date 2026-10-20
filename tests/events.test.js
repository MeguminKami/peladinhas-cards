import { ATTRIBUTES } from "../js/utils.js";
import { challengeRules, goalCriteria } from "../js/event-objective-view.js";
import { rewardBreakdown } from "../js/reward-presentation.js";
import { missionObjectivePreview } from "../js/mission-objective-preview.js";
import {
  EVENT_RARITIES,
  eventRarityId,
  rarityBadge,
  compareEventRarity,
} from "../js/event-rarity.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  eventEndMillis,
  positionLabel,
  sharedRankingPositions,
  missionUnlockedAt,
  objectiveSummary,
  validRatingObjective,
  objectiveReachedAt,
  objectiveProgress,
  periodWindow,
  eventRanking,
  validEventReward,
  rewardExpiry,
  rewardText,
  hasTemporaryReward,
  votingFlags,
} from "../js/event-model.js";
import { applyEventRewards } from "../js/event-rules.js";
import { eventIcon } from "../js/icons.js";
import { TOTAL_OBJECTIVES, objectiveTargetLimit } from "../js/event-totals.js";
import { goalOptions, goalSelection, storedGoalMetric } from "../js/event-goal-options.js";
import { OBJECTIVES } from "../js/event-model.js";
import { objectiveGoals } from "../js/event-goals.js";
const date = new Date("2026-10-20T12:00:00Z");
const event = {
  startsAt: "2026-10-01",
  endsAt: "2026-11-01",
  participantIds: ["a", "b", "c"],
  cadence: "once",
  method: "vote",
  votesPerUser: 2,
  minVotes: 1,
  tieBreak: "uid",
  objective: { metric: "games", target: 2 },
};
const game = (i, outcome, goals = 0, assists = 0) => ({
  id: String(i),
  status: "closed",
  closedAt: new Date(Date.UTC(2026, 9, i)),
  teamA: { starters: ["a"], bench: ["b"] },
  teamB: { starters: ["c"], bench: [] },
  score: {
    teamA: outcome < 0 ? 1 : outcome > 0 ? 2 : 1,
    teamB: outcome < 0 ? 2 : 1,
  },
  performance: {
    teamA: { goals: Array(goals).fill("a"), assists: Array(assists).fill("a") },
  },
});

const starObjective = (metric, extra = {}) => ({ metric, target: 3,
  attributes: ["overall", "passing"], threshold: 4, comparison: "gte",
  combine: "all", minRatings: 3, ...extra });
const ratedGame = (i, overall, passing = overall, outcome = 1) => ({
  ...game(i, outcome), ratingSummary: { a: { overall, passing,
    evaluatedAt: new Date(Date.UTC(2026, 9, i, 12)).toISOString(),
    ratingCounts: { overall: 3, passing: 3 } } },
});

test("historical totals: every supported counter uses real matches, contributions and recorded positions", () => {
  const scores=[[2,0],[1,1],[0,3],[4,2],[0,0],[1,0]];
  const positions=["GR","DEF","ALA","MED","AV",null];
  const matches=scores.map(([teamA,teamB],i)=>({...game(i+1,1,[2,0,0,1,0,0][i],[1,1,0,0,0,0][i]),score:{teamA,teamB},positions:positions[i]?{a:positions[i]}:{}}));
  for(const [index,value,count] of [[0,4,3],[1,4.5,3],[2,2,3],[4,4,3],[5,4,2]]) matches[index].ratingSummary={a:{overall:value,passing:value,ratingCounts:{overall:count,passing:count},evaluatedAt:matches[index].closedAt}};
  const expected={totalGames:6,totalWins:3,totalDraws:2,totalLosses:1,totalGoals:3,totalAssists:2,totalContributions:5,
    totalCleanSheets:3,totalUnbeatenGames:5,totalTeamGoals:8,totalGoalsConceded:6,totalScoringGames:2,totalAssistingGames:2,totalContributingGames:3,
    totalGoalkeeperGames:1,totalGoalkeeperWins:1,totalGoalkeeperCleanSheets:1,totalDefenderGames:1,totalWingerGames:1,totalMidfielderGames:1,totalStrikerGames:1,
    totalRatingGames:3,totalRatingWins:1};
  const all=[...matches,{...game(7,1,9),status:"open"},{...game(8,1,9),deleting:true},game(25,1,9)];
  for(const metric of Object.keys(TOTAL_OBJECTIVES)) {
    const objective={...starObjective(metric),target:1};
    const config={...event,startsAt:"2026-10-15",objective};
    assert.equal(objectiveProgress("a",config,all,date),expected[metric],metric);
    assert.equal(objectiveProgress("outsider",config,all,date),0,metric);
    assert.equal(objectiveProgress("a",config,all,new Date("2026-10-14")),0,metric);
    assert.match(objectiveSummary(config),/histórico/i,metric);
    assert.ok(!objectiveSummary(config).includes("undefined"),metric);
    assert.ok(eventIcon(config));
    const period={...config,objective:{...objective,countFrom:"challenge"}};
    assert.equal(objectiveProgress("a",period,all,date),0,`${metric}: excludes earlier matches`);
    assert.equal(objectiveProgress("a",{...period,startsAt:event.startsAt},matches,date),expected[metric],`${metric}: counts period data`);
    assert.ok(!objectiveSummary(period).includes("undefined"),metric);
  }
  assert.equal(objectiveProgress("a",{...event,startsAt:"2026-10-15",objective:{metric:"games",target:1}},all,date),0);
  assert.equal(objectiveTargetLimit({metric:"totalGoals"}),1000000);
  assert.equal(objectiveTargetLimit({metric:"goals"}),1000);
});

test("goal selectors preserve every metric without duplicate historical entries", () => {
  const choices=goalOptions(OBJECTIVES);
  assert.equal(choices.length,28);
  for(const metric of Object.keys(OBJECTIVES).filter(key=>!["all","combined"].includes(key))) {
    const selection=goalSelection({metric},choices);
    assert.equal(storedGoalMetric(selection.metric,selection.countFrom,choices).metric,metric);
  }
  assert.deepEqual(storedGoalMetric("totalGoalkeeperGames","challenge",choices),{metric:"totalGoalkeeperGames",countFrom:"challenge"});
  assert.equal(validRatingObjective({metric:"games",countFrom:"invalid"}),false);
});

test("historical objectives never backdate competition completion before opening or unlocking", () => {
  const config={...event,kind:"event",method:"objective",startsAt:"2026-10-15",objective:{metric:"totalGames",target:2}};
  const matches=[game(1,1),game(2,1),game(16,1)];
  assert.equal(objectiveReachedAt("a",config,matches,date),"2026-10-15T00:00:00.000Z");
  const mission={...config,kind:"mission",prerequisites:{mode:"all",missionIds:["first"]}};
  assert.equal(eventRanking(mission,[],matches,[],date)[0].progress,0);
  const completions=[{eventId:"first",uid:"a",periodKey:"once",completedAt:"2026-10-17"}];
  assert.equal(objectiveReachedAt("a",mission,matches,date,completions),"2026-10-17T00:00:00.000Z");
  const combined={...config,objective:{metric:"combined",target:100,results:{metric:"totalGames",target:2},ratings:starObjective("ratingGames",{target:1})}};
  assert.equal(objectiveProgress("a",combined,[ratedGame(1,4)],date),0);
  assert.equal(objectiveProgress("a",combined,[...matches,ratedGame(18,4)],date),100);
  assert.equal(objectiveReachedAt("a",combined,[...matches,ratedGame(18,4)],date),"2026-10-18T12:00:00.000Z");
});

test("historical stars respect validation time and the final event cutoff", () => {
  const objective=starObjective("totalRatingWins",{target:1});
  const config={...event,startsAt:"2026-10-15",endsAt:"2026-10-19",objective};
  const match=ratedGame(1,4);match.ratingSummary.a.evaluatedAt="2026-10-20";
  assert.equal(objectiveProgress("a",config,[match],date),0);
  match.ratingSummary.a.evaluatedAt="2026-10-18";
  assert.equal(objectiveProgress("a",config,[match],date),1);
  assert.equal(objectiveReachedAt("a",config,[match],date),"2026-10-18T00:00:00.000Z");
});

const combinedObjective = () => ({metric:"combined", target:100,
  results:{metric:"goals",target:3}, ratings:starObjective("ratingGames",{target:2}),
});
test("goal lists preserve each real counter through edits, additions and reordering", () => {
  const goals=[{id:"scoring",metric:"goals",target:5},{id:"winning",metric:"wins",target:2},{id:"stars",...starObjective("ratingGames",{target:1})}];
  const matches=[game(1,1,3),game(2,-1,1),ratedGame(3,4.5)];
  const config={...event,kind:"mission",method:"objective",objective:{metric:"all",target:100,goals}};
  const state=objectiveProgress("a",config,matches,date,false,true);
  assert.equal(state.progress,80);
  assert.equal(state.goals.find(goal=>goal.id==="scoring").progress,4);
  const changed={...config,objective:{...config.objective,goals:[...goals].reverse().map(goal=>goal.id==="scoring"?{...goal,target:8}:goal)}};
  const next=objectiveProgress("a",changed,matches,date,false,true);
  assert.equal(next.progress,50);
  assert.equal(next.goals.find(goal=>goal.id==="scoring").progress,4);
  assert.equal(next.goals.find(goal=>goal.id==="winning").progress,2);
  const legacy=objectiveGoals({metric:"goals",target:5});
  assert.equal(legacy[0].id,"legacy-primary");
  assert.equal(objectiveProgress("a",{...config,objective:{metric:"all",target:100,goals:legacy}},matches,date,false,true).goals[0].progress,4);
});
test("goal lists validate IDs, arbitrary leaf types, limits and no nested combinations", () => {
  const base={metric:"all",target:100,goals:[{id:"a",metric:"goals",target:3},{id:"b",metric:"goals",target:8}]};
  assert.equal(validRatingObjective(base),true);
  for(const goals of [[],[{...base.goals[0],target:0}], [...base.goals,{...base.goals[0]}],
    [{id:"x",...base}], [{id:"x",...combinedObjective()}], Array.from({length:13},(_,i)=>({id:`g${i}`,metric:"games",target:1}))]) {
    assert.equal(validRatingObjective({...base,goals}),false);
  }
  assert.equal(validRatingObjective({...base,goals:[{id:"a",metric:"totalGames",target:1000000}]}),true);
  assert.equal(validRatingObjective({...base,goals:[{id:"a",...starObjective("ratingGames")} ]},"group"),false);
});
test("combined objectives require both independent goals within the same period", () => {
  const config={...event,kind:"mission",method:"objective",scope:"individual",objective:combinedObjective()};
  const results=game(1,1,3), star1=ratedGame(2,4), star2=ratedGame(3,4);
  assert.equal(objectiveProgress("a",config,[results],date),0);
  assert.equal(objectiveProgress("a",config,[star1,star2],date),0);
  assert.equal(objectiveProgress("a",config,[results,star1],date),50);
  assert.equal(objectiveProgress("a",config,[results,star1,star2],date),100);
  assert.equal(objectiveProgress("a",config,[results,star1,star2],new Date("2026-10-03T06:00Z")),50);
  assert.equal(objectiveReachedAt("a",config,[results,star1,star2],date),"2026-10-03T12:00:00.000Z");
  const state=objectiveProgress("a",config,[results,star1],date,false,true);
  assert.equal(state.results.progress,3);
  assert.equal(state.ratings.progress,1);
  assert.equal(objectiveProgress("outsider",config,[results,star1,star2],date),0);
  assert.equal(objectiveProgress("a",{...config,progressStartsAt:"2026-10-02"},[results,star1,star2],date),0);
});
test("combined validation prevents nested objectives, impossible targets and shared scopes", () => {
  const valid=combinedObjective();
  assert.equal(validRatingObjective(valid),true);
  for(const change of [{target:1},{results:valid},{results:{metric:"ratingGames",target:3}},
    {results:{metric:"goals",target:0}},{ratings:{...valid.ratings,target:1001}},
    {ratings:{...valid.ratings,attributes:[]}},{ratings:{metric:"wins",target:1}}]) {
    assert.equal(validRatingObjective({...valid,...change}),false);
  }
  assert.equal(validRatingObjective(valid,"team"),false);
  assert.equal(validRatingObjective(valid,"group"),false);
  assert.match(objectiveSummary({objective:valid}),/ambas as metas/);
});
test("combined rolling averages stop eligibility when the current window fails", () => {
  const objective=combinedObjective();objective.results={metric:"games",target:1};
  objective.ratings=starObjective("ratingAverage",{target:2});
  const config={...event,kind:"event",method:"objective",scope:"individual",objective};
  const games=[ratedGame(1,4),ratedGame(2,4)];
  assert.equal(objectiveProgress("a",config,games,date),100);
  assert.equal(objectiveProgress("a",config,[...games,ratedGame(3,1)],date),0);
  assert.equal(objectiveReachedAt("a",config,[...games,ratedGame(3,1)],date),null);
});
test("stars: count, winning games and streaks use each selected dimension", () => {
  const games = [ratedGame(1,4), ratedGame(2,5,3), ratedGame(3,4.5,4.5,-1), ratedGame(4,4), ratedGame(5,4)];
  const progress = (metric, extra) => objectiveProgress("a", { ...event,
    objective: starObjective(metric, extra) }, games, date);
  assert.equal(progress("ratingGames"),4);
  assert.equal(progress("ratingWins"),3);
  assert.equal(progress("ratingStreak"),3);
  assert.equal(progress("ratingGames",{comparison:"gt"}),1);
  assert.equal(progress("ratingGames",{combine:"mean"}),5);
  assert.equal(progress("ratingGames",{minRatings:4}),0);
  assert.equal(new Set(["ratingGames","ratingAverage","ratingStreak","ratingWins"].map(metric=>eventIcon({objective:{metric}}))).size,4);
});
test("stars: rolling average includes the latest played games and never skips missing ratings", () => {
  const config = { ...event, objective: starObjective("ratingAverage") };
  const games = [ratedGame(1,5),ratedGame(2,4),ratedGame(3,4)];
  assert.equal(objectiveProgress("a",config,games,date),3);
  assert.equal(objectiveProgress("a",config,[...games,{...game(4,1)}],date),0);
  assert.equal(objectiveProgress("a",config,[...games,ratedGame(4,1)],date),0);
  assert.equal(objectiveProgress("a",config,games.slice(0,2),date),0);
  const partial = ratedGame(4,5); delete partial.ratingSummary.a.passing;
  assert.equal(objectiveProgress("a",config,[...games,partial],date),0);
  const atBoundary = [ratedGame(1,4),ratedGame(2,4),ratedGame(3,4)];
  assert.equal(objectiveProgress("a",{...config,objective:starObjective("ratingAverage",{comparison:"gt"})},atBoundary,date),0);
  const row = eventRanking({...config,method:"objective"},[],games,[],date)[0];
  assert.equal(row.ratingState.ratedGames,3);
  assert.equal(row.ratingState.averages.overall,13/3);
});
test("stars: late ratings, reopened games, period boundaries and prerequisites are respected", () => {
  const config = { ...event, method:"objective", objective:starObjective("ratingGames",{target:1}) };
  const match = ratedGame(3,5);
  match.ratingSummary.a.evaluatedAt = "2026-10-10T12:00:00Z";
  assert.equal(objectiveProgress("a",config,[match],new Date("2026-10-05")),0);
  assert.equal(objectiveReachedAt("a",config,[match],date),"2026-10-10T12:00:00.000Z");
  assert.equal(objectiveProgress("a",config,[{...match,status:"open"}],date),0);
  assert.equal(objectiveProgress("a",config,[{...match,deleting:true}],date),0);
  match.ratingSummary.a.evaluatedAt = "2026-11-02T00:00:00Z";
  assert.equal(objectiveProgress("a",config,[match],new Date("2026-11-03")),0);
  const gated = {...config,kind:"mission",prerequisites:{mode:"all",missionIds:["intro"]}};
  const credits = [{uid:"a",eventId:"intro",periodKey:"once",completedAt:"2026-10-04"}];
  assert.equal(eventRanking(gated,[],[ratedGame(3,5)],[],date,credits).find(r=>r.uid==="a").progress,0);
  assert.equal(eventRanking(gated,[],[ratedGame(5,5)],[],date,credits).find(r=>r.uid==="a").progress,1);
});

test("goalkeeper opt-out overrides stale stars and counts in mission objectives",()=>{
  const match=ratedGame(3,5);
  Object.assign(match.ratingSummary.a,{goalkeeping:5,goalkeepingEligible:false});
  match.ratingSummary.a.ratingCounts.goalkeeping=10;
  for(const metric of ["ratingGames","ratingWins","ratingStreak","ratingAverage","totalRatingGames","totalRatingWins"]){
    const config={...event,method:"objective",objective:starObjective(metric,{target:1,attributes:["goalkeeping"]})};
    assert.equal(objectiveProgress("a",config,[match],date),0,metric);
    config.objective.attributes=["overall"];
    assert.equal(objectiveProgress("a",config,[match],date),1,metric);
  }
});
test("stars: validation rejects unknown dimensions, duplicates, impossible thresholds and shared scopes", () => {
  const valid = starObjective("ratingGames");
  assert.ok(validRatingObjective(valid));
  for (const change of [{attributes:[]},{attributes:["pace"]},{attributes:["overall","overall"]},{threshold:NaN},{threshold:6},{threshold:-1},{threshold:5,comparison:"gt"},{minRatings:0},{minRatings:1.5},{comparison:"bad"},{combine:"bad"}])
    assert.equal(validRatingObjective({...valid,...change}),false,JSON.stringify(change));
  assert.equal(validRatingObjective(valid,"group"),false);
  assert.equal(validRatingObjective(valid,"team"),false);
  assert.match(objectiveSummary({objective:valid}),/Desempenho geral/);
});
test("objetivos: jogos, golos, assistências, vitórias e sequências verificadas", () => {
  const games = [
    game(1, 1, 2, 1),
    game(2, 0, 1, 2),
    game(3, 1, 3, 1),
    game(4, -1),
    game(5, 1),
    { ...game(6, 1, 99), status: "open" },
  ];
  for (const [metric, expected] of [
    ["games", 5],
    ["goals", 6],
    ["assists", 4],
    ["wins", 3],
    ["unbeatenWins", 2],
    ["winStreak", 1],
  ])
    assert.equal(
      objectiveProgress(
        "a",
        { ...event, objective: { metric, target: 1 } },
        games,
        date,
      ),
      expected,
    );
  assert.equal(objectiveProgress("outsider", event, games, date), 0);
  assert.equal(objectiveProgress("b", event, games, date), 5);
});
test("períodos renovam objetivos; jogos fora do período ou futuros não contam", () => {
  const mission = {
    ...event,
    cadence: "daily",
    startsAt: "2026-10-01T12:00:00Z",
  };
  assert.equal(periodWindow(mission, date).key, "period-19");
  assert.equal(
    objectiveProgress("a", mission, [game(1, 1), game(21, 1)], date),
    0,
  );
});
test("votos únicos, elegibilidade, desempates e contagem pública sem identidades", () => {
  const votes = [
    { id: "a", selections: ["b", "b", "c"], submittedAt: date },
    { id: "b", selections: ["a", "c"], submittedAt: date },
    { id: "outsider", selections: ["b"], submittedAt: date },
  ];
  const ranking = eventRanking(event, votes, [], [], date);
  assert.deepEqual(
    ranking.map((r) => [r.uid, r.votes]),
    [
      ["c", 2],
      ["a", 1],
      ["b", 1],
    ],
  );
  assert.equal(votingFlags(votes).length, 1);
  assert.ok(ranking.every((row) => !Object.hasOwn(row, "voterId")));
});
test("limites de recompensas, modalidades sem prestígio ou cosméticos", () => {
  const reward = {
    mode: "both",
    statDuration: "weekly",
    boosts: { shooting: 10, passing: 10 },
    specialId: "mvp",
  };
  assert.ok(validEventReward(reward));
  assert.ok(!validEventReward({ ...reward, boosts: { shooting: 11 } }));
  assert.ok(validEventReward({ ...reward, statDuration: "permanent" }));
  assert.ok(
    !validEventReward({
      mode: "recognition",
      statDuration: "weekly",
      boosts: {},
      badge: "Participante",
    }),
  );
  assert.ok(!validEventReward({ ...reward, mode: "card" }));
});
test("temporários expiram, permanentes persistem, anulações removem efeitos", () => {
  const base = { shooting: 60 };
  const ledger = [
    {
      uid: "a",
      schemaVersion: 2,
      startsAt: "2026-10-01",
      expiresAt: "2026-10-08",
      reward: {
        boosts: { shooting: 2 },
        statDuration: "permanent",
        badge: "Medalha",
        specialId: "mvp",
      },
    },
    {
      uid: "a",
      schemaVersion: 2,
      startsAt: "2026-10-01",
      expiresAt: "2026-10-22",
      reward: { boosts: { shooting: 8 }, statDuration: "weekly", points: 3 },
    },
    {
      uid: "a",
      schemaVersion: 2,
      startsAt: "2026-10-01",
      expiresAt: "2026-10-22",
      revokedAt: "2026-10-15",
      reward: { boosts: { shooting: 9 }, points: 99 },
    },
  ];
  const current = applyEventRewards(base, ledger, "a", date);
  assert.equal(current.stats.shooting, 70);
  assert.equal(current.specials.length, 0);
  assert.equal(
    applyEventRewards(base, ledger, "a", new Date("2026-11-01")).stats.shooting,
    62,
  );
});

test("missão terminada preserva a janela final, sem saltar para períodos futuros", () => {
  const mission = {
    ...event,
    cadence: "weekly",
    startsAt: "2026-10-01T00:00:00Z",
    endsAt: "2026-10-08T00:00:00Z",
  };
  assert.equal(periodWindow(mission, new Date("2026-11-20")).key, "period-0");
  assert.equal(
    objectiveProgress("a", mission, [game(3, 1)], new Date("2026-11-20")),
    1,
  );
});

test("indefinite missions keep counting and prerequisites use completion dates", () => {
  const mission = {
    ...event,
    kind: "mission",
    method: "objective",
    indefinite: true,
    endsAt: null,
    prerequisites: { mode: "all", missionIds: ["first", "second"] },
  };
  const completions = [
    {
      uid: "a",
      eventId: "first",
      periodKey: "once",
      completedAt: "2026-10-02",
      expiresAt: "2026-10-03",
    },
    {
      uid: "a",
      eventId: "second",
      periodKey: "once",
      completedAt: "2026-10-04",
    },
  ];
  assert.equal(eventEndMillis(mission), Infinity);
  assert.equal(periodWindow(mission, date).end, null);
  assert.equal(missionUnlockedAt(mission, "b", completions), null);
  assert.equal(
    +missionUnlockedAt(mission, "a", completions),
    +new Date("2026-10-04"),
  );
  assert.equal(
    +missionUnlockedAt(
      { ...mission, prerequisites: { ...mission.prerequisites, mode: "any" } },
      "a",
      completions,
    ),
    +new Date("2026-10-02"),
  );
  assert.equal(
    missionUnlockedAt(mission, "a", [
      ...completions.slice(0, 1),
      { ...completions[1], revokedAt: "2026-10-05" },
    ]),
    null,
  );
  const ranking = eventRanking(
    mission,
    [],
    [game(1, 1), game(5, 1)],
    [],
    date,
    completions,
  );
  assert.equal(ranking.find((row) => row.uid === "a").progress, 1);
  assert.equal(
    objectiveProgress("a", mission, [game(25, 1)], new Date("2027-01-01")),
    1,
  );
});

test("permanent rewards accumulate up to ten per attribute", () => {
  const ledger = Array.from({ length: 6 }, (_, index) => ({
    id: `permanent-${index}`,
    uid: "a",
    schemaVersion: 2,
    startsAt: "2026-10-01",
    expiresAt: "2026-10-08",
    reward: { statDuration: "permanent", boosts: { shooting: 2, passing: 1 } },
  }));
  const stats = applyEventRewards(
    { shooting: 60, passing: 60 },
    ledger,
    "a",
    date,
  ).stats;
  assert.equal(stats.shooting, 70);
  assert.equal(stats.passing, 66);
});

test("mission objectives describe real goals with natural singular and plural", () => {
  const describe = (metric, target, scope = "individual") =>
    objectiveSummary({ objective: { metric, target }, scope });
  assert.equal(describe("goals", 5), "Marca 5 golos.");
  assert.equal(describe("goals", 1), "Marca 1 golo.");
  assert.equal(describe("assists", 1), "Faz 1 assistência.");
  assert.equal(describe("games", 2), "Participa em 2 jogos.");
  assert.equal(describe("wins", 3), "Ganha 3 jogos.");
  assert.equal(describe("winStreak", 3), "Ganha 3 jogos seguidos.");
  assert.equal(
    describe("unbeatenWins", 2),
    "Consegue 2 vitórias numa sequência sem derrotas.",
  );
  assert.equal(
    describe("goals", 5, "collective"),
    "Objetivo da equipa: marcar 5 golos.",
  );
});

test("permanent rewards have only a per-attribute limit", () => {
  const reward = {
    mode: "stats",
    statDuration: "permanent",
    boosts: { shooting: 10, passing: 10, dribbling: 10 },
  };
  assert.ok(validEventReward(reward));
  assert.ok(!validEventReward({ ...reward, boosts: { shooting: 11 } }));
  assert.ok(!validEventReward({ ...reward, points: 5 }));
  assert.ok(!validEventReward({ ...reward, badge: "Test" }));
});

test("competition ranks first completion ahead of later higher totals", () => {
  const race = {
    ...event,
    kind: "event",
    method: "objective",
    objective: { metric: "goals", target: 2 },
  };
  const early = game(2, 1, 2),
    later = game(3, 1);
  later.performance.teamA.goals = ["b", "b", "b"];
  const ranking = eventRanking(race, [], [later, early], [], date);
  assert.equal(ranking[0].uid, "a");
  assert.equal(ranking[1].uid, "b");
  assert.equal(ranking[1].progress, 3);
  assert.equal(
    objectiveReachedAt("a", race, [later, early], date),
    "2026-10-02T00:00:00.000Z",
  );
  assert.equal(objectiveReachedAt("c", race, [later, early], date), null);
});

test("new objectives count contributions, unbeaten games and clean sheets", () => {
  const games = [
    game(1, 1, 2, 1),
    game(2, 0, 1, 2),
    game(3, 1, 3, 1),
    game(4, -1),
  ];
  games[0].score.teamB = 0;
  for (const [metric, expected] of [
    ["goalsAndAssists", 10],
    ["unbeatenGames", 3],
    ["cleanSheets", 1],
  ])
    assert.equal(
      objectiveProgress(
        "a",
        { ...event, objective: { metric, target: 1 } },
        games,
        date,
      ),
      expected,
    );
});

test("missões coletivas contam os totais de cada equipa uma vez", () => {
  const match = game(5, 1, 1, 1);
  match.teamA.starters.push("outside");
  match.score.teamA = 4;
  match.performance.teamA.assists.push("outside", "outside");
  for (const [metric, expected] of [
    ["goals", 4],
    ["assists", 3],
    ["goalsAndAssists", 7],
    ["wins", 1],
  ]) {
    const mission = {
      ...event,
      kind: "mission",
      method: "objective",
      scope: "collective",
      participantIds: ["a", "b"],
      objective: { metric, target: 10 },
    };
    assert.deepEqual(
      eventRanking(mission, [], [match], [], date).map((row) => row.progress),
      [expected, expected],
    );
    assert.equal(
      eventRanking(
        { ...mission, participantIds: ["b"] },
        [],
        [match],
        [],
        date,
      )[0].progress,
      expected,
    );
  }
  const bothSides = {
    ...event,
    kind: "mission",
    method: "objective",
    scope: "collective",
    objective: { metric: "wins", target: 10 },
  };
  assert.ok(
    eventRanking(bothSides, [], [match], [], date).every(
      (row) => row.progress === (row.uid === "c" ? 0 : 1),
    ),
  );
});

test("recompensas semanais, mensais e permanentes: validade, cartas e anulação", () => {
  const start = new Date("2026-01-31T12:00:00Z");
  assert.equal(
    rewardExpiry(start, "weekly").toISOString(),
    "2026-02-07T12:00:00.000Z",
  );
  assert.equal(
    rewardExpiry(start, "monthly").toISOString(),
    "2026-02-28T12:00:00.000Z",
  );
  assert.equal(
    rewardExpiry(new Date("2028-01-31T12:00Z"), "monthly").toISOString(),
    "2028-02-29T12:00:00.000Z",
  );
  assert.equal(start.toISOString(), "2026-01-31T12:00:00.000Z");
  for (const duration of ["weekly", "monthly", "permanent"]) {
    const reward = {
      mode: "both",
      statDuration: duration,
      cardDuration: duration,
      boosts: { shooting: 3 },
      specialId: "saved:duration-test",
    };
    assert.ok(validEventReward(reward, [{ id: "duration-test" }]));
    assert.equal(hasTemporaryReward(reward), duration !== "permanent");
    assert.match(
      rewardText(reward),
      new RegExp(
        duration === "monthly"
          ? "mensal"
          : duration === "permanent"
            ? "permanente"
            : "semanal",
      ),
    );
    const expiry = rewardExpiry(start, duration);
    const row = {
      uid: "a",
      schemaVersion: 2,
      startsAt: start,
      createdAt: start,
      expiresAt: expiry,
      reward,
    };
    const before = applyEventRewards(
      { shooting: 60 },
      [row],
      "a",
      new Date(+expiry - 1),
    );
    assert.equal(before.stats.shooting, 63);
    assert.equal(before.specials.length, 1);
    const after = applyEventRewards({ shooting: 60 }, [row], "a", expiry);
    assert.equal(after.stats.shooting, duration === "permanent" ? 63 : 60);
    assert.equal(after.specials.length, duration === "permanent" ? 1 : 0);
    const revoked = applyEventRewards(
      { shooting: 60 },
      [{ ...row, revokedAt: start }],
      "a",
      expiry,
    );
    assert.equal(revoked.stats.shooting, 60);
    assert.equal(revoked.specials.length, 0);
  }
});

test("âmbitos individual, grupo e equipa acumulam jogos sem somar adversários", () => {
  const matches = [game(5, 1, 1, 1), game(6, -1, 2, 0)];
  matches[0].score = { teamA: 5, teamB: 7 };
  matches[1].score = { teamA: 3, teamB: 2 };
  for (const scope of ["team", "collective"]) {
    for (const kind of ["mission", "event"]) {
      const config = {
        ...event,
        kind,
        scope,
        method: "objective",
        participantIds: ["a", "b", "c", "absent"],
        objective: { metric: "goals", target: 8 },
      };
      const rows = eventRanking(config, [], matches, [], date);
      const progress = Object.fromEntries(
        rows.map((row) => [row.uid, row.progress]),
      );
      assert.deepEqual(progress, { c: 9, a: 8, b: 8, absent: 0 });
      if (kind === "event")
        assert.equal(
          rows.find((row) => row.uid === "a").reachedAt,
          new Date(matches[1].closedAt).toISOString(),
        );
    }
  }
  const config = {
    ...event,
    kind: "mission",
    method: "objective",
    participantIds: ["a", "b"],
    objective: { metric: "goals", target: 8 },
  };
  assert.ok(
    eventRanking({ ...config, scope: "group" }, [], matches, [], date).every(
      (row) => row.progress === 3,
    ),
  );
  assert.equal(
    eventRanking(
      { ...config, scope: "individual" },
      [],
      matches,
      [],
      date,
    ).find((row) => row.uid === "b").progress,
    0,
  );
});

test("objetivos usam a data de encerramento, mesmo quando o jogo foi realizado antes", () => {
  const start = "2026-10-15T12:04:00Z";
  const old = {
    ...game(14, 1, 5),
    scheduledAt: "2026-10-14T20:00Z",
    closedAt: "2026-10-15T13:00Z",
  };
  const next = {
    ...game(16, 1, 1),
    scheduledAt: "2026-10-16T20:00Z",
    closedAt: "2026-10-16T22:00Z",
    score: { teamA: 7, teamB: 2 },
  };
  const config = {
    ...event,
    startsAt: start,
    kind: "mission",
    scope: "team",
    method: "objective",
    objective: { metric: "goals", target: 30 },
  };
  assert.equal(objectiveProgress("a", config, [old], date), 2);
  assert.equal(objectiveProgress("a", config, [old, next], date), 9);
  assert.equal(
    objectiveProgress("a", config, [next], new Date("2026-10-16T21:00Z")),
    0,
  );
});

test("live leaderboard shares positions for equal progress without duplicated ordinals", () => {
  const rows = [3, 2, 2, 2, 1, 1, 1, 0, 0].map((progress, i) => ({
    uid: String(i),
    progress,
    position: i + 1,
  }));
  assert.deepEqual(
    sharedRankingPositions({ method: "objective", status: "open" }, rows).map(
      (r) => r.position,
    ),
    [1, 2, 2, 2, 5, 5, 5, 8, 8],
  );
  assert.equal(positionLabel(4), "4.\u00ba");
  assert.deepEqual(
    sharedRankingPositions({ method: "admin", status: "open" }, rows),
    rows,
  );
  assert.deepEqual(
    sharedRankingPositions({ method: "objective", status: "closed" }, rows),
    rows,
  );
  const reached = [
    { progress: 10, position: 1, reachedAt: "2026-10-15T12:00Z" },
    { progress: 10, position: 2, reachedAt: "2026-10-15T13:00Z" },
  ];
  assert.deepEqual(
    sharedRankingPositions({ method: "objective", status: "review" }, reached),
    reached,
  );
});

test("event rarities have seven ordered cosmetic tiers and a safe legacy default", () => {
  assert.deepEqual(
    Object.values(EVENT_RARITIES).map((r) => r.level),
    [1, 2, 3, 4, 5, 6, 7],
  );
  assert.equal(eventRarityId({}), "bronze");
  assert.equal(eventRarityId({ rarity: "<invalid>" }), "bronze");
  for (const id of Object.keys(EVENT_RARITIES)) {
    assert.equal(eventRarityId({ rarity: id }), id);
    assert.ok(rarityBadge({ rarity: id }).includes(`data-rarity="${id}"`));
  }
});

test("player challenges sort by descending rarity and preserve ties", () => {
  const rows = [
    { id: 1, rarity: "bronze" },
    { id: 2, rarity: "ultimate" },
    { id: 3, rarity: "elite" },
    { id: 4, rarity: "ultimate" },
    { id: 5 },
  ];
  assert.deepEqual(
    [...rows].sort(compareEventRarity).map((r) => r.id),
    [2, 4, 3, 1, 5],
  );
});

test("objective copy uses direct Portuguese, recorded positions and correct singular/plural", () => {
  const describe = (metric,target=1,countFrom="challenge") => missionObjectivePreview({objective:{metric,target,countFrom}}).text;
  for (const [metric,role] of [["totalDefenderGames","defesa (DEF)"],["totalMidfielderGames","médio (MED)"],["totalStrikerGames","avançado (AV)"],["totalWingerGames","ala (ALA)"],["totalGoalkeeperGames","guarda-redes (GR)"]]) {
    assert.equal(describe(metric),`Joga um jogo como ${role}.`);
    assert.equal(describe(metric,3),`Joga 3 jogos como ${role}.`);
    assert.match(describe(metric,3,"history"),/^Total de 3 jogos como/);
  }
  assert.equal(describe("totalGoals"),"Marca um golo.");
  assert.equal(describe("totalAssists"),"Faz uma assistência.");
  assert.equal(describe("totalWins"),"Ganha um jogo.");
  assert.equal(describe("totalContributions",5),"Soma um total de 5 golos ou assistências.");
  assert.equal(describe("totalAssistingGames",3),"Faz assistências em 3 jogos.");
  assert.equal(describe("unbeatenWins"),"Ganha um jogo.");
  assert.equal(describe("winStreak",3),"Ganha 3 jogos seguidos.");
  assert.equal(describe("totalGoalkeeperCleanSheets"),"Termina um jogo como guarda-redes (GR) sem sofrer golos.");
});

test("mission previews preserve action, strict thresholds, individual criteria and recent windows", () => {
  const describe = (changes={}) => missionObjectivePreview({objective:{metric:"ratingGames",target:2,threshold:4,comparison:"gte",combine:"mean",attributes:["overall","attack","passing","defense","physical","attitude"],...changes}});
  assert.deepEqual(missionObjectivePreview({objective:{metric:"goals",target:14}}),{text:"Marca 14 golos.",criteria:""});
  assert.equal(describe().text,"Joga 2 jogos com média de pelo menos 4 ★.");
  assert.equal(describe().criteria,"6 critérios · média conjunta");
  assert.match(describe({combine:"all"}).text,/em cada critério/);
  assert.equal(describe({metric:"ratingAverage",comparison:"gt",threshold:4.5,target:3}).text,"Obtém uma média superior a 4,5 ★ nos últimos 3 jogos.");
  assert.equal(describe({metric:"ratingStreak"}).text,"Joga 2 jogos seguidos com média de pelo menos 4 ★.");
  assert.equal(describe({metric:"ratingWins",target:1,attributes:["goalkeeping"]}).text,"Ganha um jogo com média de pelo menos 4 ★.");
  assert.equal(describe({attributes:["goalkeeping"]}).criteria,"Guarda-redes");
});

test("goal criteria separate voting, timing, averages, streaks and goalkeeper eligibility into semantic rows",()=> {
  const objective={metric:"ratingAverage",target:3,threshold:4,combine:"all",attributes:["attack","passing"],minRatings:3};
  const average=goalCriteria({objective});
  assert.match(average,/<dl class="goal-rule-rows">/);
  assert.match(average,/Média de pelo menos 4 ★ em cada critério/);
  assert.match(average,/Cada jogo tem o mesmo peso/);
  assert.match(average,/Todos precisam dos votos mínimos/);
  assert.match(average,/após o início do desafio e o desbloqueio/);
  const historical=goalCriteria({objective:{...objective,metric:"totalRatingGames",comparison:"gt",attributes:["goalkeeping"]}});
  assert.match(historical,/Mais de 4 ★/);
  assert.match(historical,/Histórico completo/);
  assert.match(historical,/Não foi à baliza/);
  assert.doesNotMatch(historical,/Peso dos jogos|após o início/);
  assert.match(goalCriteria({objective:{...objective,metric:"ratingStreak"}}),/abaixo do mínimo ou sem votos suficientes interrompe/);
});

test("structured challenge instructions keep thresholds, required votes and conditions without duplicate paragraphs",()=> {
  const html=challengeRules({kind:"mission",method:"objective",cadence:"once",maxRepeats:1,objective:{metric:"ratingGames",target:1,threshold:4.2,comparison:"gte",combine:"mean",attributes:["overall","attack","passing","defense","physical","attitude"],minRatings:9}});
  assert.match(html,/4,2/);assert.match(html,/9 por critério, em cada jogo/);
  assert.equal((html.match(/Só contam jogos/g)||[]).length,1);
  assert.equal((html.match(/Não precisam de ser consecutivos/g)||[]).length,1);
  assert.match(html,/Critérios de avaliação/);assert.match(html,/Média conjunta dos critérios/);
});
test("reward presentation compresses equal boosts but preserves mixed amounts, separate durations and escaped names",()=> {
  const boosts=Object.fromEntries(ATTRIBUTES.map(([key])=>[key,1]));
  const html=rewardBreakdown({boosts,statDuration:"permanent",specialId:"in-form",cardTheme:{name:'<script>unsafe</script>'}});
  assert.match(html,/em todos os 12 atributos/);assert.match(html,/Permanente/);assert.match(html,/Semanal/);
  assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
  const mixed=rewardBreakdown({boosts:{pace:2,passing:1},statDuration:"monthly"});
  assert.match(mixed,/Velocidade/);assert.match(mixed,/\+2/);assert.match(mixed,/Passe/);assert.match(mixed,/\+1/);assert.match(mixed,/Mensal/);
});
