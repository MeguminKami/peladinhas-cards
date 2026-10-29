import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { policyAt } from "../js/system-policy.js";

// A durable checkpoint, not an in-memory timer. Jobs only enumerate collections
// after a meaningful write or at a known deadline. Failed work remains pending.
export async function runChangedMaintenance(name, work) {
  const db = getFirestore(),
    ref = db.doc(`maintenanceRuns/${name}`);
  const signal = (await db.doc(`maintenanceSignals/${name}`).get()).data() || {};
  const version = signal.version || "initial";
  const policy = JSON.stringify(policyAt());
  const token = randomUUID();
  let previous;
  const acquired = await db.runTransaction(async (tx) => {
    previous = (await tx.get(ref)).data();
    if (previous?.leaseUntil > Date.now())
      throw Object.assign(Error("Manutenção em execução; repetir o ciclo."), { code: "aborted" });
    if (previous?.generation === 2 && previous.policy === policy && previous.version === version && previous.nextAt > Date.now())
      return false;
    tx.set(ref, { token, leaseUntil: Date.now() + 600000 }, { merge: true });
    return true;
  });
  if (!acquired) return { ok: true, current: true };
  try {
    const result = await work({ previous, signal, policyChanged: previous?.policy !== policy });
    if (result?.ok === false || result?.issues?.length || result?.running)
      throw Error("Manutenção com tarefas pendentes; repetir o ciclo.");
    await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).data()?.token !== token) return;
      tx.set(ref, {
        version, policy, generation: 2,
        ...(result?.checkpoint || {}),
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
