#!/usr/bin/env node
// ============================================================================
// Mostra UMA jogada passo a passo, em texto (para perceber/depurar o motor).
//   npm run round                                 jogada base com seed aleatória
//   npm run round -- --seed abc --modo hunt       seed e modo fixos
//   npm run round -- --procurar fusion.trigger    procura a 1.ª jogada com esse evento
//   npm run round -- --procurar fusion:SLOW_DISASTER   ... ou com essa fusão
//   npm run round -- --min-x 500                  procura a 1.ª jogada que paga >= 500×
//   npm run round -- --grelhas                    mostra a grelha depois de cada cascata
//   npm run cenario -- lcd                        cenário de diagnóstico (lista: npm run cenario)
// ============================================================================
import { playRound, seedState, scenario, scenarioNames, config } from '../src/index.js';
import { pt, x, c } from './format.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const flag = (n) => args.includes('--' + n);
const GRIDS = flag('grelhas');
const PERSONA = { P1: 'WEED', P2: 'ALCOOL', P3: 'COPIUM', P4: 'MDMA', P5: 'LCD' };
const cell = (i) => `(${Math.floor(i / 5)},${i % 5})`;
const mx = (m) => x(m / 1000);

function grid(g) {
  const lines = [];
  for (let r = 0; r < 5; r++) {
    let s = '    ';
    for (let col = 0; col < 5; col++) {
      const v = g[col * 5 + r];
      const raw = (v === 'X' ? '##' : v || '·').padEnd(4);
      s += v && v.startsWith('P') ? c.yellow(raw) : v === 'S' ? c.cyan(raw) : ['W', 'CW', 'DW'].includes(v) ? c.green(raw) : v === 'X' ? c.dim(raw) : raw;
    }
    lines.push(s);
  }
  return lines.join('\n');
}

function describe(e) {
  switch (e.type) {
    case 'step.start': return null;
    case 'grid.drop': return 'Grelha inicial:\n' + grid(e.grid);
    case 'grid.refill': return GRIDS ? 'Cascata:\n' + grid(e.grid) : null;
    case 'grid.remove': return null;
    case 'win.cluster': return `💰 Cluster ${e.size} × ${e.symbol}${PERSONA[e.symbol] ? ' (' + PERSONA[e.symbol] + ')' : ''} = ${mx(e.basePay)}${e.growthFrom ? ` (cresceu de ${e.growthFrom})` : ''}${e.groupFinal ? ` (grupo sticky, tamanho final; começou com ${e.startSize})` : ''}${e.multiplier > 1 ? ` × ${e.multiplier}` : ''} = ${c.bold(mx(e.pay))}`;
    case 'persona.awaken': return c.yellow(`★ ${e.persona} ${e.kind === 'awaken' ? 'DESPERTA' : 'volta a disparar'}${e.party ? ' (Party Mode)' : ''}`);
    case 'fusion.trigger': return c.yellow(`⚗  FUSÃO ${e.fusionId} (${e.pair.join(' + ')})`);
    case 'chemistry.level': return `   Chemistry ${e.from} → ${e.to}`;
    case 'chemistry.total': return c.yellow('✦ TOTAL CHEMISTRY: multiplicadores ×2 e poderes outra vez em Party Mode');
    case 'corner.open': return `🔓 Canto ${cell(e.cell)} abre com Wild de Canto ×${e.multiplier}`;
    case 'multiplier.change': return `   multiplicador em ${cell(e.cell)}: ×${e.from} → ×${e.to}`;
    case 'wild.place': return `   ${e.source === 'DISTINTIVO' ? 'Distintivo' : 'Wild'} ×${e.multiplier} em ${cell(e.cell)}`;
    case 'power.reality_break': return `   LCD REALITY BREAK: ${e.cells.length} células → ${e.target}${e.party ? ' (Party)' : ''}`;
    case 'power.slow_motion.start': return `   SLOW MOTION: grupo de ${e.cells.length} × ${e.symbol} fica sticky`;
    case 'power.slow_motion.grow': return `   grupo sticky cresce para ${e.newSize}`;
    case 'power.slow_motion.end': return `   grupo sticky dissolve`;
    case 'power.rave_rush.move': return `   RAVE RUSH: ${e.transform ? 'Coluna de som transforma-se' : `${cell(e.from)} → ${cell(e.to)}${e.copy ? ' (cópia)' : ''}`}`;
    case 'power.drunk_walk.step': return `   DRUNK WALK: wild em ${cell(e.cell)}${e.sticky ? ' (sticky)' : ''}${e.jump ? ' (salto)' : ''}${typeof e.walker === 'string' ? ' [' + e.walker + ']' : ''}`;
    case 'power.one_more_chance.armed': return `   COPIUM armado para o fim da sequência${e.mods.length ? ' [' + e.mods.join(', ') + ']' : ''}`;
    case 'power.one_more_chance.respin': return `↻  ONE MORE CHANCE: respin guardando ${e.held.length} células (${e.symbol}), ${e.revealed.length} Raspadinhas reveladas` + (GRIDS ? '\n' + grid(e.grid) : '');
    case 'police.enter': return c.cyan(`🚨 PEACE POLICE entra: ${e.mode === 'joiner' ? '«I\'m joining the party!» (JOINER)' : '«Everybody calm down!» (CALMER)'}`);
    case 'police.calmer.arrest': return `   CALMER prende ${e.cells.length} símbolos baixos`;
    case 'police.joiner.party_mode': return `   PARTY MODE para ${e.personas.join(', ') || 'ninguém ainda'}${e.badge ? ` · Distintivo ×${e.badge.multiplier} em ${cell(e.badge.cell)}` : ''}`;
    case 'bonus.trigger': return c.cyan(c.bold(`🎟  ${e.scatters} SCATTERS → ${config.bonus[e.bonusId].nome} (${e.freeSpins} spins)`));
    case 'bonus.retrigger': return c.cyan(`🎟  Retrigger: +${e.added} spins (total ${e.total})`);
    case 'bonus.end': return c.cyan(`Fim do ${config.bonus[e.bonusId].nome}: ${mx(e.totalWin)} em ${e.spins} spins`);
    case 'cap.hit': return c.red(`MAX WIN: prémio cortado em ${mx(e.cut)}`);
    case 'safety.stop': return c.red(`limite de segurança (${e.cycles} ciclos)`);
    case 'step.end': return `   ganho do spin ${mx(e.win)} · acumulado ${mx(e.roundWinSoFar)}`;
    default: return `   ${e.type}`;
  }
}

function print(r, seedInfo) {
  console.log();
  console.log(c.bold(`Jogada ${r.mode} · ${seedInfo} · versão ${r.version}${r.forced ? c.red(' · FORÇADA (diagnóstico)') : ''}`));
  for (const st of r.steps) {
    console.log('\n' + c.bold(st.kind === 'base' ? '── Spin do jogo base ──' : `── ${config.bonus[st.bonusId].nome} · free spin ${st.freeSpins.played}/${st.freeSpins.total} ──`));
    const s0 = st.events[0];
    if (st.kind === 'bonus') console.log(c.dim(`   despertas: ${s0.awake.join(', ') || '—'} · fusões: ${s0.fused.join(', ') || '—'} · cantos abertos: ${s0.corners.length}`));
    for (const e of st.events) { const d = describe(e); if (d) console.log(d); }
  }
  console.log('\n' + c.bold(`TOTAL: ${x(r.totalWinMils / 1000)} (custo ${x(r.costMils / 1000)})${r.capped ? c.red(' · MAX WIN') : ''}`));
  console.log();
}

if (flag('cenario')) {
  const name = args.find((a) => !a.startsWith('--'));
  if (!name) { console.log('Cenários: ' + scenarioNames().join(', ')); process.exit(0); }
  print(scenario(name, { seed: opt('seed') }), `cenário «${name}»`);
} else {
  const mode = opt('modo', 'base');
  const seed = opt('seed', Date.now().toString(36));
  const want = opt('procurar');
  const minX = Number(opt('min-x', 0));
  let rng = seedState(seed);
  const max = Number(opt('max', 2000000));
  for (let i = 0; i < max; i++) {
    const r = playRound(rng, { bet: 100, mode });
    const ev = r.steps.flatMap((s) => s.events);
    const okEv = !want || ev.some((e) => (want.startsWith('fusion:') ? e.type === 'fusion.trigger' && e.fusionId === want.slice(7) : e.type === want));
    if (okEv && r.totalWinMils / 1000 >= minX) { print(r, `seed «${seed}» · jogada nº ${i + 1}`); process.exit(0); }
    rng = r.rngAfter;
  }
  console.log('Não encontrei nenhuma jogada com essas condições.');
}
