import * as DB from "./db.js";

const base = new URL("./", location.href);
const memory = new Map(), flights = new Map(), storageFailed = new Set();
const key = uid => `peladinhas-notification-reads:${base.pathname}:${uid}`;
const revision = notice => JSON.stringify([notice.type, notice.title, notice.body, notice.href, notice.createdAt?.seconds, notice.createdAt?.nanoseconds]);
const read = uid => {
  if (storageFailed.has(uid)) return memory.get(uid) || {};
  try {
    const value = JSON.parse(localStorage.getItem(key(uid)));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  catch { return memory.get(uid) || {}; }
};
const write = (uid, queue) => {
  memory.set(uid, queue);
  try {
    if (Object.keys(queue).length) localStorage.setItem(key(uid), JSON.stringify(queue));
    else localStorage.removeItem(key(uid));
    storageFailed.delete(uid);
  } catch { storageFailed.add(uid); }
  window.dispatchEvent(new CustomEvent("peladinhas-notification-queue", { detail: { uid, pending: Object.keys(queue).length } }));
};
export const pendingReadIds = uid => Object.keys(read(uid));
export function applyPendingReads(uid, items) {
  const queue = read(uid);
  return items.map(item => queue[item.id] === revision(item) ? { ...item, read: true } : item);
}
export function queueNotificationReads(uid, items) {
  const queue = read(uid);
  items.forEach(item => { queue[item.id] = revision(item); });
  write(uid, queue);
}
export async function flushNotificationReads(uid) {
  if (!uid || navigator.onLine === false || !pendingReadIds(uid).length) return false;
  if (flights.has(uid)) return flights.get(uid);
  const work = (async () => {
    const queue = { ...read(uid) };
    try {
      const current = await DB.notifications(uid);
      const eligible = current.filter(item => queue[item.id] === revision(item));
      if (eligible.length) await DB.markRead(uid, eligible);
      const remaining = read(uid);
      // Do not erase clicks queued while this request was in flight.
      for (const [id, value] of Object.entries(queue)) if (remaining[id] === value) delete remaining[id];
      write(uid, remaining);
      return true;
    } catch { return false; }
  })();
  flights.set(uid, work);
  try { return await work; } finally { flights.delete(uid); }
}
