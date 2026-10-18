import { matchComponentAverages, matchRatingSummary } from "../js/match-rating-summary.js";
import { defaultOvrPresets } from "../js/ovr-presets.js";
import { canEditRating, ratingEditDeadline } from "../js/rating-window.js";
import {
  monthlyCandidates,
  eventDeadline,
  applyEventRewards,
  validReward,
  votersFor,
  candidatesFor,
  eventOutcome,
} from "../js/event-rules.js";
import {
  CARD_SAFE_RECT,
  DEFAULT_CARD_OUTLINE,
  expandCardOutline,
} from "../js/card-geometry.js";
import { SPECIAL_CARD_DESIGNS } from "../js/card-specials.js";
import { card } from "../js/cards.js";
import { FUT_INSPIRED_EDITIONS } from "../js/card-fut-themes.js";
import {
  COLLECTION_EDITIONS,
  COLLECTION_THEME_IDS,
  RESERVED_COLLECTION_IDS,
} from "../js/card-collection.js";
import {
  validPhotoDesign,
  cardPhotoStyles,
  defaultPhotoDesign,
} from "../js/card-photo.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  ATTRIBUTES,
  THEMES,
  CATALOG_THEMES,
  informTheme,
  INFORM_THEMES,
  themeName,
  calculateInitialBaseline,
  initialSelfWeight,
  calculatePlayerStats,
  calculateOverall,
  calculateInactivity,
  calculateOverallDetails,
  DEFAULT_OVR_WEIGHTS,
  validOvrWeights,
  normalizeOvrWeights,
  calculateBaseCard,
  convert20To99,
  convert5To99,
  calculateGameAggregate,
  calculateSpecialCards,
  isoWeek,
  isoWeekEnd,
  calculateWeeklyTopPlayers,
  calculateMatchStats,
  matchPerformance,
  calculateGameDeltas,
  completeFeedback,
} from "../js/utils.js";
const ratings = (value) =>
  Object.fromEntries(ATTRIBUTES.map(([k]) => [k, value]));

test("Em Forma acompanha bronze, prata e ouro, incluindo cartas raras", () => {
  for (const [ovr, metal] of [
    [59, "bronze"],
    [60, "bronze"],
    [64, "bronze"],
    [65, "silver"],
    [70, "silver"],
    [74, "silver"],
    [75, "gold"],
    [85, "gold"],
  ]) {
    assert.equal(informTheme(calculateBaseCard(ovr), ovr), `in-form-${metal}`);
    assert.equal(informTheme(null, ovr), `in-form-${metal}`);
    for (const source of [
      { specials: [{ id: "in-form" }] },
      {
        specials: [{ id: "mvp" }, { id: "in-form", eventReward: true }],
        selectedCardId: "in-form",
      },
    ]) {
      const markup = card(
        { ...source, ovr, cardType: calculateBaseCard(ovr), stats: {} },
        { preview: true },
      );
      assert.ok(markup.includes(`in-form in-form-${metal}`));
    }
  }
  // A closed snapshot's base rarity wins over newer or inconsistent OVR data.
  assert.equal(informTheme("bronze-rare", 95), "in-form-bronze");
  for (const theme of INFORM_THEMES) {
    assert.ok(CATALOG_THEMES.includes(theme));
    assert.ok(
      card({ ovr: 82 }, { theme, preview: true }).includes(`in-form ${theme}`),
    );
  }
  assert.ok(validReward({ boosts: {}, specialId: "in-form" }));
});
test("edições do catálogo distinguem cartas ativas e designs em reserva", () => {
  assert.equal(COLLECTION_THEME_IDS.length, 19);
  assert.equal(new Set(COLLECTION_THEME_IDS.map(themeName)).size, 19);
  for (const id of COLLECTION_THEME_IDS) {
    assert.ok(CATALOG_THEMES.includes(id));
    assert.equal(THEMES.includes(id), !RESERVED_COLLECTION_IDS.includes(id));
    assert.equal(SPECIAL_CARD_DESIGNS[id], COLLECTION_EDITIONS[id]);
    assert.ok(COLLECTION_EDITIONS[id].art);
    assert.ok(
      themeName(id).includes(COLLECTION_EDITIONS[id].name) ||
        ["toty", "tots", "fut-birthday"].includes(id),
    );
    assert.equal(
      validReward({ boosts: {}, specialId: id }),
      !RESERVED_COLLECTION_IDS.includes(id),
    );
  }
  const earned = calculateSpecialCards(
    Array.from({ length: 6 }, () => ({
      overall: 5,
      mvp: true,
      passing: 5,
      attack: 5,
      defending: 5,
      physical: 5,
      goalkeeping: 5,
    })),
  );
  assert.ok(earned.every(({ id }) => !COLLECTION_THEME_IDS.includes(id)));
});

test("nove temas FUT têm silhuetas, gravuras e motivos próprios", () => {
  assert.deepEqual(Object.keys(FUT_INSPIRED_EDITIONS), [
    "toty",
    "tots",
    "icon",
    "fut-heroes",
    "fut-birthday",
    "otw",
    "future-stars",
    "futties",
    "shapeshifters",
  ]);
  const editions = Object.values(FUT_INSPIRED_EDITIONS);
  for (const field of ["outline", "art", "motif"]) {
    assert.equal(new Set(editions.map((e) => e[field])).size, 9);
  }
});
test("escalas e limites", () => {
  assert.equal(convert20To99(0), 0);
  assert.equal(convert20To99(20), 99);
  assert.equal(convert5To99(5), 99);
  assert.equal(convert5To99(-2), 0);
  assert.equal(calculateOverall(ratings(75)), 75);
});
test("raridades nas fronteiras", () => {
  assert.deepEqual(
    [0, 49, 50, 59, 60, 64, 65, 69, 70, 74, 75, 84, 85, 99].map(
      calculateBaseCard,
    ),
    [
      "bronze-common",
      "bronze-common",
      "bronze-common",
      "bronze-common",
      "bronze-rare",
      "bronze-rare",
      "silver-common",
      "silver-common",
      "silver-rare",
      "silver-rare",
      "gold-common",
      "gold-common",
      "gold-rare",
      "gold-rare",
    ],
  );
});
test("autoavaliação sozinha e limite 20/80 desde o primeiro voto externo", () => {
  assert.equal(calculateInitialBaseline(ratings(10), { count: 0 }).pace, 10);
  assert.equal(
    calculateInitialBaseline(ratings(10), { count: 1, ratings20: ratings(20) })
      .pace,
    18,
  );
  assert.equal(
    calculateInitialBaseline(ratings(10), { count: 2, ratings20: ratings(20) })
      .pace,
    18,
  );
  assert.equal(
    calculateInitialBaseline(ratings(10), { count: 3, ratings20: ratings(20) })
      .pace,
    18,
  );
});
test("autoavaliação conta como um voto com teto de 20%, diminuindo com a comunidade", () => {
  for (const count of [1, 2, 3, 4]) assert.equal(initialSelfWeight(count), 0.2);
  for (const count of [5, 10, 20]) {
    assert.equal(initialSelfWeight(count), 0.04);
    const baseline = calculateInitialBaseline(ratings(0), {
      count,
      ratings20: ratings(20),
    });
    assert.ok(Math.abs(baseline.pace - 19.2) < 1e-10);
  }
  assert.equal(initialSelfWeight(9), 0.0406);
  assert.equal(initialSelfWeight(13), 0.0406);
  assert.equal(initialSelfWeight(19), 0.0405);
  assert.equal(initialSelfWeight(1, { selfWeight: 0.9 }), 0.2);
});
test("um jogo tem um peso, não um peso por voto; N/A excluído", () => {
  const feedback = [
    { submitted: true, ratings: { overall: 4, goalkeeping: null } },
    { submitted: true, ratings: { overall: 5, goalkeeping: 3 } },
    { submitted: false, ratings: { overall: 0, goalkeeping: 0 } },
  ];
  assert.equal(calculateGameAggregate(feedback).overall, 4.5);
  assert.equal(calculateGameAggregate(feedback).goalkeeping, 3);
  const base = ratings(20),
    after = calculatePlayerStats(base, [
      {
        overall: 0,
        attack: 0,
        physical: 0,
        passing: 0,
        defense: 0,
        goalkeeping: null,
      },
    ]);
  assert.equal(after.pace, 99);
  assert.equal(after.goalkeeping, 99);
});
test("especiais, prioridade e guarda-redes com jogos válidos", () => {
  const games = Array.from({ length: 5 }, () => ({
    overall: 5,
    passing: 5,
    attack: 5,
    physical: 5,
    defense: 5,
    goalkeeping: 5,
    mvp: true,
  }));
  const special = calculateSpecialCards(games);
  assert.equal(special[0].id, "legend-form");
  assert.equal(special.length, 10);
  assert.ok(
    calculateSpecialCards([
      { overall: 4, goalkeeping: 5 },
      { overall: 4, goalkeeping: null },
      { overall: 4, goalkeeping: 5 },
      { overall: 4, goalkeeping: null },
    ]).some((x) => x.id === "safe-hands"),
  );
});
test("semanas ISO / Lisboa: mudança de ano e horário de verão", () => {
  assert.equal(
    isoWeekEnd("2026-W40").toISOString(),
    "2026-10-04T22:59:59.999Z",
  );
  assert.equal(
    isoWeekEnd("2026-W44").toISOString(),
    "2026-11-01T23:59:59.999Z",
  );
  assert.equal(isoWeek(new Date("2021-01-01T12:00:00Z")), "2020-W53");
  assert.equal(isoWeek(new Date("2026-10-04T23:30:00Z")), "2026-W41");
  assert.equal(isoWeek(new Date("2026-10-04T21:00:00Z")), "2026-W40");
});
test("ranking: mínimos, média e fallback OVR", () => {
  const d = new Date("2026-10-06T12:00Z"),
    players = [
      { username: "a", ovr: 99, aggregates: [] },
      {
        username: "b",
        ovr: 70,
        aggregates: [{ date: d, count: 2, overall: 4.5 }],
      },
      {
        username: "c",
        ovr: 80,
        aggregates: [{ date: d, count: 1, overall: 5 }],
      },
    ];
  assert.deepEqual(
    calculateWeeklyTopPlayers(players, d).map((p) => p.username),
    ["b", "a", "c"],
  );
});
test("estatísticas derivadas incluem suplentes", () => {
  const game = {
    status: "closed",
    teamA: { starters: ["a"], bench: ["b"] },
    teamB: { starters: ["c"], bench: [] },
    score: { teamA: 8, teamB: 6 },
  };
  assert.equal(calculateMatchStats("b", [game]).wins, 1);
  assert.equal(calculateMatchStats("c", [game]).goalDifference, -2);
  assert.equal(calculateMatchStats("nobody", [game]).played, 0);
});

test("OVR: pesos por atributo, limites e independência da posição", () => {
  const stats = ratings(30);
  for (const key of ["pace", "shooting", "passing", "dribbling"])
    stats[key] = 90;
  assert.equal(calculateOverall(stats), 50);
  assert.equal(
    calculateOverall(stats, "GR"),
    calculateOverallDetails(stats, undefined, "GR").ovr,
  );
  assert.equal(
    calculateOverall(stats, "AV"),
    calculateOverallDetails(stats, undefined, "AV").ovr,
  );
  assert.equal(calculateOverall(ratings(99)), 99);
  assert.equal(calculateOverall(ratings(0)), 0);
  assert.equal(calculateOverall({ ...ratings(0), composure: 99 }), 8);
  assert.equal(
    calculateOverall({ ...ratings(50), pace: 1000, shooting: -5 }),
    calculateOverall({ ...ratings(50), pace: 99, shooting: 0 }),
  );
});
test("detalhe OVR: pesos fixos por stat e arredondamento apenas no fim", () => {
  const stats = { ...ratings(30), pace: 90, composure: 80 };
  const settings = { weights: { ...ratings(0), pace: 25, composure: 75 } };
  const details = calculateOverallDetails(stats, settings);
  assert.equal(details.rows.length, 12);
  assert.deepEqual(
    details.rows.map((r) => r.key),
    ATTRIBUTES.map(([key]) => key),
  );
  assert.equal(details.rows[0].weight, 25);
  assert.equal(details.exact, 82.5);
  assert.equal(details.ovr, 83);
  assert.equal(details.total / details.divisor, 82.5);
  assert.equal(
    calculateOverall({ ...stats, pace: 20, composure: 90 }, settings),
    73,
  );
  const fractional = calculateOverallDetails({ ...ratings(50), pace: 51 });
  assert.equal(fractional.exact, 50.0834);
  assert.equal(fractional.ovr, 50);
});
test("OVR valida todos os pesos, casas decimais, total e configuração antiga", () => {
  const weights = { ...ratings(0), pace: 33.33, passing: 66.67 };
  const stats = { ...ratings(0), pace: 90, passing: 30 };
  assert.ok(validOvrWeights({ weights }));
  assert.equal(calculateOverall(stats, { weights }), 50);
  assert.equal(
    calculateOverall(stats, { weights: { ...ratings(0), pace: 100 } }),
    90,
  );
  for (const invalid of [
    {},
    { topWeight: 70, remainingWeight: 30 },
    { weights: { pace: 100 } },
    { weights: { ...weights, unknown: 0 } },
    { weights: { ...weights, pace: -1 } },
    { weights: { ...weights, pace: NaN } },
    { weights: { ...weights, pace: "33.33" } },
    { weights: { ...weights, pace: 33.333, passing: 66.667 } },
    { weights: { ...weights, pace: 32.33 } },
  ]) {
    assert.equal(validOvrWeights(invalid), false);
    assert.deepEqual(normalizeOvrWeights(invalid), DEFAULT_OVR_WEIGHTS);
  }
  const details = calculateOverallDetails(stats, { weights });
  assert.equal(details.exact, 49.998);
  assert.equal(
    details.rows.reduce((sum, r) => sum + Math.round(r.weight * 100), 0),
    10000,
  );
});

test("OVR usa pesos independentes por posição e valida todos os totais", () => {
  const positions = structuredClone(DEFAULT_OVR_WEIGHTS.positions);
  positions.GR = { ...ratings(0), goalkeeping: 100 };
  positions.AV = { ...ratings(0), shooting: 100 };
  const stats = { ...ratings(40), goalkeeping: 90, shooting: 60 };
  assert.ok(validOvrWeights({ positions }));
  assert.equal(calculateOverall(stats, { positions }, "GR"), 90);
  assert.equal(calculateOverall(stats, { positions }, "AV"), 60);
  assert.equal(
    calculateOverallDetails(stats, { positions }, "GR").position,
    "GR",
  );
  positions.MED.passing += 1;
  assert.equal(validOvrWeights({ positions }), false);
  delete positions.MED;
  assert.equal(validOvrWeights({ positions }), false);
});

test("atitude afeta resistência e compostura, incluindo zero; legado mantém o cálculo anterior", () => {
  const legacy = {
    overall: 3,
    attack: 1,
    physical: 1,
    passing: 3,
    defense: 3,
    goalkeeping: null,
  };
  const low = calculateGameDeltas(ratings(60), { ...legacy, attitude: 0 });
  const high = calculateGameDeltas(ratings(60), { ...legacy, attitude: 5 });
  assert.ok(high.stamina > low.stamina && high.composure > low.composure);
  assert.equal(high.physical, low.physical);
  assert.equal(high.shooting, low.shooting);
  assert.equal(
    calculateGameDeltas(ratings(60), legacy).stamina,
    calculateGameDeltas(ratings(60), { ...legacy, attitude: null }).stamina,
  );
  assert.ok(!completeFeedback(legacy));
  assert.ok(completeFeedback({ ...legacy, attitude: 0 }));
  assert.ok(!completeFeedback({ ...legacy, attitude: 6 }));
  assert.equal(
    calculateGameAggregate([
      { submitted: true, ratings: { attitude: 0 } },
      { submitted: true, ratings: { attitude: 4 } },
      { submitted: true, ratings: {} },
    ]).attitude,
    2,
  );
});
test("estatísticas individuais: suplentes, jogos antigos e jogos ainda abertos", () => {
  const game = {
    status: "closed",
    teamA: { starters: ["a"], bench: ["sub"] },
    teamB: { starters: ["b"], bench: [] },
    score: { teamA: 3, teamB: 1 },
    performance: {
      teamA: { goals: ["a", "sub", "sub"], assists: ["sub"] },
      teamB: { goals: ["b"], assists: [] },
    },
  };
  assert.deepEqual(matchPerformance("sub", game), { goals: 2, assists: 1 });
  assert.deepEqual(matchPerformance("outsider", game), {
    goals: 0,
    assists: 0,
  });
  const stats = calculateMatchStats("sub", [
    game,
    { ...game, status: "open" },
    { ...game, performance: undefined },
  ]);
  assert.equal(stats.played, 2);
  assert.equal(stats.goals, 2);
  assert.equal(stats.assists, 1);
});

test("inatividade: 4–7 ausências, limite, suplente e entrada recente", () => {
  const game = (i, team = { starters: [], bench: [] }) => ({
    id: String(i),
    status: "closed",
    closedAt: new Date(2026, 0, i),
    teamA: team,
    teamB: { starters: [], bench: [] },
  });
  const games = Array.from({ length: 10 }, (_, i) => game(i + 1));
  for (const [count, penalty] of [
    [3, 0],
    [4, 2],
    [5, 5],
    [6, 7],
    [7, 10],
    [10, 10],
  ]) {
    const result = calculateInactivity(
      "absent",
      games.slice(0, count),
      null,
      new Date(2026, 1, 1),
    );
    assert.deepEqual(result, { missed: count, penalty });
    assert.equal(
      calculateOverall(
        Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 80])),
        undefined,
        "ALA",
        result,
      ),
      80 - penalty,
    );
  }
  assert.equal(
    calculateInactivity(
      "absent",
      games,
      new Date(2026, 0, 8),
      new Date(2026, 1, 1),
    ).penalty,
    0,
  );
  assert.equal(
    calculateInactivity(
      "absent",
      [...games, game(11, { starters: [], bench: ["absent"] })],
      null,
      new Date(2026, 1, 1),
    ).missed,
    0,
  );
  assert.equal(
    calculateInactivity(
      "absent",
      [...games, { ...game(11), status: "open" }],
      null,
      new Date(2026, 0, 4),
    ).missed,
    4,
  );
  assert.equal(
    calculateOverall(
      Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 3])),
      undefined,
      "GR",
      { missed: 7, penalty: 10 },
    ),
    0,
  );
});

test("fotografia semanal: só enquadramento, limites e estilos seguros", () => {
  const design = {
    ...defaultPhotoDesign(),
    photoX: 42,
    photoScale: 150,
    fit: "contain",
    fade: "none",
  };
  assert.equal(validPhotoDesign(design), true);
  assert.ok(cardPhotoStyles(design).photo.includes("left:42%"));
  assert.ok(cardPhotoStyles(design).image.includes("scale(1.5)"));
  for (const invalid of [
    { shape: "mvp" },
    { photoX: Infinity },
    { photoScale: 250 },
    { fit: "url(javascript:alert(1))" },
    { ratingSize: 120 },
    [],
  ])
    assert.equal(validPhotoDesign(invalid), false);
  assert.deepEqual(cardPhotoStyles({ photoX: "bad" }), {
    photo: "",
    image: "",
  });
});

test("silhuetas envolvem todo o retângulo: os cantos não são extensões", () => {
  const inside = (points, x, y) => {
    let result = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i],
        [xj, yj] = points[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        result = !result;
    }
    return result;
  };
  const rect = CARD_SAFE_RECT;
  for (const outline of [
    DEFAULT_CARD_OUTLINE,
    ...Object.values(SPECIAL_CARD_DESIGNS).map((d) => d.outline),
    "9,6 38,6 50,1 62,6 91,6 98,13 94,18 98,23 98,79 94,88 81,95 50,99 19,95 6,88 2,79 2,23 6,18 2,13",
  ]) {
    const points = expandCardOutline(outline)
      .split(" ")
      .map((p) => p.split(",").map(Number));
    for (const x of [rect.x * 100, (rect.x + rect.width) * 100])
      for (const y of [rect.y * 100, (rect.y + rect.height) * 100])
        assert.ok(
          inside(points, x, y),
          `Canto ${x},${y} fora da silhueta ${outline}`,
        );
  }
});

test("predefinições: seis receitas válidas com totais de 100%", () => {
  const presets = defaultOvrPresets(DEFAULT_OVR_WEIGHTS);
  assert.equal(presets.length, 6);
  assert.ok(presets.every((p) => validOvrWeights(p.settings)));
  assert.equal(presets[1].settings.positions.GR.goalkeeping, 8);
  assert.equal(presets[1].settings.positions.ALA.pace, 12.4);
  assert.deepEqual(
    presets[0].settings.positions,
    DEFAULT_OVR_WEIGHTS.positions,
  );
});
test("eventos: todos os jogos do mês, suplentes, recompensas semanais e limites", () => {
  const users = [
    { uid: "a" },
    { uid: "b" },
    { uid: "c" },
    { uid: "d", disabled: true },
  ];
  const games = [
    {
      id: "g1",
      status: "closed",
      scheduledAt: new Date("2026-09-01"),
      teamA: { starters: ["a"], bench: ["b"] },
      teamB: { starters: ["c"], bench: [] },
    },
    {
      id: "g2",
      status: "closed",
      scheduledAt: new Date("2026-09-02"),
      teamA: { starters: ["a", "b"], bench: [] },
      teamB: { starters: [], bench: [] },
    },
  ];
  assert.deepEqual(monthlyCandidates(users, games, "2026-09"), ["a", "b"]);
  assert.deepEqual(monthlyCandidates(users, games, "2026-08"), []);
  assert.deepEqual(
    votersFor({ audience: { mode: "game", gameId: "g2" } }, users, games),
    ["a", "b"],
  );
  const rewards = [
    {
      uid: "a",
      startsAt: new Date("2026-10-09"),
      expiresAt: new Date("2026-10-14T11:00:00Z"),
      reward: { boosts: { vision: 50 }, specialId: "mvp" },
    },
  ];
  const active = applyEventRewards(
    ratings(80),
    rewards,
    "a",
    new Date("2026-10-10"),
  );
  assert.equal(active.stats.vision, 99);
  assert.equal(active.specials[0].id, "mvp");
  assert.equal(
    applyEventRewards(
      ratings(80),
      rewards,
      "a",
      new Date("2026-10-14T11:00:00Z"),
    ).stats.vision,
    80,
  );
  assert.equal(
    applyEventRewards(ratings(80), rewards, "b", new Date("2026-10-10"))
      .specials.length,
    0,
  );
  assert.equal(validReward({ boosts: { vision: 51 } }), false);
  assert.equal(validReward({ boosts: { role: 30 } }), false);
  assert.equal(validReward({ boosts: {}, specialId: "gold-common" }), true);
  assert.equal(validReward({ boosts: {}, specialId: "mvp" }), true);
});

test("eventos: uma lista comum, cartas padrão e criadas, resultados explícitos", () => {
  const users = [
    { uid: "a", displayName: "Ana" },
    { uid: "b" },
    { uid: "c" },
    { uid: "d", disabled: true },
  ];
  const games = [
    {
      id: "g",
      status: "closed",
      scheduledAt: new Date("2026-09-01"),
      teamA: { starters: ["a"], bench: ["b"] },
      teamB: { starters: ["d"], bench: [] },
    },
  ];
  for (const audience of [
    { mode: "all" },
    { mode: "game", gameId: "g" },
    { mode: "selected", memberIds: ["a", "c", "d"] },
  ]) {
    const event = { kind: "vote", audience };
    assert.deepEqual(
      candidatesFor(event, { candidateIds: ["d"] }, users, games),
      votersFor(event, users, games),
    );
  }
  assert.deepEqual(
    votersFor(
      { kind: "monthly", month: "2026-09", audience: { mode: "all" } },
      users,
      games,
    ),
    ["a", "b"],
  );
  for (const id of [
    "bronze-common",
    "bronze-rare",
    "silver-common",
    "silver-rare",
    "gold-common",
    "gold-rare",
    ...Object.keys(SPECIAL_CARD_DESIGNS).filter(
      (id) => !COLLECTION_THEME_IDS.includes(id),
    ),
  ])
    assert.equal(validReward({ boosts: {}, specialId: id }), true);
  assert.equal(validReward({ boosts: {}, specialId: "saved:one" }), false);
  assert.equal(
    validReward({ boosts: {}, specialId: "saved:one" }, [{ id: "one" }]),
    true,
  );
  assert.match(
    eventOutcome({ winners: [] }, users),
    /não existiram votos suficientes/,
  );
  assert.match(
    eventOutcome(
      { winners: [{ label: "Melhor colega", uids: ["a"], votes: 3 }] },
      users,
    ),
    /recompensa foi atribuída a Ana/,
  );
  assert.match(eventOutcome({ status: "cancelled" }, users), /cancelada/);
});

test("prazos de eventos usam Lisboa no verão e inverno", () => {
  assert.equal(eventDeadline("2026-07-01T20:00"), "2026-07-01T19:00:00.000Z");
  assert.equal(eventDeadline("2026-11-01T20:00"), "2026-11-01T20:00:00.000Z");
  assert.throws(() => eventDeadline("2026-03-29T01:30"));
});

test("prazo de edição é de 7 dias desde a primeira submissão", () => {
  const submittedAt = new Date("2026-10-01T12:00Z");
  const row = {
    submitted: true,
    submittedAt,
    createdAt: new Date("2026-09-01"),
    updatedAt: new Date("2026-10-07"),
  };
  assert.equal(
    ratingEditDeadline(row).toISOString(),
    "2026-10-08T12:00:00.000Z",
  );
  assert.equal(canEditRating(row, new Date("2026-10-08T11:59:59.999Z")), true);
  assert.equal(canEditRating(row, new Date("2026-10-08T12:00:00Z")), false);
  assert.equal(
    canEditRating(
      { ...row, updatedAt: new Date("2026-10-09") },
      new Date("2026-10-09"),
    ),
    false,
  );
  assert.equal(
    canEditRating(
      { completed: true, createdAt: submittedAt },
      new Date("2026-10-09"),
      true,
    ),
    false,
  );
  assert.equal(
    canEditRating(
      { submitted: false, createdAt: submittedAt },
      new Date("2026-11-01"),
    ),
    true,
  );
});

test("post-match self rating has exactly the same weight as each peer rating", () => {
  const ratings = [
    {
      raterId: "self",
      targetId: "self",
      submitted: true,
      ratings: { overall: 5 },
    },
    {
      raterId: "peer",
      targetId: "self",
      submitted: true,
      ratings: { overall: 1 },
    },
  ];
  assert.equal(calculateGameAggregate(ratings).overall, 3);
  ratings.push({
    raterId: "peer2",
    targetId: "self",
    submitted: true,
    ratings: { overall: 3 },
  });
  assert.equal(calculateGameAggregate(ratings).overall, 3);
});

test("self-declared non-keeper excludes every goalkeeper vote, including earlier peer votes", () => {
  const self = {
    submitted: true,
    raterId: "player",
    targetId: "player",
    ratings: { overall: 4, goalkeeping: null },
  };
  const peer = {
    submitted: true,
    raterId: "peer",
    targetId: "player",
    ratings: { overall: 5, goalkeeping: 5 },
  };
  for (const rows of [
    [self, peer],
    [peer, self],
  ]) {
    assert.equal(calculateGameAggregate(rows).goalkeeping, null);
    assert.equal(calculateGameAggregate(rows).overall, 4.5);
  }
  assert.equal(
    calculateGameAggregate([{ ...self, submitted: false }, peer]).goalkeeping,
    5,
  );
  assert.equal(
    calculateGameAggregate([{ ...self, ratings: { goalkeeping: 0 } }, peer])
      .goalkeeping,
    2.5,
  );
  assert.equal(
    calculateGameAggregate([{ ...self, raterId: "other" }, peer]).goalkeeping,
    5,
  );
});

test("match component means exclude goalkeeper in the main value and include only rated components",()=> {
  const summary={overall:4,attack:5,passing:3,defense:4,physical:5,attitude:3,goalkeeping:2};
  assert.deepEqual(matchComponentAverages(summary),{withoutGoalkeeping:4,withGoalkeeping:26/7,count:6});
  assert.match(matchRatingSummary(summary),/\(3,7 com GR\)/);
  assert.equal(matchComponentAverages({...summary,goalkeeping:null}).withGoalkeeping,null);
  assert.equal(matchComponentAverages({...summary,goalkeepingEligible:false}).withGoalkeeping,null);
  assert.equal(matchComponentAverages({overall:0,attack:4,goalkeeping:0}).withoutGoalkeeping,2);
  assert.equal(matchComponentAverages({overall:0,attack:4,goalkeeping:0}).withGoalkeeping,4/3);
  assert.equal(matchComponentAverages({goalkeeping:5}).withoutGoalkeeping,null);
  assert.match(matchRatingSummary({}),/Por avaliar/);
  assert.equal(matchComponentAverages({overall:4.8,attack:2,goalkeeping:5}).withoutGoalkeeping,3.4);
});

test("rating series use equal game weights and preserve GR omission without turning it into zero",async()=> {
  const {matchSeriesAverages,matchRatingSeries}=await import("../js/match-rating-summary.js");
  const result=matchSeriesAverages([{overall:4,attack:2,goalkeeping:0},{overall:5,goalkeeping:null},{}]);
  assert.equal(result.withoutGoalkeeping,4);
  assert.equal(result.withGoalkeeping,3.5);
  assert.equal(result.count,2);
  assert.match(matchRatingSeries([{overall:4,goalkeeping:2}]),/3,0 com GR/);
  assert.equal(matchSeriesAverages([]).withoutGoalkeeping,null);
});
test("weekly display ranks by component averages while preserving original aggregates",async()=> {
  const {componentWeeklyTopPlayers}=await import("../js/match-rating-summary.js");
  const {cardWeek}=await import("../js/card-week.js");
  const now=new Date("2026-10-16T12:00:00Z"),date=new Date(+cardWeek(now).opensAt+60000);
  const players=[{uid:"a",username:"a",ovr:90,aggregates:[{date,count:2,overall:5,attack:1,goalkeeping:5}]},{uid:"b",username:"b",ovr:70,aggregates:[{date,count:2,overall:4,attack:4,goalkeeping:0}]}];
  const result=componentWeeklyTopPlayers(players,now);
  assert.deepEqual(result.map(row=>row.uid),["b","a"]);
  assert.equal(result[0].weeklyPerformance,4);
  assert.equal(result[0].weeklyComponentAverages.withGoalkeeping,8/3);
  assert.equal(players[0].aggregates[0].overall,5);
  assert.equal(result[1].aggregates,players[0].aggregates);
});
