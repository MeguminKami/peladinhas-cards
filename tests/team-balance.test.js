import test from "node:test";
import assert from "node:assert/strict";
import {
  balancedTeams,
  teamBalance,
  balanceSignature,
  balanceMatches,
} from "../js/team-balance.js";
import { participants } from "../js/utils.js";
const random = (seed) => () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const players = (values) =>
  values.map((ovr, i) => ({ uid: String(i), ovr, hasCard: true }));
test("sorteio: variedade real, equipas equilibradas, sem duplicados e titulares limitados", () => {
  const roster = players([99, 90, 85, 80, 75, 70, 65, 60, 55, 50]);
  const variations = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    const game = balancedTeams(roster, { random: random(seed) });
    assert.equal(game.teamA.starters.length, 5);
    assert.equal(game.teamB.starters.length, 5);
    assert.deepEqual(
      participants(game).sort(),
      roster.map((p) => p.uid).sort(),
    );
    assert.ok(teamBalance(game, roster).difference <= 1.8);
    variations.add(balanceSignature(game));
  }
  assert.ok(variations.size >= 4);
  const first = balancedTeams(players([70, 70, 70, 70]), { random: random(1) });
  const next = balancedTeams(players([70, 70, 70, 70]), {
    random: random(2),
    previous: balanceSignature(first),
  });
  assert.notEqual(balanceSignature(first), balanceSignature(next));
  for (const count of [2, 11, 13, 60]) {
    const roster = players(Array.from({ length: count }, () => 70));
    const game = balancedTeams(roster, { random: random(count) });
    assert.ok(
      game.teamA.starters.length <= 5 && game.teamB.starters.length <= 5,
    );
    assert.equal(participants(game).length, count);
    assert.equal(new Set(participants(game)).size, count);
    assert.ok(
      Math.abs(
        game.teamA.starters.length +
          game.teamA.bench.length -
          game.teamB.starters.length -
          game.teamB.bench.length,
      ) <= 1,
    );
  }
  assert.throws(() => balancedTeams(players([70])));
  assert.throws(() =>
    balancedTeams([
      { uid: "x", hasCard: false, ovr: 0 },
      { uid: "y", ovr: 90 },
    ]),
  );
});
test("equilíbrio: média com suplentes, desvio, simetria, escala e limites", () => {
  const g = {
    teamA: { starters: ["0"], bench: ["1"] },
    teamB: { starters: ["2"], bench: [] },
  };
  const b = teamBalance(g, players([50, 70, 70]));
  assert.equal(b.teamA.average, 60);
  assert.equal(b.teamA.startersAverage, 50);
  assert.equal(b.difference, 10);
  assert.equal(b.meanDeviation, 5);
  const missing = teamBalance(g, players([70, 70]));
  assert.equal(missing.complete, false);
  const frozen = {
    ...b,
    signature: balanceSignature(g),
    closedAt: { seconds: 100 },
  };
  const closed = { ...g, status: "closed", closedAt: { seconds: 100 } };
  assert.equal(balanceMatches(closed, frozen), true);
  assert.equal(
    balanceMatches(
      { ...closed, teamA: { starters: ["0"], bench: [] } },
      frozen,
    ),
    false,
  );
});
