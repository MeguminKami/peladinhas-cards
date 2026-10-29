import { getFirestore } from "firebase-admin/firestore";

// Queries remain inside the caller's transaction when a reward is granted.
export async function rewardDocuments(field, values, tx = null) {
  const ids = [...new Set(values.filter(Boolean))],
    docs = [];
  for (let i = 0; i < ids.length; i += 30) {
    const query = getFirestore()
      .collection("eventRewards")
      .where(field, "in", ids.slice(i, i + 30));
    docs.push(...(await (tx ? tx.get(query) : query.get())).docs);
  }
  return { docs };
}
