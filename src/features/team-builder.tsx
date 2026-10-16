import { useState, type ReactNode } from 'react';
import type { GameTeams, TeamKind, TeamSide } from './game-domain';

export interface TeamPlayer { uid: string; displayName?: string; username?: string; hasCard?: boolean; ovr?: number }
export interface TeamBuilderProps {
  game: GameTeams & { status: string }; players: TeamPlayer[]; editable: boolean;
  card(player: TeamPlayer): ReactNode;
  closeIcon: ReactNode;
  balance: ReactNode;
  move(uid: string, team?: TeamSide, kind?: TeamKind): void;
  draw(): void;
  referenceOvr?(uid: string): number | undefined;
}
export function TeamBuilder(props: TeamBuilderProps) {
  const [draggedOver, setDraggedOver] = useState('');
  const assigned = (uid: string) => (['teamA', 'teamB'] as const).some(side => [...props.game[side].starters, ...props.game[side].bench].includes(uid));
  const ranked = (side: TeamSide) => props.players.filter(player => [...props.game[side].starters, ...props.game[side].bench].includes(player.uid)).filter(player => (Number.isFinite(props.referenceOvr?.(player.uid)) || player.hasCard) && Number.isFinite(props.referenceOvr?.(player.uid) ?? player.ovr)).sort((a, b) => (props.referenceOvr?.(b.uid) ?? b.ovr ?? 0) - (props.referenceOvr?.(a.uid) ?? a.ovr ?? 0) || a.uid.localeCompare(b.uid));
  const chip = (player: TeamPlayer, side?: TeamSide, kind?: TeamKind) => {
    const captain = side && ranked(side)[0]?.uid === player.uid;
    const hasCard = player.hasCard || (side && Number.isFinite(props.referenceOvr?.(player.uid)));
    const ovr = side ? props.referenceOvr?.(player.uid) ?? player.ovr : player.ovr;
    return <div key={player.uid} className={`team-chip ${captain ? 'is-captain' : ''}`} draggable={props.editable} data-uid={player.uid} onDragStart={event => event.dataTransfer.setData('text/plain', player.uid)}><div className="chip-card">{props.card(player)}</div><div className="chip-info"><b>{player.displayName || player.username}</b><small>{hasCard ? `OVR ${ovr}` : 'Carta pendente'}{side ? ` · ${kind === 'bench' ? 'Suplente' : 'Titular'}` : ''}{captain && <> <span className="captain-badge" title="Maior OVR da equipa">C · Capitão</span></>}</small>{props.editable && <div className="chip-controls">{!side ? <><button type="button" data-uid={player.uid} data-assign="teamA" data-kind="starters" className="btn btn-ghost" onClick={() => props.move(player.uid, 'teamA', 'starters')}>→ A</button><button type="button" data-uid={player.uid} data-assign="teamB" data-kind="starters" className="btn btn-ghost" onClick={() => props.move(player.uid, 'teamB', 'starters')}>→ B</button></> : <><select data-move-select={player.uid} aria-label={`Mover ${player.displayName || ''}`} value="" onChange={event => { if (!event.target.value) return; const [nextSide, nextKind] = event.target.value.split('/') as [TeamSide, TeamKind]; props.move(player.uid, nextSide, nextKind); }}><option value="">Mover para…</option><option value="teamA/starters">A · Titular</option><option value="teamA/bench">A · Suplente</option><option value="teamB/starters">B · Titular</option><option value="teamB/bench">B · Suplente</option></select><button type="button" data-remove={player.uid} className="btn btn-icon btn-ghost" aria-label="Remover jogador" onClick={() => props.move(player.uid)}>{props.closeIcon}</button></>}</div>}</div></div>;
  };
  const available = props.players.filter(player => !assigned(player.uid));
  return <section className="panel game-teams-frame content-stack"><div className="auto-teams"><div className="section-head"><div><h2>Equipas</h2></div>{props.editable && props.game.status !== 'closed' ? <button type="button" id="auto-teams" className="btn btn-primary" onClick={props.draw}>Sortear equipas</button> : <span className="pill">{props.game.status === 'closed' ? 'Jogo encerrado' : props.game.status === 'open' ? 'Jogo aberto' : 'Rascunho'}</span>}</div></div>{props.balance}<div className={`team-builder ${props.editable && available.length ? 'has-available' : ''}`}><section className="team-panel available"><div className="section-head"><h2>Disponíveis</h2><small>{available.length}</small></div><div className="team-player-list">{available.length ? available.map(player => chip(player)) : <p className="muted">Todos os jogadores estão nas equipas.</p>}</div></section>{(['teamA', 'teamB'] as const).map(side => {
    const rank = ranked(side);
    const ordered = [...props.game[side].starters, ...props.game[side].bench].sort((a, b) => {
      const left = rank.findIndex(player => player.uid === a), right = rank.findIndex(player => player.uid === b);
      return (left < 0 ? 999 : left) - (right < 0 ? 999 : right);
    });
    return <section key={side} className={`team-panel ${side === 'teamA' ? 'team-a' : 'team-b'}`}><div className="section-head"><h2>Equipa {side === 'teamA' ? 'A' : 'B'}</h2><span className="team-letter">{side === 'teamA' ? 'A' : 'B'}</span></div>{props.editable && <div className="team-drop-targets">{(['starters', 'bench'] as const).map(kind => { const key = `${side}/${kind}`; return <div key={kind} className={`drop-zone ${draggedOver === key ? 'drag-over' : ''}`} data-team={side} data-kind={kind} onDragOver={event => { event.preventDefault(); setDraggedOver(key); }} onDragLeave={() => setDraggedOver('')} onDrop={event => { event.preventDefault(); setDraggedOver(''); props.move(event.dataTransfer.getData('text/plain'), side, kind); }}><h3>{kind === 'starters' ? `Titulares ${props.game[side].starters.length}/5` : `Suplentes ${props.game[side].bench.length}`}</h3><span className="drop-hint">Arrastar para aqui</span></div>; })}</div>}<div className="team-player-list ordered-team-list">{ordered.length ? ordered.map(uid => chip(props.players.find(player => player.uid === uid) || { uid, displayName: 'Jogador inativo' }, side, props.game[side].starters.includes(uid) ? 'starters' : 'bench')) : <p className="muted">Sem jogadores</p>}</div></section>;
  })}</div></section>;
}
