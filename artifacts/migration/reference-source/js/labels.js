// Display labels only: persisted values and API identifiers stay unchanged.
export const DIFFICULTY_LABELS = Object.freeze({
  easy: "Fácil",
  medium: "Média",
  hard: "Difícil",
});
export const ROLE_LABELS = Object.freeze({
  admin: "Administrador",
  dbs: "DBS",
  member: "Membro",
});
export const GAME_STATUS_LABELS = Object.freeze({
  draft: "Rascunho",
  open: "Aberto",
  closed: "Finalizado",
  scheduled: "Agendado",
  cancelled: "Cancelado",
});
export const difficultyLabel = (value) => DIFFICULTY_LABELS[value] || "Média";
export const roleLabel = (value) => ROLE_LABELS[value] || "Membro";
export const gameStatusLabel = (value) =>
  GAME_STATUS_LABELS[value] || "Indisponível";
