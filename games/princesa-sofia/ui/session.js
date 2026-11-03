import { createEngine, entryCostMultiplier } from '../src/index.js';

export const AUTO_SPIN_COUNTS = Object.freeze([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500]);
export const BET_UNITS = Object.freeze([20, 40, 60, 80, 100, 150, 200, 300, 400, 500, 1000, 2000, 5000]);
export const SPEEDS = Object.freeze({ normal: 1, fast: .32, ultra: .16 });

export function autoCount(index) {
  if (!Number.isInteger(index) || index < 0 || index >= AUTO_SPIN_COUNTS.length) throw new RangeError('Invalid autoplay selection');
  return AUTO_SPIN_COUNTS[index];
}

export class TestSession {
  constructor({ seed = 1, balanceUnits = 1000000, engine = createEngine({ seed }) } = {}) {
    if (!Number.isSafeInteger(balanceUnits) || balanceUnits < 0) throw new RangeError('Invalid test balance');
    this.engine = engine;
    this.balanceUnits = balanceUnits;
    this.state = null;
    this.roundBalance = balanceUnits;
  }

  get active() { return Boolean(this.state && !this.state.complete); }

  cost(mode, betUnits) { return entryCostMultiplier(mode, this.engine.config) * betUnits; }

  start(mode, betUnits) {
    if (this.active) throw Error('Já existe uma jogada em curso.');
    const state = this.engine.start({ mode, betUnits });
    if (this.balanceUnits < state.costUnits) throw Error('Saldo de teste insuficiente para esta jogada.');
    this.roundBalance = this.balanceUnits;
    this.balanceUnits -= state.costUnits;
    this.state = state;
    return state;
  }

  advance(options = {}) {
    if (!this.active) throw Error('Não existe uma jogada em curso.');
    try {
      const result = this.engine.step(this.state, options);
      this.state = result.state;
      if (this.state.complete) {
        const settlement = result.events.find(event => event.type === 'round-end');
        if (!settlement) throw Error('A liquidação da jogada não foi recebida.');
        this.balanceUnits += settlement.creditedUnits;
      }
      return result;
    } catch (error) {
      // Local test transaction only. Never retain an incomplete paid result.
      this.balanceUnits = this.roundBalance;
      this.state = null;
      throw error;
    }
  }
}

// Saldo real do casino: o site corre o motor e guarda a carteira; o jogo só apresenta.
// Mesmo modelo da Rift Core Overdrive (pedidos com id, recibos idempotentes no site).
export const HOST_CHANNEL = 'princesa-sofia:v1';

export function hostWalletOrigin(location = window.location) {
  const params = new URLSearchParams(location.search);
  if (params.get('wallet') !== 'host' || window.parent === window) return null;
  try { return new URL(params.get('parentOrigin') || '').origin; } catch { return null; }
}

export class HostSession {
  constructor({ origin, target = window.parent, timeout = 20000 } = {}) {
    if (!origin) throw Error('Origem do site em falta.');
    this.origin = origin; this.target = target; this.timeout = timeout;
    this.waiting = new Map();
    this.balanceUnits = 0; this.state = null; this.roundId = null; this.cursor = 0;
    this.sessionId = null; this.revision = 0; this.host = true; this.prefetched = null;
    window.addEventListener('message', event => {
      const data = event.data;
      if (event.source !== this.target || event.origin !== this.origin || data?.channel !== HOST_CHANNEL || data.type !== 'response') return;
      const pending = this.waiting.get(data.id);
      if (!pending) return;
      this.waiting.delete(data.id); clearTimeout(pending.timer);
      if (data.ok) pending.resolve(data.result);
      else { const error = Error(data.error?.message || 'O site não confirmou a operação.'); error.code = data.error?.code; pending.reject(error); }
    });
  }

  get active() { return Boolean(this.roundId && this.state && !this.state.complete); }

  cost(mode, betUnits) { return entryCostMultiplier(mode) * betUnits; }

  request(action, payload = {}, id = crypto.randomUUID()) {
    const started = performance.now();
    const timed = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.waiting.delete(id); reject(Object.assign(Error('O site não respondeu. Tenta novamente.'), { code: 'TIMEOUT' })); }, this.timeout);
      this.waiting.set(id, { resolve, reject, timer });
      this.target.postMessage({ channel: HOST_CHANNEL, type: 'request', id, action, payload }, this.origin);
    });
    // Tempo de resposta da carteira do casino (painel ui/perf.js).
    const report = () => { try { dispatchEvent(new CustomEvent('sofia-wallet-timing', { detail: { action, ms: performance.now() - started } })); } catch { } };
    timed.then(report, report);
    return timed;
  }

  apply(result) {
    this.sessionId = result.sessionId; this.revision = result.revision; this.balanceUnits = result.balance;
    if (result.round) { this.roundId = result.round.id; this.cursor = result.round.cursor; this.state = result.round.state; }
    else this.roundId = null;
    return result;
  }

  async connect() { this.prefetched = null; return this.apply(await this.request('connect')); }

  async start(mode, betUnits) {
    if (this.active) throw Error('Já existe uma jogada em curso.');
    if (this.balanceUnits < this.cost(mode, betUnits)) throw Error('Saldo insuficiente para esta jogada.');
    this.prefetched = null;
    // withFirstStep: o site pode devolver logo o 1.o passo na resposta ao start (campo firstStep, igual a
    // resposta de um step com index 0, e guardado como recibo desse step). Poupa uma ida e volta por spin.
    // Um site que ainda nao o suporte ignora o campo e tudo funciona como antes.
    const result = await this.request('start', { sessionId: this.sessionId, expectedRevision: this.revision, mode, betUnits, withFirstStep: true });
    this.apply(result);
    if (result.firstStep && this.active) this.prefetched = { id: `${this.roundId}-${this.cursor}`, promise: Promise.resolve(result.firstStep) };
    else this.prefetch(); // compras: o 1.o passo chega enquanto as flores caem e o aviso do bónus esta aberto
    return this.state;
  }

  requestStep() {
    const payload = { sessionId: this.sessionId, roundId: this.roundId, index: this.cursor };
    // O mesmo id em cada repetição: o site devolve o recibo sem mexer duas vezes no saldo.
    const id = `${this.roundId}-${this.cursor}`;
    const promise = this.request('step', payload, id)
      .catch(error => { if (error.code !== 'TIMEOUT') throw error; return this.request('step', payload, id); });
    return { id, promise };
  }

  /**
   * Pede ja o passo seguinte enquanto o atual esta a ser apresentado (o resultado da jogada esta fixo
   * desde o start; os pedidos sao idempotentes). Assim a latencia do site/servidor fica escondida
   * dentro da animacao, em vez de se somar a cada free spin.
   */
  prefetch() {
    if (!this.active || this.prefetched) return;
    this.prefetched = this.requestStep();
    this.prefetched.promise.catch(() => { }); // o erro e tratado quando advance() o consumir
  }

  async advance() {
    if (!this.active) throw Error('Não existe uma jogada em curso.');
    const expected = `${this.roundId}-${this.cursor}`;
    const early = this.prefetched?.id === expected;
    const pending = early ? this.prefetched : this.requestStep();
    this.prefetched = null;
    let result;
    try { result = await pending.promise; }
    catch (error) {
      // Um pedido antecipado que falhou volta a ser tentado uma vez, ja no momento certo.
      if (!early) throw error;
      result = await this.requestStep().promise;
    }
    this.apply(result);
    this.state = result.step.state;
    this.prefetch();
    return { state: result.step.state, events: result.step.events };
  }
}
