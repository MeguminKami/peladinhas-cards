import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

// A durable checkpoint, not an in-memory timer. Jobs only enumerate collections
// after a meaningful write or at a known deadline. Failed work remains pending.
export async function runChangedMaintenance(name, work) {
  const db = getFirestore(),
    ref = db.doc(`maintenanceRuns/${name}`);
  const signal =
    (await db.doc(`maintenanceSignals/${name}`).get()).data()?.version ||
    "initial";
  const token = randomUUID();
  const acquired = await db.runTransaction(async (tx) => {
    const previous = (await tx.get(ref)).data();
    if (previous?.leaseUntil > Date.now()) return false;
    if (previous?.version === signal && previous.nextAt > Date.now())
      return false;
    tx.set(ref, { token, leaseUntil: Date.now() + 600000 }, { merge: true });
    return true;
  });
  if (!acquired) return { ok: true, current: true };
  try {
    const result = await work();
    await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).data()?.token !== token) return;
      tx.set(ref, {
        version: signal,
        nextAt:
          result?.ok === false
            ? Date.now()
            : result?.nextAt || Date.now() + 86400000,
        leaseUntil: 0,
      });
    });
    return result;
  } catch (error) {
    await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).data()?.token === token)
        tx.update(ref, { leaseUntil: 0 });
    });
    throw error;
  }
}
