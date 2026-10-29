import test from "node:test";
import assert from "node:assert/strict";
import {
  freezePathForGame,
  pathReviewDeadline,
  pathVotesAt,
  pathHistoricalSummary,
  pathWindowResult,
} from "../js/path-window.js";
import {
  emptyPathState,
  evaluatePathMission,
  settlePathState,
  pathNode,
  nodeAvailable,
  pathOfferAvailable,
} from "../js/path-model.js";
const game = {
  id: "game",
  status: "closed",
  closedAt: "2026-10-18T12:00:00Z",
  teamA: { starters: ["a", "b", "c", "d", "e"], bench: [] },
  teamB: { starters: ["f", "g", "h"], bench: [] },
  score: { teamA: 2, teamB: 0 },
  positions: { a: "GR" },
  performance: { teamA: { goals: ["a", "a"], assists: [] } },
};
const deadline = pathReviewDeadline(game);
const objective = {
  kind: "rating",
  criterion: "attack",
  target: 4,
  minRatings: 7,
};
const ratings = {
  overall: 4,
  attack: 4,
  passing: 4,
  defense: 4,
  physical: 4,
  goalkeeping: 4,
  attitude: 4,
};
const votes = () =>
  ["b", "c", "d", "e", "f", "g", "h"].map((raterId) => ({
    raterId,
    targetId: "a",
    ratings: { ...ratings },
    submitted: true,
    updatedAt: "2026-10-19T12:00:00Z",
  }));
const resolve = (obj = objective, rows = votes(), at = deadline) =>
  pathWindowResult(
    obj,
    game,
    pathHistoricalSummary(game, rows, [], deadline),
    "a",
    at,
    evaluatePathMission,
  );

test("seven votes without guaranteed success wait; all criteria are checked at exactly 48 hours", () => {
  assert.equal(resolve(objective, votes(), deadline - 1).status, "waiting");
  assert.equal(resolve().status, "success");
  const rows = votes();
  rows[0].ratings.attack = 0;
  assert.equal(resolve(objective, rows).status, "failure");
  assert.equal(
    resolve(
      { ...objective, kind: "hybrid", criteria: ["attack", "passing"] },
      votes().map((row, i) =>
        i ? row : { ...row, ratings: { ...row.ratings, passing: null } },
      ),
    ).status,
    "cancelled",
  );
});

test("early success requires seven real votes and assumes two stars for missing votes, including self and bench", () => {
  const match = { ...game, teamB: { starters: ["f", "g", "h"], bench: ["i", "j"] } };
  const run = (rows, target = 4.1) => pathWindowResult(
    { ...objective, target }, match, pathHistoricalSummary(match, rows, [], deadline),
    "a", deadline - 1, evaluatePathMission,
  );
  const high = votes().map(row => ({ ...row, ratings: { ...ratings, attack: 5 } }));
  assert.equal(run(high.slice(0, 6), 0).status, "waiting");
  const result = run(high);
  assert.equal(result.status, "success"); // (7 * 5 + 3 * 2) / 10 = 4.1
  assert.equal(result.earlySettlement, true);
  assert.equal(result.guaranteedRatings.attack, 4.1);
  assert.equal(result.missingVoteStars, 2);
  assert.equal(result.reviewDeadline, deadline);
  assert.equal(run(high, 4.1001).status, "waiting");
  const eight = [...high, { ...high[0], raterId: "i" }].map(row => ({
    ...row, ratings: { ...ratings, attack: row.raterId === "i" ? 1 : 5 },
  }));
  assert.equal(run(eight, 4).status, "success"); // (36 + 2 * 2) / 10 = 4
  assert.equal(run(eight, 4.0001).status, "waiting");
  assert.equal(run([...high.slice(0, 6), high[0]]).status, "waiting");
  // Hypothetical two-star votes cannot turn a currently failed mission into success.
  assert.equal(run(high.map(row => ({ ...row, ratings: { ...ratings, attack: 0 } })), 0.1).status, "waiting");
});

test("early success evaluates every condition, strict thresholds, means and goalkeeper eligibility", () => {
  const high = votes().map(row => ({ ...row, ratings: { ...ratings, attack: 5, passing: 4 } }));
  const run = (obj, rows = high) => resolve(obj, rows, deadline - 1);
  const condition = { metric: "rating", criterion: "attack", target: 4.625 };
  const combined = { kind: "conditions", conditions: [condition] };
  assert.equal(run(combined).status, "success"); // (35 + 2) / 8
  assert.equal(run({ ...combined, conditions: [{ ...condition, comparison: "gt" }] }).status, "waiting");
  assert.equal(run({ ...combined, conditions: [condition, { metric: "goals", target: 3 }] }).status, "waiting");
  assert.equal(run({ ...combined, conditions: [condition, { metric: "goals", target: 2 }] }).status, "success");
  assert.equal(run({ ...objective, kind: "hybrid", criteria: ["attack", "passing"] }).status, "waiting");
  assert.equal(run({ kind: "conditions", conditions: [
    { metric: "ratingMean", criteria: ["attack", "passing"], target: 3.9 },
  ] }).status, "success"); // (4.625 + 3.75) / 2
  const keeper = { ...objective, criterion: "goalkeeping", target: 3 };
  assert.equal(run(keeper).status, "waiting"); // Own N/A could still invalidate GR.
  assert.equal(run(keeper, [...high, { ...high[0], raterId: "a" }]).status, "success");
  assert.equal(run(keeper, [...high, { ...high[0], raterId: "a", ratings: { ...ratings, goalkeeping: null } }]).status, "waiting");
});

test("waivers cannot substitute for seven real votes in early settlement", () => {
  const match = { ...game, ratingWaivers: { h: [{ at: game.closedAt }], a: [{ at: game.closedAt }] } };
  const summary = pathHistoricalSummary(match, votes().slice(0, 6), [], deadline);
  assert.equal(summary.players.a.ratingQuorumCounts.attack, 8);
  assert.equal(pathWindowResult({ ...objective, target: 0 }, match, summary, "a", deadline - 1, evaluatePathMission).status, "waiting");
});
test("six votes, drafts, duplicate voters and goalkeeper N/A cannot qualify an attempt", () => {
  assert.equal(resolve(objective, votes().slice(0, 6)).status, "cancelled");
  assert.equal(
    resolve(
      objective,
      votes().map((row, i) =>
        i ? row : { ...row, submittedAt: "2026-10-18T11:59:59Z" },
      ),
    ).status,
    "cancelled",
  );
  assert.equal(
    resolve(
      objective,
      votes().map((row, i) => (i ? row : { ...row, submitted: false })),
    ).status,
    "cancelled",
  );
  assert.equal(
    resolve(objective, [...votes().slice(0, 6), votes()[0]]).status,
    "cancelled",
  );
  const rows = [
    ...votes(),
    {
      raterId: "a",
      targetId: "a",
      submitted: true,
      ratings: { ...ratings, goalkeeping: null },
      updatedAt: "2026-10-19T12:00:00Z",
    },
  ];
  assert.equal(
    resolve({ ...objective, criterion: "goalkeeping" }, rows).status,
    "cancelled",
  );
});
test("late processing reconstructs pre-deadline values, ignoring later edits and submissions", () => {
  const baseline = votes()[0],
    updated = {
      ...baseline,
      ratings: { ...ratings, attack: 0 },
      updatedAt: "2026-10-20T13:00:00Z",
    };
  const revisions = [
    { vote: baseline, recordedAt: baseline.updatedAt },
    { vote: updated, recordedAt: updated.updatedAt },
  ];
  const rows = [updated, ...votes().slice(1)];
  const summary = pathHistoricalSummary(game, rows, revisions, deadline);
  assert.equal(summary.players.a.attack, 4);
  assert.equal(summary.players.a.ratingCounts.attack, 7);
  assert.equal(
    pathWindowResult(
      objective,
      game,
      summary,
      "a",
      deadline + 86400000,
      evaluatePathMission,
    ).status,
    "success",
  );
  assert.equal(
    pathVotesAt(
      [{ ...baseline, updatedAt: "2026-10-20T12:00:00.001Z" }],
      [],
      deadline,
    ).length,
    0,
  );
  assert.equal(
    pathVotesAt(
      [{ ...baseline, updatedAt: "2026-10-20T12:00:00.000Z" }],
      [],
      deadline,
    ).length,
    1,
  );
});
test("goals and wins settle at game close; absence or cancellation preserves prior node progress", () => {
  assert.equal(
    resolve({ kind: "goals", target: 2 }, [], deadline - 86400000).status,
    "success",
  );
  assert.equal(
    resolve({ kind: "wins", target: 1 }, [], deadline - 86400000).status,
    "success",
  );
  const result = pathWindowResult(
    objective,
    { ...game, status: "draft" },
    null,
    "a",
    deadline,
    evaluatePathMission,
  );
  assert.equal(result.status, "cancelled");
  const state = emptyPathState("a");
  state.nodes["shooting-0-0"] = { progress: 75 };
  const pending = {
    id: "old",
    nodeId: "shooting-0-0",
    offer: { advance: 200 },
  };
  state.pending = [pending];
  state.active = { id: "new", nodeId: "passing-0-0" };
  const next = settlePathState(state, pending, result, "now");
  assert.equal(next.nodes["shooting-0-0"].progress, 75);
  assert.equal(next.active.id, "new");
  assert.equal(next.pending.length, 0);
});
test("opening freezes the existing prepared mission once and reserves possible overflow nodes", () => {
  const state = emptyPathState("a");
  state.nodes["shooting-0-0"] = { progress: 75 };
  state.active = {
    id: "one",
    nodeId: "shooting-0-0",
    offer: { proposalVersion: 3, advance: 200 },
    acceptedAt: "2026-10-18T10:00:00Z",
  };
  const next = freezePathForGame(
    state,
    { ...game, status: "open" },
    "2026-10-18T11:00:00Z",
  );
  assert.equal(next.active, null);
  assert.equal(next.pending.length, 1);
  assert.equal(next.pending[0].windowVersion, 3);
  assert.equal(freezePathForGame(next, game, "2026-10-18T11:00:00Z"), next);
  next.nodes["shooting-0-1"] = { progress: 100, completedAt: "earlier" };
  assert.equal(nodeAvailable(pathNode("shooting-1-0"), next), false);
  assert.equal(nodeAvailable(pathNode("passing-0-0"), next), true);
  assert.equal(state.active.id, "one");
});

test("overflow reservations follow unfinished nodes beyond completed legacy branches", () => {
  const state = emptyPathState("a");
  for (let tier = 0; tier < 10; tier++)
    state.nodes[`shooting-${tier}-0`] = { progress: 100, completedAt: "old" };
  state.nodes["shooting-0-1"] = { progress: 75 };
  state.pending = [
    { id: "legacy-branch", nodeId: "shooting-0-1", offer: { advance: 200 } },
  ];
  assert.equal(nodeAvailable(pathNode("shooting-10-0"), state), false);
  assert.equal(
    pathOfferAvailable(pathNode("shooting-4-1"), { advance: 200 }, state),
    false,
  );
  assert.equal(
    pathOfferAvailable(pathNode("shooting-4-1"), { advance: 25 }, state),
    true,
  );
  assert.equal(nodeAvailable(pathNode("passing-0-0"), state), true);
});

test("cancelled attempts explain whether the game or participation is missing",()=>{
  const evaluate=(value)=>pathWindowResult(objective,value,null,"a",deadline,evaluatePathMission);
  assert.match(evaluate(null).reason,/já não está disponível/);
  assert.match(evaluate({...game,deleting:true}).reason,/foi eliminado/);
  assert.match(evaluate({...game,status:"draft"}).reason,/rascunho/);
  assert.match(evaluate({...game,teamA:{starters:[],bench:[]}}).reason,/participantes/);
});
