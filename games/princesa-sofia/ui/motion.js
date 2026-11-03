import {symbolAssets} from './symbols.js';
import { track, wait as clockWait } from './tempo.js';
/** Representative art-direction motion. Only presents the board supplied by the engine. */
const activeBoards = new WeakMap();

const effects = {
  exit: [{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(14%) scale(.94)'}],
  spin: [
    { opacity: 0, transform: 'translateY(-600%)' },
    { opacity: 1, transform: 'translateY(2%) scale(1)', offset: .84 },
    { opacity: 1, transform: 'translateY(0) scale(1)' },
  ],
  // queda curta e individual durante o suspense (cai de perto, com um pequeno ressalto)
  suspenseDrop: [
    { opacity: 0, transform: 'translateY(-130%)' },
    { opacity: 1, transform: 'translateY(4%)', offset: .78 },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  hit: [
    { filter: 'brightness(1)', transform: 'scale(1)' },
    { filter: 'brightness(1.35)', transform: 'scale(1.035)', offset: .45 },
    { filter: 'brightness(1)', transform: 'scale(1)' },
  ],
  scatter: [
    { filter: 'brightness(1)', transform: 'rotate(0deg)' },
    { filter: 'brightness(1.3)', transform: 'rotate(-4deg)', offset: .35 },
    { filter: 'brightness(1.15)', transform: 'rotate(3deg)', offset: .7 },
    { filter: 'brightness(1)', transform: 'rotate(0deg)' },
  ],
  magic: [
    { opacity: .5, filter: 'brightness(1.5)', transform: 'scale(.84)' },
    { opacity: 1, filter: 'brightness(1.3)', transform: 'scale(1.035)', offset: .65 },
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
      animations.push(track(artwork.animate(keyframes, {
        duration,
        delay: kind === 'spin' ? ((4-Math.floor(Number(cell.dataset.position)/6))*6+column) * duration * .045 : 0,
        easing: 'cubic-bezier(.22,.65,.32,1)',
        fill: 'backwards',
      })));
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
      const animation = track(element.animate(frames, { duration, easing: 'cubic-bezier(.22,.65,.32,1)', fill: 'backwards', ...options }));
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

// Esperas no relogio da apresentacao (ui/tempo.js): seguem a velocidade, mesmo se mudar a meio.
const wait = ms => clockWait(ms);

/**
 * Revelacao de um spin com suspense de Scatters. So apresenta a grelha ja decidida pelo motor:
 * a ordem e o ritmo dependem apenas do que ja aterrou, nunca do resultado futuro.
 * - As colunas caem da esquerda para a direita (cada coluna de baixo para cima).
 * - levels: { scattersJaAterrados: nivel } - ex. base {2:1, 3:2, 4:3}: com 2 aterrados e possibilidade
 *   de mais um, as celulas seguintes caem uma a uma com suspense de nivel 1; com 3, nivel 2; com 4, nivel 3.
 * - maxScatters: acima disto deixa de haver suspense (ja nao pode aparecer outro).
 * onScatter(n) toca quando aterra o n-esimo Scatter; onSuspense(nivel) quando o suspense sobe.
 */
export async function revealSpin(board, { duration = 900, levels = { 2: 1, 3: 2, 4: 3 }, maxScatters = 5, skip, onScatter, onSuspense, onColumn, onSuspenseCell, together = false } = {}) {
  const scope = motionScope(board, duration, skip);
  const cells = [...board.querySelectorAll('.cell')];
  const isScatter = cell => cell?.dataset.symbol === 'S';
  const hidden = new Set(cells);
  const show = cell => { hidden.delete(cell); cell.style.visibility = ''; };
  let landed = 0, level = 0;
  const setLevel = next => {
    if (next === level) return;
    level = next;
    if (level) { board.dataset.suspense = String(level); onSuspense?.(level); } else delete board.dataset.suspense;
    cells.forEach(c => c.classList.toggle('suspense-held', level > 0 && isScatter(c) && !hidden.has(c)));
  };
  const land = cell => {
    if (!isScatter(cell)) return;
    landed++;
    onScatter?.(landed);
    if (level) cell.classList.add('suspense-held');
  };
  const levelFor = n => (n < maxScatters ? levels[n] || 0 : 0);
  // O som acompanha o impacto (o simbolo bate no fundo a 84% / 78% da queda), nao o fim da animacao.
  const IMPACT = new Map([[effects.spin, .84], [effects.suspenseDrop, .78]]);
  const drop = (cell, fall, frames = effects.spin, onImpact) => {
    show(cell);
    const impact = wait(fall * (IMPACT.get(frames) ?? 1)).then(() => { land(cell); onImpact?.(); });
    return Promise.all([scope.play(cell, frames, { duration: fall }), impact]);
  };
  try {
    if (scope.stopped) return;
    cells.forEach(c => { c.style.visibility = 'hidden'; });
    const pending = [];
    for (let column = 0; column < 6; column++) {
      if (scope.stopped) break;
      const columnCells = [4, 3, 2, 1, 0].map(row => cells[row * 6 + column]).filter(Boolean);
      // Antes de uma coluna em suspense, tudo o que esta a cair tem de aterrar: o nivel depende do que ja se ve.
      const scattersSoFar = cells.filter(c => c.dataset.position % 6 < column && isScatter(c)).length;
      if (levelFor(scattersSoFar)) {
        await Promise.all(pending.splice(0));
        if (scope.stopped) break;
        setLevel(levelFor(landed));
        columnCells.forEach(c => c.classList.add('suspense-col'));
        await wait(duration * (0.08 + 0.07 * level)); // respirar antes da coluna
        if (together) {
          // Ultra/turbo: a coluna de suspense cai inteira de uma vez, com uma pausa curta a seguir.
          const lvl = levelFor(landed);
          await Promise.all(columnCells.map((cell, index) => drop(cell, duration * (0.1 + 0.04 * lvl), effects.suspenseDrop, index ? undefined : () => onSuspenseCell?.(0, lvl))));
          await wait(duration * 0.03 * lvl);
        } else for (const cell of columnCells) {
          if (scope.stopped) break;
          const current = levelFor(landed);
          setLevel(current);
          if (!current) { pending.push(drop(cell, duration * .5)); await wait(duration * .05); continue; }
          const index = columnCells.indexOf(cell);
          await drop(cell, duration * (0.08 + 0.035 * current), effects.suspenseDrop, () => onSuspenseCell?.(index, current)); // cai sozinho
          await wait(duration * (0.02 + 0.02 * current));                              // pequena pausa de suspense
        }
        columnCells.forEach(c => c.classList.remove('suspense-col'));
        setLevel(levelFor(landed));
      } else {
        setLevel(0);
        const col = column;
        columnCells.forEach((cell, index) => pending.push(wait(index * duration * .045).then(() => scope.stopped ? undefined : drop(cell, duration * .62, effects.spin, index === 0 ? () => onColumn?.(col) : undefined))));
        // Ultra/turbo: as colunas caem quase juntas (ligeira onda da esquerda para a direita).
        await wait(duration * (together ? .035 : .2));
      }
    }
    await Promise.all(pending);
  } finally {
    cells.forEach(c => { c.style.visibility = ''; c.classList.remove('suspense-col', 'suspense-held'); });
    delete board.dataset.suspense;
    scope.close();
  }
}

/** Pesos aproximados dos simbolos regulares (so para a grelha teatral da compra). */
const FILLER_WEIGHTS = { N1: 155, N2: 137, N3: 121, N4: 119, N5: 103, P1: 95, P2: 85, P3: 80, P4: 65, P5: 40 };
function randomFiller() {
  const total = Object.values(FILLER_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [id, w] of Object.entries(FILLER_WEIGHTS)) if ((r -= w) < 0) return id;
  return 'N1';
}

/**
 * Purchased-bonus theatre only: never writes scatters into the engine board.
 * Cada compra sorteia uma grelha nova: os Scatters caem em colunas e linhas aleatorias,
 * e a revelacao usa o mesmo suspense progressivo de um spin normal.
 */
export async function purchaseScatters(board,mode,asset,{duration=1000,skip,onScatter,onSuspense,onColumn,onSuspenseCell,together=false}={}) {
  const scope=motionScope(board,duration,skip);
  const layer=scope.node(board.cloneNode(true));layer.removeAttribute('id');layer.className='board purchase-scatters purchase-grid';
  layer.setAttribute('aria-label','Spin de apresentação do bónus comprado');
  const count={common:3,super:4,secret:5}[mode]??3;
  // colunas distintas ao acaso, uma linha ao acaso em cada
  const columns=[0,1,2,3,4,5].sort(()=>Math.random()-.5).slice(0,count);
  const destinations=columns.map(c=>Math.floor(Math.random()*5)*6+c);
  for(const [p,cell] of [...layer.querySelectorAll('.cell')].entries()) {
    const scatter=destinations.includes(p),id=scatter?'S':randomFiller();
    cell.replaceChildren();cell.removeAttribute('style');cell.className='cell '+(scatter?'scatter purchase-flower':id.startsWith('P')?'premium':'normal');
    cell.dataset.symbol=id;cell.dataset.position=String(p);
    const image=document.createElement('img');image.className='symbol-art';image.src=scatter?asset:symbolAssets[id];image.alt='';cell.append(image);
  }
  board.parentElement.append(layer);
  try {
    await revealSpin(layer,{duration,levels:{2:1,3:2,4:3},maxScatters:count,skip,onScatter,onSuspense,onColumn,onSuspenseCell,together});
    await gatherScatters(layer,mode,{duration:duration*.7,skip});
  } finally {scope.close();}
}

export async function dissolveToXP(board,positions,target,{duration=650,skip}={}) {
 const scope=motionScope(board,duration,skip),end=target.getBoundingClientRect(),cells=[...new Set(positions)].map(p=>board.querySelector('[data-position="'+p+'"]')).filter(Boolean);
 try {
  const effects=[];
  for(const cell of cells){
   effects.push(scope.play(artworkOf(cell),[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.6)'}],{duration:duration*.5,fill:'forwards'}).then(()=>{cell.classList.add('dissolved');}));
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
/**
 * suspense (opcional): { levels, maxScatters, duration, onScatter, onSuspense, onSuspenseCell } - as mesmas regras
 * do revealSpin. Se as flores ja no tabuleiro (mais as que forem caindo) permitirem mais uma, os simbolos novos
 * caem um a um, da esquerda para a direita, com suspense; senao caem como antes. onScatter avisa cada flor nova.
 */
export async function cascadeBoard(board, before, after, render, { duration = 350, removed = [], skip, removalAlreadyPresented = false, suspense = null } = {}) {
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
    if (!suspense) {
      await Promise.all(replacements.sort((a,b)=>Number(b.dataset.position)-Number(a.dataset.position)).map((cell,index) => {
        const art=artworkOf(cell); art.style.opacity='0'; cell.style.visibility='';
        return scope.play(art,effects.spin,{duration:duration*1.15,delay:index*duration*.07}).finally(()=>{art.style.opacity='';});
      }));
    } else {
      // Ordem natural: colunas da esquerda para a direita, cada uma de baixo para cima.
      const ordered = replacements.slice().sort((a, b) => { const pa = +a.dataset.position, pb = +b.dataset.position; return (pa % 6) - (pb % 6) || pb - pa; });
      const fresh = new Set(ordered);
      const isScatter = cell => cell?.dataset.symbol === 'S';
      const { levels = {}, maxScatters = 5, onScatter, onSuspense, onSuspenseCell, onFirstLand } = suspense;
      let firstLanded = false;
      const impactAt = (ms, cell, extra) => wait(ms).then(() => { land(cell); extra?.(); if (!firstLanded) { firstLanded = true; onFirstLand?.(); } });
      const sd = suspense.duration ?? duration * 1.8;
      const levelFor = n => (n < maxScatters ? levels[n] || 0 : 0);
      let count = settled.filter(c => isScatter(c) && !fresh.has(c)).length, level = 0;
      const visibleScatters = () => settled.filter(c => isScatter(c) && c.style.visibility !== 'hidden' && (!fresh.has(c) || c.dataset.landed));
      const setLevel = next => {
        if (next === level) return;
        level = next;
        if (level) { board.dataset.suspense = String(level); onSuspense?.(level); } else delete board.dataset.suspense;
        visibleScatters().forEach(c => c.classList.toggle('suspense-held', level > 0));
      };
      const land = cell => { cell.dataset.landed = '1'; if (isScatter(cell)) { count++; onScatter?.(count); if (level) cell.classList.add('suspense-held'); } };
      const pending = [];
      let normalIndex = 0, suspenseIndex = 0;
      if (suspense.together) {
        // Ultra/turbo: cada coluna de simbolos novos cai de uma vez; o suspense mantem-se, mas por coluna.
        for (let column = 0; column < 6 && !scope.stopped; column++) {
          const group = ordered.filter(cell => +cell.dataset.position % 6 === column);
          if (!group.length) continue;
          const current = levelFor(count);
          if (current) {
            await Promise.all(pending.splice(0));
            if (scope.stopped) break;
            setLevel(levelFor(count));
            const fall = sd * (0.1 + 0.04 * level), lvl = level;
            group.forEach(cell => { cell.classList.add('suspense-col'); cell.style.visibility = ''; });
            await Promise.all(group.map((cell, index) => Promise.all([scope.play(cell, effects.suspenseDrop, { duration: fall }), impactAt(fall * .78, cell, index ? undefined : () => onSuspenseCell?.(suspenseIndex++ % 5, lvl))])));
            group.forEach(cell => cell.classList.remove('suspense-col'));
            await wait(sd * 0.03 * level);
          } else {
            setLevel(0);
            group.forEach((cell, index) => {
              const art = artworkOf(cell); art.style.opacity = '0'; cell.style.visibility = '';
              const delay = (column * 0.35 + index) * duration * .05, fall = duration * 1.15;
              pending.push(Promise.all([scope.play(art, effects.spin, { duration: fall, delay }).finally(() => { art.style.opacity = ''; }), impactAt(delay + fall * .84, cell)]));
            });
            // se esta coluna pode trazer a flor que abre o suspense, a seguinte espera por ela
            if (group.some(isScatter) && levelFor(count + group.filter(isScatter).length)) await Promise.all(pending.splice(0));
          }
        }
      } else for (const cell of ordered) {
        if (scope.stopped) break;
        const current = levelFor(count);
        if (current) {
          await Promise.all(pending.splice(0)); // o que ja estava a cair aterra antes do suspense
          if (scope.stopped) break;
          setLevel(levelFor(count));
          cell.classList.add('suspense-col'); cell.style.visibility = '';
          const fall = sd * (0.1 + 0.04 * level), lvl = level, idx = suspenseIndex++ % 5;
          await Promise.all([scope.play(cell, effects.suspenseDrop, { duration: fall }), impactAt(fall * .78, cell, () => onSuspenseCell?.(idx, lvl))]);
          cell.classList.remove('suspense-col');
          await wait(sd * (0.03 + 0.03 * level));
        } else {
          setLevel(0);
          const art = artworkOf(cell); art.style.opacity = '0'; cell.style.visibility = '';
          const delay = normalIndex++ * duration * .07, fall = duration * 1.15;
          pending.push(Promise.all([scope.play(art, effects.spin, { duration: fall, delay }).finally(() => { art.style.opacity = ''; }), impactAt(delay + fall * .84, cell)]));
          // se esta pode ser a flor que abre o suspense, as seguintes esperam por ela
          if (isScatter(cell) && levelFor(count + 1)) { await Promise.all(pending.splice(0)); normalIndex = 0; }
        }
      }
      await Promise.all(pending);
    }
  } finally {
    if (!rendered) render(after);
    replacements.forEach(cell => { cell.style.visibility = ''; cell.classList.remove('suspense-col'); delete cell.dataset.landed; });
    board.querySelectorAll('.suspense-held').forEach(cell => cell.classList.remove('suspense-held'));
    if (suspense) delete board.dataset.suspense;
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
        { opacity: 1, transform: `translate(${x}px,${y}px) rotate(${variant.turn}deg) scale(${variant.scale})`, offset: .8 },
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
export async function castMagic(board,before,after,{duration=850,positions=[],source,skip,onWild,together=false}={}) {
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
  // together (ultra/turbo): os WILDs aparecem em onda, sobrepostos, em vez de um de cada vez.
  const place=async p=>{
   if(scope.stopped)return;
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
   const fairy=scope.node(document.createElement('img'));fairy.src='ui/art/fairy-dust.webp';fairy.className='wild-fairy';fairy.alt='';cell.append(fairy);
   await Promise.all([scope.play(artworkOf(cell),[{opacity:0,transform:'scale(.6)'},{opacity:1,transform:'scale(1.04)',offset:.8},{opacity:1,transform:'scale(1)'}],{duration:duration*.55}),scope.play(fairy,[{opacity:0},{opacity:.9,offset:.2},{opacity:0,transform:'translate(15%,-15%)'}],{duration:duration*.55})]);
   fairy.remove();
   if(onWild)onWild(p);
  };
  if(together)await Promise.all(positions.map((p,i)=>wait(i*duration*.12).then(()=>place(p))));
  else for(const p of positions){if(scope.stopped)break;await place(p);}
  const relabel=async item=>{item.el.textContent=item.old;await scope.play(item.el,[{opacity:1},{opacity:0}],{duration:duration*.15});item.el.textContent=item.final;await scope.play(item.el,[{opacity:0},{opacity:1}],{duration:duration*.2});};
  if(together)await Promise.all(labels.map(relabel));
  else for(const item of labels)await relabel(item);
 }finally{positions.forEach(p=>{cells[p].style.visibility='';});labels.forEach(item=>{item.el.textContent=item.final;});scope.close();}
}
