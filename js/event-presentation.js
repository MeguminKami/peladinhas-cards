import { icon } from "./icons.js";
import { card } from "./cards.js";
import { rewardBreakdown } from "./reward-presentation.js";
import { isCombinedObjective } from "./event-model.js";
import { missionObjectivePreview } from "./mission-objective-preview.js";
import { esc } from "./ui.js";
import { isGoalList } from "./event-goals.js";

export function combinedProgress(event, state) {
  if (!state) return "";
  const goals = isGoalList(event.objective)
    ? event.objective.goals.map(goal => ({ objective: goal, progress: state.goals?.find(row => row.id === goal.id)?.progress }))
    : isCombinedObjective(event.objective)
      ? ["results", "ratings"].map(key => ({ objective: event.objective[key], progress: state[key]?.progress }))
      : [];
  if (!goals.length) return "";
  return `<div class="event-combined-progress" aria-label="Progresso dos objetivos">${goals.map(({ objective, progress }) => {
    const value = Math.max(0, Math.min(objective.target, progress || 0));
    const percent = Math.min(100, value / objective.target * 100);
    const text = missionObjectivePreview({ ...event, objective }).text;
    return `<div><p><span>${esc(text)}</span><strong>${value} / ${objective.target}</strong></p><div class="progress" role="progressbar" aria-label="${esc(text)}" aria-valuemin="0" aria-valuemax="${objective.target}" aria-valuenow="${value}"><span style="--progress:${percent}%"></span></div></div>`;
  }).join("")}</div>`;
}

export function rewardMarkers(rewards = []) {
  const stats = rewards.some(r => Object.values(r.boosts || {}).some(v => v > 0));
  const cards = rewards.some(r => r.specialId);
  if (!stats && !cards) return "";
  return `<div class="event-reward-markers" aria-label="Tipos de recompensa">${stats ? `<span>${icon("rewardStats")}Melhorias de stats</span>` : ""}${cards ? `<span>${icon("rewardCard")}Carta especial</span>` : ""}</div>`;
}

export function rewardShowcase(event, player) {
  const rewards = event.rewardPreview || event.configuration?.positions || [];
  if (!rewards.length || event.status === "cancelled") return "";
  return `<section class="event-reward-showcase" aria-label="Recompensas do desafio"><h2>${icon("gift")}Recompensas</h2><div class="event-reward-grid">${rewards.map((reward, i) => `<article class="event-reward-prize"><div class="event-reward-copy"><h3>${event.kind === "mission" ? "Por conclusão" : `${i + 1}.º lugar`}</h3>${rewardBreakdown(reward)}${reward.specialId ? '<small class="muted">Pré-visualização da carta com os teus atributos atuais.</small>' : ""}</div>${reward.specialId ? `<div class="event-reward-card">${card({ ...player, previousStats: null, ovrDelta: null, hasCard: true, specials: [{ id: reward.specialId, cardTheme: reward.cardTheme }] }, { theme: reward.specialId, size: "md", preview: true })}</div>` : ""}</article>`).join("")}</div></section>`;
}
