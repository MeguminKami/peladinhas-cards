import { icon } from "./icons.js";

export function cardSelectionEntry(player, { profile = false } = {}) {
  if (!player?.hasCard || !player.specials?.length) return "";
  const content = `<span class="card-selection-symbol" aria-hidden="true"><span></span><span></span><span>${icon("profile")}</span></span><strong>Escolher carta</strong><span class="card-selection-arrow" aria-hidden="true">${icon("arrow")}</span>`;
  const action = profile
    ? `<button type="button" id="choose-weekly-card" class="card-selection-button" aria-haspopup="dialog">${content}</button>`
    : `<a href="#/profile/cards" class="card-selection-button">${content}</a>`;
  return `<div class="card-selection-entry">${action}</div>`;
}
