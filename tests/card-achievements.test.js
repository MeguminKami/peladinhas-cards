import {
  evaluateCardAchievements,
  periodCardAwards,
} from "../functions/card-unlock-rules.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  availableCardAchievements,
  mergeCardAchievements,
  cardExpiry,
  leaguePeriod,
  validCardSelection,
  gameCardContext,
  availableSpecials,
  CARD_POLICY,
} from "../js/card-achievements.js";
import { applyEventRewards, candidatesFor } from "../js/event-rules.js";
const end = new Date("2026-10-31T12:00Z");
const games = (n, overrides = {}) =>
  Array.from({ length: n }, (_, i) => ({
    gameId: `g${i}`,
    date: new Date(Date.UTC(2026, 8, 1 + i * 2, 12)),
    count: 3,
    overall: 4,
    attack: 4,
    passing: 4,
    defense: 4,
    physical: 4,
    attitude: 4,
    goalkeeping: null,
    goals: 0,
    assists: 0,
    outcome: 0,
    teamGoals: 6,
    conceded: 6,
    ...overrides,
  }));
const awards = (rows, options = {}) =>
  evaluateCardAchievements(rows, { date: end, ...options });
const has = (rows, id) => awards(rows).some((row) => row.id === id);

test("qualificação exige três avaliações; dados futuros e sem data não atribuem cartas", () => {
  assert.ok(has(games(2), "in-form"));
  assert.equal(has(games(2, { count: 2 }), "in-form"), false);
  assert.equal(
    has(games(2, { date: new Date("2027-01-01") }), "in-form"),
    false,
  );
  assert.equal(has(games(2, { date: null }), "in-form"), false);
  assert.equal(
    has(games(3, { passing: 5, ratingCounts: { passing: 2 } }), "playmaker"),
    false,
  );
});
test("prazos não reiniciam em replays; novas exibições podem renovar temporárias", () => {
  const first = awards(games(2)).find((row) => row.id === "in-form");
  assert.equal(first.duration, "weekly");
  assert.equal(first.expiresAt, "2026-09-10T12:00:00.000Z");
  assert.equal(
    availableCardAchievements([first], new Date(first.expiresAt)).length,
    0,
  );
  const replay = mergeCardAchievements([first], awards(games(2)));
  assert.equal(
    replay.find((row) => row.id === "in-form").expiresAt,
    first.expiresAt,
  );
  const renewed = mergeCardAchievements(replay, awards(games(3)));
  assert.equal(
    renewed.find((row) => row.id === "in-form").earnedAt,
    "2026-09-05T12:00:00.000Z",
  );
  assert.equal(validCardSelection("in-form", []), "base");
  assert.equal(validCardSelection("base", [first]), "base");
  const late = games(2, { evaluatedAt: "2026-09-08T13:00:00Z" });
  const awarded = awards(late).find((row) => row.id === "in-form");
  assert.equal(awarded.expiresAt, "2026-09-15T13:00:00.000Z");
  const extraVote = awards(
    late.map((row) => ({ ...row, evaluatedAt: "2026-09-09T13:00Z" })),
  );
  assert.equal(
    mergeCardAchievements([awarded], extraVote).find(
      (row) => row.id === "in-form",
    ).expiresAt,
    awarded.expiresAt,
  );
});
test("meses respeitam Lisboa, fim do mês, anos bissextos e horário de verão", () => {
  assert.equal(
    cardExpiry(new Date("2026-01-31T12:00Z"), "monthly").toISOString(),
    "2026-02-28T12:00:00.000Z",
  );
  assert.equal(
    cardExpiry(new Date("2028-01-31T12:00Z"), "monthly").toISOString(),
    "2028-02-29T12:00:00.000Z",
  );
  assert.equal(
    cardExpiry(new Date("2026-02-15T12:00Z"), "season").toISOString(),
    "2026-04-15T11:00:00.000Z",
  );
  assert.equal(
    cardExpiry(new Date("2026-09-15T11:00Z"), "year").toISOString(),
    "2027-01-15T12:00:00.000Z",
  );
  assert.equal(cardExpiry(end, "permanent"), null);
  const period = leaguePeriod(new Date("2026-10-15"), 2);
  assert.equal(period.id, "2026-E5");
  assert.equal(period.endsAt.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(leaguePeriod(end, 4).id, "2026-A3");
});
test("permanentes conservam prova e data; não substituem uma permanente por temporária", () => {
  const perfect = awards(games(3, { passing: 5 })).find(
    (row) => row.id === "perfect-five",
  );
  assert.ok(perfect);
  const saved = mergeCardAchievements(
    [perfect],
    awards(games(8, { passing: 5 })),
  );
  assert.equal(
    saved.find((row) => row.id === "perfect-five").earnedAt,
    perfect.earnedAt,
  );
  assert.equal(
    availableCardAchievements(saved, new Date("2030-01-01")).some(
      (row) => row.id === "perfect-five",
    ),
    true,
  );
  assert.equal(
    availableSpecials(
      [perfect],
      [{ ...perfect, duration: "weekly", expiresAt: end.toISOString() }],
      end,
    )[0].duration,
    "permanent",
  );
});
test("cartas ofensivas refletem jogos com doze golos e percentagens reais", () => {
  assert.ok(
    has(
      games(1, { overall: 4.5, goals: 4, assists: 2, teamGoals: 8 }),
      "supernova",
    ),
  );
  assert.equal(
    has(
      games(1, { overall: 4.5, goals: 4, assists: 2, teamGoals: 12 }),
      "supernova",
    ),
    false,
  );
  assert.equal(
    has(
      games(1, { overall: 4.5, goals: 4, assists: 2, teamGoals: 5 }),
      "supernova",
    ),
    false,
  );
  assert.ok(
    has(
      games(1, {
        overall: 4.5,
        goals: 2,
        assists: 1,
        teamGoals: 6,
        outcome: 1,
        teamOvrGap: 3,
      }),
      "fut-heroes",
    ),
  );
  assert.equal(
    has(
      games(1, {
        overall: 4.5,
        goals: 2,
        assists: 1,
        teamGoals: 7,
        outcome: 1,
        teamOvrGap: 3,
      }),
      "fut-heroes",
    ),
    false,
  );
  assert.ok(has(games(3, { goals: 3, attack: 4.3 }), "inferno"));
  assert.equal(has(games(3, { goals: 2, attack: 4.3 }), "inferno"), false);
  const broken = games(4, { goals: 3, attack: 4.5 });
  broken[1].goals = 0;
  assert.equal(has(broken, "inferno"), false);
});
test("posições não são inferidas do perfil atual; Glacial exige três jogos GR válidos", () => {
  assert.equal(has(games(4, { overall: 4.2 }), "shapeshifters"), false);
  const rows = games(4, { overall: 4 });
  rows.forEach((row, i) => (row.position = i < 2 ? "MED" : "DEF"));
  assert.ok(has(rows, "shapeshifters"));
  assert.ok(
    has(games(3, { position: "GR", goalkeeping: 4.5, conceded: 3 }), "glacial"),
  );
  assert.equal(
    has(games(3, { position: "GR", goalkeeping: 4.5, conceded: 4 }), "glacial"),
    false,
  );
  assert.equal(
    has(games(3, { goalkeeping: 5, conceded: 0 }), "glacial"),
    false,
  );
});
test("ICON, início promissor, regresso, evolução e sequências têm mérito estatístico", () => {
  const career = games(15);
  career[0].mvp = true;
  career[0].overall = 4.8;
  career[1].mvp = true;
  career[1].overall = 4.8;
  assert.ok(has(career, "icon"));
  assert.equal(has(games(15), "icon"), false);
  assert.ok(has(games(3), "otw"));
  assert.equal(has(games(3, { overall: 3.9 }), "otw"), false);
  const party = games(4);
  party[0].overall = 4.2;
  assert.ok(has(party, "fut-birthday"));
  assert.equal(has(games(5, { overall: 3.6 }), "fut-birthday"), false);
  const comeback = games(4);
  comeback[0].overall = 2.5;
  comeback[1].overall = 2.8;
  assert.ok(has(comeback, "aurora"));
  const growth = games(5, { progressionGain: 5 });
  assert.ok(
    awards(growth, { officialSince: growth[0].date }).some(
      (row) => row.id === "future-stars",
    ),
  );
  assert.equal(has(growth, "future-stars"), false);
  assert.ok(has(games(7, { outcome: 1 }), "dynasty"));
  assert.equal(has(games(7, { outcome: 1, overall: 3.9 }), "dynasty"), false);
  assert.ok(
    has(games(2, { outcome: 1, overall: 4.2, teamOvrGap: 3 }), "eclipse"),
  );
  assert.equal(
    has(games(2, { outcome: 1, overall: 4.2, teamOvrGap: null }), "eclipse"),
    false,
  );
});
test("prémios de ciclo exigem mínimos, posição e desempates; empates totais partilham prémio", () => {
  const period = leaguePeriod(new Date("2026-09-15"));
  const player = (uid, n, overall, passing = 4, ovr = 80) => ({
    uid,
    position: "MED",
    ovr,
    aggregates: games(n, { overall, passing }),
  });
  const ranked = periodCardAwards(
    [
      player("low-count", 5, 5),
      player("low-mean", 6, 3.9),
      player("a", 6, 4.2, 4.5),
      player("b", 6, 4.2, 4.6),
      player("c", 6, 4.2, 4.6),
    ],
    period,
  );
  assert.deepEqual(
    ranked.map((row) => row.uid),
    ["b", "c"],
  );
  assert.equal(ranked[0].duration, "year");
  assert.equal(ranked[0].id, "tots@2026-E5");
  assert.equal(
    periodCardAwards([player("a", 11, 5)], leaguePeriod(end, 4), "toty").length,
    0,
  );
  assert.equal(
    periodCardAwards([player("a", 12, 4.2)], leaguePeriod(end, 4), "toty")[0]
      .duration,
    "permanent",
  );
});
test("contexto usa médias completas de ambas equipas, posição registada e resultado", () => {
  const game = {
    teamA: { starters: ["a", "b"] },
    teamB: { starters: ["c", "d"] },
    score: { teamA: 8, teamB: 4 },
    positions: { a: "GR" },
  };
  assert.equal(gameCardContext("a", game).teamOvrGap, null);
  const context = gameCardContext("a", game, {
    playerOvr: { a: 75, b: 75, c: 80, d: 80 },
  });
  assert.equal(context.teamOvrGap, 5);
  assert.equal(context.position, "GR");
  assert.equal(context.conceded, 4);
});
test("cartas de eventos seguem duração da identidade sem alterar validade das stats", () => {
  const start = new Date("2026-09-01T12:00Z");
  const row = {
    uid: "a",
    startsAt: start,
    createdAt: start,
    expiresAt: new Date("2026-10-01T12:00Z"),
    schemaVersion: 2,
    reward: {
      specialId: "mvp",
      boosts: { pace: 2 },
      statDuration: "monthly",
      cardDuration: "monthly",
    },
  };
  const applied = applyEventRewards(
    { pace: 60 },
    [row],
    "a",
    new Date("2026-09-09T12:00Z"),
  );
  assert.equal(applied.stats.pace, 62);
  assert.equal(applied.specials.length, 0);
  assert.equal(CARD_POLICY.futties.duration, "permanent");
  const users = ["a", "b", "c"].map((uid) => ({ uid }));
  assert.deepEqual(
    candidatesFor(
      { automaticCollectionVote: true },
      { candidateIds: ["b"] },
      users,
      [],
    ),
    ["b"],
  );
});
