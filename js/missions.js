import { buildMissions } from "./mission-model.js";
import { pathMissionSpotlight } from "./paths.js";
import { groupActivities, activityCategory } from "./activity-categories.js";
import {
  eventRarityId,
  rarityBadge,
  compareEventRarity,
} from "./event-rarity.js";
import * as DB from "./db.js";
import { esc, empty, linkButton } from "./ui.js";
import { icon } from "./icons.js";
import { rewardMarkers, combinedProgress } from "./event-presentation.js";
export const refreshMissionsForCurrentUser = (user, league) => buildMissions(user, league, DB);
export function compareMissionPriority(a, b) {
  const priority = (mission) => ({path: 0, rating: 1}[activityCategory(mission)] ?? 2);
  return priority(a) - priority(b) || compareEventRarity(a, b);
}
export function missionList(missions, { grouped = true } = {}) {
  missions = missions.filter(
    (mission) => !mission.hiddenCard && mission.type !== "HIDDEN_CARD",
  );
  if (!missions.length)
    return empty(
      "Tudo tratado!",
      "Não tens missões pendentes neste momento. Volta depois da próxima Peladinha.",
      linkButton("#/games", "Ver jogos", "secondary"),
      "check",
    );
  const ordered = [...missions].sort(compareMissionPriority);
  const cards = (entries) =>
    `<div class="mission-list">${entries
      .map((m) => {
        if (m.type === "PLAYER_PATH") return pathMissionSpotlight(m);
        const competition = m.type === "COMPETITION_OBJECTIVE";
        const percentage = Math.round((m.done / m.total) * 100);
        const objectiveProgress = combinedProgress(m, m.combinedState);
        return `<a class="mission${competition ? " mission-competition" : ""}${m.rarity ? " event-rarity-surface" : ""}"${m.rarity ? ` data-rarity="${eventRarityId(m)}"` : ""} href="${esc(m.href)}"><div class="mission-symbol">${icon(m.icon)}</div><div class="mission-content"><div class="mission-heading"><h3>${esc(m.title)}</h3>${m.rarity ? rarityBadge(m) : ""}${competition ? '<span class="mission-competition-label">Competição</span>' : ""}</div>${objectiveProgress ? "" : ["OBJECTIVE_MISSION", "COMPETITION_OBJECTIVE"].includes(m.type) ? `<p class="mission-objective">${esc(m.objectivePreview?.text || "Consulta o objetivo e os critérios da missão.")}${m.objectivePreview?.criteria ? `<span class="mission-objective-criteria">${esc(m.objectivePreview.criteria)}</span>` : ""}</p>` : `<p>${esc(m.description)}</p>`}${rewardMarkers(m.rewards)}${m.eventDescription?.trim() ? `<p class="mission-event-description">${esc(m.eventDescription)}</p>` : ""}${objectiveProgress || `<div class="progress"><span style="--progress:${percentage}%"></span></div><small>${m.done} / ${m.total} · ${percentage}%</small>`}</div><span class="mission-arrow">${icon("arrow")}</span></a>`;
      })
      .join("")}</div>`;
  if (!grouped) return cards(ordered);
  return `<div class="mission-groups activity-groups">${groupActivities(ordered)
    .map(
      (group) =>
        group.id === "path" ? `<section class="mission-group activity-group" data-activity-category="path" aria-label="Escolhe o teu caminho!">${cards(group.items)}</section>` :
        `<section class="mission-group activity-group" data-activity-category="${group.id}" aria-label="${esc(group.title)}"><div class="mission-group-head activity-group-head"><div class="activity-group-identity"><span class="activity-group-symbol">${icon(group.icon)}</span><div><h2>${esc(group.title)}</h2><p>${esc(group.description)}</p></div></div><span class="pill" aria-label="${group.items.length} itens">${group.items.length}</span></div>${cards(group.items)}</section>`,
    )
    .join("")}</div>`;
}
