import './screen.css';
import './football.css';
import '@fontsource-variable/oxanium';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './polish-v2.css';
import './console.css';
import './compact-layout.css';
import './stadium-console.css';
import {bonusSummaryMarkup} from './bonus-summary.ts';
import {linePrizes} from './line-prizes.ts';
import {autoSpinCount,autoSpinCounts} from './autospin.ts';
import {installSpaceContinuation,lockContinuation} from './continuation.ts';
import {config,type Mode,type SymbolId} from '../src/config.ts';
import {createSession,execute,setBet,renewSeed,topUp,validateSession,restoreSession,acknowledgeRetrigger,prizeClass,type Session,type Command,type HistoryRound} from '../src/session.ts';
import type {SpinResult} from '../src/engine.ts';
import {modeTitles,powerTitles,symbolArt,symbolMarkup,previewBoard,preloadArt,bonusArt} from './theme.ts';
import {presentSpin,presentBonusActivation,powerEmblemMarkup,type Snapshot} from './presentation.ts';
import {rulesView} from './rules-view.ts';
import {celebrateWin} from './win-celebration.ts';
import {winTierIndex,winTiers} from './win-tiers.ts';
import {audioDefaults,configureAudio,unlockAudio,audioCue,setAudioScene,setAudioFreeSpins,stopEffects,victoryAudio,type AudioSettings} from './audio.ts';

import {externalWallet,sessionKey,prepareWallet,executeWallet,walletCommitted,newBrowserSession,expandEmbedded,hasPendingWallet,parentOrigin} from './wallet.ts';
const KEY=sessionKey,PREFS=externalWallet?KEY+':preferences':'slot-preferences-v1';
type Speed='normal'|'fast'|'super';
interface Preferences extends AudioSettings {bonusHunt:boolean;speed:Speed;autoFs:boolean;reduced:boolean;lines:boolean;sound:boolean}
const defaultPreferences:Preferences={bonusHunt:false,speed:'normal',autoFs:true,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,lines:true,...audioDefaults};
let prefs={...defaultPreferences};try{const p=JSON.parse(localStorage.getItem(PREFS)??'{}');prefs={bonusHunt:p.bonusHunt===true,speed:['normal','fast','super'].includes(p.speed)?p.speed:'normal',autoFs:typeof p.autoFs==='boolean'?p.autoFs:true,reduced:typeof p.reduced==='boolean'?p.reduced:defaultPreferences.reduced,lines:typeof p.lines==='boolean'?p.lines:true,sound:typeof p.sound==='boolean'?p.sound:true,masterVolume:p.masterVolume??audioDefaults.masterVolume,musicVolume:p.musicVolume??audioDefaults.musicVolume,effectsVolume:p.effectsVolume??audioDefaults.effectsVolume,ambienceVolume:p.ambienceVolume??audioDefaults.ambienceVolume};}catch{/* Use defaults if preferences cannot be decoded. */}
configureAudio(prefs);
document.addEventListener('pointerdown',()=>unlockAudio(),{passive:true});
document.addEventListener('keydown',()=>unlockAudio());
document.addEventListener('click',event=>{const button=(event.target as HTMLElement).closest('button');if(button&&!button.disabled)audioCue(button.id==='minus'||button.id==='plus'?'bet':'ui',button.id==='minus'?-1:1);});
let session:Session,storageError='';
try{const stored=localStorage.getItem(KEY);session=stored?restoreSession(JSON.parse(stored)):newBrowserSession();validateSession(session);if(!stored||JSON.parse(stored).configVersion!==session.configVersion)localStorage.setItem(KEY,JSON.stringify(session));}
catch(error){storageError=error instanceof Error?error.message:String(error);session=newBrowserSession();}
let busy=false,reviewPending=false,assetsReady=false,autoTimer:ReturnType<typeof setTimeout>|undefined;
let autoPlaying=false,autoRemaining=0,autoFsPaused=false;
let finishAnimation:(()=>void)|undefined,historyPage=0,historyFilter='all',lastFocus:HTMLElement|null=null;
let interruptPresentation:(()=>void)|undefined;
let bonusEntryWaiting=false;
let finishSummaryCount:(()=>void)|undefined;
const BONUS_ENTRY_KEY=externalWallet?KEY+':bonus-entry':'slot-bonus-entry-v1';
function bonusEntryId(){const row=session.history[0];return row?`${row.id}:${row.date}:${row.mode}`:'';}
function needsBonusEntry(){return !!session.active&&session.history[0].spins.filter(s=>s.mode!=='base').length<=1&&localStorage.getItem(BONUS_ENTRY_KEY)!==bonusEntryId();}
// Presentation follows entry -> free spins -> final win -> summary -> base.
let bonusView:Pick<NonNullable<Session['active']>,'mode'|'remaining'|'totalFreeSpins'>|null=session.active&&!needsBonusEntry()?{...session.active}:null;
async function showBonusEntry(mode:'normal'|'superior'){
  if(!needsBonusEntry())return;bonusEntryWaiting=true;cancelAuto();setAudioScene('entry');audioCue('bonus',mode==='superior'?4:3);
  const explanation=mode==='normal'
    ?'Recebeste 10 jogadas grátis! Os Wilds aparecem com mais frequência e têm mais hipóteses de roubar poderes aos jogadores premium. O multiplicador global mantém-se entre jogadas e 3 Scatters dão mais 5 free spins.'
    :'Recebeste 10 jogadas grátis no bónus superior! Os Wilds roubam sempre um poder quando têm um premium ao lado e podem ficar fixos até ao fim. O global acumula entre jogadas e 3 Scatters dão mais 5 free spins.';
  modal('Bónus conquistado!',`<div class="bonus-entry-stage"><div class="bonus-entry-rays" aria-hidden="true"></div><img src="${bonusArt[mode]}" alt=""><span class="eyebrow">${mode==='normal'?'3 SCATTERS':'4 SCATTERS'} · A FINAL ESPERA POR TI</span><h3>${modeName(mode)}</h3><strong>10 FREE SPINS</strong><p>${explanation}</p><small>Aposta fixa: ${money(session.history[0].bet)} · sem custo adicional pelos FS</small><button id="enter-bonus" class="primary">CONTINUAR</button><span class="bonus-entry-manual">O bónus começa quando quiseres.</span></div>`,'bonus-entry');
  $('modal').classList.toggle('reduced-entry',prefs.reduced);
  await new Promise<void>(resolve=>{$('enter-bonus').onclick=()=>{localStorage.setItem(BONUS_ENTRY_KEY,bonusEntryId());bonusEntryWaiting=false;setAudioScene(mode);bonusView=session.active?{...session.active}:null;if(bonusView&&session.history[0].mode!=='base'&&session.history[0].spins.length===1){bonusView.remaining=config.freeSpins;bonusView.totalFreeSpins=config.freeSpins;}renderFreeSpins();$<HTMLDialogElement>('modal').close();render();resolve();};});
}
let selectedPayline:number|undefined;
let linesPresented=false;
let retriggerTimer:ReturnType<typeof setTimeout>|undefined,retriggerCountdown:ReturnType<typeof setInterval>|undefined,retriggerClosing=false;
const money=(cents:number)=>(cents/100).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2});
const x=(paid:number,bet:number)=>(paid/bet).toLocaleString('pt-PT',{maximumFractionDigits:2})+'×';
const modeName=(mode:Mode)=>modeTitles[mode];
const escape=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML=`<main class="machine">
  <div class="stadium-atmosphere" aria-hidden="true"></div>
  <header class="topbar"><div class="brand"><img class="brand-emblem" src="${new URL('./assets/football/brand-mark.svg',document.baseURI).href}" alt=""><div><h1><span>FUTEBOL</span> DE BAIRRO</h1><small>NOITE DE GLÓRIA</small></div></div><div class="actions"><button id="history">Histórico</button><button id="settings">Definições</button><button id="rules">Regras</button><button id="fullscreen" class="icon-button" aria-label="Ecrã inteiro" title="Ecrã inteiro">⛶</button></div></header>
  <div class="game-shell"><div class="arena"><aside class="slot-sidebar" aria-label="Estado do bónus"><section class="multiplier-tower" aria-label="Multiplicador global"><div class="tower-cap">MULTIPLICADOR</div><span class="tower-caption">GLOBAL</span><div id="global" class="global-badge" data-value="1">Global ×1</div><div class="tower-power-key">${['P1','P2','P3','P4'].map(p=>`<span class="power-key ${p.toLowerCase()}" aria-label="${powerTitles[p]}">${powerEmblemMarkup(p)}</span>`).join('')}</div><span class="tower-foot">POR RONDA</span></section><section id="free-spins-panel" class="free-spins-panel" hidden><span>JOGADAS GRÁTIS</span><strong id="fs" data-remaining="0"></strong><small id="fs-total"></small></section></aside><section class="playfield" aria-label="Jogo">
    <div class="statusbar"><div class="status-left"><span id="mode" class="badge">Base</span><span id="round-note" class="muted">40 linhas · 4 × 6</span></div><span id="state" class="state-indicator">Pronto</span></div>
    <div class="reel-frame"><i class="frame-corner top-left" aria-hidden="true"></i><i class="frame-corner top-right" aria-hidden="true"></i><i class="frame-corner bottom-left" aria-hidden="true"></i><i class="frame-corner bottom-right" aria-hidden="true"></i><div id="board" class="board" role="group" aria-label="Tabuleiro de quatro linhas e seis colunas" tabindex="0"></div><span id="preview-label" class="preview-label">APRESENTAÇÃO · SEM JOGADA</span></div>
    <div class="message" role="status" aria-live="polite"><span id="message-emblem" aria-hidden="true"></span><strong id="message">Pronto para jogar</strong><span id="submessage">Escolhe a aposta e carrega em SPIN.</span></div>
  </section></div>
  <section class="console" aria-label="Controlos do jogo">
    <div class="console-top"><button id="bonus-shop" aria-label="Compra de bónus" popovertarget="bonus-shop-panel"><span aria-hidden="true">★</span><b>COMPRA<br>DE BÓNUS</b></button><div class="metrics"><div class="metric balance-module"><span>CRÉDITOS</span><strong id="balance"></strong><i class="metric-rule" aria-hidden="true"></i></div><div class="metric current-win"><span>GANHO DO SPIN</span><strong id="spin-pay">0,00</strong></div><div class="metric round-module"><span>TOTAL DA RONDA</span><strong id="round-pay">0,00</strong></div></div>
      <div class="controls"><div class="control bet-control"><label for="bet">APOSTA</label><div class="betgroup"><button id="minus" aria-label="Diminuir aposta">−</button><select id="bet" aria-label="Valor da aposta">${config.bets.map(b=>`<option value="${b}">${money(b)}</option>`).join('')}</select><button id="plus" aria-label="Aumentar aposta">+</button></div></div><div class="control speed-control"><label for="speed">VELOCIDADE</label><select id="speed"><option value="normal">Normal</option><option value="fast">Rápida</option><option value="super">Super-rápida</option></select></div><div class="spin-actions"><div class="spin-stack"><button id="spin" class="spin-button" aria-keyshortcuts="Space">SPIN</button></div><button id="autospin" class="autospin-trigger" aria-label="Spins automáticos" aria-haspopup="dialog" aria-controls="autospin-panel" aria-expanded="false"><span aria-hidden="true">↻</span><small id="autospin-count">AUTO</small></button></div></div>
    </div>
    <div class="console-bottom"><div class="buybar"><button id="bonus-hunt" aria-pressed="false" title="Bonus Hunt: custo 3×, chance de Scatters +50% no jogo base"><span class="hunt-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><g class="hunt-orbit" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M24 3a21 21 0 0 1 21 21M24 45A21 21 0 0 1 3 24"/><path d="m40 20 5 5 3-7M8 28l-5-5-3 7"/></g><circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m24 16 7 5-3 8h-8l-3-8zM24 12v4M12 24l5-3M36 24l-5-3M17 34l3-5M31 34l-3-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span><span class="hunt-copy"><b>BONUS HUNT</b><small>SCATTERS +50% · CUSTO 3×</small></span><span class="hunt-switch" aria-hidden="true"></span></button></div><div class="console-tools"><label class="main-volume" for="main-volume"><span aria-hidden="true">♫</span><input id="main-volume" aria-label="Volume geral no menu principal" type="range" min="0" max="100" value="${Math.round(prefs.masterVolume*100)}"><output id="main-volume-value">${Math.round(prefs.masterVolume*100)}%</output></label><button id="inspect">Último spin <span id="inspect-count">0 linhas</span></button></div></div>
  </section>
  </div>
  <footer class="footer"><span>CRÉDITOS FICTÍCIOS · v${config.version} · MÁX. 10 000×</span><span class="keyboard-hint">ESPAÇO para jogar e continuar</span><button id="statistics">RTP / sessão</button></footer>
  <section id="bonus-shop-panel" popover aria-labelledby="bonus-shop-title"><header><div><small>ESCOLHE A TUA FINAL</small><h2 id="bonus-shop-title">COMPRA DE BÓNUS</h2></div><button popovertarget="bonus-shop-panel" popovertargetaction="hide" aria-label="Fechar compras">×</button></header><p>10 free spins · aposta atual · créditos fictícios</p><div class="bonus-shop-options buybar"><button id="buy-normal"></button><button id="buy-superior"></button></div><small>Escolhe uma opção para veres os detalhes e confirmares a compra.</small></section>
  <div id="autospin-panel" popover="auto" role="dialog" aria-label="Configurar spins automáticos"><div class="autospin-heading"><strong>SPINS AUTOMÁTICOS</strong><button id="autospin-close" aria-label="Fechar spins automáticos">×</button></div><output id="autospin-selected" for="autospin-range">10</output><label for="autospin-range">Número de spins</label><input id="autospin-range" type="range" min="0" max="${autoSpinCounts.length-1}" step="1" value="0" aria-label="Número de spins automáticos" aria-valuetext="10 spins"><div class="autospin-scale"><span>10</span><span>100</span><span>500</span></div><p>Usa a velocidade selecionada. Free spins não descontam desta quantidade.</p><button id="autospin-start" class="primary">INICIAR 10 SPINS</button></div>
  <aside class="inspector-source" hidden><ul id="events"></ul><small id="line-count"></small><div id="lines"></div></aside>
  <dialog id="modal"><div class="dialoghead"><h2 id="modal-title"></h2><button id="close-modal" aria-label="Fechar">✕</button></div><div id="modal-content"></div></dialog><div id="toast" class="toast hidden" role="alert"></div>
  <section id="loading-screen" class="asset-loader" aria-label="Carregamento da arte"><img src="${new URL('./assets/football/brand-mark.svg',document.baseURI).href}" alt=""><h2>Futebol de Bairro</h2><p>Noite de Glória</p><progress id="asset-progress" max="11" value="0"></progress><span id="asset-status">A preparar o campo…</span><button id="asset-retry" class="hidden">Tentar novamente</button></section>
</main>`;

const globalObserver=new MutationObserver(()=>{const match=$('global').textContent?.match(/×\s*(\d+)/);$('global').dataset.value=match?.[1]??'1';$('global').dataset.wide=String((match?.[1].length??1)>=3);});
globalObserver.observe($('global'),{childList:true,subtree:true,characterData:true});

// Keep secondary controls alongside the smaller numeric displays.
const quickTools=document.createElement('div');quickTools.className='console-quick-tools';
quickTools.append($('bonus-hunt'),document.querySelector('.main-volume')!,$('inspect'));
document.querySelector('.console-top')!.insertBefore(quickTools,document.querySelector('.controls'));
document.querySelector('.console-bottom')!.remove();
function lastSpin(){return session.history[0]?.spins.at(-1);}
function savePrefs(){configureAudio(prefs);$<HTMLInputElement>('main-volume').value=String(Math.round(prefs.masterVolume*100));$('main-volume-value').textContent=Math.round(prefs.masterVolume*100)+'%';try{localStorage.setItem(PREFS,JSON.stringify(prefs));}catch{notify('Não foi possível guardar as preferências.');}$( 'speed').setAttribute('data-profile',prefs.speed);($<HTMLSelectElement>('speed')).value=prefs.speed;}
function notify(text:string){$('toast').textContent=text;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),4500);}
function persist(s:Session){let trimmed=false;while(true){try{localStorage.setItem(KEY,JSON.stringify(s));break;}catch(error){if(error instanceof DOMException&&error.name==='QuotaExceededError'&&s.history.length>1){s.history=s.history.slice(0,Math.max(1,s.history.length-25));trimmed=true;}else throw error;}}session=s;if(trimmed)notify('Histórico antigo reduzido para libertar espaço. A ronda atual foi preservada.');}
async function mutate(change:(s:Session)=>Session|Promise<Session>){
  const expected=session.revision;
  const transaction=async()=>{if(storageError)throw Error('Sessão indisponível. Exporta ou repõe a sessão nas definições.');const stored=localStorage.getItem(KEY);if(!stored)throw Error('Sessão removida noutra aba. Recarrega a página.');const current=restoreSession(JSON.parse(stored) as Session);if(current.revision!==expected){session=current;throw Error('Sessão atualizada noutra aba. Confirma o estado antes de jogar novamente.');}persist(await change(current));walletCommitted(session);};
  if(navigator.locks)await navigator.locks.request(KEY,transaction);else throw Error('Este browser não suporta o bloqueio local necessário. Usa Chrome, Edge ou Firefox atualizado.');
}
function drawBoard(result=lastSpin(),initial=false,snapshot?:Snapshot){
  const detail=result?.detail,board=snapshot?.board??(detail?(initial?detail.initial:detail.final):previewBoard);
  const sticky=new Set(snapshot?.sticky??[...(detail?.stickyBefore??[]),...(initial?[]:detail?.newSticky??[])]),winning=new Set(!initial&&prefs.lines&&(!linesPresented||selectedPayline!==undefined)?(detail?.lines.find(l=>l.line===selectedPayline)??detail?.lines[0])?.positions??[]:[]);
  $('board').classList.toggle('reduced',prefs.reduced);
  const visibleEvents=snapshot?.events??(!initial?detail?.events:[])??[];
  $('preview-label').hidden=!!detail;
  $('board').innerHTML=board.map((symbol,p)=>{const event=visibleEvents.find(e=>e.position===p);return `<div class="cell ${symbol.startsWith('P')?'premium':symbol==='W'?'wild':symbol==='S'?'scatter':''} ${sticky.has(p)?'sticky':''} ${winning.has(p)?'win':''} ${event?'powered-wild power-'+event.power:''}" ${event?`data-power="${event.power}"`:''} data-symbol="${symbol}" data-position="${p}" style="--column:${p%6}" aria-label="Linha ${Math.floor(p/6)+1}, coluna ${p%6+1}: ${symbol} · ${symbolArt[symbol].name}${sticky.has(p)?', fixo':''}${event?', poder '+powerTitles[event.power]:''}">${symbolMarkup(symbol)}${event?powerEmblemMarkup(event.power):''}</div>`;}).join('');
  if(!initial&&prefs.lines&&result&&selectedPayline!==undefined)drawPayline(result,selectedPayline);
}
function drawPayline(result:SpinResult,id?:number){
  const win=result.detail?.lines.find(l=>l.line===id)??result.detail?.lines[0];if(!win)return;
  const root=$('board');root.querySelectorAll('.payline-overlay').forEach(el=>el.remove());root.querySelectorAll<HTMLElement>('.cell').forEach(cell=>cell.classList.toggle('win',win.positions.includes(Number(cell.dataset.position))));const bounds=root.getBoundingClientRect(),points=win.positions.map(p=>{const cell=root.querySelector<HTMLElement>(`[data-position="${p}"]`)!.getBoundingClientRect();return {x:cell.x+cell.width/2-bounds.x,y:cell.y+cell.height/2-bounds.y};});
  const path=points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),color=['#f5cc72','#74c9ff','#9ce4c2','#d5a4f0','#ffaf86','#d8e69b','#9cb9ff','#f6a8ce'][(win.line-1)%8];
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('payline-overlay');svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);svg.setAttribute('aria-label',`Linha ${win.line}, ${win.length} símbolos`);
  svg.innerHTML=`<path d="${path}" fill="none" stroke="#06182b" stroke-width="6" opacity=".65"/><path d="${path}" fill="none" stroke="${color}" stroke-width="2" opacity=".8" stroke-linejoin="round"/>`;
  root.append(svg);
}
async function presentWinningLines(result:SpinResult,signal:AbortSignal){
  const lines=result.detail?.lines??[];
  if(!prefs.lines||!lines.length||signal.aborted)return;
  const root=$('board'),prizes=linePrizes(result),flights:Promise<unknown>[]=[],balloons:HTMLElement[]=[];
  const clear=()=>balloons.forEach(el=>{el.getAnimations().forEach(animation=>animation.cancel());el.remove();});
  signal.addEventListener('abort',clear,{once:true});root.classList.add('cycling-paylines');
  try{
    for(const [lineIndex,line] of lines.entries()){
      if(signal.aborted)break;
      drawPayline(result,line.line);audioCue('line',line.line);
      const bounds=root.getBoundingClientRect(),cells=line.positions.map(p=>root.querySelector<HTMLElement>(`[data-position="${p}"]`)!.getBoundingClientRect());
      const anchor=cells[Math.floor(cells.length/2)],balloon=document.createElement('span'),value=prizes[lineIndex],size=20+Math.min(12,Math.log2(1+value/result.bet)*2);
      balloon.className='line-prize-balloon';balloon.dataset.line=String(line.line);balloon.dataset.cents=String(value);
      balloon.textContent='+'+money(value);balloon.setAttribute('aria-label',`Linha ${line.line}: ${money(value)} créditos`);
      Object.assign(balloon.style,{left:`${Math.max(55,Math.min(bounds.width-55,anchor.x+anchor.width/2-bounds.x))}px`,top:`${Math.max(75,Math.min(bounds.height-20,anchor.y+anchor.height/2-bounds.y))}px`,fontSize:`${size}px`});
      balloon.dataset.level=value>=result.bet*10?'high':value>=result.bet?'medium':'small';root.append(balloon);balloons.push(balloon);
      const animation=balloon.animate(prefs.reduced?[{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.7},{opacity:0}]:[{opacity:0,transform:'translate(-50%,0) scale(.85)'},{opacity:1,transform:'translate(-50%,-9px) scale(1)',offset:.15},{opacity:1,transform:`translate(calc(-50% + ${lineIndex%2?8:-8}px),-44px) scale(1.03)`,offset:.65},{opacity:0,transform:`translate(calc(-50% + ${lineIndex%2?13:-13}px),-74px) scale(1.06)`}],{duration:prefs.reduced?450:950,easing:'linear',fill:'forwards'});
      flights.push(animation.finished.catch(()=>{}).finally(()=>balloon.remove()));
      root.dataset.winningLine=String(line.line);
      await new Promise<void>(resolve=>{
        const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);resolve();};
        const timer=setTimeout(finish,prefs.reduced?180:200);
        signal.addEventListener('abort',finish,{once:true});
        if(signal.aborted)finish();
      });
    }
    await Promise.all(flights);
  }finally{clear();signal.removeEventListener('abort',clear);linesPresented=true;root.classList.remove('cycling-paylines');delete root.dataset.winningLine;root.querySelectorAll('.payline-overlay').forEach(el=>el.remove());root.querySelectorAll('.cell.win').forEach(el=>el.classList.remove('win'));}
}
function renderFreeSpins(){
  const active=bonusView,panel=$('free-spins-panel');setAudioFreeSpins(active?.remaining??10);panel.hidden=!active;
  document.querySelector('.machine')!.classList.toggle('bonus-mode',!!active);
  const played=active?active.totalFreeSpins-active.remaining:0;
  $('fs').innerHTML=active?`<span class="fs-played">${played}</span><span class="fs-divider"> / </span><span class="fs-all">${active.totalFreeSpins}</span>`:'';
  $('fs').setAttribute('aria-label',`${played} spins rodados de ${active?.totalFreeSpins??0} totais`);
  $('fs-total').textContent='RODADOS / TOTAL';
  panel.classList.toggle('last-spins',!!active&&active.remaining<=3);panel.classList.toggle('retrigger-added',!!session.pendingRetrigger);
}
function baseSpinCost(){return session.bet*(prefs.bonusHunt?config.huntCostMultiplier:1);}
function render(){
  const r=lastSpin(),row=session.history[0],locked=autoPlaying||hasPendingWallet()||busy||reviewPending||!!session.active||!!session.pendingRetrigger||!!storageError;
  const visualMode=bonusView?.mode??'base';
  document.querySelector('.machine')!.classList.toggle('hunt-active',prefs.bonusHunt&&visualMode==='base');$('bonus-hunt').setAttribute('aria-pressed',String(prefs.bonusHunt));$<HTMLButtonElement>('bonus-hunt').disabled=locked||!assetsReady;$<HTMLButtonElement>('bonus-shop').disabled=locked||!assetsReady;
  $('mode').textContent=modeName(visualMode);$('round-note').textContent=session.active?'Aposta '+money(row.bet):'40 linhas · 4 × 6';renderFreeSpins();
  document.querySelector<HTMLElement>('.machine')!.dataset.mode=visualMode;
  $('state').textContent=storageError?'Sessão bloqueada':busy?'A apresentar':reviewPending?'Resumo':session.active?'Free spins':'Pronto';
  $('global').textContent='Global ×'+(r?.detail?.global??1);
  $('balance').textContent=money(session.balance);$('spin-pay').textContent=money(r?.paid??0);$('round-pay').textContent=money(row?.paid??0);
  $<HTMLSelectElement>('bet').querySelectorAll('option').forEach(option=>option.textContent=money(Number(option.value)*(prefs.bonusHunt&&visualMode==='base'?config.huntCostMultiplier:1)));
  $<HTMLSelectElement>('bet').value=String(session.bet);$<HTMLSelectElement>('bet').disabled=locked;
  $<HTMLButtonElement>('minus').disabled=locked||session.bet===config.bets[0];$<HTMLButtonElement>('plus').disabled=locked||session.bet===config.bets.at(-1);
  for(const m of ['normal','superior'] as const){const b=$<HTMLButtonElement>('buy-'+m),cost=session.bet*config.prices[m];b.innerHTML=`<span class="buy-art"><img src="${bonusArt[m]}" alt=""></span><span class="buy-label"><b>${modeName(m)}</b><small>10 FREE SPINS</small></span><span class="buy-price">${money(cost)}<small>${config.prices[m]}× APOSTA</small></span>`;b.setAttribute('aria-label',`Comprar ${modeName(m)}, ${money(cost)} créditos, ${config.prices[m]} vezes a aposta`);b.disabled=locked||!assetsReady||session.balance<cost;}
  const spinButton=$<HTMLButtonElement>('spin');spinButton.textContent=autoPlaying?'PARAR':busy?'CONCLUIR':session.pendingRetrigger?'NOVOS FS':reviewPending?'VER RESUMO':session.active?'PRÓXIMO FS':'SPIN';spinButton.setAttribute('aria-label',spinButton.textContent!);spinButton.title=spinButton.textContent!;spinButton.disabled=hasPendingWallet()||!assetsReady||!!storageError||!!session.pendingRetrigger||(!busy&&!reviewPending&&!session.active&&session.balance<baseSpinCost());
  $<HTMLSelectElement>('speed').value=prefs.speed;
  $<HTMLButtonElement>('autospin').disabled=!autoPlaying&&(!assetsReady||busy||reviewPending||!!session.active||!!storageError||hasPendingWallet()||session.balance<baseSpinCost());
  $('autospin').classList.toggle('running',autoPlaying);$('autospin').setAttribute('aria-label',autoPlaying?'Parar spins automáticos':'Spins automáticos');$('autospin-count').textContent=autoPlaying?String(autoRemaining):'AUTO';
  for(const id of ['history','settings','rules','inspect','statistics'])$<HTMLButtonElement>(id).disabled=autoPlaying||busy||!!session.pendingRetrigger;
  if(!busy)drawBoard();
  const events=r?.detail?.events??[];
  $('events').innerHTML=events.length?events.map(e=>`<li>W [${Math.floor(e.position/6)+1},${e.position%6+1}] → ${e.power}${e.factor>1?(e.operation==='add'?' +':' ×')+e.factor:''}${e.targets.length?' · '+e.targets.length+' posição/ões':''}</li>`).join(''):'<li>Sem poderes ativados.</li>';
  if(r?.retrigger)$('events').innerHTML+=`<li>Prolongamento: +${r.retrigger.awarded} FS</li>`;
  if(r?.metrics.newSticky)$('events').innerHTML+=`<li>${r.metrics.newSticky} wild(s) ficaram fixos.</li>`;
  $('line-count').textContent=String(r?.detail?.lines.length??0);
  $('inspect-count').textContent=(r?.detail?.lines.length??0)+' linhas';
  document.querySelector('.machine')!.classList.toggle('bonus-mode',!!bonusView);
  document.querySelector('.machine')!.classList.toggle('is-busy',busy);
  $('lines').innerHTML=r?.detail?.lines.length?r.detail.lines.map(l=>`<div class="line-item" tabindex="0" data-line="${l.line}">#${l.line} · ${l.length} ${l.symbol} · ${x(l.hundredths*(r.detail!.payoutScaleBps/10000),100)}${l.local>1?' · wild ×'+l.local:''}</div>`).join(''):'Sem combinações pagadoras.';
  $('lines').querySelectorAll<HTMLElement>('[data-line]').forEach(el=>{const highlight=()=>{const win=r?.detail?.lines.find(l=>l.line===Number(el.dataset.line));$('board').querySelectorAll('.cell').forEach(cell=>cell.classList.toggle('win',win?.positions.includes(Number((cell as HTMLElement).dataset.position))??false));};el.onmouseenter=highlight;el.onfocus=highlight;el.onmouseleave=()=>drawBoard();el.onblur=()=>drawBoard();});
}
function message(title:string,subtitle:string){$('message').textContent=title;$('submessage').textContent=subtitle;const power=Object.entries(powerTitles).find(([,name])=>name===title)?.[0];$('message-emblem').innerHTML=power?powerEmblemMarkup(power):'';document.querySelector<HTMLElement>('.message')!.dataset.power=power??'';}
function cancelAuto(){clearTimeout(autoTimer);autoTimer=undefined;}
function stopAutoSpins(reason='',pauseBonus=false){
  cancelAuto();autoPlaying=false;autoRemaining=0;if(pauseBonus&&session.active)autoFsPaused=true;render();if(reason)notify(reason);
}
function scheduleAuto(){
  cancelAuto();
  if(document.hidden||bonusEntryWaiting||needsBonusEntry()||session.pendingRetrigger||busy||reviewPending||hasPendingWallet()||storageError||!assetsReady||$<HTMLDialogElement>('modal').open)return;
  if(session.active){if(prefs.autoFs&&!autoFsPaused)autoTimer=setTimeout(()=>void play({type:'next'}),prefs.speed==='super'?120:prefs.speed==='fast'?250:450);return;}
  if(!autoPlaying)return;
  if(autoRemaining<=0){stopAutoSpins();return;}
  if(session.balance<baseSpinCost()){stopAutoSpins('Spins automáticos terminados: saldo insuficiente.');return;}
  autoTimer=setTimeout(()=>{if(autoPlaying&&autoRemaining>0&&!document.hidden)void play({type:'start',mode:'base',bonusHunt:prefs.bonusHunt});},prefs.speed==='super'?120:prefs.speed==='fast'?250:450);
}
function positionAutoPanel(){
  const panel=$('autospin-panel');if(!panel.matches(':popover-open'))return;
  const rect=$('autospin').getBoundingClientRect(),width=panel.offsetWidth,height=panel.offsetHeight;
  panel.style.left=Math.max(8,Math.min(innerWidth-width-8,rect.left+rect.width/2-width/2))+'px';panel.style.top=Math.max(8,rect.top-height-10)+'px';
}

function clearRetriggerTimers(){clearTimeout(retriggerTimer);clearInterval(retriggerCountdown);retriggerTimer=undefined;retriggerCountdown=undefined;}
function showRetrigger(){
  const pending=session.pendingRetrigger;if(!pending)return;clearRetriggerTimers();audioCue('retrigger');
  const mode=session.active?.mode==='superior'?'superior':'normal';
  modal('Prolongamento!',`<div class="retrigger-celebration"><div class="retrigger-rays" aria-hidden="true"></div><img src="${bonusArt[mode]}" alt="Bilhetes de prolongamento"><span class="eyebrow">O JOGO CONTINUA!</span><strong class="retrigger-award">+${pending.awarded}</strong><h3>FREE SPINS</h3><p>Mais ${pending.awarded} jogadas grátis · global e Wilds fixos mantidos.</p><button id="continue-retrigger" class="primary">CONTINUAR</button><small>Ou continua automaticamente em <span id="retrigger-countdown">10</span> s</small><div class="retrigger-progress" aria-hidden="true"><i></i></div></div>`,'retrigger');
  $('modal').classList.toggle('reduced-retrigger',prefs.reduced);
  $('modal-content').querySelector<HTMLElement>('.retrigger-celebration')!.onclick=()=>void finishRetrigger();
  const deadline=Date.now()+10000;
  retriggerCountdown=setInterval(()=>{const counter=document.getElementById('retrigger-countdown');if(counter)counter.textContent=String(Math.max(0,Math.ceil((deadline-Date.now())/1000)));},200);
  retriggerTimer=setTimeout(()=>void finishRetrigger(),10000);
}
async function finishRetrigger(){
  if(retriggerClosing)return;const pending=session.pendingRetrigger;if(!pending)return;
  retriggerClosing=true;
  try{await mutate(s=>acknowledgeRetrigger(s,pending));clearRetriggerTimers();if(session.pendingRetrigger){showRetrigger();return;}$<HTMLDialogElement>('modal').close();render();scheduleAuto();}
  catch(error){notify(error instanceof Error?error.message:String(error));if(session.pendingRetrigger)showRetrigger();}
  finally{retriggerClosing=false;}
}
function modal(title:string,html:string,kind='panel'){cancelAuto();lastFocus=document.activeElement as HTMLElement;$('modal-title').textContent=title;$('modal-content').innerHTML=html;const d=$<HTMLDialogElement>('modal');d.dataset.kind=kind;if(!d.open)d.showModal();if(['bonus-entry','retrigger','bonus-summary','summary','win'].includes(kind))lockContinuation();}
function closeModal(){if(bonusEntryWaiting)return;if(session.pendingRetrigger&&$<HTMLDialogElement>('modal').dataset.kind==='retrigger'){void finishRetrigger();return;}const d=$<HTMLDialogElement>('modal');d.close();lastFocus?.focus();scheduleAuto();}
function summary(row:HistoryRound){
  reviewPending=true;setAudioScene('summary');render();
  if(bonusView){modal('Apito final',bonusSummaryMarkup(row),'bonus-summary');$('summary-done').onclick=closeModal;animateBonusSummary(row);return;}
  const ratio=row.paid/row.bet,celebrate=row.paid>row.cost&&ratio>=20;
  const title=winTiers[winTierIndex(row.paid,row.bet)]?.name??'Retorno da ronda';
  modal(row.mode==='base'&&row.spins.length===1?'Resultado da ronda':'Ronda concluída',`${celebrate?`<div class="win-trophy"><img src="${symbolArt.P4.src}" alt="Troféu do bairro"></div>`:''}<div class="eyebrow">${celebrate?title:'Retorno da ronda'} · ${modeName(row.spins.at(-1)?.mode??row.mode)}${row.bonusHunt?' · Bonus Hunt':''}</div><div class="large-pay">${money(row.paid)} <small>créditos</small></div><p>Retorno: <strong>${x(row.paid,row.bet)}</strong> a aposta de referência.</p><p>Custo: ${money(row.cost)} · Resultado líquido: <strong class="${row.paid>=row.cost?'positive':'negative'}">${money(row.paid-row.cost)}</strong></p><p class="muted">${row.spins.length} spin(s) · saldo atual ${money(session.balance)}</p><button id="summary-done" class="primary">CONTINUAR</button>`,bonusView?'bonus-summary':celebrate?'win':'summary');
  $('summary-done').onclick=closeModal;
  if(bonusView)animateBonusSummary(row);else audioCue('final');
}
function animateBonusSummary(row:HistoryRound){
  const dialog=$<HTMLDialogElement>('modal'),amount=dialog.querySelector<HTMLElement>('.large-pay')!,button=$<HTMLButtonElement>('summary-done');
  dialog.classList.toggle('reduced-summary',prefs.reduced);dialog.dataset.phase='arriving';
  dialog.classList.remove('summary-performance-lite');
  amount.innerHTML='<span class="summary-counter"></span> <small>CRÉDITOS</small>';
  const counter=amount.querySelector<HTMLElement>('.summary-counter')!,started=performance.now(),duration=prefs.reduced?450:3200;
  button.disabled=true;let completed=false,lastText='',previousFrame=0,slowFrames=0,performanceLite=false;
  const finish=()=>{if(completed)return;completed=true;counter.textContent=money(row.paid);dialog.dataset.phase='ready';button.disabled=false;finishSummaryCount=undefined;lockContinuation();audioCue('final');};finishSummaryCount=finish;
  const format=new Intl.NumberFormat('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2});
  function tick(now:number){
    if(completed||!dialog.open||dialog.dataset.kind!=='bonus-summary'||!counter.isConnected)return;
    if(previousFrame&&now-previousFrame>22)slowFrames++;
    previousFrame=now;
    if(!performanceLite&&slowFrames>=3){performanceLite=true;dialog.classList.add('summary-performance-lite');}
    const progress=Math.min(1,(now-started)/duration);
    const text=format.format((prefs.reduced?row.paid:Math.floor(row.paid*progress))/100);
    if(text!==lastText){lastText=text;counter.textContent=text;}
    if(progress<1)requestAnimationFrame(tick);
    else finish();
  }
  requestAnimationFrame(tick);
}
async function play(command:Command){
  if(!assetsReady||busy||reviewPending||session.pendingRetrigger||$<HTMLDialogElement>('modal').open)return;cancelAuto();selectedPayline=undefined;linesPresented=false;busy=true;render();
  unlockAudio();stopEffects();if(session.active?.remaining===1)audioCue('last');
  try{await mutate(s=>executeWallet(s,command));const result=lastSpin()!;if(autoPlaying&&command.type==='start'&&command.mode==='base')autoRemaining=Math.max(0,autoRemaining-1);renderFreeSpins();$('autospin-count').textContent=autoPlaying?String(autoRemaining):'AUTO';
    const controller=new AbortController();finishAnimation=()=>{controller.abort();stopEffects();};interruptPresentation=()=>{controller.abort();stopEffects();};
    if(command.type==='start'&&command.mode!=='base'){
      document.querySelector<HTMLElement>('.machine')!.dataset.presentation='purchase-activation';$('round-note').textContent='Ativação da compra · '+(command.mode==='normal'?3:4)+' bilhetes';
      await presentBonusActivation(command.mode,{speed:prefs.speed,reduced:prefs.reduced,signal:controller.signal,draw:snapshot=>drawBoard(result,true,snapshot),message});
      delete document.querySelector<HTMLElement>('.machine')!.dataset.presentation;
      document.querySelector<HTMLElement>('.machine')!.dataset.mode='base';$('mode').textContent=modeName('base');$('round-note').textContent='Free spin 1 de '+config.freeSpins+' · aposta '+money(session.bet);
      await showBonusEntry(command.mode);
    }
    await presentSpin(result,{speed:prefs.speed,reduced:prefs.reduced,signal:controller.signal,draw:snapshot=>drawBoard(result,true,snapshot),message});
    drawBoard(result);
    if(result.mode!=='base'&&bonusView){bonusView={...result.next};renderFreeSpins();}
    await presentWinningLines(result,controller.signal);
    await celebrateWin(result.paid,session.history[0].bet,{speed:prefs.speed,reduced:prefs.reduced,signal:controller.signal,control:finish=>finishAnimation=finish,cue:tier=>victoryAudio(tier)});
    finishAnimation=undefined;interruptPresentation=undefined;
    busy=false;$('board').classList.remove('busy');render();const row=session.history[0];
    message(prizeClass(result.paid,row.bet,row.paid===config.cap*row.bet),`Spin ${money(result.paid)} · ${x(result.paid,row.bet)}${session.active?' · '+session.active.remaining+' FS por jogar':row.paid<row.cost?' · retorno inferior ao custo da ronda':''}`);
    if(result.next.done&&(row.spins.length>1||row.mode!=='base'))summary(row);
    else if(result.retrigger&&session.pendingRetrigger)showRetrigger();
    else if(session.active&&result.mode==='base'){
      await showBonusEntry(session.active.mode as 'normal'|'superior');scheduleAuto();
    }else scheduleAuto();
  }catch(error){autoPlaying=false;autoRemaining=0;cancelAuto();interruptPresentation?.();interruptPresentation=undefined;finishAnimation=undefined;busy=false;$('board').classList.remove('busy');render();notify(error instanceof Error?error.message:String(error));}
}
function buy(mode:'normal'|'superior'){
  if(busy||session.active||reviewPending)return;
  $('bonus-shop-panel').hidePopover();
  modal(modeName(mode),`<div class="bonus-hero"><img src="${bonusArt[mode]}" alt=""><span class="eyebrow">${mode==='normal'?'Bónus normal':'Bónus superior'}</span><h3>${config.freeSpins} FREE SPINS</h3></div><p>Aposta fixa ${money(session.bet)}</p><div class="large-pay">${money(session.bet*config.prices[mode])}</div><p class="muted">Créditos fictícios · ${config.prices[mode]}× a aposta · sem prémio mínimo garantido.</p><div class="actions"><button id="cancel-buy">Cancelar</button><button id="confirm-buy" class="primary">Confirmar compra</button></div>`,'bonus');
  $('cancel-buy').onclick=closeModal;$('confirm-buy').onclick=()=>{closeModal();void play({type:'start',mode});};
}
async function changeBet(value:number){if(busy||reviewPending)return;try{await mutate(s=>setBet(s,value));render();}catch(error){render();notify(String(error));}}
function settings(){
  modal('Definições',`<div class="settings"><section class="seed-settings"><h3>Sequência do jogo</h3><p>A seed e o avanço do RNG mantêm-se entre sessões neste browser.</p><code id="current-seed">${escape(session.seed?.value??'Sessão antiga: estado RNG preservado')}</code><small>Geração ${session.seed?.generation??0} · ${session.counter} rondas</small><button id="renew-seed" ${busy||reviewPending||session.active||hasPendingWallet()?'disabled':''}>Renovar seed</button><p class="setting-note">Disponível entre rondas. Não altera o saldo nem apaga o histórico.</p></section><label>Ativar áudio<input id="win-sound" type="checkbox" ${prefs.sound?'checked':''}></label>${(['masterVolume','musicVolume','effectsVolume','ambienceVolume'] as const).map((key,i)=>`<label class="audio-setting">${['Volume geral','Música','Efeitos','Ambiente'][i]}<input aria-label="${['Volume geral','Música','Efeitos','Ambiente'][i]}" data-audio="${key}" type="range" min="0" max="100" value="${Math.round(prefs[key]*100)}"><output>${Math.round(prefs[key]*100)}%</output></label>`).join('')}<label>Avançar free spins automaticamente<input id="auto-fs" type="checkbox" ${prefs.autoFs?'checked':''}></label><label>Movimento reduzido<input id="reduced" type="checkbox" ${prefs.reduced?'checked':''}></label><label>Destacar linhas vencedoras<input id="show-lines" type="checkbox" ${prefs.lines?'checked':''}></label><p class="setting-note">Velocidade e preferências só alteram a apresentação. Música, efeitos e ambiente originais sintetizados no browser. O áudio inicia após a primeira interação. A sessão fica neste browser, neste endereço.</p><div class="actions"><button id="topup" ${busy||session.active||reviewPending||storageError?'disabled':''}>Adicionar 1 000 créditos de teste</button><button id="export-session">Exportar sessão</button><button id="reset-session" class="danger" ${busy||session.active||reviewPending?'disabled':''}>Repor sessão</button></div><p class="setting-note">Reposições de saldo: ${session.topups}. Repor sessão apaga saldo e histórico e inicia uma sequência nova.</p>${storageError?`<p class="notice">${escape(storageError)}</p>`:''}</div>`);
  for(const [id,key] of [['auto-fs','autoFs'],['reduced','reduced'],['show-lines','lines'],['win-sound','sound']] as const)$<HTMLInputElement>(id).onchange=e=>{prefs[key]=(e.target as HTMLInputElement).checked;savePrefs();render();};
  $('modal-content').querySelectorAll<HTMLInputElement>('[data-audio]').forEach(input=>input.oninput=()=>{const key=input.dataset.audio as 'masterVolume'|'musicVolume'|'effectsVolume'|'ambienceVolume';prefs[key]=Number(input.value)/100;input.parentElement!.querySelector('output')!.textContent=input.value+'%';savePrefs();});
  $('topup').hidden=externalWallet;$('reset-session').hidden=externalWallet;
  $('renew-seed').onclick=async()=>{try{await mutate(s=>renewSeed(s,crypto.randomUUID(),new Date().toISOString()));notify('Nova seed criada. Saldo e histórico mantidos.');settings();}catch(error){notify(String(error));}};
  $('topup').onclick=async()=>{try{await mutate(topUp);render();notify('Adicionados 1 000 créditos fictícios.');closeModal();}catch(error){notify(String(error));}};
  $('export-session').onclick=()=>{const raw=localStorage.getItem(KEY)??JSON.stringify(session);const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='slot-sessao-local.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('reset-session').onclick=()=>{modal('Repor sessão local?',`<p>Apaga o histórico local e inicia uma sessão com 1 000 créditos fictícios e uma sequência nova.</p><div class="actions"><button id="cancel-reset">Cancelar</button><button id="confirm-reset" class="danger">Apagar e repor</button></div>`);$('cancel-reset').onclick=settings;$('confirm-reset').onclick=async()=>{try{await navigator.locks.request('slot-local-session',()=>{let rev=0;try{const previous=JSON.parse(localStorage.getItem(KEY)??'{}');if(Number.isSafeInteger(previous.revision)&&previous.revision>=0)rev=previous.revision;}catch{/* Corrupt data can be reset after explicit confirmation. */}const next=createSession(crypto.randomUUID());next.revision=rev+1;persist(next);storageError='';});render();message('Sessão reposta','1 000 créditos fictícios disponíveis.');closeModal();}catch(error){notify(String(error));}};};
}
function showHistory(){
  const filtered=session.history.filter(r=>historyFilter==='all'||historyFilter==='natural'&&r.mode==='base'&&r.spins.some(s=>s.mode!=='base')||r.mode===historyFilter);
  historyPage=Math.max(0,Math.min(historyPage,Math.ceil(filtered.length/20)-1));const page=filtered.slice(historyPage*20,historyPage*20+20);
  modal('Histórico de rondas',`<div class="actions"><select id="history-filter" aria-label="Filtrar histórico"><option value="all">Todas</option><option value="base">Base</option><option value="normal">Compra normal</option><option value="superior">Compra superior</option><option value="natural">Bónus natural</option></select><span class="muted">${filtered.length} ronda(s) · últimas 500</span></div><div class="table-wrap"><table><thead><tr><th>Ronda / modo</th><th>Aposta</th><th>Custo</th><th>Pago</th><th>Líquido</th><th></th></tr></thead><tbody>${page.map(r=>`<tr class="history-row"><td>#${r.id} · ${modeName(r.mode)}${r.bonusHunt?' · Bonus Hunt':''}${r.complete?'':' · em curso'}</td><td>${money(r.bet)}</td><td>${money(r.cost)}</td><td>${money(r.paid)}</td><td class="${r.paid>=r.cost?'positive':'negative'}">${money(r.paid-r.cost)}</td><td><button data-round="${r.id}" aria-label="Ver ronda ${r.id}">Ver</button></td></tr>`).join('')||'<tr><td colspan="6">Ainda não existem rondas.</td></tr>'}</tbody></table></div><div class="pager"><button id="previous-page" ${historyPage===0?'disabled':''}>Anterior</button><span>Página ${historyPage+1}</span><button id="next-page" ${(historyPage+1)*20>=filtered.length?'disabled':''}>Seguinte</button></div>`);
  $<HTMLSelectElement>('history-filter').value=historyFilter;$<HTMLSelectElement>('history-filter').onchange=e=>{historyFilter=(e.target as HTMLSelectElement).value;historyPage=0;showHistory();};
  $('previous-page').onclick=()=>{historyPage--;showHistory();};$('next-page').onclick=()=>{historyPage++;showHistory();};
  $('modal-content').querySelectorAll<HTMLButtonElement>('[data-round]').forEach(b=>b.onclick=()=>historyDetail(Number(b.dataset.round),0));
}
function historyDetail(id:number,position:number){
  const row=session.history.find(r=>r.id===id);if(!row)return;const result=row.spins[position],detail=result.detail!;
  modal('Ronda #'+row.id,`<p class="muted">${escape(new Date(row.date).toLocaleString('pt-PT'))} · configuração ${escape(row.configVersion)} · ${row.complete?'concluída':'em curso'}</p><p>Custo ${money(row.cost)} · Pago ${money(row.paid)} · Líquido ${money(row.paid-row.cost)}</p><label>Spin <select id="history-spin">${row.spins.map((s,i)=>`<option value="${i}">${i+1} · ${modeName(s.mode)} · ${money(s.paid)}</option>`).join('')}</select></label><h3>Tabuleiro final</h3><div class="modal-grid">${detail.final.map(s=>`<span>${symbolMarkup(s)}</span>`).join('')}</div><p>${detail.lines.length} linhas · ${detail.events.length} poderes${result.retrigger?' · +'+result.retrigger.awarded+' FS por retrigger':''} · Pagamento ${money(result.paid)}</p><details><summary>Eventos e tabuleiros completos</summary><pre>${escape(JSON.stringify(result,null,2))}</pre></details><p class="setting-note">Rever usa o registo guardado, sem gerar jogadas ou alterar saldo.</p><button id="back-history">Voltar ao histórico</button>`);
  $<HTMLSelectElement>('history-spin').value=String(position);$<HTMLSelectElement>('history-spin').onchange=e=>historyDetail(id,Number((e.target as HTMLSelectElement).value));$('back-history').onclick=showHistory;
}
function rules(){
  modal('Regras e pagamentos',rulesView('base'));
  const wire=()=>{$('modal-content').querySelectorAll<HTMLButtonElement>('[data-rules-mode]').forEach(button=>button.onclick=()=>{const mode=button.dataset.rulesMode as Mode;$('modal-content').innerHTML=rulesView(mode);wire();$('modal-content').querySelector<HTMLButtonElement>('[data-rules-mode="'+mode+'"]')?.focus();});};wire();
}
function inspectSpin(){
  const result=lastSpin(),row=session.history[0];
  if(!result?.detail){modal('Último spin','<p class="muted">Joga um spin para consultar poderes, símbolos e linhas pagadoras.</p>');return;}
  modal('Último spin',`<div class="eyebrow">${modeName(result.mode)} · ronda #${row.id}</div><p>Pago <strong>${money(result.paid)}</strong> · ${x(result.paid,row.bet)} · global <strong>×${result.detail.global}</strong></p><div class="inspector-grid"><section><h3>Poderes e eventos</h3><ul class="events">${$('events').innerHTML}</ul></section><section><h3>Linhas pagadoras (${result.detail.lines.length})</h3><div class="line-list">${$('lines').innerHTML}</div></section></div><div class="power-strip"><span><strong>P1</strong><br>Wild ×2 × global</span><span><strong>P2</strong><br>Expansão vertical</span><span><strong>P3</strong><br>2–10 conversões</span><span><strong>P4</strong><br>Global +2 / +3 / +5</span></div><p class="setting-note">Roubo em cima, baixo, esquerda e direita. As linhas mostram o valor antes do arredondamento do pagamento total do spin.</p>`);
  $('modal-content').querySelectorAll<HTMLElement>('[data-line]').forEach(line=>{line.setAttribute('role','button');const select=()=>{selectedPayline=Number(line.dataset.line);closeModal();cancelAuto();drawBoard(result);message(`Linha ${selectedPayline}`, 'Trajeto da sequência paga. PRÓXIMO FS ou SPIN continua o jogo.');};line.onclick=select;line.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}};});
}
function statistics(){
  const completed=session.history.filter(r=>r.complete),cost=completed.reduce((sum,r)=>sum+r.cost,0),paid=completed.reduce((sum,r)=>sum+r.paid,0);
  modal('RTP e sessão local',`<div class="eyebrow">Configuração ${config.version}</div><p>RTP da versão ${config.version}: <strong>não medido após o Bonus Hunt</strong>.</p><p class="setting-note">Os relatórios de 63,67% / 65,46% / 65,55% pertencem à versão 0.3.1. Não houve recalibração nem nova medição nesta alteração.</p><div class="session-stats"><div><small>Rondas concluídas</small><strong>${completed.length}</strong></div><div><small>Total apostado</small><strong>${money(cost)}</strong></div><div><small>Total pago</small><strong>${money(paid)}</strong></div></div><p>Retorno deste histórico: <strong>${cost?(paid/cost*100).toLocaleString('pt-PT',{maximumFractionDigits:2})+'%':'—'}</strong></p><p class="setting-note">Calculado apenas sobre as rondas concluídas ainda no histórico (até 500); pode incluir versões anteriores. Uma ronda em curso está excluída. Reposições de saldo são créditos de teste e não entram na aposta.</p>`);
}
async function toggleFullscreen(){
  if(externalWallet){try{await expandEmbedded();}catch(error){notify(String(error));}return;}
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else notify('Ecrã inteiro indisponível neste browser.');}catch{notify('O browser não permitiu entrar em ecrã inteiro.');}
}
$('inspect').onclick=inspectSpin;$('statistics').onclick=statistics;$('fullscreen').onclick=()=>void toggleFullscreen();
window.addEventListener('message',event=>{if(!externalWallet||event.source!==parent)return;try{if(event.origin!==parentOrigin()||event.data?.channel!=='football-slot:v1')return;if(event.data.kind==='balance'&&Number.isSafeInteger(event.data.balance)&&event.data.balance>=0&&!busy&&!hasPendingWallet()&&!storageError){void mutate(s=>({...s,balance:event.data.balance,revision:s.revision+1})).then(render).catch(()=>{});return;}if(event.data.kind!=='expanded')return;$('fullscreen').setAttribute('aria-label',event.data.expanded?'Reduzir slot':'Expandir slot');$('fullscreen').title=event.data.expanded?'Reduzir slot':'Expandir slot';document.body.dataset.expanded=String(event.data.expanded);}catch{/* Invalid origins are ignored. */}});
document.addEventListener('keydown',event=>{if(externalWallet&&event.key==='Escape'&&document.body.dataset.expanded==='true'&&!$<HTMLDialogElement>('modal').open)void expandEmbedded();});
document.addEventListener('fullscreenchange',()=>{const button=$('fullscreen');button.setAttribute('aria-label',document.fullscreenElement?'Sair do ecrã inteiro':'Ecrã inteiro');button.title=document.fullscreenElement?'Sair do ecrã inteiro':'Ecrã inteiro';});
$('spin').onclick=()=>{if(autoPlaying){stopAutoSpins('',true);return;}autoFsPaused=false;if(busy){finishAnimation?.();return;}if(reviewPending){summary(session.history[0]);return;}void play(session.active?{type:'next'}:{type:'start',mode:'base',bonusHunt:prefs.bonusHunt});};
$('autospin').onclick=()=>{
  if(autoPlaying){stopAutoSpins('',true);return;}
  const panel=$('autospin-panel');if(panel.matches(':popover-open'))panel.hidePopover();else{panel.showPopover();positionAutoPanel();}
};
$('autospin-panel').addEventListener('toggle',()=>{$('autospin').setAttribute('aria-expanded',String($('autospin-panel').matches(':popover-open')));});
$('autospin-close').onclick=()=>$('autospin-panel').hidePopover();
$('autospin-range').oninput=()=>{const count=autoSpinCount(Number($<HTMLInputElement>('autospin-range').value));$('autospin-selected').textContent=String(count);$('autospin-range').setAttribute('aria-valuetext',count+' spins');$('autospin-start').textContent='INICIAR '+count+' SPINS';};
$('autospin-start').onclick=()=>{
  if(busy||autoPlaying||session.active||reviewPending||hasPendingWallet()||storageError)return;
  autoRemaining=autoSpinCount(Number($<HTMLInputElement>('autospin-range').value));autoPlaying=true;autoFsPaused=false;$('autospin-panel').hidePopover();render();scheduleAuto();
};
$('bonus-hunt').onclick=()=>{if(busy||autoPlaying||session.active||reviewPending||hasPendingWallet())return;prefs.bonusHunt=!prefs.bonusHunt;savePrefs();render();};
$('main-volume').oninput=()=>{prefs.masterVolume=Number($<HTMLInputElement>('main-volume').value)/100;savePrefs();};
$('minus').onclick=()=>void changeBet(config.bets[config.bets.indexOf(session.bet)-1]);$('plus').onclick=()=>void changeBet(config.bets[config.bets.indexOf(session.bet)+1]);$<HTMLSelectElement>('bet').onchange=e=>void changeBet(Number((e.target as HTMLSelectElement).value));
$<HTMLSelectElement>('speed').onchange=e=>{prefs.speed=(e.target as HTMLSelectElement).value as Speed;savePrefs();};
$('buy-normal').onclick=()=>buy('normal');$('buy-superior').onclick=()=>buy('superior');$('history').onclick=showHistory;$('settings').onclick=settings;$('rules').onclick=rules;$('close-modal').onclick=closeModal;
$<HTMLDialogElement>('modal').addEventListener('close',()=>{finishSummaryCount=undefined;if(reviewPending){reviewPending=false;bonusView=null;setAudioScene('base');render();}scheduleAuto();});
$<HTMLDialogElement>('modal').addEventListener('cancel',event=>{if(session.pendingRetrigger||bonusEntryWaiting)event.preventDefault();});
installSpaceContinuation(()=>{
  unlockAudio();
  const victory=document.querySelector<HTMLDialogElement>('.win-celebration[open]');
  if(victory)return ()=>{const target=victory.querySelector<HTMLElement>(victory.dataset.phase==='final'?'.win-finish':'.win-money');target?.click();};
  const dialog=$<HTMLDialogElement>('modal');
  if(dialog.open){
    const button=dialog.querySelector<HTMLButtonElement>('#enter-bonus,#continue-retrigger,#summary-done');
    if(button?.disabled&&finishSummaryCount)return finishSummaryCount;
    if(button&&!button.disabled&&!button.hidden)return ()=>button.click();
    return null;
  }
  if($('autospin-panel').matches(':popover-open')||$('bonus-shop-panel').matches(':popover-open'))return null;
  const focused=document.activeElement;
  if(focused!==document.body&&focused!==$('board')&&focused!==$('spin'))return null;
  return $<HTMLButtonElement>('spin').disabled?null:()=>$('spin').click();
});
window.addEventListener('storage',e=>{if(e.key!==KEY)return;if(autoPlaying)stopAutoSpins();cancelAuto();interruptPresentation?.();try{const next=restoreSession(JSON.parse(e.newValue??'null'));session=next;bonusView=session.active&&!needsBonusEntry()?{...session.active}:null;render();if($<HTMLDialogElement>('modal').dataset.kind==='retrigger'){clearRetriggerTimers();if(session.pendingRetrigger)showRetrigger();else $<HTMLDialogElement>('modal').close();}notify('Sessão atualizada noutra aba.');}catch{storageError='A sessão foi alterada ou removida noutra aba. Recarrega a página.';render();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(autoPlaying)stopAutoSpins('',true);cancelAuto();if(!bonusEntryWaiting)interruptPresentation?.();}else scheduleAuto();});
window.addEventListener('resize',()=>{positionAutoPanel();if(!busy)drawBoard();});
render();if(storageError){message('Sessão indisponível','Abre Definições para exportar os dados ou repor a sessão.');settings();}else if(session.active)message('Bónus recuperado',`${session.active.remaining} free spins por jogar. Carrega em PRÓXIMO FS para continuar.`);
async function loadArt(){
  $('loading-screen').hidden=false;$('asset-retry').classList.add('hidden');
  const failed=await preloadArt((loaded,total)=>{$<HTMLProgressElement>('asset-progress').max=total;$<HTMLProgressElement>('asset-progress').value=loaded;$('asset-status').textContent=`A preparar o campo · ${loaded}/${total}`;});
  if(failed.length){$('asset-status').textContent=`Não foi possível carregar ${failed.length} recurso(s).`;$('asset-retry').classList.remove('hidden');document.body.dataset.assets='error';return;}
  if(externalWallet&&!storageError){try{if(!navigator.locks)throw Error('O browser não suporta bloqueio local.');await navigator.locks.request(KEY,async()=>{const stored=restoreSession(JSON.parse(localStorage.getItem(KEY)!));persist(await prepareWallet(stored));walletCommitted(session);});bonusView=session.active&&!needsBonusEntry()?{...session.active}:null;}catch(error){$('asset-status').textContent=error instanceof Error?error.message:String(error);$('asset-retry').classList.remove('hidden');return;}}
  if(bonusView)setAudioScene(bonusView.mode==='superior'?'superior':'normal');assetsReady=true;document.body.dataset.assets='ready';$('loading-screen').hidden=true;render();if(needsBonusEntry())await showBonusEntry(session.active!.mode as 'normal'|'superior');if(session.pendingRetrigger)showRetrigger();
}
$('asset-retry').onclick=()=>void loadArt();void loadArt();
