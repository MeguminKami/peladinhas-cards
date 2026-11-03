#!/usr/bin/env node
// ============================================================================
// SIMULADOR — PEACE POLICE: THE AFTERPARTY
// ----------------------------------------------------------------------------
//   npm run sim                         tudo: 250 000 base + 250 000 hunt + 50 000 de cada compra
//   npm run sim -- --modo base          só um modo (base | hunt | buy-afterparty | buy-vip | buy-police | compras)
//   npm run sim -- --spins 1000000      nº de spins para base/hunt
//   npm run sim -- --compras 100000     nº de compras por bónus
//   npm run sim -- --seed teste1        seed fixa (reproduzível). Sem --seed: seed nova a cada corrida
//   npm run sim -- --workers 4          nº de processos em paralelo (por omissão: núcleos - 1)
//   npm run sim -- --resumo             só a tabela de resumo
//   npm run sim -- --sem-ficheiros      não grava relatórios
//   npm run sim:rapido                  25 000 spins / 5 000 compras (para testar depressa)
//   npm run validate:rtp                corre o protocolo completo e diz se cumpre o alvo
//   npm run sim -- --desligar fusoes    ANÁLISE: corre com uma peça desligada (lista: --desligar ajuda)
//   npm run sim -- --modo buy-police --impacto
//                                       ANÁLISE: mede quanto RTP vale cada peça (corre com e sem cada uma)
// ============================================================================
import { Worker } from 'node:worker_threads';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, MATH_VERSION, CONFIG_HASH, TAGS, PERSONAS } from '../src/config.js';
import { ModeStats, decomposedRtp } from '../src/simulation.js';
import { DESLIGAVEIS } from '../src/engine.js';
import { pt, int, pct, x, oneIn, c, table, csv } from './format.js';
const POWER_TAG_NAME = { LCD: 'REALITY_BREAK', WEED: 'SLOW_MOTION', MDMA: 'RAVE_RUSH', ALCOOL: 'DRUNK_WALK', COPIUM: 'ONE_MORE_CHANCE' };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- argumentos
const args = process.argv.slice(2);
const WITH_VALUE = ['spins', 'compras', 'seed', 'workers', 'modo', 'desligar', 'impacto'];
const FLAGS = ['rapido', 'validar', 'resumo', 'sem-ficheiros', 'impacto'];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!a.startsWith('--')) { if (i > 0 && WITH_VALUE.includes(args[i - 1].slice(2))) continue; }
  const name = a.slice(2);
  if (!a.startsWith('--') || (!WITH_VALUE.includes(name) && !FLAGS.includes(name))) {
    console.error(`Opção desconhecida: «${a}». Opções: ${[...new Set([...WITH_VALUE, ...FLAGS])].map((o) => '--' + o).join(' ')}`);
    process.exit(1);
  }
}
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def; };
const flag = (name) => args.includes('--' + name);
const rapido = flag('rapido');
const SPINS = Number(opt('spins', rapido ? 25000 : 250000));
const BUYS = Number(opt('compras', rapido ? 5000 : 50000));
const SEED = opt('seed', `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`);
const WORKERS = Math.max(1, Number(opt('workers', Math.max(1, os.cpus().length - 1))));
const VALIDAR = flag('validar');
const RESUMO = flag('resumo');
const FILES = !flag('sem-ficheiros');
const desligarArg = opt('desligar', '');
if (args.includes('--desligar') && (!desligarArg || desligarArg === 'ajuda')) {
  console.log('Pode desligar-se (separado por vírgulas): ' + DESLIGAVEIS.join(', '));
  process.exit(desligarArg === 'ajuda' ? 0 : 1);
}
const DESLIGAR = desligarArg ? desligarArg.split(',') : [];
for (const k of DESLIGAR) if (!DESLIGAVEIS.includes(k)) { console.error(`--desligar: «${k}» não existe. Opções: ${DESLIGAVEIS.join(', ')}`); process.exit(1); }
const IMPACTO = flag('impacto');
const IMPACTO_DEFAULT = ['poderes', 'fusoes', 'cantos', 'distintivo', 'joiner', 'calmer', 'total', 'LCD', 'WEED', 'MDMA', 'ALCOOL', 'COPIUM', ...config.fusions.map((f) => f.id)];
const impactoArg = opt('impacto', '');
const IMPACTO_LIST = impactoArg ? impactoArg.split(',') : IMPACTO_DEFAULT;
for (const k of IMPACTO_LIST) if (!DESLIGAVEIS.includes(k)) { console.error(`--impacto: «${k}» não existe. Opções: ${DESLIGAVEIS.join(', ')}`); process.exit(1); }

const BUY_MODES = Object.keys(config.modes).filter((m) => config.modes[m].bonus);
const PLAY_MODES = Object.keys(config.modes).filter((m) => !config.modes[m].bonus);
let modeArg = opt('modo', 'todos');
let modes;
if (modeArg === 'todos') modes = [...BUY_MODES, ...PLAY_MODES];
else if (modeArg === 'compras') modes = BUY_MODES;
else modes = modeArg.split(',');
for (const m of modes) if (!config.modes[m]) { console.error(`Modo desconhecido: ${m}. Modos: ${Object.keys(config.modes).join(', ')}`); process.exit(1); }
// compras primeiro (o RTP decomposto do base/hunt precisa delas)
modes.sort((a, b) => (config.modes[b].bonus ? 1 : 0) - (config.modes[a].bonus ? 1 : 0));

// ---------------------------------------------------------------- execução
function runParallel(mode, rounds, desligar = DESLIGAR, label = mode) {
  return new Promise((resolve, reject) => {
    const w = Math.min(WORKERS, Math.max(1, Math.floor(rounds / 1000)));
    const per = Math.floor(rounds / w);
    const done = new Array(w).fill(0);
    const results = new Array(w);
    let finished = 0;
    const t0 = Date.now();
    const draw = () => {
      const d = done.reduce((a, b) => a + b, 0);
      const f = d / rounds;
      const bar = '█'.repeat(Math.round(f * 30)).padEnd(30, '░');
      const el = (Date.now() - t0) / 1000;
      const eta = f > 0 ? el / f - el : 0;
      if (process.stdout.isTTY) process.stdout.write(`\r  ${label.padEnd(22).slice(0, 22)} ${bar} ${pt(f * 100, 0).padStart(3)} %  ${int(d)}/${int(rounds)}  ${pt(el, 1)} s  (faltam ~${pt(eta, 0)} s)   `);
    };
    for (let k = 0; k < w; k++) {
      const n = k === w - 1 ? rounds - per * (w - 1) : per;
      const worker = new Worker(new URL('./sim-worker.js', import.meta.url), { workerData: { mode, rounds: n, seed: `${SEED}:${mode}:${k}`, desligar } });
      worker.on('message', (msg) => {
        if (msg.type === 'progress') { done[k] = msg.done; draw(); }
        else if (msg.type === 'done') {
          done[k] = n; results[k] = ModeStats.from(msg.stats); finished++; draw();
          if (finished === w) {
            if (process.stdout.isTTY) process.stdout.write('\n');
            else console.log(`  ${label}: ${int(rounds)} rondas em ${pt((Date.now() - t0) / 1000, 1)} s`);
            resolve({ stats: ModeStats.merge(results), seconds: (Date.now() - t0) / 1000 });
          }
        }
      });
      worker.on('error', reject);
    }
  });
}

const started = new Date();
console.log();
console.log(c.bold('PEACE POLICE: THE AFTERPARTY — SIMULAÇÃO'));
console.log(c.dim(`versão ${MATH_VERSION} · config ${CONFIG_HASH} · seed «${SEED}» · ${WORKERS} processos · ${started.toLocaleString('pt-PT')}`));
console.log(c.dim(`alvo RTP ${pt(config.target.rtpMin, 1)}–${pt(config.target.rtpMax, 1)} % · ganho máximo ${int(config.maxWinMils / 1000)}×`));
if (DESLIGAR.length) console.log(c.yellow(`ANÁLISE — desligado: ${DESLIGAR.join(', ')} (não é o jogo real)`));
console.log();

// ---------------------------------------------------------------- impacto (com e sem cada peça)
if (IMPACTO) {
  const rowsCsv = [];
  for (const m of modes) {
    const n = config.modes[m].bonus ? BUYS : SPINS;
    console.log(c.bold(`${config.modes[m].nome} — ${int(n)} rondas por variante, mesma seed`));
    const base = (await runParallel(m, n, DESLIGAR, 'completo')).stats.finalize();
    const rows = [];
    for (const v of IMPACTO_LIST) {
      const r = (await runParallel(m, n, [...DESLIGAR, v], 'sem ' + v)).stats.finalize();
      const diff = base.rtp - r.rtp;
      const ci = Math.sqrt(base.ci ** 2 + r.ci ** 2);
      rows.push({ v, r, diff, ci });
      rowsCsv.push([m, v, base.rtp * 100, r.rtp * 100, diff * 100, ci * 100, diff / base.rtp * 100]);
    }
    rows.sort((a, b) => b.diff - a.diff);
    console.log(table(`Quanto vale cada peça — ${config.modes[m].nome} (RTP completo ${pt(base.rtp * 100, 2)} % ± ${pt(base.ci * 100, 2)})`,
      [{ h: 'Sem…', a: 'l' }, { h: 'RTP sem ela' }, { h: 'Perde (pp)' }, { h: '± (pp)' }, { h: '% do RTP que depende dela' }],
      rows.map(({ v, r, diff, ci }) => [v, pt(r.rtp * 100, 2) + ' %', (diff >= 0 ? '' : '+') + pt(Math.abs(diff) * 100, 2), pt(ci * 100, 2), pt(diff / base.rtp * 100, 1) + ' %'])));
    console.log(c.dim('  «Perde» = RTP com tudo − RTP sem essa peça. Um valor negativo (+) quer dizer que o jogo paga MAIS sem ela.'));
    console.log(c.dim('  Se a diferença for menor do que o «±», não é distinguível de zero com esta amostra.') + '\n');
  }
  if (FILES) {
    const stamp = started.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    const dir = path.join(ROOT, 'relatorios', MATH_VERSION, stamp + '-impacto');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'impacto.csv'), csv(['modo', 'sem', 'rtp_completo_%', 'rtp_sem_%', 'perde_pp', 'margem_pp', 'pct_do_rtp'], rowsCsv));
    console.log(c.dim(`Gravado em ${path.relative(ROOT, dir)}${path.sep}impacto.csv`));
  }
  console.log(c.dim(`Para repetir: npm run sim -- --seed ${SEED} --modo ${modeArg} --impacto${impactoArg ? ' ' + impactoArg : ''}${SPINS !== 250000 ? ' --spins ' + SPINS : ''}${BUYS !== 50000 ? ' --compras ' + BUYS : ''}`));
  process.exit(0);
}

const results = {};
for (const m of modes) {
  const n = config.modes[m].bonus ? BUYS : SPINS;
  const { stats, seconds } = await runParallel(m, n);
  results[m] = { ...stats.finalize(), seconds };
}

// RTP decomposto
const buysByBonus = {};
for (const m of BUY_MODES) if (results[m]) buysByBonus[config.modes[m].bonus] = results[m];
for (const m of PLAY_MODES) if (results[m]) results[m].decomposed = Object.keys(buysByBonus).length === BUY_MODES.length ? decomposedRtp(results[m], buysByBonus) : null;

// ---------------------------------------------------------------- relatório
const inTarget = (r, ci = 0) => r * 100 >= config.target.rtpMin - 1e-9 && r * 100 <= config.target.rtpMax + 1e-9;
const mark = (r) => (inTarget(r) ? c.green('✔') : c.red('✖'));
const rtpStr = (r, ci) => `${pt(r * 100, 2)} % ± ${pt(ci * 100, 2)}`;

console.log();
const summaryRows = Object.values(results).map((r) => [
  r.name, int(r.rounds), x(r.costX, 1),
  `${mark(r.rtp)} ${rtpStr(r.rtp, r.ci)}`,
  r.decomposed ? `${mark(r.decomposed.rtp)} ${rtpStr(r.decomposed.rtp, r.decomposed.ci)}` : c.dim(config.modes[r.mode].bonus ? '(é direto)' : '(faltam compras)'),
  pt(r.sigma, 1), pct(r.hitFreq, 1), pct(r.netWinFreq, 1), x(r.maxX), x(r.minX), x(r.percentis.find((p) => p.p === 99).all), int(r.capHits),
]);
console.log(table('RESUMO', [
  { h: 'Modo', a: 'l' }, { h: 'Rondas' }, { h: 'Custo' }, { h: 'RTP direto (IC 95 %)' }, { h: 'RTP decomposto' },
  { h: 'σ' }, { h: 'Com prémio' }, { h: 'Ganho líquido' }, { h: '× máx.' }, { h: '× mín.' }, { h: 'p99' }, { h: 'Max win' },
], summaryRows));
console.log(c.dim('RTP decomposto = jogo base sem bónus + Σ (frequência do bónus × valor médio medido nas compras). Mais preciso com a mesma amostra.'));

function printMode(r) {
  console.log('\n' + c.cyan(c.bold(`━━━━━━━━ ${r.name.toUpperCase()} (${r.mode}) ━━━━━━━━`)));
  console.log(`  ${int(r.rounds)} rondas em ${pt(r.seconds, 1)} s · RTP ${rtpStr(r.rtp, r.ci)} (por lotes ± ${pt(r.ciBatch * 100, 2)}) · σ ${pt(r.sigma, 2)}`);
  console.log(`  prémio médio ${x(r.avgWinX, 3)} · prémio médio quando ganha ${x(r.avgHitX, 2)} · maior seca ${int(r.maxZeroStreak)} rondas sem prémio`);
  if (r.decomposed) console.log(`  RTP decomposto ${rtpStr(r.decomposed.rtp, r.decomposed.ci)} = base sem bónus ${pct(r.baseOnly.rtp)} + ` + r.decomposed.parts.map((p) => `${config.bonus[p.bonus].nome} ${pct(p.share)}`).join(' + '));

  console.log(table('Distribuição dos prémios (× aposta)', [{ h: 'Escalão', a: 'l' }, { h: 'Rondas' }, { h: 'Frequência' }, { h: '1 em' }, { h: 'Parte do RTP' }],
    r.hist.map((h) => [h.label, int(h.count), pct(h.freq, 3), h.count ? int(r.rounds / h.count) : '—', pct(h.rtpShare)])));
  console.log(table('Percentis (× aposta)', [{ h: 'Percentil', a: 'l' }, { h: 'Todas as rondas' }, { h: 'Só rondas com prémio' }],
    r.percentis.map((p) => [`p${pt(p.p, p.p % 1 ? 2 : 0)}`, x(p.all), x(p.hits)])));

  if (!config.modes[r.mode].bonus) {
    console.log(table('Bónus', [{ h: 'Bónus', a: 'l' }, { h: 'Saídas' }, { h: 'Frequência' }, { h: 'Prémio médio' }, { h: 'Desvio' }, { h: 'Máximo' }, { h: 'Parte do RTP' }],
      Object.entries(r.bonus).map(([b, s]) => [config.bonus[b].nome, int(s.count), oneIn(s.freq), x(s.avgWinX), x(s.sdWinX), x(s.maxWinX), pct(s.rtpShare)])));
  } else {
    const b = config.modes[r.mode].bonus;
    const s = r.bonus[b];
    console.log(`  ${config.bonus[b].nome}: prémio médio ${x(s.avgWinX)} (${pt(s.avgWinX / r.costX, 3)} × o preço) · desvio ${x(s.sdWinX)} · máximo ${x(s.maxWinX)} · retriggers ${pct(r.retriggers / r.rounds)} das compras · spins médios ${pt(r.bonusSpins / r.rounds, 2)}`);
    console.log(`  preço justo para RTP ${pt((config.target.rtpMin + config.target.rtpMax) / 2, 1)} %: ${x(s.avgWinX / ((config.target.rtpMin + config.target.rtpMax) / 200), 1)} (atual ${x(r.costX, 0)})`);
  }

  for (const [label, sp] of [['Funcionalidades — spins do jogo base', r.spinBase], ['Funcionalidades — free spins', r.spinBonus]]) {
    if (!sp.spins) continue;
    const f = (v) => v / sp.spins;
    const rows = [
      ['Spins', int(sp.spins), '', ''],
      ['Cascatas por spin (média / máx.)', pt(sp.cascades / sp.spins, 2), int(sp.maxCascades), ''],
      ['Spins com pelo menos 1 despertar', int(sp.withAwaken), pct(f(sp.withAwaken)), oneIn(f(sp.withAwaken))],
      ['Despertares (novos) por spin', pt(sp.awakenTotal / sp.spins, 3), '', ''],
      ['Re-disparos (bónus)', int(sp.refires), pct(f(sp.refires)), oneIn(f(sp.refires))],
      ...PERSONAS.map((p) => [`  despertar ${p}`, int(sp.persona[p]), pct(f(sp.persona[p])), oneIn(f(sp.persona[p]))]),
      ...[1, 2, 3, 4, 5].map((l) => [`  nível máx. de Chemistry = ${l}`, int(sp.level[l]), pct(f(sp.level[l])), oneIn(f(sp.level[l]))]),
      ...config.fusions.map((fu) => [`  fusão ${fu.id}`, int(sp.fusion[fu.id]), pct(f(sp.fusion[fu.id]), 3), oneIn(f(sp.fusion[fu.id]))]),
      ['Peace Police', int(sp.police), pct(f(sp.police)), oneIn(f(sp.police))],
      ['  CALMER', int(sp.calmer), pct(f(sp.calmer)), oneIn(f(sp.calmer))],
      ['  JOINER', int(sp.joiner), pct(f(sp.joiner)), oneIn(f(sp.joiner))],
      ['Cantos abertos', int(sp.corners), pct(f(sp.corners)), oneIn(f(sp.corners))],
      ['TOTAL CHEMISTRY', int(sp.total), pct(f(sp.total), 3), oneIn(f(sp.total))],
      ['Respins do COPIUM', int(sp.respins), pct(f(sp.respins)), oneIn(f(sp.respins))],
      ['Limite de segurança atingido', int(sp.safety), '', ''],
    ];
    console.log(table(label, [{ h: 'Métrica', a: 'l' }, { h: 'Total' }, { h: 'Por spin' }, { h: 'Frequência' }], rows));
  }

  // valor médio por disparo (aprox.: os re-disparos do Joiner/Total Chemistry também contam para a etiqueta)
  const fires = {};
  for (const sp of [r.spinBase, r.spinBonus]) {
    for (const p of PERSONAS) { const t = POWER_TAG_NAME[p]; fires[t] = (fires[t] || 0) + sp.solo[p]; }
    for (const fu of config.fusions) fires[fu.id] = (fires[fu.id] || 0) + sp.fusion[fu.id];
  }
  const vrows = Object.entries(fires).filter(([, n]) => n > 0).map(([t, n]) => [t, int(n), oneIn(n / (r.spinBase.spins + r.spinBonus.spins)), x(r.attrib[t].total * r.rounds * r.costX / n, 2), pct(r.attrib[t].total)]);
  if (vrows.length) console.log(table('Valor dos poderes e fusões', [{ h: 'Poder / fusão', a: 'l' }, { h: 'Disparos' }, { h: 'Frequência (por spin)' }, { h: 'Valor médio por disparo' }, { h: 'Parte do RTP' }], vrows));

  const at = Object.entries(r.attrib).filter(([, v]) => v.total > 0).sort((a, b) => b[1].total - a[1].total);
  console.log(table('De onde vem o RTP (atribuição dos prémios)', [{ h: 'Origem', a: 'l' }, { h: 'RTP total' }, { h: 'Só no jogo base' }],
    at.map(([k, v]) => [k, pct(v.total), pct(v.base)])));
  console.log(c.dim('  Cada prémio é dividido pelas células que o formaram, conforme quem as criou ou mexeu (natural = sem poder).'));
  console.log(c.dim('  A parte acima de ×1 de um cluster com wilds multiplicadores vai para mult:CW (cantos) / mult:DW (Distintivo).'));
}
if (!RESUMO) for (const r of Object.values(results)) printMode(r);

// ---------------------------------------------------------------- validação
let ok = true;
if (VALIDAR) {
  console.log('\n' + c.bold('VALIDAÇÃO DO ALVO'));
  for (const r of Object.values(results)) {
    const val = r.decomposed ? r.decomposed : { rtp: r.rtp, ci: r.ci };
    const pass = inTarget(val.rtp);
    if (!pass) ok = false;
    console.log(`  ${pass ? c.green('✔') : c.red('✖')} ${r.name.padEnd(30)} ${rtpStr(val.rtp, val.ci)}${r.decomposed ? ' (decomposto)' : ''}`);
  }
  console.log(c.dim('  Medição estatística local, não é certificação.'));
}

// ---------------------------------------------------------------- ficheiros
if (FILES) {
  const stamp = started.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const dir = path.join(ROOT, 'relatorios', MATH_VERSION, stamp + (DESLIGAR.length ? '-sem-' + DESLIGAR.join('+') : ''));
  fs.mkdirSync(dir, { recursive: true });
  const R = Object.values(results);
  const w = (name, h, rows) => fs.writeFileSync(path.join(dir, name), csv(h, rows));
  w('resumo.csv', ['modo', 'nome', 'rondas', 'custo_x', 'rtp_%', 'ic95_pp', 'ic95_lotes_pp', 'rtp_decomposto_%', 'ic95_decomposto_pp', 'rtp_base_sem_bonus_%', 'sigma', 'com_premio_%', 'ganho_liquido_%', 'premio_medio_x', 'premio_medio_quando_ganha_x', 'max_x', 'min_x', 'max_win', 'maior_seca'],
    R.map((r) => [r.mode, r.name, r.rounds, r.costX, r.rtp * 100, r.ci * 100, r.ciBatch * 100, r.decomposed ? r.decomposed.rtp * 100 : '', r.decomposed ? r.decomposed.ci * 100 : '', r.baseOnly.rtp * 100, r.sigma, r.hitFreq * 100, r.netWinFreq * 100, r.avgWinX, r.avgHitX, r.maxX, r.minX, r.capHits, r.maxZeroStreak]));
  w('histograma.csv', ['modo', 'escalao', 'de_x', 'ate_x', 'rondas', 'frequencia_%', 'parte_rtp_%'],
    R.flatMap((r) => r.hist.map((h) => [r.mode, h.label, h.from, h.to ?? '', h.count, h.freq * 100, h.rtpShare * 100])));
  w('percentis.csv', ['modo', 'percentil', 'todas_x', 'so_com_premio_x'], R.flatMap((r) => r.percentis.map((p) => [r.mode, p.p, p.all, p.hits])));
  w('bonus.csv', ['modo', 'bonus', 'saidas', 'frequencia_%', 'um_em', 'premio_medio_x', 'desvio_x', 'maximo_x', 'parte_rtp_%'],
    R.flatMap((r) => Object.entries(r.bonus).filter(([, s]) => s.count).map(([b, s]) => [r.mode, b, s.count, s.freq * 100, s.oneIn, s.avgWinX, s.sdWinX, s.maxWinX, s.rtpShare * 100])));
  const featRows = [];
  for (const r of R) for (const [kind, sp] of [['base', r.spinBase], ['bonus', r.spinBonus]]) {
    if (!sp.spins) continue;
    const add = (k, v) => featRows.push([r.mode, kind, k, v, v / sp.spins * 100]);
    add('spins', sp.spins); add('cascatas', sp.cascades); add('spins_com_despertar', sp.withAwaken); add('despertares', sp.awakenTotal); add('re_disparos', sp.refires);
    for (const p of PERSONAS) add('despertar_' + p, sp.persona[p]);
    for (let l = 1; l <= 5; l++) add('nivel_max_' + l, sp.level[l]);
    for (const fu of config.fusions) add('fusao_' + fu.id, sp.fusion[fu.id]);
    add('peace_police', sp.police); add('calmer', sp.calmer); add('joiner', sp.joiner); add('cantos_abertos', sp.corners); add('total_chemistry', sp.total); add('respins_copium', sp.respins); add('limite_seguranca', sp.safety);
  }
  w('funcionalidades.csv', ['modo', 'tipo_spin', 'metrica', 'total', 'por_spin_%'], featRows);
  w('atribuicao.csv', ['modo', 'origem', 'rtp_total_%', 'rtp_jogo_base_%'], R.flatMap((r) => TAGS.map((t) => [r.mode, t, r.attrib[t].total * 100, r.attrib[t].base * 100])));
  fs.writeFileSync(path.join(dir, 'relatorio.json'), JSON.stringify({ versao: MATH_VERSION, config: CONFIG_HASH, seed: SEED, data: started.toISOString(), spins: SPINS, compras: BUYS, resultados: results }, null, 2));
  fs.writeFileSync(path.join(ROOT, 'relatorios', 'ULTIMO.txt'), path.relative(ROOT, dir) + '\n');
  console.log('\n' + c.dim(`Relatórios gravados em ${path.relative(ROOT, dir)}${path.sep} (CSV abrem no Excel; relatorio.json tem tudo).`));
}
console.log(c.dim(`Para repetir exatamente esta corrida: npm run sim -- --seed ${SEED}${modeArg !== 'todos' ? ' --modo ' + modeArg : ''}${SPINS !== 250000 ? ' --spins ' + SPINS : ''}${BUYS !== 50000 ? ' --compras ' + BUYS : ''}${DESLIGAR.length ? ' --desligar ' + DESLIGAR.join(',') : ''} --workers ${WORKERS}`));
console.log();
if (VALIDAR && !ok) process.exit(1);
