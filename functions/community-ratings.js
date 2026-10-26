import { randomUUID } from "node:crypto";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { policyCall, assertFeature } from "./policy-runtime.js";
import { policyAt } from "../js/system-policy.js";
import { canEditRating } from "../js/rating-window.js";
import { ATTRIBUTES, completeInitial } from "../js/utils.js";
import {
  eligibleCommunityRating,
  communityReviewNotice,
} from "./community-rating-policy.js";

export function requiredCommunityReview(now = Timestamp.now()) {
  return {
    reviewState: "required",
    reviewAttempts: 1,
    reviewToken: randomUUID(),
    reviewRequestedAt: now,
    reviewDeadline: Timestamp.fromMillis(
      now.toMillis() + policyAt().rules.ratingEditDays * 86400000,
    ),
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
            reviewState: old.reviewState || "accepted",
            submitted: true,
            repeated: true,
          };
        }
        if ((old.reviewAttempts || 0) >= 2 || old.reviewState === "ignored")
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
        const accepted = eligibleCommunityRating(value);
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
            "required",
          );
        }
        tx.set(ref, value);
        return {
          submitted: true,
          reviewState: value.reviewState || "accepted",
        };
      });
      if (submit && !result.repeated) await rebuild(targetId);
      return result;
    },
  );
  return { communityRatingAction };
}
