/**
 * Sessão = o ÚNICO ponto que movimenta saldo. Duas implementações com a mesma interface:
 *
 *   balance                     saldo em cêntimos (o que a carteira confirmou)
 *   cost(mode, bet)             custo de uma entrada em cêntimos
 *   active                      há uma jogada por concluir?
 *   round                       { id, mode, bet, cost, cursor } da jogada em curso
 *   connect()                   liga / recupera (retoma uma jogada pendente)
 *   start({ mode, bet })        débito único; a jogada fica resolvida na carteira
 *   step()                      próximo passo: { step, last, totalWin } (o prémio é creditado no último)
 *
 *  - TestSession: créditos de teste no browser (sessionStorage: sobrevive a um reload, recomeça
 *    num separador novo). A carteira é a mesma lógica do site (ui/carteira-local.js).
 *  - HostSession: dentro de um site (casino Peladinhas ou carteira.html). Pedidos por postMessage
 *    no canal versionado, cada um com id idempotente; timeout = repete com o MESMO id.
 *  - DemoSession: cenários forçados do painel de diagnóstico. Nunca mexe no saldo.
 */
import { config, scenario, playRound, seedState } from '../src/index.js';
import { aplicarCarteira, custo } from './carteira-local.js';

export const BETS = Object.freeze([...config.bets]);
export const SALDO_TESTE = 1_000_000; // 10 000 DJC
export const HOST_CHANNEL = 'peace-police:v1';
const STORE_KEY = 'pp-teste-carteira';

const store = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { } },
  del(k) { try { sessionStorage.removeItem(k); } catch { } },
};

const newId = () => crypto.randomUUID();

export class TestSession {
  constructor({ balance = SALDO_TESTE, seed = null, persist = true } = {}) {
    this.persist = persist; this.host = false; this.kind = 'teste';
    const saved = persist ? store.get(STORE_KEY) : null;
    this.wallet = saved?.wallet ?? null;
    this.balance = saved?.balance ?? balance;
    this.initialBalance = balance;
    this.seedHint = seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
    this.notice = '';
  }
  get seed() { return this.wallet?.seed ?? String(this.seedHint); }
  get active() { return Boolean(this.wallet?.round); }
  get round() { const r = this.wallet?.round; return r ? { id: r.id, mode: r.mode, bet: r.bet, cost: r.cost, cursor: r.cursor } : null; }
  cost(mode, bet) { return custo(mode, bet); }
  save() { if (this.persist) store.set(STORE_KEY, { wallet: this.wallet, balance: this.balance }); }
  apply(action, payload) {
    const out = aplicarCarteira(this.wallet, this.balance, { action, payload }, { seed: this.seedHint });
    this.wallet = out.session; this.balance = out.balance; this.save();
    return out.result;
  }
  async connect() { const r = this.apply('connect', {}); this.notice = r.notice; return r; }
  async start({ mode, bet }) {
    if (this.active) throw Object.assign(Error('Já existe uma jogada em curso.'), { code: 'ROUND_IN_PROGRESS' });
    if (this.balance < this.cost(mode, bet)) throw Object.assign(Error('Saldo de teste insuficiente para esta jogada.'), { code: 'INSUFFICIENT_BALANCE' });
    const r = this.apply('start', { sessionId: this.wallet?.sessionId ?? this.ensure(), expectedRevision: this.wallet.revision, mode, bet });
    return r.round;
  }
  ensure() { this.apply('connect', {}); return this.wallet.sessionId; }
  async step() {
    if (!this.active) throw Error('Não existe uma jogada em curso.');
    const r = this.apply('step', { sessionId: this.wallet.sessionId, roundId: this.wallet.round.id, index: this.wallet.round.cursor });
    return { step: r.step, last: r.last, totalWin: r.totalWin };
  }
  /** Renovar a seed: só entre jogadas. A próxima jogada usa um gerador novo. */
  renewSeed(seed = crypto.getRandomValues(new Uint32Array(1))[0]) {
    if (this.active) throw Error('Termina a jogada antes de renovar a seed.');
    this.seedHint = seed;
    const keep = this.balance;
    this.wallet = null; this.balance = keep; this.ensure();
    return this.seed;
  }
  resetBalance() { if (this.active) return; this.balance = this.initialBalance; this.save(); }
}

/** Valida a origem pedida pelo URL: ?wallet=host&parentOrigin=<origem>. */
export function hostWalletOrigin(location = window.location) {
  const params = new URLSearchParams(location.search);
  if (params.get('wallet') !== 'host' || window.parent === window) return null;
  try { return new URL(params.get('parentOrigin') || '').origin; } catch { return null; }
}

export class HostSession {
  constructor({ origin, target = window.parent, timeout = 8000 } = {}) {
    if (!origin) throw Error('Origem do site em falta.');
    this.origin = origin; this.target = target; this.timeout = timeout;
    this.host = true; this.kind = 'carteira';
    this.waiting = new Map();
    this.balance = 0; this.sessionId = null; this.revision = 0;
    this.current = null;          // { id, mode, bet, cost, cursor }
    this.prefetched = null;       // { id, promise }
    this.pending = 0;             // pedidos à espera de resposta (estado CARTEIRA_PENDENTE)
    this.onPending = () => {};
    this.timings = [];            // latência por pedido (painel de desempenho)
    window.addEventListener('message', event => {
      const data = event.data;
      if (event.source !== this.target || event.origin !== this.origin || data?.channel !== HOST_CHANNEL || data.type !== 'response') return;
      const waiting = this.waiting.get(data.id);
      if (!waiting) return;
      this.waiting.delete(data.id); clearTimeout(waiting.timer);
      if (data.ok) waiting.resolve(data.result);
      else waiting.reject(Object.assign(Error(data.error?.message || 'O site não confirmou a operação.'), { code: data.error?.code || 'SITE_REJECTED', definitive: true }));
    });
  }
  get active() { return Boolean(this.current); }
  get round() { return this.current ? { ...this.current } : null; }
  cost(mode, bet) { return custo(mode, bet); }

  /** Um pedido; um timeout volta a pedir com o MESMO id até haver resposta ou rejeição definitiva. */
  request(action, payload = {}, id = newId(), { retries = Infinity } = {}) {
    const started = performance.now();
    this.pending++; this.onPending(this.pending);
    const once = () => new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.waiting.delete(id); reject(Object.assign(Error('O site não respondeu.'), { code: 'TIMEOUT' })); }, this.timeout);
      this.waiting.set(id, { resolve, reject, timer });
      this.target.postMessage({ channel: HOST_CHANNEL, type: 'request', id, action, payload }, this.origin);
    });
    const loop = async () => {
      for (let attempt = 0; ; attempt++) {
        try { return await once(); }
        catch (error) {
          if (error.code !== 'TIMEOUT' || attempt >= retries) throw error;
          this.onRetry?.(action, attempt + 1);
        }
      }
    };
    const done = loop();
    const finish = () => { this.pending--; this.onPending(this.pending); this.timings.push({ action, ms: Math.round(performance.now() - started) }); if (this.timings.length > 50) this.timings.shift(); };
    done.then(finish, finish);
    return done;
  }
  apply(result) {
    this.sessionId = result.sessionId; this.revision = result.revision; this.balance = result.balance;
    this.current = result.round ? { ...result.round } : null;
    return result;
  }
  async connect() { this.prefetched = null; const r = this.apply(await this.request('connect', {}, newId(), { retries: 2 })); this.notice = r.notice; return r; }
  async start({ mode, bet }) {
    if (this.active) throw Object.assign(Error('Já existe uma jogada em curso.'), { code: 'ROUND_IN_PROGRESS' });
    if (this.balance < this.cost(mode, bet)) throw Object.assign(Error('Saldo insuficiente para esta jogada.'), { code: 'INSUFFICIENT_BALANCE' });
    this.prefetched = null;
    // O id do start é fixo para esta tentativa: se a resposta se perder, o site devolve o recibo (sem 2.º débito).
    const result = await this.request('start', { sessionId: this.sessionId, expectedRevision: this.revision, mode, bet, withFirstStep: true });
    this.apply(result);
    if (result.firstStep && this.current) this.prefetched = { id: `${this.current.id}-0`, promise: Promise.resolve(result.firstStep) };
    else this.prefetch();
    return this.round;
  }
  requestStep() {
    const payload = { sessionId: this.sessionId, roundId: this.current.id, index: this.current.cursor };
    const id = `${this.current.id}-${this.current.cursor}`;
    return { id, promise: this.request('step', payload, id) };
  }
  /** Pede já o passo seguinte enquanto o atual é apresentado (a jogada está fixa desde o start). */
  prefetch() {
    if (!this.active || this.prefetched) return;
    this.prefetched = this.requestStep();
    this.prefetched.promise.catch(() => {});
  }
  async step() {
    if (!this.active) throw Error('Não existe uma jogada em curso.');
    const expected = `${this.current.id}-${this.current.cursor}`;
    const pending = this.prefetched?.id === expected ? this.prefetched : this.requestStep();
    this.prefetched = null;
    const result = await pending.promise;
    this.apply(result);
    this.prefetch();
    return { step: result.step, last: result.last, totalWin: result.totalWin };
  }
}

/**
 * Jogada de diagnóstico: apresenta-se como uma jogada normal, sem tocar no saldo.
 *  - { name }         cenário forçado do motor (scenario(name))
 *  - { seed, mode }   jogada real do motor a partir de uma seed (ex.: encontrada pela procura do painel)
 *  - { result }       resultado já calculado (só nos testes de interface; nunca no jogo)
 */
export class DemoSession {
  constructor({ name = null, seed = null, mode = 'base', result = null, bet = 100 } = {}) {
    this.result = result ?? (name ? scenario(name, { bet }) : playRound(seedState(String(seed)), { bet, mode, roundId: `demo-${seed}` }));
    this.name = name ?? (seed != null ? `seed ${seed} · ${mode}` : 'fixture');
    this.cursor = 0; this.forced = true; this.host = false; this.kind = 'cenário';
  }
  get active() { return this.cursor < this.result.steps.length; }
  get round() { return { id: this.result.roundId, mode: this.result.mode, bet: this.result.bet, cost: 0, cursor: this.cursor }; }
  async start() { return this.round; }
  async step() {
    const step = this.result.steps[this.cursor++];
    const last = this.cursor >= this.result.steps.length;
    return { step, last, totalWin: last ? this.result.totalWin : null };
  }
}
