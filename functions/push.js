import { policyAt } from "../js/system-policy.js";
import { policyCall, policySchedule, policyWritten, policyCreated } from "./policy-runtime.js";
import webpush from "web-push";
import {
  createHash,
  randomBytes,
  timingSafeEqual,
  ECDH,
  createECDH,
} from "node:crypto";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue, FieldPath, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

const digest = (value) => createHash("sha256").update(value).digest("hex");
export const PUSH_TTL_SECONDS = 7 * 24 * 60 * 60;
const revision = (notification) =>
  digest(
    JSON.stringify([
      notification.type,
      notification.title,
      notification.body,
      notification.href,
      notification.createdAt?.seconds,
      notification.createdAt?.nanoseconds,
    ]),
  );
const validId = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const bad = (message) => {
  throw new HttpsError("invalid-argument", message);
};
export function validateVapidKeyPair(publicKey, privateKey) {
  const key = typeof privateKey === "string" ? privateKey.trim() : "";
  let matches = false;
  if (
    /^[A-Za-z0-9_-]{43}$/.test(key) &&
    Buffer.from(key, "base64url").length === 32
  ) {
    try {
      const pair = createECDH("prime256v1");
      pair.setPrivateKey(Buffer.from(key, "base64url"));
      matches = pair.getPublicKey().toString("base64url") === publicKey;
    } catch {}
  }
  if (!matches)
    throw new HttpsError(
      "failed-precondition",
      "O envio de alertas está indisponível. A administração precisa de corrigir a configuração das notificações.",
      { reason: "push-configuration" },
    );
  return key;
}
export function normalizePushSubscription(value) {
  let endpoint;
  try {
    endpoint = new URL(value?.endpoint);
  } catch {
    bad("Subscrição de notificações inválida.");
  }
  const host = endpoint.hostname;
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.hash ||
    (endpoint.port && endpoint.port !== "443") ||
    endpoint.href.length > 2048 ||
    !(
      host === "fcm.googleapis.com" ||
      host === "web.push.apple.com" ||
      host === "updates.push.services.mozilla.com" ||
      host.endsWith(".notify.windows.com") ||
      host.endsWith(".wns.windows.com")
    )
  )
    bad("Este serviço de notificações não é suportado.");
  const key = value?.keys?.p256dh,
    auth = value?.keys?.auth;
  if (
    typeof key !== "string" ||
    !/^[A-Za-z0-9_-]{87}$/.test(key) ||
    Buffer.from(key, "base64url").length !== 65 ||
    Buffer.from(key, "base64url")[0] !== 4 ||
    typeof auth !== "string" ||
    !/^[A-Za-z0-9_-]{22}$/.test(auth) ||
    Buffer.from(auth, "base64url").length !== 16
  )
    bad("As credenciais deste dispositivo são inválidas.");
  try {
    ECDH.convertKey(Buffer.from(key, "base64url"), "prime256v1");
  } catch {
    bad("A chave de encriptação deste dispositivo é inválida.");
  }
  return { endpoint: endpoint.href, keys: { p256dh: key, auth } };
}
export function allowedPushScope(value, projectId, emulator = false) {
  let url;
  try {
    url = new URL(value);
  } catch {
    bad("Endereço da aplicação inválido.");
  }
  if (url.username || url.password || url.search || url.hash)
    bad("Endereço da aplicação inválido.");
  const firebase =
    url.protocol === "https:" &&
    [projectId + ".web.app", projectId + ".firebaseapp.com"].includes(
      url.host,
    ) &&
    url.pathname === "/";
  const portfolio =
    url.protocol === "https:" &&
    url.host === "meguminkami.github.io" &&
    url.pathname === "/demos/peladinha-cards/";
  const local =
    emulator &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
    url.pathname.endsWith("/");
  if (!firebase && !portfolio && !local)
    bad("Este endereço não pertence à aplicação.");
  return url.href;
}

export function pushFunctions({
  projectId,
  publicKey,
  privateKey,
  secret,
  send = (...args) => webpush.sendNotification(...args),
}) {
  const db = () => getFirestore();
  const ackURL = `https://europe-west1-${projectId}.cloudfunctions.net/ackPushNotification`;
  const activeUser = async (uid) => {
    const user = (await db().doc(`users/${uid}`).get()).data();
    if (!user || user.disabled)
      throw new HttpsError("permission-denied", "Conta indisponível.");
    return user;
  };
  const pushDeviceAction = policyCall("pushDeviceAction",
    { secrets: secret ? [secret] : [] },
    async (request) => {
      if (!request.auth)
        throw new HttpsError("unauthenticated", "Inicia sessão.");
      const uid = request.auth.uid,
        input = request.data || {};
      await activeUser(uid);
      if (input.action === "register") {
        if (!publicKey)
          throw new HttpsError(
            "failed-precondition",
            "As notificações do telemóvel ainda não estão disponíveis.",
          );
        const subscription = normalizePushSubscription(input.subscription);
        const scope = allowedPushScope(
          input.scope,
          projectId,
          !!process.env.FIRESTORE_EMULATOR_HOST,
        );
        const deviceId = digest(subscription.endpoint),
          ref = db().doc(`pushDevices/${deviceId}`);
        await db().runTransaction(async (tx) => {
          const [existing, devices] = await Promise.all([
            tx.get(ref),
            tx.get(db().collection("pushDevices").where("uid", "==", uid)),
          ]);
          if (existing.data()?.uid !== uid && devices.size >= 10)
            throw new HttpsError(
              "resource-exhausted",
              "Já tens dez dispositivos associados. Desativa um antes de adicionar outro.",
            );
          const previous = existing.data();
          tx.set(ref, {
            uid,
            subscription,
            scope,
            enabled: true,
            platform: ["ios", "android", "browser"].includes(input.platform)
              ? input.platform
              : "browser",
            createdAt:
              previous?.uid === uid
                ? previous.createdAt
                : FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            ...(previous?.uid === uid && previous.lastTestAt
              ? { lastTestAt: previous.lastTestAt }
              : {}),
          });
        });
        return { deviceId };
      }
      if (!validId(input.deviceId)) bad("Dispositivo inválido.");
      const ref = db().doc(`pushDevices/${input.deviceId}`);
      if (input.action === "sync") {
        const device = (await ref.get()).data();
        if (!device?.enabled || device.uid !== uid)
          throw new HttpsError("permission-denied", "Ativa as notificações neste dispositivo.");
        // Recover recent unread alerts after a reconnect or a repaired subscription.
        // sentAt is acceptance by the push provider; the provider retains offline deliveries.
        let query = db().collection(`users/${uid}/notifications`)
          .where("createdAt", ">=", Timestamp.fromMillis(Date.now() - PUSH_TTL_SECONDS * 1000))
          .orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(100);
        if (input.cursor) {
          const { seconds, nanoseconds, id } = input.cursor;
          if (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > 253402300799 || !Number.isInteger(nanoseconds) || nanoseconds < 0 || nanoseconds > 999999999 || typeof id !== "string" || !id || id.length > 256 || id.includes("/")) bad("Página de notificações inválida.");
          query = query.startAfter(new Timestamp(seconds, nanoseconds), id);
        }
        const recent = await query.get();
        const pending = recent.docs.filter(doc => !doc.data().read);
        let failures = 0;
        for (let i = 0; i < pending.length; i += 10) {
          const results = await Promise.allSettled(pending.slice(i, i + 10).map(doc => deliver(uid, doc.id, input.deviceId)));
          failures += results.filter(result => result.status === "rejected").length;
        }
        const last = recent.docs.at(-1);
        const stamp = last?.data().createdAt;
        const nextCursor = failures ? input.cursor || null : recent.size === 100 ? { seconds: stamp.seconds, nanoseconds: stamp.nanoseconds, id: last.id } : null;
        return { synchronized: failures === 0 && !nextCursor, pending: failures, nextCursor };
      }
      if (input.action === "unregister") {
        await db().runTransaction(async (tx) => {
          const device = (await tx.get(ref)).data();
          if (device && device.uid !== uid)
            throw new HttpsError(
              "permission-denied",
              "Este dispositivo não pertence à tua conta.",
            );
          if (device) tx.delete(ref);
        });
        return { disabled: true };
      }
      if (input.action === "test") {
        // A test must fail visibly when the server cannot sign a push, before queuing it.
        validateVapidKeyPair(publicKey, privateKey());
        await db().runTransaction(async (tx) => {
          const device = (await tx.get(ref)).data();
          if (!device?.enabled || device.uid !== uid)
            throw new HttpsError(
              "permission-denied",
              "Ativa as notificações neste dispositivo.",
            );
          if (
            device.lastTestAt &&
            Date.now() - device.lastTestAt.toMillis() < 60000
          )
            throw new HttpsError(
              "resource-exhausted",
              "Espera um minuto antes de enviar outro teste.",
            );
          tx.update(ref, { lastTestAt: FieldValue.serverTimestamp() });
          tx.create(db().collection(`users/${uid}/notifications`).doc(), {
            type: "PUSH_TEST",
            title: "A tua liga já chegou ao telemóvel!",
            body: "Toca para abrir as Peladinhas. Esta notificação ficará marcada como lida.",
            href: "#/notifications",
            read: false,
            createdAt: FieldValue.serverTimestamp(),
            pushDeviceId: input.deviceId,
          });
        });
        return { sent: true };
      }
      bad("Ação inválida.");
    },
  );

  async function deliver(uid, nid, deviceId) {
    if(!policyAt().notifications.enabled) return;
    const notificationRef = db().doc(`users/${uid}/notifications/${nid}`),
      deviceRef = db().doc(`pushDevices/${deviceId}`);
    const [notificationDoc, deviceDoc, userDoc] = await Promise.all([
      notificationRef.get(),
      deviceRef.get(),
      db().doc(`users/${uid}`).get(),
    ]);
    const notification = notificationDoc.data(),
      device = deviceDoc.data();
    if (
      !notification ||
      notification.read ||
      !device?.enabled ||
      device.uid !== uid ||
      !userDoc.exists ||
      userDoc.data().disabled ||
      (notification.pushDeviceId && notification.pushDeviceId !== deviceId)
    )
      return;
    const version = revision(notification),
      receiptId = digest(`${uid}:${nid}:${deviceId}:${version}`),
      receiptRef = db().doc(`pushDeliveries/${receiptId}`);
    const receipt = await db().runTransaction(async (tx) => {
      const current = (await tx.get(receiptRef)).data();
      if (current?.sentAt || current?.readAt) return null;
      if (
        current?.sendingAt &&
        Date.now() - current.sendingAt.toMillis() < 60000
      )
        throw Error("A entrega anterior ainda está em curso.");
      if (
        (current?.createdAt &&
          Date.now() - current.createdAt.toMillis() > PUSH_TTL_SECONDS * 1000)
      )
        return null;
      const value = {
        uid,
        notificationId: nid,
        deviceId,
        revision: version,
        token: current?.token || randomBytes(32).toString("base64url"),
        createdAt: current?.createdAt || Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400000),
        attempts: (current?.attempts || 0) + 1,
        sendingAt: Timestamp.now(),
      };
      tx.set(receiptRef, value, { merge: true });
      return value;
    });
    if (!receipt) return;
    // Check again after acquiring the lease: reading or signing out cancels delivery.
    const [freshNotification, freshDevice, freshUser] = await Promise.all([
      notificationRef.get(),
      deviceRef.get(),
      db().doc(`users/${uid}`).get(),
    ]);
    if (
      !freshNotification.exists ||
      freshNotification.data().read ||
      revision(freshNotification.data()) !== version ||
      !freshDevice.exists ||
      !freshDevice.data().enabled ||
      freshDevice.data().uid !== uid ||
      !freshUser.exists ||
      freshUser.data().disabled ||
      JSON.stringify(freshDevice.data().subscription) !==
        JSON.stringify(device.subscription)
    ) {
      await receiptRef.set(
        { cancelled: true, sentAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      return;
    }
    const payload = {
      version: 1,
      type: "league-notification",
      uid,
      notificationId: nid,
      title: String(notification.title || "Peladinhas Cards").slice(0, 120),
      body: String(notification.body || "Tens novidades na tua liga.").slice(
        0,
        500,
      ),
      href:
        typeof notification.href === "string" &&
        notification.href.startsWith("#/")
          ? notification.href
          : "#/notifications",
      receiptId,
      receiptToken: receipt.token,
      ackURL,
      createdAt: notification.createdAt?.toMillis?.() || Date.now(),
      expiresAt: Date.now() + PUSH_TTL_SECONDS * 1000,
    };
    try {
      await send(device.subscription, JSON.stringify(payload), {
        vapidDetails: {
          subject: `https://${projectId}.web.app`,
          publicKey,
          privateKey: validateVapidKeyPair(publicKey, privateKey()),
        },
        TTL: PUSH_TTL_SECONDS,
        urgency: "normal",
        timeout: 10000,
        topic: receiptId.slice(0, 32),
      });
      await receiptRef.set(
        {
          sentAt: FieldValue.serverTimestamp(),
          sendingAt: FieldValue.delete(),
          lastError: FieldValue.delete(),
          failure: FieldValue.delete(),
        },
        { merge: true },
      );
    } catch (error) {
      const failure =
        error.details?.reason === "push-configuration"
          ? "configuration"
          : Number(error.statusCode)
            ? "provider"
            : "transport";
      await receiptRef.set(
        {
          sendingAt: FieldValue.delete(),
          lastError: Number(error.statusCode) || 0,
          failure,
        },
        { merge: true },
      );
      const logFailure = [404, 410].includes(error.statusCode)
        ? logger.warn
        : logger.error;
      logFailure("Push delivery failed", {
        failure,
        statusCode: Number(error.statusCode) || 0,
      });
      if ([404, 410].includes(error.statusCode)) {
        // A stale delivery must never remove a subscription transferred to another user.
        await db().runTransaction(async (tx) => {
          const current = (await tx.get(deviceRef)).data();
          if (
            current?.uid === uid &&
            JSON.stringify(current.subscription) ===
              JSON.stringify(device.subscription)
          )
            tx.delete(deviceRef);
        });
        return;
      }
      throw Error("Não foi possível entregar uma notificação push.");
    }
  }
  const onNotificationPush = policyCreated(
    {
      document: "users/{uid}/notifications/{nid}",
      secrets: secret ? [secret] : [],
      retry: true,
      timeoutSeconds: 120,
    },
    async (event) => {
      if (!publicKey) return;
      const uid = event.params.uid,
        nid = event.params.nid;
      const devices = await db()
        .collection("pushDevices")
        .where("uid", "==", uid)
        .get();
      const results = await Promise.allSettled(
        devices.docs
          .filter((d) => d.data().enabled)
          .map((d) => deliver(uid, nid, d.id)),
      );
      if (results.some((r) => r.status === "rejected"))
        throw Error("Entrega push temporariamente indisponível.");
    },
  );
  const ackPushNotification = policyCall("ackPushNotification",{ cors: true }, async (request) => {
    const { receiptId, receiptToken } = request.data || {};
    if (
      !validId(receiptId) ||
      typeof receiptToken !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(receiptToken)
    )
      bad("Confirmação de leitura inválida.");
    return db().runTransaction(async (tx) => {
      const ref = db().doc(`pushDeliveries/${receiptId}`),
        receipt = (await tx.get(ref)).data();
      if (
        !receipt ||
        !receipt.token ||
        receipt.token.length !== receiptToken.length ||
        !timingSafeEqual(Buffer.from(receipt.token), Buffer.from(receiptToken))
      )
        throw new HttpsError("permission-denied", "Confirmação inválida.");
      if (receipt.expiresAt.toMillis() < Date.now()) return { expired: true };
      const notificationRef = db().doc(
          `users/${receipt.uid}/notifications/${receipt.notificationId}`,
        ),
        notification = (await tx.get(notificationRef)).data();
      if (!notification || revision(notification) !== receipt.revision)
        return { obsolete: true };
      if (!notification.read) tx.update(notificationRef, { read: true });
      if (!receipt.readAt)
        tx.update(ref, { readAt: FieldValue.serverTimestamp() });
      return { read: true };
    });
  });
  const cleanupPushDeliveries = policySchedule("cleanupPushDeliveries",
    { schedule: "0 8 * * *", timeZone: "Europe/Lisbon" },
    async () => {
      // Bound each run; expiry is enforced by the acknowledgement endpoint as well.
      const expired = await db()
        .collection("pushDeliveries")
        .where("expiresAt", "<", Timestamp.now())
        .limit(400)
        .get();
      const batch = db().batch();
      expired.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    },
  );
  return {
    pushDeviceAction,
    onNotificationPush,
    ackPushNotification,
    cleanupPushDeliveries,
  };
}
