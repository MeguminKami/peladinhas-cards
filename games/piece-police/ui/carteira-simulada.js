// Carteira simulada (carteira.html): faz de site para testar o HostSession do jogo.
// Usa a MESMA lógica de carteira que o casino vai usar (ui/carteira-local.js), com recibos
// idempotentes por id, latência configurável e falhas injetáveis. Guarda tudo no localStorage
// deste browser, para se poder recarregar o jogo a meio de uma jogada.
import { aplicarCarteira } from './carteira-local.js';
import { HOST_CHANNEL, SALDO_TESTE } from './session.js';

const KEY = 'pp-carteira-simulada';
const $ = id => document.getElementById(id);
const fmt = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
let state = load() ?? { wallet: null, balance: SALDO_TESTE, receipts: [] };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { } $('cw-balance').textContent = `${fmt.format(state.balance / 100)} DJC`; };
save();
let dropNext = false, rejectNext = false;
const params = new URLSearchParams(location.search);
if (params.has('latency')) $('cw-latency').value = params.get('latency');

const frame = $('game');
const url = new URL('game.html', location.href);
url.searchParams.set('wallet', 'host');
url.searchParams.set('parentOrigin', location.origin);
for (const k of ['debug', 'timeout', 'layout']) if (params.has(k)) url.searchParams.set(k, params.get(k));
frame.src = url.href;

function log(text, cls = '') {
  const li = document.createElement('li'); li.textContent = `${new Date().toLocaleTimeString('pt-PT')} ${text}`; if (cls) li.className = cls;
  $('cw-log').prepend(li);
  while ($('cw-log').children.length > 200) $('cw-log').lastChild.remove();
}

function handle(action, payload, id) {
  const fingerprint = JSON.stringify({ action, payload });
  const receipt = state.receipts.find(r => r.id === id);
  if (receipt) {
    if (receipt.fingerprint !== fingerprint) throw Object.assign(Error('Pedido repetido com valores diferentes.'), { code: 'RECEIPT_MISMATCH' });
    log(`${action} ${id.slice(0, 8)}… repetido: devolvo o recibo (sem mexer no saldo)`, 'warn');
    return structuredClone(receipt.result);
  }
  let out = aplicarCarteira(state.wallet, state.balance, { action, payload });
  const receipts = [];
  // withFirstStep: o 1.º passo segue na resposta ao start, com recibo próprio (o step 0 repetido devolve o mesmo).
  if (action === 'start' && payload.withFirstStep === true && out.session.round) {
    const sp = { sessionId: out.session.sessionId, roundId: out.session.round.id, index: 0 };
    const step = aplicarCarteira(out.session, out.balance, { action: 'step', payload: sp });
    receipts.push({ id: `${sp.roundId}-0`, fingerprint: JSON.stringify({ action: 'step', payload: sp }), result: step.result });
    out = { ...step, result: { ...out.result, firstStep: step.result } }; // o saldo do start é o de depois da entrada: o prémio só aparece no fim
  }
  state.wallet = out.session; state.balance = out.balance;
  if (action !== 'connect') state.receipts = [{ id, fingerprint, result: out.result }, ...receipts, ...state.receipts].slice(0, 16);
  save();
  log(`${action}${payload.mode ? ' ' + payload.mode : ''}${payload.index != null ? ' #' + payload.index : ''} → saldo ${fmt.format(out.balance / 100)}${out.result.last ? ' · último passo (crédito)' : ''}`);
  return structuredClone(out.result);
}

addEventListener('message', async event => {
  const data = event.data;
  if (event.source !== frame.contentWindow || event.origin !== location.origin || data?.channel !== HOST_CHANNEL || data.type !== 'request') return;
  if (typeof data.id !== 'string' || data.id.length > 100 || !['connect', 'start', 'step'].includes(data.action)) return;
  let response;
  if (rejectNext) { rejectNext = false; $('cw-reject').setAttribute('aria-pressed', 'false'); response = { ok: false, error: { code: 'SITE_REJECTED', message: 'A carteira rejeitou o pedido (falha injetada).' } }; log(`${data.action} rejeitado (falha injetada)`, 'bad'); }
  else {
    try { response = { ok: true, result: handle(data.action, data.payload || {}, data.id) }; }
    catch (error) { response = { ok: false, error: { code: error.code || 'SITE_REJECTED', message: error.publicMessage || error.message } }; log(`${data.action} recusado: ${error.message}`, 'bad'); }
  }
  await new Promise(r => setTimeout(r, Math.max(0, Number($('cw-latency').value) || 0)));
  if (dropNext) { dropNext = false; $('cw-drop').setAttribute('aria-pressed', 'false'); log(`resposta a ${data.action} perdida (falha injetada): o jogo vai repetir com o mesmo id`, 'warn'); return; }
  frame.contentWindow?.postMessage({ channel: HOST_CHANNEL, type: 'response', id: data.id, ...response }, location.origin);
});

$('cw-drop').addEventListener('click', () => { dropNext = !dropNext; $('cw-drop').setAttribute('aria-pressed', String(dropNext)); });
$('cw-reject').addEventListener('click', () => { rejectNext = !rejectNext; $('cw-reject').setAttribute('aria-pressed', String(rejectNext)); });
$('cw-reload').addEventListener('click', () => { frame.src = url.href; log('jogo recarregado'); });
$('cw-reset').addEventListener('click', () => { if (state.wallet?.round) { log('há uma jogada pendente: conclui-a primeiro', 'bad'); return; } state = { wallet: null, balance: SALDO_TESTE, receipts: [] }; save(); frame.src = url.href; log('carteira reposta'); });
// Para os testes automáticos.
window.carteira = { get state() { return structuredClone(state); }, dropNext() { dropNext = true; }, rejectNext() { rejectNext = true; }, setLatency(ms) { $('cw-latency').value = String(ms); }, reload() { frame.src = url.href; } };
