import { isRatingObjective, objectiveSummary } from "./event-model.js";
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
