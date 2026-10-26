import test from "node:test";
import assert from "node:assert/strict";
import {
  eligibleCommunityRating,
  communityReviewNotice,
} from "../functions/community-rating-policy.js";
import { ATTRIBUTES } from "../js/utils.js";
import { canEditRating } from "../js/rating-window.js";

const vote = (n) => ({
  submitted: true,
  ratings20: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, n])),
});
test("community exclusion uses the complete mean on the 0–20 scale and includes the boundary", () => {
  for (const n of [0, 1, 1.8999])
    assert.equal(eligibleCommunityRating(vote(n)), false);
  for (const n of [1.9, 2, 15, 20])
    assert.equal(eligibleCommunityRating(vote(n)), true);
  assert.equal(
    eligibleCommunityRating({ ...vote(10), submitted: false }),
    false,
  );
  const partial = vote(20);
  delete partial.ratings20.goalkeeping;
  assert.equal(eligibleCommunityRating(partial), false);
  const mixed = vote(0);
  mixed.ratings20.pace = 20;
  mixed.ratings20.passing = 3;
  assert.equal(eligibleCommunityRating(mixed), true);
});
test("public messages never disclose the threshold or numerical reason", () => {
  for (const state of ["required", "ignored", "accepted"]) {
    const message = communityReviewNotice("Cabeça", state);
    assert.ok(message.body.includes("Cabeça"));
    assert.doesNotMatch(message.body, /1[.,]9|média|mínimo|baixa/i);
  }
});
test("review deadline is independent of original submission and final submission is locked", () => {
  const now = new Date("2026-10-26T12:00:00Z");
  const row = {
    submitted: true,
    submittedAt: new Date("2026-10-01"),
    reviewState: "required",
    reviewAttempts: 1,
    reviewDeadline: new Date("2026-11-02"),
  };
  assert.equal(canEditRating(row, now), true);
  assert.equal(
    canEditRating({ ...row, reviewAttempts: 2, reviewState: "accepted" }, now),
    false,
  );
  assert.equal(canEditRating({ ...row, reviewState: "ignored" }, now), false);
  assert.equal(canEditRating(row, new Date("2026-11-03")), false);
});
