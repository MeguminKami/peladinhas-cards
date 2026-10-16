import { useEffect, useState, type ReactNode } from 'react';
import type { Timestamp } from './contracts';
import { FeatureHeading } from './presentation';

export const eventStates = { draft: 'Rascunho', scheduled: 'Agendado', open: 'Ativo', review: 'Resultados a confirmar', closed: 'Terminado', cancelled: 'Cancelado' };
export interface PublicEvent {
  id: string; title: string; description?: string; image?: string; kind: string;
  rarity?: string;
  status: keyof typeof eventStates; startsAt?: Timestamp; createdAt?: Timestamp;
  winners?: { uid?: string; uids?: string[] }[];
  [key: string]: unknown;
}
export interface EventsPageProps {
  load(): Promise<PublicEvent[]>;
  compareRarity(a: PublicEvent, b: PublicEvent): number;
  endMillis(event: PublicEvent): number;
  endLabel(event: PublicEvent): string;
  rarityId(event: PublicEvent): string;
  rarityBadge(event: PublicEvent): ReactNode;
  eventIcon(event: PublicEvent): ReactNode;
  formatDate(value?: Timestamp): string;
  displayName(uid?: string): string;
  arrowIcon?: ReactNode;
}
export function EventsPage(props: EventsPageProps) {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    void props.load().then(value => { if (active) setEvents(value); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [props.load, retry]);
  const shown = events.filter(event => `${event.title} ${event.description || ''}`.toLowerCase().includes(search.toLowerCase()) && (!state || event.status === state) && (!type || event.kind === type || (type === 'event' && event.kind === 'vote')) && (!date || props.endMillis(event) >= +new Date(date))).sort((a, b) => props.compareRarity(a, b) || props.endMillis(b) - props.endMillis(a) || a.title.localeCompare(b.title));
  return <><FeatureHeading tag="A liga em movimento" title="Eventos e desafios" description="Participa, acompanha o calendário e consulta o histórico." action={<a className="btn btn-ghost" href="#/missions">{props.arrowIcon}As tuas missões</a>} /><section className="panel"><div className="event-toolbar"><label>Pesquisar<input id="public-event-search" type="search" placeholder="Nome ou descrição" value={search} onChange={event => setSearch(event.target.value)} /></label><label>Estado<select id="public-event-state" value={state} onChange={event => setState(event.target.value)}><option value="">Todos</option>{Object.entries(eventStates).filter(([key]) => key !== 'draft').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Tipo<select id="public-event-type" value={type} onChange={event => setType(event.target.value)}><option value="">Todos</option><option value="mission">Missões</option><option value="event">Eventos</option><option value="monthly">Mensais</option></select></label><label>A partir de<input type="date" id="public-event-date" value={date} onChange={event => setDate(event.target.value)} /></label></div><div id="public-event-list" className="event-grid">{loading ? <p role="status">A carregar…</p> : error ? <div role="alert"><p>Não foi possível carregar os eventos.</p><button className="btn btn-secondary" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div> : shown.length ? shown.map(event => <a key={event.id} className="event-management-card event-public-card event-rarity-surface" data-rarity={props.rarityId(event)} href={`#/event/${event.id}`}>{event.image && <img className="event-cover" src={event.image} alt="" loading="lazy" />}<div className="section-head"><span className="pill">{eventStates[event.status]}</span><small>{event.kind === 'mission' ? 'Missão' : 'Evento'}</small></div>{props.rarityBadge(event)}<h2 className="event-title-with-icon">{props.eventIcon(event)}{event.title}</h2><p>{event.description || ''}</p><small>{props.formatDate(event.startsAt || event.createdAt)} → {props.endLabel(event)}</small>{!!event.winners?.length && <p className="event-first-place">🥇 {props.displayName(event.winners[0]?.uid || event.winners[0]?.uids?.[0])}</p>}<span className="event-card-cta">Consultar →</span></a>) : <p className="muted">Ainda não há eventos com estes filtros.</p>}</div></section></>;
}
