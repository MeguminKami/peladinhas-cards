import { isRatingObjective, isCombinedObjective, objectiveSummary } from "./event-model.js";
import { TOTAL_OBJECTIVES, isLifetimeObjective, usesLifetimeObjective } from "./event-totals.js";
import { isGoalList } from "./event-goals.js";
const names = {
  overall: "Geral",
  attack: "Ataque",
  passing: "Passe",
  defense: "Defesa",
  physical: "Físico",
  attitude: "Atitude",
  goalkeeping: "Baliza",
};
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
    return {text:preview.text.replace(/^Conclui /,"Total de ").replace(/^Ganha (\d+) jogos?/,(_,count)=>`Total de ${count} ${Number(count)===1?"vitória":"vitórias"}`), criteria:preview.criteria};
  }
  if (isLifetimeObjective(objective)) {
    const definition=TOTAL_OBJECTIVES[objective.metric], count=objective.target || 1;
    return {text:`Total de ${count} ${count===1?definition.one:definition.many}${event.scope==="group"?" dos participantes":""}`,criteria:""};
  }
  if (isCombinedObjective(objective)) {
    const results = missionObjectivePreview({...event, objective:objective.results});
    const ratings = missionObjectivePreview({...event, objective:objective.ratings});
    const stars = ratings.text.charAt(0).toLocaleLowerCase("pt-PT") + ratings.text.slice(1);
    return {text:`${results.text.replace(/\.$/, "")} e ${stars}`, criteria:`${usesLifetimeObjective(objective) ? "Cada meta usa o histórico ou período indicado" : "Cumpre ambas no mesmo período"}${ratings.criteria ? ` · ${ratings.criteria}` : ""}`};
  }
  if (!isRatingObjective(objective))
    return { text: objectiveSummary(event), criteria: "" };
  const count = objective.target || 1;
  const games = `${count} ${count === 1 ? "jogo" : "jogos"}`;
  const threshold = `${objective.comparison === "gt" ? "mais de" : "pelo menos"} ${Number(objective.threshold).toLocaleString("pt-PT")} ★`;
  const averageThreshold = `${objective.comparison === "gt" ? "superior a" : "de pelo menos"} ${Number(objective.threshold).toLocaleString("pt-PT")} ★`;
  const attributes = objective.attributes || [];
  const separate = objective.combine === "all" && attributes.length > 1;
  const criterion = separate
    ? `${threshold} em cada critério`
    : `média ${averageThreshold}`;
  let text;
  if (objective.metric === "ratingAverage")
    text = `Média ${averageThreshold}${separate ? " por critério" : ""} ${count === 1 ? "no último jogo" : `nos últimos ${games}`}.`;
  else if (objective.metric === "ratingWins")
    text = `Ganha ${games} com ${criterion}.`;
  else
    text = `Conclui ${games}${objective.metric === "ratingStreak" ? (count === 1 ? "" : " seguidos") : ""} com ${criterion}.`;
  return {
    text,
    criteria:
      attributes.length <= 2
        ? attributes.map((key) => names[key] || key).join(" + ")
        : `${attributes.length} critérios · ${separate ? "mínimo em cada um" : "média conjunta"}`,
  };
}
