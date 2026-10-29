import '../shared/style.css';
import './table.css';
import './table-refinements.css';
import './seat-interaction.css';
import './atelier-controls.css';
import './premium-layout.css';
import '../shared/chip-selector.css';
import {chipSelectorHTML} from './chip-selector';
import {presentationSteps,pausePresentation,type PresentationStep} from './presentation';
import {cardHTML,avatarHTML} from './cards';
import {money,clone} from '../shared/core';
import {SessionStore,validateMountOptions,type MountOptions} from '../shared/session';
import {AudioBus} from '../shared/audio';
import {dialog,settings,errorText,download} from '../shared/ui';
import {fresh,start,act,acknowledge,available,total,publicRound,RULES,type Session,type Action,type Round} from './engine';
import {BlackjackScene,cardName} from './scene';
export function mount(root:HTMLElement,options:MountOptions={}){
  validateMountOptions(options);
  const key=`atelier:blackjack:${options.wallet?'website:':''}${options.playerId||'guest'}`;const store=new SessionStore<Session>(key,fresh,options.wallet);const audio=new AudioBus('atelier:blackjack:audio');
  let bets:number[]=JSON.parse(localStorage.getItem(`${key}:bets`)||'[0,0,0,0,0]');let lastBets=[...bets],chip=100,busy=true,ready=false,destroyed=false,message='Escolha os lugares e as apostas. A mesa é sua.',error=false,guard=-Infinity;const undo:number[][]=Array.from({length:5},()=>[]);let soundTimers:number[]=[];
  let presentedRound:Round|null=null;
  let presentationRound:Round|null=null,presentationAbort:AbortController|undefined,visualBalance:number|null=null;
  let occupiedSeats:boolean[]=JSON.parse(localStorage.getItem(key+':occupied')||'null')||bets.map(Boolean);
  store.state.round?.seats.forEach(p=>occupiedSeats[p.number-1]=true);
  let viewedSeat=Number(localStorage.getItem(key+':view')||0);
  if(!Number.isInteger(viewedSeat)||viewedSeat<0||viewedSeat>4)viewedSeat=0;
  function savePlaces(){localStorage.setItem(key+':occupied',JSON.stringify(occupiedSeats));localStorage.setItem(key+':view',String(viewedSeat));}
  function focusSeat(i:number){viewedSeat=i;savePlaces();message=`A ver o lugar ${i+1}. ${store.state.round?'As decisões continuam na mão ativa.':'Escolha uma ficha e clique na zona de aposta para a colocar.'}`;render();}
  function joinSeat(i:number){if(busy||store.pending||store.state.round)return;occupiedSeats[i]=true;viewedSeat=i;presentedRound=null;savePlaces();message='Lugar '+(i+1)+' selecionado. Escolha uma ficha e clique na zona de aposta desse lugar.';render();}

  root.innerHTML=`<main class="shell"><header class="topbar"><div class="brand">ATELIER CASINO<small>A ARTE DE JOGAR À MESA</small></div><div class="top-actions"><span class="badge">4 BARALHOS · S17</span><button data-action="rules" class="quiet">Regras</button><button data-action="history" class="quiet">Histórico</button><button data-action="settings" aria-label="Som e definições" class="quiet">♫</button><button data-action="expand" aria-label="Expandir a mesa" class="quiet">⛶</button></div></header><section class="intro"></section><div class="stage"><span class="stage-label">MESA 01 · PRIVATE TABLE</span><div class="dealer-hud"></div></div><section class="seats" aria-label="Cinco lugares"></section><div class="insurance"></div><section class="control-bar"><div class="chips" aria-label="Selecionar ficha"></div><div class="wallet"><small>SALDO DISPONÍVEL</small><strong data-balance></strong></div><div class="stat"><small data-total-label>APOSTA TOTAL</small><strong data-total></strong></div><div class="controls"></div></section><div class="status" role="status" aria-live="polite"></div></main>`;
  const scene=new BlackjackScene(root.querySelector('.stage')!);const q=<T extends HTMLElement>(s:string)=>root.querySelector<T>(s)!;
  const bettingWallet=document.createElement('div');bettingWallet.className='betting-wallet';q('.chips').before(bettingWallet);bettingWallet.append(q('.chips'),q('.wallet'));
  const logoURL=new URL('./assets/blackjack-logo.svg',import.meta.url).href;
  q('.intro').innerHTML=`<h1 class="logo-heading"><span class="visually-hidden">Blackjack</span><img class="game-logo" src="${logoURL}" alt="" aria-hidden="true"></h1>`;
  q('.shell').classList.add('blackjack-shell');q('.stage').append(q('.seats'));q('.stage').insertAdjacentHTML('beforeend','<div class="decision-dock" aria-label="Decisões da mão ativa"></div><div class="presentation-actions"></div><div class="pipeline-label" aria-hidden="true"></div>');q('.stage').append(q('.insurance'));
  const floor=document.createElement('div');floor.className='table-floor';q('.stage').after(floor);floor.append(q('.decision-dock'));
  const persistBets=()=>localStorage.setItem(`${key}:bets`,JSON.stringify(bets));
  let presentingHand:string|undefined;
  function render(){
    const s=store.state,r=presentationRound||s.round||presentedRound;q('[data-balance]').textContent=ready?money(visualBalance??s.balance):'—';if(ready)document.documentElement.dataset.casinoBalance=String(visualBalance??s.balance);q('.chips').innerHTML=chipSelectorHTML(chip);q('.chips').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=busy||!!s.round||!ready);q('[data-total-label]').textContent=s.round?'EXPOSIÇÃO DA RONDA':'APOSTA TOTAL';q('[data-total]').textContent=money(s.round?.cost||bets.reduce((a,b)=>a+b,0));
    q('.dealer-hud').innerHTML=r?`<small>DEALER ${r.dealer.length?(r.reveal?`· ${total(r.dealer).value}`:`· ${total([r.dealer[0]]).value} + ?`):'· a distribuir'}</small><div class="cards">${r.dealer.map((c,i)=>cardHTML(i===1&&!r.reveal?null:c)).join('')}</div>`:'<small>DEALER</small><div class="rules-note">Para em todo o 17</div>';
    q('.seats').innerHTML=Array.from({length:5},(_,i)=>{
      const p=r?.seats.find(p=>p.number===i+1),active=p?.hands.some(h=>h.id===r?.active),occupied=!!p||occupiedSeats[i];
      const stake=p?p.hands.reduce((a,h)=>a+h.stake,0):r?0:bets[i];
      const seatGross=p?p.hands.reduce((a,h)=>a+h.gross,0)+p.insuranceGross:0,seatCost=stake+(p?.insurance||0),net=seatGross-seatCost;
      const shown=p?.hands.find(h=>h.id===(presentingHand||r?.active))||p?.hands.find(h=>!h.done)||p?.hands.at(-1);
      return `<article class="seat ${!s.round?'betting-seat':''} ${viewedSeat===i?'viewed':''} ${active?'active':''} ${occupied?'occupied':''} ${r?.phase==='summary'&&p?(net>0?'paid':net<0?'lost':'push'):''}" style="--seat-x:${[18,34,50,66,82][i]}%;--seat-y:${[56,71,77,71,56][i]}%;--seat-mobile-y:${[47,59,63,59,47][i]}%" aria-label="Lugar ${i+1}">
        <div class="table-hands ${p&&p.hands.length>1?'split-hands':''}">${p?p.hands.map((h,j)=>`<div class="hand ${h.id===r?.active?'active':''} ${p.hands.length>1?(h===shown?'focused-hand':'ghost-hand'):''}" aria-label="Mão ${j+1}${h===shown?', em destaque':''}${h.done?', terminada':''}"><div class="cards">${h.cards.map(cardHTML).join('')}</div><span class="hand-total">${total(h.cards).soft?'S ':''}${total(h.cards).value}</span><span class="chip-anchor hand-chips" data-chip-hand="${h.id}" aria-hidden="true"></span>${p.hands.length>1?`<span class="split-label">M${j+1} · ${h===shown?money(h.stake):`${total(h.cards).value}${h.done?' ✓':' ···'}`}</span>`:''}${h.result?`<span class="hand-result">${h.result}</span>`:''}</div>`).join(''):''}</div>
        <div class="seat-person"><button class="avatar" ${occupied?'data-seat-focus':'data-seat-join'}="${i}" aria-label="${occupied?'Ver lugar':'Ocupar o lugar'} ${i+1}" aria-pressed="${viewedSeat===i}" ${busy||(!occupied&&s.round)?'disabled':''}>${occupied?avatarHTML(i):'<span class="empty-avatar">+</span>'}</button>${active?'<span class="turn-indicator">A SUA VEZ</span>':''}<span class="seat-name">Lugar 0${i+1}</span></div>
        <div class="table-stake">${!s.round&&occupied?`<button class="wager-zone" data-seat-bet="${i}" aria-label="Colocar ficha no lugar ${i+1}" ${busy?'disabled':''}><span class="chip-anchor" data-seat-chips="${i+1}" aria-hidden="true"></span><strong>${bets[i]?money(bets[i]):'Apostar'}</strong><small>${bets[i]?'Adicionar ficha':'Colocar ficha'}</small></button>`:stake?`<strong>${money(r?.phase==='summary'?seatGross:stake)}</strong>`:''}</div>
        ${r?.phase==='summary'&&p?`<span class="seat-settlement">${net>0?'+':''}${money(net)}<small>${net>0?'Ganho creditado':net<0?'Perda recolhida':'Aposta devolvida'}</small></span>`:''}
      </article>`;
    }).join('');
    q('.insurance').innerHTML=r?.phase==='insurance'?`<span class="rules-note">Dealer mostra A · Seguro opcional (paga 2:1)</span>${r.seats.filter(p=>p.insured===null).map(p=>`<button data-insure="${p.number}" ${s.balance<p.initial/2?'disabled':''}>L${p.number}: seguro ${money(p.initial/2)}</button><button data-decline="${p.number}">L${p.number}: recusar</button>`).join('')}<button data-action="declineAll">Recusar todos</button>`:'';
    const avail=available(s);q('.controls').innerHTML=store.pending?'<button data-action="retry" class="primary">Recuperar operação</button>':!s.round?`<button data-action="undo" ${!undo[viewedSeat].length?'disabled':''} aria-label="Reset: desfazer ficha do lugar ${viewedSeat+1}">Reset</button><button data-action="clear" ${!bets[viewedSeat]?'disabled':''}>Limpar</button><button data-action="repeat">Repetir</button><button data-action="deal" class="primary" ${!bets.some(Boolean)?'disabled':''}>Jogar</button>`:r?.phase==='summary'?'':r?.phase==='play'&&r.active?(['hit','stand','double','split'] as const).map((a,i)=>`<button data-action="${a}" ${avail[a]?'disabled':''} title="${avail[a]||['Comprar carta (H)','Parar (S)','Dobrar (D)','Dividir (P)'][i]}" ${a==='hit'?'class="primary"':''}>${['Carta','Parar','Dobrar','Dividir'][i]}</button>`).join(''):'';
    if(busy){q('.controls').querySelectorAll('button').forEach(b=>(b as HTMLButtonElement).disabled=true);q('.insurance').querySelectorAll('button').forEach(b=>(b as HTMLButtonElement).disabled=true);if(ready)q('.controls').insertAdjacentHTML('beforeend',`<button data-action="skip" ${store.busy?'disabled':''}>Saltar animação</button>`);}
    q('.control-bar').append(q('.controls'));
    q('.decision-dock').replaceChildren();
    if(!s.round&&ready&&!store.pending){
      q('.decision-dock').classList.add('betting-dock');
      q('.decision-dock').append(q('.controls'));
    }else{
      q('.decision-dock').classList.remove('betting-dock');
      q('.control-bar').append(q('.controls'));
    }
    if(r?.phase==='play'&&r.active&&ready){
      const seat=r.seats.find(p=>p.hands.some(h=>h.id===r.active))!;
      q('.decision-dock').innerHTML=`<div class="decision-caption"><span>${busy?'A REVELAR A JOGADA':'É A SUA VEZ'}</span><strong>Lugar ${seat.number}${seat.hands.length>1?` · Mão ${seat.hands.findIndex(h=>h.id===r.active)+1}/${seat.hands.length}`:''} · ${total(seat.hands.find(h=>h.id===r.active)!.cards).value} pontos</strong></div><div class="decision-buttons"></div>`;
      const labels:Record<string,[string,string,string]>={hit:['+','Carta','H'],stand:['■','Parar','S'],double:['×2','Dobrar','D'],split:['⑂','Dividir','P']};
      q('.controls').querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button=>{const action=button.dataset.action!;if(labels[action]){const [icon,label,key]=labels[action];button.className=`decision-button decision-${action}`;button.setAttribute('aria-label',label);button.innerHTML=`<span class="decision-icon" aria-hidden="true">${icon}</span><span>${label}</span><kbd>${key}</kbd>`;q('.decision-buttons').append(button);}});
    }
    q('.presentation-actions').replaceChildren();const skip=q('.controls').querySelector('[data-action=skip]');if(skip)q('.presentation-actions').append(skip);
    if(!ready){q('.controls').innerHTML=busy?'<span>A sincronizar sessão…</span>':'<button data-action="retry" class="primary">Recuperar sessão</button>';q('.seats').querySelectorAll('button').forEach(b=>b.disabled=true);}
    q('.status').textContent=store.pending?'Operação de carteira pendente. Recuperar repete o mesmo ID, sem redistribuir cartas.':message;q('.status').classList.toggle('error',error||store.pending);
    q('.pipeline-label').textContent=presentationRound?message:'';
    scene.chipTable.sync(presentationRound?{...s,round:presentationRound}:s,bets,presentedRound);
  }
  function edit(i:number,dir:number){
    if(store.state.round||busy||store.pending||!occupiedSeats[i])return;
    const next=[...bets];next[i]=Math.max(0,next[i]+dir*chip);
    if(next[i]>RULES.max||next.reduce((a,b)=>a+b,0)>store.state.balance)throw new Error('Limite de aposta ou saldo disponível excedido');
    undo[i].push(bets[i]);presentedRound=null;viewedSeat=i;bets=next;persistBets();savePlaces();audio.tone('chip');scene.sync(store.state,bets,false);render();
  }
  async function change(next:Session){
    busy=true;render();
    try{
      const previous=clone(store.state.round),ledgerLength=store.state.ledger.length,balanceBefore=store.state.balance;
      await store.commit(next);
      if(destroyed)return;
      const r=store.state.round;
      visualBalance=store.state.balance-store.state.ledger.slice(ledgerLength).reduce((sum,e)=>sum+Math.max(0,e.amount),0);
      presentationAbort=new AbortController();const signal=presentationAbort.signal;
      if(r){
        q('.stage').querySelector('.round-outcome')?.remove();
        for(const step of presentationSteps(previous,r)){
          if(signal.aborted||destroyed)break;
          await presentStep(step,signal);
        }
      }
      if(destroyed)return;
      presentationRound=null;presentingHand=undefined;scene.sync(store.state,bets,false);render();
      if(r?.phase==='summary'){
        await settleAutomatically(r,visualBalance??balanceBefore,signal.aborted);
      }else if(r?.phase==='insurance')message='Seguro disponível: pode aceitar metade da aposta inicial ou recusar por lugar.';
      else if(r)message=`É a vez do lugar ${r.seats.find(p=>p.hands.some(h=>h.id===r.active))?.number}. Escolha a sua decisão.`;
      else message='Apostas abertas. Escolha os lugares e confirme o total.';
      error=false;
    }finally{presentationRound=null;presentingHand=undefined;visualBalance=null;busy=false;if(!destroyed)render();}
  }
  async function presentStep(step:PresentationStep,signal:AbortSignal){
    presentationRound=step.round;presentingHand=step.hand;
    const hand=step.round.seats.flatMap(p=>p.hands).find(h=>h.id===step.hand);
    message=step.type==='reveal'?`O dealer revela ${step.card?cardName(step.card):'a carta fechada'} · ${total(step.round.dealer).value} pontos.`:step.hidden?'O dealer recebe a carta fechada.':step.dealer?`Dealer recebe ${step.card?cardName(step.card):''} · ${total(step.round.dealer).value} pontos.`:`Lugar ${step.seat} recebe ${step.card?cardName(step.card):''} · ${hand?total(hand.cards).value:0} pontos${step.terminal?(hand&&total(hand.cards).value>21?' · Rebentou.':' · 21!'):'.'}`;
    render();audio.tone('card');
    const target=step.dealer?q('.dealer-hud .cards'):Array.from(root.querySelectorAll<HTMLElement>('.hand')).find(el=>el.querySelector<HTMLElement>('[data-chip-hand]')?.dataset.chipHand===step.hand)?.querySelector<HTMLElement>('.cards');
    const card=step.type==='reveal'?target?.children[1] as HTMLElement|undefined:target?.lastElementChild as HTMLElement|undefined;
    if(card){
      card.classList.add('is-entering');card.closest('.hand')?.classList.add('just-updated');
      if(!audio.settings.reduced&&!signal.aborted){
        const source=scene.shoeScreenPosition(),rect=card.getBoundingClientRect(),sr=q('.stage').getBoundingClientRect();
        const dx=sr.left+source.x-rect.left-rect.width/2,dy=sr.top+source.y-rect.top-rect.height/2;
        const animation=card.animate(step.type==='reveal'?[{transform:'scaleX(.05)',opacity:.5},{transform:'scaleX(1)',opacity:1}]:[{transform:`translate(${dx}px,${dy}px) rotate(-12deg) scale(.7)`,opacity:.25},{transform:'translate(0,0) rotate(0) scale(1)',opacity:1}],{duration:step.type==='reveal'?360:330,easing:'cubic-bezier(.2,.65,.3,1)'});
        const cancel=()=>animation.finish();signal.addEventListener('abort',cancel,{once:true});try{await animation.finished;}catch{}finally{signal.removeEventListener('abort',cancel);}
      }
      card.classList.remove('is-entering');
    }
    await pausePresentation(audio.settings.reduced?30:step.terminal?700:step.type==='reveal'?390:step.dealer?240:150,signal);
  }
  let animationResolve:(()=>void)|undefined,animationTimer=0,settlementAbort:AbortController|undefined;
  async function settleAutomatically(r:Round,balanceBefore:number,skipAll=false){
    if(destroyed)return;
    const hands=r.seats.flatMap(p=>p.hands),net=r.gross-r.cost;
    const title=hands.some(h=>h.result==='Blackjack')?'Blackjack!':hands.every(h=>h.result==='Rebentou')?'Mão rebentada':hands.some(h=>h.result==='Vitória')?(total(r.dealer).value>21?'O dealer rebentou!':'Vitória!'):hands.every(h=>h.result==='Empate')?'Empate':total(r.dealer).value===21&&r.dealer.length===2?'Blackjack do dealer':'O dealer ganhou';
    const description=r.seats.map(p=>`L${p.number}: ${p.hands.map(h=>h.result).join(' / ')}${p.insurance?` · seguro ${p.insuranceGross?'ganho':'perdido'}`:''}`).join(' · ');
    message=`${title} ${description}. O dealer está a recolher e entregar as fichas.`;render();q('[data-balance]').textContent=money(balanceBefore);
    visualBalance=null;
    q('.decision-dock').replaceChildren();
    let banner=q('.stage').querySelector<HTMLElement>('.round-outcome');
    if(!banner){banner=document.createElement('div');banner.className='round-outcome';banner.setAttribute('role','status');q('.stage').append(banner);}
    banner.className=`round-outcome ${net>0?'outcome-win':net<0?'outcome-loss':'outcome-push'}`;
    banner.innerHTML=`<small>RESULTADO DA RONDA</small><strong>${title}</strong><span>${net>=0?'+':''}${money(net)}</span><p>${description}</p>`;
    settlementAbort=new AbortController();const signal=settlementAbort.signal;
    audio.tone(hands.some(h=>h.result==='Blackjack')?'blackjack':net>0?'win':net===0?'push':hands.every(h=>h.result==='Rebentou')?'bust':'error');
    const duration=audio.settings.reduced?350:1650,start=performance.now();
    const counter=new Promise<void>(resolve=>{let raf=0;const end=()=>{cancelAnimationFrame(raf);signal.removeEventListener('abort',end);if(!destroyed)q('[data-balance]').textContent=money(store.state.balance);resolve();};const frame=(time:number)=>{if(destroyed||signal.aborted){end();return;}const p=Math.min(1,(time-start)/duration);q('[data-balance]').textContent=money(Math.round(balanceBefore+(store.state.balance-balanceBefore)*(1-(1-p)**3)));if(p===1)end();else raf=requestAnimationFrame(frame);};signal.addEventListener('abort',end,{once:true});raf=requestAnimationFrame(frame);});
    const transfer=scene.chipTable.settle(r,audio.settings.reduced,signal);if(skipAll)settlementAbort.abort();await Promise.all([transfer,counter]);
    if(destroyed)return;
    audio.tone('chip');presentedRound=r;await store.commit(acknowledge(store.state));bets=[0,0,0,0,0];undo.forEach(history=>history.length=0);persistBets();guard=performance.now();
    message=`${title} ${description}. Retorno ${money(r.gross)} · líquido ${net>=0?'+':''}${money(net)}. Fichas liquidadas automaticamente. Faça as suas apostas.`;
    window.setTimeout(()=>{if(!destroyed)banner?.remove();},audio.settings.reduced?1000:2600);
  }
  function skip(){presentationAbort?.abort();scene.skip();clearTimeout(animationTimer);soundTimers.forEach(clearTimeout);soundTimers=[];animationResolve?.();settlementAbort?.abort();}
  async function action(name:string){audio.unlock();if(name==='skip'){skip();return;}if(['rules','history','settings','expand'].includes(name)){if(name==='rules')showRules();if(name==='history')showHistory();if(name==='settings')settings(root,audio);if(name==='expand'){if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}return;}if(busy)return;
    if(name==='retry'){await initialize();return;}if(store.pending||!ready)throw new Error('Recupere primeiro a sessão ou operação pendente');
    const s=store.state,r=s.round;
    if(name==='deal'){if(performance.now()-guard<500)return;presentedRound=null;lastBets=[...bets];await change(start(s,bets));}
    else if(['hit','stand','double','split','declineAll'].includes(name)&&r)await change(act(s,{round:r.id,revision:r.revision,hand:r.active||undefined,action:name as Action}));
    else if(!r){
      presentedRound=null;
      if(name==='clear'&&bets[viewedSeat]){undo[viewedSeat].push(bets[viewedSeat]);bets[viewedSeat]=0;}
      if(name==='undo'&&undo[viewedSeat].length)bets[viewedSeat]=undo[viewedSeat].pop()!;
      if(name==='repeat'){if(lastBets.reduce((a,b)=>a+b,0)>s.balance)throw new Error('Saldo insuficiente para repetir');lastBets.forEach((amount,i)=>{if(amount!==bets[i])undo[i].push(bets[i]);if(amount)occupiedSeats[i]=true;});bets=[...lastBets];}
      persistBets();savePlaces();scene.sync(s,bets,false);render();
    }
  }
  function showRules(){dialog(root,'Blackjack · Regras da mesa',`<p>Quatro baralhos completos (208 cartas), embaralhados de novo antes de cada ronda, sem reiniciar o RNG. Um jogador pode ocupar os cinco lugares; todos partilham o mesmo conjunto de cartas.</p><table><tr><th>Resultado</th><th>Lucro</th><th>Retorno sobre 20</th></tr><tr><td>Blackjack natural</td><td>3:2</td><td>50</td></tr><tr><td>Vitória normal</td><td>1:1</td><td>40</td></tr><tr><td>Empate</td><td>0</td><td>20</td></tr></table><p>Dealer para em todo o 17, incluindo soft 17. Com A aberto oferece seguro antes do peek; com carta de valor 10 verifica blackjack antes das decisões. Áses valem 1 ou 11.</p><p>Dobrar em quaisquer duas cartas, incluindo após split; compra exatamente uma carta. Dividir cartas do mesmo valor até quatro mãos por lugar. Áses dividem uma vez, recebem uma carta por mão e terminam. Um 21 dividido não é blackjack natural. Sem surrender nem apostas laterais.</p><p>Seguro: metade da aposta inicial por lugar, paga 2:1 de lucro se o dealer tiver blackjack. É independente do resultado principal. Mínimo 0,20; máximo 1 000,00 por aposta inicial. Apostas em múltiplos de 0,02; os pagamentos usam duas casas decimais.</p><h3>Teclado e controlo</h3><p>H: carta · S: parar · D: dobrar · P: dividir. Espaço: distribuir. O dealer recolhe perdas e entrega ganhos automaticamente, com som e texto do resultado. Atalhos não atuam em formulários. Os botões indisponíveis explicam o motivo ao passar o cursor. Sem decisões automáticas.</p><p class="rules-note">Versão ${RULES.version}. </p>`);}
  function showHistory(){const s=store.state;const d=dialog(root,'Histórico e contabilidade',`<p>Saldo: ${money(s.balance)}. Retorno bruto inclui a aposta devolvida; líquido = retorno − exposição.</p>${[...(!busy&&s.round?.phase==='summary'?[s.round]:[]),...s.history].map(r=>`<h3>Ronda ${r.id} · líquido ${money(r.gross-r.cost)}</h3><p>Exposição ${money(r.cost)} · retorno ${money(r.gross)} · dealer ${r.dealer.map(cardName).join(' ')} (${total(r.dealer).value})</p><table><tr><th>Lugar / mão</th><th>Cartas</th><th>Stake / retorno</th><th>Resultado</th></tr>${r.seats.map(p=>p.hands.map((h,i)=>`<tr><td>${p.number} / ${i+1}</td><td>${h.cards.map(cardName).join(' ')}</td><td>${money(h.stake)} / ${money(h.gross)}</td><td>${h.result}</td></tr>`).join('')+(p.insurance?`<tr><td>${p.number} seguro</td><td></td><td>${money(p.insurance)} / ${money(p.insuranceGross)}</td><td>${p.insuranceGross?'Ganho':'Perdido'}</td></tr>`:'')).join('')}</table>`).join('')||'<p>Ainda não há rondas concluídas.</p>'}<p><button data-export>Exportar transações</button> <button data-benchmark>Exportar métricas</button></p>`);d.querySelector<HTMLButtonElement>('[data-export]')!.onclick=()=>download('blackjack-transacoes.json',{version:s.version,ledger:s.ledger,history:s.history});d.querySelector<HTMLButtonElement>('[data-benchmark]')!.onclick=()=>download('blackjack-desempenho.json',scene.report());}
  const fail=(e:unknown)=>{if(destroyed)return;message=errorText(e);error=true;render();};
  const click=(e:MouseEvent)=>{
    const el=(e.target as Element).closest<HTMLButtonElement>('button');if(!el||el.disabled)return;
    try{
      if(el.dataset.chip){chip=+el.dataset.chip;audio.tone('chip');render();}
      else if(el.dataset.seatJoin!==undefined)joinSeat(+el.dataset.seatJoin);
      else if(el.dataset.seatFocus!==undefined)focusSeat(+el.dataset.seatFocus);
      else if(el.dataset.seatBet!==undefined)edit(+el.dataset.seatBet,1);
      else if(el.dataset.insure||el.dataset.decline){const r=store.state.round;if(r&&!busy)void change(act(store.state,{round:r.id,revision:r.revision,action:el.dataset.insure?'insure':'decline',seat:+(el.dataset.insure||el.dataset.decline)!})).catch(fail);}
      else if(el.dataset.action)void action(el.dataset.action).catch(fail);
    }catch(e){fail(e);}
  };
  const keyboard=(e:KeyboardEvent)=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||document.querySelector('dialog[open]')||(e.target instanceof Element&&e.target.closest('input,select,textarea,button,a,[contenteditable]')))return;const map:Record<string,string>={h:'hit',s:'stand',d:'double',p:'split',' ':'deal'};const a=map[e.key.toLowerCase()];if(a){e.preventDefault();void action(a).catch(fail);}};
  root.addEventListener('click',click);document.addEventListener('keydown',keyboard);scene.onSeat=i=>{try{if(occupiedSeats[i])edit(i,1);else joinSeat(i);}catch(e){fail(e);}};render();scene.sync(store.state,bets,false);if(store.state.round)message='Sessão recuperada. As cartas e as decisões foram preservadas.';
  async function initialize(){busy=true;render();try{await store.initialize();if(destroyed)return;ready=true;scene.sync(store.state,bets,false);if(store.state.round?.phase==='summary')await settleAutomatically(store.state.round,store.state.balance);}finally{busy=false;if(!destroyed)render();}}
  const initialization=initialize();void initialization.catch(fail);
  return {ready:initialization,mode:options.wallet?'integrated' as const:'standalone' as const,getState:()=>clone(store.state),getSessionStatus:()=>({ready,busy,pending:store.pending,roundActive:!!store.state.round}),canLeave:()=>!busy&&!store.pending&&!store.state.round,updateBalance:async()=>{if(!options.wallet||busy||store.pending)return false;await store.initialize();render();return true;},getChipState:()=>scene.chipTable.inspect(),expand:()=>root.requestFullscreen(),destroy:()=>{destroyed=true;skip();soundTimers.forEach(clearTimeout);root.removeEventListener('click',click);document.removeEventListener('keydown',keyboard);scene.destroy();audio.destroy();root.replaceChildren();}};
}
