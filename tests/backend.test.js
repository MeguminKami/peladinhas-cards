import { cardWeek } from "../js/card-week.js";
import { CARD_CRITERIA } from "../functions/card-unlock-rules.js";
import { getStorage } from "firebase-admin/storage";
import { defaultPhotoDesign } from "../js/card-photo.js";
import { teamBalance, balanceSignature } from "../js/team-balance.js";
import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  onCommunityRating,
  onInitialRating,
  onPlayerPosition,
  onGame,
  onGameNotifications,
  onEventNotifications,
  scheduledNotifications,
  onFeedback,
  deleteGame,
  rebuildHistory,
  adminMessage,
  saveTheme,
  saveWeeklyCardPhoto,
  eventAction,
  voteEvent,
  getEvent,
  listEvents,
  closeEvents,
  initializeOvrPresets,
  saveOvrPreset,
  saveOvrWeights,
  ensureHistory,
  selectWeeklyCard,
  correctRating,
  ticketAction,
  onTicketMessage,
  onTicketClosed,
} from "../functions/index.js";
import {
  ATTRIBUTES,
  FEEDBACK,
  matchEvolutionContext,
  isoWeek,
  calculateOverall,
  DEFAULT_OVR_WEIGHTS,
  calculatePlayerStats,
} from "../js/utils.js";
const db = getFirestore(),
  now = Timestamp.now();
test("Card Lab: ADMIN creates and edits every edition without duplicating or changing ownership", async () => {
  const { CATALOG_THEMES } = await import("../js/utils.js");
  for (const [uid, role, disabled] of [
    ["lab-admin", "admin", false],
    ["lab-member", "member", false],
    ["lab-dbs", "dbs", false],
    ["lab-disabled", "admin", true],
  ])
    await db.doc(`users/${uid}`).set({ uid, role, disabled });
  const payload = {
    name: "Composição",
    baseTheme: "toty",
    colors: {
      primary: "#123456",
      secondary: "#abcdef",
      text: "#ffffff",
      border: "#123456",
      glow: "#abcdef",
    },
    texture: "plain",
    design: { shape: "original", decoration: "original", nameFont: "modern" },
  };
  const call = (data, uid = "lab-admin") =>
    saveTheme.run({ auth: { uid }, data });
  for (const uid of ["lab-member", "lab-dbs", "lab-disabled"])
    await assert.rejects(call(payload, uid));
  await assert.rejects(saveTheme.run({ data: payload }));
  const { id } = await call(payload);
  const ref = db.doc(`cardThemes/${id}`);
  const original = (await ref.get()).data();
  const count = (await db.collection("cardThemes").get()).size;
  for (const baseTheme of CATALOG_THEMES) {
    assert.deepEqual(
      await call({ ...payload, id, name: "Revista", baseTheme }),
      { id },
    );
    const stored = (await ref.get()).data();
    assert.equal(stored.baseTheme, baseTheme);
    assert.equal(stored.createdBy, original.createdBy);
    assert.ok(stored.createdAt.isEqual(original.createdAt));
    assert.equal(stored.updatedBy, "lab-admin");
  }
  assert.equal((await db.collection("cardThemes").get()).size, count);
  for (const uid of ["lab-member", "lab-dbs", "lab-disabled"])
    await assert.rejects(call({ ...payload, id }, uid));
  for (const invalid of [
    { id: "../other" },
    { id: "" },
    { id: 1 },
    { baseTheme: "missing-edition" },
    { colors: { primary: "red" } },
    { design: { shape: "script" } },
  ])
    await assert.rejects(call({ ...payload, ...invalid }));
  await assert.rejects(
    call({ ...payload, id: "missing-card-lab-theme" }),
    /não encontrada/,
  );
  const copy = await call({ ...payload, baseTheme: "apogee" });
  assert.notEqual(copy.id, id);
});
test("tickets: autoria, acesso, notificações e fecho irreversível", async () => {
  for (const [uid, role] of [
    ["ticket-member", "member"],
    ["ticket-other", "member"],
    ["ticket-admin1", "admin"],
    ["ticket-admin2", "admin"],
  ])
    await db
      .doc(`users/${uid}`)
      .set({ uid, role, disabled: false, displayName: uid });
  const call = (uid, data) => ticketAction.run({ auth: { uid }, data });
  await assert.rejects(
    call("ticket-member", { action: "create", title: " ", body: "Ajuda" }),
  );
  const { id } = await call("ticket-member", {
    action: "create",
    title: "Ajuda no perfil",
    body: "Preciso de ajuda",
  });
  const ref = db.doc(`tickets/${id}`);
  let messages = await ref.collection("messages").get();
  const first = messages.docs[0];
  await onTicketMessage.run({
    params: { tid: id, mid: first.id },
    data: { before: { exists: false }, after: first },
  });
  assert.ok(
    (await db.doc(`users/ticket-admin1/notifications/ticket-${first.id}`).get())
      .exists,
  );
  assert.ok(
    (await db.doc(`users/ticket-admin2/notifications/ticket-${first.id}`).get())
      .exists,
  );
  await assert.rejects(
    call("ticket-other", { action: "reply", id, body: "Invasão" }),
  );
  await call("ticket-admin1", { action: "reply", id, body: "Resposta 1" });
  await call("ticket-admin2", { action: "reply", id, body: "Resposta 2" });
  messages = await ref.collection("messages").get();
  assert.equal(messages.size, 3);
  const response = messages.docs.find(
    (m) => m.data().authorId === "ticket-admin2",
  );
  assert.equal(response.data().authorName, "ticket-admin2");
  await onTicketMessage.run({
    params: { tid: id, mid: response.id },
    data: { before: { exists: false }, after: response },
  });
  assert.ok(
    (
      await db
        .doc(`users/ticket-member/notifications/ticket-${response.id}`)
        .get()
    ).exists,
  );
  const before = await ref.get();
  await call("ticket-member", { action: "close", id });
  const after = await ref.get();
  await onTicketClosed.run({ params: { tid: id }, data: { before, after } });
  assert.equal(after.data().status, "closed");
  for (const uid of ["ticket-member", "ticket-admin1", "ticket-admin2"])
    await assert.rejects(
      call(uid, { action: "reply", id, body: "Não permitido" }),
    );
  await assert.rejects(call("ticket-admin1", { action: "reopen", id }));
  const second = await call("ticket-member", {
    action: "create",
    title: "Outro pedido",
    body: "Mensagem",
  });
  await call("ticket-admin2", { action: "close", id: second.id });
});
const all = (v) => Object.fromEntries(ATTRIBUTES.map(([k]) => [k, v]));
const event = (after, before) => ({
  params: { uid: "joao", gid: "match" },
  data: { after, before: before || { data: () => undefined } },
});
test("integração: 3 votos oficiais, agregados anónimos, MVP, histórico e administração", async (t) => {
  const cycle = cardWeek();
  t.mock.timers.enable({
    apis: ["Date"],
    now: cycle.phase === "open" ? Date.now() : +cycle.nextOpensAt + 1000,
  });
  t.after(() => t.mock.timers.reset());
  for (const uid of ["joao", "pedro", "miguel", "andre"])
    await db.doc(`users/${uid}`).set({
      uid,
      role: uid === "pedro" ? "admin" : "member",
      disabled: false,
    });
  const initial = db.doc("initialRatings/joao");
  await initial.set({
    uid: "joao",
    ratings20: all(10),
    completed: true,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 14 * 86400000)),
    updatedAt: now,
  });
  await onInitialRating.run(event(await initial.get()));
  assert.equal(
    (await db.doc(`users/joao/cardHistory/${cardWeek().weekId}`).get()).data()
      .ovr,
    50,
  );
  for (const raterId of ["pedro", "miguel", "andre"]) {
    const r = db.doc(`communityRatings/${raterId}_joao`);
    await r.set({
      raterId,
      targetId: "joao",
      ratings20: all(20),
      submitted: true,
      createdAt: now,
      submittedAt: now,
    });
    await onCommunityRating.run(event(await r.get()));
  }
  const summary = (await db.doc("communitySummaries/joao").get()).data();
  assert.equal(summary.count, 3);
  assert.equal(summary.ratings20.pace, 20);
  assert.ok(!JSON.stringify(summary).includes("pedro"));
  const snapshot = (
    await db.doc(`users/joao/cardHistory/${cardWeek().weekId}`).get()
  ).data();
  assert.equal(snapshot.ovr, 89);
  assert.equal(snapshot.official, true);
  const history = await db.collection("users/joao/cardHistory").get();
  assert.equal(history.size, 1);
  assert.equal(history.docs[0].data().locked, false);
  const game = db.doc("games/match");
  await game.set({
    title: "Teste",
    status: "closed",
    teamA: { starters: ["joao", "pedro"], bench: [] },
    teamB: { starters: ["miguel", "andre"], bench: [] },
    scheduledAt: now,
    closedAt: now,
    score: { teamA: 8, teamB: 6 },
  });
  await onGame.run(event(await game.get()));
  const resultOnly = (
    await db.doc(`users/joao/cardHistory/${cardWeek().weekId}`).get()
  ).data();
  assert.equal(
    resultOnly.ovr,
    snapshot.ovr,
    "Sem avaliações, os atributos mantêm-se",
  );
  assert.equal(
    resultOnly.ovr,
    calculateOverall(calculatePlayerStats(all(18), [{ outcome: 1 }])),
  );

  for (const raterId of ["pedro", "miguel", "andre"]) {
    const r = db.doc(`games/match/feedback/${raterId}_joao`);
    await r.set({
      gameId: "match",
      raterId,
      targetId: "joao",
      ratings: {
        overall: 5,
        attack: 5,
        passing: 5,
        defense: 5,
        physical: 5,
        goalkeeping: null,
      },
      submitted: true,
      createdAt: now,
      submittedAt: now,
    });
    await onFeedback.run(event(await r.get()));
  }
  const aggregate = (await db.doc("gameSummaries/match").get()).data();
  assert.equal(aggregate.players.joao.count, 3);
  assert.equal(aggregate.players.joao.mvp, true);
  assert.equal(aggregate.players.joao.goalkeeping, null);
  await assert.rejects(
    correctRating.run({
      auth: { uid: "joao" },
      data: {
        kind: "game",
        gameId: "match",
        id: "pedro_joao",
        ratings: { overall: 99 },
      },
    }),
    /reservado/,
  );
  await assert.rejects(
    correctRating.run({
      auth: { uid: "pedro" },
      data: {
        kind: "game",
        gameId: "match",
        id: "pedro_joao",
        ratings: { overall: 99 },
      },
    }),
    /Valores/,
  );
  await correctRating.run({
    auth: { uid: "pedro" },
    data: {
      kind: "game",
      gameId: "match",
      id: "pedro_joao",
      ratings: {
        overall: 4,
        attack: 4,
        passing: 4,
        defense: 4,
        physical: 4,
        attitude: 4,
        goalkeeping: null,
      },
    },
  });
  assert.equal((await db.collection("ratingCorrections").get()).size, 1);
  assert.equal(
    (await db.doc("games/match/feedback/pedro_joao").get()).data().raterId,
    "pedro",
  );
  await assert.rejects(
    rebuildHistory.run({ auth: { uid: "joao" }, data: { uid: "joao" } }),
    /reservado/,
  );
  await rebuildHistory.run({ auth: { uid: "pedro" }, data: { uid: "joao" } });
  await ensureHistory.run({ auth: { uid: "joao" }, data: {} });
  await adminMessage.run({
    auth: { uid: "pedro" },
    data: { title: "Novo jogo", body: "Vamos jogar!" },
  });
  assert.ok((await db.collection("users/joao/notifications").get()).size > 0);
  const theme = await saveTheme.run({
    auth: { uid: "pedro" },
    data: {
      name: "Teste",
      colors: {
        primary: "#123456",
        secondary: "#123456",
        text: "#ffffff",
        border: "#abcdef",
        glow: "#123456",
      },
      texture: "radial",
      baseTheme: "gold-rare",
      design: {
        nameFont: "editorial",
        background: "waves",
        effect: "holographic",
        watermark: "crest",
        border: "double",
        shape: "crown",
        ratingSize: 125,
      },
    },
  });
  assert.ok(theme.id);
  assert.equal(
    (await db.doc(`cardThemes/${theme.id}`).get()).data().design.nameFont,
    "editorial",
  );
  await assert.rejects(
    saveTheme.run({
      auth: { uid: "pedro" },
      data: {
        name: "Inválida",
        colors: {
          primary: "#123456",
          secondary: "#123456",
          text: "#ffffff",
          border: "#abcdef",
          glow: "#123456",
        },
        texture: "plain",
        design: { nameFont: "script" },
      },
    }),
    /inválido/,
  );
  await deleteGame.run({ auth: { uid: "pedro" }, data: { gameId: "match" } });
  assert.equal((await game.get()).exists, false);
  assert.equal((await db.collection("games/match/feedback").get()).size, 0);
  assert.equal((await db.doc("gameSummaries/match").get()).exists, false);
});

test("histórico guarda pesos por posição e mudar posição recalcula o OVR", async (t) => {
  const cycle = cardWeek();
  t.mock.timers.enable({
    apis: ["Date"],
    now: cycle.phase === "open" ? Date.now() : +cycle.nextOpensAt + 1000,
  });
  t.after(() => t.mock.timers.reset());
  const user = db.doc("users/position-player");
  await user.set({
    uid: "position-player",
    role: "member",
    disabled: false,
    primaryPosition: "MED",
  });
  const ratings20 = all(6);
  for (const key of ["passing", "vision", "teamwork"]) ratings20[key] = 18;
  const initial = db.doc("initialRatings/position-player");
  await initial.set({
    uid: "position-player",
    ratings20,
    completed: true,
    createdAt: now,
    updatedAt: now,
  });
  await onInitialRating.run({
    ...event(await initial.get()),
    params: { uid: "position-player" },
  });
  const before = await user.get();
  const midfield = (
    await db.doc(`users/position-player/cardHistory/${cardWeek().weekId}`).get()
  ).data();
  assert.equal(midfield.ovr, calculateOverall(midfield.stats, "MED"));
  assert.equal(midfield.primaryPosition, "MED");
  assert.equal(midfield.ovrCalculation.ovr, midfield.ovr);
  assert.equal(midfield.ovrCalculation.divisor, 10000);
  assert.equal(midfield.ovrCalculation.rows.length, 12);
  assert.equal(midfield.ovrCalculation.version, "position-weights-v4");
  await user.update({ primaryPosition: "GR" });
  await onPlayerPosition.run({
    ...event(await user.get(), before),
    params: { uid: "position-player" },
  });
  const goalkeeper = (
    await db.doc(`users/position-player/cardHistory/${cardWeek().weekId}`).get()
  ).data();
  assert.equal(goalkeeper.ovr, calculateOverall(goalkeeper.stats, "GR"));
  assert.ok(midfield.ovr > goalkeeper.ovr);
  assert.deepEqual(midfield.stats, goalkeeper.stats);
});

test("pesos OVR: só admin, validação de cada stat e recálculo global persistido", async (t) => {
  const cycle = cardWeek();
  t.mock.timers.enable({
    apis: ["Date"],
    now: cycle.phase === "open" ? Date.now() : +cycle.nextOpensAt + 1000,
  });
  t.after(() => t.mock.timers.reset());
  const invoke = (uid, data) =>
    saveOvrWeights.run({ auth: uid ? { uid } : null, data });
  const custom = { weights: { ...all(0), passing: 100 } };
  await assert.rejects(invoke(null, custom), { code: "unauthenticated" });
  await assert.rejects(invoke("joao", custom), { code: "permission-denied" });
  for (const invalid of [
    { topWeight: 70, remainingWeight: 30 },
    { weights: { passing: 100 } },
    { weights: { ...all(0), passing: 101 } },
    { weights: { ...all(0), passing: 99 } },
    { weights: { ...all(0), passing: "100" } },
    { weights: { ...all(0), passing: 99.999, pace: 0.001 } },
    { weights: { ...custom.weights, unknown: 0 } },
  ])
    await assert.rejects(invoke("pedro", invalid), {
      code: "invalid-argument",
    });
  await db
    .doc("users/disabled-admin")
    .set({ uid: "disabled-admin", role: "admin", disabled: true });
  await assert.rejects(invoke("disabled-admin", custom), {
    code: "permission-denied",
  });
  const ref = db.doc(`users/position-player/cardHistory/${cardWeek().weekId}`);
  const original = (await ref.get()).data();
  await invoke("pedro", custom);
  const settings = (await db.doc("settings/ovr").get()).data();
  assert.deepEqual(settings.weights, custom.weights);
  assert.equal(settings.updatedBy, "pedro");
  const updated = (await ref.get()).data();
  assert.deepEqual(updated.stats, original.stats);
  assert.equal(updated.ovr, original.stats.passing);
  assert.equal(updated.ovr, calculateOverall(original.stats, settings));
  assert.ok(updated.ovr > original.ovr);
  assert.deepEqual(updated.ovrCalculation.weights, custom.weights);
  assert.equal(
    (await db.doc("users/position-player/cardState/current").get()).data().ovr,
    updated.ovr,
  );
  await invoke("pedro", {
    weights: { ...all(0), pace: 33.33, passing: 66.67 },
  });
  const decimal = (await ref.get()).data();
  assert.equal(
    decimal.ovr,
    calculateOverall(decimal.stats, {
      weights: { ...all(0), pace: 33.33, passing: 66.67 },
    }),
  );
  const positions = structuredClone(DEFAULT_OVR_WEIGHTS.positions);
  positions.GR = { ...all(0), goalkeeping: 100 };
  await invoke("pedro", { positions });
  const positional = (await ref.get()).data();
  assert.equal(positional.ovrCalculation.version, "position-weights-v4");
  assert.equal(
    positional.ovr,
    calculateOverall(
      positional.stats,
      { positions },
      positional.primaryPosition,
    ),
  );
  positions.MED.pace += 1;
  await assert.rejects(invoke("pedro", { positions }), {
    code: "invalid-argument",
  });
  await invoke("pedro", DEFAULT_OVR_WEIGHTS);
});

test("equilíbrio do jogo: referência fixa, impacto nas cartas e limpeza ao reabrir", async (t) => {
  const cycle = cardWeek();
  t.mock.timers.enable({
    apis: ["Date"],
    now: cycle.phase === "open" ? Date.now() : +cycle.nextOpensAt + 1000,
  });
  t.after(() => t.mock.timers.reset());
  const gid = "balanced-match";
  for (const [uid, rating] of [
    ["balance-low", 10],
    ["balance-high", 18],
  ]) {
    await db.doc(`users/${uid}`).set({ uid, role: "member", disabled: false });
    await db.doc(`initialRatings/${uid}`).set({
      uid,
      completed: true,
      ratings20: all(rating),
      createdAt: now,
      updatedAt: now,
    });
  }
  const closedAt = Timestamp.now();
  const ref = db.doc(`games/${gid}`);
  await ref.set({
    title: "Equilíbrio",
    status: "closed",
    teamA: { starters: ["balance-low"], bench: [] },
    teamB: { starters: ["balance-high"], bench: [] },
    score: { teamA: 0, teamB: 2 },
    closedAt,
    scheduledAt: closedAt,
  });
  const invoke = async (before) =>
    onGame.run({ ...event(await ref.get(), before), params: { gid } });
  await invoke();
  const frozen = (await db.doc(`gameBalances/${gid}`).get()).data();
  assert.equal(frozen.teamA.average, 50);
  assert.equal(frozen.teamB.average, 89);
  assert.deepEqual(frozen.playerOvr, { "balance-low": 50, "balance-high": 89 });
  const vote = db.doc(`games/${gid}/feedback/balance-high_balance-low`);
  await vote.set({
    gameId: gid,
    raterId: "balance-high",
    targetId: "balance-low",
    ratings: {
      overall: 3,
      attack: 3,
      passing: 3,
      defense: 3,
      physical: 3,
      goalkeeping: null,
    },
    submitted: true,
    createdAt: Timestamp.now(),
    submittedAt: Timestamp.now(),
  });
  await onFeedback.run({ ...event(await vote.get()), params: { gid } });
  const card = (
    await db.doc(`users/balance-low/cardHistory/${cardWeek().weekId}`).get()
  ).data();
  const feedback = {
    overall: 3,
    attack: 3,
    passing: 3,
    defense: 3,
    physical: 3,
    goalkeeping: null,
    outcome: -1,
    goalMargin: -2,
  };
  assert.deepEqual(card.stats, calculatePlayerStats(all(10), [feedback]));
  assert.equal(card.stats.goalkeeping, 50);
  await db.doc("initialRatings/balance-high").update({ ratings20: all(6) });
  await invoke(await ref.get());
  assert.deepEqual((await db.doc(`gameBalances/${gid}`).get()).data(), frozen);
  const beforeReopen = await ref.get();
  await ref.update({ status: "open" });
  await invoke(beforeReopen);
  assert.equal((await db.doc(`gameBalances/${gid}`).get()).exists, false);
  await ref.update({ status: "closed", closedAt: Timestamp.now() });
  await invoke(await ref.get());
  assert.equal(
    (await db.doc(`gameBalances/${gid}`).get()).data().teamB.average,
    30,
  );
  await deleteGame.run({ auth: { uid: "pedro" }, data: { gameId: gid } });
  assert.equal((await db.doc(`gameBalances/${gid}`).get()).exists, false);
});

test("golos, assistências e atitude: frontend e histórico Firebase usam a mesma fórmula; corrigir jogo recalcula", async (t) => {
  const cycle = cardWeek();
  t.mock.timers.enable({
    apis: ["Date"],
    now: cycle.phase === "open" ? Date.now() : +cycle.nextOpensAt + 1000,
  });
  t.after(() => t.mock.timers.reset());
  const gid = "performance-match",
    scorer = "performance-scorer",
    other = "performance-other";
  for (const uid of [scorer, other]) {
    await db.doc(`users/${uid}`).set({
      uid,
      username: uid,
      role: "member",
      disabled: false,
      primaryPosition: "AV",
    });
    await db.doc(`initialRatings/${uid}`).set({
      uid,
      ratings20: all(10),
      completed: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  const ref = db.doc(`games/${gid}`);
  const game = {
    title: "Performance",
    creatorId: scorer,
    scheduledAt: now,
    createdAt: now,
    updatedAt: now,
    status: "closed",
    closedAt: now,
    closedBy: scorer,
    teamA: { starters: [scorer], bench: [] },
    teamB: { starters: [other], bench: [] },
    score: { teamA: 2, teamB: 0 },
    performance: {
      teamA: { goals: [scorer, scorer], assists: [scorer, scorer] },
      teamB: { goals: [], assists: [] },
    },
  };
  await ref.set(game);
  const feedbackRef = ref.collection("feedback").doc(`${other}_${scorer}`);
  const ratings = {
    overall: 3,
    attack: 3,
    passing: 3,
    physical: 3,
    defense: 3,
    goalkeeping: null,
    attitude: 5,
  };
  await feedbackRef.set({
    gameId: gid,
    raterId: other,
    targetId: scorer,
    submitted: true,
    ratings,
    submittedAt: now,
    createdAt: now,
  });
  await onGame.run({ ...event(await ref.get()), params: { gid } });
  const current = async () =>
    (
      await db.doc(`users/${scorer}/cardHistory/${cardWeek().weekId}`).get()
    ).data();
  const expected = calculatePlayerStats(all(10), [
    { ...ratings, goals: 2, assists: 2, outcome: 1, goalMargin: 2 },
  ]);
  assert.deepEqual((await current()).stats, expected);
  const baselineStats = calculatePlayerStats(all(10), [
    { ...ratings, outcome: 1, goalMargin: 2 },
  ]);
  assert.ok(expected.shooting >= baselineStats.shooting);
  assert.ok(expected.dribbling >= baselineStats.dribbling);
  assert.ok(expected.shooting > baselineStats.shooting);
  assert.ok(expected.passing > baselineStats.passing);
  assert.ok(expected.dribbling > baselineStats.dribbling);
  const frozen = (await db.doc(`gameBalances/${gid}`).get()).data();
  const before = await ref.get();
  await ref.update({
    performance: { ...game.performance, teamA: { goals: [], assists: [] } },
  });
  await onGame.run({ ...event(await ref.get(), before), params: { gid } });
  assert.deepEqual((await current()).stats, baselineStats);
  assert.deepEqual((await db.doc(`gameBalances/${gid}`).get()).data(), frozen);
  const beforeDefeat = await ref.get();
  await ref.update({ score: { teamA: 3, teamB: 8 } });
  await onGame.run({
    ...event(await ref.get(), beforeDefeat),
    params: { gid },
  });
  assert.deepEqual(
    (await current()).stats,
    calculatePlayerStats(all(10), [
      { ...ratings, outcome: -1, goalMargin: -5 },
    ]),
  );
});

test("evolução relativa: resumo público e histórico concordam; voto num colega recalcula a equipa", async (t) => {
  const cycle = cardWeek();
  t.mock.timers.enable({
    apis: ["Date"],
    now: cycle.phase === "open" ? Date.now() : +cycle.nextOpensAt + 1000,
  });
  t.after(() => t.mock.timers.reset());
  const gid = "relative-progression",
    uid = "relative-low",
    peer = "relative-peer",
    opponent = "relative-opponent";
  const stamp = Timestamp.now();
  const dimensions = (value) =>
    Object.fromEntries(
      FEEDBACK.map(([key]) => [key, key === "goalkeeping" ? null : value]),
    );
  for (const [id, ovr] of [
    [uid, 80],
    [peer, 90],
    [opponent, 70],
  ]) {
    await db
      .doc(`users/${id}`)
      .set({ uid: id, role: "member", primaryPosition: "AV", disabled: false });
    await db.doc(`initialRatings/${id}`).set({
      uid: id,
      ratings20: all((ovr * 20) / 99),
      completed: true,
      createdAt: stamp,
    });
  }
  const game = {
    status: "closed",
    teamA: { starters: [uid, peer], bench: [] },
    teamB: { starters: [opponent], bench: [] },
    score: { teamA: 7, teamB: 5 },
    scheduledAt: stamp,
    closedAt: stamp,
  };
  const ref = db.doc(`games/${gid}`);
  await ref.set(game);
  for (const [targetId, raterId, stars] of [
    [uid, opponent, 3.2],
    [peer, opponent, 3],
    [opponent, uid, 3],
  ])
    await ref
      .collection("feedback")
      .doc(`${raterId}_${targetId}`)
      .set({
        targetId,
        raterId,
        ratings: dimensions(stars),
        submitted: true,
        submittedAt: stamp,
      });
  await onGame.run({ ...event(await ref.get()), params: { gid } });
  const snapshot = (await db.doc(`gameBalances/${gid}`).get()).data();
  const summary = (await db.doc(`gameSummaries/${gid}`).get()).data();
  const context = matchEvolutionContext(uid, game, summary.players, snapshot);
  assert.equal(context.teamOvr, 90);
  assert.equal(context.teamRatings.physical, 3);
  assert.equal(context.opponentRatings.physical, 3);
  const expected = calculatePlayerStats(
    all((80 * 20) / 99),
    [{ ...summary.players[uid], ...context, outcome: 1, goalMargin: 2 }],
    { position: "AV" },
  );
  const current = async () =>
    (
      await db.doc(`users/${uid}/cardHistory/${cardWeek().weekId}`).get()
    ).data();
  assert.deepEqual((await current()).stats, expected);
  const vote = ref.collection("feedback").doc(`${opponent}_${peer}`),
    before = await vote.get();
  await vote.update({ ratings: dimensions(1), updatedAt: stamp });
  await onFeedback.run({ ...event(await vote.get(), before), params: { gid } });
  assert.ok((await current()).stats.pace > expected.pace);
  assert.deepEqual(
    (await db.doc(`gameBalances/${gid}`).get()).data(),
    snapshot,
  );
});

test("cartas semanais: fecho imutável, pausa e nova carta na quinta às 12h", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-09T12:00:00Z"),
  });
  try {
    const uid = "weekly-lock-player",
      ref = db.doc(`users/${uid}`),
      initial = db.doc(`initialRatings/${uid}`);
    await ref.set({
      uid,
      username: uid,
      displayName: "Nome original",
      photoURL: "",
      countryCode: "PT",
      primaryPosition: "ALA",
      role: "member",
      disabled: false,
    });
    await initial.set({
      uid,
      ratings20: all(10),
      completed: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await ensureHistory.run({ auth: { uid }, data: {} });
    const history = db.doc(`users/${uid}/cardHistory/2026-W41`),
      first = (await history.get()).data();
    assert.equal(first.locked, false);
    t.mock.timers.setTime(new Date("2026-10-14T11:00:00Z").getTime());
    await ensureHistory.run({ auth: { uid }, data: {} });
    const frozen = (await history.get()).data();
    assert.equal(frozen.locked, true);
    await initial.update({ ratings20: all(20) });
    await ref.update({ displayName: "Nome novo", primaryPosition: "GR" });
    await db
      .doc("users/weekly-lock-admin")
      .set({ uid: "weekly-lock-admin", role: "admin", disabled: false });
    await rebuildHistory.run({
      auth: { uid: "weekly-lock-admin" },
      data: { uid },
    });
    const still = (await history.get()).data();
    assert.deepEqual(still, frozen);
    const published = (await db.doc(`weeklyCards/${uid}`).get()).data();
    assert.deepEqual(published.stats, first.stats);
    assert.equal(published.appearance.displayName, "Nome original");
    assert.equal(published.phase, "closed");
    const gameRef = db.doc("games/weekly-locked-game");
    await gameRef.set({
      title: "Jogo na pausa",
      status: "closed",
      closedAt: Timestamp.now(),
      scheduledAt: Timestamp.now(),
      teamA: { starters: [uid], bench: [] },
      teamB: { starters: ["weekly-other"], bench: [] },
      score: { teamA: 1, teamB: 0 },
    });
    await onGame.run({
      ...event(await gameRef.get()),
      params: { gid: "weekly-locked-game" },
    });
    const balance = (
      await db.doc("gameBalances/weekly-locked-game").get()
    ).data();
    assert.equal(balance.playerOvr[uid], 99); // Match reference uses the current base, never the frozen weekly card.
    assert.deepEqual((await history.get()).data(), frozen);

    assert.equal(
      (await db.doc(`users/${uid}/cardHistory/2026-W42`).get()).exists,
      false,
    );
    t.mock.timers.setTime(new Date("2026-10-15T11:00:00Z").getTime());
    await ensureHistory.run({ auth: { uid }, data: {} });
    const next = (
      await db.doc(`users/${uid}/cardHistory/2026-W42`).get()
    ).data();
    assert.equal(next.locked, false);
    assert.equal(next.appearance.displayName, "Nome novo");
    assert.ok(next.ovr > first.ovr);
    assert.deepEqual((await history.get()).data(), frozen);
  } finally {
    t.mock.timers.reset();
  }
});

test("inatividade: finalizar atualiza ausentes, suplente recupera e reabrir remove ausência", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-10T12:00:00Z"),
  });
  try {
    const uid = "inactivity-player",
      joined = Timestamp.fromDate(new Date("2026-10-09T12:00:00Z"));
    await db.doc(`users/${uid}`).set({
      uid,
      role: "member",
      disabled: false,
      primaryPosition: "ALA",
      createdAt: joined,
    });
    await db.doc(`initialRatings/${uid}`).set({
      uid,
      ratings20: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 16])),
      createdAt: joined,
    });
    const eventFor = (before, after, gid) => ({
      params: { gid },
      data: { before, after },
    });
    const history = db.doc(`users/${uid}/cardHistory/2026-W41`);
    const refs = [];
    for (let i = 0; i < 7; i++) {
      const ref = db.doc(`games/inactivity-${i}`),
        before = await ref.get();
      const date = Timestamp.fromDate(
        new Date(`2026-10-09T${String(13 + i).padStart(2, "0")}:00:00Z`),
      );
      await ref.set({
        status: "closed",
        closedAt: date,
        scheduledAt: date,
        teamA: { starters: [], bench: [] },
        teamB: { starters: [], bench: [] },
        score: { teamA: 0, teamB: 0 },
      });
      refs.push(ref);
      if (i === 3 || i === 6) {
        await onGame.run(eventFor(before, await ref.get(), ref.id));
        const row = (await history.get()).data();
        assert.equal(row.inactivity.missed, i + 1);
        assert.equal(row.inactivity.penalty, i === 3 ? 2 : 10);
        assert.equal(
          row.ovr,
          row.ovrCalculation.rawOvr - row.inactivity.penalty,
        );
      }
    }
    const last = refs.at(-1),
      before = await last.get();
    await last.update({ status: "open" });
    await onGame.run(eventFor(before, await last.get(), last.id));
    assert.equal((await history.get()).data().inactivity.penalty, 7);
    const reset = db.doc("games/inactivity-return"),
      missing = await reset.get();
    await reset.set({
      status: "closed",
      closedAt: Timestamp.now(),
      scheduledAt: Timestamp.now(),
      teamA: { starters: [], bench: [uid] },
      teamB: { starters: [], bench: [] },
      score: { teamA: 0, teamB: 0 },
    });
    await onGame.run(eventFor(missing, await reset.get(), reset.id));
    assert.deepEqual((await history.get()).data().inactivity, {
      missed: 0,
      penalty: 0,
    });
  } finally {
    t.mock.timers.reset();
  }
});

test("fotografia semanal: admin, upload validado, perfil independente e semanas fechadas", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-09T12:00:00Z"),
  });
  try {
    const uid = "weekly-photo-player",
      admin = "weekly-photo-admin",
      design = { ...defaultPhotoDesign(), photoScale: 140, photoX: 40 };
    await db.doc(`users/${uid}`).set({
      uid,
      role: "member",
      disabled: false,
      primaryPosition: "ALA",
      photoURL: "https://example.com/profile.webp",
      createdAt: Timestamp.now(),
    });
    await db
      .doc(`users/${admin}`)
      .set({ uid: admin, role: "admin", disabled: false });
    await db.doc(`initialRatings/${uid}`).set({
      uid,
      ratings20: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 10])),
      createdAt: Timestamp.now(),
    });
    const call = (actor, extra = {}) =>
      saveWeeklyCardPhoto.run({
        auth: { uid: actor },
        data: {
          uid,
          weekId: "2026-W41",
          photoURL: "https://example.com/card.webp",
          design,
          ...extra,
        },
      });
    await assert.rejects(call(uid));
    await assert.rejects(call(admin, { weekId: "2026-W40" }));
    await assert.rejects(call(admin, { design: { shape: "mvp" } }));
    await assert.rejects(call(admin, { photoURL: "javascript:bad" }));
    await assert.rejects(call(admin, { imageBase64: "not-an-image" }));
    await call(admin);
    const history = db.doc(`users/${uid}/cardHistory/2026-W41`),
      first = (await history.get()).data();
    assert.deepEqual(first.cardPhoto, {
      photoURL: "https://example.com/card.webp",
      design,
    });
    assert.equal(
      (await db.doc(`users/${uid}`).get()).data().photoURL,
      "https://example.com/profile.webp",
    );
    const uploads = [];
    const storage = getStorage();
    t.mock.method(storage, "bucket", (name) => ({
      name,
      file: (path) => ({
        name: path,
        bucket: { name },
        save: async (buffer, options) =>
          uploads.push({ buffer, options, path }),
        delete: async () => {},
      }),
    }));
    const uploaded = await call(admin, {
      imageBase64: Buffer.from("RIFF0000WEBPimage-for-mocked-storage").toString(
        "base64",
      ),
    });
    assert.equal(uploads.length, 1);
    assert.ok(uploads[0].path.startsWith(`weekly-cards/${uid}/2026-W41/`));
    assert.equal(uploads[0].options.preconditionOpts.ifGenerationMatch, 0);
    assert.equal(uploads[0].options.metadata.contentType, "image/webp");
    assert.ok(
      uploaded.photoURL.startsWith("https://firebasestorage.googleapis.com/"),
    );
    assert.deepEqual((await history.get()).data().specials, first.specials);
    assert.deepEqual((await history.get()).data().stats, first.stats);
    await call(admin, { reset: true });
    assert.equal((await history.get()).data().cardPhoto, null);
    await call(admin);
    t.mock.timers.setTime(new Date("2026-10-14T11:00:00Z").getTime());
    await ensureHistory.run({ auth: { uid }, data: {} });
    const frozen = (await history.get()).data();
    await assert.rejects(call(admin));
    await assert.rejects(call(admin, { reset: true }));
    assert.equal(uploads.length, 1);
    t.mock.timers.setTime(new Date("2026-10-15T11:00:00Z").getTime());
    await ensureHistory.run({ auth: { uid }, data: {} });
    assert.equal(
      (await db.doc(`users/${uid}/cardHistory/2026-W42`).get()).data()
        .cardPhoto,
      null,
    );
    assert.deepEqual((await history.get()).data(), frozen);
    assert.equal(
      (await db.doc(`users/${uid}`).get()).data().photoURL,
      "https://example.com/profile.webp",
    );
  } finally {
    t.mock.timers.reset();
    t.mock.restoreAll();
  }
});

test("eventos e presets: permissões, eleições, fecho idempotente, recompensa semanal e eliminação", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  try {
    const ids = ["evt-a", "evt-b", "evt-c"],
      admin = "evt-admin",
      dbs = "evt-dbs";
    for (const uid of [...ids, admin, dbs])
      await db.doc(`users/${uid}`).set({
        uid,
        role: uid === admin ? "admin" : uid === dbs ? "dbs" : "member",
        disabled: false,
        primaryPosition: "ALA",
        createdAt: Timestamp.fromDate(new Date("2026-09-01")),
      });
    for (const uid of ids)
      await db.doc(`initialRatings/${uid}`).set({
        uid,
        ratings20: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 10])),
        createdAt: Timestamp.fromDate(new Date("2026-09-01")),
      });
    const call = (uid, data) => eventAction.run({ auth: { uid }, data });
    const reward = { boosts: { vision: 50, teamwork: 5 }, specialId: "mvp" };
    const payload = {
      action: "create",
      title: "Quem merece?",
      kind: "vote",
      endsAt: "2026-10-24T12:00:00Z",
      audience: { mode: "selected", memberIds: ids },
      questions: [{ label: "Melhor colega", candidateIds: ids, reward }],
      openNow: true,
      minVotes: 2,
    };
    await assert.rejects(call(ids[0], payload));
    await assert.rejects(call(dbs, payload));
    const { id } = await call(admin, payload);
    assert.deepEqual(
      (await db.doc(`events/${id}`).get()).data().questions[0].candidateIds,
      ids,
    );
    const { id: baseReward } = await call(admin, {
      ...payload,
      openNow: false,
      questions: [
        {
          label: "Carta dourada",
          candidateIds: [admin],
          reward: { boosts: {}, specialId: "gold-rare" },
        },
      ],
    });
    assert.deepEqual(
      (await db.doc(`events/${baseReward}`).get()).data().questions[0]
        .candidateIds,
      ids,
    );
    const savedTheme = await saveTheme.run({
      auth: { uid: admin },
      data: {
        name: "Prémio da comunidade",
        baseTheme: "gold-rare",
        texture: "plain",
        colors: {
          primary: "#123456",
          secondary: "#234567",
          text: "#ffffff",
          border: "#abcdef",
          glow: "#42e66c",
        },
        design: { shape: "shield", nameFont: "modern" },
      },
    });
    const { id: createdReward } = await call(admin, {
      ...payload,
      minVotes: 1,
      questions: [
        {
          label: "Carta criada",
          reward: {
            boosts: {},
            specialId: `saved:${savedTheme.id}`,
            cardTheme: { name: "Falsificado" },
          },
        },
      ],
    });
    const storedReward = (
      await db.doc(`events/${createdReward}/private/rewards`).get()
    ).data().questions.q1;
    const unrevealed = await getEvent.run({
      auth: { uid: ids[1] },
      data: { eventId: createdReward },
    });
    assert.equal(unrevealed.questions[0].reward, undefined);
    assert.equal(
      (await db.doc(`events/${createdReward}`).get()).data().questions[0]
        .reward,
      undefined,
    );
    assert.equal(
      (await listEvents.run({ auth: { uid: ids[1] }, data: {} })).find(
        (event) => event.id === createdReward,
      ).questions[0].reward,
      undefined,
    );
    assert.equal(storedReward.cardTheme.name, "Prémio da comunidade");
    assert.equal(storedReward.cardTheme.colors.primary, "#123456");
    await voteEvent.run({
      auth: { uid: ids[1] },
      data: { eventId: createdReward, answers: { q1: ids[0] } },
    });
    await call(admin, { action: "close", eventId: createdReward });
    const revealed = await getEvent.run({
      auth: { uid: ids[1] },
      data: { eventId: createdReward },
    });
    assert.equal(
      revealed.winners[0].reward.cardTheme.name,
      "Prémio da comunidade",
    );
    assert.equal(revealed.questions[0].reward, undefined);
    assert.ok(
      (await db.doc(`users/${ids[0]}/cardHistory/2026-W43`).get())
        .data()
        .specials.some(
          (special) =>
            special.id === `saved:${savedTheme.id}` &&
            special.cardTheme.name === "Prémio da comunidade",
        ),
    );
    await assert.rejects(
      call(admin, {
        ...payload,
        questions: [
          {
            label: "Inválida",
            reward: { boosts: {}, specialId: "saved:missing" },
          },
        ],
      }),
    );
    await assert.rejects(
      voteEvent.run({
        auth: { uid: ids[0] },
        data: { eventId: id, answers: { q1: ids[0] } },
      }),
    );
    await assert.rejects(
      voteEvent.run({
        auth: { uid: admin },
        data: { eventId: id, answers: { q1: ids[0] } },
      }),
    );
    for (const uid of ids.slice(1))
      await voteEvent.run({
        auth: { uid },
        data: { eventId: id, answers: { q1: ids[0] } },
      });
    await call(admin, { action: "close", eventId: id });
    const history = await db.doc(`users/${ids[0]}/cardHistory/2026-W43`).get();
    assert.equal(history.data().stats.vision, 99);
    assert.equal(history.data().stats.teamwork, 55);
    assert.ok(history.data().specials.some((special) => special.id === "mvp"));
    const rewardsBefore = (await db.collection("eventRewards").get()).size;
    await call(admin, { action: "close", eventId: id });
    assert.equal(
      (await db.collection("eventRewards").get()).size,
      rewardsBefore,
    );
    await assert.rejects(
      voteEvent.run({
        auth: { uid: ids[2] },
        data: { eventId: id, answers: { q1: ids[0] } },
      }),
    );
    const { id: automatic } = await call(admin, {
      ...payload,
      title: "Automatico",
      endsAt: "2026-10-23T13:00:00Z",
    });
    await voteEvent.run({
      auth: { uid: ids[1] },
      data: { eventId: automatic, answers: { q1: ids[0] } },
    });
    t.mock.timers.setTime(new Date("2026-10-23T14:00:00Z").getTime());
    await closeEvents.run({});
    assert.equal(
      (await db.doc(`events/${automatic}`).get()).data().status,
      "closed",
    );
    const insufficient = await getEvent.run({
      auth: { uid: ids[1] },
      data: { eventId: automatic },
    });
    assert.deepEqual(insufficient.winners[0].uids, []);
    assert.equal(insufficient.winners[0].reward, undefined);
    assert.equal(insufficient.questions[0].reward, undefined);
    const legacy = db.doc("events/privacy-legacy");
    await legacy.set({
      ...payload,
      status: "open",
      endsAt: Timestamp.fromDate(new Date(payload.endsAt)),
      questions: [
        { id: "q1", label: "Prémio privado", candidateIds: ids, reward },
      ],
    });
    const oldEvent = await getEvent.run({
      auth: { uid: ids[0] },
      data: { eventId: legacy.id },
    });
    assert.equal(oldEvent.questions[0].reward, undefined);
    await call(admin, { action: "cancel", eventId: legacy.id });
    const cancellation = await getEvent.run({
      auth: { uid: ids[0] },
      data: { eventId: legacy.id },
    });
    assert.deepEqual(cancellation.winners, []);
    assert.equal(cancellation.questions[0].reward, undefined);
    assert.equal((await legacy.get()).data().rewardPrivacy, 1);
    assert.deepEqual(
      (await legacy.collection("private").doc("rewards").get()).data().questions
        .q1,
      reward,
    );
    await assert.rejects(getEvent.run({ data: { eventId: legacy.id } }));
    const { id: mixed } = await call(admin, {
      ...payload,
      questions: [
        { label: "Prémio atribuído", reward },
        { label: "Prémio sem vencedor", reward },
      ],
    });
    for (const [uid, target] of [
      [ids[1], ids[0]],
      [ids[2], ids[1]],
    ])
      await voteEvent.run({
        auth: { uid },
        data: { eventId: mixed, answers: { q1: ids[0], q2: target } },
      });
    await call(admin, { action: "close", eventId: mixed });
    const mixedResult = await getEvent.run({
      auth: { uid: ids[0] },
      data: { eventId: mixed },
    });
    assert.deepEqual(mixedResult.winners[0].reward, {
      ...reward,
      criterion: CARD_CRITERIA.mvp,
    });
    assert.deepEqual(mixedResult.winners[1].uids, []);
    assert.equal(mixedResult.winners[1].reward, undefined);
    const { id: tie } = await call(admin, {
      ...payload,
      title: "Empate",
      minVotes: 1,
    });
    await voteEvent.run({
      auth: { uid: ids[0] },
      data: { eventId: tie, answers: { q1: ids[1] } },
    });
    await voteEvent.run({
      auth: { uid: ids[1] },
      data: { eventId: tie, answers: { q1: ids[0] } },
    });
    await call(admin, { action: "close", eventId: tie });
    assert.deepEqual(
      (await db.doc(`events/${tie}`).get()).data().winners[0].uids,
      ids.slice(0, 2),
    );
    for (let i = 1; i <= 2; i++)
      await db.doc(`games/evt-month-${i}`).set({
        status: "closed",
        scheduledAt: Timestamp.fromDate(new Date(`2026-09-0${i}T12:00:00Z`)),
        closedAt: Timestamp.fromDate(new Date(`2026-09-0${i}T13:00:00Z`)),
        teamA: { starters: [ids[0]], bench: [ids[1]] },
        teamB: { starters: i === 1 ? [ids[2]] : [], bench: [] },
        score: { teamA: 0, teamB: 0 },
      });
    const { id: monthly } = await call(admin, {
      ...payload,
      kind: "monthly",
      audience: { mode: "all" },
      month: "2026-09",
    });
    await assert.rejects(
      voteEvent.run({
        auth: { uid: ids[0] },
        data: { eventId: monthly, answers: { q1: ids[2] } },
      }),
    );
    await assert.rejects(
      voteEvent.run({
        auth: { uid: ids[2] },
        data: { eventId: monthly, answers: { q1: ids[0] } },
      }),
    );
    await voteEvent.run({
      auth: { uid: ids[1] },
      data: { eventId: monthly, answers: { q1: ids[0] } },
    });
    await db.doc("games/evt-month-3").set({
      status: "closed",
      scheduledAt: Timestamp.fromDate(new Date("2026-09-03T12:00:00Z")),
      closedAt: Timestamp.fromDate(new Date("2026-09-03T13:00:00Z")),
      teamA: { starters: [ids[1]], bench: [] },
      teamB: { starters: [ids[2]], bench: [] },
      score: { teamA: 0, teamB: 0 },
    });
    await call(admin, { action: "close", eventId: monthly });
    assert.deepEqual(
      (await db.doc(`events/${monthly}`).get()).data().winners[0].uids,
      [],
    );
    await assert.rejects(
      deleteGame.run({ auth: { uid: dbs }, data: { gameId: "evt-month-1" } }),
    );
    const open = db.doc("games/evt-open");
    await open.set({
      status: "open",
      teamA: { starters: [], bench: [] },
      teamB: { starters: [], bench: [] },
    });
    await deleteGame.run({ auth: { uid: dbs }, data: { gameId: open.id } });
    assert.equal((await open.get()).exists, false);
    await assert.rejects(
      initializeOvrPresets.run({ auth: { uid: dbs }, data: {} }),
    );
    await initializeOvrPresets.run({ auth: { uid: admin }, data: {} });
    assert.equal((await db.collection("ovrPresets").get()).size, 6);
    await assert.rejects(
      saveOvrPreset.run({
        auth: { uid: admin },
        data: { name: "bad", settings: { weights: { pace: 110 } } },
      }),
    );
    const preset = await saveOvrPreset.run({
      auth: { uid: admin },
      data: { name: "Minha", settings: DEFAULT_OVR_WEIGHTS },
    });
    assert.equal(
      (await db.doc(`ovrPresets/${preset.id}`).get()).data().name,
      "Minha",
    );
    t.mock.timers.setTime(new Date("2026-10-29T20:00:00Z").getTime());
    await ensureHistory.run({ auth: { uid: ids[0] }, data: {} });
    const next = (
      await db.doc(`users/${ids[0]}/cardHistory/2026-W44`).get()
    ).data();
    assert.equal(next.eventBoosts.vision, 0);
    assert.equal(
      next.specials.some((s) => s.eventReward),
      true,
    );
    t.mock.timers.setTime(new Date("2026-10-31T20:00:00Z").getTime());
    await ensureHistory.run({ auth: { uid: ids[0] }, data: {} });
    assert.equal(
      (await db.doc(`users/${ids[0]}/cardHistory/2026-W44`).get())
        .data()
        .specials.some((s) => s.eventReward),
      false,
    );
  } finally {
    t.mock.timers.reset();
  }
});

test("notificações: convocatórias, lembretes, alterações, votações e idempotência", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2030-01-16T08:00:00Z"),
  });
  try {
    const ids = ["notice-a", "notice-b", "notice-out", "notice-disabled"];
    for (const uid of ids)
      await db.doc(`users/${uid}`).set({
        uid,
        disabled: uid.endsWith("disabled"),
        displayName: uid,
        role: "member",
      });
    const ref = db.doc("games/notice-game"),
      date = Timestamp.fromDate(new Date("2030-01-17T20:00:00Z"));
    const draft = {
      status: "draft",
      title: "Convocatória teste",
      location: "Campo 1",
      scheduledAt: date,
      teamA: { starters: [ids[0]], bench: [ids[1], ids[3]] },
      teamB: { starters: [], bench: [] },
    };
    await ref.set(draft);
    const trigger = async (before, id) =>
      onGameNotifications.run({
        id,
        params: { gid: ref.id },
        data: { before: { data: () => before }, after: await ref.get() },
      });
    const notices = async (uid) =>
      (await db.collection(`users/${uid}/notifications`).get()).docs.map(
        (d) => ({ id: d.id, ...d.data() }),
      );
    await trigger(undefined, "draft-created");
    assert.equal((await notices(ids[0])).length, 0);
    await ref.update({ status: "open" });
    await trigger(draft, "game-opened");
    await trigger(draft, "game-opened");
    for (const uid of ids.slice(0, 2))
      assert.equal(
        (await notices(uid)).filter((n) => n.type === "GAME_CALLUP").length,
        1,
      );
    assert.equal((await notices(ids[3])).length, 0);
    const callup = (await notices(ids[0]))[0];
    await db
      .doc(`users/${ids[0]}/notifications/${callup.id}`)
      .update({ read: true });
    await trigger(draft, "game-opened");
    assert.equal((await notices(ids[0]))[0].read, true);
    await scheduledNotifications.run({});
    assert.equal(
      (await notices(ids[0])).filter((n) => n.type === "GAME_REMINDER").length,
      0,
    );
    t.mock.timers.setTime(new Date("2030-01-16T10:00:00Z").getTime());
    await scheduledNotifications.run({});
    await scheduledNotifications.run({});
    assert.equal(
      (await notices(ids[0])).filter((n) => n.title === "Amanhã tens jogo!")
        .length,
      1,
    );
    assert.equal((await notices(ids[2])).length, 0);
    t.mock.timers.setTime(new Date("2030-01-17T10:00:00Z").getTime());
    await scheduledNotifications.run({});
    assert.equal(
      (await notices(ids[1])).filter((n) => n.title === "Hoje tens jogo!")
        .length,
      1,
    );
    let before = (await ref.get()).data();
    await ref.update({ location: "Campo 2" });
    await trigger(before, "game-location-changed");
    assert.ok(
      (await notices(ids[0])).some(
        (n) => n.type === "GAME_UPDATED" && n.body.includes("Campo 2"),
      ),
    );
    before = (await ref.get()).data();
    await ref.update({ teamA: { starters: [ids[0]], bench: [] } });
    await trigger(before, "player-removed");
    assert.ok(
      (await notices(ids[1])).some((n) => n.title === "Convocação alterada"),
    );
    before = (await ref.get()).data();
    await ref.update({ status: "draft" });
    await trigger(before, "game-cancelled");
    assert.ok(
      (await notices(ids[0])).some((n) => n.title === "Jogo cancelado"),
    );
    const count = (await notices(ids[0])).length;
    await scheduledNotifications.run({});
    assert.equal((await notices(ids[0])).length, count);
    // A delayed old opening delivery must not notify a cancelled game.
    await onGameNotifications.run({
      id: "stale",
      params: { gid: ref.id },
      data: {
        before: { data: () => draft },
        after: { data: () => ({ ...draft, status: "open" }) },
      },
    });
    assert.equal((await notices(ids[0])).length, count);
    const ev = db.doc("events/notice-event");
    await ev.set({
      status: "open",
      title: "Evento de teste",
      kind: "vote",
      endsAt: Timestamp.fromDate(new Date("2030-01-17T20:00:00Z")),
      audience: { mode: "selected", memberIds: ids.slice(0, 2) },
      questions: [
        { id: "q1", label: "Melhor jogador", candidateIds: ids.slice(0, 2) },
      ],
    });
    await ev
      .collection("votes")
      .doc(ids[1])
      .set({ answers: { q1: ids[0] } });
    await onEventNotifications.run({ params: { eid: ev.id } });
    await onEventNotifications.run({ params: { eid: ev.id } });
    assert.equal(
      (await notices(ids[0])).filter((n) => n.type === "EVENT_OPEN").length,
      1,
    );
    assert.equal(
      (await notices(ids[0])).filter((n) => n.type === "EVENT_DEADLINE").length,
      1,
    );
    assert.equal(
      (await notices(ids[1])).filter((n) => n.type === "EVENT_DEADLINE").length,
      0,
    );
    assert.equal((await notices(ids[2])).length, 0);
    await ev.update({
      status: "closed",
      rewardsApplied: true,
      winners: [{ label: "Melhor jogador", uids: [ids[0]], votes: 1 }],
    });
    await onEventNotifications.run({ params: { eid: ev.id } });
    await onEventNotifications.run({ params: { eid: ev.id } });
    assert.equal(
      (await notices(ids[0])).filter((n) => n.type === "EVENT_REWARD").length,
      1,
    );
    assert.ok(
      (await notices(ids[1])).some(
        (n) => n.type === "EVENT_CLOSED" && n.body.includes(ids[0]),
      ),
    );
    assert.equal(
      (await notices(ids[1])).filter((n) => n.type === "EVENT_REWARD").length,
      0,
    );
    assert.ok(
      (await notices(ids[1])).some(
        (n) =>
          n.type === "EVENT_CLOSED" &&
          n.body.includes("a recompensa foi atribuída"),
      ),
    );
    const noVotes = db.doc("events/notice-no-votes");
    await noVotes.set({
      ...(await ev.get()).data(),
      title: "Votação sem votos suficientes",
      rewardsApplied: false,
      winners: [{ label: "Melhor jogador", uids: [], votes: 0 }],
    });
    await onEventNotifications.run({ params: { eid: noVotes.id } });
    assert.equal(
      (
        await db
          .doc(`users/${ids[0]}/notifications/event-result-${noVotes.id}`)
          .get()
      ).exists,
      false,
    );
    await noVotes.update({ rewardsApplied: true });
    await onEventNotifications.run({ params: { eid: noVotes.id } });
    await onEventNotifications.run({ params: { eid: noVotes.id } });
    const result = await db
      .doc(`users/${ids[0]}/notifications/event-result-${noVotes.id}`)
      .get();
    assert.match(
      result.data().body,
      /a ninguém porque não existiram votos suficientes/,
    );
    assert.equal(result.data().href, `#/event/${noVotes.id}`);
    assert.equal(
      (await notices(ids[0])).filter(
        (n) => n.type === "EVENT_CLOSED" && n.href === `#/event/${noVotes.id}`,
      ).length,
      1,
    );
    // Only incomplete voters receive the single post-game reminder.
    await ref.update({
      status: "closed",
      closedAt: Timestamp.fromDate(new Date("2030-01-16T09:00:00Z")),
      teamA: { starters: ids.slice(0, 2), bench: [] },
    });
    await ref
      .collection("feedback")
      .doc("b-a")
      .set({ raterId: ids[1], targetId: ids[0], submitted: true });
    await ref
      .collection("feedback")
      .doc("b-b")
      .set({ raterId: ids[1], targetId: ids[1], submitted: true });
    await scheduledNotifications.run({});
    await scheduledNotifications.run({});
    assert.equal(
      (await notices(ids[0])).filter((n) => n.type === "RATING_REQUIRED")
        .length,
      1,
    );
    assert.equal(
      (await notices(ids[1])).filter((n) => n.type === "RATING_REQUIRED")
        .length,
      0,
    );
  } finally {
    t.mock.timers.reset();
  }
});

test("escolha da carta: coleção própria, normal e seleção independente dos snapshots fechados", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const uid = "weekly-choice-player";
  await db
    .doc(`users/${uid}`)
    .set({ uid, role: "member", disabled: false, primaryPosition: "AV" });
  await db.doc(`initialRatings/${uid}`).set({
    uid,
    ratings20: all(12),
    completed: true,
    createdAt: Timestamp.now(),
  });
  for (const specialId of ["mvp", "sniper"])
    await db.doc(`eventRewards/choice-${specialId}`).set({
      uid,
      schemaVersion: 2,
      startsAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date("2026-11-02T12:00Z")),
      reward: { mode: "card", specialId, statDuration: "weekly", boosts: {} },
    });
  const cycle = cardWeek();
  const choose = (cardId) =>
    selectWeeklyCard.run({
      auth: { uid },
      data: { weekId: cycle.weekId, cardId },
    });
  await assert.rejects(
    selectWeeklyCard.run({ data: { weekId: cycle.weekId, cardId: "mvp" } }),
  );
  await assert.rejects(choose("not-earned"));
  await choose("sniper");
  const ref = db.doc(`users/${uid}/cardHistory/${cycle.weekId}`);
  assert.equal((await ref.get()).data().selectedCardId, "sniper");
  assert.equal(
    (await db.doc(`weeklyCards/${uid}`).get()).data().selectedCardId,
    "sniper",
  );
  await ensureHistory.run({ auth: { uid }, data: {} });
  assert.equal((await ref.get()).data().selectedCardId, "sniper");
  t.mock.timers.setTime(new Date("2026-10-28T12:00:00Z").getTime());
  await choose("mvp");
  await ensureHistory.run({ auth: { uid }, data: {} });
  assert.equal((await ref.get()).data().locked, true);
  assert.equal((await ref.get()).data().selectedCardId, "sniper");
  t.mock.timers.setTime(new Date("2026-10-29T12:00:00Z").getTime());
  await ensureHistory.run({ auth: { uid }, data: {} });
  assert.equal((await ref.get()).data().selectedCardId, "sniper");
  const next = (
    await db.doc(`users/${uid}/cardHistory/${cardWeek().weekId}`).get()
  ).data();
  assert.equal(next.selectedCardId, "mvp");
  t.mock.timers.setTime(new Date("2026-10-31T12:00:00Z").getTime());
  await ensureHistory.run({ auth: { uid }, data: {} });
  assert.equal(
    (await db.doc(`cardSelections/${uid}`).get()).data().selectedCardId,
    "base",
  );
});

test("OVR usa base e melhorias, nunca os valores de cartas guardadas", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const uid = "base-growth-independent";
  await db
    .doc(`users/${uid}`)
    .set({ uid, role: "member", disabled: false, primaryPosition: "AV" });
  await db.doc(`initialRatings/${uid}`).set({
    uid,
    ratings20: all(12),
    completed: true,
    createdAt: Timestamp.now(),
  });
  const cycle = cardWeek();
  const oldWeek = cardWeek(new Date(+cycle.opensAt - 1)).weekId;
  const oldRef = db.doc(`users/${uid}/cardHistory/${oldWeek}`);
  await oldRef.set({ weekId: oldWeek, stats: all(99), ovr: 99, locked: true });
  await db
    .doc(`weeklyCards/${uid}`)
    .set({ uid, weekId: oldWeek, stats: all(99), ovr: 99 });
  await ensureHistory.run({ auth: { uid }, data: {} });
  const currentRef = db.doc(`users/${uid}/cardHistory/${cycle.weekId}`);
  const first = (await currentRef.get()).data();
  assert.equal(first.ovr, 59);
  assert.deepEqual(first.stats, all(59));
  await oldRef.update({ stats: all(1), ovr: 1 });
  await ensureHistory.run({ auth: { uid }, data: {} });
  assert.deepEqual((await currentRef.get()).data().stats, first.stats);
  assert.equal((await currentRef.get()).data().ovr, first.ovr);
  await db.doc(`eventRewards/${uid}`).set({
    uid,
    schemaVersion: 2,
    startsAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(new Date("2026-11-01")),
    reward: { statDuration: "weekly", boosts: { shooting: 4 } },
  });
  for (let i = 0; i < 2; i++) {
    await ensureHistory.run({ auth: { uid }, data: {} });
    assert.equal((await currentRef.get()).data().stats.shooting, 63);
  }
});

test("autoavaliação pesa 4% quando existem pelo menos cinco avaliações externas", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const uid = "self-weight-ten-votes";
  await db
    .doc(`users/${uid}`)
    .set({ uid, role: "member", disabled: false, primaryPosition: "AV" });
  await db.doc(`initialRatings/${uid}`).set({
    uid,
    ratings20: all(0),
    completed: true,
    createdAt: Timestamp.now(),
  });
  for (let i = 0; i < 10; i++)
    await db.doc(`communityRatings/self-weight-${i}`).set({
      raterId: `rater-${i}`,
      targetId: uid,
      ratings20: all(15),
      submitted: true,
      submittedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
  await ensureHistory.run({ auth: { uid }, data: {} });
  const snapshot = (
    await db.doc(`users/${uid}/cardHistory/${cardWeek().weekId}`).get()
  ).data();
  const expected = Math.round((15 * 0.96 * 99) / 20);
  assert.deepEqual(snapshot.stats, all(expected));
  assert.equal(snapshot.ovr, expected);
  assert.ok(expected > Math.round((15 * 0.8 * 99) / 20));
});

test("correção administrativa também respeita 7 dias desde a submissão", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-23T12:00Z") });
  t.after(() => t.mock.timers.reset());
  const adminId = "rating-window-admin";
  await db
    .doc(`users/${adminId}`)
    .set({ uid: adminId, role: "admin", disabled: false });
  const submittedAt = Timestamp.fromDate(new Date("2026-10-17T12:00Z"));
  const ref = db.doc("communityRatings/window-test");
  await ref.set({
    raterId: "one",
    targetId: "two",
    submitted: true,
    ratings20: all(12),
    submittedAt,
    createdAt: submittedAt,
  });
  const request = {
    auth: { uid: adminId },
    data: { kind: "community", id: "window-test", ratings: all(13) },
  };
  await correctRating.run(request);
  assert.equal(
    (await ref.get()).data().submittedAt.toMillis(),
    submittedAt.toMillis(),
  );
  t.mock.timers.setTime(new Date("2026-10-24T12:00Z").getTime());
  await assert.rejects(correctRating.run(request), /7 dias/);
});
