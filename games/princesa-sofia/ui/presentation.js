import { prizeTier, prizeStyle } from './payout-presentation.js';
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const counting = new WeakMap();
let floatingPrize;
export function pulse(element) {
 if (!element || reduce.matches || document.hidden) return;
 element.animate([{filter:'brightness(1)',scale:'1'},{filter:'brightness(1.35)',scale:'1.035'},{filter:'brightness(1)',scale:'1'}],{duration:340});
}
export function countAmount(element,from,to,format,duration=450) {
 counting.get(element)?.();
 let frame,done=false;
 const finish=()=>{if(done)return;done=true;cancelAnimationFrame(frame);element.textContent=format(to);counting.delete(element);};
 counting.set(element,finish);
 if (reduce.matches || document.hidden || !duration) return finish();
 const start=performance.now();
 const tick=now=>{if(done)return;const t=Math.min(1,(now-start)/duration);element.textContent=format(Math.round(from+(to-from)*(1-(1-t)**3)));if(t===1)finish();else frame=requestAnimationFrame(tick);};
 frame=requestAnimationFrame(tick);
}
export function finishCounts() { floatingPrize?.cancel(); for(const el of document.querySelectorAll('#win,#balance,#notice-total')) counting.get(el)?.(); }
export async function flyXP(board,target,positions,duration) {
 if(reduce.matches||document.hidden||duration<=0)return;
 const end=target.getBoundingClientRect();
 await Promise.all([...new Set(positions)].filter(p=>!board.querySelector(`[data-position="${p}"]`)?.classList.contains('wild')).slice(0,6).map(async p=>{
  const cell=board.querySelector(`[data-position="${p}"]`);if(!cell)return;
  const start=cell.getBoundingClientRect(),spark=document.createElement('span');
  spark.setAttribute('aria-hidden','true');
  Object.assign(spark.style,{position:'fixed',left:`${start.x+start.width/2}px`,top:`${start.y+start.height/2}px`,width:'6px',height:'6px',background:'#fff7ec',boxShadow:'0 0 8px 3px #d9c4f5',borderRadius:'50%',pointerEvents:'none',zIndex:'50'});
  document.body.append(spark);
  try{await spark.animate([{opacity:0},{opacity:1,offset:.15},{opacity:0,transform:`translate(${end.x+end.width/2-start.x-start.width/2}px,${end.y-start.y-start.height/2}px)`}],{duration,easing:'ease-in'}).finished;}finally{spark.remove();}
 }));
}
export function showRibbon(text,kind='win') {
 const el=document.getElementById('event-ribbon');el.replaceChildren();if(kind==='retrigger'){const art=document.createElement('img');art.src='ui/art/retrigger.png';art.alt='';el.append(art);}const caption=document.createElement('strong');caption.textContent=text;el.append(caption);el.dataset.kind=kind;el.hidden=false;
 clearTimeout(el.dismiss);pulse(el);el.dismiss=setTimeout(()=>{el.hidden=true;},kind==='win'?1500:950);
}
// Espera interrompivel: termina mais cedo se o jogador acelerar (fast-forward).
function beatWait(ms, skip) {
 return new Promise(resolve => {
  const start = performance.now();
  const tick = () => (skip?.() || document.hidden || performance.now() - start >= ms) ? resolve() : requestAnimationFrame(tick);
  tick();
 });
}
function pop(el, beat, from = .55) {
 if (reduce.matches || !beat) return;
 el.animate([{ opacity: 0, scale: from }, { opacity: 1, scale: 1.18, offset: .6 }, { opacity: 1, scale: 1 }], { duration: Math.max(90, beat * .8), easing: 'cubic-bezier(.2,.8,.3,1.2)' });
}
/**
 * Ganho de um hit. Quando um WILD com multiplicador participa (multiplicador total > 1) e beat > 0,
 * mostra primeiro o calculo por etapas: ganho do cluster -> "× N" -> resultado; so depois o valor
 * final sobe e desaparece. beat (ms) vem da velocidade de jogo. A promessa so resolve no fim de tudo,
 * para a pipeline apresentar um hit de cada vez.
 */
export async function showHitAmount(hit,board,receivedUnits,format,duration=1000,{betUnits=100,beat=0,skip,onBeat}={}) {
 const layer=document.getElementById('group-prizes');layer.replaceChildren();
 if(receivedUnits<=0)return;
 const cells=hit.positions.map(p=>board.querySelector(`[data-position="${p}"]`)).filter(Boolean);
 const label=document.createElement('span');label.className='group-prize';
 const multiple=(Number(hit.rawPay100)||0)/100;
 const applyTier=value=>{label.dataset.tier=prizeTier(value);label.removeAttribute('style');const style=prizeStyle(value);if(style)Object.assign(label.style,style);};
 const x=cells.reduce((sum,el)=>sum+el.offsetLeft+el.offsetWidth/2,0)/cells.length;
 const y=cells.reduce((sum,el)=>sum+el.offsetTop+el.offsetHeight/2,0)/cells.length;
 const place=()=>{label.style.left=`${x+board.offsetLeft}px`;label.style.top=`${y+board.offsetTop}px`;};
 let multiplier=1n;try{multiplier=BigInt(hit.multiplier??1);}catch{}
 const showCalc=multiplier>1n&&beat>0&&duration>0&&!document.hidden&&!reduce.matches&&!skip?.();
 if(showCalc){
  // 1) ganho do cluster sem multiplicador
  const base100=BigInt(hit.rawPay100)/multiplier;
  const baseUnits=Number(base100*BigInt(betUnits)/100n);
  applyTier(Number(base100)/100);place();label.classList.add('prize-calc');
  const part=(cls,text)=>{const el=document.createElement('span');el.className=cls;el.textContent=text;return el;};
  const baseEl=part('calc-base',format(baseUnits/100));
  label.append(baseEl);layer.append(label);pop(baseEl,beat);onBeat?.('base');
  await beatWait(beat,skip);
  // 2) "× N": os WILDs do hit brilham ao mesmo tempo
  if(!skip?.()){
   const op=part('calc-op','×'),mult=part('calc-mult',`${multiplier}`);
   label.append(op,mult);pop(op,beat,.3);pop(mult,beat,.3);onBeat?.('multiplier');
   cells.filter(c=>c.classList.contains('wild')).forEach(c=>{const art=c.querySelector('.wild-art')??c;art.animate([{scale:1,filter:'brightness(1)'},{scale:1.12,filter:'brightness(1.45) drop-shadow(0 0 10px #e9d9ff)',offset:.45},{scale:1,filter:'brightness(1)'}],{duration:Math.max(160,beat*1.4),easing:'ease-out'});});
   await beatWait(beat*1.15,skip);
  }
  // 3) a operacao funde-se e transforma-se no resultado
  if(!skip?.()){
   await label.animate([{scale:1,opacity:1,filter:'blur(0)'},{scale:.7,opacity:.25,filter:'blur(2px)'}],{duration:Math.max(70,beat*.35),easing:'ease-in'}).finished.catch(()=>{});
  }
  label.classList.remove('prize-calc');label.replaceChildren(format(receivedUnits/100));applyTier(multiple);place();
  if(!skip?.()){
   label.animate([{scale:.6,filter:'brightness(1.8)'},{scale:1.28,filter:'brightness(1.3)',offset:.55},{scale:1,filter:'brightness(1)'}],{duration:Math.max(110,beat*.9),easing:'cubic-bezier(.2,.8,.3,1.2)'});
   onBeat?.('result');
   await beatWait(beat*.9,skip);
  }
 } else {
  label.textContent=format(receivedUnits/100);applyTier(multiple);place();layer.append(label);
 }
 if(document.hidden||!duration||skip?.()){label.remove();return;}
 // 4) animacao habitual: sobe e desaparece
 const frames=reduce.matches?[{opacity:1},{opacity:1}]:[{opacity:showCalc?1:0,translate:showCalc?'0 0':'0 8px'},{opacity:1,translate:'0 0',offset:.18},{opacity:1,translate:'0 -8px',offset:.55},{opacity:0,translate:'0 -44px'}];
 const animation=label.animate(frames,{duration:reduce.matches?Math.min(200,duration):duration,easing:'ease-out'});floatingPrize=animation;
 try{await animation.finished;}catch{}finally{label.remove();if(floatingPrize===animation)floatingPrize=null;}
}
// Two 400 ms rainbow flashes when the full XP bar triggers the magic.
export function flashXPBar(bar) {
 if (!bar || reduce.matches || document.hidden) return;
 bar.animate([
  { boxShadow: '0 0 0 0 transparent' },
  { boxShadow: '0 0 18px 5px #ff8a8a, 0 0 30px 10px #ffd98acc', offset: .25 },
  { boxShadow: '0 0 0 0 transparent', offset: .5 },
  { boxShadow: '0 0 18px 5px #9ec9ff, 0 0 30px 10px #d9a8ffcc', offset: .75 },
  { boxShadow: '0 0 0 0 transparent' },
 ], { duration: 1600, easing: 'ease-in-out' });
}
export async function enterScene() {
 const entrances=[];
 for (const [index,element] of [...document.querySelectorAll('.widget-toolbar,.xp-panel,.board-frame,.game-sidebar,.control-deck')].entries()) {
  if(!reduce.matches) entrances.push(element.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,delay:index*65,fill:'backwards'}).finished);
 }
 await Promise.allSettled(entrances);
}
export function installPresentation() {
 const notice=document.getElementById('notice-dialog');
 function positionNotice() {
  if(!notice.open)return;
  const board=document.querySelector('.board-frame').getBoundingClientRect();
  const scale=Math.min(board.width/560,board.height/420,.95*innerWidth/560,.95*innerHeight/420);
  notice.style.left=`${board.left+board.width/2}px`;notice.style.top=`${board.top+board.height/2}px`;
  notice.style.transform=`translate(-50%,-50%) scale(${scale})`;
 }
 const observer=new MutationObserver(()=>{positionNotice();if(notice.open)pulse(notice.querySelector('.notice-emblem'));});
 observer.observe(notice,{attributes:true,attributeFilter:['open']});
 addEventListener('resize',()=>requestAnimationFrame(positionNotice));
 document.addEventListener('fullscreenchange',()=>requestAnimationFrame(positionNotice));
 document.addEventListener('game-layout',positionNotice);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finishCounts();});
 document.getElementById('spin').addEventListener('click',finishCounts);
 for(const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('close',()=>{finishCounts();});
 }
 const controls=document.querySelector('.control-deck');
 controls.addEventListener('click',event=>{const button=event.target.closest('button');if(button)pulse(button);});
}
