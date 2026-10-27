import { test } from "node:test";
import assert from "node:assert/strict";
import { fresh, start, act, deck } from "../src/engine";
import { presentationSteps } from "../src/presentation";
test("an incoming decision resumes from the last visible card without skipping the deal", () => {
  const round = start(fresh(), [100, 100, 0, 0, 0], deck());
  const steps = presentationSteps(null, round.round!);
  const visible = steps[2].round;
  const next = act(round, {
    round: round.round!.id,
    revision: round.round!.revision,
    hand: round.round!.active!,
    action: "stand",
  });
  const rest = presentationSteps(visible, next.round!);
  assert.deepEqual(
    rest.slice(0, steps.length - 3).map((s) => s.card?.id),
    steps.slice(3).map((s) => s.card?.id),
  );
  assert.ok(visible.events.length < round.round!.events.length);
  assert.ok(rest.length >= steps.length - 3);
});
