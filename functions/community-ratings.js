import { randomUUID } from "node:crypto";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { policyCall, assertFeature } from "./policy-runtime.js";
import { policyAt, canManage } from "../js/system-policy.js";
import { canEditRating } from "../js/rating-window.js";
import { ATTRIBUTES, completeInitial } from "../js/utils.js";
import {
  eligibleCommunityRating,
  communityReviewNotice,
} from "./community-rating-policy.js";

export function requiredCommunityReview(now = Timestamp.now(), authorized = false) {
  return {
    reviewState: authorized ? "required" : "invalid",
    reviewAttempts: 1,
    reviewToken: authorized ? randomUUID() : null,
    reviewRequestedAt: now,
    reviewDeadline: authorized ? Timestamp.fromMillis(
      now.toMillis() + policyAt().rules.ratingEditDays * 86400000,
    ) : null,
  };
}
export function writeCommunityNotice(tx, db, row, targetName, state) {
  tx.set(
    db.doc(
      `users/${row.raterId}/notifications/community-review-${row.targetId}`,
    ),
    {
      ...communityReviewNotice(targetName, state),
      href: `#/missions/new/${row.targetId}`,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    },
  );
}
export function communityRatingFunctions(rebuild) {
  const listCommunityRatingsForAdmin = policyCall("listCommunityRatingsForAdmin", async (request) => {
    if (!canManage(request.systemActor, "ratings"))
      throw new HttpsError("permission-denied", "Acesso reservado à administração de avaliações.");
    const snapshot = await getFirestore().collection("communityRatings").get();
    return { rows: snapshot.docs.map(doc => {
      const row = { ...doc.data(), id: doc.id };
      // Classify legacy submissions too, without changing their stored values on a read.
      if (row.submitted && completeInitial(row.ratings20) &&
          !eligibleCommunityRating({ ...row, reviewState: null }) &&
          !["required", "ignored", "invalid"].includes(row.reviewState)) row.reviewState = "invalid";
      for (const [key, value] of Object.entries(row))
        if (value?.toDate) row[key] = value.toDate().toISOString();
      return row;
    }) };
  });
  const grantCommunityRatingRetry = policyCall("grantCommunityRatingRetry", async (request) => {
    if (!canManage(request.systemActor, "ratings"))
      throw new HttpsError("permission-denied", "Acesso reservado à administração de avaliações.");
    const { id } = request.data || {};
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,260}$/.test(id))
      throw new HttpsError("invalid-argument", "Avaliação inválida.");
    const db = getFirestore(), ref = db.doc(`communityRatings/${id}`), now = Timestamp.now();
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref), row = snapshot.data();
      if (!row) throw new HttpsError("not-found", "Avaliação não encontrada.");
      const target = await tx.get(db.doc(`users/${row.targetId}`));
      if (!row.submitted || !completeInitial(row.ratings20) ||
          eligibleCommunityRating({ ...row, reviewState: null }) ||
          (row.reviewAttempts || 0) >= 2 || row.reviewGrantedAt)
        throw new HttpsError("failed-precondition", "Esta avaliação não permite outra tentativa.");
      const value = { ...row, ...requiredCommunityReview(now, true),
        reviewGrantedAt: now, reviewGrantedBy: request.auth.uid, updatedAt: now };
      tx.set(ref, value);
      tx.set(db.collection("systemAudit").doc(), {
        actorId: request.auth.uid, action: "grantCommunityRatingRetry",
        details: { id, raterId: row.raterId, targetId: row.targetId },
        status: "completed", createdAt: now,
      });
      writeCommunityNotice(tx, db, value, target.data()?.displayName || target.data()?.username || "este jogador", "required");
      return { reviewState: "required" };
    });
  });
  const communityRatingAction = policyCall(
    "communityRatingAction",
    async (request) => {
      if (!request.auth)
        throw new HttpsError("unauthenticated", "Inicia sessão.");
      assertFeature("ratings");
      const uid = request.auth.uid,
        {
          targetId,
          ratings20,
          submit = false,
          submissionId,
          reviewToken,
        } = request.data || {};
      if (
        typeof targetId !== "string" ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(targetId) ||
        targetId === uid ||
        typeof submit !== "boolean"
      )
        throw new HttpsError("invalid-argument", "Avaliação inválida.");
      if (
        !ratings20 ||
        typeof ratings20 !== "object" ||
        Array.isArray(ratings20) ||
        Object.keys(ratings20).some(
          (key) => !ATTRIBUTES.some(([id]) => id === key),
        ) ||
        Object.values(ratings20).some(
          (value) => !Number.isFinite(value) || value < 0 || value > 20,
        ) ||
        (submit && !completeInitial(ratings20))
      )
        throw new HttpsError(
          "invalid-argument",
          "Preenche os 12 atributos, entre 0 e 20.",
        );
      if (
        submit &&
        (typeof submissionId !== "string" ||
          !/^[A-Za-z0-9_-]{10,100}$/.test(submissionId))
      )
        throw new HttpsError(
          "invalid-argument",
          "Atualiza o formulário e tenta novamente.",
        );
      const db = getFirestore(),
        ref = db.doc(`communityRatings/${uid}_${targetId}`),
        now = Timestamp.now();
      const result = await db.runTransaction(async (tx) => {
        const [owner, target, snapshot] = await Promise.all([
          tx.get(db.doc(`users/${uid}`)),
          tx.get(db.doc(`users/${targetId}`)),
          tx.get(ref),
        ]);
        if (
          !owner.exists ||
          owner.data().disabled ||
          !target.exists ||
          target.data().disabled
        )
          throw new HttpsError("permission-denied", "Avaliação indisponível.");
        const old = snapshot.data() || {};
        if (submit && old.lastSubmissionId === submissionId) {
          if (
            !ATTRIBUTES.every(
              ([key]) => old.ratings20?.[key] === ratings20[key],
            )
          )
            throw new HttpsError(
              "already-exists",
              "Esta submissão já foi recebida.",
            );
          return {
            reviewState: old.reviewState || (eligibleCommunityRating(old) ? "accepted" : "invalid"),
            submitted: true,
            repeated: true,
          };
        }
        if ((old.reviewAttempts || 0) >= 2 || old.reviewState === "ignored" || old.reviewState === "invalid" ||
            (old.reviewState === "required" && !old.reviewGrantedAt) ||
            (old.submitted && completeInitial(old.ratings20) &&
              !eligibleCommunityRating({ ...old, reviewState: null }) && !old.reviewGrantedAt))
          throw new HttpsError(
            "failed-precondition",
            "Esta avaliação já está encerrada.",
          );
        const pending = old.reviewState === "required";
        if (
          pending
            ? !(old.reviewDeadline?.toMillis() > now.toMillis())
            : !canEditRating(old, now.toDate())
        )
          throw new HttpsError(
            "failed-precondition",
            "O prazo para rever esta avaliação terminou.",
          );
        if (pending && submit && reviewToken !== old.reviewToken)
          throw new HttpsError(
            "failed-precondition",
            "Atualiza o formulário antes de submeter a tua revisão.",
          );
        const value = {
          ...old,
          raterId: uid,
          targetId,
          createdAt: old.createdAt || now,
          updatedAt: now,
        };
        if (!submit) {
          if (old.submitted) value.draftRatings20 = ratings20;
          else {
            value.ratings20 = ratings20;
            value.submitted = false;
          }
          tx.set(ref, value);
          return {
            submitted: old.submitted === true,
            reviewState: old.reviewState || null,
          };
        }
        Object.assign(value, {
          ratings20,
          submitted: true,
          submittedAt: old.submittedAt || old.createdAt || now,
          editDays: old.submitted
            ? (old.editDays ?? 7)
            : policyAt().rules.ratingEditDays,
          lastSubmissionId: submissionId,
        });
        if (!old.submitted) value.submittedAt = now;
        delete value.draftRatings20;
        const accepted = eligibleCommunityRating({ ...value, reviewState: null });
        if (pending) {
          Object.assign(value, {
            reviewAttempts: 2,
            reviewState: accepted ? "accepted" : "ignored",
            reviewedAt: now,
          });
          writeCommunityNotice(
            tx,
            db,
            value,
            target.data().displayName ||
              target.data().username ||
              "este jogador",
            value.reviewState,
          );
        } else if (!accepted) {
          Object.assign(value, requiredCommunityReview(now));
          writeCommunityNotice(
            tx,
            db,
            value,
            target.data().displayName ||
              target.data().username ||
              "este jogador",
            "invalid",
          );
        }
        value.communityBatchToken = randomUUID();
        tx.set(db.doc(`communityWork/${targetId}`), {
          token: value.communityBatchToken, pending: true, updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(ref, value);
        return {
          submitted: true,
          reviewState: value.reviewState || "accepted",
        };
      });
      if (submit) await rebuild(targetId);
      return result;
    },
  );
  return { communityRatingAction, grantCommunityRatingRetry, listCommunityRatingsForAdmin };
}
