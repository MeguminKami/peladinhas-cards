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
export async function showHitAmount(hit,board,receivedUnits,format,duration=1000) {
 const layer=document.getElementById('group-prizes');layer.replaceChildren();
 if(receivedUnits<=0)return;
 const cells=hit.positions.map(p=>board.querySelector(`[data-position="${p}"]`)).filter(Boolean);
 const label=document.createElement('span');label.className='group-prize';
 label.textContent=format(receivedUnits/100);
 const multiple=(Number(hit.rawPay100)||0)/100;
 label.dataset.tier=prizeTier(multiple);
 const style=prizeStyle(multiple);
 if(style)Object.assign(label.style,style);
 const x=cells.reduce((sum,el)=>sum+el.offsetLeft+el.offsetWidth/2,0)/cells.length;
 const y=cells.reduce((sum,el)=>sum+el.offsetTop+el.offsetHeight/2,0)/cells.length;
 label.style.left=`${x+board.offsetLeft}px`;label.style.top=`${y+board.offsetTop}px`;layer.append(label);
 if(document.hidden||!duration){label.remove();return;}
 const frames=reduce.matches?[{opacity:1},{opacity:1}]:[{opacity:0,translate:'0 8px'},{opacity:1,translate:'0 0',offset:.18},{opacity:1,translate:'0 -8px',offset:.55},{opacity:0,translate:'0 -44px'}];
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
