import * as DB from "./db.js";
import { modal, esc } from "./ui.js";
import { icon } from "./icons.js";

export async function openGameRatings(gameId) {
  let open = true,
    sending = false,
    data,
    selected = new Set();
  let announcement = "";
  modal(
    "Avaliações do jogo",
    '<div class="game-rating-workspace" aria-live="polite"><p>A carregar avaliações…</p></div>',
    () => {
      open = false;
    },
  );
  const dialog = document.querySelector("#modal-root .modal");
  dialog.classList.add("game-rating-modal");
  const root = dialog.querySelector(".game-rating-workspace");
  const request = async (name, values) =>
    (await DB.callAdmin(name, { gameId, ...values })).data;
  function draw() {
    const pending = data.users.filter((user) => user.pending && !user.disabled);
    const complete = data.users.filter(
      (user) => !user.pending && !user.disabled,
    );
    const available = data.users.filter((user) => user.canRemind);
    selected = new Set(
      [...selected].filter((uid) => available.some((user) => user.uid === uid)),
    );
    root.innerHTML = `<div class="game-rating-heading"><div><p class="eyebrow">PÓS-JOGO</p><h3>${esc(data.title)}</h3></div><button type="button" class="btn btn-icon btn-secondary" data-refresh aria-label="Atualizar avaliações" ${sending ? "disabled" : ""}>${icon("refresh")}</button></div><div class="game-rating-summary"><span><b>${complete.length}</b> ${complete.length === 1 ? "concluiu" : "concluíram"}</span><span><b>${pending.length}</b> ${pending.length === 1 ? "pendente" : "pendentes"}</span>${data.users.some((user) => user.disabled) ? `<span><b>${data.users.filter((user) => user.disabled).length}</b> inativos</span>` : ""}</div><p class="muted small">Inclui a autoavaliação e as avaliações dos restantes participantes. Rascunhos não contam como enviados.</p><div class="game-rating-toolbar"><label class="game-rating-select"><input type="checkbox" data-select-all ${available.length && selected.size === available.length ? "checked" : ""} ${!available.length || sending ? "disabled" : ""}>Selecionar disponíveis</label><button type="button" class="btn btn-primary" data-send-selected ${!selected.size || sending ? "disabled" : ""}>${icon("bell")}Lembrar selecionados (${selected.size})</button></div><p class="game-rating-result" role="status">${esc(announcement)}</p><ul class="game-rating-list">${data.users.map((user) => `<li class="game-rating-row"><label class="game-rating-person"><input type="checkbox" data-select="${esc(user.uid)}" aria-label="Selecionar ${esc(user.name)}" ${selected.has(user.uid) ? "checked" : ""} ${!user.canRemind || sending ? "disabled" : ""}><span><strong>${esc(user.name)}</strong><small>${user.username ? `@${esc(user.username)} · ` : ""}Equipa ${user.team}</small><span class="game-rating-progress">${user.submitted} / ${user.total} enviadas${user.drafts ? ` · ${user.drafts} em rascunho` : ""}</span></span></label><div class="game-rating-state"><span class="pill ${user.disabled ? "" : !user.pending ? "success" : "warning"}">${user.disabled ? "Inativo" : !user.pending ? "Concluído" : user.submitted ? "Parcial" : "Por iniciar"}</span>${user.pending && user.blockedReason && !user.disabled ? `<small>${esc(user.blockedReason)}${user.nextReminderAt ? ` ${new Date(user.nextReminderAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" })}.` : ""}</small>` : ""}</div><button type="button" class="btn btn-icon btn-secondary" data-remind="${esc(user.uid)}" aria-label="Lembrar ${esc(user.name)}" title="${esc(user.blockedReason || "Enviar lembrete")}" ${!user.canRemind || sending ? "disabled" : ""}>${icon("bell")}</button></li>`).join("") || '<li class="muted">Este jogo não tem participantes.</li>'}</ul><p class="muted small">O lembrete aparece no sino. O push depende das notificações ativadas no dispositivo. Os limites e o intervalo são partilhados com os lembretes automáticos.</p>`;
    root.querySelector("[data-refresh]").onclick = () => load();
    root.querySelector("[data-select-all]").onchange = (event) => {
      selected = new Set(
        event.target.checked ? available.map((user) => user.uid) : [],
      );
      draw();
      root.querySelector("[data-select-all]").focus();
    };
    root.querySelectorAll("[data-select]").forEach((input) => {
      input.onchange = () => {
        const uid = input.dataset.select;
        input.checked ? selected.add(uid) : selected.delete(uid);
        draw();
        [...root.querySelectorAll("[data-select]")]
          .find((item) => item.dataset.select === uid)
          ?.focus();
      };
    });
    root.querySelector("[data-send-selected]").onclick = () =>
      send([...selected]);
    root.querySelectorAll("[data-remind]").forEach((button) => {
      button.onclick = () => send([button.dataset.remind]);
    });
  }
  async function load() {
    try {
      const value = await request("ratingSubmissionStatus", {});
      if (!open) return;
      data = value;
      draw();
    } catch (error) {
      if (!open) return;
      root.innerHTML = `<p role="alert">${esc(error.message)}</p><button type="button" class="btn btn-secondary" data-retry>Tentar novamente</button>`;
      root.querySelector("[data-retry]").onclick = load;
    }
  }
  async function send(uids) {
    if (sending || !uids.length) return;
    sending = true;
    announcement = "A enviar lembretes…";
    draw();
    try {
      const outcome = await request("sendRatingReminders", {
        uids,
        requestId: crypto.randomUUID(),
      });
      const skipped = outcome.results.length - outcome.sent;
      announcement = `${outcome.sent} ${outcome.sent === 1 ? "lembrete enviado" : "lembretes enviados"}.${skipped ? ` ${skipped} não enviados; consulta o estado atualizado.` : ""}`;
      selected.clear();
    } catch (error) {
      announcement = error.message;
    } finally {
      sending = false;
      if (open) {
        await load();
        root.querySelector("[data-refresh]")?.focus();
      }
    }
  }
  await load();
}
