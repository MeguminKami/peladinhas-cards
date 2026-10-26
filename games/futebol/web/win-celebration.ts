import {lockContinuation} from './continuation.ts';
import {audioCue,counterAudio,setAudioScene,audioStatus} from './audio.ts';
import {winTiers,winTierIndex,winMilestones} from './win-tiers.ts';
import './win-celebration.css';
interface Options {speed:'normal'|'fast'|'super';reduced:boolean;signal:AbortSignal;control:(finish:()=>void)=>void;cue:(tier:number)=>void}
const numberFormat=new Intl.NumberFormat('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2});
const money=(cents:number)=>numberFormat.format(cents/100);
const trophy='<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M28 12h44v21c0 21-10 29-22 29S28 54 28 33zM28 19H13v14c0 15 10 22 23 22M72 19h15v14c0 15-10 22-23 22M50 62v20M30 88h40M36 81h28" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="m50 22 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1z" fill="currentColor"/></svg>';
export async function celebrateWin(paid:number,bet:number,options:Options){
  if(paid<=0||options.signal.aborted||document.hidden)return;
  const board=document.getElementById('board')!,hud=document.getElementById('spin-pay')!,index=winTierIndex(paid,bet);
  if(index<0)return;
  const previousScene=audioStatus().scene;const large=index>=3;if(large)setAudioScene('win');let frame=0,timer:ReturnType<typeof setTimeout>|undefined,done=false,final=false,stage=-1,resolveDone!:()=>void;
  const finished=new Promise<void>(resolve=>resolveDone=resolve);
  const previousFocus=document.activeElement as HTMLElement|null;
  const node=document.createElement(large?'dialog':'div');node.className=large?'win-celebration':'compact-win';
  node.classList.toggle('reduced',options.reduced);
  function close(){if(done)return;done=true;cancelAnimationFrame(frame);clearTimeout(timer);options.signal.removeEventListener('abort',close);document.removeEventListener('visibilitychange',visibility);if(node instanceof HTMLDialogElement&&node.open)node.close();node.remove();board.classList.remove('win-reaction');hud.textContent=money(paid);if(large&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true});if(large)setAudioScene(previousScene);resolveDone();}
  function visibility(){if(document.hidden)close();}
  function setStage(i:number){
    if(i===stage)return;stage=i;node.dataset.tier=String(i);node.dataset.rank=winTiers[i]?.key??'credit';
    node.querySelector<HTMLElement>('.win-stage-name')!.textContent=winTiers[i]?.name??'Ganho';
    node.classList.remove('tier-impact');requestAnimationFrame(()=>{if(!done)node.classList.add('tier-impact');});try{options.cue(i);}catch{/* Optional audio cannot interrupt the confirmed result. */}
  }
  let lastMoney='',lastMultiple='';let moneyNode:HTMLElement|null=null,multipleNode:HTMLElement|null=null;
  function display(value:number){
    const amount=Math.max(0,Math.min(paid,value)),text=money(Math.floor(amount));
    if(text!==lastMoney){lastMoney=text;if(!large)hud.textContent=text;else (moneyNode??=node.querySelector<HTMLElement>('.win-money')!).textContent=text;}
    // The multiplier follows continuous progress, not rounded cents: at low bets
    // its digits otherwise stand still for several frames and then jump together.
    if(large){const multiple=numberFormat.format(amount/bet)+'× A APOSTA';if(multiple!==lastMultiple){lastMultiple=multiple;(multipleNode??=node.querySelector<HTMLElement>('.win-multiple')!).textContent=multiple;}counterAudio(amount/paid);}
  }
  function revealFinal(){
    if(done)return;if(final){close();return;}final=true;audioCue('final');cancelAnimationFrame(frame);setStage(index);display(paid);node.dataset.phase='final';lockContinuation();
    if(large){node.querySelector<HTMLButtonElement>('button')!.textContent='CONTINUAR';node.querySelector<HTMLElement>('.win-hint')!.textContent='Prémio confirmado';}
    if(large){const button=node.querySelector<HTMLButtonElement>('button')!;button.hidden=false;}else timer=setTimeout(close,400);
  }
  if(large){
    node.setAttribute('aria-label','Celebração do ganho');node.setAttribute('aria-modal','true');
    node.innerHTML=`<div class="win-stadium" aria-hidden="true"><div class="win-backdrops">${['39,94,91','125,89,35','40,97,167','104,51,155','171,123,39'].map((color,i)=>`<div class="win-backdrop win-backdrop-${i+4}" style="--glow:${color}"></div>`).join('')}</div><div class="win-rays"></div><div class="win-goal-net"></div><div class="win-cup">${trophy}</div><div class="win-particles">${Array.from({length:40},(_,i)=>`<i style="--i:${i};--x:${(i*37+11)%100};--delay:${-(i%13)*.17}s;--drift:${(i*23)%100-50}px"></i>`).join('')}</div><div class="win-ring"></div></div><div class="win-content"><span class="win-eyebrow">FUTEBOL DE BAIRRO · NOITE DE GLÓRIA</span><h2 class="win-stage-name"></h2><span class="win-value-label">GANHO DO SPIN</span><strong class="win-money" aria-live="off"></strong><span class="win-multiple"></span><span class="win-hint">O prémio está a subir…</span><button class="win-finish" hidden>CONTINUAR</button></div>`;
    document.body.append(node);(node as HTMLDialogElement).showModal();lockContinuation();
    node.addEventListener('click',revealFinal);node.addEventListener('cancel',event=>{event.preventDefault();revealFinal();});
    node.dataset.phase='counting';setStage(3);display(0);
  }else{
    node.innerHTML='<span class="win-stage-name"></span>';document.querySelector('.current-win')!.append(node);board.classList.add('win-reaction');setStage(index);
  }
  options.signal.addEventListener('abort',close,{once:true});document.addEventListener('visibilitychange',visibility);options.control(large?revealFinal:close);
  const targets=large?winMilestones(paid,bet):[paid];let segment=0,from=0,start=performance.now();
  // Large celebrations have their own readable pace, independent of reel speed.
  const segmentMs=()=>large?(segment===0?1800:2600+Math.min(1400,Math.log2(Math.max(1,targets[segment]/Math.max(1,from)))*400)):(options.speed==='normal'?700:options.speed==='fast'?480:320);
  function tick(now:number){
    if(done||final)return;const progress=Math.min(1,(now-start)/segmentMs()),target=targets[segment],eased=large?progress:progress*progress*(3-2*progress),value=from+(target-from)*eased;
    display(value);if(large)setStage(Math.max(3,winTierIndex(Math.floor(value),bet)));
    if(progress>=1){from=target;segment++;start=now;if(segment>=targets.length){revealFinal();return;}if(large)setStage(Math.max(3,winTierIndex(target,bet)));}
    frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  try{await finished;}finally{close();}
}
