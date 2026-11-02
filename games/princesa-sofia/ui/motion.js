import {symbolAssets} from './symbols.js';
/** Representative art-direction motion. Only presents the board supplied by the engine. */
const activeBoards = new WeakMap();

const effects = {
  exit: [{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(14%) scale(.94)'}],
  spin: [
    { opacity: 0, transform: 'translateY(-600%)' },
    { opacity: 1, transform: 'translateY(2%) scale(1)', offset: .84 },
    { opacity: 1, transform: 'translateY(0) scale(1)' },
  ],
  hit: [
    { filter: 'brightness(1)', transform: 'scale(1)' },
    { filter: 'brightness(1.35) drop-shadow(0 0 5px #fff3dc)', transform: 'scale(1.035)', offset: .45 },
    { filter: 'brightness(1)', transform: 'scale(1)' },
  ],
  scatter: [
    { filter: 'brightness(1)', transform: 'rotate(0deg)' },
    { filter: 'brightness(1.3) drop-shadow(0 0 6px #ffd8ec)', transform: 'rotate(-4deg)', offset: .35 },
    { filter: 'brightness(1.15)', transform: 'rotate(3deg)', offset: .7 },
    { filter: 'brightness(1)', transform: 'rotate(0deg)' },
  ],
  magic: [
    { opacity: .5, filter: 'brightness(1.5) drop-shadow(0 0 7px #e4dfff)', transform: 'scale(.84)' },
    { opacity: 1, filter: 'brightness(1.3) drop-shadow(0 0 5px #ffd9ed)', transform: 'scale(1.035)', offset: .65 },
    { opacity: 1, filter: 'brightness(1)', transform: 'scale(1)' },
  ],
};

/** Interrupt a presentation without changing its final symbols or any game state. */
export function cancelBoardMotion(board) {
  activeBoards.get(board)?.cancel();
}

/**
 * Await after renderBoard. spin targets all cells; hit, scatter and magic target
 * the existing .hit, .scatter and .placed classes. Duration 0 skips the effect.
 * A new call supersedes the previous presentation on this board.
 */
export async function animateBoard(kind, board, { duration = 350 } = {}) {
  if (!board) return;
  cancelBoardMotion(board);
  const keyframes = effects[kind];
  const document = board.ownerDocument;
  const reduced = document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (!keyframes || document.hidden || reduced?.matches || !(duration > 0)) return;
  const selector = { hit: '.cell.hit', scatter: '.cell.scatter', magic: '.cell.placed' }[kind] ?? '.cell';
  const animations = [];
  const cancel = () => animations.forEach(animation => animation.cancel());
  const onVisibility = () => { if (document.hidden) cancel(); };
  const onPreference = () => { if (reduced.matches) cancel(); };
  const controller = { cancel };
  activeBoards.set(board, controller);
  document.addEventListener('visibilitychange', onVisibility);
  reduced?.addEventListener?.('change', onPreference);
  try {
    for (const cell of board.querySelectorAll(selector)) {
      // Move the artwork inside its stable grid cell; the board never reflows.
      const artwork = kind === 'spin' ? cell : cell.querySelector('.symbol-art, strong') ?? cell;
      if (typeof artwork.animate !== 'function') continue;
      const column = Number(cell.dataset.position ?? 0) % 6;
      animations.push(artwork.animate(keyframes, {
        duration,
        delay: kind === 'spin' ? ((4-Math.floor(Number(cell.dataset.position)/6))*6+column) * duration * .045 : 0,
        easing: 'cubic-bezier(.22,.65,.32,1)',
        fill: 'backwards',
      }));
    }
    await Promise.allSettled(animations.map(animation => animation.finished));
  } finally {
    cancel();
    document.removeEventListener('visibilitychange', onVisibility);
    reduced?.removeEventListener?.('change', onPreference);
    if (activeBoards.get(board) === controller) activeBoards.delete(board);
  }
}

/** Exposes page visibility for ambient CSS; dispose when removing the surface. */
export function observeMotionVisibility(surface) {
  const document = surface.ownerDocument;
  const update = () => { surface.dataset.motionPaused = String(document.hidden); };
  update();
  document.addEventListener('visibilitychange', update);
  return () => {
    document.removeEventListener('visibilitychange', update);
    delete surface.dataset.motionPaused;
  };
}

function motionScope(board, duration, skip) {
  cancelBoardMotion(board);
  const doc = board.ownerDocument;
  const preference = doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const animations = new Set(), nodes = new Set();
  let cancelled = doc.hidden || preference?.matches || !(duration > 0) || Boolean(skip?.());
  const controller = { cancel() { cancelled = true; animations.forEach(a => a.cancel()); nodes.forEach(n => n.remove()); } };
  const changed = () => { if (doc.hidden || preference?.matches) controller.cancel(); };
  activeBoards.set(board, controller);
  doc.addEventListener('visibilitychange', changed);
  preference?.addEventListener?.('change', changed);
  return {
    get stopped() { return cancelled || Boolean(skip?.()); },
    node(node) { nodes.add(node); return node; },
    play(element, frames, options = {}) {
      if (this.stopped || !element?.animate) return Promise.resolve();
      const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.22,.65,.32,1)', fill: 'backwards', ...options });
      animations.add(animation);
      return animation.finished.catch(() => {}).finally(() => { if(options.fill !== 'forwards') { animation.cancel(); animations.delete(animation); } });
    },
    close() {
      controller.cancel();
      doc.removeEventListener('visibilitychange', changed);
      preference?.removeEventListener?.('change', changed);
      if (activeBoards.get(board) === controller) activeBoards.delete(board);
    },
  };
}

const artworkOf = cell => cell?.querySelector('.symbol-art, strong') ?? cell;

/** Purchased-bonus theatre only: never writes scatters into the engine board. */
export async function purchaseScatters(board,mode,asset,{duration=1000,skip}={}) {
  const scope=motionScope(board,duration,skip);
  const layer=scope.node(board.cloneNode(true));layer.removeAttribute('id');layer.className='board purchase-scatters purchase-grid';
  layer.setAttribute('aria-label','Spin de apresentação do bónus comprado');
  const count={common:3,super:4,secret:5}[mode],destinations=[2,15,26,8,21].slice(0,count);
  const regular=Object.entries(symbolAssets).filter(([id])=>id!=='S');
  for(const [p,cell] of [...layer.querySelectorAll('.cell')].entries()) {
    const scatter=destinations.includes(p),[id,src]=regular[(p*7+3)%regular.length];
    cell.replaceChildren();cell.className='cell '+(scatter?'scatter purchase-flower':id.startsWith('P')?'premium':'normal');cell.dataset.symbol=scatter?'S':id;
    const image=document.createElement('img');image.className='symbol-art';image.src=scatter?asset:src;image.alt='';cell.append(image);
  }
  board.parentElement.append(layer);
  try {
    await Promise.all([...layer.children].filter(el=>el.classList.contains('cell')).map((cell,p)=>scope.play(cell,effects.spin,{duration:duration*.85,delay:((4-Math.floor(p/6))*6+p%6)*duration*.045})));
    await gatherScatters(layer,mode,{duration:duration*.7,skip});
  } finally {scope.close();}
}

export async function dissolveToXP(board,positions,target,{duration=650,skip}={}) {
 const scope=motionScope(board,duration,skip),end=target.getBoundingClientRect(),cells=[...new Set(positions)].map(p=>board.querySelector('[data-position="'+p+'"]')).filter(Boolean);
 try {
  const effects=[];
  for(const cell of cells){
   effects.push(scope.play(artworkOf(cell),[{opacity:1,filter:'blur(0px)'},{opacity:0,filter:'blur(5px)',transform:'scale(.6)'}],{duration:duration*.5,fill:'forwards'}).then(()=>{cell.classList.add('dissolved');}));
   if(scope.stopped)continue;
   const r=cell.getBoundingClientRect();
   for(let i=0;i<3;i++){
    const spark=scope.node(document.createElement('span'));spark.className='xp-dust';spark.setAttribute('aria-hidden','true');
    Object.assign(spark.style,{left:(r.left+r.width*(.3+i*.2))+'px',top:(r.top+r.height*.5)+'px'});document.body.append(spark);
    const x=end.left+end.width*(.25+i*.25)-r.left-r.width*(.3+i*.2),y=end.top+end.height/2-r.top-r.height*.5;
    effects.push(scope.play(spark,[{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1)',offset:.2},{opacity:0,transform:'translate('+x+'px,'+y+'px) scale(.2)'}],{duration}));
   }
  }
  await Promise.all(effects);
  cells.forEach(cell=>cell.classList.add('dissolved'));
 }finally{scope.close();}
}

/** Engine removed positions are required: repeated symbol names cannot identify survivors. */
export async function cascadeBoard(board, before, after, render, { duration = 350, removed = [], skip, removalAlreadyPresented = false } = {}) {
  const scope = motionScope(board, duration, skip);
  const cells = [...board.querySelectorAll('.cell')];
  const erased = new Set(removed);
  const origins = cells.map(cell => cell.getBoundingClientRect());
  const replacements = [];
  let rendered = false;
  try {
    if (!removalAlreadyPresented) await Promise.all([...erased].map(p => scope.play(artworkOf(cells[p]), [
      { opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.45)', filter: 'brightness(1.4)' },
    ], { duration: duration * .55, fill: 'forwards' })));
    render(after);
    rendered = true;
    const fresh = [...board.querySelectorAll('.cell')];
    for (let column = 0; column < 6; column++) {
      const survivors = [];
      for (let row = 4; row >= 0; row--) {
        const position = row * 6 + column;
        if (!erased.has(position) && before[position] != null) survivors.push(position);
      }
      for (let index = 0; index < 5; index++) {
        const destination = (4 - index) * 6 + column;
        if (index >= survivors.length) {
          replacements.push(fresh[destination]);
          fresh[destination].style.visibility = 'hidden';
          continue;
        }
        const origin = survivors[index];
        const survivor = cells[origin];
        survivor.className = fresh[destination].className;
        survivor.dataset.position = String(destination);
        survivor.setAttribute('aria-label', fresh[destination].getAttribute('aria-label'));
        fresh[destination].replaceWith(survivor);
      }
    }
    const settled = [...board.querySelectorAll('.cell')];
    // Rects include the shell's responsive scale; element translations use local CSS px.
    const boardWidth = board.getBoundingClientRect().width;
    const scale = board.offsetWidth > 0 && boardWidth > 0 ? boardWidth / board.offsetWidth : 1;
    const falls = [];
    for (let column = 0; column < 6; column++) {
      const survivors = cells.map((_, p) => p).filter(p => p % 6 === column && !erased.has(p) && before[p] != null).reverse();
      survivors.forEach((origin, index) => {
        const destination = (4 - index) * 6 + column;
        const target = settled[destination];
        const dy = (origins[origin].top - target.getBoundingClientRect().top) / scale;
        if (dy) falls.push(scope.play(target, [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], { duration: duration * .8 }));
      });
    }
    await Promise.all(falls);
    await Promise.all(replacements.sort((a,b)=>Number(b.dataset.position)-Number(a.dataset.position)).map((cell,index) => {
      const art=artworkOf(cell); art.style.opacity='0'; cell.style.visibility='';
      return scope.play(art,effects.spin,{duration:duration*1.15,delay:index*duration*.07}).finally(()=>{art.style.opacity='';});
    }));
  } finally {
    if (!rendered) render(after);
    replacements.forEach(cell => { cell.style.visibility = ''; });
    scope.close();
  }
}

function floatingArtwork(scope, board, cell) {
  const artwork = artworkOf(cell);
  const rect = artwork.getBoundingClientRect();
  const clone = scope.node(artwork.cloneNode(true));
  clone.removeAttribute('id');
  clone.setAttribute('aria-hidden', 'true');
  Object.assign(clone.style, {
    position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`,
    height: `${rect.height}px`, margin: '0', pointerEvents: 'none', zIndex: '50', objectFit: 'contain',
  });
  board.ownerDocument.body.append(clone);
  return { clone, rect };
}

/** Confirmed scatters converge; call only after the engine emits a bonus/retrigger. */
export async function gatherScatters(board, mode, { duration = 650, skip } = {}) {
  const scope = motionScope(board, duration, skip);
  const bounds = board.getBoundingClientRect();
  const variants = { common: { scale: .65, turn: 24, glow: '#ffe5f1' }, super: { scale: .85, turn: -75, glow: '#e0d8ff' }, secret: { scale: 1, turn: 140, glow: '#fff2bf' } };
  const variant = variants[mode] ?? variants.common;
  try {
    if (scope.stopped) return;
    await Promise.all([...board.querySelectorAll('.cell.scatter')].map(cell=>scope.play(artworkOf(cell),effects.scatter,{duration:duration*.55})));
    await Promise.all([...board.querySelectorAll('.cell.scatter')].map((cell, index) => {
      const { clone, rect } = floatingArtwork(scope, board, cell);
      cell.classList.add('gathered');
      const x = bounds.left + bounds.width / 2 - rect.left - rect.width / 2;
      const y = bounds.top + bounds.height / 2 - rect.top - rect.height / 2;
      return scope.play(clone, [
        { opacity: 0, transform: 'scale(.85)' },
        { opacity: 1, transform: 'scale(1)', offset: .15 },
        { opacity: 1, transform: `translate(${x}px,${y}px) rotate(${variant.turn}deg) scale(${variant.scale})`, filter: `drop-shadow(0 0 9px ${variant.glow})`, offset: .8 },
        { opacity: 0, transform: `translate(${x}px,${y}px) rotate(${variant.turn}deg) scale(.15)` },
      ], { delay: index * duration * .035 });
    }));
    const flowers=[];
    for(let i=0;i<18;i++){
      const petal=scope.node(board.ownerDocument.createElement('img'));petal.src=symbolAssets.S;petal.alt='';petal.className='scatter-petal';
      Object.assign(petal.style,{left:(bounds.left+bounds.width/2-18)+'px',top:(bounds.top+bounds.height/2-18)+'px'});board.ownerDocument.body.append(petal);
      const angle=i*Math.PI*2/18,reach=Math.min(bounds.width,bounds.height)*.35;
      flowers.push(scope.play(petal,[{opacity:0,transform:'scale(.2)'},{opacity:1,offset:.15},{opacity:0,transform:`translate(${Math.cos(angle)*reach}px,${Math.sin(angle)*reach}px) rotate(${i*40}deg) scale(.5)`}],{duration:duration*.7}));
    }
    await Promise.all(flowers);
  } finally { board.querySelectorAll('.gathered').forEach(cell=>cell.classList.remove('gathered'));scope.close(); }
}

/** Animate only actual new wild destinations and strictly increased existing wilds. */
export async function castMagic(board,before,after,{duration=850,positions=[],source,skip,onWild}={}) {
 const scope=motionScope(board,duration,skip),cells=[...board.querySelectorAll('.cell')],origin=source?.getBoundingClientRect();
 const upgrades=after.flatMap((cell,p)=>cell?.symbol==='W'&&before[p]?.symbol==='W'&&cell.multiplier>before[p].multiplier?[p]:[]);
 const labels=upgrades.map(p=>({el:cells[p].querySelector('.symbol-letter'),old:before[p].multiplier+'×',final:after[p].multiplier+'×'}));
 // Keep each displaced symbol visible until the magic actually reaches its cell.
 const displaced=new Map();
 positions.forEach(p=>{
  const cell=cells[p],previous=before[p],symbol=typeof previous==='string'?previous:previous?.symbol;
  if(symbolAssets[symbol]&&!scope.stopped){
   const rect=artworkOf(cell).getBoundingClientRect(),image=scope.node(board.ownerDocument.createElement('img'));
   image.src=symbolAssets[symbol];image.alt='';image.className='wild-displaced-symbol';image.setAttribute('aria-hidden','true');
   Object.assign(image.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',objectFit:'contain',pointerEvents:'none',zIndex:'49'});
   board.ownerDocument.body.append(image);displaced.set(p,image);
  }
  cell.style.visibility='hidden';
 });
 try {
  if(scope.stopped)return;
  if(source)await scope.play(source,[{translate:'0 0'},{background:'#dbc8f5',boxShadow:'0 0 12px #b49bd7',translate:'-2px 0',offset:.25},{background:'#c3e8e1',boxShadow:'0 0 12px #a1d4d1',translate:'2px 0',offset:.5},{background:'#f2dfba',boxShadow:'0 0 12px #dfc48f',translate:'-2px 0',offset:.75},{translate:'0 0'}],{duration:duration*.55});
  for(const p of positions){
   if(scope.stopped)break;
   const cell=cells[p],r=cell.getBoundingClientRect();
   const dust=[],dustNodes=[];
   for(let i=0;i<6;i++){
    const spark=scope.node(document.createElement('span'));spark.className='wild-dust';spark.style.setProperty('--dust-color',['#fffdf3','#f6bad7','#cfb9f6','#b8e7ce','#f5d58a','#bae8ed'][i]);spark.setAttribute('aria-hidden','true');
    const x0=origin?origin.left+origin.width/2:r.left+r.width/2,y0=origin?origin.top+origin.height/2:r.top;
    Object.assign(spark.style,{left:x0+'px',top:y0+'px'});document.body.append(spark);dustNodes.push(spark);
    dust.push(scope.play(spark,[{opacity:0},{opacity:1,offset:.2},{opacity:0,transform:'translate('+(r.left+r.width*(.2+i*.12)-x0)+'px,'+(r.top+r.height*.5-y0)+'px)'}],{duration:duration*.5,delay:i*12}));
   }
   await Promise.all(dust);
   dustNodes.forEach(node=>node.remove());
   displaced.get(p)?.remove();
   cell.style.visibility='';
   const fairy=scope.node(document.createElement('img'));fairy.src='ui/art/fairy-dust.png';fairy.className='wild-fairy';fairy.alt='';cell.append(fairy);
   await Promise.all([scope.play(artworkOf(cell),[{opacity:0,transform:'scale(.6)'},{opacity:1,transform:'scale(1.04)',offset:.8},{opacity:1,transform:'scale(1)'}],{duration:duration*.55}),scope.play(fairy,[{opacity:0},{opacity:.9,offset:.2},{opacity:0,transform:'translate(15%,-15%)'}],{duration:duration*.55})]);
   fairy.remove();
   if(onWild)onWild(p);
  }
  for(const item of labels){item.el.textContent=item.old;await scope.play(item.el,[{opacity:1},{opacity:0}],{duration:duration*.15});item.el.textContent=item.final;await scope.play(item.el,[{opacity:0},{opacity:1}],{duration:duration*.2});}
 }finally{positions.forEach(p=>{cells[p].style.visibility='';});labels.forEach(item=>{item.el.textContent=item.final;});scope.close();}
}
