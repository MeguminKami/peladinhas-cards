import { DEFAULT_CONFIG, SYMBOLS } from '../src/index.js';
import { TestSession, HostSession, hostWalletOrigin, BET_UNITS, SPEEDS, autoCount } from './session.js';
import { previewBoard, demoScenario } from './fixtures.js';
import { symbolNames, symbolAssets, artAssets, bonusAssets, bonusNames } from './symbols.js';
import { animateBoard, cancelBoardMotion, observeMotionVisibility, cascadeBoard, gatherScatters, castMagic, purchaseScatters, dissolveToXP, revealSpin } from './motion.js';
import { installLayout } from './layout.js';
import { installPresentation, enterScene, showHitAmount, pulse, countAmount, showRibbon, flashXPBar, finishCounts } from './presentation.js';
import { setRate, currentRate, wait as clockWait, flushWaits, createTempo } from './tempo.js';
import { installPerfPanel } from './perf.js';
import { hitCredits, prizeTier } from './payout-presentation.js';
import { buildSfxBus, sfxProfile } from './audio-bus.js';

const $ = id => document.getElementById(id);
const names = bonusNames;
const bonusDescription = { common:'A magia coloca mais WILDs e aumenta o multiplicador em +1.', super:'A magia coloca mais WILDs e aumenta o multiplicador em +2.', secret:'A magia coloca mais 2 WILDs e aumenta o multiplicador em +2 e +3, alternadamente.' };
const number = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
const money = units => `${number.format(units / 100)} DJC`;
const creditedUnits = (paid100, bet) => Number(BigInt(paid100) * BigInt(bet) / 100n);
const seed = crypto.getRandomValues(new Uint32Array(1))[0];
// No casino o saldo vem da carteira do site (?wallet=host); fora dele, créditos locais de teste.
const hostOrigin = hostWalletOrigin();
const session = hostOrigin ? new HostSession({ origin: hostOrigin }) : new TestSession({ seed });
let heldBalance = null, walletReady = !hostOrigin;
let running = false, autoRunning = false, autoCancel = false, autoRemaining = 0;
let artReady = false;
let hunt = false, speed = 'normal', fastForward = false, betUnits = 100;
let view = { mode: 'base', xp100: 0, level: 0, remaining: 0, paid100: 0, betUnits: 100, demo: false };
// ---- Ritmo (ver ui/tempo.js) ----
// Politica de ritmo. Mercados que o exigem (ex.: Reino Unido, RTS 14 da Gambling Commission) pedem
// MIN_CYCLE_MS = 2500 e TURBO_ALLOWED = false (sem turbo, sem acelerar a apresentacao por toque).
const MIN_CYCLE_MS = 0, TURBO_ALLOWED = true, HOLD_TO_SPIN = true;
const tempo = createTempo();
let turboRound = false;      // turbo automatico ligado nesta jogada (toques rapidos ou espaco premido)
let boost = 1, slams = 0;    // aceleracao suave pedida com toques durante o spin atual
let bufferedSpin = false;    // toque recebido no fim de uma jogada: a seguinte arranca logo
let preExit = null;          // saida dos simbolos ja iniciada no toque, enquanto o pedido segue para o servidor
let lastCycleStart = -Infinity;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const sound = {
  musicVolume: .35, sfxVolume: .35, muted: false, context: null,
  get volume() { return this.muted ? 0 : Math.max(this.musicVolume, this.sfxVolume); },
  music: null, musicMode: null, musicGain: null, duckUntil: 0,
  buffers: new Map(), pending: new Map(),
  unlock() {
    try {
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        // musica: musicGain (duck) -> musicLevel (barra Musica) -> master
        this.musicLevel = this.context.createGain(); this.musicLevel.connect(this.master);
        this.musicGain = this.context.createGain();
        this.musicGain.connect(this.musicLevel);
        // efeitos: ... -> sfxLevel (barra Efeitos) -> master
        this.sfxLevel = this.context.createGain(); this.sfxLevel.connect(this.master);
        this.sfxGain = this.context.createGain();
        this.buildSfxBus();
        this.applyVolume();
        setTimeout(() => { this.loadManifest().then(() => this.preloadSfx()); this.preloadMusic('base'); this.preloadMusic('hunt'); }, 0);
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Audio is optional; a blocked sound must not block a round. */ }
  },
  applyVolume() {
    if (!this.master) return;
    const now = this.context.currentTime, set = (param, v) => { try { param.setTargetAtTime(v, now, 0.03); } catch { param.value = v; } };
    set(this.master.gain, this.muted ? 0 : 1);
    // curva quadratica: a barra soa mais natural ao ouvido do que um ganho linear
    set(this.musicLevel.gain, this.musicVolume ** 2 * 2.2);
    set(this.sfxLevel.gain, this.sfxVolume ** 2 * 2.2);
  },
  async load(name) {
    if (this.buffers.has(name)) return this.buffers.get(name);
    if (this.pending.has(name)) return this.pending.get(name);
    const promise = (async () => {
      try {
        const res = await fetch(`ui/audio/sfx/${name}.mp3`);
        if (!res.ok) { this.buffers.set(name, null); return null; }
        const buf = await this.context.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(name, buf);
        return buf;
      } catch { return null; } finally { this.pending.delete(name); }
    })();
    this.pending.set(name, promise);
    return promise;
  },
  // ---- Efeitos: "salao encantado" partilhado (ui/audio-bus.js, tambem usado na pagina de teste) ----
  buildSfxBus() { this.reverbSend = buildSfxBus(this.context, this.sfxGain, this.sfxLevel); },
  sfxProfile(name) { return sfxProfile(name, this.variants.normalized); },
  // ui/audio/sfx/manifest.json (opcional): { "variants": { "hit-small": 3 }, "normalized": ["hit-small"] }
  // variants: usa hit-small, hit-small-2, hit-small-3 ao acaso; normalized: ficheiros ja com o volume final.
  variants: { normalized: [] }, manifest: { variants: {} },
  async loadManifest() {
    try { const r = await fetch('ui/audio/sfx/manifest.json'); if (r.ok) { const m = await r.json(); this.manifest = { variants: m.variants || {} }; this.variants.normalized = m.normalized || []; } } catch { }
  },
  // Todos os efeitos ficam descodificados logo no inicio: o primeiro toque de cada som nao chega atrasado.
  preloadSfx() {
    const names = ['reel-land', 'scatter-land', 'scatter-anticipation', 'hit-small', 'hit-medium', 'hit-large', 'hit-epic', 'wild-place', 'xp-fly',
      'magic-ready', 'magic-cast', 'scatter-converge', 'bonus-trigger', 'retrigger', 'purchase-flowers', 'bonus-end', 'max-win', 'intro-common', 'intro-super', 'intro-secret',
      'ui-click', 'ui-spin-press', 'ui-bet-step', 'ui-dialog-open', 'ui-dialog-close', 'ui-hunt-on', 'ui-hunt-off', 'ui-speed', 'ui-auto-start', 'ui-auto-stop'];
    for (const name of names) try { this.load(this.pickVariant(name)); } catch { }
  },
  pickVariant(name) {
    const n = Number(this.manifest.variants[name]) || 1;
    if (n < 2) return name;
    let i = Math.floor(Math.random() * n);
    if (n > 2 && i === this._lastVariant?.[name]) i = (i + 1) % n; // evita repetir a mesma seguida
    (this._lastVariant ||= {})[name] = i;
    return i ? `${name}-${i + 1}` : name;
  },
  // ---- Ordem no meio do barulho ----
  // pri: prioridade (os grandes momentos baixam os pequenos); gap: intervalo minimo entre repeticoes do mesmo som (ms).
  sfxRules: {
    'reel-land': { pri: 1, gap: 70 }, 'xp-fly': { pri: 1, gap: 280 },
    'hit-small': { pri: 2, gap: 140 }, 'wild-place': { pri: 2, gap: 90 },
    'hit-medium': { pri: 3, gap: 160 }, 'scatter-land': { pri: 3, gap: 60 }, 'scatter-anticipation': { pri: 3, gap: 450 },
    'hit-large': { pri: 4, gap: 220 }, 'magic-ready': { pri: 4, gap: 500 },
    'hit-epic': { pri: 5, gap: 300 }, 'magic-cast': { pri: 5, gap: 500 },
    'scatter-converge': { pri: 6, gap: 500 }, 'bonus-trigger': { pri: 6, gap: 500 }, 'retrigger': { pri: 6, gap: 500 }, 'purchase-flowers': { pri: 6, gap: 500 },
    'intro-common': { pri: 6 }, 'intro-super': { pri: 6 }, 'intro-secret': { pri: 6 }, 'bonus-end': { pri: 6 }, 'max-win': { pri: 7 },
  },
  MAX_VOICES: 6, voices: [], lastPlayed: {}, quietUntil: 0,
  admit(name) {
    const rule = this.sfxRules[name] ?? { pri: name.startsWith('ui-') ? 2 : 3, gap: 0 };
    const now = performance.now();
    if (rule.gap && now - (this.lastPlayed[name] ?? -1e9) < rule.gap) return null;   // repeticao demasiado junta
    if (rule.pri <= 1 && now < this.quietUntil) return null;                          // um grande momento esta a soar
    this.voices = this.voices.filter(v => !v.ended);
    if (rule.pri >= 5) {                                                              // grande momento: os pequenos saem de cena
      this.quietUntil = now + 700;
      for (const v of this.voices) if (v.pri <= 2) this.fadeVoice(v);
    }
    if (this.voices.length >= this.MAX_VOICES) {
      const weakest = this.voices.reduce((a, b) => (b.pri < a.pri ? b : a));
      if (weakest.pri >= rule.pri) return null;
      this.fadeVoice(weakest);
    }
    this.lastPlayed[name] = now;
    return rule;
  },
  fadeVoice(v) {
    v.ended = true;
    try { const t = this.context.currentTime; this.hold(v.gain.gain, t); v.gain.gain.linearRampToValueAtTime(0.0001, t + 0.06); v.src.stop(t + 0.08); } catch { }
  },
  async play(name, { volume = 1, loop = false, semitones = 0 } = {}) {
    if (!this.context || this.muted || !this.sfxVolume) return null;
    const rule = this.admit(name);
    if (!rule) return null;
    try {
      const file = this.pickVariant(name);
      const buf = await this.load(file);
      if (!buf) return null;
      const prof = this.sfxProfile(name);
      const src = this.context.createBufferSource();
      src.buffer = buf; src.loop = loop;
      const cents = semitones * 100 + (prof.cents ? (Math.random() * 2 - 1) * prof.cents : 0);
      if (cents) src.playbackRate.value = Math.pow(2, cents / 1200);
      const gain = this.context.createGain();
      gain.gain.value = volume * prof.vol * (1 + (Math.random() * 2 - 1) * prof.jitter);
      src.connect(gain); gain.connect(this.sfxGain);
      if (this.reverbSend && prof.verb) {
        const send = this.context.createGain(); send.gain.value = prof.verb;
        gain.connect(send); send.connect(this.reverbSend);
      }
      src.start();
      const voice = { src, gain, pri: rule.pri, ended: false };
      src.addEventListener('ended', () => { voice.ended = true; });
      this.voices.push(voice);
      return { src, gain };
    } catch { return null; }
  },
  // ---- Musica: cache de buffers, crossfade de potencia constante e "dissolucao" por filtro ----
  musicFiles: { base: 'theme-base', hunt: 'theme-hunt', common: 'theme-bonus-common', super: 'theme-bonus-super', secret: 'theme-bonus-secret' },
  musicBuffers: new Map(), musicLoading: new Map(), musicToken: 0, musicFading: [],
  loadMusic(mode) {
    const file = this.musicFiles[mode];
    if (!file || !this.context) return Promise.resolve(null);
    if (this.musicBuffers.has(mode)) return Promise.resolve(this.musicBuffers.get(mode));
    if (this.musicLoading.has(mode)) return this.musicLoading.get(mode);
    const promise = (async () => {
      try {
        const res = await fetch(`ui/audio/music/${file}.opus`);
        if (!res.ok) return null;
        const buf = await this.context.decodeAudioData(await res.arrayBuffer());
        this.musicBuffers.set(mode, buf);
        return buf;
      } catch { return null; } finally { this.musicLoading.delete(mode); }
    })();
    this.musicLoading.set(mode, promise);
    return promise;
  },
  // Antecipa a descodificacao (ex.: tema do bonus enquanto os scatters convergem).
  preloadMusic(mode) { try { this.loadMusic(mode); } catch { } },
  // Mantem em memoria apenas base, hunt e o tema atual (cada tema descodificado ocupa 20-35 MB).
  trimMusicCache() {
    for (const mode of this.musicBuffers.keys()) if (!['base', 'hunt', this.musicMode].includes(mode)) this.musicBuffers.delete(mode);
  },
  musicTarget(mode) { return mode === 'super' ? 0.55 * 0.9 : 0.55; }, // Super 10% mais baixo
  // Congela o valor atual de um parametro antes de agendar uma nova rampa (seguro mesmo a meio de outra).
  hold(param, at) {
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(at);
    else { const v = param.value; param.cancelScheduledValues(at); param.setValueAtTime(v, at); }
  },
  // Curva de potencia constante aproximada por rampas lineares curtas (sem conflitos de automacao).
  equalPower(param, from, to, at, seconds) {
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const x = i / steps;
      const v = to > from ? from + (to - from) * Math.sin(x * Math.PI / 2) : to + (from - to) * Math.cos(x * Math.PI / 2);
      param.linearRampToValueAtTime(Math.max(0.0001, v), at + seconds * x);
    }
  },
  // Primeiro passo da transicao: a faixa que sai perde brilho (filtro passa-baixo) e baixa,
  // como se se afastasse num sonho, enquanto a seguinte carrega.
  dimMusic(track, seconds = 0.9) {
    if (!track) return;
    try {
      const now = this.context.currentTime;
      const g = track.gain.gain, f = track.filter.frequency;
      this.hold(g, now); g.linearRampToValueAtTime(track.target * 0.45, now + seconds);
      this.hold(f, now); f.exponentialRampToValueAtTime(1100, now + seconds);
      track.dimmed = true;
    } catch { }
  },
  fadeOutTrack(track, seconds) {
    if (!track) return;
    try {
      const now = this.context.currentTime;
      const g = track.gain.gain, f = track.filter.frequency;
      this.hold(g, now); this.equalPower(g, Math.max(0.0001, g.value), 0.0001, now, seconds);
      this.hold(f, now); f.exponentialRampToValueAtTime(350, now + seconds);
      track.src.stop(now + seconds + 0.05);
    } catch { try { track.src.stop(); } catch { } }
  },
  async playMusic(mode, { fade = 2.2 } = {}) {
    if (!this.context || this.musicMode === mode) return;
    this.musicMode = mode;
    const token = ++this.musicToken;
    if (!this.musicFiles[mode]) { this.stopMusic(); return; }
    const outgoing = this.music;
    if (outgoing && !this.musicBuffers.has(mode)) this.dimMusic(outgoing);
    const buf = await this.loadMusic(mode);
    if (token !== this.musicToken || !buf) return; // o modo mudou entretanto
    try {
      const now = this.context.currentTime;
      const src = this.context.createBufferSource();
      src.buffer = buf; src.loop = true;
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass'; filter.Q.value = 0.5;
      const gain = this.context.createGain();
      const target = this.musicTarget(mode);
      const fadeIn = outgoing ? fade : 1.2;
      // A faixa que entra "abre" de abafada para cristalina enquanto sobe.
      filter.frequency.setValueAtTime(outgoing ? 1400 : 20000, now);
      if (outgoing) filter.frequency.exponentialRampToValueAtTime(20000, now + fadeIn * 1.15);
      gain.gain.setValueAtTime(0.0001, now);
      this.equalPower(gain.gain, 0.0001, target, now, fadeIn);
      src.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
      src.start(now);
      this.fadeOutTrack(outgoing, fade);
      this.music = { src, gain, filter, target, mode };
      this.trimMusicCache();
    } catch { /* musica falhou; o jogo continua em silencio */ }
  },
  stopMusic(fade = 0.8) {
    if (!this.music) return;
    this.fadeOutTrack(this.music, fade);
    this.music = null;
  },
  // O duck atua no barramento da musica, separado dos crossfades de cada faixa.
  duck(seconds = 2) {
    if (!this.musicGain || !this.context) return;
    try {
      const now = this.context.currentTime, g = this.musicGain.gain;
      this.hold(g, now);
      g.linearRampToValueAtTime(0.4, now + 0.25);
      g.setValueAtTime(0.4, now + Math.max(0.3, seconds - 0.8));
      g.linearRampToValueAtTime(1, now + seconds);
    } catch { }
  },
  // Atalhos semanticos — todos defensivos: nunca lancam excecao
  // Sem whoosh no arranque: o som acompanha as colunas a pousar (marimba suave, uma nota por coluna,
  // a subir na escala pentatonica). Nas colunas de suspense, cada simbolo da um toque mais agudo e leve.
  spin() { },
  columnLand(column) { try { this.play('reel-land', { semitones: [0, 2, 4, 7, 9, 12][column] ?? 12, volume: 0.9 }); } catch { } },
  suspenseTick(index, level) { try { this.play('reel-land', { semitones: 12 + [0, 2, 4, 7, 9][index] + (level - 1) * 2, volume: 0.45 + 0.1 * level }); } catch { } },
  refillLand() { try { this.play('reel-land', { semitones: 7, volume: 0.6 }); } catch { } },
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
  // Multiplicador no calculo do ganho: brilho cristalino do WILD, um pouco mais agudo.
  calcMultiplier() { try { this.play('wild-place', { semitones: 7, volume: 0.9 }); } catch { } },
  xpFly() { try { this.play('xp-fly', { volume: 0.7 }); } catch { } },
  magicReady() { try { this.play('magic-ready'); } catch { } },
  magicCast() { this._wildStep = 0; try { this.play('magic-cast'); this.duck(2.2); } catch { } },
  // Cada WILD de uma magia sobe um degrau numa escala pentatonica: soa a melodia, nao a repeticao.
  wildPlace() { try { const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]; this.play('wild-place', { volume: 0.8, semitones: steps[(this._wildStep = (this._wildStep || 0) + 1) - 1] ?? 21 }); } catch { } },
  // Cada Scatter que aterra soa um degrau acima do anterior (1.o, 2.o, 3.o...).
  scatterLand(n = 1) { try { this.play('scatter-land', { semitones: [0, 2, 4, 7, 9][n - 1] ?? 9 }); } catch { } },
  // Suspense: subida de tensao por nivel; a musica baixa um pouco ate ao fim da revelacao.
  suspense(level) {
    try {
      this.play('scatter-anticipation', { semitones: [0, 3, 7][level - 1] ?? 7, volume: 0.8 + 0.1 * level });
      if (this.musicGain && this.context) { const g = this.musicGain.gain, now = this.context.currentTime; this.hold(g, now); g.linearRampToValueAtTime(1 - 0.18 * level, now + 0.4); this._suspended = true; }
    } catch { }
  },
  endSuspense() {
    if (!this._suspended || !this.musicGain) return;
    this._suspended = false;
    try { const g = this.musicGain.gain, now = this.context.currentTime; this.hold(g, now); g.linearRampToValueAtTime(1, now + 0.8); } catch { }
  },
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

// Rapido dentro dos bonus: um pouco mais lento do que no jogo base (0,42 em vez de 0,32),
// para se acompanhar a magia, os WILDs e os multiplicadores. Normal e Ultra nao mudam.
const BONUS_FAST = 0.42;
// Suspense de Scatters, igual no spin e nas cascatas.
// Jogo normal/Hunt (bonus com 3, 4, 5 flores): 2/3/4 flores visiveis e hipotese de mais uma -> niveis 1/2/3.
// Free spins (retrigger com 2 ou 3 flores, maximo 3): 1 flor -> nivel 1 (a espera de +2 spins); 2 -> nivel 2 (+4).
function scatterSuspense(mode) {
  return mode === 'base' ? { levels: { 2: 1, 3: 2, 4: 3 }, maxScatters: 5 } : { levels: { 1: 1, 2: 2 }, maxScatters: 3 };
}
function effectiveSpeed() { return TURBO_ALLOWED && turboRound ? 'ultra' : speed; }
function speedFactor() {
  const chosen = effectiveSpeed();
  return chosen === 'fast' && ['common', 'super', 'secret'].includes(view.mode) ? BONUS_FAST : SPEEDS[chosen];
}
// Ultra (escolhido ou automatico) tem coreografia propria: colunas juntas, ganhos em simultaneo.
function ultraChoreo() { return effectiveSpeed() === 'ultra'; }
// Todas as duracoes do codigo estao em ms da velocidade Normal; o relogio aplica a velocidade.
function applyRate(rampMs = 140) {
  setRate(boost / speedFactor(), { rampMs });
  updateTurboBadge();
}
let turboBadgeTimer = 0;
function updateTurboBadge() {
  const on = TURBO_ALLOWED && speed !== 'ultra' && (turboRound || tempo.turbo);
  document.body.dataset.turbo = String(on);
  const label = $('speed-label'), text = on ? 'Turbo' : ({ normal: 'Normal', fast: 'Rápido', ultra: 'Ultra' })[speed];
  if (label && label.textContent !== text) label.textContent = text;
  clearTimeout(turboBadgeTimer);
  if (on && !running) turboBadgeTimer = setTimeout(updateTurboBadge, 400); // apaga-se sozinho quando o turbo expira
}

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
      // Emblema, multiplicador e "WILD" num unico invólucro: as animacoes (saida, hits, cascatas)
      // movem-nos juntos, sem o numero ficar para tras.
      const wrap=document.createElement('span');wrap.className='symbol-art wild-art';
      const emblem=document.createElement('img');emblem.className='wild-emblem';emblem.src='ui/art/wild-emblem.webp';emblem.alt='';emblem.draggable=false;
      const identity=document.createElement('span');identity.className='wild-identity';identity.textContent='WILD';
      wrap.append(emblem,label,identity);element.append(wrap);
    }
    element.setAttribute('aria-label', `Linha ${Math.floor(position / 6) + 1}, coluna ${position % 6 + 1}: ${symbolNames[symbol]}${multiplier ? ` ×${multiplier}` : ''}`);
    if (symbol !== 'W') {
      const art = document.createElement('img'); art.className = 'symbol-art'; art.alt = ''; art.draggable = false;
      art.src = symbolAssets[symbol];
      label.classList.add('sr-only');
      element.append(art);
      element.append(label);
    }
    fragment.append(element);
  });
  $('board').replaceChildren(fragment);
  $('board').classList.remove('cleared');
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
  const locked = running || autoRunning || !artReady || !walletReady;
  $('spin').disabled = !artReady || !walletReady;
  for (const id of ['bet', 'buy-button', 'hunt-button']) $(id).disabled = locked;
  $('bet-minus').disabled = locked || BET_UNITS.indexOf(betUnits) === 0;
  $('bet-plus').disabled = locked || BET_UNITS.indexOf(betUnits) === BET_UNITS.length - 1;
  $('buy-bet-minus').disabled = $('bet-minus').disabled;
  $('buy-bet-plus').disabled = $('bet-plus').disabled;
  $('auto-button').disabled = !artReady || !walletReady || (running && !autoRunning);
  $('auto-button').textContent = autoRunning ? 'Parar auto' : 'Autoplay';
  $('spin-label').textContent = autoRunning ? 'Parar auto' : running ? 'Acelerar' : 'Rodar';
  $('spin-cost').textContent = running ? '' : money(session.cost(hunt ? 'hunt' : 'base', betUnits));
  $('balance').textContent = money(heldBalance ?? session.balanceUnits);
  if (session.host) document.documentElement.dataset.casinoBalance = String(heldBalance ?? session.balanceUnits);
  $('hunt-button').setAttribute('aria-pressed', String(hunt));
  const huntLabel = hunt ? 'Desativar' : 'Ativar';
  if ($('hunt-button').textContent !== huntLabel) $('hunt-button').textContent = huntLabel;
  $('buy-button').classList.toggle('hunt-active', hunt);
  $('buy-button').setAttribute('aria-label', hunt ? 'Bónus e Hunt · 4 opções · Hunt ativo' : 'Bónus e Hunt · 4 opções');
  $('auto-status').textContent = autoRunning ? `${autoRemaining} spins por iniciar${autoCancel ? ' · a parar' : ''}` : '';
}

function errorMessage(error) { $('error').textContent = error.message || String(error); $('error').hidden = false; }
function status(message) { $('status').textContent = message; }
function openDialog(id) { if (!$(id).open) $(id).showModal(); }
function notice(title, body, kicker = 'BÓNUS', max = false, totalUnits = null) {
  bufferedSpin = false; // um aviso pede um toque proprio; nao arrancar outra jogada por tras dele
  $('notice-title').textContent = title; $('notice-body').textContent = body; $('notice-kicker').textContent = kicker;
  $('notice-dialog').dataset.max = String(max);
  const intro = totalUnits === null && !max;
  $('notice-dialog').dataset.intro = String(intro);
  $('notice-dialog').querySelector('[data-close]').textContent = intro ? 'Clica para continuar' : 'Continuar';
  $('notice-dialog').dataset.mode = view.mode;
  $('notice-emblem').src = bonusAssets[view.mode] ?? bonusAssets.common;
  $('notice-total').hidden = totalUnits === null;
  return new Promise(resolve => { $('notice-dialog').addEventListener('close', resolve, { once: true }); openDialog('notice-dialog'); if(totalUnits!==null) countAmount($('notice-total'),0,totalUnits,money,fastForward?0:700); });
}

const dialogsClosed = async () => { while (document.querySelector('dialog[open]')) await new Promise(resolve => setTimeout(resolve, 40)); };
async function pause(duration) {
  // Other panels pause presentation; the engine result is never re-sorted.
  // duration em ms da velocidade Normal: o relogio (tempo.js) aplica a velocidade atual.
  await dialogsClosed();
  let elapsed = 0;
  while (elapsed < duration && !fastForward && !reducedMotion.matches) {
    const chunk = Math.min(80, duration - elapsed);
    await clockWait(chunk, () => fastForward); elapsed += chunk;
    await dialogsClosed();
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
      // Novo spin: velocidade de base para este spin (a aceleracao por toque vale so para um spin).
      boost = 1; slams = 0; fastForward = false; applyRate(0);
      if (preExit) { await preExit; preExit = null; }
      else await animateBoard('exit', $('board'), { duration: fastForward ? 0 : 120 });
      shownBoard = event.board; renderBoard(shownBoard); indicators();
      status(event.mode === 'base' ? 'A resolver o spin…' : `${names[event.mode]} · ${event.remainingSpins} spins após este.`);
      sound.spin();
      // Suspense de Scatters (regras em scatterSuspense): tambem se aplica as cascatas.
      await revealSpin($('board'), { duration: fastForward ? 0 : 900, skip: () => fastForward, together: ultraChoreo(),
        ...scatterSuspense(event.mode),
        onScatter: n => sound.scatterLand(n), onSuspense: level => sound.suspense(level),
        onColumn: c => sound.columnLand(c), onSuspenseCell: (i, l) => sound.suspenseTick(i, l) });
      sound.endSuspense(); await pause(220); break;
    case 'hits':
      const previousPaid = view.paid100;
      const credits = hitCredits(event.hits,event.credited100,previousPaid,view.betUnits);
      if (ultraChoreo() && event.hits.length > 1) {
        // Ultra/turbo: todos os grupos brilham e mostram o seu valor ao mesmo tempo.
        const winning = new Set(event.hits.flatMap(hit => hit.positions));
        for (const cell of $('board').querySelectorAll('.cell')) cell.classList.toggle('hit', winning.has(Number(cell.dataset.position)));
        view.paid100 += credits.reduce((sum, credit) => sum + credit.amount100, 0); indicators();
        const tiers = ['small', 'medium', 'large', 'epic', 'mega', 'huge', 'colossal'];
        const best = event.hits.map(hit => prizeTier((Number(hit.rawPay100) || 0) / 100)).sort((a, b) => tiers.indexOf(b) - tiers.indexOf(a))[0];
        sound.hit(best);
        $('group-prizes').replaceChildren();
        await Promise.all([
          animateBoard('hit', $('board'), { duration: fastForward ? 0 : 700 }),
          ...event.hits.map((hit, index) => showHitAmount(hit, $('board'), credits[index].receivedUnits, value => number.format(value), fastForward ? 0 : 650, {
            betUnits: view.betUnits, beat: fastForward ? 0 : 360, skip: () => fastForward, keep: true,
            onBeat: index ? undefined : step => { if (step === 'multiplier') sound.calcMultiplier(); },
          })),
        ]);
        $('board').querySelectorAll('.hit').forEach(cell => cell.classList.add('hit-presented'));
      } else for (const [index,hit] of event.hits.entries()) {
        const winning=new Set(hit.positions);
        for(const cell of $('board').querySelectorAll('.cell')) {
          cell.classList.toggle('hit',winning.has(Number(cell.dataset.position)));
        }
        view.paid100 += credits[index].amount100; indicators();
        // Com WILD multiplicador: o calculo aparece por etapas (ganho do cluster -> x N -> resultado),
        // ao ritmo da velocidade de jogo; o proximo hit so comeca quando este acabar.
        const multiplied = BigInt(hit.multiplier ?? 1) > 1n;
        const rawMultiple = (Number(hit.rawPay100) || 0) / 100;
        const beat = fastForward ? 0 : 360; // +50% de tempo no ecra; sem minimos fixos: escala com a velocidade
        sound.hit(prizeTier(multiplied ? rawMultiple / Number(hit.multiplier) : rawMultiple));
        await Promise.all([
          animateBoard('hit',$('board'),{duration:fastForward?0:700}),
          showHitAmount(hit,$('board'),credits[index].receivedUnits,value=>number.format(value),fastForward?0:1000,{
            betUnits:view.betUnits, beat, skip:()=>fastForward,
            onBeat:step=>{ if(step==='multiplier') sound.calcMultiplier(); else if(step==='result') sound.hit(prizeTier(rawMultiple)); },
          }),
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
      if (view.mode !== 'base') { sound.xpFly(); await dissolveToXP($('board'),event.removed,$('xp-bar'),{duration:650,skip:()=>fastForward}); }
      view.xp100=pendingXP;indicators();
      await cascadeBoard($('board'), shownBoard, event.board, b => renderBoard(b), { removed:event.removed, duration:500, skip:() => fastForward, removalAlreadyPresented:true,
        suspense: { ...scatterSuspense(view.mode), duration: 900, together: ultraChoreo(), onScatter: n => sound.scatterLand(n), onSuspense: level => sound.suspense(level), onSuspenseCell: (i, l) => sound.suspenseTick(i, l), onFirstLand: () => sound.refillLand() } });
      sound.endSuspense();
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
      const emblem=document.createElement('img');emblem.src='ui/art/wild-emblem.webp';emblem.alt='';
      const quantity=document.createElement('b');quantity.textContent=String(event.placed);
      wild.append(emblem,quantity);
      const arrow=document.createElement('span');arrow.className='magic-arrow';arrow.textContent='\u2726';
      const factor=document.createElement('span');factor.className='magic-factor';factor.textContent=`${event.multiplier || 1}\u00d7`;
      vision.append(wild,arrow,factor);
      $('magic-upgrade').append(vision,heading,detail);
      // 2500 ms em Normal; a velocidade (incluindo Ultra) escala tudo, sem minimos fixos.
      const magicDuration=ultraChoreo()?1600:2500;
      $('magic-upgrade').style.setProperty('--magic-enter',`${Math.round(350/currentRate())}ms`);
      $('magic-upgrade').hidden=false;
      clearTimeout(magicToast);
      await pause(magicDuration);
      $('magic-upgrade').hidden=true;
      renderBoard(shownBoard, [], event.positions);
      sound.magicCast();
      await castMagic($('board'), beforeMagic, event.board, { positions:event.positions, duration:850, together:ultraChoreo(), source:$('xp-bar'), skip:() => fastForward, onWild:() => sound.wildPlace() });

      status(`Magia: ${event.placed} wild${event.placed === 1 ? '' : 's'}${event.multiplier ? ` de ×${event.multiplier}` : ''}. Barra a zero.`);
      break;
    case 'spin-end': shownBoard = event.board; renderBoard(shownBoard); view.xp100 = event.xp100; indicators(); break;
    case 'bonus-start':
      sound.preloadMusic(event.mode);
      sound.scatterConverge();
      await gatherScatters($('board'), event.mode, { duration:650, skip:() => fastForward });
      sound.bonusTrigger();
      stopAuto(); view.mode = event.mode; view.remaining = event.spins; view.xp100 = 0; view.level = 0; indicators(); applyRate(0);
      try { sound.playMusic(event.mode); } catch { }
      try { sound.intro(event.mode); } catch { }
      await notice(names[event.mode], bonusDescription[event.mode], `${event.spins} SPINS GRÁTIS`); break;
    case 'retrigger':
      await gatherScatters($('board'), view.mode, {duration:400,skip:() => fastForward});
      view.remaining = event.remainingSpins; indicators(); showRibbon(`+${event.added} spins`, 'retrigger'); pulse($('free-spins')); status(`+${event.added} spins! ${event.remainingSpins} por jogar.`); sound.retrigger(); await pause(450); break;
    case 'max-win':
      view.paid100 = event.totalPaid100; view.remaining = view.xp100 = 0; indicators(); stopAuto();
      sound.maxWin();
      await notice('MAX WIN', '10 000× a aposta. A jogada terminou.', 'PRÉMIO MÁXIMO', true, creditedUnits(event.totalPaid100, view.betUnits)); break;
    case 'round-end': view.paid100 = event.paid100; indicators(); if(!view.demo) heldBalance=null; if(session.host) document.documentElement.dataset.casinoBalance=String(session.balanceUnits); countAmount($('balance'),session.balanceUnits-event.creditedUnits,session.balanceUnits,money,fastForward?0:400); pulse($('balance')); if (view.paid100 > 0) await pause(ultraChoreo() ? 200 : 450); break;
  }
}

function stopAuto() { autoCancel = true; autoRemaining = 0; controls(); }

async function runRound({ mode = hunt ? 'hunt' : 'base', demo = null, resume = false } = {}) {
  if (running) return;
  const activeSession = demo ? new TestSession({ seed: 123456, balanceUnits: 100000000 }) : session;
  let started = false, failed = false;
  $('error').hidden = true;
  try {
    running = true;
    finishCounts();
    if (MIN_CYCLE_MS > 0) {
      const gap = MIN_CYCLE_MS - (performance.now() - lastCycleStart);
      if (gap > 0) await new Promise(resolve => setTimeout(resolve, gap));
    }
    lastCycleStart = performance.now();
    turboRound = TURBO_ALLOWED && !autoRunning && tempo.turbo;
    boost = 1; slams = 0; fastForward = false;
    applyRate(0);
    // Arranque imediato: os simbolos comecam a sair no toque, ao mesmo tempo que o pedido segue
    // para a carteira do casino. A latencia fica escondida dentro da animacao de saida.
    if (!resume && !demo && (mode === 'base' || mode === 'hunt')) {
      preExit = animateBoard('exit', $('board'), { duration: 120 }).then(() => $('board').classList.add('cleared'));
    }
    const state = resume ? activeSession.state : await activeSession.start(mode, betUnits); started = true;
    if (!demo) heldBalance = activeSession.balanceUnits;
    if (resume) { betUnits = state.betUnits; hunt = state.entryMode === 'hunt'; }
    view = { mode: state.mode, xp100: state.xp100 || 0, level: state.magicLevel || 0, magicProgress: state.magicProgress, remaining: state.mode === 'base' ? 0 : state.remainingSpins, paid100: state.paid100 || 0, betUnits: state.betUnits, demo: Boolean(demo) };
    indicators(); controls(); sound.unlock();
    if (state.mode === 'base' || state.mode === 'hunt') try { sound.playMusic(hunt ? 'hunt' : 'base'); } catch { }
    if (resume && state.mode !== 'base') { try { sound.playMusic(state.mode); } catch { } status(`A retomar ${names[state.mode]} · ${state.remainingSpins} spins por jogar.`); }
    else if (state.mode !== 'base' && !demo) {
      sound.preloadMusic(state.mode);
      sound.purchase();
      await purchaseScatters($('board'),state.mode,symbolAssets.S,{duration:1150,together:ultraChoreo(),skip:()=>fastForward,onScatter:n=>sound.scatterLand(n),onSuspense:level=>sound.suspense(level),onColumn:c=>sound.columnLand(c),onSuspenseCell:(i,l)=>sound.suspenseTick(i,l)});
      sound.endSuspense();
      try { sound.playMusic(state.mode); } catch { }
      try { sound.intro(state.mode); } catch { }
      await notice(names[state.mode], bonusDescription[state.mode], `${state.remainingSpins} SPINS GRÁTIS`);
    }
    if (demo) status(`Demonstração local: ${demo.name}.`);
    let initial = true;
    while (activeSession.active) {
      const result = await activeSession.advance(initial && demo ? { initialBoard: demo.board } : {});
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
    if (!demo && final?.complete) recordHistory(final);
    status(demo ? `Demonstração terminada: ${demo.name}. O saldo não foi alterado.` : `Jogada terminada · prémio ${money(creditedUnits(final.paid100, view.betUnits))}.`);
  } catch (error) {
    failed = true; bufferedSpin = false; tempo.held = false;
    stopAuto(); errorMessage(error);
    if (activeSession.host) {
      // O site guarda a jogada: voltar a ligar e retomar no ponto confirmado.
      status(started ? 'Ligação interrompida. A jogada está guardada no casino.' : 'Não foi possível iniciar a jogada.');
      walletReady = false; void reconnect();
    } else status(started && !activeSession.state ? 'Jogada interrompida. O saldo de teste foi reposto.' : 'Não foi possível iniciar ou apresentar a jogada.');
  } finally {
    running = false; heldBalance = null;
    if (preExit) { const pending = preExit; preExit = null; pending.then(() => $('board').classList.remove('cleared')); }
    $('board').classList.remove('cleared');
    view.mode = 'base'; view.xp100 = view.level = view.remaining = 0;
    boost = 1; slams = 0; turboRound = false; applyRate(0);
    tempo.roundEnded();
    indicators(); controls();
  }
  // Toque recebido no fim da jogada, ou espaco premido: a seguinte arranca ja, sem tempo morto.
  if (!failed && !demo && !autoRunning && (bufferedSpin || (HOLD_TO_SPIN && TURBO_ALLOWED && tempo.held))) {
    bufferedSpin = false;
    setTimeout(() => { if (!running && !autoRunning && !$('spin').disabled) runRound(); }, 0);
  }
}

function autoDetails() {
  const count = autoCount(Number($('auto-range').value));
  $('auto-count').innerHTML = `${count} <small>spins</small>`;
  $('auto-range').setAttribute('aria-valuetext', `${count} spins`); paintRange($('auto-range'));
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
  const C = DEFAULT_CONFIG, xp = mode => C.xpThreshold100[mode] / 100;
  const img = (symbol, cls = '') => `<img class="${cls}" src="${symbolAssets[symbol]}" alt="">`;
  const wild = (mult = '') => `<span class="mini-wild"><img src="ui/art/wild-emblem.webp" alt=""><b>${mult || 'W'}</b></span>`;
  const flowers = n => Array.from({ length: n }, () => img('S', 'mini-flower')).join('');
  // Mini-grelha de exemplo: grupo de 5 ligados (em L) e um igual so na diagonal, que nao conta.
  const fill = ['N1','P2','N3','N5','P1','N4','N4','N2','N2','N2','N5','P3','N3','N1','P4','N2','N1','N5','P1','N5','N3','N2','N4','N1','N4','P3','N1','N5','N2','N3'];
  const group = new Set([7, 8, 9, 15, 21]), diagonal = 28;
  const miniBoard = `<div class="mini-board" aria-hidden="true">${fill.map((s, p) => `<span class="${group.has(p) ? 'on' : p === diagonal ? 'diag' : ''}">${img(s)}</span>`).join('')}</div>`;
  const tiers = ['5', '6–7', '8–10', '11–14', '15–17', '18+'];
  const xpRow = type => C.xpPerCluster100[type].map(v => `<td>${v / 100}</td>`).join('');
  const payoutRows = table => SYMBOLS.map((symbol, i) => `<tr><th scope="row"><span class="pay-symbol">${img(symbol)}<span>${symbolNames[symbol]}</span></span></th>${table[i].map(v => `<td>${compact.format(v / 100)}×</td>`).join('')}</tr>`).join('');
  const magicRows = [
    ['Jogo normal / Hunt', `${xp('base')} XP`, '1 a 3 W', 'sem multiplicador'],
    [names.common, `${xp('common')} XP`, '2 W de 1×', '+1 W e +1× por barra'],
    [names.super, `${xp('super')} XP`, '2 W de 2×', '+1 W e +2× por barra'],
    [names.secret, `${xp('secret')} XP`, '2 W de 2×', '+2 W e +2×/+3× alternados'],
  ].map(r => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('');

  const tabs = [['play', 'Jogar'], ['wilds', 'Wilds'], ['bonus', 'Flores e bónus'], ['pay', 'Pagamentos'], ['history', 'Histórico']];
  $('rules-content').innerHTML = `<nav class="rules-tabs" aria-label="Secções das regras">${tabs.map(([key, label]) => `<button data-rule="${key}" aria-pressed="${key === 'play'}">${label}</button>`).join('')}</nav>

  <section data-rule-panel="play" class="rule-panel">
    <div class="rule-hero">
      ${miniBoard}
      <div class="rule-copy">
        <h3>Junta 5 ou mais iguais</h3>
        <p>Os símbolos contam quando se tocam <b>pelos lados, por cima ou por baixo</b>. Na diagonal não contam.</p>
        <ul class="rule-legend"><li><span class="key on"></span>grupo de 5 que paga</li><li><span class="key diag"></span>só na diagonal: não conta</li></ul>
      </div>
    </div>
    <ol class="rule-steps">
      <li><span class="step-art step-win">${img('N2')}${img('N2')}${img('N2')}</span><b>Paga</b><small>Quanto maior o grupo, maior o prémio.</small></li>
      <li><span class="step-art step-fall">${img('N5')}<i></i>${img('P3')}</span><b>Cai e repete</b><small>O grupo desaparece, caem símbolos novos e pode haver nova vitória.</small></li>
      <li><span class="step-art step-xp"><span class="mini-xp"><i></i></span></span><b>Enche a magia</b><small>Cada grupo dá XP. Com a barra cheia, a Sofia lança wilds.</small></li>
    </ol>
    <p class="rule-note">Prémio máximo: <b>${compact.format(C.maxWin100 / 100)}×</b> a aposta por jogada, bónus incluído.</p>
  </section>

  <section data-rule-panel="wilds" class="rule-panel" hidden>
    <div class="rule-duo">
      <article class="rule-card">
        <h3>O W completa grupos</h3>
        <div class="equation">${img('N4')}${img('N4')}${wild()}${img('N4')}${img('N4')}</div>
        <p>Substitui qualquer símbolo normal ou premium. Pode ajudar vários grupos ao mesmo tempo. Nunca substitui flores.</p>
      </article>
      <article class="rule-card">
        <h3>Multiplicadores somam</h3>
        <div class="equation">${wild('2×')}<span class="op">+</span>${wild('3×')}<span class="op">=</span><span class="result">× 5</span></div>
        <p class="calc-demo"><span>1,50</span> × <em>5</em> = <strong>7,50</strong></p>
        <p>Nos bónus, cada W tem o seu multiplicador e guarda-o até sair. Os W do mesmo grupo somam-se.</p>
      </article>
    </div>
    <article class="rule-card rule-magic">
      <div class="magic-flow" aria-hidden="true"><span class="mini-xp full"><i></i></span><span class="flow-arrow"></span>${wild('2×')}${wild('2×')}</div>
      <div>
        <h3>Barra cheia, magia</h3>
        <p>A magia coloca wilds na grelha antes de procurar novos grupos. No máximo ${C.maxWilds} ao mesmo tempo; depois disso só o multiplicador cresce.</p>
      </div>
    </article>
    <div class="table-wrap"><table class="rule-table"><thead><tr><th>Modo</th><th>Barra</th><th>1.ª magia</th><th>Cada barra seguinte</th></tr></thead><tbody class="magic-rows">${magicRows}</tbody></table></div>
    <details class="rule-more"><summary><svg class="ui-icon" aria-hidden="true"><use href="#i-chevron"/></svg>XP por grupo</summary>
      <div class="table-wrap"><table class="rule-table"><thead><tr><th>Símbolos no grupo</th>${tiers.map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody class="xp-rows"><tr><th scope="row">Normais</th>${xpRow('normal')}</tr><tr><th scope="row">Premium</th>${xpRow('premium')}</tr></tbody></table></div>
      <p>Só contam os símbolos regulares do grupo: W não dão XP e menos de 5 regulares dão zero.</p>
    </details>
  </section>

  <section data-rule-panel="bonus" class="rule-panel" hidden>
    <div class="rule-hero scatter-hero">
      <img class="scatter-big" src="${symbolAssets.S}" alt="Flor Scatter">
      <div class="rule-copy">
        <h3>A flor Scatter</h3>
        <p>Conta em <b>qualquer posição</b> e não precisa de estar ligada. As flores contam-se no fim de todas as cascatas.</p>
      </div>
    </div>
    <div class="bonus-ladder">${[['common', 3], ['super', 4], ['secret', 5]].map(([mode, n]) => `<article class="rule-card bonus-step" data-mode="${mode}"><div class="flower-row">${flowers(n)}</div><img class="bonus-art" src="${bonusAssets[mode]}" alt=""><h3>${names[mode]}</h3><p>${C.bonusSpins} spins grátis</p></article>`).join('')}</div>
    <div class="rule-duo">
      <article class="rule-card retrigger"><h3>Mais spins no bónus</h3><p class="retrigger-row"><span class="flower-row">${flowers(2)}</span><b>+2 spins</b></p><p class="retrigger-row"><span class="flower-row">${flowers(3)}</span><b>+4 spins</b></p></article>
      <article class="rule-card hunt"><img class="bonus-art small" src="${bonusAssets.hunt}" alt=""><div><h3>Bonus Hunt</h3><p>Cada spin custa <b>${C.bonusHunt.spinCostMultiplier}×</b> a aposta e as flores aparecem cerca de <b>${compact.format(C.bonusHunt.scatterMultiplier)}×</b> mais. Os prémios contam sobre a aposta base.</p></div></article>
    </div>
  </section>

  <section data-rule-panel="pay" class="rule-panel" hidden>
    <h3>Pagamentos</h3>
    <p class="rule-note">Em × a aposta, pelo número de símbolos do grupo, antes dos multiplicadores. A tabela é a mesma em todos os modos.</p>
    <div class="table-wrap"><table class="pay-table"><thead><tr><th>Símbolo</th>${tiers.map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>${payoutRows(C.pay100)}</tbody></table></div>
    <p class="rule-note">Um ecrã só de W e flores paga uma vez como Princesa Sofia com 18+.</p>
  </section>

  <section data-rule-panel="history" class="rule-panel history-panel" hidden></section>`;
  document.querySelectorAll('[data-rule]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-rule]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    document.querySelectorAll('[data-rule-panel]').forEach(panel => { panel.hidden = panel.dataset.rulePanel !== button.dataset.rule; });
    if (button.dataset.rule === 'history') renderHistory();
  }));
}

// ---- Historico de rondas (como na Futebol de Bairro): so rondas concluidas e ja apresentadas ----
const HISTORY_KEY = `princesa-sofia-history:${hostOrigin ? 'casino' : 'teste'}`, HISTORY_LIMIT = 500, HISTORY_PAGE = 8;
let historyFilter = 'all', historyPage = 0;
function readHistory() {
  try { const rows = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); return Array.isArray(rows) ? rows : []; } catch { return []; }
}
function recordHistory(final) {
  const rows = readHistory(), bet = final.betUnits, paid = creditedUnits(final.paid100, bet);
  rows.unshift({ id: (rows[0]?.id || 0) + 1, at: Date.now(), entry: final.entryMode, bonus: final.bonusType || null, bet, cost: final.costUnits ?? session.cost(final.entryMode, bet), paid, spins: final.bonusSpinsPlayed || 0, max: Boolean(final.maxWin) });
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(rows.slice(0, HISTORY_LIMIT))); } catch { /* historico e so informativo */ }
  if (!$('rules-dialog').querySelector('[data-rule-panel=history]')?.hidden) renderHistory();
}
const entryLabel = row => row.entry === 'hunt' ? 'Bonus Hunt' : row.entry === 'base' ? 'Jogo normal' : `Compra · ${names[row.entry]}`;
function renderHistory() {
  const panel = $('rules-content').querySelector('[data-rule-panel=history]'); if (!panel) return;
  const filters = [['all', 'Todas'], ['base', 'Jogo normal'], ['hunt', 'Bonus Hunt'], ['buy', 'Compras de bónus'], ['natural', 'Bónus natural']];
  const filtered = readHistory().filter(r => historyFilter === 'all' || (historyFilter === 'buy' ? !['base', 'hunt'].includes(r.entry) : historyFilter === 'natural' ? ['base', 'hunt'].includes(r.entry) && r.bonus : r.entry === historyFilter));
  const pages = Math.max(1, Math.ceil(filtered.length / HISTORY_PAGE)); historyPage = Math.max(0, Math.min(historyPage, pages - 1));
  const page = filtered.slice(historyPage * HISTORY_PAGE, (historyPage + 1) * HISTORY_PAGE);
  const amount = units => number.format(units / 100);
  panel.innerHTML = `<div class="history-head"><h3>Histórico de rondas</h3><label><span class="sr-only">Filtrar histórico</span><select id="history-filter">${filters.map(([key, label]) => `<option value="${key}"${key === historyFilter ? ' selected' : ''}>${label}</option>`).join('')}</select></label></div>
    <p class="rule-note">${filtered.length} ronda(s) · últimas ${HISTORY_LIMIT} neste dispositivo · valores em DJC</p>
    <div class="table-wrap"><table class="rule-table history-table"><thead><tr><th>Ronda / modo</th><th>Aposta</th><th>Custo</th><th>Pago</th><th>Líquido</th></tr></thead><tbody>${page.map(r => `<tr><th scope="row"><b>#${r.id}</b> · ${entryLabel(r)}${r.bonus && ['base', 'hunt'].includes(r.entry) ? ` · ${names[r.bonus]}` : ''}${r.max ? ' · MAX WIN' : ''}<small>${new Date(r.at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}${r.spins ? ` · ${r.spins} spins grátis` : ''}</small></th><td>${amount(r.bet)}</td><td>${amount(r.cost)}</td><td>${amount(r.paid)}</td><td class="${r.paid >= r.cost ? 'positive' : 'negative'}">${r.paid >= r.cost ? '+' : ''}${amount(r.paid - r.cost)}</td></tr>`).join('') || '<tr><td colspan="5">Ainda não existem rondas.</td></tr>'}</tbody></table></div>
    <div class="history-pager"><button id="history-previous"${historyPage === 0 ? ' disabled' : ''}>Anterior</button><span>Página ${historyPage + 1} de ${pages}</span><button id="history-next"${historyPage + 1 >= pages ? ' disabled' : ''}>Seguinte</button></div>`;
  $('history-filter').addEventListener('change', event => { historyFilter = event.target.value; historyPage = 0; renderHistory(); });
  $('history-previous').addEventListener('click', () => { historyPage--; renderHistory(); });
  $('history-next').addEventListener('click', () => { historyPage++; renderHistory(); });
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
/**
 * Toque no spin (rato, toque ou espaco). Fora de uma jogada: roda; toques seguidos ligam o turbo
 * (tempo.js). Durante um bonus, os spins ja avancam automaticamente: os toques so ativam Ultra,
 * sem interromper a apresentacao nem cancelar animacoes.
 */
function pressSpin() {
  if ($('spin').disabled) return;
  sound.spinPress();
  if (autoRunning) { stopAuto(); return; }
  if (!running) { if (TURBO_ALLOWED) tempo.press(); runRound(); return; }
  if (!TURBO_ALLOWED) return; // politica sem turbo: a apresentacao segue ao seu ritmo
  tempo.press({ running: true });
  turboRound = true;
  if (view.mode !== 'base') {
    boost = 1;
    applyRate(120);
    return;
  }
  slams++;
  if (slams === 1) boost = 3;
  else if (slams === 2) boost = 8;
  else { fastForward = true; flushWaits(); cancelBoardMotion($('board')); }
  if (slams >= 2 && view.mode === 'base' && !view.demo) bufferedSpin = true;
  applyRate(slams > 2 ? 0 : 120);
}
$('spin').addEventListener('click', pressSpin);
$('hunt-button').addEventListener('click', () => { if (running || autoRunning) return; hunt = !hunt; if (hunt) sound.huntOn(); else sound.huntOff(); if (sound.music) try { sound.playMusic(hunt ? 'hunt' : 'base'); } catch { } controls(); indicators(); $('buy-dialog').close(); status(hunt ? 'Bonus Hunt ativado. O spin custa 4× a aposta base.' : 'Jogo normal ativado.'); });
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
  const order = ['normal', 'fast', 'ultra'];
  const labels = { normal: 'Normal', fast: 'Rápido', ultra: 'Ultra' };
  const index = (order.indexOf(speed) + 1) % order.length;
  speed = order[index];
  // Não cancelar a apresentação em curso: o relógio (tempo.js) muda o ritmo das animações e das esperas já, de forma suave.
  applyRate(150);
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
// Sem demonstracoes na interface. Os testes de browser abrem cenarios fixos com ?fixtures=1;
// correm numa sessao de teste separada e nunca tocam no saldo.
if (new URLSearchParams(location.search).has('fixtures')) window.sofiaFixture = name => { if (running || autoRunning) return; const demo = demoScenario(name); document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); return runRound({ mode: demo.mode, demo }); };
// Barras deslizantes tematicas: a parte preenchida segue o valor (--fill).
function paintRange(input) { const min = Number(input.min) || 0, max = Number(input.max) || 100; input.style.setProperty('--fill', `${((Number(input.value) - min) / (max - min || 1)) * 100}%`); }
function paintRanges() { document.querySelectorAll('input[type=range]').forEach(paintRange); }
document.addEventListener('input', event => { if (event.target.matches?.('input[type=range]')) paintRange(event.target); });
// Duas barras de volume (musica e efeitos) e silencio geral; guardadas neste browser.
try { const v = JSON.parse(localStorage.getItem('sofia-volume') || 'null'); if (v) { $('volume-music').value = v.music; $('volume-sfx').value = v.sfx; sound.muted = Boolean(v.muted); } } catch { }
function volumeChanged() {
  sound.musicVolume = Number($('volume-music').value) / 100;
  sound.sfxVolume = Number($('volume-sfx').value) / 100;
  sound.applyVolume();
  $('volume-value').textContent = `Música ${$('volume-music').value}%, efeitos ${$('volume-sfx').value}%`;
  $('mute-button').setAttribute('aria-pressed', String(sound.muted));
  $('mute-button').setAttribute('aria-label', sound.muted ? 'Ativar som' : 'Desativar som');
  $('mute-button').classList.toggle('muted', sound.muted);
  $('mute-button').querySelector('use')?.setAttribute('href', sound.muted ? '#i-sound-off' : '#i-sound');
  paintRanges();
  try { localStorage.setItem('sofia-volume', JSON.stringify({ music: $('volume-music').value, sfx: $('volume-sfx').value, muted: sound.muted })); } catch { }
}
for (const id of ['volume-music', 'volume-sfx']) $(id).addEventListener('input', () => { if (sound.muted) sound.muted = false; volumeChanged(); });
$('volume-sfx').addEventListener('change', () => sound.click());
$('mute-button').addEventListener('click', () => { sound.muted = !sound.muted; volumeChanged(); });
volumeChanged();
// Espaco roda em qualquer sitio do jogo (antes so funcionava com o foco no fundo: depois de clicar
// em Velocidade, o espaco carregava nesse botao). Manter premido = turbo continuo.
const typingIn = target => target?.closest?.('input,select,textarea,[contenteditable=true]');
document.addEventListener('keydown', event => {
  if (event.code !== 'Space' || document.querySelector('dialog[open]') || typingIn(event.target)) return;
  event.preventDefault();
  if (event.repeat) {
    if (HOLD_TO_SPIN && TURBO_ALLOWED && !autoRunning) {
      tempo.held = true;
      if (running && !turboRound) { turboRound = true; applyRate(120); }
    }
    return;
  }
  pressSpin();
});
addEventListener('blur', () => { tempo.held = false; });
document.addEventListener('keyup', event => {
  if (event.code !== 'Space') return;
  tempo.held = false;
  // Impede o botao com foco de tambem ser ativado pelo espaco.
  if (!document.querySelector('dialog[open]') && !typingIn(event.target)) event.preventDefault();
});

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

async function reconnect() {
  try {
    const result = await session.connect();
    walletReady = true; $('error').hidden = true; controls();
    if (result.notice) status(result.notice);
    if (session.active) { stopAuto(); await runRound({ resume: true }); }
    else if (!result.notice) status('Pronto.');
  } catch (error) {
    walletReady = false; controls(); errorMessage(error);
    status('Sem ligação à carteira do casino. Volta ao catálogo e abre o jogo de novo.');
  }
}

rulesContent(); renderBoard(shownBoard); indicators(); controls();
status('A preparar a magia…');
Promise.all(artAssets.map(src => {
  const image = new Image(); image.src = src; return image.decode();
})).then(async () => {
  await enterScene();
  await animateBoard('spin', $('board'), { duration: 300 });
  artReady = true; controls(); status(walletReady ? 'Pronto.' : 'A ligar à carteira do casino…');
  if (session.host) await reconnect();
}).catch(() => errorMessage(new Error('Não foi possível carregar a arte. Recarrega o jogo para tentar novamente.')));
observeMotionVisibility(document.body);
const pauseScene = () => document.body.classList.toggle('scene-hidden', document.hidden);
document.addEventListener('visibilitychange', pauseScene); pauseScene();

const expandButton = $('expand-button');
// Ecra inteiro: API normal, prefixo webkit (Safari no iPad) e, se nenhum existir (Safari no iPhone),
// o botao desaparece em vez de nao fazer nada.
const fullscreenElement = () => document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
const canFullscreen = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
expandButton.hidden = !canFullscreen;
expandButton.addEventListener('click', async () => {
  try {
    const root = document.documentElement;
    if (fullscreenElement()) await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
    else await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
  } catch { status('O navegador não permitiu abrir em ecrã inteiro.'); }
});
document.addEventListener('webkitfullscreenchange', () => document.dispatchEvent(new Event('fullscreenchange')));
document.addEventListener('fullscreenchange', () => {
  const expanded = Boolean(document.fullscreenElement);
  expandButton.setAttribute('aria-pressed', String(expanded));
  expandButton.setAttribute('aria-label', expanded ? 'Sair do ecrã inteiro' : 'Expandir para ecrã inteiro');
  expandButton.title = expanded ? 'Reduzir' : 'Expandir';
  expandButton.querySelector('use')?.setAttribute('href', expanded ? '#i-collapse' : '#i-expand');
  expandButton.focus({ preventScroll: true });
});

installLayout();
installPresentation();
installPerfPanel();
