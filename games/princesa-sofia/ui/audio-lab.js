// Pagina de teste de som: ouvir candidatos de cada efeito, escolher e aplicar ao jogo.
import { buildSfxBus, sfxProfile } from './audio-bus.js';

const $ = id => document.getElementById(id);

const FAMILIES = {
  original: 'Atual',
  'synth-a': 'Caixa de música',
  'synth-b': 'Harpa e cristal',
  'synth-c': 'Pó de fada',
  'synth-d': 'Spin (novo)',
};
const LEGEND = [
  ['Atual', 'o som que o jogo tem hoje'],
  ['Caixa de música', 'celesta redonda e quente'],
  ['Harpa e cristal', 'harpa dedilhada com copos de cristal'],
  ['Pó de fada', 'mais ar e brilho, menos notas'],
  ['Spin (novo)', 'conjunto coerente com a marimba das colunas, o que está no jogo'],
  ['ElevenLabs / Gravação', 'sons gerados ou gravados, quando existirem'],
];
const label = name => FAMILIES[name] || name.replace(/^eleven-(\d+)$/, 'ElevenLabs $1').replace(/^freesound-(\d+)$/, 'Gravação $1');

// Momentos do jogo, pela ordem em que acontecem. seq = como ouvir em repeticao (como no jogo).
const GROUPS = [
  ['Spin e cascatas', [
    ['reel-land', 'Colunas a pousar', 'Uma nota por coluna, da esquerda para a direita (substitui o whoosh do arranque).', { times: 6, gap: 180, climb: [0, 2, 4, 7, 9, 12] }],
    ['spin-whoosh', 'Arranque do spin (desligado)', 'Já não toca no jogo; ficou substituído pelas colunas a pousar.', { times: 3, gap: 900 }],
    ['symbols-land', 'Símbolos assentam', 'Estava desligado no jogo. Escolhe "Silêncio" para manter assim.'],
    ['cascade-dissolve', 'Vencedores desfazem-se', 'Estava desligado no jogo. Na cascata, antes de caírem novos símbolos.'],
  ]],
  ['Prémios', [
    ['hit-small', 'Prémio pequeno', 'Hit abaixo de 1× a aposta. É o som que mais se repete.', { times: 4, gap: 420 }],
    ['hit-medium', 'Prémio médio', 'Hit a partir de 1×.', { times: 3, gap: 600 }],
    ['hit-large', 'Prémio grande', 'Hit a partir de 5×.'],
    ['hit-epic', 'Prémio épico', 'Hit a partir de 20×.'],
    ['win-count', 'Contagem do prémio', 'Toca em loop enquanto os números sobem.', { loop: 3200, then: 'win-count-end' }],
    ['win-count-end', 'Fim da contagem', 'Quando o número final assenta.'],
  ]],
  ['XP e magia', [
    ['xp-fly', 'Pó de XP a voar', 'Nos bónus, a poeira dos vencedores voa para a barra.', { times: 3, gap: 700 }],
    ['magic-ready', 'Barra de XP cheia', 'Antes de a magia acontecer.'],
    ['magic-cast', 'Magia', 'A fada lança o feitiço.'],
    ['wild-place', 'Cada WILD colocado', 'Toca uma vez por WILD; no jogo cada um sobe um degrau na escala.', { times: 6, gap: 260, climb: [0, 2, 4, 7, 9, 12] }],
  ]],
  ['Scatters e bónus', [
    ['scatter-land', 'Flor Scatter aterra', 'Cada Scatter que aterra soa um degrau acima do anterior.', { times: 5, gap: 450, climb: [0, 2, 4, 7, 9] }],
    ['scatter-anticipation', 'Suspense de Scatters', 'Quando falta um Scatter para o bónus. Sobe de tom em cada nível (3.º, 4.º, 5.º Scatter).', { times: 3, gap: 1900, climb: [0, 3, 7] }],
    ['scatter-converge', 'Flores convergem', 'Antes de entrar no bónus.'],
    ['bonus-trigger', 'Entrada no bónus', 'Hoje em silêncio (o ficheiro nunca existiu).'],
    ['purchase-flowers', 'Compra de bónus', 'Hoje em silêncio. As flores aparecem e convergem.'],
    ['retrigger', 'Retrigger (+spins)', 'Hoje em silêncio.'],
    ['bonus-end', 'Fim do bónus', 'Hoje em silêncio. Antes da contagem do total.'],
    ['music-transition', 'Transição de música', 'Opcional: toca por cima do crossfade quando muda o modo.'],
  ]],
  ['Interface', [
    ['ui-spin-press', 'Botão Rodar', ''],
    ['ui-click', 'Clique genérico', 'Regras, fechar, opções.'],
    ['ui-bet-step', 'Aposta + / −', '', { times: 4, gap: 140 }],
    ['ui-dialog-open', 'Abrir janela', ''],
    ['ui-dialog-close', 'Fechar janela', ''],
    ['ui-hunt-on', 'Ligar Bonus Hunt', ''],
    ['ui-hunt-off', 'Desligar Bonus Hunt', ''],
    ['ui-speed', 'Mudar velocidade', ''],
    ['ui-auto-start', 'Iniciar autoplay', ''],
    ['ui-auto-stop', 'Parar autoplay', ''],
  ]],
];

let candidates = {};
let choices = {}, notes = {};
let ctx, sfxIn, verbSend, master, musicGain, music = null;
const buffers = new Map();

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxIn = ctx.createGain();
    verbSend = buildSfxBus(ctx, sfxIn, master);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
    setVolume();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function setVolume() { if (master) master.gain.value = Number($('volume').value) / 100; }

async function buffer(url) {
  if (!buffers.has(url)) buffers.set(url, fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => audio().decodeAudioData(b)).catch(() => null));
  return buffers.get(url);
}
const fileOf = (cue, cand) => `audio-lab/candidates/${cue}/${cand}.mp3`;

// Toca como no jogo: mesmo perfil (volume, reverberacao, variacao). "Atual" nao vem normalizado.
async function playCue(cue, cand, { semitones = 0, loopMs = 0 } = {}) {
  if (!cand || cand === 'silencio') return null;
  const buf = await buffer(fileOf(cue, cand));
  if (!buf) return null;
  const prof = sfxProfile(cue, cand === 'original' ? [] : [cue]);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const cents = semitones * 100 + (prof.cents ? (Math.random() * 2 - 1) * prof.cents : 0);
  if (cents) src.playbackRate.value = 2 ** (cents / 1200);
  const g = ctx.createGain(); g.gain.value = prof.vol * (1 + (Math.random() * 2 - 1) * prof.jitter);
  src.connect(g); g.connect(sfxIn);
  if (prof.verb) { const s = ctx.createGain(); s.gain.value = prof.verb; g.connect(s); s.connect(verbSend); }
  if (loopMs) { src.loop = true; src.start(); src.stop(ctx.currentTime + loopMs / 1000); }
  else src.start();
  return new Promise(r => { src.onended = r; });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function audition(cue, cand, seq) {
  audio();
  if (seq?.loop) { await playCue(cue, cand, { loopMs: seq.loop }); return playCue(seq.then, choices[seq.then] || cand); }
  if (!seq?.times) return playCue(cue, cand);
  for (let i = 0; i < seq.times; i++) { playCue(cue, cand, { semitones: seq.climb ? seq.climb[i] : 0 }); await wait(seq.gap); }
}

async function setMusic(name) {
  audio();
  if (music) { const m = music; m.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3); m.src.stop(ctx.currentTime + 1.5); music = null; }
  if (!name) return;
  const buf = await buffer(`ui/audio/music/${name}.opus`);
  if (!buf || $('music').value !== name) return;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(name === 'theme-bonus-super' ? 0.9 : 1, ctx.currentTime, 0.4);
  src.connect(g); g.connect(musicGain); src.start();
  music = { src, g };
}

function choose(cue, cand) {
  choices[cue] = cand;
  document.querySelectorAll(`[data-cue="${cue}"] .opt`).forEach(o => o.classList.toggle('chosen', o.dataset.cand === cand));
  persist(); $('status').textContent = 'Escolhas por guardar.';
}
function persist() { try { localStorage.setItem('sofia-audio-lab', JSON.stringify({ choices, notes })); } catch { } }

function render() {
  const main = $('groups'); main.textContent = '';
  for (const [title, cues] of GROUPS) {
    const h = document.createElement('h2'); h.textContent = title; main.append(h);
    for (const [cue, name, when, seq] of cues) {
      const list = candidates[cue] || [];
      const card = document.createElement('section'); card.className = 'cue'; card.dataset.cue = cue;
      if (!list.includes('original')) card.classList.add('missing');
      card.innerHTML = `<header><div><h3></h3><p class="when"></p></div><span class="tag"></span></header><div class="options"></div>`;
      card.querySelector('h3').append(name, Object.assign(document.createElement('code'), { textContent: cue }));
      card.querySelector('.when').textContent = when;
      card.querySelector('.tag').textContent = seq?.times ? `ouvir ${seq.times}× seguidas` : seq?.loop ? 'loop + fim' : '';
      const opts = card.querySelector('.options');
      for (const cand of [...list, 'silencio']) {
        const o = document.createElement('span'); o.className = 'opt'; o.dataset.cand = cand;
        if (cand !== 'silencio') {
          const play = document.createElement('button'); play.type = 'button'; play.className = 'play';
          play.textContent = `▶ ${label(cand)}`; play.setAttribute('aria-label', `Ouvir ${label(cand)}: ${name}`);
          play.addEventListener('click', async () => { o.classList.add('playing'); await audition(cue, cand, seq); o.classList.remove('playing'); });
          o.append(play);
        }
        const pick = document.createElement('button'); pick.type = 'button'; pick.className = 'pick';
        pick.textContent = cand === 'silencio' ? 'Silêncio' : 'Escolher';
        pick.setAttribute('aria-label', `Escolher ${cand === 'silencio' ? 'silêncio' : label(cand)} para ${name}`);
        pick.addEventListener('click', () => choose(cue, cand));
        o.append(pick);
        if (choices[cue] === cand) o.classList.add('chosen');
        opts.append(o);
      }
      const note = document.createElement('input'); note.className = 'note'; note.placeholder = 'Nota para o Claude (opcional): ex. “gosto da B mas mais curta”';
      note.value = notes[cue] || ''; note.addEventListener('input', () => { notes[cue] = note.value; persist(); });
      card.append(note);
      main.append(card);
    }
  }
}

async function simulate() {
  audio();
  const c = cue => choices[cue] || 'original';
  playCue('ui-spin-press', c('ui-spin-press'));
  await wait(80); playCue('spin-whoosh', c('spin-whoosh')); await wait(950);
  playCue('symbols-land', c('symbols-land')); await wait(350);
  playCue('hit-small', c('hit-small')); await wait(300); playCue('hit-small', c('hit-small')); await wait(500);
  playCue('cascade-dissolve', c('cascade-dissolve')); playCue('xp-fly', c('xp-fly')); await wait(800);
  playCue('symbols-land', c('symbols-land')); await wait(350);
  playCue('hit-medium', c('hit-medium')); await wait(700);
  playCue('magic-ready', c('magic-ready')); await wait(1000);
  playCue('magic-cast', c('magic-cast')); await wait(900);
  for (const st of [0, 2, 4, 7]) { playCue('wild-place', c('wild-place'), { semitones: st }); await wait(260); }
  await wait(400); playCue('hit-large', c('hit-large')); await wait(900);
  await playCue('win-count', c('win-count'), { loopMs: 1800 }); playCue('win-count-end', c('win-count-end'));
}

async function save() {
  $('status').textContent = 'A guardar…';
  try {
    const r = await fetch('audio-lab/choices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ choices, notes, apply: true }) });
    if (!r.ok) throw new Error();
    const d = await r.json();
    $('status').textContent = `Guardado. ${d.applied} sons aplicados ao jogo — recarrega o jogo para ouvir.`;
  } catch { $('status').textContent = 'Não consegui guardar. O servidor (npm.cmd run dev) está a correr?'; }
}

async function init() {
  for (const [k, v] of LEGEND) { const li = document.createElement('li'); li.innerHTML = '<b></b> — <span></span>'; li.querySelector('b').textContent = k; li.querySelector('span').textContent = v; $('legend').append(li); }
  try { const s = JSON.parse(localStorage.getItem('sofia-audio-lab') || '{}'); choices = s.choices || {}; notes = s.notes || {}; } catch { }
  try { const r = await fetch('audio-lab/choices.json', { cache: 'no-store' }); if (r.ok && !Object.keys(choices).length) { const s = await r.json(); choices = s.choices || {}; notes = s.notes || {}; } } catch { }
  try { candidates = await (await fetch('audio-lab/candidates.json', { cache: 'no-store' })).json(); }
  catch { $('status').textContent = 'Abre esta página através de npm.cmd run dev.'; }
  for (const fam of ['original', 'synth-a', 'synth-b', 'synth-c', 'synth-d']) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label(fam);
    b.addEventListener('click', () => { for (const cue of Object.keys(candidates)) if (candidates[cue].includes(fam)) choose(cue, fam); });
    $('all-family').append(b);
  }
  render();
}

$('volume').addEventListener('input', setVolume);
$('music').addEventListener('change', () => setMusic($('music').value));
$('simulate').addEventListener('click', simulate);
$('save').addEventListener('click', save);
init();
