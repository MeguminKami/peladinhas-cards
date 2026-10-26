import * as DB from "./db.js";
import { modal, esc } from "./ui.js";
import { icon } from "./icons.js";

export async function openGameRatings(gameId) {
  let open = true,
    sending = false,
    data,
    selected = new Set();
  let announcement = "", waiverCandidate = null;
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
    const hadFocus = root.contains(document.activeElement);
    const pending = data.users.filter((user) => user.pending && !user.disabled);
    const complete = data.users.filter(
      (user) => !user.pending && !user.waiverActive && !user.disabled,
    );
    const available = data.users.filter((user) => user.canRemind);
    selected = new Set(
      [...selected].filter((uid) => available.some((user) => user.uid === uid)),
    );
    root.innerHTML = `<div class="game-rating-heading"><div><p class="eyebrow">PÓS-JOGO</p><h3>${esc(data.title)}</h3></div><button type="button" class="btn btn-icon btn-secondary" data-refresh aria-label="Atualizar avaliações" ${sending ? "disabled" : ""}>${icon("refresh")}</button></div><div class="game-rating-summary"><span><b>${complete.length}</b> ${complete.length === 1 ? "concluiu" : "concluíram"}</span><span><b>${pending.length}</b> ${pending.length === 1 ? "pendente" : "pendentes"}</span>${data.users.some(user=>user.waiverActive) ? `<span><b>${data.users.filter(user=>user.waiverActive).length}</b> com votos anulados</span>` : ""}${data.users.some((user) => user.disabled) ? `<span><b>${data.users.filter((user) => user.disabled).length}</b> inativos</span>` : ""}</div><p class="muted small">Inclui a autoavaliação e as avaliações dos restantes participantes. Rascunhos não contam como enviados.</p><div class="game-rating-toolbar"><label class="game-rating-select"><input type="checkbox" data-select-all ${available.length && selected.size === available.length ? "checked" : ""} ${!available.length || sending ? "disabled" : ""}>Selecionar disponíveis</label><button type="button" class="btn btn-primary" data-send-selected ${!selected.size || sending ? "disabled" : ""}>${icon("bell")}Lembrar selecionados (${selected.size})</button></div><p class="game-rating-result" role="status">${esc(announcement)}</p><ul class="game-rating-list">${data.users.map((user) => `<li class="game-rating-row"><label class="game-rating-person"><input type="checkbox" data-select="${esc(user.uid)}" aria-label="Selecionar ${esc(user.name)}" ${selected.has(user.uid) ? "checked" : ""} ${!user.canRemind || sending ? "disabled" : ""}><span><strong>${esc(user.name)}</strong><small>${user.username ? `@${esc(user.username)} · ` : ""}Equipa ${user.team}</small><span class="game-rating-progress">${user.submitted} / ${user.total} enviadas${user.waived ? ` · ${user.waived} anuladas` : ""}${user.drafts ? ` · ${user.drafts} em rascunho` : ""}</span></span></label><div class="game-rating-state"><span class="pill ${user.disabled ? "" : !user.pending ? "success" : "warning"}">${user.waiverActive ? "Votos em falta anulados" : user.disabled ? "Inativo" : !user.pending ? "Concluído" : user.submitted ? "Parcial" : "Por iniciar"}</span>${user.pending && user.blockedReason && !user.disabled ? `<small>${esc(user.blockedReason)}${user.nextReminderAt ? ` ${new Date(user.nextReminderAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" })}.` : ""}</small>` : ""}</div><div class="game-rating-actions"><button type="button" class="btn btn-icon btn-secondary" data-remind="${esc(user.uid)}" aria-label="Lembrar ${esc(user.name)}" title="${esc(user.blockedReason || "Enviar lembrete")}" ${!user.canRemind || sending ? "disabled" : ""}>${icon("bell")}</button>${user.canWaive ? `<button type="button" class="btn btn-icon btn-secondary" data-waive="${esc(user.uid)}" aria-label="${user.waiverActive ? "Repor votos" : "Anular votos em falta"}: ${esc(user.name)}" title="${user.waiverActive ? "Repor votos em falta" : "Anular votos em falta"}" ${sending ? "disabled" : ""}>${icon(user.waiverActive ? "refresh" : "ban")}</button>` : ""}</div></li>`).join("") || '<li class="muted">Este jogo não tem participantes.</li>'}</ul><p class="muted small">O lembrete aparece no sino. O push depende das notificações ativadas no dispositivo. Os limites e o intervalo são partilhados com os lembretes automáticos.</p>`;
    if (hadFocus) {
      const heading = root.querySelector("h3");
      heading.tabIndex = -1;
      heading.focus({preventScroll:true});
    }
    if (waiverCandidate) {
      const person = data.users.find(user=>user.uid === waiverCandidate);
      root.querySelector(".game-rating-list").insertAdjacentHTML("beforebegin", `<section class="game-rating-waiver" role="region" aria-label="Confirmar alteração dos votos"><h4>${esc(person.name)}</h4><p>${person.waiverActive ? "Repor a obrigação de enviar as avaliações em falta?" : "Os votos em falta passam a contar apenas para o mínimo exigido. Não entram nas médias e as avaliações já enviadas mantêm-se."}</p><p>Os cálculos atualizam na próximo ciclo (08:00, 12:00, 17:00 ou 22:00). A alteração fica registada.</p><div class="actions"><button class="btn btn-primary" data-confirm-waiver ${sending ? "disabled" : ""}>${person.waiverActive ? "Repor votos" : "Anular votos em falta"}</button><button class="btn btn-secondary" data-cancel-waiver ${sending ? "disabled" : ""}>Cancelar</button></div></section>`);
      root.querySelector("[data-cancel-waiver]").onclick = () => {waiverCandidate=null;draw();};
      root.querySelector("[data-confirm-waiver]").onclick = async () => {
        if(sending) return;
        sending=true; draw();
        try {
          await request("ratingWaiverAction",{uid:person.uid,waive:!person.waiverActive});
          announcement=person.waiverActive ? "Votos em falta repostos." : "Votos em falta anulados. Sem alteração das médias; cálculos na próximo ciclo de atualização.";
          waiverCandidate=null;
        } catch(error) {announcement=error.message;}
        finally {sending=false;if(open) await load();}
      };
    }
    root.querySelectorAll("[data-waive]").forEach(button=>button.onclick=()=>{waiverCandidate=button.dataset.waive;draw();root.querySelector("[data-confirm-waiver]").focus();});
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
    const hadFocus = root.contains(document.activeElement);
    try {
      const value = await request("ratingSubmissionStatus", {});
      if (!open) return;
      data = value;
      draw();
      if (hadFocus) root.querySelector("[data-refresh]")?.focus({preventScroll:true});
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
