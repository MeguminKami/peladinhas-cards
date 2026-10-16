import { useEffect, useRef, useState, type ReactNode } from 'react';
import { startAuth, currentUser, logout } from '../../js/auth.js';
import { configured } from '../../js/firebase.js';
import { loadSession } from '../services/league';
import { Chrome } from './Chrome';
import { PwaStatus, installHelp } from './Pwa';
import { Home, Players, Ranking } from './Community';
import { AuthPage } from '../presentation/onboarding';
import { playerPage, editProfile } from '../presentation/profile';
import { StatisticsPage } from '../presentation/statistics';
import { NotificationsPage, NotificationState } from './Notifications';
import { PushSettings } from './PushSettings';
import { syncPushIdentity, setPushNotifier, clearNativeNotifications } from '../../js/push.js';
import { flushRatingDrafts } from '../features/use-rating-draft';
import { closeModal, toast } from '../shared/overlays';
import { Empty, Icon, LinkButton, PageHead, Skeleton } from '../shared/ui';
import { asDate, formatDate } from '../../js/utils.js';
import { medal } from '../../js/event-model.js';
import { friendlyError, setToastRenderer } from '../../js/ui.js';
import { queueNotificationReads, flushNotificationReads, pendingReadIds, applyPendingReads } from '../../js/notification-read-queue.js';
import * as DB from '../../js/db.js';
import type { Notice, PageContext } from '../types';

type Session = Awaited<ReturnType<typeof loadSession>>;
const initial: Session = {user:null, realUser:null, league:null, missions:[], notifications:[]};

export function Application() {
  const [hash, setHash] = useState(location.hash || '#/');
  const [session, setSession] = useState<Session>(initial);
  const [content, setContent] = useState<ReactNode>(<Skeleton/>);
  const [revision, setRevision] = useState(0);
  const [installed, setInstalled] = useState(false);
  const generation = useRef(0);
  const disposers = useRef<PageContext['disposers']>([]);
  const sessionRef = useRef(session);
  const visibleHash = useRef(hash);
  visibleHash.current = hash;
  useEffect(() => {const onInstalled = () => setInstalled(true); window.addEventListener('appinstalled',onInstalled); return () => window.removeEventListener('appinstalled',onInstalled);}, []);
  sessionRef.current = session;
  useEffect(() => {
    if (!/^#\/(?:profile|players|ranking|statistics)?$/.test(hash) && !/^#\/player\/[^/]+$/.test(hash)) return;
    const expiry = Math.min(...(session.league?.players || []).flatMap(player => player.specials || []).map(card => card.expiresAt ? +asDate(card.expiresAt) : Infinity).filter(value => value > Date.now()));
    if (!Number.isFinite(expiry)) return;
    const timer = setTimeout(() => setRevision(value => value + 1), Math.min(86400000, Math.max(100, expiry - Date.now() + 50)));
    return () => clearTimeout(timer);
  }, [hash, session.league]);
  useEffect(() => {setPushNotifier(toast); setToastRenderer(toast); return () => {setPushNotifier(null); setToastRenderer(null);};}, []);
  useEffect(() => {
    const uid = session.realUser && !session.realUser.disabled ? session.realUser.uid : null;
    let active = true;
    void syncPushIdentity(uid, (items: Notice[]) => {
      if (!active || sessionRef.current.realUser?.uid !== uid) return;
      const notifications = applyPendingReads(uid,items).sort((a: Notice,b: Notice) => (b.createdAt?.seconds || 0)-(a.createdAt?.seconds || 0));
      setSession(value => ({...value,notifications}));
    }).catch(() => {});
    return () => {active=false;};
  }, [session.realUser?.uid,session.realUser?.disabled]);
  useEffect(() => () => {void syncPushIdentity(null).catch(() => {});}, []);
  useEffect(() => {
    const read = (event: Event) => {
      const detail = (event as CustomEvent<{uid: string; ids?: string[]; notificationId?: string; type?: string}>).detail;
      const value = sessionRef.current;
      if (!detail || detail.uid !== value.user?.uid) return;
      const ids = new Set(detail.ids || (detail.notificationId ? [detail.notificationId] : []));
      if (ids.size) setSession({...value,notifications:value.notifications.map(item => ids.has(item.id) ? {...item,read:true} : item)});
      else void DB.syncNotifications(value.user.uid,value.missions).then((items: Notice[]) => {if(sessionRef.current.user?.uid === detail.uid)setSession(current => ({...current,notifications:applyPendingReads(detail.uid,items)}));}).catch(() => {});
    };
    window.addEventListener('peladinhas-notification-read',read); window.addEventListener('peladinhas-push-read',read);
    return () => {window.removeEventListener('peladinhas-notification-read',read); window.removeEventListener('peladinhas-push-read',read);};
  }, []);
  useEffect(() => {
    let navigation = 0;
    const route = () => {
      const request = ++navigation;
      const destination = location.hash || '#/';
      void flushRatingDrafts().then(() => {
        if (request !== navigation) return;
        setHash(destination); setRevision(value => value + 1);
      }).catch((error: unknown) => {
        if (request !== navigation) return;
        history.replaceState(history.state,'',visibleHash.current);
        toast(friendlyError(error),'error');
      });
    };
    window.addEventListener('hashchange', route);
    const stop: unknown = configured ? startAuth(route, (error: unknown) => {toast(friendlyError(error), 'error'); setContent(<Empty title="Não foi possível carregar" description="Verifica a ligação à Internet e tenta novamente." action={<button className="btn btn-primary" onClick={route}>Tentar novamente</button>}/>);}) : undefined;
    if (!configured) route();
    return () => {window.removeEventListener('hashchange', route); if (typeof stop === 'function') stop();};
  }, []);
  useEffect(() => {
    const current = ++generation.current;
    const active = () => generation.current === current;
    const run = async () => {
      for (const dispose of disposers.current.splice(0)) await dispose();
      if (!active()) return;
      closeModal();
      if (!configured) {setContent(<Empty title="Configuração necessária" description="Preenche js/config.js e segue as instruções do README." symbol="shield"/>); return;}
      if (!currentUser) {setSession(initial); setContent(<AuthPage ctx={{go: (destination: string) => {location.hash = destination;}}}/>); return;}
      setContent(<Skeleton/>);
      const next = await loadSession(hash);
      if (!active()) return;
      setSession(next);
      if (!next.user) {setContent(<Empty title="Perfil indisponível" description="Não foi possível carregar o teu perfil. Contacta o apoio da liga." symbol="profile" action={<button id="missing-logout" className="btn btn-secondary" onClick={() => void logout()}>Terminar sessão</button>}/>); return;}
      if (next.user.disabled) {setContent(<Empty title="Conta desativada" description="Contacta o apoio da liga." symbol="shield"/>); return;}
      if (!next.league || !next.realUser) return;
      const ctx: PageContext = {
        user:next.user, realUser:next.realUser, league:next.league,
        missions:next.missions, notifications:next.notifications, disposers:disposers.current,
        render(node) {if (active()) setContent(node);},
        cleanup(dispose) {if (active()) disposers.current.push(dispose); else void dispose();},
        go(destination) {if (!active()) return; if (location.hash === destination) void flushRatingDrafts().then(() => {if(active())setRevision(value => value + 1);}).catch((error: unknown) => toast(friendlyError(error),'error')); else location.hash = destination;},
        async refresh() {const updated = await loadSession(location.hash); if (!active()) return; if (updated.user && updated.league && updated.realUser) {Object.assign(ctx,updated); setSession(updated);}},
        async refreshNotifications() {const notices = await DB.syncNotifications(ctx.user.uid, ctx.missions) as Notice[]; if (active()) {ctx.notifications = notices; setSession(value => ({...value,notifications:notices}));}},
      };
      const parts = hash.slice(2).split('/').filter(Boolean);
      if (parts[0] === 'admin' && ctx.user.role !== 'admin') {ctx.render(<Empty title="Acesso reservado" description="Esta área está disponível apenas a administradores." action={<LinkButton href="#/">Início</LinkButton>} symbol="shield"/>); return;}
      if (!parts.length) {ctx.render(<Home ctx={ctx}/>); void DB.callAdmin('ensureHistory', {}).catch(() => toast('O histórico está temporariamente indisponível. Tenta novamente mais tarde.', 'error'));}
      else if (parts[0] === 'players') ctx.render(<Players ctx={ctx}/>);
      else if (parts[0] === 'ranking') ctx.render(<Ranking ctx={ctx}/>);
      else if (parts[0] === 'statistics') ctx.render(<StatisticsPage ctx={ctx}/>);
      else if (parts[0] === 'player') await playerPage(ctx,parts[1]);
      else if (parts[0] === 'profile') {if (parts[1] === 'edit') editProfile(ctx); else await playerPage(ctx,ctx.user.uid);}
      else if (parts[0] === 'notifications') ctx.render(<NotificationsPage uid={ctx.user.uid} items={ctx.notifications} go={ctx.go} queueReads={queueNotificationReads} flushReads={flushNotificationReads} clearNative={clearNativeNotifications} pendingIds={pendingReadIds} onChange={items => setSession(value => ({...value,notifications:items}))} notify={toast} formatDate={formatDate} medal={medal} checkIcon={<Icon name="check"/>} bellIcon={<Icon name="bell"/>} pushSettings={<PushSettings/>}/>);
      else if (parts[0] === 'admin' && parts[1] === 'cards') {const {CardLab}=await import('../features/CardLab'); ctx.render(<CardLab key={parts[2]} ctx={ctx} uid={parts[2]}/>);}
      else if (parts[0] === 'admin' && parts[1] === 'player') await (await import('../features/admin')).adminEdit(ctx,parts[2],async (context,user) => {editProfile(context,user);});
      else if (parts[0] === 'admin' && parts[1] === 'ratings') await (await import('../features/admin')).rawRatings(ctx,parts[2]);
      else if (parts[0] === 'admin' && !['cards','card-types','card-photo','ovr','initial','support'].includes(parts[1])) {const {adminPage}=await import('../features/admin'); const {EventAdmin}=await import('../features/event-admin'); await adminPage(ctx,parts[1],parts[1] === 'events' ? <EventAdmin ctx={ctx}/> : undefined);}
      else if (parts[0] === 'assets') ctx.render(<><PageHead tag="Identidade da liga" title="Recursos visuais" description="Recursos locais para as cartas e identidade visual."/><div className="panel assets-preview"><img src="./assets/logo.svg" alt="Logótipo Peladinhas Cards"/><div><h2>Identidade Peladinhas</h2><p>Logótipo original, imagem de perfil padrão e molduras de cartas em CSS.</p>{ctx.user.role === 'admin' && <LinkButton href="#/admin/cards" type="secondary" symbol="lab">Experimentar no Card Lab</LinkButton>}</div></div></>);
      else if (await (await import('../features/FeatureRoutes')).renderFeatureRoute(ctx,parts)) { /* Feature modules own their page components. */ }
      else ctx.render(<Empty title="Página não encontrada" description="Segue para a página inicial." action={<LinkButton href="#/">Início</LinkButton>}/>);
    };
    void run().catch((error: unknown) => {if (active()) {console.error(error); setContent(<Empty title="Não foi possível carregar" description="Verifica a ligação à Internet e tenta novamente." symbol="shield" action={<button className="btn btn-primary" onClick={() => setRevision(value => value + 1)}>Tentar novamente</button>}/>);}});
    return () => {generation.current++;};
  }, [hash,revision]);
  useEffect(() => {
    const main = document.querySelector<HTMLElement>('#main');
    document.title = `${main?.querySelector('h1, .empty-state h3')?.textContent?.trim() || 'A tua liga'} · Peladinhas Cards`;
    window.scrollTo({top:0,behavior:'instant'});
    main?.focus({preventScroll:true});
  }, [content]);
  const mark = (items: Notice[]) => {
    const value = sessionRef.current;
    if (!value.user) return;
    queueNotificationReads(value.user.uid, items);
    const ids = new Set(items.map(item => item.id));
    setSession({...value,notifications:value.notifications.map(item => ids.has(item.id) ? {...item,read:true} : item)});
    void clearNativeNotifications(value.user.uid,[...ids],value.notifications.filter(item => !ids.has(item.id) && !item.read).length).catch(() => {});
    void flushNotificationReads(value.user.uid).catch(() => {});
  };
  const changePerspective = async (role: import('../types').Role) => {
    await flushRatingDrafts();
    for (const dispose of disposers.current.splice(0)) await dispose();
    const uid = session.realUser?.uid;
    if (!uid || session.realUser?.role !== 'admin') return;
    const key = `peladinhas-perspective:${uid}`;
    if (role === 'admin') sessionStorage.removeItem(key); else sessionStorage.setItem(key,role);
    location.reload();
  };
  return <NotificationState.Provider value={session.notifications}><a className="skip-link" href="#main" onClick={event => {event.preventDefault(); document.querySelector<HTMLElement>('#main')?.focus();}}>Saltar para o conteúdo</a><Chrome user={session.user} realUser={session.realUser} missions={session.missions} notifications={session.notifications} hash={hash} installed={installed} onLogout={async () => {await flushRatingDrafts(); const uid=session.realUser?.uid; await logout(); if(uid)sessionStorage.removeItem(`peladinhas-perspective:${uid}`); setSession(initial); toast('Sessão terminada.'); location.hash='#/'; setRevision(value=>value+1);}} onInstall={() => installHelp()} onReadNotification={mark} onPerspectiveChange={changePerspective}/><PwaStatus/><main id="main" tabIndex={-1} className={`${/^#\/admin(\/|$)/.test(hash) ? 'admin-layout' : ''} ${/^#\/(admin|statistics|game)(\/|$)/.test(hash) ? 'wide-layout' : ''}`}>{content}</main></NotificationState.Provider>;
}
