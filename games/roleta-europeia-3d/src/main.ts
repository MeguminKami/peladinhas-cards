import '../shared/style.css';
import './premium.css';
import '../shared/chip-selector.css';
import {money,clone} from '../shared/core';
import {SessionStore,validateMountOptions,type MountOptions} from '../shared/session';
import {AudioBus} from '../shared/audio';
import {dialog,settings,errorText,footer,download} from '../shared/ui';
import {chipSelectorHTML} from './chip-selector';
import {fresh,spin,reveal,acknowledge,BETS,BY_ID,color,cost,validate,neighbours,VERSION,MIN,type Plan,type Session,type Round} from './engine';
import {RouletteScene} from './scene';
import {RouletteChips} from './chips';
import {BoardLayout} from './board';
import {outcome,spinPhase,pause,type VisualPhase} from './presentation';

interface OnlinePlayer {uid:string;name:string;color:string;plan:Plan|null;total:number;ready:boolean;activeUntil:number}
interface OnlineOutcome {uid:string;name:string;color:string;plan:Plan;total:number;gross:number;net:number;lines:Round['lines']}
interface OnlineRound {id:number;number:number;color:string;at:number;players:OnlineOutcome[]}
interface OnlineTable {id:string;revision:number;phase:'betting'|'closing';deadline:number;roundId:number;result:OnlineRound|null;players:OnlinePlayer[];serverNow?:number}
interface OnlineSnapshot {table:OnlineTable|null;balance:number;uid:string;now:number;pending:boolean}
interface OnlineConnection {
  uid:string;
  ready:Promise<{table:OnlineTable|null;balance:number;serverNow?:number}>;
  subscribe(fn:(snapshot:OnlineSnapshot)=>void):()=>void;
  subscribeChat(fn:(messages:OnlineMessage[])=>void,onError?:(error:Error)=>void):()=>void;
  spin(plan:Plan):Promise<OnlineOutcome&{roundId:number;number:number;winningColor:string;balance:number}>;
  sendChat(message:string):Promise<unknown>;
  getBalance():number;
  getPending():boolean;
  retry():Promise<unknown>;
  destroy():void;
}
interface OnlineMessage {id:string;uid:string;user:string;color:string;message:string;createdAt:number}
type RouletteMountOptions = MountOptions & {online?:OnlineConnection};

export function mount(root:HTMLElement,options:RouletteMountOptions={}){
  validateMountOptions(options);
  const key=`atelier:roulette:${options.online?'online:':options.wallet?'website:':''}${options.playerId||'guest'}`;
  const store=new SessionStore<Session>(key,fresh,options.wallet),audio=new AudioBus('atelier:roulette:audio');
  let plan:Plan=JSON.parse(localStorage.getItem(`${key}:plan`)||'{}'),chip=100;
  let busy=true,ready=false,destroyed=false,error=false,guard=-Infinity;
  let phase:VisualPhase='loading',progress=0,visualBalance:number|null=store.state.round?store.state.balance-store.state.round.gross:null;
  let lastShown:Round|null=null,focused:string|null=null,scope:'bet'|'table'='table',preview:string|null=null;
  let kind='split',selected=BETS.find(b=>b.kind==='split')!.id,neighbourNumber=0,neighbourCount=2;
  let message=options.online?'Entra na mesa e prepara a tua aposta.':'Selecione uma ficha e clique no tapete. Faça o seu jogo.';
  let onlineState:OnlineTable|null=null,onlineMessages:OnlineMessage[]=[],onlineTab:'players'|'chat'='players',stopChat:(()=>void)|undefined,stopOnline:(()=>void)|undefined,chatSending=false,handledOnlineRound=0,chatExpiryTimer=0,presentedOnline:OnlineRound|null=null;
  const RESULT_FRESH_MS=15000,freshResult=(result:OnlineRound|null|undefined,now:number)=>!!result&&now-result.at<RESULT_FRESH_MS;
  let settlementAbort:AbortController|undefined,skipRequested=false,heldBet:string|null=null,holdTimer=0,animatePlacement=false;
  const undo:{plan:Plan;histories:[string,number[]][]}[]=[],betUndo=new Map<string,number[]>();
  const checkpoint=()=>({plan:clone(plan),histories:[...betUndo].map(([id,h])=>[id,[...h]] as [string,number[]])});
  const logo=new URL('./assets/roulette-logo.svg',import.meta.url).href;
  root.innerHTML=`<main class="shell roulette-shell"><header class="topbar"><div class="brand">ATELIER CASINO<small>A ARTE DE JOGAR À MESA</small></div><div class="top-actions"><span class="badge">EUROPEIA · ZERO ÚNICO</span><button data-action="bet-tools" class="quiet">Apostas</button><button data-action="rules" class="quiet">Regras</button><button data-action="history" class="quiet">Histórico</button><button data-action="settings" aria-label="Som e definições">♫</button><button data-action="expand" aria-label="Expandir a mesa">⛶</button></div></header><section class="intro"><h1 class="logo-heading"><span class="visually-hidden">Roleta Europeia</span><img class="game-logo" src="${logo}" alt="" aria-hidden="true"></h1></section>
    <div class="roulette-layout"><section class="wheel-panel"><div class="stage"><span class="stage-label">MESA 02 · EUROPEAN WHEEL</span><div class="wheel-result" aria-live="polite"></div></div><div class="recent"></div></section>
    <section class="roulette-table" aria-label="Tapete de apostas"><div class="table-title"><span data-table-title>FAITES VOS JEUX</span><span>37 CASAS · PLENO 35:1</span></div><div class="felt-scroll"><div class="felt-surface"><div class="number-grid"></div><div class="street-margin"></div><div class="outside dozens"></div><div class="outside even-money"></div><div class="combination-hits"></div><div class="others-layer" aria-hidden="true"></div></div></div><div class="advanced-bets" hidden>
    <div class="bet-focus"><button data-action="focus-table" class="scope-button">Mesa</button><div class="focus-copy"></div></div><div class="coverage" aria-live="polite"></div>
    <details class="bet-editor"><summary>Combinações e vizinhos da roda</summary><div class="row"><select data-kind aria-label="Tipo de aposta"><option value="split">Cavalo</option><option value="street">Rua / trio do zero</option><option value="corner">Quadro</option><option value="six">Seisena</option><option value="neighbours">Vizinhos da roda</option></select><select data-bet aria-label="Cobertura da aposta"></select><button data-action="add-selected">Colocar ficha</button></div><div class="neighbour-controls"><button data-action="less-neighbours" aria-label="Menos vizinhos">−</button><span data-neighbours></span><button data-action="more-neighbours" aria-label="Mais vizinhos">+</button></div></details>
    <details class="placed-bets"><summary data-plan-summary>Apostas colocadas</summary><div class="plan-list" aria-label="Apostas colocadas"></div></details></div></section></div>
    <section class="roulette-online" data-online hidden aria-label="Mesa multiplayer"><div class="online-heading"><div><small>MESA PARTILHADA</small><strong data-online-phase>Apostas abertas</strong></div><span data-online-count></span></div><div class="online-tabs" role="tablist" aria-label="Mesa e chat"><button type="button" role="tab" data-online-tab="players" aria-selected="true">Jogadores</button><button type="button" role="tab" data-online-tab="chat" aria-selected="false">Chat</button></div><div class="online-content"></div></section>
    <section class="control-bar"><div class="betting-wallet"><div class="chips" aria-label="Selecionar ficha"></div><div class="wallet"><small>SALDO DISPONÍVEL</small><strong data-balance></strong></div></div><div class="stat"><small>APOSTA TOTAL</small><strong data-total></strong></div><div class="controls"></div></section><div class="status" role="status" aria-live="polite"></div><div class="bet-notice" role="status" aria-live="polite" aria-atomic="true"></div>${footer}</main>`;
  const q=<T extends HTMLElement>(s:string)=>root.querySelector<T>(s)!;
  const scene=new RouletteScene(q('.stage')),board=new BoardLayout(q('.felt-surface'));
  q('.stage').after(q('.wheel-result'));
  q('.roulette-table').append(q('.control-bar'));q('.wallet').append(q('.stat'));
  const advanced=q('.advanced-bets');
  function showBetTools(){const d=dialog(root,'Apostas e combinações','<div class="bet-tools-body"></div>');advanced.hidden=false;d.querySelector('.bet-tools-body')!.append(advanced);d.addEventListener('close',()=>{advanced.hidden=true;q('.roulette-table').append(advanced);updateCoverage();});}
  let chipLayer:RouletteChips;
  const persist=()=>localStorage.setItem(`${key}:plan`,JSON.stringify(plan));
  const activeRound=()=>store.state.round||lastShown;
  const numberVisible=()=>['number','collecting','paying'].includes(phase)||phase==='ready'&&!!lastShown;
  const locked=()=>busy||!ready||store.pending||!!store.state.round;
  const label=(id:string)=>BY_ID[id].kind==='straight'?`Pleno ${BY_ID[id].label}`:BY_ID[id].label;
  const escapeHtml=(value:unknown)=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
  function renderOnline(){
    const panel=q<HTMLElement>('[data-online]');panel.hidden=!options.online;if(!options.online)return;clearTimeout(chatExpiryTimer);
    const state=onlineState,players=state?.players||[];
    q('[data-online-count]').textContent=`${players.length} ${players.length===1?'jogador':'jogadores'}`;
    q('[data-online-phase]').textContent=state?.phase==='closing'?'Apostas a fechar':'Apostas abertas';
    root.querySelectorAll<HTMLButtonElement>('[data-online-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.onlineTab===onlineTab)));
    const content=q<HTMLElement>('.online-content');
    if(onlineTab==='players'){
      const entries=players.map(player=>{
        const bets=Object.entries(player.plan||{}).slice(0,2).map(([id,value])=>`${label(id)} ${money(value)}`).join(' · ');
        const rest=Math.max(0,Object.keys(player.plan||{}).length-2);
        const tint=/^#[0-9a-f]{6}$/i.test(player.color)?player.color:'#d5b779';
        return `<li class="online-player"><span class="online-player-dot" style="--player-color:${tint}" aria-hidden="true"></span><span class="online-player-copy"><strong style="--player-color:${tint}">${escapeHtml(player.name)}</strong><small>${player.plan?`${escapeHtml(bets)}${rest?` · +${rest}`:''}`:'A preparar aposta'}</small></span><b>${money(player.total)}</b></li>`;
      }).join('');
      content.innerHTML=`<ul class="online-player-list">${entries||'<li class="online-empty">És o primeiro nesta mesa. Podes jogar já.</li>'}</ul>`;
      return;
    }
    const oldInput=content.querySelector<HTMLInputElement>('.online-chat-input'),oldValue=oldInput?.value||'',wasFocused=oldInput===document.activeElement;
    const visibleMessages=onlineMessages.filter(item=>item.createdAt>=Date.now()-30*60*1000).slice(-100);
    const bubbles=visibleMessages.map(item=>{
      const tint=/^#[0-9a-f]{6}$/i.test(item.color)?item.color:'#d5b779';
      return `<article class="online-message${item.uid===options.online!.uid?' is-mine':''}"><strong style="--player-color:${tint}">${escapeHtml(item.user)}</strong><p>${escapeHtml(item.message)}</p></article>`;
    }).join('');
    content.innerHTML=`<div class="online-chat-log" role="log" aria-live="polite" aria-label="Mensagens da sala">${bubbles||'<p class="online-empty">Ainda não há mensagens. Diz olá à mesa.</p>'}</div><form class="online-chat-form"><label class="visually-hidden" for="roulette-chat-message">Mensagem</label><input id="roulette-chat-message" class="online-chat-input" maxlength="180" autocomplete="off" placeholder="Escreve uma mensagem…" ${chatSending?'disabled':''}><button type="submit" class="primary" ${chatSending?'disabled':''} aria-label="Enviar mensagem">Enviar</button></form>`;
    if(visibleMessages.length)chatExpiryTimer=window.setTimeout(()=>{onlineMessages=onlineMessages.filter(item=>item.createdAt>Date.now()-30*60*1000);render();},Math.max(1,visibleMessages[0].createdAt+30*60*1000-Date.now()+1));
    const input=q<HTMLInputElement>('.online-chat-input');input.value=oldValue;
    if(wasFocused)input.focus({preventScroll:true});
    const log=q<HTMLElement>('.online-chat-log');log.scrollTop=log.scrollHeight;
  }
  function setOnlineTab(tab:'players'|'chat'){
    if(!options.online)return;onlineTab=tab;stopChat?.();stopChat=undefined;
    if(tab==='chat')stopChat=options.online.subscribeChat(messages=>{onlineMessages=messages;render();},error=>{message=`O chat não está disponível: ${error.message}`;render();});
    render();
  }

  function renderBoard(){
    const round=activeRound(),winner=numberVisible()?round?.number:undefined,disabled=locked()?'disabled':'';
    q('.number-grid').innerHTML=`<button data-number="0" data-bet-id="straight:0" class="zero ${winner===0?'winner':''}" ${disabled} aria-label="Pleno zero">0</button>`+
      Array.from({length:36},(_,i)=>{const row=Math.floor(i/12),column=i%12,n=column*3+3-row;return `<button data-number="${n}" style="grid-row:${row+1};grid-column:${column+2}" data-bet-id="straight:${n}" class="${color(n)} ${winner===n?'winner':''}" ${disabled} aria-label="Pleno ${n}, ${color(n)==='red'?'vermelho':'preto'}">${n}</button>`;}).join('')+
      [3,2,1].map((n,i)=>{const b=BETS.find(b=>b.kind==='column'&&b.label.startsWith(String(n)))!;return `<button data-region="${b.id}" data-bet-id="${b.id}" class="column" style="grid-row:${i+1};grid-column:14" ${disabled} aria-label="${b.label}">2:1</button>`;}).join('');
    q('.dozens').innerHTML=BETS.filter(b=>b.kind==='dozen').map(b=>`<button data-region="${b.id}" data-bet-id="${b.id}" ${disabled}>${b.label}</button>`).join('');
    q('.even-money').innerHTML=['1–18','Par','Vermelho','Preto','Ímpar','19–36'].map(name=>{const b=BETS.find(b=>b.label===name)!;return `<button data-region="${b.id}" data-bet-id="${b.id}" class="outside-${name==='Vermelho'?'red':name==='Preto'?'black':'neutral'}" ${disabled} aria-label="${name}">${name}</button>`;}).join('');
    board.layout();q('.combination-hits').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=locked());
  }
  function render(){
    if(destroyed)return;const s=store.state,r=activeRound(),showNumber=numberVisible(),isLocked=locked();
    q('[data-balance]').textContent=ready?money(visualBalance??s.balance):'—';q('[data-total]').textContent=money(s.round?.cost??cost(plan));q('.chips').innerHTML=chipSelectorHTML(chip);q('.chips').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=isLocked);
    q('[data-table-title]').textContent=phase==='ready'?(lastShown?'FICHAS PAGAS · FAÇA O SEU JOGO':'FAITES VOS JEUX'):phase==='spinning'?'RIEN NE VA PLUS':phase==='collecting'?'RECOLHA DAS APOSTAS':phase==='paying'?'PAGAMENTO CONFIRMADO':'APOSTAS ENCERRADAS';
    renderBoard();
    q('.controls').innerHTML=store.pending||phase==='blocked'?'<button data-action="retry" class="primary">Recuperar operação</button>':!ready?'<span>A preparar a mesa…</span>':busy?`<span class="phase-text">${phase==='locking'?(options.online?'A fechar as apostas da mesa':'A confirmar as apostas'):phase==='spinning'?spinPhase(progress):phase==='number'?'Número confirmado':phase==='collecting'?'A recolher as fichas perdidas':r?.gross?'A entregar as fichas ganhas':'Recolha concluída'}</span><button data-action="skip" ${phase==='locking'?'disabled':''}>Saltar animação</button>`:
      `<button data-action="clear" ${!cost(plan)&&!lastShown?.gross?'disabled':''}>Reset</button><button data-action="undo" aria-label="Desfazer" ${!undo.length?'disabled':''}>Desfazer</button><button data-action="repeat" ${!Object.keys(s.last).length?'disabled':''}>Repetir</button><button data-action="double" ${!cost(plan)?'disabled':''}>Dobrar</button><button data-action="spin" class="primary" ${!cost(plan)?'disabled':''}>Jogar</button>`;
    if(!ready&&!busy)q('.controls').innerHTML='<button data-action="retry" class="primary">Recuperar sessão</button>';
    if(showNumber&&r){const result=outcome(r);q('.wheel-result').innerHTML=`<span class="winning-number ${r.color}">${r.number}</span><div><small>NÚMERO CONFIRMADO</small><strong>${phase==='paying'||phase==='ready'?result.title:result.colorLabel}</strong><span>${phase==='collecting'?'O croupier recolhe as apostas':phase==='paying'?(r.gross?'O croupier entrega as fichas':'Recolha concluída'):`Retorno ${money(r.gross)} · líquido ${r.net>=0?'+':''}${money(r.net)}`}</span></div>`;}
    else q('.wheel-result').innerHTML=`<div><small>${phase==='ready'?'ATELIER CASINO':'RONDA EM CURSO'}</small><strong>${phase==='ready'?'Faça o seu jogo':phase==='spinning'?spinPhase(progress):phase==='locking'?'Apostas encerradas':phase==='blocked'?'Operação pendente':'A preparar a mesa'}</strong><span>${phase==='ready'?'Escolha a ficha e aposte no tapete':'O número é anunciado quando a bola assenta'}</span></div>`;
    q('.recent').innerHTML='<small>ÚLTIMOS RESULTADOS</small>'+[...(showNumber&&s.round?[s.round]:[]),...s.history].slice(0,12).map(round=>`<span class="result-badge ${round.color}" aria-label="${round.number}">${round.number}</span>`).join('');
    q('.plan-list').innerHTML=Object.entries(plan).map(([id,value])=>`<button class="plan-item ${focused===id&&scope==='bet'?'selected':''}" data-focus-bet="${id}" ${isLocked?'disabled':''} aria-label="Ver aposta ${label(id)}">${label(id)} <strong>${money(value)}</strong></button>`).join('');
    q('[data-plan-summary]').textContent=`Apostas colocadas · ${Object.keys(plan).length}`;q('.placed-bets').classList.toggle('empty',!Object.keys(plan).length);
    q('.scope-button').classList.toggle('selected',scope==='table');q('.scope-button').setAttribute('aria-pressed',String(scope==='table'));
    q('.focus-copy').innerHTML=scope==='bet'&&focused?`<small>APOSTA EM FOCO · LUCRO ${BY_ID[focused].multiplier-1}:1</small><strong>${label(focused)} <span>${money(plan[focused]||0)}</span></strong>`:`<small>EXPOSIÇÃO DA MESA</small><strong>${Object.keys(plan).length} apostas <span>${money(cost(plan))}</span></strong>`;
    q<HTMLButtonElement>('[data-action="add-selected"]').disabled=isLocked;q<HTMLSelectElement>('[data-kind]').disabled=isLocked;q<HTMLSelectElement>('[data-bet]').disabled=isLocked;q('.neighbour-controls').classList.toggle('visible',kind==='neighbours');q('[data-neighbours]').textContent=`${neighbourCount} de cada lado · ${neighbourCount*2+1} fichas`;
    q('.status').textContent=store.pending?'Liquidação pendente. Recuperar utiliza o mesmo ID e o mesmo número, sem voltar a sortear.':options.online&&onlineState?.phase==='closing'&&!busy?'Apostas a fechar. Confirma agora para participar nesta ronda.':message;q('.status').classList.toggle('error',error||store.pending);
    renderOnline();renderOthers();
    updateCoverage();
    if(chipLayer&&!['collecting','paying'].includes(phase)){chipLayer.sync(lastShown&&!s.round?Object.fromEntries(lastShown.lines.filter(l=>l.gross).map(l=>[l.id,l.gross])):s.round?.plan||plan,animatePlacement);animatePlacement=false;}
  }
  const compactValue=(value:number)=>value>=1000?(+(value/1000).toFixed(1)+'k').replace('.',','):Number.isInteger(value)?String(value):value.toFixed(2).replace('.',',');
  function renderOthers(){
    const layer=q<HTMLElement>('.others-layer');
    if(!options.online){layer.replaceChildren();return;}
    const source:{uid:string;name:string;color:string;plan:Plan|null}[]=presentedOnline?presentedOnline.players:onlineState?.players||[],groups=new Map<string,{name:string;color:string;value:number}[]>();
    for(const player of source){if(player.uid===options.online.uid||!player.plan)continue;for(const [id,value] of Object.entries(player.plan)){if(!BY_ID[id]||!(value>0))continue;const list=groups.get(id)||[];list.push({name:player.name,color:player.color,value});groups.set(id,list);}}
    layer.classList.toggle('settling',['collecting','paying'].includes(phase));
    const nodes:HTMLElement[]=[];
    for(const [id,list] of groups){const point=board.point(id);list.forEach((entry,index)=>{const chip=document.createElement('span');chip.className='other-chip';chip.style.setProperty('--c',entry.color);chip.style.left=(point.x+12+(index-(list.length-1)/2)*24)+'px';chip.style.top=(point.y-(id.startsWith('straight:')?12:17))+'px';chip.textContent=compactValue(entry.value);chip.title=entry.name+' · '+label(id)+' '+money(entry.value);nodes.push(chip);});}
    layer.replaceChildren(...nodes);
  }
  function updateCoverage(){
    const shown=activeRound();
    if(numberVisible()&&shown){root.querySelectorAll<HTMLElement>('[data-number]').forEach(el=>el.classList.toggle('covered',Number(el.dataset.number)===shown.number));root.querySelectorAll<HTMLElement>('.focused-bet').forEach(el=>el.classList.remove('focused-bet'));const result=outcome(shown);q('.coverage').textContent=`${shown.number} · ${result.colorLabel} · ${result.won} ${result.won===1?'aposta vencedora':'apostas vencedoras'}`;return;}
    const id=preview||(scope==='bet'?focused:null);let numbers=id?BY_ID[id].numbers:[];
    if(q<HTMLDetailsElement>('.bet-editor').open&&!advanced.hidden){numbers=kind==='neighbours'?neighbours(neighbourNumber,neighbourCount):BY_ID[selected].numbers;}
    const price=kind==='neighbours'&&q<HTMLDetailsElement>('.bet-editor').open&&!advanced.hidden?chip*numbers.length:chip;
    q('.coverage').textContent=numbers.length?`${numbers.join(' · ')} · ${money(price)}${id?` · lucro ${BY_ID[id].multiplier-1}:1`:''}`:'Toque numa zona para colocar a ficha. Selecione uma aposta colocada para a desfazer ou limpar.';
    root.querySelectorAll<HTMLElement>('[data-number]').forEach(el=>el.classList.toggle('covered',numbers.includes(+el.dataset.number!)));
    root.querySelectorAll<HTMLElement>('[data-bet-id]').forEach(el=>el.classList.toggle('focused-bet',scope==='bet'&&el.dataset.betId===focused));
  }
  function populate(){const select=q<HTMLSelectElement>('[data-bet]');if(kind==='neighbours'){select.innerHTML=Array.from({length:37},(_,n)=>`<option value="${n}">${n} · vizinhos na roda</option>`).join('');select.value=String(neighbourNumber);}else{const bets=BETS.filter(b=>b.kind===kind);if(!bets.some(b=>b.id===selected))selected=bets[0].id;select.innerHTML=bets.map(b=>`<option value="${b.id}">${b.label}</option>`).join('');select.value=selected;}q('[data-neighbours]').textContent=`${neighbourCount} de cada lado · ${neighbourCount*2+1} fichas`;q('.neighbour-controls').classList.toggle('visible',kind==='neighbours');updateCoverage();}
  function applyPlan(next:Plan,record=true){
    if(locked())throw new Error('As apostas estão encerradas');if(Object.keys(next).length)validate(next,store.state.balance);
    if(record){undo.push(checkpoint());for(const id of new Set([...Object.keys(plan),...Object.keys(next)]))if((plan[id]||0)!==(next[id]||0)){const h=betUndo.get(id)||[];h.push(plan[id]||0);betUndo.set(id,h);}}
    lastShown=null;plan=next;persist();error=false;message=`Apostas abertas · ${money(cost(plan))} na mesa.`;audio.tone('chip');animatePlacement=true;render();
  }
  function add(id:string){const next=clone(plan);next[id]=(next[id]||0)+chip;focused=id;scope='bet';applyPlan(next);}
  function focus(id:string){focused=id;scope='bet';preview=null;message=`${label(id)} em foco. Desfazer recupera a última alteração; Reset limpa a mesa inteira.`;render();}
  async function presentResult(round:Round){
    settlementAbort=new AbortController();const signal=settlementAbort.signal;
    phase='number';message=`${round.number}, ${outcome(round).colorLabel.toLowerCase()}. Número confirmado.`;render();const winningCell=root.querySelector<HTMLElement>('[data-number="'+round.number+'"]');if(winningCell){const area=q('.felt-scroll');area.scrollTo({left:Math.max(0,board.point('straight:'+round.number).x-area.clientWidth/2),behavior:audio.settings.reduced?'instant':'smooth'});}audio.tone('click');
    await pause(skipRequested?0:audio.settings.reduced?70:650,signal);if(destroyed)return;
    if(round.lines.some(line=>!line.won)){phase='collecting';message='O croupier recolhe as fichas das apostas perdidas.';render();audio.tone('chip');const collect=chipLayer.collect(round,audio.settings.reduced,signal);if(skipRequested)settlementAbort.abort();await collect;if(destroyed)return;}
    phase='paying';const result=outcome(round);message=`${result.title} Retorno ${money(round.gross)} · líquido ${round.net>=0?'+':''}${money(round.net)}.`;render();
    audio.tone(result.kind==='win'?'win':result.kind==='balanced'?'push':result.kind==='partial'?'click':'bust');
    const balanceBefore=visualBalance??store.state.balance-round.gross,start=performance.now(),duration=audio.settings.reduced?240:920;
    const counter=new Promise<void>(resolve=>{let raf=0;const finish=()=>{cancelAnimationFrame(raf);signal.removeEventListener('abort',finish);if(!destroyed)q('[data-balance]').textContent=money(store.state.balance);resolve();};const frame=(now:number)=>{if(destroyed||signal.aborted){finish();return;}const p=Math.min(1,(now-start)/duration);q('[data-balance]').textContent=money(Math.round(balanceBefore+(store.state.balance-balanceBefore)*(1-(1-p)**3)));if(p===1)finish();else raf=requestAnimationFrame(frame);};signal.addEventListener('abort',finish,{once:true});if(signal.aborted)finish();else raf=requestAnimationFrame(frame);});
    const pay=chipLayer.pay(round,audio.settings.reduced,signal);await Promise.all([pay,counter]);if(destroyed)return;
    await store.commit(acknowledge(store.state));lastShown=round;plan={};undo.length=0;betUndo.clear();persist();visualBalance=null;phase='ready';guard=performance.now();message=`${round.number}, ${result.colorLabel.toLowerCase()} · ${result.title} Retorno ${money(round.gross)}, líquido ${round.net>=0?'+':''}${money(round.net)}. Fichas liquidadas automaticamente. Faça o seu jogo.`;
  }
  async function presentOnlineResult(result:OnlineRound|(OnlineOutcome&{roundId:number;number:number;winningColor:string;balance:number})){
    const id='players'in result?result.id:result.roundId;
    if(handledOnlineRound===id||destroyed)return;
    presentedOnline='players'in result?result:onlineState?.result?.id===id?onlineState.result:null;renderOthers();
    try{await presentOnlineRound(result);}finally{presentedOnline=null;if(!destroyed)renderOthers();}
  }
  async function presentOnlineRound(result:OnlineRound|(OnlineOutcome&{roundId:number;number:number;winningColor:string;balance:number})){
    const shared='players'in result,id=shared?result.id:result.roundId;
    handledOnlineRound=id;
    const personal=shared?result.players.find(player=>player.uid===options.online?.uid):result;
    const number=result.number,winningColor=shared?result.color:result.winningColor;
    const resultPlan=personal?.plan||{},total=personal?.total||0,gross=personal?.gross||0,net=personal?.net||0,lines=personal?.lines||[];
    if(!shared&&Number.isSafeInteger(result.balance))store.state.balance=result.balance;
    const round:Round={id,number,color:winningColor,cost:total,gross,net,lines:clone(lines),plan:clone(resultPlan),phase:'spinning',rotor:scene.angle+Math.PI*2*2.4};
    const unsubmittedPlan=personal?undefined:clone(plan);
    const next=clone(store.state);next.round=round;next.counter=Math.max(next.counter,id);await store.commit(next);
    if(destroyed)return;visualBalance=store.state.balance-round.gross;phase='spinning';render();audio.tone('spin');
    const movement=scene.spin(round,audio.settings.reduced);if(skipRequested)scene.skip();await movement;if(destroyed)return;
    await store.commit(reveal(store.state,scene.angle));await presentResult(store.state.round!);
    if(unsubmittedPlan){plan=unsubmittedPlan;persist();}
  }
  async function doSpin(){
    if(locked()||performance.now()-guard<500)return;
    const next=options.online?undefined:spin(store.state,plan);busy=true;skipRequested=false;error=false;lastShown=null;scope='table';focused=null;preview=null;phase='locking';progress=0;visualBalance=store.state.balance;render();
    try{
      if(options.online){const result=await options.online.spin(clone(plan));if(destroyed)return;await presentOnlineResult(result);return;}
      if(!next)throw new Error('A ronda não foi preparada.');await store.commit(next);if(destroyed)return;visualBalance=store.state.balance-store.state.round!.gross;phase='spinning';render();audio.tone('spin');
      let oldPhase='',previousSector=0,lastSound=0;
      scene.onTick=p=>{progress=p;const label=spinPhase(p);if(label!==oldPhase){oldPhase=label;q('.phase-text').textContent=label;q('.wheel-result strong').textContent=label;}const pose=scene.alignment(),sector=Math.floor(Math.atan2(pose.ball[0],pose.ball[2])*37/(Math.PI*2)),now=performance.now();if(sector!==previousSector&&p<.82&&now-lastSound>55){audio.tone(p>.58?'bounce':'card');lastSound=now;}previousSector=sector;};
      const movement=scene.spin(store.state.round!,audio.settings.reduced);if(skipRequested)scene.skip();await movement;if(destroyed)return;scene.onTick=undefined;
      await store.commit(reveal(store.state,scene.angle));await presentResult(store.state.round!);
    }finally{busy=false;if(store.pending)phase='blocked';else if(!store.state.round){phase='ready';visualBalance=null;}if(!destroyed)render();}
  }
  async function action(name:string){
    audio.unlock();if(name==='skip'){skipRequested=true;scene.skip();settlementAbort?.abort();return;}
    if(name==='bet-tools'){showBetTools();return;}if(name==='rules'){showRules();return;}if(name==='history'){showHistory();return;}if(name==='settings'){settings(root,audio);return;}if(name==='expand'){if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();return;}
    if(name==='online-retry'&&options.online){await options.online.retry();return;}
    if(busy)return;if(name==='retry'){await initialize();return;}if(store.pending||!ready)throw new Error('Recupere primeiro a sessão ou a operação pendente');
    if(name==='spin'){await doSpin();return;}if(store.state.round)return;
    if(name==='focus-table'){scope='table';preview=null;render();return;}
    if(name==='undo'){
      if(undo.length){const previous=undo.at(-1)!;applyPlan(clone(previous.plan),false);undo.pop();betUndo.clear();previous.histories.forEach(([id,h])=>betUndo.set(id,[...h]));render();}return;
    }
    if(name==='clear'){scope='table';focused=null;preview=null;applyPlan({});return;}
    if(name==='repeat'){const next=clone(store.state.last);if(!Object.keys(next).length)return;applyPlan(next);scope='table';render();return;}
    if(name==='double'){if(!cost(plan))return;applyPlan(Object.fromEntries(Object.entries(plan).map(([id,value])=>[id,value*2])));scope='table';render();return;}
    if(name==='less-neighbours'||name==='more-neighbours'){neighbourCount=Math.max(0,Math.min(4,neighbourCount+(name==='more-neighbours'?1:-1)));populate();return;}
    if(name==='add-selected'){if(kind==='neighbours'){const next=clone(plan);for(const n of neighbours(neighbourNumber,neighbourCount)){const id=`straight:${n}`;next[id]=(next[id]||0)+chip;}applyPlan(next);scope='table';render();}else add(selected);}
  }
  function showRules(){dialog(root,'Roleta Europeia · Regras',`<p>37 casas, de 0 a 36, com um único zero. Cada número tem probabilidade 1/37. Zero não é par/ímpar, baixo/alto, vermelho/preto, dúzia ou coluna. Sem la partage e sem en prison.</p><table><tr><th>Aposta</th><th>Casas</th><th>Lucro</th><th>Retorno bruto</th></tr>${[['Pleno',1,'35:1','36×'],['Cavalo',2,'17:1','18×'],['Rua / trio',3,'11:1','12×'],['Quadro / primeiros quatro',4,'8:1','9×'],['Seisena',6,'5:1','6×'],['Dúzia / coluna',12,'2:1','3×'],['Externas',18,'1:1','2×']].map(row=>`<tr>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</table><p>Retorno inclui a stake. Apostar 0,20 no vermelho e 0,20 num pleno vermelho vencedor custa 0,40 e devolve 7,60: lucro 7,20. Apostas sobrepostas liquidam independentemente. A roleta não tem push: «ronda equilibrada» significa apenas que a soma dos retornos igualou a exposição.</p><h3>Como apostar</h3><p>Selecione uma ficha e clique no número, externa ou junção do tapete. A cobertura é destacada antes de colocar. Para toque/teclado, o seletor «Combinações» disponibiliza todos os cavalos, ruas, trios, quadros e seisenas sem precisão de fronteira. Vizinhos 0–4 de cada lado seguem a ordem da roda e são plenos separados; o custo é mostrado antes de aplicar.</p><p>Selecione uma aposta colocada, ou prima sem soltar uma região, para a colocar em foco. Desfazer recupera a última alteração da mesa. Reset remove todas as fichas, mesmo com uma aposta em foco, e pode ser desfeito. Dobrar e repetir são integrais, sujeitos a saldo e limites. Mínimo 0,20, passo 0,10, máximo 1 000,00 por aposta e 5 000,00 no total. Sem cap de prémio.</p><p>As apostas fecham antes do sorteio confirmado. A bola apresenta o resultado e assenta no bolso correspondente antes do anúncio e do pagamento automático. Não existe confirmação de resumo, nem outro spin automático. Espaço gira apenas quando permitido. Movimento reduzido e som disponíveis.</p><p>Retorno teórico 36/37 ≈ 97,2973%, margem 1/37. Frequências passadas são descritivas e não alteram a probabilidade seguinte. </p><p class="rules-note">${VERSION}. RNG e operações persistidos. O host integrado deve autenticar, serializar e liquidar operações de forma atómica/idempotente.</p>`);}
  function showHistory(){const s=store.state,rounds=[...(!busy&&s.round?.phase==='result'?[s.round]:[]),...s.history];const counts=Array.from({length:37},(_,n)=>rounds.filter(r=>r.number===n).length);const d=dialog(root,'Histórico da mesa',`<p>Frequências descritivas de ${rounds.length} rondas guardadas. Não são previsões.</p><p class="rules-note">${counts.map((n,i)=>`${i}: ${n}`).join(' · ')}</p>${rounds.map(r=>`<h3>${r.number} · Ronda ${r.id} · líquido ${money(r.net)}</h3><p>Custo ${money(r.cost)} · retorno ${money(r.gross)}</p><table><tr><th>Aposta</th><th>Stake</th><th>Retorno</th></tr>${r.lines.map(l=>`<tr><td>${label(l.id)} ${l.won?'✓':''}</td><td>${money(l.stake)}</td><td>${money(l.gross)}</td></tr>`).join('')}</table>`).join('')||'<p>Ainda não há resultados.</p>'}<p><button data-export>Exportar transações</button> <button data-benchmark>Exportar métricas</button></p>`);d.querySelector<HTMLButtonElement>('[data-export]')!.onclick=()=>download('roleta-transacoes.json',{version:s.version,ledger:s.ledger,history:s.history});d.querySelector<HTMLButtonElement>('[data-benchmark]')!.onclick=()=>download('roleta-desempenho.json',{wheel:scene.report(),chips:chipLayer.report()});}
  let noticeTimer=0;
  function betNotice(text:string){const notice=q('.bet-notice');clearTimeout(noticeTimer);notice.textContent=text;notice.classList.add('visible');noticeTimer=window.setTimeout(()=>{notice.classList.remove('visible');},2800);}
  const fail=(e:unknown)=>{if(destroyed)return;const text=errorText(e);if(ready&&!store.pending&&!store.state.round){betNotice(text);audio.tone('error');return;}error=true;message=text;if(store.pending||!ready||store.state.round)phase='blocked';render();audio.tone('error');};
  async function sendChat(event:SubmitEvent){
    event.preventDefault();if(!options.online||chatSending)return;
    const input=q<HTMLInputElement>('.online-chat-input'),text=input.value.trim();if(!text)return;
    chatSending=true;render();
    try{await options.online.sendChat(text);if(!destroyed)q<HTMLInputElement>('.online-chat-input').value='';}
    catch(e){if(!destroyed)betNotice(errorText(e));}
    finally{chatSending=false;if(!destroyed)render();}
  }
  const click=(event:MouseEvent)=>{const el=(event.target as Element).closest<HTMLButtonElement>('button');if(!el||el.disabled)return;try{if(el.dataset.onlineTab){setOnlineTab(el.dataset.onlineTab as 'players'|'chat');}else if(el.dataset.chip){chip=+el.dataset.chip;audio.tone('chip');render();}else if(el.dataset.betId){if(heldBet===el.dataset.betId){heldBet=null;return;}add(el.dataset.betId);}else if(el.dataset.focusBet)focus(el.dataset.focusBet);else if(el.dataset.action)void action(el.dataset.action).catch(fail);}catch(e){fail(e);}};
  const change=(event:Event)=>{const el=event.target as HTMLSelectElement;if(el.matches('[data-kind]')){kind=el.value;populate();}if(el.matches('[data-bet]')){if(kind==='neighbours')neighbourNumber=+el.value;else selected=el.value;updateCoverage();}};
  const hover=(event:Event)=>{const el=(event.target as Element).closest<HTMLElement>('[data-bet-id]');if(el&&!locked()){preview=el.dataset.betId!;updateCoverage();}};
  const leave=(event:Event)=>{const next=(event as MouseEvent).relatedTarget as Element|null;if(!next?.closest?.('[data-bet-id]')){preview=null;updateCoverage();}};
  const down=(event:PointerEvent)=>{clearTimeout(holdTimer);const el=(event.target as Element).closest<HTMLElement>('[data-bet-id]');if(el&&!locked())holdTimer=window.setTimeout(()=>{heldBet=el.dataset.betId!;focus(heldBet);},520);};
  const up=()=>clearTimeout(holdTimer);
  const context=(event:MouseEvent)=>{const el=(event.target as Element).closest<HTMLElement>('[data-bet-id]');if(el&&!locked()){event.preventDefault();focus(el.dataset.betId!);}};
  const keyboard=(event:KeyboardEvent)=>{if(event.key!==' '||event.repeat||event.ctrlKey||event.altKey||event.metaKey||document.querySelector('dialog[open]')||(event.target instanceof Element&&event.target.closest('input,select,textarea,button,a,summary,[contenteditable]')))return;event.preventDefault();void action('spin').catch(fail);};
  async function initialize(){
    busy=true;phase=store.pending?'blocked':'recovering';render();
    try{
      if(options.online){
        const joined=await options.online.ready;if(destroyed)return;
        onlineState=joined.table;store.state.balance=joined.balance;ready=true;
        if(freshResult(onlineState?.result,joined.serverNow??Date.now())){skipRequested=audio.settings.reduced;await presentOnlineResult(onlineState!.result!);}
        else{if(onlineState?.result)handledOnlineRound=onlineState.result.id;phase='ready';visualBalance=null;}
      }else{
        await store.initialize();if(destroyed)return;ready=true;const r=store.state.round;
        if(r){visualBalance=store.state.balance-r.gross;scene.restore(r.number,r.rotor);if(r.phase==='spinning')await store.commit(reveal(store.state,r.rotor));message='Resultado confirmado recuperado. A liquidação não foi repetida.';skipRequested=audio.settings.reduced;await presentResult(store.state.round!);}
        else{phase='ready';visualBalance=null;if(store.state.history[0]){scene.restore(store.state.history[0].number,store.state.rotor);if(!cost(plan))lastShown=store.state.history[0];}}
      }
    }finally{busy=false;if(!destroyed)render();}
  }
  renderBoard();chipLayer=new RouletteChips(q('.felt-surface'),board);populate();
  const resize=new ResizeObserver(()=>{if(!destroyed){board.layout();chipLayer.reflow();renderOthers();}});resize.observe(q('.felt-surface'));
  root.addEventListener('click',click);root.addEventListener('submit',sendChat);root.addEventListener('change',change);root.addEventListener('pointerover',hover);root.addEventListener('pointerout',leave);root.addEventListener('focusin',hover);root.addEventListener('pointerdown',down);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',up);root.addEventListener('contextmenu',context);q('.bet-editor').addEventListener('toggle',updateCoverage);document.addEventListener('keydown',keyboard);
  stopOnline=options.online?.subscribe(snapshot=>{
    onlineState=snapshot.table;
    if(Number.isSafeInteger(snapshot.balance)){store.state.balance=snapshot.balance;if(!busy&&phase==='ready')visualBalance=null;}
    render();
    const result=onlineState?.result;
    if(ready&&!busy&&result&&handledOnlineRound!==result.id&&!freshResult(result,snapshot.now))handledOnlineRound=result.id;
    else if(ready&&!busy&&result&&handledOnlineRound!==result.id){
      busy=true;phase='locking';render();
      void presentOnlineResult(result).catch(fail).finally(()=>{busy=false;if(!store.state.round){phase='ready';visualBalance=null;}if(!destroyed)render();});
    }
  });
  render();const initialization=initialize();void initialization.catch(fail);
  return {ready:initialization,mode:options.wallet||options.online?'integrated' as const:'standalone' as const,getState:()=>clone(store.state),getSessionStatus:()=>({ready,busy,pending:store.pending||!!options.online?.getPending(),roundActive:!!store.state.round}),canLeave:()=>!busy&&!store.pending&&!options.online?.getPending()&&!store.state.round,getChipState:()=>chipLayer.inspect(),getPresentationState:()=>({phase,busy,numberVisible:numberVisible(),progress}),getBoardState:()=>board.inspect(),updateBalance:async()=>{if(busy||store.pending)return false;if(options.online){await options.online.retry();render();return true;}if(!options.wallet)return false;await store.initialize();render();return true;},expand:()=>root.requestFullscreen(),destroy:()=>{destroyed=true;stopOnline?.();stopChat?.();clearTimeout(chatExpiryTimer);clearTimeout(noticeTimer);clearTimeout(holdTimer);settlementAbort?.abort();scene.onTick=undefined;resize.disconnect();root.removeEventListener('click',click);root.removeEventListener('submit',sendChat);root.removeEventListener('change',change);root.removeEventListener('pointerover',hover);root.removeEventListener('pointerout',leave);root.removeEventListener('focusin',hover);root.removeEventListener('pointerdown',down);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',up);root.removeEventListener('contextmenu',context);document.removeEventListener('keydown',keyboard);scene.destroy();chipLayer.destroy();audio.destroy();root.replaceChildren();}};
}
