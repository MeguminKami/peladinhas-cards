import { ATTRIBUTES, themeName } from "./utils.js";
import { CARD_POLICY, durationName } from "./card-achievements.js";
import { esc } from "./ui.js";
import { icon } from "./icons.js";
const number = (value) =>
  Number(value).toLocaleString("pt-PT", { maximumFractionDigits: 2 });
export function rewardBreakdown(reward = {}) {
  const boosts = ATTRIBUTES.filter(
    ([key]) => Number.isFinite(reward.boosts?.[key]) && reward.boosts[key] > 0,
  );
  const equal =
    boosts.length === ATTRIBUTES.length &&
    boosts.every(([key]) => reward.boosts[key] === reward.boosts[boosts[0][0]]);
  const statDuration = durationName(reward.statDuration || "weekly");
  const cardDuration = durationName(
    CARD_POLICY[reward.specialId]?.duration ||
      reward.cardDuration ||
      reward.statDuration,
  );
  const stats = boosts.length
    ? `<section class="reward-stat-section"><div class="reward-section-heading"><h4>${icon("rewardStats")}Bónus de atributos</h4><span class="pill">${esc(statDuration)}</span></div>${equal ? `<p class="reward-all-stats"><strong>+${number(reward.boosts[boosts[0][0]])}</strong><span>em todos os ${ATTRIBUTES.length} atributos</span></p>` : `<dl class="reward-stat-list">${boosts.map(([key, label]) => `<div><dt>${esc(label)}</dt><dd>+${number(reward.boosts[key])}</dd></div>`).join("")}</dl>`}</section>`
    : "";
  const special = reward.specialId
    ? `<section class="reward-special-section"><div class="reward-section-heading"><h4>${icon("rewardCard")}Carta especial</h4><span class="pill">${esc(cardDuration)}</span></div><strong>${esc(reward.cardTheme?.name || themeName(reward.specialId))}</strong></section>`
    : "";
  return `<div class="reward-breakdown">${stats}${special}${!stats && !special ? '<p class="muted">Sem recompensa.</p>' : ""}</div>`;
}
export function configuredRewards(event) {
  return `<div class="configured-reward-list">${(event.configuration?.positions || []).map((reward, index) => `<article><h3>${event.kind === "mission" ? "Por conclusão" : `${index + 1}.º lugar`}</h3>${rewardBreakdown(reward)}</article>`).join("") || '<p class="muted">Sem recompensas configuradas.</p>'}</div>`;
}
