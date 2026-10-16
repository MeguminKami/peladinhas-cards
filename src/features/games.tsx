import type { ReactNode } from 'react';
import { FeatureEmpty, FeatureHeading } from './presentation';
import type { FeatureContext, Timestamp } from './contracts';

export interface GameListItem {
  id: string;
  title: string;
  status: 'draft' | 'open' | 'closed';
  location?: string;
  scheduledAt?: Timestamp | Date | string | null;
  teamA: { starters: string[]; bench: string[] };
  teamB: { starters: string[]; bench: string[] };
  score: { teamA: number; teamB: number };
}
export interface GameSummary { id: string; players?: Record<string, { overall?: number }> }
export function MatchStars({ value }: { value?: number }) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return <span className="muted">Por avaliar</span>;
  return <span className="match-stars" aria-label={`${value.toFixed(1)} de 5 estrelas`}><span aria-hidden="true">★★★★★<span style={{ width: `${Math.max(0, Math.min(100, value * 20))}%` }}>★★★★★</span></span><b>{value.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b></span>;
}
export function GameRows({ games, uid, summaries = [], participants, formatMatchDate, gameIcon, arrowIcon }: {
  games: GameListItem[]; uid?: string; summaries?: GameSummary[];
  participants(game: GameListItem): string[];
  formatMatchDate(value?: Timestamp | Date | string | null): string;
  gameIcon?: ReactNode; arrowIcon?: ReactNode;
}) {
  return <div className="game-list">{games.map(game => {
    const own = game.status === 'closed' && !!uid && participants(game).includes(uid);
    return <a key={game.id} className={`game-row ${own ? 'has-own-rating' : ''}`} href={`#/game/${game.id}`}><span className="game-symbol">{gameIcon}</span><div className="game-row-info"><b>{game.title}</b><small>{formatMatchDate(game.scheduledAt)} · {game.location || 'Local a definir'}</small></div>{own && <div className="game-own-rating"><small>A tua avaliação</small><MatchStars value={summaries.find(row => row.id === game.id)?.players?.[uid]?.overall} /></div>}<span className={`pill ${game.status === 'closed' ? '' : 'success'}`}>{{ draft: 'Rascunho', open: 'Aberto', closed: 'Encerrado' }[game.status]}</span><strong>{game.status === 'closed' ? `${game.score.teamA} — ${game.score.teamB}` : 'VS'}</strong>{arrowIcon}</a>;
  })}</div>;
}
export function GamesPage(props: Omit<Parameters<typeof GameRows>[0], 'uid'> & { ctx: FeatureContext; plusIcon?: ReactNode }) {
  const action = ['admin', 'dbs'].includes(props.ctx.user.role) ? <a className="btn btn-primary" href="#/game/new">{props.plusIcon}Criar jogo</a> : null;
  return <><FeatureHeading tag="Dentro de campo" title="Jogos" description="Organiza a próxima Peladinha e revê os resultados." action={action} />{props.games.length ? <GameRows {...props} uid={props.ctx.user.uid} /> : <FeatureEmpty title="Ainda não existem jogos" description="As equipas e os resultados ficam todos aqui." action={action} icon={props.gameIcon} />}</>;
}
