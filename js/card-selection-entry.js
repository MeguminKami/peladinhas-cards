import { icon } from "./icons.js";
import { card, bindImages } from "./cards.js";
import { CARD_POLICY, durationName, validCardSelection } from "./card-achievements.js";
import { cardWeek } from "./card-week.js";
import { esc, modal, busy, toast } from "./ui.js";
import { formatDate } from "./utils.js";
import * as DB from "./db.js";

export function cardSelectionEntry(player, { profile = false, inline = false } = {}) {
  if (!player?.hasCard || !player.specials?.length) return "";
  if (inline) return `<button type="button" id="choose-weekly-card" class="dashboard-card-action" aria-haspopup="dialog"><span>Muda já a aparência da tua carta</span>${icon("arrow")}</button>`;
  const content = `<span class="card-selection-symbol" aria-hidden="true"><span></span><span></span><span>${icon("profile")}</span></span><strong>Escolher carta</strong><span class="card-selection-arrow" aria-hidden="true">${icon("arrow")}</span>`;
  const action = profile
    ? `<button type="button" id="choose-weekly-card" class="card-selection-button" aria-haspopup="dialog">${content}</button>`
    : `<a href="#/profile/cards" class="card-selection-button">${content}</a>`;
  return `<div class="card-selection-entry">${action}</div>`;
}

export function openCardSelection(ctx, player, { proof = "" } = {}) {
  const choices = [{ id: "base", name: "Carta normal" }, ...new Map((player.specials || []).map(choice => [choice.id, choice])).values()];
  let selected = validCardSelection(player.selectedCardId, player.specials);
  let saving = false;
  const close = modal("A tua carta", `<div class="card-picker-actions"><button type="button" class="btn card-picker-save" id="save-card">${icon("check")}Guardar</button><button type="button" class="btn card-picker-cancel" id="cancel-card">${icon("close")}Cancelar</button></div><div class="card-picker-gallery"><div class="weekly-card-choices">${choices.map(choice => `<button type="button" class="weekly-card-choice" data-select-card="${esc(choice.id)}" aria-pressed="${choice.id === selected}" aria-label="Escolher ${esc(choice.name)}"><span class="card-picker-mark" aria-hidden="true">${icon("check")}</span>${card(player, { size: "sm", preview: true, theme: choice.id === "base" ? player.cardType : choice.id })}<strong>${esc(choice.name)}</strong><small>${choice.id === "base" ? "Sempre disponível" : `${durationName(choice.duration || CARD_POLICY[choice.themeId || choice.id]?.duration)}${choice.expiresAt ? ` · Até ${formatDate(choice.expiresAt)}` : ""}`}</small></button>`).join("")}</div>${proof}</div>`);
  const root = document.querySelector("#modal-root");
  root.querySelector(".modal").classList.add("card-picker");
  bindImages(root);
  const buttons = [...root.querySelectorAll("[data-select-card]")];
  buttons.forEach(button => {
    button.onclick = () => {
      selected = button.dataset.selectCard;
      buttons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    };
  });
  root.querySelector("#cancel-card").onclick = close;
  const keydown = root.onkeydown;
  root.onkeydown = event => {
    if (saving && event.key === "Escape") { event.preventDefault(); return; }
    keydown(event);
  };
  root.querySelector(".backdrop").onclick = event => {
    if (!saving && event.target === event.currentTarget) close();
  };
  const save = root.querySelector("#save-card");
  save.onclick = async () => {
    if (saving) return;
    if (selected === validCardSelection(player.selectedCardId, player.specials)) { close(); return; }
    saving = true;
    const controls = [...root.querySelectorAll("button")];
    controls.forEach(button => { button.disabled = true; });
    try {
      await busy(save, () => DB.callAdmin("selectWeeklyCard", { weekId: cardWeek().weekId, cardId: selected }));
      close();
      toast("Carta guardada.");
      await ctx.refresh();
      ctx.go(location.hash === "#/profile/cards" ? "#/profile" : location.hash || "#/");
    } catch {
      // busy presents the server error; keep the selection available for retry.
    } finally {
      saving = false;
      controls.forEach(button => { button.disabled = false; });
    }
  };
  save.focus();
}
