// Agregação de métricas de simulação. Usa exatamente o playRound do jogo.
import { playRound } from './engine.js';
import { config, TAGS, PERSONAS } from './config.js';

export const HIST_EDGES = [0, 0.5, 1, 2, 5, 10, 20, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];
export const PCTS = [50, 75, 90, 95, 99, 99.9, 99.99];
// pp-v7: RTP por tamanho do cluster e por multiplicador do cluster (cada faixa começa neste valor)
export const SIZE_EDGES = [4, 7, 11, 15, 21];
export const MULT_EDGES = [1, 2, 6, 21, 101];
const bucket = (edges, v) => { let k = 0; while (k + 1 < edges.length && v >= edges[k + 1]) k++; return k; };
const edgeLabels = (edges, pre = '') => edges.map((e, i) => (i + 1 < edges.length ? (edges[i + 1] - 1 === e ? `${pre}${e}` : `${pre}${e}–${edges[i + 1] - 1}`) : `${pre}${e}+`));
export const SIZE_LABELS = edgeLabels(SIZE_EDGES);
export const MULT_LABELS = edgeLabels(MULT_EDGES, '×');
const BATCHES = 20;
const BONUS_IDS = Object.keys(config.bonus);
const FUSION_IDS = config.fusions.map((f) => f.id);

function newSpinCounters() {
  return {
    spins: 0, cascades: 0, maxCascades: 0,
    withAwaken: 0, awakenTotal: 0, refires: 0,
    persona: Object.fromEntries(PERSONAS.map((p) => [p, 0])),
    solo: Object.fromEntries(PERSONAS.map((p) => [p, 0])),
    level: [0, 0, 0, 0, 0, 0],      // nível máximo de Chemistry atingido no spin
    fusion: Object.fromEntries(FUSION_IDS.map((f) => [f, 0])),
    police: 0, calmer: 0, joiner: 0,
    corners: 0, total: 0, respins: 0, capped: 0, safety: 0,
  };
}

export class ModeStats {
  constructor(mode, capacity) {
    this.mode = mode;
    this.costX = config.modes[mode].costMils / 1000;
    this.isBuy = !!config.modes[mode].bonus;
    this.n = 0;
    this.xs = new Float32Array(capacity);
    this.sumWin = 0; this.sumR2 = 0;
    this.sumBase = 0; this.sumBase2 = 0;
    this.batchWin = new Float64Array(BATCHES); this.batchN = new Float64Array(BATCHES);
    this.capacity = capacity;
    this.hits = 0; this.netWins = 0; this.maxX = 0; this.minX = Infinity; this.capHits = 0;
    this.zeroStreak = 0; this.maxZeroStreak = 0;
    this.bonusCount = Object.fromEntries(BONUS_IDS.map((b) => [b, 0]));
    this.bonusWin = Object.fromEntries(BONUS_IDS.map((b) => [b, 0]));
    this.bonusWin2 = Object.fromEntries(BONUS_IDS.map((b) => [b, 0]));
    this.bonusMax = Object.fromEntries(BONUS_IDS.map((b) => [b, 0]));
    this.bonusSpins = 0; this.retriggers = 0; this.bonusRounds = 0;
    this.base = newSpinCounters();
    this.free = newSpinCounters();
    this.attrib = new Float64Array(TAGS.length);
    this.attribBase = new Float64Array(TAGS.length);
    this.sizeWin = new Float64Array(SIZE_EDGES.length); this.sizeN = new Float64Array(SIZE_EDGES.length);
    this.multWin = new Float64Array(MULT_EDGES.length); this.multN = new Float64Array(MULT_EDGES.length);
  }

  add(r) {
    const w = r.totalWinMils / 1000;
    const i = this.n++;
    this.xs[i] = w;
    this.sumWin += w;
    const ratio = w / this.costX;
    this.sumR2 += ratio * ratio;
    const b = Math.min(BATCHES - 1, Math.floor(i * BATCHES / this.capacity));
    this.batchWin[b] += w; this.batchN[b] += 1;
    if (w > 0) { this.hits++; this.zeroStreak = 0; if (w < this.minX) this.minX = w; }
    else { this.zeroStreak++; if (this.zeroStreak > this.maxZeroStreak) this.maxZeroStreak = this.zeroStreak; }
    if (w > this.costX) this.netWins++;
    if (w > this.maxX) this.maxX = w;
    if (r.capped) this.capHits++;

    let baseW = 0, bonusId = null, bonusW = 0;
    for (const st of r.steps) {
      const isBase = st.kind === 'base';
      const c = isBase ? this.base : this.free;
      if (isBase) baseW = st.win / 1000; else { bonusId = st.bonusId; bonusW += st.win / 1000; this.bonusSpins++; }
      this.scanStep(st, c, isBase);
    }
    this.sumBase += baseW; this.sumBase2 += baseW * baseW;
    if (bonusId) {
      this.bonusRounds++;
      this.bonusCount[bonusId]++;
      this.bonusWin[bonusId] += bonusW;
      this.bonusWin2[bonusId] += bonusW * bonusW;
      if (bonusW > this.bonusMax[bonusId]) this.bonusMax[bonusId] = bonusW;
    }
  }

  scanStep(st, c, isBase) {
    c.spins++;
    let cascades = 0, awakens = 0, maxLevel = 0, any = false;
    for (const e of st.events) {
      switch (e.type) {
        case 'grid.refill': cascades++; break;
        case 'win.cluster':
          for (const [t, v] of e.attrib) { this.attrib[t] += v / 1000; if (isBase) this.attribBase[t] += v / 1000; }
          { const ks = bucket(SIZE_EDGES, e.size), km = bucket(MULT_EDGES, e.multiplier); this.sizeWin[ks] += e.pay / 1000; this.sizeN[ks]++; this.multWin[km] += e.pay / 1000; this.multN[km]++; }
          break;
        case 'persona.awaken':
          any = true;
          if (e.kind === 'awaken') { awakens++; c.persona[e.persona]++; } else c.refires++;
          if (!e.fusion) c.solo[e.persona]++;
          break;
        case 'chemistry.level': if (e.to > maxLevel) maxLevel = e.to; break;
        case 'fusion.trigger': c.fusion[e.fusionId]++; break;
        case 'police.enter': c.police++; if (e.mode === 'calmer') c.calmer++; else c.joiner++; break;
        case 'corner.open': c.corners++; break;
        case 'chemistry.total': c.total++; break;
        case 'power.one_more_chance.respin': c.respins++; break;
        case 'cap.hit': c.capped++; break;
        case 'safety.stop': c.safety++; break;
        case 'bonus.retrigger': this.retriggers++; break;
      }
    }
    c.cascades += cascades;
    if (cascades > c.maxCascades) c.maxCascades = cascades;
    if (any) c.withAwaken++;
    c.awakenTotal += awakens;
    c.level[maxLevel]++;
  }

  // ---- serialização / junção (workers) ----
  toJSON() {
    const o = { ...this };
    o.xs = this.xs.subarray(0, this.n);
    return o;
  }
  static from(o) {
    const s = Object.assign(Object.create(ModeStats.prototype), o);
    return s;
  }
  static merge(list) {
    const a = list[0];
    const total = list.reduce((s, x) => s + x.n, 0);
    const out = Object.assign(Object.create(ModeStats.prototype), structuredClone({ ...a, xs: null }));
    out.xs = new Float32Array(total);
    let off = 0;
    for (const x of list) { out.xs.set(x.xs.subarray ? x.xs.subarray(0, x.n) : x.xs, off); off += x.n; }
    const sumKeys = ['n', 'sumWin', 'sumR2', 'sumBase', 'sumBase2', 'hits', 'netWins', 'capHits', 'bonusSpins', 'retriggers', 'bonusRounds'];
    for (const k of sumKeys) out[k] = list.reduce((s, x) => s + x[k], 0);
    out.maxX = Math.max(...list.map((x) => x.maxX));
    out.minX = Math.min(...list.map((x) => x.minX));
    out.maxZeroStreak = Math.max(...list.map((x) => x.maxZeroStreak));
    // lotes: cada worker contribui com os seus 20 lotes -> junta em 20 lotes globais
    out.batchWin = new Float64Array(BATCHES); out.batchN = new Float64Array(BATCHES);
    const bw = [], bn = [];
    for (const x of list) for (let k = 0; k < BATCHES; k++) { bw.push(x.batchWin[k]); bn.push(x.batchN[k]); }
    const per = bw.length / BATCHES;
    for (let k = 0; k < bw.length; k++) { const j = Math.min(BATCHES - 1, Math.floor(k / per)); out.batchWin[j] += bw[k]; out.batchN[j] += bn[k]; }
    for (const b of BONUS_IDS) {
      out.bonusCount[b] = list.reduce((s, x) => s + x.bonusCount[b], 0);
      out.bonusWin[b] = list.reduce((s, x) => s + x.bonusWin[b], 0);
      out.bonusWin2[b] = list.reduce((s, x) => s + x.bonusWin2[b], 0);
      out.bonusMax[b] = Math.max(...list.map((x) => x.bonusMax[b]));
    }
    for (const key of ['base', 'free']) {
      const c = newSpinCounters();
      for (const x of list) {
        const y = x[key];
        for (const k of Object.keys(c)) {
          if (typeof c[k] === 'number') c[k] = k === 'maxCascades' ? Math.max(c[k], y[k]) : c[k] + y[k];
          else if (Array.isArray(c[k])) c[k] = c[k].map((v, i) => v + y[k][i]);
          else for (const kk of Object.keys(c[k])) c[k][kk] += y[k][kk];
        }
      }
      out[key] = c;
    }
    out.attrib = new Float64Array(TAGS.length); out.attribBase = new Float64Array(TAGS.length);
    for (const x of list) for (let t = 0; t < TAGS.length; t++) { out.attrib[t] += x.attrib[t]; out.attribBase[t] += x.attribBase[t]; }
    for (const k of ['sizeWin', 'sizeN', 'multWin', 'multN']) { out[k] = new Float64Array(list[0][k].length); for (const x of list) x[k].forEach((v, i) => { out[k][i] += v; }); }
    out.capacity = total;
    return out;
  }

  // ---- métricas finais ----
  finalize() {
    const n = this.n, cost = this.costX;
    const mean = this.sumWin / n;
    const rtp = mean / cost;
    const varR = Math.max(0, this.sumR2 / n - rtp * rtp);
    const sigma = Math.sqrt(varR);
    const ci = 1.96 * sigma / Math.sqrt(n);
    // por lotes
    const brtp = [];
    for (let k = 0; k < BATCHES; k++) if (this.batchN[k]) brtp.push(this.batchWin[k] / this.batchN[k] / cost);
    const bm = brtp.reduce((a, b) => a + b, 0) / brtp.length;
    const bsd = Math.sqrt(brtp.reduce((a, b) => a + (b - bm) ** 2, 0) / Math.max(1, brtp.length - 1));
    const ciBatch = 1.96 * bsd / Math.sqrt(brtp.length);

    const sorted = Float32Array.from(this.xs.subarray(0, n)).sort();
    const pct = (arr, p) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(p / 100 * arr.length))] : 0;
    const firstHit = sorted.findIndex((v) => v > 0);
    const hitsArr = firstHit >= 0 ? sorted.subarray(firstHit) : new Float32Array(0);

    const hist = [];
    const zeroCnt = firstHit >= 0 ? firstHit : n;
    hist.push({ label: '0×', from: 0, to: 0, count: zeroCnt, freq: zeroCnt / n, rtpShare: 0 });
    for (let k = 1; k <= HIST_EDGES.length; k++) {
      const lo = HIST_EDGES[k - 1], hi = HIST_EDGES[k];
      const i0 = k === 1 ? zeroCnt : lowerBound(sorted, lo);
      const i1 = hi === undefined ? n : lowerBound(sorted, hi);
      let sum = 0;
      for (let i = i0; i < i1; i++) sum += sorted[i];
      const label = hi === undefined ? `${fmtX(lo)}× (máx.)` : k === 1 ? `>0–${fmtX(hi)}×` : `${fmtX(lo)}–${fmtX(hi)}×`;
      hist.push({ label, from: lo, to: hi ?? null, count: i1 - i0, freq: (i1 - i0) / n, rtpShare: sum / n / cost });
    }

    const bonus = {};
    for (const b of BONUS_IDS) {
      const cnt = this.bonusCount[b];
      const avg = cnt ? this.bonusWin[b] / cnt : 0;
      const sd = cnt > 1 ? Math.sqrt(Math.max(0, this.bonusWin2[b] / cnt - avg * avg)) : 0;
      bonus[b] = {
        count: cnt, freq: cnt / n, oneIn: cnt ? n / cnt : Infinity,
        avgWinX: avg, sdWinX: sd, maxWinX: this.bonusMax[b],
        rtpShare: this.bonusWin[b] / n / cost,
      };
    }
    const baseMean = this.sumBase / n;
    const baseVar = Math.max(0, this.sumBase2 / n - baseMean * baseMean);

    const attrib = {};
    for (let t = 0; t < TAGS.length; t++) attrib[TAGS[t]] = { total: this.attrib[t] / n / cost, base: this.attribBase[t] / n / cost };

    return {
      mode: this.mode, name: config.modes[this.mode].nome, rounds: n, n, costX: cost,
      sdX: Math.sqrt(Math.max(0, this.sumR2 * cost * cost / n - mean * mean)),
      // Volatilidade (pp-v5): desvio-padrão ÷ custo, % de rondas que devolvem menos de metade do custo, ganho máximo
      volatility: {
        sdPerCost: Math.sqrt(Math.max(0, this.sumR2 * cost * cost / n - mean * mean)) / cost,
        underHalfCost: lowerBound(sorted, cost / 2) / n,
        maxWinOneIn: this.capHits ? n / this.capHits : Infinity,
      },
      rtp, ci, ciBatch, sigma,
      hitFreq: this.hits / n, netWinFreq: this.netWins / n,
      avgWinX: mean, avgHitX: this.hits ? this.sumWin / this.hits : 0,
      maxX: this.maxX, minX: this.minX === Infinity ? 0 : this.minX,
      capHits: this.capHits, maxZeroStreak: this.maxZeroStreak,
      percentis: PCTS.map((p) => ({ p, all: pct(sorted, p), hits: pct(hitsArr, p) })),
      hist, bonus,
      bonusSpins: this.bonusSpins, retriggers: this.retriggers, bonusRounds: this.bonusRounds,
      baseOnly: { meanX: baseMean, varX: baseVar, rtp: baseMean / cost },
      spinBase: this.base, spinBonus: this.free,
      attrib,
      // pp-v7: parte do RTP e nº de prémios por tamanho do cluster e por multiplicador do cluster
      bySize: SIZE_LABELS.map((label, i) => ({ label, rtp: this.sizeWin[i] / n / cost, perRound: this.sizeN[i] / n, avgX: this.sizeN[i] ? this.sizeWin[i] / this.sizeN[i] : 0 })),
      byMult: MULT_LABELS.map((label, i) => ({ label, rtp: this.multWin[i] / n / cost, perRound: this.multN[i] / n, avgX: this.multN[i] ? this.multWin[i] / this.multN[i] : 0 })),
    };
  }
}

function lowerBound(arr, v) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; }
  return lo;
}
function fmtX(v) { return v >= 1000 ? `${v / 1000}k` : String(v); }

/** RTP decomposto: jogo base sem bónus + Σ frequência × valor médio (das compras). */
export function decomposedRtp(m, buys) {
  let mean = m.baseOnly.meanX;
  let varSum = m.baseOnly.varX / m.rounds;
  const parts = [];
  for (const [bid, bs] of Object.entries(m.bonus)) {
    const buy = buys[bid];
    if (!buy) return null;
    const f = bs.freq, ev = buy.avgWinX, n = m.rounds;
    mean += f * ev;
    varSum += ev * ev * f * (1 - f) / n + f * f * (buy.sdX * buy.sdX) / buy.n;
    parts.push({ bonus: bid, freq: f, ev, share: f * ev / m.costX });
  }
  return { rtp: mean / m.costX, ci: 1.96 * Math.sqrt(varSum) / m.costX, parts };
}

/** Corre N rondas de um modo num único processo. */
export function runMode(mode, rounds, rngState, onProgress, desligar = []) {
  const st = new ModeStats(mode, rounds);
  let rng = rngState;
  const bet = 100;
  const every = Math.max(1, Math.floor(rounds / 50));
  for (let i = 0; i < rounds; i++) {
    const r = playRound(rng, { bet, mode, roundId: 'sim', desligar });
    rng = r.rngAfter;
    st.add(r);
    if (onProgress && (i + 1) % every === 0) onProgress(i + 1);
  }
  return st;
}
