import test from "node:test";
import assert from "node:assert/strict";
import {
  activityCategory,
  groupActivities,
} from "../js/activity-categories.js";

test("activity categories distinguish votes, personal objectives, competitions and ratings", () => {
  for (const type of [
    "GAME_FEEDBACK",
    "RATE_NEW_PLAYER",
    "SELF_INITIAL_RATING",
  ])
    assert.equal(activityCategory({ type }), "rating");
  assert.equal(activityCategory({ type: "COMPLETE_PROFILE" }), "personal");
  assert.equal(activityCategory({ type: "OBJECTIVE_MISSION" }), "personal");
  assert.equal(
    activityCategory({ type: "COMPETITION_OBJECTIVE" }),
    "competition",
  );
  assert.equal(activityCategory({ type: "EVENT_VOTE" }), "vote");
  assert.equal(
    activityCategory({ kind: "mission", method: "objective" }),
    "personal",
  );
  assert.equal(activityCategory({ kind: "event", method: "vote" }), "vote");
  assert.equal(activityCategory({ kind: "monthly", method: "vote" }), "vote");
  assert.equal(
    activityCategory({ kind: "event", method: "manual" }),
    "competition",
  );
  assert.equal(activityCategory({ questions: [] }), "vote");
});

test("grouping preserves every item exactly once, stable order and future types", () => {
  const entries = [
    { type: "FUTURE" },
    { type: "RATE_NEW_PLAYER" },
    { type: "EVENT_VOTE" },
    { type: "GAME_FEEDBACK" },
  ];
  const groups = groupActivities(entries);
  assert.deepEqual(
    groups.map((g) => g.id),
    ["vote", "rating", "other"],
  );
  assert.deepEqual(groups[1].items, [entries[1], entries[3]]);
  assert.equal(groups.flatMap((g) => g.items).length, entries.length);
  assert.deepEqual(groups[2].items, [entries[0]]);
  assert.deepEqual(groupActivities([]), []);
});
