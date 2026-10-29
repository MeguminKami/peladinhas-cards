import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { asDate } from "../js/utils.js";
import { writeMaintenanceSignals } from "./maintenance-inputs.js";

export function writeRewardExpiration(writer, id, reward) {
  const at = +asDate(reward.expiresAt);
  if (
    reward.schemaVersion === 2 &&
    Number.isFinite(at) &&
    at > 0 &&
    !reward.expirationProcessed
  )
    writer.set(getFirestore().doc(`rewardExpirations/${id}`), { at });
}

export async function expireRewards() {
  const db = getFirestore(),
    migration = db.doc("maintenanceMigrations/rewardExpirations-v1");
  if (!(await migration.get()).exists) {
    // One compatibility pass includes old documents without expirationProcessed.
    const legacy = await db.collection("eventRewards").get();
    for (let i = 0; i < legacy.docs.length; i += 400) {
      const batch = db.batch();
      for (const doc of legacy.docs.slice(i, i + 400))
        writeRewardExpiration(batch, doc.id, doc.data());
      await batch.commit();
    }
    await migration.set({ completedAt: FieldValue.serverTimestamp() });
  }
  const due = await db
    .collection("rewardExpirations")
    .where("at", "<=", Date.now())
    .get();
  const affected = new Set();
  for (const item of due.docs) {
    const uid = await db.runTransaction(async (tx) => {
      const ref = db.doc(`eventRewards/${item.id}`),
        fresh = await tx.get(ref),
        reward = fresh.data();
      if (reward && +asDate(reward.expiresAt) > Date.now()) {
        writeRewardExpiration(tx, item.id, reward);
        return null;
      }
      tx.delete(item.ref);
      if (!reward || reward.schemaVersion !== 2 || reward.expirationProcessed)
        return null;
      tx.update(ref, { expirationProcessed: true });
      writeMaintenanceSignals(tx, "eventRewards", item.id, null, {
        uid: reward.uid,
        expired: item.id,
      });
      return reward.uid;
    });
    if (uid) affected.add(uid);
  }
  const next = await db
    .collection("rewardExpirations")
    .orderBy("at")
    .limit(1)
    .get();
  return { uids: [...affected], nextAt: next.docs[0]?.data().at };
}
