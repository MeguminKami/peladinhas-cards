import { notificationFunctions } from "./notifications.js";
import { pushFunctions } from "./push.js";
import { defineSecret } from "firebase-functions/params";
import { WEB_PUSH_PUBLIC_KEY } from "../js/push-config.js";
import { eventFunctions } from "./events.js";
import { calculatePlayerCard } from "../js/player-calculation.js";
import { defaultOvrPresets } from "../js/ovr-presets.js";
import { validPhotoDesign } from "../js/card-photo.js";
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";
import { cardWeek, cardWeekBounds } from "../js/card-week.js";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  teamBalance,
  balanceMatches,
  balanceSignature,
} from "../js/team-balance.js";
import { validCardDesign } from "../js/card-design.js";
import { initializeApp, getApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import {
  ATTRIBUTES,
  calculateGameAggregate,
  normalizeOvrWeights,
  validOvrWeights,
  calculateBaseCard,
  calculateSpecialCards,
  isoWeek,
  isoWeekEnd,
  participants,
  completeInitial,
  completeFeedback,
  FEEDBACK,
  THEMES,
  matchOutcome,
  matchGoalMargin,
  matchEvolutionContext,
  matchPerformance,
} from "../js/utils.js";
initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 3 });
const db = getFirestore();
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
export const ticketAction = onCall(async (request) => {
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
export const onTicketMessage = onDocumentWritten(
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
export const onTicketClosed = onDocumentWritten(
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
  await db.runTransaction(async (tx) => {
    if (guard) {
      if (!(await guard(tx))) return;
    } else {
      const user = (await tx.get(db.doc(`users/${uid}`))).data();
      if (!user || user.disabled) return;
    }
    const ref = db.doc(`users/${uid}/notifications/${id}`),
      existing = await tx.get(ref);
    if (!existing.exists)
      tx.set(ref, {
        ...value,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
  });
}
async function aggregateCommunity(uid) {
  await db.runTransaction(async (tx) => {
    const query = db
      .collection("communityRatings")
      .where("targetId", "==", uid);
    const votes = data(await tx.get(query)).filter(
      (v) => v.submitted && completeInitial(v.ratings20),
    );
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
        completeInitial(v.ratings20) &&
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
          participants(g).includes(v.raterId),
      );
      const a = calculateGameAggregate(own);
      ps[uid] = { ...a, count: own.length, mvp: false };
    }
    const best = Math.max(0, ...Object.values(ps).map((a) => a.overall || 0));
    for (const uid of Object.keys(ps))
      ps[uid].mvp =
        ps[uid].count >= 3 &&
        ps[uid].overall >= 4.8 &&
        ps[uid].overall === best;
    tx.set(db.doc(`gameSummaries/${gid}`), {
      status: g.status,
      scheduledAt: g.scheduledAt,
      closedAt: g.closedAt,
      teamA: g.teamA,
      teamB: g.teamB,
      players: ps,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
async function buildHistory(uid) {
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
    db.doc(`users/${uid}`).get(),
    db.doc(`initialRatings/${uid}`).get(),
    db.collection("communityRatings").where("targetId", "==", uid).get(),
    db.collection("games").get(),
    db.doc("settings/ovr").get(),
    db.collection("gameBalances").get(),
    db.doc(`weeklyCardPhotos/${uid}_${cardWeek(now).weekId}`).get(),
    db.collection("eventRewards").where("uid", "==", uid).get(),
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
  const votes = data(community).filter((r) => r.submitted && completeInitial(r.ratings20));
  const games = data(gameSnaps).filter(
    (g) =>
      g.status === "closed" && !g.deleting && participants(g).includes(uid),
  );
  const feedback = await Promise.all(
    games.map((g) => db.collection(`games/${g.id}/feedback`).get()),
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
      const feedbackRows = data(feedback[i]).filter(
        (f) =>
          f.submitted &&
          participants(g).includes(f.raterId) &&
          (f.submittedAt || f.updatedAt || f.createdAt) &&
          +(f.submittedAt || f.updatedAt || f.createdAt).toDate() <= +cutoff,
      );
      const own = feedbackRows.filter((f) => f.targetId === uid);

      const aggregate = calculateGameAggregate(own);
      const max = Math.max(
        ...participants(g).map(
          (id) =>
            calculateGameAggregate(
              feedbackRows.filter((f) => f.targetId === id),
            ).overall || 0,
        ),
      );
      aggregates.push({
        ...aggregate,
        ...matchPerformance(uid, g),
        outcome: matchOutcome(uid, g),
        goalMargin: matchGoalMargin(uid, g),
        ...matchEvolutionContext(
          uid,
          g,
          Object.fromEntries(
            participants(g).map((id) => [
              id,
              calculateGameAggregate(
                feedbackRows.filter((f) => f.targetId === id),
              ),
            ]),
          ),
          balanceRows.find((b) => b.id === g.id && balanceMatches(g, b)),
        ),
        gameId: g.id,
        count: own.length,
        mvp:
          own.length >= 3 &&
          aggregate.overall >= 4.8 &&
          aggregate.overall === max,
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
    const specials = [
      ...calculation.rewardSpecials,
      ...calculateSpecialCards(aggregates).filter(
        (s) => !calculation.rewardSpecials.some((r) => r.id === s.id),
      ),
    ];
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
      calculationVersion: "base-plus-growth-v1",
      baseStats: calculation.baseStats,
      gameStats: calculation.rawStats,
      primaryPosition: user.data().primaryPosition || null,
      ovrCalculation: calculation.ovrCalculation,
      baseCard: calculateBaseCard(ovr),
      specials,
      official: cs.count >= 3,
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
      tx.set(ref, {
        ...r,
        selectedCardId: r.specials.some(
          (s) => s.id === snapshot.data()?.selectedCardId,
        )
          ? snapshot.data().selectedCardId
          : r.specials[0]?.id || null,
        cardPhoto: photo.exists
          ? { photoURL: photo.data().photoURL, design: photo.data().design }
          : null,
      });
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
      tx.set(ref, {
        ovr: latest.ovr,
        specials: latest.specials.map((x) => x.id),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (oldData && oldData.ovr !== latest.ovr)
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
        (s) => !oldData?.specials?.includes(s.id),
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
export const onCommunityRating = onDocumentWritten(
  "communityRatings/{id}",
  async (event) => {
    const value = event.data.after.data() || event.data.before.data();
    if (!value || (!value.submitted && !event.data.before.data()?.submitted))
      return;
    await aggregateCommunity(value.targetId);
    await buildHistory(value.targetId);
  },
);
export const onPlayerPosition = onDocumentWritten("users/{uid}", (event) => {
  if (
    event.data.after.exists &&
    event.data.after.data().primaryPosition !==
      event.data.before.data()?.primaryPosition
  )
    return buildHistory(event.params.uid);
});
export const onInitialRating = onDocumentWritten(
  "initialRatings/{uid}",
  (event) => {
    if (event.data.after.data()?.completed)
      return buildHistory(event.params.uid);
  },
);
export const onFeedback = onDocumentWritten(
  "games/{gid}/feedback/{id}",
  async (event) => {
    const value = event.data.after.data() || event.data.before.data();
    if (!value || (!value.submitted && !event.data.before.data()?.submitted))
      return;
    await aggregateGame(event.params.gid);
    const g = (await db.doc(`games/${event.params.gid}`).get()).data();
    await Promise.all(participants(g || {}).map(buildHistory));
  },
);
export const onGame = onDocumentWritten("games/{gid}", async (event) => {
  const latestGame = await db.doc(`games/${event.params.gid}`).get();
  if (!latestGame.exists) {
    await db.doc(`gameSummaries/${event.params.gid}`).delete();
    await db.doc(`gameBalances/${event.params.gid}`).delete();
    await Promise.all(
      data(await db.collection("users").get())
        .filter((u) => !u.disabled)
        .map((u) => buildHistory(u.uid)),
    );
    return;
  }
  const g = latestGame.data();
  if (g.deleting) return;
  if (g.status === "closed") await captureGameBalance(event.params.gid, g);
  else await db.doc(`gameBalances/${event.params.gid}`).delete();
  await aggregateGame(event.params.gid);
  const uids = data(await db.collection("users").get())
    .filter((u) => !u.disabled)
    .map((u) => u.uid);
  await Promise.all(uids.map(buildHistory));
  if (g.status === "closed") await closeEvents.run({});
  if (g.status === "closed" && event.data.before.data()?.status !== "closed")
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
});
async function requireAdmin(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const u = await db.doc(`users/${request.auth.uid}`).get();
  if (u.data()?.role !== "admin" || u.data()?.disabled)
    throw new HttpsError("permission-denied", "Acesso reservado.");
}
export const saveOvrWeights = onCall(
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
    const users = data(await db.collection("users").get());
    for (const user of users) await buildHistory(user.uid);
    return { ok: true, weights, positions };
  },
);
export const rebuildHistory = onCall(async (request) => {
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
    tx.set(db.doc(`weeklyCards/${uid}`), {
      ...history.data(),
      uid,
      phase: history.data().locked ? "closed" : "open",
      nextOpensAt: cycle.nextOpensAt,
    });
  });
}
export const closeCardWeek = onSchedule(
  { schedule: "0 12 * * 3", timeZone: "Europe/Lisbon", timeoutSeconds: 540 },
  async () => {
    const users = data(await db.collection("users").get()).filter(
      (u) => !u.disabled,
    );
    for (const user of users) await buildHistory(user.uid);
  },
);
export const openCardWeek = onSchedule(
  { schedule: "0 12 * * 4", timeZone: "Europe/Lisbon", timeoutSeconds: 540 },
  async () => {
    const users = data(await db.collection("users").get()).filter(
      (u) => !u.disabled,
    );
    for (const user of users) await buildHistory(user.uid);
  },
);
export const ensureHistory = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const uid = request.auth.uid,
    user = await db.doc(`users/${uid}`).get();
  if (user.data()?.disabled)
    throw new HttpsError("permission-denied", "Conta desactivada.");
  await buildHistory(uid);
  return { ok: true };
});
export const selectWeeklyCard = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sessão.");
  const uid = request.auth.uid;
  const { weekId, cardId } = request.data || {};
  const cycle = cardWeek();
  if (weekId !== cycle.weekId || cycle.phase !== "open")
    throw new HttpsError("failed-precondition", "A semana está fechada.");
  if (typeof cardId !== "string" || cardId.length > 160)
    throw new HttpsError("invalid-argument", "Carta inválida.");
  const user = await db.doc(`users/${uid}`).get();
  if (!user.exists || user.data().disabled)
    throw new HttpsError("permission-denied", "Conta indisponível.");
  await buildHistory(uid);
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`users/${uid}/cardHistory/${weekId}`);
    const snapshot = await tx.get(ref);
    const currentUser = await tx.get(db.doc(`users/${uid}`));
    const freshCycle = cardWeek();
    if (!currentUser.exists || currentUser.data().disabled)
      throw new HttpsError("permission-denied", "Conta indisponível.");
    if (
      !snapshot.exists ||
      snapshot.data().locked ||
      freshCycle.phase !== "open" ||
      freshCycle.weekId !== weekId
    )
      throw new HttpsError("failed-precondition", "Esta carta está fechada.");
    const options = [
      ...new Set((snapshot.data().specials || []).map((s) => s.id)),
    ];
    if (options.length < 2 || !options.includes(cardId))
      throw new HttpsError(
        "invalid-argument",
        "Escolhe uma das cartas recebidas nesta semana.",
      );
    tx.update(ref, { selectedCardId: cardId });
    tx.set(db.doc(`weeklyCards/${uid}`), {
      ...snapshot.data(),
      uid,
      selectedCardId: cardId,
      phase: "open",
      nextOpensAt: freshCycle.nextOpensAt,
    });
  });
  return { ok: true };
});
export const rebuildLeague = onCall(async (request) => {
  await requireAdmin(request);
  const users = data(await db.collection("users").get()),
    games = data(await db.collection("games").get());
  for (const g of games) await aggregateGame(g.id);
  for (const u of users) {
    await aggregateCommunity(u.uid);
    await buildHistory(u.uid);
  }
  return { ok: true };
});
export const deleteGame = onCall(async (request) => {
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
  const affected = data(await db.collection("users").get())
    .filter((u) => !u.disabled)
    .map((u) => u.uid);
  await db.recursiveDelete(ref);
  await db.doc(`gameSummaries/${id}`).delete();
  await db.doc(`gameBalances/${id}`).delete();
  await Promise.all(affected.map(buildHistory));
  return { ok: true };
});
export const adminMessage = onCall(async (request) => {
  await requireAdmin(request);
  const { title, body } = request.data;
  if (
    typeof title !== "string" ||
    typeof body !== "string" ||
    title.length > 80 ||
    body.length > 500 ||
    !title.trim() ||
    !body.trim()
  )
    throw new HttpsError("invalid-argument", "Mensagem inválida.");
  const users = data(await db.collection("users").get()).filter(
    (u) => !u.disabled,
  );
  const id = `admin-${Date.now()}`;
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
  return { ok: true };
});
export const saveTheme = onCall(async (request) => {
  await requireAdmin(request);
  const { name, colors, texture, design, baseTheme } = request.data;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 40 ||
    !colors ||
    !["primary", "secondary", "text", "border", "glow"].every((k) =>
      /^#[0-9a-f]{6}$/i.test(colors[k] || ""),
    ) ||
    (design !== undefined && !validCardDesign(design)) ||
    (baseTheme !== undefined &&
      ![...THEMES, "custom-test"].includes(baseTheme)) ||
    !["diagonal", "radial", "plain"].includes(texture)
  )
    throw new HttpsError("invalid-argument", "Tema inválido.");
  const r = await db.collection("cardThemes").add({
    name,
    colors,
    texture,
    ...(design ? { design } : {}),
    ...(baseTheme ? { baseTheme } : {}),
    experimental: true,
    createdBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: r.id };
});
export const correctRating = onCall(async (request) => {
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
    tx.update(ref, {
      [kind === "game" ? "ratings" : "ratings20"]: ratings,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});

export const saveWeeklyCardPhoto = onCall(async (request) => {
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
      history.data()?.locked ||
      cardWeek().phase !== "open" ||
      cardWeek().weekId !== weekId
    )
      throw new HttpsError("failed-precondition", "Esta carta está fechada.");
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
      await validate(tx);
      const ref = db.doc(`weeklyCardPhotos/${uid}_${weekId}`);
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
  await buildHistory(uid);
  return { ok: true, photoURL: reset === true ? "" : photoURL };
});

export const initializeOvrPresets = onCall(async (request) => {
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
export const saveOvrPreset = onCall(async (request) => {
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
} = eventFunctions(buildHistory);

export const {
  onGameNotifications,
  onEventNotifications,
  scheduledNotifications,
} = notificationFunctions(notification);
