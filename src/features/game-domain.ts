export type TeamSide = 'teamA' | 'teamB';
export type TeamKind = 'starters' | 'bench';
export interface GameTeams { teamA: { starters: string[]; bench: string[] }; teamB: { starters: string[]; bench: string[] } }
export interface PositionPlayer { uid: string; primaryPosition?: string }
export interface PerformanceCount { goals: number; assists: number }

export function gameParticipants(game: GameTeams): string[] {
  return [...game.teamA.starters, ...game.teamA.bench, ...game.teamB.starters, ...game.teamB.bench];
}

/** Closed matches retain the position captured when they were closed. */
export function captureMatchPositions(game: GameTeams & { status: string; positions?: Record<string, string> }, players: PositionPlayer[]): Record<string, string> {
  return Object.fromEntries(gameParticipants(game).flatMap(uid => {
    const position = (game.status === 'closed' && game.positions?.[uid]) || players.find(player => player.uid === uid)?.primaryPosition;
    return position && ['GR', 'DEF', 'ALA', 'MED', 'AV'].includes(position) ? [[uid, position]] : [];
  }));
}

/** Returns a new team selection; a player can occupy exactly one place. */
export function moveTeamPlayer(game: GameTeams, uid: string, players: PositionPlayer[], team?: TeamSide, kind?: TeamKind): GameTeams {
  if (!players.some(player => player.uid === uid)) return game;
  if (team && kind === 'starters' && game[team].starters.filter(value => value !== uid).length >= 5) throw new Error('Máximo de 5 titulares por equipa.');
  const next: GameTeams = {
    teamA: { starters: game.teamA.starters.filter(value => value !== uid), bench: game.teamA.bench.filter(value => value !== uid) },
    teamB: { starters: game.teamB.starters.filter(value => value !== uid), bench: game.teamB.bench.filter(value => value !== uid) },
  };
  if (team && kind) next[team][kind].push(uid);
  return next;
}

export function serializePerformance(game: GameTeams, performance: Record<string, PerformanceCount>, score: Record<TeamSide, number>) {
  const side = (team: TeamSide) => {
    const serialize = (key: keyof PerformanceCount): string[] => [...game[team].starters, ...game[team].bench].flatMap(uid => {
      const count = performance[uid]?.[key] || 0;
      if (!Number.isInteger(count) || count < 0 || count > 999) throw new Error('Introduz golos e assistências inteiros entre 0 e 999.');
      return Array<string>(count).fill(uid);
    });
    const result = { goals: serialize('goals'), assists: serialize('assists') };
    if (result.goals.length > score[team] || result.assists.length > score[team]) throw new Error(`Os golos e assistências de Equipa ${team === 'teamA' ? 'A' : 'B'} não podem ultrapassar o resultado da equipa.`);
    return result;
  };
  return { teamA: side('teamA'), teamB: side('teamB') };
}
