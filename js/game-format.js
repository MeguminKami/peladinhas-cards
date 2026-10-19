export const DEFAULT_TEAM_SIZE = 5;
export const MAX_TEAM_SIZE = 12;

export const validTeamSize = (value) =>
  Number.isInteger(value) && value >= DEFAULT_TEAM_SIZE && value <= MAX_TEAM_SIZE;

// Missing format on historical games means the original 5-a-side format.
export const gameTeamSize = (game) =>
  validTeamSize(game?.teamSize) ? game.teamSize : DEFAULT_TEAM_SIZE;

export function splitTeam(ids, teamSize = DEFAULT_TEAM_SIZE) {
  if (!validTeamSize(teamSize)) throw Error("Escolhe entre 5 e 12 titulares por equipa.");
  return { starters: ids.slice(0, teamSize), bench: ids.slice(teamSize) };
}
