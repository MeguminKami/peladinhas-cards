import { AUTOMATION_SCHEDULE } from "./automation-cycle.js";
import { writeMaintenanceSignals } from "./maintenance-inputs.js";
import { pathGameCoreSignature } from "./path-game-signature.js";
import { sameData } from "./equal-data.js";
import { nextHomeBoundary } from "../js/data-boundary.js";
import {
  pathHistoricalSummary,
  pathWindowResult,
  pathReviewDeadline,
  pathUsesRatings,
  PATH_REVIEW_MS,
} from "../js/path-window.js";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  policyCall,
  policyWritten,
  policySchedule,
  assertFeature,
} from "./policy-runtime.js";
import {
  policyAt,
  policyVersion,
  rewardBudget,
  canManage,
} from "../js/system-policy.js";
import {
  emptyPathState,
  activatePathState,
  pathNode,
  nodeAvailable,
  createPathOffers,
  nextPathGame,
  evaluatePathMission,
  settlePathState,
  pathRewardPreview,
  pathTime,
  PATH_VERSION,
  rerollPathOffers,
  pathEarnedStats,
  upgradePathProposals,
  unifyPathState,
  pathVisibleRoute,
  pathRoute,
  pathOfferAvailable,
  pathRecentFamilies,
} from "../js/path-model.js";
import { participants } from "../js/utils.js";

const rows = (snap) => snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
const reject = (message) => {
  throw new HttpsError("failed-precondition", message);
};
// Store compact signatures so a correction is visible without silently rewriting achievements.
export function pathGameSignature(game) {
  const keys = [
    "status",
    "scheduledAt",
    "closedAt",
    "teamA",
    "teamB",
    "score",
    "performance",
    "positions",
  ];
  // Feedback is a snapshot at settlement: normal subsequent votes must not freeze the path.
  return createHash("sha256")
    .update(
      JSON.stringify({
        game: Object.fromEntries(keys.map((key) => [key, game?.[key] ?? null])),
      }),
    )
    .digest("hex");
}

export function pathFunctions(rebuildPlayer) {
  const db = () => getFirestore();
  async function transaction(uid, input = { action: "sync" }, settle = false) {
    return db().runTransaction(async (tx) => {
      const ref = db().doc(`pathStates/${uid}`);
      const [
        profileSnap,
        stateSnap,
        guardSnap,
        gameSnap,
        summarySnap,
        rewardSnap,
        attemptsSnap,
      ] = await Promise.all([
        tx.get(db().doc(`users/${uid}`)),
        tx.get(ref),
        tx.get(db().doc("gameFlow/open")),
        tx.get(db().collection("games")),
        tx.get(db().collection("gameSummaries")),
        tx.get(db().collection("eventRewards").where("uid", "==", uid)),
        input.reviewGameId
          ? tx.get(
              ref
                .collection("attempts")
                .where("gameId", "==", input.reviewGameId),
            )
          : Promise.resolve({ docs: [] }),
      ]);
      const profile = profileSnap.data();
      if (!profile || profile.disabled)
        throw new HttpsError("permission-denied", "Conta indisponível.");
      const stored = stateSnap.data() || emptyPathState(uid);
      let state = upgradePathProposals(stored);
      const migrated = state !== stored;
      const archived = rows(attemptsSnap);
      const knownAttempts = new Set(
        [...archived, ...state.history].map((attempt) => attempt.id),
      );
      state.history = [
        ...new Map(
          [...archived, ...state.history].map((attempt) => [
            attempt.id,
            attempt,
          ]),
        ).values(),
      ].sort((a, b) => a.settledAt.localeCompare(b.settledAt));
      if (state.version !== PATH_VERSION)
        reject(
          "O teu percurso precisa de uma atualização. Contacta a administração.",
        );
      const games = rows(gameSnap),
        summaries = rows(summarySnap),
        rewards = rows(rewardSnap);
      const nowMillis = Date.now();
      const now = new Date(nowMillis).toISOString();
      const historic = new Map(
        await Promise.all(
          [
            ...new Set(
              (state.pending || [])
                .filter((attempt) => settle && attempt.windowVersion >= 3 &&
                  pathUsesRatings(attempt.offer.objective) &&
                  games.find(game => game.id === attempt.gameId)?.status === "closed")
                .map((attempt) => attempt.gameId),
            ),
          ].map(async (gid) => {
            const deadline = (state.pending || []).find(row => row.gameId === gid)?.reviewDeadline || pathReviewDeadline((state.pending || []).find(row => row.gameId === gid)?.closedGame) || pathReviewDeadline(games.find(game => game.id === gid));
            const [votes, revisions] = await Promise.all([
              tx.get(db().collection(`games/${gid}/feedback`).where("targetId", "==", uid)),
              // Before the deadline the current votes are sufficient. Historical
              // revisions are only needed to reconstruct a past 48-hour cutoff.
              deadline && nowMillis >= deadline
                ? tx.get(db().collection(`games/${gid}/pathVoteRevisions`))
                : Promise.resolve({ docs: [] }),
            ]);
            return [gid, { votes: rows(votes), revisions: rows(revisions) }];
          }),
        ),
      );

      const excludedGames = () => [
        ...new Set([
          ...(state.excludedGameIds || []),
          ...state.history.map((row) => row.gameId).filter(Boolean),
          ...(state.pending || []).map((row) => row.gameId),
        ]),
      ];
      const writes = [];
      let changed = migrated;
      // Repair older preparations left behind when another path was activated.
      if (state.active && !state.active.gameId && !state.active.frozenAt && state.activePath &&
          pathVisibleRoute(state, pathNode(state.active.nodeId)?.route) !== state.activePath &&
          !games.some(game => game.status === "open" && !game.deleting && participants(game).includes(uid))) {
        const selected = pathNode(state.selectedNode);
        state = activatePathState(state, state.activePath,
          selected && pathVisibleRoute(state, selected.route) === state.activePath ? selected.id : null, now);
        changed = true;
      }
      // Manual decisions share the capped, idempotent automatic delivery.
      const manual = input.action === "resolveReview";
      if (manual) {
        if (!canManage(input.actor, "events"))
          throw new HttpsError("permission-denied", "Acesso reservado à gestão de eventos.");
        const review = state.reviews?.[input.attemptId];
        const attempt = (state.pending || []).find(row => row.id === input.attemptId);
        if (!review || review.acknowledgedAt || !attempt || state.history.some(row => row.id === input.attemptId) ||
            !["grant", "cancel"].includes(input.decision) ||
            typeof input.reason !== "string" || input.reason.trim().length < 5)
          reject("Indica uma tentativa em revisão, a decisão e o motivo.");
        state.reviews[input.attemptId] = { ...review, acknowledgedAt: now,
          acknowledgedBy: input.actorId, decision: input.decision,
          reason: input.reason.trim().slice(0, 500) };
        changed = true;
      }
      // Compatibility for earlier management clients.
      if (input.action === "acknowledge") {
        if (!canManage(input.actor, "events"))
          throw new HttpsError(
            "permission-denied",
            "Acesso reservado à gestão de eventos.",
          );
        const review = state.reviews?.[input.attemptId];
        if (
          !review ||
          typeof input.reason !== "string" ||
          input.reason.trim().length < 5
        )
          reject("Indica uma revisão válida e o motivo da decisão.");
        state.reviews[input.attemptId] = {
          ...review,
          acknowledgedAt: now,
          acknowledgedBy: input.actorId,
          reason: input.reason.trim().slice(0, 500),
        };
        changed = true;
      }
      for (const previous of state.history) {
        if (!settle || manual) break;
        if (!previous.signature) continue;
        const game = games.find((game) => game.id === previous.gameId);
        const signature = previous.signature.startsWith("core:")
          ? `core:${pathGameCoreSignature(game)}`
          : pathGameSignature(game);
        if (
          signature !== previous.signature &&
          state.reviews?.[previous.id]?.signature !== signature
        ) {
          state.reviews ||= {};
          state.reviews[previous.id] = {
            gameId: previous.gameId,
            nodeId: previous.nodeId,
            signature,
            detectedAt: now,
            acknowledgedAt: now, acknowledgedBy: "system", decision: "preserve",
            reason: "Resultado já entregue; a correção não reabre conquistas.",
          };
          changed = true;
        }
      }
      if (settle && !manual) {
        for (const [id, review] of Object.entries(state.reviews || {})) {
          if (!review.acknowledgedAt && !(state.pending || []).some(row => row.id === id)) {
            state.reviews[id] = { ...review, acknowledgedAt: now,
              acknowledgedBy: "system", decision: "preserve",
              reason: "Resultado já apurado; revisão encerrada automaticamente." };
            changed = true;
          }
        }
      }
      for (const attemptId of [
        ...(state.pending || []).map((row) => row.id),
        ...(state.active ? [state.active.id] : []),
      ]) {
        if (!settle) break;
        if (manual && attemptId !== input.attemptId) continue;
        const active =
          (state.pending || []).find((row) => row.id === attemptId) ||
          (state.active?.id === attemptId ? state.active : null);
        if (!active || (!active.frozenAt && active.offer.proposalVersion >= 3))
          continue;
        let game = games.find((game) => game.id === active.gameId);
        if (
          !active.frozenAt &&
          (!game ||
            !participants(game).includes(uid) ||
            !["open", "closed"].includes(game.status) ||
            game.deleting ||
            pathTime(game.scheduledAt) <= pathTime(active.acceptedAt))
        ) {
          game = nextPathGame(games, uid, active.acceptedAt, excludedGames());
        } else if (
          !active.frozenAt &&
          game &&
          game.status === "open" &&
          pathTime(game.scheduledAt) > Date.now()
        ) {
          // A newly scheduled earlier participation becomes the next game; once started, the binding is fixed.
          game = nextPathGame(games, uid, active.acceptedAt, excludedGames());
        }
        if (!active.frozenAt && (game?.id || null) !== active.gameId) {
          active.gameId = game?.id || null;
          changed = true;
        }
        if (active.closedGame && (!game || !["open", "closed"].includes(game.status) || game.deleting) && !manual) {
          if (!state.reviews?.[active.id] || state.reviews[active.id].acknowledgedAt) {
            state.reviews ||= {};
            state.reviews[active.id] = { gameId: active.gameId, nodeId: active.nodeId,
              detectedAt: now, pending: true,
              reason: "O jogo foi retirado depois do fecho; falta informação para apurar automaticamente." };
            changed = true;
          }
          continue;
        }
        if (!manual && state.reviews?.[active.id] && !state.reviews[active.id].acknowledgedAt) {
          state.reviews[active.id] = { ...state.reviews[active.id], acknowledgedAt: now,
            acknowledgedBy: "system", decision: "automatic",
            reason: "Apuramento automático com os dados corrigidos e o prazo original." };
          changed = true;
        }
        // Corrections never restart the original voting window.
        const originalDeadline = active.reviewDeadline || pathReviewDeadline(active.closedGame);
        if (game?.status === "closed" && originalDeadline)
          game = { ...game, closedAt: Timestamp.fromMillis(originalDeadline - PATH_REVIEW_MS) };
        const history = historic.get(game?.id);
        const summary =
          active.windowVersion >= 3 && game?.status === "closed" && history
            ? pathHistoricalSummary(
                game,
                history?.votes || [],
                history?.revisions || [],
                Math.min(nowMillis, pathReviewDeadline(game) || nowMillis),
              )
            : summaries.find((summary) => summary.id === game?.id);
        const result = manual
          ? { status: input.decision === "grant" ? "success" : "cancelled",
              reason: "Decisão da administração: " + input.reason.trim().slice(0, 500),
              administrativeDecision: input.decision, decidedBy: input.actorId }
          : active.frozenAt
          ? active.windowVersion >= 3
            ? pathWindowResult(
                active.offer.objective,
                game,
                summary,
                uid,
                nowMillis,
                evaluatePathMission,
              )
            : !game ||
                !participants(game).includes(uid) ||
                !["open", "closed"].includes(game.status)
              ? {
                  status: "cancelled",
                  reason:
                    "Jogo cancelado ou participação removida. O progresso mantém-se.",
                }
              : evaluatePathMission(active.offer.objective, game, summary, uid)
          : game && pathTime(game.scheduledAt) > Date.now()
            ? { status: "waiting", reason: "À espera do próximo jogo." }
            : evaluatePathMission(active.offer.objective, game, summary, uid);
        if (
          result.reviewDeadline &&
          active.reviewDeadline !== result.reviewDeadline
        ) {
          active.reviewDeadline = result.reviewDeadline;
          changed = true;
        }
        if (active.windowVersion >= 3 && game?.status === "closed") {
          const counts = summary?.players?.[uid]?.ratingQuorumCounts || summary?.players?.[uid]?.ratingCounts || {};
          if (JSON.stringify(active.ratingCounts) !== JSON.stringify(counts)) {
            active.ratingCounts = counts;
            changed = true;
          }
        }

        if (active.waitingReason !== result.reason) {
          active.waitingReason = result.reason;
          changed = true;
        }
        if (["success", "failure", "cancelled"].includes(result.status)) {
          assertFeature("missions");
          const settled = {
            ...active,
            signature: `core:${pathGameCoreSignature(games.find(row => row.id === active.gameId))}`,
          };
          state = settlePathState(state, settled, result, now);
          changed = true;
          for (const completedId of state.lastResult.completedNodeIds || []) {
            assertFeature("claims");
            if (!policyAt().rules.allowPermanent)
              reject(
                "As recompensas permanentes estão pausadas pela liga. A conclusão fica por entregar.",
              );
            const canonical = pathNode(completedId),
              node =
                ((canonical.tier === 9 &&
                  canonical.lane === 0 &&
                  canonical.style !== "fusion") ||
                  (canonical.style === "fusion" &&
                    canonical.tier === 0 &&
                    (active.offer.proposalVersion < 3 ||
                      active.offer.legacyFinalEligible))) &&
                (!active.offer.proposalVersion ||
                  active.offer.legacyFinalEligible ||
                  canonical.style === "fusion")
                  ? { ...canonical, specialId: `path-${canonical.route}` }
                  : canonical,
              key = `path-${uid}-${node.id}`;
            if (!rewards.some((row) => row.id === key)) {
              const specialId =
                node.specialId &&
                !rewards.some(
                  (row) =>
                    !row.revokedAt && row.reward?.specialId === node.specialId,
                )
                  ? node.specialId
                  : null;
              const configured = {
                mode: specialId ? "both" : "stats",
                boosts: Object.fromEntries(
                  node.rewardKeys.map((key) => [key, 1]),
                ),
                statDuration: "permanent",
                cardDuration: "permanent",
                specialId,
                criterion: `Escolhe o teu caminho! · ${node.label}`,
              };
              const limited = pathRewardPreview(node, rewards, uid);
              // Apply the shared daily/weekly budgets as well as path/global attribute ceilings.
              const ownPolicy = {
                ...policyAt(),
                rewards: { ...policyAt().rewards, permanentAttribute: 25 },
              };
              const allocation = rewardBudget(
                { ...configured, boosts: limited },
                rewards.filter((row) => row.source === "path"),
                "path",
                new Date(now),
                ownPolicy,
              );
              if (
                allocation.reduced &&
                ["reject", "defer"].includes(allocation.overflow)
              )
                reject(
                  "O orçamento de recompensas está esgotado. A conclusão fica por entregar; tenta novamente quando houver orçamento.",
                );
              const reward = { ...configured, boosts: allocation.boosts };
              writes.push([
                db().doc(`eventRewards/${key}`),
                {
                  uid,
                  source: "path",
                  pathNodeId: node.id,
                  pathVersion: PATH_VERSION,
                  schemaVersion: 2,
                  policyVersion: policyVersion(),
                  deliveryPolicy: policyAt().rewards,
                  configuredReward: configured,
                  reward,
                  pending: false,
                  startsAt: now,
                  cardStartsAt: now,
                  createdAt: now,
                  deliveredAt: now,
                  expiresAt: null,
                  gameId: active.gameId,
                },
              ]);
              rewards.push({ id: key, ...writes.at(-1)[1] });
              state.lastResult.rewards ||= [];
              state.lastResult.rewards.push({ nodeId: node.id, ...reward });
              state.lastResult.reward = reward;
              state.history[state.history.length - 1].reward = reward;
              state.rebuildPending = true;
            }
          }
        }
      }
      if (!["sync", "acknowledge", "resolveReview"].includes(input.action)) {
        assertFeature("missions");
        if (!policyAt().rules.allowPermanent)
          reject("As recompensas permanentes estão pausadas pela liga.");
        if (
          ["accept", "abandon", "reroll", "activate", "unify"].includes(
            input.action,
          ) &&
          games.some(
            (game) =>
              game.status === "open" &&
              !game.deleting &&
              participants(game).includes(uid),
          )
        )
          reject(
            "O teu jogo está aberto. A missão fica bloqueada até ao fecho.",
          );
        const node = pathNode(input.nodeId);
        if (input.action === "unify") {
          try {
            state = unifyPathState(state, input.routeId);
            state = activatePathState(state, input.routeId, state.selectedNode, now);
          } catch (error) {
            reject(error.message);
          }
          changed = true;
        } else if (input.action === "activate") {
          const route = pathRoute(input.routeId);
          if (!route || input.routeId.startsWith("fusion-"))
            reject("Ativa uma especialização válida ou desbloqueia a fusão.");
          state = activatePathState(state, route.id, null, now);
          changed = true;
        } else if (input.action === "select") {
          if (!node) reject("Escolhe um percurso válido.");
          if (games.some(game => game.status === "open" && !game.deleting && participants(game).includes(uid))) {
            state.selectedNode = node.id;
            state.revision++;
          } else if (node.style === "fusion" && !(state.unifiedFusions || []).includes(node.route)) {
            state.selectedNode = node.id;
            state.revision++;
          } else {
            state = activatePathState(state, node.route, node.id, now);
          }
          changed = true;
        } else if (input.action === "offers") {
          if (
            !node ||
            !nodeAvailable(node, state) ||
            state.nodes[node.id]?.completedAt
          )
            reject("Este nó ainda não está disponível.");
          if (!state.offers[node.id]) {
            state.offers[node.id] = createPathOffers(
              node,
              () => randomInt(1_000_000) / 1_000_000,
              pathEarnedStats(rewards, uid),
              { recentFamilies: pathRecentFamilies(state, node.route) },
            );
            changed = true;
          }
        } else if (input.action === "reroll") {
          if (
            !node ||
            !nodeAvailable(node, state) ||
            state.nodes[node.id]?.completedAt
          )
            reject("Este nó não está disponível para renovar propostas.");
          try {
            state = rerollPathOffers(
              state,
              node,
              now,
              () => randomInt(1_000_000) / 1_000_000,
              pathEarnedStats(rewards, uid),
            );
          } catch (error) {
            reject(error.message);
          }
          changed = true;
        } else if (input.action === "accept") {
          if (
            !node ||
            !nodeAvailable(node, state) ||
            state.nodes[node.id]?.completedAt
          )
            reject("Este nó ainda não está disponível.");
          const offer = state.offers[node.id]?.find(
            (offer) => offer.id === input.offerId,
          );
          if (!offer) reject("Escolhe uma das propostas disponíveis.");
          if (!pathOfferAvailable(node, offer, state))
            reject(
              "Este desafio pode afetar um nó em avaliação. Aguarda o apuramento ou escolhe outra proposta.",
            );
          if (
            node.style === "fusion" &&
            !(state.unifiedFusions || []).includes(node.route)
          ) {
            try {
              state = unifyPathState(state, node.route);
            } catch (error) {
              reject(error.message);
            }
          }

          const game =
            offer.proposalVersion >= 3
              ? null
              : nextPathGame(games, uid, now, excludedGames());
          // A player with no scheduled match may commit now; the first eligible future game binds later.
          state.active = {
            id: randomUUID(),
            nodeId: node.id,
            offer,
            gameId: game?.id || null,
            acceptedAt: now,
            waitingReason: "À espera do próximo jogo.",
          };
          state.activePath = pathVisibleRoute(state, node.route);
          state.selectedNode = node.id;
          state.revision++;
          changed = true;
        } else if (input.action === "abandon") {
          if (!state.active) reject("Não tens uma missão ativa.");
          const active = state.active;
          const game = games.find((game) => game.id === active.gameId);
          if (
            game?.status === "open" &&
            +new Date(game.scheduledAt?.toDate?.() || game.scheduledAt) <=
              Date.now()
          )
            reject("O jogo já começou. Aguarda o resultado antes de desistir.");
          // Removing a prepared choice never resets progress. Frozen attempts live in pending.

          if (active.gameId)
            state.excludedGameIds = [
              ...new Set([...(state.excludedGameIds || []), active.gameId]),
            ];
          state.history.push({
            ...active,
            status: "abandoned",
            settledAt: now,
            reason: "Missão preparada removida; progresso preservado.",
          });
          // Abandoning never rerolls proposals, including before a match is scheduled.
          state.active = null;
          state.revision++;
          changed = true;
        } else throw new HttpsError("invalid-argument", "Ação desconhecida.");
      }
      if (changed) {
        state.updatedAt = now;
        for (const [target, value] of writes) {
          tx.set(target, value);
          if (target.parent.id === "eventRewards")
            writeMaintenanceSignals(tx, "eventRewards", target.id, null, value);
        }
        for (const attempt of state.history)
          if (!knownAttempts.has(attempt.id)) {
            tx.set(ref.collection("attempts").doc(attempt.id), attempt);
            if (attempt.gameId)
              tx.set(
                db().doc(`pathGameLinks/${attempt.gameId}/players/${uid}`),
                { uid },
              );
          }
        // Keep the document comfortably below Firestore's 1 MiB limit on long careers.
        state.history = state.history.slice(-30);
        tx.set(ref, state);
        tx.set(db().doc(`homeSignals/${uid}`), { version: randomUUID() }, { merge: true });
        writeMaintenanceSignals(tx, "pathStates", uid, stored, state);
        tx.set(ref.collection("audit").doc(), {
          action: input.action,
          actorId: input.actorId || uid,
          at: now,
          revision: state.revision,
          activeAttempt: state.active?.id || null,
          result: state.lastResult?.id || null,
          ...(manual ? { attemptId: input.attemptId, decision: input.decision, reason: input.reason.trim().slice(0, 500) } : {}),
        });
      }
      return { ...state, history: state.history.slice(-30) };
    });
  }
  async function sync(uid, input, settle = false) {
    const state = await transaction(uid, input, settle);
    if (settle && state.rebuildPending) {
      await rebuildPlayer(uid);
      // Clear only the revision that was rebuilt; concurrent deliveries remain pending.
      await db().runTransaction(async (tx) => {
        const ref = db().doc(`pathStates/${uid}`),
          snap = await tx.get(ref);
        if (snap.data()?.revision === state.revision)
          tx.update(ref, { rebuildPending: false });
      });
    }
    return state;
  }
  const getPath = policyCall("getPath", async (request) => {
    // Read-only access still works while missions are paused.
    const state =
      (await db().doc(`pathStates/${request.auth.uid}`).get()).data() ||
      emptyPathState(request.auth.uid);
    return upgradePathProposals(state);
  });
  const pathAction = policyCall("pathAction", async (request) => {
    const input = request.data || {};
    if (input.action === "sync") {
      const state = (await db().doc(`pathStates/${request.auth.uid}`).get()).data() || emptyPathState(request.auth.uid);
      return upgradePathProposals(state);
    }
    if (["acknowledge", "resolveReview"].includes(input.action)) {
      if (
        typeof input.uid !== "string" ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(input.uid)
      )
        throw new HttpsError("invalid-argument", "Jogador inválido.");
      return sync(input.uid, {
        ...input,
        actor: request.systemActor,
        actorId: request.auth.uid,
      }, input.action === "resolveReview");
    }
    return sync(request.auth.uid, { ...input, actorId: request.auth.uid });
  });
  async function sweep({ gameId, summaryId, maintenance } = {}) {
    if (
      policyAt().features.mode !== "normal" ||
      policyAt().automation.events === false ||
      !policyAt().features.missions ||
      !policyAt().features.claims
    )
      return;
    const linked = gameId
      ? new Set(
          (
            await db().collection(`pathGameLinks/${gameId}/players`).get()
          ).docs.map((doc) => doc.id),
        )
      : new Set();
    const game = gameId ? (await db().doc(`games/${gameId}`).get()).data() : null;
    const ids = gameId ? [...new Set([...linked, ...participants(game || {})])] : [];
    const full = !maintenance || !maintenance.previous?.pathInitialized || maintenance.policyChanged ||
      maintenance.previous.fullVersion !== (maintenance.signal.fullVersion || null);
    let queued = [];
    if (maintenance) {
      const [pending, due] = await Promise.all([
        db().collection("pathRefreshWork").where("pending", "==", true).get(),
        db().collection("pathRefreshWork").where("nextAt", "<=", Date.now()).get(),
      ]);
      queued = [...new Map([...pending.docs, ...due.docs].map(doc => [doc.id, doc])).values()];
    }
    const states = gameId
      ? { docs: ids.length ? (await db().getAll(...ids.map(uid => db().doc(`pathStates/${uid}`)))).filter(doc => doc.exists) : [] }
      : full ? await db().collection("pathStates").get()
        : { docs: queued.length ? (await db().getAll(...queued.map(doc => db().doc(`pathStates/${doc.id}`)))).filter(doc => doc.exists) : [] };
    const failures = [];
    for (const doc of states.docs) {
      const state = doc.data();
      if (
        !state.active &&
        !state.pending?.length &&
        !state.rebuildPending &&
        !Object.values(state.reviews || {}).some(review => !review.acknowledgedAt) &&
        !linked.has(doc.id)
      )
        continue;
      if (
        summaryId &&
        state.active?.gameId &&
        state.active.gameId !== summaryId &&
        !(state.pending || []).some((row) => row.gameId === summaryId) &&
        !state.rebuildPending
      )
        continue;
      try {
        await sync(doc.id, {
          action: "sync",
          ...(linked.has(doc.id) ? { reviewGameId: gameId } : {}),
        }, true);
      } catch (error) {
        if (error.code !== "permission-denied")
          failures.push(`${doc.id}: ${error.message}`);
      }
    }
    if (failures.length) throw Error(failures.join("; "));
    if (maintenance) {
      for (const uid of new Set([...queued.map(doc => doc.id), ...states.docs.map(doc => doc.id)])) {
        const job = queued.find(doc => doc.id === uid);
        await db().runTransaction(async tx => {
          const ref = db().doc(`pathRefreshWork/${uid}`);
          const [current, state] = await tx.getAll(ref, db().doc(`pathStates/${uid}`));
          if (job ? current.data()?.token !== job.data().token : current.data()?.pending) return;
          const value = state.data();
          const needsClock = value?.active || value?.pending?.length || value?.rebuildPending;
          tx.set(ref, { pending: false, nextAt: needsClock ? nextHomeBoundary(value) : Number.MAX_SAFE_INTEGER }, { merge: true });
        });
      }
    }
    const next = maintenance ? await db().collection("pathRefreshWork").orderBy("nextAt").limit(1).get() : null;
    return { ok: true, nextAt: next?.docs[0]?.data().nextAt || nextHomeBoundary(states.docs.map(doc => doc.data())),
      checkpoint: { pathInitialized: true, fullVersion: maintenance?.signal.fullVersion || null } };
  }
  return {
    syncGame: (gameId) => sweep({ gameId }),
    getPath,
    pathAction,
    // Retain deployed trigger identities without performing intermediate sweeps.
    onPathGame: policyWritten("games/{gid}", () => {}, { disabled: true }),
    onPathSummary: policyWritten("gameSummaries/{gid}", () => {}, { disabled: true }),
    settlePaths: policySchedule(
      "settlePaths",
      { schedule: AUTOMATION_SCHEDULE, timeZone: "Europe/Lisbon" },
      event => sweep({ maintenance: event?.maintenance }),
    ),
  };
}
