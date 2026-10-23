import { randomUUID } from "node:crypto";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { sameData } from "./equal-data.js";

const content = value => ({ submitted: !!value?.submitted, raterId: value?.raterId || null,
  targetId: value?.targetId || null, ratings: value?.ratings || null });

// A token represents one committed input generation. Never acknowledge a newer
// generation with the result of an older calculation.
export function queueFeedback(tx, gameRef, previous, vote) {
  if (!previous?.submitted && !vote?.submitted) return null;
  if (sameData(content(previous), content(vote))) return null;
  const token = randomUUID();
  tx.set(getFirestore().doc(`feedbackWork/${gameRef.id}`), {
    token, pending: true, updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return token;
}

export async function enqueueFeedbackEvent(event) {
  const before = event.data.before.data(), after = event.data.after.data();
  if (!before?.submitted && !after?.submitted) return;
  // Normal writers queued the work atomically. Delayed/retried triggers must
  // not create another job after that generation has already been published.
  if (after?.feedbackBatchToken && after.feedbackBatchToken !== before?.feedbackBatchToken) return;
  if (sameData(content(before), content(after))) return;
  await getFirestore().doc(`feedbackWork/${event.params.gid}`).set({
    token: randomUUID(), pending: true, updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function drainFeedbackQueue({ aggregate, rebuild, limit = 50 }) {
  const db = getFirestore();
  const pending = await db.collection("feedbackWork").where("pending", "==", true).limit(limit).get();
  if (pending.empty) return { processed: 0 };
  const players = new Set();
  // Aggregate all changed games first, then share one context for all players.
  // On failure nothing is acknowledged: a later run safely retries the batch.
  for (const job of pending.docs) {
    const ids = await aggregate(job.id);
    for (const uid of ids || []) players.add(uid);
  }
  await rebuild([...players]);
  for (const job of pending.docs) await db.runTransaction(async tx => {
    const current = await tx.get(job.ref);
    if (current.data()?.token !== job.data().token) return;
    tx.update(job.ref, { pending: false, processedAt: FieldValue.serverTimestamp() });
  });
  return { processed: pending.size, players: players.size };
}
