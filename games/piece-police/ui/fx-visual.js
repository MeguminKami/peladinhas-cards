/** Acidwave presentation only. Motion follows ctx.tempo, text retains real reading time. */
import { fusionName, POWER_NAME, LEVEL_NAME, symName, xBet, clusterEquation, BONUS_NAME, categoria, shortName } from './texto.js';
import { PERSONA_ID, FUSION_ART, BONUS_ART } from './art-loader.js';
import { purchaseEntry } from './acid-symbols.js';
import { audio } from './fx-audio.js';
const ultra = ctx => ctx.speed === 'ultra';
const duration = (ctx, normal, compact = 120) => ctx.reduced ? Math.min(normal, 110) : ultra(ctx) ? compact : normal;
const pause = (ctx, ms) => ctx.skip() ? Promise.resolve() : ctx.tempo.wait(ms, ctx.skip);

async function readingPause(ctx, text) {
  const words=text.trim().split(/\s+/).length;
  const until=performance.now()+Math.max(3000,Math.min(5000,900+words*180));
  while(!ctx.skip()&&performance.now()<until) {
    // Re-evaluate the rate so changing speed mid-banner cannot cut its reading time.
    await pause(ctx,Math.min(100,until-performance.now())*(ctx.tempo.rate||1));
  }
}

function purchaseTile(ctx,symbol,index=null) {
  const tile=document.createElement('span');tile.className='cell';
  tile.dataset.sym=symbol;tile.dataset.symbol=symbol;tile.dataset.cat=categoria(symbol);tile.dataset.awake='false';
  if(index!=null)tile.dataset.cell=String(index);
  if(symbol==='X')tile.classList.add('purchase-closed');
  tile.innerHTML='<span class="sym"></span><span class="name"></span><span class="mult"></span><span class="flag"></span>';
  ctx.paintSymbol(tile.firstElementChild,symbol);
  tile.querySelector('.name').textContent=shortName(symbol);
  return tile;
}

async function motion(ctx, element, frames, normal = 260, compact = 90, ultraFrames = null) {
  if (!element || ctx.skip()) return;
  const ms = duration(ctx, normal, compact);
  const chosen = ctx.reduced ? [{opacity:0.35},{opacity:1}] : ultra(ctx) && ultraFrames ? ultraFrames : frames;
  const animation = ctx.tempo.animate(element, chosen, { duration:ms, easing:'cubic-bezier(.2,.8,.2,1)', fill:'both' });
  try { await pause(ctx, ms); } finally { animation?.cancel(); }
}
const point = (ctx, index) => {
  const rect = ctx.cells[index]?.getBoundingClientRect(), box = ctx.flash.getBoundingClientRect(), scale = ctx.scale || 1;
  return rect ? {x:(rect.x + rect.width/2-box.x)/scale,y:(rect.y+rect.height/2-box.y)/scale} : {x:0,y:0};
};
const mark = (ctx, cells, name, active = true) => { for (const c of cells || []) ctx.cells[c]?.classList.toggle(name, active); };
const image = (ctx, id, cls = '') => ctx.artImage?.(id, cls);
const pulse = (ctx, cells, ms = 260) => Promise.all((cells || []).map(c => motion(ctx, ctx.cells[c], [{transform:'scale(1)'},{transform:'scale(1.07)',offset:.45},{transform:'scale(1)'}], ms, 80, [{opacity:.55},{opacity:1}])));

// A bounded reusable pool, deterministic positions, no effect ever chooses a game result.
const pool = [];
async function sparks(ctx, cells, color, count = 8) {
  if (ctx.reduced || ctx.skip() || !cells?.length) return;
  const origin = point(ctx, cells[0]);
  const live = [];
  for (let i=0;i<Math.min(count, ultra(ctx)?4:12);i++) {
    const element = pool.pop() || document.createElement('i'); element.className='fx-particle';
    element.style.left=origin.x+'px';element.style.top=origin.y+'px';element.style.setProperty('--fx-color',color);
    ctx.flash.append(element);live.push(element);
  }
  try { await Promise.all(live.map((el,i) => motion(ctx,el,[{opacity:1,transform:'translate(-50%,-50%) scale(.5)'},{opacity:0,transform:'translate('+ ((i%4-1.5)*27)+'px,'+((Math.floor(i/4)-1.5)*29)+'px) rotate('+i*43+'deg) scale(1.1)'}],420,100))); }
  finally { for(const el of live){el.remove();if(pool.length<24)pool.push(el);} }
}
async function banner(ctx, title, sub = '', artId = null, normal = 550, color = 'var(--accent)', extraClass = '') {
  if (ctx.skip()) return;
  const panel=document.createElement('div');panel.className='fx-banner '+extraClass;panel.style.setProperty('--fx-color',color);
  const art=image(ctx,artId,'fx-banner-art') || (artId === 'CHM-TOTAL' ? image(ctx,'WIN-MAX','fx-banner-art') : null);if(art)panel.append(art);
  const text=document.createElement('div');text.className='fx-banner-copy';
  const heading=document.createElement('strong');heading.textContent=title;text.append(heading);
  if(sub){const small=document.createElement('small');small.textContent=sub;text.append(small);}panel.append(text);ctx.flash.append(panel);
  try {
    await motion(ctx,panel,[{opacity:0,transform:'translateY(14px) scale(.92)'},{opacity:1,transform:'none'}],Math.min(220,normal),80,[{opacity:0,transform:'scale(.97)'},{opacity:1,transform:'none'}]);
    await readingPause(ctx,title+' '+sub);
    await motion(ctx,panel,[{opacity:1},{opacity:0,transform:'translateY(-6px)'}],100,35);
  } finally { panel.remove(); }
}
async function transfer(ctx, from, to, color, ms=240) {
  if(ctx.skip()||ctx.reduced||from<0||to<0)return;
  const a=point(ctx,from),b=point(ctx,to),el=document.createElement('i');el.className='fx-transfer';
  el.style.left=a.x+'px';el.style.top=a.y+'px';el.style.setProperty('--fx-color',color);ctx.flash.append(el);
  try {await motion(ctx,el,[{opacity:.3,transform:'translate(-50%,-50%) scale(.5)'},{opacity:1,offset:.5,transform:'translate('+((b.x-a.x)/2)+'px,'+((b.y-a.y)/2-12)+'px) scale(1)'},{opacity:0,transform:'translate('+(b.x-a.x)+'px,'+(b.y-a.y)+'px) scale(.7)'}],ms,60);}
  finally {el.remove();}
}

async function fromPersona(ctx, persona, cells, color) {
  if(ctx.skip()||!cells?.length)return;
  const card=document.querySelector('[data-persona="'+persona+'"]');
  const box=ctx.flash.getBoundingClientRect(),source=card?.getBoundingClientRect();
  if(!source)return;
  const a={x:(source.x+source.width/2-box.x)/(ctx.scale||1),y:(source.y+source.height/2-box.y)/(ctx.scale||1)};
  await Promise.all([motion(ctx,card,[{opacity:.55},{opacity:1}],180,50),...cells.slice(0,ultra(ctx)?1:3).map(async c=>{
    if(ctx.reduced)return;
    const b=point(ctx,c),el=document.createElement('i');el.className='fx-transfer';el.style.left=a.x+'px';el.style.top=a.y+'px';el.style.setProperty('--fx-color',color);ctx.flash.append(el);
    try{await motion(ctx,el,[{opacity:0,transform:'scale(.5)'},{opacity:1,offset:.5,transform:'translate('+((b.x-a.x)/2)+'px,'+((b.y-a.y)/2)+'px)'},{opacity:0,transform:'translate('+(b.x-a.x)+'px,'+(b.y-a.y)+'px) scale(1.2)'}],260,70);}finally{el.remove();}
  })]);
}

async function revealGrid(ctx, event) {
  ctx.render();
  if(ctx.reduced||ultra(ctx)){await Promise.all(ctx.cells.map(el=>motion(ctx,el,[{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'none'}],220,150)));audio.land(event.grid,event.grid.map((_,i)=>i).filter(i=>event.grid[i]!=='X'),ctx);return;}
  // Visibility order is presentation only; suspense uses only scatters already revealed.
  for(const el of ctx.cells)el.style.opacity='0';
  let seen=0;
  try {
    for(let col=0;col<5;col++) {
      const indices=Array.from({length:5},(_,row)=>col*5+row);
      for(const i of indices)ctx.cells[i].style.opacity='';
      await Promise.all(indices.map(i=>motion(ctx,ctx.cells[i],[{opacity:0,transform:'translateY(-28px)'},{opacity:1,transform:'none'}],190,100)));
      audio.land(event.grid,indices.filter(i=>event.grid[i]!=='X'),ctx);
      seen+=indices.filter(i=>event.grid[i]==='S').length;
      if(seen>=2&&seen<5&&col<4&&!ctx.skip()){
        const visible=Array.from({length:(col+1)*5},(_,i)=>i).filter(i=>event.grid[i]==='S');
        mark(ctx,visible,'scatter-suspense');
        audio.suspense(seen);
        await pulse(ctx,visible,Math.min(320,100+seen*35));
        mark(ctx,visible,'scatter-suspense',false);
      }
    }
  } finally {audio.suspense(0);for(const el of ctx.cells){el.style.opacity='';el.classList.remove('scatter-suspense');}}
}
async function refill(ctx,e) {
  const before=ctx.before,held=new Set(ctx.model.stickyW);
  for(const group of ctx.model.groups)for(const c of group.cells)held.add(c);
  ctx.render();
  const tasks=[];
  for(let col=0;col<5;col++) {
    const old=[],dest=[];
    for(let row=0;row<5;row++){const i=col*5+row;if(before?.grid[i]&&before.grid[i]!=='X'&&!held.has(i))old.push(i);if(ctx.model.grid[i]&&ctx.model.grid[i]!=='X'&&!held.has(i)&&!e.newCells.includes(i))dest.push(i);}
    // Gravity keeps survivor order; this maps positions, never compares or infers symbols.
    if(old.length===dest.length)for(let j=0;j<dest.length;j++){
      const dy=((old[j]%5)-(dest[j]%5))*(ctx.cells[dest[j]].offsetHeight+6);
      if(dy)tasks.push(motion(ctx,ctx.cells[dest[j]],[{transform:'translateY('+dy+'px)'},{transform:'none'}],330,90));
    }
  }
  for(const c of e.newCells)tasks.push(motion(ctx,ctx.cells[c],[{opacity:0,transform:'translateY(-45px)'},{opacity:1,transform:'none'}],400,100));
  await Promise.all(tasks);
  audio.land(e.grid,e.newCells,ctx,{cascade:true});
}

async function unlockCorner(ctx, cell) {
  const target=ctx.cells[cell], hardware=target.querySelector('.sym').cloneNode(true);
  const stage=document.createElement('div');stage.className='fx-unlock';stage.append(hardware);
  const key=document.createElement('span');key.className='acid-key';
  key.innerHTML='<i></i><b></b><em></em>';stage.append(key);
  // Snapshot the still-closed DOM before revealing the event-authoritative CW beneath it.
  target.append(stage);ctx.render();
  try {
    if(ctx.reduced){await motion(ctx,stage,[{opacity:1},{opacity:0}],100);audio.event({type:'corner.open',cell},ctx);return;}
    const lock=hardware.querySelector('.acid-lock'), shackle=hardware.querySelector('.lock-shackle');
    await motion(ctx,key,[{opacity:0,transform:'translate(80%,70%) rotate(-30deg)'},{opacity:1,transform:'translate(0,0) rotate(0deg)'}],330);
    await motion(ctx,key,[{transform:'translateX(0)'},{transform:'translateX(-14%)'}],170);
    await motion(ctx,key,[{transform:'translateX(-14%) rotate(0deg)'},{transform:'translateX(-14%) rotate(90deg)'}],240);
    key.style.transform='translateX(-14%) rotate(90deg)';
    await motion(ctx,shackle,[{transform:'none'},{transform:'translateY(-25%) rotate(-24deg)'}],240);
    audio.event({type:'corner.open',cell},ctx);
    if(shackle)shackle.style.transform='translateY(-25%) rotate(-24deg)';
    // Split the same chrome chain into two independent halves; no door-image swap.
    const chain=hardware.querySelector('img');
    if(chain){const right=chain.cloneNode();chain.style.clipPath='inset(0 50% 0 0)';right.style.clipPath='inset(0 0 0 50%)';hardware.append(right);
      await Promise.all([motion(ctx,chain,[{opacity:1,transform:'none'},{opacity:0,transform:'translate(-55%,30%) rotate(-22deg)'}],360),motion(ctx,right,[{opacity:1,transform:'none'},{opacity:0,transform:'translate(55%,30%) rotate(22deg)'}],360),sparks(ctx,[cell],'var(--acid-lime)',6)]);
      chain.style.opacity='0';right.style.opacity='0';}
    await Promise.all([motion(ctx,lock,[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(14%) scale(1.15)'}],220),motion(ctx,key,[{opacity:1},{opacity:0}],220)]);
    await motion(ctx,stage,[{opacity:1},{opacity:0}],100);
  } finally {stage.remove();}
}
function clearWins(ctx){for(const el of ctx.flash.querySelectorAll('.fx-win'))el.remove();for(const el of ctx.cells)el.classList.remove('hit');}
async function win(ctx,e) {
  mark(ctx,e.cells,'hit');
  const el=document.createElement('div');el.className='fx-win';
  const art=image(ctx,'SYM-'+e.symbol,'fx-win-symbol');if(art)el.append(art);
  const text=document.createElement('strong');text.textContent=clusterEquation(e,ctx.bet,{inBet:true});el.append(text);
  const value=document.createElement('small');value.textContent=ctx.money(Math.floor(ctx.bet*e.pay/1000));el.append(value);
  ctx.flash.append(el);
  if(ultra(ctx)&&!ctx.reduced){
    // Consecutive events still apply one by one. Their labels coexist until the final win.
    await motion(ctx,el,[{opacity:0,transform:'scale(.9)'},{opacity:1,transform:'none'}],140,65);
    if(ctx.moreWinsInGroup)return;
    await pause(ctx,duration(ctx,260,160));clearWins(ctx);return;
  }
  try {
    await motion(ctx,el,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],180,70);
    await pulse(ctx,e.cells.filter(c=>['CW','DW'].includes(ctx.model.grid[c])),220);
    await pause(ctx,duration(ctx,e.groupFinal?650:480,100));
  } finally {el.remove();mark(ctx,e.cells,'hit',false);}
}

export const visual = {
  async play(e,ctx) {
    // Nothing persists accidentally across event boundaries or skipped effects.
    if(e.type!=='win.cluster' && e.type!=='multiplier.change')clearWins(ctx);
    try {
      switch(e.type){
        case 'step.start':
          ctx.flash.replaceChildren();for(const el of ctx.cells)delete el.dataset.stickyKind;document.querySelector('[data-persona="COPIUM"]')?.removeAttribute('data-armed');ctx.render();ctx.hud();
          await motion(ctx,document.getElementById('mode-label'),[{opacity:.4,transform:'translateY(-4px)'},{opacity:1,transform:'none'}],120,40);break;
        case 'grid.drop':await revealGrid(ctx,e);break;
        case 'win.cluster':await win(ctx,e);break;
        case 'cap.hit':await banner(ctx,'MAX WIN',xBet(e.limit)+' atingido','WIN-MAX',900,'var(--gold)','fx-max');break;
        case 'multiplier.change':ctx.render();await pulse(ctx,[e.cell],220);break;
        case 'persona.awaken': {
          ctx.render();ctx.hud();mark(ctx,e.cluster,'target');
          await Promise.all([banner(ctx,e.persona+(e.kind==='refire'?' · VOLTA A DISPARAR':' · DESPERTO'),e.fusion?'Fusão a caminho':POWER_NAME[e.persona]+(e.party?' · PARTY MODE':''),'CHR-'+PERSONA_ID[e.persona]+'-ALTER',e.kind==='refire'?350:700,'var(--'+e.persona+')','fx-awaken'),sparks(ctx,e.cluster,'var(--'+e.persona+')')]);
          mark(ctx,e.cluster,'target',false);break;
        }
        case 'fusion.trigger': {
          const art=FUSION_ART[e.fusionId];
          if(ctx.explainFusion)await ctx.explainFusion(e);
          else await banner(ctx,fusionName(e.fusionId),e.pair.join(' + '),art,850,'var(--gold)','fx-fusion');
          break;
        }
        case 'grid.remove':await Promise.all(e.cells.map(c=>motion(ctx,ctx.cells[c],[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.55)'}],220,70)));ctx.render();break;
        case 'grid.refill':await refill(ctx,e);break;
        case 'power.reality_break':
          await fromPersona(ctx,'LCD',e.cells,'var(--LCD)');audio.event(e,ctx);mark(ctx,e.cells,'fx-prism');await pulse(ctx,e.cells,280);ctx.render();await sparks(ctx,e.cells,'var(--LCD)');mark(ctx,e.cells,'fx-prism',false);break;
        case 'power.slow_motion.start':
          await fromPersona(ctx,e.kind==='frozen'?'LCD':e.kind==='freeze'?'MDMA':'WEED',e.cells,'var(--WEED)');ctx.render();for(const c of e.cells)ctx.cells[c].dataset.stickyKind=e.kind==='frozen'?'lcd':e.kind==='freeze'?'mdma':'weed';
          audio.event(e,ctx);
          await pulse(ctx,e.cells,350);break;
        case 'power.slow_motion.grow':await fromPersona(ctx,'WEED',e.cells,'var(--WEED)');ctx.render();audio.event(e,ctx);mark(ctx,e.cells,'fx-grow');await pulse(ctx,e.cells,300);mark(ctx,e.cells,'fx-grow',false);break;
        case 'power.slow_motion.end':for(const c of e.cells)delete ctx.cells[c].dataset.stickyKind;await pulse(ctx,e.cells,180);ctx.render();break;
        case 'power.rave_rush.move':await transfer(ctx,e.from,e.to,'var(--MDMA)',220);ctx.render();audio.event(e,ctx);await pulse(ctx,[e.to],100);break;
        case 'power.drunk_walk.step':if(e.from==null)await fromPersona(ctx,'ALCOOL',[e.cell],'var(--ALCOOL)');await transfer(ctx,e.from??e.cell,e.cell,'var(--ALCOOL)',170);ctx.render();await motion(ctx,ctx.cells[e.cell],[{opacity:.3,transform:'rotate(-14deg) scale(.7)'},{opacity:1,transform:'none'}],170,50,[{opacity:0},{opacity:1}]);audio.event(e,ctx);break;
        case 'power.one_more_chance.armed':document.querySelector('[data-persona="COPIUM"]')?.setAttribute('data-armed','true');await banner(ctx,'COPIUM ARMADO','Respin no fim da sequência','CHR-P3-PORT',300,'var(--COPIUM)');break;
        case 'power.one_more_chance.respin':
          await fromPersona(ctx,'COPIUM',e.held,'var(--COPIUM)');mark(ctx,e.held,'fx-held');await banner(ctx,'ONE MORE CHANCE','Guarda '+symName(e.symbol),'CHR-P3-ALTER',300,'var(--COPIUM)');ctx.render();
          const tickets=[];
          for(const c of e.revealed){const ticket=image(ctx,'SYM-N3-REVEALED','fx-reveal-ticket');if(ticket){ctx.cells[c].append(ticket);tickets.push(ticket);}}
          try{await Promise.all(ctx.cells.map((el,c)=>e.held.includes(c)?null:motion(ctx,el,[{opacity:0,transform:'rotateY(80deg)'},{opacity:1,transform:'none'}],400,100,[{opacity:0},{opacity:1}])));await Promise.all(tickets.map(el=>motion(ctx,el,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.08)'}],180,60)));}
          finally{tickets.forEach(el=>el.remove());mark(ctx,e.held,'fx-held',false);}audio.event(e,ctx);break;
        case 'wild.place':ctx.render();await motion(ctx,ctx.cells[e.cell],[{opacity:0,transform:'translateY(-35px) rotate(-12deg) scale(1.2)'},{opacity:1,transform:'none'}],280,80,[{opacity:0,transform:'scale(.8)'},{opacity:1,transform:'none'}]);audio.event(e,ctx);break;
        case 'chemistry.level':ctx.hud();await banner(ctx,LEVEL_NAME[e.to]||'CHEMISTRY',e.to+'/5','CHM-LVL-'+e.to,300,'var(--accent)');break;
        case 'corner.open':await unlockCorner(ctx,e.cell);break;
        case 'chemistry.total':ctx.hud();await Promise.all([banner(ctx,'TOTAL CHEMISTRY','Cantos +'+ctx.totalCornersIncrement+' · Poderes em PARTY MODE','CHM-TOTAL',850,'var(--gold)','fx-total'),sparks(ctx,[12],'var(--joiner)',12)]);break;
        case 'police.enter':ctx.hud();if(ctx.persistentPolice)break;await banner(ctx,e.mode==='calmer'?'CALMER':'JOINER',e.mode==='calmer'?'Everybody calm down!':"I’m joining the party!",'CHR-POL-'+e.mode.toUpperCase(),650,e.mode==='calmer'?'var(--calmer)':'var(--joiner)','fx-police');break;
        case 'police.calmer.arrest':mark(ctx,e.cells,'fx-arrest');await pause(ctx,duration(ctx,500,120));mark(ctx,e.cells,'fx-arrest',false);ctx.render();break;
        case 'police.joiner.party_mode':ctx.hud();if(ctx.repeatParty&&ctx.persistentPolice)break;await banner(ctx,'PARTY MODE · ON','Wild que multiplica o multiplicador do grupo'+(e.badge?' · Joiner ×'+e.badge.multiplier:''),'CHR-POL-JOINER',750,'var(--joiner)','fx-party');break;
        case 'bonus.trigger':{
          const scatters=ctx.model.grid.map((id,i)=>id==='S'?i:-1).filter(i=>i>=0);
          await Promise.all(scatters.map(c=>transfer(ctx,c,12,'var(--gold)',360)));
          audio.event(e,ctx);
          await banner(ctx,BONUS_NAME[e.bonusId],e.freeSpins+' FREE SPINS','EMB-'+BONUS_ART[e.bonusId],620,'var(--gold)','fx-bonus');break;
        }
        case 'bonus.retrigger':ctx.hud();await banner(ctx,'+'+e.added+' FREE SPINS','Agora '+e.total+' no total','OVL-RETRIGGER',450,'var(--gold)','fx-bonus');break;
        case 'bonus.end':await banner(ctx,'FIM DO BÓNUS',e.spins+' free spins · '+xBet(e.totalWin),'OVL-SUMMARY',700,'var(--gold)','fx-summary');break;
        case 'safety.stop':ctx.narrate('Limite de segurança atingido: '+e.cycles+' ciclos.');break;
        case 'step.end':
          clearWins(ctx);ctx.render();ctx.hud();
          for(const el of ctx.cells){el.classList.remove('target','fx-held','fx-arrest','fx-prism','fx-grow');delete el.dataset.stickyKind;}
          document.querySelector('[data-persona="COPIUM"]')?.removeAttribute('data-armed');
          ctx.flash.replaceChildren();break;
        default:ctx.render();
      }
    } finally {if(ctx.skip()){clearWins(ctx);ctx.flash.replaceChildren();for(const el of ctx.cells)el.classList.remove('target','fx-held','fx-arrest','fx-prism','fx-grow');}ctx.render();}
  },
  async buy(ctx, bonusId, roundId, scatterCount) {
    if(ctx.skip())return;
    audio.preload(bonusId);
    const entry=purchaseEntry(roundId,bonusId,scatterCount);
    audio.scatterIndex=0;
    await pulse(ctx,ctx.cells.map((el,i)=>el.dataset.sym==='X'?i:-1).filter(i=>i>=0),200);
    const panel=document.createElement('div');panel.className='purchase-spin board';panel.dataset.bonus=bonusId;
    const boardBox=ctx.board.getBoundingClientRect(),flashBox=ctx.flash.getBoundingClientRect(),scale=ctx.scale||1;
    Object.assign(panel.style,{inset:'auto',left:(boardBox.left-flashBox.left)/scale+'px',top:(boardBox.top-flashBox.top)/scale+'px',width:boardBox.width/scale+'px',height:boardBox.height/scale+'px'});
    const title=document.createElement('strong');title.className='purchase-spin-title';title.textContent='ENTRADA COMPRADA · '+BONUS_NAME[bonusId];panel.append(title);
    const columns=document.createElement('div');columns.className='purchase-reels';panel.append(columns);
    const results=[];
    for(let col=0;col<5;col++){
      const reel=document.createElement('div');reel.className='purchase-reel';
      const final=document.createElement('div');final.className='purchase-final';
      for(let row=0;row<5;row++){
        const index=col*5+row;final.append(purchaseTile(ctx,entry.grid[index],index));
      }
      const strip=document.createElement('div');strip.className='purchase-moving';
      for(const symbol of entry.strips[col])strip.append(purchaseTile(ctx,symbol));
      reel.append(final,strip);columns.append(reel);results.push({reel,final,strip});
    }
    ctx.flash.append(panel);
    try{
      await Promise.all(results.map(async({reel,final,strip},col)=>{
        final.style.opacity='0';
        if(!ctx.reduced){await motion(ctx,strip,[{transform:'translateY(-68%)'},{transform:'translateY(0)'}],entry.stops[col]);}
        strip.remove();final.style.opacity='';reel.dataset.stopped='true';
        await motion(ctx,final,[{opacity:.5,transform:'translateY(-8%)'},{opacity:1,transform:'translateY(2%)',offset:.8},{opacity:1,transform:'none'}],ctx.reduced?100:230);
        if(!ctx.reduced||col===4)audio.land(entry.grid,ctx.reduced?entry.grid.map((_,i)=>i):Array.from({length:5},(_,row)=>col*5+row),ctx);
      }));
      title.textContent=scatterCount+' SCATTERS · '+BONUS_NAME[bonusId];
      await Promise.all([...columns.querySelectorAll('.purchase-closed')].map(el=>motion(ctx,el,[{opacity:.55,transform:'scale(.95)'},{opacity:1,transform:'scale(1.04)',offset:.5},{opacity:1,transform:'none'}],260)));
      await Promise.all([...columns.querySelectorAll('[data-symbol=S]')].map(el=>motion(ctx,el,[{transform:'scale(1)'},{transform:'scale(1.12)',offset:.5},{transform:'none'}],350)));
      await pause(ctx,ctx.reduced?100:420);
      await motion(ctx,panel,[{opacity:1},{opacity:0}],180);
    } finally {panel.getAnimations({subtree:true}).forEach(a=>a.cancel());panel.remove();}
  },
};
