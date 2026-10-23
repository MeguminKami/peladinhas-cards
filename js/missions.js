import { buildMissions } from "./mission-model.js";
import { pathMissionSpotlight } from "./paths.js";
import { groupActivities, activityCategory } from "./activity-categories.js";
import {
  eventRarityId,
  rarityBadge,
  compareEventRarity,
} from "./event-rarity.js";
import * as DB from "./db.js";
import { esc, empty, linkButton, busy, toast } from "./ui.js";
import { icon } from "./icons.js";
import { rewardMarkers, combinedProgress } from "./event-presentation.js";
export const refreshMissionsForCurrentUser = (user, league) => buildMissions(user, league, DB);
export function compareMissionPriority(a, b) {
  const priority = (mission) => ({path: 0, rating: 1}[activityCategory(mission)] ?? 2);
  const rank = mission => mission.type === "PLAYER_PATH" ? 0 : mission.claimable ? 1 : priority(mission) + 2;
  return rank(a) - rank(b) || compareEventRarity(a, b);
}
export function missionList(missions, { grouped = true } = {}) {
  missions = missions.filter(
    (mission) => !mission.completed && !mission.hiddenCard && mission.type !== "HIDDEN_CARD",
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
        const percentage = Math.min(100, Math.max(0, Math.round((m.done / Math.max(1, m.total)) * 100)));
        const achieved = ["OBJECTIVE_MISSION", "COMPETITION_OBJECTIVE"].includes(m.type) && (m.claimable || (Number(m.total) > 0 && Number(m.done) >= Number(m.total)));
        const objectiveProgress = combinedProgress(m, m.combinedState);
        const classes = `mission${competition ? " mission-competition" : ""}${m.rarity ? " event-rarity-surface" : ""}`;
        const rarity = m.rarity ? ` data-rarity="${eventRarityId(m)}"` : "";
        const body = `<div class="mission-symbol">${icon(achieved ? "check" : m.icon)}</div><div class="mission-content"><div class="mission-heading"><h3>${esc(m.title)}</h3>${m.rarity ? rarityBadge(m) : ""}${competition ? '<span class="mission-competition-label">Competição</span>' : ""}</div>${`${objectiveProgress ? "" : ["OBJECTIVE_MISSION", "COMPETITION_OBJECTIVE"].includes(m.type) ? `<p class="mission-objective">${esc(m.objectivePreview?.text || "Consulta o objetivo e os critérios da missão.")}${m.objectivePreview?.criteria ? `<span class="mission-objective-criteria">${esc(m.objectivePreview.criteria)}</span>` : ""}</p>` : `<p>${esc(m.description)}</p>`}${rewardMarkers(m.rewards)}${m.eventDescription?.trim() ? `<p class="mission-event-description">${esc(m.eventDescription)}</p>` : ""}${objectiveProgress || `<div class="progress"><span style="--progress:${percentage}%"></span></div><small>${m.done} / ${m.total} · ${percentage}%</small>`}`}</div><span class="mission-arrow">${icon("arrow")}</span>`;
        if (!achieved) return `<a class="${classes}"${rarity} href="${esc(m.href)}">${body}</a>`;
        return `<article class="${classes} is-achieved${m.claimable ? " is-claimable" : ""}"${rarity} data-mission-id="${esc(m.id)}"><a class="mission-main" href="${esc(m.href)}">${body}</a><div class="mission-claim-footer"><span class="mission-completion-status">${icon("check")}<span>${m.claimable ? "Objetivo cumprido · Recompensa disponível" : "Objetivo cumprido"}</span></span>${m.claimable ? `<button class="btn mission-claim-button" data-claim-mission="${esc(m.id)}" aria-label="Receber recompensa: ${esc(m.title)}">${icon("gift")}Receber recompensa</button>` : ""}</div><p class="mission-claim-error" role="alert" hidden></p></article>`;
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

export function bindMissionClaims(ctx, root = document.querySelector("#main")) {
  const inFlight = new Set();
  root?.querySelectorAll("[data-claim-mission]").forEach(button => {
    button.onclick = async () => {
      const id = button.dataset.claimMission;
      const mission = ctx.missions.find(row => row.id === id);
      if (!mission?.claimable || inFlight.has(id)) return;
      const owner = ctx.user?.uid;
      inFlight.add(id);
      const errorBox = button.closest("article").querySelector(".mission-claim-error");
      errorBox.hidden = true;
      let result;
      try {
        result = await busy(button, () => DB.callAdmin("claimMission", { eventId: mission.eventId || mission.href.split("/").at(-1) }));
      } catch (error) {
        errorBox.textContent = error.message || "Não foi possível receber a recompensa. Tenta novamente.";
        errorBox.hidden = false;
        inFlight.delete(id);
        return;
      }
      if (ctx.user?.uid !== owner) return;
      button.disabled = true;
      const removeClaimed = () => ctx.missions.splice(0, ctx.missions.length, ...ctx.missions.filter(row => row.id !== id && !(mission.eventId && row.eventId === mission.eventId)));
      removeClaimed();
      toast(result.data?.pending ? "Missão concluída. A recompensa fica em espera até haver orçamento disponível." : "Missão concluída. Recompensa recebida!");
      try { await ctx.refresh(); } catch { /* A confirmed claim stays removed even offline. */ }
      if (ctx.user?.uid !== owner) return;
      removeClaimed();
      ctx.go(location.hash || "#/");
    };
  });
}
