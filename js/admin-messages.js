import * as DB from "./db.js";
import { esc, busy, linkButton } from "./ui.js";
import { icon } from "./icons.js";
import { participants, formatDateTime } from "./utils.js";

export function mountAdminMessages(ctx, root) {
  const users = (ctx.league.users || ctx.league.players).filter(u => !u.disabled)
    .sort((a, b) => (a.displayName || a.username || a.uid).localeCompare(b.displayName || b.username || b.uid, "pt"));
  const games = ctx.league.games.filter(g => !g.deleting);
  const selected = new Set();
  const name = u => u.displayName || u.username || u.uid;
  root.innerHTML = `<section class="panel admin-message-panel"><div class="section-head"><div><h2>Uma mensagem, as pessoas certas.</h2><p class="muted">Escolhe quem recebe e escreve a mensagem.</p></div>${icon("bell")}</div><form id="admin-message" class="content-stack"><fieldset class="message-audience"><legend>Destinatários</legend><div class="message-audience-options">${[["game", "games", "Jogadores de um jogo"], ["selected", "players", "Escolher jogadores"], ["all", "bell", "Todos os jogadores"]].map(([value, symbol, label]) => `<label><input type="radio" name="audience" value="${value}" ${value === "game" ? "checked" : ""}>${icon(symbol)}<span>${label}</span></label>`).join("")}</div></fieldset><div data-game-picker><label>Jogo<select name="gameId"><option value="">Escolhe um jogo</option>${games.map(g => `<option value="${esc(g.id)}">${esc(g.title || "Jogo")} · ${esc(formatDateTime(g.scheduledAt))}</option>`).join("")}</select></label>${!games.length ? '<p class="muted">Ainda não há jogos. Podes escolher jogadores ou enviar a todos.</p>' : ""}</div><div data-player-picker hidden><label>Procurar jogador<input type="search" data-player-search placeholder="Nome ou username"></label><div class="message-player-list">${users.map(u => `<label data-message-player><input type="checkbox" value="${esc(u.uid)}"><span><strong>${esc(name(u))}</strong>${u.username ? `<small>@${esc(u.username)}</small>` : ""}</span></label>`).join("")}</div><p data-search-empty class="muted" hidden>Nenhum jogador encontrado.</p></div><div class="message-recipient-summary" role="status" aria-live="polite"><strong data-recipient-count></strong><p data-recipient-names></p></div><label>Título<input name="title" maxlength="80" required></label><label>Mensagem<textarea name="body" maxlength="500" rows="5" required></textarea></label><p class="muted small">A mensagem aparece no sino dos destinatários. O alerta no telemóvel depende das notificações ativadas no dispositivo.</p><p data-message-status role="status" aria-live="polite"></p><button class="btn btn-primary" type="submit">${icon("bell")}Enviar mensagem</button></form><footer class="admin-device-settings"><div>${icon("bell")}<span>Notificações neste dispositivo</span></div>${linkButton("#/notifications", "Configurar", "secondary", "arrow")}</footer></section>`;
  const form = root.querySelector("form");
  const field = key => form.elements.namedItem(key);
  const status = root.querySelector("[data-message-status]");
  const recipients = () => {
    const mode = field("audience").value;
    const ids = mode === "game" ? new Set(participants(games.find(g => g.id === field("gameId").value) || {})) : selected;
    return users.filter(u => mode === "all" || ids.has(u.uid));
  };
  const update = () => {
    const mode = field("audience").value;
    root.querySelector("[data-game-picker]").hidden = mode !== "game";
    root.querySelector("[data-player-picker]").hidden = mode !== "selected";
    field("gameId").required = mode === "game";
    field("gameId").disabled = mode !== "game";
    const rows = recipients();
    root.querySelector("[data-recipient-count]").textContent = `${rows.length} ${rows.length === 1 ? "destinatário" : "destinatários"}`;
    root.querySelector("[data-recipient-names]").textContent = rows.length ? rows.map(name).join(" · ") : "Escolhe os jogadores que vão receber a mensagem.";
    form.querySelector('[type="submit"]').disabled = !rows.length;
    status.textContent = "";
  };
  form.addEventListener("change", e => {
    if (e.target.matches('[type="checkbox"]')) {
      if (e.target.checked) selected.add(e.target.value); else selected.delete(e.target.value);
    }
    update();
  });
  root.querySelector("[data-player-search]").oninput = e => {
    const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const query = normalize(e.target.value.trim());
    let visible = 0;
    root.querySelectorAll("[data-message-player]").forEach(row => {
      row.hidden = !normalize(row.textContent).includes(query);
      if (!row.hidden) visible++;
    });
    root.querySelector("[data-search-empty]").hidden = !!visible;
  };
  form.onsubmit = async e => {
    e.preventDefault();
    if (!recipients().length || !form.reportValidity()) return;
    const audience = field("audience").value;
    const payload = { title: field("title").value.trim(), body: field("body").value.trim(), audience,
      ...(audience === "game" ? { gameId: field("gameId").value } : {}),
      ...(audience === "selected" ? { recipientIds: [...selected] } : {}) };
    const controls = [...form.querySelectorAll("input, textarea, select")];
    const disabled = controls.map(control => control.disabled);
    controls.forEach(control => control.disabled = true);
    status.textContent = "A enviar mensagem…";
    try {
      const response = await busy(e.submitter, () => DB.callAdmin("adminMessage", payload));
      field("title").value = "";
      field("body").value = "";
      status.textContent = `Mensagem enviada a ${response.data.sent} ${response.data.sent === 1 ? "jogador" : "jogadores"}.`;
    } catch (error) {
      status.textContent = error.message || "Não foi possível enviar. Tenta novamente.";
    } finally {
      controls.forEach((control, index) => control.disabled = disabled[index]);
    }
  };
  update();
}
