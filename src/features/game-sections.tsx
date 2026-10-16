import type { ReactNode } from 'react';
import { MatchStars } from './games';
import { gameParticipants, type GameTeams, type PerformanceCount, type TeamSide } from './game-domain';

interface MatchPlayer { uid: string; displayName?: string; username?: string }
export function MatchRatings({ game, players, uid, summary, dimensions }: { game: GameTeams; players: MatchPlayer[]; uid: string; summary: Record<string, Record<string, number | undefined>>; dimensions: readonly (readonly [string, string])[] }) {
  const participants = gameParticipants(game);
  return <section className="panel match-ratings"><div className="section-head"><div><small>O jogo aos olhos da equipa</small><h2>Estrelas do jogo</h2></div><span className="pill">Médias da comunidade</span></div><p className="muted">As estrelas vão surgindo à medida que as avaliações são enviadas. Abre um jogador para ver cada dimensão.</p><div className="match-ratings-list">{participants.length ? participants.map(id => {
    const player = players.find(value => value.uid === id);
    const rating = summary[id] || {};
    return <details key={id} className={`match-rating-player ${id === uid ? 'is-self' : ''}`}><summary><span>{player?.displayName || player?.username || 'Jogador inativo'}{id === uid && <> <small>Tu</small></>}</span><MatchStars value={rating.overall} /></summary><div className="match-rating-dimensions">{dimensions.map(([key, label]) => <div key={key}><span>{label}</span><MatchStars value={rating[key]} /></div>)}</div></details>;
  }) : <p className="muted">Este jogo não tem jogadores.</p>}</div></section>;
}
export function MatchPerformance({ game, players, values, editable, onChange }: { game: GameTeams; players: MatchPlayer[]; values: Record<string, PerformanceCount>; editable: boolean; onChange(uid: string, key: keyof PerformanceCount, value: number): void }) {
  return <div className="match-performance-grid">{(['teamA', 'teamB'] as TeamSide[]).map(side => <section key={side}><h3>Equipa {side === 'teamA' ? 'A' : 'B'} · Golos e assistências</h3>{[...game[side].starters, ...game[side].bench].map(uid => {
    const player = players.find(value => value.uid === uid);
    const name = player?.displayName || player?.username || 'Jogador';
    return <div key={uid} className="match-performance-row"><b>{name}</b>{([['goals', 'Golos'], ['assists', 'Assistências']] as const).map(([key, label]) => <label key={key}>{label}<span className="performance-counter">{editable && <button type="button" data-counter="-1" aria-label={`Diminuir ${label} de ${player?.displayName || uid}`} onClick={() => onChange(uid, key, Math.max(0, Math.min(999, (values[uid]?.[key] || 0) - 1)))}>−</button>}<input type="number" min={0} max={999} step={1} value={values[uid]?.[key] || 0} data-performance-uid={uid} data-performance-key={key} aria-label={`${label} de ${player?.displayName || uid}`} disabled={!editable} onChange={event => onChange(uid, key, Number(event.target.value))} />{editable && <button type="button" data-counter="1" aria-label={`Aumentar ${label} de ${player?.displayName || uid}`} onClick={() => onChange(uid, key, Math.max(0, Math.min(999, (values[uid]?.[key] || 0) + 1)))}>+</button>}</span></label>)}</div>;
  })}{!game[side].starters.length && !game[side].bench.length && <p className="muted">Adiciona jogadores à equipa.</p>}</section>)}</div>;
}
export function GameVideo({ id }: { id?: string | null }) {
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return <section className="panel game-video"><h2>Vídeo da Peladinha</h2><div className="video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title="Vídeo da Peladinha no YouTube" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div><p className="muted small">Vídeo alojado no YouTube. Se a reprodução estiver bloqueada pelo autor, <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer">ver no YouTube ↗</a>.</p></section>;
}
export function PlayerHighlight({ label, player, card }: { label: string; player?: MatchPlayer & { ovr?: number }; card(player: MatchPlayer): ReactNode }) {
  return <div className="game-highlight"><small>{label}</small>{player ? <a href={`#/player/${player.uid}`}><span className="leader-mini-card">{card(player)}</span><b>{player.displayName || player.username}</b><span>{player.ovr == null ? '—' : player.ovr.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} OVR</span></a> : <b className="muted">—</b>}</div>;
}
