import { randomUUID, randomBytes, createHash } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { policyCall, withPolicy, assertFeature } from "./policy-runtime.js";
import { canManage, policyAt } from "../js/system-policy.js";
import { normalizeUsername, technicalEmail } from "../js/utils.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const validId = (uid) => typeof uid === "string" && /^[\w-]{1,128}$/.test(uid);
const deny = () => {
  throw new HttpsError(
    "permission-denied",
    "Sem autorização para recuperar esta conta.",
  );
};

export function passwordRecoveryFunctions() {
  const db = () => getFirestore();
  const passwordRecoveryAction = policyCall(
    "passwordRecoveryAction",
    async (request) => {
      const actor = request.systemActor;
      if (!canManage(actor, "access")) deny();
      const age = Date.now() / 1000 - (request.auth.token?.auth_time || 0);
      if (age > 300 || age < -60)
        throw new HttpsError(
          "unauthenticated",
          "Volta a iniciar sessão antes de autorizar a recuperação.",
        );
      const { uid, action = "authorize" } = request.data || {};
      if (!validId(uid) || !["authorize", "cancel"].includes(action))
        throw new HttpsError(
          "invalid-argument",
          "Pedido de recuperação inválido.",
        );
      const target = (await db().doc(`users/${uid}`).get()).data();
      if (!target || target.disabled) deny();
      if (
        target.role === "admin" &&
        !Array.isArray(target.adminCapabilities) &&
        Array.isArray(actor.adminCapabilities)
      )
        deny();
      const account = await getAuth().getUser(uid);
      if (account.disabled || !account.email) deny();
      const ref = db().doc(`passwordRecoveries/${uid}`);
      const code = randomBytes(18).toString("base64url");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db().runTransaction(async (tx) => {
        const current = (await tx.get(ref)).data();
        if (
          current?.status === "processing" &&
          Date.now() - (current.processingAt?.toMillis() || Date.now()) <
            5 * 60 * 1000
        )
          throw new HttpsError(
            "aborted",
            "A recuperação está a ser concluída. Tenta novamente.",
          );
        tx.set(
          ref,
          action === "cancel"
            ? {
                status: "cancelled",
                updatedAt: FieldValue.serverTimestamp(),
                authorizedBy: request.auth.uid,
              }
            : {
                uid,
                id: randomUUID(),
                status: "authorized",
                email: account.email,
                codeHash: hash(code),
                expiresAt,
                authorizedBy: request.auth.uid,
                createdAt: FieldValue.serverTimestamp(),
              },
        );
        tx.set(db().collection("systemAudit").doc(), {
          actorId: request.auth.uid,
          action: `password-recovery-${action}`,
          details: { uid },
          status: "completed",
          createdAt: FieldValue.serverTimestamp(),
        });
      });
      return action === "cancel"
        ? { ok: true }
        : { ok: true, code, expiresAt: expiresAt.toISOString() };
    },
  );
  // Public because a player recovering access cannot already be authenticated.
  const completePasswordRecovery = onCall(
    { timeoutSeconds: 60 },
    async (request) =>
      withPolicy(async () => {
        assertFeature(null);
        if (policyAt().security.requireAppCheck && !request.app)
          throw new HttpsError(
            "unauthenticated",
            "Verificação da aplicação necessária.",
          );
        const minute = Math.floor(Date.now() / 60000);
        const rateRef = db().doc(
          `systemRateLimits/${hash(`password-recovery:${request.rawRequest?.ip || "unknown"}:${minute}`)}`,
        );
        await db().runTransaction(async (tx) => {
          const count = (await tx.get(rateRef)).data()?.count || 0;
          if (count >= 20)
            throw new HttpsError(
              "resource-exhausted",
              "Demasiadas tentativas. Aguarda um minuto.",
            );
          tx.set(rateRef, {
            count: count + 1,
            expiresAt: new Date((minute + 10) * 60000),
          });
        });
        const { username, code, password } = request.data || {};
        if (
          typeof username !== "string" ||
          typeof code !== "string" ||
          !/^[\w-]{24}$/.test(code)
        )
          deny();
        if (
          typeof password !== "string" ||
          password.length < 6 ||
          password.length > 128
        )
          throw new HttpsError(
            "invalid-argument",
            "Escolhe uma palavra-passe entre 6 e 128 caracteres.",
          );
        let email;
        try {
          email = technicalEmail(normalizeUsername(username));
        } catch {
          deny();
        }
        let account;
        try {
          account = await getAuth().getUserByEmail(email);
        } catch (error) {
          if (error.code === "auth/user-not-found") deny();
          throw error;
        }
        const uid = account.uid;
        const ref = db().doc(`passwordRecoveries/${uid}`);
        const claim = randomUUID();
        await db().runTransaction(async (tx) => {
          const [approval, profile] = await tx.getAll(
            ref,
            db().doc(`users/${uid}`),
          );
          const row = approval.data(),
            user = profile.data();
          if (
            !user ||
            user.disabled ||
            account.disabled ||
            row?.status !== "authorized" ||
            row.email !== email ||
            row.expiresAt?.toMillis() <= Date.now() ||
            !row.expiresAt ||
            row.codeHash !== hash(code)
          )
            deny();
          tx.update(ref, {
            status: "processing",
            claim,
            processingAt: FieldValue.serverTimestamp(),
            codeHash: FieldValue.delete(),
          });
        });
        try {
          await getAuth().updateUser(uid, { password });
          await getAuth().revokeRefreshTokens(uid);
          const updated = await getAuth().getUser(uid);
          await db().runTransaction(async (tx) => {
            const row = (await tx.get(ref)).data();
            if (row?.claim !== claim)
              throw new HttpsError(
                "aborted",
                "Pedido de recuperação alterado.",
              );
            tx.update(ref, {
              status: "consumed",
              completedAt: FieldValue.serverTimestamp(),
              claim: FieldValue.delete(),
            });
            tx.update(db().doc(`users/${uid}`), {
              tokensValidAfter: Math.floor(
                +new Date(updated.tokensValidAfterTime) / 1000,
              ),
              updatedAt: FieldValue.serverTimestamp(),
            });
            tx.set(db().collection("systemAudit").doc(), {
              actorId: uid,
              action: "password-recovery-complete",
              details: { uid },
              status: "completed",
              createdAt: FieldValue.serverTimestamp(),
            });
          });
          return { ok: true };
        } catch (error) {
          // Never make an uncertain Auth mutation reusable. A new authorization is required.
          await db().runTransaction(async (tx) => {
            const row = (await tx.get(ref)).data();
            if (row?.claim === claim) {
              tx.update(ref, {
                status: "failed",
                failedAt: FieldValue.serverTimestamp(),
                claim: FieldValue.delete(),
              });
              tx.set(db().collection("systemAudit").doc(), {
                actorId: uid,
                action: "password-recovery-complete",
                details: { uid, code: error.code || "internal" },
                status: "failed",
                createdAt: FieldValue.serverTimestamp(),
              });
            }
          });
          throw new HttpsError(
            "internal",
            "Não foi possível concluir. Tenta entrar com a nova palavra-passe; se falhar, pede um novo código ao admin.",
          );
        }
      }),
  );
  return { passwordRecoveryAction, completePasswordRecovery };
}
