import { eventRarityId, rarityBadge } from "./event-rarity.js";
import * as DB from "./db.js";
import { asDate, formatDate, formatDateTime } from "./utils.js";
import { votersFor, candidatesFor, eventOutcome } from "./event-rules.js";
import { esc, pageHead, empty, linkButton, busy, toast } from "./ui.js";
export { mountEventAdmin } from "./event-admin.js";
import { managedEventPage } from "./event-pages.js";
import { rewardBreakdown } from "./reward-presentation.js";
function legacyAudit(ctx, event) {
  if (ctx.user.role !== "admin" || !event.ballots) return;
  const display = (uid) =>
    ctx.league.users.find((u) => u.uid === uid)?.displayName || uid;
  document
    .querySelector("#main")
    .insertAdjacentHTML(
      "beforeend",
      '<section class="panel content-stack"><h2>Auditoria da votação anterior</h2><label>Pesquisar votante ou candidato<input id="legacy-vote-search" type="search"></label><div class="table-wrap"><table><thead><tr><th>Quem votou</th><th>Em quem</th><th>Data</th></tr></thead><tbody id="legacy-vote-rows"></tbody></table></div></section>',
    );
  const draw = () => {
    const search = document
      .querySelector("#legacy-vote-search")
      .value.toLowerCase();
    document.querySelector("#legacy-vote-rows").innerHTML = event.ballots
      .filter((v) =>
        [v.id, ...v.selections]
          .map(display)
          .join(" ")
          .toLowerCase()
          .includes(search),
      )
      .map(
        (vote) =>
          `<tr><td>${esc(display(vote.id))}</td><td>${vote.selections.map((uid) => esc(display(uid))).join(", ")}</td><td>${vote.submittedAt ? formatDateTime(vote.submittedAt) : "—"}</td></tr>`,
      )
      .join("");
  };
  draw();
  document.querySelector("#legacy-vote-search").oninput = draw;
}
export async function eventPage(ctx, id) {
  const event = await ctx.cached(`event:${id}`, () => DB.eventDetails(id));
  if (event?.schemaVersion === 2) return managedEventPage(ctx, event);
  if (event && ["closed", "cancelled"].includes(event.status)) {
    ctx.render(
      `${pageHead("Resultado da votação", event.title, event.description || "", linkButton("#/missions", "Missões", "ghost"))}<section class="panel event-result event-rarity-surface" data-rarity="${eventRarityId(event)}">${rarityBadge(event)}<div class="section-intro"><h2>${event.status === "cancelled" ? "Evento cancelado" : "Votação encerrada"}</h2><p>${event.rewardsApplied === false ? "A atribuição das recompensas está a ser concluída." : esc(eventOutcome(event, ctx.league.users))}</p></div>${(event.winners || []).map((winner) => `<div class="event-result-question"><p>${esc(winner.label)} · ${winner.votes} ${winner.votes === 1 ? "voto" : "votos"}</p>${event.status === "closed" && winner.uids.length && winner.reward ? `<div class="event-revealed-reward"><h3>Recompensa atribuída</h3>${rewardBreakdown(winner.reward)}</div>` : ""}</div>`).join("")}</section>`,
    );
    legacyAudit(ctx, event);
    return;
  }
  if (
    !event ||
    event.status !== "open" ||
    +asDate(event.endsAt) <= Date.now() ||
    !votersFor(event, ctx.league.users, ctx.league.games).includes(ctx.user.uid)
  )
    return ctx.render(
      empty(
        "Evento indisponível",
        "Esta votação terminou ou não está disponível para a tua conta.",
        linkButton("#/missions", "Missões"),
      ),
    );
  const saved = await DB.read(`events/${id}/votes/${ctx.user.uid}`);
  const questions = event.questions
    .map((q) => ({
      ...q,
      candidates: candidatesFor(
        event,
        q,
        ctx.league.users,
        ctx.league.games,
      ).filter((uid) => uid !== ctx.user.uid),
    }))
    .filter((q) => q.candidates.length);
  if (!questions.length)
    return ctx.render(
      empty(
        "Sem candidatos disponíveis",
        "Não podes votar em ti próprio.",
        linkButton("#/missions", "Missões"),
      ),
    );
  ctx.render(
    `${pageHead("Votação", event.title, event.description || "", linkButton("#/missions", "Missões", "ghost"))}<section class="panel event-voting event-rarity-surface" data-rarity="${eventRarityId(event)}">${rarityBadge(event)}<p>Encerra: ${formatDateTime(event.endsAt)}</p><form id="event-vote-form" class="content-stack">${questions
      .map(
        (q) =>
          `<fieldset class="event-question"><legend>${esc(q.label)}</legend><label>Escolher jogador<select name="${q.id}" required><option value="">Escolhe um colega</option>${q.candidates
            .map((uid) => {
              const p = ctx.league.players.find((p) => p.uid === uid);
              return `<option value="${esc(uid)}" ${saved?.answers?.[q.id] === uid ? "selected" : ""}>${esc(p?.displayName || uid)}</option>`;
            })
            .join("")}</select></label></fieldset>`,
      )
      .join(
        "",
      )}<button class="btn btn-primary">${saved ? "Atualizar voto" : "Guardar voto"}</button></form></section>`,
  );
  legacyAudit(ctx, event);
  document.querySelector("#event-vote-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await busy(e.submitter, () =>
        DB.callAdmin("voteEvent", {
          eventId: id,
          answers: Object.fromEntries(new FormData(e.currentTarget)),
        }),
      );
      toast("Voto guardado.");
      ctx.go("#/missions");
    } catch (error) {
      toast(error.message, "error");
    }
  };
}
