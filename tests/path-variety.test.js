import test from "node:test";
import assert from "node:assert/strict";
import { pathRareObjective } from "../js/path-difficulty.js";
import { analyzeGoalDifficulty } from "../scripts/path-difficulty-analysis.mjs";
import {
  PATH_ROUTES,
  PATH_FUSIONS,
  pathNode,
  createPathOffers,
  emptyPathState,
  upgradePathProposals,
  evaluatePathMission,
  settlePathState,
  rerollPathOffers,
} from "../js/path-model.js";
import {
  pathMissionTemplates,
  normalizePathConditions,
  pathObjectiveRequirements,
  pathConditionsImply,
  pathObjectiveLines,
  pickDiversePathOffers,
} from "../js/path-missions.js";
import {
  pathUsesRatings,
  pathWindowResult,
  pathReviewDeadline,
  pathHistoricalSummary,
  freezePathForGame,
} from "../js/path-window.js";

const routes = [...PATH_ROUTES, ...PATH_FUSIONS];

test("Icon adds one step; Ultimate is strictly harder for every route, model and stage", () => {
  for (const route of routes) for (const stage of [0, 1, 2]) {
    for (const template of pathMissionTemplates(route.id, stage, 2)) {
      const original = structuredClone(template.objective);
      assert.equal(pathRareObjective(template.objective, 100), template.objective);
      const rare = pathRareObjective(template.objective, 150, route.id);
      const ultimate = pathRareObjective(template.objective, 200, route.id);
      assert.ok(pathConditionsImply(ultimate, rare),template.templateId+": Ultimate preserves Icon requirements");
      assert.ok(!pathConditionsImply(rare, ultimate),template.templateId+": Ultimate adds a strict requirement");
      assert.ok(ultimate.conditions.every(row=>!["rating","ratingMean"].includes(row.metric)||row.target<=5));
      assert.doesNotThrow(()=>normalizePathConditions(ultimate));
      assert.deepEqual(template.objective, original);
      const changes = rare.conditions.filter((row, index) =>
        row.target !== original.conditions[index].target);
      assert.equal(changes.length, 1);
      const changed = changes[0];
      const old = original.conditions.find(row => row.metric === changed.metric && row.criterion === changed.criterion);
      assert.equal(changed.target - old.target,
        ["rating", "ratingMean"].includes(changed.metric) ? 0.25 : 1);
      assert.ok(!["conceded", "position", "win", "nonLoss"].includes(changed.metric));
      assert.ok(pathConditionsImply(rare, original));
      assert.ok(pathObjectiveLines(rare).length > 0);
    }
    for (const advance of [150, 200]) {
      const offer = createPathOffers(pathNode(route.id.startsWith("fusion-") ? route.id : `${route.id}-0-0`), () => advance === 150 ? 0.97 : 0.999,
        Object.fromEntries(PATH_ROUTES.map(row => [row.id, stage * 5])))[2];
      const base = pathMissionTemplates(route.id, stage, 2).find(row => row.templateId === offer.templateId);
      assert.equal(offer.advance, advance);
      assert.deepEqual(offer.objective, pathRareObjective(base.objective, advance, route.id));
    }
  }
});
test("Ultimate route signatures add actions, quality or defensive solidity without weakening Icon", () => {
  const build = (route, conditions, advance=200) => pathRareObjective({kind:"conditions",minRatings:7,conditions},advance,route);
  const scorer = build("shooting",[{metric:"goals",target:3}]);
  assert.deepEqual(scorer.conditions,[{metric:"goals",target:4},{metric:"assists",target:1}]);
  const match = {...game,pathPerformance:{a:{goals:4,assists:0}}};
  assert.equal(evaluatePathMission(build("shooting",[{metric:"goals",target:3}],150),match,{},"a").status,"success");
  assert.equal(evaluatePathMission(scorer,match,{},"a").status,"failure");
  assert.equal(evaluatePathMission(scorer,{...match,pathPerformance:{a:{goals:4,assists:1}}},{},"a").status,"success");
  const creator = build("fusion-predator",[{metric:"goals",target:2},{metric:"assists",target:1}]);
  assert.equal(creator.conditions.find(row=>row.metric==="assists").target,2);
  const wall = build("fusion-keeper",[{metric:"position",target:"GR"},{metric:"conceded",target:6},{metric:"rating",criterion:"goalkeeping",target:3.5}]);
  assert.equal(wall.conditions.find(row=>row.metric==="conceded").target,5);
  const ceiling = build("composure",[{metric:"rating",criterion:"attitude",target:4.75,comparison:"gt"}]);
  assert.deepEqual(ceiling.conditions[0],{metric:"rating",criterion:"attitude",target:5,comparison:"gte"});
  assert.equal(ceiling.conditions[1].metric,"contributions");
  assert.ok(!pathConditionsImply(build("composure",[{metric:"rating",criterion:"attitude",target:4.75,comparison:"gt"}],150),ceiling));
});
const randomFor = (seed) => () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const objective = (...conditions) => ({
  kind: "conditions",
  conditions,
  minRatings: 7,
});
const rating = (criterion, target = 3.5) => ({
  metric: "rating",
  criterion,
  target,
});
const game = {
  id: "v4-game",
  status: "closed",
  closedAt: "2026-10-19T12:00:00Z",
  teamA: { starters: ["a", "b", "c", "d"], bench: [] },
  teamB: { starters: ["e", "f", "g", "h"], bench: [] },
  positions: { a: "GR" },
  score: { teamA: 3, teamB: 1 },
  pathPerformance: { a: { goals: 1, assists: 2 } },
};
const deadline = pathReviewDeadline(game);
const votes = () =>
  ["b", "c", "d", "e", "f", "g", "h"].map((raterId) => ({
    raterId,
    targetId: "a",
    submitted: true,
    submittedAt: "2026-10-19T13:00:00Z",
    updatedAt: "2026-10-19T13:00:00Z",
    ratings: Object.fromEntries(
      [
        "attack",
        "passing",
        "physical",
        "defense",
        "goalkeeping",
        "attitude",
      ].map((key) => [key, 4]),
    ),
  }));
const summary = (rows = votes(), revisions = []) =>
  pathHistoricalSummary(game, rows, revisions, deadline);
const resolve = (obj, rows = votes(), at = deadline, match = game) =>
  pathWindowResult(obj, match, summary(rows), "a", at, evaluatePathMission);

test("next-game extensions: mean is not AND, strict boundaries, overall votes, all positions and no historical counters", () => {
  const aggregate = summary();
  aggregate.players.a.attack = 4;
  aggregate.players.a.passing = 3;
  const mean = objective({
    metric: "ratingMean",
    criteria: ["attack", "passing"],
    target: 3.5,
  });
  assert.equal(
    evaluatePathMission(mean, game, aggregate, "a").status,
    "success",
  );
  assert.equal(
    evaluatePathMission(
      objective({ ...mean.conditions[0], comparison: "gt" }),
      game,
      aggregate,
      "a",
    ).status,
    "failure",
  );
  aggregate.players.a.passing = 3.1;
  assert.equal(
    evaluatePathMission(
      objective({ ...mean.conditions[0], comparison: "gt" }),
      game,
      aggregate,
      "a",
    ).status,
    "success",
  );
  aggregate.players.a.ratingCounts.passing = 6;
  assert.equal(
    pathWindowResult(mean, game, aggregate, "a", deadline, evaluatePathMission)
      .status,
    "cancelled",
  );
  aggregate.players.a.overall = 4;
  aggregate.players.a.ratingCounts.overall = 7;
  assert.equal(
    evaluatePathMission(objective(rating("overall", 4)), game, aggregate, "a")
      .status,
    "success",
  );
  assert.equal(
    evaluatePathMission(
      objective({ ...rating("overall", 4), comparison: "gt" }),
      game,
      aggregate,
      "a",
    ).status,
    "failure",
  );
  for (const position of ["GR", "DEF", "MED", "ALA", "AV"]) {
    const obj = objective(
      { metric: "position", target: position },
      { metric: "games", target: 1 },
    );
    const match = { ...game, positions: { a: position } };
    assert.equal(
      evaluatePathMission(obj, match, aggregate, "a").status,
      "success",
    );
    assert.equal(
      pathWindowResult(
        obj,
        { ...match, positions: { a: "OTHER" } },
        aggregate,
        "a",
        deadline,
        evaluatePathMission,
      ).status,
      "cancelled",
    );
  }
  for (const [metric, score] of [
    ["draw", { teamA: 2, teamB: 2 }],
    ["loss", { teamA: 1, teamB: 2 }],
    ["nonLoss", { teamA: 2, teamB: 2 }],
    ["cleanSheet", { teamA: 1, teamB: 0 }],
  ]) {
    const obj = objective({ metric, target: 1 });
    assert.equal(
      evaluatePathMission(obj, { ...game, score }, null, "a").status,
      "success",
    );
    assert.equal(
      evaluatePathMission(obj, { ...game, score: null }, null, "a").status,
      "waiting",
    );
    assert.equal(
      evaluatePathMission(obj, { ...game, status: "open", score }, null, "a")
        .status,
      "waiting",
    );
  }
  assert.deepEqual(
    normalizePathConditions(
      objective(
        { ...rating("attack", 4), comparison: "gt" },
        rating("attack", 4),
      ),
    ),
    [{ metric: "rating", criterion: "attack", target: 4, comparison: "gt" }],
  );
});

test("difficulty audit separates teams, players, closed windows and missing evidence", () => {
  const rows = [
    { game, summary: summary() },
    { game: { ...game, status: "open" }, summary: summary() },
    { game: { ...game, deleting: true }, summary: summary() },
    { game: { ...game, closedAt: "2030-01-01" }, summary: summary() },
  ];
  const audit = analyzeGoalDifficulty(rows, deadline + 1);
  assert.equal(audit.statistics.games, 1);
  assert.equal(audit.statistics.participations, 8);
  assert.equal(audit.statistics.teamGoals.count, 2);
  assert.equal(audit.statistics.teamGoals.median, 2);
  assert.equal(audit.statistics.contributions.histogram[3], 1);
  assert.equal(
    audit.statistics.thresholds.conceded.find((row) => row.target === 1).met,
    1,
  );
  const keeper = audit.missions.find(
    (row) =>
      row.templateId === "goalkeeping:solid" &&
      row.stage === 0 &&
      row.difficulty === 0,
  );
  assert.equal(keeper.cancelled, 7);
  assert.equal(keeper.eligible, 1);
  const pending = analyzeGoalDifficulty(
    [{ game, summary: summary() }],
    deadline - 1,
  );
  const ratings = pending.missions.find(
    (row) => row.templateId === "shooting:quality",
  );
  assert.equal(ratings.windowPending, 8);
  assert.equal(ratings.successPercent, null);
  const missing = analyzeGoalDifficulty(
    [{ game, summary: null }],
    deadline + 1,
  ).missions.find((row) => row.templateId === "shooting:quality");
  assert.equal(missing.waiting, 8);
  assert.equal(missing.eligible, 0);
  assert.ok(!JSON.stringify(audit).includes("v4-game"));
});

test("expanded catalogue: 255 templates, diverse families and mandatory goalkeeper evidence", () => {
  let count = 0;
  for (const route of routes) {
    count += pathMissionTemplates(route.id).length;
    for (const stage of [0, 1, 2])
      for (const level of [0, 1, 2]) {
        const templates = pathMissionTemplates(route.id, stage, level);
        assert.ok(templates.length >= 14 && templates.length <= 15, route.id);
        assert.ok(
          new Set(templates.map((row) => row.family)).size >= 3,
          route.id,
        );
        assert.equal(
          new Set(
            templates.map((row) =>
              JSON.stringify(normalizePathConditions(row.objective)),
            ),
          ).size,
          templates.length,
        );
        for (const row of templates) {
          const requirements = pathObjectiveRequirements(row.objective);
          assert.equal(
            pathUsesRatings(row.objective),
            requirements.criteria.length > 0,
          );
          assert.ok(
            pathObjectiveLines(row.objective).every(
              (line) => !line.includes("undefined"),
            ),
          );
          if (["goalkeeping", "fusion-keeper"].includes(route.id))
            assert.ok(
              requirements.conditions.some(
                (c) => c.metric === "position" && c.target === "GR",
              ),
            );
          if (route.id === "fusion-keeper") {
            assert.ok(requirements.criteria.includes("defense"));
            assert.ok(
              requirements.criteria.includes("goalkeeping") ||
                requirements.conditions.some((c) => c.metric === "conceded"),
            );
          }
          if (route.id === "shooting" && !row.templateId.endsWith(":base"))
            assert.ok(
              requirements.conditions.some((c) => c.metric === "goals"),
            );
        }
      }
  }
  assert.equal(count, 255);
  assert.equal(
    pathMissionTemplates("shooting", 2, 2).find((row) =>
      row.templateId.endsWith(":goals"),
    ).objective.conditions[0].target,
    4,
  );
});

test("v4 normalization rejects unknown types, canonicalizes order, strongest bounds and implied contributions", () => {
  const goal = { metric: "goals", target: 1 },
    assist = { metric: "assists", target: 1 };
  assert.deepEqual(
    normalizePathConditions(objective(goal, assist)),
    normalizePathConditions(objective(assist, goal)),
  );
  assert.deepEqual(
    normalizePathConditions(
      objective(goal, { metric: "contributions", target: 1 }),
    ),
    normalizePathConditions(objective(goal)),
  );
  assert.equal(
    normalizePathConditions(objective(goal, { ...goal, target: 3 }))[0].target,
    3,
  );
  assert.ok(
    pathConditionsImply(
      objective(goal, assist),
      objective({ metric: "contributions", target: 2 }),
    ),
  );
  assert.ok(
    !pathConditionsImply(
      objective({ metric: "contributions", target: 2 }),
      objective(goal, assist),
    ),
  );
  assert.ok(
    pathConditionsImply(
      objective({ metric: "goals", target: 2 }),
      objective(goal, { metric: "teamGoals", target: 2 }),
    ),
  );
  assert.ok(
    pathConditionsImply(
      objective(
        { metric: "teamGoals", target: 3 },
        { metric: "conceded", target: 2 },
      ),
      objective({ metric: "win", target: 1 }),
    ),
  );
  for (const bad of [
    { metric: "sprints", target: 1 },
    { metric: "goals", target: -1 },
    rating("invented"),
    rating("attack", 6),
    { metric: "position", target: "UNKNOWN" },
  ])
    assert.throws(() => normalizePathConditions(objective(bad)));
  assert.throws(() => pathUsesRatings({ kind: "unknown" }));
  assert.throws(() => normalizePathConditions(objective()));
});

test("v4 every catalogue condition is evaluated, including all three criteria and exact rating boundaries", () => {
  for (const route of routes)
    for (const stage of [0, 1, 2])
      for (const difficulty of [0, 1, 2]) {
        for (const template of pathMissionTemplates(
          route.id,
          stage,
          difficulty,
        )) {
          const match = {
            ...structuredClone(game),
            score: { teamA: 30, teamB: 0 },
            pathPerformance: { a: { goals: 10, assists: 10 } },
          };
          const aggregate = summary();
          for (const key of [
            "overall",
            "attack",
            "passing",
            "physical",
            "defense",
            "goalkeeping",
            "attitude",
          ]) {
            aggregate.players.a[key] = 5;
            aggregate.players.a.ratingCounts[key] = 7;
          }
          for (const condition of template.objective.conditions) {
            if (condition.metric === "position")
              match.positions.a = condition.target;
            if (condition.metric === "draw")
              match.score = { teamA: 30, teamB: 30 };
            if (condition.metric === "loss")
              match.score = { teamA: 30, teamB: 31 };
          }
          for (const row of template.objective.conditions.filter(
            (row) => row.metric === "rating",
          ))
            aggregate.players.a[row.criterion] =
              row.target + (row.comparison === "gt" ? 0.01 : 0);
          for (const row of template.objective.conditions.filter(row=>row.metric==="ratingMean"))
            for (const criterion of row.criteria)
              aggregate.players.a[criterion]=Math.max(aggregate.players.a[criterion],row.target+(row.comparison==="gt"?0.01:0));
          assert.equal(
            evaluatePathMission(template.objective, match, aggregate, "a")
              .status,
            "success",
            template.templateId,
          );
          for (const condition of template.objective.conditions) {
            const changed = structuredClone(match),
              ratings = structuredClone(aggregate);
            const metric = condition.metric,
              target = condition.target;
            if (metric === "rating")
              ratings.players.a[condition.criterion] = target - 0.25;
            if (metric === "ratingMean")
              for (const key of condition.criteria)
                ratings.players.a[key] = target - 0.25;
            if (metric === "position")
              changed.positions.a = target === "AV" ? "DEF" : "AV";
            if (metric === "games")
              changed.teamA.starters = changed.teamA.starters.filter(
                (uid) => uid !== "a",
              );
            if (metric === "nonLoss") changed.score = { teamA: 0, teamB: 1 };
            if (metric === "draw" || metric === "loss")
              changed.score = { teamA: 1, teamB: 0 };
            if (metric === "cleanSheet") changed.score.teamB = 1;
            if (metric === "goals" || metric === "assists")
              changed.pathPerformance.a[metric] = target - 1;
            if (metric === "contributions")
              changed.pathPerformance.a = { goals: 0, assists: target - 1 };
            if (metric === "win") changed.score = { teamA: 0, teamB: 0 };
            if (metric === "teamGoals") changed.score.teamA = target - 1;
            if (metric === "conceded") changed.score.teamB = target + 1;
            assert.equal(
              evaluatePathMission(template.objective, changed, ratings, "a")
                .status,
              ["position", "games"].includes(metric) ? "cancelled" : "failure",
              `${template.templateId}:${metric}`,
            );
          }
        }
      }
});

test("v4 seeded offers: three families, no equivalent/dominated choices, stable IDs, rarity and all stages", () => {
  for (const route of routes)
    for (const points of [0, 5, 10]) {
      const node = pathNode(
        route.id.startsWith("fusion-") ? route.id : `${route.id}-0-0`,
      );
      const seenModels = new Set(),
        slotFamilies = [new Set(), new Set(), new Set()];
      for (let seed = 1; seed <= 160; seed++) {
        const offers = createPathOffers(
          node,
          randomFor(seed),
          Object.fromEntries(node.rewardKeys.map((key) => [key, points])),
        );
        assert.equal(offers.length, 3);
        assert.equal(new Set(offers.map((row) => row.family)).size, 3);
        assert.deepEqual(
          offers.map((row) => row.id),
          ["0", "1", "2"],
        );
        for (const offer of offers) {
          seenModels.add(offer.templateId);
          slotFamilies[offer.difficulty].add(offer.family);
          assert.equal(offer.proposalVersion, 4);
          for (const other of offers.filter((row) => row !== offer)) {
            const implies = pathConditionsImply(
              offer.objective,
              other.objective,
            );
            if (implies) {
              assert.ok(offer.advance >= other.advance);
              assert.ok(!pathConditionsImply(other.objective, offer.objective));
            }
          }
        }
      }
      assert.equal(seenModels.size, 15, `${route.id}: all models reachable`);
      assert.ok(
        slotFamilies.every((families) => families.size > 1),
        `${route.id}: no fixed family slot`,
      );
    }
  assert.equal(
    createPathOffers(pathNode("pace-0-0"), () => 0.999)[2].advance,
    200,
  );
  assert.equal(
    createPathOffers(pathNode("pace-0-0"), () => 0.97)[2].advance,
    150,
  );
});

test("v4 history and reroll prefer novelty without extra allowance or loss of other saved offers", () => {
  const node = pathNode("shooting-0-0"),
    state = emptyPathState("a");
  state.offers[node.id] = createPathOffers(node, () => 0.5);
  state.offers["passing-0-0"] = [{ id: "legacy", proposalVersion: 3 }];
  const initial = state.offers[node.id];
  const renewed = rerollPathOffers(
    state,
    node,
    "2026-10-19T12:00:00Z",
    () => 0.5,
  );
  assert.ok(
    renewed.offers[node.id].some(
      (row) => !initial.some((old) => old.templateId === row.templateId),
    ),
  );
  assert.deepEqual(renewed.offers["passing-0-0"], state.offers["passing-0-0"]);
  assert.throws(() => rerollPathOffers(renewed, node, "2026-10-19T13:00:00Z"));
  const recent = initial.map((row) => row.family);
  const fresh = createPathOffers(
    node,
    () => 0.5,
    {},
    { recentFamilies: recent },
  );
  assert.ok(fresh.some((row) => !recent.includes(row.family)));
  state.active = {
    id: "attempt",
    nodeId: node.id,
    offer: initial[0],
    acceptedAt: "2026-10-19T10:00:00Z",
  };
  let frozen = freezePathForGame(
    state,
    { ...game, status: "open" },
    "2026-10-19T11:00:00Z",
  );
  assert.deepEqual(frozen.recentPathFamilies.shooting, [initial[0].family]);
  assert.deepEqual(
    freezePathForGame(frozen, game, "2026-10-19T11:00:01Z"),
    frozen,
  );
  for (let i = 0; i < 4; i++) {
    frozen.active = { ...state.active, id: `next-${i}`, offer: initial[i % 3] };
    frozen = freezePathForGame(
      frozen,
      { ...game, id: `game-${i}`, status: "open" },
      "2026-10-19T11:00:00Z",
    );
  }
  assert.equal(frozen.recentPathFamilies.shooting.length, 3);
});

test("v4 numeric conditions settle at close, sum contributions, respect each team and every boundary", () => {
  const obj = objective(
    { metric: "goals", target: 1 },
    { metric: "assists", target: 2 },
    { metric: "contributions", target: 3 },
    { metric: "win", target: 1 },
    { metric: "teamGoals", target: 3 },
    { metric: "conceded", target: 1 },
  );
  assert.equal(resolve(obj, [], deadline - 1).status, "success");
  for (const [metric, target] of [
    ["goals", 2],
    ["assists", 3],
    ["contributions", 4],
    ["teamGoals", 4],
    ["conceded", 0],
  ])
    assert.equal(
      resolve(objective({ metric, target }), []).status,
      "failure",
      metric,
    );
  assert.equal(
    resolve(objective({ metric: "win", target: 1 }), [], deadline, {
      ...game,
      score: { teamA: 1, teamB: 1 },
    }).status,
    "failure",
  );
  assert.equal(
    evaluatePathMission(
      objective(
        { metric: "teamGoals", target: 1 },
        { metric: "conceded", target: 3 },
      ),
      game,
      null,
      "e",
    ).status,
    "success",
  );
  assert.equal(
    resolve(obj, [], deadline, { ...game, status: "open" }).status,
    "waiting",
  );
  assert.equal(
    resolve(obj, [], deadline, { ...game, deleting: true }).status,
    "cancelled",
  );
});

test("v4 mixed objectives wait 48h, require seven votes per criterion even when numeric conditions fail", () => {
  const obj = objective(
    { metric: "goals", target: 2 },
    rating("attack"),
    rating("passing"),
  );
  assert.equal(resolve(obj, votes(), deadline - 1).status, "waiting");
  assert.equal(resolve(obj).status, "failure");
  assert.equal(resolve(obj, votes().slice(0, 6)).status, "cancelled");
  const incomplete = votes();
  delete incomplete[0].ratings.passing;
  assert.equal(resolve(obj, incomplete).status, "cancelled");
  const enough = objective(
    { metric: "goals", target: 1 },
    rating("attack", 4),
    rating("passing", 4),
  );
  const result = resolve(enough);
  assert.equal(result.status, "success");
  assert.ok(result.reason.includes("mínimo 4★"));
  assert.equal(
    result.conditionResults.filter((row) => row.metric === "rating").length,
    2,
  );
  const stale = { ...summary(), closedAt: "2026-10-18T12:00:00Z" };
  assert.equal(
    pathWindowResult(enough, game, stale, "a", deadline, evaluatePathMission)
      .status,
    "waiting",
  );
});

test("v4 cutoff uses historical edits; GR ineligibility cancels even without a GR rating condition", () => {
  const obj = objective(
    { metric: "position", target: "GR" },
    { metric: "conceded", target: 2 },
    rating("defense"),
  );
  assert.equal(resolve(obj).status, "success");
  assert.equal(
    resolve(obj, votes(), deadline, { ...game, positions: { a: "AV" } }).status,
    "cancelled",
  );
  const self = {
    ...votes()[0],
    raterId: "a",
    ratings: { ...votes()[0].ratings, goalkeeping: null },
  };
  assert.equal(resolve(obj, [...votes(), self]).status, "cancelled");
  const rows = votes();
  const old = structuredClone(rows[0]);
  rows[0].ratings.defense = 0;
  rows[0].updatedAt = "2026-10-22T12:00:00Z";
  const historical = summary(rows, [{ vote: old, recordedAt: old.updatedAt }]);
  assert.equal(
    pathWindowResult(
      obj,
      game,
      historical,
      "a",
      deadline + 86400000,
      evaluatePathMission,
    ).status,
    "success",
  );
  const state = emptyPathState("a");
  state.nodes["goalkeeping-0-0"] = { progress: 75 };
  const cancelled = settlePathState(
    state,
    {
      id: "cancelled",
      nodeId: "goalkeeping-0-0",
      offer: { advance: 100, objective: obj },
    },
    { status: "cancelled" },
    "now",
  );
  assert.equal(cancelled.nodes["goalkeeping-0-0"].progress, 75);
});

test("v4 compatibility preserves saved v3 and v4 proposals, pending attempts, rewards and reroll", () => {
  const state = emptyPathState("a"),
    v4 = createPathOffers(pathNode("shooting-0-0"), () => 0.3);
  state.offers = {
    "shooting-0-0": v4,
    "passing-0-0": [
      {
        id: "old",
        proposalVersion: 3,
        advance: 50,
        objective: { kind: "assists", target: 1 },
      },
    ],
  };
  state.rerollDay = "2026-10-19";
  state.pending = [
    {
      id: "old-attempt",
      nodeId: "passing-0-0",
      windowVersion: 3,
      offer: state.offers["passing-0-0"][0],
    },
  ];
  assert.deepEqual(upgradePathProposals(structuredClone(state)), state);
  const candidate = { ...v4[0], objective: objective(rating("attack", 3)) };
  const fallback = pickDiversePathOffers(
    [
      [candidate],
      [
        {
          ...candidate,
          templateId: "b",
          advance: 50,
          objective: objective(rating("attack", 3.5)),
        },
      ],
      [
        {
          ...candidate,
          templateId: "c",
          advance: 100,
          objective: objective(rating("attack", 4)),
        },
      ],
    ],
    [],
    () => 0.5,
  );
  assert.equal(fallback.length, 3);
});


test("defensive calibration repairs unbound offers, removes loss incentives and preserves game snapshots", () => {
  for (const route of routes) for (let stage = 0; stage < 3; stage++) for (let difficulty = 0; difficulty < 3; difficulty++) {
    for (const template of pathMissionTemplates(route.id, stage, difficulty)) {
      assert.ok(template.objective.conditions.every(row => !["cleanSheet", "loss", "draw"].includes(row.metric)));
      assert.ok(template.objective.conditions.filter(row => row.metric === "conceded").every(row => row.target >= 5));
    }
  }
  const old = metric => ({ id: "1", difficulty: 1, proposalVersion: 4, family: metric,
    objective: { kind: "conditions", minRatings: 7, conditions: [{ metric, target: 1 }, { metric: "rating", criterion: "defense", target: 3.5 }] } });
  const state = { ...emptyPathState("a"), offers: { "defending-0-0": [old("cleanSheet"), old("conceded"), old("loss")] },
    active: { id: "prepared", offer: old("conceded") }, pending: [{ id: "pending", windowVersion: 3, offer: old("cleanSheet") }],
    history: [{ id: "settled", offer: old("loss") }] };
  const snapshot = structuredClone(state);
  const updated = upgradePathProposals(state);
  assert.deepEqual(state, snapshot, "migration does not mutate its input");
  assert.equal(updated.offers["defending-0-0"][0].objective.conditions[0].target, 7);
  assert.equal(updated.offers["defending-0-0"][1].objective.conditions[0].target, 7);
  assert.equal(updated.offers["defending-0-0"][2].objective.conditions[0].metric, "contributions");
  assert.equal(updated.active.offer.objective.conditions[0].target, 7);
  assert.equal(updated.pending, state.pending);
  assert.equal(updated.history, state.history);
  assert.equal(upgradePathProposals(updated), updated, "migration is idempotent");
  const frozen = { ...state, active: { ...state.active, frozenAt: "2026-10-20" } };
  assert.equal(upgradePathProposals(frozen).active, frozen.active);
});
