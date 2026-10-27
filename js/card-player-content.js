import { ATTRIBUTES } from "./utils.js";
import { PLAYSTYLE_ICONS } from "./assets.js";
import { trendArrow } from "./icons.js";

export function cardPlaystyles(player) {
  if (player.hasCard === false) return [];
  return ATTRIBUTES.filter(([key]) => PLAYSTYLE_ICONS[key] &&
    Number.isFinite(player.stats?.[key]) && player.stats[key] >= 90)
    .sort(([a], [b]) => player.stats[b] - player.stats[a]).slice(0, 3)
    .map(([key, name]) => ({ key, name, value: player.stats[key], icon: PLAYSTYLE_ICONS[key] }));
}

export function cardOvrTrend(player) {
  return player.hasCard !== false && Number.isFinite(player.ovrDelta) && player.ovrDelta !== 0
    ? `<span class="card-ovr-trend ${player.ovrDelta > 0 ? "positive" : "negative"}" role="img" aria-label="${player.ovrDelta > 0 ? "Subiu" : "Desceu"} OVR nos valores permanentes face à semana anterior">${trendArrow(player.ovrDelta)}</span>`
    : "";
}

export function cardStatsMarkup(player) {
  const stats = player.stats || {};
  const permanent = Object.hasOwn(player, "permanentStats") ? player.permanentStats : stats;
  return ATTRIBUTES.slice(0, 8).map(([key, , abbr]) => {
    const current = permanent?.[key], previous = player.previousStats?.[key];
    const delta = Number.isFinite(current) && Number.isFinite(previous)
      ? Math.round((current - previous) * 100) / 100 : 0;
    const trend = player.hasCard !== false && delta
      ? `<sup class="card-stat-trend ${delta > 0 ? "positive" : "negative"}" aria-label="${delta > 0 ? "Subiu" : "Desceu"} nos atributos permanentes face à semana anterior" title="Atributos permanentes face à semana anterior, sem bónus temporários">${trendArrow(delta)}</sup>` : "";
    return `<span><b>${player.hasCard === false ? "—" : (stats[key] ?? 0)}${trend}</b><small>${abbr}</small></span>`;
  }).join("");
}
