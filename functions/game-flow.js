import { upgradePathProposals } from "../js/path-model.js";
import { queueFeedback } from "./feedback-queue.js";
import { hasRatingWaiver } from "../js/rating-quorum.js";
import { randomUUID } from "node:crypto";
import { gameTeamSize, validTeamSize } from "../js/game-format.js";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { policyCall, assertFeature } from "./policy-runtime.js";
import { canManage, policyAt } from "../js/system-policy.js";
import { canEditRating } from "../js/rating-window.js";
import {
  participants,
  FEEDBACK,
  completeFeedback,
  OVR_POSITIONS,
  matchPerformance,
} from "../js/utils.js";
import { freezePathForGame } from "../js/path-window.js";
import { pathGameCoreSignature } from "./path-game-signature.js";

const fail = (message) => {
  throw new HttpsError("failed-precondition", message);
};
const validId = (id) => typeof id === "string" && /^[\w-]{1,128}$/.test(id);
const only = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => keys.includes(key));

export function validateGameInput(input) {
  if (
    !only(input, [
      "title",
      "location",
      "notes",
      "youtubeVideoId",
      "scheduledAt",
      "teamA",
      "teamB",
      "score",
      "positions",
      "performance",
      "status",
      "teamSize",
    ])
  )
    fail("Dados de jogo inválidos.");
  for (const [key, max] of [
    ["title", 80],
    ["location", 120],
    ["notes", 1000],
  ])
    if (
      typeof input[key] !== "string" ||
      input[key].length > max ||
      (key === "title" && !input[key].trim())
    )
      fail("Preenche os dados do jogo dentro dos limites.");
  if (
    input.youtubeVideoId !== undefined &&
    (typeof input.youtubeVideoId !== "string" ||
      !/^$|^[\w-]{11}$/.test(input.youtubeVideoId))
  )
    fail("Vídeo inválido.");
  if (typeof input.scheduledAt !== "string") fail("Data de jogo inválida.");
  const date = new Date(input.scheduledAt);
  if (input.teamSize !== undefined && !validTeamSize(input.teamSize))
    fail("Escolhe entre 5 e 12 titulares por equipa.");
  if (
    !Number.isFinite(+date) ||
    !["draft", "open", "closed"].includes(input.status)
  )
    fail("Data ou estado do jogo inválido.");
  for (const side of ["teamA", "teamB"]) {
    const team = input[side];
    if (
      !only(team, ["starters", "bench"]) ||
      !Array.isArray(team.starters) ||
      !Array.isArray(team.bench) ||
      team.starters.length > gameTeamSize(input) ||
      ![...team.starters, ...team.bench].every(validId)
    )
      fail("Equipa inválida.");
    if (input.status === "closed" && !team.starters.length)
      fail("Cada equipa precisa de titulares para encerrar o jogo.");
  }
  const ids = participants(input),
    all = ["teamA", "teamB"].flatMap((side) => [
      ...input[side].starters,
      ...input[side].bench,
    ]);
  if (all.length > 60 || new Set(all).size !== all.length)
    fail("Existem participantes repetidos ou a mais.");
  if (
    !only(input.score, ["teamA", "teamB"]) ||
    !["teamA", "teamB"].every(
      (side) =>
        Number.isInteger(input.score[side]) &&
        input.score[side] >= 0 &&
        input.score[side] <= 999,
    )
  )
    fail("Resultado inválido.");
  if (
    input.positions !== undefined &&
    (!only(input.positions, ids) ||
      !Object.values(input.positions).every((position) =>
        OVR_POSITIONS.includes(position),
      ))
  )
    fail("Posição inválida.");
  if (input.performance !== undefined) {
    if (!only(input.performance, ["teamA", "teamB"]))
      fail("Performance inválida.");
    for (const side of ["teamA", "teamB"]) {
      const row = input.performance[side],
        team = [...input[side].starters, ...input[side].bench];
      if (
        !only(row, ["goals", "assists"]) ||
        !["goals", "assists"].every(
          (key) =>
            Array.isArray(row[key]) &&
            row[key].length <= input.score[side] &&
            row[key].every((uid) => team.includes(uid)),
        )
      )
        fail(
          "Os golos e assistências têm de pertencer à equipa e respeitar o resultado.",
        );
    }
  }
  return { ...input, teamSize: gameTeamSize(input), scheduledAt: Timestamp.fromDate(date) };
}

// Called from every feedback writer, including administrative corrections.
// Server commit timestamps, not a client date or trigger execution time, define
// the exact versions eligible at the path's 48-hour deadline.
export function writeFeedbackRevision(tx, ref, previous, vote) {
  const journal = ref.parent.parent.collection("pathVoteRevisions");
  if (previous && !previous.voteRevision)
    tx.set(journal.doc(), {
      vote: previous,
      recordedAt:
        previous.updatedAt || previous.submittedAt || previous.createdAt,
      order: "000000000000",
    });
  const voteRevision = (previous?.voteRevision || 0) + 1;
  const feedbackBatchToken = queueFeedback(tx, ref.parent.parent, previous, vote);
  const value = { ...vote, voteRevision, ...(feedbackBatchToken ? { feedbackBatchToken } : {}) };
  tx.set(journal.doc(), {
    vote: value,
    recordedAt: FieldValue.serverTimestamp(),
    order: String(voteRevision).padStart(12, "0"),
  });
  tx.set(ref, value);
}

export function gameFlowFunctions(syncGame = async () => {}) {
  const db = () => getFirestore();
  const gameAction = policyCall("gameAction", async (request) => {
    assertFeature("games");
    const actor = request.systemActor;
    if (!canManage(actor, "games") && actor.role !== "dbs")
      throw new HttpsError(
        "permission-denied",
        "Só a gestão de jogos e DBS podem gerir partidas.",
      );
    const { gameId, game } = request.data || {};
    if (gameId != null && !validId(gameId)) fail("Jogo inválido.");
    const value = validateGameInput(game);
    const ref = gameId
      ? db().doc(`games/${gameId}`)
      : db().collection("games").doc();
    await db().runTransaction(async (tx) => {
      const [existing, guard, openGames] = await Promise.all([
        tx.get(ref),
        tx.get(db().doc("gameFlow/open")),
        tx.get(db().collection("games").where("status", "==", "open")),
      ]);
      const prior = existing.data();
      if (
        prior?.deleting ||
        (prior?.status === "closed" && actor.role !== "admin")
      )
        fail("O jogo está encerrado ou a ser eliminado.");
      const allowed = {
        draft: ["draft", "open"],
        open: ["draft", "open", "closed"],
        closed: ["closed"],
      };
      if (
        (!prior && value.status !== "draft") ||
        (prior && !allowed[prior.status]?.includes(value.status))
      )
        fail("Transição de jogo inválida.");
      if (
        value.status === "open" &&
        openGames.docs.some((doc) => doc.id !== ref.id && !doc.data().deleting)
      )
        fail("Já existe um jogo aberto. Encerra-o antes de abrir outro.");
      const opening = value.status === "open" && prior?.status !== "open";
      const closing = value.status === "closed" && prior?.status === "open";
      const ids =
        value.status === "open" && (opening || prior?.openedAt)
          ? participants(value)
          : closing
            ? [...new Set([...participants(prior), ...participants(value)])]
            : [];
      const states = await Promise.all(
        ids.map((uid) => tx.get(db().doc(`pathStates/${uid}`))),
      );
      const played = await Promise.all(
        ids.map((uid) =>
          tx.get(db().doc(`pathGameLinks/${ref.id}/players/${uid}`)),
        ),
      );
      const now = new Date().toISOString();
      const output = {
        ...value,
        ...(prior?.ratingWaivers ? {ratingWaivers:prior.ratingWaivers} : {}),
        creatorId: prior?.creatorId || request.auth.uid,
        createdAt: prior?.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        closedAt: prior?.closedAt || null,
        closedBy: prior?.closedBy || null,
        openedAt: opening
          ? FieldValue.serverTimestamp()
          : prior?.openedAt || null,
      };
      if (value.status === "closed" && prior?.status !== "closed") {
        output.closedAt = FieldValue.serverTimestamp();
        output.closedBy = request.auth.uid;
      }
      for (const key of ["teamNames", "playerCards", "cardWeekId"])
        if (prior && key in prior) output[key] = prior[key];
      for (const [index, snap] of states.entries())
        if (snap.exists) {
          if (!closing && played[index].exists) continue;
          const original = snap.data(),
            state = upgradePathProposals(original),
            next = closing
              ? {
                  ...state,
                  pending: (state.pending || []).map((attempt) =>
                    attempt.gameId === ref.id
                      ? {
                          ...attempt,
                          closedCoreSignature: pathGameCoreSignature(value),
                          closedGame: {
                            id: ref.id,
                            status: "closed",
                            scheduledAt: value.scheduledAt
                              .toDate()
                              .toISOString(),
                            teamA: value.teamA,
                            teamB: value.teamB,
                            score: value.score,
                            positions: Object.hasOwn(
                              value.positions || {},
                              state.uid,
                            )
                              ? { [state.uid]: value.positions[state.uid] }
                              : {},
                            pathPerformance: {
                              [state.uid]: matchPerformance(state.uid, value),
                            },
                          },
                        }
                      : attempt,
                  ),
                }
              : freezePathForGame(
                  state,
                  { ...value, id: ref.id },
                  opening ? now : prior.openedAt.toDate().toISOString(),
                );
          if (next !== original) tx.set(snap.ref, next);
        }
      tx.set(ref, output);
      tx.set(db().collection("gameAudit").doc(), {
        gameId: ref.id,
        actorId: request.auth.uid,
        from: prior?.status || null,
        to: value.status,
        at: FieldValue.serverTimestamp(),
      });
      // Every opening and preparation reads this singleton, serializing races.
      if (value.status === "open")
        tx.set(db().doc("gameFlow/open"), {
          gameId: ref.id,
          updatedAt: FieldValue.serverTimestamp(),
        });
      else if (guard.data()?.gameId === ref.id)
        tx.set(db().doc("gameFlow/open"), {
          gameId: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
    });
    // Numeric attempts are settled in this request. Triggers and the scheduled
    // sweep also retry if a reward budget or temporary service error intervenes.
    let settlementPending = false;
    if (value.status !== "open")
      try {
        await syncGame(ref.id);
      } catch (error) {
        settlementPending = true;
        console.error(
          "path-settlement-pending",
          ref.id,
          error.code || "internal",
        );
      }
    return { id: ref.id, settlementPending };
  });
  const feedbackAction = policyCall("feedbackAction", async (request) => {
    assertFeature("ratings");
    const { gameId, targetId, ratings, submit = false } = request.data || {};
    const uid = request.auth.uid;
    if (
      !validId(gameId) ||
      !validId(targetId) ||
      !only(
        ratings,
        FEEDBACK.map(([key]) => key),
      ) ||
      typeof submit !== "boolean"
    )
      fail("Avaliação inválida.");
    await db().runTransaction(async (tx) => {
      const ref = db().doc(`games/${gameId}/feedback/${uid}_${targetId}`);
      const [gameSnap, old, selfSnap] = await Promise.all([
        tx.get(db().doc(`games/${gameId}`)),
        tx.get(ref),
        tx.get(db().doc(`games/${gameId}/feedback/${targetId}_${targetId}`)),
      ]);
      const game = gameSnap.data(),
        previous = old.data();
      if (
        !game ||
        game.status !== "closed" ||
        game.deleting ||
        !participants(game).includes(uid) ||
        !participants(game).includes(targetId)
      )
        throw new HttpsError(
          "permission-denied",
          "Só participantes podem avaliar este jogo encerrado.",
        );
      if (
        previous &&
        (previous.raterId !== uid || previous.targetId !== targetId)
      )
        fail("Identidade da avaliação inválida.");
      if (!canEditRating(previous))
        fail("O prazo para editar a avaliação terminou.");
      const values = { ...ratings };
      if (
        uid !== targetId &&
        selfSnap.data()?.submitted &&
        selfSnap.data()?.ratings?.goalkeeping === null
      )
        values.goalkeeping = null;
      if (
        !Object.entries(values).every(
          ([key, value]) =>
            (key === "goalkeeping" && value === null) ||
            (Number.isInteger(value) && value >= 0 && value <= 5),
        )
      )
        fail("Valores fora da escala.");
      const submitted = submit || previous?.submitted === true;
      if (submitted && !completeFeedback(values))
        fail("Preenche as dimensões obrigatórias.");
      writeFeedbackRevision(tx, ref, previous, {
        gameId,
        raterId: uid,
        targetId,
        ratings: values,
        submitted,
        editDays: previous?.submitted
          ? (previous.editDays ?? 7)
          : policyAt().rules.ratingEditDays,
        createdAt: previous?.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        submittedAt: previous?.submitted
          ? previous.submittedAt || previous.createdAt
          : submitted
            ? FieldValue.serverTimestamp()
            : null,
      });
    });
    return { ok: true };
  });
  const ratingWaiverAction = policyCall("ratingWaiverAction", async request => {
    if (!canManage(request.systemActor,"ratings") && !canManage(request.systemActor,"games"))
      throw new HttpsError("permission-denied","Sem permissão para gerir avaliações.");
    const {gameId, uid, waive} = request.data || {};
    if (!validId(gameId) || !validId(uid) || typeof waive !== "boolean") fail("Pedido inválido.");
    const result = await db().runTransaction(async tx => {
      const ref = db().doc(`games/${gameId}`), snap = await tx.get(ref), game = snap.data();
      if (!game || game.deleting || game.status !== "closed" || !participants(game).includes(uid))
        fail("Seleciona um participante de um jogo encerrado.");
      const current = hasRatingWaiver(game,uid);
      if (current === waive) return {changed:false};
      const history = [...(game.ratingWaivers?.[uid] || [])];
      const now = Timestamp.now();
      if (waive) {
        if (history.length >= 100) fail("Limite de alterações atingido para este participante.");
        history.push({at:now, actorId:request.auth.uid});
      } else {
        const index = history.findLastIndex(row=>!row.until);
        if (index >= 0) history[index] = {...history[index],until:now,revokedBy:request.auth.uid};
      }
      tx.update(ref,{[`ratingWaivers.${uid}`]:history});
      tx.set(db().doc(`feedbackWork/${gameId}`),{token:randomUUID(),pending:true,updatedAt:FieldValue.serverTimestamp()},{merge:true});
      tx.set(db().collection("systemAudit").doc(),{actorId:request.auth.uid,action:"rating-waiver",createdAt:now,details:{gameId,uid,waive}});
      return {changed:true};
    });
    return {ok:true,...result};
  });
  return { gameAction, feedbackAction, ratingWaiverAction };
}
