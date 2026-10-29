import test from "node:test";
import assert from "node:assert/strict";
import {
  ATTRIBUTES,
  calculateGameDeltas,
  normalizeOvrWeights,
  calculatePlayerStatsDetails,
} from "../js/utils.js";
import {
  FAIR_PROGRESSION_FROM,
  contributionBonus,
  relativeGainFactor,
  gameResultFactors,
} from "../js/game-progression.js";
import { policyAt, setPolicyDocument } from "../js/system-policy.js";
import { calculatePlayerCard } from "../js/player-calculation.js";
import {
  EXPECTATION_PROGRESSION_FROM, EXPECTATION_ATTRIBUTES,
  expectedRating, expectedGoals, expectedAssists,
} from "../js/expectation-progression.js";

const all = (n) => Object.fromEntries(ATTRIBUTES.map(([key]) => [key, n]));
const ratings = (n) =>
  Object.fromEntries(
    ["overall", "attack", "passing", "defense", "physical", "attitude"].map(
      (key) => [key, n],
    ),
  );
const base = {
  ...ratings(3.9),
  goalkeeping: null,
  date: new Date(FAIR_PROGRESSION_FROM),
  outcome: 1,
  goalMargin: 5,
  goals: 6,
  assists: 1,
  teamRatings: ratings(3.5),
  opponentRatings: ratings(3.5),
};
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const expectedGame = (overrides = {}) => ({
  ...ratings(4.5), count: 8, goalkeeping: null, goals: 4, assists: 2,
  date: new Date(EXPECTATION_PROGRESSION_FROM), ...overrides,
});

test("v3 switches on closing date and keeps v1/v2 replay and presentation compatible", () => {
  const before = calculatePlayerStatsDetails(all(16), [{ ...base, date: new Date(Date.parse(EXPECTATION_PROGRESSION_FROM) - 1) }]);
  assert.equal(before.version, "per-game-growth-v2");
  const current = calculatePlayerStatsDetails(all(16), [expectedGame()]);
  assert.equal(current.version, "per-game-growth-v3");
  assert.ok(current.rows.some(row => row.exact !== row.value));
  for (const row of current.rows) {
    close(current.exactStats[row.key], row.exact);
    assert.equal(current.stats[row.key], Math.round(row.exact));
  }
});

test("expectations strictly increase and level 95 requires 4.7 stars", () => {
  close(expectedRating(95), 4.7);
  close(expectedRating(92.5), 4.5);
  close(expectedGoals(80), 1.5);
  close(expectedAssists(80), 1.5 * 44 / 76);
  for (let level = 1; level <= 99; level++) {
    assert.ok(expectedGoals(level) > expectedGoals(level - 1));
    assert.ok(expectedRating(level) >= expectedRating(level - 1));
  }
  close(calculateGameDeltas(all(95), expectedGame({ defense: 4.7 })).defending, 0);
  assert.ok(calculateGameDeltas(all(95), expectedGame({ defense: 4.5 })).defending < 0);
});

test("v3 rewards good elite matches, accumulating almost one point in two matches", () => {
  const stats = all(90), game = expectedGame({ defense: 4.6 });
  const first = calculateGameDeltas(stats, game).defending;
  close(first, .5);
  stats.defending += first;
  const second = calculateGameDeltas(stats, game).defending;
  assert.ok(first + second > .9 && first + second < 1);
  assert.ok(calculateGameDeltas(all(95), expectedGame({ defense: 5 })).defending < first);
});

test("v3 Telmo loses about 3.14 shooting but can gain passing independently", () => {
  const stats = { ...all(85), passing: 82 };
  const delta = calculateGameDeltas(stats, expectedGame({ attack: 2.875, goals: 0, passing: 3.875 }));
  assert.ok(delta.shooting < -3.1 && delta.shooting > -3.2);
  assert.ok(delta.passing > 1);
  assert.ok(calculateGameDeltas(all(60), expectedGame({ attack: 2.875, goals: 0 })).shooting > delta.shooting);
});

test("five matches a month give visible progress without letting merely good ratings maintain 95", () => {
  const stats = all(80);
  const game = expectedGame({ defense: 4.6 });
  for (let i = 0; i < 25; i++) stats.defending += calculateGameDeltas(stats, game).defending;
  assert.ok(stats.defending > 90 && stats.defending < 95);
  assert.ok(calculateGameDeltas(all(95), game).defending < 0);
});

test("attitude drives composure and teamwork, with strong growth through 75", () => {
  const game = expectedGame({ attitude: 4.5, overall: 4, passing: 4, attack: 1 });
  const low = calculateGameDeltas(all(75), game);
  close(low.composure, 3);
  close(low.teamwork, 3);
  const changedAttack = calculateGameDeltas(all(75), { ...game, attack: 5 });
  close(changedAttack.composure, low.composure);
  close(changedAttack.teamwork, low.teamwork);
  const high = calculateGameDeltas(all(90), game);
  assert.ok(high.composure > 0 && high.composure < .2);
  close(high.teamwork, 0);
  const badAttitude = calculateGameDeltas(all(85), { ...game, attitude: 1 });
  assert.ok(badAttitude.composure < 0 && badAttitude.teamwork < 0);
  close(calculateGameDeltas(all(75), { ...game, attitude: null }).composure, 2);
});

test("missing data, dimension counts and GR N/A never manufacture performance", () => {
  const game = expectedGame();
  close(calculateGameDeltas(all(80), { ...game, count: 0 }).defending, 0);
  const full = calculateGameDeltas(all(80), game).defending;
  close(calculateGameDeltas(all(80), { ...game, ratingCounts: { defense: 1 } }).defending, full / 5);
  assert.equal(calculateGameDeltas(all(80), { ...game, attack: null }).shooting, null);
  assert.equal(calculateGameDeltas(all(80), { ...game, goalkeeping: 5, goalkeepingEligible: false }).goalkeeping, null);
  assert.equal(calculateGameDeltas(all(80), { ...game, attitude: null, overall: null }).composure, null);
  close(calculateGameDeltas(all(80), { ...game, defense: 0 }).defending, -2.4);
  assert.notEqual(calculateGameDeltas(all(85), { ...game, goals: undefined }).shooting, calculateGameDeltas(all(85), { ...game, goals: 0 }).shooting);
});

test("v3 caps every attribute, barely changes pace, and ignores result/margin", () => {
  for (const level of [0, 60, 74.9, 75, 84.9, 85, 89.9, 90, 95, 98.9, 99]) {
    for (const rating of [0, 3, 4.7, 5]) {
      const game = expectedGame({ ...ratings(rating), goalkeeping: rating, goals: 99, assists: 99 });
      const deltas = calculateGameDeltas(all(level), game);
      assert.deepEqual(deltas, calculateGameDeltas(all(level), { ...game, outcome: -1, goalMargin: -30 }));
      for (const [key, rule] of Object.entries(EXPECTATION_ATTRIBUTES)) {
        assert.ok(deltas[key] <= rule.gainCap + 1e-9);
        assert.ok(deltas[key] >= -rule.lossCap - 1e-9);
        assert.ok(level + deltas[key] >= 0 && level + deltas[key] <= 99);
      }
      assert.ok(Math.abs(deltas.pace) <= .2 + 1e-9);
    }
  }
});

test("v3 persists exact game values, rounds only display and is deterministic on replay", () => {
  const date = new Date("2026-10-30T12:00:00Z");
  const games = [{ id: "new", status: "closed", closedAt: new Date(EXPECTATION_PROGRESSION_FROM), teamA: { starters: ["a"], bench: [] }, teamB: { starters: [], bench: [] } }];
  const input = { uid: "a", initial: all(18), aggregates: [expectedGame({ gameId: "new", defense: 4.6 })], games, date, position: "DEF" };
  const card = calculatePlayerCard(input);
  assert.deepEqual(card, calculatePlayerCard(input));
  assert.ok(Object.values(card.rawStats).some(n => n % 1 !== 0));
  assert.deepEqual(card.rawStats, card.progression.exactStats);
  for (const [key] of ATTRIBUTES) assert.equal(card.stats[key], Math.round(card.exactStats[key]));
  const weighted = card.ovrCalculation.rows.reduce((sum, row) => sum + card.exactStats[row.key] * row.weight / 100, 0);
  close(card.ovrCalculation.rawExact, weighted);
});

test("dated transition preserves old games and applies new defaults only from activation", () => {
  const oldDate = new Date(Date.parse(FAIR_PROGRESSION_FROM) - 1);
  assert.equal(policyAt(oldDate).progression.speed, 2.3);
  assert.equal(policyAt(base.date).progression.speed, 2.6);
  assert.equal(policyAt(base.date).progression.lossCap, 0.6);
  const old = calculateGameDeltas(all(80), {
    ...base,
    date: oldDate,
    physical: 2,
  });
  const current = calculateGameDeltas(all(80), { ...base, physical: 2 });
  assert.equal(
    old.physical,
    0,
    "Legacy victory shield is preserved for old games",
  );
  assert.ok(
    current.physical < 0,
    "A weak winner loses stats under the new rules",
  );
  assert.equal(
    calculatePlayerStatsDetails(all(16), [{ ...base, gameId: "new" }]).version,
    "per-game-growth-v2",
  );
});

test("future explicit policies tune the new model without changing its effective defaults", () => {
  setPolicyDocument({
    timeline: [
      {
        version: 7,
        effectiveAt: "2026-10-27T00:00:00Z",
        patch: { progression: { gainCap: 0 } },
      },
    ],
  });
  try {
    assert.ok(calculateGameDeltas(all(80), base).shooting > 0);
    assert.equal(
      calculateGameDeltas(all(80), { ...base, date: new Date("2026-10-28") })
        .shooting,
      0,
    );
  } finally {
    setPolicyDocument(null);
  }
});

test("Vitor scenario rewards attack, preserves neutral keeper and limits defensive growth", () => {
  const stats = {
    pace: 78.96902513888888,
    shooting: 75.08533,
    passing: 73.13041763888889,
    dribbling: 78.87866666666666,
    defending: 55.27701875,
    physical: 60.83172638888889,
    goalkeeping: 50.74879285714286,
    stamina: 73.33986666666667,
    vision: 74.45174513888888,
    positioning: 73.27701875,
    teamwork: 66.45174513888888,
    composure: 78.63290666666666,
  };
  const delta = calculateGameDeltas(
    stats,
    {
      ...base,
      attack: 4.5,
      passing: 3.5,
      defense: 19 / 6,
      physical: 23 / 6,
      attitude: 25 / 6,
      goalkeeping: 3,
      teamRatings: {
        attack: 3.375,
        passing: 43 / 12,
        defense: 3.5,
        physical: 3.625,
        attitude: 4.125,
        goalkeeping: 3.375,
      },
      opponentRatings: {
        attack: 91 / 30,
        passing: 49 / 15,
        defense: 83 / 30,
        physical: 46 / 15,
        attitude: 101 / 30,
        goalkeeping: 29 / 12,
      },
    },
    { position: "ALA" },
  );
  close(delta.shooting, 3.24625);
  close(delta.defending, 0.442);
  close(delta.goalkeeping, 0);
  assert.ok(
    delta.shooting > delta.passing && delta.dribbling > delta.defending,
  );
});

test("relative disadvantage is continuous and cannot erase contributions", () => {
  close(relativeGainFactor(-0.75, 3), 1);
  close(relativeGainFactor(-1, 3), 0.85);
  close(relativeGainFactor(-1.5, 3), 0.5);
  close(relativeGainFactor(-2, 3), 0.25);
  close(relativeGainFactor(-1.5, 3.5), 0.75);
  const badTeam = { ...base, attack: 3, teamRatings: ratings(4.5), goals: 6 };
  assert.ok(calculateGameDeltas(all(80), badTeam).shooting > 0);
  assert.equal(
    calculateGameDeltas(all(80), { ...badTeam, goals: 0 }).shooting,
    0,
  );
  assert.ok(
    calculateGameDeltas(all(80), {
      ...base,
      ...ratings(2),
      goals: 0,
      assists: 0,
    }).defending < 0,
  );
});

test("contribution curve distinguishes six, saturates at ten and never rewards absent dimensions", () => {
  assert.ok(
    contributionBonus(3) - contributionBonus(1) <
      contributionBonus(6) - contributionBonus(5),
  );
  close(contributionBonus(10), contributionBonus(99));
  assert.ok(
    calculateGameDeltas(all(80), base).shooting >
      calculateGameDeltas(all(80), { ...base, goals: 3 }).shooting,
  );
  assert.equal(calculateGameDeltas(all(80), base).goalkeeping, null);
  assert.equal(
    calculateGameDeltas(all(80), { ...base, attack: null }).shooting,
    null,
  );
  close(
    gameResultFactors({ ...base, goalMargin: 50 }).gain,
    gameResultFactors({ ...base, goalMargin: 5 }).gain,
  );
});

test("result ordering, position budget, loss bounds and elite taper hold across scenarios", () => {
  for (const position of ["GR", "DEF", "ALA", "MED", "AV"])
    for (const level of [10, 60, 80, 88, 93, 99])
      for (const stars of [1, 2.5, 3, 3.9, 5])
        for (const goals of [0, 3, 6, 10]) {
          const a = { ...base, ...ratings(stars), goals },
            stats = all(level),
            options = { position };
          const win = calculateGameDeltas(stats, a, options);
          const draw = calculateGameDeltas(
            stats,
            { ...a, outcome: 0, goalMargin: 0 },
            options,
          );
          const loss = calculateGameDeltas(
            stats,
            { ...a, outcome: -1, goalMargin: -5 },
            options,
          );
          const moreGoals = calculateGameDeltas(
            stats,
            { ...a, goals: goals + 1 },
            options,
          );
          assert.ok(
            moreGoals.shooting + 1e-9 >= win.shooting,
            "An extra goal cannot reduce shooting",
          );
          const weights = normalizeOvrWeights().positions[position];
          const positive = ATTRIBUTES.reduce(
            (sum, [key]) =>
              sum + (Math.max(0, win[key] || 0) * weights[key]) / 100,
            0,
          );
          assert.ok(positive <= 2.5 + 1e-9);
          for (const [key] of ATTRIBUTES)
            if (win[key] !== null) {
              assert.ok(
                win[key] + 1e-9 >= draw[key] && draw[key] + 1e-9 >= loss[key],
              );
              assert.ok(
                loss[key] >= -0.6 - 1e-9 && stats[key] + win[key] <= 99 + 1e-9,
              );
            }
        }
  assert.ok(
    calculateGameDeltas(all(95), base).shooting <
      calculateGameDeltas(all(90), base).shooting,
  );
});
