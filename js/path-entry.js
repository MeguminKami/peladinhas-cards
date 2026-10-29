import {
  PATH_FUSIONS,
  pathNode,
  pathRoute,
  pathVisibleRoute,
  pathObjectiveText,
  pathRewardPreview,
} from "./path-model.js";
import { PATH_CARD_EDITIONS } from "./path-card-designs.js";
import { pathUsesRatings } from "./path-window.js";
import { pathObjectiveRequirements } from "./path-missions.js";

export function pathReviewText(deadline, now = Date.now()) {
  const minutes = Math.max(0, Math.ceil((deadline - now) / 60000));
  return minutes
    ? `Em avaliação · faltam ${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
    : "Prazo terminado · A apurar";
}

export function pathMissionEntry(
  state,
  { rewards = [], uid = state?.uid } = {},
) {
  const active = state?.active || state?.pending?.[0],
    result = state?.lastResult;
  const node = pathNode(active?.nodeId);
  const discovery = PATH_FUSIONS.find(
    (fusion) =>
      !(state?.unifiedFusions || []).includes(fusion.id) &&
      fusion.routes.some((id) =>
        [0, 1].some((lane) => state?.nodes?.[`${id}-4-${lane}`]?.completedAt),
      ),
  );
  const frozen = !!(active?.frozenAt || active?.gameId);
  const review = active && state?.reviews?.[active.id];
  const needsReview = review && !review.acknowledgedAt;
  const stateText = needsReview
    ? "Decisão administrativa pendente · Os outros percursos continuam disponíveis"
    : frozen
    ? active.reviewDeadline
      ? pathReviewText(active.reviewDeadline)
      : "Escolha bloqueada · Missão associada a um jogo"
    : active
      ? `Missão preparada para o próximo jogo${state?.pending?.length ? ` · ${state.pending.length} em avaliação` : ""}`
      : discovery
        ? `Nova possibilidade: ${discovery.label}`
        : result?.reward?.specialId
          ? `Carta permanente conquistada: ${PATH_CARD_EDITIONS[result.reward.specialId]?.name || "A tua assinatura"}`
          : "Ainda não escolheste uma missão neste caminho. O progresso anterior mantém-se.";
  return {
    id: "player-path",
    type: "PLAYER_PATH",
    icon: "path",
    href: "#/missions/path",
    mission:
      active && node
        ? {
            nodeId: node.id,
            nodeNumber: node.tier + 1,
            nodeLabel: node.label,
            routeLabel: pathRoute(node.route).label,
            offer: active.offer,
            boosts: pathRewardPreview(node, rewards, uid),
            cardName:
              node.specialId ||
              (active.offer.legacyFinalEligible &&
                (node.tier === 9 ||
                  (node.style === "fusion" && node.tier === 0)))
                ? pathRoute(node.route).cardName
                : null,
            counts: frozen ? active.ratingCounts || {} : null,
            rated: pathUsesRatings(active.offer.objective),
            criteria: pathObjectiveRequirements(active.offer.objective)
              .criteria,
          }
        : null,
    title: active
      ? pathObjectiveText(active.offer.objective)
      : result?.status === "failure"
        ? "Novo jogo. Nova oportunidade."
        : "Escolhe o teu próximo desafio",
    description: active
      ? `${pathNode(active.nodeId)?.label || "O teu percurso"} · ${active.waitingReason || "No próximo jogo em que participares."}`
      : "Explora o teu caminho, conquista atributos e desbloqueia cartas permanentes.",
    done: state?.nodes?.[active?.nodeId || result?.nodeId]?.progress || 0,
    total: 100,
    reviewDeadline: needsReview ? null : active?.reviewDeadline || null,
    stateText,
    stateIcon: frozen
      ? active.reviewDeadline
        ? "ratingAverage"
        : "lock"
      : result?.reward?.specialId
        ? "gift"
        : "path",
    started:
      !!state?.activePath ||
      !!state?.selectedNode ||
      !!active ||
      Object.keys(state?.nodes || {}).length > 0,
    routeLabel:
      pathRoute(
        pathVisibleRoute(
          state || {},
          pathNode(active?.nodeId || state?.selectedNode)?.route ||
            state?.activePath,
        ),
      )?.label || "A tua próxima especialização",
  };
}
