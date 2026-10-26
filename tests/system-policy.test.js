import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_POLICY,
  validatePolicy,
  policyAt,
  policyVersion,
  setPolicyDocument,
  rewardBudget,
  canManage,
  budgetWindow,
  isQuietHour,
} from "../js/system-policy.js";
import { applyEventRewards } from "../js/event-rules.js";
import {
  calculateGameDeltas,
  calculateInactivity,
  ATTRIBUTES,
} from "../js/utils.js";
import { cardWeek } from "../js/card-week.js";
import { leaguePeriod } from "../js/card-achievements.js";
import { ratingEditDeadline } from "../js/rating-window.js";
const config = () => structuredClone(DEFAULT_POLICY);

test("legacy inactivity settings cannot restore OVR penalties and old drafts remain valid", () => {
  const legacy = config();
  Object.assign(legacy.progression, { inactivityEnabled: true, inactivityStart: 1, inactivityMaximum: 20 });
  assert.deepEqual(validatePolicy(legacy).progression, DEFAULT_POLICY.progression);
  setPolicyDocument({ timeline: [{version: 1, effectiveAt: "2026-01-01", config: legacy}] });
  try {
    const games = Array.from({length: 10}, (_, i) => ({
      id: String(i), status: "closed", closedAt: new Date(`2026-10-${String(i + 1).padStart(2, "0")}T12:00:00Z`),
      teamA: {starters: [], bench: []}, teamB: {starters: [], bench: []},
    }));
    assert.deepEqual(calculateInactivity("absent", games, null, new Date("2026-10-20")), {missed: 10, penalty: 0});
    assert.equal(Object.hasOwn(policyAt().progression, "inactivityEnabled"), false);
  } finally {
    setPolicyDocument(null);
  }
});
test("18h baseline extends legacy policy without modifying its timeline or future explicit settings", () => {
  const doc={timeline:[{version:1,effectiveAt:"2026-10-01",config:config()},{version:2,effectiveAt:"2026-10-22",patch:{cycle:{closeHour:20}}}]};
  assert.equal(policyAt(new Date("2026-10-20"),doc).cycle.closeHour,12);
  assert.equal(policyAt(new Date("2026-10-21T13:00Z"),doc).cycle.closeHour,18);
  assert.equal(policyAt(new Date("2026-10-23"),doc).cycle.closeHour,20);
  assert.equal(doc.timeline.length,2);
  assert.equal(policyVersion(new Date("2026-10-21T13:00Z"),doc),1);
});
test("compressed policy history reconstructs every revision and preserves future activation", () => {
  const document = {
    timeline: [
      {
        version: 1,
        effectiveAt: "2026-01-01",
        patch: { rewards: { dailyBudget: 4 } },
      },
      {
        version: 2,
        effectiveAt: "2026-02-01",
        patch: { progression: { gainCap: 2 } },
      },
      {
        version: 3,
        effectiveAt: "2026-03-01",
        config: {
          ...config(),
          rewards: { ...config().rewards, dailyBudget: 8 },
        },
      },
    ],
  };
  assert.equal(
    policyAt(new Date("2025-12-01"), document).rewards.dailyBudget,
    0,
  );
  assert.equal(
    policyAt(new Date("2026-01-15"), document).rewards.dailyBudget,
    4,
  );
  assert.equal(
    policyAt(new Date("2026-02-15"), document).rewards.dailyBudget,
    4,
  );
  assert.equal(
    policyAt(new Date("2026-02-15"), document).progression.gainCap,
    2,
  );
  assert.equal(policyVersion(new Date("2026-02-15"), document), 2);
  assert.equal(
    policyAt(new Date("2026-03-15"), document).rewards.dailyBudget,
    8,
  );
});
test("policy schema rejects missing/unknown fields, impossible budgets and App Check without a key", () => {
  assert.deepEqual(validatePolicy(config()), DEFAULT_POLICY);
  for (const value of [
    null,
    {},
    { ...config(), unknown: {} },
    { ...config(), rewards: { ...config().rewards, temporaryAttribute: 1000 } },
  ])
    assert.throws(() => validatePolicy(value));
  const p = config();
  p.rewards.dailyBudget = 100;
  p.rewards.weeklyBudget = 10;
  assert.throws(() => validatePolicy(p));
  const a = config();
  a.security.requireAppCheck = true;
  assert.throws(() => validatePolicy(a));
});
test("scheduled and historical policies select only the applicable immutable version", () => {
  const p = config();
  p.rewards.temporaryAttribute = 8;
  const doc = {
    timeline: [{ version: 1, effectiveAt: "2026-10-01T00:00:00Z", config: p }],
  };
  assert.equal(
    policyAt(new Date("2026-09-01"), doc).rewards.temporaryAttribute,
    10,
  );
  assert.equal(
    policyAt(new Date("2026-10-02"), doc).rewards.temporaryAttribute,
    8,
  );
  assert.equal(policyVersion(new Date("2026-09-01"), doc), 0);
});
test("reward budgets combine active attribute caps, global period budgets and origin caps", () => {
  const p = config(),
    date = new Date("2026-10-16T12:00:00Z");
  p.rewards.dailyBudget = 6;
  p.rewards.missionBudget = 5;
  const old = [
    {
      source: "mission",
      createdAt: date,
      reward: { statDuration: "weekly", boosts: { pace: 3 } },
      expiresAt: new Date(+date + 86400000),
    },
  ];
  const request = { statDuration: "weekly", boosts: { pace: 8, shooting: 4 } };
  const result = rewardBudget(request, old, "mission", date, p);
  assert.equal(result.delivered, 2);
  assert.equal(result.reduced, true);
  assert.equal(
    rewardBudget(request, [{ ...old[0], revokedAt: date }], "mission", date, p)
      .delivered,
    5,
  );
});
test("permanent limits persist after expiry and pending rewards never consume budgets", () => {
  const p = config(),
    date = new Date("2026-10-16T12:00:00Z");
  const prior = [
    {
      createdAt: date,
      expiresAt: new Date(0),
      reward: { statDuration: "permanent", boosts: { pace: 9 } },
    },
  ];
  assert.equal(
    rewardBudget(
      { statDuration: "permanent", boosts: { pace: 5 } },
      prior,
      "event",
      date,
      p,
    ).delivered,
    1,
  );
  assert.equal(
    rewardBudget(
      { statDuration: "permanent", boosts: { pace: 5 } },
      [{ ...prior[0], pending: true }],
      "event",
      date,
      p,
    ).delivered,
    5,
  );
});
test("delivered versioned rewards retain their amount when global limits change", () => {
  const p = config();
  p.rewards.temporaryAttribute = 0;
  setPolicyDocument({
    timeline: [{ version: 1, effectiveAt: "2026-01-01", config: p }],
  });
  const date = new Date("2026-10-16"),
    row = {
      uid: "a",
      schemaVersion: 2,
      policyVersion: 1,
      createdAt: new Date("2026-10-01"),
      startsAt: new Date("2026-10-01"),
      expiresAt: new Date("2026-11-01"),
      reward: { statDuration: "weekly", boosts: { pace: 7 } },
    };
  assert.equal(
    applyEventRewards({ pace: 50 }, [row], "a", date).stats.pace,
    57,
  );
  assert.equal(
    applyEventRewards({ pace: 50 }, [{ ...row, pending: true }], "a", date)
      .stats.pace,
    50,
  );
  setPolicyDocument(null);
});
test("capability restrictions cannot be bypassed by a disabled or non-admin account", () => {
  assert.equal(canManage({ role: "admin" }, "settings"), true);
  assert.equal(
    canManage({ role: "admin", adminCapabilities: ["audit"] }, "settings"),
    false,
  );
  assert.equal(
    canManage({ role: "member", adminCapabilities: ["settings"] }, "settings"),
    false,
  );
  assert.equal(canManage({ role: "admin", disabled: true }, "settings"), false);
});
test("notification quiet hours cross midnight in Lisbon; equal hours disable silence", () => {
  const p = { quietStart: 22, quietEnd: 8 };
  assert.equal(isQuietHour(p, new Date("2026-01-01T23:00:00Z")), true);
  assert.equal(isQuietHour(p, new Date("2026-01-01T12:00:00Z")), false);
  assert.equal(isQuietHour({ quietStart: 8, quietEnd: 8 }), false);
  assert.equal(
    budgetWindow("day", new Date("2026-07-01T23:30:00Z")),
    "2026-07-02",
  );
});
test("rating windows are fixed at submission and keep legacy seven-day compatibility", () => {
  const submittedAt = "2026-10-01T12:00:00Z";
  assert.equal(
    +ratingEditDeadline({ submitted: true, submittedAt, editDays: 3 }),
    +new Date(submittedAt) + 3 * 86400000,
  );
  assert.equal(
    +ratingEditDeadline({ submitted: true, submittedAt }),
    +new Date(submittedAt) + 7 * 86400000,
  );
});
test("progression settings change future game deltas without rewriting historical policy", () => {
  const p = config();
  p.progression.gainCap = 0;
  p.progression.inactivityEnabled = false;
  const stats = Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 50]));
  const game = {
    date: new Date("2026-10-02"),
    overall: 5,
    attack: 5,
    passing: 5,
    defense: 5,
    physical: 5,
    attitude: 5,
    outcome: 1,
    goalMargin: 2,
  };
  setPolicyDocument({
    timeline: [{ version: 1, effectiveAt: "2026-10-01", config: p }],
  });
  assert.equal(calculateGameDeltas(stats, game).pace, 0);
  assert.ok(
    calculateGameDeltas(stats, { ...game, date: new Date("2026-09-01") }).pace >
      0,
  );
  assert.equal(
    calculateInactivity("a", [], null, new Date("2026-10-02")).penalty,
    0,
  );
  setPolicyDocument(null);
});
test("calendar and collection periods reuse the existing calculators with immutable historical rules", () => {
  const p = config();
  p.cycle.openHour = 15;
  p.cycle.closeHour = 10;
  p.cycle.seasonMonths = 3;
  p.cycle.yearMonths = 6;
  setPolicyDocument({
    timeline: [{ version: 1, effectiveAt: "2026-01-01", config: p }],
  });
  const cycle = cardWeek(new Date("2026-10-16T12:00:00Z"));
  assert.equal(cycle.opensAt.getUTCHours(), 14);
  assert.equal(leaguePeriod(new Date("2026-10-16"), 2).id, "2026-E4-M3");
  assert.equal(leaguePeriod(new Date("2025-10-16"), 2).id, "2025-E5");
  setPolicyDocument(null);
});
