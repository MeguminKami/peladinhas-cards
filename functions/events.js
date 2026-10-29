import { AUTOMATION_SCHEDULE } from "./automation-cycle.js";
import { grant } from "./event-management.js";
import { nextHomeBoundary } from "../js/data-boundary.js";
import { createReadContext } from "./read-context.js";
import { policyAt, canManage } from "../js/system-policy.js";
import { policyCall, policySchedule, policyWritten, policyCreated, recordTaskFailure } from "./policy-runtime.js";
import { missionUnlocked, usesRatingObjective } from "../js/event-model.js";
import { CARD_CRITERIA } from "./card-unlock-rules.js";
import { rewardDocuments } from "./reward-queries.js";
import { signalMaintenance } from "./maintenance-inputs.js";
import {
  managedEvents,
  publicManagedEvent,
  validEventId,
} from "./event-management.js";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { cardWeek } from "../js/card-week.js";
import {
  votersFor,
  candidatesFor,
  validReward,
  monthlyCandidates,
} from "../js/event-rules.js";
const rows = (s) => s.docs.map((d) => ({ ...d.data(), id: d.id }));
const db = () => getFirestore();
const fail = (message) => {
  throw new HttpsError("invalid-argument", message);
};
const publicQuestions = (questions) =>
  questions.map(({ reward, ...question }) => question);
function publicEvent(event) {
  return {
    ...event,
    questions: publicQuestions(event.questions || []),
    winners: (event.winners || []).map(({ reward, ...winner }) => {
      const revealed = event.status === "closed" && winner.uids?.length;
      const awarded =
        reward ||
        event.questions?.find((q) => q.id === winner.questionId)?.reward;
      return { ...winner, ...(revealed && awarded ? { reward: awarded } : {}) };
    }),
    endsAt: event.endsAt?.toDate?.().toISOString() || event.endsAt,
    ...(event.closedAt
      ? { closedAt: event.closedAt.toDate?.().toISOString() || event.closedAt }
      : {}),
  };
}
async function actor(request, admin = false) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const user = request.systemActor || (await db().doc(`users/${request.auth.uid}`).get()).data();
  if (!user || user.disabled || (admin && user.role !== "admin"))
    throw new HttpsError("permission-denied", "Acesso reservado.");
  return !admin && user.role==="admin" && !canManage(user,"events") && !canManage(user,"audit") ? {...user,role:"member"} : user;
}
async function league() {
  const [users, games] = await Promise.all([
    db().collection("users").get(),
    db().collection("games").get(),
  ]);
  return { users: rows(users), games: rows(games) };
}
export function eventFunctions(rebuild, rebuildEdited = rebuild) {
  const managed = managedEvents(rebuild, rebuildEdited);
  const getEvent = policyCall("getEvent",async (request) => {
    const user = await actor(request);
    const id = request.data?.eventId;
    if (typeof id !== "string" || !id || id.includes("/"))
      fail("Evento inválido.");
    const snapshot = await db().doc(`events/${id}`).get();
    if (!snapshot.exists) return null;
    if (snapshot.data().status === "draft" && user.role !== "admin")
      throw new HttpsError("permission-denied", "Evento indisponível.");
    if (snapshot.data().schemaVersion === 2)
      return managed.details(request, user);
    const legacy = { ...publicEvent(snapshot.data()), id };
    if (user.role === "admin") {
      const votes = rows(await db().collection(`events/${id}/votes`).get());
      legacy.ballots = votes.map((vote) => ({
        id: vote.id,
        selections: Object.values(vote.answers || {}),
        submittedAt: vote.submittedAt?.toDate?.().toISOString() || null,
      }));
    }
    return legacy;
  });
  const listEvents = policyCall("listEvents",async (request) => {
    const user = await actor(request);
    const scope = request.data?.scope || "active";
    const collection = db().collection("events");
    const query = scope === "all" ? collection : collection.where("status", "in", scope === "history" ? ["closed", "cancelled"] : ["open", "scheduled", "review"]);
    const snapshots = await query.get();
    const all = rows(snapshots);
    const completions =
      user.role === "admin"
        ? []
        : rows(
            await db()
              .collection("eventRewards")
              .where("uid", "==", request.auth.uid)
              .get(),
          );
    const visible = all
      .filter(
        (event) =>
          (user.role === "admin" ||
            (event.status !== "draft" &&
              missionUnlocked(event, request.auth.uid, completions))) &&
          (scope === "history"
            ? ["closed", "cancelled"].includes(event.status)
            : scope === "all"
              ? true
              : ["open", "scheduled", "review"].includes(event.status)),
      )
      .map((event) =>
        event.schemaVersion === 2
          ? publicManagedEvent(event, event.id)
          : publicEvent(event),
      );
    if (request.data?.summaries === true) {
      const context = { ...createReadContext(), summaryOnly: true, includeRatings: visible.some(event => usesRatingObjective(event.objective)), events: new Map(snapshots.docs.map(doc => [doc.id, doc])) };
      await Promise.all(visible.map(async event => {
        if (event.schemaVersion !== 2 || event.method !== "objective" || event.status !== "open" || !event.participantIds?.includes(request.auth.uid)) return;
        const detail = await managed.details({ ...request, data: { eventId: event.id } }, user, context);
        event.missionSummary = detail ? Object.fromEntries([
          "status", "startsAt", "endsAt", "indefinite", "progress", "rewardPreview", "claimedPeriods", "claimable", "claimMode", "claimNotice",
        ].filter(key => detail[key] !== undefined).map(key => [key, key === "progress" ? detail.progress.filter(row => row.uid === request.auth.uid) : detail[key]])) : null;
      }));
    }
    return visible;
  });
  const claimMission = policyCall("claimMission",async (request) => {
    await actor(request);
    return managed.claim(request);
  });
  async function close(id, cancel = false) {
    const affected = await db().runTransaction(async (tx) => {
      const ref = db().doc(`events/${id}`),
        snap = await tx.get(ref);
      if (!snap.exists) fail("Evento não encontrado.");
      const event = snap.data();
      if (event.status === "closed")
        return [...new Set((event.winners || []).flatMap((w) => w.uids))];
      if (event.status !== "open" && event.status !== "draft") return [];
      const rewardRef = ref.collection("private").doc("rewards");
      const ledgerSnapshot = await rewardDocuments("uid", event.questions.flatMap(question => question.candidateIds || []), tx);
      const ledger = rows(ledgerSnapshot);
      const [users, games, votes, rewardSnap] = await Promise.all([
        tx.get(db().collection("users")),
        tx.get(db().collection("games")),
        tx.get(db().collection(`events/${id}/votes`)),
        tx.get(rewardRef),
      ]);
      const rewards =
        rewardSnap.data()?.questions ||
        Object.fromEntries(
          event.questions.filter((q) => q.reward).map((q) => [q.id, q.reward]),
        );
      const population = rows(users),
        matches = rows(games),
        allowed = votersFor(event, population, matches);
      const cycle = cardWeek(),
        rewardCycle =
          cycle.phase === "open" ? cycle : cardWeek(cycle.nextOpensAt);
      const starts = cycle.phase === "open" ? new Date() : rewardCycle.opensAt,
        winners = [],
        uids = new Set();
      if (!cancel && event.status === "open")
        for (const question of event.questions) {
          const candidates = candidatesFor(
              event,
              question,
              population,
              matches,
            ),
            counts = Object.fromEntries(candidates.map((uid) => [uid, 0]));
          for (const vote of rows(votes)) {
            const target = vote.answers?.[question.id];
            if (
              allowed.includes(vote.id) &&
              target !== vote.id &&
              candidates.includes(target)
            )
              counts[target]++;
          }
          const max = Math.max(0, ...Object.values(counts)),
            leaders =
              max >= event.minVotes
                ? candidates.filter((uid) => counts[uid] === max)
                : [];
          const reward = rewards[question.id];
          if (leaders.length && !reward)
            fail("A recompensa deste evento está indisponível.");
          winners.push({
            questionId: question.id,
            label: question.label,
            votes: max,
            uids: leaders,
            counts,
            ...(leaders.length ? { reward } : {}),
          });
          for (const uid of leaders) {
            uids.add(uid);
            const normalized={...reward,boosts:reward.boosts || {},mode:reward.specialId ? Object.values(reward.boosts || {}).some(value=>value>0)?"both":"card":"stats",statDuration:reward.statDuration || "weekly"};
            grant(tx, ref, event, uid, 1, normalized, ledger, `${id}_${question.id}_${uid}`, "system");
          }
        }
      tx.update(ref, {
        questions: publicQuestions(event.questions),
        rewardPrivacy: 1,
        status: cancel ? "cancelled" : "closed",
        closedAt: FieldValue.serverTimestamp(),
        winners,
        rewardsApplied: cancel || event.status !== "open",
      });
      if (!rewardSnap.exists) tx.set(rewardRef, { questions: rewards });
      return [...uids];
    });
    for (const uid of affected) await rebuild(uid);
    await db().doc(`events/${id}`).update({ rewardsApplied: true });
    await signalMaintenance("events", id, null, { status: "closed" });
    return { ok: true };
  }
  const eventAction = policyCall("eventAction",async (request) => {
    const user = await actor(request, true),
      { action, eventId, ...draft } = request.data || {};
    if (eventId && !validEventId(eventId)) fail("Evento inválido.");
    if (
      draft.schemaVersion === 2 ||
      (eventId &&
        (await db().doc(`events/${eventId}`).get()).data()?.schemaVersion === 2)
    )
      return managed.action(request, user);

    if (action === "close" || action === "cancel") {
      if (typeof eventId !== "string" || !eventId || eventId.includes("/"))
        fail("Evento inválido.");
      return close(eventId, action === "cancel");
    }
    if (action === "open") {
      if (typeof eventId !== "string" || !eventId || eventId.includes("/"))
        fail("Evento inválido.");
      await db().runTransaction(async (tx) => {
        const ref = db().doc(`events/${eventId}`),
          s = await tx.get(ref);
        if (
          !s.exists ||
          s.data().status !== "draft" ||
          s.data().endsAt.toMillis() <= Date.now()
        )
          fail("Rascunho inválido ou já expirado.");
        const privateRef = ref.collection("private").doc("rewards");
        const privateSnap = await tx.get(privateRef);
        if (!privateSnap.exists)
          tx.set(privateRef, {
            questions: Object.fromEntries(
              s
                .data()
                .questions.filter((q) => q.reward)
                .map((q) => [q.id, q.reward]),
            ),
          });
        tx.update(ref, {
          questions: publicQuestions(s.data().questions),
          rewardPrivacy: 1,
          status: "open",
          openedAt: FieldValue.serverTimestamp(),
        });
      });
      return { ok: true };
    }
    if (action !== "create") fail("Ação inválida.");
    const { users, games } = await league(),
      ids = users.filter((u) => !u.disabled).map((u) => u.uid),
      endsAt = new Date(draft.endsAt);
    if (
      typeof draft.title !== "string" ||
      !draft.title.trim() ||
      draft.title.length > 80 ||
      !["vote", "monthly"].includes(draft.kind) ||
      !Number.isFinite(+endsAt) ||
      +endsAt <= Date.now() ||
      +endsAt > Date.now() + 366 * 86400000
    )
      fail("Título, tipo ou prazo inválidos.");
    if (
      draft.description &&
      (typeof draft.description !== "string" || draft.description.length > 1000)
    )
      fail("Descrição demasiado longa.");
    const audience = draft.audience;
    if (
      !audience ||
      !["all", "game", "selected"].includes(audience.mode) ||
      (audience.mode === "game" &&
        !games.some((g) => g.id === audience.gameId)) ||
      (audience.mode === "selected" &&
        (!Array.isArray(audience.memberIds) ||
          !audience.memberIds.length ||
          !audience.memberIds.every((uid) => ids.includes(uid))))
    )
      fail("Eleitores inválidos.");
    if (
      draft.kind === "monthly" &&
      (typeof draft.month !== "string" ||
        !/^\d{4}-\d{2}$/.test(draft.month) ||
        !monthlyCandidates(users, games, draft.month).length)
    )
      fail("Não há jogadores que participaram em todos os jogos deste mês.");
    if (
      !Array.isArray(draft.questions) ||
      !draft.questions.length ||
      draft.questions.length > 10 ||
      (draft.kind === "monthly" && draft.questions.length !== 1)
    )
      fail("Configura entre 1 e 10 perguntas.");
    const participantIds = votersFor({ ...draft, audience }, users, games);
    if (participantIds.length < 2)
      fail(
        "Escolhe pelo menos dois participantes elegíveis para votar entre si.",
      );
    const createdTypes = rows(await db().collection("cardThemes").get());
    const questions = draft.questions.map((question, i) => {
      if (
        typeof question.label !== "string" ||
        !question.label.trim() ||
        question.label.length > 160 ||
        !validReward(question.reward, createdTypes)
      )
        fail("Pergunta, candidatos ou recompensa inválidos.");
      const template = createdTypes.find(
        (type) => question.reward.specialId === `saved:${type.id}`,
      );
      const reward = {
        boosts: question.reward.boosts,
        specialId: question.reward.specialId || null,
        ...(CARD_CRITERIA[question.reward.specialId]
          ? { criterion: CARD_CRITERIA[question.reward.specialId] }
          : {}),
        ...(template
          ? {
              cardTheme: {
                name: template.name,
                baseTheme: template.baseTheme || "custom-test",
                colors: template.colors,
                design: template.design || {},
                texture: template.texture || "plain",
              },
            }
          : {}),
      };
      return {
        id: `q${i + 1}`,
        label: question.label.trim(),
        candidateIds: participantIds,
        reward,
      };
    });
    if (questions.reduce((sum, q) => sum + q.candidateIds.length, 0) > 400)
      fail("Limite de 400 candidaturas somadas entre perguntas.");
    const minVotes = draft.minVotes ?? 1;
    if (!Number.isInteger(minVotes) || minVotes < 1 || minVotes > 1000)
      fail("Mínimo de votos inválido.");
    const payload = {
      title: draft.title.trim(),
      description: draft.description || "",
      kind: draft.kind,
      month: draft.month || null,
      audience,
      questions: publicQuestions(questions),
      rewardPrivacy: 1,
      minVotes,
      status: draft.openNow ? "open" : "draft",
      endsAt: Timestamp.fromDate(endsAt),
      createdBy: request.auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (!votersFor(payload, users, games).length)
      fail("Não há eleitores disponíveis.");
    const ref = db().collection("events").doc();
    await db().runTransaction(async (tx) => {
      tx.set(ref, payload);
      tx.set(ref.collection("private").doc("rewards"), {
        questions: Object.fromEntries(questions.map((q) => [q.id, q.reward])),
      });
    });
    return { id: ref.id };
  });
  const voteEvent = policyCall("voteEvent",async (request) => {
    await actor(request);
    const { eventId, answers } = request.data || {};
    if (
      typeof eventId === "string" &&
      !eventId.includes("/") &&
      (await db().doc(`events/${eventId}`).get()).data()?.schemaVersion === 2
    )
      return managed.vote(request);
    if (
      typeof eventId !== "string" ||
      !eventId ||
      eventId.includes("/") ||
      !answers ||
      typeof answers !== "object" ||
      Array.isArray(answers)
    )
      fail("Voto inválido.");
    const ref = db().doc(`events/${eventId}`);
    await db().runTransaction(async (tx) => {
      const eventSnap = await tx.get(ref),
        [users, games] = await Promise.all([
          tx.get(db().collection("users")),
          tx.get(db().collection("games")),
        ]);
      if (!eventSnap.exists) fail("Evento indisponível.");
      const event = eventSnap.data();
      if (
        event.status !== "open" ||
        event.endsAt.toMillis() <= Date.now() ||
        !votersFor(event, rows(users), rows(games)).includes(request.auth.uid)
      )
        throw new HttpsError(
          "permission-denied",
          "Evento encerrado ou sem acesso.",
        );
      const required = event.questions.filter((q) =>
        candidatesFor(event, q, rows(users), rows(games)).some(
          (uid) => uid !== request.auth.uid,
        ),
      );
      if (
        !required.length ||
        Object.keys(answers).length !== required.length ||
        required.some(
          (q) =>
            !candidatesFor(event, q, rows(users), rows(games)).includes(
              answers[q.id],
            ) || answers[q.id] === request.auth.uid,
        )
      )
        fail("Escolhe outro jogador em cada pergunta.");
      tx.set(ref.collection("votes").doc(request.auth.uid), {
        answers,
        submittedAt: FieldValue.serverTimestamp(),
      });
    });
    return { ok: true };
  });
  const closeEvents = policySchedule("closeEvents",
    {
      schedule: AUTOMATION_SCHEDULE,
      timeZone: "Europe/Lisbon",
      timeoutSeconds: 540,
    },
    async () => {
      const {issues=[], events=[], futureRewards=[]}=await managed.scheduled();
      const tryClose=async id=>{try{await close(id);}catch(error){await recordTaskFailure(id,error,issues);}};
      for (const event of events)
        if (
          event.schemaVersion !== 2 && event.status === "open" &&
          event.endsAt.toMillis() <= Date.now()
        )
          await tryClose(event.id);
      for (const event of events)
        if (
          event.schemaVersion !== 2 &&
          event.status === "closed" &&
          event.rewardsApplied === false
        )
          await tryClose(event.id);
      return {ok:!issues.length,issues,nextAt:nextHomeBoundary([events,futureRewards])};
    },
  );
  return {
    eventAction,
    voteEvent,
    closeEvents,
    getEvent,
    listEvents,
    claimMission,
  };
}
