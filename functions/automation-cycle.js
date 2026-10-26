import { createHash, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

export const AUTOMATION_SCHEDULE = "0 8,12,17,22 * * *";
export const AUTOMATION_TIME_ZONE = "Europe/Lisbon";
export const CYCLE_JOBS = new Set([
  "processFeedback", "closeCardWeek", "openCardWeek", "refreshCardCollection",
  "closeEvents", "settlePaths", "scheduledNotifications", "systemHeartbeat",
]);

// All scheduler deliveries share one durable checkpoint and one global lease.
// A game closing gets its own key, so it cannot consume a scheduled cycle.
export async function runAutomationCycle(db, key, work) {
  const ref = db.doc(`automationCycles/${createHash("sha256").update(key).digest("hex")}`);
  const lease = db.doc("systemJobs/automationCycle");
  const token = randomUUID();
  const acquired = await db.runTransaction(async tx => {
    const [cycle, current] = await tx.getAll(ref, lease);
    if (cycle.data()?.status === "completed") return false;
    if (current.data()?.leaseUntil?.toMillis() > Date.now())
      throw Object.assign(Error("Outro ciclo está em execução; repetir esta entrega."), { code: "aborted" });
    tx.set(lease, { name: "automationCycle", token, status: "running", cycleKey: key,
      startedAt: new Date(), leaseUntil: new Date(Date.now() + 600000) }, { merge: true });
    tx.set(ref, { key, status: "running", startedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 30 * 86400000) });
    return true;
  });
  if (!acquired) return { ok: true, current: true };
  try {
    const result = await work();
    if (result?.ok === false || result?.issues?.length)
      throw Error("Ciclo com tarefas pendentes; repetir a execução.");
    await db.runTransaction(async tx => {
      if ((await tx.get(lease)).data()?.token !== token) throw Error("Lease do ciclo perdido.");
      tx.update(ref, { status: "completed", finishedAt: FieldValue.serverTimestamp() });
      tx.update(lease, { status: "completed", leaseUntil: new Date(0), lastError: null,
        finishedAt: FieldValue.serverTimestamp() });
    });
    return result ?? { ok: true };
  } catch (error) {
    await db.runTransaction(async tx => {
      if ((await tx.get(lease)).data()?.token !== token) return;
      tx.update(ref, { status: "failed", lastError: String(error.message).slice(0, 500) });
      tx.update(lease, { status: "failed", leaseUntil: new Date(0), lastError: String(error.message).slice(0, 500),
        finishedAt: FieldValue.serverTimestamp() });
    });
    throw error;
  }
}
