import { pathGameCoreSignature } from "./path-game-signature.js";
import { nextHomeBoundary } from "../js/data-boundary.js";
import {
  pathHistoricalSummary,
  pathWindowResult,
  pathReviewDeadline,
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
  async function transaction(uid, input = { action: "sync" }) {
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
      const now = new Date().toISOString();
      const historic = new Map(
        await Promise.all(
          [
            ...new Set(
              (state.pending || [])
                .filter((attempt) => attempt.windowVersion >= 3)
                .map((attempt) => attempt.gameId),
            ),
          ].map(async (gid) => {
            const [votes, revisions] = await Promise.all([
              tx.get(db().collection(`games/${gid}/feedback`)),
              tx.get(db().collection(`games/${gid}/pathVoteRevisions`)),
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
      // An admin can acknowledge a correction, but cannot forge progress or award points.
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
          };
          changed = true;
        }
      }
      const blocked = Object.values(state.reviews || {}).some(
        (review) => !review.acknowledgedAt,
      );
      for (const attemptId of [
        ...(state.pending || []).map((row) => row.id),
        ...(state.active ? [state.active.id] : []),
      ]) {
        if (blocked) break;
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
        if ((game?.id || null) !== active.gameId) {
          active.gameId = game?.id || null;
          changed = true;
        }
        if (active.closedGame && game?.status === "closed") {
          const frozen = {
            ...active.closedGame,
            scheduledAt: Timestamp.fromDate(
              new Date(active.closedGame.scheduledAt),
            ),
            closedAt: game.closedAt,
          };
          const signature = active.closedCoreSignature
            ? `core:${pathGameCoreSignature(game)}`
            : pathGameSignature(game);
          if (
            (active.closedCoreSignature
              ? `core:${active.closedCoreSignature}`
              : pathGameSignature(frozen)) !== signature &&
            state.reviews?.[active.id]?.signature !== signature
          ) {
            state.reviews ||= {};
            state.reviews[active.id] = {
              gameId: game.id,
              nodeId: active.nodeId,
              signature,
              detectedAt: now,
              pending: true,
            };
            changed = true;
            break;
          }
          game = {
            ...frozen,
            status: game.status,
            deleting: game.deleting || false,
          };
        }
        const history = historic.get(game?.id);
        const summary =
          active.windowVersion >= 3 && game?.status === "closed"
            ? pathHistoricalSummary(
                game,
                history?.votes || [],
                history?.revisions || [],
                pathReviewDeadline(game),
              )
            : summaries.find((summary) => summary.id === game?.id);
        const result = active.frozenAt
          ? active.windowVersion >= 3
            ? pathWindowResult(
                active.offer.objective,
                game,
                summary,
                uid,
                Date.now(),
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
          const counts = summary?.players?.[uid]?.ratingCounts || {};
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
            signature: active.closedCoreSignature
              ? `core:${active.closedCoreSignature}`
              : pathGameSignature(game),
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
                  gameId: game.id,
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
      if (!["sync", "acknowledge"].includes(input.action)) {
        assertFeature("missions");
        if (!policyAt().rules.allowPermanent)
          reject("As recompensas permanentes estão pausadas pela liga.");
        if (
          Object.values(state.reviews || {}).some(
            (review) => !review.acknowledgedAt,
          )
        )
          reject(
            "Um jogo foi corrigido. A administração precisa de rever o percurso antes de continuares.",
          );
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
          } catch (error) {
            reject(error.message);
          }
          changed = true;
        } else if (input.action === "activate") {
          const route = pathRoute(input.routeId);
          if (!route || input.routeId.startsWith("fusion-"))
            reject("Ativa uma especialização válida ou desbloqueia a fusão.");
          state.activePath = pathVisibleRoute(state, route.id);
          state.revision++;
          changed = true;
        } else if (input.action === "select") {
          if (!node) reject("Escolhe um percurso válido.");
          state.selectedNode = node.id;
          state.revision++;
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
        for (const [target, value] of writes) tx.set(target, value);
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
        tx.set(ref.collection("audit").doc(), {
          action: input.action,
          actorId: input.actorId || uid,
          at: now,
          revision: state.revision,
          activeAttempt: state.active?.id || null,
          result: state.lastResult?.id || null,
        });
      }
      return { ...state, history: state.history.slice(-30) };
    });
  }
  async function sync(uid, input) {
    const state = await transaction(uid, input);
    if (state.rebuildPending) {
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
    if (input.action === "acknowledge") {
      if (
        typeof input.uid !== "string" ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(input.uid)
      )
        throw new HttpsError("invalid-argument", "Jogador inválido.");
      return sync(input.uid, {
        ...input,
        actor: request.systemActor,
        actorId: request.auth.uid,
      });
    }
    return sync(request.auth.uid, { ...input, actorId: request.auth.uid });
  });
  async function sweep({ gameId, summaryId } = {}) {
    if (
      policyAt().features.mode !== "normal" ||
      !policyAt().features.missions ||
      !policyAt().features.claims
    )
      return;
    const states = await db().collection("pathStates").get();
    const linked = gameId
      ? new Set(
          (
            await db().collection(`pathGameLinks/${gameId}/players`).get()
          ).docs.map((doc) => doc.id),
        )
      : new Set();
    const failures = [];
    for (const doc of states.docs) {
      const state = doc.data();
      if (
        !state.active &&
        !state.pending?.length &&
        !state.rebuildPending &&
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
        });
      } catch (error) {
        if (error.code !== "permission-denied")
          failures.push(`${doc.id}: ${error.message}`);
      }
    }
    if (failures.length) throw Error(failures.join("; "));
    return { ok: true, nextAt: nextHomeBoundary(states.docs.map(doc => doc.data())) };
  }
  return {
    syncGame: (gameId) => sweep({ gameId }),
    getPath,
    pathAction,
    onPathGame: policyWritten("games/{gid}", (event) =>
      sweep({ gameId: event.params.gid }),
    ),
    onPathSummary: policyWritten("gameSummaries/{gid}", (event) =>
      sweep({ summaryId: event.params.gid }),
    ),
    settlePaths: policySchedule(
      "settlePaths",
      { schedule: "0 * * * *", timeZone: "Europe/Lisbon" },
      () => sweep(),
    ),
  };
}
