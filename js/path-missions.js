// Shared v4 catalogue. Only trusted server code turns these templates into offers.
import { PATH_GOAL_TARGETS } from "./path-difficulty.js";
const names = {
  attack: "Ataque",
  passing: "Passe",
  physical: "Físico",
  defense: "Defesa",
  goalkeeping: "Guarda-redes",
  attitude: "Atitude",
};
const metricOrder = [
  "position",
  "goals",
  "assists",
  "contributions",
  "win",
  "teamGoals",
  "conceded",
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
  "fusion-attack": [
    entry("base", "Dupla qualidade", r("attack", 3.5), r("passing", 3.5)),
    entry("serve", "Marcar e servir", g(), a()),
    entry("goal-pass", "Golo construído", g(), r("passing")),
    entry("assist-attack", "Criar com ameaça", a(), r("attack")),
    entry(
      "contribute",
      "Produção completa",
      contribution(2),
      r("attack", 3),
      r("passing", 3),
    ),
    entry("win", "Dupla vencedora", win(), r("attack", 3), r("passing", 3)),
    entry("team", "Golo e criação coletiva", g(), r("passing", 3), team()),
    entry("complete", "Assistir e finalizar", g(), a(), r("attack", 3)),
  ],
  "fusion-wall": [
    entry("base", "Dupla muralha", r("defense", 3.5), r("goalkeeping", 3.5)),
    entry("solid", "Bloco protegido", solid(), r("defense")),
    entry(
      "win",
      "Fortaleza vencedora",
      win(),
      r("defense", 3),
      r("goalkeeping", 3),
    ),
    entry(
      "solid-keeper",
      "Segurança coletiva",
      solid(),
      r("defense", 3),
      r("goalkeeping", 3),
    ),
    entry(
      "pass",
      "Organizar e distribuir",
      r("defense", 3),
      r("goalkeeping", 3),
      r("passing", 3),
    ),
    entry(
      "attitude",
      "Comando coletivo",
      r("defense", 3),
      r("goalkeeping", 3),
      r("attitude", 3.75),
    ),
    entry("solid-win", "Solidez para ganhar", win(), solid(), r("defense", 3)),
    entry(
      "solid-pass",
      "Saída protegida",
      solid(),
      r("defense", 3),
      r("passing", 3),
    ),
  ],
  "fusion-engine": [
    entry("base", "Motor com visão", r("physical", 3.5), r("passing", 3.5)),
    entry("assist", "Fôlego criativo", a(), r("physical")),
    entry(
      "contribute",
      "Produção em movimento",
      contribution(),
      r("physical", 3),
      r("passing", 3),
    ),
    entry("win", "Motor vencedor", win(), r("physical", 3), r("passing", 3)),
    entry("assist-win", "Criar para ganhar", win(), a(), r("physical", 3)),
    entry("team", "Criar em conjunto", a(), r("physical", 3), team()),
    entry(
      "attitude",
      "Energia com critério",
      r("physical", 3),
      r("passing", 3),
      r("attitude", 3.75),
    ),
    entry(
      "defend",
      "Ligação entre setores",
      r("physical", 3),
      r("passing", 3),
      r("defense", 3),
    ),
  ],
};

const conditionKey = (condition) =>
  `${condition.metric}:${condition.criterion || ""}`;
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
      (metric === "rating"
        ? !names[criterion] ||
          !Number.isFinite(target) ||
          target <= 0 ||
          target > 5
        : criterion !== undefined ||
          (metric === "position"
            ? target !== "GR"
            : !Number.isSafeInteger(target) ||
              target < (metric === "conceded" ? 0 : 1) ||
              target > 100 ||
              (metric === "win" && target !== 1)))
    )
      throw Error("Condição de missão inválida.");
    const key = conditionKey(condition),
      prior = unique.get(key);
    const value = c(metric, target, criterion);
    if (
      !prior ||
      (metric === "conceded" ? target < prior.target : target > prior.target)
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
      criteria: conditions
        .filter((row) => row.metric === "rating")
        .map((row) => row.criterion),
      goalkeeper: conditions.some(
        (row) => row.metric === "position" || row.criterion === "goalkeeping",
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
  const ratings = metrics.filter((metric) => metric === "rating").length;
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
  return catalogue[routeId]
    .filter((template) => difficulty === 0 || template.id !== "victory")
    .map((template) => {
      const conditions = template.conditions.map((condition) => {
        const { metric, target, criterion } = condition;
        if (metric === "rating") {
          const solo = template.conditions.length === 1;
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
          return r(criterion, adjusted);
        }
        if (metric === "goals")
          return g(template.conditions.length===1?PATH_GOAL_TARGETS.goals[stage][difficulty]:Math.max(target,PATH_GOAL_TARGETS.mixedGoals[stage][difficulty]));
        if (metric === "assists" && template.conditions.length === 1)
          return a(PATH_GOAL_TARGETS.assists[stage][difficulty]);
        if (metric === "contributions")
          return contribution(
            Math.max(target, PATH_GOAL_TARGETS.contributions[stage][difficulty]),
          );
        if (metric === "conceded")
          return solidTarget(PATH_GOAL_TARGETS.conceded[stage][difficulty]);
        if (metric === "teamGoals") return c(metric, PATH_GOAL_TARGETS.teamGoals[stage][difficulty]);
        return { ...condition };
      });
      if (["goalkeeping", "fusion-wall"].includes(routeId))
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
    .sort(
      (a, b) => metricOrder.indexOf(a.metric) - metricOrder.indexOf(b.metric),
    )
    .map(({ metric, target, criterion }) => {
      const value = String(target).replace(".", ",");
      if (metric === "position") return "Joga na posição GR";
      if (metric === "rating")
        return `Obtém pelo menos ${value}★ em ${names[criterion]}`;
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
