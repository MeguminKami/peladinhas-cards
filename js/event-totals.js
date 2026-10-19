// Historical counters use recorded matches/positions, never today's profile or client totals.
export const TOTAL_OBJECTIVES = Object.freeze({
  totalGames: {metric:"games", label:"Total de jogos jogados", one:"jogo jogado", many:"jogos jogados"},
  totalWins: {metric:"wins", label:"Total de vitórias", one:"vitória", many:"vitórias"},
  totalDraws: {metric:"draws", label:"Total de empates", one:"empate", many:"empates"},
  totalLosses: {metric:"losses", label:"Total de derrotas", one:"derrota", many:"derrotas"},
  totalGoals: {metric:"goals", label:"Total de golos", one:"golo", many:"golos"},
  totalAssists: {metric:"assists", label:"Total de assistências", one:"assistência", many:"assistências"},
  totalContributions: {metric:"goalsAndAssists", label:"Total de golos e assistências", one:"golo ou assistência", many:"golos e assistências"},
  totalCleanSheets: {metric:"cleanSheets", label:"Total de jogos sem sofrer golos", one:"jogo sem sofrer golos", many:"jogos sem sofrer golos"},
  totalUnbeatenGames: {metric:"nonLosses", label:"Total de jogos sem perder", one:"jogo sem perder", many:"jogos sem perder"},
  totalTeamGoals: {metric:"goalsFor", label:"Total de golos da equipa nos teus jogos", one:"golo da equipa nos teus jogos", many:"golos da equipa nos teus jogos"},
  totalGoalsConceded: {metric:"goalsAgainst", label:"Total de golos sofridos pela equipa", one:"golo sofrido pela equipa", many:"golos sofridos pela equipa"},
  totalScoringGames: {metric:"scoringGames", label:"Total de jogos a marcar", one:"jogo a marcar", many:"jogos a marcar"},
  totalAssistingGames: {metric:"assistingGames", label:"Total de jogos a assistir", one:"jogo a assistir", many:"jogos a assistir"},
  totalContributingGames: {metric:"contributingGames", label:"Total de jogos com golo ou assistência", one:"jogo com golo ou assistência", many:"jogos com golo ou assistência"},
  totalGoalkeeperGames: {metric:"games", position:"GR", label:"Total de jogos como guarda-redes", one:"jogo como guarda-redes", many:"jogos como guarda-redes"},
  totalGoalkeeperWins: {metric:"wins", position:"GR", label:"Total de vitórias como guarda-redes", one:"vitória como guarda-redes", many:"vitórias como guarda-redes"},
  totalGoalkeeperCleanSheets: {metric:"cleanSheets", position:"GR", label:"Total de jogos sem sofrer golos como guarda-redes", one:"jogo sem sofrer golos como guarda-redes", many:"jogos sem sofrer golos como guarda-redes"},
  totalDefenderGames: {metric:"games", position:"DEF", label:"Total de jogos como defesa", one:"jogo como defesa", many:"jogos como defesa"},
  totalWingerGames: {metric:"games", position:"ALA", label:"Total de jogos como ala", one:"jogo como ala", many:"jogos como ala"},
  totalMidfielderGames: {metric:"games", position:"MED", label:"Total de jogos como médio", one:"jogo como médio", many:"jogos como médio"},
  totalStrikerGames: {metric:"games", position:"AV", label:"Total de jogos como avançado", one:"jogo como avançado", many:"jogos como avançado"},
  totalRatingGames: {metric:"ratingGames", family:"stars", label:"Total de jogos com estrelas mínimas"},
  totalRatingWins: {metric:"ratingWins", family:"stars", label:"Total de vitórias com estrelas mínimas"},
});
export const isLifetimeObjective = (objective) => Object.hasOwn(TOTAL_OBJECTIVES, objective?.metric) && objective.countFrom !== "challenge";
export const usesLifetimeObjective = (objective) => isLifetimeObjective(objective) ||
  (objective?.metric === "all" && Array.isArray(objective.goals) && objective.goals.some(isLifetimeObjective)) ||
  (objective?.metric === "combined" && (isLifetimeObjective(objective.results) || isLifetimeObjective(objective.ratings)));
export const objectiveTargetLimit = (objective) => isLifetimeObjective(objective) ? 1000000 : 1000;
