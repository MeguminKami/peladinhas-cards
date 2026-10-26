import { ATTRIBUTES, completeInitial } from "../js/utils.js";

// Server-only: public messages must not disclose the moderation threshold.
const MINIMUM_MEAN = 1.9;
export function eligibleCommunityRating(row) {
  return row?.submitted === true && completeInitial(row.ratings20) &&
    ATTRIBUTES.reduce((sum, [key]) => sum + row.ratings20[key], 0) + 1e-9 >= MINIMUM_MEAN * ATTRIBUTES.length;
}
export function communityReviewNotice(name, state = "required") {
  if (state === "accepted") return {type:"COMMUNITY_RATING_ACCEPTED",title:"Avaliação revista",body:`A tua revisão da avaliação de ${name} foi recebida e está a ser considerada.`};
  if (state === "ignored") return {type:"COMMUNITY_RATING_CLOSED",title:"Avaliação encerrada",body:`A revisão da tua avaliação de ${name} foi recebida. Esta avaliação não está a ser considerada e já não pode ser alterada.`};
  return {type:"COMMUNITY_RATING_REVIEW",title:"Revê a tua avaliação",body:`A tua avaliação de ${name} precisa de revisão e não está a ser considerada. Revê os atributos para refletirem melhor aquilo que observaste em campo. Tens mais uma oportunidade para a submeter.`};
}
