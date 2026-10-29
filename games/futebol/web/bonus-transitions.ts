import {symbolMarkup,bonusArt} from './theme.ts';
import {audioCue} from './audio.ts';
import './bonus-transitions.css';

type Transition={kind:'entry'|'retrigger'|'final';mode:'normal'|'superior'|'legend';reduced:boolean;signal:AbortSignal};
/** Presentation only: never reads or changes the game session. */
export async function presentBonusTransition({kind,mode,reduced,signal}:Transition){
 const board=document.getElementById('board')!;
 if(signal.aborted)return;
 const root=document.createElement('div');root.className='bonus-transition';root.dataset.kind=kind;root.dataset.mode=mode;root.setAttribute('role','status');
 const title=kind==='final'?'APITO FINAL':kind==='retrigger'?'PROLONGAMENTO':'A FINAL É NOSSA';
 root.innerHTML=`<div class="bonus-transition-pitch" aria-hidden="true"><i></i></div><div class="bonus-transition-core"><span class="bonus-transition-eyebrow">${kind==='final'?'A NOITE FICA NA HISTÓRIA':'BILHETES PARA A GLÓRIA'}</span><img src="${bonusArt[mode]}" alt=""><strong>${title}</strong><span>${kind==='final'?'A reunir os momentos da partida…':kind==='retrigger'?'+5 JOGADAS GRÁTIS':'O estádio está à tua espera'}</span></div>`;
 const sources=kind==='final'?[]:[...board.querySelectorAll<HTMLElement>('.cell[data-symbol="S"]')];
 const bounds=board.getBoundingClientRect(),animations:Animation[]=[];
 board.append(root);
 const run=(el:HTMLElement,frames:Keyframe[],duration:number,delay=0)=>{const a=el.animate(frames,{duration,delay,easing:'cubic-bezier(.22,.7,.28,1)',fill:'both'});animations.push(a);};
 try{
  audioCue(kind==='final'?'final':kind==='retrigger'?'retrigger':'bonus');
  if(!reduced){
   sources.forEach((source,i)=>{
    const box=source.getBoundingClientRect(),ticket=document.createElement('div');ticket.className='bonus-transition-ticket';ticket.innerHTML=symbolMarkup('S');
    const x=box.left+box.width/2-bounds.left,y=box.top+box.height/2-bounds.top;
    Object.assign(ticket.style,{left:x+'px',top:y+'px',width:box.width+'px',height:box.height+'px'});root.append(ticket);source.classList.add('bonus-ticket-source');
    run(ticket,[{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:'translate(-50%,-65%) scale(1.15)',opacity:1,offset:.2},{transform:`translate(calc(-50% + ${bounds.width/2-x}px),calc(-50% + ${bounds.height/2-y}px)) scale(.25) rotate(${i%2?24:-24}deg)`,opacity:0}],850,i*65);
   });
   run(root,[{opacity:0},{opacity:1}],160);
   run(root.querySelector<HTMLElement>('.bonus-transition-core')!,[{opacity:0,transform:'scale(.8) translateY(12px)'},{opacity:1,transform:'scale(1) translateY(0)'}],450,kind==='final'?150:800);
   if(kind==='final')run(root.querySelector<HTMLElement>('.bonus-transition-pitch')!,[{transform:'scale(1.5)',opacity:0},{transform:'scale(1)',opacity:1}],950);
  }
  await new Promise<void>(resolve=>{
   const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);resolve();};
   const timer=setTimeout(finish,reduced?0:kind==='final'?2000:1700);signal.addEventListener('abort',finish,{once:true});if(signal.aborted)finish();
  });
 }finally{animations.forEach(a=>a.cancel());sources.forEach(s=>s.classList.remove('bonus-ticket-source'));root.remove();}
}
