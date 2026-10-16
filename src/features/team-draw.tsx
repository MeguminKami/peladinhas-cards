import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { gameParticipants, type GameTeams } from './game-domain';
import type { TeamPlayer } from './team-builder';

export function TeamDraw(props: {
  players: TeamPlayer[]; game: GameTeams; initialSelection?: string[];
  card(player: TeamPlayer): ReactNode; playersIcon: ReactNode;
  balance(players: TeamPlayer[], game: GameTeams): GameTeams;
  apply(teams: GameTeams, selection: string[]): void;
  notify(message: string, type?: string): void; errorMessage(error: unknown): string;
}) {
  const eligible = props.players.filter(player => player.hasCard && Number.isFinite(player.ovr));
  const eligibleIds = new Set(eligible.map(player => player.uid));
  const [selection, setSelection] = useState(() => new Set((props.initialSelection || gameParticipants(props.game)).filter(uid => eligibleIds.has(uid))));
  const [over, setOver] = useState('');
  const focus = useRef<string | null>(null);
  const tiles = useRef(new Map<string, HTMLButtonElement>());
  const move = (uid: string, selected: boolean) => {
    if (!eligibleIds.has(uid)) return;
    focus.current = uid;
    setSelection(current => { const next = new Set(current); if (selected) next.add(uid); else next.delete(uid); return next; });
  };
  const tile = (player: TeamPlayer) => {
    const selected = selection.has(player.uid), disabled = !eligibleIds.has(player.uid);
    return <button key={player.uid} ref={node => { if (node) { tiles.current.set(player.uid, node); if (focus.current === player.uid) { node.focus({ preventScroll: true }); focus.current = null; } } else tiles.current.delete(player.uid); }} type="button" className="draw-player-card" data-auto-player={player.uid} draggable={!disabled} disabled={disabled} aria-label={`${selected ? 'Retirar' : 'Adicionar'} ${player.displayName || player.username} ${selected ? 'do' : 'ao'} balde`} onClick={() => move(player.uid, !selected)} onDragStart={event => { event.dataTransfer.setData('text/plain', player.uid); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setOver('')}>{props.card(player)}<span className="draw-card-action">{disabled ? 'Carta pendente' : selected ? '− Retirar' : '+ Adicionar'}</span></button>;
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { props.apply(props.balance(eligible.filter(player => selection.has(player.uid)), props.game), [...selection]); props.notify('Equipas sorteadas. Guarda o jogo para confirmar.'); }
    catch (error) { props.notify(props.errorMessage(error), 'error'); }
  };
  return <form id="auto-selection" onSubmit={submit}><p className="draw-help">Arrasta as cartas para o balde ou toca para adicionar e retirar.</p><div className="auto-selection-head"><button type="button" id="select-all-players" className="btn btn-ghost" onClick={() => setSelection(selection.size === eligible.length ? new Set() : new Set(eligible.map(player => player.uid)))}>{selection.size === eligible.length ? 'Limpar seleção' : 'Selecionar todos'}</button></div><div className="draw-pool-layout">{(['available', 'selected'] as const).map(zone => {
    const players = zone === 'available' ? props.players.filter(player => !selection.has(player.uid)) : eligible.filter(player => selection.has(player.uid));
    return <section key={zone} className={`draw-pool${zone === 'selected' ? ' draw-bucket' : ''}${over === zone ? ' drag-over' : ''}`} data-draw-zone={zone} aria-label={zone === 'available' ? 'Jogadores disponíveis' : 'Balde do sorteio'} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOver(zone); }} onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOver(''); }} onDrop={event => { event.preventDefault(); setOver(''); move(event.dataTransfer.getData('text/plain'), zone === 'selected'); }}><h3>{zone === 'available' ? 'Disponíveis' : <>{props.playersIcon} Balde do sorteio<span id="auto-selected-count" className="pill success" role="status" aria-live="polite" aria-atomic="true" aria-label={`${selection.size} jogadores no sorteio`}>{selection.size}</span></>}</h3><div className="draw-card-list" id={zone === 'available' ? 'draw-available' : 'draw-selected'}>{players.length ? players.map(tile) : <p className="draw-empty">{zone === 'available' ? 'Todas as cartas estão no balde.' : 'Arrasta as cartas para aqui'}</p>}</div></section>;
  })}</div><div className="actions"><button id="confirm-auto-teams" className="btn btn-primary" disabled={selection.size < 2}>Sortear equipas</button></div></form>;
}
