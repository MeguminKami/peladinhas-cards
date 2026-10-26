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
        effectiveAt: "2026-11-01T00:00:00Z",
        patch: { progression: { gainCap: 0 } },
      },
    ],
  });
  try {
    assert.ok(calculateGameDeltas(all(80), base).shooting > 0);
    assert.equal(
      calculateGameDeltas(all(80), { ...base, date: new Date("2026-11-02") })
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
