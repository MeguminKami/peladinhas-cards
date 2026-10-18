import { PATH_CARD_EDITIONS } from "./path-card-designs.js";
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

export function pathMissionEntry(state) {
  const active = state?.active || state?.pending?.[0],
    result = state?.lastResult;
  const discovery = PATH_FUSIONS.find(
    (fusion) =>
      !(state?.unifiedFusions || []).includes(fusion.id) &&
      fusion.routes.some((id) =>
        [0, 1].some((lane) => state?.nodes?.[`${id}-4-${lane}`]?.completedAt),
      ),
  );
  const minutes = active?.reviewDeadline
    ? Math.max(0, Math.ceil((active.reviewDeadline - Date.now()) / 60000))
    : 0;
  const frozen = !!(active?.frozenAt || active?.gameId);
  const stateText = frozen
    ? active.reviewDeadline
      ? minutes
        ? `Em avaliação · faltam ${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
        : "Prazo terminado · A apurar"
      : "Escolha bloqueada · Missão associada a um jogo"
    : active
      ? `Missão preparada para o próximo jogo${state?.pending?.length ? ` · ${state.pending.length} em avaliação` : ""}`
      : discovery
        ? `Nova possibilidade: ${discovery.label}`
        : result?.reward?.specialId
          ? `Carta permanente conquistada: ${PATH_CARD_EDITIONS[result.reward.specialId]?.name || "A tua assinatura"}`
          : "Os teus progressos ficam guardados em cada percurso.";
  return {
    id: "player-path",
    type: "PLAYER_PATH",
    icon: "path",
    href: "#/missions/path",
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
export function pathMissionSpotlight(entry) {
  const progress = Math.min(100, Math.max(0, entry.done || 0));
  return `<a class="path-mission-spotlight" href="${esc(entry.href)}"><div class="path-spotlight-copy"><p class="eyebrow">${icon("path")}EVOLUÇÃO PESSOAL</p><h2>Escolhe o teu <br><em>caminho!</em></h2><span class="path-spotlight-route">${esc(entry.routeLabel)}</span><p class="path-spotlight-objective">${esc(entry.title)}</p>${entry.stateText ? `<p class="path-spotlight-state">${icon(entry.stateIcon || "path")}${esc(entry.stateText)}</p>` : ""}<span class="path-spotlight-cta">${entry.started ? "Continuar o meu caminho" : "Descobrir o meu primeiro caminho"}${icon("arrow")}</span></div><div class="path-spotlight-art" aria-hidden="true"><svg viewBox="0 0 260 210"><path class="spotlight-pitch" d="m20 180 55-150h155l-55 150ZM48 105h155M152 30 96 180"/><path class="spotlight-trail" d="m55 166 41-57 56 22 42-74"/><circle cx="55" cy="166" r="7"/><circle cx="96" cy="109" r="10"/><circle cx="152" cy="131" r="7"/><path class="spotlight-goal" d="m194 36 6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2Z"/></svg><span>O TEU JOGO.<br>A TUA ASSINATURA.</span></div>${progress ? `<span class="path-spotlight-progress" aria-label="Avanço do nó: ${progress}%"><i style="--progress:${progress}%"></i><b>${progress}%</b></span>` : ""}</a>`;
}
const names = Object.fromEntries(ATTRIBUTES.map(([key, name]) => [key, name]));
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

export async function pathsPage(ctx) {
  let state = await DB.getPath(),
    selected = state.selectedNode || state.active?.nodeId || "shooting-0-0";
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
  const clock = setInterval(() => {
    if (disposed) return;
    document.querySelectorAll("[data-path-deadline]").forEach((el) => {
      el.textContent = remainingTime(Number(el.dataset.pathDeadline));
    });
    if (
      !document.hidden &&
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
        const deadline = pathUsesRatings(attempt.offer.objective)
          ? attempt.reviewDeadline || pathReviewDeadline(game)
          : 0;
        const criteria = attempt.offer.objective.criteria || [
          attempt.offer.objective.criterion,
        ];
        return `<article class="path-pending-attempt"><span class="path-pending-symbol">${icon(deadline ? "ratingAverage" : "lock")}</span><div><p class="eyebrow">${esc(pathRoute(pathNode(attempt.nodeId)?.route)?.label || "O teu percurso")}</p><h3>${esc(pathObjectiveText(attempt.offer.objective))}</h3><p>${deadline && pathUsesRatings(attempt.offer.objective) ? `Avaliações · <strong data-path-deadline="${deadline}">${remainingTime(deadline)}</strong>` : game?.status === "closed" || attempt.closedGame?.status === "closed" ? "Resultado em apuramento." : "Missão bloqueada para este jogo."}</p>${deadline && pathUsesRatings(attempt.offer.objective) ? `<p class="path-vote-counts">${criteria.map((key) => `${esc({ attack: "Ataque", passing: "Passe", physical: "Físico", defense: "Defesa", goalkeeping: "GR", attitude: "Atitude" }[key] || key)}: <b>${attempt.ratingCounts?.[key] || 0}/7 votos</b>`).join(" · ")}</p><p>Com menos de sete votos por critério no fim das 48 horas, a tentativa é cancelada sem perder progresso.</p>` : ""}<div class="path-pending-actions"><button class="btn btn-ghost" data-path-node="${attempt.nodeId}">Ver nó${icon("arrow")}</button>${linkButton(`#/game/${attempt.gameId}`, "Ver jogo", "ghost", "games")}</div></div></article>`;
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
  function rewardText(node) {
    const preview = pathRewardPreview(
      node,
      ctx.league.eventRewards || [],
      ctx.user.uid,
    );
    return node.rewardKeys
      .map(
        (key) =>
          `<span class="path-reward-chip">${icon("plus")}<b>+${preview[key]}</b> ${esc(names[key])}${!preview[key] ? " · limite atingido" : ""}</span>`,
      )
      .join("");
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
      preview = pathRewardPreview(
        node,
        ctx.league.eventRewards || [],
        ctx.user.uid,
      );
    return `<button type="button" class="path-node ${status}${animateResult && state.lastResult?.completed && state.lastResult.nodeId === node.id ? " just-earned" : ""}${selected === node.id ? " is-selected" : ""}" data-path-node="${node.id}" aria-pressed="${selected === node.id}" aria-label="${esc(node.label)}, ${stateLabel(node, status)}, ${progress}%, ${esc(Object.entries(preview).map(([key,value])=>`+${value} ${names[key]}`).join(", "))}"><span class="path-node-mark">${icon(status === "complete" ? "check" : ["locked", "reserved"].includes(status) ? "lock" : specialForNode(node) ? "trophy" : node.lane ? "streak" : "path")}</span><span class="path-node-copy"><b>${esc(node.label.split(" · ")[0])}</b><small>${stateLabel(node, status)} · ${progress}%</small><span class="path-node-progress"><i style="--progress:${progress}%"></i></span><span class="path-node-prize">${node.rewardKeys.map((key) => `+${preview[key]} ${esc(names[key])}`).join(" · ")}${specialForNode(node) ? " · Carta permanente" : ""}</span></span></button>`;
  }
  function map() {
    const route = pathRoute(routeId);
    if (routeId.startsWith("fusion")) {
      return `<div class="path-map-toolbar"><div><p class="eyebrow">COMBINAÇÃO / MISSÕES HÍBRIDAS</p><h2>${esc(route.label)}</h2></div></div><ol class="path-map">${PATH_NODES.filter(
        (node) => node.route === routeId,
      )
        .map(
          (node, index) =>
            `<li class="path-map-row"><span class="path-stage-number">${index + 1}</span>${index ? `<svg class="path-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 0V100"/></svg>` : ""}${nodeButton(node)}</li>`,
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
        return `<li class="path-map-row${reached ? " is-reached" : ""}"><span class="path-stage-number" aria-hidden="true">${String(tier + 1).padStart(2, "0")}</span>${index ? `<svg class="path-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 0V100"/></svg>` : ""}<div class="path-map-pair">${nodes.map(nodeButton).join("")}</div></li>`;
      },
    ).join(
      "",
    )}</ol><p class="path-map-note">${icon("path")}Cada nó tem 100%. Conquista o anterior para desbloquear o próximo desafio.</p>`;
  }
  function preparedMission(active, node) {
    const rated = pathUsesRatings(active.offer.objective);
    return `<div class="path-active"><div class="path-prepared-main"><div class="path-prepared-objective"><span class="path-next-match">${icon(active.reviewDeadline ? "ratingAverage" : active.frozenAt ? "lock" : "games")}${active.reviewDeadline ? "EM AVALIAÇÃO" : active.frozenAt ? "MISSÃO BLOQUEADA" : "NO PRÓXIMO JOGO"}</span>${rarityBadge(active.offer)}<h3>${esc(pathObjectiveText(active.offer.objective))}</h3><p>${active.reviewDeadline ? `Apuramento em <strong data-path-deadline="${active.reviewDeadline}">${remainingTime(active.reviewDeadline)}</strong>` : active.frozenAt ? "A tua escolha está confirmada para este jogo." : "Desafio escolhido. Leva-o para o próximo jogo em que participares."}</p><span class="path-prepared-validation">${icon(rated ? "ratingAverage" : "check")}${rated ? "Apura 48h após o fecho · 7 votos por critério" : "Apura no fecho do jogo"}</span></div><aside class="path-prepared-gain" aria-label="Avanço em caso de sucesso"><span>SE CONSEGUIRES</span><strong>+${active.offer.advance}<small>%</small></strong><p>de avanço no percurso</p><div class="path-rewards">${rewardText(node)}</div><p class="path-gain-note">Recompensa ao completar o nó.<br>O avanço extra passa ao seguinte.</p></aside></div><div class="path-prepared-failure">${icon("refresh")}<p><b>Se falhares</b>Este nó recomeça em 0%. Os anteriores e as cartas mantêm-se.</p></div><footer class="path-prepared-footer"><p>${icon(active.frozenAt ? "lock" : "info")}${active.frozenAt ? "Escolha protegida até ao apuramento." : "Podes mudar até à abertura do jogo, sem perder progresso."}</p><div class="path-prepared-actions">${active.gameId ? linkButton(`#/game/${active.gameId}`, "Ver jogo", "secondary", "games") : ""}${!active.frozenAt ? `<button class="btn btn-secondary" data-path-change ${choiceLocked() || paused() ? "disabled" : ""}>${icon("refresh")}Alterar missão</button><button class="btn btn-ghost" data-path-abandon ${paused() ? "disabled" : ""}>Remover escolha</button>` : ""}</div></footer></div>`;
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
      (review) => !review.acknowledgedAt,
    );
    const proposals = state.offers[node.id];
    return `<section class="path-detail path-node-expanded${active ? " has-prepared-mission" : ""}" id="path-detail" aria-labelledby="path-detail-title"><div class="path-detail-head"><span class="path-state">${stateLabel(node, status)}</span>${progressRing(progress, `Avanço deste nó: ${progress}%`)}</div><p class="eyebrow">${node.style === "fusion" ? "COMBINAÇÃO" : esc(pathRoute(node.route).label)} · NÓ ${String(node.tier + 1).padStart(2, "0")}</p><h2 id="path-detail-title" tabindex="-1">${esc(node.label)}</h2>${!active ? `<p class="path-style-note">${node.style === "fusion" ? "Combina duas áreas do teu jogo, sem bloquear as especializações." : "Cada nó termina nos 100%. Todo o excedente passa para o nó seguinte deste percurso."}</p><div class="path-rewards">${rewardText(node)}</div>` : ""}${specialForNode(node) ? `<p class="path-permanent">${icon("gift")}Inclui carta permanente: <b>${esc(pathRoute(node.route).cardName)}</b></p>` : ""}
    ${review ? `<p class="path-feedback warning" role="status">Um resultado foi corrigido. O percurso está em revisão pela administração; as tuas conquistas mantêm-se visíveis.</p>` : status === "complete" ? `<div class="path-completed">${icon("check")}<h3>Este nó já é teu.</h3><p>Explora os caminhos que desbloqueaste. Esta recompensa é entregue uma única vez.</p></div>` : status === "locked" || status === "reserved" ? `<div class="path-locked"><h3>${status === "reserved" ? "Este nó está reservado." : "Há caminho até aqui."}</h3><p>${status === "reserved" ? "Pode receber avanço de uma tentativa em avaliação. Aguarda o apuramento para escolher uma missão aqui." : node.groups ? "Conquista um nó da etapa 5 em cada uma destas áreas:" : "Conquista um dos nós anteriores:"}</p><div class="path-prerequisites">${(node.groups ? node.groups.map((group) => group.find((id) => state.nodes[id]?.completedAt) || group[0]) : node.requires.length ? [node.requires.find((id) => state.nodes[id]?.completedAt) || node.requires[0]] : []).map((id) => `<button class="btn btn-secondary" data-path-node="${id}">${icon(state.nodes[id]?.completedAt ? "check" : "path")}${esc(names[pathNode(id).route])} · Etapa ${pathNode(id).tier + 1}</button>`).join("")}</div></div>` : active ? (active.nodeId === node.id ? preparedMission(active, node) : `<p>Já escolheste uma missão para o próximo jogo.</p><button class="btn btn-primary" data-path-node="${active.nodeId}">${icon("path")}Ver missão atual</button>`) : paused() ? '<p role="status">As missões estão temporariamente pausadas. Podes continuar a explorar o mapa.</p>' : proposals ? `<p class="path-proposal-intro">Três maneiras de avançar. Escolhe uma para o próximo jogo em que participares.</p><div class="path-proposals">${proposals.map((offer) => `<article class="path-proposal event-rarity-surface difficulty-${offer.difficulty}" data-rarity="${eventRarityId(offer)}"><div>${rarityBadge(offer)}<span class="visually-hidden">${difficulty[offer.difficulty]}</span><strong>+${offer.advance}%</strong></div><h3>${esc(pathObjectiveText(offer.objective))}</h3><p>${["goals", "assists", "wins"].includes(offer.objective.kind) ? "Pelo registo validado do jogo." : `Mínimo de ${offer.objective.minRatings} avaliações válidas por critério; apura às 48 horas do fecho. Sem sete votos por critério, cancela sem perda de progresso.`}</p>${!pathOfferAvailable(node, offer, state) ? `<p class="path-offer-blocked">Este avanço pode atingir outro nó em avaliação. Escolhe outra proposta ou aguarda o apuramento.</p>` : ""}<button class="btn ${offer.difficulty === 2 ? "btn-primary" : "btn-secondary"}" data-path-accept="${offer.id}" ${choiceLocked() || !pathOfferAvailable(node, offer, state) ? "disabled" : ""}>Escolher missão${icon("arrow")}</button></article>`).join("")}</div><div class="path-reroll"><button class="btn btn-secondary" data-path-reroll ${!pathRerollAvailable(state) || choiceLocked() ? "disabled" : ""}>${icon("refresh")}${pathRerollAvailable(state) ? "Renovar estas três missões" : "Reroll diário utilizado"}</button><p>Um reroll por dia, partilhado por todos os caminhos. Renova à meia-noite de Lisboa.</p></div><p class="path-failure-rule">${icon("refresh")}Falhar reinicia o avanço deste nó. A dificuldade aumenta o avanço, não o valor da recompensa.</p>` : `<p>Conhece as tuas três propostas para este nó. Ficam guardadas mesmo se saíres da página.</p><button class="btn btn-primary" data-path-offers>${icon("path")}Revelar as três missões</button>`}</section>`;
  }
  function draw(focus = false, animate = true) {
    if (disposed) return;
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
    ${state.lastResult ? `<div class="path-result ${state.lastResult.status}" role="status">${icon(state.lastResult.status === "success" ? "check" : "refresh")}<div><strong>${state.lastResult.completed ? (state.lastResult.completedNodeIds?.length > 1 ? `${state.lastResult.completedNodeIds.length} nós conquistados!` : "Nó conquistado!") : state.lastResult.status === "cancelled" ? "Tentativa cancelada. Progresso preservado." : state.lastResult.status === "success" ? `Mais um passo: ${state.lastResult.progress}%` : "Novo jogo. Nova oportunidade."}</strong><p>${esc(state.lastResult.reason)} ${state.lastResult.finalOverflow ? `Percurso terminado: ${state.lastResult.finalOverflow}% de excedente não geram pontos adicionais.` : ""} ${state.lastResult.status === "failure" ? "Este nó recomeça em 0%; os anteriores mantêm-se." : ""}</p></div>${pathResultAwards(state).length ? `<button class="btn btn-secondary" data-path-reveal>${pathResultAwards(state).length > 1 ? "Ver cartas conquistadas" : "Ver carta conquistada"}</button>` : ""}</div>` : ""}
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
              state = next;
              closeModal();
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
          "Usa Mudar caminho para explorar outras especializações. Os progressos e as propostas ficam guardados em cada uma.",
        ],
        [
          "missions",
          "Escolhe uma das três missões",
          "Compara a meta e a percentagem de avanço. Podes renovar um trio por dia; esse reroll é partilhado por todos os caminhos.",
        ],
        [
          "games",
          "Leva o desafio para o jogo",
          "Quando o próximo jogo abre, a missão fica bloqueada. Golos, assistências e vitórias apuram ao fechar; avaliações aguardam 48 horas, com sete votos por critério.",
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
