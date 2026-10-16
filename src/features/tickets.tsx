import { AdminMenu } from '../app/Chrome';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { FeatureContext, Ticket, TicketMessage, TicketService, Timestamp } from './contracts';
import { FeatureEmpty, FeatureHeading } from './presentation';

export interface TicketPageProps {
  ctx: FeatureContext;
  admin?: boolean;
  id?: string;
  service: TicketService;
  formatDate(value?: Timestamp): string;
  confirm(message: string): Promise<boolean>;
  notify(message: string, type?: string): void;
  errorMessage(error: unknown): string;
  plusIcon?: ReactNode;
  arrowIcon?: ReactNode;
  emptyIcon?: ReactNode;
}

export function TicketsPage(props: TicketPageProps) {
  const { ctx, id, service, formatDate, confirm, notify, errorMessage } = props;
  const [rows, setRows] = useState<Ticket[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pending, setPending] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    setLoading(true);
    setLoadError('');
    setMessages([]);
    const load = async () => {
      try {
        if (!id) {
          const result = await service.tickets(ctx.user);
          if (active) setRows([...result].sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
        } else if (id !== 'new') {
          const result = await service.read(`tickets/${id}`);
          if (!active) return;
          setTicket(result);
          if (result) unsubscribe = service.watchTicket(id, value => { if (active) setTicket(value); }, value => {
            if (active) setMessages([...value].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0) || (a.createdAt?.nanoseconds || 0) - (b.createdAt?.nanoseconds || 0)));
          }, () => { if (active) notify('Não foi possível atualizar o ticket. Tenta novamente.', 'error'); });
        }
      } catch (error) { if (active) setLoadError(errorMessage(error)); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; unsubscribe?.(); };
  }, [id, ctx.user.uid, service, reload]);

  const history = <a className="btn btn-ghost" href="#/tickets">{props.arrowIcon}Histórico</a>;
  const submit = async (event: FormEvent<HTMLFormElement>, action: 'create' | 'reply') => {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    try {
      const result = await service.callAdmin('ticketAction', { action, ...(action === 'create' ? { title: data.get('title') } : { id }), body: data.get('body') });
      if (action === 'create') ctx.go(`#/tickets/${result.data.id}`);
      else form.reset();
    } catch (error) { notify(errorMessage(error), 'error'); }
    finally { setPending(false); }
  };
  const close = async () => {
    if (pending || !await confirm('Fechar definitivamente este ticket? Não poderá receber mensagens nem ser reaberto.')) return;
    setPending(true);
    try { await service.callAdmin('ticketAction', { action: 'close', id }); }
    catch (error) { notify(errorMessage(error), 'error'); }
    finally { setPending(false); }
  };

  if (loading) return <div role="status">A carregar…</div>;
  if (loadError) return <FeatureEmpty title="Não foi possível carregar" description={loadError} icon={props.emptyIcon} action={<button className="btn btn-primary" onClick={() => setReload(value => value + 1)}>Tentar novamente</button>} />;
  if (!id) {
    const shown = rows.filter(row => filter === 'all' || row.status === filter);
    return <><FeatureHeading tag="Apoio à liga" title="Tickets" description="Acompanha os teus pedidos de apoio." action={<a className="btn btn-primary" href="#/tickets/new">{props.plusIcon}Novo ticket</a>} />{props.admin && <AdminMenu/>}<label>Filtrar<select id="ticket-filter" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todos</option><option value="open">Abertos</option><option value="closed">Fechados</option></select></label><div id="ticket-list">{shown.length ? shown.map(row => <a key={row.id} className="game-row" href={`#/tickets/${row.id}`}><div><b>{row.title}</b><small>{formatDate(row.updatedAt)}</small></div><span className="pill">{row.status === 'closed' ? 'Fechado' : 'Aberto'}</span></a>) : <FeatureEmpty title="Sem tickets" description="Os teus pedidos e conversas ficam aqui." icon={props.emptyIcon} />}</div></>;
  }
  if (id === 'new') return <><FeatureHeading tag="Apoio à liga" title="Novo ticket" description="Descreve o problema ou a dúvida." action={history} /><form id="ticket-create" className="panel" onSubmit={event => void submit(event, 'create')}><label>Título<input name="title" required maxLength={100} /></label><label>Mensagem<textarea name="body" required maxLength={4000} rows={6} /></label><button className={`btn btn-primary${pending ? ' is-loading' : ''}`} disabled={pending} aria-busy={pending}>Enviar ticket</button></form></>;
  if (!ticket) return <FeatureEmpty title="Ticket não encontrado" description="Volta ao histórico." icon={props.emptyIcon} action={<a className="btn btn-primary" href="#/tickets">{props.arrowIcon}Tickets</a>} />;
  const closed = ticket.status === 'closed';
  return <><FeatureHeading tag="Apoio à liga" title={ticket.title} action={history} /><div className="content-stack"><div id="ticket-status">{closed ? <p>Ticket fechado definitivamente{ticket.closedByName ? ` por ${ticket.closedByName}` : ''}. Não é possível responder ou reabrir.</p> : <p className="muted">Ticket aberto</p>}</div><div className="ticket-chat panel" id="ticket-messages" aria-live="polite">{messages.map(message => <article key={message.id} className={`ticket-message ${message.authorId === ctx.user.uid ? 'own-message' : ''}`}><div><strong>{message.authorName}</strong>{' '}<span className="pill">{message.authorRole === 'admin' ? 'Administrador' : 'Membro'}</span><small>{formatDate(message.createdAt)}</small></div><p>{message.body}</p></article>)}</div><div id="ticket-controls" hidden={closed}><form id="ticket-reply" className="panel" onSubmit={event => void submit(event, 'reply')}><label>Resposta<textarea name="body" required maxLength={4000} rows={4} /></label><div className="actions"><button className={`btn btn-primary${pending ? ' is-loading' : ''}`} disabled={pending} aria-busy={pending}>Enviar resposta</button><button type="button" id="ticket-close" className="btn btn-danger" disabled={pending} onClick={() => void close()}>Fechar definitivamente</button></div></form></div></div></>;
}
