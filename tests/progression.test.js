import test from "node:test";
import assert from "node:assert/strict";
import {
  ATTRIBUTES,
  FEEDBACK,
  calculateGameDeltas,
  calculatePlayerStats,
  calculatePlayerStatsDetails,
  matchEvolutionContext,
  matchGoalMargin,
  matchOutcome,
  performanceBonuses,
} from "../js/utils.js";
import { progressionScenario } from "../scripts/simulate-evolution.mjs";
const all = (value) =>
  Object.fromEntries(ATTRIBUTES.map(([key]) => [key, value]));
const rating = (value) =>
  Object.fromEntries(
    FEEDBACK.map(([key]) => [key, key === "goalkeeping" ? null : value]),
  );
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test("calibração real: 60 → 88 entre 9 e 13 jogos; desacelera depois", () => {
  const rows = progressionScenario();
  assert.deepEqual(
    [5, 10, 11, 18, 30].map((n) => rows[n].ovr),
    [74, 85, 87, 91, 94],
  );
  assert.equal(rows.find((r) => r.ovr >= 88).games, 12);
  assert.equal(rows[30].wins, 21);
  assert.ok(rows[30].ovr - rows[18].ovr < rows[5].ovr - rows[0].ovr);
});

test("médias por dimensão excluem o próprio, incluem suplentes e ignoram N/A", () => {
  const game = {
    status: "closed",
    teamA: { starters: ["a", "b"], bench: ["sub"] },
    teamB: { starters: ["c"], bench: [] },
    score: { teamA: 7, teamB: 5 },
  };
  const context = matchEvolutionContext(
    "a",
    game,
    { a: rating(5), b: rating(3), sub: rating(4), c: rating(2) },
    { playerOvr: { a: 60, b: 70, sub: 80, c: 40 } },
  );
  assert.equal(context.teamRatings.attack, 3.5);
  assert.equal(context.opponentRatings.attack, 2);
  assert.equal(context.teamRatings.goalkeeping, null);
  assert.equal(context.teamOvr, 75);
  assert.equal(matchEvolutionContext("a", game).teamOvr, null);
  assert.equal(matchGoalMargin("sub", game), 2);
  assert.equal(matchGoalMargin("c", game), -2);
  assert.equal(matchGoalMargin("outsider", game), 0);
  assert.equal(matchGoalMargin("a", { ...game, status: "open" }), 0);
  assert.equal(matchOutcome("sub", game), 1);
});

test("vitória estagna só as dimensões fracas; sem avaliação não há crescimento", () => {
  const delta = calculateGameDeltas(all(60), {
    ...rating(4),
    attack: 2,
    outcome: 1,
    goals: 10,
    teamRatings: rating(4),
  });
  assert.equal(delta.shooting, 0);
  assert.equal(delta.dribbling, 0);
  assert.ok(delta.passing > 0);
  assert.equal(delta.goalkeeping, null);
  assert.ok(
    Object.values(calculateGameDeltas(all(60), { outcome: 1, goals: 5 })).every(
      (x) => x === null,
    ),
  );
  const edge = calculateGameDeltas(all(60), {
    ...rating(2.5),
    outcome: 1,
    teamRatings: rating(3),
  });
  assert.ok(edge.pace > 0);
});

test("boost baixo e recuperação premiam performance superior, só nos ganhos", () => {
  const feedback = {
    ...rating(3.5),
    teamRatings: rating(3.3),
    opponentRatings: rating(3.3),
  };
  const low = calculateGameDeltas(all(60), feedback);
  const high = calculateGameDeltas(all(74), feedback);
  assert.ok(low.pace > high.pace);
  assert.ok(
    calculateGameDeltas(all(60), { ...feedback, teamOvr: 70 }).pace > low.pace,
  );
  close(
    calculateGameDeltas(all(60), { ...feedback, teamOvr: 50 }).pace,
    low.pace,
  );
  const equal = { ...rating(3.5), teamRatings: rating(3.5) };
  close(
    calculateGameDeltas(all(60), equal).pace,
    calculateGameDeltas(all(60), { ...equal, teamOvr: 90 }).pace,
  );
  for (const ovr of [60, 90]) {
    const bad = {
      ...rating(0),
      outcome: -1,
      goalMargin: -20,
      teamRatings: rating(5),
      teamOvr: 99,
    };
    close(calculateGameDeltas(all(ovr), bad).pace, ovr < 85 ? -0.315 : -0.45);
  }
});

test("referências das duas equipas e valor absoluto têm influência independente", () => {
  const base = {
    ...rating(3.5),
    teamRatings: rating(3.5),
    opponentRatings: rating(3.5),
  };
  const normal = calculateGameDeltas(all(80), base).pace;
  assert.ok(
    calculateGameDeltas(all(80), { ...base, teamRatings: rating(3) }).pace >
      normal,
  );
  assert.ok(
    calculateGameDeltas(all(80), { ...base, opponentRatings: rating(3) }).pace >
      normal,
  );
  assert.ok(
    calculateGameDeltas(all(80), {
      ...rating(4),
      teamRatings: rating(4),
      opponentRatings: rating(4),
    }).pace > normal,
  );
  close(calculateGameDeltas(all(80), rating(3.5)).pace, normal);
});

test("margens e ações individuais beneficiam vencedores, com limites", () => {
  const feedback = { ...rating(3), outcome: 1 };
  assert.ok(
    calculateGameDeltas(all(80), { ...feedback, goalMargin: 2 }).pace >
      calculateGameDeltas(all(80), feedback).pace,
  );
  close(
    calculateGameDeltas(all(80), { ...feedback, goalMargin: 100 }).pace,
    calculateGameDeltas(all(80), { ...feedback, goalMargin: 5 }).pace,
  );
  const losing = { ...rating(4), outcome: -1 };
  assert.ok(
    calculateGameDeltas(all(80), { ...losing, goalMargin: -5 }).pace <
      calculateGameDeltas(all(80), losing).pace,
  );
  close(
    calculateGameDeltas(all(80), { ...losing, goalMargin: -100 }).pace,
    calculateGameDeltas(all(80), { ...losing, goalMargin: -6 }).pace,
  );
  assert.ok(calculateGameDeltas(all(80), losing).pace > 0);
  const bonus = performanceBonuses({ goals: 3, assists: 2 });
  close(bonus.shooting, 0.54375);
  close(bonus.passing, 0.435);
  close(bonus.dribbling, 0.3625);
  const capped = performanceBonuses({
    goals: 999,
    assists: 999,
    outcome: 1,
    goalMargin: 100,
  });
  close(capped.shooting, 1.125);
  close(capped.passing, 1.125);
  close(capped.dribbling, 0.75);
});

test("tetos por atributo, limite 99 e qualificação para crescer acima de 90", () => {
  const great = {
    ...rating(5),
    outcome: 1,
    teamRatings: rating(4),
    opponentRatings: rating(4),
  };
  for (const [stat, cap] of [
    [60, 4],
    [75, 2.8],
    [85, 1.6],
    [90, 0.48],
  ])
    assert.ok(calculateGameDeltas(all(stat), great).pace <= cap + 1e-10);
  const equal = {
    ...rating(5),
    outcome: 1,
    teamRatings: rating(5),
    opponentRatings: rating(5),
  };
  assert.equal(calculateGameDeltas(all(90), equal).pace, 0);
  assert.ok(calculateGameDeltas(all(90), { ...equal, goals: 3 }).shooting > 0);
  assert.equal(calculateGameDeltas(all(99), great).pace, 0);
  assert.equal(
    calculateGameDeltas(all(0), { ...rating(0), outcome: -1 }).pace,
    0,
  );
});

test("replay cronológico determinista, decimais e detalhe auditável", () => {
  const games = [
    { ...rating(3.4), outcome: 1, date: new Date("2026-01-02"), gameId: "b" },
    { ...rating(4), outcome: -1, date: new Date("2026-01-01"), gameId: "a" },
  ];
  const initial = all((60 * 20) / 99);
  assert.deepEqual(
    calculatePlayerStats(initial, games),
    calculatePlayerStats(initial, [...games].reverse()),
  );
  const detail = calculatePlayerStatsDetails(initial, games);
  assert.deepEqual(detail.stats, calculatePlayerStats(initial, games));
  for (const row of detail.rows)
    close(
      row.baseline + row.contributions.reduce((a, b) => a + b, 0),
      row.exact,
    );
  assert.ok(detail.rows.some((row) => row.exact % 1 !== 0));
  assert.equal(detail.stats.goalkeeping, 60);
  assert.deepEqual(calculatePlayerStats(initial, []), all(60));
});

test("+4 abaixo de 75 é reservado à excelência absoluta e relativa", () => {
  const normal = {
    ...rating(4),
    outcome: 1,
    goalMargin: 2,
    teamRatings: rating(3.8),
    opponentRatings: rating(3.8),
    teamOvr: 70,
  };
  close(calculateGameDeltas(all(60), normal).pace, 3);
  const exceptional = {
    ...normal,
    ...rating(5),
    teamRatings: rating(4.5),
    opponentRatings: rating(4.5),
  };
  close(calculateGameDeltas(all(60), exceptional).pace, 4);
  const improving = {
    ...normal,
    ...rating(4.5),
    teamRatings: rating(4),
    opponentRatings: rating(4),
  };
  const gain = calculateGameDeltas(all(60), improving).pace;
  assert.ok(gain > 3 && gain < 4);
  close(
    calculateGameDeltas(all(60), {
      ...exceptional,
      teamRatings: rating(5),
      opponentRatings: rating(5),
    }).pace,
    3,
  );
});
