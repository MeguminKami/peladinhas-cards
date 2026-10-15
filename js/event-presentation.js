import { icon } from "./icons.js";
import { card } from "./cards.js";
import { esc } from "./ui.js";
import { rewardText } from "./event-model.js";

export function rewardMarkers(rewards = []) {
  const stats = rewards.some(r => Object.values(r.boosts || {}).some(v => v > 0));
  const cards = rewards.some(r => r.specialId);
  if (!stats && !cards) return "";
  return `<div class="event-reward-markers" aria-label="Tipos de recompensa">${stats ? `<span>${icon("rewardStats")}Melhorias de stats</span>` : ""}${cards ? `<span>${icon("rewardCard")}Carta especial</span>` : ""}</div>`;
}

export function rewardShowcase(event, player) {
  const rewards = event.rewardPreview || event.configuration?.positions || [];
  if (!rewards.length || event.status === "cancelled") return "";
  return `<section class="event-reward-showcase" aria-label="Recompensas do desafio"><h2>Em jogo</h2>${rewardMarkers(rewards)}<div class="event-reward-grid">${rewards.map((reward, i) => `<article class="event-reward-prize"><div class="event-reward-copy"><h3>${event.kind === "mission" ? "Por conclusão" : `${i + 1}.º lugar`}</h3><p>${esc(rewardText(reward))}</p>${reward.specialId ? '<small class="muted">Pré-visualização do visual da carta. Os valores apresentados são os teus atuais.</small>' : ""}</div>${reward.specialId ? `<div class="event-reward-card">${card({ ...player, previousStats: null, ovrDelta: null, hasCard: true, specials: [{ id: reward.specialId, cardTheme: reward.cardTheme }] }, { theme: reward.specialId, size: "md", preview: true })}</div>` : ""}</article>`).join("")}</div></section>`;
}
