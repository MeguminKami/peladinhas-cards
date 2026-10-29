import { pathMissionEntry, pathReviewText } from "./path-entry.js";
import { startRevisionUpdates } from "./revision-updates.js";
export { pathMissionEntry };
import { PATH_CARD_EDITIONS } from "./path-card-designs.js";
import { pathObjectiveLines, pathObjectiveRequirements } from "./path-missions.js";
import { pathReviewDeadline, pathUsesRatings } from "./path-window.js";
import {
  PATH_ROUTES,
  PATH_FUSIONS,
  PATH_NODES,
  pathNode,
  pathRoute,
  nodeStatus,
  nodeAvailable,
  pathObjectiveText,
  pathRewardPreview,
  pathAttributeLimit,
  pathRerollAvailable,
  pathVisibleRoute,
  pathOfferAvailable,
  pathResultAwards,
} from "./path-model.js";
import { rarityBadge, eventRarityId } from "./event-rarity.js";
import { ATTRIBUTES, participants } from "./utils.js";
import { policyAt } from "./system-policy.js";
import { esc } from "./ui.js";
import { icon } from "./icons.js";
import { card, bindImages } from "./cards.js";
import { linkButton, busy, toast, modal, closeModal } from "./ui.js";
import * as DB from "./db.js";

const missionScope = (frozen = false) => `<span class="path-mission-scope">${icon("games")}${frozen ? "Escolhida para o próximo jogo" : "No próximo jogo"}</span>`;
const missionTitle = (offer) => esc(offer.title || pathObjectiveText(offer.objective));
const missionConditions = (offer) => offer.objective.kind === "conditions"
  ? `<ul class="path-mission-conditions" aria-label="Condições da missão">${pathObjectiveLines(offer.objective).map((line) => `<li>${esc(line)}</li>`).join("")}</ul>` : "";

export function pathMissionSpotlight(entry) {
  const progress = Math.min(100, Math.max(0, entry.done || 0));
  const reviewText = entry.reviewDeadline ? pathReviewText(entry.reviewDeadline) : entry.stateText;
  if (entry.mission) {
    const mission = entry.mission;
    const lines =
      mission.offer.objective.kind === "conditions"
        ? pathObjectiveLines(mission.offer.objective)
        : [pathObjectiveText(mission.offer.objective)];
    return `<a class="path-mission-spotlight has-chosen-mission event-rarity-surface" data-rarity="${eventRarityId(mission.offer)}" href="${esc(entry.href)}/${esc(mission.nodeId)}">
<div class="path-chosen-header"><span class="path-chosen-brand"><span>Escolhe o teu caminho</span>${icon("path")}</span>${rarityBadge(mission.offer)}</div>
<div class="path-chosen-objective"><div class="path-spotlight-copy"><p class="path-chosen-node">${esc(mission.routeLabel)} <span>· Nó ${String(mission.nodeNumber).padStart(2, "0")} · ${esc(mission.nodeLabel.split(" · ")[0])}</span></p>
${missionScope(!!mission.counts)}<h2>${esc(lines.length === 1 ? lines[0] : mission.offer.title || "A tua missão")}</h2>
${lines.length > 1 ? `<ul class="path-mission-conditions">${lines.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>` : ""}
${mission.counts ? `<p class="path-chosen-review">${icon(entry.stateIcon || "lock")}<span${entry.reviewDeadline ? ` data-path-review="${entry.reviewDeadline}"` : ""}>${esc(reviewText)}</span></p>${mission.rated ? `<p class="path-spotlight-votes">${mission.criteria.map((key) => `${esc({ attack: "Ataque", passing: "Passe", physical: "Físico", defense: "Defesa", goalkeeping: "GR", attitude: "Atitude" }[key])}: <b>${mission.counts[key] || 0}/7 votos</b>`).join(" · ")}</p>` : ""}` : ""}</div>
<div class="path-chosen-advance"><strong>+${mission.offer.advance}<small>%</small></strong><span>avanço se cumprires</span></div></div>
<div class="path-chosen-outcome"><div class="path-chosen-progress"><span class="path-chosen-label">PROGRESSO DO NÓ <b>${progress}%</b></span><span class="path-spotlight-meter" role="progressbar" aria-label="Progresso atual do nó" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="--progress:${progress}%"></i></span><small>O avanço extra passa ao nó seguinte.</small></div>
<div class="path-chosen-prize"><span class="path-chosen-label">RECOMPENSA DO NÓ (AOS 100%)</span><div class="path-chosen-rewards">${pathRewardMarkup(mission.boosts, mission.cardName)}</div></div></div>
<span class="path-spotlight-cta">Ver missão e percurso${icon("arrow")}</span></a>`;
  }
  return `<a class="path-mission-spotlight" href="${esc(entry.href)}"><div class="path-spotlight-copy"><p class="eyebrow">${icon("path")}EVOLUÇÃO PESSOAL</p><h2>Escolhe o teu <br><em>caminho!</em></h2><span class="path-spotlight-route">${esc(entry.routeLabel)}</span><p class="path-spotlight-objective">${esc(entry.title)}</p>${entry.stateText ? `<p class="path-spotlight-state">${icon(entry.stateIcon || "path")}${esc(entry.stateText)}</p>` : ""}<span class="path-spotlight-cta">${entry.started ? "Continuar o meu caminho" : "Descobrir o meu primeiro caminho"}${icon("arrow")}</span></div><div class="path-spotlight-art" aria-hidden="true"><svg viewBox="0 0 260 210"><path class="spotlight-pitch" d="m20 180 55-150h155l-55 150ZM48 105h155M152 30 96 180"/><path class="spotlight-trail" d="m55 166 41-57 56 22 42-74"/><circle cx="55" cy="166" r="7"/><circle cx="96" cy="109" r="10"/><circle cx="152" cy="131" r="7"/><path class="spotlight-goal" d="m194 36 6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2Z"/></svg><span>O TEU JOGO.<br>A TUA ASSINATURA.</span></div>${progress ? `<span class="path-spotlight-progress" aria-label="Avanço do nó: ${progress}%"><i style="--progress:${progress}%"></i><b>${progress}%</b></span>` : ""}</a>`;
}
const names = Object.fromEntries(ATTRIBUTES.map(([key, name]) => [key, name]));
function pathRewardMarkup(boosts, cardName) {
  return (
    Object.entries(boosts)
      .map(
        ([key, value]) =>
          `<span class="path-reward-chip${!value ? " is-capped" : ""}"><strong class="path-reward-value">+${String(value).replace(".", ",")}</strong><span class="path-reward-copy"><b class="path-reward-name">${esc(names[key])}</b><small>${value ? "Ponto permanente" : "Limite atingido"}</small></span></span>`,
      )
      .join("") +
    (cardName
      ? `<span class="path-reward-card">${icon("trophy")}<span class="path-reward-copy"><b class="path-reward-name">${esc(cardName)}</b><small>Carta permanente</small></span></span>`
      : "")
  );
}
const difficulty = ["Acessível", "Exigente", "Difícil"];
const statusLabel = {
  complete: "Conquistado",
  available: "Disponível",
  active: "Em jogo",
  locked: "Por desbloquear",
  reserved: "Reservado para apuramento",
};
const progressRing = (value, label) =>
  `<span class="path-ring" style="--fill:${Math.min(100, Math.max(0, value))};--target-fill:${Math.min(100, Math.max(0, value))}" role="img" aria-label="${esc(label)}"><b>${value}<small>%</small></b></span>`;

export async function pathsPage(ctx, requestedNodeId) {
  let state = await DB.getPath(),
    selected = pathNode(requestedNodeId) ? requestedNodeId : state.active?.nodeId || state.selectedNode || "shooting-0-0";
  let routeId = pathNode(selected)?.route || "shooting",
    chapter = Math.floor((pathNode(selected)?.tier || 0) / 5);
  let disposed = false,
    inFlight = false,
    seen = null,
    seenCards = new Set(),
    animatedResult = null,
    animateResult = false,
    editingPrepared = false;
  let lastPoll = Date.now();
  const observeChanges = typeof DB.watchHomeSignals === "function";
  const clock = setInterval(() => {
    if (disposed) return;
    document.querySelectorAll("[data-path-deadline]").forEach((el) => {
      el.textContent = remainingTime(Number(el.dataset.pathDeadline));
    });
    if (
      !observeChanges && !document.hidden &&
      !document.querySelector("[role=dialog]") &&
      !inFlight &&
      (state.pending || []).length &&
      Date.now() - lastPoll >= 60000
    ) {
      lastPoll = Date.now();
      action(null, "sync", {}, true);
    }
  }, 1000);
  ctx.cleanup(() => {
    disposed = true;
    clearInterval(clock);
  });
  if (observeChanges) ctx.cleanup(startRevisionUpdates({
    subscribe: (changed, error) => DB.watchHomeSignals(ctx.user.uid, changed, error), ignoreInitial: true,
    isCurrent: () => !disposed && (location.hash === "#/missions/path" || location.hash.startsWith("#/missions/path/")),
    validUntil: Math.min(...[state.active, ...(state.pending || [])].map(attempt => attempt?.reviewDeadline).filter(deadline => deadline > Date.now())),
    refresh: async () => {
      if (document.querySelector("[role=dialog]") || inFlight) throw Error("Aguardar a interação em curso");
      await action(null, "sync", {}, true);
      return { validUntil: Math.min(...[state.active, ...(state.pending || [])].map(attempt => attempt?.reviewDeadline).filter(deadline => deadline > Date.now())) };
    },
  }));
  function remainingTime(deadline) {
    const minutes = Math.max(0, Math.ceil((deadline - Date.now()) / 60000));
    return minutes
      ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
      : "A apurar resultado";
  }
  function pendingPanel() {
    if (!state.pending?.length) return "";
    return `<section class="path-pending" aria-labelledby="path-pending-title"><div class="section-head"><h2 id="path-pending-title">O jogo continua a contar</h2><span class="pill">${state.pending.length} em acompanhamento</span></div><div class="path-pending-list">${state.pending
      .map((attempt) => {
        const game = (ctx.league.games || []).find(
          (game) => game.id === attempt.gameId,
        );
        const review = state.reviews?.[attempt.id];
        const needsReview = review && !review.acknowledgedAt;
        const deadline = !needsReview && pathUsesRatings(attempt.offer.objective)
          ? attempt.reviewDeadline || pathReviewDeadline(game)
          : 0;
        const criteria = pathObjectiveRequirements(attempt.offer.objective).criteria;
        return `<article class="path-pending-attempt"><span class="path-pending-symbol">${icon(deadline ? "ratingAverage" : "lock")}</span><div><p class="eyebrow">${esc(pathRoute(pathNode(attempt.nodeId)?.route)?.label || "O teu percurso")}</p>${missionScope(true)}<h3>${missionTitle(attempt.offer)}</h3>${missionConditions(attempt.offer)}<p>${needsReview ? "Decisão administrativa pendente · Podes continuar noutros nós disponíveis." : deadline && pathUsesRatings(attempt.offer.objective) ? `Avaliações · <strong data-path-deadline="${deadline}">${remainingTime(deadline)}</strong>` : game?.status === "closed" || attempt.closedGame?.status === "closed" ? "Resultado em apuramento." : "Missão bloqueada para este jogo."}</p>${deadline && pathUsesRatings(attempt.offer.objective) ? `<p class="path-vote-counts">${criteria.map((key) => `${esc({ attack: "Ataque", passing: "Passe", physical: "Físico", defense: "Defesa", goalkeeping: "GR", attitude: "Atitude" }[key] || key)}: <b>${attempt.ratingCounts?.[key] || 0}/7 votos</b>`).join(" · ")}</p><p>Entrega antecipada com sete votos por critério e sucesso garantido, assumindo duas estrelas em cada voto em falta. Caso contrário, apura às 48 horas; sem sete votos por critério, cancela sem perder progresso.</p>` : ""}<div class="path-pending-actions"><button class="btn btn-ghost" data-path-node="${attempt.nodeId}">Ver nó${icon("arrow")}</button>${linkButton(`#/game/${attempt.gameId}`, "Ver jogo", "ghost", "games")}</div></div></article>`;
      })
      .join(
        "",
      )}</div><p class="path-pending-note">${choiceLocked() ? "O teu jogo está aberto. A escolha desta partida está bloqueada." : "Os nós em avaliação ficam reservados. Podes preparar outra missão num percurso disponível para o próximo jogo."}</p></section>`;
  }
  try {
    seen = sessionStorage.getItem(`path-result-${ctx.user.uid}`);
    seenCards=new Set(JSON.parse(sessionStorage.getItem(`path-card-results-${ctx.user.uid}`) || "[]"));
    if(seen)seenCards.add(seen);
  } catch {}
  const player =
    ctx.league.players.find((player) => player.uid === ctx.user.uid) ||
    ctx.user;
  const paused = () =>
    policyAt().features.mode !== "normal" ||
    !policyAt().features.missions ||
    !policyAt().features.claims ||
    !policyAt().rules.allowPermanent;
  const choiceLocked = () =>
    (ctx.league.games || []).some(
      (game) =>
        game.status === "open" && participants(game).includes(ctx.user.uid),
    );
  function stateLabel(node, status) {
    if (Object.values(state.reviews || {}).some(review => review.pending && review.nodeId === node.id && !review.acknowledgedAt)) return "Decisão administrativa pendente";
    const pending = (state.pending || []).find(
      (attempt) => attempt.nodeId === node.id,
    );
    if (pending)
      return pending.reviewDeadline ? "Em avaliação" : "Missão bloqueada";
    return state.active?.nodeId === node.id
      ? "Missão preparada"
      : statusLabel[status];
  }
  function specialForNode(node) {
    if (node.specialId) return node.specialId;
    const legacy =
      (state.offers[node.id] || []).some(
        (offer) => offer.legacyFinalEligible,
      ) ||
      (state.active?.nodeId === node.id &&
        state.active.offer.legacyFinalEligible) ||
      (state.pending || []).some(
        (attempt) =>
          attempt.nodeId === node.id && attempt.offer.legacyFinalEligible,
      );
    return legacy &&
      (node.tier === 9 || (node.style === "fusion" && node.tier === 0))
      ? `path-${node.route}`
      : null;
  }
  function rewardPreview(node) {
    const delivered =
      state.nodes[node.id]?.completedAt &&
      (ctx.league.eventRewards || []).find(
        (row) =>
          row.uid === ctx.user.uid &&
          row.pathNodeId === node.id &&
          !row.revokedAt &&
          !row.pending,
      );
    if (delivered?.reward)
      return Object.fromEntries(
        node.rewardKeys.map((key) => [
          key,
          delivered.reward.boosts?.[key] || 0,
        ]),
      );
    return pathRewardPreview(node, ctx.league.eventRewards || [], ctx.user.uid);
  }
  function rewardText(node) {
    return pathRewardMarkup(rewardPreview(node), specialForNode(node) ? pathRoute(node.route).cardName : null);
  }
  function finalCard(route) {
    const id = `path-${route.id}`,
      unlocked =
        (player.specials || []).some((item) => item.id === id) ||
        state.history.some((row) => row.reward?.specialId === id);
    const requirement = route.routes
      ? `Conquista o marco 5 em ${route.routes.map((key) => pathRoute(key).label).join(" e ")}, ativa a fusão ${route.label} e completa os 5 nós do foco Combinação. A carta é desbloqueada ao atingir 100% no nó 5.`
      : `Avança no percurso de ${route.label} até ao nó ${pathAttributeLimit(route.id)} e completa-o a 100% para desbloquear esta carta.`;
    return `<div class="path-final-card ${unlocked ? "is-earned" : ""}"><div class="path-final-stage">${card(player, { preview: true, theme: id })}<span class="path-card-stamp">${icon(unlocked ? "check" : "lock")} ${unlocked ? "Conquistada" : "A tua recompensa final"}</span></div><div><p class="eyebrow">CARTA PERMANENTE</p><h3>${esc(route.cardName)}</h3><p>${unlocked ? "Já conquistaste esta carta. Está disponível na tua coleção, sem prazo de validade." : esc(requirement)}</p>${unlocked ? linkButton("#/profile", "Ver na minha coleção", "secondary", "profile") : ""}</div></div>`;
  }
  function nodeButton(node) {
    if (node.id === selected) return details();
    const status = nodeStatus(node, state),
      progress = state.nodes[node.id]?.progress || 0,
      preview = rewardPreview(node);
    return `<button type="button" class="path-node ${status}${animateResult && state.lastResult?.completed && state.lastResult.nodeId === node.id ? " just-earned" : ""}${selected === node.id ? " is-selected" : ""}" data-path-node="${node.id}" aria-pressed="${selected === node.id}" aria-label="${esc(node.label)}, ${stateLabel(node, status)}, ${progress}%, ${esc(Object.entries(preview).map(([key,value])=>`+${value} ${names[key]}`).join(", "))}"><span class="path-node-mark">${icon(status === "complete" ? "check" : ["locked", "reserved"].includes(status) ? "lock" : specialForNode(node) ? "trophy" : node.lane ? "streak" : "path")}</span><span class="path-node-copy"><b>${esc(node.label.split(" · ")[0])}</b><small>${stateLabel(node, status)} · ${progress}%</small><span class="path-node-progress"><i style="--progress:${progress}%"></i></span><span class="path-node-prize"><span class="path-reward-heading">${status === "complete" ? "NÓ CONQUISTADO" : "RECOMPENSA DO NÓ"}</span><span class="path-reward-list">${rewardText(node)}</span></span></span></button>`;
  }
  function map() {
    const route = pathRoute(routeId);
    if (routeId.startsWith("fusion")) {
      return `<div class="path-map-toolbar"><div><p class="eyebrow">COMBINAÇÃO / MISSÕES HÍBRIDAS</p><h2>${esc(route.label)}</h2></div></div><ol class="path-map">${PATH_NODES.filter(
        (node) => node.route === routeId,
      )
        .map(
          (node, index) =>
            `<li class="path-map-row${node.requires.some((id) => state.nodes[id]?.completedAt) ? " is-reached" : ""}"><span class="path-stage-number">${index + 1}</span>${index ? `<svg class="path-links" viewBox="0 0 24 48" aria-hidden="true" focusable="false"><path class="path-link-stem" d="M12 5v34"/><path class="path-link-head" d="m6 33 6 6 6-6"/></svg>` : ""}${nodeButton(node)}</li>`,
        )
        .join(
          "",
        )}</ol><p class="path-map-note">Cinco conquistas conjuntas. Os focos individuais continuam disponíveis dentro desta fusão.</p>`;
    }
    return `<div class="path-map-toolbar"><div><p class="eyebrow">${esc(route.short)} / O TEU PERCURSO</p><h2>${esc(route.name)}</h2></div><button class="btn btn-ghost" data-path-current>${icon("path")}O meu nó</button></div><div class="path-chapters" aria-label="Etapas do percurso">${Array.from(
      { length: Math.ceil(pathAttributeLimit(routeId) / 5) },
      (_, i) => i,
    )
      .map(
        (value) =>
          `<button type="button" data-path-chapter="${value}" aria-pressed="${chapter === value}">${String(value * 5 + 1).padStart(2, "0")} — ${String(Math.min((value + 1) * 5, pathAttributeLimit(routeId))).padStart(2, "0")}${value >= 2 ? " · Excelência" : ""}</button>`,
      )
      .join(
        "",
      )}</div><ol class="path-map" start="${chapter * 5 + 1}" aria-label="Nós de ${esc(route.label)}">${Array.from(
      { length: 5 },
      (_, index) => {
        const tier = chapter * 5 + index,
          candidates = PATH_NODES.filter(
            (node) => node.route === routeId && node.tier === tier,
          ),
          node =
            candidates.find((node) => node.id === selected) ||
            candidates.find((node) => state.nodes[node.id]?.completedAt) ||
            candidates.find((node) => nodeStatus(node, state) === "active") ||
            candidates.find((node) => node.style !== "legacy"),
          nodes = [node];
        const reached =
          nodes.some((node) => nodeStatus(node, state) === "complete") ||
          nodes[0].requires.some((id) => state.nodes[id]?.completedAt);
        return `<li class="path-map-row${reached ? " is-reached" : ""}"><span class="path-stage-number" aria-hidden="true">${String(tier + 1).padStart(2, "0")}</span>${index ? `<svg class="path-links" viewBox="0 0 24 48" aria-hidden="true" focusable="false"><path class="path-link-stem" d="M12 5v34"/><path class="path-link-head" d="m6 33 6 6 6-6"/></svg>` : ""}<div class="path-map-pair">${nodes.map(nodeButton).join("")}</div></li>`;
      },
    ).join(
      "",
    )}</ol><p class="path-map-note">${icon("path")}Cada nó tem 100%. Conquista o anterior para desbloquear o próximo desafio.</p>`;
  }
  function preparedMission(active, node) {
    const review = state.reviews?.[active.id];
    const needsReview = review && !review.acknowledgedAt;
    const rated = pathUsesRatings(active.offer.objective);
    const progress = Math.min(
      100,
      Math.max(0, state.nodes[node.id]?.progress || 0),
    );
    const lines =
      active.offer.objective.kind === "conditions"
        ? pathObjectiveLines(active.offer.objective)
        : [pathObjectiveText(active.offer.objective)];
    return `<div class="path-active"><div class="path-prepared-main">
<div class="path-prepared-objective"><p class="path-prepared-objective-label">${icon("missions")}A TUA MISSÃO <span>· ${active.frozenAt ? "ESCOLHIDA PARA O PRÓXIMO JOGO" : "NO PRÓXIMO JOGO"}</span></p><h3>${lines.length === 1 ? esc(lines[0]) : missionTitle(active.offer)}</h3>${lines.length > 1 ? missionConditions(active.offer) : ""}</div>
<div class="path-prepared-metrics"><div class="path-prepared-progress"><span>Progresso do nó</span><b>${progress}%</b><span class="path-spotlight-meter" role="progressbar" aria-label="Progresso atual do nó" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="--progress:${progress}%"></i></span></div><div class="path-prepared-advance"><span>Avanço se cumprires</span><b>+${active.offer.advance}%</b></div><div class="path-prepared-reward"><span class="path-reward-heading">Recompensa do nó</span><div class="path-rewards">${rewardText(node)}</div></div></div>
<div class="path-prepared-validation">${icon(rated ? "ratingAverage" : "check")}<span>${needsReview ? "Falta informação do jogo · Decisão administrativa pendente" : active.reviewDeadline ? `Prazo máximo: <b data-path-deadline="${active.reviewDeadline}">${remainingTime(active.reviewDeadline)}</b>` : rated ? "7 votos por critério · Sucesso garantido entrega antes das 48h" : "Apura no fecho do jogo"}</span></div></div>
<div class="path-prepared-failure">${icon("refresh")}<p><b>Se falhares:</b> este nó recomeça em 0%. Os anteriores e as cartas mantêm-se.</p></div>
<footer class="path-prepared-footer"><p>${icon(active.frozenAt ? "lock" : "info")}${active.frozenAt ? "Escolha protegida até ao apuramento." : "Podes mudar até à abertura do jogo, sem perder progresso."}</p><div class="path-prepared-actions">${active.gameId ? linkButton(`#/game/${active.gameId}`, "Ver jogo", "secondary", "games") : ""}${!active.frozenAt ? `<button class="btn btn-secondary" data-path-change ${choiceLocked() || paused() ? "disabled" : ""}>${icon("refresh")}Alterar missão</button><button class="btn btn-ghost" data-path-abandon ${paused() ? "disabled" : ""}>Remover escolha</button>` : ""}</div></footer></div>
`;
  }
  function details() {
    const node = pathNode(selected),
      status = nodeStatus(node, state),
      progress = state.nodes[node.id]?.progress || 0;
    const active =
      (state.pending || []).find((row) => row.nodeId === node.id) ||
      (!editingPrepared && state.active?.nodeId === node.id
        ? state.active
        : null);
    const review = Object.values(state.reviews || {}).find(
      (review) => review.pending && review.nodeId === node.id && !review.acknowledgedAt,
    );
    const proposals = state.offers[node.id];
    if (active) return `<section class="path-detail path-node-expanded has-prepared-mission event-rarity-surface" data-rarity="${eventRarityId(active.offer)}" id="path-detail" aria-labelledby="path-detail-title"><header class="path-prepared-top"><div class="path-prepared-context"><p>${esc(pathRoute(node.route).label)} · Nó ${String(node.tier + 1).padStart(2, "0")}</p><h2 id="path-detail-title" tabindex="-1">${esc(node.label)}</h2></div><div class="path-prepared-status">${rarityBadge(active.offer)}<span class="path-state">${stateLabel(node, status)}</span></div></header>${review ? `<p class="path-feedback warning" role="status">Falta informação do jogo. Esta tentativa aguarda uma decisão da administração; podes escolher missões noutros nós disponíveis.</p>` : ""}${preparedMission(active, node)}</section>`;
    return `<section class="path-detail path-node-expanded${active ? " has-prepared-mission event-rarity-surface" : ""}" ${active ? `data-rarity="${eventRarityId(active.offer)}"` : ""} id="path-detail" aria-labelledby="path-detail-title"><div class="path-detail-head"><span class="path-state">${stateLabel(node, status)}</span>${progressRing(progress, `Avanço deste nó: ${progress}%`)}</div><p class="eyebrow">${node.style === "fusion" ? "COMBINAÇÃO" : esc(pathRoute(node.route).label)} · NÓ ${String(node.tier + 1).padStart(2, "0")}</p><h2 id="path-detail-title" tabindex="-1">${esc(node.label)}</h2>${!active ? `<p class="path-style-note">${node.style === "fusion" ? "Combina duas áreas do teu jogo, sem bloquear as especializações." : "Cada nó termina nos 100%. Todo o excedente passa para o nó seguinte deste percurso."}</p><div class="path-rewards"><span class="path-reward-heading">RECOMPENSA DO NÓ</span><div class="path-reward-list">${rewardText(node)}</div><p class="path-reward-timing">Entregue ao completar este nó a 100%.</p></div>` : ""}
    ${review ? `<p class="path-feedback warning" role="status">Esta tentativa aguarda uma decisão da administração. Os outros nós disponíveis continuam acessíveis.</p>` : status === "complete" ? `<div class="path-completed">${icon("check")}<h3>Este nó já é teu.</h3><p>Explora os caminhos que desbloqueaste. Esta recompensa é entregue uma única vez.</p></div>` : status === "locked" || status === "reserved" ? `<div class="path-locked"><h3>${status === "reserved" ? "Este nó está reservado." : "Há caminho até aqui."}</h3><p>${status === "reserved" ? "Pode receber avanço de uma tentativa em avaliação. Aguarda o apuramento para escolher uma missão aqui." : node.groups ? "Conquista um nó da etapa 5 em cada uma destas áreas:" : "Conquista um dos nós anteriores:"}</p><div class="path-prerequisites">${(node.groups ? node.groups.map((group) => group.find((id) => state.nodes[id]?.completedAt) || group[0]) : node.requires.length ? [node.requires.find((id) => state.nodes[id]?.completedAt) || node.requires[0]] : []).map((id) => `<button class="btn btn-secondary" data-path-node="${id}">${icon(state.nodes[id]?.completedAt ? "check" : "path")}${esc(names[pathNode(id).route])} · Etapa ${pathNode(id).tier + 1}</button>`).join("")}</div></div>` : active ? (active.nodeId === node.id ? preparedMission(active, node) : `<p>Já escolheste uma missão para o próximo jogo.</p><button class="btn btn-primary" data-path-node="${active.nodeId}">${icon("path")}Ver missão atual</button>`) : paused() ? '<p role="status">As missões estão temporariamente pausadas. Podes continuar a explorar o mapa.</p>' : proposals ? `<p class="path-proposal-intro">Três maneiras de avançar. Escolhe uma para o próximo jogo em que participares.</p><div class="path-proposals">${proposals.map((offer) => `<article class="path-proposal event-rarity-surface difficulty-${offer.difficulty}" data-rarity="${eventRarityId(offer)}"><div>${rarityBadge(offer)}<span class="visually-hidden">${difficulty[offer.difficulty]}</span><strong>+${offer.advance}%</strong></div>${missionScope()}<h3>${missionTitle(offer)}</h3>${missionConditions(offer)}<p>${!pathUsesRatings(offer.objective) ? "Pelo registo validado do jogo." : `Mínimo de sete avaliações válidas por critério. Entrega antes das 48 horas se o sucesso estiver garantido, assumindo duas estrelas nos votos em falta. Caso contrário, apura às 48 horas; sem sete votos por critério, cancela sem perda de progresso.`}</p>${!pathOfferAvailable(node, offer, state) ? `<p class="path-offer-blocked">Este avanço pode atingir outro nó em avaliação. Escolhe outra proposta ou aguarda o apuramento.</p>` : ""}<button class="btn ${offer.difficulty === 2 ? "btn-primary" : "btn-secondary"}" data-path-accept="${offer.id}" ${choiceLocked() || !pathOfferAvailable(node, offer, state) ? "disabled" : ""}>Escolher missão${icon("arrow")}</button></article>`).join("")}</div><div class="path-reroll"><button class="btn btn-secondary" data-path-reroll ${!pathRerollAvailable(state) || choiceLocked() ? "disabled" : ""}>${icon("refresh")}${pathRerollAvailable(state) ? "Renovar estas três missões" : "Reroll diário utilizado"}</button><p>Um reroll por dia, partilhado por todos os caminhos. Renova à meia-noite de Lisboa.</p></div><p class="path-failure-rule">${icon("refresh")}Falhar reinicia o avanço deste nó. A dificuldade aumenta o avanço, não o valor da recompensa.</p>` : `<p>Conhece as tuas três propostas para este nó. Ficam guardadas mesmo se saíres da página.</p><button class="btn btn-primary" data-path-offers>${icon("path")}Revelar as três missões</button>`}</section>`;
  }
  function draw(focus = false, animate = true) {
    if (disposed) return;
    const entryIndex = ctx.missions?.findIndex((mission) => mission.type === "PLAYER_PATH");
    const entry = pathMissionEntry(state, { rewards: ctx.league.eventRewards || [], uid: ctx.user.uid });
    if (entryIndex >= 0) ctx.missions.splice(entryIndex, 1, entry);
    else ctx.missions?.push(entry);
    animateResult =
      !!state.lastResult?.id && state.lastResult.id !== animatedResult;
    animatedResult = state.lastResult?.id || null;
    const route = pathRoute(routeId),
      visibleRoute = pathRoute(pathVisibleRoute(state, routeId)),
      completed = Object.values(state.nodes).filter(
        (node) => node.completedAt,
      ).length;
    const ownRewards = (ctx.league.eventRewards || []).filter(
      (row) =>
        row.uid === ctx.user.uid &&
        row.source === "path" &&
        !row.revokedAt &&
        !row.pending,
    );
    const gained = ownRewards.reduce(
      (sum, row) =>
        sum + Object.values(row.reward.boosts || {}).reduce((a, b) => a + b, 0),
      0,
    );
    const nextNode = state.active
      ? pathNode(state.active.nodeId)
      : [routeId, ...(visibleRoute.routes || [])]
          .map((id) =>
            PATH_NODES.find(
              (node) =>
                node.route === id &&
                node.style !== "legacy" &&
                !state.nodes[node.id]?.completedAt &&
                nodeAvailable(node, state),
            ),
          )
          .find(Boolean);
    ctx.render(`<div class="path-workspace${animate ? "" : " is-live-update"}${animateResult ? " has-new-result" : ""}" style="--path-color:${route.color || "#c9acff"}"><div class="path-topline">${linkButton("#/missions", "Missões", "ghost", "arrow")}<button class="btn btn-ghost" data-path-refresh>${icon("refresh")}Atualizar</button></div><header class="path-hero"><div><p class="eyebrow">O PRÓXIMO JOGO COMEÇA NA TUA ESCOLHA</p><h1>Escolhe o teu <br><em>caminho!</em></h1><p>Encontra o teu estilo. Arrisca no campo.<br>Conquista uma carta que conta a tua história.</p><div class="path-hero-actions"><button class="btn btn-primary path-hero-action" ${!state.activePath && !state.selectedNode ? "data-path-next-route" : nextNode ? `data-path-node="${nextNode.id}"` : "data-path-next-route"}>${icon("path")}${!state.activePath && !state.selectedNode ? "Escolher o meu caminho" : state.active ? "Ver a minha missão" : nextNode ? "Escolher o próximo desafio" : "Escolher outro percurso"}</button><button class="btn btn-secondary" data-path-help>${icon("info")}Como funciona</button></div><div class="path-hero-facts"><span><b>${completed}</b> nós conquistados</span><span><b>+${gained}</b> pontos permanentes</span></div></div><div class="path-hero-art" aria-hidden="true"><svg viewBox="0 0 360 260"><path class="path-art-field" d="M20 230 110 20h220L240 230ZM65 125h220M160 20 70 230M230 20l-90 210"/><path class="path-art-route" d="M85 220 132 150 210 115 242 50M132 150 110 80M210 115l92 55"/><circle cx="85" cy="220" r="13"/><circle cx="132" cy="150" r="16"/><circle cx="110" cy="80" r="11"/><circle cx="210" cy="115" r="19"/><circle cx="302" cy="170" r="11"/><path class="path-art-star" d="m242 22 8 17 19 3-14 13 3 19-16-9-17 9 4-19-14-13 19-3Z"/></svg><span class="path-art-caption">O TEU JOGO. A TUA ASSINATURA.</span></div></header>
    ${state.lastResult ? `<div class="path-result ${state.lastResult.status}" role="status">${icon(state.lastResult.status === "success" ? "check" : "refresh")}<div><strong>${state.lastResult.completed ? (state.lastResult.completedNodeIds?.length > 1 ? `${state.lastResult.completedNodeIds.length} nós conquistados!` : "Nó conquistado!") : state.lastResult.status === "cancelled" ? "Tentativa cancelada. Progresso preservado." : state.lastResult.status === "success" ? `Mais um passo: ${state.lastResult.progress}%` : "Novo jogo. Nova oportunidade."}</strong><p>${esc(pathNode(state.lastResult.nodeId)?.label || "Missão")}${state.lastResult.gameId ? ` · ${linkButton(`#/game/${state.lastResult.gameId}`, "Ver jogo", "ghost", "games")}` : ""} · ${esc(state.lastResult.reason)} ${state.lastResult.finalOverflow ? `Percurso terminado: ${state.lastResult.finalOverflow}% de excedente não geram pontos adicionais.` : ""} ${state.lastResult.status === "failure" ? "Este nó recomeça em 0%; os anteriores mantêm-se." : ""}</p></div>${pathResultAwards(state).length ? `<button class="btn btn-secondary" data-path-reveal>${pathResultAwards(state).length > 1 ? "Ver cartas conquistadas" : "Ver carta conquistada"}</button>` : ""}</div>` : ""}
    <section class="path-current-route" aria-label="Percurso em exploração"><span class="path-current-symbol">${icon(visibleRoute.icon || "path")}</span><div><p class="eyebrow">${state.activePath === visibleRoute.id ? "O TEU PERCURSO" : "EM EXPLORAÇÃO"}</p><h2>${esc(visibleRoute.label)}</h2><p>${visibleRoute.routes ? "Uma identidade. Três focos para continuar a evoluir." : "Um passo de cada vez. As tuas conquistas ficam contigo."}</p></div>${state.activePath !== visibleRoute.id && !visibleRoute.routes ? `<button class="btn btn-primary" data-path-activate="${routeId}" ${choiceLocked() || paused() ? "disabled" : ""}>Ativar caminho</button>` : ""}<button class="btn btn-secondary" data-path-picker>${icon("refresh")}Mudar caminho</button></section>
    ${visibleRoute.routes && (state.unifiedFusions || []).includes(visibleRoute.id) ? `<nav class="path-focus" aria-label="Foco da fusão">${[...visibleRoute.routes, visibleRoute.id].map((id) => `<button class="btn ${routeId === id ? "btn-primary" : "btn-secondary"}" data-path-route="${id}" aria-pressed="${routeId === id}">${icon(pathRoute(id).icon || "path")}${id === visibleRoute.id ? "Combinação" : esc(pathRoute(id).label)}</button>`).join("")}</nav>` : ""}
    ${fusionOpportunities()}
    ${pendingPanel()}<div class="path-playground"><section class="path-map-panel" aria-label="Mapa do caminho">${map()}</section></div>${finalCard(route)}<p class="path-live visually-hidden" aria-live="polite"></p></div>`);
    bind();
    bindImages();
    if (focus)
      document
        .querySelector("#path-detail-title")
        ?.focus({ preventScroll: true });
  }
  async function action(button, name, values = {}, silent = false) {
    if (inFlight) return;
    inFlight = true;
    try {
      await busy(button, async () => {
        const next =
          name === "sync" && paused()
            ? await DB.getPath()
            : await DB.pathAction(name, values);
        if (disposed) return;
        const knownResults = new Set(
          (state.history || []).map((row) => row.id),
        );
        const newReward = (next.history || []).some(
          (row) =>
            !knownResults.has(row.id) && (row.reward || row.rewards?.length),
        );
        const settled = next.lastResult?.id !== state.lastResult?.id;
        state = next;
        editingPrepared = false;
        if (name === "select") {
          selected = values.nodeId;
          routeId = pathNode(selected).route;
          chapter = Math.floor(pathNode(selected).tier / 5);
        }
        if (name === "unify") {
          selected = state.selectedNode;
          routeId = pathNode(selected).route;
          chapter = 0;
        }
        if (settled && state.selectedNode) {
          selected = state.selectedNode;
          routeId = pathNode(selected).route;
          chapter = Math.floor(pathNode(selected).tier / 5);
        }
        if (newReward) await ctx.refresh();
        if (disposed) return;
        draw(!silent, !silent);
        if (silent) return;
        if (name === "accept") toast("Missão escolhida. Agora, é no campo!");
        if (name === "reroll")
          toast(
            "Três novas propostas. O próximo reroll chega à meia-noite de Lisboa.",
          );
        if (name === "sync") toast("Percurso atualizado.");
      });
    } catch {
      /* busy displays the error and retains the current choice. */
    } finally {
      inFlight = false;
    }
  }
  function selectNode(id) {
    const node = pathNode(id);
    if (!node || disposed) return;
    editingPrepared = false;
    selected = id;
    routeId = node.route;
    chapter = Math.floor(node.tier / 5);
    draw(true);
    document.querySelector("#path-detail")?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }
  function reveal() {
    const awards=pathResultAwards(state);
    if(!awards.length)return;
    modal("A tua assinatura. Para sempre.",`<div class="path-celebration">${awards.map(award=>finalCard(pathRoute(award.specialId.slice(5)))).join("")}<p>${awards.length > 1 ? "Estas cartas são tuas" : "Esta carta é tua"}, sem prazo de validade.</p>${linkButton("#/profile","Ver na minha coleção","primary","profile")}</div>`);
    for(const award of awards)seenCards.add(award.id);
    try{sessionStorage.setItem(`path-card-results-${ctx.user.uid}`,JSON.stringify([...seenCards].slice(-30)));}catch{}
    bindImages();
  }
  function fusionOpportunities() {
    const relevant = PATH_FUSIONS.filter(
      (fusion) =>
        fusion.routes.includes(routeId) &&
        !(state.unifiedFusions || []).includes(fusion.id),
    );
    return relevant
      .map((fusion) => {
        const completed = fusion.routes.filter((id) =>
          [0, 1].some((lane) => state.nodes[`${id}-4-${lane}`]?.completedAt),
        );
        if (!completed.length) return "";
        const missing = fusion.routes.find((id) => !completed.includes(id));
        return `<section class="path-discovery"><div class="path-discovery-symbol">${icon("path")}</div><div><p class="eyebrow">${missing ? "UMA NOVA POSSIBILIDADE" : "NOVO PERCURSO DESBLOQUEADO"}</p><h2>${esc(fusion.label)}</h2><p>${missing ? `Já dominaste os fundamentos de ${esc(pathRoute(completed[0]).label)}. Conquista também o marco 5 em ${esc(pathRoute(missing).label)} para desbloquear este percurso.` : "Os dois marcos já são teus. Unifica as especializações e escolhe entre os seus focos individuais e as missões de combinação."}</p><div class="path-discovery-milestones">${fusion.routes.map((id) => `<span>${icon(completed.includes(id) ? "check" : "lock")}${esc(pathRoute(id).label)} · Marco 5</span>`).join("")}</div>${missing ? `<button class="btn btn-secondary" data-path-route="${missing}">Melhorar ${esc(pathRoute(missing).label)}${icon("arrow")}</button>` : `<button class="btn btn-primary" data-path-unify="${fusion.id}" ${choiceLocked() || paused() ? "disabled" : ""}>Unificar e ativar${icon("path")}</button>`}</div></section>`;
      })
      .join("");
  }
  function picker() {
    const saved = Object.keys(state.offers)
      .map(pathNode)
      .filter(
        (node) =>
          node?.style === "legacy" && !state.nodes[node.id]?.completedAt,
      );
    modal(
      "Onde queres chegar?",
      `<div class="path-picker-dialog"><p>Que parte do teu jogo queres melhorar?</p><div class="path-route-grid">${[...PATH_ROUTES.filter((route) => pathVisibleRoute(state, route.id) === route.id), ...PATH_FUSIONS.filter((fusion) => (state.unifiedFusions || []).includes(fusion.id))].map((route) => `<button class="path-route" data-picker-route="${route.id}" aria-pressed="${pathVisibleRoute(state, routeId) === route.id}"><span>${icon(route.icon || "path")}</span><b>${esc(route.label)}</b></button>`).join("")}</div>${saved.length ? `<details class="path-saved-choices"><summary>Propostas guardadas da versão anterior</summary><p>Estas escolhas continuam disponíveis com as metas que já conheces.</p><div>${saved.map((node) => `<button class="btn btn-secondary" data-picker-node="${node.id}">${esc(pathRoute(node.route).label)} · Etapa ${node.tier + 1}</button>`).join("")}</div></details>` : ""}</div>`,
    );
    document.querySelector(".path-picker-dialog")?.closest(".modal").classList.add("path-picker-modal");
    document
      .querySelectorAll("[data-picker-route], [data-picker-node]")
      .forEach((button) => {
        button.onclick = async () => {
          const id = button.dataset.pickerRoute;
          const node =
            pathNode(button.dataset.pickerNode) ||
            PATH_NODES.find(
              (node) =>
                node.route === id && nodeStatus(node, state) === "active",
            ) ||
            PATH_NODES.find(
              (node) =>
                node.route === id &&
                !state.nodes[node.id]?.completedAt &&
                state.nodes[node.id]?.progress > 0 &&
                nodeAvailable(node, state),
            ) ||
            PATH_NODES.find(
              (node) =>
                node.route === id && nodeStatus(node, state) === "available",
            ) ||
            PATH_NODES.find((node) => node.route === id);
          if (paused()) {
            closeModal();
            selectNode(node.id);
            return;
          }
          if (inFlight) return;
          inFlight = true;
          try {
            await busy(button, async () => {
              const next = await DB.pathAction("select", { nodeId: node.id });
              if (disposed) return;
              const removed = state.active && !next.active;
              state = next;
              closeModal();
              if (removed) toast("Caminho alterado. Escolhe uma missão; o progresso anterior mantém-se.");
              selectNode(node.id);
            });
          } catch {
            /* busy keeps the chooser open and explains the failure. */
          } finally {
            inFlight = false;
          }
        };
      });
  }
  function help() {
    modal(
      "O teu jogo. O teu caminho.",
      `<div class="path-guide"><p>Escolhe uma área para melhorar e transforma o próximo jogo numa conquista pessoal.</p><ol>${[
        [
          "path",
          "Encontra o teu percurso",
          "Mudar caminho confirma a nova especialização e remove a missão preparada anterior, sem perder progresso nem propostas. Tentativas já associadas a jogos continuam em avaliação.",
        ],
        [
          "missions",
          "Escolhe uma das três missões",
          "Compara a meta e a percentagem de avanço. Podes renovar um trio por dia; esse reroll é partilhado por todos os caminhos.",
        ],
        [
          "games",
          "Leva o desafio para o jogo",
          "Quando o próximo jogo abre, a missão fica bloqueada. Golos, assistências e vitórias apuram ao fechar. Avaliações exigem sete votos por critério: entregam antes das 48 horas se os votos em falta, assumidos a duas estrelas, já não impedirem o sucesso. Caso contrário, apuram às 48 horas.",
        ],
        [
          "gift",
          "Deixa a tua assinatura",
          "Cada nó pode dar +1 por atributo, até três atributos. Este sistema tem um teto próprio de +15 por stat e +25 a GR. O excedente de avanço passa para o próximo nó; as cartas conquistadas são permanentes.",
        ],
      ]
        .map(
          ([symbol, title, text], index) =>
            `<li><span class="path-guide-mark">${icon(symbol)}<b>${index + 1}</b></span><div><h3>${title}</h3><p>${text}</p></div></li>`,
        )
        .join(
          "",
        )}<li class="path-guide-failure"><span class="path-guide-mark">${icon("refresh")}</span><div><h3>Se falhares</h3><p>Recomeças apenas o nó da tentativa. Os nós anteriores e as cartas conquistadas mantêm-se.</p></div></li></ol></div>`,
    );
  }
  function bind() {
    document
      .querySelector("[data-path-next-route]")
      ?.addEventListener("click", picker);
    document
      .querySelectorAll("[data-path-unify]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            action(button, "unify", { routeId: button.dataset.pathUnify })),
      );
    document
      .querySelector("[data-path-activate]")
      ?.addEventListener("click", (event) =>
        action(event.currentTarget, "activate", { routeId: routeId }),
      );
    document
      .querySelector("[data-path-change]")
      ?.addEventListener("click", () => {
        editingPrepared = true;
        draw(true);
      });
    document
      .querySelector("[data-path-picker]")
      ?.addEventListener("click", picker);
    document.querySelector("[data-path-help]")?.addEventListener("click", help);
    document
      .querySelector("[data-path-reroll]")
      ?.addEventListener("click", (event) =>
        action(event.currentTarget, "reroll", { nodeId: selected }),
      );
    document.querySelectorAll("[data-path-route]").forEach(
      (button) =>
        (button.onclick = () => {
          const id = button.dataset.pathRoute;
          const node =
            PATH_NODES.find(
              (node) =>
                node.route === id && nodeStatus(node, state) === "active",
            ) ||
            PATH_NODES.find(
              (node) =>
                node.route === id && nodeStatus(node, state) === "available",
            ) ||
            PATH_NODES.find((node) => node.route === id);
          if (paused()) selectNode(node.id);
          else action(button, "select", { nodeId: node.id });
        }),
    );
    document
      .querySelectorAll("[data-path-node]")
      .forEach(
        (button) =>
          (button.onclick = () => selectNode(button.dataset.pathNode)),
      );
    document.querySelectorAll("[data-path-chapter]").forEach(
      (button) =>
        (button.onclick = () => {
          chapter = Number(button.dataset.pathChapter);
          draw();
          document
            .querySelector(`[data-path-chapter="${chapter}"]`)
            ?.focus({ preventScroll: true });
        }),
    );
    document
      .querySelector("[data-path-current]")
      ?.addEventListener("click", () =>
        selectNode(state.active?.nodeId || state.selectedNode || selected),
      );
    document
      .querySelector("[data-path-offers]")
      ?.addEventListener("click", (event) =>
        action(event.currentTarget, "offers", { nodeId: selected }),
      );
    document.querySelectorAll("[data-path-accept]").forEach(
      (button) =>
        (button.onclick = () =>
          action(button, "accept", {
            nodeId: selected,
            offerId: button.dataset.pathAccept,
          })),
    );
    document
      .querySelector("[data-path-abandon]")
      ?.addEventListener("click", (event) =>
        action(event.currentTarget, "abandon"),
      );
    document
      .querySelector("[data-path-refresh]")
      ?.addEventListener("click", (event) =>
        action(event.currentTarget, "sync"),
      );
    document
      .querySelector("[data-path-reveal]")
      ?.addEventListener("click", reveal);
  }
  draw();
  if(pathResultAwards(state).some(award=>!seenCards.has(award.id))) reveal();
}
