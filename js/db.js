import { cardWeek } from "./card-week.js";
import { canEditRating } from "./rating-window.js";
import { db, storage } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  runTransaction,
  writeBatch,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";
import { completeInitial, completeFeedback } from "./utils.js";
const rows = (s) => s.docs.map((d) => ({ ...d.data(), id: d.id }));
export const list = async (path, ...filters) =>
  rows(
    await getDocs(
      filters.length
        ? query(collection(db, path), ...filters)
        : collection(db, path),
    ),
  );
export const read = async (path) => {
  const s = await getDoc(doc(db, path));
  return s.exists() ? { ...s.data(), id: s.id } : null;
};
export const users = () => list("users");
export const games = () => list("games");
export const tickets = (user) =>
  list(
    "tickets",
    ...(user.role === "admin" ? [] : [where("ownerId", "==", user.uid)]),
  );
export const watchTicket = (id, ticketCallback, messageCallback, error) => {
  const a = onSnapshot(
    doc(db, "tickets", id),
    (s) => ticketCallback(s.exists() ? { ...s.data(), id: s.id } : null),
    error,
  );
  const b = onSnapshot(
    collection(db, `tickets/${id}/messages`),
    (s) => messageCallback(rows(s)),
    error,
  );
  return () => {
    a();
    b();
  };
};
export const initials = () => list("initialRatings");
export const communitySummaries = () => list("communitySummaries");
export const gameSummaries = () => list("gameSummaries");
export const myCommunity = (uid) =>
  list("communityRatings", where("raterId", "==", uid));
export const myFeedback = (gid, uid) =>
  list(`games/${gid}/feedback`, where("raterId", "==", uid));
export const history = (uid) => list(`users/${uid}/cardHistory`);
export const notifications = (uid) => list(`users/${uid}/notifications`);
export const watchNotifications = (uid, callback, error) =>
  onSnapshot(
    collection(db, `users/${uid}/notifications`),
    (snapshot) => callback(rows(snapshot)),
    error,
  );
export const saveProfile = (uid, changes) =>
  updateDoc(doc(db, "users", uid), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
export async function saveInitial(uid, ratings20, submit = true) {
  const target = doc(db, "initialRatings", uid);
  await runTransaction(db, async (tx) => {
    const s = await tx.get(target);
    if (!canEditRating(s.data(), new Date(), true))
      throw Error("O prazo de 7 dias para editar a autoavaliação terminou.");
    const completed = submit || s.data()?.completed === true;
    if (completed && !completeInitial(ratings20))
      throw Error("Preenche os 12 atributos.");
    const value = {
      uid,
      ratings20,
      completed,
      submittedAt: s.data()?.completed
        ? s.data().submittedAt || s.data().createdAt
        : completed
          ? serverTimestamp()
          : null,
      updatedAt: serverTimestamp(),
      createdAt: s.data()?.createdAt || serverTimestamp(),
    };
    tx.set(target, value);
  });
}
export async function saveCommunity(
  raterId,
  targetId,
  ratings20,
  submit = false,
) {
  const target = doc(db, "communityRatings", `${raterId}_${targetId}`);
  await runTransaction(db, async (tx) => {
    const s = await tx.get(target);
    if (!canEditRating(s.data()))
      throw Error("O prazo de 7 dias para editar a avaliação terminou.");
    submit = submit || s.data()?.submitted === true;
    if (submit && !completeInitial(ratings20))
      throw Error("Preenche os 12 atributos.");
    const value = {
      raterId,
      targetId,
      ratings20,
      submitted: submit,
      updatedAt: serverTimestamp(),
      submittedAt: s.data()?.submitted
        ? s.data().submittedAt || s.data().createdAt
        : submit
          ? serverTimestamp()
          : null,
    };
    if (!s.exists()) value.createdAt = serverTimestamp();
    else value.createdAt = s.data().createdAt;
    tx.set(target, value);
  });
}
export async function saveFeedback(
  gid,
  raterId,
  targetId,
  ratings,
  submit = false,
) {
  const target = doc(db, `games/${gid}/feedback/${raterId}_${targetId}`);
  await runTransaction(db, async (tx) => {
    const s = await tx.get(target);
    if (!canEditRating(s.data()))
      throw Error("O prazo de 7 dias para editar a avaliação terminou.");
    submit = submit || s.data()?.submitted === true;
    if (submit && !completeFeedback(ratings))
      throw Error("Preenche as dimensões obrigatórias.");
    tx.set(target, {
      gameId: gid,
      raterId,
      targetId,
      ratings,
      submitted: submit,
      createdAt: s.data()?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      submittedAt: s.data()?.submitted
        ? s.data().submittedAt || s.data().createdAt
        : submit
          ? serverTimestamp()
          : null,
    });
  });
}
export async function saveGame(id, data, actor) {
  const target = id ? doc(db, "games", id) : doc(collection(db, "games"));
  await runTransaction(db, async (tx) => {
    const s = await tx.get(target);
    if (!["admin", "dbs"].includes(actor.role))
      throw Error("Só DBS e administradores podem gerir jogos.");
    if (
      s.exists() &&
      ((s.data().status === "closed" && actor.role !== "admin") ||
        s.data().deleting)
    )
      throw Error("O jogo está encerrado ou a ser eliminado.");
    const prior = s.data()?.status;
    if (
      (!s.exists() && data.status !== "draft") ||
      (prior === "draft" && !["draft", "open"].includes(data.status)) ||
      (prior === "open" &&
        !["draft", "open", "closed"].includes(data.status)) ||
      (prior === "closed" && data.status !== "closed")
    )
      throw Error("Transição de jogo inválida.");
    const value = { ...data, updatedAt: serverTimestamp() };
    for (const key of ["teamNames", "playerCards", "cardWeekId"]) {
      if (s.exists() && key in s.data()) value[key] = s.data()[key];
    }
    if (!s.exists()) {
      value.creatorId = actor.uid;
      value.createdAt = serverTimestamp();
    } else {
      value.creatorId = s.data().creatorId;
      value.createdAt = s.data().createdAt;
    }
    if (data.status === "closed" && s.data()?.status !== "closed") {
      value.closedAt = serverTimestamp();
      value.closedBy = actor.uid;
    } else {
      value.closedAt = s.data()?.closedAt || null;
      value.closedBy = s.data()?.closedBy || null;
    }
    tx.set(target, value);
  });
  return target.id;
}
export async function uploadAvatar(uid, file) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw Error("Escolhe uma imagem JPG, PNG ou WebP até 5 MB.");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d"),
    side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    512,
    512,
  );
  bitmap.close();
  const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.82));
  if (!blob || blob.size >= 1024 * 1024)
    throw Error("Não foi possível comprimir a fotografia.");
  const target = ref(storage, `profiles/${uid}/avatar`);
  await uploadBytes(target, blob, {
    contentType: "image/webp",
    cacheControl: "private,max-age=3600",
  });
  return getDownloadURL(target);
}
export async function markRead(uid, items) {
  for (let i = 0; i < items.length; i += 400) {
    const batch = writeBatch(db);
    items.slice(i, i + 400).forEach((n) =>
      batch.update(doc(db, `users/${uid}/notifications/${n.id}`), {
        read: true,
      }),
    );
    await batch.commit();
  }
}
export async function syncNotifications(uid, missions) {
  const existing = await notifications(uid);
  const ids = new Set(existing.map((n) => n.id));
  const missing = missions.filter(
    (m) => !m.hiddenCard && !ids.has(`mission-${m.id}`),
  );
  if (missing.length) {
    const batch = writeBatch(db);
    missing.forEach((m) =>
      batch.set(doc(db, `users/${uid}/notifications/mission-${m.id}`), {
        type:
          m.type === "RATE_NEW_PLAYER"
            ? "NEW_PLAYER_TO_RATE"
            : m.type === "GAME_FEEDBACK"
              ? "RATING_REQUIRED"
              : "NEW_MISSION",
        title: m.title,
        body: m.description,
        href: m.href,
        read: false,
        createdAt: serverTimestamp(),
      }),
    );
    await batch.commit();
  }
  return missing.length ? notifications(uid) : existing;
}
export const callAdmin = (name, data, options) =>
  httpsCallable(getFunctions(undefined, "europe-west1"), name, options)(data);

export const weeklyCardPhotos = (weekId) =>
  list("weeklyCardPhotos", where("weekId", "==", weekId));
export { prepareWeeklyCardPhoto } from "./photo-upload.js";

export const openEvents = async () => (await callAdmin("listEvents", {})).data;
export const eventDetails = async (eventId) =>
  (await callAdmin("getEvent", { eventId })).data;

const previousOvrCache = new Map();
export async function previousOvrs(users, cycle) {
  const cards = await previousCards(users, cycle);
  return Object.fromEntries(
    Object.entries(cards).map(([uid, card]) => [uid, card?.ovr ?? null]),
  );
}
export async function previousCards(users, cycle) {
  const week = cardWeek(new Date(+cycle.opensAt - 1)).weekId;
  return Object.fromEntries(
    await Promise.all(
      users
        .filter((u) => !u.disabled)
        .map(async (u) => {
          const key = `${u.uid}_${week}`;
          if (!previousOvrCache.has(key))
            previousOvrCache.set(
              key,
              (await read(`users/${u.uid}/cardHistory/${week}`)) ?? null,
            );
          return [u.uid, previousOvrCache.get(key)];
        }),
    ),
  );
}
