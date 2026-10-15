import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { cardWeek } from "../js/card-week.js";
import { votersFor } from "../js/event-rules.js";
import { asDate, ATTRIBUTES } from "../js/utils.js";
import {
  EVENT_LIMITS,
  OBJECTIVES,
  validEventReward,
  eventRanking,
  periodWindow,
  votingFlags,
  medal,
  rewardText,
  rewardExpiry,
  hasTemporaryReward,
  eventEndMillis,
  missionUnlocked,
  missionUnlockedAt,
} from "../js/event-model.js";
const db = () => getFirestore();
const rows = (snap) => snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
const fail = (message) => {
  throw new HttpsError("invalid-argument", message);
};
export const validEventId = (id) =>
  typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id);
function imageUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && value.length <= 1000) return value;
  } catch {}
  fail("A imagem deve usar um endereço HTTPS válido.");
}
function rewardValue(input, themes) {
  if (!validEventReward(input, themes))
    fail("Recompensa inválida ou acima dos limites de equilíbrio.");
  const theme = themes.find((t) => input.specialId === `saved:${t.id}`);
  return {
    mode: input.mode,
    boosts: input.boosts,
    statDuration: input.statDuration,
    cardDuration: input.statDuration,
    specialId: input.specialId || null,
    ...(theme
      ? {
          cardTheme: {
            name: theme.name,
            baseTheme: theme.baseTheme || "custom-test",
            colors: theme.colors,
            design: theme.design || {},
            texture: theme.texture || "plain",
          },
        }
      : {}),
  };
}
function validatePrerequisiteGraph(prerequisites, priorMissions, eventId) {
  if (
    !prerequisites.missionIds.every(
      (id) =>
        validEventId(id) &&
        id !== eventId &&
        priorMissions.some(
          (event) =>
            event.id === id &&
            event.schemaVersion === 2 &&
            event.kind === "mission" &&
            event.status !== "cancelled",
        ),
    )
  )
    fail("Escolhe missões anteriores válidas, sem incluir a própria missão.");
  const graph = new Map(
    priorMissions
      .filter((event) => event.kind === "mission")
      .map((event) => [event.id, event.prerequisites?.missionIds || []]),
  );
  const root = eventId || "~new";
  graph.set(root, prerequisites.missionIds);
  const visiting = new Set(),
    visited = new Set();
  const cyclic = (id) => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    if ((graph.get(id) || []).some(cyclic)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  if (cyclic(root))
    fail("As missões não podem depender umas das outras num ciclo.");
}
async function configuration(input, eventId = null) {
  const [users, games, themes, eventSnaps] = await Promise.all([
    db().collection("users").get(),
    db().collection("games").get(),
    db().collection("cardThemes").get(),
    db().collection("events").get(),
  ]);
  const indefinite = input.indefinite === true;
  if (input.indefinite !== undefined && typeof input.indefinite !== "boolean")
    fail("A opção de prazo é inválida.");
  const startsAt = new Date(input.startsAt || Date.now()),
    endsAt = indefinite ? null : new Date(input.endsAt),
    votingStartsAt = new Date(input.votingStartsAt || startsAt),
    votingEndsAt =
      input.votingEndsAt || endsAt
        ? new Date(input.votingEndsAt || endsAt)
        : null;
  if (
    typeof input.title !== "string" ||
    !input.title.trim() ||
    input.title.length > 80 ||
    !["event", "mission", "monthly"].includes(input.kind) ||
    !["vote", "admin", "objective"].includes(input.method) ||
    !Number.isFinite(+startsAt) ||
    (!indefinite &&
      (!Number.isFinite(+endsAt) ||
        (+endsAt <= Date.now() && !eventId) ||
        +endsAt <= +startsAt ||
        +endsAt > Date.now() + 366 * 86400000)) ||
    (input.method === "vote" &&
      (!Number.isFinite(+votingStartsAt) ||
        (votingEndsAt && !Number.isFinite(+votingEndsAt)) ||
        +votingStartsAt < +startsAt ||
        (endsAt && votingEndsAt && +votingEndsAt > +endsAt) ||
        (votingEndsAt && +votingEndsAt <= +votingStartsAt)))
  )
    fail("Título, tipo ou datas inválidos.");
  const prerequisites = input.prerequisites || { mode: "all", missionIds: [] };
  if (
    !prerequisites ||
    typeof prerequisites !== "object" ||
    !["all", "any"].includes(prerequisites.mode) ||
    !Array.isArray(prerequisites.missionIds) ||
    prerequisites.missionIds.length > 20 ||
    new Set(prerequisites.missionIds).size !==
      prerequisites.missionIds.length ||
    (prerequisites.missionIds.length && input.kind !== "mission")
  )
    fail("Pré-requisitos inválidos.");
  validatePrerequisiteGraph(prerequisites, rows(eventSnaps), eventId);
  if (
    typeof (input.description || "") !== "string" ||
    (input.description || "").length > 2000 ||
    typeof (input.rules || "") !== "string" ||
    (input.rules || "").length > 2000
  )
    fail("Descrição ou regras demasiado longas.");
  const audience = input.audience;
  if (
    !audience ||
    !["all", "game", "selected"].includes(audience.mode) ||
    (audience.mode === "game" &&
      !rows(games).some((g) => g.id === audience.gameId)) ||
    (audience.mode === "selected" &&
      (!Array.isArray(audience.memberIds) ||
        !audience.memberIds.length ||
        !audience.memberIds.every((uid) =>
          rows(users).some((u) => u.uid === uid && !u.disabled),
        )))
  )
    fail("Participantes inválidos.");
  if (
    input.kind === "monthly" &&
    (typeof input.month !== "string" || !/^\d{4}-\d{2}$/.test(input.month))
  )
    fail("Mês inválido.");
  const participantIds = votersFor(
    { kind: input.kind, month: input.month, audience },
    rows(users),
    rows(games),
  );
  if (
    !participantIds.length ||
    participantIds.length > 200 ||
    (input.method === "vote" && participantIds.length < 2)
  )
    fail("Seleciona participantes elegíveis (máximo 200).");
  const winnerCount = input.winnerCount ?? 1,
    votesPerUser = input.votesPerUser ?? 1,
    minVotes = input.minVotes ?? 1;
  if (
    !Number.isInteger(winnerCount) ||
    winnerCount < 1 ||
    winnerCount > EVENT_LIMITS.winners ||
    !Number.isInteger(votesPerUser) ||
    votesPerUser < 1 ||
    votesPerUser > EVENT_LIMITS.votes ||
    !Number.isInteger(minVotes) ||
    minVotes < 1 ||
    minVotes > 2000
  )
    fail("Número de vencedores ou votos inválido.");
  if (!Array.isArray(input.positions) || input.positions.length !== winnerCount)
    fail("Configura uma recompensa para cada posição.");
  const positions = input.positions.map((reward) =>
    rewardValue(reward, rows(themes)),
  );
  const objective = input.objective || { metric: "games", target: 1 };
  if (
    !Object.hasOwn(OBJECTIVES, objective.metric) ||
    !Number.isInteger(objective.target) ||
    objective.target < 1 ||
    objective.target > 1000
  )
    fail("Objetivo inválido.");
  if (
    !["individual", "collective", "team", "group"].includes(
      input.scope || "individual",
    ) ||
    !["once", "daily", "weekly"].includes(input.cadence || "once") ||
    !["easy", "medium", "hard"].includes(input.difficulty || "medium") ||
    !["uid", "goals", "participation"].includes(input.tieBreak || "uid")
  )
    fail("Condições inválidas.");
  if (
    input.kind === "mission" &&
    (input.method !== "objective" || winnerCount !== 1)
  )
    fail("Missões usam objetivos e uma recompensa por conclusão.");
  if (
    input.kind !== "mission" &&
    input.method === "objective" &&
    (input.cadence || "once") !== "once"
  )
    fail("As competições usam objetivos num único período.");
  if (input.kind !== "mission" && winnerCount > participantIds.length)
    fail("As posições premiadas não podem exceder os participantes.");
  const maxRepeats = input.maxRepeats ?? 1;
  if (
    !Number.isInteger(maxRepeats) ||
    maxRepeats < 1 ||
    maxRepeats > EVENT_LIMITS.repeats ||
    ((input.cadence || "once") === "once" && maxRepeats !== 1)
  )
    fail("Limite de repetição inválido.");
  if (input.participationReward)
    fail("Escolhe recompensas de Stats ou cartas para os vencedores.");
  return {
    positions,
    participationReward: null,
    event: {
      schemaVersion: 2,
      title: input.title.trim(),
      description: input.description || "",
      image: imageUrl(input.image),
      rules: input.rules || "",
      kind: input.kind,
      method: input.method,
      month: input.month || null,
      audience,
      participantIds,
      winnerCount,
      votesPerUser,
      allowSelfVote: !!input.allowSelfVote,
      minVotes,
      tieBreak: input.tieBreak || "uid",
      liveResults: !!input.liveResults,
      needsConfirmation: input.kind !== "mission" && !!input.needsConfirmation,
      objective,
      scope: input.scope || "individual",
      cadence: input.cadence || "once",
      difficulty: input.difficulty || "medium",
      maxRepeats,
      indefinite,
      prerequisites: {
        mode: prerequisites.mode,
        missionIds: prerequisites.missionIds,
      },
      startsAt: Timestamp.fromDate(startsAt),
      endsAt: endsAt ? Timestamp.fromDate(endsAt) : null,
      votingStartsAt: Timestamp.fromDate(votingStartsAt),
      votingEndsAt: votingEndsAt ? Timestamp.fromDate(votingEndsAt) : null,
      rewardPrivacy: 1,
      questions: [
        {
          id: "ranking",
          label: input.title.trim(),
          candidateIds: participantIds,
        },
      ],
      winners: [],
      ranking: [],
    },
  };
}
function audit(tx, ref, actorId, action, details = {}) {
  tx.set(ref.collection("audit").doc(), {
    actorId,
    action,
    details,
    createdAt: FieldValue.serverTimestamp(),
  });
}
export function publicManagedEvent(event, id) {
  const value = { ...event, id };
  for (const key of [
    "startsAt",
    "endsAt",
    "votingStartsAt",
    "votingEndsAt",
    "closedAt",
    "openedAt",
  ])
    if (value[key]) value[key] = asDate(value[key]).toISOString();
  if (value.status !== "closed") value.winners = [];
  if (!["closed", "review"].includes(value.status) && !value.liveResults)
    value.ranking = [];
  return value;
}
function grant(
  tx,
  ref,
  event,
  uid,
  position,
  configured,
  existing,
  key,
  actorId,
) {
  if (existing.some((r) => r.id === key))
    return existing.find((r) => r.id === key);
  const now = new Date(),
    cycle = cardWeek(now),
    rewardCycle = cycle.phase === "open" ? cycle : cardWeek(cycle.nextOpensAt);
  const start = cycle.phase === "open" ? now : rewardCycle.opensAt;
  const permanent = configured.statDuration === "permanent";
  const prior = existing.filter((r) => r.uid === uid && !r.revokedAt);
  const boosts = Object.fromEntries(
    ATTRIBUTES.map(([attribute]) => {
      const used = prior
        .filter((r) =>
          permanent
            ? r.reward?.statDuration === "permanent"
            : r.reward?.statDuration !== "permanent" &&
              +asDate(r.expiresAt) > +start,
        )
        .reduce((sum, r) => sum + (r.reward?.boosts?.[attribute] || 0), 0);
      return [
        attribute,
        Math.max(
          0,
          Math.min(
            configured.boosts[attribute] || 0,
            (permanent
              ? EVENT_LIMITS.permanentLifetime
              : EVENT_LIMITS.weeklyStat) - used,
          ),
        ),
      ];
    }),
  );
  const reward = {
    mode: configured.mode,
    statDuration: configured.statDuration,
    cardDuration: configured.cardDuration || "weekly",
    specialId: configured.specialId || null,
    ...(configured.cardTheme ? { cardTheme: configured.cardTheme } : {}),
    boosts,
  };
  const value = {
    eventId: ref.id,
    uid,
    position,
    questionId: "ranking",
    reward,
    configuredReward: configured,
    schemaVersion: 2,
    weekId: rewardCycle.weekId,
    startsAt: Timestamp.fromDate(permanent ? now : start),
    expiresAt: Timestamp.fromDate(rewardExpiry(start, configured.statDuration)),
    createdAt: FieldValue.serverTimestamp(),
    awardedBy: actorId,
  };
  tx.set(db().doc(`eventRewards/${key}`), value);
  existing.push({ ...value, id: key });
  return value;
}
export function managedEvents(rebuild) {
  async function action(request, user) {
    const { action, eventId, ...input } = request.data || {};
    if (
      ![
        "create",
        "update",
        "duplicate",
        "open",
        "close",
        "prepare",
        "confirm",
        "cancel",
        "delete",
        "correct",
        "revoke",
      ].includes(action)
    )
      fail("Ação inválida.");
    if (action !== "create" && !validEventId(eventId)) fail("Evento inválido.");
    if (action === "delete") {
      const ref = db().doc(`events/${eventId}`);
      await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const event = snap.data();
        if (event.schemaVersion !== 2 || event.status !== "cancelled")
          fail("Só podes apagar eventos ou missões cancelados.");
        const others = rows(await tx.get(db().collection("events")));
        if (
          others.some(
            (other) =>
              other.id !== eventId &&
              other.prerequisites?.missionIds?.includes(eventId),
          )
        )
          fail(
            "Esta missão é um requisito de outra missão. Remove primeiro essa ligação para a poderes apagar.",
          );
        tx.delete(ref);
      });
      await db().recursiveDelete(ref);
      return { id: eventId, deleted: true };
    }
    if (action === "create" || action === "update") {
      const config = await configuration(input, eventId),
        ref =
          action === "create"
            ? db().collection("events").doc()
            : db().doc(`events/${eventId}`);
      await db().runTransaction(async (tx) => {
        const before = action === "update" ? await tx.get(ref) : null;
        const currentMissions = rows(await tx.get(db().collection("events")));
        validatePrerequisiteGraph(
          config.event.prerequisites,
          currentMissions,
          ref.id,
        );
        const previous = before?.data(),
          editingMission =
            previous?.kind === "mission" && previous.schemaVersion === 2;
        if (before && (!before.exists || previous.schemaVersion !== 2))
          fail("Escolhe uma missão ou evento válido para editar.");
        if (editingMission && config.event.kind !== "mission")
          fail("Uma missão existente deve continuar a ser uma missão.");

        const published = !!input.openNow,
          preservingMission = !!previous && previous.status !== "draft",
          status = preservingMission
            ? previous.status
            : published
              ? +asDate(config.event.startsAt) > Date.now()
                ? "scheduled"
                : "open"
              : "draft";
        tx.set(ref, {
          ...(previous || {}),
          ...config.event,
          ...(previous
            ? {
                winners: previous.winners || [],
                ranking: previous.ranking || [],
              }
            : {}),
          status,
          createdBy: previous?.createdBy || request.auth.uid,
          createdAt: previous?.createdAt || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          ...(published && !preservingMission
            ? { openedAt: FieldValue.serverTimestamp() }
            : {}),
        });
        tx.set(ref.collection("private").doc("rewards"), {
          positions: config.positions,
          participationReward: config.participationReward,
        });
        audit(tx, ref, request.auth.uid, action, { status });
      });
      return { id: ref.id };
    }
    if (action === "duplicate") {
      const ref = db().doc(`events/${eventId}`),
        copy = db().collection("events").doc();
      await db().runTransaction(async (tx) => {
        const source = await tx.get(ref),
          rewards = await tx.get(ref.collection("private").doc("rewards"));
        if (!source.exists || source.data().schemaVersion !== 2)
          fail("Abre um evento moderno para o duplicar.");
        const value = source.data();
        tx.set(copy, {
          ...value,
          title: `${value.title.slice(0, 70)} · cópia`,
          startsAt: Timestamp.fromDate(new Date()),
          endsAt: value.indefinite
            ? null
            : Timestamp.fromDate(new Date(Date.now() + 7 * 86400000)),
          votingStartsAt: Timestamp.fromDate(new Date()),
          votingEndsAt: value.indefinite
            ? null
            : Timestamp.fromDate(new Date(Date.now() + 7 * 86400000)),
          manualWinners: [],
          participationAwards: [],
          resultsAt: null,
          totalVotes: 0,
          rewardsRevoked: false,
          status: "draft",
          winners: [],
          ranking: [],
          rewardsApplied: false,
          closedAt: null,
          createdBy: request.auth.uid,
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.set(copy.collection("private").doc("rewards"), rewards.data());
        audit(tx, copy, request.auth.uid, "duplicate", { source: eventId });
      });
      return { id: copy.id };
    }
    const affected = await db().runTransaction(async (tx) => {
      const ref = db().doc(`events/${eventId}`),
        snap = await tx.get(ref);
      if (!snap.exists || snap.data().schemaVersion !== 2)
        fail("Evento indisponível.");
      const event = snap.data();
      const [votesSnap, gamesSnap, rewardSnap, ledgerSnap] = await Promise.all([
        tx.get(ref.collection("votes")),
        tx.get(db().collection("games")),
        tx.get(ref.collection("private").doc("rewards")),
        tx.get(db().collection("eventRewards")),
      ]);
      const votes = rows(votesSnap),
        games = rows(gamesSnap),
        ledger = rows(ledgerSnap),
        rewards = rewardSnap.data();
      if (action === "revoke") {
        if (
          event.status !== "closed" ||
          typeof input.reason !== "string" ||
          !input.reason.trim()
        )
          fail("Indica o motivo da anulação.");
        const own = ledger.filter((r) => r.eventId === eventId && !r.revokedAt);
        for (const reward of own)
          tx.update(db().doc(`eventRewards/${reward.id}`), {
            revokedAt: FieldValue.serverTimestamp(),
            revokedBy: request.auth.uid,
            reason: input.reason.slice(0, 500),
          });
        tx.update(ref, {
          rewardsRevoked: true,
          participationAwards: [],
          winners: [],
          status: "cancelled",
          closedAt: FieldValue.serverTimestamp(),
        });
        audit(tx, ref, request.auth.uid, "revoke", {
          reason: input.reason.slice(0, 500),
          previousWinners: event.winners || [],
        });
        return own.map((r) => r.uid);
      }
      if (action === "correct") {
        if (
          !["open", "review"].includes(event.status) ||
          event.method !== "vote" ||
          !event.participantIds.includes(input.voterId) ||
          typeof input.reason !== "string" ||
          !input.reason.trim()
        )
          fail("Correção inválida; votos fechados são preservados.");
        tx.delete(ref.collection("votes").doc(input.voterId));
        audit(tx, ref, request.auth.uid, "invalidate-vote", {
          voterId: input.voterId,
          reason: input.reason.slice(0, 500),
          original: votes.find((v) => v.id === input.voterId) || null,
        });
        tx.update(ref, {
          ranking: eventRanking(
            event,
            votes.filter((v) => v.id !== input.voterId),
            games,
            event.manualWinners || [],
            event.status === "review" ? asDate(event.resultsAt) : new Date(),
          ),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return [];
      }
      if (action === "cancel") {
        if (["closed", "cancelled"].includes(event.status))
          fail("Evento já terminado; usa a anulação com motivo.");
        const awarded = ledger.filter(
          (r) => r.eventId === eventId && !r.revokedAt,
        );
        for (const reward of awarded)
          tx.update(db().doc(`eventRewards/${reward.id}`), {
            revokedAt: FieldValue.serverTimestamp(),
            revokedBy: request.auth.uid,
            reason: "Evento cancelado",
          });
        tx.update(ref, {
          status: "cancelled",
          winners: [],
          participationAwards: [],
          closedAt: FieldValue.serverTimestamp(),
          rewardsApplied: true,
        });
        audit(tx, ref, request.auth.uid, action);
        return awarded.map((r) => r.uid);
      }
      if (action === "open") {
        if (event.status !== "draft" || eventEndMillis(event) <= Date.now())
          fail("Rascunho expirado ou já publicado.");
        tx.update(ref, {
          status: +asDate(event.startsAt) > Date.now() ? "scheduled" : "open",
          openedAt: FieldValue.serverTimestamp(),
        });
        audit(tx, ref, request.auth.uid, action);
        return [];
      }
      if (event.status === "closed")
        return ledger
          .filter((r) => r.eventId === eventId && !r.revokedAt)
          .map((r) => r.uid);
      if (!["open", "review"].includes(event.status))
        fail("Evento não está ativo.");
      const manual = input.winnerIds || event.manualWinners || [];
      if (
        !Array.isArray(manual) ||
        new Set(manual).size !== manual.length ||
        manual.length > event.winnerCount ||
        !manual.every((uid) => event.participantIds.includes(uid))
      )
        fail("Vencedores inválidos ou repetidos.");
      const ranking = eventRanking(
        event,
        votes,
        games,
        manual,
        event.status === "review" ? asDate(event.resultsAt) : new Date(),
        ledger,
      );
      if (
        action === "prepare" ||
        (action === "close" &&
          (event.needsConfirmation || event.method === "admin"))
      ) {
        tx.update(ref, {
          status: "review",
          ranking,
          manualWinners: manual,
          resultsAt: Timestamp.fromDate(new Date()),
          totalVotes: votes.reduce(
            (sum, v) => sum + (v.selections?.length || 0),
            0,
          ),
        });
        audit(tx, ref, request.auth.uid, "prepare-results");
        return [];
      }
      if (action === "confirm" && event.status !== "review")
        fail("Prepara os resultados antes de os confirmar.");
      const winners = [],
        participationAwards = [],
        uids = new Set();
      if (event.kind === "mission") {
        for (const row of ranking) {
          const delivered = ledger.filter(
            (r) => r.eventId === eventId && r.uid === row.uid && !r.revokedAt,
          );
          if (delivered.length)
            winners.push({
              ...row,
              uids: [row.uid],
              label: `${row.position}.º lugar`,
              reward: delivered[0].reward,
              expiresAt: asDate(delivered[0].expiresAt).toISOString(),
              deliveries: delivered.length,
            });
        }
      } else {
        for (const row of ranking
          .filter((r) => r.eligible)
          .slice(0, event.winnerCount)) {
          const position = winners.length + 1,
            configured = rewards?.positions?.[position - 1];
          if (!configured) fail("Recompensa configurada indisponível.");
          const awarded = grant(
            tx,
            ref,
            event,
            row.uid,
            position,
            configured,
            ledger,
            `${eventId}_position-${position}_${row.uid}`,
            request.auth.uid,
          );
          winners.push({
            ...row,
            position,
            uids: [row.uid],
            label: `${medal(position)} ${position}.º lugar`,
            reward: awarded.reward,
            expiresAt: asDate(awarded.expiresAt).toISOString(),
          });
          uids.add(row.uid);
        }
      }
      tx.update(ref, {
        status: "closed",
        ranking,
        winners,
        participationAwards,
        participantCount: event.participantIds.length,
        totalVotes: votes.reduce(
          (sum, v) => sum + (v.selections?.length || 0),
          0,
        ),
        closedAt: FieldValue.serverTimestamp(),
        rewardsApplied: false,
      });
      audit(tx, ref, request.auth.uid, "confirm-results", {
        winners: winners.map((w) => ({ uid: w.uid, position: w.position })),
      });
      return [...uids];
    });
    for (const uid of new Set(affected)) await rebuild(uid);
    const ref = db().doc(`events/${eventId}`),
      latest = await ref.get();
    if (latest.data()?.status === "closed")
      await ref.update({ rewardsApplied: true });
    return { ok: true };
  }
  async function vote(request) {
    const { eventId, selections } = request.data || {};
    if (
      !validEventId(eventId) ||
      !Array.isArray(selections) ||
      !selections.length ||
      new Set(selections).size !== selections.length
    )
      fail("Escolhe candidatos diferentes.");
    await db().runTransaction(async (tx) => {
      const ref = db().doc(`events/${eventId}`),
        snap = await tx.get(ref),
        votesSnap = await tx.get(ref.collection("votes")),
        gamesSnap = await tx.get(db().collection("games"));
      const event = snap.data();
      if (
        !event ||
        event.status !== "open" ||
        event.method !== "vote" ||
        +asDate(event.startsAt) > Date.now() ||
        +asDate(event.votingStartsAt) > Date.now() ||
        (event.votingEndsAt && +asDate(event.votingEndsAt) <= Date.now()) ||
        eventEndMillis(event) <= Date.now() ||
        !event.participantIds.includes(request.auth.uid)
      )
        throw new HttpsError("permission-denied", "Votação indisponível.");
      if (
        selections.length > event.votesPerUser ||
        !selections.every(
          (uid) =>
            event.participantIds.includes(uid) &&
            (event.allowSelfVote || uid !== request.auth.uid),
        )
      )
        fail("Voto fora das regras deste evento.");
      const value = { selections, submittedAt: FieldValue.serverTimestamp() };
      const votes = rows(votesSnap).filter((v) => v.id !== request.auth.uid);
      votes.push({ selections, id: request.auth.uid, submittedAt: new Date() });
      tx.set(ref.collection("votes").doc(request.auth.uid), value);
      audit(tx, ref, request.auth.uid, "vote-submitted", {
        selections,
        previous:
          rows(votesSnap).find((v) => v.id === request.auth.uid)?.selections ||
          [],
      });
      if (event.liveResults)
        tx.update(ref, {
          ranking: eventRanking(event, votes, rows(gamesSnap)),
          totalVotes: votes.reduce((sum, v) => sum + v.selections.length, 0),
        });
    });
    return { ok: true };
  }
  async function details(request, user) {
    const id = request.data?.eventId;
    if (!validEventId(id)) fail("Evento inválido.");
    const ref = db().doc(`events/${id}`),
      snap = await ref.get();
    if (!snap.exists) return null;
    const event = snap.data();
    if (event.status === "draft" && user.role !== "admin")
      throw new HttpsError("permission-denied", "Evento indisponível.");
    const completionLedger =
      event.kind === "mission"
        ? rows(await db().collection("eventRewards").get())
        : [];
    if (
      user.role !== "admin" &&
      !missionUnlocked(event, request.auth.uid, completionLedger)
    )
      return null;
    const result = publicManagedEvent(event, id);
    if (event.kind === "mission") {
      const unlocked = missionUnlockedAt(
        event,
        request.auth.uid,
        completionLedger,
      );
      result.unlockedAt = unlocked ? unlocked.toISOString() : null;
    }
    if (event.method === "objective") {
      const games = rows(await db().collection("games").get());
      result.progress = eventRanking(
        event,
        [],
        games,
        [],
        new Date(),
        completionLedger,
      );
      if (
        event.kind !== "mission" &&
        event.status === "open" &&
        event.liveResults
      )
        result.ranking = result.progress;
      if (user.role !== "admin")
        result.progress = result.progress.filter(
          (row) => row.uid === request.auth.uid,
        );
      const claims = rows(
        await db().collection("eventRewards").where("eventId", "==", id).get(),
      ).filter((r) => r.uid === request.auth.uid && !r.revokedAt);
      result.claimedPeriods = claims.map((r) => r.periodKey).filter(Boolean);
      result.myRewards = claims.map((r) => ({
        reward: r.reward,
        expiresAt: asDate(r.expiresAt).toISOString(),
        periodKey: r.periodKey,
      }));
    }
    if (user.role === "admin") {
      const [rewards, votes, auditRows, ledger] = await Promise.all([
        ref.collection("private").doc("rewards").get(),
        ref.collection("votes").get(),
        ref.collection("audit").orderBy("createdAt", "desc").get(),
        db().collection("eventRewards").where("eventId", "==", id).get(),
      ]);
      result.configuration = rewards.data();
      result.ballots = rows(votes).map((vote) => ({
        ...vote,
        submittedAt: asDate(vote.submittedAt).toISOString(),
      }));
      result.audit = rows(auditRows).map((entry) => ({
        ...entry,
        createdAt: asDate(entry.createdAt).toISOString(),
      }));
      result.deliveries = rows(ledger).map((row) => ({
        id: row.id,
        uid: row.uid,
        position: row.position,
        reward: row.reward,
        revoked: !!row.revokedAt,
        expiresAt: asDate(row.expiresAt).toISOString(),
      }));
      result.flags = votingFlags(result.ballots);
    }
    return result;
  }
  async function claim(request) {
    const id = request.data?.eventId;
    if (!validEventId(id)) fail("Missão inválida.");
    let awarded;
    await db().runTransaction(async (tx) => {
      const ref = db().doc(`events/${id}`),
        snap = await tx.get(ref),
        games = await tx.get(db().collection("games")),
        rewards = await tx.get(ref.collection("private").doc("rewards")),
        ledgerSnap = await tx.get(db().collection("eventRewards"));
      const event = snap.data(),
        uid = request.auth.uid;
      if (
        !event ||
        event.kind !== "mission" ||
        event.status !== "open" ||
        +asDate(event.startsAt) > Date.now() ||
        eventEndMillis(event) <= Date.now() ||
        !event.participantIds.includes(uid)
      )
        throw new HttpsError("permission-denied", "Missão indisponível.");
      const ledger = rows(ledgerSnap);
      if (!missionUnlocked(event, uid, ledger))
        throw new HttpsError(
          "permission-denied",
          "Conclui primeiro as missões necessárias para desbloquear esta missão.",
        );
      const own = ledger.filter(
          (r) => r.eventId === id && r.uid === uid && !r.revokedAt,
        ),
        window = periodWindow(event);
      if (own.some((r) => r.periodKey === window.key)) {
        awarded = own.find((r) => r.periodKey === window.key);
        return;
      }
      if (own.length >= event.maxRepeats)
        fail("Limite de conclusões atingido.");
      const row = eventRanking(
        event,
        [],
        rows(games),
        [],
        new Date(),
        ledger,
      ).find((r) => r.uid === uid);
      if (!row?.eligible) fail("Ainda não cumpriste o objetivo desta missão.");
      const key = `${id}_mission_${uid}_${window.key}`;
      awarded = grant(
        tx,
        ref,
        event,
        uid,
        1,
        rewards.data().positions[0],
        ledger,
        key,
        uid,
      );
      tx.update(db().doc(`eventRewards/${key}`), {
        periodKey: window.key,
        completedAt: Timestamp.fromDate(new Date()),
      });
      audit(tx, ref, uid, "mission-completed", {
        uid,
        progress: row.progress,
        period: window.key,
      });
      tx.set(db().doc(`users/${uid}/notifications/mission-completed-${key}`), {
        type: "EVENT_REWARD",
        title: "Missão concluída!",
        body: `${event.title}: ${rewardText(awarded.reward)}.${hasTemporaryReward(awarded.reward) ? ` Componentes temporários até ${asDate(awarded.expiresAt).toISOString()}.` : ""}`,
        href: `#/event/${id}`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    await rebuild(request.auth.uid);
    return {
      ok: true,
      reward: awarded.reward,
      expiresAt: asDate(awarded.expiresAt).toISOString(),
    };
  }
  async function scheduled() {
    const ledger = rows(await db().collection("eventRewards").get());
    const expired = ledger.filter(
      (r) =>
        r.schemaVersion === 2 &&
        !r.expirationProcessed &&
        +asDate(r.expiresAt) <= Date.now(),
    );
    for (const uid of new Set(expired.map((r) => r.uid))) await rebuild(uid);
    for (const reward of expired)
      await db()
        .doc(`eventRewards/${reward.id}`)
        .update({ expirationProcessed: true });
    const events = rows(await db().collection("events").get());
    const games = rows(await db().collection("games").get());
    for (const event of events.filter((e) => e.schemaVersion === 2)) {
      if (event.status === "scheduled" && +asDate(event.startsAt) <= Date.now())
        await db().runTransaction(async (tx) => {
          const ref = db().doc(`events/${event.id}`),
            fresh = await tx.get(ref);
          if (fresh.data()?.status === "scheduled") {
            tx.update(ref, { status: "open" });
            audit(tx, ref, "system", "scheduled-open");
          }
        });
      const raceFinished =
        event.kind !== "mission" &&
        event.method === "objective" &&
        ["open", "scheduled"].includes(event.status) &&
        +asDate(event.startsAt) <= Date.now() &&
        eventRanking(event, [], games).filter((row) => row.eligible).length >=
          event.winnerCount;
      if (
        raceFinished ||
        ((event.status === "open" || event.status === "scheduled") &&
          eventEndMillis(event) <= Date.now()) ||
        (event.status === "closed" && event.rewardsApplied === false)
      )
        await action(
          {
            auth: { uid: "system" },
            data: { action: "close", eventId: event.id },
          },
          { role: "admin" },
        );
    }
  }
  return { action, vote, details, claim, scheduled };
}
