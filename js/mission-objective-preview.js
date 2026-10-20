import { isRatingObjective, isCombinedObjective, objectiveSummary } from "./event-model.js";
import { TOTAL_OBJECTIVES, isLifetimeObjective, usesLifetimeObjective } from "./event-totals.js";
import { isGoalList } from "./event-goals.js";
const names = {
  overall: "Desempenho geral",
  attack: "Ataque",
  passing: "Passe",
  defense: "Defesa",
  physical: "Físico",
  attitude: "Atitude",
  goalkeeping: "Guarda-redes",
};
const positions = {GR:"guarda-redes (GR)",DEF:"defesa (DEF)",MED:"médio (MED)",ALA:"ala (ALA)",AV:"avançado (AV)"};
function resultPreview(event) {
  const o = event.objective, definition = TOTAL_OBJECTIVES[o.metric];
  const metric = definition?.metric || o.metric, count = o.target || 1;
  const games = count === 1 ? "um jogo" : `${count} jogos`;
  const role = definition?.position ? ` como ${positions[definition.position]}` : "";
  const actions = {
    games: `Joga ${games}${role}`,
    goals: `Marca ${count === 1 ? "um golo" : `${count} golos`}`,
    assists: `Faz ${count === 1 ? "uma assistência" : `${count} assistências`}`,
    wins: `Ganha ${games}${role}`,
    draws: `Empata ${games}`,
    losses: `Perde ${games}`,
    goalsAndAssists: `Soma ${count === 1 ? "um golo ou uma assistência" : `um total de ${count} golos ou assistências`}`,
    cleanSheets: `Termina ${games}${role} sem sofrer golos`,
    nonLosses: `Joga ${games} sem perder`,
    unbeatenGames: `Joga ${games}${count > 1 ? " seguidos" : ""} sem perder`,
    unbeatenWins: count === 1 ? "Ganha um jogo" : `Consegue ${count} vitórias sem perder entre elas`,
    winStreak: `Ganha ${games}${count > 1 ? " seguidos" : ""}`,
    goalsFor: `A tua equipa marca ${count === 1 ? "um golo" : `${count} golos, no total`}`,
    goalsAgainst: `A tua equipa sofre ${count === 1 ? "um golo" : `${count} golos, no total`}`,
    scoringGames: `Marca em ${games}`,
    assistingGames: count === 1 ? "Faz uma assistência num jogo" : `Faz assistências em ${count} jogos`,
    contributingGames: `Marca ou assiste em ${games}`,
  };
  if (!actions[metric]) return objectiveSummary(event);
  const scope = event.scope === "group" ? "Objetivo do grupo: " : ["team","collective"].includes(event.scope) ? "Objetivo da equipa: " : "";
  const action = scope ? actions[metric][0].toLocaleLowerCase("pt-PT") + actions[metric].slice(1) : actions[metric];
  return `${scope}${action}.`;
}
export function missionObjectivePreview(event) {
  const objective = event.objective;
  if (TOTAL_OBJECTIVES[objective?.metric] && !isLifetimeObjective(objective) && isRatingObjective(objective))
    return missionObjectivePreview({...event, objective:{...objective, metric:TOTAL_OBJECTIVES[objective.metric].metric}});
  if(isGoalList(objective)) return {
    text:objective.goals.length===1 ? "Cumpre a meta para completar o desafio." : `Cumpre as ${objective.goals.length} metas para completar o desafio.`,
    criteria:"Todas as metas são obrigatórias.",
  };
  if (isLifetimeObjective(objective) && isRatingObjective(objective)) {
    const preview = missionObjectivePreview({...event, objective:{...objective, metric:TOTAL_OBJECTIVES[objective.metric].metric}});
    const count = objective.target || 1;
    return {text:preview.text.replace(/^(Conclui|Joga) (um|\d+) jogos?/,`Total de ${count} ${count===1?"jogo":"jogos"}`).replace(/^Ganha (um|\d+) jogos?/,`Total de ${count} ${count===1?"vitória":"vitórias"}`), criteria:preview.criteria};
  }
  if (isLifetimeObjective(objective)) {
    const definition=TOTAL_OBJECTIVES[objective.metric], count=objective.target || 1;
    return {text:`Total de ${count} ${count===1?definition.one:definition.many}${definition.position ? ` (${definition.position})` : ""}${event.scope==="group"?" dos participantes":""}.`,criteria:""};
  }
  if (isCombinedObjective(objective)) {
    const results = missionObjectivePreview({...event, objective:objective.results});
    const ratings = missionObjectivePreview({...event, objective:objective.ratings});
    const stars = ratings.text.charAt(0).toLocaleLowerCase("pt-PT") + ratings.text.slice(1);
    return {text:`${results.text.replace(/\.$/, "")} e ${stars}`, criteria:`${usesLifetimeObjective(objective) ? "Cada meta usa o histórico ou período indicado" : "Cumpre ambas no mesmo período"}${ratings.criteria ? ` · ${ratings.criteria}` : ""}`};
  }
  if (!isRatingObjective(objective))
    return { text: resultPreview(event), criteria: "" };
  const count = objective.target || 1;
  const games = count === 1 ? "um jogo" : `${count} jogos`;
  const threshold = `${objective.comparison === "gt" ? "mais de" : "pelo menos"} ${Number(objective.threshold).toLocaleString("pt-PT")} ★`;
  const averageThreshold = `${objective.comparison === "gt" ? "superior a" : "de pelo menos"} ${Number(objective.threshold).toLocaleString("pt-PT")} ★`;
  const attributes = objective.attributes || [];
  const separate = objective.combine === "all" && attributes.length > 1;
  const criterion = separate
    ? `${threshold} em cada critério`
    : `média ${averageThreshold}`;
  let text;
  if (objective.metric === "ratingAverage")
    text = `Obtém uma média ${averageThreshold}${separate ? " por critério" : ""} ${count === 1 ? "no último jogo" : `nos últimos ${games}`}.`;
  else if (objective.metric === "ratingWins")
    text = `Ganha ${games} com ${criterion}.`;
  else
    text = `Joga ${games}${objective.metric === "ratingStreak" ? (count === 1 ? "" : " seguidos") : ""} com ${criterion}.`;
  return {
    text,
    criteria:
      attributes.length <= 2
        ? attributes.map((key) => names[key] || key).join(" + ")
        : `${attributes.length} critérios · ${separate ? "mínimo em cada um" : "média conjunta"}`,
  };
}

// Detailed rules stay available without making the objective itself verbose.
export function objectiveDescription(event) {
  const o = event.objective;
  if (isGoalList(o)) return o.goals.map(goal=>objectiveDescription({...event,objective:goal})).join(" ");
  if (isCombinedObjective(o)) return [o.results,o.ratings].map(objective=>objectiveDescription({...event,objective})).join(" ");
  const preview = missionObjectivePreview(event);
  const timing = isLifetimeObjective(o) ? "" : " Contam os jogos encerrados durante o desafio, depois de desbloqueares a missão.";
  if (!isRatingObjective(o)) return preview.text + timing;
  const metric = TOTAL_OBJECTIVES[o.metric]?.metric || o.metric;
  const rule = metric === "ratingStreak" ? "Um jogo abaixo do mínimo ou sem avaliações suficientes interrompe a sequência."
    : metric === "ratingAverage" ? "A média inclui os últimos jogos disputados, mesmo que aguardem avaliações. O objetivo tem de estar cumprido quando é verificado."
    : "Os jogos não precisam de ser consecutivos.";
  return `${preview.text}${preview.criteria ? ` Critérios: ${preview.criteria}.` : ""} São necessárias ${o.minRatings} avaliações por critério e por jogo.${timing} ${rule}`;
}
