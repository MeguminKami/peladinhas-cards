import {symbol} from './symbols.js';
import {NAMES} from './engine.js';
import {createPowerRenderer} from './power-renderer.js';

export function createRenderer({board,settings,sound,mode,status,isActivation=()=>false,canRetrigger=()=>true}){
 let shown=null;const artwork=new Map();
 function art(n){if(!artwork.has(n)){const template=document.createElement('template');template.innerHTML=symbol(n);artwork.set(n,template.content.firstElementChild);}return artwork.get(n).cloneNode(true);}
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,ms)));
 const frame=()=>new Promise(requestAnimationFrame);
 const reduced=()=>settings().reduced||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const duration=n=>reduced()?0:n/settings().speed;
 const transform=(c,r)=>`translate3d(${c*100}%,${r*100}%,0)`;
 const tileAt=p=>shown?.[typeof p==='number'?Math.floor(p/5):p.c]?.[typeof p==='number'?p%5:p.r];
 function cell(p){const t=tileAt(p);return t?board.querySelector(`[data-id="${t.id}"]`):null;}
 function cells(ps,cls){for(const p of ps)cell(p)?.classList.add(cls);}
 function setSymbol(el,n){el.dataset.symbol=String(n);el.querySelector('.tile-art').replaceChildren(art(n));}
 function createTile(t,c,r){const el=document.createElement('div');el.className='tile';el.dataset.id=t.id;el.dataset.symbol=t.s;el.style.transform=transform(c,r);const shell=document.createElement('div');shell.className='tile-art';shell.append(art(t.s));el.append(shell);return el;}
 function draw(grid){board.replaceChildren();grid.forEach((col,c)=>col.forEach((t,r)=>board.append(createTile(t,c,r))));shown=structuredClone(grid);}
 function assertGrid(grid){
  if(!shown||grid.some((col,c)=>col.some((t,r)=>shown[c][r].id!==t.id||shown[c][r].s!==t.s)))throw Error('Presentation grid mismatch');
  for(let c=0;c<6;c++)for(let r=0;r<5;r++){const el=cell({c,r});if(!el||+el.dataset.symbol!==grid[c][r].s)throw Error('Rendered symbol mismatch');}
 }
 async function animate(el,keyframes,options){
  if(reduced()||options.duration===0){const last=keyframes.at(-1);for(const [k,v] of Object.entries(last))if(!['offset','easing'].includes(k))el.style[k]=v;return;}
  const animation=el.animate(keyframes,{...options,fill:'both'});
  try{await animation.finished;const last=keyframes.at(-1);for(const [k,v] of Object.entries(last))if(!['offset','easing'].includes(k))el.style[k]=v;}catch{}finally{animation.cancel();}
 }
 async function land(grid){
  if(!shown){draw(grid);return;}
  board.dataset.phase='spin';board.classList.add('reels-moving');sound('spin');
  const reels=[];let visibleScatters=0,lastScatterTime=0;
  for(let c=0;c<6;c++){
   const window=document.createElement('div');window.className='reel-window';window.style.left=`${c/6*100}%`;
   const strip=document.createElement('div');strip.className='reel-strip';window.append(strip);board.append(window);
   const oldNodes=shown[c].map(t=>board.querySelector(`[data-id="${t.id}"]`));
   oldNodes.forEach((el,r)=>{el.classList.remove('winner','leaving');el.style.opacity='1';el.style.transform=transform(0,r);strip.append(el);});
   const turns=reduced()?5:10+c;
   const visualPool=shown[c].filter(t=>t.s<10);if(!visualPool.length)visualPool.push({s:0});
   for(let r=-turns+5;r<0;r++){
    const t=visualPool[((-r)+c)%visualPool.length];const filler=createTile({id:`visual-${c}-${r}`,s:t.s},0,r);filler.dataset.visual='true';filler.setAttribute('aria-hidden','true');strip.append(filler);
   }
   const arrivals=grid[c].map((t,r)=>{const el=createTile(t,0,r-turns);strip.append(el);return el;});
   const possible=!isActivation()&&(mode()==='base'?visibleScatters>=3&&visibleScatters<5:canRetrigger()&&visibleScatters===2);
   const extra=possible?duration(450):0;
   let ms=duration(960+c*105)+extra;
   if(reels.length)ms=Math.max(ms,reels.at(-1).ms+duration(85));
   reels.push({c,window,strip,arrivals,turns,ms,possible,anticipationAt:lastScatterTime});
   if(grid[c].some(t=>t.s===11)){visibleScatters++;lastScatterTime=ms;}
  }
  await frame();
  let scatterOrder=0;
  await Promise.all(reels.map(async reel=>{
   const travel=reel.turns*20;
   const anticipation=reel.possible?pause(reel.anticipationAt).then(()=>{if(reel.window.isConnected){reel.window.classList.add('portal-anticipation');sound('suspense');}}):Promise.resolve();
   await animate(reel.strip,[
    {transform:'translate3d(0,0,0)',offset:0,easing:'cubic-bezier(.45,0,.85,.65)'},
    {transform:`translate3d(0,${travel*.11}%,0)`,offset:.18,easing:'linear'},
    {transform:`translate3d(0,${travel-40}%,0)`,offset:.72,easing:'cubic-bezier(.12,.35,.18,1)'},
    {transform:`translate3d(0,${travel+.55}%,0)`,offset:.96,easing:'ease-out'},
    {transform:`translate3d(0,${travel}%,0)`,offset:1}
   ],{duration:reel.ms});
   reel.arrivals.forEach((el,r)=>{el.style.transform=transform(reel.c,r);board.append(el);});
   await anticipation;reel.window.remove();sound('stop',reel.c);
   if(grid[reel.c].some(t=>t.s===11))sound('scatter',scatterOrder++);
   if(!reduced())reel.arrivals.forEach(el=>animate(el.querySelector('.tile-art'),[{transform:'scale(1.025,.965)'},{transform:'scale(1)'}],{duration:140}));
  }));
  sound('spin-end');board.classList.remove('reels-moving');shown=structuredClone(grid);assertGrid(grid);
 }
 async function fall(event){
  assertGrid(event.before);board.dataset.phase='fall';status(document.documentElement.lang.startsWith('pt')?'ENERGIA LIBERTADA · NOVOS SÍMBOLOS':'ENERGY RELEASED · REFILLING','');board.classList.add('cascading');
  const oldPositions=new Map(event.before.flatMap((col,c)=>col.map((t,r)=>[t.id,{c,r}])));
  const surviving=new Set(event.grid.flat().map(t=>t.id));
  for(const el of [...board.querySelectorAll('.tile')])if(!surviving.has(el.dataset.id))el.remove();
  const segments=[],movements=[],impactTimes=new Map();
  for(let c=0;c<6;c++){
   let start=0;
   for(let end=0;end<=5;end++){
    if(end<5&&event.grid[c][end].s!==11)continue;
    if(end<5)cell({c,r:end})?.classList.add('portal-barrier');
    const rows=end-start;
    if(rows){
     const segment=document.createElement('div');segment.className='fall-segment';segment.style.left=`${c/6*100}%`;segment.style.top=`${start*20}%`;segment.style.height=`${rows*20}%`;segment.style.setProperty('--segment-rows',rows);board.append(segment);segments.push(segment);
     const fresh=event.grid[c].slice(start,end).filter(t=>!oldPositions.has(t.id));
     for(let r=start;r<end;r++){
      const t=event.grid[c][r],old=oldPositions.get(t.id);let el=board.querySelector(`[data-id="${t.id}"]`);
      if(!el)el=createTile(t,0,0);
      el.className='tile';el.style.opacity='1';el.querySelector('.tile-art').style.opacity='1';
      const from=old?old.r-start:fresh.findIndex(x=>x.id===t.id)-fresh.length;
      const to=r-start,distance=Math.max(0,to-from);
      el.style.transform=transform(0,from);segment.append(el);
      const ms=duration(distance?180+Math.sqrt(distance)*165:0),delay=duration(c*16);
      movements.push({el,c,r,from,to,distance,ms,delay});
      if(distance)impactTimes.set(c,Math.max(impactTimes.get(c)||0,ms*.8+delay));
     }
    }
    start=end+1;
   }
  }
  await frame();
  const impacts=[...impactTimes.entries()].map(([c,ms])=>pause(ms).then(()=>sound('fall',c)));
  await Promise.all(movements.map(async m=>{
   if(!m.distance)return;
   await animate(m.el,[{transform:transform(0,m.from),offset:0,easing:'cubic-bezier(.42,0,.78,.55)'},{transform:transform(0,m.to+.055),offset:.8,easing:'ease-out'},{transform:transform(0,m.to-.012),offset:.92},{transform:transform(0,m.to),offset:1}],{duration:m.ms,delay:m.delay});
   if(!reduced())animate(m.el.querySelector('.tile-art'),[{transform:'scale(1.045,.955)'},{transform:'scale(1)'}],{duration:120});
  }));
  await Promise.all(impacts);
  for(const m of movements){m.el.style.transform=transform(m.c,m.r);board.append(m.el);}
  segments.forEach(el=>el.remove());board.querySelectorAll('.portal-barrier').forEach(el=>el.classList.remove('portal-barrier'));
  board.classList.remove('cascading');shown=structuredClone(event.grid);assertGrid(event.grid);
 }
 async function presentWin(event,format,onAward){
  assertGrid(event.grid);board.dataset.phase='win';sound('cascade',event.cm);
  const groupBudget=Math.max(220,Math.min(600,1000/Math.max(1,event.wins.length)))/Math.sqrt(settings().speed);
  for(const win of event.wins){
   board.querySelectorAll('.winner').forEach(el=>el.classList.remove('winner'));cells(win.positions,'winner');
   const pt=document.documentElement.lang.startsWith('pt');sound('symbol',win.symbol);
   status(`${NAMES[win.symbol]} · ${win.ways} WAYS · ${pt?'COLUNAS':'REELS'} 1–${win.length}`,`${win.paidCents===0?(pt?'INCLUÍDO NO TOTAL':'INCLUDED IN TOTAL'):format(win.paid??win.amount*event.bet*event.cm*event.gm)} · ×${event.cm} CASCADE · ×${event.gm} CORE`);
   await pause(reduced()?Math.max(300,groupBudget):Math.max(240,groupBudget));
  }
  cells(event.positions,'winner');onAward();await pause(reduced()?150:250);
  sound('destroy');
  const bursts=[];
  if(!reduced())for(const p of event.positions){
   const c=Math.floor(p/5),r=p%5,burst=document.createElement('div');burst.className=`dissolve-burst burst-${event.grid[c][r].s}`;burst.style.left=`${(c+.5)/6*100}%`;burst.style.top=`${(r+.5)*20}%`;
   for(let i=0;i<4;i++){const bit=document.createElement('i');const angle=i*Math.PI/2+.5;bit.style.setProperty('--dx',`${Math.cos(angle)*30}px`);bit.style.setProperty('--dy',`${Math.sin(angle)*24}px`);burst.append(bit);}board.append(burst);bursts.push(burst);
  }
  await Promise.all(event.positions.map(p=>{const el=cell(p);el.classList.add('removing');return animate(el.querySelector('.tile-art'),[{transform:'scale(1)',opacity:1},{transform:'scale(1.08)',opacity:1,offset:.25},{transform:'scale(.4)',opacity:0}],{duration:duration(280)});}));
  bursts.forEach(el=>el.remove());document.getElementById('floatingWin')?.classList.remove('on');board.dataset.phase='settled';
 }
 const power=createPowerRenderer({board,settings:()=>({...settings(),reduced:reduced()}),mode,sound,assertGrid,cells,cell,setSymbol,setShown:g=>{shown=structuredClone(g);},pause,animate});
 return {draw,cells,land,fall,power,assertGrid,presentWin,displayed:()=>structuredClone(shown)};
}
