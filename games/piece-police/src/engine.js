// ============================================================================
// MOTOR — PEACE POLICE: THE AFTERPARTY
// ----------------------------------------------------------------------------
// Regras puras e determinísticas. Sem DOM, relógio, rede, Math.random ou estado
// global partilhado entre jogadas. Recebe configuração + estado do RNG + pedido,
// devolve a jogada completa como passos (spins visíveis) com eventos ordenados.
//
// Unidades: todos os valores de prémio são inteiros em MILÉSIMOS DE APOSTA BASE
// («mils»): 1000 mils = 1× a aposta. O dinheiro só é calculado no fim.
// Células: índice = col * 5 + row (col 0..4 da esquerda, row 0..4 de cima).
// ============================================================================

import {
  config as CFG, LOCK, EMPTY, N1, N2, N3, N4, N5, P1, P5, W, CW, DW, S,
  CODE_TO_ID, ID_TO_CODE, isPaying, isLow, isPremium, isWild, isMultWild,
  PERSONAS, PERSONA_PREMIUM, PREMIUM_PERSONA, TAG, POWER_TAG, fusionFor,
} from './config.js';
import { Rng } from './random.js';

const NC = 25;
const colOf = (i) => (i / 5) | 0;
const rowOf = (i) => i % 5;
const idxOf = (c, r) => c * 5 + r;

// Buffers de trabalho (cada worker/browser tem o seu módulo; uso estritamente síncrono)
const visit = new Int32Array(NC);
let stampCounter = 1;
const stack = new Int32Array(NC * 4);

// ---------------------------------------------------------------------------
// Contexto de um spin
// ---------------------------------------------------------------------------
function newSpinCtx(round, opts) {
  const cfg = CFG;
  const sym = new Int8Array(NC).fill(EMPTY);
  for (const c of cfg.corners) sym[c] = LOCK;
  return {
    cfg, rng: round.rng, round,
    weights: cfg.weights[opts.weights],
    modeKey: opts.modeKey,          // chave das probabilidades do Peace Police
    inBonus: !!opts.bonus,
    bonus: opts.bonus || null,      // estado persistente do bónus (ou null)
    events: [],
    stepWin: 0,
    sym,
    mult: new Int16Array(NC),
    tag: new Uint8Array(NC),
    stickyW: new Uint8Array(NC),
    groupOf: new Int16Array(NC).fill(-1),
    groups: [],
    cycle: 0,
    awake: opts.bonus ? opts.bonus.awake : new Set(),
    awakeOrder: opts.bonus ? opts.bonus.awakeOrder : [],
    fused: opts.bonus ? opts.bonus.fused : new Set(),
    fires: Object.create(null),
    calmer: false,
    partyMode: false,
    police: false,
    copium: { armed: false, used: 0, mods: {} },
    walkers: [],
    mayhem: null,
    totalDone: opts.bonus ? opts.bonus.totalDone : false,
    force: opts.force || null,
    off: round.off,
    safety: false,
  };
}

function emit(ctx, ev) { ctx.events.push(ev); }

function gridIds(ctx) {
  const g = new Array(NC);
  for (let i = 0; i < NC; i++) {
    const s = ctx.sym[i];
    g[i] = s === LOCK ? 'X' : s === EMPTY ? '' : CODE_TO_ID[s];
  }
  return g;
}

function isSticky(ctx, i) {
  const s = ctx.sym[i];
  return s === LOCK || s === CW || s === DW || ctx.stickyW[i] === 1 || ctx.groupOf[i] >= 0;
}

// Célula «normal» onde os poderes podem atuar
function isFree(ctx, i) {
  const s = ctx.sym[i];
  return s !== LOCK && s !== EMPTY && s !== S && !isSticky(ctx, i);
}

// ---------------------------------------------------------------------------
// Sorteio de símbolos
// ---------------------------------------------------------------------------
function colScatterCount(ctx, col) {
  let n = 0;
  for (let r = 0; r < 5; r++) if (ctx.sym[idxOf(col, r)] === S) n++;
  return n;
}

function drawSymbol(ctx, col, restrict) {
  const w = ctx.weights;
  if (restrict) {
    // DREAM GLITCH: só o tipo guardado ou baixos
    const r = ctx.rng.int(restrict.total);
    let acc = 0;
    for (let k = 0; k < restrict.codes.length; k++) { acc += restrict.ws[k]; if (r < acc) return restrict.codes[k]; }
    return restrict.codes[restrict.codes.length - 1];
  }
  if (colScatterCount(ctx, col) >= ctx.cfg.scatterMaxPerCol) return w.codesNoS[ctx.rng.pickCum(w.cumNoS)];
  return w.codes[ctx.rng.pickCum(w.cumAll)];
}

// Sorteio na célula i, com empilhamento (cópia do vizinho de cima ou da esquerda).
function drawAt(ctx, i, restrict) {
  if (!restrict) {
    const st = ctx.weights.stack;
    const row = rowOf(i), col = colOf(i);
    const up = row > 0 ? ctx.sym[i - 1] : EMPTY;
    if (isPaying(up) && ctx.rng.chance(isPremium(up) ? st.premium.vertical : st.baixo.vertical)) return up;
    const left = col > 0 ? ctx.sym[i - 5] : EMPTY;
    if (isPaying(left) && ctx.rng.chance(isPremium(left) ? st.premium.horizontal : st.baixo.horizontal)) return left;
  }
  return drawSymbol(ctx, colOf(i), restrict);
}

function initialDrop(ctx) {
  const forced = ctx.force && ctx.force.grid && !ctx.force.gridUsed ? ctx.force.grid : null;
  if (forced) ctx.force.gridUsed = true;
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 5; row++) {
      const i = idxOf(col, row);
      if (ctx.sym[i] !== EMPTY) continue;
      if (forced && forced[i] && forced[i] !== 'X' && forced[i] !== '?') {
        ctx.sym[i] = ID_TO_CODE[forced[i]];
        if (isMultWild(ctx.sym[i])) ctx.mult[i] = (ctx.force.mult && ctx.force.mult[i]) || 2;
      } else ctx.sym[i] = drawAt(ctx, i);
      ctx.tag[i] = 0;
    }
  }
  // mult: multiplicadores dos wilds CW/DW já no tabuleiro (cantos persistentes no bónus, cenários forçados).
  // Só informação para a apresentação: não muda o resultado.
  const mult = {};
  for (let i = 0; i < NC; i++) if (isMultWild(ctx.sym[i])) mult[i] = ctx.mult[i];
  emit(ctx, { type: 'grid.drop', grid: gridIds(ctx), mult });
}

// Gravidade: em cada coluna, os símbolos não-sticky que sobrevivem caem para as
// posições não-sticky mais baixas (passando pelas sticky); os novos entram por cima.
function refill(ctx, newTag = 0) {
  const newCells = [];
  for (let col = 0; col < 5; col++) {
    const slots = [];
    for (let row = 0; row < 5; row++) {
      const i = idxOf(col, row);
      if (ctx.sym[i] !== LOCK && !isSticky(ctx, i)) slots.push(i);
    }
    const keepS = [], keepT = [];
    for (let k = slots.length - 1; k >= 0; k--) {
      const i = slots[k];
      if (ctx.sym[i] !== EMPTY) { keepS.push(ctx.sym[i]); keepT.push(ctx.tag[i]); }
    }
    if (keepS.length === slots.length) continue;
    for (const i of slots) { ctx.sym[i] = EMPTY; ctx.tag[i] = 0; }
    let k = slots.length - 1;
    for (let j = 0; j < keepS.length; j++, k--) { ctx.sym[slots[k]] = keepS[j]; ctx.tag[slots[k]] = keepT[j]; }
    for (let j = 0; j <= k; j++) { // de cima para baixo (para o empilhamento vertical)
      const i = slots[j];
      ctx.sym[i] = drawAt(ctx, i);
      ctx.tag[i] = newTag;
      newCells.push(i);
    }
  }
  emit(ctx, { type: 'grid.refill', grid: gridIds(ctx), newCells });
  return newCells.length;
}

// ---------------------------------------------------------------------------
// Clusters
// ---------------------------------------------------------------------------
// Componentes ligados ortogonalmente de células do tipo t ou wild, com pelo
// menos uma célula real do tipo t.
function components(ctx, t, onlyReal = false) {
  const out = [];
  const stamp = ++stampCounter;
  const sym = ctx.sym, ortho = ctx.cfg.ortho;
  for (let i = 0; i < NC; i++) {
    if (sym[i] !== t || visit[i] === stamp) continue;
    const cells = [];
    let sp = 0; stack[sp++] = i; visit[i] = stamp;
    while (sp) {
      const c = stack[--sp];
      cells.push(c);
      const nb = ortho[c];
      for (let k = 0; k < nb.length; k++) {
        const n = nb[k];
        if (visit[n] === stamp) continue;
        const s = sym[n];
        if (s === t || (!onlyReal && isWild(s))) { visit[n] = stamp; stack[sp++] = n; }
      }
    }
    out.push(cells);
  }
  return out;
}

function findClusters(ctx) {
  const res = [];
  for (let t = 1; t <= 10; t++) {
    for (const cells of components(ctx, t)) {
      if (cells.length < ctx.cfg.clusterMin) continue;
      let real = 0;
      for (const c of cells) if (ctx.sym[c] === t) real++;
      if (real >= ctx.cfg.clusterMinReal) res.push({ type: t, cells });
    }
  }
  return res;
}

/** Maior grupo (tipo + wilds). premiumOnly: só P1..P5. Empates: RNG. */
function largestGroup(ctx, premiumOnly = true, minSize = 1) {
  let best = [], bestSize = minSize - 1;
  for (let t = premiumOnly ? P1 : 1; t <= P5; t++) {
    for (const cells of components(ctx, t)) {
      if (cells.length > bestSize) { best = [{ type: t, cells }]; bestSize = cells.length; }
      else if (cells.length === bestSize) best.push({ type: t, cells });
    }
  }
  return best.length ? (best.length === 1 ? best[0] : ctx.rng.pick(best)) : null;
}

// ---------------------------------------------------------------------------
// Prémios, limite e atribuição
// ---------------------------------------------------------------------------
function award(ctx, mils) {
  const r = ctx.round;
  const room = ctx.cfg.maxWinMils - r.win;
  let pay = mils;
  if (pay >= room) {
    pay = Math.max(0, room);
    r.capped = true;
  }
  r.win += pay;
  ctx.stepWin += pay;
  return pay;
}

function attribution(ctx, cells, basePay, pay, multCW, multDW) {
  // basePay × 1 dividido pelas etiquetas das células; o resto (multiplicador) por CW/DW
  const out = [];
  const total = multCW + multDW;
  const m = Math.max(1, total);
  const scale = pay / (basePay * m || 1);
  const baseShare = Math.round(basePay * scale);
  const counts = new Map();
  for (const c of cells) {
    const s = ctx.sym[c];
    if (isMultWild(s)) continue;
    const t = ctx.tag[c];
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  let n = 0; for (const v of counts.values()) n += v;
  let given = 0;
  if (n === 0) { counts.set(0, 1); n = 1; }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (let k = 0; k < entries.length; k++) {
    const share = k === entries.length - 1 ? baseShare - given : Math.floor(baseShare * entries[k][1] / n);
    given += share;
    if (share) out.push([entries[k][0], share]);
  }
  const rest = pay - baseShare;
  if (rest > 0) {
    const cwPart = total ? Math.floor(rest * multCW / total) : 0;
    if (cwPart) out.push([TAG['mult:CW'], cwPart]);
    if (rest - cwPart) out.push([TAG['mult:DW'], rest - cwPart]);
  }
  return out;
}

function evaluate(ctx) {
  const cfg = ctx.cfg;
  for (const g of ctx.groups) g.paidThisCycle = false;
  const clusters = findClusters(ctx);
  const paid = [];
  const growOnly = []; // grupos que cresceram mas cuja diferença na tabela é 0 (já no 15+)
  for (const cl of clusters) {
    const size = cl.cells.length;
    const gids = [];
    let ref = 0;
    for (const c of cl.cells) {
      const gid = ctx.groupOf[c];
      if (gid >= 0 && ctx.groups[gid].type === cl.type && !gids.includes(gid)) { gids.push(gid); ref = Math.max(ref, ctx.groups[gid].lastPaid); }
    }
    if (gids.length && size <= ref) continue; // grupo sticky que não cresceu não volta a pagar
    if (gids.length && cfg.powers.WEED.pagamentoAoCrescer === 'tamanho-final') { growOnly.push({ ...cl, size, gids }); continue; } // cresce sem pagar
    const payAt = (n) => (n >= cfg.clusterMin ? cfg.pay[cl.type][Math.min(n, cfg.payMaxSize) - cfg.clusterMin] : 0);
    let basePay = payAt(size);
    if (gids.length && ref > 0 && cfg.powers.WEED.pagamentoAoCrescer === 'diferenca') basePay -= payAt(ref);
    if (basePay <= 0) { growOnly.push({ ...cl, size, gids }); continue; }
    let mCW = 0, mDW = 0;
    for (const c of cl.cells) { if (ctx.sym[c] === CW) mCW += ctx.mult[c]; else if (ctx.sym[c] === DW) mDW += ctx.mult[c]; }
    const m = Math.max(1, mCW + mDW);
    paid.push({ ...cl, size, basePay, mult: m, mCW, mDW, pay: basePay * m, gids, growthFrom: gids.length ? ref : 0 });
  }
  paid.sort((a, b) => b.pay - a.pay || b.type - a.type || b.size - a.size);
  return { cands: paid, growOnly };
}

// Paga os candidatos (exceto os adiados: clusters que viraram grupo sticky em modo 'tamanho-final').
function payClusters(ctx, paid, growOnly) {
  const cfg = ctx.cfg;
  const cwGrow = new Set();
  for (const p of paid) {
    if (p.deferred) { p.pay = 0; continue; }
    if (ctx.round.capped) { p.pay = 0; continue; }
    const want = p.pay;
    const got = award(ctx, want);
    p.pay = got;
    emit(ctx, {
      type: 'win.cluster', symbol: CODE_TO_ID[p.type], cells: p.cells, size: p.size,
      basePay: p.basePay, multiplier: p.mult, pay: got, growthFrom: p.growthFrom || 0,
      attrib: attribution(ctx, p.cells, p.basePay, got, p.mCW, p.mDW),
    });
    if (got < want) emit(ctx, { type: 'cap.hit', limit: cfg.maxWinMils, cut: want - got });
    for (const c of p.cells) {
      if (ctx.sym[c] === CW) cwGrow.add(c);
      else if (ctx.stickyW[c]) ctx.stickyW[c] = 0; // HOLD wild do SLOW DISASTER: pagou, sai com o cluster
      else if (ctx.sym[c] === W && ctx.groupOf[c] >= 0 && ctx.groups[ctx.groupOf[c]].type !== p.type) {
        // HOLD wild preso num grupo sticky (WEED / FROZEN / FREEZE) que pagou noutro cluster: sai do grupo e do
        // tabuleiro. Um wild preso só paga uma vez (pp-v3; sem isto, com os wilds a contar por inteiro,
        // o mesmo bloco de wilds pagava em todas as cascatas).
        ctx.groups[ctx.groupOf[c]].cells.delete(c); ctx.groupOf[c] = -1;
      }
    }
    // grupos sticky que cresceram: fundem-se e registam o novo tamanho
    if (p.gids.length) mergeGroups(ctx, p);
  }
  for (const p of growOnly) mergeGroups(ctx, p);
  growCorners(ctx, cwGrow);
  return paid.filter((p) => p.pay > 0);
}

function growCorners(ctx, cells) {
  const cfg = ctx.cfg;
  const inc = cfg.corners_.incrementoPorPremio, max = ctx.bonus ? ctx.bonus.def.multCantoMax : cfg.corners_.multiplicadorMax;
  for (const c of cells) {
    const from = ctx.mult[c];
    const to = Math.min(max, from + inc);
    if (to !== from) { ctx.mult[c] = to; emit(ctx, { type: 'multiplier.change', cell: c, from, to }); }
  }
}

// Modo 'tamanho-final': o grupo sticky paga UMA vez o cluster que forma agora (tamanho e multiplicadores finais).
function payGroupFinal(ctx, g) {
  const cfg = ctx.cfg;
  let comp = null;
  for (const cells of components(ctx, g.type)) if (cells.some((c) => ctx.groupOf[c] === g.id)) { if (!comp || cells.length > comp.length) comp = cells; }
  if (!comp || comp.length < cfg.clusterMin) return null;
  let real = 0; for (const c of comp) if (ctx.sym[c] === g.type) real++;
  if (real < cfg.clusterMinReal) return null;
  const size = comp.length;
  const basePay = cfg.pay[g.type][Math.min(size, cfg.payMaxSize) - cfg.clusterMin];
  let mCW = 0, mDW = 0;
  for (const c of comp) { if (ctx.sym[c] === CW) mCW += ctx.mult[c]; else if (ctx.sym[c] === DW) mDW += ctx.mult[c]; }
  const m = Math.max(1, mCW + mDW);
  const want = basePay * m;
  const got = ctx.round.capped ? 0 : award(ctx, want);
  if (got > 0 || want > 0) {
    emit(ctx, {
      type: 'win.cluster', symbol: CODE_TO_ID[g.type], cells: comp, size, basePay, multiplier: m, pay: got,
      growthFrom: 0, groupFinal: true, startSize: g.startSize,
      attrib: attribution(ctx, comp, basePay, got, mCW, mDW),
    });
    if (got < want) emit(ctx, { type: 'cap.hit', limit: cfg.maxWinMils, cut: want - got });
  }
  const cw = new Set(comp.filter((c) => ctx.sym[c] === CW));
  for (const c of comp) if (ctx.stickyW[c]) ctx.stickyW[c] = 0;
  growCorners(ctx, cw);
  return comp;
}

// Fim do spin: grupos que ainda existem (Party Mode / FROZEN REALITY) pagam o tamanho final.
function finalizeGroups(ctx) {
  if (ctx.cfg.powers.WEED.pagamentoAoCrescer !== 'tamanho-final') return;
  for (const g of ctx.groups) {
    if (!g.alive || ctx.round.capped) continue;
    payGroupFinal(ctx, g);
    g.alive = false;
  }
}

function mergeGroups(ctx, p) {
  const g0 = ctx.groups[p.gids[0]];
  for (let k = 1; k < p.gids.length; k++) {
    const gk = ctx.groups[p.gids[k]];
    gk.alive = false;
    for (const c of gk.cells) g0.cells.add(c);
    if (gk.magnetLeft > g0.magnetLeft) g0.magnetLeft = gk.magnetLeft;
  }
  for (const c of p.cells) if (ctx.sym[c] !== CW && ctx.sym[c] !== DW) g0.cells.add(c);
  for (const c of g0.cells) ctx.groupOf[c] = g0.id;
  g0.lastPaid = p.size;
  g0.paidThisCycle = true;
  if (g0.kind === 'weed') emit(ctx, { type: 'power.slow_motion.grow', cells: [...g0.cells], newSize: p.size, symbol: CODE_TO_ID[g0.type] });
}

// ---------------------------------------------------------------------------
// Grupos sticky (SLOW MOTION, FROZEN REALITY, FREEZE & FREAK)
// ---------------------------------------------------------------------------
function createGroup(ctx, type, cells, lastPaid, kind, tag, magnet = 0) {
  const id = ctx.groups.length;
  const g = { id, type, cells: new Set(), lastPaid, kind, tag, alive: true, paidThisCycle: false, createdCycle: ctx.cycle, magnetLeft: magnet, startSize: cells.length };
  for (const c of cells) {
    const s = ctx.sym[c];
    if (s === CW || s === DW || s === S || s === LOCK) continue;
    if (ctx.groupOf[c] >= 0) continue;
    g.cells.add(c); ctx.groupOf[c] = id;
  }
  if (!g.cells.size) return null;
  ctx.groups.push(g);
  return g;
}

function groupPersistsWithoutGrowth(ctx, g) {
  return g.kind === 'frozen' || ctx.partyMode;
}

function dissolveGroups(ctx) {
  const removed = [];
  for (const g of ctx.groups) {
    if (!g.alive || g.paidThisCycle || g.createdCycle === ctx.cycle) continue;
    if (groupPersistsWithoutGrowth(ctx, g)) continue;
    if (ctx.cfg.powers.WEED.pagamentoAoCrescer === 'tamanho-final') {
      const comp = payGroupFinal(ctx, g);
      if (comp) for (const c of comp) if (ctx.groupOf[c] !== g.id && ctx.sym[c] !== EMPTY && !isSticky(ctx, c)) { ctx.sym[c] = EMPTY; ctx.tag[c] = 0; removed.push(c); }
    }
    g.alive = false;
    for (const c of g.cells) {
      if (ctx.groupOf[c] === g.id) {
        ctx.groupOf[c] = -1;
        if (ctx.sym[c] !== S) { ctx.sym[c] = EMPTY; ctx.tag[c] = 0; removed.push(c); }
      }
    }
    if (g.kind === 'weed') emit(ctx, { type: 'power.slow_motion.end', cells: removed.slice() });
  }
  return removed;
}

function growGroups(ctx) {
  let changed = false;
  const maxConv = ctx.cfg.powers.WEED.maxConversoesPorCiclo;
  for (const g of ctx.groups) {
    if (!g.alive) continue;
    // conversão das Lava lamps (N1) adjacentes
    const conv = [];
    for (const c of g.cells) {
      for (const n of ctx.cfg.ortho[c]) {
        if (conv.length >= maxConv) break;
        if (ctx.sym[n] === N1 && !isSticky(ctx, n) && !conv.includes(n)) conv.push(n);
      }
    }
    if (conv.length) {
      for (const n of conv) { ctx.sym[n] = g.type; ctx.tag[n] = g.tag; g.cells.add(n); ctx.groupOf[n] = g.id; }
      emit(ctx, { type: 'power.slow_motion.grow', cells: conv, newSize: g.cells.size, symbol: CODE_TO_ID[g.type] });
      changed = true;
    }
    // íman do FREEZE & FREAK
    if (g.magnetLeft > 0) {
      if (pullOne(ctx, g.type, g.cells, g.tag, false, true)) { g.magnetLeft--; changed = true; }
      else g.magnetLeft = 0;
    }
  }
  return changed;
}

// Move (ou copia) um símbolo do tipo t para uma célula adjacente ao grupo.
function pullOne(ctx, t, groupSet, tag, copy, intoGroup) {
  const dests = [];
  for (const c of groupSet) for (const n of ctx.cfg.ortho[c]) {
    if (groupSet.has(n) || dests.includes(n)) continue;
    const s = ctx.sym[n];
    if (s === t || isWild(s) || !isFree(ctx, n)) continue;
    dests.push(n);
  }
  if (!dests.length) return false;
  const pref = dests.filter((d) => ctx.sym[d] === N4);
  const dest = pref.length ? ctx.rng.pick(pref) : ctx.rng.pick(dests);
  // fonte: o símbolo igual mais próximo fora do grupo
  let best = [], bestD = 99;
  for (let i = 0; i < NC; i++) {
    if (ctx.sym[i] !== t || groupSet.has(i) || !isFree(ctx, i)) continue;
    let d = 99;
    for (const c of groupSet) { const dd = Math.abs(colOf(c) - colOf(i)) + Math.abs(rowOf(c) - rowOf(i)); if (dd < d) d = dd; }
    if (d < bestD) { bestD = d; best = [i]; } else if (d === bestD) best.push(i);
  }
  let from = -1;
  if (best.length) {
    from = ctx.rng.pick(best);
    if (copy) { ctx.sym[dest] = t; ctx.tag[dest] = tag; }
    else {
      const s = ctx.sym[dest], tg = ctx.tag[dest];
      ctx.sym[dest] = t; ctx.tag[dest] = tag;
      ctx.sym[from] = s; ctx.tag[from] = tg;
    }
  } else {
    // sem fonte: uma Coluna de som (N4) transforma-se no tipo
    const n4 = [];
    for (let i = 0; i < NC; i++) if (ctx.sym[i] === N4 && isFree(ctx, i) && !groupSet.has(i)) n4.push(i);
    if (!n4.length) return false;
    const d4 = n4.filter((i) => dests.includes(i));
    const target = d4.length ? ctx.rng.pick(d4) : ctx.rng.pick(n4);
    ctx.sym[target] = t; ctx.tag[target] = tag;
    emit(ctx, { type: 'power.rave_rush.move', from: -1, to: target, symbol: CODE_TO_ID[t], swapped: CODE_TO_ID[N4], copy: false, transform: true });
    if (intoGroup && dests.includes(target)) addToGroupSet(ctx, groupSet, target);
    else if (!intoGroup) groupSet.add(target);
    return true;
  }
  emit(ctx, { type: 'power.rave_rush.move', from, to: dest, symbol: CODE_TO_ID[t], swapped: copy ? null : CODE_TO_ID[ctx.sym[from]], copy });
  if (intoGroup) addToGroupSet(ctx, groupSet, dest); else groupSet.add(dest);
  return true;
}
function addToGroupSet(ctx, set, c) {
  set.add(c);
  // descobre o grupo dono deste set
  for (const g of ctx.groups) if (g.cells === set) { ctx.groupOf[c] = g.id; break; }
}

// ---------------------------------------------------------------------------
// Poderes
// ---------------------------------------------------------------------------
function countSym(ctx, s) { let n = 0; for (let i = 0; i < NC; i++) if (ctx.sym[i] === s) n++; return n; }

// LCD — REALITY BREAK
function realityBreak(ctx, party, tag) {
  const p = ctx.cfg.powers.LCD;
  const g = largestGroup(ctx, true);
  const T = g ? g.type : P1 + ctx.rng.int(5);
  let cells = [];
  for (let i = 0; i < NC; i++) if (ctx.sym[i] === N5 && isFree(ctx, i)) cells.push(i);
  if (cells.length < p.celulasMinimas) {
    // completa com baixos junto ao maior grupo (alargando em anéis), depois aleatórios
    const inSet = new Set(cells);
    let frontier = g ? g.cells.slice() : [];
    const seen = new Set(frontier);
    while (cells.length < p.celulasMinimas && frontier.length) {
      const ring = [];
      for (const c of frontier) for (const n of ctx.cfg.ortho[c]) if (!seen.has(n)) { seen.add(n); ring.push(n); }
      const lows = ctx.rng.shuffle(ring.filter((n) => isLow(ctx.sym[n]) && isFree(ctx, n) && !inSet.has(n)));
      for (const n of lows) { if (cells.length >= p.celulasMinimas) break; cells.push(n); inSet.add(n); }
      frontier = ring;
    }
    if (cells.length < p.celulasMinimas) {
      const lows = [];
      for (let i = 0; i < NC; i++) if (isLow(ctx.sym[i]) && isFree(ctx, i) && !inSet.has(i)) lows.push(i);
      ctx.rng.shuffle(lows);
      for (const n of lows) { if (cells.length >= p.celulasMinimas) break; cells.push(n); }
    }
  }
  if (party) {
    for (let k = 0; k < p.partyTiposExtra; k++) {
      const types = [];
      for (let i = 0; i < NC; i++) { const s = ctx.sym[i]; if (isLow(s) && s !== N5 && isFree(ctx, i) && !cells.includes(i) && !types.includes(s)) types.push(s); }
      if (!types.length) break;
      const L = ctx.rng.pick(types);
      for (let i = 0; i < NC; i++) if (ctx.sym[i] === L && isFree(ctx, i) && !cells.includes(i)) cells.push(i);
    }
  }
  for (const c of cells) { ctx.sym[c] = T; ctx.tag[c] = tag; }
  emit(ctx, { type: 'power.reality_break', target: CODE_TO_ID[T], cells, party });
  return { T, cells };
}

// WEED — SLOW MOTION (cria o grupo sticky a partir do cluster que despertou)
function slowMotion(ctx, cluster, party, tag, kind = 'weed', magnet = 0) {
  let type, cells, lastPaid;
  if (cluster) { type = cluster.type; cells = cluster.cells; lastPaid = cluster.size; }
  else {
    // sem cluster (Joiner / Total Chemistry): o maior grupo de WEED, ou o maior premium
    const comps = components(ctx, P1).sort((a, b) => b.length - a.length);
    const g = comps.length ? { type: P1, cells: comps[0] } : largestGroup(ctx, true);
    if (!g) return null;
    type = g.type; cells = g.cells;
    lastPaid = 0; // ainda não pagou (se tivesse >= 4 já teria sido pago e removido)
  }
  const grp = createGroup(ctx, type, cells, lastPaid, kind, tag, magnet);
  if (grp) emit(ctx, { type: 'power.slow_motion.start', cells: [...grp.cells], symbol: CODE_TO_ID[type], party, kind });
  return grp;
}

// MDMA — RAVE RUSH
function raveRush(ctx, party, tag, copy = false) {
  const p = ctx.cfg.powers.MDMA;
  const g = largestGroup(ctx, true);
  if (!g) return 0;
  const moves = Math.min(party ? p.movimentosMaxParty : p.movimentosMax, p.movimentosBase + countSym(ctx, N4));
  const set = new Set(g.cells);
  let done = 0;
  for (let m = 0; m < moves; m++) {
    if (!pullOne(ctx, g.type, set, tag, copy, false)) break;
    done++;
  }
  return done;
}

// ALCOOL — DRUNK WALK
function canWalk(ctx, i) {
  const s = ctx.sym[i];
  return s !== LOCK && s !== EMPTY && s !== S && s !== W && !isSticky(ctx, i);
}
function placeW(ctx, i, sticky, tag) {
  ctx.sym[i] = W; ctx.tag[i] = tag; ctx.stickyW[i] = sticky ? 1 : 0;
}
function drunkWalk(ctx, party, tag, opt = {}) {
  const p = ctx.cfg.powers.ALCOOL;
  const walkers = party ? p.rastosParty : 1;
  const steps = Math.min(p.passosMax, p.passosBase + countSym(ctx, N2));
  const trails = [];
  for (let w = 0; w < walkers; w++) {
    let starts = [];
    for (let i = 0; i < NC; i++) if (ctx.sym[i] === N2 && canWalk(ctx, i)) starts.push(i);
    if (!starts.length) for (let i = 0; i < NC; i++) if (isPaying(ctx.sym[i]) && canWalk(ctx, i)) starts.push(i);
    if (!starts.length) break;
    let cur = ctx.rng.pick(starts);
    const trail = [cur];
    placeW(ctx, cur, opt.sticky, tag);
    emit(ctx, { type: 'power.drunk_walk.step', walker: w, cell: cur, sticky: !!opt.sticky });
    for (let s = 1; s < steps; s++) {
      const cand = ctx.cfg.diag[cur].filter((n) => canWalk(ctx, n));
      if (!cand.length) break;
      cur = ctx.rng.pick(cand);
      trail.push(cur);
      placeW(ctx, cur, opt.sticky, tag);
      emit(ctx, { type: 'power.drunk_walk.step', walker: w, cell: cur, sticky: !!opt.sticky });
    }
    trails.push(trail);
    if (opt.walker) ctx.walkers.push({ cell: cur, left: opt.walker, tag });
  }
  if (opt.mirror && trails.length) {
    for (const t of trails.slice()) {
      for (const c of t) {
        const m = idxOf(4 - colOf(c), rowOf(c));
        if (m !== c && canWalk(ctx, m)) {
          placeW(ctx, m, false, tag);
          emit(ctx, { type: 'power.drunk_walk.step', walker: 'espelho', cell: m, sticky: false });
        }
      }
    }
  }
  if (opt.mayhem) ctx.mayhem = { left: opt.mayhem, tag };
  return trails;
}

function slowDisasterSteps(ctx) {
  let changed = false;
  for (const wk of ctx.walkers) {
    if (wk.left <= 0) continue;
    const cand = ctx.cfg.diag[wk.cell].filter((n) => canWalk(ctx, n));
    if (!cand.length) { wk.left = 0; continue; }
    wk.cell = ctx.rng.pick(cand); wk.left--;
    placeW(ctx, wk.cell, true, wk.tag);
    emit(ctx, { type: 'power.drunk_walk.step', walker: 'slow_disaster', cell: wk.cell, sticky: true });
    changed = true;
  }
  return changed;
}

function mayhemJumps(ctx) {
  const mh = ctx.mayhem;
  if (!mh || mh.left <= 0) return false;
  mh.left--;
  let changed = false;
  for (let i = 0; i < NC; i++) {
    if (ctx.sym[i] !== W || ctx.tag[i] !== mh.tag || ctx.stickyW[i] || ctx.groupOf[i] >= 0) continue; // um W preso num grupo sticky não salta (pp-v3)
    // rótulos de componentes reais por tipo
    let best = [], bestScore = 0;
    for (let c = 0; c < NC; c++) {
      if (!isFree(ctx, c) || isWild(ctx.sym[c])) continue;
      const byType = new Map();
      for (const n of ctx.cfg.ortho[c]) {
        const s = ctx.sym[n];
        if (!isPaying(s)) continue;
        if (!byType.has(s)) byType.set(s, []);
        byType.get(s).push(n);
      }
      let score = 0;
      for (const [t, ns] of byType) {
        if (ns.length < 2) continue;
        const comps = components(ctx, t, true);
        const ids = new Set(); let sz = 0;
        for (const n of ns) { const k = comps.findIndex((cc) => cc.includes(n)); if (k >= 0 && !ids.has(k)) { ids.add(k); sz += comps[k].length; } }
        if (ids.size >= 2) score = Math.max(score, sz);
      }
      if (score > bestScore) { bestScore = score; best = [c]; } else if (score === bestScore && score > 0) best.push(c);
    }
    let target = best.length ? ctx.rng.pick(best) : -1;
    if (target < 0) {
      const g = largestGroup(ctx, true);
      if (g) {
        const adj = [];
        for (const c of g.cells) for (const n of ctx.cfg.ortho[c]) if (isFree(ctx, n) && !isWild(ctx.sym[n]) && !g.cells.includes(n) && !adj.includes(n)) adj.push(n);
        if (adj.length) target = ctx.rng.pick(adj);
      }
    }
    if (target < 0 || target === i) continue;
    const s = ctx.sym[target], tg = ctx.tag[target];
    ctx.sym[target] = W; ctx.tag[target] = mh.tag;
    ctx.sym[i] = s; ctx.tag[i] = tg;
    emit(ctx, { type: 'power.drunk_walk.step', walker: 'total_mayhem', from: i, cell: target, sticky: false, jump: true });
    changed = true;
  }
  return changed;
}

// COPIUM — ONE MORE CHANCE (arma o respin para o fim da sequência)
function armCopium(ctx, mods = {}, viaFusion = false) {
  const cp = ctx.copium;
  if (cp.used >= (viaFusion ? 2 : 1) && !cp.armed) return false;
  cp.armed = true;
  Object.assign(cp.mods, mods);
  emit(ctx, { type: 'power.one_more_chance.armed', mods: Object.keys(cp.mods) });
  return true;
}

function runRespins(ctx) {
  const cfg = ctx.cfg, pc = cfg.powers.COPIUM;
  const cp = ctx.copium;
  cp.armed = false; cp.used++;
  const mods = cp.mods; cp.mods = {};
  const fNED = cfg.fusions.find((f) => f.id === 'NEVER_ENDING_DREAM');
  const fOMR = cfg.fusions.find((f) => f.id === 'ONE_MORE_ROUND');
  let left = ctx.partyMode ? pc.respinsParty : pc.respins;
  let total = 0, extraRound = 0, pendingW = 0;
  const hardMax = Math.max(fNED.maxRespins, pc.respinsParty) + fOMR.maxRespinsExtra + 1;
  const tag = mods.dreamGlitch ? TAG.DREAM_GLITCH : mods.oneMoreRave ? TAG.ONE_MORE_RAVE : mods.neverEnding ? TAG.NEVER_ENDING_DREAM : mods.oneMoreRound ? TAG.ONE_MORE_ROUND : TAG.ONE_MORE_CHANCE;
  while (left > 0 && total < hardMax && !ctx.round.capped && !ctx.safety) {
    left--; total++;
    let g = largestGroup(ctx, true, pc.grupoMinimo) || largestGroup(ctx, false, pc.grupoMinimo);
    // ONE MORE ROUND: o W ganho no respin falhado entra antes de guardar
    if (pendingW && g) {
      const adj = [];
      for (const c of g.cells) for (const n of cfg.ortho[c]) if (isFree(ctx, n) && !isWild(ctx.sym[n]) && !g.cells.includes(n) && !adj.includes(n)) adj.push(n);
      if (adj.length) {
        const c = ctx.rng.pick(adj);
        placeW(ctx, c, false, TAG.ONE_MORE_ROUND);
        emit(ctx, { type: 'wild.place', cell: c, multiplier: 1, source: 'ONE_MORE_ROUND' });
        g = largestGroup(ctx, true, pc.grupoMinimo) || largestGroup(ctx, false, pc.grupoMinimo);
      }
      pendingW = 0;
    }
    const T = g ? g.type : P1 + ctx.rng.int(5);
    const held = new Set(g ? g.cells : []);
    const sizeBefore = held.size;
    // Raspadinhas reveladas
    const revealed = [];
    let restrict = null;
    if (mods.dreamGlitch) {
      const w = ctx.weights;
      const codes = [T, N1, N2, N3, N4, N5];
      const ws = codes.map((c) => Math.round(w.prob[CODE_TO_ID[c]] * 100000));
      restrict = { codes, ws, total: ws.reduce((a, b) => a + b, 0) };
    }
    for (let i = 0; i < NC; i++) {
      if (ctx.sym[i] !== N3 || held.has(i) || isSticky(ctx, i)) continue;
      if (mods.dreamGlitch || ctx.rng.chance(pc.probRaspadinha)) ctx.sym[i] = T;
      else { const w = ctx.weights; ctx.sym[i] = w.codesNoS[ctx.rng.pickCum(w.cumNoS)]; }
      ctx.tag[i] = tag;
      held.add(i); revealed.push(i);
    }
    // Respin das restantes
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 5; row++) {
        const i = idxOf(col, row);
        const s = ctx.sym[i];
        if (s === LOCK || s === S || held.has(i) || isSticky(ctx, i)) continue;
        ctx.sym[i] = EMPTY;
      }
      for (let row = 0; row < 5; row++) {
        const i = idxOf(col, row);
        if (ctx.sym[i] !== EMPTY) continue;
        ctx.sym[i] = drawAt(ctx, i, restrict);
        ctx.tag[i] = tag;
      }
    }
    emit(ctx, { type: 'power.one_more_chance.respin', held: [...held], revealed, symbol: CODE_TO_ID[T], grid: gridIds(ctx), mods: Object.keys(mods) });
    // ONE MORE RAVE: todos os iguais são puxados para o grupo
    if (mods.oneMoreRave && g) {
      const set = new Set(g.cells);
      for (let k = 0; k < NC; k++) {
        let any = false;
        for (let i = 0; i < NC; i++) if (ctx.sym[i] === T && !set.has(i) && isFree(ctx, i)) { any = true; break; }
        if (!any || !pullOneStrict(ctx, T, set, TAG.ONE_MORE_RAVE)) break;
      }
    }
    // tamanho do grupo guardado após o respin
    let sizeAfter = 0;
    for (const cells of components(ctx, T)) if (cells.some((c) => held.has(c)) || !g) sizeAfter = Math.max(sizeAfter, cells.length);
    const grew = sizeAfter > sizeBefore;
    runCascade(ctx);
    if (mods.neverEnding && grew && total < fNED.maxRespins) left++;
    if (mods.oneMoreRound && !grew && extraRound < fOMR.maxRespinsExtra) { extraRound++; left++; pendingW = 1; }
  }
}
// variante do pullOne que só move (não transforma Colunas de som)
function pullOneStrict(ctx, t, set, tag) {
  const dests = [];
  for (const c of set) for (const n of ctx.cfg.ortho[c]) if (!set.has(n) && !dests.includes(n) && isFree(ctx, n) && ctx.sym[n] !== t && !isWild(ctx.sym[n])) dests.push(n);
  const srcs = [];
  for (let i = 0; i < NC; i++) if (ctx.sym[i] === t && !set.has(i) && isFree(ctx, i)) srcs.push(i);
  if (!dests.length || !srcs.length) return false;
  const from = ctx.rng.pick(srcs), to = ctx.rng.pick(dests);
  const s = ctx.sym[to], tg = ctx.tag[to];
  ctx.sym[to] = t; ctx.tag[to] = tag; ctx.sym[from] = s; ctx.tag[from] = tg;
  set.add(to);
  emit(ctx, { type: 'power.rave_rush.move', from, to, symbol: CODE_TO_ID[t], swapped: CODE_TO_ID[s], copy: false });
  return true;
}

// ---------------------------------------------------------------------------
// Execução de poderes e fusões
// ---------------------------------------------------------------------------
function powerOff(ctx, persona) { return ctx.off.has('poderes') || ctx.off.has(persona); }

function runSolo(ctx, persona, cluster, party) {
  if (powerOff(ctx, persona)) return;
  const tag = POWER_TAG[persona];
  switch (persona) {
    case 'LCD': realityBreak(ctx, party, tag); break;
    case 'WEED': if (!cluster) slowMotion(ctx, null, party, tag); break; // com cluster: criado antes da remoção
    case 'MDMA': raveRush(ctx, party, tag); break;
    case 'ALCOOL': drunkWalk(ctx, party, tag); break;
    case 'COPIUM': armCopium(ctx); break;
  }
}

function runFusion(ctx, f, cluster) {
  const party = ctx.partyMode;
  const tag = TAG[f.id];
  switch (f.id) {
    case 'NEVER_ENDING_DREAM': armCopium(ctx, { neverEnding: true }, true); break;
    case 'ONE_MORE_ROUND': armCopium(ctx, { oneMoreRound: true }, true); break;
    case 'DREAM_GLITCH': armCopium(ctx, { dreamGlitch: true }, true); break;
    case 'ONE_MORE_RAVE': armCopium(ctx, { oneMoreRave: true }, true); break;
    case 'SLOW_DISASTER': drunkWalk(ctx, party, tag, { sticky: true, walker: f.passosExtraMax }); break;
    case 'TOTAL_MAYHEM': drunkWalk(ctx, party, tag, { mayhem: f.saltosMax }); break;
    case 'DOUBLE_VISION': drunkWalk(ctx, party, tag, { mirror: true }); break;
    case 'RAVE_DIMENSION': raveRush(ctx, party, tag, true); break;
    case 'FROZEN_REALITY': {
      const r = realityBreak(ctx, party, tag);
      // um grupo sticky por componente das células transformadas
      const set = new Set(r.cells);
      const seen = new Set();
      for (const c of r.cells) {
        if (seen.has(c)) continue;
        const comp = []; const st = [c]; seen.add(c);
        while (st.length) { const x = st.pop(); comp.push(x); for (const n of ctx.cfg.ortho[x]) if (set.has(n) && !seen.has(n)) { seen.add(n); st.push(n); } }
        const g = createGroup(ctx, r.T, comp, 0, 'frozen', tag);
        if (g) emit(ctx, { type: 'power.slow_motion.start', cells: [...g.cells], symbol: CODE_TO_ID[r.T], party, kind: 'frozen' });
      }
      break;
    }
    case 'FREEZE_AND_FREAK': if (!cluster) slowMotion(ctx, null, party, tag, 'freeze', f.puxoesMax); break; // com cluster: antes da remoção
  }
}

// Decide a ação de cada despertar (antes da remoção dos vencedores).
function decideAwakenings(ctx, paid) {
  const actions = [];
  const seen = new Set();
  for (const p of paid) {
    if (!isPremium(p.type) || p.size < ctx.cfg.awakenMin) continue;
    const persona = PREMIUM_PERSONA[p.type];
    if (seen.has(persona)) continue;
    seen.add(persona);
    const fires = ctx.fires[persona] || 0;
    if (fires >= ctx.cfg.powers.maxDisparosPorSpin) continue;
    let kind;
    if (!ctx.awake.has(persona)) kind = 'awaken';
    else if (ctx.inBonus) kind = 'refire';
    else continue;
    ctx.fires[persona] = fires + 1;
    let fusion = null;
    const prevLevel = ctx.awake.size;
    if (kind === 'awaken') {
      if (!ctx.calmer && ctx.awake.size && !ctx.off.has('fusoes')) {
        let best = null;
        for (const q of ctx.awake) {
          const f = fusionFor(persona, q);
          if (ctx.off.has(f.id)) continue;
          if (!ctx.fused.has(f.id) && (!best || f.rank < best.rank)) best = f;
        }
        fusion = best;
        if (fusion) ctx.fused.add(fusion.id);
      }
      ctx.awake.add(persona); ctx.awakeOrder.push(persona);
    } else if (!ctx.calmer && !ctx.off.has('fusoes')) {
      let best = null;
      for (const q of ctx.awake) {
        if (q === persona) continue;
        const f = fusionFor(persona, q);
        if (ctx.off.has(f.id)) continue;
        if (ctx.fused.has(f.id) && (!best || f.rank < best.rank)) best = f;
      }
      fusion = best;
    }
    const cluster = { type: p.type, cells: p.cells.slice(), size: p.size };
    emit(ctx, { type: 'persona.awaken', persona, kind, cluster: cluster.cells, fusion: fusion ? fusion.id : null, party: ctx.partyMode });
    if (fusion) emit(ctx, { type: 'fusion.trigger', fusionId: fusion.id, pair: fusion.par, persona });
    // efeitos que precisam do cluster antes da remoção
    const finalMode = ctx.cfg.powers.WEED.pagamentoAoCrescer === 'tamanho-final';
    if (!fusion && persona === 'WEED' && !powerOff(ctx, 'WEED')) { if (slowMotion(ctx, cluster, ctx.partyMode, TAG.SLOW_MOTION) && finalMode) p.deferred = true; }
    if (fusion && fusion.id === 'FREEZE_AND_FREAK') { if (slowMotion(ctx, cluster, ctx.partyMode, TAG.FREEZE_AND_FREAK, 'freeze', fusion.puxoesMax) && finalMode) p.deferred = true; }
    actions.push({ persona, kind, fusion, cluster, prevLevel, level: ctx.awake.size });
  }
  return actions;
}

function openCorners(ctx, n) {
  if (ctx.off.has('cantos')) return 0;
  const closed = ctx.cfg.corners.filter((c) => ctx.sym[c] === LOCK);
  ctx.rng.shuffle(closed);
  const init = ctx.bonus ? ctx.bonus.cwInit : ctx.cfg.corners_.multiplicadorInicial;
  const opened = closed.slice(0, n);
  for (const c of opened) {
    ctx.sym[c] = CW; ctx.mult[c] = init; ctx.tag[c] = 0;
    if (ctx.bonus) ctx.bonus.corners.set(c, init);
    emit(ctx, { type: 'corner.open', cell: c, multiplier: init });
  }
  return opened.length;
}

function afterAwaken(ctx, prevLevel, level) {
  if (level !== prevLevel) {
    emit(ctx, { type: 'chemistry.level', from: prevLevel, to: level });
    if (!ctx.calmer) {
      if (level >= 3 && prevLevel < 3) openCorners(ctx, ctx.cfg.chemistry.cantosNivel3);
      if (level >= 4 && prevLevel < 4) openCorners(ctx, ctx.cfg.chemistry.cantosNivel4);
      if (level >= 5 && !ctx.totalDone) totalChemistry(ctx);
    }
  }
}

function totalChemistry(ctx) {
  ctx.totalDone = true;
  if (ctx.bonus) ctx.bonus.totalDone = true;
  if (ctx.off.has('total')) return;
  emit(ctx, { type: 'chemistry.total' });
  const ch = ctx.cfg.chemistry;
  if (ch.totalDuplicaMultiplicadores) {
    const cap = ctx.cfg.corners_.multiplicadorMaxAbsoluto;
    for (let i = 0; i < NC; i++) {
      if (ctx.sym[i] === CW || ctx.sym[i] === DW) {
        const from = ctx.mult[i], to = Math.min(cap, from * 2);
        if (to !== from) { ctx.mult[i] = to; emit(ctx, { type: 'multiplier.change', cell: i, from, to }); }
      }
    }
  }
  if (ch.totalRepetePoderesParty) {
    for (const p of PERSONAS) if (ctx.awake.has(p)) { if (p === 'COPIUM') armCopium(ctx, {}, true); else runSolo(ctx, p, null, true); }
  }
}

function placeBadge(ctx) {
  if (ctx.off.has('distintivo')) return null;
  const pol = ctx.cfg.police;
  const m = pol.dwMults[ctx.rng.pickCum(pol.dwCum)];
  const g = largestGroup(ctx, true);
  let cand = [];
  if (g) for (const c of g.cells) for (const n of ctx.cfg.ortho[c]) if (isFree(ctx, n) && !isWild(ctx.sym[n]) && !g.cells.includes(n) && !cand.includes(n)) cand.push(n);
  if (!cand.length) for (let i = 0; i < NC; i++) if (isFree(ctx, i) && isPaying(ctx.sym[i])) cand.push(i);
  if (!cand.length) return null;
  const c = ctx.rng.pick(cand);
  ctx.sym[c] = DW; ctx.mult[c] = m; ctx.tag[c] = 0; ctx.stickyW[c] = 0;
  emit(ctx, { type: 'wild.place', cell: c, multiplier: m, source: 'DISTINTIVO' });
  return { cell: c, multiplier: m };
}

function enterJoiner(ctx, refire) {
  ctx.partyMode = true;
  const badge = placeBadge(ctx);
  emit(ctx, { type: 'police.joiner.party_mode', personas: [...ctx.awakeOrder], badge });
  if (refire && ctx.cfg.police.joinerRepetePoderes) {
    for (const p of ctx.awakeOrder) { if (p === 'COPIUM') armCopium(ctx, {}, true); else runSolo(ctx, p, null, true); }
  }
}

function policeCheck(ctx) {
  if (ctx.police) return;
  const pol = ctx.cfg.police;
  let mode = null;
  if (ctx.force && ctx.force.police === 'none') return;
  if (ctx.force && ctx.force.police && !ctx.force.policeUsed) { mode = ctx.force.police; ctx.force.policeUsed = true; }
  else {
    if (!ctx.rng.chance(pol.probAparecer[ctx.modeKey])) return;
    mode = ctx.rng.chance(pol.probJoiner[ctx.modeKey]) ? 'joiner' : 'calmer';
  }
  if (ctx.off.has(mode)) return; // análise: este modo do Peace Police está desligado
  ctx.police = true;
  emit(ctx, { type: 'police.enter', mode });
  if (mode === 'calmer') {
    ctx.calmer = true;
    const cells = [];
    for (let i = 0; i < NC; i++) if (isLow(ctx.sym[i]) && !isSticky(ctx, i)) { ctx.sym[i] = EMPTY; ctx.tag[i] = 0; cells.push(i); }
    emit(ctx, { type: 'police.calmer.arrest', cells });
    if (cells.length) refill(ctx, TAG.CALMER);
  } else {
    enterJoiner(ctx, true);
  }
}

// ---------------------------------------------------------------------------
// Ciclo de cascatas
// ---------------------------------------------------------------------------
function runCascade(ctx) {
  for (;;) {
    if (ctx.round.capped || ctx.safety) return;
    ctx.cycle++;
    if (ctx.cycle > ctx.cfg.maxCycles) { ctx.safety = true; emit(ctx, { type: 'safety.stop', cycles: ctx.cycle }); return; }
    const { cands, growOnly } = evaluate(ctx);
    // os despertares decidem-se antes de pagar (um cluster que vira grupo em 'tamanho-final' não paga já)
    const outer = ctx.events; ctx.events = [];
    const actions = decideAwakenings(ctx, cands);
    const awakenEvents = ctx.events; ctx.events = outer;
    const paid = payClusters(ctx, cands, growOnly);
    for (const e of awakenEvents) ctx.events.push(e);
    if (ctx.round.capped) return;
    // remoção dos vencedores (exceto sticky)
    const removed = [];
    for (const p of paid) for (const c of p.cells) {
      if (ctx.sym[c] !== EMPTY && !isSticky(ctx, c)) { ctx.sym[c] = EMPTY; ctx.tag[c] = 0; removed.push(c); }
    }
    const deferredOrPaid = actions.length || paid.length;
    removed.push(...dissolveGroups(ctx));
    let changed = false;
    if (removed.length) {
      emit(ctx, { type: 'grid.remove', cells: removed });
      refill(ctx);
      changed = true;
    }
    for (const a of actions) {
      if (a.fusion) runFusion(ctx, a.fusion, a.cluster);
      else runSolo(ctx, a.persona, a.cluster, ctx.partyMode);
      afterAwaken(ctx, a.prevLevel, a.level);
      policeCheck(ctx);
      changed = true;
    }
    if (growGroups(ctx)) changed = true;
    if (slowDisasterSteps(ctx)) changed = true;
    if (mayhemJumps(ctx)) changed = true;
    if (!deferredOrPaid && !changed) return;
  }
}

// Um spin visível completo (cascatas + respins). Devolve o nº de Scatters.
function playSpin(ctx) {
  initialDrop(ctx);
  // forçamentos de diagnóstico: personagens já despertas
  if (ctx.force && ctx.force.preAwake && !ctx.force.preAwakeUsed) {
    ctx.force.preAwakeUsed = true;
    for (const p of ctx.force.preAwake) if (!ctx.awake.has(p)) { ctx.awake.add(p); ctx.awakeOrder.push(p); }
  }
  if (ctx.bonus && ctx.bonus.def.joinerEmTodosOsSpins && !ctx.off.has('joiner')) {
    ctx.police = true;
    emit(ctx, { type: 'police.enter', mode: 'joiner' });
    ctx.partyMode = true;
    const badge = ctx.bonus.def.distintivoEmTodosOsSpins ? placeBadge(ctx) : null;
    emit(ctx, { type: 'police.joiner.party_mode', personas: [...ctx.awakeOrder], badge });
  }
  runCascade(ctx);
  let seq = 0;
  while (ctx.copium.armed && seq < 2 && !ctx.round.capped && !ctx.safety) { seq++; runRespins(ctx); }
  finalizeGroups(ctx);
  return countSym(ctx, S);
}

// ---------------------------------------------------------------------------
// Bónus
// ---------------------------------------------------------------------------
function playBonus(round, bonusId, steps) {
  const cfg = CFG;
  const def = cfg.bonus[bonusId];
  const rng = round.rng;
  const st = {
    id: bonusId, def,
    awake: new Set(), awakeOrder: [], fused: new Set(),
    corners: new Map(), cwInit: def.multCantoInicial, totalDone: false,
  };
  const force = round.force;
  // estado inicial
  const pool = PERSONAS.slice();
  if (force && force.bonusAwake) for (const p of force.bonusAwake) { st.awake.add(p); st.awakeOrder.push(p); }
  else {
    rng.shuffle(pool);
    for (let k = 0; k < def.personagensIniciais; k++) { st.awake.add(pool[k]); st.awakeOrder.push(pool[k]); }
  }
  if (st.awakeOrder.length >= 2) st.fused.add(fusionFor(st.awakeOrder[0], st.awakeOrder[1]).id);
  const corners = cfg.corners.slice();
  rng.shuffle(corners);
  if (!round.off.has('cantos')) for (let k = 0; k < def.cantosIniciais; k++) st.corners.set(corners[k], def.multCantoInicial);

  let total = def.spins, played = 0;
  let bonusWin = 0;
  while (played < total && !round.capped) {
    played++;
    const ctx = newSpinCtx(round, { weights: def.pesos, modeKey: bonusId, bonus: st, force: played === 1 ? force : null });
    for (const [c, m] of st.corners) { ctx.sym[c] = CW; ctx.mult[c] = def.cantosPersistemMultiplicador ? m : def.multCantoInicial; }
    emit(ctx, { type: 'step.start', kind: 'bonus', bonusId, freeSpins: { played: played - 1, total }, awake: [...st.awakeOrder], fused: [...st.fused], corners: [...st.corners.keys()] });
    const nS = playSpin(ctx);
    // persistência dos cantos
    for (const c of cfg.corners) {
      if (ctx.sym[c] === CW) st.corners.set(c, def.cantosPersistemMultiplicador ? ctx.mult[c] : def.multCantoInicial);
    }
    if (nS >= cfg.retrigger.scattersMinimos && !round.capped) {
      const add = Math.min(cfg.retrigger.spinsExtra, cfg.retrigger.spinsMaximoTotal - total);
      if (add > 0) { total += add; emit(ctx, { type: 'bonus.retrigger', scatters: nS, added: add, total }); }
    }
    bonusWin += ctx.stepWin;
    const last = played >= total || round.capped;
    if (last) emit(ctx, { type: 'bonus.end', bonusId, totalWin: bonusWin, spins: played });
    emit(ctx, { type: 'step.end', win: ctx.stepWin, roundWinSoFar: round.win });
    steps.push({ index: steps.length, kind: 'bonus', bonusId, events: ctx.events, win: ctx.stepWin, roundWinSoFar: round.win, freeSpins: { played, total } });
  }
}

// ---------------------------------------------------------------------------
// Jogada completa
// ---------------------------------------------------------------------------
let roundCounter = 0;

/**
 * Funcionalidades que se podem desligar PARA ANÁLISE (request.desligar). O jogo nunca usa isto:
 * serve para medir o valor real de cada peça comparando o RTP com e sem ela.
 */
export const DESLIGAVEIS = ['poderes', 'LCD', 'WEED', 'MDMA', 'ALCOOL', 'COPIUM', 'fusoes',
  ...CFG.fusions.map((f) => f.id), 'cantos', 'distintivo', 'joiner', 'calmer', 'total'];

/**
 * Joga uma ronda completa (spin pago + bónus, ou compra de bónus).
 * @param {number[]} rngState estado do RNG (seedState(...) ou rngAfter da ronda anterior)
 * @param {{bet:number, mode:string, force?:object}} request bet em cêntimos
 */
export function playRound(rngState, request) {
  const cfg = CFG;
  const mode = cfg.modes[request.mode || 'base'];
  if (!mode) throw new Error(`Modo desconhecido: ${request.mode}`);
  const bet = request.bet ?? cfg.bets[0];
  const rng = new Rng(rngState);
  const force = request.force ? JSON.parse(JSON.stringify(request.force)) : null;
  const off = new Set(request.desligar || []);
  for (const k of off) if (!DESLIGAVEIS.includes(k)) throw new Error(`--desligar: «${k}» não existe. Opções: ${DESLIGAVEIS.join(', ')}`);
  const round = { rng, win: 0, capped: false, force, off };
  const steps = [];

  if (mode.bonus) {
    playBonus(round, mode.bonus, steps);
  } else {
    const ctx = newSpinCtx(round, { weights: mode.pesos, modeKey: mode.id, force });
    emit(ctx, { type: 'step.start', kind: 'base', bonusId: null, freeSpins: null });
    const nS = playSpin(ctx);
    let bonusId = null;
    if (!round.capped) bonusId = cfg.activation[Math.min(nS, 5)] || null;
    if (force && force.bonus) bonusId = force.bonus;
    if (bonusId) emit(ctx, { type: 'bonus.trigger', bonusId, scatters: nS, freeSpins: cfg.bonus[bonusId].spins });
    emit(ctx, { type: 'step.end', win: ctx.stepWin, roundWinSoFar: round.win });
    steps.push({ index: 0, kind: 'base', bonusId: null, events: ctx.events, win: ctx.stepWin, roundWinSoFar: round.win, freeSpins: null });
    if (bonusId) playBonus(round, bonusId, steps);
  }

  const totalWinMils = round.win;
  return {
    roundId: request.roundId || `r${++roundCounter}`,
    version: cfg.version,
    mode: mode.id,
    bet,
    cost: Math.round(bet * mode.costMils / 1000),
    costMils: mode.costMils,
    steps,
    totalWinMils,
    totalWin: Math.floor(bet * totalWinMils / 1000),
    capped: round.capped,
    forced: !!force,
    desligado: [...off],
    rngAfter: rng.state(),
  };
}
