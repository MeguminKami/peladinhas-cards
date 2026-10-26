import { esc } from "./ui.js";
import { icon } from "./icons.js";

export function communityReviewMessage(name, state) {
  if (state === "ignored")
    return `A revisão da tua avaliação de ${name} foi recebida. Esta avaliação não está a ser considerada e já não pode ser alterada.`;
  if (state === "accepted")
    return `A tua revisão da avaliação de ${name} foi recebida e está a ser considerada. A submissão é definitiva.`;
  return `A tua avaliação de ${name} precisa de revisão e não está a ser considerada. Revê os atributos para refletirem melhor aquilo que observaste em campo. Tens mais uma oportunidade para a submeter.`;
}
export function communityReviewBanner(name, rating, href) {
  if (!rating?.reviewState) return "";
  const pending = rating.reviewState === "required";
  return `<aside class="community-review-notice ${pending ? "is-pending" : ""}"><span class="community-review-symbol">${icon(pending ? "edit" : "info")}</span><div><p class="eyebrow">${pending ? "AVALIAÇÃO POR REVER" : "REVISÃO CONCLUÍDA"}</p><p>${esc(communityReviewMessage(name, rating.reviewState))}</p></div>${pending && href ? `<a class="btn btn-secondary" href="${esc(href)}">Rever avaliação ${icon("arrow")}</a>` : ""}</aside>`;
}
