import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  eventAction,
  voteEvent,
  getEvent,
  listEvents,
  claimMission,
  closeEvents,
  onEventNotifications,
  onGame,
} from "../functions/index.js";
import { ATTRIBUTES } from "../js/utils.js";
const db = getFirestore(),
  admin = "managed-admin",
  ids = ["managed-a", "managed-b", "managed-c", "managed-d"];
const prize = (variant) => ({
  mode: "card",
  statDuration: "weekly",
  boosts: {},
  specialId: variant === 9 ? "sniper" : "mvp",
});
const call = (action, data = {}) =>
  eventAction.run({ auth: { uid: admin }, data: { action, ...data } });
const payload = () => ({
  schemaVersion: 2,
  title: "Torneio da liga",
  kind: "event",
  method: "vote",
  startsAt: "2026-10-20T00:00:00Z",
  endsAt: "2026-10-24T00:00:00Z",
  audience: { mode: "selected", memberIds: ids },
  winnerCount: 3,
  positions: [prize(10), prize(7), prize(5)],
  votesPerUser: 2,
  minVotes: 1,
  needsConfirmation: true,
  tieBreak: "uid",
});
test("eventos modernos: permissão, privacidade, votos, revisão, pódio, entrega única e anulação", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  for (const uid of [admin, ...ids]) {
    await db.doc(`users/${uid}`).set({
      uid,
      role: uid === admin ? "admin" : "member",
      disabled: false,
      primaryPosition: "AV",
    });
    await db.doc(`initialRatings/${uid}`).set({
      uid,
      ratings20: Object.fromEntries(ATTRIBUTES.map(([k]) => [k, 12])),
      completed: true,
      createdAt: Timestamp.fromDate(new Date("2026-10-01")),
    });
  }
  await assert.rejects(
    eventAction.run({
      auth: { uid: ids[0] },
      data: { action: "create", ...payload() },
    }),
  );
  const { id } = await call("create", { ...payload(), rarity: "ultimate", openNow: true });
  const publicBefore = await getEvent.run({
    auth: { uid: ids[0] },
    data: { eventId: id },
  });
  assert.equal(publicBefore.configuration, undefined);
  assert.equal(publicBefore.rarity, "ultimate");
  await call("update", { ...payload(), eventId: id });
  assert.equal((await getEvent.run({ auth: { uid: ids[0] }, data: { eventId: id } })).rarity, "ultimate");
  await assert.rejects(call("create", { ...payload(), rarity: "invalid" }));
  assert.equal(publicBefore.rewardPreview.length, 3);
  assert.equal(publicBefore.rewardPreview[0].specialId, "mvp");
  assert.equal(publicBefore.ballots, undefined);
  assert.deepEqual(publicBefore.winners, []);
  await assert.rejects(
    voteEvent.run({
      auth: { uid: ids[0] },
      data: { eventId: id, selections: [ids[1], ids[1]] },
    }),
  );
  await assert.rejects(
    voteEvent.run({
      auth: { uid: ids[0] },
      data: { eventId: id, selections: [ids[0]] },
    }),
  );
  for (const [uid, selections] of [
    [ids[0], [ids[1], ids[2]]],
    [ids[1], [ids[0], ids[2]]],
    [ids[2], [ids[0], ids[1]]],
    [ids[3], [ids[0], ids[1]]],
  ])
    await voteEvent.run({ auth: { uid }, data: { eventId: id, selections } });
  await voteEvent.run({
    auth: { uid: ids[3] },
    data: { eventId: id, selections: [ids[0], ids[1]] },
  });
  assert.equal(
    (await db.doc(`events/${id}`).collection("votes").get()).size,
    4,
  );
  await call("prepare", { eventId: id });
  assert.equal((await db.doc(`events/${id}`).get()).data().status, "review");
  assert.equal(
    (await db.collection("eventRewards").where("eventId", "==", id).get()).size,
    0,
  );
  const audited = await getEvent.run({
    auth: { uid: admin },
    data: { eventId: id },
  });
  assert.equal(audited.ballots.length, 4);
  assert.equal(audited.configuration.positions.length, 3);
  assert.ok(audited.flags.length);
  await assert.rejects(
    voteEvent.run({
      auth: { uid: ids[0] },
      data: { eventId: id, selections: [ids[1]] },
    }),
  );
  await call("confirm", { eventId: id });
  await call("confirm", { eventId: id });
  const result = await getEvent.run({
    auth: { uid: ids[0] },
    data: { eventId: id },
  });
  assert.deepEqual(
    result.winners.map((w) => [w.position, w.uid]),
    [
      [1, ids[0]],
      [2, ids[1]],
      [3, ids[2]],
    ],
  );
  assert.equal(result.winners[0].reward.specialId, "mvp");
  assert.equal(result.ballots, undefined);
  assert.equal(
    (await db.collection("eventRewards").where("eventId", "==", id).get()).size,
    3,
  );
  assert.ok(
    (
      await listEvents.run({
        auth: { uid: ids[0] },
        data: { scope: "history" },
      })
    ).some((e) => e.id === id),
  );
  await call("revoke", {
    eventId: id,
    reason: "Resultado anulado para revisão",
  });
  assert.ok(
    (
      await db.collection("eventRewards").where("eventId", "==", id).get()
    ).docs.every((d) => d.data().revokedAt),
  );
  assert.equal(
    (await db.doc(`events/${id}`).collection("votes").get()).size,
    4,
  );
});
test("missões: objetivos reais, limite de repetição, progresso coletivo e duplicação", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const stamp = Timestamp.fromDate(new Date("2026-10-22T12:00:00Z"));
  await db.doc("games/managed-mission-game").set({
    status: "closed",
    closedAt: stamp,
    scheduledAt: stamp,
    teamA: { starters: [ids[0], ids[1]], bench: [] },
    teamB: { starters: [ids[2]], bench: [] },
    score: { teamA: 7, teamB: 5 },
    performance: {
      teamA: { goals: [ids[0], ids[0], ids[1]], assists: [ids[0]] },
    },
  });
  const mission = {
    ...payload(),
    kind: "mission",
    method: "objective",
    winnerCount: 1,
    positions: [prize(5)],
    objective: { metric: "goals", target: 2 },
    openNow: true,
  };
  const { id } = await call("create", mission);
  await assert.rejects(
    claimMission.run({
      auth: { uid: ids[1] },
      data: { eventId: id, progress: 999 },
    }),
  );
  const first = await claimMission.run({
    auth: { uid: ids[0] },
    data: { eventId: id },
  });
  assert.equal(first.reward.specialId, "mvp");
  await claimMission.run({ auth: { uid: ids[0] }, data: { eventId: id } });
  assert.equal(
    (await db.collection("eventRewards").where("eventId", "==", id).get()).size,
    1,
  );
  const detail = await getEvent.run({
    auth: { uid: ids[0] },
    data: { eventId: id },
  });
  assert.equal(detail.progress[0].progress, 2);
  assert.deepEqual(detail.claimedPeriods, ["once"]);
  const collective = await call("create", {
    ...mission,
    title: "Objetivo da equipa",
    scope: "collective",
    objective: { metric: "goals", target: 3 },
  });
  await claimMission.run({
    auth: { uid: ids[1] },
    data: { eventId: collective.id },
  });
  const copy = await call("duplicate", { eventId: id });
  assert.equal(
    (await db.doc(`events/${copy.id}`).get()).data().status,
    "draft",
  );
  await call("cancel", { eventId: id });
  assert.ok(
    (
      await db.collection("eventRewards").where("eventId", "==", id).get()
    ).docs[0].data().revokedAt,
  );
});
test("agendamento, limites e escolha ADMIN são validados no servidor", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  await assert.rejects(
    call("create", {
      ...payload(),
      positions: [
        { mode: "stats", statDuration: "permanent", boosts: { shooting: 11 } },
        prize(1),
        prize(1),
      ],
    }),
  );
  const { id } = await call("create", {
    ...payload(),
    method: "admin",
    startsAt: "2026-10-23T13:00:00Z",
    endsAt: "2026-10-24T00:00:00Z",
    openNow: true,
  });
  assert.equal((await db.doc(`events/${id}`).get()).data().status, "scheduled");
  t.mock.timers.setTime(+new Date("2026-10-23T14:00:00Z"));
  await closeEvents.run({});
  assert.equal((await db.doc(`events/${id}`).get()).data().status, "open");
  await call("prepare", { eventId: id, winnerIds: [ids[2], ids[0]] });
  await call("confirm", { eventId: id, winnerIds: [ids[2], ids[0]] });
  assert.deepEqual(
    (
      await getEvent.run({ auth: { uid: ids[0] }, data: { eventId: id } })
    ).winners.map((w) => w.uid),
    [ids[2], ids[0]],
  );
});

test("missões semanais renovam progresso; máximos permanentes e expiração são efetivos", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const mission = {
    ...payload(),
    kind: "mission",
    method: "objective",
    winnerCount: 1,
    positions: [
      {
        mode: "stats",
        statDuration: "permanent",
        boosts: { shooting: 2 },
      },
    ],
    objective: { metric: "goals", target: 2 },
    cadence: "weekly",
    maxRepeats: 2,
    endsAt: "2026-11-10T00:00:00Z",
    openNow: true,
  };
  const { id } = await call("create", mission);
  const claim = (eventId) =>
    claimMission.run({ auth: { uid: ids[0] }, data: { eventId } });
  await claim(id);
  const first = (
    await db.collection("eventRewards").where("eventId", "==", id).get()
  ).docs[0].data();
  assert.equal(first.reward.boosts.shooting, 2);
  assert.equal(
    first.expiresAt.toMillis() - first.startsAt.toMillis(),
    7 * 86400000,
  );
  t.mock.timers.setTime(+new Date("2026-10-30T12:00:00Z"));
  await assert.rejects(claim(id));
  const stamp = Timestamp.fromDate(new Date("2026-10-30T10:00:00Z"));
  await db.doc("games/managed-repeat-game").set({
    status: "closed",
    closedAt: stamp,
    scheduledAt: stamp,
    teamA: { starters: [ids[0]], bench: [] },
    teamB: { starters: [ids[2]], bench: [] },
    score: { teamA: 3, teamB: 1 },
    performance: { teamA: { goals: [ids[0], ids[0]], assists: [] } },
  });
  await claim(id);
  await claim(id);
  assert.equal(
    (await db.collection("eventRewards").where("eventId", "==", id).get()).size,
    2,
  );
  for (const index of [1, 2, 3, 4]) {
    const extra = await call("create", {
      ...mission,
      startsAt: "2026-10-29T00:00:00Z",
      title: `Permanente ${index}`,
      cadence: "once",
      maxRepeats: 1,
    });
    const result = await claim(extra.id);
    assert.equal(result.reward.boosts.shooting, index <= 3 ? 2 : 0);
  }
  t.mock.timers.setTime(+new Date("2026-11-07T12:00:00Z"));
  await assert.rejects(claim(id));
  await closeEvents.run({});
  assert.equal(
    (
      await db.collection("eventRewards").where("eventId", "==", id).get()
    ).docs[0].data().expirationProcessed,
    true,
  );
});

test("notificações usam o pódio e prémios efetivos, sem recompensas de participação", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const { id } = await call("create", {
    ...payload(),
    method: "admin",
    winnerCount: 1,
    positions: [prize(8)],
    openNow: true,
  });
  await call("prepare", { eventId: id, winnerIds: [ids[2]] });
  await call("confirm", { eventId: id, winnerIds: [ids[2]] });
  await onEventNotifications.run({ params: { eid: id } });
  const notice = (
    await db.doc(`users/${ids[2]}/notifications/event-result-${id}`).get()
  ).data();
  assert.equal(notice.podium[0].position, 1);
  assert.match(notice.podium[0].reward, /Melhor em campo/);
  assert.match(notice.body, /🥇/);
  const received = (
    await db.doc(`users/${ids[2]}/notifications/event-reward-${id}`).get()
  ).data();
  assert.match(received.body, /Melhor em campo/);
  const details = await getEvent.run({
    auth: { uid: admin },
    data: { eventId: id },
  });
  assert.equal(details.participationAwards.length, 0);
});

test("indefinite missions unlock after all or any prerequisites and reject cycles", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const mission = {
    ...payload(),
    kind: "mission",
    method: "objective",
    indefinite: true,
    endsAt: null,
    winnerCount: 1,
    positions: [prize(1)],
    objective: { metric: "games", target: 1 },
    cadence: "once",
    openNow: true,
  };
  const first = await call("create", { ...mission, title: "Primeira" });
  const second = await call("create", { ...mission, title: "Segunda" });
  const prerequisites = { mode: "all", missionIds: [first.id, second.id] };
  const child = await call("create", {
    ...mission,
    title: "Todas",
    prerequisites,
  });
  const any = await call("create", {
    ...mission,
    title: "Uma",
    prerequisites: { ...prerequisites, mode: "any" },
  });
  const detail = (id) =>
    getEvent.run({ auth: { uid: ids[0] }, data: { eventId: id } });
  const claim = (id) =>
    claimMission.run({ auth: { uid: ids[0] }, data: { eventId: id } });
  assert.equal(await detail(child.id), null);
  await assert.rejects(claim(child.id));
  await db.doc("games/unlock-before").set({
    status: "closed",
    closedAt: Timestamp.fromDate(new Date("2026-10-22")),
    teamA: { starters: [ids[0]], bench: [] },
    teamB: { starters: [ids[1]], bench: [] },
    score: { teamA: 1, teamB: 0 },
  });
  await claim(first.id);
  assert.ok(await detail(any.id));
  assert.equal(await detail(child.id), null);
  await claim(second.id);
  const unlocked = await detail(child.id);
  assert.equal(unlocked.endsAt, null);
  await assert.rejects(claim(child.id));
  t.mock.timers.setTime(+new Date("2026-10-23T14:00:00Z"));
  await db.doc("games/unlock-after").set({
    status: "closed",
    closedAt: Timestamp.fromDate(new Date("2026-10-23T13:00:00Z")),
    teamA: { starters: [ids[0]], bench: [] },
    teamB: { starters: [ids[1]], bench: [] },
    score: { teamA: 1, teamB: 0 },
  });
  await claim(child.id);
  const draft = await call("create", {
    ...mission,
    openNow: false,
    title: "Raiz",
  });
  const dependent = await call("create", {
    ...mission,
    openNow: false,
    title: "Dependente",
    prerequisites: { mode: "all", missionIds: [draft.id] },
  });
  await assert.rejects(
    call("update", {
      ...mission,
      openNow: false,
      eventId: draft.id,
      prerequisites: { mode: "all", missionIds: [dependent.id] },
    }),
  );
  await assert.rejects(
    call("create", {
      ...mission,
      prerequisites: { mode: "all", missionIds: ["missing"] },
    }),
  );
  t.mock.timers.setTime(+new Date("2028-01-01"));
  await closeEvents.run({});
  assert.equal(
    (await db.doc(`events/${child.id}`).get()).data().status,
    "open",
  );
  assert.ok(await detail(child.id));
});

test("ADMIN edits published and ended missions without resetting status or awards", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T14:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const mission = {
    ...payload(),
    kind: "mission",
    method: "objective",
    indefinite: true,
    endsAt: null,
    winnerCount: 1,
    positions: [prize(2)],
    objective: { metric: "games", target: 1 },
    cadence: "once",
    openNow: true,
  };
  const { id } = await call("create", mission);
  const claim = () =>
    claimMission.run({ auth: { uid: ids[0] }, data: { eventId: id } });
  await claim();
  const before = (await db.doc(`events/${id}`).get()).data();
  const awards = await db
    .collection("eventRewards")
    .where("eventId", "==", id)
    .get();
  const changes = {
    ...mission,
    eventId: id,
    title: "Missão atualizada",
    description: "Nova descrição",
    rules: "Novas regras",
    image: "https://example.com/mission.png",
    objective: { metric: "goals", target: 10 },
    scope: "collective",
    difficulty: "hard",
    maxRepeats: 1,
    positions: [prize(9)],
    openNow: false,
  };
  await assert.rejects(
    eventAction.run({
      auth: { uid: ids[0] },
      data: { action: "update", ...changes },
    }),
  );
  await call("update", changes);
  const updated = (await db.doc(`events/${id}`).get()).data();
  assert.equal(updated.title, changes.title);
  assert.equal(updated.description, changes.description);
  assert.deepEqual(updated.objective, changes.objective);
  assert.equal(updated.scope, "collective");
  assert.equal(updated.difficulty, "hard");
  assert.equal(updated.status, "open");
  assert.deepEqual(updated.createdAt, before.createdAt);
  assert.deepEqual(updated.winners, before.winners);
  const existing = await claim();
  assert.equal(existing.reward.specialId, "mvp");
  assert.equal(
    (await db.collection("eventRewards").where("eventId", "==", id).get()).size,
    awards.size,
  );
  assert.equal(
    (await db.doc(`events/${id}/private/rewards`).get()).data().positions[0]
      .specialId,
    "sniper",
  );
  await call("close", { eventId: id });
  t.mock.timers.setTime(+new Date("2026-10-25"));
  await call("update", {
    ...changes,
    title: "Missão terminada editada",
    indefinite: false,
    endsAt: "2026-10-24T00:00:00Z",
    openNow: true,
  });
  assert.equal((await db.doc(`events/${id}`).get()).data().status, "closed");
  await assert.rejects(claim());
  const cancelled = await call("create", {
    ...mission,
    title: "Para cancelar",
  });
  await call("cancel", { eventId: cancelled.id });
  await call("update", {
    ...changes,
    eventId: cancelled.id,
    title: "Missão cancelada editada",
  });
  assert.equal(
    (await db.doc(`events/${cancelled.id}`).get()).data().status,
    "cancelled",
  );
});

test("permanent prizes allow larger grants but clip each attribute at ten", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T14:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const base = {
    ...payload(),
    kind: "mission",
    method: "objective",
    indefinite: true,
    endsAt: null,
    winnerCount: 1,
    objective: { metric: "games", target: 1 },
    cadence: "once",
    openNow: true,
  };
  for (const [index, boost] of [7, 7].entries()) {
    const mission = await call("create", {
      ...base,
      title: `Grande recompensa ${index}`,
      positions: [
        {
          mode: "stats",
          statDuration: "permanent",
          boosts: { passing: boost, dribbling: boost },
        },
      ],
    });
    const result = await claimMission.run({
      auth: { uid: ids[0] },
      data: { eventId: mission.id },
    });
    assert.equal(result.reward.boosts.passing, index === 0 ? 7 : 3);
    assert.equal(result.reward.boosts.dribbling, index === 0 ? 7 : 3);
  }
  await assert.rejects(
    call("create", {
      ...base,
      positions: [
        { mode: "recognition", statDuration: "weekly", boosts: {}, points: 5 },
      ],
    }),
  );
});

test("only ADMIN deletes cancelled missions, removing children and protecting prerequisites", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T14:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const mission = {
    ...payload(),
    kind: "mission",
    method: "objective",
    indefinite: true,
    endsAt: null,
    winnerCount: 1,
    objective: { metric: "games", target: 1 },
    cadence: "once",
    positions: [prize(1)],
    openNow: true,
  };
  const { id } = await call("create", mission);
  await assert.rejects(call("delete", { eventId: id }));
  const dependent = await call("create", {
    ...mission,
    prerequisites: { mode: "all", missionIds: [id] },
  });
  await claimMission.run({ auth: { uid: ids[0] }, data: { eventId: id } });
  await call("cancel", { eventId: id });
  await assert.rejects(
    eventAction.run({
      auth: { uid: ids[0] },
      data: { action: "delete", schemaVersion: 2, eventId: id },
    }),
  );
  await assert.rejects(call("delete", { eventId: id }));
  await call("update", {
    ...mission,
    eventId: dependent.id,
    prerequisites: { mode: "all", missionIds: [] },
  });
  await db.doc(`events/${id}/votes/${ids[0]}`).set({ selections: [ids[1]] });
  await call("delete", { eventId: id, schemaVersion: 2 });
  assert.equal((await db.doc(`events/${id}`).get()).exists, false);
  for (const collection of ["private", "audit", "votes"])
    assert.equal(
      (await db.collection(`events/${id}/${collection}`).get()).size,
      0,
    );
  assert.equal(
    await getEvent.run({ auth: { uid: admin }, data: { eventId: id } }),
    null,
  );
  assert.ok(
    !(
      await listEvents.run({ auth: { uid: admin }, data: { scope: "all" } })
    ).some((event) => event.id === id),
  );
  const rewards = await db
    .collection("eventRewards")
    .where("eventId", "==", id)
    .get();
  assert.ok(rewards.docs.every((row) => row.data().revokedAt));
  await call("delete", { eventId: id, schemaVersion: 2 });
});

test("events support unlimited duration, live voting, complete editing and cancelled deletion", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T14:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const base = {
    ...payload(),
    indefinite: true,
    endsAt: null,
    votingEndsAt: null,
    winnerCount: 1,
    positions: [prize(1)],
    openNow: true,
  };
  const { id } = await call("create", base);
  await voteEvent.run({
    auth: { uid: ids[0] },
    data: { eventId: id, selections: [ids[1]] },
  });
  await call("update", {
    ...base,
    eventId: id,
    title: "Votação editada",
    openNow: false,
  });
  assert.equal((await db.doc(`events/${id}`).get()).data().status, "open");
  assert.equal(
    (await db.doc(`events/${id}/votes/${ids[0]}`).get()).exists,
    true,
  );
  await onEventNotifications.run({ params: { eid: id } });
  assert.doesNotMatch(
    (
      await db.doc(`users/${ids[0]}/notifications/mission-event-${id}`).get()
    ).data().body,
    /1970/,
  );
  await call("cancel", { eventId: id });
  await call("delete", { eventId: id, schemaVersion: 2 });
  assert.equal((await db.doc(`events/${id}`).get()).exists, false);
});

test("objective competition closes on first verified completion and preserves chronological podium", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T16:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  const base = {
    ...payload(),
    title: "Corrida ao golo",
    method: "objective",
    indefinite: true,
    endsAt: null,
    startsAt: "2026-10-23T14:00:00Z",
    winnerCount: 1,
    positions: [prize(1)],
    objective: { metric: "goals", target: 2 },
    cadence: "once",
    liveResults: true,
    needsConfirmation: false,
    openNow: true,
  };
  const { id } = await call("create", base);
  for (const [index, uid] of [ids[1], ids[0]].entries())
    await db.doc(`games/race-goals-${index}`).set({
      title: `Jogo da competição ${index}`,
      scheduledAt: Timestamp.fromDate(
        new Date(`2026-10-23T${index === 0 ? "14:00" : "15:00"}:00Z`),
      ),
      status: "closed",
      closedAt: Timestamp.fromDate(
        new Date(`2026-10-23T${index === 0 ? "14:30" : "15:30"}:00Z`),
      ),
      teamA: { starters: [uid], bench: [] },
      teamB: { starters: [ids[2]], bench: [] },
      score: { teamA: index === 0 ? 2 : 5, teamB: 0 },
      performance: {
        teamA: { goals: Array(index === 0 ? 2 : 5).fill(uid), assists: [] },
      },
    });
  const before = await getEvent.run({
    auth: { uid: ids[0] },
    data: { eventId: id },
  });
  assert.equal(before.progress[0].progress, 5);
  assert.equal(before.ranking[0].uid, ids[1]);
  await assert.rejects(
    claimMission.run({ auth: { uid: ids[0] }, data: { eventId: id } }),
  );
  await onGame.run({
    params: { gid: "race-goals-1" },
    data: { before: { data: () => ({ status: "open" }) } },
  });
  const ended = (await db.doc(`events/${id}`).get()).data();
  assert.equal(ended.status, "closed");
  assert.equal(ended.winners[0].uid, ids[1]);
  assert.equal(ended.winners[0].reachedAt, "2026-10-23T14:30:00.000Z");
  const awards = await db
    .collection("eventRewards")
    .where("eventId", "==", id)
    .get();
  assert.equal(awards.size, 1);
  await closeEvents.run({});
  assert.equal(
    (await db.collection("eventRewards").where("eventId", "==", id).get()).size,
    1,
  );
  await call("update", {
    ...base,
    eventId: id,
    title: "Competição terminada editada",
  });
  assert.equal((await db.doc(`events/${id}`).get()).data().status, "closed");
  await call("create", { ...base, scope: "team" });
  await call("create", { ...base, scope: "group" });
});

test("duração das recompensas: entrega semanal, mensal e permanente", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  await db
    .doc(`users/${admin}`)
    .set({ uid: admin, role: "admin", disabled: false });
  for (const duration of ["weekly", "monthly", "permanent"]) {
    const uid = `duration-${duration}`;
    await db
      .doc(`users/${uid}`)
      .set({ uid, role: "member", disabled: false, primaryPosition: "AV" });
    const stamp = Timestamp.fromDate(new Date("2026-10-22T12:00:00Z"));
    await db.doc(`games/duration-${duration}`).set({
      status: "closed",
      scheduledAt: stamp,
      closedAt: stamp,
      teamA: { starters: [uid], bench: [] },
      teamB: { starters: ["other"], bench: [] },
      score: { teamA: 1, teamB: 0 },
    });
    const { id } = await call("create", {
      ...payload(),
      kind: "mission",
      method: "objective",
      audience: { mode: "selected", memberIds: [uid] },
      winnerCount: 1,
      positions: [
        {
          mode: "both",
          statDuration: duration,
          specialId: "mvp",
          boosts: { shooting: 3 },
        },
      ],
      objective: { metric: "games", target: 1 },
      openNow: true,
    });
    await claimMission.run({ auth: { uid }, data: { eventId: id } });
    const ledger = (
      await db.collection("eventRewards").where("eventId", "==", id).get()
    ).docs[0].data();
    assert.equal(ledger.reward.statDuration, duration);
    assert.equal(ledger.reward.cardDuration, duration);
    assert.equal(ledger.reward.boosts.shooting, 3);
    assert.equal(
      ledger.startsAt.toDate().toISOString(),
      "2026-10-23T12:00:00.000Z",
    );
    if (duration !== "permanent")
      assert.equal(
        ledger.expiresAt.toDate().toISOString(),
        duration === "monthly"
          ? "2026-11-23T12:00:00.000Z"
          : "2026-10-30T12:00:00.000Z",
      );
  }
});

test("âmbitos em missões e eventos: grupo, equipa, adversários e data do jogo", async (t) => {
  t.mock.timers.enable({
    apis: ["Date"],
    now: new Date("2026-10-23T12:00:00Z"),
  });
  t.after(() => t.mock.timers.reset());
  await db
    .doc(`users/${admin}`)
    .set({ uid: admin, role: "admin", disabled: false });
  const members = ["scope-a", "scope-b", "scope-c", "scope-absent"];
  for (const uid of members)
    await db.doc(`users/${uid}`).set({ uid, role: "member", disabled: false });
  const match = {
    status: "closed",
    scheduledAt: Timestamp.fromDate(new Date("2026-10-22T20:00Z")),
    closedAt: Timestamp.fromDate(new Date("2026-10-22T22:00Z")),
    teamA: { starters: members.slice(0, 2), bench: [] },
    teamB: { starters: [members[2]], bench: [] },
    score: { teamA: 5, teamB: 7 },
    performance: {
      teamA: { goals: members.slice(0, 2), assists: [] },
      teamB: { goals: [members[2], members[2]], assists: [] },
    },
  };
  await db.doc("games/scope-current").set(match);
  await db.doc("games/scope-old-late-close").set({
    ...match,
    scheduledAt: Timestamp.fromDate(new Date("2026-10-19T20:00Z")),
    closedAt: Timestamp.fromDate(new Date("2026-10-19T22:00Z")),
    score: { teamA: 99, teamB: 99 },
  });
  for (const kind of ["mission", "event"]) {
    for (const scope of ["team", "collective", "group", "individual"]) {
      const { id } = await call("create", {
        ...payload(),
        title: `${kind} ${scope}`,
        kind,
        scope,
        method: "objective",
        winnerCount: 1,
        positions: [prize(5)],
        audience: { mode: "selected", memberIds: members },
        objective: { metric: "goals", target: 30 },
        openNow: true,
      });
      const detail = await getEvent.run({
        auth: { uid: admin },
        data: { eventId: id },
      });
      const actual = Object.fromEntries(
        detail.progress.map((row) => [row.uid, row.progress]),
      );
      const expected =
        scope === "group"
          ? [4, 4, 4, 4]
          : scope === "individual"
            ? [1, 1, 2, 0]
            : [5, 5, 7, 0];
      members.forEach((uid, index) =>
        assert.equal(actual[uid], expected[index], `${kind} ${scope} ${uid}`),
      );
    }
  }
});
