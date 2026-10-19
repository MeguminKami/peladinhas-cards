import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultStatQuery,
  normalizeStatQuery,
  statisticsRows,
  statisticsGames,
  filterStatRows,
  statisticsCSV,
  statNumber,
} from "../js/statistics-model.js";

const now = new Date("2026-10-19T12:00:00Z");
const game = (id, date, score, goals = [], assists = []) => ({
  id,
  status: "closed",
  scheduledAt: date,
  closedAt: date,
  teamA: { starters: ["a"], bench: ["c"] },
  teamB: { starters: ["b"], bench: [] },
  score: { teamA: score[0], teamB: score[1] },
  performance: { teamA: { goals, assists } },
});
const games = [
  game("old", "2026-08-01T12:00Z", [9, 3], ["a", "a", "a"]),
  game("one", "2026-10-01T12:00Z", [2, 0], ["a", "a"], ["c"]),
  game("two", "2026-10-18T12:00Z", [1, 3], ["c"], ["a"]),
  { ...game("open", "2026-10-02", [99, 99]), status: "open" },
  { ...game("deleted", "2026-10-02", [99, 99]), deleting: true },
  game("future", "2028-01-01", [99, 99]),
];
const league = {
  players: [
    {
      uid: "a",
      displayName: "João Ávila",
      primaryPosition: "ALA",
      hasCard: true,
      ovr: 78,
      stats: { physical: 81 },
    },
    { uid: "b", displayName: "Bruno", primaryPosition: "GR", hasCard: false },
    {
      uid: "c",
      displayName: "Carla",
      primaryPosition: "MED",
      hasCard: true,
      ovr: 80,
      stats: { physical: 90 },
    },
    { uid: "d", displayName: "Sem jogos", hasCard: false },
  ],
  games,
  summaries: [
    {
      id: "one",
      players: {
        a: {
          physical: 0,
          overall: 4,
          goalkeeping: 5,
          goalkeepingEligible: false,
          ratingCounts: { physical: 7, overall: 7, goalkeeping: 10 },
        },
        c: { physical: 5, ratingCounts: { physical: 3 } },
      },
    },
    {
      id: "two",
      players: {
        a: {
          physical: 4,
          overall: 2,
          ratingCounts: { physical: 1, overall: 1 },
        },
      },
    },
  ],
};

test("statistics recompute results from eligible matches, include benches and distinguish card values from ratings", () => {
  const query = { ...defaultStatQuery(), period: "30" },
    rows = statisticsRows(league, query, now),
    a = rows.find((row) => row.uid === "a"),
    c = rows.find((row) => row.uid === "c");
  assert.equal(a.played, 2);
  assert.equal(a.goals, 2);
  assert.equal(a.assists, 1);
  assert.equal(a.wins, 1);
  assert.equal(a.losses, 1);
  assert.equal(a.winRate, 50);
  assert.equal(a.goalsPerGame, 1);
  assert.equal(a.contributions, 3);
  assert.equal(a.ratingPhysical, 2);
  assert.equal(a.samples.ratingPhysical, 2);
  assert.equal(a.cardPhysical, 81);
  assert.equal(a.ovr, 78);
  assert.equal(a.ratingGoalkeeping, null);
  assert.equal(a.samples.ratingGoalkeeping, 0);
  assert.equal(a.form, 2.5); // game means: (0+4)/2 = 2, (4+2)/2 = 3; equal game weight
  assert.equal(c.played, 2);
  assert.equal(c.goals, 1);
  assert.equal(c.assists, 1);
  assert.equal(c.goalsFor, 3);
  assert.equal(c.cleanSheets, 1);
  const absent = rows.find((row) => row.uid === "d");
  assert.equal(absent.played, 0);
  assert.equal(absent.ratingPhysical, null);
  assert.equal(absent.goalsPerGame, null);
});
test("statistics sample thresholds, custom Lisbon days, periods and specific games share one scope", () => {
  const query = { ...defaultStatQuery(), period: "30", minVotes: 7 };
  assert.deepEqual(
    statisticsGames(
      [
        game("outside", "2026-03-02T12:00Z", [0, 0]),
        game("inside", "2026-03-03T12:00Z", [0, 0]),
      ],
      query,
      new Date("2026-03-31T23:15:00Z"),
    ).map((row) => row.id),
    ["inside"],
  );
  const a = statisticsRows(league, query, now)[0];
  assert.equal(a.ratingPhysical, 0);
  assert.equal(a.samples.ratingPhysical, 1);
  assert.equal(a.form, 2);
  assert.equal(
    statisticsGames(games, { ...query, gameId: "one" }, now).length,
    1,
  );
  assert.equal(
    statisticsGames(games, { ...query, gameId: "old" }, now).length,
    0,
  );
  assert.equal(
    statisticsGames(
      games,
      { ...query, period: "custom", from: "2026-10-18", to: "2026-10-18" },
      now,
    ).length,
    1,
  );
  const late = game("late", "2026-10-17T23:30Z", [0, 0]);
  assert.equal(
    statisticsGames(
      [late],
      { ...query, period: "custom", from: "2026-10-18", to: "2026-10-18" },
      now,
    ).length,
    1,
  );
});
test("statistics combine numeric clauses and accent-insensitive search; missing values stay last in both directions", () => {
  const query = { ...defaultStatQuery(), period: "30", sort: "ratingPhysical" },
    rows = statisticsRows(league, query, now);
  assert.equal(
    filterStatRows(rows, { ...query, search: "joao avila" })[0].uid,
    "a",
  );
  assert.deepEqual(
    filterStatRows(rows, {
      ...query,
      filters: [
        { metric: "played", operator: "gte", value: 2 },
        { metric: "ratingPhysical", operator: "gt", value: 3 },
      ],
    }).map((row) => row.uid),
    ["c"],
  );
  assert.deepEqual(
    filterStatRows(rows, {
      ...query,
      filters: [{ metric: "ratingGoalkeeping", operator: "lte", value: 5 }],
    }),
    [],
  );
  for (const direction of ["asc", "desc"])
    assert.ok(
      filterStatRows(rows, { ...query, direction })
        .slice(-2)
        .every((row) => row.ratingPhysical === null),
    );
});
test("statistics restore only valid query fields and export filtered visible values with spreadsheet injection protection", () => {
  const invalid = normalizeStatQuery({
    columns: ["__proto__", "constructor"],
    sort: "__proto__",
    filters: [
      { metric: "__proto__", operator: "gte", value: 1 },
      { metric: "played", operator: "__proto__", value: 1 },
    ],
  });
  assert.deepEqual(invalid.columns, ["played"]);
  assert.equal(invalid.sort, "goals");
  assert.deepEqual(invalid.filters, []);
  const query = normalizeStatQuery({
    columns: ["goals", "unknown", "goals"],
    sort: "unknown",
    position: "invalid",
    minVotes: 999,
    filters: [
      { metric: "played", operator: "gte", value: "2" },
      { metric: "fake", operator: "eq", value: 1 },
    ],
  });
  assert.deepEqual(query.columns, ["goals"]);
  assert.equal(query.sort, "goals");
  assert.equal(query.minVotes, 1);
  assert.equal(query.filters.length, 1);
  const csv = statisticsCSV(
    [{ name: '=CMD("x")', position: "GR", goals: 3, ratingPhysical: 4.125 }],
    ["ratingPhysical", "goals"],
  );
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"Físico · média";"Golos"'));
  assert.ok(csv.includes("'=CMD"));
  assert.ok(csv.includes('"4,13";"3"'));
  assert.equal(statNumber(0, "ratingPhysical"), "0,00");
  assert.equal(statNumber(null, "ratingPhysical"), "—");
});
