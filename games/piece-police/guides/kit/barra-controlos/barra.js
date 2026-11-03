/**
 * Barra de controlos padrão das slots (modelo aprovado: Princesa Sofia).
 *
 * O componente desenha SEMPRE a mesma estrutura (saldo, ganho, aposta, regras, som, − RODAR +, aba Autoplay,
 * velocidade, janela do Autoplay) e trata do comportamento da própria barra. Não sabe nada da matemática
 * nem do saldo: comunica intenções ao jogo por callbacks e o jogo devolve o estado com os métodos set*.
 * Aspeto: barra.css + um tema que só redefine variáveis --deck-* (ver tema-sofia.css).
 *
 * Uso:
 *   import { createControlDeck } from './barra.js';
 *   const deck = createControlDeck(document.querySelector('#deck-slot'), {
 *     bets: [20, 40, 100, 200],  bet: 100,  currency: 'DJC',  storageKey: 'nome-do-jogo',
 *     onSpin, onBetChange, onAutoStart, onAutoStop, onSpeedChange, onVolumeChange, onRules, onUiSound,
 *     canAutoStart: count => true,
 *   });
 *   deck.setBalance(1000000); deck.setWin(250, 2.5); deck.setCost(100); deck.setState({ running: true });
 */

export const AUTO_SPIN_COUNTS = Object.freeze([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500]);
export const SPEED_ORDER = Object.freeze(['normal', 'fast', 'ultra']);
const SPEED_LABELS = { normal: 'Normal', fast: 'Rápido', ultra: 'Ultra' };
const SPARK = '<path id="deck-spark" d="M0-3.2 .75-.75 3.2 0 .75.75 0 3.2-.75.75-3.2 0-.75-.75Z"/>';

const sprite = signature => `<svg class="deck-sprite" aria-hidden="true" focusable="false"><defs>${signature}</defs>
<symbol id="deck-i-info" viewBox="0 0 24 24"><circle cx="12" cy="12.5" r="8.6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="8.4" r="1.25" fill="currentColor"/><path d="M12 11.4v5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><use href="#deck-spark" transform="translate(19.6 4.2) scale(.8)" fill="currentColor"/></symbol>
<symbol id="deck-i-sound" viewBox="0 0 24 24"><path d="M9.5 17.2V6.1l9-2.2v11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="7.3" cy="17.4" rx="2.6" ry="2.1" fill="currentColor"/><ellipse cx="16.3" cy="15.2" rx="2.6" ry="2.1" fill="currentColor"/><use href="#deck-spark" transform="translate(4.6 5.4) scale(.75)" fill="currentColor"/></symbol>
<symbol id="deck-i-sound-off" viewBox="0 0 24 24"><g opacity=".55"><path d="M9.5 17.2V6.1l9-2.2v11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="7.3" cy="17.4" rx="2.6" ry="2.1" fill="currentColor"/><ellipse cx="16.3" cy="15.2" rx="2.6" ry="2.1" fill="currentColor"/></g><path d="M4 4l16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
<symbol id="deck-i-spin" viewBox="0 0 24 24"><path d="M19.1 9.2A7.6 7.6 0 1 0 19.6 14" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><path d="M20.2 4.6l-.9 4.9-4.8-1.1" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><use href="#deck-spark" transform="translate(12 12.2) scale(1.05)" fill="currentColor"/></symbol>
<symbol id="deck-i-minus" viewBox="0 0 24 24"><path d="M6.5 12h11" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></symbol>
<symbol id="deck-i-plus" viewBox="0 0 24 24"><path d="M6.5 12h11M12 6.5v11" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></symbol></svg>`;

const icon = id => `<svg class="ui-icon" aria-hidden="true" focusable="false"><use href="#deck-i-${id}"/></svg>`;

const template = ({ currency }) => `
<section class="control-deck" aria-label="Controlos do jogo">
  <div class="deck-left">
    <button id="rules-button" class="deck-round" type="button" aria-label="Regras" aria-haspopup="dialog">${icon('info')}</button>
    <div class="volume-control">
      <button id="mute-button" class="deck-round" type="button" aria-label="Desativar som" aria-pressed="false">${icon('sound')}</button>
      <div class="volume-sliders">
        <label class="volume-row"><span class="volume-tag" aria-hidden="true">Música</span><span class="sr-only">Volume da música</span><input id="volume-music" type="range" min="0" max="100" value="35"></label>
        <label class="volume-row"><span class="volume-tag" aria-hidden="true">Efeitos</span><span class="sr-only">Volume dos efeitos</span><input id="volume-sfx" type="range" min="0" max="100" value="35"></label>
      </div>
      <output id="volume-value" class="sr-only">Música 35%, efeitos 35%</output>
    </div>
    <div class="money-block"><span class="eyebrow">SALDO</span><strong id="balance">—</strong></div>
    <section class="result-panel"><span class="eyebrow">GANHO</span><strong id="win">0,00 <small>${currency}</small></strong><span id="win-multiple" class="sr-only">0× a aposta</span></section>
    <section class="bet-panel"><span class="eyebrow">APOSTA</span><strong id="bet-amount">—</strong></section>
  </div>
  <div class="deck-right">
    <div class="spin-controls">
      <button id="bet-minus" class="deck-round step" type="button" aria-label="Diminuir aposta">${icon('minus')}</button>
      <button id="spin" class="spin-button" type="button"><span class="spin-symbol" aria-hidden="true">${icon('spin')}</span><span id="spin-label" class="sr-only">Rodar</span><small id="spin-cost"></small></button>
      <button id="bet-plus" class="deck-round step" type="button" aria-label="Aumentar aposta">${icon('plus')}</button>
      <button id="auto-button" class="auto-button" type="button" aria-haspopup="dialog">Autoplay</button>
    </div>
    <div class="speed-control"><button id="speed-button" type="button" data-speed="normal" aria-label="Velocidade: Normal. Mudar para Rápido."><span class="speed-stars" aria-hidden="true"><span class="active"></span><span></span><span></span></span><span id="speed-label">Normal</span></button></div>
  </div>
</section>
<dialog id="auto-dialog" aria-label="Autoplay"><div class="dialog-body">
  <output id="auto-count" class="auto-count" for="auto-range">50 <small>spins</small></output>
  <label class="sr-only" for="auto-range">Quantidade de spins pagos</label>
  <input id="auto-range" type="range" min="0" max="${AUTO_SPIN_COUNTS.length - 1}" step="1" value="4" aria-valuetext="50 spins">
  <div class="auto-actions"><button type="button" data-auto-cancel>Cancelar</button><button id="auto-start" class="primary" type="button">Iniciar</button></div>
</div></dialog>`;

const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { } },
};

export function createControlDeck(container, options = {}) {
  const {
    bets = [100], currency = 'DJC', storageKey = 'slot', unitsPerCredit = 100, signature = SPARK,
    onSpin = () => {}, onBetChange = () => {}, onAutoStart = () => {}, onAutoStop = () => {},
    onSpeedChange = () => {}, onVolumeChange = () => {}, onRules = () => {}, onUiSound = () => {},
    canAutoStart = () => true,
  } = options;
  if (!bets.length) throw new Error('A barra precisa de pelo menos uma aposta.');
  const number = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const compact = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
  const money = units => `${number.format(units / unitsPerCredit)} ${currency}`;

  container.insertAdjacentHTML('beforeend', sprite(signature) + template({ currency }));
  const q = id => container.querySelector('#' + id);
  const deckEl = container.querySelector('.control-deck'), dialog = q('auto-dialog');

  let bet = bets.includes(options.bet) ? options.bet : bets[0];
  let state = { running: false, autoRunning: false, locked: false, ready: true };
  let speed = 'normal', cost = null;
  const volume = { music: 35, sfx: 35, muted: false, ...(store.get(`${storageKey}-volume`) || {}) };

  const paint = input => { const min = +input.min || 0, max = +input.max || 100; input.style.setProperty('--fill', `${((+input.value - min) / (max - min || 1)) * 100}%`); };
  const autoCount = () => AUTO_SPIN_COUNTS[+q('auto-range').value];

  function refresh() {
    const { running, autoRunning, locked, ready } = state;
    const blocked = running || autoRunning || locked || !ready;
    q('spin').disabled = !ready;
    q('bet-minus').disabled = blocked || bets.indexOf(bet) === 0;
    q('bet-plus').disabled = blocked || bets.indexOf(bet) === bets.length - 1;
    q('auto-button').disabled = !ready || (running && !autoRunning);
    q('auto-button').textContent = autoRunning ? 'Parar auto' : 'Autoplay';
    q('spin-label').textContent = autoRunning ? 'Parar auto' : running ? 'Acelerar' : 'Rodar';
    q('spin-cost').textContent = running || cost == null ? '' : money(cost);
    q('bet-amount').innerHTML = `${number.format(bet / unitsPerCredit)} <small>${currency}</small>`;
  }
  function applyVolume(notify = true) {
    q('volume-music').value = volume.music; q('volume-sfx').value = volume.sfx;
    paint(q('volume-music')); paint(q('volume-sfx'));
    q('volume-value').textContent = `Música ${volume.music}%, efeitos ${volume.sfx}%`;
    const mute = q('mute-button');
    mute.setAttribute('aria-pressed', String(volume.muted));
    mute.setAttribute('aria-label', volume.muted ? 'Ativar som' : 'Desativar som');
    mute.classList.toggle('muted', volume.muted);
    mute.querySelector('use').setAttribute('href', volume.muted ? '#deck-i-sound-off' : '#deck-i-sound');
    store.set(`${storageKey}-volume`, volume);
    // Curva quadrática: o meio da barra soa a "meio" para o ouvido.
    if (notify) onVolumeChange({ music: (volume.music / 100) ** 2, sfx: (volume.sfx / 100) ** 2, muted: volume.muted });
  }
  function autoDetails() {
    const count = autoCount();
    q('auto-count').innerHTML = `${count} <small>spins</small>`;
    q('auto-range').setAttribute('aria-valuetext', `${count} spins`); paint(q('auto-range'));
    q('auto-start').disabled = !canAutoStart(count);
  }
  function placeDialog() {
    if (!dialog.open) return;
    const anchor = q('auto-button').getBoundingClientRect(), top = container.querySelector('.spin-controls').getBoundingClientRect().top;
    dialog.style.left = `${Math.max(8, Math.min(innerWidth - dialog.offsetWidth - 8, anchor.x + anchor.width / 2 - dialog.offsetWidth / 2))}px`;
    dialog.style.top = `${Math.max(8, top - dialog.offsetHeight - 8)}px`;
  }
  function setSpeed(next, { notify = false } = {}) {
    speed = SPEED_ORDER.includes(next) ? next : 'normal';
    const index = SPEED_ORDER.indexOf(speed), following = SPEED_ORDER[(index + 1) % SPEED_ORDER.length];
    const button = q('speed-button');
    button.dataset.speed = speed;
    q('speed-label').textContent = button.dataset.turbo === 'true' ? 'Turbo' : SPEED_LABELS[speed];
    button.setAttribute('aria-label', `Velocidade: ${SPEED_LABELS[speed]}. Mudar para ${SPEED_LABELS[following]}.`);
    button.querySelectorAll('.speed-stars > span').forEach((star, i) => star.classList.toggle('active', i <= index));
    store.set(`${storageKey}-speed`, speed);
    if (notify) onSpeedChange(speed);
  }

  // ---- Ligações ----
  const listeners = [];
  const on = (target, type, fn) => { target.addEventListener(type, fn); listeners.push(() => target.removeEventListener(type, fn)); };
  on(q('spin'), 'click', () => { if (!q('spin').disabled) onSpin({ running: state.running, autoRunning: state.autoRunning }); });
  for (const [id, step] of [['bet-minus', -1], ['bet-plus', 1]]) on(q(id), 'click', () => {
    if (state.running || state.autoRunning || state.locked) return;
    const next = bets[Math.max(0, Math.min(bets.length - 1, bets.indexOf(bet) + step))];
    if (next === bet) return;
    bet = next; onUiSound('bet-step'); refresh(); onBetChange(bet);
  });
  on(q('rules-button'), 'click', () => { onUiSound('dialog-open'); onRules(); });
  on(q('mute-button'), 'click', () => { volume.muted = !volume.muted; applyVolume(); });
  for (const id of ['volume-music', 'volume-sfx']) on(q(id), 'input', () => {
    volume[id === 'volume-music' ? 'music' : 'sfx'] = +q(id).value; volume.muted = false; applyVolume();
  });
  on(q('volume-sfx'), 'change', () => onUiSound('click'));
  on(q('speed-button'), 'click', () => { onUiSound('speed'); setSpeed(SPEED_ORDER[(SPEED_ORDER.indexOf(speed) + 1) % SPEED_ORDER.length], { notify: true }); });
  on(q('auto-button'), 'click', () => {
    if (state.autoRunning) { onUiSound('auto-stop'); onAutoStop(); return; }
    if (state.running) return;
    onUiSound('dialog-open'); autoDetails(); dialog.showModal(); placeDialog(); q('auto-range').focus();
  });
  on(q('auto-range'), 'input', autoDetails);
  on(q('auto-start'), 'click', () => { if (q('auto-start').disabled) return; dialog.close(); onUiSound('auto-start'); onAutoStart(autoCount()); });
  on(dialog.querySelector('[data-auto-cancel]'), 'click', () => { onUiSound('dialog-close'); dialog.close(); });
  on(dialog, 'keydown', event => { if (event.key === 'Escape') dialog.close(); });
  // Clique fora da janela (no fundo transparente do modal) fecha-a.
  on(dialog, 'click', event => { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
  on(window, 'resize', placeDialog);
  on(document, 'fullscreenchange', placeDialog);

  applyVolume(false);
  setSpeed(store.get(`${storageKey}-speed`) || 'normal');
  refresh();

  return {
    element: deckEl,
    get bet() { return bet; },
    get speed() { return speed; },
    get volume() { return { music: (volume.music / 100) ** 2, sfx: (volume.sfx / 100) ** 2, muted: volume.muted }; },
    setBet(units) { if (bets.includes(units)) { bet = units; refresh(); } },
    setBalance(units) { q('balance').textContent = money(units); },
    setWin(units, multiple = 0) {
      q('win').innerHTML = `${number.format(units / unitsPerCredit)} <small>${currency}</small>`;
      q('win-multiple').textContent = `${compact.format(multiple)}× a aposta`;
    },
    setCost(units) { cost = units; refresh(); },
    setState(partial) { state = { ...state, ...partial }; if (state.running && dialog.open) dialog.close(); refresh(); },
    setSpeed(next) { setSpeed(next); },
    setTurbo(on) { q('speed-button').dataset.turbo = String(Boolean(on)); setSpeed(speed); },
    setExtraActive(on) { deckEl.dataset.extra = on ? 'on' : 'off'; },
    closeAuto() { dialog.close(); },
    destroy() { listeners.forEach(off => off()); deckEl.remove(); dialog.remove(); container.querySelector('.deck-sprite')?.remove(); },
  };
}
