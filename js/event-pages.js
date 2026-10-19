import { challengeRules } from "./event-objective-view.js";
import { rewardBreakdown, configuredRewards } from "./reward-presentation.js";
import {
  ACTIVITY_CATEGORIES,
  activityCategory,
  groupActivities,
} from "./activity-categories.js";
import {
  eventRarityId,
  rarityBadge,
  compareEventRarity,
} from "./event-rarity.js";
import { icon, eventIcon } from "./icons.js";
import { rewardShowcase, combinedProgress } from "./event-presentation.js";
import { bindImages } from "./cards.js";
import * as DB from "./db.js";
import { policyAt } from "./system-policy.js";
import {
  esc,
  pageHead,
  linkButton,
  busy,
  toast,
  confirmDialog,
  modal,
} from "./ui.js";
import { asDate, formatDate, formatDateTime, FEEDBACK } from "./utils.js";
import {
  medal,
  positionLabel,
  sharedRankingPositions,
  rewardText,
  periodWindow,
  hasTemporaryReward,
  eventEndLabel,
  eventEndMillis,
} from "./event-model.js";
const name = (ctx, uid) =>
  ctx.league.users.find((u) => u.uid === uid)?.displayName || uid;
const auditLabels = {
  create: "Criação",
  update: "Edição",
  duplicate: "Duplicação",
  open: "Publicação",
  cancel: "Cancelamento",
  revoke: "Anulação de prémios",
  "prepare-results": "Preparação de resultados",
  "confirm-results": "Confirmação e entrega",
  "vote-submitted": "Voto guardado",
  "invalidate-vote": "Voto anulado",
  "mission-completed": "Missão concluída",
  "scheduled-open": "Abertura agendada",
};
let polling = null;
const states = {
  draft: "Rascunho",
  scheduled: "Agendado",
  open: "Ativo",
  review: "Resultados a confirmar",
  closed: "Terminado",
  cancelled: "Cancelado",
};
export async function eventsPage(ctx) {
  const events = await ctx.cached(
    "events:all",
    async () => (await DB.callAdmin("listEvents", { scope: "all" })).data || [],
  );
  ctx.render(
    `${pageHead("A liga em movimento", "Eventos e desafios", "Participa, acompanha o calendário e consulta o histórico.", linkButton("#/missions", "As tuas missões", "ghost"))}<section class="panel"><div class="event-toolbar"><label>Pesquisar<input id="public-event-search" type="search" placeholder="Nome ou descrição"></label><label>Estado<select id="public-event-state"><option value="">Todos</option>${Object.entries(
      states,
    )
      .filter(([key]) => key !== "draft")
      .map(([key, value]) => `<option value="${key}">${value}</option>`)
      .join(
        "",
      )}</select></label><label>Categoria<select id="public-event-type"><option value="">Todos</option>${ACTIVITY_CATEGORIES.map((group) => `<option value="${group.id}">${esc(group.title)}</option>`).join("")}</select></label><label>A partir de<input type="date" id="public-event-date"></label></div><div id="public-event-list" class="activity-groups"></div></section>`,
  );
  const draw = () => {
    const text = document
        .querySelector("#public-event-search")
        .value.toLowerCase(),
      state = document.querySelector("#public-event-state").value,
      type = document.querySelector("#public-event-type").value,
      date = document.querySelector("#public-event-date").value;
    const filtered = events
      .filter(
        (e) =>
          `${e.title} ${e.description || ""}`.toLowerCase().includes(text) &&
          (!state || e.status === state) &&
          (!type || activityCategory(e) === type) &&
          (!date || eventEndMillis(e) >= +new Date(date)),
      )
      .sort(
        (a, b) =>
          compareEventRarity(a, b) ||
          eventEndMillis(b) - eventEndMillis(a) ||
          a.title.localeCompare(b.title),
      );
    const eventCard = (event) =>
      `<a class="event-management-card event-public-card event-rarity-surface" data-rarity="${eventRarityId(event)}" href="#/event/${esc(event.id)}">${event.image ? `<img class="event-cover" src="${esc(event.image)}" alt="" loading="lazy">` : ""}<div class="section-head"><span class="pill">${states[event.status]}</span><small>${event.kind === "mission" ? "Missão" : "Evento"}</small></div>${rarityBadge(event)}<h2 class="event-title-with-icon">${icon(eventIcon(event))}${esc(event.title)}</h2><p>${esc(event.description || "")}</p><small>${formatDate(event.startsAt || event.createdAt)} → ${eventEndLabel(event)}</small>${event.winners?.length ? `<p class="event-first-place">🥇 ${esc(name(ctx, event.winners[0].uid || event.winners[0].uids?.[0]))}</p>` : ""}<span class="event-card-cta">Consultar →</span></a>`;
    document.querySelector("#public-event-list").innerHTML =
      groupActivities(filtered)
        .map(
          (group) =>
            `<section class="activity-group" data-activity-category="${group.id}" aria-label="${esc(group.title)}"><div class="mission-group-head activity-group-head"><div class="activity-group-identity"><span class="activity-group-symbol">${icon(group.icon)}</span><div><h2>${esc(group.title)}</h2><p>${esc(group.description)}</p></div></div><span class="pill" aria-label="${group.items.length} itens">${group.items.length}</span></div><div class="event-grid">${group.items.map(eventCard).join("")}</div></section>`,
        )
        .join("") ||
      '<p class="muted" role="status">Nenhum desafio encontrado. Experimenta outros filtros.</p>';
  };
  for (const id of [
    "public-event-search",
    "public-event-state",
    "public-event-type",
    "public-event-date",
  ])
    document.querySelector(`#${id}`).oninput = draw;
  draw();
}
export async function managedEventPage(ctx, event) {
  clearInterval(polling);
  const admin = ctx.user.role === "admin",
    now = Date.now(),
    active =
      event.status === "open" &&
      +asDate(event.startsAt) <= now &&
      eventEndMillis(event) > now,
    participant = event.participantIds.includes(ctx.user.uid);
  const progress = event.progress?.find((row) => row.uid === ctx.user.uid),
    window = periodWindow(event),
    claimed = event.claimedPeriods?.includes(window.key),
    atLimit = (event.claimedPeriods?.length || 0) >= event.maxRepeats;
  const saved =
    event.method === "vote" && participant
      ? await DB.read(`events/${event.id}/votes/${ctx.user.uid}`)
      : null;
  const candidates = event.participantIds.filter(
    (uid) => event.allowSelfVote || uid !== ctx.user.uid,
  );
  const rankRows = (rows) =>
    sharedRankingPositions(event, rows)
      .map(
        (row) =>
          `<tr><td data-label="Posição">${event.kind === "mission" ? (row.reward ? "✓ Concluída" : "Em progresso") : positionLabel(row.position)}</td><td data-label="Jogador">${esc(name(ctx, row.uid))}</td><td data-label="Resultado">${event.method === "vote" ? row.votes : ["combined","all"].includes(event.objective?.metric) ? `${row.progress}%` : row.progress}</td><td data-label="Recompensa">${row.reward ? `${rewardBreakdown(row.reward)}${row.expiresAt && hasTemporaryReward(row.reward) ? `<small>Bónus temporários até ${formatDate(row.expiresAt)}</small>` : ""}` : "—"}</td></tr>`,
      )
      .join("");
  ctx.render(
    `${pageHead("Eventos e missões", event.title, event.description || "", linkButton("#/events", "Calendário e histórico", "ghost"))}<div class="event-detail-layout"><section class="panel content-stack event-rarity-surface event-rarity-detail" data-rarity="${eventRarityId(event)}">${rarityBadge(event)}${event.image ? `<img class="event-cover" src="${esc(event.image)}" alt="">` : ""}<div class="section-head"><span class="pill">${states[event.status]}</span><small>${event.participantIds.length} ${event.participantIds.length === 1 ? "participante" : "participantes"}</small></div><p>${formatDateTime(event.startsAt)} → ${eventEndLabel(event)}</p>${challengeRules(event)}${rewardShowcase(event, ctx.league.players.find((p) => p.uid === ctx.user.uid) || ctx.user)}${event.method === "objective" && participant ? `<div class="mission-progress-panel"><h2>O teu progresso</h2>${event.myRewards?.length ? `<details><summary>Recompensas que recebeste</summary>${event.myRewards.map((delivery) => `<article>${rewardBreakdown(delivery.reward)}${hasTemporaryReward(delivery.reward) ? `<small>Bónus temporários até ${formatDate(delivery.expiresAt)}</small>` : ""}</article>`).join("")}</details>` : ""}<strong>${progress?.progress || 0} / ${event.objective.target}</strong><div class="progress"><span style="--progress:${Math.min(100, ((progress?.progress || 0) / event.objective.target) * 100)}%"></span></div><p>${event.kind !== "mission" ? (event.status === "closed" ? "A competição terminou. Consulta os resultados." : event.status === "review" ? "A meta foi atingida. Os resultados aguardam confirmação." : progress?.eligible ? "Atingiste a meta. A tua posição fica registada na classificação." : "Acompanha o teu progresso até à meta.") : claimed ? (event.myRewards?.some(row => row.pending) ? "Recompensa adiada até existir orçamento disponível." : "Já recebeste a recompensa deste período.") : atLimit ? "Já recebeste todas as recompensas desta missão." : event.status === "closed" ? "Esta missão terminou." : event.status === "cancelled" ? "Esta missão foi cancelada." : progress?.eligible ? esc(event.claimNotice || "Objetivo cumprido. A tua recompensa está pronta.") : "O progresso é atualizado com os resultados e as avaliações dos jogos."}</p>${event.kind === "mission" && active && !claimed && !atLimit ? `<button class="btn btn-primary" id="claim-mission" ${!progress?.eligible || event.claimMode === "blocked" ? "disabled" : ""}>${event.claimMode === "deferred" ? "Concluir e aguardar" : "Receber recompensa"}</button>` : ""}</div>` : ""}${active && participant && event.method === "vote" && +asDate(event.votingStartsAt) <= now && (!event.votingEndsAt || +asDate(event.votingEndsAt) > now) ? `<form id="event-vote-form" class="content-stack"><h2>O teu voto</h2><p>Escolhe até ${event.votesPerUser} candidatos diferentes. Atualizar substitui o voto anterior.</p><div class="event-ballot">${candidates.map((uid) => `<label class="event-candidate"><input type="checkbox" name="selection" value="${esc(uid)}" ${saved?.selections?.includes(uid) ? "checked" : ""}><span>${esc(name(ctx, uid))}</span></label>`).join("")}</div><button class="btn btn-primary">${saved ? "Atualizar voto" : "Guardar voto"}</button></form>` : ""}${event.kind !== "mission" && event.status === "closed" && !event.winners.length ? '<p class="warning">Sem vencedores elegíveis; os critérios mínimos não foram cumpridos.</p>' : ""}${event.status === "cancelled" ? '<p class="warning">Desafio cancelado. As recompensas foram anuladas.</p>' : ""}</section><section id="event-leaderboard" class="panel content-stack"><h2>${event.kind === "mission" ? "Progresso e conclusões" : event.status === "closed" ? "Classificação final" : "Classificação"}</h2>${
      event.kind !== "mission" && event.winners.length
        ? `<div class="event-podium">${event.winners
            .slice(0, 3)
            .map(
              (winner) =>
                `<article class="podium-award place-${winner.position}"><span>${medal(winner.position)}</span><h3>${esc(name(ctx, winner.uid))}</h3>${rewardBreakdown(winner.reward)}</article>`,
            )
            .join("")}</div>`
        : ""
    }${event.ranking?.length ? `${event.method === "vote" ? `<p>${event.totalVotes || 0} ${event.totalVotes === 1 ? "voto" : "votos"}</p>` : ""}<div class="table-wrap"><table class="event-ranking-table"><thead><tr><th>${event.kind === "mission" ? "Conclusão" : "Posição"}</th><th>Jogador</th><th>${event.method === "vote" ? "Votos" : "Progresso"}</th><th>Recompensa atribuída</th></tr></thead><tbody>${rankRows(event.ranking.map((row) => ({ ...row, ...((event.winners || []).find((w) => w.uid === row.uid) || (event.participationAwards || []).find((w) => w.uid === row.uid)), position: row.position })))}</tbody></table></div>` : `<p class="muted">${event.kind === "mission" ? "Ainda não há conclusões registadas." : "Os resultados ainda não estão disponíveis."}</p>`}</section></div>${admin ? `<section class="panel event-audit content-stack"><div class="section-head"><div><span class="eyebrow">ACESSO ADMIN</span><h2>${event.kind === "mission" ? "Conclusões e entregas" : "Resultados e auditoria"}</h2></div><div class="actions">${event.status === "open" ? (event.kind === "mission" ? '<button class="btn btn-secondary" data-manage="close">Encerrar missão</button>' : '<button class="btn btn-secondary" data-manage="prepare">Preparar resultados</button>') : ""}${event.status === "review" ? '<button class="btn btn-primary" data-manage="confirm">Confirmar e entregar prémios</button>' : ""}${event.status === "closed" ? '<button class="btn btn-danger" data-manage="revoke">Anular prémios com motivo</button>' : ""}</div></div>${event.method === "admin" && ["open", "review"].includes(event.status) ? `<div id="manual-winners" class="form-grid">${Array.from({ length: event.winnerCount }, (_, i) => `<label>${medal(i + 1)} ${i + 1}.º lugar<select name="manual-${i}"><option value="">Sem vencedor nesta posição</option>${event.participantIds.map((uid) => `<option value="${esc(uid)}" ${event.manualWinners?.[i] === uid ? "selected" : ""}>${esc(name(ctx, uid))}</option>`).join("")}</select></label>`).join("")}</div>` : ""}<details open><summary>Recompensas configuradas</summary>${configuredRewards(event)}</details><div class="event-toolbar"><label>Votante<input id="audit-voter" type="search" placeholder="Nome ou identificador"></label><label>Candidato<input id="audit-candidate" type="search" placeholder="Nome ou identificador"></label></div><div class="table-wrap"><table><thead><tr><th>Quem votou</th><th>Em quem</th><th>Data e hora</th><th>Ação</th></tr></thead><tbody id="audit-votes"></tbody></table></div>${event.flags?.length ? `<details><summary>${event.flags.length} padrões para revisão</summary>${event.flags.map((flag) => `<p>${esc(flag.users.map((uid) => name(ctx, uid)).join(" ↔ "))}: ${esc(flag.message)}</p>`).join("")}</details>` : ""}<details><summary>Participantes (${event.participantIds.length})</summary><p>${event.participantIds.map((uid) => esc(name(ctx, uid))).join(" · ")}</p></details><details><summary>Registo de entregas e anulações</summary>${(event.deliveries || []).map((delivery) => `<article><h3>${esc(name(ctx, delivery.uid))} · ${delivery.revoked ? "Anulada" : "Entregue"}</h3>${rewardBreakdown(delivery.reward)}</article>`).join("") || "<p>Sem entregas.</p>"}</details><details><summary>Ações administrativas</summary>${(event.audit || []).map((entry) => `<p>${formatDateTime(entry.createdAt)} · ${esc(name(ctx, entry.actorId))} · ${esc(auditLabels[entry.action] || entry.action)}${entry.details?.voterId ? ` · ${esc(name(ctx, entry.details.voterId))}` : ""}${entry.details?.original?.selections ? ` · voto original: ${entry.details.original.selections.map((uid) => esc(name(ctx, uid))).join(", ")}` : ""}${entry.details?.reason ? ` · ${esc(entry.details.reason)}` : ""}</p>`).join("")}</details></section>` : ""}`,
  );
  if (["combined","all"].includes(event.objective?.metric) && progress?.ratingState) {
    const panel = document.querySelector(".mission-progress-panel");
    if (panel) {
      panel.querySelector(":scope > strong").remove();
      panel.querySelector(":scope > .progress").outerHTML = combinedProgress(event, progress.ratingState);
    }
  }
  if (event.objective?.metric === "ratingAverage" && progress?.ratingState) {
    const state = progress.ratingState;
    document
      .querySelector(".mission-progress-panel > strong")
      ?.insertAdjacentHTML(
        "afterend",
        `<div class="event-rating-preview"><p>Janela: ${state.games} / ${event.objective.target} jogos · ${state.ratedGames} com avaliações suficientes.</p>${
          state.averages
            ? Object.entries(state.averages)
                .map(
                  ([key, value]) =>
                    `<p>${esc(FEEDBACK.find(([id]) => id === key)?.[1] || key)}: <b>${value.toLocaleString("pt-PT", { maximumFractionDigits: 2 })} / 5 estrelas</b></p>`,
                )
                .join("")
            : "<p>A média fica disponível quando todos os jogos da janela tiverem avaliações suficientes.</p>"
        }</div>`,
      );
  }
  bindImages(document.querySelector("#main"));
  if (
    event.liveResults &&
    active &&
    ["vote", "objective"].includes(event.method)
  ) {
    let previous = JSON.stringify(event.ranking || []);
    polling = setInterval(async () => {
      if (location.hash !== `#/event/${event.id}`) {
        clearInterval(polling);
        return;
      }
      try {
        const fresh = await DB.eventDetails(event.id);
        if (fresh.status !== event.status) return managedEventPage(ctx, fresh);
        if (
          event.method === "objective" &&
          JSON.stringify(fresh.progress) !== JSON.stringify(event.progress)
        )
          return managedEventPage(ctx, fresh);

        const next = JSON.stringify(fresh.ranking || []);
        const board = document.querySelector("#event-leaderboard");
        if (board && next !== previous) {
          previous = next;
          board.innerHTML = `<h2>Classificação em direto</h2>${event.method === "vote" ? `<p>${fresh.totalVotes || 0} votos</p>` : ""}<div class="table-wrap"><table class="event-ranking-table"><thead><tr><th>${event.kind === "mission" ? "Conclusão" : "Posição"}</th><th>Jogador</th><th>${event.method === "vote" ? "Votos" : "Progresso"}</th><th>Recompensa</th></tr></thead><tbody>${rankRows(fresh.ranking || [])}</tbody></table></div>`;
        }
      } catch {}
    }, 5000);
  }
  const vote = document.querySelector("#event-vote-form");
  if (vote)
    vote.onsubmit = async (e) => {
      e.preventDefault();
      const selections = new FormData(vote).getAll("selection");
      if (!selections.length || selections.length > event.votesPerUser)
        return toast(
          `Escolhe entre 1 e ${event.votesPerUser} jogadores.`,
          "error",
        );
      try {
        await busy(e.submitter, () =>
          DB.callAdmin("voteEvent", { eventId: event.id, selections }),
        );
        toast("Voto guardado.");
        await ctx.refresh();
        await managedEventPage(ctx, await DB.eventDetails(event.id));
      } catch (error) {
        toast(error.message, "error");
      }
    };
  const voteForm=document.querySelector("#event-vote-form");
  if(voteForm && (event.votingAvailable===false || policyAt().features.mode!=="normal" || !policyAt().features.events)) {
    voteForm.querySelectorAll("input,button").forEach(node=>node.disabled=true);
    voteForm.insertAdjacentHTML("afterbegin",'<p class="warning" role="status">A vota\u00e7\u00e3o est\u00e1 temporariamente pausada.</p>');
  }
  const claim = document.querySelector("#claim-mission");
  if (claim)
    claim.onclick = async () => {
      try {
        const result = await busy(claim, () =>
          DB.callAdmin("claimMission", { eventId: event.id }),
        );
        toast(result.data.pending ? "Missão concluída. A recompensa será entregue quando houver orçamento disponível." : `Recompensa atribuída: ${rewardText(result.data.reward)}`);
        await ctx.refresh();
        await managedEventPage(ctx, await DB.eventDetails(event.id));
      } catch (error) {
        toast(error.message, "error");
      }
    };
  const invoke = async (action, extra = {}) => {
    await DB.callAdmin("eventAction", { action, eventId: event.id, ...extra });
    await ctx.refresh();
    await managedEventPage(ctx, await DB.eventDetails(event.id));
  };
  if (admin) {
    const drawVotes = () => {
      const voter = document.querySelector("#audit-voter").value.toLowerCase(),
        candidate = document
          .querySelector("#audit-candidate")
          .value.toLowerCase();
      document.querySelector("#audit-votes").innerHTML = (event.ballots || [])
        .filter(
          (v) =>
            `${name(ctx, v.id)} ${v.id}`.toLowerCase().includes(voter) &&
            (v.selections || []).some((uid) =>
              `${name(ctx, uid)} ${uid}`.toLowerCase().includes(candidate),
            ),
        )
        .map(
          (v) =>
            `<tr><td>${esc(name(ctx, v.id))}</td><td>${(v.selections || []).map((uid) => esc(name(ctx, uid))).join(", ")}</td><td>${formatDateTime(v.submittedAt)}</td><td>${["open", "review"].includes(event.status) ? `<button class="btn btn-ghost" data-invalidate="${esc(v.id)}">Anular voto</button>` : "Preservado"}</td></tr>`,
        )
        .join("");
    };
    drawVotes();
    document.querySelector("#audit-voter").oninput = drawVotes;
    document.querySelector("#audit-candidate").oninput = drawVotes;
    const reasonDialog = (title, action, extra = {}) => {
      const close = modal(
        title,
        '<form id="event-reason" class="content-stack"><label>Motivo obrigatório<textarea name="reason" required maxlength="500"></textarea></label><button class="btn btn-danger">Confirmar</button></form>',
      );
      document.querySelector("#event-reason").onsubmit = async (e) => {
        e.preventDefault();
        try {
          const reason = e.currentTarget.elements.reason.value;
          await busy(e.submitter, () => invoke(action, { ...extra, reason }));
          close();
        } catch (error) {
          toast(error.message, "error");
        }
      };
    };
    document.querySelector("#audit-votes").onclick = (e) => {
      const button = e.target.closest("[data-invalidate]");
      if (button)
        reasonDialog("Anular voto", "correct", {
          voterId: button.dataset.invalidate,
        });
    };
    document.querySelectorAll("[data-manage]").forEach(
      (button) =>
        (button.onclick = async () => {
          const action = button.dataset.manage;
          if (action === "revoke")
            return reasonDialog("Anular recompensas", "revoke");
          if (
            action === "confirm" &&
            !(await confirmDialog(
              "Confirmar esta classificação e entregar as recompensas?",
            ))
          )
            return;
          try {
            const winnerIds = [
              ...document.querySelectorAll("#manual-winners select"),
            ]
              .map((select) => select.value)
              .filter(Boolean);
            await busy(button, () => invoke(action, { winnerIds }));
          } catch (error) {
            toast(error.message, "error");
          }
        }),
    );
  }
}
