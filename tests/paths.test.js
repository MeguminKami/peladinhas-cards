import test from "node:test";
import assert from "node:assert/strict";
import {
  PATH_ROUTES,
  PATH_NODES,
  PATH_FUSIONS,
  pathNode,
  nodeAvailable,
  emptyPathState,
  createPathOffers,
  nextPathGame,
  evaluatePathMission,
  settlePathState,
  pathRewardPreview,
  pathAttributeLimit,
  unifyPathState,
  pathVisibleRoute,
  upgradePathProposals,
  pathResultAwards,
  pathEarnedStats,
  pathOfferDay,
  pathRerollAvailable,
  rerollPathOffers,
} from "../js/path-model.js";
import { applyEventRewards } from "../js/event-rules.js";
import { rewardBudget, DEFAULT_POLICY } from "../js/system-policy.js";
import { activityCategory } from "../js/activity-categories.js";
import { PATH_CARD_EDITIONS } from "../js/path-card-designs.js";
import { pathMissionTemplates } from "../js/path-missions.js";

test("twelve independent specializations reach fifteen / twenty-five nodes without fusion prerequisites", () => {
  for (const route of PATH_ROUTES) {
    const state = emptyPathState("a"),
      limit = pathAttributeLimit(route.id);
    for (let tier = 0; tier < limit; tier++) {
      const node = pathNode(`${route.id}-${tier}-0`);
      assert.equal(nodeAvailable(node, state), true);
      assert.deepEqual(node.rewardKeys, [route.id]);
      state.nodes[node.id] = { completedAt: "2026-10-18", progress: 100 };
      if (tier === limit - 1) assert.ok(PATH_CARD_EDITIONS[node.specialId]);
    }
    assert.equal(Object.keys(state.nodes).length, limit);
  }
  assert.equal(
    new Set(PATH_NODES.map((node) => node.id)).size,
    PATH_NODES.length,
  );
  const visit = (node, seen = new Set()) => {
    assert.ok(!seen.has(node.id), "cycle");
    for (const id of [...node.requires, ...(node.groups?.flat() || [])]) {
      assert.ok(pathNode(id));
      visit(pathNode(id), new Set([...seen, node.id]));
    }
  };
  PATH_NODES.forEach((node) => visit(node));
});
test("fusion requires either fifth-stage branch in both areas; no fusion gates a specialist", () => {
  const fusion = pathNode("fusion-predator"),
    state = emptyPathState("a");
  state.nodes["shooting-4-1"] = { completedAt: "now" };
  assert.equal(nodeAvailable(fusion, state), false);
  state.nodes["dribbling-4-0"] = { completedAt: "now" };
  assert.equal(nodeAvailable(fusion, state), true);
  assert.ok(PATH_CARD_EDITIONS[pathNode(`${fusion.id}-4`).specialId]);
  assert.equal(activityCategory({ type: "PLAYER_PATH" }), "path");
});
test("five positional fusions use the top two default OVR attributes, correct gates and final rewards", async () => {
  const {DEFAULT_OVR_WEIGHTS}=await import("../js/utils.js");
  const {CARD_POLICY}=await import("../js/card-achievements.js");
  assert.equal(PATH_FUSIONS.length,5);
  for(const fusion of PATH_FUSIONS){
    const top=Object.entries(DEFAULT_OVR_WEIGHTS.positions[fusion.position]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([key])=>key).sort();
    assert.deepEqual([...fusion.routes].sort(),top);
    const state=emptyPathState("a"),root=pathNode(fusion.id);
    state.nodes[`${fusion.routes[0]}-4-1`]={completedAt:"now",progress:100};
    assert.equal(nodeAvailable(root,state),false);
    state.nodes[`${fusion.routes[1]}-4-0`]={completedAt:"now",progress:100};
    assert.equal(nodeAvailable(root,state),true);
    assert.equal(unifyPathState(state,fusion.id).activePath,fusion.id);
    const final=pathNode(`${fusion.id}-4`);
    assert.deepEqual(final.rewardKeys,fusion.routes);
    assert.equal(final.specialId,`path-${fusion.id}`);
    assert.equal(CARD_POLICY[final.specialId].duration,"permanent");
  }
  for(const id of ["fusion-attack","fusion-wall","fusion-engine"]){
    assert.equal(pathNode(id),undefined);
    assert.equal(PATH_CARD_EDITIONS[`path-${id}`],undefined);
    assert.equal(CARD_POLICY[`path-${id}`],undefined);
  }
  const shared=emptyPathState("a");
  for(const route of ["pace","shooting","dribbling"])shared.nodes[`${route}-4-0`]={completedAt:"now",progress:100};
  const both=unifyPathState(unifyPathState(shared,"fusion-winger"),"fusion-predator");
  assert.deepEqual(both.unifiedFusions,["fusion-winger","fusion-predator"]);
  assert.equal(pathVisibleRoute(both,"fusion-winger"),"fusion-winger");
  assert.equal(pathVisibleRoute(both,"fusion-predator"),"fusion-predator");
});
test("three offers have increasing progress, meaningful metrics and deterministic injectable randomness", () => {
  for (const node of PATH_NODES) {
    const offers = createPathOffers(node, () => 0);
    assert.deepEqual(
      offers.map((offer) => offer.advance),
      [25, 50, 100],
    );
    assert.deepEqual(
      offers.map((offer) => offer.id),
      ["0", "1", "2"],
    );
    assert.equal(
      new Set(offers.map((offer) => offer.templateId)).size,
      3,
    );
  }
  assert.equal(
    createPathOffers(pathNode("shooting-0-0"), () => 0.9)[2].objective.kind,
    "conditions",
  );
});
const game = (id = "g", date = "2026-10-20T12:00:00Z") => ({
  id,
  scheduledAt: date,
  closedAt: "2026-10-20T14:00:00Z",
  status: "closed",
  teamA: { starters: ["a"], bench: [] },
  teamB: { starters: ["b"], bench: [] },
  score: { teamA: 2, teamB: 0 },
  positions: { a: "GR" },
  performance: { teamA: { goals: ["a", "a"], assists: ["a"] } },
});
test("the next participating game is selected by start, never close date, absence or client ordering", () => {
  const games = [
    game("later", "2026-10-23T12:00:00Z"),
    game("next"),
    game("past", "2026-10-17T12:00:00Z"),
    {
      ...game("absent", "2026-10-19T12:00:00Z"),
      teamA: { starters: [], bench: [] },
    },
  ];
  assert.equal(nextPathGame(games, "a", "2026-10-18T12:00:00Z").id, "next");
  assert.equal(
    nextPathGame(games, "a", "2026-10-18T12:00:00Z", ["next"]).id,
    "later",
  );
  assert.equal(nextPathGame(games, "c", "2026-10-18T12:00:00Z"), null);
});
test("goals, ratings, keeper position, N/A, stale summaries and minimum sample are authoritative", () => {
  const g = game(),
    summary = {
      ...g,
      players: {
        a: {
          attack: 4,
          goalkeeping: 4,
          ratingCounts: { attack: 2, goalkeeping: 2 },
        },
      },
    };
  assert.equal(
    evaluatePathMission({ kind: "goals", target: 2 }, g, null, "a").status,
    "success",
  );
  assert.equal(
    evaluatePathMission({ kind: "goals", target: 3 }, g, null, "a").status,
    "failure",
  );
  const objective = {
    kind: "rating",
    criterion: "attack",
    target: 4,
    minRatings: 2,
  };
  assert.equal(
    evaluatePathMission(objective, g, summary, "a").status,
    "success",
  );
  assert.equal(
    evaluatePathMission(
      objective,
      g,
      { ...summary, closedAt: "2026-10-21" },
      "a",
    ).status,
    "waiting",
  );
  summary.players.a.ratingCounts.attack = 1;
  assert.equal(
    evaluatePathMission(objective, g, summary, "a").status,
    "waiting",
  );
  const keeper = {
    ...objective,
    kind: "keeper",
    criterion: "goalkeeping",
    maxConceded: 1,
  };
  assert.equal(evaluatePathMission(keeper, g, summary, "a").status, "success");
  summary.players.a.goalkeepingEligible = false;
  assert.equal(evaluatePathMission(keeper, g, summary, "a").status, "waiting");
  assert.equal(
    evaluatePathMission(keeper, { ...g, positions: { a: "AV" } }, summary, "a")
      .status,
    "failure",
  );
});
test("failed attempts reset only the current node; surplus advances the next node and replay does not duplicate", () => {
  const state = emptyPathState("a");
  state.nodes["shooting-0-0"] = { progress: 100, completedAt: "earlier" };
  state.nodes["shooting-1-0"] = { progress: 75 };
  const attempt = {
    id: "one",
    nodeId: "shooting-1-0",
    offer: { advance: 100 },
  };
  const failure = settlePathState(state, attempt, { status: "failure" }, "now");
  assert.equal(failure.nodes[attempt.nodeId].progress, 0);
  assert.equal(failure.nodes["shooting-0-0"].completedAt, "earlier");
  assert.equal(state.nodes[attempt.nodeId].progress, 75);
  const success = settlePathState(state, attempt, { status: "success" }, "now");
  assert.equal(success.nodes[attempt.nodeId].progress, 100);
  assert.equal(success.nodes["shooting-2-0"].progress, 75);
  assert.equal(
    settlePathState(success, attempt, { status: "success" }, "later"),
    success,
  );
});
test("path fifteen / goalkeeper twenty-five caps are independent of all other reward sources", () => {
  const reward = (key, amount, source = "event") => ({
    uid: "a",
    source,
    schemaVersion: 2,
    policyVersion: 1,
    createdAt: "2026-10-01",
    startsAt: "2026-10-01",
    reward: { statDuration: "permanent", boosts: { [key]: amount } },
  });
  assert.equal(
    pathRewardPreview(pathNode("shooting-0-0"), [reward("shooting", 10)], "a")
      .shooting,
    1,
  );
  assert.equal(
    pathRewardPreview(
      pathNode("shooting-0-0"),
      [reward("shooting", 15, "path")],
      "a",
    ).shooting,
    0,
  );
  assert.equal(
    pathRewardPreview(
      pathNode("goalkeeping-0-0"),
      [reward("goalkeeping", 24, "path"), reward("goalkeeping", 10)],
      "a",
    ).goalkeeping,
    1,
  );
  assert.equal(
    pathRewardPreview(
      pathNode("goalkeeping-0-0"),
      [reward("goalkeeping", 25, "path")],
      "a",
    ).goalkeeping,
    0,
  );
  assert.equal(
    pathRewardPreview(
      pathNode("shooting-0-0"),
      [{ ...reward("shooting", 10, "path"), revokedAt: "now" }],
      "a",
    ).shooting,
    1,
  );
  const own = [
    reward("shooting", 10, "path"),
    reward("goalkeeping", 20, "path"),
  ];
  const allocation = rewardBudget(
    { statDuration: "permanent", boosts: { shooting: 1, goalkeeping: 1 } },
    own,
    "mission",
    new Date("2026-10-18"),
    DEFAULT_POLICY,
  );
  assert.deepEqual(allocation.boosts, { shooting: 1, goalkeeping: 1 });
  const applied = applyEventRewards(
    { shooting: 60, goalkeeping: 60 },
    [...own, reward("shooting", 10), reward("goalkeeping", 10)],
    "a",
    new Date("2026-10-18"),
  );
  assert.equal(applied.stats.shooting, 80);
  assert.equal(applied.stats.goalkeeping, 90);
  const capped = applyEventRewards(
    { shooting: 60, goalkeeping: 60 },
    [...own, reward("shooting", 99, "path"), reward("goalkeeping", 99, "path")],
    "a",
    new Date("2026-10-18"),
  );
  assert.equal(capped.stats.shooting, 75);
  assert.equal(capped.stats.goalkeeping, 85);
});

test("one daily reroll is shared by all routes and leaves other choices and progress intact", () => {
  const node = pathNode("shooting-0-0"),
    other = pathNode("passing-0-0");
  const state = emptyPathState("a");
  state.nodes[node.id] = { progress: 75 };
  state.offers[node.id] = createPathOffers(node, () => 0);
  state.offers[other.id] = createPathOffers(other, () => 0);
  const now = "2026-10-18T12:00:00Z";
  const next = rerollPathOffers(state, node, now, () => 0.99);
  assert.equal(next.rerollDay, "2026-10-18");
  assert.equal(next.nodes[node.id].progress, 75);
  assert.deepEqual(next.offers[other.id], state.offers[other.id]);
  assert.notDeepEqual(next.offers[node.id], state.offers[node.id]);
  assert.equal(state.rerollDay, undefined);
  assert.equal(pathRerollAvailable(next, now), false);
  assert.throws(() => rerollPathOffers(next, other, now), /hoje/);
  const prepared = rerollPathOffers(
    { ...state, active: { id: "prepared", nodeId: node.id } },
    node,
    now,
  );
  assert.equal(prepared.active, null);
  assert.equal(prepared.nodes[node.id].progress, 75);
  assert.throws(
    () => rerollPathOffers(emptyPathState("b"), node, now),
    /Revela/,
  );
  assert.equal(pathRerollAvailable(next, "2026-10-19T00:00:00Z"), true);
});
test("the reroll day follows Lisbon midnight across summer time and the autumn change", () => {
  assert.equal(pathOfferDay("2026-07-01T22:59:59Z"), "2026-07-01");
  assert.equal(pathOfferDay("2026-07-01T23:00:00Z"), "2026-07-02");
  assert.equal(pathOfferDay("2026-12-01T23:59:59Z"), "2026-12-01");
  assert.equal(pathOfferDay("2026-12-02T00:00:00Z"), "2026-12-02");
  assert.equal(pathOfferDay("2026-10-25T00:59:59Z"), "2026-10-25");
  assert.equal(pathOfferDay("2026-10-25T01:00:00Z"), "2026-10-25");
});

test("rare 200% missions can finish several nodes; terminal surplus is explicit", () => {
  const node = pathNode("shooting-0-0");
  const offers = createPathOffers(node, () => 0.999);
  assert.equal(offers[2].rarity, "ultimate");
  assert.equal(offers[2].advance, 200);
  const iconOffers = createPathOffers(node, () => 0.97);
  assert.equal(iconOffers[2].rarity, "icon");
  assert.equal(iconOffers[2].advance, 150);
  const state = emptyPathState("a");
  state.nodes[node.id] = { progress: 75 };
  const next = settlePathState(
    state,
    { id: "overflow", nodeId: node.id, offer: offers[2] },
    { status: "success" },
    "now",
  );
  assert.deepEqual(next.lastResult.completedNodeIds, [
    "shooting-0-0",
    "shooting-1-0",
  ]);
  assert.equal(next.nodes["shooting-2-0"].progress, 75);
  assert.equal(next.nodes["passing-0-0"], undefined);
  const terminal = settlePathState(
    emptyPathState("a"),
    { id: "end", nodeId: "shooting-14-0", offer: { advance: 200 } },
    { status: "success" },
    "now",
  );
  assert.equal(terminal.lastResult.finalOverflow, 100);
  assert.equal(terminal.nodes["shooting-15-0"], undefined);
});
test("difficulty uses awarded own points, counts fusions and excludes other sources and pending/revoked grants", () => {
  const rewards = [
    {
      uid: "a",
      source: "path",
      reward: {
        statDuration: "permanent",
        boosts: { shooting: 10, passing: 2 },
      },
    },
    {
      uid: "a",
      source: "mission",
      reward: { statDuration: "permanent", boosts: { shooting: 99 } },
    },
    {
      uid: "a",
      source: "path",
      pending: true,
      reward: { statDuration: "permanent", boosts: { shooting: 50 } },
    },
  ];
  const earned = pathEarnedStats(rewards, "a");
  assert.equal(earned.shooting, 10);
  assert.equal(earned.passing, 2);
  assert.equal(
    createPathOffers(pathNode("shooting-0-0"), () => 0, earned)[0].objective.conditions.find((row) => row.metric === "rating").target,
    3.75,
  );
  assert.equal(
    pathMissionTemplates("shooting", 2, 2).find((row) => row.templateId === "shooting:goals").objective.conditions[0].target,
    4,
  );
  assert.equal(
    nodeAvailable(pathNode("shooting-0-1"), emptyPathState("a")),
    false,
  );
  const legacy = emptyPathState("a");
  legacy.offers["shooting-0-1"] = [{ id: "old" }];
  assert.equal(nodeAvailable(pathNode("shooting-0-1"), legacy), true);
});

test("one trio never offers an identical objective for two progress amounts", () => {
  for (const route of PATH_ROUTES)
    for (const points of [0, 5, 10, 20]) {
      const offers = createPathOffers(pathNode(`${route.id}-0-0`), () => 0.9, {
        [route.id]: points,
      });
      assert.equal(
        new Set(offers.map((offer) => JSON.stringify(offer.objective))).size,
        3,
      );
    }
});

test("fusion activation unifies navigation while preserving original progress and choices", () => {
  const state = emptyPathState("a");
  state.nodes["shooting-4-0"] = { completedAt: "now", progress: 100 };
  assert.throws(() => unifyPathState(state, "fusion-predator"), /marco 5/);
  state.nodes["dribbling-4-0"] = { completedAt: "now", progress: 100 };
  state.offers["shooting-0-0"] = [{ id: "saved" }];
  const next = unifyPathState(state, "fusion-predator");
  assert.equal(next.activePath, "fusion-predator");
  assert.equal(pathVisibleRoute(next, "shooting"), "fusion-predator");
  assert.equal(pathVisibleRoute(next, "dribbling"), "fusion-predator");
  assert.deepEqual(next.nodes, state.nodes);
  assert.deepEqual(next.offers, state.offers);
  assert.equal(next.unifiedFusions.length, 1);
  assert.equal(unifyPathState(next, "fusion-predator").unifiedFusions.length, 1);
  assert.equal(
    PATH_NODES.filter((node) => node.route === "fusion-predator").length,
    5,
  );
  next.nodes["fusion-predator"] = { progress: 75 };
  const settled = settlePathState(
    next,
    { id: "fusion-200", nodeId: "fusion-predator", offer: { advance: 200 } },
    { status: "success" },
    "now",
  );
  assert.deepEqual(settled.lastResult.completedNodeIds, [
    "fusion-predator",
    "fusion-predator-1",
  ]);
  assert.equal(settled.nodes["fusion-predator-2"].progress, 75);
});
test("old proposals preserve their targets and bound attempts migrate without being overwritten", () => {
  const state = emptyPathState("a");
  const offer = {
    id: "old",
    advance: 75,
    objective: {
      kind: "rating",
      criterion: "attack",
      minRatings: 2,
      target: 3.5,
    },
  };
  state.offers["shooting-9-0"] = [offer];
  state.active = { id: "accepted", nodeId:"shooting-9-0", gameId: "already-bound", offer };
  const next = upgradePathProposals(state);
  assert.equal(next.offers["shooting-9-0"][0].objective.target, 3.5);
  assert.equal(next.offers["shooting-9-0"][0].objective.minRatings, 7);
  assert.equal(next.offers["shooting-9-0"][0].advance, 75);
  assert.equal(next.active, null);
  assert.equal(next.pending[0].offer.objective.minRatings, 7);
  assert.equal(next.pending[0].legacyOfferSnapshot.objective.minRatings, 2);
});
test("all seventeen permanent reward cards have individually authored concepts, silhouettes and compositions", () => {
  const editions = Object.values(PATH_CARD_EDITIONS);
  assert.equal(editions.length, 17);
  assert.equal(new Set(editions.map((edition) => edition.outline)).size, 17);
  assert.equal(new Set(editions.map((edition) => edition.art)).size, 17);
  assert.equal(new Set(editions.map((edition) => edition.concept)).size, 17);
  assert.ok(editions.every((edition) => edition.material && edition.motif));
});

test("all cards from one settlement batch remain discoverable when its last result is a cancellation",()=>{
  const first={id:"card-first",settledAt:"same",rewards:[{specialId:"path-shooting"},{specialId:null}],reward:{specialId:null}};
  const last={id:"cancel-last",settledAt:"same",status:"cancelled"};
  const state={lastResult:last,history:[{id:"old",settledAt:"older",reward:{specialId:"path-pace"}},first,last]};
  assert.deepEqual(pathResultAwards(state),[{id:"card-first",specialId:"path-shooting"}]);
});
