// Configuração executável: lê as tabelas, deriva as estruturas do motor,
// valida tudo ao arrancar e congela o resultado (Object.freeze em profundidade).
// Uma tabela inválida faz o motor falhar logo, com uma mensagem clara.

import { MATH_VERSION, HISTORICO } from '../tabelas/versao.js';
import { JOGO, MODOS, ALVO } from '../tabelas/jogo.js';
import { SIMBOLOS, PESOS, EMPILHAMENTO } from '../tabelas/simbolos.js';
import { PAGAMENTOS } from '../tabelas/pagamentos.js';
import { PODERES, FUSOES, CHEMISTRY, CANTOS } from '../tabelas/poderes.js';
import { PEACE_POLICE } from '../tabelas/peace-police.js';
import { ATIVACAO, BONUS, RETRIGGER } from '../tabelas/bonus.js';

export { MATH_VERSION };

// ---------------------------------------------------------------------------
// Códigos internos dos símbolos (estáveis; a UI usa os IDs em texto)
// ---------------------------------------------------------------------------
export const LOCK = -1, EMPTY = 0;
export const N1 = 1, N2 = 2, N3 = 3, N4 = 4, N5 = 5;
export const P1 = 6, P2 = 7, P3 = 8, P4 = 9, P5 = 10;
export const W = 11, CW = 12, DW = 13, S = 14;
export const CODE_TO_ID = ['', 'N1', 'N2', 'N3', 'N4', 'N5', 'P1', 'P2', 'P3', 'P4', 'P5', 'W', 'CW', 'DW', 'S'];
export const ID_TO_CODE = Object.fromEntries(CODE_TO_ID.map((id, c) => [id, c]).filter(([id]) => id));
ID_TO_CODE.LOCK = LOCK;

export const isPaying = (c) => c >= 1 && c <= 10;
export const isLow = (c) => c >= 1 && c <= 5;
export const isPremium = (c) => c >= 6 && c <= 10;
export const isWild = (c) => c >= 11 && c <= 13;
export const isMultWild = (c) => c === CW || c === DW;

// Personagens
export const PERSONAS = ['WEED', 'ALCOOL', 'COPIUM', 'MDMA', 'LCD'];
export const PERSONA_PREMIUM = { WEED: P1, ALCOOL: P2, COPIUM: P3, MDMA: P4, LCD: P5 };
export const PERSONA_LOW = { WEED: N1, ALCOOL: N2, COPIUM: N3, MDMA: N4, LCD: N5 };
export const PREMIUM_PERSONA = { [P1]: 'WEED', [P2]: 'ALCOOL', [P3]: 'COPIUM', [P4]: 'MDMA', [P5]: 'LCD' };

// Etiquetas de origem (atribuição de prémios a funcionalidades)
export const TAGS = [
  'natural',
  'REALITY_BREAK', 'SLOW_MOTION', 'RAVE_RUSH', 'DRUNK_WALK', 'ONE_MORE_CHANCE',
  'NEVER_ENDING_DREAM', 'ONE_MORE_ROUND', 'SLOW_DISASTER', 'RAVE_DIMENSION', 'TOTAL_MAYHEM',
  'FROZEN_REALITY', 'FREEZE_AND_FREAK', 'DREAM_GLITCH', 'ONE_MORE_RAVE', 'DOUBLE_VISION',
  'CALMER',
  'mult:CW', 'mult:DW',
];
export const TAG = Object.fromEntries(TAGS.map((t, i) => [t, i]));
export const POWER_TAG = { LCD: TAG.REALITY_BREAK, WEED: TAG.SLOW_MOTION, MDMA: TAG.RAVE_RUSH, ALCOOL: TAG.DRUNK_WALK, COPIUM: TAG.ONE_MORE_CHANCE };

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------
const errors = [];
const fail = (m) => errors.push(m);
const isInt = (v) => Number.isInteger(v);
const pctOk = (v) => typeof v === 'number' && v >= 0 && v <= 100;

const DRAW_CODES = [N1, N2, N3, N4, N5, P1, P2, P3, P4, P5, S];

function buildWeights(name, w) {
  const ids = DRAW_CODES.map((c) => CODE_TO_ID[c]);
  for (const id of ids) {
    if (!isInt(w[id]) || w[id] < 0) fail(`PESOS.${name}.${id} tem de ser inteiro >= 0`);
  }
  for (const k of Object.keys(w)) if (!ids.includes(k)) fail(`PESOS.${name}: símbolo desconhecido ou não sorteável «${k}»`);
  const order = ['N1', 'N2', 'N3', 'N4', 'N5', 'P1', 'P2', 'P3', 'P4', 'P5'];
  for (let i = 0; i < order.length; i++) {
    if (!(w[order[i]] > 0)) fail(`PESOS.${name}.${order[i]} tem de ser > 0`);
    if (i > 0 && !(w[order[i]] < w[order[i - 1]])) fail(`PESOS.${name}: raridade tem de ser estritamente decrescente (${order[i - 1]} > ${order[i]})`);
  }
  const cumAll = [], cumNoS = [];
  let a = 0, b = 0;
  for (const c of DRAW_CODES) {
    const v = w[CODE_TO_ID[c]] || 0;
    a += v; cumAll.push(a);
    if (c !== S) { b += v; cumNoS.push(b); }
  }
  const lowCum = []; let l = 0;
  for (const c of [N1, N2, N3, N4, N5]) { l += w[CODE_TO_ID[c]]; lowCum.push(l); }
  return {
    codes: DRAW_CODES, cumAll, cumNoS, codesNoS: DRAW_CODES.filter((c) => c !== S),
    lowCodes: [N1, N2, N3, N4, N5], lowCum, total: a,
    prob: Object.fromEntries(DRAW_CODES.map((c) => [CODE_TO_ID[c], (w[CODE_TO_ID[c]] || 0) / a])),
  };
}

const weights = {};
for (const [name, w] of Object.entries(PESOS)) {
  weights[name] = buildWeights(name, w);
  const e = EMPILHAMENTO[name];
  if (!e) { fail(`EMPILHAMENTO.${name} em falta (há PESOS.${name})`); continue; }
  for (const cat of ['baixo', 'premium']) for (const dir of ['vertical', 'horizontal']) {
    if (!pctOk(e[cat] && e[cat][dir])) fail(`EMPILHAMENTO.${name}.${cat}.${dir} tem de ser 0..100`);
  }
  weights[name].stack = e;
}

// Pagamentos -> milésimos de aposta
const SIZES = JOGO.tamanhoMaximoTabela - JOGO.clusterMinimo + 1;
const pay = new Array(11).fill(null);
for (let c = 1; c <= 10; c++) {
  const id = CODE_TO_ID[c];
  const row = PAGAMENTOS[id];
  if (!Array.isArray(row) || row.length !== SIZES) { fail(`PAGAMENTOS.${id} tem de ter ${SIZES} valores (tamanhos ${JOGO.clusterMinimo}..${JOGO.tamanhoMaximoTabela}+)`); continue; }
  pay[c] = row.map((v, i) => {
    const m = Math.round(v * 1000);
    if (!(v >= 0) || Math.abs(m - v * 1000) > 1e-6) fail(`PAGAMENTOS.${id}[${i}] = ${v}: tem de ser >= 0 com no máximo 3 casas decimais`);
    if (i > 0 && v < row[i - 1]) fail(`PAGAMENTOS.${id}: os valores não podem descer com o tamanho`);
    return m;
  });
}

// Modos
const modes = {};
for (const [id, m] of Object.entries(MODOS)) {
  if (!(m.custo > 0)) fail(`MODOS.${id}.custo tem de ser > 0`);
  const costMils = Math.round(m.custo * 1000);
  if (Math.abs(costMils - m.custo * 1000) > 1e-6) fail(`MODOS.${id}.custo: no máximo 3 casas decimais`);
  if (m.pesos && !weights[m.pesos]) fail(`MODOS.${id}.pesos «${m.pesos}» não existe em PESOS`);
  if (m.bonus && !BONUS[m.bonus]) fail(`MODOS.${id}.bonus «${m.bonus}» não existe em BONUS`);
  if (!m.pesos && !m.bonus) fail(`MODOS.${id}: precisa de «pesos» (jogo) ou «bonus» (compra)`);
  modes[id] = { id, ...m, costMils };
}
if (!modes.base) fail('MODOS.base é obrigatório');

// Bónus
for (const [id, b] of Object.entries(BONUS)) {
  if (!weights[b.pesos]) fail(`BONUS.${id}.pesos «${b.pesos}» não existe em PESOS`);
  if (!(isInt(b.spins) && b.spins > 0)) fail(`BONUS.${id}.spins tem de ser inteiro > 0`);
  if (!(b.personagensIniciais >= 0 && b.personagensIniciais <= 5)) fail(`BONUS.${id}.personagensIniciais 0..5`);
  if (!(b.cantosIniciais >= 0 && b.cantosIniciais <= 4)) fail(`BONUS.${id}.cantosIniciais 0..4`);
  if (!(isInt(b.multCantoMax) && b.multCantoMax >= b.multCantoInicial)) fail(`BONUS.${id}.multCantoMax tem de ser inteiro >= multCantoInicial`);
  if (!(PEACE_POLICE.probAparecer[id] !== undefined && PEACE_POLICE.probJoiner[id] !== undefined)) fail(`PEACE_POLICE: faltam probabilidades para o bónus «${id}»`);
}
for (const [n, b] of Object.entries(ATIVACAO)) if (!BONUS[b]) fail(`ATIVACAO.${n} -> bónus «${b}» não existe`);

// Peace Police
for (const k of ['probAparecer', 'probJoiner']) {
  for (const [m, v] of Object.entries(PEACE_POLICE[k])) if (!pctOk(v)) fail(`PEACE_POLICE.${k}.${m} tem de ser 0..100`);
}
for (const m of Object.keys(modes)) {
  const wset = modes[m].pesos;
  if (wset && (PEACE_POLICE.probAparecer[m] === undefined || PEACE_POLICE.probJoiner[m] === undefined)) fail(`PEACE_POLICE: faltam probabilidades para o modo «${m}»`);
}
const dwMults = Object.keys(PEACE_POLICE.distintivo).map(Number);
const dwCum = []; { let a = 0; for (const k of dwMults) { const v = PEACE_POLICE.distintivo[k]; if (!isInt(v) || v < 0) fail('PEACE_POLICE.distintivo: pesos inteiros >= 0'); a += v; dwCum.push(a); } if (a <= 0) fail('PEACE_POLICE.distintivo: soma dos pesos > 0'); }

// Fusões
const fusionByPair = {};
const ranks = new Set();
for (const f of FUSOES) {
  if (f.par.length !== 2 || !f.par.every((p) => PERSONAS.includes(p)) || f.par[0] === f.par[1]) fail(`FUSOES.${f.id}: par inválido`);
  const key = [...f.par].sort().join('+');
  if (fusionByPair[key]) fail(`FUSOES: par repetido ${key}`);
  if (ranks.has(f.rank)) fail(`FUSOES: rank repetido ${f.rank}`);
  ranks.add(f.rank);
  if (TAG[f.id] === undefined) fail(`FUSOES.${f.id}: id desconhecido do motor`);
  fusionByPair[key] = f;
}
if (Object.keys(fusionByPair).length !== 10) fail('FUSOES: têm de existir exatamente as 10 fusões (todos os pares)');

if (!['tamanho-final', 'diferenca', 'novo-tamanho'].includes(PODERES.WEED.pagamentoAoCrescer)) fail("PODERES.WEED.pagamentoAoCrescer tem de ser 'tamanho-final', 'diferenca' ou 'novo-tamanho'");
if (!pctOk(PODERES.COPIUM.probRaspadinha)) fail('PODERES.COPIUM.probRaspadinha 0..100');
if (!(CANTOS.multiplicadorMax >= CANTOS.multiplicadorInicial)) fail('CANTOS.multiplicadorMax >= multiplicadorInicial');
if (!(JOGO.ganhoMaximo > 0)) fail('JOGO.ganhoMaximo > 0');
if (!(JOGO.clusterMinimoReais >= 1 && JOGO.clusterMinimoReais <= JOGO.clusterMinimo)) fail('JOGO.clusterMinimoReais entre 1 e clusterMinimo');

if (errors.length) {
  throw new Error('Configuração inválida:\n - ' + errors.join('\n - '));
}

// ---------------------------------------------------------------------------
// Geometria
// ---------------------------------------------------------------------------
const C = JOGO.colunas, R = JOGO.linhas;
const idx = (col, row) => col * R + row;
const cornerCells = JOGO.cantos.map(([c, r]) => idx(c, r));
const ortho = [], diag = [];
for (let col = 0; col < C; col++) for (let row = 0; row < R; row++) {
  const o = [], d = [];
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const c2 = col + dc, r2 = row + dr;
    if (c2 >= 0 && c2 < C && r2 >= 0 && r2 < R) o.push(idx(c2, r2));
  }
  for (const [dc, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const c2 = col + dc, r2 = row + dr;
    if (c2 >= 0 && c2 < C && r2 >= 0 && r2 < R) d.push(idx(c2, r2));
  }
  ortho[idx(col, row)] = o; diag[idx(col, row)] = d;
}

// ---------------------------------------------------------------------------
// Hash da configuração (para os relatórios)
// ---------------------------------------------------------------------------
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
const TABLES = { JOGO, MODOS, ALVO, SIMBOLOS, PESOS, EMPILHAMENTO, PAGAMENTOS, PODERES, FUSOES, CHEMISTRY, CANTOS, PEACE_POLICE, ATIVACAO, BONUS, RETRIGGER };
export const CONFIG_HASH = fnv1a(JSON.stringify(TABLES));

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

export const config = deepFreeze({
  version: MATH_VERSION,
  hash: CONFIG_HASH,
  historico: HISTORICO,
  tables: TABLES,
  cols: C, rows: R, cells: C * R,
  corners: cornerCells,
  ortho, diag,
  clusterMin: JOGO.clusterMinimo,
  clusterMinReal: JOGO.clusterMinimoReais,
  awakenMin: JOGO.despertarMinimo,
  payMaxSize: JOGO.tamanhoMaximoTabela,
  scatterMaxPerCol: JOGO.scatterMaximoPorColuna,
  maxWinMils: JOGO.ganhoMaximo * 1000,
  maxCycles: JOGO.limiteCiclosPorSpin,
  bets: JOGO.apostas,
  pay, weights, modes,
  powers: PODERES, fusions: FUSOES, fusionByPair, chemistry: CHEMISTRY, corners_: CANTOS,
  police: { ...PEACE_POLICE, dwMults, dwCum },
  activation: ATIVACAO, bonus: BONUS, retrigger: RETRIGGER,
  target: ALVO,
});

export function fusionFor(a, b) {
  return fusionByPair[[a, b].sort().join('+')];
}
