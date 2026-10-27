import { AUTOMATION_SCHEDULE } from "./automation-cycle.js";
import { ratingQuorum, ratingWaiverTimes } from "../js/rating-quorum.js";
import { casinoFunctions } from './casino.js';
import { adminCasinoFunctions } from './admin-casino.js';
import { casinoShopFunctions } from './casino-shop.js';
import { blackjackFunctions } from './blackjack.js';
import { gameFlowFunctions, writeFeedbackRevision } from "./game-flow.js";
import { enqueueFeedbackEvent, drainFeedbackQueue } from "./feedback-queue.js";
import { homeFunctions, invalidateHome } from "./home-cache.js";
import { eligibleCommunityRating } from "./community-rating-policy.js";
import { communityRatingFunctions, requiredCommunityReview, writeCommunityNotice } from "./community-ratings.js";
import { markCardMvps } from "./card-unlock-rules.js";
import { nextHomeBoundary } from "../js/data-boundary.js";
import { passwordRecoveryFunctions } from "./password-recovery.js";
import { maintenanceFunctions } from "./maintenance.js";
import { pathFunctions } from "./paths.js";
import { policyAt, budgetWindow, isQuietHour } from "../js/system-policy.js";
import { policyCall, policySchedule, policyWritten, policyCreated, setAutomationRunner, withPolicy } from "./policy-runtime.js";
import { runAutomationCycle } from "./automation-cycle.js";
import { notificationFunctions } from "./notifications.js";
import { pushFunctions } from "./push.js";
import { defineSecret } from "firebase-functions/params";
import { WEB_PUSH_PUBLIC_KEY } from "../js/push-config.js";
import { eventFunctions } from "./events.js";
import { calculatePlayerCard } from "../js/player-calculation.js";
import { applyEventRewards } from "../js/event-rules.js";
import {
  refreshPlayerCollection,
  collectionContext,
  settleCollectionPeriods,
  ensureFuttiesVote,
} from "./card-collection.js";
import {
  availableCardAchievements,
  availableSpecials,
  validCardSelection,
} from "../js/card-achievements.js";
import { canEditRating } from "../js/rating-window.js";
import { defaultOvrPresets } from "../js/ovr-presets.js";
import { validPhotoDesign } from "../js/card-photo.js";
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";
import { cardWeek, cardWeekBounds, canReopenWeeklyCard } from "../js/card-week.js";
import {
  teamBalance,
  balanceMatches,
  balanceSignature,
} from "../js/team-balance.js";
import { validCardDesign } from "../js/card-design.js";
import { initializeApp, getApp } from "firebase-admin/app";
import { assertTestEmulator, emulatorAppOptions } from "./test-environment.js";
import { sameData } from "./equal-data.js";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import {
  ATTRIBUTES,
  asDate,
  calculateGameAggregate,
  normalizeOvrWeights,
  validOvrWeights,
  calculateBaseCard,
  isoWeek,
  isoWeekEnd,
  participants,
  completeInitial,
  completeFeedback,
  FEEDBACK,
  THEMES,
  INFORM_THEMES,
  CATALOG_THEMES,
  matchOutcome,
  matchGoalMargin,
  matchEvolutionContext,
  matchPerformance,
} from "../js/utils.js";
assertTestEmulator();
initializeApp(emulatorAppOptions());
setGlobalOptions({ region: "europe-west1", maxInstances: 3 });
export const { getCasinoShop, buyCasinoCard } = casinoShopFunctions();
export const { getCasinoPlayerBalance } = adminCasinoFunctions();
export const { passwordRecoveryAction, completePasswordRecovery } = passwordRecoveryFunctions();
const db = getFirestore();
export const { communityRatingAction } = communityRatingFunctions(async () => {});
export const { getCasinoWallet, settleCasinoSlot, onCasinoGame, casinoSession, grantCasinoCoins } = casinoFunctions();
export const { blackjackAction, blackjackSweep } = blackjackFunctions();
const pushPrivateKey = defineSecret("WEB_PUSH_PRIVATE_KEY");
export const {
  pushDeviceAction,
  onNotificationPush,
  ackPushNotification,
  cleanupPushDeliveries,
} = pushFunctions({
  projectId: getApp().options.projectId || process.env.GCLOUD_PROJECT,
  publicKey: WEB_PUSH_PUBLIC_KEY,
  privateKey: () => pushPrivateKey.value(),
  secret: pushPrivateKey,
});
export const ticketAction = policyCall("ticketAction",async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const uid = request.auth.uid,
    input = request.data || {};
  const ticket =
    input.action === "create"
      ? db.collection("tickets").doc()
      : typeof input.id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(input.id)
        ? db.doc(`tickets/${input.id}`)
        : null;
  if (!ticket || !["create", "reply", "close"].includes(input.action))
    throw new HttpsError("invalid-argument", "Pedido inválido.");
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (input.action !== "close" && (!body || body.length > 4000))
    throw new HttpsError(
      "invalid-argument",
      "Escreve uma mensagem de até 4000 caracteres.",
    );
  if (input.action === "create" && (!title || title.length > 100))
    throw new HttpsError(
      "invalid-argument",
      "O título é obrigatório (até 100 caracteres).",
    );
  const message = ticket.collection("messages").doc();
  await db.runTransaction(async (tx) => {
    const profile = (await tx.get(db.doc(`users/${uid}`))).data();
    if (!profile || profile.disabled)
      throw new HttpsError("permission-denied", "Conta indisponível.");
    const stamp = FieldValue.serverTimestamp();
    if (input.action === "create")
      tx.set(ticket, {
        title,
        ownerId: uid,
        status: "open",
        createdAt: stamp,
        updatedAt: stamp,
      });
    else {
      const existing = (await tx.get(ticket)).data();
      if (!existing)
        throw new HttpsError("not-found", "Pedido de apoio não encontrado.");
      if (existing.ownerId !== uid && profile.role !== "admin")
        throw new HttpsError(
          "permission-denied",
          "Sem acesso a este pedido de apoio.",
        );
      if (existing.status !== "open")
        throw new HttpsError(
          "failed-precondition",
          "Este pedido de apoio está fechado definitivamente.",
        );
      tx.update(
        ticket,
        input.action === "close"
          ? {
              status: "closed",
              closedAt: stamp,
              closedBy: uid,
              closedByName: profile.displayName || profile.username || uid,
              updatedAt: stamp,
            }
          : { updatedAt: stamp },
      );
    }
    if (input.action !== "close")
      tx.set(message, {
        body,
        authorId: uid,
        authorName: profile.displayName || profile.username || uid,
        authorRole: profile.role,
        createdAt: stamp,
        initial: input.action === "create",
      });
  });
  return { id: ticket.id };
});
async function ticketNotifications(ticketId, eventId, authorId, title, body) {
  const ticket = (await db.doc(`tickets/${ticketId}`).get()).data();
  if (!ticket) return;
  const admins = (
    await db.collection("users").where("role", "==", "admin").get()
  ).docs
    .filter((d) => !d.data().disabled)
    .map((d) => d.id);
  for (const uid of new Set([ticket.ownerId, ...admins])) {
    if (uid === authorId) continue;
    await notification(uid, `ticket-${eventId}`, {
      type: "TICKET_UPDATE",
      title,
      body: `${ticket.title}: ${body}`,
      href: `#/tickets/${ticketId}`,
    });
  }
}
export const onTicketMessage = policyWritten(
  "tickets/{tid}/messages/{mid}",
  async (event) => {
    if (event.data.before.exists || !event.data.after.exists) return;
    const m = event.data.after.data();
    await ticketNotifications(
      event.params.tid,
      event.params.mid,
      m.authorId,
      m.initial ? "Novo pedido de apoio" : "Nova resposta no pedido de apoio",
      `${m.authorName}: ${m.body.slice(0, 160)}`,
    );
  },
);
export const onTicketClosed = policyWritten(
  "tickets/{tid}",
  async (event) => {
    const t = event.data.after.data();
    if (t?.status !== "closed" || event.data.before.data()?.status === "closed")
      return;
    await ticketNotifications(
      event.params.tid,
      `${event.params.tid}-closed`,
      t.closedBy,
      "Pedido de apoio fechado",
      `Fechado por ${t.closedByName}.`,
    );
  },
);
const data = (s) => s.docs.map((d) => ({ ...d.data(), id: d.id }));
async function notification(uid, id, value, guard) {
  if (!policyAt().notifications.enabled) return {sent:false,reason:"paused"};
  const reminder = /REMINDER|RATING_REQUIRED/.test(value.type || "");
  if (reminder && isQuietHour(policyAt().notifications)) return {sent:false,reason:"quiet"};
  return db.runTransaction(async (tx) => {
    const quotaRef=db.doc(`notificationQuotas/${uid}`);
    const quota=reminder ? (await tx.get(quotaRef)).data() : null;
    const day=budgetWindow("day");
    if(reminder && (quota?.day===day && quota.count>=policyAt().notifications.maxDaily || quota?.lastSent?.toMillis()>Date.now()-policyAt().notifications.cooldownMinutes*60000)) return {sent:false,reason:"quota"};
    if (guard) {
      if (!(await guard(tx))) return {sent:false,reason:"changed"};
    } else {
      const user = (await tx.get(db.doc(`users/${uid}`))).data();
      if (!user || user.disabled) return {sent:false,reason:"inactive"};
    }
    const ref = db.doc(`users/${uid}/notifications/${id}`),
      existing = await tx.get(ref);
    if (existing.exists) return {sent:false,reason:"duplicate"};
    if (!existing.exists) {
      if(reminder)tx.set(quotaRef,{day,count:quota?.day===day?(quota.count||0)+1:1,lastSent:FieldValue.serverTimestamp()});
      tx.set(ref, {
        ...value,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
      return {sent:true};
    }
  });
}
async function aggregateCommunity(uid) {
  await db.runTransaction(async (tx) => {
    const query = db
      .collection("communityRatings")
      .where("targetId", "==", uid);
    const [voteSnapshot,target] = await Promise.all([tx.get(query),tx.get(db.doc(`users/${uid}`))]);
    const rows = data(voteSnapshot);
    for (const row of rows.filter(row => row.submitted && completeInitial(row.ratings20) && !eligibleCommunityRating(row) && !row.reviewState)) {
      tx.update(db.doc(`communityRatings/${row.id}`),requiredCommunityReview());
      writeCommunityNotice(tx,db,row,target.data()?.displayName || target.data()?.username || "este jogador","required");
    }
    const votes = rows.filter(eligibleCommunityRating);
    const ref = db.doc(`communitySummaries/${uid}`);
    tx.set(ref, {
      targetId: uid,
      count: votes.length,
      ratings20: Object.fromEntries(
        ATTRIBUTES.map(([k]) => [
          k,
          votes.length
            ? votes.reduce((s, v) => s + v.ratings20[k], 0) / votes.length
            : 0,
        ]),
      ),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
async function captureGameBalance(gid, g) {
  const ref = db.doc(`gameBalances/${gid}`);
  const existing = await ref.get();
  const signature = balanceSignature(g),
    closedAt = g.closedAt?.toMillis?.();
  if (
    existing.exists &&
    existing.data().signature === signature &&
    existing.data().closedAt?.toMillis?.() === closedAt
  )
    return;
  const [initials, votes, games, balances, settings, users, rewards] =
    await Promise.all([
      db.collection("initialRatings").get(),
      db.collection("communityRatings").get(),
      db.collection("games").get(),
      db.collection("gameBalances").get(),
      db.doc("settings/ovr").get(),
      db.collection("users").get(),
      db.collection("eventRewards").get(),
    ]);
  const weights = normalizeOvrWeights(settings.data());
  const initialRows = data(initials),
    voteRows = data(votes),
    priorGames = data(games).filter(
      (game) =>
        game.id !== gid &&
        game.status === "closed" &&
        !game.deleting &&
        game.closedAt?.toMillis?.() < closedAt,
    ),
    balanceRows = data(balances);
  const priorFeedback = await Promise.all(
    priorGames.map((game) => db.collection(`games/${game.id}/feedback`).get()),
  );
  const priorRatings = new Map(
    priorGames.map((game, i) => [
      game.id,
      data(priorFeedback[i]).filter(
        (v) =>
          v.submitted &&
          participants(game).includes(v.raterId) &&
          (v.submittedAt || v.updatedAt || v.createdAt)?.toMillis?.() <=
            closedAt,
      ),
    ]),
  );
  const players = participants(g).map((uid) => {
    const initial = initialRows.find((r) => r.uid === uid)?.ratings20;
    if (!completeInitial(initial)) return { uid, hasCard: false };
    const external = voteRows.filter(
      (v) =>
        v.targetId === uid &&
        v.submitted &&
        eligibleCommunityRating(v) &&
        (v.submittedAt || v.createdAt)?.toMillis?.() <= closedAt,
    );
    const community = {
      count: external.length,
      ratings20: Object.fromEntries(
        ATTRIBUTES.map(([key]) => [
          key,
          external.length
            ? external.reduce((sum, v) => sum + v.ratings20[key], 0) /
              external.length
            : 0,
        ]),
      ),
    };
    const aggregates = priorGames
      .filter((game) => participants(game).includes(uid))
      .map((game) => ({
        ...calculateGameAggregate(
          priorRatings.get(game.id).filter((v) => v.targetId === uid),
        ),
        ...matchPerformance(uid, game),
        outcome: matchOutcome(uid, game),
        goalMargin: matchGoalMargin(uid, game),
        date: game.closedAt.toDate(),
        ...matchEvolutionContext(
          uid,
          game,
          Object.fromEntries(
            participants(game).map((id) => [
              id,
              calculateGameAggregate(
                priorRatings.get(game.id).filter((v) => v.targetId === id),
              ),
            ]),
          ),
          balanceRows.find((b) => b.id === game.id && balanceMatches(game, b)),
        ),
        gameId: game.id,
      }));
    const calculation = calculatePlayerCard({
      uid,
      initial,
      community,
      aggregates,
      games: priorGames,
      rewards: data(rewards),
      weights,
      position: data(users).find((u) => u.uid === uid)?.primaryPosition,
      createdAt:
        data(users).find((u) => u.uid === uid)?.createdAt ||
        initialRows.find((r) => r.uid === uid)?.createdAt,
      date: new Date(closedAt),
    });
    return { uid, hasCard: true, ovr: calculation.ovr };
  });
  const snapshot = {
    ...teamBalance(g, players),
    signature,
    closedAt: g.closedAt,
    weights: weights.weights,
    positionWeights: weights.positions,
    playerOvr: Object.fromEntries(players.map((p) => [p.uid, p.ovr ?? null])),
    capturedAt: FieldValue.serverTimestamp(),
  };
  await db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    const currentGame = await tx.get(db.doc(`games/${gid}`));
    if (
      !currentGame.exists ||
      currentGame.data().status !== "closed" ||
      balanceSignature(currentGame.data()) !== signature ||
      currentGame.data().closedAt?.toMillis?.() !== closedAt
    )
      return;
    if (
      !current.exists ||
      current.data().signature !== signature ||
      current.data().closedAt?.toMillis?.() !== closedAt
    )
      tx.set(ref, snapshot);
  });
}
async function aggregateGame(gid) {
  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(db.doc(`games/${gid}`));
    if (!gameSnap.exists || gameSnap.data().deleting) return;
    const g = gameSnap.data(),
      votes = data(await tx.get(db.collection(`games/${gid}/feedback`))),
      ps = {};
    for (const uid of participants(g)) {
      const own = votes.filter(
        (v) =>
          v.targetId === uid &&
          v.submitted &&
          v.ratings && typeof v.ratings === "object" &&
          participants(g).includes(v.raterId),
      );
      const a = calculateGameAggregate(own);
      ps[uid] = {
        ...a,
        count: own.length,
        mvp: false,
        evaluatedAt: new Date(
          Math.max(
            +(asDate(g.closedAt || g.scheduledAt) || 0),
            ...ratingWaiverTimes(g),
            ...own.map(
              (vote) =>
                +(
                  asDate(
                    vote.updatedAt || vote.submittedAt || vote.createdAt,
                  ) || 0
                ),
            ),
          ),
        ).toISOString(),
        ...(g.ratingWaivers ? {ratingQuorumCounts: ratingQuorum(g, votes, uid, a.goalkeeping !== null)} : {}),
        ratingCounts: Object.fromEntries(
          FEEDBACK.map(([key]) => [
            key,
            key === "goalkeeping" && a.goalkeeping === null
              ? 0
              : own.filter((vote) => Number.isFinite(vote.ratings?.[key]))
                  .length,
          ]),
        ),
        goalkeepingEligible: !own.some(
          (v) => v.raterId === uid && v.ratings?.goalkeeping === null,
        ),
      };
    }
    markCardMvps(ps);
    const ref = db.doc(`gameSummaries/${gid}`);
    const previous = await tx.get(ref);
    const next = {
      status: g.status,
      scheduledAt: g.scheduledAt || g.closedAt || null,
      closedAt: g.closedAt || null,
      teamA: g.teamA,
      teamB: g.teamB,
      players: ps,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!sameData(previous.data(), next)) tx.set(ref, next);
  });
}
async function buildHistories(uids) {
  const unique = [...new Set(uids)];
  if (!unique.length) return;
  const context = await collectionContext();
  // Bound concurrent transactions while sharing immutable inputs for this batch.
  for (let i = 0; i < unique.length; i += 3)
    await Promise.all(unique.slice(i, i + 3).map(uid => buildHistory(uid, context)));
}
async function buildHistory(uid, shared = null, { refreshCollection = true } = {}) {
  const context = shared?.snapshots ? shared : await collectionContext();
  const earnedCards = refreshCollection ? await refreshPlayerCollection(uid, context)
    : availableCardAchievements((await db.doc(`cardCollections/${uid}`).get()).data()?.awards || []);
  const now = new Date();
  const [
    user,
    initial,
    community,
    gameSnaps,
    settings,
    balanceSnaps,
    photoSnap,
    rewardSnap,
  ] = await Promise.all([
    context.snapshots.users.docs.find(doc => doc.id === uid) || { exists: false },
    context.snapshots.initials.docs.find(doc => doc.id === uid) || { exists: false },
    db.collection("communityRatings").where("targetId", "==", uid).get(),
    context.snapshots.games,
    context.snapshots.weights,
    context.snapshots.balances,
    db.doc(`weeklyCardPhotos/${uid}_${cardWeek(now).weekId}`).get(),
    { docs: context.snapshots.rewards.docs.filter(doc => doc.data().uid === uid) },
  ]);
  if (
    !user.exists ||
    !initial.exists ||
    !completeInitial(initial.data().ratings20)
  )
    return;
  const balanceRows = data(balanceSnaps);
  const ovrWeights = normalizeOvrWeights(settings.data());
  const self = initial.data().ratings20;
  const votes = data(community).filter(
    eligibleCommunityRating,
  );
  const games = data(gameSnaps).filter(
    (g) =>
      g.status === "closed" && !g.deleting && participants(g).includes(uid),
  );
  const cycle = cardWeek(now),
    cutoff = cycle.phase === "closed" ? cycle.closesAt : now;
  const activeRef = db.doc(`users/${uid}/cardHistory/${cycle.weekId}`);
  // Lock existing past cards in place. Rebuilds never rewrite their stats or artwork.
  const existingHistory = await db.collection(`users/${uid}/cardHistory`).get();
  for (const doc of existingHistory.docs) {
    if (doc.id >= cycle.weekId || doc.data().locked) continue;
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      if (fresh.exists && !fresh.data().locked)
        tx.update(doc.ref, {
          locked: true,
          lockedAt: FieldValue.serverTimestamp(),
        });
    });
  }
  const existing = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(activeRef);
    if (!snapshot.exists) return null;
    const value = snapshot.data();
    if (canReopenWeeklyCard(value, cycle)) {
      tx.update(activeRef, {locked:false,lockedAt:FieldValue.delete()});
      return null;
    }
    if (value.locked || cycle.phase === "closed") {
      if (!value.locked)
        tx.update(activeRef, {
          locked: true,
          lockedAt: FieldValue.serverTimestamp(),
        });
      return { ...value, locked: true };
    }
    return null;
  });
  if (existing) {
    await publishWeeklyCard(uid, existing, cycle);
    return;
  }
  // No new cards during the Wednesday–Thursday pause.
  if (cycle.phase === "closed") return;
  const weeks = [cycle.weekId];
  const results = [];
  for (const weekId of weeks) {
    const external = votes.filter(
      (v) => (v.submittedAt || v.createdAt)?.toMillis?.() <= +cutoff,
    );
    const cs = {
      count: external.length,
      ratings20: Object.fromEntries(
        ATTRIBUTES.map(([k]) => [
          k,
          external.length
            ? external.reduce((s, v) => s + v.ratings20[k], 0) / external.length
            : 0,
        ]),
      ),
    };
    const aggregates = [];
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      if (+g.closedAt.toDate() > +cutoff) continue;
      const players = context.summaries.find(summary => summary.id === g.id)?.players || {};
      const aggregate = players[uid] || {};
      aggregates.push({
        ...aggregate,
        ...matchPerformance(uid, g),
        outcome: matchOutcome(uid, g),
        goalMargin: matchGoalMargin(uid, g),
        ...matchEvolutionContext(
          uid,
          g,
          players,
          balanceRows.find((b) => b.id === g.id && balanceMatches(g, b)),
        ),
        gameId: g.id,
        count: aggregate.count || 0,
        mvp: aggregate.mvp === true,
        date: g.closedAt.toDate(),
      });
    }
    aggregates.sort((a, b) => a.date - b.date);
    const calculation = calculatePlayerCard({
      uid,
      initial: self,
      community: cs,
      aggregates,
      games: data(gameSnaps),
      rewards: data(rewardSnap),
      weights: ovrWeights,
      position: user.data().primaryPosition,
      createdAt: user.data().createdAt || initial.data().createdAt,
      date: cutoff,
    });
    const { stats, inactivity, ovr } = calculation;
    const specials = availableSpecials(
      earnedCards,
      calculation.rewardSpecials,
      cutoff,
    );
    results.push({
      weekId,
      ovr,
      previousOvr:
        existingHistory.docs
          .filter((d) => d.id < weekId)
          .sort((a, b) => b.id.localeCompare(a.id))[0]
          ?.data().ovr ?? null,
      inactivity,
      stats,
      eventBoosts: calculation.eventBoosts,
      calculationVersion: calculation.progression.version === "per-game-growth-v2" ? "base-plus-growth-v2" : "base-plus-growth-v1",
      baseStats: calculation.baseStats,
      gameStats: calculation.rawStats,
      primaryPosition: user.data().primaryPosition || null,
      ovrCalculation: calculation.ovrCalculation,
      baseCard: calculateBaseCard(ovr),
      specials,
      official: cs.count >= policyAt().rules.communityMinimum,
      sourceCutoffDate: cutoff,
      locked: false,
      opensAt: cycle.opensAt,
      closesAt: cycle.closesAt,
      cardPhoto: photoSnap.exists
        ? {
            photoURL: photoSnap.data().photoURL,
            design: photoSnap.data().design,
          }
        : null,
      appearance: {
        displayName:
          user.data().displayName || user.data().username || "Jogador",
        photoURL: user.data().photoURL || "",
        countryCode: user.data().countryCode || "PT",
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  for (const r of results) {
    await db.runTransaction(async (tx) => {
      const ref = db.doc(`users/${uid}/cardHistory/${r.weekId}`),
        snapshot = await tx.get(ref);
      if (snapshot.data()?.locked) return;
      const photo = await tx.get(db.doc(`weeklyCardPhotos/${uid}_${r.weekId}`));
      const selection = await tx.get(db.doc(`cardSelections/${uid}`));
      const next = {
        ...r,
        selectedCardId: validCardSelection(
          selection.data()?.selectedCardId || snapshot.data()?.selectedCardId,
          r.specials,
        ),
        cardPhoto: photo.exists
          ? { photoURL: photo.data().photoURL, design: photo.data().design }
          : null,
      };
      if (!sameData(snapshot.data(), next)) tx.set(ref, next);
    });
  }
  const latest = results.at(-1);
  if (latest)
    await publishWeeklyCard(uid, (await activeRef.get()).data(), cycle);
  if (latest)
    await db.runTransaction(async (tx) => {
      const ref = db.doc(`users/${uid}/cardState/current`),
        old = await tx.get(ref);
      const oldData = old.data();
      const next = {
        ovr: latest.ovr,
        specials: latest.specials.map((x) => x.id),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!sameData(oldData, next)) tx.set(ref, next);
      if (policyAt().notifications.enabled && oldData && oldData.ovr !== latest.ovr)
        tx.set(
          db.doc(
            `users/${uid}/notifications/card-${latest.weekId}-${latest.ovr}`,
          ),
          {
            type: "CARD_UPDATED",
            title: "Carta actualizada",
            body: `O teu OVR passou de ${oldData.ovr} para ${latest.ovr}.`,
            href: "#/profile",
            read: false,
            createdAt: FieldValue.serverTimestamp(),
          },
        );
      for (const s of latest.specials.filter(
        (s) => policyAt().notifications.enabled && !oldData?.specials?.includes(s.id),
      ))
        tx.set(db.doc(`users/${uid}/notifications/special-${s.id}`), {
          type: "SPECIAL_CARD_UNLOCKED",
          title: "Nova carta especial",
          body: `Desbloqueaste ${s.name}.`,
          href: "#/profile",
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
    });
}
async function queueCommunity(uid) {
  await db.doc(`communityWork/${uid}`).set({ token: randomUUID(), pending: true,
    updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}
export const onCommunityRating = policyWritten(
  "communityRatings/{id}",
  async (event) => {
    const before = event.data.before.data(), after = event.data.after.data();
    const value = after || before;
    if (!value || (!after?.submitted && !before?.submitted))
      return;
    if (after?.communityBatchToken && after.communityBatchToken !== before?.communityBatchToken) return;
    const input = row => ({ targetId: row?.targetId || null, submitted: !!row?.submitted,
      ratings20: row?.ratings20 || null, reviewState: row?.reviewState || null });
    if (sameData(input(before), input(after))) return;
    await queueCommunity(value.targetId);
  }, { readPolicy: false },
);
// Keep old deployed trigger identities; cards read these inputs in the cycle.
export const onPlayerPosition = policyWritten("users/{uid}", () => {}, { disabled: true });
export const onInitialRating = policyWritten(
  "initialRatings/{uid}", () => {}, { disabled: true },
);
export const onFeedback = policyWritten(
  "games/{gid}/feedback/{id}",
  enqueueFeedbackEvent,
  { readPolicy: false },
);
export const processFeedback = policySchedule("processFeedback", {
  schedule: AUTOMATION_SCHEDULE, timeZone: "Europe/Lisbon", timeoutSeconds: 540,
}, async () => {
  const games = [];
  const result = await drainFeedbackQueue({
  aggregate: async gid => {
    games.push(gid);
    const game = (await db.doc(`games/${gid}`).get()).data();
    if (!game || game.deleting) {
      await db.doc(`gameSummaries/${gid}`).delete();
      await db.doc(`gameBalances/${gid}`).delete();
      return [];
    }
    if (game.status === "closed") await captureGameBalance(gid, game);
    else await db.doc(`gameBalances/${gid}`).delete();
    await aggregateGame(gid);
    return participants(game || {});
  },
  rebuild: async () => {
    // Keep the queue pending if correction review fails.
    for (const gid of games) await pathEndpoints.syncGame(gid);
  },
  });
  return result;
});
// Store only the rendering fields, once per participant and match week.
async function captureGameCards(gid) {
  const ref = db.doc(`games/${gid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data().deleting || snap.data().status !== "closed")
      return;
    const game = snap.data(),
      weekId = cardWeek(game.scheduledAt.toDate()).weekId;
    const ids = participants(game);
    if (
      game.cardWeekId === weekId &&
      ids.every((uid) => Object.hasOwn(game.playerCards || {}, uid))
    )
      return;
    const cards = {};
    await Promise.all(
      ids.map(async (uid) => {
        if (
          game.cardWeekId === weekId &&
          Object.hasOwn(game.playerCards || {}, uid)
        ) {
          cards[uid] = game.playerCards[uid];
          return;
        }
        const history = await tx.get(
          db.doc(`users/${uid}/cardHistory/${weekId}`),
        );
        const c = history.data();
        // A missing historical card is explicit: never substitute today's card.
        cards[uid] = c
          ? {
              uid,
              ...c.appearance,
              hasCard: true,
              ovr: c.ovr,
              stats: c.stats || {},
              primaryPosition:
                c.primaryPosition || game.positions?.[uid] || "ALA",
              cardType: c.baseCard || "bronze-common",
              selectedCardId: c.selectedCardId || "base",
              specials: c.specials || [],
              cardPhoto: c.cardPhoto || null,
            }
          : {
              uid,
              hasCard: false,
              primaryPosition: game.positions?.[uid] || "ALA",
            };
      }),
    );
    tx.update(ref, { cardWeekId: weekId, playerCards: cards });
  });
}
export const ensureGameCards = policyCall("ensureGameCards",async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const user = await db.doc(`users/${request.auth.uid}`).get();
  if (!user.exists || user.data().disabled)
    throw new HttpsError("permission-denied", "Acesso reservado.");
  const gid = request.data?.gameId;
  if (typeof gid !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(gid))
    throw new HttpsError("invalid-argument", "Jogo inválido.");
  await captureGameCards(gid);
  const game = (await db.doc(`games/${gid}`).get()).data();
  return {
    playerCards: game?.playerCards || {},
    cardWeekId: game?.cardWeekId || null,
  };
});
export const renameGameTeam = policyCall("renameGameTeam",async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const { gameId, side, name } = request.data || {};
  if (
    typeof gameId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(gameId) ||
    !["teamA", "teamB"].includes(side) ||
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 40
  )
    throw new HttpsError(
      "invalid-argument",
      "Escolhe um nome entre 1 e 40 caracteres.",
    );
  await db.runTransaction(async (tx) => {
    const user = await tx.get(db.doc(`users/${request.auth.uid}`)),
      ref = db.doc(`games/${gameId}`),
      snap = await tx.get(ref);
    const game = snap.data();
    if (!user.exists || user.data().disabled || !game || game.deleting)
      throw new HttpsError("permission-denied", "Acesso reservado.");
    // Rosters are saved in descending OVR order; the first starter is the captain.
    if (
      user.data().role !== "admin" &&
      (game.status === "closed" || game[side].starters[0] !== request.auth.uid)
    )
      throw new HttpsError(
        "permission-denied",
        "Só o capitão pode mudar este nome. Após o fecho, apenas o administrador.",
      );
    tx.update(ref, {
      [`teamNames.${side}`]: name.trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});
export const onGame = policyWritten("games/{gid}", async (event) => {
  const before = event.data.before?.data?.(),
    after = event.data.after?.data?.();
  if (before && after) {
    const core = (value) =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(value).filter(
            ([key]) =>
              !["teamNames", "playerCards", "cardWeekId", "updatedAt", "ratingWaivers", "derivedWorkToken"].includes(
                key,
              ),
          ),
        ),
      );
    if (core(before) === core(after)) return;
  }
  if (!after?.derivedWorkToken || after.derivedWorkToken === before?.derivedWorkToken)
    await db.doc(`feedbackWork/${event.params.gid}`).set({ token: randomUUID(),
      pending: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  if (after?.status !== "closed" || before?.status === "closed") return;
  const g = (await db.doc(`games/${event.params.gid}`).get()).data();
  if (!g || g.deleting || g.status !== "closed") return;
  await captureGameCards(event.params.gid);
  await executeAutomationCycle(`game:${event.params.gid}:${g.closedAt?.toMillis() || event.id}`);
  if (g.status === "closed")
    await Promise.all(
      participants(g).map((uid) =>
        notification(uid, `mission-game-${event.params.gid}`, {
          type: "GAME_CLOSED",
          title: "Peladinha finalizada",
          body: `${g.title}: ${g.score.teamA}–${g.score.teamB}. Avalia os teus colegas.`,
          href: `#/game/${event.params.gid}/feedback`,
        }),
      ),
    );
}, { timeoutSeconds: 540, retry: true });
async function requireAdmin(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const u = await db.doc(`users/${request.auth.uid}`).get();
  if (u.data()?.role !== "admin" || u.data()?.disabled)
    throw new HttpsError("permission-denied", "Acesso reservado.");
}
export const saveOvrWeights = policyCall("saveOvrWeights",
  { timeoutSeconds: 540 },
  async (request) => {
    await requireAdmin(request);
    if (!validOvrWeights(request.data))
      throw new HttpsError(
        "invalid-argument",
        "Define os 12 pesos entre 0 e 100, com até duas casas decimais, e um total de 100%.",
      );
    const { weights, positions } = normalizeOvrWeights(request.data);
    await db.doc("settings/ovr").set({
      version: "position-weights-v4",
      weights,
      positions,
      updatedBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, weights, positions };
  },
);
export const rebuildHistory = policyCall("rebuildHistory",async (request) => {
  await requireAdmin(request);
  const uid = request.data.uid;
  if (typeof uid !== "string" || uid.includes("/"))
    throw new HttpsError("invalid-argument", "UID inválido.");
  await aggregateCommunity(uid);
  await buildHistory(uid);
  return { ok: true };
});
async function publishWeeklyCard(uid, snapshot, cycle) {
  if (!snapshot) return;
  // Read the history inside the transaction to prevent an older trigger overwriting a locked card.
  await db.runTransaction(async (tx) => {
    const history = await tx.get(
      db.doc(`users/${uid}/cardHistory/${snapshot.weekId}`),
    );
    const current = await tx.get(db.doc(`weeklyCards/${uid}`));
    if (
      !history.exists ||
      (current.data()?.weekId && current.data().weekId > snapshot.weekId)
    )
      return;
    const next = {
      ...history.data(),
      uid,
      phase: history.data().locked ? "closed" : "open",
      nextOpensAt: cycle.nextOpensAt,
    };
    if (!sameData(current.data(), next)) tx.set(db.doc(`weeklyCards/${uid}`), next);
  });
}
export const closeCardWeek = policySchedule("closeCardWeek",
  { schedule: AUTOMATION_SCHEDULE, timeZone: "Europe/Lisbon", timeoutSeconds: 540 },
  async () => {
    if(cardWeek().phase!=="closed") return;
    const users = data(await db.collection("users").get()).filter(
      (u) => !u.disabled,
    );
    await buildHistories(users.map(user => user.uid));
  },
);
export const openCardWeek = policySchedule("openCardWeek",
  { schedule: AUTOMATION_SCHEDULE, timeZone: "Europe/Lisbon", timeoutSeconds: 540 },
  async () => {
    if(cardWeek().phase!=="open") return;
    const users = data(await db.collection("users").get()).filter(
      (u) => !u.disabled,
    );
    await buildHistories(users.map(user => user.uid));
  },
);
export const ensureHistory = policyCall("ensureHistory",async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const uid = request.auth.uid,
    user = await db.doc(`users/${uid}`).get();
  if (user.data()?.disabled)
    throw new HttpsError("permission-denied", "Conta desactivada.");
  return { ok: true, scheduled: true };
});
export const refreshCardCollection = policySchedule("refreshCardCollection",
  { schedule: AUTOMATION_SCHEDULE, timeZone: "Europe/Lisbon", timeoutSeconds: 540 },
  async (event) => {
    const context = await collectionContext();
    const collectionEnabled = policyAt().automation.collection !== false;
    if (collectionEnabled) {
      await settleCollectionPeriods(context);
      await ensureFuttiesVote(context);
    }
    for (const user of context.users)
      if (event?.cycle && policyAt().automation.cards !== false)
        await buildHistory(user.uid, context, { refreshCollection: collectionEnabled });
      else if (collectionEnabled) await refreshPlayerCollection(user.uid, context);
    return { ok: true, nextAt: nextHomeBoundary([context.games, context.rewards]) };
  },
);
export const selectWeeklyCard = policyCall("selectWeeklyCard",async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const uid = request.auth.uid;
  const { weekId, cardId } = request.data || {};
  const cycle = cardWeek();
  if (weekId !== cycle.weekId)
    throw new HttpsError(
      "failed-precondition",
      "Atualiza a página para escolher a carta.",
    );
  if (typeof cardId !== "string" || cardId.length > 160)
    throw new HttpsError("invalid-argument", "Carta inválida.");
  const user = await db.doc(`users/${uid}`).get();
  if (!user.exists || user.data().disabled)
    throw new HttpsError("permission-denied", "Conta indisponível.");
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`users/${uid}/cardHistory/${weekId}`);
    const snapshot = await tx.get(ref);
    const currentUser = await tx.get(db.doc(`users/${uid}`));
    const collection = await tx.get(db.doc(`cardCollections/${uid}`));
    const rewards = await tx.get(
      db.collection("eventRewards").where("uid", "==", uid),
    );
    const freshCycle = cardWeek();
    if (!currentUser.exists || currentUser.data().disabled)
      throw new HttpsError("permission-denied", "Conta indisponível.");
    if (freshCycle.weekId !== weekId)
      throw new HttpsError(
        "failed-precondition",
        "Atualiza a página para escolher a carta.",
      );
    const eventCards = applyEventRewards({}, data(rewards), uid).specials;
    const specials = availableSpecials(
      collection.data()?.awards || [],
      eventCards,
    );
    if (cardId !== "base" && !specials.some((card) => card.id === cardId))
      throw new HttpsError(
        "invalid-argument",
        "Esta carta já não está disponível na tua coleção.",
      );
    tx.set(db.doc(`cardSelections/${uid}`), {
      uid,
      selectedCardId: cardId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    // Changing today's look must never rewrite a closed weekly snapshot.
    if (
      snapshot.exists &&
      !snapshot.data().locked &&
      freshCycle.phase === "open"
    ) {
      tx.update(ref, { selectedCardId: cardId, specials });
      tx.set(db.doc(`weeklyCards/${uid}`), {
        ...snapshot.data(),
        uid,
        selectedCardId: cardId,
        specials,
        phase: "open",
        nextOpensAt: freshCycle.nextOpensAt,
      });
    }
  });
  return { ok: true };
});
export const rebuildLeague = policyCall("rebuildLeague",async (request) => {
  await requireAdmin(request);
  const users = data(await db.collection("users").get()),
    games = data(await db.collection("games").get());
  for (const g of games) await aggregateGame(g.id);
  for (const u of users) {
    await aggregateCommunity(u.uid);
  }
  await buildHistories(users.map(u => u.uid));
  return { ok: true };
});
export const deleteGame = policyCall("deleteGame",async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const actor = (await db.doc(`users/${request.auth.uid}`).get()).data();
  if (!actor || actor.disabled || !["admin", "dbs"].includes(actor.role))
    throw new HttpsError(
      "permission-denied",
      "Só DBS e administradores podem eliminar jogos.",
    );
  const id = request.data.gameId;
  if (typeof id !== "string" || !id || id.includes("/"))
    throw new HttpsError("invalid-argument", "Jogo inválido.");
  const ref = db.doc(`games/${id}`);
  await db.runTransaction(async (tx) => {
    const game = await tx.get(ref);
    if (!game.exists) throw new HttpsError("not-found", "Jogo não encontrado.");
    if (game.data().status === "closed" && actor.role !== "admin")
      throw new HttpsError(
        "permission-denied",
        "Só o admin pode eliminar um jogo encerrado.",
      );
    tx.update(ref, { deleting: true });
  });
  await db.recursiveDelete(ref);
  await db.doc(`gameSummaries/${id}`).delete();
  await db.doc(`gameBalances/${id}`).delete();
  await db.doc(`feedbackWork/${id}`).set({ token: randomUUID(), pending: true });
  return { ok: true };
});
export const adminMessage = policyCall("adminMessage",async (request) => {
  await requireAdmin(request);
  if(!policyAt().notifications.enabled) throw new HttpsError("failed-precondition", "As notifica\u00e7\u00f5es est\u00e3o pausadas nas regras globais.");
  const { title, body, audience = "all", gameId, recipientIds } = request.data;
  if (
    typeof title !== "string" ||
    typeof body !== "string" ||
    title.length > 80 ||
    body.length > 500 ||
    !title.trim() ||
    !body.trim()
  )
    throw new HttpsError("invalid-argument", "Mensagem inválida.");
  if (!["all", "game", "selected"].includes(audience))
    throw new HttpsError("invalid-argument", "Destinatários inválidos.");
  let ids;
  if (audience === "game") {
    if (typeof gameId !== "string" || !gameId || gameId.includes("/"))
      throw new HttpsError("invalid-argument", "Escolhe um jogo válido.");
    const game = await db.doc(`games/${gameId}`).get();
    if (!game.exists || game.data().deleting)
      throw new HttpsError("not-found", "Jogo indisponível.");
    ids = new Set(participants(game.data()));
  } else if (audience === "selected") {
    if (!Array.isArray(recipientIds) || !recipientIds.length || recipientIds.length > 1000 ||
        recipientIds.some(id => typeof id !== "string" || !id || id.includes("/")))
      throw new HttpsError("invalid-argument", "Seleciona jogadores válidos.");
    ids = new Set(recipientIds);
  }
  const users = data(await db.collection("users").get()).filter(
    (u) => !u.disabled && (!ids || ids.has(u.uid)),
  );
  if (!users.length)
    throw new HttpsError("failed-precondition", "Não há jogadores ativos nos destinatários escolhidos.");
  const id = `admin-${randomUUID()}`;
  await Promise.all(
    users.map((u) =>
      notification(u.uid, id, {
        type: "ADMIN_MESSAGE",
        title,
        body,
        href: "#/notifications",
      }),
    ),
  );
  return { ok: true, sent: users.length };
});
export const saveTheme = policyCall("saveTheme",async (request) => {
  await requireAdmin(request);
  const { id, name, colors, texture, design, baseTheme } = request.data;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 40 ||
    (id !== undefined &&
      (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id))) ||
    !colors ||
    !["primary", "secondary", "text", "border", "glow"].every((k) =>
      /^#[0-9a-f]{6}$/i.test(colors[k] || ""),
    ) ||
    (design !== undefined && !validCardDesign(design)) ||
    (baseTheme !== undefined &&
      ![...CATALOG_THEMES, "in-form", "custom-test"].includes(baseTheme)) ||
    !["diagonal", "radial", "plain"].includes(texture)
  )
    throw new HttpsError("invalid-argument", "Tema inválido.");
  const theme = {
    name: name.trim(),
    colors,
    texture,
    ...(design ? { design } : {}),
    ...(baseTheme ? { baseTheme } : {}),
    experimental: true,
    updatedBy: request.auth.uid,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (id !== undefined) {
    const ref = db.doc(`cardThemes/${id}`);
    await db.runTransaction(async (tx) => {
      if (!(await tx.get(ref)).exists)
        throw new HttpsError("not-found", "Composição não encontrada.");
      tx.update(ref, theme);
    });
    return { id };
  }
  const r = await db.collection("cardThemes").add({
    ...theme,
    createdBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: r.id };
});
export const correctRating = policyCall("correctRating",async (request) => {
  await requireAdmin(request);
  const { kind, id, gameId, ratings } = request.data;
  const validId = (value) =>
    typeof value === "string" && value.length > 0 && !value.includes("/");
  if (
    !["community", "game"].includes(kind) ||
    !validId(id) ||
    (kind === "game" && !validId(gameId)) ||
    !ratings ||
    typeof ratings !== "object"
  )
    throw new HttpsError("invalid-argument", "Avaliação inválida.");
  const path =
    kind === "game"
      ? `games/${gameId}/feedback/${id}`
      : `communityRatings/${id}`;
  await db.runTransaction(async (tx) => {
    const ref = db.doc(path),
      snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw new HttpsError("not-found", "Avaliação não encontrada.");
    const previous = snapshot.data(),
      keys =
        kind === "game" ? FEEDBACK.map(([k]) => k) : ATTRIBUTES.map(([k]) => k),
      max = kind === "game" ? 5 : 20;
    if (kind === "community" && previous.reviewState)
      throw new HttpsError("failed-precondition", "Esta avaliação deve seguir a revisão pelo seu autor.");
    if (kind === "game" && previous.raterId !== previous.targetId) {
      const self = (
        await tx.get(
          db.doc(
            `games/${gameId}/feedback/${previous.targetId}_${previous.targetId}`,
          ),
        )
      ).data();
      if (self?.submitted && self.ratings?.goalkeeping === null)
        ratings.goalkeeping = null;
    }
    if (!canEditRating(previous))
      throw new HttpsError(
        "failed-precondition",
        "O prazo de 7 dias para editar a avaliação terminou.",
      );
    if (
      !Object.entries(ratings).every(
        ([k, v]) =>
          keys.includes(k) &&
          ((kind === "game" && k === "goalkeeping" && v === null) ||
            (Number.isInteger(v) && v >= 0 && v <= max)),
      ) ||
      (previous.submitted &&
        !(kind === "game"
          ? completeFeedback(ratings)
          : completeInitial(ratings)))
    )
      throw new HttpsError(
        "invalid-argument",
        "Valores fora da escala ou avaliação incompleta.",
      );
    tx.set(db.collection("ratingCorrections").doc(), {
      path,
      original: kind === "game" ? previous.ratings : previous.ratings20,
      corrected: ratings,
      adminId: request.auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (kind === "game") writeFeedbackRevision(tx,ref,previous,{...previous,ratings,updatedAt:FieldValue.serverTimestamp()});
    else tx.update(ref,{ratings20:ratings,updatedAt:FieldValue.serverTimestamp()});
  });
  return { ok: true };
});

export const saveWeeklyCardPhoto = policyCall("saveWeeklyCardPhoto",async (request) => {
  await requireAdmin(request);
  const { uid, weekId, design, reset, imageBase64 } = request.data || {};
  let photoURL = request.data?.photoURL;
  const cycle = cardWeek();
  if (
    typeof uid !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(uid) ||
    weekId !== cycle.weekId
  )
    throw new HttpsError("invalid-argument", "Jogador ou semana inválidos.");
  if (cycle.phase !== "open")
    throw new HttpsError(
      "failed-precondition",
      "A semana está fechada. A fotografia também está bloqueada.",
    );
  if (
    reset !== true &&
    (typeof photoURL !== "string" ||
      photoURL.length > 2000 ||
      (photoURL && !/^https:\/\//i.test(photoURL)) ||
      !validPhotoDesign(design))
  )
    throw new HttpsError(
      "invalid-argument",
      "Fotografia ou enquadramento inválidos.",
    );
  const validate = async (tx) => {
    const user = await tx.get(db.doc(`users/${uid}`));
    const history = await tx.get(db.doc(`users/${uid}/cardHistory/${weekId}`));
    if (!user.exists || user.data().disabled)
      throw new HttpsError("not-found", "Jogador não encontrado.");
    if (
      (history.data()?.locked && !canReopenWeeklyCard(history.data(), cardWeek())) ||
      cardWeek().phase !== "open" ||
      cardWeek().weekId !== weekId
    )
      throw new HttpsError("failed-precondition", "Esta carta está fechada.");
    return history;
  };
  let uploaded;
  if (reset !== true && imageBase64 !== undefined) {
    if (
      typeof imageBase64 !== "string" ||
      imageBase64.length > 1400000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)
    )
      throw new HttpsError("invalid-argument", "Imagem inválida.");
    const buffer = Buffer.from(imageBase64, "base64");
    if (
      buffer.length < 12 ||
      buffer.length >= 1024 * 1024 ||
      buffer.toString("ascii", 0, 4) !== "RIFF" ||
      buffer.toString("ascii", 8, 12) !== "WEBP"
    )
      throw new HttpsError(
        "invalid-argument",
        "É necessária uma imagem WebP até 1 MB.",
      );
    await db.runTransaction(validate);
    const token = randomUUID();
    const bucketName =
      getApp().options.storageBucket ||
      `${process.env.GCLOUD_PROJECT || getApp().options.projectId}.firebasestorage.app`;
    uploaded = getStorage()
      .bucket(bucketName)
      .file(`weekly-cards/${uid}/${weekId}/${randomUUID()}.webp`);
    await uploaded.save(buffer, {
      resumable: false,
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: {
        contentType: "image/webp",
        cacheControl: "public,max-age=31536000,immutable",
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
    photoURL = `https://firebasestorage.googleapis.com/v0/b/${uploaded.bucket.name}/o/${encodeURIComponent(uploaded.name)}?alt=media&token=${token}`;
  }
  try {
    await db.runTransaction(async (tx) => {
      const history = await validate(tx);
      const published = await tx.get(db.doc(`weeklyCards/${uid}`));
      const ref = db.doc(`weeklyCardPhotos/${uid}_${weekId}`);
      const cardPhoto = reset === true ? null : { photoURL, design };
      if (history.exists) tx.update(history.ref, { cardPhoto });
      if (published.exists && published.data().weekId === weekId && published.data().phase === "open")
        tx.update(published.ref, { cardPhoto });
      if (reset === true) tx.delete(ref);
      else
        tx.set(ref, {
          uid,
          weekId,
          photoURL,
          design,
          updatedBy: request.auth.uid,
          updatedAt: FieldValue.serverTimestamp(),
        });
    });
  } catch (error) {
    if (uploaded) await uploaded.delete().catch(() => {});
    throw error;
  }
  return { ok: true, photoURL: reset === true ? "" : photoURL };
});

export const initializeOvrPresets = policyCall("initializeOvrPresets",async (request) => {
  await requireAdmin(request);
  await db.runTransaction(async (tx) => {
    const flag = db.doc("settings/ovrPresetSeed"),
      seed = await tx.get(flag),
      current = await tx.get(db.doc("settings/ovr"));
    if (seed.exists) return;
    for (const preset of defaultOvrPresets(current.data()))
      tx.set(db.doc(`ovrPresets/${preset.id}`), preset);
    tx.set(flag, { createdAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});
export const saveOvrPreset = policyCall("saveOvrPreset",async (request) => {
  await requireAdmin(request);
  const { name, settings } = request.data || {};
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 40 ||
    !validOvrWeights(settings)
  )
    throw new HttpsError("invalid-argument", "Predefinição inválida.");
  const ref = await db.collection("ovrPresets").add({
    name: name.trim(),
    settings: normalizeOvrWeights(settings),
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
  });
  return { id: ref.id };
});

export const {
  eventAction,
  voteEvent,
  closeEvents,
  getEvent,
  listEvents,
  claimMission,
} = eventFunctions(async () => {});

export const { getHome, onHomeSource, onHomeFeedback, onHomeVote } = homeFunctions(listEvents, {
  loadEvent: (request, eventId) => getEvent.run({ ...request, data: { eventId } }),
});

const pathEndpoints = pathFunctions(async () => {});
export const { getPath, pathAction, onPathGame, onPathSummary, settlePaths } = pathEndpoints;
export const { gameAction, feedbackAction, ratingWaiverAction } = gameFlowFunctions(async gid => {
  await captureGameCards(gid);
  const game = (await db.doc(`games/${gid}`).get()).data();
  await executeAutomationCycle(`game:${gid}:${game.closedAt.toMillis()}`);
});

export const {
  onGameNotifications,
  onEventNotifications,
  scheduledNotifications,
  ratingSubmissionStatus,
  sendRatingReminders,
} = notificationFunctions(notification);

export const { maintenanceRead, maintenanceAction, systemHeartbeat, systemCleanup } = maintenanceFunctions({
  rebuildPlayer: buildHistory,
  rebuildGame: async id => { await aggregateGame(id); const game=(await db.doc(`games/${id}`).get()).data(); if(game)await buildHistories(participants(game)); },
  rebuildAll: async () => { const users=data(await db.collection("users").get()), games=data(await db.collection("games").get()); for(const game of games)await aggregateGame(game.id); for(const user of users)await aggregateCommunity(user.uid); await buildHistories(users.map(user=>user.uid)); return {ok:true}; },
});

// Every scheduler delivery joins the same cycle. The legacy endpoints remain
// deployed, so rolling out this change does not leave old hourly workers alive.
async function executeAutomationCycle(key) {
  return withPolicy(() => runAutomationCycle(db, key, async () => {
    const community = policyAt().features.mode !== "readOnly" && policyAt().automation.cards !== false
      ? await db.collection("communityWork").where("pending", "==", true).get() : { docs: [] };
    for (const job of community.docs) {
      await aggregateCommunity(job.id);
      await db.runTransaction(async tx => {
        if ((await tx.get(job.ref)).data()?.token === job.data().token)
          tx.update(job.ref, { pending: false });
      });
    }
    let feedback;
    do {
      feedback = await processFeedback.run({ cycle: true });
      if (feedback.running) throw Error("O processamento de jogos está em execução.");
    }
    while (feedback.processed === 50);
    for (const job of [settlePaths, closeEvents, systemHeartbeat, refreshCardCollection, scheduledNotifications]) {
      const result = await job.run({ cycle: true });
      if (result?.running || result?.ok === false || result?.issues?.length)
        throw Error("Uma tarefa do ciclo ficou pendente.");
    }
    await invalidateHome("games", "automation-cycle", null, { key });
    return { ok: true };
  }));
}
setAutomationRunner(event => {
  const time = Date.parse(event.scheduleTime);
  const key = Number.isFinite(time) ? new Date(time).toISOString() : String(event.scheduleTime);
  return executeAutomationCycle(`schedule:${key}`);
});
