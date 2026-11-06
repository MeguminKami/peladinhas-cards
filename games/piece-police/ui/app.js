/**
 * PEACE POLICE: THE AFTERPARTY — controlador da GUI de teste (Fase 2).
 *
 * O motor decide, a interface apresenta. Esta app:
 *  - pede jogadas à sessão (único ponto que mexe no saldo) e recebe-as passo a passo;
 *  - percorre step.events POR ORDEM: aplica cada evento ao modelo (ui/modelo.js), chama
 *    fx.audio.play(evento, ctx) e espera por fx.visual.play(evento, ctx);
 *  - mantém uma máquina de estados explícita (ESTADOS / TRANSICOES);
 *  - todas as esperas passam por ui/tempo.js (velocidade = rate do relógio).
 * Nunca sorteia, nunca calcula prémios, nunca compara grelhas.
 */
import { config, MATH_VERSION } from '../src/index.js';
import { createControlDeck } from './kit/barra.js';
import { TestSession, HostSession, DemoSession, hostWalletOrigin, BETS } from './session.js';
import { installLayout } from './layout.js';
import { setRate, wait as clockWait, animate as clockAnimate, currentRate, now as clockNow } from './tempo.js';
import { novoModelo, aplicar, PERSONAS } from './modelo.js';
import { visual } from './fx-visual.js';
import { loadArt, paintSymbol, paintPortrait, artImage, mountArt, PERSONA_ID, FUSION_ART, BONUS_ART } from './art-loader.js';
import { audio } from './fx-audio.js';
import { money, amount, winCents, xBet, clusterEquation, narrar, shortName, categoria, fusionName, LEVEL_NAME, BONUS_NAME, MODE_LABEL, proximoObjetivo, POWER_NAME, POWER_HINT } from './texto.js';
import { montarRegras } from './regras.js';
import { fusionBrief } from './fusion-copy.js';
import { bonusBrief } from './help-copy.js';
import { showIntro } from './intro.js';
import { createPresentationState, SPEED_RATES } from './presentation-state.js';
import { guardarJogada, desenharHistorico } from './historico.js';

// ---- Política de ritmo (mercados regulados, ex.: Reino Unido: 2500 / false / false) ----
export const MIN_CYCLE_MS = 0;
export const TURBO_ALLOWED = true;
export const HOLD_TO_SPIN = false;

const BIG_WIN = [[100000, 'GANHO ÉPICO'], [50000, 'GANHO ENORME'], [20000, 'GANHO GRANDE']]; // milésimos de aposta
const OVERLAY_GUARD_MS = 500, SPIN_GUARD_MS = 100;

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const fx = { visual, audio };

// ---------------------------------------------------------------------------
// Máquina de estados
// ---------------------------------------------------------------------------
const TRANSICOES = {
  A_LIGAR: ['PRONTO', 'A_APRESENTAR', 'ENTRADA_BONUS', 'ERRO_FATAL', 'CARTEIRA_PENDENTE'],
  PRONTO: ['A_PEDIR', 'A_LIGAR', 'ERRO_FATAL', 'SALDO_INSUFICIENTE', 'A_APRESENTAR', 'ENTRADA_BONUS'],
  A_PEDIR: ['A_APRESENTAR', 'ENTRADA_BONUS', 'SALDO_INSUFICIENTE', 'CARTEIRA_PENDENTE', 'ERRO_FATAL', 'PRONTO'],
  A_APRESENTAR: ['A_APRESENTAR', 'ENTRADA_BONUS', 'A_CONFIRMAR', 'CARTEIRA_PENDENTE', 'ERRO_FATAL'],
  ENTRADA_BONUS: ['FREE_SPINS', 'ERRO_FATAL'],
  FREE_SPINS: ['FREE_SPINS', 'RESUMO_BONUS', 'A_CONFIRMAR', 'CARTEIRA_PENDENTE', 'ERRO_FATAL'],
  RESUMO_BONUS: ['A_CONFIRMAR', 'ERRO_FATAL'],
  A_CONFIRMAR: ['PRONTO', 'ERRO_FATAL'],
  CARTEIRA_PENDENTE: ['A_PEDIR', 'A_APRESENTAR', 'FREE_SPINS', 'ENTRADA_BONUS', 'A_LIGAR', 'PRONTO', 'ERRO_FATAL'],
  SALDO_INSUFICIENTE: ['PRONTO'],
  ERRO_FATAL: ['A_LIGAR', 'PRONTO'],
};
let estado = 'A_LIGAR', antesDePendente = null, pedidosPagos = 0;
const historicoEstados = [];
function transitar(next) {
  if (next === estado && !TRANSICOES[estado].includes(next)) return;
  if (!TRANSICOES[estado]?.includes(next)) console.error(`[pp] transição inválida ${estado} → ${next}`);
  historicoEstados.push(`${estado}→${next}`); if (historicoEstados.length > 300) historicoEstados.shift();
  if (next === 'A_PEDIR') pedidosPagos++;
  estado = next;
  document.body.dataset.estado = next;
  emit('estado', next);
  controls();
}

// ---------------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------------
const hostOrigin = hostWalletOrigin();
const session = hostOrigin ? new HostSession({ origin: hostOrigin, timeout: Number(params.get('timeout')) || 8000 }) : new TestSession({ seed: params.get('seed') ?? undefined });
if (session.host) {
  session.onRetry = () => { if (estado !== 'CARTEIRA_PENDENTE' && ['A_PEDIR', 'A_APRESENTAR', 'FREE_SPINS', 'ENTRADA_BONUS', 'A_LIGAR'].includes(estado)) { antesDePendente = estado; transitar('CARTEIRA_PENDENTE'); status('A confirmar com o casino… (o pedido repete-se com o mesmo id)'); } };
}
function saiDePendente() { if (estado === 'CARTEIRA_PENDENTE') { transitar(antesDePendente ?? 'PRONTO'); antesDePendente = null; status(''); } }

// ---------------------------------------------------------------------------
// Estado da interface
// ---------------------------------------------------------------------------
let bet = (() => { try { const b = Number(localStorage.getItem('pp-aposta')); return BETS.includes(b) ? b : 100; } catch { return 100; } })();
let hunt = false;
let model = novoModelo();
let presentedEventType = null;
let shownBet = bet;              // aposta da jogada apresentada (pode ser a de uma jogada retomada)
let heldBalance = null;          // saldo mostrado retido até ao fim da contagem do prémio
let busy = false;                // há uma jogada a decorrer (do pedido à confirmação)
let auto = { running: false, remaining: 0, cancel: false };
const fastForward = false;
let speed = 'normal', presentation = createPresentationState(), presentationRound = null, lastFusion = null;
let repeatPoliceParty = false;
const partyActive = () => presentation.partyActive(model);
function savePresentation() {
  if(forced || !presentationRound)return;
  try { sessionStorage.setItem('pp-visual-bonus',JSON.stringify({round:presentationRound,...presentation.snapshot()})); } catch {}
}
let lastCycleStart = -Infinity, lastSpinCommand = -Infinity;
let bonusWinStart = 0, inBonus = false, forced = false;
let stepMode = false, stepGate = null;
const listeners = new Map();
function emit(type, data) { for (const fn of listeners.get(type) || []) try { fn(data); } catch (e) { console.error(e); } }
function on(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); return () => listeners.get(type).delete(fn); }

const prefReduced = matchMedia('(prefers-reduced-motion: reduce)');
let reducedPref = (() => { try { return localStorage.getItem('pp-movimento-reduzido'); } catch { return null; } })();
const reduced = () => reducedPref === '1' || (reducedPref !== '0' && prefReduced.matches);
prefReduced.addEventListener('change', () => { document.body.dataset.reduced = String(reduced()); });

// ---------------------------------------------------------------------------
// Barra de controlos padrão (guides/kit, sem alterações)
// ---------------------------------------------------------------------------
const deck = createControlDeck($('deck-slot'), {
  bets: BETS, bet, currency: 'DJC', unitsPerCredit: 100, storageKey: 'peace-police',
  onSpin: () => pressSpin(),
  onBetChange: b => setBet(b),
  onAutoStart: count => startAuto(count),
  onAutoStop: () => stopAuto(),
  onSpeedChange: next => { speed=next;applyRate(100); },
  onVolumeChange: v => fx.audio.setVolumes(v),
  onRules: () => openRules(),
  onUiSound: name => fx.audio.ui(name),
  canAutoStart: () => session.balance >= session.cost(currentMode(), deck.bet),
});
speed = deck.speed;
fx.audio.setVolumes(deck.volume);

// ---------------------------------------------------------------------------
// Grelha (apresentação neutra)
// ---------------------------------------------------------------------------
let art = { images: new Map(), failures: [], total: 0 };
const cells = [];
for (let i = 0; i < 25; i++) {
  const el = document.createElement('div');
  el.className = 'cell'; el.role = 'gridcell';
  el.style.gridColumn = String(Math.floor(i / 5) + 1); el.style.gridRow = String((i % 5) + 1);
  el.innerHTML = '<span class="sym"></span><span class="name"></span><span class="mult"></span><span class="flag"></span>';
  el.dataset.cell = String(i);
  $('board').append(el); cells.push(el);
}
const PREMIUM_COLOR = { P1: 'var(--WEED)', P2: 'var(--ALCOOL)', P3: 'var(--COPIUM)', P4: 'var(--MDMA)', P5: 'var(--LCD)' };
function render(m = model) {
  if (busy) delete $('board').dataset.welcome;
  const sticky = new Set(m.stickyW);
  const stickyKinds = new Map();
  for (const g of m.groups) for (const c of g.cells) { sticky.add(c); stickyKinds.set(c, g.kind === 'frozen' ? 'lcd' : g.kind === 'freeze' ? 'mdma' : 'weed'); }
  for (let i = 0; i < 25; i++) {
    const el = cells[i], id = m.grid[i] ?? '';
    if (stickyKinds.has(i)) el.dataset.stickyKind = stickyKinds.get(i); else delete el.dataset.stickyKind;
    const mult = m.mult[i];
    const persona = Object.keys(PERSONA_ID).find(p => PERSONA_ID[p] === id) ?? null;
    const active = persona && m.awake.includes(persona);
    const party = m === model ? partyActive() : m.partyMode;
    const key = `${id}|${mult ?? ''}|${sticky.has(i)}|${Boolean(active)}|${Boolean(active && party)}`;
    if (el.dataset.key === key) continue;
    el.dataset.key = key;
    el.dataset.sym = id; el.dataset.cat = categoria(id);
    el.dataset.awake = String(Boolean(active));
    el.dataset.multLevel = String(id === 'CW' ? (mult <= 2 ? 1 : mult <= 5 ? 2 : mult <= 10 ? 3 : 4) : id === 'DW' ? (mult < 10 ? 1 : mult < 25 ? 2 : mult < 50 ? 3 : 4) : 0);
    el.dataset.party = String(Boolean(active && party));
    paintSymbol(el.children[0], id, art, { awake: active });
    el.children[1].textContent = id === 'DW' ? 'JOINER' : ['CW','W'].includes(id) ? 'WILD' : shortName(id);
    el.children[2].textContent = mult ? `×${mult}` : '';
    // HOLD = wild que fica até entrar num prémio (depois sai); STICKY = símbolo de um grupo do WEED/LCD
    el.children[3].textContent = sticky.has(i) ? (id === 'W' ? 'HOLD' : 'STICKY') : '';
    el.classList.toggle('sticky', sticky.has(i));
    if (PREMIUM_COLOR[id]) el.style.setProperty('--pcolor', PREMIUM_COLOR[id]); else el.style.removeProperty('--pcolor');
    el.setAttribute('aria-label', `Coluna ${Math.floor(i / 5) + 1}, linha ${(i % 5) + 1}: ${id === 'DW' ? 'Joiner, substitui símbolos pagantes' : id === 'X' ? 'canto fechado' : id || 'vazio'}${mult ? ` ×${mult}` : ''}${sticky.has(i) ? (id === 'W' ? ', HOLD wild' : ', sticky') : ''}`);
  }
}
function startGrid() {
  // Decorative welcome only: no engine call, wager or result.
  const rows = ['X5X5X', '55555', '55555', '15551', 'X252X'];
  model.grid = Array.from({ length: 25 }, (_, i) => {
    const col = Math.floor(i / 5), row = i % 5;
    return config.corners.includes(i) ? 'X' : 'P' + (rows[row][col] === 'X' ? '4' : rows[row][col]);
  });
  $('board').dataset.welcome = 'true';
  render();
}


// Scene artwork is selected only by the presented mode and current drawing.
function refreshScene() {
  const shell = document.querySelector('.shell');
  if (!shell) return;
  const mode = document.body.dataset.scene || 'base';
  const key = BONUS_ART[mode] || 'BASE';
  const vertical = document.body.dataset.layout === 'portrait';
  const id = 'BG-' + key + (vertical && art.images.has('BG-' + key + '-PORTRAIT') ? '-PORTRAIT' : '');
  const previousScene = shell.querySelector('.scene-art')?.dataset.artId;
  const scene = mountArt(shell, art, id, 'scene-art');
  if (scene && previousScene !== id) clockAnimate(scene, [{ opacity: 0 }, { opacity: .48 }], { duration: reduced() ? 100 : 600 });
  const frameId = art.images.has('STG-FRAME-' + key) ? 'STG-FRAME-' + key : 'STG-FRAME-BASE';
  const frame = mountArt($('board-wrap'), art, frameId, 'stage-frame-art');
  $('board').style.setProperty('--stage-frame', frame ? 'url("' + frame.src + '")' : 'none');
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
const chemEls = {};
for (const p of PERSONAS) {
  const el = document.createElement('div');
  el.className = 'persona'; el.dataset.persona = p; el.style.setProperty('--pc', `var(--${p})`);
  el.innerHTML = `<b>${p}</b><span class="st"></span><span class="fx"></span>`;
  $('chem-personas').append(el); chemEls[p] = el;
}
const currentMode = () => hunt ? 'hunt' : 'base';
const roundWinCents = () => winCents(model.roundWin, shownBet);
const fsNow = () => Math.min(model.freeSpins.total, model.freeSpins.played + 1);

function hud() {
  const calmer = model.police === 'calmer';
  for (const p of PERSONAS) {
    const el = chemEls[p], awake = model.awake.includes(p);
    el.dataset.state = awake ? 'awake' : 'sleep';
    el.dataset.party = String(awake && partyActive());
    if (p === 'COPIUM') el.dataset.armed = String(Boolean(model.copiumArmed && busy && presentedEventType !== 'step.end'));
    el.dataset.fused = String(model.fused.some(f => config.fusions.find(x => x.id === f)?.par.includes(p)));
    const fusedWith = model.fused.filter(f => config.fusions.find(x => x.id === f)?.par.includes(p)).map(fusionName);
    el.children[1].textContent = POWER_HINT[p];
    el.children[2].textContent = awake && fusedWith.length ? `${fusedWith.length} ${fusedWith.length===1?'fusão ativa':'fusões ativas'}` : '';
    el.setAttribute('aria-label',`${p}: ${awake?'ativo':'inativo'}. ${POWER_HINT[p]}.${fusedWith.length?' Fusões: '+fusedWith.join(', '):''}`);
    el.title = fusedWith.join(' · ') || POWER_NAME[p];
  }
  // Dica: o que pode acontecer a seguir (só o que é possível neste estado)
  $('chem-level').innerHTML = `<b>Chemistry ${model.level}/5${model.level ? ` · ${LEVEL_NAME[model.level]}` : ''}</b><span>${proximoObjetivo(model.level, calmer)}</span>`;
  // Peace Police
  const pol = $('police-panel');
  pol.dataset.police = model.police ?? 'idle';
  mountArt(pol, art, 'SYM-DW', 'police-art');
  $('police-text').textContent = model.police === 'calmer' ? 'CALMER — «Everybody calm down!» Prende os baixos e fecha a escalada.'
    : model.police === 'joiner' ? 'JOINER — «I\'m joining the party!» Party Mode e Joiner.'
    : 'DE OLHO NA FESTA';
  $('police-short').textContent = model.police === 'calmer' ? 'CALMER' : model.police === 'joiner' ? 'JOINER' : 'DE OLHO';
  const badges = Object.entries(model.mult).filter(([c]) => model.grid[c] === 'DW');
  $('police-badge').hidden = !badges.length;
  $('police-badge').textContent = badges.length ? `Joiner: ${badges.map(([, m]) => `×${m}`).join(' + ')}` : '';
  // Party Mode: néon à volta do palco, ligado ou desligado
  const party=partyActive();
  $('board-wrap').dataset.party = String(party);
  $('party-neon').textContent = party ? model.bonusId==='police'&&busy?'PARTY MODE · TODO O BÓNUS':'PARTY MODE · ON' : 'PARTY MODE · OFF';
  const fusion=config.fusions.find(f=>f.id===(lastFusion||model.fused.at(-1)));
  const shell=document.querySelector('.shell');
  shell.style.setProperty('--party-a',`var(--${fusion?.par[0]||'joiner'})`);
  shell.style.setProperty('--party-b',`var(--${fusion?.par[1]||'WEED'})`);
  // Bónus: a coluna da esquerda passa a ser o registo do free spin
  const bonusId = busy && model.kind === 'bonus' ? model.bonusId : null; // terminada a jogada, volta o jogo base
  $('bonus-panel').hidden = !bonusId;
  document.body.dataset.inBonus = String(Boolean(bonusId));
  // Modo e valores
  const modeKey = bonusId ?? (forced ? 'base' : currentMode());
  $('mode-label').dataset.mode = modeKey;
  $('mode-label').hidden = !bonusId;
  document.body.dataset.scene = modeKey;
  refreshScene();
  $('mode-label').textContent = bonusId ? `${BONUS_NAME[bonusId]}${model.freeSpins ? ` · ${fsNow()}/${model.freeSpins.total}` : ''}` : ''; 
  $('forced-label').hidden = !forced;
  deck.setWin(roundWinCents(), model.roundWin / 1000);
}

function showBalance() {
  const value = heldBalance ?? session.balance;
  deck.setBalance(value);
  // O cabeçalho do site lê isto: o prémio não aparece antes do fim da contagem.
  document.documentElement.dataset.casinoBalance = String(value);
}

function controls() {
  const ready = ['PRONTO', 'SALDO_INSUFICIENTE'].includes(estado) && !busy;
  const locked = busy || auto.running || !ready;
  deck.setState({ running: busy && !auto.running ? true : busy, autoRunning: auto.running, locked, ready: estado !== 'A_LIGAR' && estado !== 'ERRO_FATAL' });
  deck.setCost(session.cost(currentMode(), deck.bet));
  deck.setExtraActive(hunt);
  $('buy-button').disabled = locked;
  $('hunt-button').disabled = locked;
  $('hunt-button').setAttribute('aria-checked', String(hunt));
  $('hunt-state').textContent = hunt ? 'LIGADO' : 'DESLIGADO';
  $('hunt-cost').textContent = `custo ${xBet(config.modes.hunt.costMils)} · ${money(session.cost('hunt', bet))} por spin`;
  $('seed-renew').disabled = locked || session.host;
  $('balance-reset').disabled = locked || session.host;
  $('history-button').disabled = false;
  $('spin-label').textContent = auto.running ? 'Parar auto' : busy ? 'Em curso' : 'Rodar';
  $('spin').disabled = busy && !auto.running || estado === 'A_LIGAR' || estado === 'ERRO_FATAL';
  showBalance();
}

function status(text, error = false) { $('status-line').textContent = text; $('status-line').classList.toggle('error', error); }
// A narração de cada evento vai para o painel de diagnóstico e para o histórico (a faixa de texto saiu do ecrã).
function narrate(text) { if (text) emit('narracao', text); }

// ---------------------------------------------------------------------------
// Registo do free spin (coluna da esquerda durante o bónus). Limpa-se em cada free spin.
// Fase 2: blocos neutros com o símbolo e o cálculo; a Fase 3 dá-lhe os visuais finais (ver docs/estrutura-ui.md).
// ---------------------------------------------------------------------------
function miniCell(id, mult) {
  const el = document.createElement('span');
  el.className = 'mini-cell'; el.dataset.cat = categoria(id); el.dataset.sym = id;
  if (PREMIUM_COLOR[id]) el.style.setProperty('--pcolor', PREMIUM_COLOR[id]);
  const image = artImage(art, 'SYM-' + id);
  el.setAttribute('role', 'img'); el.setAttribute('aria-label', shortName(id) + (mult ? ' ×' + mult : ''));
  if (image) el.append(image); else el.textContent = id;
  if (mult) { const m = document.createElement('i'); m.textContent = '×' + mult; el.append(m); }
  return el;
}
function chip(persona) { const el = document.createElement('span'); el.className = 'p-chip'; el.style.setProperty('--pc', `var(--${persona})`); const portrait = artImage(art, 'CHR-' + PERSONA_ID[persona] + '-PORT'); if (portrait) el.append(portrait); el.append(document.createTextNode(persona)); return el; }
function logItem(kind, ...parts) {
  const li = document.createElement('li'); li.className = `log-item ${kind}`;
  for (const p of parts.filter(p => p != null)) li.append(typeof p === 'string' ? Object.assign(document.createElement('span'), { className: 'txt', textContent: p }) : p);
  $('event-log').prepend(li);
  if (!reduced()) clockAnimate(li, [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 160 });
}
function logEvent(e) {
  if (model.kind !== 'bonus') return;
  switch (e.type) {
    case 'step.start': $('event-log').replaceChildren(); break;
    case 'win.cluster': {
      const calc = document.createElement('b'); calc.className = 'calc';
      calc.textContent = clusterEquation(e, shownBet);
      logItem(`win${e.pay >= 20000 ? ' big' : ''}`, miniCell(e.symbol), `cluster ${e.size}${e.groupFinal ? ' · sticky' : ''}`, calc);
      break;
    }
    case 'persona.awaken': logItem('awaken', chip(e.persona), e.kind === 'refire' ? 'volta a disparar' : 'desperta'); break;
    case 'fusion.trigger': logItem('fusion', artImage(art, FUSION_ART[e.fusionId], 'log-fusion-art'), chip(e.pair[0]), chip(e.pair[1]), e.surprise ? `${fusionName(e.fusionId)} (surpresa)` : fusionName(e.fusionId)); break;
    case 'police.enter': logItem(`police ${e.mode}`, artImage(art, 'CHR-POL-' + e.mode.toUpperCase(), 'log-police-art') || Object.assign(document.createElement('span'), { className: 'badge-ico', textContent: '★' }), e.mode === 'calmer' ? 'CALMER' : 'JOINER'); break;
    case 'wild.place': if (e.source === 'DISTINTIVO') logItem('police joiner', miniCell('DW', e.multiplier), 'Joiner'); break;
    case 'corner.open': logItem('corner', miniCell('CW', e.multiplier), 'Canto aberto'); break;
    case 'chemistry.total': logItem('total', 'TOTAL CHEMISTRY'); break;
    default: break;
  }
}

function setBet(b) {
  if (busy || auto.running || !BETS.includes(b)) return;
  bet = b; shownBet = b; deck.setBet(b);
  try { localStorage.setItem('pp-aposta', String(b)); } catch { }
  if ($('buy-dialog').open) drawBuy();
  controls(); hud();
}

// ---------------------------------------------------------------------------
// Ritmo
// ---------------------------------------------------------------------------
function effectiveSpeed() { return speed; }
function applyRate(rampMs=0) {
  setRate(SPEED_RATES[speed]||1,{rampMs});
  deck.setTurbo(speed==='ultra');
  const labels={normal:'Normal',fast:'Rápido',ultra:'Turbo'},order=['normal','fast','ultra'];
  $('speed-button').setAttribute('aria-label',`Velocidade: ${labels[speed]}. Mudar para ${labels[order[(order.indexOf(speed)+1)%3]]}.`);
}

// ---------------------------------------------------------------------------
// Janelas de aviso (overlays)
// ---------------------------------------------------------------------------
let overlayOpenedAt = 0, spaceHeld = false, spaceHeldAtOpen = false, overlayResolve = null, lastOverlayClose = -Infinity;
let overlayCount = null;
function overlay({ kind = 'info', kicker = '', title, body = '', content = null, amountCents = null, button = 'CONTINUAR', autoMs = 0, winMils = null, bonusId = model.bonusId, fusionId = null }) {
  const d = $('overlay');
  d.dataset.kind = kind;
  d.dataset.fusion = fusionId || '';
  delete d.dataset.tier;
  $('overlay-kicker').textContent = kicker;
  $('overlay-title').textContent = title;
  $('overlay-body').innerHTML = body;
  if (content) $('overlay-body').prepend(content);
  $('overlay-amount').hidden = amountCents == null;
  $('overlay-amount').textContent = amountCents == null ? '' : money(amountCents);
  $('overlay-continue').textContent = button;
  $('overlay-continue').hidden = false;
  d.querySelector('.overlay-art')?.remove();
  const bonusKey = BONUS_ART[bonusId];
  const artId = kind === 'bonus' ? 'OVL-INTRO-' + bonusKey : kind === 'retrigger' ? 'OVL-RETRIGGER'
    : kind === 'fusion' ? FUSION_ART[fusionId] : kind === 'summary' ? 'EMB-' + bonusKey : kind === 'max' ? 'WIN-MAX' : kind === 'big' ? 'WIN-GRANDE' : null;
  mountArt(d, art, 'OVL-SUMMARY', 'overlay-frame-art');
  const decoration = artImage(art, artId, 'overlay-art') || (['bonus','retrigger'].includes(kind) ? artImage(art, 'EMB-' + bonusKey, 'overlay-art') : ['big','max'].includes(kind) ? artImage(art, 'WIN-MAX', 'overlay-art') : null);
  if (decoration) d.prepend(decoration);
  overlayOpenedAt = performance.now(); spaceHeldAtOpen = spaceHeld;
  fx.audio.ui('overlay');
  emit('overlay', { kind, title });
  return new Promise(resolve => {
    overlayResolve = resolve;
    if (!d.open) d.showModal();
    const count = amountCents != null && amountCents > 0 && ['big','summary'].includes(kind) && !reduced();
    if (count) {
      overlayCount = { reveal: false, resolve };
      if (kind === 'big') $('overlay-title').textContent = 'GANHO';
      d.dataset.counting = 'true';
      fx.audio.count(true);
      $('overlay-continue').hidden = true;
      const hint = document.createElement('p'); hint.className = 'overlay-count-hint'; hint.textContent = 'Toca para revelar o total'; d.append(hint);
      const started = clockNow(), duration = kind === 'summary' ? 1200 : winMils >= 100000 ? 2200 : winMils >= 50000 ? 1700 : 1300;
      const tick = async () => {
        while (overlayResolve === resolve && !overlayCount.reveal) {
          const p = Math.min(1, (clockNow() - started) / duration);
          const eased = 1 - (1 - p) ** 2;
          $('overlay-amount').textContent = money(Math.floor(amountCents * eased));
          fx.audio.countTick();
          if (winMils != null) {
            const tier = BIG_WIN.find(([min]) => winMils * eased >= min);
            if (tier) {
              $('overlay-title').textContent = tier[1];
              const key = tier[0] >= 100000 ? 'EPICO' : tier[0] >= 50000 ? 'ENORME' : 'GRANDE';
              const audioTier = key === 'EPICO' ? 'epic' : key === 'ENORME' ? 'huge' : 'big';
              if (d.dataset.tier !== audioTier) fx.audio.tier(audioTier);
              d.dataset.tier = audioTier;
              if (d.querySelector('.overlay-art')?.dataset.artId !== 'WIN-' + key && art.images.has('WIN-' + key)) mountArt(d, art, 'WIN-' + key, 'overlay-art');
            }
          }
          if (p >= 1) break;
          await clockWait(16, () => overlayResolve !== resolve || overlayCount?.reveal);
        }
        if (overlayResolve !== resolve) return;
        $('overlay-amount').textContent = money(amountCents);
        $('overlay-title').textContent = title;
        d.dataset.counting = 'false'; overlayCount = null; hint.remove();
        fx.audio.count(false);
        $('overlay-continue').hidden = false;
        $('overlay-continue').focus({ preventScroll: true });
      };
      tick();
    } else { d.dataset.counting = 'false'; if(kind==='big')fx.audio.tier(winMils>=100000?'epic':winMils>=50000?'huge':'big'); $('overlay-continue').focus({ preventScroll: true }); }
    clockAnimate(d, reduced() ? [{opacity:0},{opacity:1}] : [{opacity:0,transform:'translateY(8px) scale(.96)'},{opacity:1,transform:'none'}], {duration:reduced()?100:220});
    if (autoMs) clockWait(autoMs, () => overlayResolve !== resolve).then(async () => {
      while (overlayResolve === resolve) {
        if (closeOverlay()) break;
        await clockWait(50, () => overlayResolve !== resolve);
      }
    });
  });
}
function closeOverlay() {
  if (!overlayResolve || performance.now() - overlayOpenedAt < OVERLAY_GUARD_MS) return false;
  if (overlayCount) { overlayCount.reveal = true; return false; }
  const r = overlayResolve; overlayResolve = null;
  $('overlay').close(); lastOverlayClose = performance.now();
  r();
  return true;
}
$('overlay-continue').addEventListener('click', () => closeOverlay());
$('overlay').addEventListener('click', () => { if (overlayCount && performance.now() - overlayOpenedAt >= OVERLAY_GUARD_MS) overlayCount.reveal = true; });
$('overlay').addEventListener('cancel', ev => { ev.preventDefault(); closeOverlay(); });

const dialogsClosed = async () => { while ([...document.querySelectorAll('dialog[open]')].some(d => d.id !== 'overlay')) await clockWait(60); };

// ---------------------------------------------------------------------------
// Apresentação de um passo
// ---------------------------------------------------------------------------
const ctx = {
  get board() { return $('board'); }, get flash() { return $('board-flash'); }, cells,
  artImage: (id, cls) => artImage(art, id, cls), nextEventType: null, moreWinsInGroup: false,
  paintSymbol: (target,symbol) => paintSymbol(target,symbol,art),
  explainFusion,
  get persistentPolice() { return model.kind==='bonus'&&model.bonusId==='police'&&presentation.snapshot().party; },
  get repeatParty() { return repeatPoliceParty; },
  totalCornersIncrement:config.chemistry.totalSomaCantos||0,
  get model() { return model; }, before: null,
  render: () => render(model),
  tempo: { wait: clockWait, animate: clockAnimate, now: clockNow, get rate() { return currentRate(); } },
  get mode() { return model.kind === 'bonus' ? model.bonusId : currentMode(); },
  get speed() { return effectiveSpeed(); },
  get reduced() { return reduced(); },
  skip: () => fastForward,
  get bet() { return shownBet; },
  get scale() { return Number(getComputedStyle(document.documentElement).getPropertyValue('--game-scale')) || 1; },
  hud: () => hud(), narrate, money,
};
audio.log = text => emit('log', text);

async function presentStep(step) {
  // ganho acumulado antes deste passo (vale também para jogadas retomadas a meio)
  const before = step.roundWinSoFar - step.win;
  emit('step', step);
  for (const [eventIndex, e] of step.events.entries()) {
    ctx.nextEventType = step.events[eventIndex + 1]?.type ?? null;
    ctx.moreWinsInGroup = e.type === 'win.cluster' && step.events.slice(eventIndex + 1).find(next => next.type !== 'multiplier.change')?.type === 'win.cluster';
    await dialogsClosed();
    if (stepMode) await new Promise(r => { stepGate = r; emit('gate', e); });
    ctx.before = structuredClone({ ...model, groups: [], stickyW: [] });
    aplicar(model, e);
    if(e.type==='police.joiner.party_mode'&&model.kind==='bonus'&&model.bonusId==='police'){
      repeatPoliceParty=presentation.activateParty();savePresentation();
    }
    presentedEventType = e.type;
    if (e.type === 'step.start') { model.roundWin = before; if (e.kind === 'bonus' && e.freeSpins.played === 0) bonusWinStart = before; }
    narrate(narrar(e, model, shownBet));
    logEvent(e);
    emit('evento', e);
    fx.audio.play(e, ctx);
    await fx.visual.play(e, ctx);
    render(); hud();
    if (e.type === 'bonus.retrigger') await overlay({ kind: 'retrigger', autoMs: 10000, kicker: 'RETRIGGER', title: `+${e.added} FREE SPINS`, body: `<p>${e.scatters} Scatters. Agora são ${e.total} free spins no total.</p>` });
    if (e.type === 'cap.hit') await overlay({ kind: 'max', kicker: 'LIMITE ATINGIDO', title: 'GANHO MÁXIMO', body: `<p>Atingiste o ganho máximo de ${xBet(e.limit)} a aposta. A jogada termina aqui.</p>`, amountCents: winCents(model.roundWin, shownBet) });
  }
  if (step.kind === 'base' && !model.capped) {
    const tier = BIG_WIN.find(([min]) => step.win >= min);
    if (tier) await overlay({ kind: 'big', kicker: xBet(step.win) + ' A APOSTA', title: tier[1], amountCents: winCents(step.win, shownBet), winMils: step.win });
  }
}

function showFusionIndicator(e) {
  lastFusion=e.fusionId;
  const indicator=$('fusion-indicator');indicator.hidden=false;indicator.dataset.fusion=e.fusionId;
  indicator.dataset.activations=String(Number(indicator.dataset.activations||0)+1);
  mountArt(indicator.querySelector('.fusion-token'),art,FUSION_ART[e.fusionId],'fusion-token-art');
  indicator.querySelector('b').textContent=fusionName(e.fusionId);
  indicator.querySelector('small').textContent=e.pair.join(' + ');
  indicator.style.setProperty('--fusion-a',`var(--${e.pair[0]})`);
  indicator.style.setProperty('--fusion-b',`var(--${e.pair[1]})`);
  if(!reduced())clockAnimate(indicator,[{opacity:.5,transform:'scale(.97)'},{opacity:1,transform:'none'}],{duration:220});
  hud();
}

async function explainFusion(e) {
  showFusionIndicator(e);
  if(!presentation.shouldExplain(e.fusionId,inBonus))return;
  savePresentation();
  await overlay({kind:'fusion',fusionId:e.fusionId,kicker:e.surprise?'FUSÃO SURPRESA':e.initial?'FUSÃO ATIVA':'FUSÃO ATIVADA',title:fusionName(e.fusionId),
    content:personaBriefing(e.pair,'PAR DA FUSÃO'),
    body:`<section class="fusion-explanation"><h3>Descrição da fusão ativa</h3>${fusionBrief(e.fusionId)}${e.surprise?'<p class="note">Não desperta personagens.</p>':''}</section>`});
}

function personaBriefing(personas, label = 'PERSONAGENS ATIVAS') {
  const section=document.createElement('section');section.className='persona-briefing';section.setAttribute('aria-label',label);
  const heading=document.createElement('h3');heading.textContent=label;section.append(heading);
  const cards=document.createElement('div');cards.className='briefing-cards';
  for(const persona of personas||[]){
    const card=document.createElement('figure');card.dataset.persona=persona;card.style.setProperty('--pc',`var(--${persona})`);
    const portrait=artImage(art,'CHR-'+PERSONA_ID[persona]+'-PORT','briefing-portrait');if(portrait)card.append(portrait);
    const caption=document.createElement('figcaption');const name=document.createElement('b');name.textContent=persona;
    const power=document.createElement('span');power.textContent=POWER_NAME[persona];caption.append(name,power);card.append(caption);cards.append(card);
  }
  if(!personas?.length){const empty=document.createElement('p');empty.textContent='A festa começa sem personagens despertas. Os clusters de 5+ vão ativá-las.';cards.append(empty);}
  section.append(cards);return section;
}

async function entradaBonus(step, resumed) {
  const start = step.events[0];
  const b = config.bonus[step.bonusId];
  await overlay({
    kind: 'bonus', bonusId: step.bonusId, kicker: resumed ? 'A RETOMAR O BÓNUS' : `${start.freeSpins.total} FREE SPINS`, title: b.nome,
    content:personaBriefing(start.awake),
    body: `<section class="bonus-rules"><h3>Como funciona este bónus</h3>${bonusBrief(step.bonusId)}${resumed ? `<p>Já jogaste ${start.freeSpins.played} de ${start.freeSpins.total} rodadas grátis.</p>` : ''}</section>`,
  });
  for(const id of start.fused||[]){const f=config.fusions.find(f=>f.id===id);if(f)await explainFusion({fusionId:id,pair:f.par,initial:true});}
}

// ---------------------------------------------------------------------------
// Jogada
// ---------------------------------------------------------------------------
async function runRound({ mode = currentMode(), resume = false, demo = null } = {}) {
  if (busy) return;
  const scenarioName = demo ? (demo.name ?? (demo.seed != null ? `seed ${demo.seed} · ${demo.mode}` : 'fixture')) : null;
  busy = true; forced = Boolean(demo);
  const sess = demo ? new DemoSession({ ...demo, bet }) : session;
  let info = null;
  try {
    if (MIN_CYCLE_MS > 0) { const gap = MIN_CYCLE_MS - (performance.now() - lastCycleStart); if (gap > 0) await clockWait(gap); }
    lastCycleStart = performance.now();
    applyRate(0);
    if (!resume) transitar('A_PEDIR');
    $('board-flash').replaceChildren();
    // Arranque imediato: a grelha começa a sair enquanto o pedido segue para a carteira.
    let exit = null;
    if (!resume && (mode === 'base' || mode === 'hunt') && !scenarioName && !reduced())
      exit = Promise.all(cells.map(el => clockAnimate(el, [{ opacity: 1 }, { opacity: .15, transform: 'translateY(10px)' }], { duration: 140, fill: 'forwards' })?.finished.catch(() => {})));
    const round = resume ? sess.round : await sess.start({ mode, bet });
    let savedPresentation={};
    if(resume&&!demo)try{const saved=JSON.parse(sessionStorage.getItem('pp-visual-bonus')||'null');if(saved?.round===round.id)savedPresentation=saved;}catch{}
    presentation=createPresentationState(savedPresentation);presentationRound=round.id;lastFusion=null;repeatPoliceParty=false;
    $('fusion-indicator').hidden=true;$('fusion-indicator').dataset.activations='0';
    savePresentation();
    saiDePendente();
    if (!scenarioName) heldBalance = session.balance;
    if (resume) bet = round.bet;
    shownBet = round.bet; deck.setBet(round.bet); if (resume && round.mode === 'hunt') hunt = true;
    info = { id: round.id, at: Date.now(), bet: round.bet, cost: round.cost, mode: round.mode, version: MATH_VERSION, forced: Boolean(scenarioName), resumed: resume, steps: [] };
    if (exit) await exit;
    if (!resume && mode.startsWith('buy-')) await fx.visual.buy(ctx, mode.slice(4), round.id, Number(Object.entries(config.activation).find(([, id]) => id === mode.slice(4))?.[0]));
    for (const el of cells) el.getAnimations().forEach(a => a.cancel());
    model = novoModelo(); inBonus = false; bonusWinStart = 0;
    if (demo?.name) { const pre = (await import('../src/scenarios.js')).SCENARIOS[demo.name]?.force?.preAwake; if (pre) emit('log', `cenário: personagens já despertas ${pre.join(', ')}`); }
    controls(); hud();
    transitar('A_APRESENTAR');
    let last = false, total = null;
    while (!last) {
      const got = await sess.step();
      saiDePendente();
      const step = got.step; last = got.last; total = got.totalWin;
      info.steps.push(step);
      if (step.kind === 'bonus' && !inBonus) {
        inBonus = true; transitar('ENTRADA_BONUS');
        fx.audio.mode(step.bonusId);
        await entradaBonus(step, resume && info.steps.length === 1 && step.events[0].freeSpins.played > 0);
        transitar('FREE_SPINS');
      } else if (step.kind === 'bonus') transitar('FREE_SPINS');
      else transitar('A_APRESENTAR');
      applyRate(0);
      await presentStep(step);
      if (!last) await clockWait(fastForward ? 0 : 160, () => fastForward);
    }
    const winMils = model.roundWin;
    if (inBonus) {
      transitar('RESUMO_BONUS');
      const end = info.steps.at(-1).events.find(e => e.type === 'bonus.end');
      await overlay({ kind: 'summary', kicker: 'RESUMO DO BÓNUS', title: BONUS_NAME[info.steps.at(-1).bonusId] ?? 'BÓNUS',
        body: `<p>${end?.spins ?? info.steps.filter(s => s.kind === 'bonus').length} free spins jogados.</p><p>Ganho no bónus: <b>${money(winCents(winMils - bonusWinStart, shownBet))}</b> (${xBet(winMils - bonusWinStart)})</p>${bonusWinStart ? `<p>Spin de entrada: ${money(winCents(bonusWinStart, shownBet))}</p>` : ''}`,
        amountCents: total ?? winCents(winMils, shownBet) });
      fx.audio.mode(currentMode());
    }
    transitar('A_CONFIRMAR');
    // Confirmação: o prémio só entra no saldo mostrado no fim da apresentação.
    if (!scenarioName) {
      const from = heldBalance ?? session.balance;
      heldBalance = null;
      await countBalance(from, session.balance);
    }
    info.win = total ?? winCents(winMils, shownBet); info.winMils = winMils;
    if (info.win !== winCents(winMils, shownBet)) console.error('[pp] o prémio creditado não bate com a soma dos eventos', info.win, winMils);
    guardarJogada(info);
    emit('jogada', info);
    narrate(scenarioName ? `Cenário «${scenarioName}» terminado. O saldo não mudou.` : info.win ? `Jogada terminada: prémio ${money(info.win)} (${xBet(winMils)}).` : 'Jogada terminada sem prémio.');
    transitar('PRONTO');
  } catch (error) {
    stopAuto();
    await handleError(error, info);
  } finally {
    busy = false; forced = false; heldBalance = null;
    fx.audio.stop();
    for (const el of cells) el.getAnimations().forEach(a => a.cancel());
    applyRate(0);
    controls(); hud();
  }

}

async function countBalance(from, to) {
  if (from === to || reduced()) { deck.setBalance(to); showBalance(); return; }
  const steps = 12;
  for (let i = 1; i <= steps; i++) { deck.setBalance(Math.round(from + (to - from) * i / steps)); await clockWait(fastForward ? 0 : 25); }
  showBalance();
}

async function handleError(error, info) {
  const code = error?.code;
  console.warn('[pp] erro na jogada', code, error?.message);
  if (code === 'INSUFFICIENT_BALANCE') {
    if (estado !== 'SALDO_INSUFICIENTE') transitar('SALDO_INSUFICIENTE');
    status(error.message || 'Saldo insuficiente.', true);
    narrate('Saldo insuficiente para esta jogada. Baixa a aposta ou desliga a aposta extra.');
    transitar('PRONTO');
    return;
  }
  transitar('ERRO_FATAL');
  status(error?.message || String(error), true);
  const recoverable = session.host || session.active;
  await overlay({ kind: 'error', kicker: 'ERRO', title: session.host ? 'Ligação ao casino' : 'Não foi possível continuar',
    body: `<p>${(error?.message || 'Erro inesperado.').replace(/[<>&]/g, '')}</p><p>${session.active ? 'A jogada está guardada: ao recuperar, retoma no passo confirmado sem novo débito.' : 'O saldo não foi alterado por esta tentativa.'}</p>`,
    button: recoverable ? 'RECUPERAR' : 'CONTINUAR' });
  transitar('A_LIGAR');
  queueMicrotask(() => connect());
}

// ---------------------------------------------------------------------------
// Comandos: spin, toques durante o spin, autoplay, ESPAÇO
// ---------------------------------------------------------------------------
function spinNow() {
  if (busy || estado !== 'PRONTO' || document.querySelector('dialog[open]')) return;
  if (session.balance < session.cost(currentMode(), bet)) {
    transitar('SALDO_INSUFICIENTE'); status('Saldo insuficiente para esta jogada.', true);
    narrate('Saldo insuficiente para esta jogada. Baixa a aposta ou desliga a aposta extra.');
    transitar('PRONTO'); stopAuto(); return;
  }
  status('');
  fx.audio.unlock();
  return runRound({ mode: currentMode() });
}

/** Spin (botão, toque ou ESPAÇO). Fora de uma jogada roda; durante a jogada acelera/salta; com auto, para. */
function pressSpin() {
  const t = performance.now();
  if (t - lastSpinCommand < SPIN_GUARD_MS) return;
  lastSpinCommand = t;
  fx.audio.ui('spin-press');
  if (auto.running) { stopAuto(); return; }
  if (!busy) spinNow();
}

function stopAuto() {
  if (!auto.running) return;
  auto.cancel = true; auto.remaining = 0;
  controls();
}
async function startAuto(count) {
  if (busy || auto.running) return;
  auto = { running: true, remaining: count, cancel: false, played: 0 };
  controls();
  try {
    while (auto.remaining > 0 && !auto.cancel) {
      if (session.balance < session.cost(currentMode(), bet)) { status('Autoplay parado: saldo insuficiente.', true); break; }
      auto.remaining--; controls();
      await runRound({ mode: currentMode() });   // só spins pagos contam para o lote
      auto.played++;
      emit('auto', { ...auto });
      if (estado !== 'PRONTO') break;
      if (!auto.cancel && auto.remaining) await clockWait(80);
    }
  } finally { auto = { running: false, remaining: 0, cancel: false }; controls(); }
}

const typingIn = t => t?.closest?.('input,select,textarea,[contenteditable=true]');
document.addEventListener('keydown', ev => {
  if (ev.code !== 'Space') return;
  if (typingIn(ev.target)) return;               // campos focados têm prioridade
  const overlayOpen = $('overlay').open;
  const otherDialog = [...document.querySelectorAll('dialog[open]')].some(d => d.id !== 'overlay');
  if (otherDialog) return;                        // nas janelas (regras, compras…) o espaço é do botão focado
  ev.preventDefault();
  const fresh = !ev.repeat && !spaceHeld;
  spaceHeld = true;
  if (overlayOpen) {
    // CONTINUAR: só com um toque novo (a tecla que abriu/está premida nunca passa para o ecrã seguinte)
    if (fresh && !spaceHeldAtOpen) closeOverlay();
    return;
  }
  if (!fresh) return;
  if (performance.now() - lastOverlayClose < OVERLAY_GUARD_MS) return;
  pressSpin();
});
document.addEventListener('keyup', ev => {
  if (ev.code !== 'Space') return;
  spaceHeld = false; spaceHeldAtOpen = false;
  if (!typingIn(ev.target) && ![...document.querySelectorAll('dialog[open]')].some(d => d.id !== 'overlay')) ev.preventDefault();
});
addEventListener('blur', () => { spaceHeld = false; });

// ---------------------------------------------------------------------------
// Aposta extra, compras, regras, histórico, definições, ecrã inteiro
// ---------------------------------------------------------------------------
$('hunt-button').addEventListener('click', () => {
  if (busy || auto.running) return;
  hunt = !hunt;
  fx.audio.ui(hunt ? 'hunt-on' : 'hunt-off'); fx.audio.mode(currentMode());
  narrate(hunt ? `MAIS SCATTERS ligado: cada spin custa ${money(session.cost('hunt', bet))} (${xBet(config.modes.hunt.costMils)} a aposta).` : 'MAIS SCATTERS desligado.');
  controls(); hud();
});

const BUY = [['buy-afterparty', 'afterparty'], ['buy-vip', 'vip'], ['buy-police', 'police']];
let buyPending = null;
async function closePurchaseDialog(dialog) {
  if (!dialog.open) return;
  const animation=clockAnimate(dialog,reduced()?[{opacity:1},{opacity:0}]:[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(8px) scale(.98)'}],{duration:reduced()?70:140});
  try { await animation?.finished; } catch {} finally { animation?.cancel(); dialog.close(); }
}
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('toggle', () => {
  if (dialog.open && dialog.id !== 'overlay') clockAnimate(dialog,reduced()?[{opacity:0},{opacity:1}]:[{opacity:0,transform:'translateY(10px) scale(.97)'},{opacity:1,transform:'none'}],{duration:reduced()?90:190});
});
function drawBuy() {
  $('buy-bet').textContent = money(bet);
  $('buy-bet-minus').disabled = BETS.indexOf(bet) === 0;
  $('buy-bet-plus').disabled = BETS.indexOf(bet) === BETS.length - 1;
  $('buy-cards').replaceChildren(...BUY.map(([mode, id]) => {
    const b = config.bonus[id], cost = session.cost(mode, bet);
    const card = document.createElement('article');
    card.className = 'buy-card'; card.dataset.mode = mode;
    const scat = Object.entries(config.activation).find(([, v]) => v === id)?.[0];
    card.innerHTML = `<h3>${b.nome}</h3><p>${scat} Scatters · ${b.spins} free spins</p><ul>
      <li>${b.personagensIniciais} ${b.personagensIniciais === 1 ? 'personagem desperta' : 'personagens despertas'} no início${b.personagensIniciais >= 2 ? ', fusão ativa' : ''}</li>
      <li>${b.cantosIniciais} Party Corners abertos</li>
      <li>Wild de Canto ${b.cantosPersistemMultiplicador ? 'persiste entre spins' : 'volta a ×' + b.multCantoInicial}</li>
      <li>${b.joinerEmTodosOsSpins ? 'Joiner em todos os spins' : `Joiner ${config.police.probJoiner[id]} % quando o Peace Police aparece`}</li></ul>
      <span class="price">${money(cost)}</span><small>${xBet(config.modes[mode].costMils)} a aposta</small>`;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.buy = mode;
    btn.disabled = session.balance < cost || busy || auto.running;
    btn.textContent = session.balance < cost ? 'Saldo insuficiente' : 'Comprar';
    btn.addEventListener('click', async () => {
      if (buyPending) return;
      buyPending = { mode, bet, cost };
      await closePurchaseDialog($('buy-dialog'));
      $('buy-confirm-title').textContent = b.nome;
      $('buy-confirm-price').textContent = money(cost);
      $('buy-confirm-text').textContent = `${b.spins} free spins · ${scat} Scatters de entrada · aposta base ${money(bet)}.`;
      mountArt($('buy-confirm-emblem'), art, 'EMB-' + BONUS_ART[id], 'confirmation-art');
      $('buy-ok').disabled = false;
      $('buy-confirm').showModal();
      $('buy-cancel').focus();
    });
    mountArt(card, art, 'EMB-' + BONUS_ART[id], 'buy-emblem');
    card.append(btn);
    return card;
  }));
}
$('buy-button').addEventListener('click', () => { if (busy || auto.running) return; fx.audio.ui('dialog-open'); buyPending = null; drawBuy(); $('buy-dialog').showModal(); });
$('buy-bet-minus').addEventListener('click', () => setBet(BETS[Math.max(0, BETS.indexOf(bet) - 1)]));
$('buy-bet-plus').addEventListener('click', () => setBet(BETS[Math.min(BETS.length - 1, BETS.indexOf(bet) + 1)]));
async function cancelPurchase() {
  if (!buyPending) return;
  buyPending = null;
  await closePurchaseDialog($('buy-confirm'));
  if (!busy && !auto.running && estado === 'PRONTO') { drawBuy(); $('buy-dialog').showModal(); }
}
$('buy-cancel').addEventListener('click', cancelPurchase);
$('buy-confirm').addEventListener('cancel', ev => { ev.preventDefault(); cancelPurchase(); });
$('buy-ok').addEventListener('click', async () => {
  if (!$('buy-confirm').open) return;
  const pending = buyPending; buyPending = null;
  if (!pending || busy || auto.running || estado !== 'PRONTO') return;
  const { mode } = pending;
  $('buy-ok').disabled = true;
  await closePurchaseDialog($('buy-confirm')); fx.audio.ui('buy');
  if (pending.bet !== bet || pending.cost !== session.cost(mode, bet)) { status('A compra mudou. Volta a selecionar o bónus.', true); return; }
  if (session.balance < session.cost(mode, bet)) { status('Saldo insuficiente para esta compra.', true); return; }
  runRound({ mode });
});

const rules = montarRegras($('rules-tabs'), $('rules-body'), () => bet, () => art);
function openRules() { rules.refresh(); $('rules-dialog').showModal(); fx.audio.ui('dialog-open'); }
$('history-button').addEventListener('click', () => { desenharHistorico($('history-body')); $('history-dialog').showModal(); fx.audio.ui('dialog-open'); });
$('settings-button').addEventListener('click', () => { $('seed-value').textContent = session.host ? '— (carteira do site)' : session.seed; $('reduced-motion').checked = reduced(); $('settings-dialog').showModal(); fx.audio.ui('dialog-open'); });
$('reduced-motion').addEventListener('change', ev => { reducedPref = ev.target.checked ? '1' : '0'; try { localStorage.setItem('pp-movimento-reduzido', reducedPref); } catch { } document.body.dataset.reduced = String(reduced()); });
$('seed-renew').addEventListener('click', () => { if (busy || session.host) return; $('seed-value').textContent = session.renewSeed(); emit('log', `seed renovada: ${session.seed}`); });
$('balance-reset').addEventListener('click', () => { if (busy || session.host) return; session.resetBalance(); controls(); });
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { fx.audio.ui('dialog-close'); b.closest('dialog').close(); }));
for (const d of document.querySelectorAll('dialog.big, dialog.small:not(#buy-confirm)')) d.addEventListener('click', ev => { if (ev.target === d) { const r = d.getBoundingClientRect(); if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) d.close(); } });

const fsButton = $('fullscreen-button');
const fsElement = () => document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
fsButton.hidden = !(document.fullscreenEnabled || document.webkitFullscreenEnabled);
fsButton.addEventListener('click', async () => {
  try {
    const root = document.documentElement;
    if (fsElement()) await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
    else await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
  } catch { status('O navegador não permitiu o ecrã inteiro.'); }
});
document.addEventListener('webkitfullscreenchange', () => document.dispatchEvent(new Event('fullscreenchange')));
document.addEventListener('fullscreenchange', () => { const on = Boolean(fsElement()); fsButton.setAttribute('aria-pressed', String(on)); fsButton.setAttribute('aria-label', on ? 'Sair do ecrã inteiro' : 'Ecrã inteiro'); });
document.addEventListener('pointerdown', () => fx.audio.unlock(), { once: true });
document.addEventListener('keydown', () => fx.audio.unlock(), { once: true });

// ---------------------------------------------------------------------------
// Ligação à carteira e retoma
// ---------------------------------------------------------------------------
async function connect() {
  if (estado !== 'A_LIGAR') transitar('A_LIGAR');
  status(session.host ? 'A ligar à carteira do casino…' : '');
  try {
    const r = await session.connect();
    saiDePendente();
    if (estado === 'CARTEIRA_PENDENTE') transitar('A_LIGAR');
    if (r.notice) status(r.notice);
    if (session.active) {
      narrate('A retomar a jogada guardada no passo confirmado…');
      estado = 'PRONTO'; // a retoma entra diretamente na apresentação (sem novo pedido nem débito)
      document.body.dataset.estado = estado;
      await runRound({ resume: true });
    } else {
      transitar('PRONTO');
      if (!r.notice) status('');
    }
  } catch (error) {
    if (estado === 'CARTEIRA_PENDENTE') transitar('A_LIGAR');
    transitar('ERRO_FATAL');
    status(error.message || 'Sem ligação à carteira.', true);
    await overlay({ kind: 'error', kicker: 'ERRO', title: 'Sem ligação à carteira', body: '<p>Não foi possível ligar à carteira. Tenta de novo.</p>', button: 'TENTAR DE NOVO' });
    transitar('A_LIGAR');
    queueMicrotask(() => connect());
  }
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
document.body.dataset.reduced = String(reduced());
startGrid(); hud(); controls();
const layout = installLayout({ force: ['portrait', 'landscape', 'compact'].includes(params.get('layout')) ? params.get('layout') : null });
applyRate(0);

// API para o painel de diagnóstico e para os testes (sem efeitos no saldo do site).
window.pp = {
  get estado() { return estado; }, get transicoes() { return [...historicoEstados]; }, get pedidos() { return pedidosPagos; },
  get model() { return model; }, get session() { return session; }, get busy() { return busy; },
  get auto() { return { ...auto }; }, get bet() { return bet; }, get hunt() { return hunt; },
  get balanceShown() { return Number(document.documentElement.dataset.casinoBalance); },
  get rate() { return currentRate(); }, get turbo() { return speed==='ultra'; },
  get art() { return { total: art.total, loaded: art.images.size, failures: [...art.failures] }; },
  get audio() { return fx.audio.diagnostics; },
  config, on, layout, MATH_VERSION, MIN_CYCLE_MS, TURBO_ALLOWED, HOLD_TO_SPIN,
  setBet, spin: () => pressSpin(),
  runScenario(name) { if (busy || auto.running || estado !== 'PRONTO') return false; runRound({ demo: { name } }); return true; },
  runSeed(mode, seed) { if (busy || auto.running || estado !== 'PRONTO') return false; runRound({ demo: { mode, seed } }); return true; },
  // Só nos testes de interface (?debug=1): apresenta um resultado já calculado, sem saldo.
  runResult(result) { if (params.get('debug') !== '1' || busy || auto.running || estado !== 'PRONTO') return false; runRound({ demo: { result, name: 'fixture de teste' } }); return true; },
  setStepMode(onoff) { stepMode = Boolean(onoff); if (!stepMode && stepGate) { const g = stepGate; stepGate = null; g(); } },
  advance() { if (stepGate) { const g = stepGate; stepGate = null; g(); } },
  renewSeed(seed) { if (busy || session.host) return null; return session.renewSeed(seed); },
};
if (params.get('debug') === '1' || params.get('perf') === '1') import('./debug.js').then(m => m.installDebug(window.pp, { full: params.get('debug') === '1' }));
async function prepareArt() {
  const loading = $('art-loading'), progress = $('art-progress'), count = $('art-count');
  loading.hidden = false;
  loading.querySelector('.art-retry')?.remove();
  try {
    art = await loadArt(document.querySelector('meta[name="pp-art-manifest"]')?.content, {
      onProgress({ completed, total }) {
        progress.max = total || 1; progress.value = total ? completed : 1;
        count.textContent = total ? completed + ' / ' + total : 'Sem imagens publicadas';
      },
    });
    // Invalidate cached cells once, after the entire catalogue has decoded.
    for (const cell of cells) delete cell.dataset.key;
    for (const p of PERSONAS) paintPortrait(chemEls[p], p, art);
    mountArt($('hunt-button'), art, 'EMB-HUNT', 'hunt-emblem');
    mountArt(document.querySelector('.brand'), art, 'LOGO', 'brand-art');
    const favicon = art.images.get('ICON-APP-32');
    if (favicon) { const icon = document.querySelector('link[rel=icon]'); icon.href = favicon.src; icon.type = 'image/webp'; icon.sizes = '32x32'; }
    const touchIcon = art.images.get('ICON-APP-192');
    if (touchIcon && !document.querySelector('link[rel=apple-touch-icon]')) { const link = document.createElement('link'); link.rel = 'apple-touch-icon'; link.href = touchIcon.src; link.sizes = '192x192'; document.head.append(link); }
    rules.refresh(); hud();
    render();
  } catch {
    art.failures.push('manifest');
  } finally {
    loading.hidden = true;
  }
  if (art.failures.length) {
    loading.hidden = false;
    count.textContent = 'Não foi possível preparar a arte. Tenta novamente.';
    const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'primary art-retry'; retry.textContent = 'TENTAR NOVAMENTE'; loading.append(retry); retry.focus();
    await new Promise(resolve => retry.addEventListener('click', resolve, { once: true }));
    return prepareArt();
  }
  await showIntro(art);
  await connect();
}
prepareArt();
