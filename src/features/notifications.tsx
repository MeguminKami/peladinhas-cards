import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import type { Timestamp } from './contracts';
import { FeatureEmpty, FeatureHeading } from './presentation';

export interface Notice {
  id: string; title: string; body?: string; href?: string; read?: boolean; createdAt?: Timestamp;
  podium?: { position: number; name: string; reward: string }[];
}
export interface NotificationProps {
  uid: string; items: Notice[]; go(href: string): void;
  queueReads(uid: string, items: Notice[]): void;
  flushReads(uid: string): Promise<unknown>;
  clearNative(uid: string, ids: string[], unread: number): Promise<unknown>;
  pendingIds(uid: string): string[];
  onChange(items: Notice[]): void;
  notify(message: string): void;
  formatDate(value?: Timestamp): string;
  medal(position: number): string;
  checkIcon?: ReactNode; bellIcon?: ReactNode; pushSettings?: ReactNode;
}
export function NotificationItems({ items, mark, ...props }: Pick<NotificationProps, 'formatDate' | 'medal' | 'go' | 'checkIcon' | 'bellIcon'> & { items: Notice[]; mark(items: Notice[]): void }) {
  const open = (event: MouseEvent<HTMLAnchorElement>, notice: Notice) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (!notice.read) mark([notice]);
    if (notice.href?.startsWith('#/') && notice.href !== '#/notifications') props.go(notice.href);
  };
  return <>{items.map(notice => <div key={notice.id} className={`notification ${notice.read ? '' : 'unread'}`}><div className="notification-dot" /><a data-open-notification={notice.id} href={notice.href || '#'} onClick={event => open(event, notice)}><b>{notice.title}</b><p>{notice.body}</p>{!!notice.podium?.length && <div className="notification-podium">{notice.podium.map((winner, index) => <div key={`${winner.position}-${index}`}><strong>{props.medal(winner.position)} {winner.name}</strong><span>{winner.reward}</span></div>)}</div>}<small>{props.formatDate(notice.createdAt)}</small></a>{!notice.read && <button className="btn btn-icon btn-ghost" data-read={notice.id} aria-label="Marcar como lida" onClick={() => mark([notice])}>{props.checkIcon}</button>}</div>)}</>;
}
export function NotificationsPage(props: NotificationProps) {
  const [view, setView] = useState<'unread' | 'read'>('unread');
  const [items, setItems] = useState(props.items);
  const [pending, setPending] = useState(() => props.pendingIds(props.uid).length);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => { setItems(props.items); }, [props.items]);
  useEffect(() => { setView('unread'); }, [props.uid]);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ uid: string; pending: number }>).detail;
      if (detail.uid === props.uid) setPending(detail.pending);
    };
    window.addEventListener('peladinhas-notification-queue', update);
    return () => window.removeEventListener('peladinhas-notification-queue', update);
  }, [props.uid]);
  const mark = (notices: Notice[]) => {
    props.queueReads(props.uid, notices);
    const ids = new Set(notices.map(notice => notice.id));
    const next = items.map(notice => ids.has(notice.id) ? { ...notice, read: true } : notice);
    setItems(next);
    props.onChange(next);
    void props.clearNative(props.uid, [...ids], next.filter(notice => !notice.read).length).catch(() => {});
    window.dispatchEvent(new CustomEvent('peladinhas-notification-read', { detail: { uid: props.uid, ids: [...ids] } }));
    void props.flushReads(props.uid).catch(() => {});
    setPending(props.pendingIds(props.uid).length);
  };
  const unread = items.filter(notice => !notice.read);
  const history = items.filter(notice => notice.read);
  const shown = view === 'unread' ? unread : history;
  return <><FeatureHeading tag="A tua liga" title="Notificações" description="Missões, resultados e evolução da tua carta." action={unread.length ? <button data-read-all className="btn btn-secondary" onClick={() => { mark(unread); props.notify(navigator.onLine === false ? 'Leituras guardadas. Sincronizam quando a ligação voltar.' : 'Notificações marcadas como lidas.'); }}>Marcar todas como lidas</button> : null} />{props.pushSettings}<div className="notification-view-tabs" role="tablist" aria-label="Estado das notificações">{(['unread', 'read'] as const).map((value, index) => <button key={value} ref={node => { tabs.current[index] = node; }} type="button" role="tab" data-notification-view={value} aria-selected={view === value} aria-controls="notification-content" tabIndex={view === value ? 0 : -1} onClick={() => setView(value)} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index; setView(next === 0 ? 'unread' : 'read'); tabs.current[next]?.focus(); } }}>{value === 'unread' ? 'Por ler' : 'Histórico'} <span>{value === 'unread' ? unread.length : history.length}</span></button>)}</div><p className="notification-sync-note" role="status" data-notification-sync hidden={!pending}>{pending} leituras por sincronizar. Ficam guardadas neste dispositivo até a ligação voltar.</p><div className="panel notification-list" id="notification-content" role="tabpanel">{shown.length ? <NotificationItems {...props} items={shown} mark={mark} /> : <FeatureEmpty title={view === 'unread' ? 'Sem notificações novas' : 'Ainda sem notificações lidas'} description={view === 'unread' ? 'As novidades da tua liga aparecem aqui.' : 'As novidades que já viste ficam guardadas aqui.'} icon={props.bellIcon} />}</div></>;
}
