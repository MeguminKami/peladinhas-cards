import { missionObjectivePreview } from "./mission-objective-preview.js";
import { groupActivities } from "./activity-categories.js";
import { policyAt } from "./system-policy.js";
import {
  eventRarityId,
  rarityBadge,
  compareEventRarity,
} from "./event-rarity.js";
import { difficultyLabel } from "./labels.js";
import {
  periodWindow,
  objectiveSummary,
  eventEndMillis,
  missionUnlocked,
} from "./event-model.js";
import { votersFor, candidatesFor } from "./event-rules.js";
import { asDate } from "./utils.js";
import * as DB from "./db.js";
import { ATTRIBUTES, profileComplete, participants } from "./utils.js";
import { esc, empty, linkButton } from "./ui.js";
import { icon, eventIcon } from "./icons.js";
import { rewardMarkers } from "./event-presentation.js";
export async function refreshMissionsForCurrentUser(user, league) {
  const p = league.players.find((x) => x.uid === user.uid) || user;
  const missions = [];
  if (!profileComplete(p))
    missions.push({
      id: "profile",
      type: "COMPLETE_PROFILE",
      title: "Completa o teu perfil",
      description: "Adiciona as informações que faltam para entrares em campo.",
      done: 0,
      total: 1,
      href: "#/profile/edit",
      icon: "profile",
    });
  const count = ATTRIBUTES.filter(([k]) =>
    Number.isFinite(p.initial?.[k]),
  ).length;
  if (count < 12)
    missions.push({
      id: "self",
      type: "SELF_INITIAL_RATING",
      title: "Cria a tua primeira carta",
      description:
        "Começa com a tua autoavaliação. A comunidade ajuda a torná-la oficial.",
      done: count,
      total: 12,
      href: "#/missions/self",
      icon: "ball",
    });
  const closedGames = league.games.filter(
    (g) => g.status === "closed" && participants(g).includes(user.uid),
  );
  const [feedback, my] = await Promise.all([
    Promise.all(closedGames.map((g) => DB.myFeedback(g.id, user.uid))),
    DB.myCommunity(user.uid),
  ]);
  for (const [index, g] of closedGames.entries()) {
    const targets = [...new Set(participants(g))],
      ratings = feedback[index];
    const done = targets.filter((uid) =>
      ratings.some((r) => r.targetId === uid && r.submitted),
    ).length;
    if (done < targets.length)
      missions.push({
        id: `game-${g.id}`,
        type: "GAME_FEEDBACK",
        title: `Avalia ${g.title}`,
        description: "Avalia o desempenho dos teus colegas neste jogo.",
        done,
        total: targets.length,
        href: `#/game/${g.id}/feedback`,
        icon: "games",
      });
  }
  for (const target of league.players.filter((x) => x.uid !== user.uid)) {
    const rating = my.find((r) => r.targetId === target.uid);
    if (rating?.submitted) continue;
    missions.push({
      id: `new-${target.uid}`,
      type: "RATE_NEW_PLAYER",
      title: `Avaliar ${target.displayName || target.username}`,
      description:
        "Dá a tua avaliação deste colega e contribui para a sua carta.",
      done: ATTRIBUTES.filter(([k]) => Number.isFinite(rating?.ratings20?.[k]))
        .length,
      total: 12,
      href: `#/missions/new/${target.uid}`,
      icon: "players",
    });
  }
  const eventMissions = await Promise.all(
    (league.events || []).map(async (event) => {
      const missions = [];
      if (event.schemaVersion === 2) {
        if (
          event.status === "open" &&
          event.participantIds?.includes(user.uid) &&
          +asDate(event.startsAt) <= Date.now() &&
          eventEndMillis(event) > Date.now() &&
          missionUnlocked(event, user.uid, league.eventRewards || [])
        ) {
          if (event.kind === "mission") {
            const detail = await DB.eventDetails(event.id);
            if (!detail) return missions;
            const progress =
              detail.progress?.find((row) => row.uid === user.uid)?.progress ||
              0;
            if (
              detail.claimedPeriods?.includes(periodWindow(event).key) ||
              (detail.claimedPeriods?.length || 0) >= event.maxRepeats
            )
              return missions;
            missions.push({
              id: `event-${event.id}`,
              type: "OBJECTIVE_MISSION",
              claimable: policyAt().features.mode === "normal" && policyAt().features.claims && policyAt().features.missions && detail.status === "open" &&
                +asDate(detail.startsAt) <= Date.now() &&
                eventEndMillis(detail) > Date.now() &&
                (detail.claimable ?? !!detail.progress?.find((row) => row.uid === user.uid)?.eligible),
              title: event.title,
              objectivePreview: missionObjectivePreview(event),
              eventDescription: event.description || "",
              rarity: eventRarityId(event),
              description: `${objectiveSummary(event)} · ${difficultyLabel(event.difficulty)}`,
              done: Math.min(progress, event.objective.target),
              total: event.objective.target,
              href: `#/event/${event.id}`,
              icon: eventIcon(event),
              rewards: detail.rewardPreview || [],
            });
          } else if (event.method === "objective") {
            const detail = await DB.eventDetails(event.id);
            if (!detail) return missions;
            const progress =
              detail.progress?.find((row) => row.uid === user.uid)?.progress ||
              0;
            missions.push({
              id: `event-${event.id}`,
              type: "COMPETITION_OBJECTIVE",
              title: event.title,
              objectivePreview: missionObjectivePreview(event),
              eventDescription: event.description || "",
              rarity: eventRarityId(event),
              description: objectiveSummary(event),
              done: Math.min(progress, event.objective.target),
              total: event.objective.target,
              href: `#/event/${event.id}`,
              icon: eventIcon(event),
              rewards: detail.rewardPreview || [],
            });
          } else if (event.method === "vote")
            missions.push({
              id: `event-${event.id}`,
              type: "EVENT_VOTE",
              title: event.title,
              eventDescription: event.description || "",
              rarity: eventRarityId(event),
              description: "Consulta as regras e participa na votação.",
              done: 0,
              total: 1,
              href: `#/event/${event.id}`,
              icon: eventIcon(event),
            });
        }
        return missions;
      }

      if (
        event.status !== "open" ||
        +asDate(event.endsAt) <= Date.now() ||
        !votersFor(event, league.users, league.games).includes(user.uid) ||
        !event.questions.some((q) =>
          candidatesFor(event, q, league.users, league.games).some(
            (uid) => uid !== user.uid,
          ),
        )
      )
        return missions;
      const vote = await DB.read(`events/${event.id}/votes/${user.uid}`);
      missions.push({
        id: `event-${event.id}`,
        type: "EVENT_VOTE",
        title: event.title,
        eventDescription: event.description || "",
        rarity: eventRarityId(event),
        description: vote
          ? "Voto guardado. Podes atualizar até ao fecho."
          : "Escolhe os colegas que merecem a recompensa.",
        done: vote ? 1 : 0,
        total: 1,
        href: `#/event/${event.id}`,
        icon: eventIcon(event),
      });
      return missions;
    }),
  );
  missions.push(...eventMissions.flat());

  return missions;
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
  const ordered = [...missions].sort(compareEventRarity);
  const cards = (entries) =>
    `<div class="mission-list">${entries
      .map((m) => {
        const competition = m.type === "COMPETITION_OBJECTIVE";
        const percentage = Math.round((m.done / m.total) * 100);
        return `<a class="mission${competition ? " mission-competition" : ""}${m.rarity ? " event-rarity-surface" : ""}"${m.rarity ? ` data-rarity="${eventRarityId(m)}"` : ""} href="${esc(m.href)}"><div class="mission-symbol">${icon(m.icon)}</div><div class="mission-content"><div class="mission-heading"><h3>${esc(m.title)}</h3>${m.rarity ? rarityBadge(m) : ""}${competition ? '<span class="mission-competition-label">Competição</span>' : ""}</div>${["OBJECTIVE_MISSION", "COMPETITION_OBJECTIVE"].includes(m.type) ? `<p class="mission-objective">${esc(m.objectivePreview?.text || "Consulta o objetivo e os critérios da missão.")}${m.objectivePreview?.criteria ? `<span class="mission-objective-criteria">${esc(m.objectivePreview.criteria)}</span>` : ""}</p>` : `<p>${esc(m.description)}</p>`}${rewardMarkers(m.rewards)}<div class="progress"><span style="--progress:${percentage}%"></span></div><small>${m.done} / ${m.total} · ${percentage}%</small></div><span class="mission-arrow">${icon("arrow")}</span></a>`;
      })
      .join("")}</div>`;
  if (!grouped) return cards(ordered);
  return `<div class="mission-groups activity-groups">${groupActivities(ordered)
    .map(
      (group) =>
        `<section class="mission-group activity-group" data-activity-category="${group.id}" aria-label="${esc(group.title)}"><div class="mission-group-head activity-group-head"><div class="activity-group-identity"><span class="activity-group-symbol">${icon(group.icon)}</span><div><h2>${esc(group.title)}</h2><p>${esc(group.description)}</p></div></div><span class="pill" aria-label="${group.items.length} itens">${group.items.length}</span></div>${cards(group.items)}</section>`,
    )
    .join("")}</div>`;
}
