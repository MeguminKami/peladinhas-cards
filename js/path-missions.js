// Shared v4 catalogue. Only trusted server code turns these templates into offers.
import { PATH_GOAL_TARGETS } from "./path-difficulty.js";
const names = {
  overall: "Desempenho geral",
  attack: "Ataque",
  passing: "Passe",
  physical: "Físico",
  defense: "Defesa",
  goalkeeping: "Guarda-redes",
  attitude: "Atitude",
};
const metricOrder = [
  "position",
  "games",
  "nonLoss",
  "draw",
  "loss",
  "cleanSheet",
  "goals",
  "assists",
  "contributions",
  "win",
  "teamGoals",
  "conceded",
  "ratingMean",
  "rating",
];
const c = (metric, target, criterion) => ({
  metric,
  target,
  ...(criterion ? { criterion } : {}),
});
const r = (criterion, target = 3.25) => c("rating", target, criterion);
const g = (n = 1) => c("goals", n),
  a = (n = 1) => c("assists", n);
const contribution = (n = 1) => c("contributions", n);
const win = () => c("win", 1),
  team = () => c("teamGoals", 3),
  solid = () => c("conceded", 2);
const attitude = () => r("attitude", 4),
  keeper = () => c("position", "GR");
const entry = (id, title, ...conditions) => ({ id, title, conditions });
const catalogue = {
  pace: [
    entry("base", "Base física", r("physical", 3.5)),
    entry("win", "Ritmo vencedor", win(), r("physical", 3)),
    entry("contribute", "Arranque ofensivo", contribution(), r("physical")),
    entry("attack", "Acelerar o ataque", r("physical"), r("attack")),
    entry("defend", "Recuperar terreno", r("physical"), r("defense")),
    entry("pass", "Ritmo de circulação", r("physical"), r("passing")),
    entry("goal", "Chegar para finalizar", g(), r("physical")),
    entry("assist", "Dar seguimento", a(), r("physical")),
  ],
  shooting: [
    entry("base", "Qualidade ofensiva", r("attack", 3.5)),
    entry("goals", "Instinto de marcador", g(2)),
    entry("quality", "Golo com assinatura", g(), r("attack")),
    entry("serve", "Marcar e servir", g(), a()),
    entry("contribute", "Produção com golo", contribution(3), g()),
    entry("win", "Golo na vitória", win(), g()),
    entry("team", "Parte do ataque", g(), team()),
    entry("attitude", "Finalizar com cabeça", g(), attitude()),
  ],
  passing: [
    entry("base", "Qualidade de passe", r("passing", 3.5)),
    entry("assists", "Serviço de golo", a()),
    entry("quality", "Assistência com qualidade", a(), r("passing")),
    entry("assist-win", "Passe para ganhar", win(), a()),
    entry("attitude", "Distribuir com critério", r("passing"), attitude()),
    entry("defend", "Saída de jogo", r("passing"), r("defense")),
    entry("win", "Passe na vitória", win(), r("passing")),
    entry("team", "Construção coletiva", r("passing"), team()),
  ],
  dribbling: [
    entry("base", "Qualidade ofensiva", r("attack", 3.5)),
    entry("goals", "Resolver na frente", g(2)),
    entry(
      "contribute",
      "Desequilibrar e contribuir",
      contribution(),
      r("attack"),
    ),
    entry("physical", "Presença ofensiva", r("attack"), r("physical")),
    entry("assist", "Criar e servir", a(), r("attack")),
    entry("pass", "Ligar a jogada", r("attack"), r("passing")),
    entry("win", "Atacar para ganhar", win(), r("attack")),
    entry("attitude", "Talento com critério", r("attack"), attitude()),
  ],
  defending: [
    entry("base", "Segurança defensiva", r("defense", 3.5)),
    entry("victory", "Resultado coletivo", win()),
    entry("win", "Defender para ganhar", win(), r("defense", 3)),
    entry("solid", "Bloco sólido", solid(), r("defense")),
    entry("attitude", "Compromisso defensivo", r("defense"), attitude()),
    entry("pass", "Defender e construir", r("defense"), r("passing")),
    entry("physical", "Presença nos duelos", r("defense"), r("physical")),
    entry("contribute", "Defender e decidir", contribution(), r("defense")),
  ],
  physical: [
    entry("base", "Presença física", r("physical", 3.5)),
    entry("victory", "Resultado coletivo", win()),
    entry("win", "Força na vitória", win(), r("physical", 3)),
    entry("defend", "Presença defensiva", r("physical"), r("defense")),
    entry("goal", "Presença na frente", g(), r("physical")),
    entry("pass", "Força com critério", r("physical"), r("passing")),
    entry("contribute", "Impor e contribuir", contribution(), r("physical")),
    entry(
      "team-win",
      "Força coletiva",
      win(),
      r("physical", 3),
      r("attitude", 3.75),
    ),
  ],
  goalkeeping: [
    entry("base", "Segurança na baliza", r("goalkeeping", 3.5)),
    entry("solid", "Baliza protegida", r("goalkeeping"), solid()),
    entry("pass", "Primeiro passe", r("goalkeeping"), r("passing")),
    entry("attitude", "Comando da área", r("goalkeeping"), attitude()),
    entry("win", "Muralha vencedora", win(), r("goalkeeping")),
    entry("defend", "Organização defensiva", r("goalkeeping"), r("defense")),
    entry("assist", "Assistência da baliza", a(), r("goalkeeping")),
    entry(
      "solid-pass",
      "Solidez com distribuição",
      solid(),
      r("goalkeeping", 3),
      r("passing", 3),
    ),
  ],
  stamina: [
    entry("base", "Base física", r("physical", 3.5)),
    entry("victory", "Resultado coletivo", win()),
    entry("win", "Motor vencedor", win(), r("physical", 3)),
    entry("attitude", "Compromisso total", r("physical"), attitude()),
    entry(
      "all-round",
      "Campo inteiro",
      r("physical", 3),
      r("attack", 3),
      r("defense", 3),
    ),
    entry("assist", "Fôlego criativo", a(), r("physical")),
    entry(
      "solid",
      "Sustentar o bloco",
      solid(),
      r("physical"),
      r("defense", 3),
    ),
    entry(
      "balanced-win",
      "Equilíbrio na vitória",
      win(),
      r("physical", 3),
      r("defense", 3),
    ),
  ],
  vision: [
    entry("base", "Leitura do jogo", r("passing", 3.5)),
    entry("assists", "Encontrar o colega", a()),
    entry("quality", "Ver e executar", a(), r("passing")),
    entry("attack", "Ligar o ataque", r("passing"), r("attack")),
    entry("team", "Criador coletivo", a(), team()),
    entry("contribute", "Ler e contribuir", contribution(), r("passing")),
    entry("win", "Criar para ganhar", win(), a()),
    entry("attack-assist", "Criatividade validada", a(), r("attack")),
  ],
  positioning: [
    entry("base", "Leitura defensiva", r("defense", 3.5)),
    entry("win", "Organização vencedora", win(), r("defense", 3)),
    entry("pass", "Disponível para construir", r("defense"), r("passing")),
    entry("attack", "Equilíbrio entre setores", r("defense"), r("attack")),
    entry("solid", "Fechar espaços", solid(), r("defense")),
    entry("attitude", "Disciplina coletiva", r("defense"), attitude()),
    entry("assist", "Apoio à criação", a(), r("defense")),
    entry(
      "pass-win",
      "Saída vencedora",
      win(),
      r("defense", 3),
      r("passing", 3),
    ),
  ],
  teamwork: [
    entry("base", "Espírito coletivo", attitude()),
    entry("assists", "Servir o colega", a()),
    entry("victory", "Ganhar juntos", win()),
    entry("quality", "Ao serviço dos outros", a(), attitude()),
    entry("pass", "Ligação coletiva", attitude(), r("passing")),
    entry("win", "Compromisso vencedor", win(), attitude()),
    entry("team", "Todos contam", contribution(), attitude(), team()),
    entry("defend", "Ajudar a defender", attitude(), r("defense")),
  ],
  composure: [
    entry("base", "Cabeça fria", attitude()),
    entry("win", "Serenidade na vitória", win(), r("attitude", 3.75)),
    entry("pass", "Decidir com critério", attitude(), r("passing")),
    entry("goal", "Finalizar com cabeça", g(), attitude()),
    entry("defend", "Segurança atrás", attitude(), r("defense")),
    entry("contribute", "Contribuir com critério", contribution(), attitude()),
    entry("attack", "Qualidade ofensiva", attitude(), r("attack")),
    entry(
      "pass-win",
      "Controlar e ganhar",
      win(),
      r("attitude", 3.75),
      r("passing", 3),
    ),
  ],

};
// Two observable qualities per fusion. Positioning/vision/dribbling use proxies,
// never invented match counters. Every fusion model retains both quality anchors.
const fusionCriteria = {
  "fusion-keeper": ["goalkeeping", "defense"],
  "fusion-central": ["defense", "physical"],
  "fusion-winger": ["physical", "attack"],
  "fusion-maestro": ["passing", "attitude"],
  "fusion-predator": ["attack", "physical"],
};
Object.assign(catalogue, {
  "fusion-keeper": [
    entry("base", "Dominar a área", r("goalkeeping",3.5), r("defense",3.5)),
    entry("solid", "Área protegida", solid()),
    entry("win", "Última palavra", win()),
    entry("pass", "Saída segura", r("passing")),
    entry("attitude", "Comandar a linha", attitude()),
    entry("assist", "Lançar o contra-ataque", a()),
    entry("solid-pass", "Antecipar e distribuir", solid(),r("passing")),
    entry("solid-win", "Fechar a vitória", win(),solid()),
  ],
  "fusion-central": [
    entry("base", "Impor respeito", r("defense",3.5),r("physical",3.5)),
    entry("solid", "Duelo ganho", solid()),
    entry("win", "Segurar os três pontos", win()),
    entry("pass", "Construção sem medo", r("passing")),
    entry("attitude", "Liderar o bloco", attitude()),
    entry("contribute", "Decidir nas duas áreas", contribution()),
    entry("solid-pass", "Recuperar e sair", solid(),r("passing")),
    entry("solid-win", "Vitória de aço", win(),solid()),
  ],
  "fusion-winger": [
    entry("base", "Rasgar a linha", r("physical",3.5),r("attack",3.5)),
    entry("contribute", "Mudança de velocidade", contribution()),
    entry("goals", "Diagonal de golo", g()),
    entry("assist", "Ganhar a linha e servir", a()),
    entry("win", "Ala decisivo", win()),
    entry("pass", "Acelerar a combinação", r("passing")),
    entry("team", "Abrir a defesa", team()),
    entry("attitude", "Ousadia com critério", attitude()),
  ],
  "fusion-maestro": [
    entry("base", "Ler antes de receber", r("passing",3.5),attitude()),
    entry("assists", "O último passe", a()),
    entry("contribute", "No centro da decisão", contribution()),
    entry("win", "Ditar a vitória", win()),
    entry("defend", "Controlar os dois momentos", r("defense")),
    entry("team", "Fazer jogar a equipa", team()),
    entry("attack", "Encontrar a abertura", r("attack")),
    entry("serve", "Passe e chegada", g(),a()),
  ],
  "fusion-predator": [
    entry("base", "Criar o próprio espaço", r("attack",3.5),r("physical",3.5)),
    entry("goals", "Instinto e desequilíbrio", g(2)),
    entry("serve", "Atrair e decidir", g(),a()),
    entry("contribute", "Ameaça constante", contribution()),
    entry("win", "Assinar a vitória", win(),g()),
    entry("team", "Romper o bloco", g(),team()),
    entry("attitude", "Frieza no último toque", g(),attitude()),
    entry("pass", "Decidir em combinação", a(),r("passing")),
  ],
});

const conditionKey = (condition) =>
  `${condition.metric}:${condition.criterion || condition.criteria?.join(",") || ""}`;
export function normalizePathConditions(objective) {
  if (
    objective?.kind !== "conditions" ||
    !Array.isArray(objective.conditions) ||
    !objective.conditions.length ||
    objective.conditions.length > 8
  )
    throw Error("Objetivo composto inválido.");
  const unique = new Map();
  for (const condition of objective.conditions) {
    const { metric, criterion, target } = condition;
    if (
      !metricOrder.includes(metric) ||
      (metric !== "ratingMean" && condition.criteria !== undefined) ||
      (metric === "ratingMean" && criterion !== undefined) ||
      (condition.comparison === "gt" && target === 5) ||
      (["rating", "ratingMean"].includes(metric)
        ? (metric === "rating"
            ? !names[criterion]
            : !Array.isArray(condition.criteria) ||
              condition.criteria.length < 2 ||
              condition.criteria.length > 7 ||
              new Set(condition.criteria).size !== condition.criteria.length ||
              condition.criteria.some((key) => !names[key])) ||
          !Number.isFinite(target) ||
          target <= 0 ||
          target > 5
        : criterion !== undefined ||
          (metric === "position"
            ? !["GR", "DEF", "MED", "ALA", "AV"].includes(target)
            : !Number.isSafeInteger(target) ||
              target < (metric === "conceded" ? 0 : 1) ||
              target > 100 ||
              ([
                "win",
                "games",
                "nonLoss",
                "draw",
                "loss",
                "cleanSheet",
              ].includes(metric) &&
                target !== 1))) ||
      (condition.comparison !== undefined &&
        (!["rating", "ratingMean"].includes(metric) ||
          !["gte", "gt"].includes(condition.comparison)))
    )
      throw Error("Condição de missão inválida.");
    const value = c(metric, target, criterion);
    if (metric === "ratingMean")
      value.criteria = [...condition.criteria].sort();
    if (condition.comparison === "gt") value.comparison = "gt";
    const key = conditionKey(value),
      prior = unique.get(key);
    if (
      !prior ||
      (metric === "conceded" ? target < prior.target : target > prior.target) ||
      (target === prior.target && value.comparison === "gt")
    )
      unique.set(key, value);
  }
  const individual =
    (unique.get("goals:")?.target || 0) + (unique.get("assists:")?.target || 0);
  if ((unique.get("contributions:")?.target ?? Infinity) <= individual)
    unique.delete("contributions:");
  const teamMinimum = Math.max(
    unique.get("goals:")?.target || 0,
    unique.get("assists:")?.target || 0,
    unique.get("win:")?.target || 0,
  );
  if ((unique.get("teamGoals:")?.target ?? Infinity) <= teamMinimum)
    unique.delete("teamGoals:");
  return [...unique.values()].sort((a, b) =>
    conditionKey(a).localeCompare(conditionKey(b), "en"),
  );
}

export function pathObjectiveRequirements(objective) {
  if (objective?.kind === "conditions") {
    const conditions = normalizePathConditions(objective);
    return {
      criteria: [
        ...new Set(
          conditions.flatMap((row) =>
            row.metric === "rating"
              ? [row.criterion]
              : row.metric === "ratingMean"
                ? row.criteria
                : [],
          ),
        ),
      ],
      goalkeeper: conditions.some(
        (row) =>
          (row.metric === "position" && row.target === "GR") ||
          row.criterion === "goalkeeping" ||
          row.criteria?.includes("goalkeeping"),
      ),
      conditions,
    };
  }
  if (["goals", "assists", "wins"].includes(objective?.kind))
    return { criteria: [], goalkeeper: false };
  if (!["rating", "ratingWin", "keeper", "hybrid"].includes(objective?.kind))
    throw Error("Tipo de missão desconhecido.");
  const criteria = objective.criteria || [objective.criterion];
  if (!criteria.length || criteria.some((key) => !names[key]))
    throw Error("Critérios de missão inválidos.");
  return {
    criteria: [...new Set(criteria)],
    goalkeeper: criteria.includes("goalkeeping"),
  };
}

function familyFor(conditions) {
  const metrics = conditions
    .filter((row) => row.metric !== "position")
    .map((row) => row.metric);
  const ratings = metrics.filter((metric) =>
    ["rating", "ratingMean"].includes(metric),
  ).length;
  for (const metric of [
    "games",
    "nonLoss",
    "draw",
    "loss",
    "cleanSheet",
    "ratingMean",
  ])
    if (metrics.includes(metric)) return metric;
  if (metrics.includes("conceded")) return "solidity";
  if (metrics.includes("win"))
    return ratings
      ? "result-quality"
      : metrics.length === 1
        ? "victory"
        : "result-action";
  if (metrics.includes("teamGoals"))
    return ratings ? "team-quality" : "team-action";
  if (ratings && metrics.length > ratings) return "action-quality";
  if (ratings) return ratings === 1 ? "rating" : "combined-rating";
  if (metrics.includes("goals") && metrics.includes("assists"))
    return "score-and-assist";
  return metrics.includes("contributions")
    ? "contributions"
    : "individual-action";
}

// Explicit, manually reviewed targets; dated samples are not success forecasts.
export function pathMissionTemplates(routeId, stage = 0, difficulty = 0) {
  if (
    !catalogue[routeId] ||
    ![0, 1, 2].includes(stage) ||
    ![0, 1, 2].includes(difficulty)
  )
    throw Error("Catálogo de missões inválido.");
  const primary =
    {
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
      ...Object.fromEntries(Object.entries(fusionCriteria).map(([id,criteria])=>[id,criteria[0]])),
    }[routeId] || "attitude";
  const secondary = fusionCriteria[routeId]?.[1] || (primary === "passing" ? "attitude" : "passing");
  const position = ["goalkeeping", "fusion-keeper"].includes(routeId)
    ? "GR"
    : {
        shooting: "AV",
        dribbling: "ALA",
        pace: "ALA",
        defending: "DEF",
        physical: "DEF",
        positioning: "DEF",
        "fusion-central":"DEF", "fusion-winger":"ALA", "fusion-maestro":"MED", "fusion-predator":"AV",
      }[routeId] || "MED";
  const anchor = () => [
    r(primary),
    ...(routeId === "shooting" ? [g()] : []),
    ...(fusionCriteria[routeId] ? [r(secondary)] : []),
  ];
  const mean = () => ({
    metric: "ratingMean",
    target: 3.5,
    criteria: [primary, secondary],
  });
  const extra = [
    entry(
      "next-position",
      "Cumprir o papel",
      c("games", 1),
      c("position", position),
      ...anchor(),
    ),
    entry("next-unbeaten", "Somar sem perder", c("nonLoss", 1), ...anchor()),
    entry("next-mean", "Equilíbrio de qualidades", mean(), ...anchor()),
    entry("next-overall", "Exibição completa", r("overall", 3.5), ...anchor()),
    entry(
      "next-strict",
      "Superar a fasquia",
      { ...r(primary, 3.5), comparison: "gt" },
      ...(routeId === "shooting" ? [g()] : []),
      ...(fusionCriteria[routeId] ? [r(secondary)] : []),
    ),
    entry(
      "next-team-mean",
      "Qualidade ao serviço da equipa",
      team(),
      mean(),
      ...anchor(),
    ),
    entry(
      "next-overall-action",
      "Participação decisiva",
      contribution(),
      r("overall", 3.5),
      ...anchor(),
    ),
  ];
  return [...catalogue[routeId], ...extra]
    .filter((template) => difficulty === 0 || template.id !== "victory")
    .map((template) => {
      const rawConditions = [...template.conditions];
      for (const criterion of fusionCriteria[routeId] || [])
        if (!rawConditions.some(row=>row.metric==="rating" && row.criterion===criterion)) rawConditions.push(r(criterion));
      const conditions = rawConditions.map((condition) => {
        const { metric, target, criterion } = condition;
        if (["rating", "ratingMean"].includes(metric)) {
          const solo = rawConditions.length === 1;
          const adjusted = solo
            ? (criterion === "attitude"
                ? [
                    [3.5, 4, 4.25],
                    [3.75, 4.25, 4.5],
                    [4, 4.5, 4.75],
                  ]
                : [
                    [3, 3.5, 4],
                    [3.25, 3.75, 4.25],
                    [3.75, 4, 4.5],
                  ])[stage][difficulty]
            : Math.min(
                criterion === "attitude" ? 4.5 : 4,
                Math.max(
                  criterion === "attitude" ? 3.5 : 2.5,
                  target + (difficulty - 1) * 0.25 + stage * 0.25,
                ),
              );
          return { ...condition, target: adjusted };
        }
        if (metric === "goals")
          return g(
            rawConditions.length === 1
              ? PATH_GOAL_TARGETS.goals[stage][difficulty]
              : Math.max(
                  target,
                  PATH_GOAL_TARGETS.mixedGoals[stage][difficulty],
                ),
          );
        if (metric === "assists" && rawConditions.length === 1)
          return a(PATH_GOAL_TARGETS.assists[stage][difficulty]);
        if (metric === "contributions")
          return contribution(
            Math.max(
              target,
              PATH_GOAL_TARGETS.contributions[stage][difficulty],
            ),
          );
        if (metric === "conceded")
          return solidTarget(PATH_GOAL_TARGETS.conceded[stage][difficulty]);
        if (metric === "teamGoals")
          return c(metric, PATH_GOAL_TARGETS.teamGoals[stage][difficulty]);
        return { ...condition };
      });
      if (["goalkeeping", "fusion-keeper"].includes(routeId))
        conditions.unshift(keeper());
      const objective = {
        kind: "conditions",
        conditions: normalizePathConditions({ kind: "conditions", conditions }),
        minRatings: 7,
      };
      return {
        templateId: `${routeId}:${template.id}`,
        title: template.title,
        family: familyFor(objective.conditions),
        objective,
      };
    });
}
const solidTarget = (target) => c("conceded", target);

export function pathConditionsImply(harder, easier) {
  const source = normalizePathConditions(harder),
    target = normalizePathConditions(easier);
  const minimum = (metric) =>
    source.find((row) => row.metric === metric)?.target || 0;
  const teamMinimum = Math.max(
    minimum("teamGoals"),
    minimum("goals"),
    minimum("assists"),
    minimum("win"),
    Math.ceil(minimum("contributions") / 2),
  );
  return target.every((condition) => {
    const own = source.find(
      (row) => conditionKey(row) === conditionKey(condition),
    );
    if (own && ["rating", "ratingMean"].includes(condition.metric))
      return (
        own.target > condition.target ||
        (own.target === condition.target &&
          (condition.comparison !== "gt" || own.comparison === "gt"))
      );
    if (condition.metric === "contributions") {
      const total = source
        .filter((row) => ["goals", "assists"].includes(row.metric))
        .reduce((sum, row) => sum + row.target, 0);
      return Math.max(own?.target || 0, total) >= condition.target;
    }
    if (condition.metric === "teamGoals")
      return teamMinimum >= condition.target;
    if (condition.metric === "win" && !own) {
      const conceded = source.find((row) => row.metric === "conceded");
      return !!conceded && teamMinimum > conceded.target;
    }
    return (
      own &&
      (condition.metric === "position"
        ? own.target === condition.target
        : condition.metric === "conceded"
          ? own.target <= condition.target
          : own.target >= condition.target)
    );
  });
}

export function pickDiversePathOffers(
  pools,
  recentFamilies = [],
  random = Math.random,
  previousOffers = [],
) {
  const previousFamilies = previousOffers.map((row) => row.family);
  const previousTemplates = previousOffers.map((row) => row.templateId);
  const ranked = pools.map((pool) =>
    pool
      .map((candidate) => {
        const repeats = recentFamilies.filter(
          (family) => family === candidate.family,
        ).length;
        const weight =
          1 /
          (1 +
            repeats * 3 +
            (previousFamilies.includes(candidate.family) ? 6 : 0) +
            (previousTemplates.includes(candidate.templateId) ? 12 : 0));
        const draw = Math.min(
          1 - Number.EPSILON,
          Math.max(Number.EPSILON, random()),
        );
        return { candidate, score: -Math.log(draw) / weight };
      })
      .sort((a, b) => a.score - b.score)
      .map((row) => row.candidate),
  );
  const compatible = (candidate, selected) =>
    selected.every((other) => {
      if (candidate.templateId === other.templateId) return false;
      const forward = pathConditionsImply(candidate.objective, other.objective);
      const backward = pathConditionsImply(
        other.objective,
        candidate.objective,
      );
      if (forward && backward) return false;
      return (
        !(forward && candidate.advance < other.advance) &&
        !(backward && other.advance < candidate.advance)
      );
    });
  const search = (selected, distinct) => {
    if (selected.length === 3) return selected;
    for (const candidate of ranked[selected.length]) {
      if (
        (distinct && selected.some((row) => row.family === candidate.family)) ||
        !compatible(candidate, selected)
      )
        continue;
      const result = search([...selected, candidate], distinct);
      if (result) return result;
    }
    return null;
  };
  const result = search([], true) || search([], false);
  if (!result)
    throw Error("Não existem três propostas compatíveis neste catálogo.");
  return result;
}

export function pathObjectiveLines(objective) {
  const conditions = normalizePathConditions(objective);
  return conditions
    .filter(row => row.metric !== "games" || conditions.length === 1)
    .sort(
      (a, b) => metricOrder.indexOf(a.metric) - metricOrder.indexOf(b.metric),
    )
    .map(({ metric, target, criterion, criteria, comparison }) => {
      const value = String(target).replace(".", ",");
      if (metric === "position") return `Joga na posição ${target}`;
      if (metric === "games") return "Participa no jogo";
      if (metric === "nonLoss") return "Termina o jogo sem perder";
      if (metric === "draw") return "Termina o jogo empatado";
      if (metric === "loss")
        return "Mesmo com derrota, cumpre os restantes requisitos";
      if (metric === "cleanSheet")
        return "A tua equipa termina sem sofrer golos";
      if (metric === "ratingMean")
        return `Obtém média ${comparison === "gt" ? "superior a" : "de pelo menos"} ${value}★ entre ${criteria.map((key) => names[key]).join(" e ")}`;
      if (metric === "rating")
        return `Obtém ${comparison === "gt" ? "mais de" : "pelo menos"} ${value}★ em ${names[criterion]}`;
      if (metric === "win") return "Vence o jogo";
      if (metric === "goals")
        return `Marca pelo menos ${target} ${target === 1 ? "golo" : "golos"}`;
      if (metric === "assists")
        return `Faz pelo menos ${target} ${target === 1 ? "assistência" : "assistências"}`;
      if (metric === "contributions")
        return `Soma pelo menos ${target} entre golos e assistências`;
      if (metric === "teamGoals")
        return `A tua equipa marca pelo menos ${target} golos`;
      return `A tua equipa sofre no máximo ${target} ${target === 1 ? "golo" : "golos"}`;
    });
}
