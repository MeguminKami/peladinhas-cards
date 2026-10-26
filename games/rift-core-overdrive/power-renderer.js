import {symbol} from './symbols.js';
import {NAMES} from './engine.js';
import {activateProtocol,settleProtocol} from './protocols.js';

export function createPowerRenderer({board,settings,mode,sound,assertGrid,cells,cell,setSymbol,setShown,pause,animate}){
 return async function power(event){
  assertGrid(event.before);board.dataset.phase='power';
  const game=document.getElementById('game'),banner=document.getElementById('powerBanner');
  const key=event.name.toLowerCase().replaceAll(' ','-');
  const pt=document.documentElement.lang.startsWith('pt');
  const protocol=document.querySelector(`[data-power="${event.name}"]`);
  const first=event.targets[0],from=event.before[first.c][first.r].s;
  game.dataset.power=key;activateProtocol(protocol);
  banner.className='power-readable';
  const caption=event.name==='RIFT LINK'
   ?`${pt?'COLUNA':'REEL'} ${event.source.c+1} → ${first.c+1} · ${pt?'A ORIGEM MANTÉM-SE':'SOURCE STAYS'}`
   :`${event.targets.length} ${pt?'POSIÇÕES':'POSITIONS'} · ${NAMES[event.dest]}`;
  banner.innerHTML=`<span class="protocol-eyebrow">${pt?'PROTOCOLO ATIVO':'PROTOCOL ACTIVE'}</span><strong>${event.name}</strong><div class="power-preview">${symbol(from)}<span>→</span>${symbol(event.dest)}</div><div class="power-explanation">${caption}</div>`;
  cells(event.targets,'target');if(event.source)cells([event.source],'source');
  sound(event.name);
  const effects=document.createElement('div');effects.className=`power-effects ${key}`;board.append(effects);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 600 500');svg.setAttribute('preserveAspectRatio','none');effects.append(svg);
  const source=event.source?{x:event.source.c*100+50,y:event.source.r*100+50}:{x:-40,y:250};
  for(const p of event.targets){
   const line=document.createElementNS('http://www.w3.org/2000/svg','path');
   line.setAttribute('d',`M${source.x} ${source.y} Q${(source.x+p.c*100)/2} ${source.y-65} ${p.c*100+50} ${p.r*100+50}`);
   line.style.setProperty('--path-delay',`${event.targets.indexOf(p)*30}ms`);svg.append(line);
  }
  if(event.name==='REACTOR PULSE'){
   const wave=document.createElement('i');wave.className='pulse-wave';effects.append(wave);
   document.querySelector('.core-art')?.animate([{transform:'scale(1)'},{transform:'scale(.78)',offset:.38},{transform:'scale(1.16)',offset:.55},{transform:'scale(1)'}],{duration:1000});
  }
  if(event.name==='MEGA WILD DROP'){
   const cage=document.createElement('i');cage.className='column-cage';cage.style.left=`${first.c/6*100}%`;effects.append(cage);
   const blade=document.createElement('i');blade.className='plasma-blade';blade.style.left=`${first.c/6*100}%`;effects.append(blade);
   for(let r=0;r<5;r++)if(event.before[first.c][r].s===11)cells([{c:first.c,r}],'protected');
  }
  if(event.name==='RIFT LINK'){
   for(const p of [event.source,first]){const gate=document.createElement('i');gate.className='link-portal';gate.style.left=`${(p.c+.5)/6*100}%`;effects.append(gate);}
   const copy=document.createElement('div');copy.className='flying-copy';copy.innerHTML=symbol(event.dest);copy.style.left=`${event.source.c/6*100}%`;copy.style.top=`${event.source.r*20}%`;effects.append(copy);
   if(!settings().reduced)animate(copy,[{transform:'translate(0,0) scale(.75)',opacity:0},{opacity:1,offset:.15},{transform:`translate(${(first.c-event.source.c)*100}%,${(first.r-event.source.r)*100}%) scale(1.05)`,opacity:1}],{duration:900,easing:'cubic-bezier(.3,0,.2,1)'});
  }
  const speed=Math.sqrt(settings().speed),lead=settings().reduced?450:Math.max(520,(mode()==='base'?900:720)/speed);
  await pause(lead);
  const ordered=event.name==='MEGA WILD DROP'?[...event.targets].sort((a,b)=>a.r-b.r):event.targets;
  for(const p of ordered){
   const element=cell(p),art=element.querySelector('.tile-art');
   if(!settings().reduced)await animate(art,[{transform:'scale(1)',opacity:1},{transform:event.name==='NEON STORM'?'scale(1.08)':'scaleX(.08)',opacity:.2}],{duration:100,easing:'ease-in'});
   setSymbol(element,event.dest);if(p===ordered[0])sound('materialize',event.dest);
   if(!settings().reduced)animate(element.querySelector('.tile-art'),[{transform:'scale(.7)',opacity:.35},{transform:'scale(1.1)',opacity:1,offset:.65},{transform:'scale(1)',opacity:1}],{duration:280,easing:'ease-out'});
   if(event.name==='MEGA WILD DROP')await pause(45/speed);
  }
  if(event.name==='MEGA WILD DROP')sound('drop-impact');setShown(event.grid);
  banner.querySelector('.power-explanation').textContent=pt?'TRANSFORMAÇÃO CONCLUÍDA':'TRANSFORMATION COMPLETE';
  await pause(settings().reduced?500:Math.max(430,650/speed));
  effects.remove();banner.className='';banner.replaceChildren();game.removeAttribute('data-power');settleProtocol(protocol);
  board.querySelectorAll('.tile').forEach(el=>el.className='tile');
  board.dataset.phase='settled';assertGrid(event.grid);
 };
}
