import {
  permanentCardValues,
  weeklyComparison,
} from "../js/weekly-comparison.js";
import { applyEventRewards } from "../js/event-rules.js";
import { calculateOverallDetails } from "../js/utils.js";
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
import { calculatePlayerCard } from "../js/player-calculation.js";
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

test("cálculo da carta: base e jogos elegíveis, sem dependência de cartas semanais", () => {
  const date = new Date("2026-10-23T12:00Z");
  const base = {
    uid: "a",
    initial: all(12),
    community: { count: 1, ratings20: all(12) },
    position: "ALA",
    date,
  };
  const first = calculatePlayerCard(base);
  assert.ok(Object.values(first.stats).every((value) => value === 59));
  assert.equal(first.ovr, 59);
  assert.deepEqual(
    calculatePlayerCard({ ...base, date: new Date("2026-11-05T12:00Z") }).stats,
    first.stats,
  );
  const game = {
    id: "one",
    status: "closed",
    closedAt: new Date("2026-10-22T12:00Z"),
    teamA: { starters: ["a"], bench: [] },
    teamB: { starters: ["b"], bench: [] },
    score: { teamA: 1, teamB: 0 },
  };
  const aggregate = {
    ...rating(5),
    gameId: game.id,
    date: game.closedAt,
    outcome: 1,
    teamRatings: rating(3),
    opponentRatings: rating(3),
  };
  const played = calculatePlayerCard({
    ...base,
    games: [game],
    aggregates: [aggregate],
  });
  assert.ok(played.ovr > first.ovr);
  assert.deepEqual(
    calculatePlayerCard({ ...base, games: [game], aggregates: [aggregate] }),
    played,
    "Reloading must not apply improvements twice",
  );
  for (const invalid of [
    { ...game, deleting: true },
    { ...game, status: "open" },
    { ...game, closedAt: new Date("2026-10-30") },
    { ...game, teamA: { starters: ["outsider"], bench: [] } },
  ]) {
    assert.deepEqual(
      calculatePlayerCard({
        ...base,
        games: [invalid],
        aggregates: [aggregate],
      }).stats,
      first.stats,
    );
  }
  const changedBase = calculatePlayerCard({ ...base, initial: all(0) });
  assert.ok(
    changedBase.ovr < first.ovr,
    "Self-rating edits change the base even without a game",
  );
  const newCommunity = calculatePlayerCard({
    ...base,
    community: { count: 2, ratings20: all(16) },
  });
  assert.ok(
    newCommunity.ovr > first.ovr,
    "Community edits change the base even without a game",
  );
});

test("cálculo da carta: recompensas somadas uma vez e expiração sem apagar melhorias", () => {
  const date = new Date("2026-10-23T12:00Z");
  const game = {
    id: "one",
    status: "closed",
    closedAt: new Date("2026-10-22"),
    teamA: { starters: ["a"], bench: [] },
    teamB: { starters: ["b"], bench: [] },
    score: { teamA: 1, teamB: 0 },
  };
  const input = {
    uid: "a",
    initial: all(12),
    position: "AV",
    date,
    games: [game],
    aggregates: [
      { ...rating(5), gameId: game.id, date: game.closedAt, outcome: 1 },
    ],
  };
  const unboosted = calculatePlayerCard(input);
  const reward = {
    uid: "a",
    schemaVersion: 2,
    createdAt: new Date("2026-10-22"),
    startsAt: new Date("2026-10-22"),
    expiresAt: new Date("2026-10-29"),
    reward: { statDuration: "weekly", boosts: { shooting: 4 } },
  };
  const boosted = calculatePlayerCard({ ...input, rewards: [reward] });
  assert.equal(boosted.stats.shooting, unboosted.stats.shooting + 4);
  assert.deepEqual(boosted.rawStats, unboosted.rawStats);
  const expired = calculatePlayerCard({
    ...input,
    rewards: [reward],
    date: new Date("2026-10-30"),
  });
  assert.deepEqual(expired.stats, unboosted.stats);
});

const weeklyReward = (
  statDuration,
  boosts,
  startsAt = "2026-10-20T12:00Z",
) => ({
  uid: "a",
  schemaVersion: 2,
  createdAt: startsAt,
  startsAt,
  expiresAt: "2026-10-27T12:00Z",
  reward: { statDuration, boosts },
});
function comparisonSnapshot(value, date, rewards = [], position = "AV") {
  const gameStats = all(value),
    applied = applyEventRewards(gameStats, rewards, "a", new Date(date));
  const ovrCalculation = calculateOverallDetails(
    applied.stats,
    undefined,
    position,
    { missed: 4, penalty: 2 },
  );
  return {
    uid: "a",
    gameStats,
    stats: applied.stats,
    eventBoosts: applied.boosts,
    ovr: ovrCalculation.ovr,
    ovrCalculation,
    sourceCutoffDate: date,
  };
}
test("comparação semanal ignora a entrada, expiração e renovação de bónus temporários", () => {
  const rewards = [weeklyReward("weekly", all(5))];
  const previous = comparisonSnapshot(80, "2026-10-22T12:00Z", rewards);
  const current = comparisonSnapshot(82, "2026-10-29T12:00Z", rewards);
  assert.equal(previous.stats.pace, 85);
  assert.equal(current.stats.pace, 82);
  const result = weeklyComparison(current, previous, {
    rewards,
    uid: "a",
    date: new Date("2026-10-29T12:00Z"),
  });
  assert.equal(result.permanentStats.pace - result.previousStats.pace, 2);
  assert.equal(result.ovrDelta, 2);
  const unchanged = weeklyComparison(
    comparisonSnapshot(80, "2026-10-29T12:00Z", rewards),
    previous,
    { rewards, uid: "a" },
  );
  assert.equal(unchanged.ovrDelta, 0);
  assert.deepEqual(unchanged.permanentStats, unchanged.previousStats);
  const renewal = [
    ...rewards,
    weeklyReward("weekly", all(3), "2026-10-28T12:00Z"),
  ];
  const renewed = weeklyComparison(
    comparisonSnapshot(80, "2026-10-29T12:00Z", renewal),
    previous,
    { rewards: renewal, uid: "a" },
  );
  assert.equal(renewed.ovrDelta, 0);
  const entry = weeklyComparison(
    previous,
    comparisonSnapshot(80, "2026-10-15T12:00Z"),
    { rewards, uid: "a" },
  );
  assert.equal(entry.ovrDelta, 0);
});
test("comparação semanal mantém recompensas permanentes na data de cada carta e respeita o limite 99", () => {
  const rewards = [
    weeklyReward("weekly", all(5)),
    weeklyReward("permanent", all(1), "2026-10-28T12:00Z"),
  ];
  const previous = comparisonSnapshot(97, "2026-10-22T12:00Z", rewards);
  const current = comparisonSnapshot(98, "2026-10-29T12:00Z", rewards);
  const result = weeklyComparison(current, previous, {
    rewards,
    uid: "a",
    date: new Date("2026-10-29T12:00Z"),
  });
  assert.equal(previous.stats.pace, 99);
  assert.equal(result.previousStats.pace, 97);
  assert.equal(result.permanentStats.pace, 99);
  assert.equal(result.ovrDelta, 2);
  assert.equal(result.permanentOvr, 97, "Mantém a penalização por inatividade");
});
test("comparação antiga sem dados seguros não inventa diferenças nem compara semanas com intervalos", () => {
  const boosted = { stats: all(99), eventBoosts: all(5), ovr: 99 };
  assert.deepEqual(permanentCardValues(boosted), { stats: null, ovr: null });
  const baseline = { stats: all(80), ovr: 80 };
  assert.deepEqual(permanentCardValues(baseline), { stats: all(80), ovr: 80 });
  const result = weeklyComparison(
    { ...baseline, weekId: "2026-W43" },
    { ...baseline, weekId: "2026-W41" },
  );
  assert.equal(result.previousStats, null);
  assert.equal(result.ovrDelta, null);
  const oldFormula = comparisonSnapshot(80, "2026-10-22T12:00Z", [
    weeklyReward("weekly", all(5)),
  ]);
  delete oldFormula.ovrCalculation;
  assert.equal(permanentCardValues(oldFormula).ovr, null);
  assert.equal(permanentCardValues(oldFormula).stats.pace, 80);
});

test("cartas antigas distinguem recompensas permanentes de bónus temporários sem metadados", () => {
  const permanent = weeklyReward("permanent", all(1));
  const old = {
    uid: "a",
    stats: all(81),
    ovr: 81,
    eventBoosts: all(1),
    sourceCutoffDate: "2026-10-22T12:00Z",
  };
  assert.equal(permanentCardValues(old, { rewards: [permanent] }).ovr, 81);
  const undocumented = {
    uid: "a",
    stats: all(99),
    ovr: 99,
    sourceCutoffDate: "2026-10-22T12:00Z",
  };
  assert.equal(
    permanentCardValues(undocumented, {
      rewards: [weeklyReward("weekly", all(5))],
    }).stats,
    null,
  );
});
