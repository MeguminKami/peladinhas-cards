import { openCasinoGrant } from "./admin-casino.js";
import { mountAdminMessages } from "./admin-messages.js";
import { matchAverageSummary, matchComponentAverages } from "./match-rating-summary.js";
import { openPasswordRecovery } from "./password-recovery.js";
import { openGameRatings } from "./admin-game-ratings.js";
import { policyAt } from "./system-policy.js";
import { mountMaintenance } from "./maintenance.js";
import { roleLabel, gameStatusLabel } from "./labels.js";
import { defaultOvrPresets } from "./ovr-presets.js";
import { mountEventAdmin } from "./events.js";
import { cardWeek } from "./card-week.js";
import { ADMIN_AREAS } from "./admin-menu.js";
import * as DB from "./db.js";
import { canEditRating } from "./rating-window.js";
import { isNullCommunityRating } from "./community-review.js";
import {
  THEMES,
  ATTRIBUTES,
  FEEDBACK,
  themeName,
  validOvrWeights,
  OVR_POSITIONS,
} from "./utils.js";
import {
  esc,
  pageHead,
  empty,
  linkButton,
  busy,
  toast,
  confirmDialog,
  modal,
} from "./ui.js";
import { icon } from "./icons.js";
import { card, bindImages } from "./cards.js";
import { editProfile } from "./profile.js";
function actionCaption(label) {
  return `<span class="admin-action-caption" aria-hidden="true">${esc(label)}</span>`;
}
function playerAction(href, label, symbol, variant = "ghost", caption = label) {
  return `<a href="${href}" class="btn btn-icon btn-${variant}" aria-label="${label}">${icon(symbol)}${actionCaption(caption)}</a>`;
}

export async function adminPage(ctx, section = "overview") {
  const players = ctx.league.players,
    games = ctx.league.games,
    newPlayers = players.filter((p) => p.communityCount < policyAt().rules.communityMinimum);
  const pages = {
    overview: `<section class="admin-overview"><div class="section-head"><h2>Estado da liga</h2><span class="pill success">Administração</span></div><div class="admin-health-grid">${[
      [
        "Plantel",
        `${players.length} jogadores`,
        `${players.filter((p) => p.official).length} cartas oficiais`,
        "players",
      ],
      [
        "Jogos",
        `${games.filter((g) => g.status === "open").length} abertos`,
        `${games.filter((g) => g.status === "draft").length} rascunhos · ${games.filter((g) => g.status === "closed").length} finalizados`,
        "games",
      ],
      [
        "Avaliações pendentes",
        `${newPlayers.length} jogadores`,
        `Ainda sem ${policyAt().rules.communityMinimum} votos externos`,
        "edit",
      ],
      [
        "OVR médio",
        players.length
          ? (
              players.reduce((sum, p) => sum + p.ovr, 0) / players.length
            ).toFixed(1)
          : "—",
        "Média do plantel",
        "lab",
      ],
    ]
      .map(
        ([name, value, note, symbol]) =>
          `<article class="panel admin-health">${icon(symbol)}<small>${name}</small><strong>${value}</strong><p>${note}</p></article>`,
      )
      .join(
        "",
      )}</div><div class="admin-overview-columns"><section class="panel"><h3>Últimos jogos</h3>${
      games
        .slice(0, 4)
        .map(
          (g) =>
            `<a class="overview-line" href="#/game/${esc(g.id)}"><b>${esc(g.title)}</b><span class="pill ${g.status === "open" ? "success" : ""}">${{ open: "Aberto", draft: "Rascunho", closed: "Finalizado" }[g.status]}</span></a>`,
        )
        .join("") || '<p class="muted">Ainda sem jogos.</p>'
    }</section><section class="panel"><h3>Acompanhamento</h3><a class="overview-line" href="#/admin/support">${icon("tickets")}<b>Tickets abertos</b><span id="admin-open-tickets">…</span></a><a class="overview-line" href="#/admin/ratings">${icon("edit")}<b>Consultar avaliações</b>${icon("arrow")}</a><a class="overview-line" href="#/admin/weights">${icon("lab")}<b>Pesos por posição</b><span class="pill">100%</span></a><div id="admin-week-status"></div></section></div></section>`,
    weights: `<section class="panel"><h2>Pesos do OVR</h2><p>Define os pesos para cada posição. Cada posição deve somar 100%. A carta usa a posição principal do jogador. Guardar atualiza as cartas em evolução. Cartas de semanas fechadas mantêm os valores e pesos originais.</p><div id="ovr-presets"></div><form id="ovr-settings"><label>Posição<select id="ovr-position">${OVR_POSITIONS.map((p) => `<option ${p === "ALA" ? "selected" : ""}>${p}</option>`).join("")}</select></label><div class="form-grid">${ATTRIBUTES.map(([key, name]) => `<label>${esc(name)} (%)<input name="${key}" type="number" min="0" max="100" step="0.01" required value="${ctx.league.ovrWeights.positions.ALA[key]}"></label>`).join("")}</div><p id="ovr-total" aria-live="polite">Total: 100%</p><button class="btn btn-primary">Guardar pesos e recalcular</button></form></section>`,
    players: `<section><h2>Jogadores</h2><div class="table-wrap admin-players-table"><table><thead><tr><th>Jogador</th><th>Perfil de acesso</th><th>OVR</th><th>Acções</th></tr></thead><tbody>${players.map((p) => `<tr><td><a href="#/player/${p.uid}">${esc(p.displayName || p.username)}<small>@${esc(p.username)}</small></a></td><td>${roleLabel(p.role)}</td><td>${p.ovr}</td><td><div class="actions compact admin-player-actions" style="--player-action-count:${p.role === "admin" ? 9 : 10}" role="group" aria-label="Acções do jogador">${playerAction(`#/admin/player/${p.uid}/edit`, "Editar jogador", "edit", "primary", "Editar")}${playerAction(`#/admin/initial/${p.uid}`, "Avaliação inicial", "missions", "secondary", "Inicial")}${playerAction(`#/admin/cards/${p.uid}`, "Pré-visualizar carta", "preview", "ghost", "Carta")}${playerAction(`#/admin/ovr/${p.uid}`, "Cálculo OVR", "chart", "ghost", "OVR")}${playerAction(`#/admin/ratings/${p.uid}`, "Avaliações detalhadas", "ratingGames", "ghost", "Votos")}<button type="button" data-casino-grant="${esc(p.uid)}" class="btn btn-icon btn-ghost" aria-label="Enviar moedas" aria-haspopup="dialog">${icon("gift")}${actionCaption("Moedas")}</button><button type="button" data-reset-password="${esc(p.uid)}" class="btn btn-icon btn-ghost" aria-label="Reset password" aria-haspopup="dialog">${icon("resetPassword")}${actionCaption("Reset password")}</button><button data-rebuild="${p.uid}" class="btn btn-icon btn-ghost" aria-label="Recalcular">${icon("refresh")}${actionCaption("Recalcular")}</button>${p.role !== "admin" ? `<button data-role="${p.uid}" data-target-role="${p.role === "dbs" ? "member" : "dbs"}" class="btn btn-icon ${p.role === "dbs" ? "btn-danger" : "btn-secondary"}" aria-label="${p.role === "dbs" ? "Remover DBS" : "Dar DBS"}">${icon("games")}${actionCaption(p.role === "dbs" ? "Tirar DBS" : "Dar DBS")}</button>` : ""}<button data-role="${p.uid}" class="btn btn-icon ${p.role === "admin" ? "btn-danger" : "btn-admin-access"}" aria-label="${p.role === "admin" ? "Remover admin" : "Promover admin"}" ${p.uid === ctx.user.uid ? "disabled" : ""}>${icon("shield")}${actionCaption(p.role === "admin" ? "Tirar admin" : "Dar admin")}</button></div></td></tr>`).join("")}</tbody></table></div>${!players.length ? empty("Sem jogadores", "As contas criadas aparecem aqui.") : ""}</section>`,
    games: `<section><h2>Jogos</h2>${games.length ? `<div class="game-list">${games.map((g) => `<div class="game-row admin-game-row"><div><b>${esc(g.title)}</b><small>${gameStatusLabel(g.status)}</small></div><div class="admin-game-actions">${g.status === "closed" ? `<button type="button" data-game-ratings="${esc(g.id)}" class="btn btn-secondary" aria-haspopup="dialog">${icon("ratingGames")}Avaliações</button>` : ""}${linkButton(`#/game/${g.id}`, "Editar", "ghost", "edit")}<button data-delete="${g.id}" class="btn btn-danger">${icon("trash")}Eliminar</button></div></div>`).join("")}</div>` : empty("Sem jogos", "Cria a primeira Peladinha.", linkButton("#/game/new", "Criar jogo"), "games")}</section>`,
    messages: `<div id="admin-message-workspace"></div>`,
    events: `<div id="event-admin"></div>`,
    maintenance: `<div id="maintenance-workspace"></div>`,
  };
  if (!Object.hasOwn(pages, section)) section = "overview";
  const area = ADMIN_AREAS.find((a) => a.id === section);
  ctx.render(
    `${pageHead("Administração", section === "overview" ? "A tua liga, organizada." : area.label, section === "overview" ? "Escolhe uma área para gerir a liga." : area.description, section === "games" ? linkButton("#/game/new", "Criar jogo", "primary", "plus") : "")}${pages[section]}`,
  );
  if (section === "overview") {
    const cycle = cardWeek();
    document.querySelector("#admin-week-status").innerHTML =
      `<div class="overview-line"><b>Cartas · ${cycle.weekId}</b><span class="pill ${cycle.phase === "open" ? "success" : "warning"}">${cycle.phase === "open" ? "Em evolução" : "Fechadas"}</span></div>`;
    DB.tickets(ctx.user)
      .then((rows) => {
        const counter = document.querySelector("#admin-open-tickets");
        if (counter)
          counter.textContent = rows.filter((t) => t.status === "open").length;
      })
      .catch(() => {
        const counter = document.querySelector("#admin-open-tickets");
        if (counter) counter.textContent = "—";
      });
  }
  document.querySelectorAll("[data-game-ratings]").forEach(button => {button.onclick = () => openGameRatings(button.dataset.gameRatings);});
  if (section === "maintenance") await mountMaintenance(ctx, document.querySelector("#maintenance-workspace"));
  const ovrForm = document.querySelector("#ovr-settings");
  if (section === "events")
    await mountEventAdmin(ctx, document.querySelector("#event-admin"));
  if (ovrForm) {
    let positions = structuredClone(ctx.league.ovrWeights.positions);
    const selector = ovrForm.querySelector("#ovr-position");
    let activePosition = selector.value;
    const readWeights = () => {
      positions[activePosition] = Object.fromEntries(
        ATTRIBUTES.map(([key]) => [key, ovrForm.elements[key].valueAsNumber]),
      );
      return { positions };
    };
    selector.onchange = () => {
      readWeights();
      activePosition = selector.value;
      ATTRIBUTES.forEach(([key]) => {
        ovrForm.elements[key].value = positions[activePosition][key];
      });
      updateWeights();
    };
    const updateWeights = () => {
      const settings = readWeights();
      const total =
        ATTRIBUTES.reduce(
          (sum, [key]) =>
            sum + Math.round(settings.positions[activePosition][key] * 100),
          0,
        ) / 100;
      const valid = validOvrWeights(settings);
      const invalidPositions = OVR_POSITIONS.filter(
        (p) => !validOvrWeights({ weights: settings.positions[p] }),
      );
      document.querySelector("#ovr-total").textContent =
        `Total: ${Number.isFinite(total) ? total.toLocaleString("pt-PT", { maximumFractionDigits: 2 }) : "—"}%${valid ? "" : ` · Ajusta para 100%: ${invalidPositions.join(", ")}.`}`;
      ovrForm.querySelector("button").disabled = !valid;
    };
    ovrForm.oninput = updateWeights;
    updateWeights();
    const stored = await DB.list("ovrPresets");
    const presets = stored.length
      ? stored
      : defaultOvrPresets(ctx.league.ovrWeights);
    if (!stored.length) await DB.callAdmin("initializeOvrPresets", {});
    const presetRoot = document.querySelector("#ovr-presets");
    presetRoot.innerHTML = `<div class="preset-toolbar"><label>Predefinição<select id="ovr-preset">${presets.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</select></label><button type="button" id="load-ovr-preset" class="btn btn-secondary">Carregar</button><label>Nome<input id="ovr-preset-name" maxlength="40" placeholder="A minha predefinição"></label><button type="button" id="save-ovr-preset" class="btn btn-secondary">Guardar predefinição</button></div>`;
    document.querySelector("#load-ovr-preset").onclick = () => {
      const preset = presets.find(
        (p) => p.id === document.querySelector("#ovr-preset").value,
      );
      if (!preset) return;
      positions = structuredClone(preset.settings.positions);
      ATTRIBUTES.forEach(
        ([key]) =>
          (ovrForm.elements[key].value = positions[activePosition][key]),
      );
      updateWeights();
      toast("Predefinição carregada. Guarda os pesos para aplicar.");
    };
    document.querySelector("#save-ovr-preset").onclick = async (event) => {
      const name = document.querySelector("#ovr-preset-name").value.trim(),
        settings = readWeights();
      if (!name || !validOvrWeights(settings))
        return toast("Indica um nome e pesos que somem 100%.", "error");
      try {
        const result = await busy(event.currentTarget, () =>
          DB.callAdmin("saveOvrPreset", { name, settings }),
        );
        const item = { id: result.data.id, name, settings };
        presets.push(item);
        document.querySelector("#ovr-preset").add(new Option(name, item.id));
        toast("Predefinição guardada.");
      } catch (error) {
        toast(error.message, "error");
      }
    };
    ovrForm.onsubmit = async (event) => {
      event.preventDefault();
      if (!validOvrWeights(readWeights())) return;
      try {
        await busy(event.submitter, () =>
          DB.callAdmin("saveOvrWeights", readWeights()),
        );
        toast("Pesos guardados. Cartas em evolução recalculadas.");
        ctx.go(section === "overview" ? "#/admin" : `#/admin/${section}`);
      } catch {}
    };
  }
  document.querySelectorAll("[data-casino-grant]").forEach(button => {
    button.onclick = () => openCasinoGrant(players.find(player => player.uid === button.dataset.casinoGrant), ctx.user.uid);
  });
  document.querySelectorAll("[data-reset-password]").forEach(button => {
    button.onclick = () => openPasswordRecovery(players.find(player => player.uid === button.dataset.resetPassword));
  });
  document.querySelectorAll("[data-role]").forEach(
    (b) =>
      (b.onclick = async () => {
        const p = players.find((p) => p.uid === b.dataset.role);
        const targetRole =
          b.dataset.targetRole || (p.role === "admin" ? "member" : "admin");
        if (
          !(await confirmDialog(
            `Alterar a role de ${p.displayName || p.username} para ${targetRole === "dbs" ? "DBS" : targetRole}?`,
          ))
        )
          return;
        try {
          await busy(b, () =>
            DB.saveProfile(p.uid, {
              role: targetRole,
            }),
          );
          toast("Perfil de acesso atualizado.");
          await ctx.refresh();
          ctx.go(section === "overview" ? "#/admin" : `#/admin/${section}`);
        } catch {}
      }),
  );
  document.querySelectorAll("[data-delete]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (
          !(await confirmDialog(
            "Eliminar este jogo, avaliações e agregados? Esta acção é irreversível.",
          ))
        )
          return;
        try {
          await busy(b, () =>
            DB.callAdmin("deleteGame", { gameId: b.dataset.delete }),
          );
          toast("Jogo eliminado.");
          await ctx.refresh();
          ctx.go(section === "overview" ? "#/admin" : `#/admin/${section}`);
        } catch {}
      }),
  );
  document.querySelectorAll("[data-rebuild]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await busy(b, () =>
            DB.callAdmin("rebuildHistory", { uid: b.dataset.rebuild }),
          );
          toast("Carta e histórico recalculados.");
          await ctx.refresh();
        } catch {}
      }),
  );
  const rebuildButton = document.querySelector("#rebuild-league");
  if (rebuildButton)
    rebuildButton.onclick = async (e) => {
      try {
        await busy(e.currentTarget, () => DB.callAdmin("rebuildLeague", {}));
        toast("Liga recalculada.");
        await ctx.refresh();
        ctx.go(section === "overview" ? "#/admin" : `#/admin/${section}`);
      } catch {}
    };
  if (section === "messages") mountAdminMessages(ctx, document.querySelector("#admin-message-workspace"));
}
export async function adminEdit(ctx, uid) {
  const p = ctx.league.users.find((p) => p.uid === uid);
  if (!p) return ctx.render(empty("Jogador não encontrado"));
  await editProfile(ctx, p);
}
export async function rawRatings(ctx, uid) {
  const [community, ...feedback] = await Promise.all([
    DB.callAdmin("listCommunityRatingsForAdmin", {}).then(result => result.data.rows),
    ...ctx.league.games.map((g) => DB.list(`games/${g.id}/feedback`)),
  ]);
  const rows = [
    ...community.map((r) => ({ ...r, kind: "Comunidade" })),
    ...feedback.flat().map((r) => ({ ...r, kind: "Pós-jogo" })),
  ].filter((r) => !uid || r.targetId === uid);
  ctx.render(
    `${pageHead("Administração", "Avaliações", "Pesquisa e compara votos. Identidades visíveis apenas a administradores.", linkButton("#/admin", "Administração", "ghost"))}<section class="panel ratings-browser"><div class="ratings-toolbar"><label>Pesquisar<input id="raw-search" placeholder="Jogador, avaliador ou jogo"></label><label>Ordenar por<select id="raw-sort"><option value="recent">Mais recentes</option><option value="mean-asc">Menor avaliação</option></select></label><label>Origem<select id="raw-kind"><option value="">Todas</option><option>Comunidade</option><option>Pós-jogo</option></select></label><label>Estado<select id="raw-status"><option value="">Todos</option><option value="sent">Enviadas</option><option value="draft">Rascunhos</option><option value="null">Nulas</option></select></label></div><div id="raw-list"></div><div class="ratings-pagination"><button id="raw-prev" type="button" class="btn btn-secondary">${icon("arrow")}Anterior</button><span id="raw-count" aria-live="polite"></span><button id="raw-next" type="button" class="btn btn-secondary">Seguinte${icon("arrow")}</button></div></section>`,
  );
  const name = (id) =>
    ctx.league.users.find((p) => p.uid === id)?.username || id;
  const ratingTimestamp = (rating) => {
    const value = rating.updatedAt ?? rating.submittedAt ?? rating.createdAt;
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : value instanceof Date
          ? value
          : null;
    const timestamp =
      date
        ? date.getTime()
        : typeof value === "number"
          ? value
          : Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
  };
  let page = 0;
  const draw = () => {
    const q = document.querySelector("#raw-search").value.toLowerCase(),
      kind = document.querySelector("#raw-kind").value,
      status = document.querySelector("#raw-status").value,
      sort = document.querySelector("#raw-sort").value;
    const filtered = rows.filter(
      (r) =>
        (!kind || r.kind === kind) &&
        (!status || (status === "null" ? r.kind === "Comunidade" && isNullCommunityRating(r) : r.submitted === (status === "sent") && !(r.kind === "Comunidade" && isNullCommunityRating(r)))) &&
        JSON.stringify([r.gameId, name(r.raterId), name(r.targetId)])
          .toLowerCase()
          .includes(q),
    );
    const normalizedMean = (r) => {
      if (r.kind === "Pós-jogo") {
        const mean = matchComponentAverages(r.ratings).withoutGoalkeeping;
        return mean === null ? null : mean / 5;
      }
      const values = Object.values(r.ratings || r.ratings20 || {}).filter(Number.isFinite);
      return values.length
        ? values.reduce((s, v) => s + v, 0) / values.length / 20
        : null;
    };
    const byTime = (a, b) => {
      const aTimestamp = ratingTimestamp(a),
        bTimestamp = ratingTimestamp(b);
      return aTimestamp === bTimestamp ? 0 : aTimestamp > bTimestamp ? -1 : 1;
    };
    const byMean = (a, b) => {
      const aMean = normalizedMean(a),
        bMean = normalizedMean(b);
      if (aMean === null || bMean === null) return aMean === bMean ? 0 : aMean === null ? 1 : -1;
      return aMean - bMean;
    };
    filtered.sort((a, b) =>
      sort === "mean-asc" ? byMean(a, b) || byTime(a, b) : byTime(a, b),
    );
    page = Math.max(0, Math.min(page, Math.ceil(filtered.length / 20) - 1));
    const shown = filtered.slice(page * 20, page * 20 + 20);
    document.querySelector("#raw-list").innerHTML = shown.length
      ? `<div class="table-wrap"><table class="ratings-table"><thead><tr><th>Origem / Jogo</th><th>Avaliador</th><th>Jogador</th><th>Média</th><th>Estado</th><th>Ações</th></tr></thead><tbody>${shown
          .map((r) => {
            const values = Object.values(r.ratings || r.ratings20 || {}).filter(
                Number.isFinite,
              ),
              mean = r.kind === "Pós-jogo" ? matchAverageSummary(matchComponentAverages(r.ratings)) : values.length
                ? (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)
                : "—";
            const isNull = r.kind === "Comunidade" && isNullCommunityRating(r);
            return `<tr><td data-label="Origem / Jogo">${esc(r.kind)}<small>${esc(ctx.league.games.find((g) => g.id === r.gameId)?.title || "0–20")}</small></td><td data-label="Avaliador">@${esc(name(r.raterId))}</td><td data-label="Jogador">@${esc(name(r.targetId))}</td><td data-label="Média"><span class="rating-average">${mean}<small> / ${r.kind === "Pós-jogo" ? 5 : 20}</small></span></td><td data-label="Estado"><span class="pill ${isNull ? "warning" : r.submitted ? "success" : "warning"}">${isNull ? "Nula" : r.submitted ? "Enviada" : "Rascunho"}</span></td><td data-label="Ações"><div class="actions compact"><button type="button" class="btn btn-ghost" data-view="${rows.indexOf(r)}">${icon("plus")}Ver</button>${isNull ? ((r.reviewAttempts || 0) < 2 && !r.reviewGrantedAt ? `<button type="button" class="btn btn-secondary" data-grant-review="${rows.indexOf(r)}">${icon("refresh")}Dar mais uma tentativa</button>` : `<span class="muted">${r.reviewState === "required" ? "Tentativa autorizada" : "Tentativas esgotadas"}</span>`) : `<button type="button" class="btn btn-secondary" data-correct="${rows.indexOf(r)}" ${canEditRating(r) ? "" : 'disabled title="Prazo de edição de 7 dias terminado"'}>${icon("edit")}Corrigir</button>`}</div></td></tr>`;
          })
          .join("")}</tbody></table></div>`
      : empty("Sem avaliações", "Experimenta outros filtros.");
    document.querySelector("#raw-count").textContent =
      `${filtered.length ? page * 20 + 1 : 0}–${Math.min(filtered.length, page * 20 + 20)} de ${filtered.length}`;
    document.querySelector("#raw-prev").disabled = page === 0;
    document.querySelector("#raw-next").disabled =
      (page + 1) * 20 >= filtered.length;
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.onclick = () => {
        const r = rows[Number(button.dataset.view)],
          fields = r.kind === "Pós-jogo" ? FEEDBACK : ATTRIBUTES,
          values = r.ratings || r.ratings20;
        modal(
          "Detalhes da avaliação",
          `<p>@${esc(name(r.raterId))} → @${esc(name(r.targetId))}</p><div class="rating-detail-grid">${fields.map(([key, label]) => `<div><small>${esc(label)}</small><strong>${values[key] ?? "—"}<small> / ${r.kind === "Pós-jogo" ? 5 : 20}</small></strong></div>`).join("")}</div>`,
        );
      };
    });
    document.querySelectorAll("[data-grant-review]").forEach((button) => {
      button.onclick = async () => {
        const rating = rows[Number(button.dataset.grantReview)];
        try {
          await busy(button, () => DB.callAdmin("grantCommunityRatingRetry", { id: rating.id }));
          Object.assign(rating, { reviewState: "required", reviewGrantedAt: new Date() });
          await ctx.refresh();
          toast("Última tentativa autorizada. O jogador já pode rever a avaliação.");
          draw();
        } catch {}
      };
    });
    document.querySelectorAll("[data-correct]").forEach((button) => {
      button.onclick = () => {
        const rating = rows[Number(button.dataset.correct)],
          game = rating.kind === "Pós-jogo",
          values = game ? rating.ratings : rating.ratings20,
          fields = game ? FEEDBACK : ATTRIBUTES;
        const close = modal(
          "Corrigir avaliação",
          `<p>Uma correcção administrativa recalcula a carta. Os valores anteriores são guardados no registo de auditoria.</p><form id="correct-rating"><div class="correction-fields">${fields.map(([key, name]) => `<label>${esc(name)}<input name="${key}" type="number" min="0" max="${game ? 5 : 20}" value="${values[key] ?? ""}" ${rating.submitted && key !== "goalkeeping" ? "required" : ""}><small>${game && key === "goalkeeping" ? "Vazio = N/A" : ""}</small></label>`).join("")}</div><button class="btn btn-primary">Guardar correcção</button></form>`,
        );
        document.querySelector("#correct-rating").onsubmit = async (event) => {
          event.preventDefault();
          try {
            const ratings = {};
            for (const [key, value] of new FormData(event.target)) {
              if (value !== "") ratings[key] = Number(value);
              else if (game && key === "goalkeeping") ratings[key] = null;
            }
            await busy(event.submitter, () =>
              DB.callAdmin("correctRating", {
                kind: game ? "game" : "community",
                id: rating.id,
                gameId: rating.gameId || null,
                ratings,
              }),
            );
            toast("Avaliação corrigida.");
            close();
            ctx.go(location.hash);
          } catch {}
        };
      };
    });
  };
  const resetPage = () => {
    page = 0;
    draw();
  };
  document.querySelectorAll(".ratings-toolbar input").forEach((input) => {
    input.oninput = resetPage;
  });
  document.querySelectorAll(".ratings-toolbar select").forEach((select) => {
    select.onchange = resetPage;
  });
  document.querySelector("#raw-prev").onclick = () => {
    page--;
    draw();
  };
  document.querySelector("#raw-next").onclick = () => {
    page++;
    draw();
  };
  draw();
}
export { cardLab } from "./card-lab.js";
