import { DEFAULT_CONFIG, SYMBOLS, magicParameters } from '../src/index.js';
import { TestSession, BET_UNITS, SPEEDS, autoCount } from './session.js';
import { previewBoard, demoScenario } from './fixtures.js';

const $ = id => document.getElementById(id);
const names = { base: 'Jogo normal', common: 'Bónus comum', super: 'Super bónus', secret: 'Secret bónus' };
const number = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
const money = units => `${number.format(units / 100)} DJC`;
const creditedUnits = (paid100, bet) => Number(BigInt(paid100) * BigInt(bet) / 100n);
const seed = crypto.getRandomValues(new Uint32Array(1))[0];
const session = new TestSession({ seed });
let running = false, autoRunning = false, autoCancel = false, autoRemaining = 0;
let hunt = false, speed = 'normal', fastForward = false, betUnits = 100;
let view = { mode: 'base', xp100: 0, level: 0, remaining: 0, paid100: 0, betUnits: 100, demo: false };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const sound = {
  volume: .35, lastVolume: .35, context: null,
  unlock() {
    try {
      if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.context.resume().catch(() => {});
    } catch { /* Audio is optional; a blocked sound must not block a round. */ }
  },
  tone(frequency = 400) {
    if (!this.context || !this.volume) return;
    try {
      const osc = this.context.createOscillator(), gain = this.context.createGain();
      const now = this.context.currentTime;
      osc.type = 'sine'; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(this.volume * .06, now + .01);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .12);
      osc.connect(gain); gain.connect(this.context.destination);
      osc.start(now); osc.stop(now + .13);
    } catch { /* A sound cue has no effect on game settlement. */ }
  },
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
    if (winning.has(position)) element.classList.add('hit');
    if (placedSet.has(position)) element.classList.add('placed');
    const multiplier = symbol === 'W' ? cell.multiplier : 0;
    element.setAttribute('aria-label', `Linha ${Math.floor(position / 6) + 1}, coluna ${position % 6 + 1}: ${symbol === 'S' ? 'scatter' : symbol === 'W' ? `wild${multiplier ? ` ×${multiplier}` : ''}` : symbol}`);
    const label = document.createElement('strong'); label.textContent = symbol;
    element.append(label);
    if (multiplier) {
      const tag = document.createElement('span'); tag.className = 'wild-multiplier'; tag.textContent = `×${multiplier}`; element.append(tag);
    }
    fragment.append(element);
  });
  $('board').replaceChildren(fragment);
  const count = board.filter(cell => cell === 'S').length;
  $('scatter-count').textContent = `${count} scatter${count === 1 ? '' : 's'}`;
}

function indicators() {
  const threshold = DEFAULT_CONFIG.xpThreshold100[view.mode];
  const displayed = Math.min(view.xp100, threshold);
  $('xp-value').textContent = `${compact.format(displayed / 100)} / ${compact.format(threshold / 100)} XP`;
  $('xp-bar').setAttribute('aria-valuemax', String(threshold / 100));
  $('xp-bar').setAttribute('aria-valuenow', String(displayed / 100));
  $('xp-fill').style.width = `${100 * displayed / threshold}%`;
  $('xp-mode').textContent = view.mode === 'base' ? '/ neste spin' : '/ durante o bónus';
  $('magic-level').textContent = String(view.level);
  const nextMagic = view.mode === 'base' ? null : magicParameters(view.mode, view.level + 1, null);
  $('magic-wilds').textContent = nextMagic ? `${nextMagic.requested} wilds` : '1–3 wilds';
  $('magic-multiplier').textContent = nextMagic ? `×${nextMagic.multiplier}` : '';
  $('magic-next').textContent = !nextMagic ? '' : !view.level ? 'Próxima magia' : (() => {
    const current = magicParameters(view.mode, view.level, null);
    return [nextMagic.requested > current.requested ? '+1 wild' : '', nextMagic.multiplier > current.multiplier ? `+${nextMagic.multiplier - current.multiplier}×` : ''].filter(Boolean).join(' / ');
  })();
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
  const locked = running || autoRunning;
  for (const id of ['bet', 'buy-button', 'hunt-button']) $(id).disabled = locked;
  $('bet-minus').disabled = locked || BET_UNITS.indexOf(betUnits) === 0;
  $('bet-plus').disabled = locked || BET_UNITS.indexOf(betUnits) === BET_UNITS.length - 1;
  $('buy-bet-minus').disabled = $('bet-minus').disabled;
  $('buy-bet-plus').disabled = $('bet-plus').disabled;
  document.querySelectorAll('[data-demo]').forEach(button => { button.disabled = locked; });
  $('auto-button').disabled = running && !autoRunning;
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
function notice(title, body, kicker = 'BÓNUS', max = false) {
  $('notice-title').textContent = title; $('notice-body').textContent = body; $('notice-kicker').textContent = kicker;
  $('notice-dialog').dataset.max = String(max);
  return new Promise(resolve => { $('notice-dialog').addEventListener('close', resolve, { once: true }); openDialog('notice-dialog'); });
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
let shownBoard = previewBoard();
async function present(event) {
  await pause(0);
  switch (event.type) {
    case 'spin-start':
      view.mode = event.mode; view.xp100 = event.xp100; view.level = event.magicLevel; view.remaining = event.remainingSpins;
      shownBoard = event.board; renderBoard(shownBoard); indicators();
      status(event.mode === 'base' ? 'A resolver o spin…' : `${names[event.mode]} · ${event.remainingSpins} spins após este.`);
      sound.tone(240); await pause(220); break;
    case 'hits':
      view.paid100 = event.totalPaid100; renderBoard(shownBoard, event.hits); indicators();
      status(`${event.hits.length} grupo${event.hits.length === 1 ? '' : 's'} vencedor${event.hits.length === 1 ? '' : 'es'} · +${compact.format(event.credited100 / 100)}× a aposta.`);
      sound.tone(520); await pause(500); break;
    case 'xp-gained': view.xp100 = event.xp100; indicators(); await pause(140); break;
    case 'refill': shownBoard = event.board; renderBoard(shownBoard); await pause(180); break;
    case 'magic':
      const previousMagic = view.mode !== 'base' && view.level ? magicParameters(view.mode, view.level, null) : null;
      view.xp100 = 0; view.level = event.level; view.remaining = event.remainingSpins; shownBoard = event.board;
      renderBoard(shownBoard, [], event.positions); indicators();
      if (view.mode !== 'base') {
        const gain = previousMagic ? event.multiplier - previousMagic.multiplier : event.multiplier;
        $('magic-upgrade').textContent = `MAGIA ${event.level} · ${event.requested} W · ×${event.multiplier}${gain > 0 ? ` (+${gain}×)` : ''}`;
        $('magic-upgrade').hidden = false;
        clearTimeout(magicToast);
        magicToast = setTimeout(() => { $('magic-upgrade').hidden = true; }, 1000);
        if (!reducedMotion.matches) $('magic-upgrade').animate([{opacity:0,transform:'translate(-50%,-4px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:180});
      }

      status(`Magia: ${event.placed} wild${event.placed === 1 ? '' : 's'}${event.multiplier ? ` de ×${event.multiplier}` : ''}. Barra a zero.`);
      sound.tone(760); await pause(450); break;
    case 'spin-end': shownBoard = event.board; renderBoard(shownBoard); view.xp100 = event.xp100; indicators(); break;
    case 'bonus-start':
      stopAuto(); view.mode = event.mode; view.remaining = event.spins; view.xp100 = 0; view.level = 0; indicators();
      await notice(names[event.mode], '12 spins iniciais. Encher a barra ativa a magia, sem acrescentar spins. A experiência e a evolução da magia mantêm-se durante o bónus.', 'ENTRASTE NO BÓNUS'); break;
    case 'retrigger':
      view.remaining = event.remainingSpins; indicators(); status(`+${event.added} spins! ${event.remainingSpins} por jogar.`); sound.tone(660); await pause(450); break;
    case 'max-win':
      view.paid100 = event.totalPaid100; view.remaining = view.xp100 = 0; indicators(); stopAuto();
      await notice('MAX WIN', `${money(creditedUnits(event.totalPaid100, view.betUnits))} · 10 000× a aposta. A jogada terminou.`, 'PRÉMIO MÁXIMO', true); break;
    case 'round-end': view.paid100 = event.paid100; indicators(); break;
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
      await notice('Bónus concluído', `${money(creditedUnits(final.paid100, view.betUnits))} no total · ${final.bonusSpinsPlayed} spins jogados.`, demo ? 'DEMONSTRAÇÃO' : 'RESULTADO');
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
  $('auto-cost').textContent = `${count} spins × ${money(cost)} = até ${money(count * cost)}. ${hunt ? 'Bonus Hunt ativado.' : 'Jogo normal.'}`;
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
    article.innerHTML = `<h3>${mode === 'common' ? 'Bónus' : names[mode]}</h3><div class="mode-placeholder" aria-hidden="true">${mode === 'common' ? 'B' : mode === 'super' ? 'S' : 'SS'}</div><strong>${money(cost)}</strong>`;
    const button = document.createElement('button'); button.dataset.buy = mode;
    button.textContent = session.balanceUnits < cost ? 'Saldo insuficiente' : 'Comprar';
    button.disabled = session.balanceUnits < cost;
    button.addEventListener('click', () => { if (running || autoRunning) return; $('buy-dialog').close(); runRound({ mode }); });
    article.append(button); $('bonus-cards').append(article);
  }
}

function rulesContent() {
  const pays = DEFAULT_CONFIG.pay100;
  const payoutRows = table => SYMBOLS.map((symbol, i) => `<tr><th scope="row">${symbol}</th>${table[i].map(v => `<td>${compact.format(v / 100)}×</td>`).join('')}</tr>`).join('');
  $('rules-content').innerHTML = `<section><h3>Grupos, não linhas</h3><p>Grelha 6 × 5. Cinco ou mais símbolos iguais ligados horizontal ou verticalmente formam um prémio. Diagonais não contam. Os vencedores desaparecem, os símbolos caem e podem formar novos grupos.</p></section>
    <section><h3>Wilds e multiplicadores</h3><p>W substitui os símbolos normais e premium a que esteja fisicamente ligado. Pode ajudar vários grupos. Wilds usados desaparecem; os restantes ficam durante as cascatas e desaparecem no spin seguinte. Nos três bónus, somam-se os × dos wilds do grupo.</p></section>
    <section><h3>Experiência e magia</h3><p>Apenas os símbolos regulares dos hits dão XP; os wilds contam para o hit e o prémio, mas não para o XP. Barras: normal ${DEFAULT_CONFIG.xpThreshold100.base / 100}, comum ${DEFAULT_CONFIG.xpThreshold100.common / 100}, super ${DEFAULT_CONFIG.xpThreshold100.super / 100}, secret ${DEFAULT_CONFIG.xpThreshold100.secret / 100} XP. Ao encher, o XP volta a zero e a magia coloca wilds depois da queda, antes de pagar novos grupos. Scatters nunca são substituídos.</p><p>No jogo normal, XP não passa ao spin seguinte. Os três bónus começam com 12 spins. Encher a barra ativa a magia, sem acrescentar spins. XP e evolução da magia mantêm-se. A magia evolui em cada barra, com um máximo de seis wilds no tabuleiro. Comum: alterna +1 wild e +1×, começando em 2 wilds de ×1. Super: alterna +2× e +1 wild, começando em 2 wilds de ×2. Secret: +1 wild e +2× por barra, começando em 2 wilds de ×2. No limite de seis, cada barra aumenta o multiplicador. Wilds que continuam no tabuleiro também recebem a melhoria, sem reduzir multiplicadores existentes.</p></section>
    <section><h3>Scatters e free spins</h3><p>Os scatters só são contados no fim de todas as cascatas: 3 comum, 4 super e 5 secret. Todos dão 12 spins iniciais. Dentro do bónus, 2 scatters dão +2 spins e 3 dão +4.</p></section>
    <section><h3>Bonus Hunt e limite de ganho</h3><p>O Hunt custa 4× a aposta base e aumenta a chance de scatter no spin pago e nas cascatas. Pagamentos e prémio máximo continuam referidos à aposta base. O máximo é 10 000× por jogada completa, incluindo o bónus; ao atingir esse valor, a jogada termina com MAX WIN.</p></section>
    <section><h3>Tabela de pagamentos</h3><label for="payout-mode">Modo</label><select id="payout-mode"><option value="base">Jogo normal / Hunt</option><option value="common">Comum</option><option value="super">Super</option><option value="secret">Secret</option></select><p>Valores em × da aposta base, antes dos wilds multiplicadores. Ecrã só de wilds e scatters paga uma vez como P5 / 18+.</p><div class="table-wrap" tabindex="0" role="region" aria-label="Tabela de pagamentos, deslocação horizontal"><table><thead><tr><th>Símbolo</th>${['5', '6–7', '8–10', '11–14', '15–17', '18+'].map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>${payoutRows(pays)}</tbody></table></div></section>`;
  $('payout-mode').addEventListener('change', event => {
    $('rules-content').querySelector('tbody').innerHTML = payoutRows(DEFAULT_CONFIG.bonusPay100?.[event.target.value] ?? DEFAULT_CONFIG.pay100);
  });
}

BET_UNITS.forEach(value => { const option = document.createElement('option'); option.value = String(value); option.textContent = money(value); option.selected = value === betUnits; $('bet').append(option); });
$('bet').addEventListener('change', () => { if (running || autoRunning) return; betUnits = Number($('bet').value); controls(); indicators(); });
for (const [id, direction] of [['bet-minus', -1], ['bet-plus', 1], ['buy-bet-minus', -1], ['buy-bet-plus', 1]]) $(id).addEventListener('click', () => {
  if (running || autoRunning) return;
  betUnits = BET_UNITS[Math.max(0, Math.min(BET_UNITS.length - 1, BET_UNITS.indexOf(betUnits) + direction))];
  $('bet').value = String(betUnits); controls(); indicators();
  if ($('buy-dialog').open) buyOptions();
});
$('spin').addEventListener('click', () => { if (autoRunning) stopAuto(); else if (running) fastForward = true; else runRound(); });
$('hunt-button').addEventListener('click', () => { if (running || autoRunning) return; hunt = !hunt; controls(); indicators(); $('buy-dialog').close(); status(hunt ? 'Bonus Hunt ativado. O spin custa 4× a aposta base.' : 'Jogo normal ativado.'); });
$('rules-button').addEventListener('click', () => openDialog('rules-dialog'));
$('buy-button').addEventListener('click', () => { if (running || autoRunning) return; buyOptions(); openDialog('buy-dialog'); });
$('auto-button').addEventListener('click', () => { if (autoRunning) stopAuto(); else if (!running) { autoDetails(); openDialog('auto-dialog'); } });
$('auto-range').addEventListener('input', autoDetails);
$('auto-start').addEventListener('click', startAuto);
$('speed-button').addEventListener('click', () => {
  const order = ['normal', 'fast', 'ultra'];
  const labels = { normal: 'Normal', fast: 'Rápido', ultra: 'Ultra' };
  const index = (order.indexOf(speed) + 1) % order.length;
  speed = order[index];
  $('speed-button').dataset.speed = speed;
  $('speed-label').textContent = labels[speed];
  $('speed-button').setAttribute('aria-label', `Velocidade: ${labels[speed]}. Mudar para ${labels[order[(index + 1) % order.length]]}.`);
  document.querySelectorAll('.speed-stars > span').forEach((star, i) => star.classList.toggle('active', i <= index));
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
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
  if (sound.volume) sound.lastVolume = sound.volume;
  $('volume-value').textContent = `${$('volume').value}%`;
  $('mute-button').setAttribute('aria-pressed', String(sound.volume === 0));
  $('mute-button').setAttribute('aria-label', sound.volume ? 'Desativar som' : 'Ativar som');
});
$('mute-button').addEventListener('click', () => { $('volume').value = String(sound.volume ? 0 : sound.lastVolume * 100); $('volume').dispatchEvent(new Event('input')); });
document.addEventListener('keydown', event => { if (event.code === 'Space' && !event.repeat && event.target === document.body && !document.querySelector('dialog[open]')) { event.preventDefault(); $('spin').click(); } });
rulesContent(); renderBoard(shownBoard); indicators(); controls();

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

const gameShell = document.querySelector('.shell');
function fitGame() {
  const width = Math.max(780, Math.min(innerWidth, document.fullscreenElement ? 1500 : 1104));
  gameShell.style.width = `${width}px`;
  gameShell.style.maxWidth = 'none';
  const scale = Math.min(1, innerWidth / width, document.fullscreenElement ? innerHeight / gameShell.offsetHeight : 1);
  gameShell.style.transform = `scale(${scale})`;
  gameShell.style.left = `${Math.max(0, (innerWidth - width * scale) / 2)}px`;
  document.body.style.height = `${Math.ceil(gameShell.offsetHeight * scale)}px`;
}
new ResizeObserver(fitGame).observe(gameShell);
addEventListener('resize', fitGame);
document.addEventListener('fullscreenchange', fitGame);
fitGame();
