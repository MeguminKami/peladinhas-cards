import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  onDocumentWritten,
  onDocumentCreated,
} from "firebase-functions/v2/firestore";
import { policyAt, setPolicyProvider, canManage } from "../js/system-policy.js";
import { cardWeek } from "../js/card-week.js";
const context = new AsyncLocalStorage();
setPolicyProvider(() => context.getStore()?.document || null);
const db = () => getFirestore();
export async function withPolicy(handler, document) {
  const value =
    document === undefined
      ? (await db().doc("settings/system").get()).data()
      : document;
  return context.run({ document: value || null }, handler);
}
export function inPolicy(document, handler) {
  return context.run({ document }, handler);
}
export function policyDocument() {
  return context.getStore()?.document || null;
}
export const endpointCapability = (name) =>
  name === "saveWeeklyCardPhoto"
    ? null
    : name === "deleteGame"
      ? "games"
      : /Theme|Card|Ovr/.test(name) && !/ensure|select|refresh/.test(name)
        ? "cards"
        : /correctRating/.test(name)
          ? "ratings"
          : /eventAction|createEvent/.test(name)
            ? "events"
            : name === "adminMessage"
              ? "messages"
              : /rebuild/.test(name)
                ? "operations"
                : null;
const reads = new Set([
  "getPath",
  "getEvent",
  "listEvents",
  "ensureHistory",
  "ensureGameCards",
  "refreshOwnCollection",
  "maintenanceRead",
  "ratingSubmissionStatus",
  "ackPushNotification",
  "pushDeviceAction",
]);
export function assertFeature(feature, { adminBypass = false, user } = {}) {
  const policy = policyAt();
  if (adminBypass && canManage(user, "settings")) return;
  if (
    policy.features.mode === "readOnly" ||
    (feature && policy.features[feature] === false)
  )
    throw new HttpsError(
      "failed-precondition",
      policy.features.message || "Operação temporariamente indisponível.",
    );
}
async function rateLimit(uid, name) {
  const minute = Math.floor(Date.now() / 60000);
  const id = createHash("sha256")
    .update(`${uid}:${name}:${minute}`)
    .digest("hex");
  const ref = db().doc(`systemRateLimits/${id}`);
  const totalRef = db().doc(
    `systemRateLimits/${createHash("sha256").update(`${uid}:*:${minute}`).digest("hex")}`,
  );
  await db().runTransaction(async (tx) => {
    const [snapshot, totalSnapshot] = await tx.getAll(ref, totalRef);
    const row = snapshot.data(),
      total = totalSnapshot.data();
    if (
      (row?.count || 0) >= policyAt().security.requestsPerMinute ||
      (total?.count || 0) >= policyAt().security.totalRequestsPerMinute
    )
      throw new HttpsError(
        "resource-exhausted",
        "Demasiadas operações. Tenta novamente dentro de um minuto.",
      );
    tx.set(ref, {
      uid,
      minute,
      scope: "operation",
      count: (row?.count || 0) + 1,
      lastOperation: name,
      expiresAt: new Date((minute + 10) * 60000),
    });
    tx.set(totalRef, {
      uid,
      minute,
      scope: "total",
      count: (total?.count || 0) + 1,
      lastOperation: name,
      expiresAt: new Date((minute + 10) * 60000),
    });
  });
}
export async function auditSystem(
  actorId,
  action,
  details = {},
  status = "completed",
) {
  await db().collection("systemAudit").add({
    actorId,
    action,
    details,
    status,
    createdAt: FieldValue.serverTimestamp(),
  });
}
export async function recordTaskFailure(id, error, issues) {
  const issue = {
    id,
    code: error.code || "internal",
    message: String(error.message || error).slice(0, 500),
  };
  issues.push(issue);
  await auditSystem("system", "task-item-failed", issue, "failed");
}
export function policyCall(name, options, handler) {
  if (typeof options === "function") {
    handler = options;
    options = {};
  }
  return onCall(options || {}, async (request) =>
    withPolicy(async () => {
      if (name !== "ackPushNotification") {
        if (!request.auth)
          throw new HttpsError("unauthenticated", "Inicia sessão.");
        const user = (await db().doc(`users/${request.auth.uid}`).get()).data();
        if (!user || user.disabled)
          throw new HttpsError(
            "permission-denied",
            "Conta indisponível. Acesso reservado.",
          );
        if ((request.auth.token?.auth_time || 0) < (user.tokensValidAfter || 0))
          throw new HttpsError(
            "unauthenticated",
            "A sessão terminou. Volta a iniciar sessão.",
          );
        request.systemActor = user;
        if (
          name === "pushDeviceAction" &&
          request.data?.action === "test" &&
          !policyAt().notifications.enabled
        )
          throw new HttpsError(
            "failed-precondition",
            "As notificações estão pausadas nas regras globais.",
          );
        await rateLimit(request.auth.uid, name);
        const capability = endpointCapability(name);
        if (
          capability &&
          !canManage(user, capability) &&
          !(name === "deleteGame" && user.role === "dbs")
        )
          throw new HttpsError(
            "permission-denied",
            "Acesso reservado: sem permissão para esta operação.",
          );
        const delegated =
          name === "ticketAction" && request.data?.action !== "create"
            ? "support"
            : name === "renameGameTeam"
              ? "games"
              : name === "saveWeeklyCardPhoto" &&
                  request.data?.uid !== request.auth.uid
                ? "cards"
                : null;
        if (user.role === "admin" && delegated && !canManage(user, delegated))
          throw new HttpsError(
            "permission-denied",
            "Acesso reservado para esta capacidade administrativa.",
          );
        if (!reads.has(name) && name !== "maintenanceAction") {
          if (policyAt().security.requireAppCheck && !request.app)
            throw new HttpsError(
              "unauthenticated",
              "Verificação da aplicação necessária.",
            );
          const feature = /claim/.test(name)
            ? "claims"
            : /voteEvent|eventAction|createEvent/.test(name)
              ? "events"
              : /Game|game/.test(name)
                ? "games"
                : /Rating/.test(name)
                  ? "ratings"
                  : null;
          assertFeature(feature, { user, adminBypass: !!capability });
        }
      }
      try {
        const result =
          /rebuild/.test(name) || name === "saveOvrWeights"
            ? await runTracked("manual-rebuild", () => handler(request))
            : await handler(request);
        if (endpointCapability(name))
          await auditSystem(request.auth.uid, name, {
            entity:
              request.data?.uid ||
              request.data?.eventId ||
              request.data?.gameId ||
              null,
          });
        return result;
      } catch (error) {
        if (endpointCapability(name))
          await auditSystem(
            request.auth?.uid || "anonymous",
            name,
            { code: error.code || "internal" },
            "failed",
          );
        throw error;
      }
    }),
  );
}
const jobs = new Map();
export function registeredJobs() {
  return jobs;
}
export async function runTracked(name, handler, cycleKey = null) {
  const ref = db().doc(`systemJobs/${name}`),
    token = randomUUID(),
    now = Date.now();
  await db().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data();
    if (current?.leaseUntil?.toMillis() > now)
      throw new HttpsError("aborted", "Esta operação já está em execução.");
    tx.set(
      ref,
      {
        name,
        status: "running",
        token,
        startedAt: new Date(now),
        leaseUntil: new Date(now + 600000),
      },
      { merge: true },
    );
  });
  try {
    const result = await handler();
    await ref.set(
      {
        status: result?.issues?.length ? "completed-with-issues" : "completed",
        finishedAt: FieldValue.serverTimestamp(),
        leaseUntil: new Date(0),
        lastError: result?.issues?.length
          ? `${result.issues.length} itens por processar.`
          : null,
        ...(cycleKey ? { cycleKey } : {}),
      },
      { merge: true },
    );
    return result ?? { ok: true };
  } catch (error) {
    await ref.set(
      {
        status: "failed",
        finishedAt: FieldValue.serverTimestamp(),
        leaseUntil: new Date(0),
        lastError: String(error.message).slice(0, 500),
      },
      { merge: true },
    );
    throw error;
  }
}
export function policySchedule(name, options, handler) {
  const group =
    name === "systemHeartbeat"
      ? "system"
      : /Notification/.test(name)
        ? "reminders"
        : /closeEvents|settlePaths/.test(name)
          ? "events"
          : /Collection/.test(name)
            ? "collection"
            : /cleanup/i.test(name)
              ? "cleanup"
              : "cards";
  const invoke = (event) =>
    withPolicy(async () => {
      if (
        policyAt().automation[group] === false ||
        (policyAt().features.mode === "readOnly" && group !== "system")
      )
        return { paused: true };
      let cycleKey = null;
      if (name === "closeCardWeek" || name === "openCardWeek") {
        const cycle = cardWeek();
        if (
          (name === "closeCardWeek" && cycle.phase !== "closed") ||
          (name === "openCardWeek" && cycle.phase !== "open")
        )
          return { waiting: true };
        cycleKey = `${cycle.weekId}:${cycle.phase}`;
        if (
          (await db().doc(`systemJobs/${name}`).get()).data()?.cycleKey ===
          cycleKey
        )
          return { current: true };
      }
      try {
        return await runTracked(name, () => handler(event), cycleKey);
      } catch (error) {
        if (error.code === "aborted") return { running: true };
        throw error;
      }
    });
  jobs.set(name, { group, schedule: options.schedule, run: invoke });
  return onSchedule(options, invoke);
}
export function policyWritten(path, handler) {
  return onDocumentWritten(path, (event) => withPolicy(() => handler(event)));
}
export function policyCreated(path, handler) {
  return onDocumentCreated(path, (event) => withPolicy(() => handler(event)));
}
