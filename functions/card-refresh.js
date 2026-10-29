import { getFirestore } from "firebase-admin/firestore";
import { cardWeek } from "../js/card-week.js";
import { leaguePeriod } from "../js/card-achievements.js";

export function nextCollectionCalendar(now = Date.now()) {
  const week = cardWeek(new Date(now));
  const dates = [+week.closesAt, +week.nextOpensAt];
  for (const months of [2, 4]) {
    const period = leaguePeriod(new Date(now), months);
    dates.push(+period.startsAt + 7 * 86400000, +period.endsAt + 7 * 86400000);
    if (months === 2) dates.push(+period.endsAt - 7 * 86400000, +period.endsAt);
  }
  return Math.min(...dates.filter((time) => time > now));
}

export async function cardRefreshPlan(maintenance) {
  const db = getFirestore(),
    now = Date.now();
  const [pending, due] = await Promise.all([
    db.collection("cardRefreshWork").where("pending", "==", true).get(),
    db.collection("cardRefreshWork").where("nextAt", "<=", now).get(),
  ]);
  const jobs = [
    ...new Map(
      [...pending.docs, ...due.docs].map((doc) => [doc.id, doc]),
    ).values(),
  ];
  const previous = maintenance?.previous;
  let full =
    !maintenance ||
    !previous?.calendarAt ||
    previous.calendarAt <= now ||
    maintenance.policyChanged ||
    previous.fullVersion !== (maintenance.signal.fullVersion || null);
  const season = leaguePeriod(new Date(now), 2);
  if (!full && jobs.length && now >= +season.endsAt - 7 * 86400000)
    full = !(await db.doc(`events/futties-${season.id}`).get()).exists;
  return { jobs, full, uids: full ? null : jobs.map((doc) => doc.id) };
}

export async function acknowledgeCardRefresh(uid, job, context) {
  const db = getFirestore(),
    now = Date.now();
  const collection = await db.doc(`cardCollections/${uid}`).get();
  const candidates = [nextCollectionCalendar(now)];
  for (const value of [
    ...(collection.data()?.awards || []),
    ...context.rewards.filter((row) => row.uid === uid),
  ])
    for (const key of ["startsAt", "cardStartsAt", "expiresAt"]) {
      const time = value[key]?.toMillis?.() ?? +new Date(value[key]);
      if (Number.isFinite(time) && time > now) candidates.push(time);
    }
  const nextAt = Math.min(...candidates);
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`cardRefreshWork/${uid}`),
      current = await tx.get(ref);
    // A new generation arriving during calculation must remain pending.
    if (
      job ? current.data()?.token !== job.data().token : current.data()?.pending
    )
      return;
    tx.set(ref, { pending: false, nextAt }, { merge: true });
  });
  return nextAt;
}
