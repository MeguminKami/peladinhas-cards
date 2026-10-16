import { useEffect, useState } from 'react';
import { Icon } from '../shared/ui';
import { modal, toast } from '../shared/overlays';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{outcome: string}>;
}
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?: boolean}).standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let prompt: InstallPrompt | null = null;
let installed = false;
export function installHelp(platform?: string) {
  if (standalone()) {
    modal('Já estás na tua aplicação', <p>As Peladinhas Cards já estão abertas em modo aplicação. A tua liga está a um toque de distância.</p>);
    return;
  }
  const requested = platform && ['ios', 'android'].includes(platform) ? platform : null;
  const ios = requested ? requested === 'ios' : isIOS();
  const native = !!prompt && !ios && (!requested || /Android/i.test(navigator.userAgent));
  const steps = ios ? ['Abre este site no Safari.', 'Toca em Partilhar (o quadrado com a seta para cima).', 'Escolhe «Adicionar ao ecrã principal», ativa «Abrir como aplicação» se aparecer e confirma em «Adicionar».'] : requested === 'android' || /Android/i.test(navigator.userAgent) ? ['Abre este site no Chrome.', 'Toca no menu ⋮ junto à barra de endereço.', 'Escolhe «Instalar aplicação» ou «Adicionar ao ecrã principal» e confirma.'] : ['Abre este site no Chrome ou no Microsoft Edge.', 'Procura o ícone de instalação na barra de endereço ou a opção «Instalar» no menu do browser.', 'Confirma para abrir as Peladinhas numa janela própria.'];
  const close = modal('A tua liga, sempre contigo', <><div className="install-intro"><img src="./assets/pwa/icon-192.png" alt=""/><div><p className="eyebrow">{ios ? 'NO TEU IPHONE' : requested === 'android' ? 'NO TEU ANDROID' : 'PELADINHAS CARDS'}</p><h3>Um lugar no teu ecrã inicial.</h3><p>Abre a tua liga diretamente, numa janela própria.</p></div></div>{native ? <button className="btn btn-primary full-width" id="confirm-install" onClick={async event => {
    if (!prompt) return;
    event.currentTarget.disabled = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      prompt = null;
      if (choice.outcome === 'accepted') {close(); toast('Aplicação adicionada. Vemo-nos em campo!');}
      else installHelp(requested || undefined);
    } catch {prompt = null; installHelp(requested || undefined);}
  }}>Instalar Peladinhas Cards</button> : <ol className="install-steps">{steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>}<p className="small muted">Precisas de ligação para consultar os dados e guardar alterações. A instalação depende das opções disponíveis no teu browser.</p></>);
}
function PlatformIcon({ios}: {ios: boolean}) {
  return ios ? <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.9 12.7c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.2 9 .8 1.1 1.7 2.2 2.8 2.1 1.1 0 1.6-.7 3-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.8-2.1.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8ZM14.6 6.5c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1.1 2.9 1.1.1 2.2-.5 2.9-1.3Z"/></svg> : <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 10h12v8a1 1 0 0 1-1 1h-1v3h-2v-3h-4v3H8v-3H7a1 1 0 0 1-1-1ZM3 10h2v8H3Zm16 0h2v8h-2ZM6 9a6 6 0 0 1 2.2-4.6L6.8 2.5l.8-.6L9 3.9a6 6 0 0 1 6 0l1.4-2 .8.6-1.4 1.9A6 6 0 0 1 18 9Z"/><circle cx="9" cy="6.5" r=".8" fill="var(--bg-app)"/><circle cx="15" cy="6.5" r=".8" fill="var(--bg-app)"/></svg>;
}
export function InstallSpotlight() {
  const [hidden, setHidden] = useState(() => standalone() || installed);
  useEffect(() => {const hide = () => setHidden(true); window.addEventListener('appinstalled', hide); return () => window.removeEventListener('appinstalled', hide);}, []);
  if (hidden) return null;
  return <section className="install-spotlight" aria-labelledby="install-title"><div className="install-campaign-copy"><p className="eyebrow">A TUA LIGA NO TEU TELEMÓVEL</p><h2 id="install-title">Instala já a <em>APP.</em></h2><p>A tua carta e os teus jogos, sempre contigo.</p><div className="install-platforms">{(['ios','android'] as const).map(platform => <button key={platform} type="button" data-install-platform={platform} aria-haspopup="dialog" onClick={() => installHelp(platform)}><PlatformIcon ios={platform === 'ios'}/><span><small>Para o teu {platform === 'ios' ? 'iPhone' : 'Android'}</small><strong>Instalar no {platform === 'ios' ? 'iOS' : 'Android'}</strong></span><Icon name="arrow"/></button>)}</div><span className="install-campaign-note">Grátis. A tua liga à distância de um toque.</span></div><div className="install-art" aria-hidden="true"><div className="install-orbit orbit-one"/><div className="install-orbit orbit-two"/><span className="install-floating floating-card"><Icon name="profile"/>A TUA CARTA</span><span className="install-floating floating-match"><Icon name="games"/>PRÓXIMO JOGO</span><div className="install-phone"><div className="phone-camera"/><div className="phone-screen"><img className="phone-app-icon" src="./assets/pwa/icon-192.png" alt=""/><strong>PELADINHAS<small>CARDS</small></strong><div className="phone-mini-card"><img src="./assets/logo.svg" alt=""/><span>A TUA<br/><b>LIGA.</b></span><div className="phone-card-line"/></div><div className="phone-dock">{['home','games','missions','profile'].map(name => <Icon key={name} name={name}/>)}</div></div></div><span className="install-art-label">DO CAMPO PARA O TEU ECRÃ.</span></div></section>;
}
export function PwaStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [worker, setWorker] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    const clean = new URL(location.href);
    if (clean.searchParams.has('_reconnect')) {clean.searchParams.delete('_reconnect'); history.replaceState(history.state,'',clean);}
    const connection = () => setOnline(navigator.onLine);
    const beforeInstall = (event: Event) => {event.preventDefault(); prompt = event as InstallPrompt;};
    const onInstalled = () => {installed = true; prompt = null;};
    const help = () => installHelp();
    window.addEventListener('online', connection); window.addEventListener('offline', connection);
    window.addEventListener('beforeinstallprompt', beforeInstall); window.addEventListener('appinstalled', onInstalled); window.addEventListener('peladinhas-install', help);
    let registration: ServiceWorkerRegistration | undefined;
    let alive = true;
    const disposers: (() => void)[] = [];
    const check = () => {if (registration?.waiting && alive) setWorker(registration.waiting);};
    if ('serviceWorker' in navigator && window.isSecureContext && !import.meta.env.DEV) {
      void navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'}).then(reg => {
        registration = reg; check();
        const found = () => {const installing = reg.installing; const state = () => {if (installing?.state === 'installed' && navigator.serviceWorker.controller) check();}; installing?.addEventListener('statechange', state); disposers.push(() => installing?.removeEventListener('statechange', state));};
        reg.addEventListener('updatefound', found); disposers.push(() => reg.removeEventListener('updatefound', found));
      }).catch(error => console.warn('Instalação offline indisponível', error));
    }
    const visible = () => {if (document.visibilityState === 'visible') {check(); void registration?.update().catch(() => {});}};
    document.addEventListener('visibilitychange', visible);
    return () => {alive = false; for (const dispose of disposers) dispose(); window.removeEventListener('online', connection); window.removeEventListener('offline', connection); window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', onInstalled); window.removeEventListener('peladinhas-install', help); document.removeEventListener('visibilitychange', visible);};
  }, []);
  return <>{!online && <div id="connection-status" className="connection-status" role="status">Sem ligação. Volta a ligar-te para atualizar a liga e guardar alterações.</div>}{worker && <aside id="app-update" className="app-update" aria-label="Atualização da aplicação"><div><strong>A tua liga tem novidades.</strong><p>Guarda o que estás a fazer antes de atualizar.</p></div><div className="actions"><button type="button" className="btn btn-primary" data-update disabled={updating} onClick={() => {setUpdating(true); navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), {once: true}); worker.postMessage({type: 'ACTIVATE_UPDATE'});}}>Atualizar</button><button type="button" className="btn btn-ghost" data-later onClick={() => setWorker(null)}>Mais tarde</button></div></aside>}</>;
}
