import {audioCue,reelAudio,suspenseAudio,stopEffects} from './audio.ts';
﻿import type {Board} from '../src/board.ts';
import type {SpinResult} from '../src/engine.ts';
import {powerTitles,previewBoard,symbolMarkup,symbolArt} from './theme.ts';
import './animation-v2.css';
import {landingPlan} from './reel-motion.ts';

type PowerEvent=NonNullable<SpinResult['detail']>['events'][number];
export interface Snapshot {board:Board;events:PowerEvent[];sticky?:number[]}
export interface Options {speed:'normal'|'fast'|'super';reduced:boolean;signal:AbortSignal;draw:(snapshot:Snapshot)=>void;message:(title:string,subtitle:string)=>void}
function pause(ms:number,signal:AbortSignal){return new Promise<void>(resolve=>{if(signal.aborted){resolve();return;}const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve();};const timer=setTimeout(done,ms);signal.addEventListener('abort',done,{once:true});});}
const cell=(p:number)=>document.querySelector<HTMLElement>(`.cell[data-position="${p}"]`);
function point(el:HTMLElement,root:HTMLElement){const a=el.getBoundingClientRect(),b=root.getBoundingClientRect();return {x:a.left+a.width/2-b.left,y:a.top+a.height/2-b.top};}
function clean(root:HTMLElement){[...root.querySelectorAll('.v2-overlay'),...document.querySelectorAll('.v2-hud-flight')].forEach(el=>{el.getAnimations().forEach(a=>a.cancel());el.remove();});root.querySelectorAll<HTMLElement>('.reel-hidden').forEach(el=>el.classList.remove('reel-hidden'));root.classList.remove('reeling','busy');}
function context(options:Options){const controller=new AbortController();const abort=()=>controller.abort();const visibility=()=>{if(document.hidden)abort();};options.signal.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',visibility);if(options.signal.aborted||document.hidden)abort();return {signal:controller.signal,dispose:()=>{options.signal.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',visibility);}};}
async function reels(board:Board,sticky:number[],options:Options,signal:AbortSignal,scatterLimit=4){
  const root=document.getElementById('board')!;
  // Capture the actual last visible state (including power transformations),
  // before drawing the next outcome underneath the moving reel lanes.
  const previous=Array.from({length:24},(_,p)=>{
    const original=cell(p)!;
    return {node:original.cloneNode(true) as HTMLElement,art:original.querySelector<HTMLElement>('.symbol-art')!.getBoundingClientRect()};
  });
  options.draw({board:[...board],events:[],sticky});root.classList.add('reeling');reelAudio(true);
  const bounds=root.getBoundingClientRect(),lanes:HTMLElement[]=[],animations:Animation[]=[];
  const cycle=options.reduced?230:{normal:145,fast:95,super:55}[options.speed];
  for(let col=0;col<6;col++){
    const first=cell(col)!,last=cell(18+col)!,a=first.getBoundingClientRect(),b=last.getBoundingClientRect();
    const lane=document.createElement('div');lane.className='reel-lane v2-overlay';lane.dataset.column=String(col);Object.assign(lane.style,{left:`${a.left-bounds.left-root.clientLeft}px`,top:`${a.top-bounds.top-root.clientTop}px`,width:`${a.width}px`,height:`${b.bottom-a.top}px`});
    const step=(b.top-a.top)/3,strip=document.createElement('div');strip.className='reel-strip';strip.style.setProperty('--reel-step',`${step}px`);
    // The first visible four cells are exactly those left by the previous spin.
    // A repeated prefix makes the cruise wrap seamless without resetting the board.
    // Filler symbols are decorative and never consume the engine's RNG.
    const cycleLength=10;
    for(let i=0;i<cycleLength+4;i++){
      const index=i%cycleLength,item=document.createElement('div');item.className='reel-symbol';item.style.height=step+'px';
      if(index<4){
        const old=previous[index*6+col],clone=old.node.cloneNode(true) as HTMLElement;
        clone.removeAttribute('data-position');clone.removeAttribute('aria-label');clone.classList.remove('reel-hidden','reel-landed','scatter-arrived','win');clone.classList.add('reel-cell');
        clone.style.width='100%';clone.style.height=a.height+'px';
        const art=clone.querySelector<HTMLElement>('.symbol-art')!;art.style.width=old.art.width+'px';art.style.height=old.art.height+'px';
        item.dataset.symbol=clone.dataset.symbol;item.dataset.previous='true';item.append(clone);
      }else item.innerHTML=symbolMarkup(previewBoard[(index*5+col*3)%previewBoard.length],true);
      strip.append(item);
    }
    lane.append(strip);root.append(lane);lanes.push(lane);
    const stops:string[]=[];for(let row=0;row<4;row++){const p=row*6+col;if(sticky.includes(p))stops.push(`transparent ${row*step}px ${row*step+a.height}px`);else {stops.push(`#000 ${row*step}px ${(row+1)*step}px`);cell(p)?.classList.add('reel-hidden');}}
    if(sticky.some(p=>p%6===col))lane.style.maskImage=`linear-gradient(to bottom,${stops.join(',')})`;
    animations.push(strip.animate([{transform:`translateY(-${step*cycleLength}px)`},{transform:'translateY(0)'}],{duration:cycle*cycleLength,iterations:Infinity,easing:'linear'}));
  }
  const running:Promise<void>[]=[];let previousEnd=0,landedScatters=0;
  const stagger=options.reduced?30:{normal:105,fast:75,super:45}[options.speed];
  async function land(col:number,suspense:boolean){
    const lane=lanes[col],strip=lane.querySelector<HTMLElement>('.reel-strip')!,step=parseFloat(strip.style.getPropertyValue('--reel-step'));
    const phase=new DOMMatrixReadOnly(getComputedStyle(strip).transform).m42,now=performance.now();
    const plan=landingPlan(phase,step,cycle,now,previousEnd+stagger,suspense,options.reduced);previousEnd=now+plan.duration;
    // Only discard fully offscreen cells. Visible DOM nodes retain their exact
    // positions when the real outcome and any cruise padding are prepended.
    animations[col].cancel();
    for(let i=0;i<plan.trim;i++)strip.firstElementChild?.remove();
    const leading=document.createDocumentFragment();
    for(let row=0;row<4;row++){
      const p=row*6+col,original=cell(p)!,item=document.createElement('div');item.className='reel-symbol reel-final';item.dataset.symbol=board[p];item.style.height=step+'px';
      const clone=original.cloneNode(false) as HTMLElement;clone.removeAttribute('data-position');clone.removeAttribute('aria-label');clone.classList.remove('reel-hidden');clone.classList.add('reel-cell');clone.style.height=original.getBoundingClientRect().height+'px';clone.style.width='100%';
      clone.innerHTML=symbolMarkup(board[p],true);const art=clone.querySelector<HTMLElement>('.symbol-art')!,originalArt=original.querySelector<HTMLElement>('.symbol-art')!.getBoundingClientRect();art.style.width=originalArt.width+'px';art.style.height=originalArt.height+'px';
      item.append(clone);leading.append(item);
    }
    for(let i=0;i<plan.padding;i++){const item=document.createElement('div');item.className='reel-symbol';item.style.height=step+'px';item.innerHTML=symbolMarkup(previewBoard[(col*3+i*5)%previewBoard.length],true);leading.append(item);}
    strip.prepend(leading);
    lane.classList.add('reel-landing');lane.dataset.distance=String(plan.distance);lane.dataset.duration=String(plan.duration);
    const animation=strip.animate([{transform:`translate3d(0,${plan.start}px,0)`},{transform:'translate3d(0,0,0)'}],{duration:plan.duration,easing:plan.easing,fill:'forwards'});animations[col]=animation;
    await new Promise<void>(resolve=>{
      const abort=()=>{animation.cancel();resolve();};signal.addEventListener('abort',abort,{once:true});
      void animation.finished.then(()=>resolve(),()=>resolve()).finally(()=>signal.removeEventListener('abort',abort));if(signal.aborted)abort();
    });
    if(signal.aborted||!lane.isConnected)return;
    // Handoff at the animation's actual finish, with identical cell geometry.
    for(let row=0;row<4;row++){const p=row*6+col;cell(p)?.classList.remove('reel-hidden');cell(p)?.classList.add('reel-landed');if(board[p]==='S')cell(p)?.classList.add('scatter-arrived');}
    audioCue('land',col);for(let row=0;row<4;row++){const p=row*6+col;if(board[p]==='S')audioCue('scatter',++landedScatters);else if(board[p]==='W'&&!sticky.includes(p))audioCue('wild');}
    lane.remove();animation.cancel();
  }
  try{
    await pause(options.reduced?100:{normal:450,fast:220,super:60}[options.speed],signal);
    let precedingScatters=0;
    for(let col=0;col<6&&!signal.aborted;col++){
      const suspense=precedingScatters>=2&&precedingScatters<scatterLimit;
      // Normal reels settle in parallel with ordered finishes. Anticipation
      // starts only once the preceding Scatters have physically landed.
      if(suspense)await Promise.all(running);
      if(col)await pause(stagger,signal);if(signal.aborted)break;
      if(suspense){suspenseAudio();lanes[col].classList.add('reel-suspense');options.message(precedingScatters===2?'À procura da final…':'A noite de glória está perto…','Mais um bilhete pode aparecer nas colunas por revelar.');}
      const task=land(col,suspense);void task.catch(()=>{});running.push(task);
      precedingScatters+=Array.from({length:4},(_,row)=>board[row*6+col]).filter(s=>s==='S').length;
    }
    await Promise.all(running);
  }finally{reelAudio(false);if(signal.aborted)stopEffects();animations.forEach(a=>a.cancel());clean(root);}
}

function trail(root:HTMLElement,from:HTMLElement,to:HTMLElement,power:string,duration=350){
  const a=point(from,root),b=point(to,root),beam=document.createElement('i');beam.className=`v2-overlay v2-energy power-${power}`;
  Object.assign(beam.style,{left:`${a.x}px`,top:`${a.y}px`,width:`${Math.hypot(b.x-a.x,b.y-a.y)}px`,transform:`rotate(${Math.atan2(b.y-a.y,b.x-a.x)}rad)`});root.append(beam);
  const orb=document.createElement('i');orb.className=`v2-overlay v2-orb power-${power}`;orb.style.left=`${a.x}px`;orb.style.top=`${a.y}px`;root.append(orb);orb.animate([{transform:'translate(-50%,-50%) scale(.6)'},{transform:`translate(calc(-50% + ${b.x-a.x}px),calc(-50% + ${b.y-a.y}px)) scale(1.3)`}],{duration,fill:'forwards',easing:'ease-in-out'});
  if(!root.contains(to)){
    // The HUD lives outside the board's clipped viewport; a fixed flight can reach it.
    orb.remove();const flight=document.createElement('i'),bounds=root.getBoundingClientRect();flight.className='v2-hud-flight';Object.assign(flight.style,{position:'fixed',left:`${a.x+bounds.left}px`,top:`${a.y+bounds.top}px`,width:'24px',height:'24px',borderRadius:'50%',background:'#fff6cb',boxShadow:'0 0 14px 8px #ffc45a',zIndex:'100',pointerEvents:'none'});document.body.append(flight);flight.animate([{transform:'translate(-50%,-50%) scale(.6)'},{transform:`translate(calc(-50% + ${b.x-a.x}px),calc(-50% + ${b.y-a.y}px)) scale(1.1)`}],{duration,fill:'forwards',easing:'ease-in-out'});
  }
}
export function powerEmblemMarkup(power:string){
  const paths:Record<string,string>={
    P1:'<path d="m6 3 10 10L26 3l3 3-10 10 10 10-3 3-10-10L6 29l-3-3 10-10L3 6z" fill="currentColor"/>',
    P2:'<path d="m16 2-9 9h6v10H7l9 9 9-9h-6V11h6z" fill="currentColor"/>',
    P3:'<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="m4 11 10-4 8 20-10 4z"/><path d="m11 5 11-1 2 23-11 1z"/><path d="m19 6 10 4-8 20-10-4z"/></g>',
    P4:'<path d="M3 8 10 14 16 4 22 14 29 8l-4 17H7z" fill="currentColor"/><path d="M8 29h16" stroke="currentColor" stroke-width="3"/>',
  };
  return `<span class="power-emblem" aria-hidden="true"><svg viewBox="0 0 32 32">${paths[power]??paths.P1}</svg></span>`;
}
function badge(p:number,power:string){const el=cell(p);if(!el)return;el.dataset.power=power;el.classList.add('powered-wild',`power-${power}`);if(!el.querySelector('.power-emblem'))el.insertAdjacentHTML('beforeend',powerEmblemMarkup(power));}
function announcePower(root:HTMLElement,event:PowerEvent,duration:number,reduced:boolean){
  const effects:Record<string,string>={P1:'WILD ×2 · TOQUE DE CLASSE',P2:'ARRANQUE · EXPANSÃO VERTICAL',P3:`PASSE DECISIVO · ${event.targets.length} CARTAS · ${symbolArt[event.conversionSymbol??'P3'].name.toUpperCase()}`,P4:`GOLO DE GLÓRIA · GLOBAL +${event.factor}`};
  const banner=document.createElement('div');banner.className=`power-announcement theme-${event.power}${reduced?' reduced':''}`;banner.dataset.power=event.power;banner.style.setProperty('--announcement-time',`${duration}ms`);
  banner.innerHTML=`<div class="power-stage"><div class="power-motif">${powerEmblemMarkup(event.power)}${Array.from({length:6},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><img class="power-player" src="${symbolArt[event.power as keyof typeof symbolArt].src}" alt=""><div class="power-announcement-copy"><small>PODER ROUBADO PELO WILD</small><strong>${powerTitles[event.power]}</strong><span>${effects[event.power]}</span></div></div>`;
  root.append(banner);return banner;
}
export async function presentSpin(result:SpinResult,options:Options){
  const detail=result.detail;if(!detail)return;const ctx=context(options),{signal}=ctx,root=document.getElementById('board')!,hud=document.getElementById('global');
  const current=[...detail.initial],events:PowerEvent[]=[],sticky=[...detail.stickyBefore];let global=detail.globalBefore??1;
  // Base-game steals are rare: allow time to read them even at fast reel speeds.
  const duration=result.mode==='base'
    ?(options.reduced?3000:{normal:3600,fast:3000,super:2600}[options.speed])
    :(options.reduced?750:{normal:1500,fast:1050,super:700}[options.speed]);
  try{
    if(hud)hud.textContent='Global ×'+global;options.message('A bola está a rolar…','CONCLUIR revela o resultado já guardado.');
    await reels(current,sticky,options,signal,result.mode==='base'?4:3);
    for(const event of detail.events){
      if(signal.aborted)break;
      const source=detail.steals.find(s=>s.position===event.position)?.source;
      const origin=source===null||source===undefined?null:cell(source),wild=cell(event.position);
      audioCue('charge');const announcement=announcePower(root,event,duration,options.reduced);
      if(origin&&wild){origin.classList.add('power-source-v2');wild.classList.add('power-charge');trail(root,origin,wild,event.power,duration*.4);}
      options.message(powerTitles[event.power],event.power==='P1'?'O Wild dobra as suas linhas e multiplica pelo global.':event.power==='P2'?'Expansão vertical: os vizinhos recebem Wilds.':event.power==='P3'?`${event.targets.length} posições recebem ${symbolArt[event.conversionSymbol??'P3'].name}.`:`+${event.factor} ao multiplicador global.`);
      await pause(duration*.45,signal);if(signal.aborted)break;
      // Reveal the board before applying the effect; the title must not cover its targets.
      announcement.remove();
      clean(root);audioCue('power',Number(event.power[1]));events.push(event);if(event.power==='P2')event.targets.forEach(p=>current[p]='W');if(event.power==='P3')event.targets.forEach(p=>current[p]=event.conversionSymbol??'P3');if(event.power==='P4')global+=event.factor;
      options.draw({board:[...current],events:[...events],sticky:[...sticky]});for(const e of events)badge(e.position,e.power);
      for(const [targetIndex,target] of event.targets.entries()){if(event.power==='P3'&&targetIndex<4)audioCue('convert',Number((event.conversionSymbol??'P3')[1]),targetIndex*.07);cell(target)?.classList.add('power-impact',`power-${event.power}`);if(target!==event.position&&cell(event.position)&&cell(target))trail(root,cell(event.position)!,cell(target)!,event.power,duration*.5);}
      if(hud){hud.textContent='Global ×'+global;if(event.power==='P4'){hud.classList.remove('global-impact');void hud.offsetWidth;hud.classList.add('global-impact');if(cell(event.position))trail(root,cell(event.position)!,hud,event.power,duration*.5);}}
      await pause(duration*.55,signal);
      if(result.mode==='base')await pause(450,signal);
    }
    if(!signal.aborted&&detail.newSticky.length){audioCue('sticky');clean(root);sticky.push(...detail.newSticky);options.draw({board:[...current],events:[...events],sticky});for(const e of events)badge(e.position,e.power);for(const p of detail.newSticky){cell(p)?.classList.add('sticky','sticky-acquired-v2');}options.message('Craque fixo!',`${detail.newSticky.length} Wild(s) dourados ficam ancorados até ao fim do bónus.`);await pause(duration,signal);}
  }finally{root.querySelectorAll('.power-announcement').forEach(el=>el.remove());clean(root);hud?.classList.remove('global-impact');ctx.dispose();}
}
export function makeBonusActivationBoard(mode:'normal'|'superior'|'legend'):Board{
  const board:Board=previewBoard.map(s=>s==='S'?'N1':s),count=mode==='normal'?3:mode==='legend'?5:4;
  // Presentation-only entropy, independent of the persisted mathematical RNG.
  const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
  const columns=[0,1,2,3,4,5];
  for(let i=columns.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[columns[i],columns[j]]=[columns[j],columns[i]];}
  for(const col of columns.slice(0,count))board[Math.floor(random()*4)*6+col]='S';
  return board;
}
export async function presentBonusActivation(mode:'normal'|'superior'|'legend',options:Options){
  const ctx=context(options),board=makeBonusActivationBoard(mode),count=mode==='normal'?3:mode==='legend'?5:4;
  try{options.message('Os bilhetes estão a entrar…','Apresentação da compra de bónus — 10 jogadas grátis.');await reels(board,[],options,ctx.signal,count);}
  finally{clean(document.getElementById('board')!);ctx.dispose();}
}

