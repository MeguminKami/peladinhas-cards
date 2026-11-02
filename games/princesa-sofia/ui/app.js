import { DEFAULT_CONFIG, SYMBOLS } from '../src/index.js';
import { TestSession, BET_UNITS, SPEEDS, autoCount } from './session.js';
import { previewBoard, demoScenario } from './fixtures.js';
import { symbolNames, symbolAssets, artAssets, bonusAssets, bonusNames } from './symbols.js';
import { animateBoard, cancelBoardMotion, observeMotionVisibility, cascadeBoard, gatherScatters, castMagic, purchaseScatters, dissolveToXP } from './motion.js';
import { installLayout } from './layout.js';
import { installPresentation, enterScene, showHitAmount, pulse, countAmount, showRibbon, flashXPBar } from './presentation.js';
import { hitCredits, prizeTier } from './payout-presentation.js';

const $ = id => document.getElementById(id);
const names = bonusNames;
const bonusDescription = { common:'A magia coloca mais WILDs e aumenta o multiplicador em +1.', super:'A magia coloca mais WILDs e aumenta o multiplicador em +2.', secret:'A magia coloca mais 2 WILDs e aumenta o multiplicador em +4.' };
const number = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
const money = units => `${number.format(units / 100)} DJC`;
const creditedUnits = (paid100, bet) => Number(BigInt(paid100) * BigInt(bet) / 100n);
const seed = crypto.getRandomValues(new Uint32Array(1))[0];
const session = new TestSession({ seed });
let running = false, autoRunning = false, autoCancel = false, autoRemaining = 0;
let artReady = false;
let hunt = false, speed = 'normal', fastForward = false, betUnits = 100;
let view = { mode: 'base', xp100: 0, level: 0, remaining: 0, paid100: 0, betUnits: 100, demo: false };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const sound = {
  volume: .35, lastVolume: .35, context: null,
  music: null, musicMode: null, musicGain: null, duckUntil: 0,
  buffers: new Map(), pending: new Map(),
  unlock() {
    try {
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.musicGain = this.context.createGain();
        this.musicGain.connect(this.master);
        this.sfxGain = this.context.createGain();
        this.sfxGain.connect(this.master);
        this.applyVolume();
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Audio is optional; a blocked sound must not block a round. */ }
  },
  applyVolume() {
    if (!this.master) return;
    this.master.gain.value = this.volume;
  },
  async load(name) {
    if (this.buffers.has(name)) return this.buffers.get(name);
    if (this.pending.has(name)) return this.pending.get(name);
    const promise = (async () => {
      try {
        const res = await fetch(`ui/audio/sfx/${name}.mp3`);
        if (!res.ok) return null;
        const buf = await this.context.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(name, buf);
        return buf;
      } catch { return null; } finally { this.pending.delete(name); }
    })();
    this.pending.set(name, promise);
    return promise;
  },
  async play(name, { volume = 1, loop = false } = {}) {
    if (!this.context || !this.volume) return null;
    try {
      const buf = await this.load(name);
      if (!buf) return null;
      const src = this.context.createBufferSource();
      src.buffer = buf; src.loop = loop;
      const gain = this.context.createGain();
      gain.gain.value = volume * 0.85;
      src.connect(gain); gain.connect(this.sfxGain);
      src.start();
      return { src, gain };
    } catch { return null; }
  },
  async playMusic(mode) {
    if (!this.context || this.musicMode === mode) return;
    this.musicMode = mode;
    const file = { base: 'theme-base', hunt: 'theme-hunt', common: 'theme-bonus-common', super: 'theme-bonus-super', secret: 'theme-bonus-secret' }[mode];
    if (!file) { this.stopMusic(); return; }
    try {
      const res = await fetch(`ui/audio/music/${file}.opus`);
      if (!res.ok) return;
      const buf = await this.context.decodeAudioData(await res.arrayBuffer());
      if (this.musicMode !== mode) return; // mudou entretanto
      this.stopMusic(0.8);
      const src = this.context.createBufferSource();
      src.buffer = buf; src.loop = true;
      const gain = this.context.createGain();
      const now = this.context.currentTime;
      const target = mode === 'super' ? 0.55 * 0.9 : 0.55; // Super 10% mais baixo
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(target, now + 1.2);
      src.connect(gain); gain.connect(this.musicGain);
      src.start();
      this.music = { src, gain, target };
    } catch { /* musica falhou; o jogo continua em silencio */ }
  },
  stopMusic(fade = 0.5) {
    if (!this.music) return;
    try {
      const now = this.context.currentTime;
      this.music.gain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
      this.music.src.stop(now + fade + 0.05);
    } catch { }
    this.music = null;
  },
  duck(seconds = 2) {
    if (!this.music || !this.context) return;
    const now = this.context.currentTime;
    this.duckUntil = now + seconds;
    const target = this.music.target ?? 0.55;
    this.music.gain.gain.cancelScheduledValues(now);
    this.music.gain.gain.setValueAtTime(this.music.gain.gain.value, now);
    this.music.gain.gain.exponentialRampToValueAtTime(target * 0.33, now + 0.15);
    this.music.gain.gain.exponentialRampToValueAtTime(target, now + seconds);
  },
  // Atalhos semanticos — todos defensivos: nunca lancam excecao
  spin() { try { this.play('spin-whoosh'); } catch { } },
  hit(tier) { try { this.play({ small: 'hit-small', medium: 'hit-medium', large: 'hit-large', epic: 'hit-epic', mega: 'hit-epic', huge: 'hit-epic', colossal: 'hit-epic' }[tier] || 'hit-small'); } catch { } },
  countStart() {
    try {
      this._countWanted = true;
      const p = this.play('win-count', { loop: true, volume: 0.5 });
      if (p && typeof p.then === 'function') p.then(h => { this._countHandle = h; if (!this._countWanted && h) try { h.src.stop(); } catch { } });
    } catch { }
  },
  countEnd() {
    this._countWanted = false;
    try { if (this._countHandle) this._countHandle.src.stop(); } catch { }
    this._countHandle = null;
    try { this.play('win-count-end'); } catch { }
  },
  xpFly() { try { this.play('xp-fly', { volume: 0.7 }); } catch { } },
  magicReady() { try { this.play('magic-ready'); } catch { } },
  magicCast() { try { this.play('magic-cast'); this.duck(2.2); } catch { } },
  wildPlace() { try { this.play('wild-place', { volume: 0.8 }); } catch { } },
  scatterLand() { try { this.play('scatter-land'); } catch { } },
  scatterConverge() { try { this.play('scatter-converge'); } catch { } },
  bonusTrigger() { try { this.play('bonus-trigger'); this.duck(2.8); } catch { } },
  intro(mode) { try { this.play({ common: 'intro-common', super: 'intro-super', secret: 'intro-secret' }[mode]); this.duck(5); } catch { } },
  retrigger() { try { this.play('retrigger'); this.duck(1.8); } catch { } },
  bonusEnd() { try { this.play('bonus-end'); this.duck(3.2); } catch { } },
  maxWin() { try { this.play('max-win'); this.duck(5.5); } catch { } },
  purchase() { try { this.play('purchase-flowers'); } catch { } },
  click() { try { this.play('ui-click', { volume: 0.6 }); } catch { } },
  spinPress() { try { this.play('ui-spin-press'); } catch { } },
  betStep() { try { this.play('ui-bet-step', { volume: 0.5 }); } catch { } },
  dialogOpen() { try { this.play('ui-dialog-open', { volume: 0.7 }); } catch { } },
  dialogClose() { try { this.play('ui-dialog-close', { volume: 0.7 }); } catch { } },
  huntOn() { try { this.play('ui-hunt-on'); } catch { } },
  huntOff() { try { this.play('ui-hunt-off'); } catch { } },
  speed() { try { this.play('ui-speed'); } catch { } },
  autoStart() { try { this.play('ui-auto-start'); } catch { } },
  autoStop() { try { this.play('ui-auto-stop'); } catch { } },
};

function renderBoard(board, hits = [], placed = []) {
  const winning = new Set(hits.flatMap(hit => hit.positions));
  const placedSet = new Set(placed);
  const fragment = document.createDocumentFragment();
  board.forEach((cell, position) => {
    const symbol = typeof cell === 'string' ? cell : cell.symbol;
    const element = document.createElement('div');
    element.className = `cell ${symbol.startsWith('P') ? 'premium' : symbol === 'S' ? 'scatter' : symbol === 'W' ? 'wild' : 'normal'}`;
    element.dataset.position = String(position);
    element.dataset.symbol = symbol;
    if (winning.has(position)) element.classList.add('hit');
    if (placedSet.has(position)) element.classList.add('placed');
    const multiplier = symbol === 'W' ? cell.multiplier : 0;
    element.setAttribute('aria-label', `Linha ${Math.floor(position / 6) + 1}, coluna ${position % 6 + 1}: ${symbol === 'S' ? 'scatter' : symbol === 'W' ? `wild${multiplier ? ` ×${multiplier}` : ''}` : symbol}`);
    const label = document.createElement('strong'); label.className = 'symbol-letter';
    label.textContent = symbol === 'W' ? (multiplier ? `${multiplier}×` : 'W') : symbolNames[symbol];
    if (symbol === 'W') {
      label.style.fontSize = `${Math.min(3.5, 7.5 / label.textContent.length)}rem`;
      const emblem=document.createElement('img');emblem.className='symbol-art wild-emblem';emblem.src='ui/art/wild-emblem.png';emblem.alt='';element.append(emblem);
      const identity=document.createElement('span');identity.className='wild-identity';identity.textContent='WILD';element.append(identity);
    }
    element.setAttribute('aria-label', `Linha ${Math.floor(position / 6) + 1}, coluna ${position % 6 + 1}: ${symbolNames[symbol]}${multiplier ? ` ×${multiplier}` : ''}`);
    if (symbol !== 'W') {
      const art = document.createElement('img'); art.className = 'symbol-art'; art.alt = ''; art.draggable = false;
      art.src = symbolAssets[symbol];
      label.classList.add('sr-only');
      element.append(art);
    }
    element.append(label);
    fragment.append(element);
  });
  $('board').replaceChildren(fragment);
  const count = board.filter(cell => cell === 'S').length;
  $('scatter-count').textContent = `${count} scatter${count === 1 ? '' : 's'}`;
}

function indicators() {
  document.body.dataset.mode = view.mode;
  document.querySelector('.xp-panel').hidden = view.mode === 'base';
  const threshold = DEFAULT_CONFIG.xpThreshold100[view.mode];
  const displayed = Math.min(view.xp100, threshold);
  $('xp-value').textContent = `${compact.format(displayed / 100)} / ${compact.format(threshold / 100)} XP`;
  $('xp-bar').setAttribute('aria-valuemax', String(threshold / 100));
  $('xp-bar').setAttribute('aria-valuenow', String(displayed / 100));
  $('xp-fill').style.width = `${100 * displayed / threshold}%`;
  $('xp-mode').textContent = view.mode === 'base' ? '/ neste spin' : '/ durante o bónus';
  $('magic-level').textContent = String(view.level);
  const rule = DEFAULT_CONFIG.magic[view.mode];
  const currentMagic = rule ? (view.level ? view.magicProgress : {requested:rule.startWilds,multiplier:rule.startMultiplier}) : null;
  $('magic-wilds').textContent = currentMagic ? currentMagic.requested + ' wilds' : '1–3 wilds';
  $('magic-multiplier').textContent = currentMagic ? '×' + currentMagic.multiplier : '';
  $('magic-next').textContent = !rule ? '' : !view.level ? 'Primeira magia' : view.mode === 'common' ? (currentMagic.requested === rule.wildCap ? '+1×' : '+1 W / +1×') : view.mode === 'secret' ? (currentMagic.requested === rule.wildCap ? '' : '+2 W / ') + '+' + rule.multiplierGainCycle[(view.level - 1) % rule.multiplierGainCycle.length] + '×' : (currentMagic.requested === rule.wildCap ? '+2×' : '+1 W / +2×');
  document.querySelector('.magic-panel').setAttribute('aria-label', view.level ? 'Magia atual' : 'Primeira magia');
  $('bonus-panel').hidden = view.mode === 'base';
  $('mode-label').textContent = view.mode === 'base' ? (hunt && !view.demo ? 'BONUS HUNT · CUSTO 4×' : 'JOGO NORMAL') : names[view.mode].toUpperCase();
  $('free-spins').textContent = view.mode === 'base' ? '—' : String(view.remaining);
  $('bonus-status').textContent = view.mode === 'base' ? 'À espera de scatters' : names[view.mode];
  $('bonus-hint').textContent = view.mode === 'base' ? '3 comum · 4 super · 5 secret. Todos começam com 12 spins.' : '2 scatters: +2 spins. 3 scatters: +4 spins. A magia mantém a evolução.';
  $('win').replaceChildren(document.createTextNode(number.format(creditedUnits(view.paid100, view.betUnits) / 100) + ' '));
  const unit = document.createElement('small'); unit.textContent = 'DJC'; $('win').append(unit);
  $('win-multiple').textContent = `${compact.format(view.paid100 / 100)}× a aposta`;
  $('demo-label').hidden = !view.demo;
}

function controls() {
  const locked = running || autoRunning || !artReady;
  $('spin').disabled = !artReady;
  for (const id of ['bet', 'buy-button', 'hunt-button']) $(id).disabled = locked;
  $('bet-minus').disabled = locked || BET_UNITS.indexOf(betUnits) === 0;
  $('bet-plus').disabled = locked || BET_UNITS.indexOf(betUnits) === BET_UNITS.length - 1;
  $('buy-bet-minus').disabled = $('bet-minus').disabled;
  $('buy-bet-plus').disabled = $('bet-plus').disabled;
  document.querySelectorAll('[data-demo]').forEach(button => { button.disabled = locked; });
  $('auto-button').disabled = !artReady || (running && !autoRunning);
  $('auto-button').textContent = autoRunning ? 'Parar auto' : 'Autoplay';
  $('spin-label').textContent = autoRunning ? 'Parar auto' : running ? 'Acelerar' : 'Rodar';
  $('spin-cost').textContent = running ? '' : money(session.cost(hunt ? 'hunt' : 'base', betUnits));
  $('balance').textContent = money(session.balanceUnits);
  $('hunt-button').setAttribute('aria-pressed', String(hunt));
  $('hunt-button').textContent = hunt ? 'Desativar' : 'Ativar';
  $('buy-button').classList.toggle('hunt-active', hunt);
  $('buy-button').setAttribute('aria-label', hunt ? 'Bónus e Hunt · 4 opções · Hunt ativo' : 'Bónus e Hunt · 4 opções');
  $('auto-status').textContent = autoRunning ? `${autoRemaining} spins por iniciar${autoCancel ? ' · a parar' : ''}` : '';
}

function errorMessage(error) { $('error').textContent = error.message || String(error); $('error').hidden = false; }
function status(message) { $('status').textContent = message; }
function openDialog(id) { if (!$(id).open) $(id).showModal(); }
function notice(title, body, kicker = 'BÓNUS', max = false, totalUnits = null) {
  $('notice-title').textContent = title; $('notice-body').textContent = body; $('notice-kicker').textContent = kicker;
  $('notice-dialog').dataset.max = String(max);
  const intro = totalUnits === null && !max;
  $('notice-dialog').dataset.intro = String(intro);
  $('notice-dialog').querySelector('[data-close]').textContent = intro ? 'Clica para continuar' : 'Continuar';
  $('notice-dialog').dataset.mode = view.mode;
  $('notice-emblem').src = bonusAssets[view.mode] ?? bonusAssets.common;
  $('notice-total').hidden = totalUnits === null;
  return new Promise(resolve => { $('notice-dialog').addEventListener('close', resolve, { once: true }); openDialog('notice-dialog'); if(totalUnits!==null) countAmount($('notice-total'),0,totalUnits,money,fastForward?0:700*SPEEDS[speed]); });
}

async function pause(duration) {
  // Other panels pause presentation; the engine result is never re-sorted.
  while (document.querySelector('dialog[open]')) await new Promise(resolve => setTimeout(resolve, 40));
  let elapsed = 0;
  while (elapsed < duration * SPEEDS[speed] && !fastForward && !reducedMotion.matches) {
    await new Promise(resolve => setTimeout(resolve, 20)); elapsed += 20;
    while (document.querySelector('dialog[open]')) await new Promise(resolve => setTimeout(resolve, 40));
  }
}

let magicToast;
let pendingXP = 0;
let shownBoard = previewBoard();
async function present(event) {
  await pause(0);
  switch (event.type) {
    case 'spin-start':
      view.magicProgress = event.magicProgress; view.mode = event.mode; view.xp100 = event.xp100; view.level = event.magicLevel; view.remaining = event.remainingSpins;
      await animateBoard('exit', $('board'), { duration: fastForward ? 0 : 120 * SPEEDS[speed] });
      shownBoard = event.board; renderBoard(shownBoard); indicators();
      status(event.mode === 'base' ? 'A resolver o spin…' : `${names[event.mode]} · ${event.remainingSpins} spins após este.`);
      sound.spin(); await animateBoard('spin', $('board'), { duration: fastForward ? 0 : 900 * SPEEDS[speed] }); await pause(220); break;
    case 'hits':
      const previousPaid = view.paid100;
      const credits = hitCredits(event.hits,event.credited100,previousPaid,view.betUnits);
      for (const [index,hit] of event.hits.entries()) {
        const winning=new Set(hit.positions);
        for(const cell of $('board').querySelectorAll('.cell')) {
          cell.classList.toggle('hit',winning.has(Number(cell.dataset.position)));
        }
        view.paid100 += credits[index].amount100; indicators();
        sound.hit(prizeTier((Number(hit.rawPay100) || 0) / 100));
        await Promise.all([
          animateBoard('hit',$('board'),{duration:fastForward?0:700*SPEEDS[speed]}),
          showHitAmount(hit,$('board'),credits[index].receivedUnits,value=>number.format(value),fastForward?0:1000*SPEEDS[speed]),
        ]);
        $('board').querySelectorAll('.hit').forEach(cell=>cell.classList.add('hit-presented'));
      }
      view.paid100 = event.totalPaid100; indicators();
      // Every group has been presented; all winners now leave together on refill.
      document.querySelectorAll('#board .hit').forEach(cell=>cell.classList.remove('hit'));
      status(`Ganho ${money(creditedUnits(event.totalPaid100,view.betUnits)-creditedUnits(previousPaid,view.betUnits))}.`); break;
    case 'xp-gained':
      pendingXP = event.xp100;
      if (event.xp100 >= event.threshold100) { sound.magicReady(); flashXPBar($('xp-bar')); }
      break;
    case 'refill':
      if (view.mode !== 'base') { sound.xpFly(); await dissolveToXP($('board'),event.removed,$('xp-bar'),{duration:650*SPEEDS[speed],skip:()=>fastForward}); }
      view.xp100=pendingXP;indicators();
      await cascadeBoard($('board'), shownBoard, event.board, b => renderBoard(b), { removed:event.removed, duration:500 * SPEEDS[speed], skip:() => fastForward, removalAlreadyPresented:true });
      shownBoard = event.board; await pause(180); break;
    case 'magic':
      const beforeMagic = shownBoard;
      view.magicProgress = { requested: event.requested, multiplier: event.multiplier };
      view.xp100 = 0; view.level = event.level; view.remaining = event.remainingSpins; shownBoard = event.board;
      indicators();
      $('magic-upgrade').replaceChildren();
      const heading=document.createElement('strong');heading.textContent=`${event.placed} WILD${event.placed===1?'':'s'} no tabuleiro`;
      const detail=document.createElement('span');detail.textContent=`Multiplicador dos WILDs: ${event.multiplier || 1}×`;
      const vision=document.createElement('div');vision.className='magic-vision';vision.setAttribute('aria-hidden','true');
      const wild=document.createElement('div');wild.className='magic-wild-preview';
      const emblem=document.createElement('img');emblem.src='ui/art/wild-emblem.png';emblem.alt='';
      const quantity=document.createElement('b');quantity.textContent=String(event.placed);
      wild.append(emblem,quantity);
      const arrow=document.createElement('span');arrow.className='magic-arrow';arrow.textContent='\u2726';
      const factor=document.createElement('span');factor.className='magic-factor';factor.textContent=`${event.multiplier || 1}\u00d7`;
      vision.append(wild,arrow,factor);
      $('magic-upgrade').append(vision,heading,detail);
      const magicDuration=Math.max(650,2500*SPEEDS[speed]);
      $('magic-upgrade').style.setProperty('--magic-enter',`${350*SPEEDS[speed]}ms`);
      $('magic-upgrade').hidden=false;
      clearTimeout(magicToast);
      magicToast=setTimeout(()=>{$('magic-upgrade').hidden=true;},magicDuration);
      await pause(magicDuration/SPEEDS[speed]);
      clearTimeout(magicToast);
      $('magic-upgrade').hidden=true;
      renderBoard(shownBoard, [], event.positions);
      sound.magicCast();
      await castMagic($('board'), beforeMagic, event.board, { positions:event.positions, duration:850 * SPEEDS[speed], source:$('xp-bar'), skip:() => fastForward, onWild:() => sound.wildPlace() });

      status(`Magia: ${event.placed} wild${event.placed === 1 ? '' : 's'}${event.multiplier ? ` de ×${event.multiplier}` : ''}. Barra a zero.`);
      break;
    case 'spin-end': shownBoard = event.board; renderBoard(shownBoard); view.xp100 = event.xp100; indicators(); break;
    case 'bonus-start':
      sound.scatterConverge();
      await gatherScatters($('board'), event.mode, { duration:650 * SPEEDS[speed], skip:() => fastForward });
      sound.bonusTrigger();
      stopAuto(); view.mode = event.mode; view.remaining = event.spins; view.xp100 = 0; view.level = 0; indicators();
      try { sound.playMusic(event.mode); } catch { }
      try { sound.intro(event.mode); } catch { }
      await notice(names[event.mode], bonusDescription[event.mode], `${event.spins} SPINS GRÁTIS`); break;
    case 'retrigger':
      await gatherScatters($('board'), view.mode, {duration:400 * SPEEDS[speed],skip:() => fastForward});
      view.remaining = event.remainingSpins; indicators(); showRibbon(`+${event.added} spins`, 'retrigger'); pulse($('free-spins')); status(`+${event.added} spins! ${event.remainingSpins} por jogar.`); sound.retrigger(); await pause(450); break;
    case 'max-win':
      view.paid100 = event.totalPaid100; view.remaining = view.xp100 = 0; indicators(); stopAuto();
      sound.maxWin();
      await notice('MAX WIN', '10 000× a aposta. A jogada terminou.', 'PRÉMIO MÁXIMO', true, creditedUnits(event.totalPaid100, view.betUnits)); break;
    case 'round-end': view.paid100 = event.paid100; indicators(); if(!view.demo) countAmount($('balance'),session.balanceUnits-event.creditedUnits,session.balanceUnits,money,fastForward?0:400*SPEEDS[speed]); pulse($('balance')); if (view.paid100 > 0) await pause(450); break;
  }
}

function stopAuto() { autoCancel = true; autoRemaining = 0; controls(); }

async function runRound({ mode = hunt ? 'hunt' : 'base', demo = null } = {}) {
  if (running) return;
  const activeSession = demo ? new TestSession({ seed: 123456, balanceUnits: 100000000 }) : session;
  let started = false;
  $('error').hidden = true;
  try {
    const state = activeSession.start(mode, betUnits); started = true;
    running = true; fastForward = false;
    view = { mode: state.mode, xp100: 0, level: 0, remaining: state.mode === 'base' ? 0 : state.remainingSpins, paid100: 0, betUnits, demo: Boolean(demo) };
    indicators(); controls(); sound.unlock();
    if (state.mode === 'base' || state.mode === 'hunt') try { sound.playMusic(hunt ? 'hunt' : 'base'); } catch { }
    if (state.mode !== 'base' && !demo) {
      sound.purchase();
      await purchaseScatters($('board'),state.mode,symbolAssets.S,{duration:1150*SPEEDS[speed],skip:()=>fastForward});
      try { sound.playMusic(state.mode); } catch { }
      try { sound.intro(state.mode); } catch { }
      await notice(names[state.mode], bonusDescription[state.mode], `${state.remainingSpins} SPINS GRÁTIS`);
    }
    if (demo) status(`Demonstração local: ${demo.name}.`);
    let initial = true;
    while (activeSession.active) {
      const result = activeSession.advance(initial && demo ? { initialBoard: demo.board } : {});
      initial = false;
      for (const event of result.events) await present(event);
      await pause(220);
    }
    const final = activeSession.state;
    if (final.bonusType && !final.maxWin) {
      stopAuto();
      sound.bonusEnd();
      await notice('Bónus concluído', `${final.bonusSpinsPlayed} spins jogados, incluindo os adicionais.`, demo ? 'DEMONSTRAÇÃO' : 'RESULTADO', false, creditedUnits(final.paid100, view.betUnits));
      try { sound.playMusic(hunt ? 'hunt' : 'base'); } catch { }
    }
    status(demo ? `Demonstração terminada: ${demo.name}. O saldo não foi alterado.` : `Jogada terminada · prémio ${money(creditedUnits(final.paid100, view.betUnits))}.`);
  } catch (error) {
    stopAuto(); errorMessage(error);
    status(started && !activeSession.state ? 'Jogada interrompida. O saldo de teste foi reposto.' : 'Não foi possível iniciar ou apresentar a jogada.');
  } finally {
    running = false;
    view.mode = 'base'; view.xp100 = view.level = view.remaining = 0;
    indicators(); controls();
  }
}

function autoDetails() {
  const count = autoCount(Number($('auto-range').value));
  $('auto-count').innerHTML = `${count} <small>spins</small>`;
  $('auto-range').setAttribute('aria-valuetext', `${count} spins`);
  const cost = session.cost(hunt ? 'hunt' : 'base', betUnits);
  $('auto-start').disabled = session.balanceUnits < cost;
}

async function startAuto() {
  if (running || autoRunning) return;
  autoRemaining = autoCount(Number($('auto-range').value)); autoRunning = true; autoCancel = false;
  $('auto-dialog').close(); controls();
  try {
    while (autoRemaining > 0 && !autoCancel) {
      autoRemaining--; controls(); await runRound();
      if (!autoCancel && autoRemaining) await new Promise(resolve => setTimeout(resolve, 50));
    }
  } finally { autoRunning = false; autoRemaining = 0; controls(); }
}

function buyOptions() {
  $('buy-bet').textContent = money(betUnits);
  $('hunt-price').textContent = money(session.cost('hunt', betUnits));
  $('bonus-cards').replaceChildren();
  for (const mode of ['common', 'super', 'secret']) {
    const cost = session.cost(mode, betUnits);
    const article = document.createElement('article'); article.className = 'buy-option';
    article.dataset.mode = mode;
    article.innerHTML = `<h3>${names[mode]}</h3><img class="bonus-icon" src="${bonusAssets[mode]}" alt=""><p>${bonusDescription[mode]}</p><strong>${money(cost)}</strong>`;
    const button = document.createElement('button'); button.dataset.buy = mode;
    button.textContent = session.balanceUnits < cost ? 'Saldo insuficiente' : 'Comprar';
    button.disabled = session.balanceUnits < cost;
    button.addEventListener('click', () => { if (running || autoRunning) return; $('buy-dialog').close(); runRound({ mode }); });
    article.append(button); $('bonus-cards').append(article);
  }
}

function rulesContent() {
  const payoutRows = table => SYMBOLS.map((symbol, i) => `<tr><th scope="row">${symbolNames[symbol]}</th>${table[i].map(v => `<td>${compact.format(v / 100)}×</td>`).join('')}</tr>`).join('');
  const catalog = [...SYMBOLS].reverse().map(symbol => `<figure><img src="${symbolAssets[symbol]}" alt=""><figcaption>${symbolNames[symbol]}<small>${symbol.startsWith('P') ? 'Premium' : 'Normal'}</small></figcaption></figure>`).join('');
  $('rules-content').innerHTML = `<nav class="rules-tabs" aria-label="Secções das regras">${[['play','Jogar'],['magic','Magia'],['bonus','Bónus'],['symbols','Símbolos'],['pay','Pagamentos']].map(([key,label])=>`<button data-rule="${key}" aria-pressed="${key==='play'}">${label}</button>`).join('')}</nav>
  <section data-rule-panel="play"><h3>O jardim mágico da Sofia</h3><p>Junta pelo menos cinco símbolos iguais, ligados por cima, baixo ou pelos lados. As diagonais não contam.</p><div class="rule-story"><img src="${symbolAssets.P5}" alt="Princesa Sofia"><ol><li>Os grupos vencedores pagam e desaparecem.</li><li>Os símbolos caem e entram novos. Uma jogada pode ter várias cascatas.</li><li>Os grupos dão experiência. Enche a barra para a Sofia lançar wilds.</li></ol></div><p>Saldo, aposta e ganhos são créditos locais de teste. As demonstrações abaixo não alteram o saldo.</p></section>
  <section data-rule-panel="magic" hidden><h3>A magia branca da Sofia</h3><p><b>W</b> substitui os símbolos normais e premium a que está ligado. Pode ajudar vários grupos. Com multiplicador, o próprio W passa a mostrar o valor: 2×, 3×… Nos bónus, os multiplicadores dos wilds do grupo somam-se.</p><p>O XP é fixo por cluster: normais 3/5/7/9/11/13; premium 5/7/9/11/13/15. O escalão conta apenas os símbolos regulares; menos de cinco regulares ou apenas wilds dão zero XP. Limiares: normal ${DEFAULT_CONFIG.xpThreshold100.base/100}, comum ${DEFAULT_CONFIG.xpThreshold100.common/100}, super ${DEFAULT_CONFIG.xpThreshold100.super/100}, secret ${DEFAULT_CONFIG.xpThreshold100.secret/100} XP.</p><p>Ao encher, a magia acontece depois da queda e antes de avaliar novos grupos. A barra volta a zero, descartando o excesso. Nunca substitui scatters. No jogo normal coloca 1–3 wilds sem multiplicador; a barra reinicia no spin seguinte.</p><p>Nos bónus, XP e nível mantêm-se entre spins. O limite é ${DEFAULT_CONFIG.maxWilds} wilds. Cada wild existente conserva sempre o multiplicador com que foi criado. Wilds usados desaparecem; nenhum wild passa ao spin seguinte.</p></section>
  <section data-rule-panel="bonus" hidden><h3>As flores abrem os bónus</h3><p>Os scatters são contados apenas quando todas as cascatas terminam. Os três bónus começam com ${DEFAULT_CONFIG.bonusSpins} spins.</p><div class="rules-bonuses">${[['common','3 flores',`${DEFAULT_CONFIG.xpThreshold100.common / 100} XP: 2 W de 1×. Cada barra: +1 W e +1×, até 10 W.`],['super','4 flores',`${DEFAULT_CONFIG.xpThreshold100.super / 100} XP: 2 W de 2×. Depois: +1 W e +2× garantidos.`],['secret','5 flores',`${DEFAULT_CONFIG.xpThreshold100.secret / 100} XP: 2 W de 2×. Depois: +2 W; o multi alterna +2× e +3×, comecando em +2×.`]].map(([mode,flowers,text])=>`<article><img src="${bonusAssets[mode]}" alt=""><h3>${names[mode]}</h3><b>${flowers}</b><p>${text}</p></article>`).join('')}</div><p>Cada wild conserva sempre o seu multiplicador. A evolução da magia aplica-se apenas aos novos wilds; ao atingir o limite, continua a evoluir para as colocações seguintes. Dentro do bónus: 2 scatters dão +2 spins; 3 ou mais dão +4. A magia não acrescenta spins.</p><p><b>Bonus Hunt:</b> custa 4× a aposta e multiplica por ${DEFAULT_CONFIG.bonusHunt.scatterMultiplier} a chance de flores por posicao no spin de entrada e nas suas cascatas. Nos bonus, o reforco nao se aplica. O menu fica âmbar enquanto está ativo. Os prémios continuam calculados sobre a aposta base.</p></section>
  <section data-rule-panel="symbols" hidden><h3>Os tesouros do jardim</h3><p>Do mais valioso para o menos valioso. Sofia é o símbolo principal.</p><div class="symbol-catalog">${catalog}</div><p><img class="inline-scatter" src="${symbolAssets.S}" alt="Flor Scatter"> A flor Scatter abre bónus; W ajuda os grupos.</p></section>
  <section data-rule-panel="pay" hidden><h3>Tabela de pagamentos</h3><label for="payout-mode">Modo</label><select id="payout-mode"><option value="base">Jogo normal / Hunt</option><option value="common">${names.common}</option><option value="super">${names.super}</option><option value="secret">${names.secret}</option></select><p>Valores em × da aposta base, antes dos wilds multiplicadores. Ecrã só de wilds e scatters paga uma vez como Sofia / 18+.</p><div class="table-wrap"><table><thead><tr><th>Símbolo</th>${['5','6–7','8–10','11–14','15–17','18+'].map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${payoutRows(DEFAULT_CONFIG.pay100)}</tbody></table></div><p>MAX WIN: ${compact.format(DEFAULT_CONFIG.maxWin100/100)}× por jogada completa, incluindo bónus e retriggers. Ao atingir o teto, a jogada termina.</p></section>`;
  $('payout-mode').addEventListener('change',event=>{$('rules-content').querySelector('tbody').innerHTML=payoutRows(DEFAULT_CONFIG.pay100);});
  document.querySelectorAll('[data-rule]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-rule]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)));
    document.querySelectorAll('[data-rule-panel]').forEach(panel=>{panel.hidden=panel.dataset.rulePanel!==button.dataset.rule;});
  }));
}

BET_UNITS.forEach(value => { const option = document.createElement('option'); option.value = String(value); option.textContent = money(value); option.selected = value === betUnits; $('bet').append(option); });
$('bet').addEventListener('change', () => { if (running || autoRunning) return; betUnits = Number($('bet').value); controls(); indicators(); });
for (const [id, direction] of [['bet-minus', -1], ['bet-plus', 1], ['buy-bet-minus', -1], ['buy-bet-plus', 1]]) $(id).addEventListener('click', () => {
  if (running || autoRunning) return;
  const next = BET_UNITS[Math.max(0, Math.min(BET_UNITS.length - 1, BET_UNITS.indexOf(betUnits) + direction))];
  if (next === betUnits) return;
  sound.betStep();
  betUnits = next;
  $('bet').value = String(betUnits); controls(); indicators();
  if ($('buy-dialog').open) buyOptions();
});
$('spin').addEventListener('click', () => { sound.spinPress(); if (autoRunning) stopAuto(); else if (running) { fastForward = true; cancelBoardMotion($('board')); } else runRound(); });
$('hunt-button').addEventListener('click', () => { if (running || autoRunning) return; hunt = !hunt; if (hunt) sound.huntOn(); else sound.huntOff(); controls(); indicators(); $('buy-dialog').close(); status(hunt ? 'Bonus Hunt ativado. O spin custa 4× a aposta base.' : 'Jogo normal ativado.'); });
$('rules-button').addEventListener('click', () => { sound.dialogOpen(); openDialog('rules-dialog'); });
$('buy-button').addEventListener('click', () => { if (running || autoRunning) return; sound.dialogOpen(); buyOptions(); openDialog('buy-dialog'); });
function positionAutoDialog() {
  const dialog = $('auto-dialog');
  if (!dialog.open) return;
  const anchor = $('auto-button').getBoundingClientRect();
  const width = dialog.offsetWidth, height = dialog.offsetHeight;
  dialog.style.left = `${Math.max(8, Math.min(innerWidth - width - 8, anchor.x + anchor.width / 2 - width / 2))}px`;
  dialog.style.top = `${Math.max(8, anchor.top - height - 8)}px`;
}
$('auto-button').addEventListener('click', () => { if (autoRunning) { sound.autoStop(); stopAuto(); } else if (!running) { sound.dialogOpen(); autoDetails(); openDialog('auto-dialog'); positionAutoDialog(); } });
addEventListener('resize', positionAutoDialog);
document.addEventListener('fullscreenchange', positionAutoDialog);
$('auto-dialog').addEventListener('click', event => {
  const rect = $('auto-dialog').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('auto-dialog').close();
});
$('auto-range').addEventListener('input', autoDetails);
$('auto-start').addEventListener('click', () => { sound.autoStart(); startAuto(); });
$('speed-button').addEventListener('click', () => {
  sound.speed();
  cancelBoardMotion($('board'));
  const order = ['normal', 'fast', 'ultra'];
  const labels = { normal: 'Normal', fast: 'Rápido', ultra: 'Ultra' };
  const index = (order.indexOf(speed) + 1) % order.length;
  speed = order[index];
  $('speed-button').dataset.speed = speed;
  $('speed-label').textContent = labels[speed];
  $('speed-button').setAttribute('aria-label', `Velocidade: ${labels[speed]}. Mudar para ${labels[order[(index + 1) % order.length]]}.`);
  document.querySelectorAll('.speed-stars > span').forEach((star, i) => star.classList.toggle('active', i <= index));
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => { sound.dialogClose(); button.closest('dialog').close(); }));
document.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
  if (!dialog) return;
  const items = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')].filter(el => el.checkVisibility());
  const first = items[0], last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => { if (running || autoRunning) return; const demo = demoScenario(button.dataset.demo); button.closest('dialog')?.close(); runRound({ mode: demo.mode, demo }); }));
$('volume').addEventListener('input', () => {
  sound.volume = Number($('volume').value) / 100;
  sound.applyVolume();
  if (sound.volume) sound.lastVolume = sound.volume;
  $('volume-value').textContent = `${$('volume').value}%`;
  $('mute-button').setAttribute('aria-pressed', String(sound.volume === 0));
  $('mute-button').setAttribute('aria-label', sound.volume ? 'Desativar som' : 'Ativar som');
});
$('mute-button').addEventListener('click', () => { $('volume').value = String(sound.volume ? 0 : sound.lastVolume * 100); $('volume').dispatchEvent(new Event('input')); });
document.addEventListener('keydown', event => { if (event.code === 'Space' && !event.repeat && event.target === document.body && !document.querySelector('dialog[open]')) { event.preventDefault(); $('spin').click(); } });

// A musica so pode comecar apos interacao do utilizador (politica dos browsers).
// No primeiro clique/toque em qualquer lado, desbloqueia o audio e inicia o tema.
const startMusicOnGesture = () => {
  sound.unlock();
  if (!sound.music && !running) try { sound.playMusic(hunt ? 'hunt' : 'base'); } catch { }
  document.removeEventListener('pointerdown', startMusicOnGesture);
  document.removeEventListener('keydown', startMusicOnGesture);
};
document.addEventListener('pointerdown', startMusicOnGesture);
document.addEventListener('keydown', startMusicOnGesture);

rulesContent(); renderBoard(shownBoard); indicators(); controls();
status('A preparar a magia…');
Promise.all(artAssets.map(src => {
  const image = new Image(); image.src = src; return image.decode();
})).then(async () => {
  await enterScene();
  await animateBoard('spin', $('board'), { duration: 300 });
  artReady = true; controls(); status('Pronto.');
}).catch(() => errorMessage(new Error('Não foi possível carregar a arte. Recarrega o jogo para tentar novamente.')));
observeMotionVisibility(document.body);
const pauseScene = () => document.body.classList.toggle('scene-hidden', document.hidden);
document.addEventListener('visibilitychange', pauseScene); pauseScene();

const expandButton = $('expand-button');
expandButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { status('O navegador não permitiu abrir em ecrã inteiro.'); }
});
document.addEventListener('fullscreenchange', () => {
  const expanded = Boolean(document.fullscreenElement);
  expandButton.setAttribute('aria-pressed', String(expanded));
  expandButton.setAttribute('aria-label', expanded ? 'Sair do ecrã inteiro' : 'Expandir para ecrã inteiro');
  expandButton.title = expanded ? 'Reduzir' : 'Expandir';
  expandButton.textContent = expanded ? '\u2715' : '\u26f6';
  expandButton.focus({ preventScroll: true });
});

installLayout();
installPresentation();
