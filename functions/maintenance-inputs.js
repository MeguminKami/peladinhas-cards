import { randomUUID } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { participants, asDate } from "../js/utils.js";
import { sameData } from "./equal-data.js";

export const maintenanceInputs = {
  closeEvents: new Set([
    "users",
    "games",
    "gameSummaries",
    "events",
    "votes",
    "eventRewards",
    "settings",
  ]),
  settlePaths: new Set([
    "users",
    "games",
    "gameSummaries",
    "pathStates",
    "eventRewards",
    "settings",
  ]),
  refreshCardCollection: new Set([
    "users",
    "games",
    "gameSummaries",
    "gameBalances",
    "communitySummaries",
    "initialRatings",
    "eventRewards",
    "settings",
  ]),
  systemHeartbeat: new Set(["eventRewards", "settings"]),
  scheduledNotifications: new Set([
    "users",
    "games",
    "feedback",
    "events",
    "eventRewards",
    "settings",
  ]),
};

// Rendering snapshots and timestamps must not enqueue another calculation.
function calculationInput(collection, value) {
  if (!value) return value;
  const ignored = new Set(["updatedAt", "checkedAt", "evaluatedAt"]);
  if (collection === "games")
    for (const key of [
      "playerCards",
      "cardWeekId",
      "teamNames",
      "derivedWorkToken",
    ])
      ignored.add(key);
  if (collection === "eventRewards") ignored.add("expirationProcessed");
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !ignored.has(key)),
  );
}

export function affectedPlayers(collection, id, before, after) {
  if (
    ["users", "initialRatings", "communitySummaries", "pathStates"].includes(
      collection,
    )
  )
    return [id];
  if (["games", "gameSummaries", "gameBalances"].includes(collection))
    return [
      ...new Set(
        [before, after].flatMap((value) =>
          value
            ? [...participants(value), ...Object.keys(value.players || {})]
            : [],
        ),
      ),
    ];
  return [...new Set([before?.uid, after?.uid].filter(Boolean))];
}

export function writeMaintenanceSignals(writer, collection, id, before, after) {
  if (
    sameData(
      calculationInput(collection, before),
      calculationInput(collection, after),
    )
  )
    return;
  const db = getFirestore(),
    version = randomUUID();
  if (collection === "eventRewards") {
    const at = +asDate(after?.expiresAt);
    if (
      after?.schemaVersion === 2 &&
      Number.isFinite(at) &&
      at > 0 &&
      !after.expirationProcessed
    )
      writer.set(db.doc(`rewardExpirations/${id}`), { at });
    else if (!after) writer.delete(db.doc(`rewardExpirations/${id}`));
  }
  for (const [name, sources] of Object.entries(maintenanceInputs)) {
    if (!sources.has(collection)) continue;
    const full = collection === "settings";
    writer.set(
      db.doc(`maintenanceSignals/${name}`),
      {
        version,
        ...(full ? { fullVersion: version } : {}),
      },
      { merge: true },
    );
    if (["refreshCardCollection", "settlePaths"].includes(name) && !full)
      for (const uid of affectedPlayers(collection, id, before, after))
        writer.set(
          db.doc(
            `${name === "settlePaths" ? "pathRefreshWork" : "cardRefreshWork"}/${uid}`,
          ),
          { token: version, pending: true },
          { merge: true },
        );
  }
}

export async function signalMaintenance(collection, id, before, after) {
  const batch = getFirestore().batch();
  writeMaintenanceSignals(batch, collection, id, before, after);
  await batch.commit();
}

export async function queuePlayerRefresh(uid) {
  await signalMaintenance("eventRewards", uid, null, {
    uid,
    revision: randomUUID(),
  });
}
