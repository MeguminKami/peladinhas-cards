import { nextHomeBoundary } from "../js/data-boundary.js";
export { nextHomeBoundary };
import { gzipSync, gunzipSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { policyCall, policyDocument } from "./policy-runtime.js";
import { sameData } from "./equal-data.js";
import { assembleLeague } from "../js/league-model.js";
import { buildMissions } from "../js/mission-model.js";
import { cardWeek } from "../js/card-week.js";
import { policyAt } from "../js/system-policy.js";
import { participants } from "../js/utils.js";
import { performanceWeek } from "../js/performance-week.js";

const db = () => getFirestore();
const rows = (snap) => snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
const inputs = new Set([
  "users",
  "initialRatings",
  "communitySummaries",
  "games",
  "gameSummaries",
  "gameBalances",
  "weeklyCards",
  "weeklyCardPhotos",
  "eventRewards",
  "events",
  "cardCollections",
  "cardSelections",
  "settings",
]);
const ownInputs = new Set(["pathStates", "communityRatings"]);
const maintenanceInputs = {
  closeEvents: new Set([
    "users",
    "games",
    "gameSummaries",
    "events",
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
    "communitySummaries",
    "initialRatings",
    "events",
    "eventRewards",
    "settings",
  ]),
  scheduledNotifications: new Set([
    "users",
    "games",
    "feedback",
    "events",
    "eventRewards",
    "settings",
  ]),
};
const pending = new Map();
const HOME_CACHE_VERSION = "2026-10-22-scrap-card-v1";
// Cache documents are server-only. Timestamps become ISO strings, understood by
// the same asDate helpers used by the browser. No SDK objects enter the cache.
export function plain(value) {
  if (value?.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, plain(v)]),
    );
  return value;
}
function waitForCache(ref, version) {
  return new Promise((resolve, reject) => {
    let stop = () => {};
    const unavailable = () =>
      new HttpsError(
        "unavailable",
        "A atualizar os dados. Tenta novamente dentro de instantes.",
      );
    const finish = (error, value) => {
      clearTimeout(timer);
      stop();
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => finish(unavailable()), 12000);
    stop = ref.onSnapshot(
      (snapshot) => {
        const row = snapshot.data();
        if (row?.version === version && row.validUntil > Date.now()) {
          try {
            finish(
              null,
              JSON.parse(
                gunzipSync(Buffer.from(row.payload, "base64")).toString(),
              ),
            );
          } catch (error) {
            finish(error);
          }
        } else if (!row || row.leaseUntil <= Date.now()) finish(unavailable());
      },
      (error) => finish(error),
    );
  });
}
async function cached(id, version, build) {
  const key = `${id}:${version}`;
  if (pending.has(key)) return pending.get(key);
  const task = (async () => {
    const ref = db().doc(`homeCache/${id}`);
    const saved = (await ref.get()).data();
    if (saved?.version === version && saved.validUntil > Date.now())
      return JSON.parse(
        gunzipSync(Buffer.from(saved.payload, "base64")).toString(),
      );
    const leaseId = randomUUID();
    const acquired = await db().runTransaction(async (tx) => {
      const row = (await tx.get(ref)).data();
      if (row?.version === version && row.validUntil > Date.now())
        return { payload: row.payload };
      if (row?.leaseUntil > Date.now()) return false;
      tx.set(
        ref,
        { leaseId, leaseUntil: Date.now() + 180000 },
        { merge: true },
      );
      return true;
    });
    if (acquired?.payload)
      return JSON.parse(
        gunzipSync(Buffer.from(acquired.payload, "base64")).toString(),
      );
    // A bounded subscription shares another instance's result without polling
    // collections or leaving a listener alive after the callable completes.
    if (!acquired) return waitForCache(ref, version);
    try {
      const result = plain(await build());
      const validUntil = Math.min(
        result.validUntil || Infinity,
        nextHomeBoundary(result),
        nextHomeBoundary(plain(policyDocument())),
      );
      result.validUntil = validUntil;
      const payload = gzipSync(JSON.stringify(result)).toString("base64");
      // Large historical leagues still work; do not exceed Firestore's 1 MiB.
      await db().runTransaction(async (tx) => {
        if ((await tx.get(ref)).data()?.leaseId !== leaseId) return;
        if (Buffer.byteLength(payload) < 850000)
          tx.set(ref, { version, validUntil, payload, leaseUntil: 0 });
        else tx.delete(ref);
      });
      return result;
    } catch (error) {
      await db().runTransaction(async (tx) => {
        if ((await tx.get(ref)).data()?.leaseId === leaseId)
          tx.update(ref, { leaseUntil: 0 });
      });
      throw error;
    }
  })();
  pending.set(key, task);
  try {
    return await task;
  } finally {
    pending.delete(key);
  }
}

async function leagueContext() {
  const names = [
    "users",
    "initialRatings",
    "communitySummaries",
    "games",
    "gameSummaries",
    "gameBalances",
    "weeklyCards",
    "weeklyCardPhotos",
    "eventRewards",
    "cardCollections",
    "cardSelections",
  ];
  const snapshots = await Promise.all(
    names.map((name) => db().collection(name).get()),
  );
  const source = Object.fromEntries(
    names.map((name, index) => [name, rows(snapshots[index])]),
  );
  const cycle = cardWeek();
  const week = cardWeek(new Date(+cycle.opensAt - 1)).weekId;
  const active = source.users.filter((user) => !user.disabled);
  const previous = active.length
    ? await db().getAll(
        ...active.map((user) =>
          db().doc(`users/${user.uid}/cardHistory/${week}`),
        ),
      )
    : [];
  const settings = (await db().doc("settings/ovr").get()).data();
  return plain(
    assembleLeague({
      ...source,
      initials: source.initialRatings,
      community: source.communitySummaries,
      summaries: source.gameSummaries,
      balances: source.gameBalances,
      weeklyPhotos: source.weeklyCardPhotos.filter(
        (photo) => photo.weekId === cycle.weekId,
      ),
      collections: source.cardCollections,
      selections: source.cardSelections,
      previousCards: Object.fromEntries(
        active.map((user, index) => [user.uid, previous[index].data() || null]),
      ),
      settings,
      cycle,
    }),
  );
}

// Explicit projection: never publish raw profiles, private votes or other
// players' missions, initial ratings, access fields or calculation inputs.
export function homeProjection(league, uid) {
  const performanceStart = performanceWeek().startsAt;
  const fields = [
    "uid",
    "username",
    "displayName",
    "country",
    "countryCode",
    "photoURL",
    "primaryPosition",
    "heightCm",
    "weightKg",
    "preferredFoot",
    "shirtNumber",
    "playerStyle",
    "hasCard",
    "cardLocked",
    "cardType",
    "cardPhoto",
    "selectedCardId",
    "specials",
    "stats",
    "permanentStats",
    "permanentOvr",
    "previousStats",
    "ovr",
    "ovrDelta",
    "official",
    "communityCount",
    "inactivity",
    "matchStats",
    "eventBoosts",
    "progression",
  ];
  const players = league.players.map((player) => ({
    ...Object.fromEntries(
      fields
        .filter((key) => player[key] !== undefined)
        .map((key) => [key, player[key]]),
    ),
    aggregates: player.aggregates.filter(
      (item, index) =>
        +new Date(item.date) >= +performanceStart ||
        (player.uid === uid && index >= player.aggregates.length - 5),
    ),
  }));
  return {
    cycle: league.cycle,
    players,
    users: players.map(({ uid, username, displayName }) => ({
      uid,
      username,
      displayName,
    })),
    games: league.games.slice(0, 3),
    personalGames: league.games
      .filter(
        (game) =>
          game.status === "closed" &&
          !game.deleting &&
          +new Date(game.closedAt || game.scheduledAt) <= Date.now() &&
          participants(game).includes(uid),
      )
      .slice(0, 3),
    systemPolicy: policyAt(),
  };
}

export function homeFunctions(
  listEvents,
  { settleEvents, settlePath, loadEvent } = {},
) {
  const getHome = policyCall(
    "getHome",
    { timeoutSeconds: 120 },
    async (request) => {
      const uid = request.auth.uid;
      const signals = await db().getAll(
        db().doc("homeSignals/global"),
        db().doc(`homeSignals/${uid}`),
      );
      const globalVersion = signals[0].data()?.version || "initial";
      const leagueVersion = signals[0].data()?.leagueVersion || "initial";
      const ownVersion = signals[1].data()?.version || "initial";
      // Include policy and calendar identity even if a delayed trigger has not run.
      const sharedVersion = `${HOME_CACHE_VERSION}:${leagueVersion}:${JSON.stringify(policyAt())}:${cardWeek().weekId}:${cardWeek().phase}`;
      const version = `${sharedVersion}:${globalVersion}:${ownVersion}`;
      const result = await cached(`player-${uid}`, version, async () => {
        await settleEvents?.();
        const league = await cached("league", sharedVersion, leagueContext);
        const events = await listEvents.run({
          ...request,
          data: { summaries: true },
        });
        let pathState;
        const adapter = {
          eventDetails: (eventId) => loadEvent?.(request, eventId),
          myCommunity: async (owner) =>
            rows(
              await db()
                .collection("communityRatings")
                .where("raterId", "==", owner)
                .get(),
            ),
          myFeedback: async (game, owner) =>
            rows(
              await db()
                .collection(`games/${game}/feedback`)
                .where("raterId", "==", owner)
                .get(),
            ),
          read: async (path) => {
            const value = (await db().doc(path).get()).data() || null;
            if (path === `pathStates/${uid}`) {
              pathState = value;
              const due = [value?.active, ...(value?.pending || [])].some(
                (attempt) =>
                  attempt?.reviewDeadline &&
                  attempt.reviewDeadline <= Date.now(),
              );
              if (
                due &&
                settlePath &&
                policyAt().features.mode === "normal" &&
                policyAt().features.missions &&
                policyAt().features.claims
              ) {
                pathState = await settlePath(request);
                return pathState;
              }
            }
            return value;
          },
        };
        const missions = await buildMissions(
          { ...request.systemActor, uid },
          { ...league, events },
          adapter,
        );
        return {
          league: homeProjection(league, uid),
          missions,
          validUntil: Math.min(
            league.validUntil,
            nextHomeBoundary(plain(events)),
            nextHomeBoundary(plain(pathState)),
          ),
        };
      });
      return {
        ...result,
        user: plain({ ...request.systemActor, uid }),
        versions: [globalVersion, ownVersion],
        policyDocument: plain(policyDocument()),
      };
    },
  );
  return { getHome, ...homeTriggers() };
}

export async function invalidateHome(collection, id, before, after) {
  if (
    (!inputs.has(collection) &&
      !ownInputs.has(collection) &&
      collection !== "feedback" &&
      collection !== "votes") ||
    sameData(before, after)
  )
    return;
  if (
    collection === "eventRewards" &&
    before &&
    after &&
    sameData(
      { ...before, expirationProcessed: null },
      { ...after, expirationProcessed: null },
    )
  )
    return;
  const batch = db().batch();
  const version = randomUUID();
  if (inputs.has(collection))
    batch.set(
      db().doc("homeSignals/global"),
      {
        version,
        ...(collection === "events" ? {} : { leagueVersion: version }),
      },
      { merge: true },
    );
  if (collection === "votes" && (after?.eventId || before?.eventId))
    batch.set(db().doc(`eventSignals/${after?.eventId || before.eventId}`), {
      version,
    });
  // Each job observes only its inputs. Published cards never re-enqueue their
  // own calculation, and choosing a path does not rescan all league events.
  for (const [name, sources] of Object.entries(maintenanceInputs))
    if (sources.has(collection))
      batch.set(db().doc(`maintenanceSignals/${name}`), { version });
  const owners = new Set(
    collection === "pathStates"
      ? [id]
      : [before?.raterId, after?.raterId, before?.uid, after?.uid],
  );
  for (const uid of owners)
    if (uid && uid !== "global")
      batch.set(db().doc(`homeSignals/${uid}`), { version });
  await batch.commit();
}
function homeTriggers() {
  const onHomeSource = onDocumentWritten("{collection}/{id}", (event) =>
    invalidateHome(
      event.params.collection,
      event.params.id,
      event.data?.before.data(),
      event.data?.after.data(),
    ),
  );
  const onHomeFeedback = onDocumentWritten(
    "games/{game}/feedback/{id}",
    (event) =>
      invalidateHome(
        "feedback",
        event.params.id,
        event.data?.before.data(),
        event.data?.after.data(),
      ),
  );
  const onHomeVote = onDocumentWritten("events/{event}/votes/{id}", (event) =>
    invalidateHome(
      "votes",
      event.params.id,
      {
        ...event.data?.before.data(),
        uid: event.params.id,
        eventId: event.params.event,
      },
      {
        ...event.data?.after.data(),
        uid: event.params.id,
        eventId: event.params.event,
      },
    ),
  );

  return { onHomeSource, onHomeFeedback, onHomeVote };
}
