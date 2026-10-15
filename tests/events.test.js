import test from "node:test";
import assert from "node:assert/strict";
import {
  eventEndMillis,
  missionUnlockedAt,
  objectiveSummary,
  objectiveReachedAt,
  objectiveProgress,
  periodWindow,
  eventRanking,
  validEventReward,
  votingFlags,
} from "../js/event-model.js";
import { applyEventRewards } from "../js/event-rules.js";
const date = new Date("2026-10-20T12:00:00Z");
const event = {
  startsAt: "2026-10-01",
  endsAt: "2026-11-01",
  participantIds: ["a", "b", "c"],
  cadence: "once",
  method: "vote",
  votesPerUser: 2,
  minVotes: 1,
  tieBreak: "uid",
  objective: { metric: "games", target: 2 },
};
const game = (i, outcome, goals = 0, assists = 0) => ({
  id: String(i),
  status: "closed",
  closedAt: new Date(Date.UTC(2026, 9, i)),
  teamA: { starters: ["a"], bench: ["b"] },
  teamB: { starters: ["c"], bench: [] },
  score: {
    teamA: outcome < 0 ? 1 : outcome > 0 ? 2 : 1,
    teamB: outcome < 0 ? 2 : 1,
  },
  performance: {
    teamA: { goals: Array(goals).fill("a"), assists: Array(assists).fill("a") },
  },
});
test("objetivos: jogos, golos, assistências, vitórias e sequências verificadas", () => {
  const games = [
    game(1, 1, 2, 1),
    game(2, 0, 1, 2),
    game(3, 1, 3, 1),
    game(4, -1),
    game(5, 1),
    { ...game(6, 1, 99), status: "open" },
  ];
  for (const [metric, expected] of [
    ["games", 5],
    ["goals", 6],
    ["assists", 4],
    ["wins", 3],
    ["unbeatenWins", 2],
    ["winStreak", 1],
  ])
    assert.equal(
      objectiveProgress(
        "a",
        { ...event, objective: { metric, target: 1 } },
        games,
        date,
      ),
      expected,
    );
  assert.equal(objectiveProgress("outsider", event, games, date), 0);
  assert.equal(objectiveProgress("b", event, games, date), 5);
});
test("períodos renovam objetivos; jogos fora do período ou futuros não contam", () => {
  const mission = {
    ...event,
    cadence: "daily",
    startsAt: "2026-10-01T12:00:00Z",
  };
  assert.equal(periodWindow(mission, date).key, "period-19");
  assert.equal(
    objectiveProgress("a", mission, [game(1, 1), game(21, 1)], date),
    0,
  );
});
test("votos únicos, elegibilidade, desempates e contagem pública sem identidades", () => {
  const votes = [
    { id: "a", selections: ["b", "b", "c"], submittedAt: date },
    { id: "b", selections: ["a", "c"], submittedAt: date },
    { id: "outsider", selections: ["b"], submittedAt: date },
  ];
  const ranking = eventRanking(event, votes, [], [], date);
  assert.deepEqual(
    ranking.map((r) => [r.uid, r.votes]),
    [
      ["c", 2],
      ["a", 1],
      ["b", 1],
    ],
  );
  assert.equal(votingFlags(votes).length, 1);
  assert.ok(ranking.every((row) => !Object.hasOwn(row, "voterId")));
});
test("limites de recompensas, modalidades sem prestígio ou cosméticos", () => {
  const reward = {
    mode: "both",
    statDuration: "weekly",
    boosts: { shooting: 10, passing: 10 },
    specialId: "mvp",
  };
  assert.ok(validEventReward(reward));
  assert.ok(!validEventReward({ ...reward, boosts: { shooting: 11 } }));
  assert.ok(validEventReward({ ...reward, statDuration: "permanent" }));
  assert.ok(
    !validEventReward({
      mode: "recognition",
      statDuration: "weekly",
      boosts: {},
      badge: "Participante",
    }),
  );
  assert.ok(!validEventReward({ ...reward, mode: "card" }));
});
test("temporários expiram, permanentes persistem, anulações removem efeitos", () => {
  const base = { shooting: 60 };
  const ledger = [
    {
      uid: "a",
      schemaVersion: 2,
      startsAt: "2026-10-01",
      expiresAt: "2026-10-08",
      reward: {
        boosts: { shooting: 2 },
        statDuration: "permanent",
        badge: "Medalha",
        specialId: "mvp",
      },
    },
    {
      uid: "a",
      schemaVersion: 2,
      startsAt: "2026-10-01",
      expiresAt: "2026-10-22",
      reward: { boosts: { shooting: 8 }, statDuration: "weekly", points: 3 },
    },
    {
      uid: "a",
      schemaVersion: 2,
      startsAt: "2026-10-01",
      expiresAt: "2026-10-22",
      revokedAt: "2026-10-15",
      reward: { boosts: { shooting: 9 }, points: 99 },
    },
  ];
  const current = applyEventRewards(base, ledger, "a", date);
  assert.equal(current.stats.shooting, 70);
  assert.equal(current.specials.length, 0);
  assert.equal(
    applyEventRewards(base, ledger, "a", new Date("2026-11-01")).stats.shooting,
    62,
  );
});

test("missão terminada preserva a janela final, sem saltar para períodos futuros", () => {
  const mission = {
    ...event,
    cadence: "weekly",
    startsAt: "2026-10-01T00:00:00Z",
    endsAt: "2026-10-08T00:00:00Z",
  };
  assert.equal(periodWindow(mission, new Date("2026-11-20")).key, "period-0");
  assert.equal(
    objectiveProgress("a", mission, [game(3, 1)], new Date("2026-11-20")),
    1,
  );
});

test("indefinite missions keep counting and prerequisites use completion dates", () => {
  const mission = {
    ...event,
    kind: "mission",
    method: "objective",
    indefinite: true,
    endsAt: null,
    prerequisites: { mode: "all", missionIds: ["first", "second"] },
  };
  const completions = [
    {
      uid: "a",
      eventId: "first",
      periodKey: "once",
      completedAt: "2026-10-02",
      expiresAt: "2026-10-03",
    },
    {
      uid: "a",
      eventId: "second",
      periodKey: "once",
      completedAt: "2026-10-04",
    },
  ];
  assert.equal(eventEndMillis(mission), Infinity);
  assert.equal(periodWindow(mission, date).end, null);
  assert.equal(missionUnlockedAt(mission, "b", completions), null);
  assert.equal(
    +missionUnlockedAt(mission, "a", completions),
    +new Date("2026-10-04"),
  );
  assert.equal(
    +missionUnlockedAt(
      { ...mission, prerequisites: { ...mission.prerequisites, mode: "any" } },
      "a",
      completions,
    ),
    +new Date("2026-10-02"),
  );
  assert.equal(
    missionUnlockedAt(mission, "a", [
      ...completions.slice(0, 1),
      { ...completions[1], revokedAt: "2026-10-05" },
    ]),
    null,
  );
  const ranking = eventRanking(
    mission,
    [],
    [game(1, 1), game(5, 1)],
    [],
    date,
    completions,
  );
  assert.equal(ranking.find((row) => row.uid === "a").progress, 1);
  assert.equal(
    objectiveProgress("a", mission, [game(25, 1)], new Date("2027-01-01")),
    1,
  );
});

test("permanent rewards accumulate up to ten per attribute", () => {
  const ledger = Array.from({ length: 6 }, (_, index) => ({
    id: `permanent-${index}`,
    uid: "a",
    schemaVersion: 2,
    startsAt: "2026-10-01",
    expiresAt: "2026-10-08",
    reward: { statDuration: "permanent", boosts: { shooting: 2, passing: 1 } },
  }));
  const stats = applyEventRewards(
    { shooting: 60, passing: 60 },
    ledger,
    "a",
    date,
  ).stats;
  assert.equal(stats.shooting, 70);
  assert.equal(stats.passing, 66);
});

test("mission objectives describe real goals with natural singular and plural", () => {
  const describe = (metric, target, scope = "individual") =>
    objectiveSummary({ objective: { metric, target }, scope });
  assert.equal(describe("goals", 5), "Marca 5 golos.");
  assert.equal(describe("goals", 1), "Marca 1 golo.");
  assert.equal(describe("assists", 1), "Faz 1 assistência.");
  assert.equal(describe("games", 2), "Participa em 2 jogos.");
  assert.equal(describe("wins", 3), "Ganha 3 jogos.");
  assert.equal(describe("winStreak", 3), "Ganha 3 jogos seguidos.");
  assert.equal(
    describe("unbeatenWins", 2),
    "Consegue 2 vitórias numa sequência sem derrotas.",
  );
  assert.equal(
    describe("goals", 5, "collective"),
    "Objetivo coletivo: marcar 5 golos.",
  );
});

test("permanent rewards have only a per-attribute limit", () => {
  const reward = {
    mode: "stats",
    statDuration: "permanent",
    boosts: { shooting: 10, passing: 10, dribbling: 10 },
  };
  assert.ok(validEventReward(reward));
  assert.ok(!validEventReward({ ...reward, boosts: { shooting: 11 } }));
  assert.ok(!validEventReward({ ...reward, points: 5 }));
  assert.ok(!validEventReward({ ...reward, badge: "Test" }));
});

test("competition ranks first completion ahead of later higher totals", () => {
  const race = {
    ...event,
    kind: "event",
    method: "objective",
    objective: { metric: "goals", target: 2 },
  };
  const early = game(2, 1, 2),
    later = game(3, 1);
  later.performance.teamA.goals = ["b", "b", "b"];
  const ranking = eventRanking(race, [], [later, early], [], date);
  assert.equal(ranking[0].uid, "a");
  assert.equal(ranking[1].uid, "b");
  assert.equal(ranking[1].progress, 3);
  assert.equal(
    objectiveReachedAt("a", race, [later, early], date),
    "2026-10-02T00:00:00.000Z",
  );
  assert.equal(objectiveReachedAt("c", race, [later, early], date), null);
});

test("new objectives count contributions, unbeaten games and clean sheets", () => {
  const games = [
    game(1, 1, 2, 1),
    game(2, 0, 1, 2),
    game(3, 1, 3, 1),
    game(4, -1),
  ];
  games[0].score.teamB = 0;
  for (const [metric, expected] of [
    ["goalsAndAssists", 10],
    ["unbeatenGames", 3],
    ["cleanSheets", 1],
  ])
    assert.equal(
      objectiveProgress(
        "a",
        { ...event, objective: { metric, target: 1 } },
        games,
        date,
      ),
      expected,
    );
});

test("missões coletivas contam os totais de cada equipa uma vez", () => {
  const match = game(5, 1, 1, 1);
  match.teamA.starters.push("outside");
  match.score.teamA = 4;
  match.performance.teamA.assists.push("outside", "outside");
  for (const [metric, expected] of [
    ["goals", 4],
    ["assists", 3],
    ["goalsAndAssists", 7],
    ["wins", 1],
  ]) {
    const mission = {
      ...event,
      kind: "mission",
      method: "objective",
      scope: "collective",
      participantIds: ["a", "b"],
      objective: { metric, target: 10 },
    };
    assert.deepEqual(
      eventRanking(mission, [], [match], [], date).map((row) => row.progress),
      [expected, expected],
    );
    assert.equal(
      eventRanking(
        { ...mission, participantIds: ["b"] },
        [],
        [match],
        [],
        date,
      )[0].progress,
      expected,
    );
  }
  const bothSides = {
    ...event,
    kind: "mission",
    method: "objective",
    scope: "collective",
    objective: { metric: "wins", target: 10 },
  };
  assert.ok(
    eventRanking(bothSides, [], [match], [], date).every(
      (row) => row.progress === 1,
    ),
  );
});
