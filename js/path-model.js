// Shared, deterministic rules. Only the server creates offers and settles attempts.
import { pathMissionTemplates, pickDiversePathOffers, pathObjectiveRequirements, pathObjectiveLines } from "./path-missions.js";
import { PATH_DIFFICULTY_REVISION } from "./path-difficulty.js";
import {
  ATTRIBUTES,
  asDate,
  participants,
  matchPerformance,
  matchOutcome,
} from "./utils.js";

export const PATH_VERSION = 1;
export const pathAttributeLimit = (key) => (key === "goalkeeping" ? 25 : 15);
// The daily allowance belongs to the player, not to a route or browser session.
export function pathOfferDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}
export function pathRerollAvailable(state, now = new Date()) {
  return state.rerollDay !== pathOfferDay(now);
}
export function rerollPathOffers(
  state,
  node,
  now,
  random = Math.random,
  earned = {},
) {
  if (!node || !state.offers?.[node.id])
    throw Error("Revela primeiro as três propostas deste nó.");
  if (pathNodeReservation(node, state))
    throw Error("Este nó está reservado para uma tentativa em apuramento.");

  if (!pathRerollAvailable(state, now))
    throw Error(
      "Já utilizaste o reroll de hoje. Renova à meia-noite de Lisboa.",
    );
  return {
    ...state,
    offers: {
      ...state.offers,
      [node.id]: createPathOffers(node, random, earned, {
        recentFamilies: pathRecentFamilies(state, node.route),
        previousOffers: state.offers[node.id],
      }),
    },
    active: state.active?.nodeId === node.id ? null : state.active,
    rerollDay: pathOfferDay(now),
    revision: (state.revision || 0) + 1,
  };
}
export const PATH_ROUTES = ATTRIBUTES.map(([id, label, short], index) => ({
  id,
  label,
  short,
  name: [
    "Rasga o campo",
    "Instinto de golo",
    "Faz o jogo",
    "Bola no pé",
    "Fecha os caminhos",
    "Impõe-te",
    "Última linha",
    "Até ao fim",
    "Lê o jogo",
    "No lugar certo",
    "Juntos somos mais",
    "Cabeça fria",
  ][index],
  cardName: [
    "Rasante",
    "Predador",
    "Arquiteto",
    "Ilusionista",
    "Bastião",
    "Colosso",
    "Sentinela",
    "Incansável",
    "Oráculo",
    "Bússola",
    "Elo",
    "Imperturbável",
  ][index],
  color: [
    "#9fe870",
    "#ff947d",
    "#7bd9ff",
    "#d2a5ff",
    "#63dfb8",
    "#f3be70",
    "#ffe08a",
    "#a9deb7",
    "#a5baff",
    "#f7aca8",
    "#8ce3d9",
    "#d8cbff",
  ][index],
  icon: [
    "streak",
    "goals",
    "assists",
    "ball",
    "shield",
    "ratingStreak",
    "cleanSheets",
    "appearances",
    "preview",
    "missions",
    "players",
    "ratingAverage",
  ][index],
  criterion: {
    pace: "physical",
    shooting: "attack",
    passing: "passing",
    dribbling: "attack",
    defending: "defense",
    physical: "physical",
    goalkeeping: "goalkeeping",
    stamina: "physical",
    vision: "passing",
    positioning: "defense",
    teamwork: "attitude",
    composure: "attitude",
  }[id],
}));
const chapters = [
  "Primeiro toque",
  "Encontrar espaço",
  "Ganhar confiança",
  "Mudar o ritmo",
  "Deixar marca",
  "Subir o nível",
  "Assumir o jogo",
  "Ir mais longe",
  "Fazer história",
  "Entrar na elite",
];
export const PATH_FUSIONS = [
  {
    id: "fusion-attack",
    label: "Atacante completo",
    routes: ["shooting", "passing"],
    cardName: "Dupla Ameaça",
  },
  {
    id: "fusion-wall",
    label: "Fortaleza",
    routes: ["defending", "goalkeeping"],
    cardName: "Fortaleza",
  },
  {
    id: "fusion-engine",
    label: "Motor criativo",
    routes: ["stamina", "vision"],
    cardName: "Dínamo",
  },
];
export const PATH_NODES = [
  ...PATH_ROUTES.flatMap((route) =>
    Array.from({ length: pathAttributeLimit(route.id) }, (_, tier) =>
      (tier < 10 ? [0, 1] : [0]).map((lane) => ({
        id: `${route.id}-${tier}-${lane}`,
        route: route.id,
        tier,
        lane,
        label:
          tier === pathAttributeLimit(route.id) - 1
            ? "A tua assinatura"
            : tier >= 10
              ? `Prova de excelência ${tier - 9}`
              : chapters[tier],
        style: lane ? "legacy" : "standard",
        mode: "any",
        requires: tier
          ? tier <= 10
            ? [`${route.id}-${tier - 1}-0`, `${route.id}-${tier - 1}-1`]
            : [`${route.id}-${tier - 1}-0`]
          : [],
        rewardKeys: [route.id],
        specialId:
          tier === pathAttributeLimit(route.id) - 1 ||
          (lane === 1 && tier === 9)
            ? `path-${route.id}`
            : null,
      })),
    ).flat(),
  ),
  ...PATH_FUSIONS.flatMap((fusion) =>
    Array.from({ length: 5 }, (_, tier) => ({
      id: tier ? `${fusion.id}-${tier}` : fusion.id,
      route: fusion.id,
      label:
        tier === 4
          ? `A assinatura · ${fusion.label}`
          : `${fusion.label} · ${tier + 1}`,
      tier,
      lane: 0,
      style: "fusion",
      mode: "all",
      ...(tier
        ? {}
        : { groups: fusion.routes.map((id) => [`${id}-4-0`, `${id}-4-1`]) }),
      requires: tier
        ? [tier === 1 ? fusion.id : `${fusion.id}-${tier - 1}`]
        : [],
      rewardKeys: fusion.routes,
      specialId: tier === 4 ? `path-${fusion.id}` : null,
    })),
  ),
];
const nodeById = new Map(PATH_NODES.map((node) => [node.id, node]));
export const pathNode = (id) => nodeById.get(id);
export const pathRoute = (id) =>
  PATH_ROUTES.find((route) => route.id === id) ||
  PATH_FUSIONS.find((route) => route.id === id);
export function pathVisibleRoute(state, routeId) {
  return (
    PATH_FUSIONS.find(
      (fusion) =>
        (state.unifiedFusions || []).includes(fusion.id) &&
        fusion.routes.includes(routeId),
    )?.id || routeId
  );
}
export function unifyPathState(state, fusionId) {
  const fusion = PATH_FUSIONS.find((fusion) => fusion.id === fusionId),
    root = pathNode(fusionId);
  if (
    !fusion ||
    !root.groups.every((group) =>
      group.some((id) => state.nodes?.[id]?.completedAt),
    )
  )
    throw Error(
      "Conquista o marco 5 nas duas especializações para desbloquear esta fusão.",
    );
  const next = {
    ...state,
    unifiedFusions: [...new Set([...(state.unifiedFusions || []), fusionId])],
    activePath: fusionId,
    selectedNode: fusionId,
    revision: (state.revision || 0) + 1,
  };
  next.selectedNode =
    PATH_NODES.find(
      (node) =>
        node.route === fusionId &&
        !next.nodes[node.id]?.completedAt &&
        nodeAvailable(node, next),
    )?.id || fusionId;
  return next;
}
function affectedTiers(node, advance, state) {
  const tiers = new Set([node.tier]);
  let current = node,
    remaining = advance;
  while (current && remaining > 0) {
    const prior = state.nodes?.[current.id];
    if (!prior?.completedAt) {
      tiers.add(current.tier);
      remaining -= Math.max(0, 100 - (prior?.progress || 0));
    }
    current = pathNode(
      current.style === "fusion"
        ? `${current.route}-${current.tier + 1}`
        : `${current.route}-${current.tier + 1}-0`,
    );
  }
  return tiers;
}
export function pathNodeReservation(node, state = {}) {
  if (!node) return null;
  return (state.pending || []).find((attempt) => {
    const origin = pathNode(attempt.nodeId);
    return (
      origin?.route === node.route &&
      affectedTiers(origin, attempt.offer.advance, state).has(node.tier)
    );
  });
}
export function pathOfferAvailable(node, offer, state = {}) {
  if (!node || !offer) return false;
  const footprint = affectedTiers(node, offer.advance, state);
  return !(state.pending || []).some((attempt) => {
    const origin = pathNode(attempt.nodeId);
    return (
      origin?.route === node.route &&
      [...affectedTiers(origin, attempt.offer.advance, state)].some((tier) =>
        footprint.has(tier),
      )
    );
  });
}
export function nodeAvailable(node, state = {}) {
  if (!node) return false;
  if (
    node.style === "legacy" &&
    !state.offers?.[node.id] &&
    state.active?.nodeId !== node.id &&
    !state.nodes?.[node.id]
  )
    return false;
  if (pathNodeReservation(node, state)) return false;
  const completed = (id) => !!state.nodes?.[id]?.completedAt;
  if (node.groups) return node.groups.every((group) => group.some(completed));
  return (
    !node.requires.length ||
    (node.mode === "all"
      ? node.requires.every(completed)
      : node.requires.some(completed))
  );
}
export function nodeStatus(node, state = {}) {
  return state.nodes?.[node.id]?.completedAt
    ? "complete"
    : state.active?.nodeId === node.id ||
        (state.pending || []).some((attempt) => attempt.nodeId === node.id)
      ? "active"
      : pathNodeReservation(node, state)
        ? "reserved"
        : nodeAvailable(node, state)
          ? "available"
          : "locked";
}
export function emptyPathState(uid) {
  return {
    uid,
    version: PATH_VERSION,
    nodes: {},
    offers: {},
    active: null,
    pending: [],
    activePath: null,
    unifiedFusions: [],
    excludedGameIds: [],
    history: [],
    revision: 0,
    lastResult: null,
    reviews: {},
  };
}
// Preserve targets, progress and card eligibility. All unsettled attempts use
// the approved validation window; retain old proposal snapshots for auditing.
export function upgradePathProposals(state) {
  const upgrade = (offer, id = "") =>
    offer.proposalVersion >= 3
      ? offer
      : {
          ...offer,
          proposalVersion: 3,
          rarity:
            offer.rarity ||
            (id.startsWith("fusion-")
              ? ["gold", "special-gold", "elite"]
              : ["bronze", "silver", "gold"])[offer.difficulty || 0] ||
            "bronze",
          legacyFinalEligible:
            !(offer.proposalVersion >= 2) || id.startsWith("fusion-"),
          objective: {
            ...offer.objective,
            ...(!["goals", "assists", "wins"].includes(offer.objective.kind)
              ? { minRatings: 7 }
              : {}),
          },
        };
  const oldOffers = Object.values(state.offers || {}).some((offers) =>
    offers.some((offer) => !(offer.proposalVersion >= 3)),
  );
  const oldPreparation =
    state.active?.offer && !(state.active.offer.proposalVersion >= 3);
  const bound = !!state.active?.gameId;
  const oldPending = (state.pending || []).some(
    (attempt) => !(attempt.windowVersion >= 3),
  );
  if (!oldOffers && !oldPreparation && !bound && !oldPending) return state;
  const pending = (state.pending || []).map((attempt) =>
    attempt.windowVersion >= 3
      ? attempt
      : {
          ...attempt,
          legacyOfferSnapshot: attempt.legacyOfferSnapshot || attempt.offer,
          offer: upgrade(attempt.offer, attempt.nodeId),
          windowVersion: 3,
        },
  );
  if (bound && !pending.some((attempt) => attempt.id === state.active.id))
    pending.push({
      ...state.active,
      legacyAssociation: true,
      legacyOfferSnapshot: state.active.offer,
      offer: upgrade(state.active.offer, state.active.nodeId),
      frozenAt: state.active.acceptedAt,
      windowVersion: 3,
    });
  return {
    ...state,
    offers: oldOffers
      ? Object.fromEntries(
          Object.entries(state.offers || {}).map(([id, offers]) => [
            id,
            offers.map((offer) => upgrade(offer, id)),
          ]),
        )
      : state.offers,
    active: bound
      ? null
      : oldPreparation
        ? {
            ...state.active,
            offer: upgrade(state.active.offer, state.active.nodeId),
          }
        : state.active,
    pending,
  };
}
export function pathEarnedStats(rewards, uid) {
  const own = rewards.filter(
    (row) =>
      row.uid === uid &&
      row.source === "path" &&
      !row.revokedAt &&
      !row.pending &&
      row.reward?.statDuration === "permanent",
  );
  return Object.fromEntries(
    PATH_ROUTES.map((route) => [
      route.id,
      own.reduce((sum, row) => sum + (row.reward.boosts?.[route.id] || 0), 0),
    ]),
  );
}
export function pathRecentFamilies(state, routeId) {
  if (state.recentPathFamilies?.[routeId])
    return state.recentPathFamilies[routeId];
  return [...(state.history || []), ...(state.pending || [])]
    .filter(
      (row) =>
        pathNode(row.nodeId)?.route === routeId &&
        row.offer?.family &&
        row.frozenAt,
    )
    .slice(-3)
    .map((row) => row.offer.family);
}
export function createPathOffers(
  node,
  random = Math.random,
  earned = {},
  context = {},
) {
  const points = Math.max(...node.rewardKeys.map((key) => earned[key] || 0));
  const stage = points >= 10 ? 2 : points >= 5 ? 1 : 0;
  const pools = [25, 50, 100].map((baseAdvance, difficulty) => {
    const rare = difficulty === 2 ? random() : 0;
    const advance = rare >= 0.99 ? 200 : rare >= 0.95 ? 150 : baseAdvance;
    const rarity =
      advance === 200
        ? "ultimate"
        : advance === 150
          ? "icon"
          : (node.style === "fusion"
              ? ["gold", "special-gold", "elite"]
              : ["bronze", "silver", "gold"])[difficulty];
    return pathMissionTemplates(node.route, stage, difficulty).map(
      (template) => ({
        ...template,
        id: String(difficulty),
        difficulty,
        proposalVersion: 4,
        calibrationRevision: PATH_DIFFICULTY_REVISION,
        rarity,
        advance,
      }),
    );
  });
  return pickDiversePathOffers(
    pools,
    context.recentFamilies || [],
    random,
    context.previousOffers || [],
  );
}
const criterionNames = {
  attack: "Ataque",
  passing: "Passe",
  physical: "Físico",
  defense: "Defesa",
  goalkeeping: "Guarda-redes",
  attitude: "Atitude",
};
export function pathObjectiveText(objective) {
  if (objective.kind === "conditions") return pathObjectiveLines(objective).join(" · ");
  const value = String(objective.target).replace(".", ",");
  if (objective.kind === "wins") return "Vence o próximo jogo";
  if (objective.kind === "goals")
    return `Marca ${objective.target} ${objective.target === 1 ? "golo" : "golos"}`;
  if (objective.kind === "assists")
    return `Faz ${objective.target} ${objective.target === 1 ? "assistência" : "assistências"}`;
  if (objective.kind === "hybrid")
    return `${objective.criteria.includes("goalkeeping") ? "Joga a GR e obtém" : "Obtém"} ${value}★ em cada critério: ${objective.criteria.map((key) => criterionNames[key]).join(" e ")}`;
  const rating = `${value}★ em ${criterionNames[objective.criterion]}`;
  if (objective.kind === "ratingWin") return `Vence com pelo menos ${rating}`;
  if (objective.kind === "keeper")
    return `Joga a GR com ${rating} e sofre no máximo ${objective.maxConceded} ${objective.maxConceded === 1 ? "golo" : "golos"}`;
  return `${objective.criterion === "goalkeeping" ? "Joga a GR e obtém" : "Obtém"} pelo menos ${rating}`;
}
export const pathTime = (value) => (value ? +asDate(value) : 0);
export function nextPathGame(games, uid, acceptedAt, excluded = []) {
  return (
    games
      .filter(
        (game) =>
          ["open", "closed"].includes(game.status) &&
          !game.deleting &&
          participants(game).includes(uid) &&
          pathTime(game.scheduledAt) > pathTime(acceptedAt) &&
          !excluded.includes(game.id),
      )
      .sort(
        (a, b) =>
          pathTime(a.scheduledAt) - pathTime(b.scheduledAt) ||
          a.id.localeCompare(b.id),
      )[0] || null
  );
}
// A stale aggregate or too little feedback is a waiting state, never a defeat.
export function evaluatePathMission(objective, game, summary, uid) {
  pathObjectiveRequirements(objective);
  if (objective.kind === "conditions") return evaluatePathConditions(objective, game, summary, uid);
  if (!game || game.status !== "closed")
    return {
      status: "waiting",
      reason: "À espera do resultado do próximo jogo.",
    };
  if (!participants(game).includes(uid))
    return {
      status: "absent",
      reason: "Não participaste; a missão passa para o próximo jogo.",
    };
  if (objective.kind === "wins")
    return {
      status: matchOutcome(uid, game) > 0 ? "success" : "failure",
      reason:
        matchOutcome(uid, game) > 0
          ? "Vitória confirmada."
          : "A vitória não foi alcançada.",
    };
  const performance =
    game.pathPerformance?.[uid] || matchPerformance(uid, game);
  if (["goals", "assists"].includes(objective.kind)) {
    const actual = performance[objective.kind] || 0;
    return {
      status: actual >= objective.target ? "success" : "failure",
      reason: `${actual} / ${objective.target} ${objective.kind === "goals" ? "golos" : "assistências"}.`,
      actual,
    };
  }
  if (
    (objective.criterion === "goalkeeping" ||
      objective.criteria?.includes("goalkeeping")) &&
    game.positions?.[uid] !== "GR"
  )
    return {
      status: "failure",
      reason: "Este desafio exigia jogar na posição GR.",
    };
  const sameTeams = ["teamA", "teamB"].every((side) =>
    ["starters", "bench"].every(
      (kind) =>
        [...(game[side]?.[kind] || [])].sort().join("|") ===
        [...(summary?.[side]?.[kind] || [])].sort().join("|"),
    ),
  );
  const player = summary?.players?.[uid];
  const criteria = objective.criteria || [objective.criterion];
  if (
    summary?.status !== "closed" ||
    !sameTeams ||
    pathTime(summary.closedAt) !== pathTime(game.closedAt) ||
    !player ||
    (criteria.includes("goalkeeping") &&
      player.goalkeepingEligible === false) ||
    criteria.some(
      (key) =>
        !Number.isFinite(player[key]) ||
        (player.ratingCounts?.[key] || 0) < objective.minRatings,
    )
  )
    return {
      status: "waiting",
      reason: `À espera de ${objective.minRatings} avaliações válidas por critério.`,
    };
  const own = [
    ...(game.teamA?.starters || []),
    ...(game.teamA?.bench || []),
  ].includes(uid)
    ? "teamA"
    : "teamB";
  const conceded = game.score[own === "teamA" ? "teamB" : "teamA"];
  const success =
    criteria.every((key) => player[key] >= objective.target) &&
    (objective.kind !== "ratingWin" || matchOutcome(uid, game) > 0) &&
    (objective.kind !== "keeper" || conceded <= objective.maxConceded);
  return {
    status: success ? "success" : "failure",
    reason:
      criteria
        .map(
          (key) =>
            `${criterionNames[key]}: ${player[key].toFixed(2).replace(".", ",")}★`,
        )
        .join(" · ") +
      (objective.kind === "ratingWin"
        ? matchOutcome(uid, game) > 0
          ? " · Vitória"
          : " · Sem vitória"
        : objective.kind === "keeper"
          ? ` · ${conceded} sofridos`
          : ""),
  };
}
export function evaluatePathConditions(objective, game, summary, uid) {
  const { conditions, criteria, goalkeeper } =
    pathObjectiveRequirements(objective);
  if (!game || game.status !== "closed")
    return { status: "waiting", reason: "À espera do fecho do jogo." };
  if (
    !participants(game).includes(uid) ||
    (goalkeeper && game.positions?.[uid] !== "GR") ||
    (goalkeeper && summary?.players?.[uid]?.goalkeepingEligible === false)
  )
    return {
      status: "cancelled",
      reason: "Participação não elegível; progresso preservado.",
    };
  // Reuse legacy snapshot validation, including roster, close timestamp and votes.
  if (criteria.length) {
    const readiness = evaluatePathMission(
      { kind: "hybrid", criteria, target: 0, minRatings: 7 },
      game,
      summary,
      uid,
    );
    if (readiness.status !== "success") return readiness;
  }
  const own = [
    ...(game.teamA?.starters || []),
    ...(game.teamA?.bench || []),
  ].includes(uid)
    ? "teamA"
    : "teamB";
  const performance =
    game.pathPerformance?.[uid] || matchPerformance(uid, game);
  const values = {
    position: game.positions?.[uid],
    goals: performance.goals || 0,
    assists: performance.assists || 0,
    contributions: (performance.goals || 0) + (performance.assists || 0),
    win: matchOutcome(uid, game) > 0 ? 1 : 0,
    teamGoals: game.score?.[own],
    conceded: game.score?.[own === "teamA" ? "teamB" : "teamA"],
  };
  const conditionResults = conditions.map((condition) => {
    const actual =
      condition.metric === "rating"
        ? summary.players[uid][condition.criterion]
        : values[condition.metric];
    const valid =
      condition.metric === "position"
        ? actual === condition.target
        : Number.isFinite(actual);
    return {
      ...condition,
      actual: actual ?? null,
      status: !valid
        ? "waiting"
        : (
              condition.metric === "position"
                ? actual === condition.target
                : condition.metric === "conceded"
                  ? actual <= condition.target
                  : actual >= condition.target
            )
          ? "success"
          : "failure",
    };
  });
  const status = conditionResults.some((row) => row.status === "waiting")
    ? "waiting"
    : conditionResults.every((row) => row.status === "success")
      ? "success"
      : "failure";
  const reason = conditionResults
    .map((row) => {
      const label =
        row.metric === "rating"
          ? criterionNames[row.criterion]
          : {
              goals: "Golos",
              assists: "Assistências",
              contributions: "Contribuições",
              win: "Vitória",
              teamGoals: "Golos da equipa",
              conceded: "Golos sofridos",
              position: "Posição",
            }[row.metric];
      if (row.metric === "position") return `${label}: ${row.actual}`;
      if (row.metric === "win") return `Vitória: ${row.actual ? "sim" : "não"}`;
      return `${label}: ${row.actual === null ? "por validar" : String(row.actual).replace(".", ",")}${row.metric === "rating" ? "★" : ""} (${row.metric === "conceded" ? "máximo" : "mínimo"} ${String(row.target).replace(".", ",")}${row.metric === "rating" ? "★" : ""})`;
    })
    .join(" · ");
  return { status, reason, conditionResults };
}
export function settlePathState(state, attempt, result, now) {
  if (
    !["success", "failure", "cancelled"].includes(result.status) ||
    state.history.some((row) => row.id === attempt.id)
  )
    return state;
  const next = structuredClone(state),
    prior = next.nodes[attempt.nodeId] || { progress: 0 };
  const completedNodeIds = [];
  let remaining = result.status === "success" ? attempt.offer.advance : 0;
  let node = pathNode(attempt.nodeId);
  if (result.status === "failure")
    next.nodes[attempt.nodeId] = { ...prior, progress: 0 };
  while (remaining > 0 && node) {
    const existing = next.nodes[node.id] || { progress: 0 };
    if (!existing.completedAt) {
      const used = Math.min(100 - existing.progress, remaining);
      const progress = existing.progress + used;
      remaining -= used;
      next.nodes[node.id] = {
        ...existing,
        progress,
        ...(progress === 100 ? { completedAt: now } : {}),
      };
      if (progress === 100) completedNodeIds.push(node.id);
      else break;
    }
    // Overflow follows this specialization only; it never enters a fusion.
    node = pathNode(
      node.style === "fusion"
        ? `${node.route}-${node.tier + 1}`
        : `${node.route}-${node.tier + 1}-0`,
    );
  }
  const progress = next.nodes[attempt.nodeId]?.progress || 0;
  next.lastResult = {
    ...attempt,
    ...result,
    progress,
    completed: completedNodeIds.length > 0,
    completedNodeIds,
    finalOverflow: remaining,
    settledAt: now,
  };
  next.history.push(next.lastResult);
  if (next.active?.id === attempt.id) next.active = null;
  next.pending = (next.pending || []).filter((row) => row.id !== attempt.id);
  const suggestion = PATH_NODES.find(
    (candidate) =>
      candidate.route === pathNode(attempt.nodeId)?.route &&
      candidate.style !== "legacy" &&
      !next.nodes[candidate.id]?.completedAt &&
      nodeAvailable(candidate, next),
  );
  if (
    suggestion &&
    !next.active &&
    (!next.selectedNode ||
      pathNode(next.selectedNode)?.route === pathNode(attempt.nodeId)?.route)
  )
    next.selectedNode = suggestion.id;
  for (const id of new Set([attempt.nodeId, ...completedNodeIds]))
    delete next.offers[id];
  next.revision++;
  return next;
}
export function pathRewardPreview(node, rewards, uid) {
  return Object.fromEntries(
    node.rewardKeys.map((key) => {
      const prior = rewards.filter(
        (row) =>
          row.uid === uid &&
          !row.revokedAt &&
          !row.pending &&
          row.reward?.statDuration === "permanent",
      );
      const own = prior
        .filter((row) => row.source === "path")
        .reduce((sum, row) => sum + (row.reward.boosts?.[key] || 0), 0);
      return [key, Math.max(0, Math.min(1, pathAttributeLimit(key) - own))];
    }),
  );
}
export function pathResultAwards(state = {}) {
  const latest=state.lastResult;
  if (!latest) return [];
  const awards=new Map();
  for(const row of [...(state.history || []),latest]) {
    if (row.id !== latest.id && (!latest.settledAt || row.settledAt !== latest.settledAt)) continue;
    for(const reward of [...(row.rewards || []),row.reward].filter(Boolean)) {
      if (reward.specialId?.startsWith("path-") && pathRoute(reward.specialId.slice(5))) awards.set(reward.specialId,{id:row.id,specialId:reward.specialId});
    }
  }
  return [...awards.values()];
}
