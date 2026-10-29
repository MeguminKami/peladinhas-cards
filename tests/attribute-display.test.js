import test from "node:test";
import assert from "node:assert/strict";
import { cardStatsMarkup } from "../js/card-player-content.js";
import { weeklyEvolution } from "../js/cards.js";

for (const [previous, current, direction] of [
  [73.8, 74.2, null],
  [73.49, 73.51, "positive"],
  [74.51, 74.49, "negative"],
  [68.6095, 70, "positive"],
]) {
  test(`Attribute display compares integers: ${previous} to ${current}`, () => {
    const player = { hasCard: true, ovrDelta: 0, stats: { pace: Math.round(current) }, permanentStats: { pace: current }, previousStats: { pace: previous } };
    const markup = cardStatsMarkup(player);
    const summary = weeklyEvolution(player);
    assert.equal(markup.includes("card-stat-trend"), direction !== null);
    if (direction) assert.ok(markup.includes(`card-stat-trend ${direction}`));
    assert.equal(summary.includes("1 atributos"), direction !== null);
    assert.equal(player.permanentStats.pace, current);
    assert.equal(player.previousStats.pace, previous);
  });
}
