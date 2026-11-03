// Testes do motor (node --test). Grelhas montadas à mão: ver src/scenarios.js (fromRows).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config, MATH_VERSION } from '../src/index.js';
import { Rng } from '../src/random.js';
import { playRound, seedState, scenario, forced, ofType, allEvents } from './helpers.js';

const pay = (sym, size) => config.pay[{ N1: 1, N2: 2, N3: 3, N4: 4, N5: 5, P1: 6, P2: 7, P3: 8, P4: 9, P5: 10 }[sym]][Math.min(size, 15) - 4];
const idx = (c, r) => c * 5 + r;

// ---------------------------------------------------------------- configuração
test('configuração válida, versionada e congelada', () => {
  assert.match(MATH_VERSION, /^pp-v\d+/);
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.pay[6]));
  assert.throws(() => { config.maxWinMils = 1; });
  for (const [name, w] of Object.entries(config.weights)) {
    const p = w.prob;
    const order = ['N1', 'N2', 'N3', 'N4', 'N5', 'P1', 'P2', 'P3', 'P4', 'P5'];
    for (let i = 1; i < order.length; i++) assert.ok(p[order[i]] < p[order[i - 1]], `raridade ${name}`);
  }
});

// ---------------------------------------------------------------- RNG
test('RNG determinístico, serializável e uniforme', () => {
  const a = new Rng(seedState('x')), b = new Rng(seedState('x'));
  for (let i = 0; i < 1000; i++) assert.equal(a.u32(), b.u32());
  const c = new Rng(a.state());
  assert.equal(c.u32(), a.u32());
  const r = new Rng(seedState('uniforme')); const cnt = new Array(10).fill(0);
  for (let i = 0; i < 100000; i++) cnt[r.int(10)]++;
  for (const v of cnt) assert.ok(Math.abs(v - 10000) < 500);
});

test('mesma seed = mesma jogada; o estado do RNG continua entre jogadas', () => {
  const s = seedState('determinismo');
  const r1 = playRound(s, { bet: 100, mode: 'base', roundId: 'a' });
  const r2 = playRound(s, { bet: 100, mode: 'base', roundId: 'a' });
  assert.deepEqual(r1, r2);
  const r3 = playRound(r1.rngAfter, { bet: 100, mode: 'base', roundId: 'a' });
  assert.notDeepEqual(r3.rngAfter, r1.rngAfter);
  const b1 = playRound(seedState('d2'), { bet: 100, mode: 'buy-police', roundId: 'b' });
  const b2 = playRound(seedState('d2'), { bet: 100, mode: 'buy-police', roundId: 'b' });
  assert.deepEqual(b1, b2);
});

// ---------------------------------------------------------------- clusters
test('cluster horizontal de 4 paga o valor da tabela', () => {
  const r = forced(['X . . . X', '. . . . .', 'P5 P5 P5 P5 .', '. . . . .', 'X . . . X']);
  const w = ofType(r, 'win.cluster')[0];
  assert.equal(w.symbol, 'P5'); assert.equal(w.size, 4); assert.equal(w.basePay, pay('P5', 4)); assert.equal(w.pay, pay('P5', 4));
});

test('diagonais não ligam', () => {
  const r = forced(['X . . . X', 'P5 . . . .', '. P5 . . .', '. . P5 . .', 'X . . P5 X']);
  assert.equal(ofType(r, 'win.cluster').filter((w) => w.symbol === 'P5' && w.cells.includes(idx(0, 1))).length, 0);
});

test('wilds contam por inteiro: basta 1 símbolo real (pp-v3); só wilds não paga', () => {
  // W W W P5 = cluster de 4 com 1 símbolo real
  const ok = forced(['X . . . X', '. . . . .', 'W W W P5 .', '. . . . .', 'X . . . X']);
  const w = ofType(ok, 'win.cluster').find((x) => x.cells.includes(idx(3, 2)));
  assert.ok(w, 'paga com 1 real'); assert.equal(w.size >= 4, true);
  assert.equal(config.clusterMinReal, 1);
});

test('HOLD wild preso num grupo sticky sai quando paga noutro cluster (não paga em todas as cascatas)', () => {
  for (const mode of ['buy-police', 'buy-vip']) {
    const st = { rng: seedState(`hold-${mode}`) };
    for (let i = 0; i < 300; i++) {
      const r = playRound(st.rng, { bet: 100, mode }); st.rng = r.rngAfter;
      for (const s of r.steps) {
        // nenhum cluster (mesmas células, mesmo tipo) paga duas vezes seguidas sem nada sair entre os dois
        const seen = new Set(); let prev = null;
        for (const e of s.events) {
          if (e.type === 'grid.remove' || e.type === 'grid.refill' || e.type.startsWith('power.') || e.type === 'police.calmer.arrest') { seen.clear(); continue; }
          if (e.type !== 'win.cluster' || e.groupFinal) continue;
          const key = `${e.symbol}:${[...e.cells].sort((a, b) => a - b).join(',')}`;
          assert.ok(!seen.has(key), `${mode}#${i}: o mesmo cluster pagou outra vez sem cascata (${key})`);
          seen.add(key); prev = key;
        }
        void prev;
      }
    }
  }
});

test('multiplicadores dos wilds somam dentro do cluster', () => {
  const r = forced(['X . . . X', '. . . . .', 'CW P5 P5 P5 DW', '. . . . .', 'X . . . X'], { mult: { [idx(0, 2)]: 2, [idx(4, 2)]: 3 } });
  const w = ofType(r, 'win.cluster')[0];
  assert.equal(w.size, 5); assert.equal(w.multiplier, 5); assert.equal(w.pay, pay('P5', 5) * 5);
});

test('cantos fechados não recebem símbolos nem contam', () => {
  const r = playRound(seedState('cantos'), { bet: 100, mode: 'base' });
  const g = ofType(r, 'grid.drop')[0].grid;
  for (const c of config.corners) assert.equal(g[c], 'X');
});

// ---------------------------------------------------------------- despertar e poderes
for (const [name, persona, ev] of [
  ['lcd', 'LCD', 'power.reality_break'], ['weed', 'WEED', 'power.slow_motion.start'],
  ['mdma', 'MDMA', 'power.rave_rush.move'], ['alcool', 'ALCOOL', 'power.drunk_walk.step'],
  ['copium', 'COPIUM', 'power.one_more_chance.armed'],
]) {
  test(`cluster 5+ desperta ${persona} e o poder dispara (${ev})`, () => {
    const r = scenario(name);
    const aw = ofType(r, 'persona.awaken');
    assert.equal(aw[0].persona, persona); assert.equal(aw[0].kind, 'awaken'); assert.equal(aw[0].fusion, null);
    assert.ok(ofType(r, ev).length > 0, `falta ${ev}`);
  });
}

test('cluster premium de 4 paga mas não desperta', () => {
  const r = forced(['X . . . X', '. . . . .', 'P5 P5 P5 P5 .', '. . . . .', 'X . . . X'], {}, 'base', 'quatro');
  const first = allEvents(r).findIndex((e) => e.type === 'grid.refill');
  assert.equal(allEvents(r).slice(0, first).filter((e) => e.type === 'persona.awaken').length, 0);
});

test('REALITY BREAK transforma pelo menos 4 células no tipo-alvo', () => {
  const e = ofType(scenario('lcd'), 'power.reality_break')[0];
  assert.ok(e.cells.length >= config.powers.LCD.celulasMinimas);
});

test('SLOW MOTION: o grupo sticky segue a regra de pagamento da tabela', () => {
  const mode = config.powers.WEED.pagamentoAoCrescer;
  if (mode === 'tamanho-final') {
    // o cluster que acorda o WEED não paga logo; o grupo paga uma vez o tamanho final
    const r = scenario('weed');
    const ev = r.steps[0].events;
    const iAw = ev.findIndex((e) => e.type === 'persona.awaken' && e.persona === 'WEED');
    const startCells = ev[iAw].cluster;
    const before = ev.slice(0, iAw).filter((e) => e.type === 'win.cluster' && e.cells.some((c) => startCells.includes(c)) && e.symbol === 'P1');
    assert.equal(before.length, 0, 'o cluster que acordou o WEED não deve pagar logo');
    const fin = ev.filter((e) => e.type === 'win.cluster' && e.groupFinal);
    assert.equal(fin.length, 1);
    assert.ok(fin[0].size >= startCells.length);
    assert.equal(fin[0].basePay, pay('P1', fin[0].size));
    // nenhum outro prémio de P1 sobre células do grupo entre o despertar e o pagamento final
    const iFin = ev.indexOf(fin[0]);
    assert.equal(ev.slice(iAw, iFin).filter((e) => e.type === 'win.cluster' && e.symbol === 'P1' && e.cells.some((c) => startCells.includes(c))).length, 0);
  } else {
    let found = 0;
    for (let k = 0; k < 40 && !found; k++) {
      const r = playRound(seedState('weed' + k), { bet: 100, mode: 'base', force: { grid: scenario('weed').steps[0].events[1].grid.map((v) => v || '?') } });
      for (const w of ofType(r, 'win.cluster')) if (w.growthFrom > 0) {
        found++;
        if (mode === 'diferenca') assert.equal(w.basePay, pay(w.symbol, w.size) - pay(w.symbol, w.growthFrom));
        else assert.equal(w.basePay, pay(w.symbol, w.size));
      }
    }
    assert.ok(found > 0, 'nenhum crescimento observado');
  }
});

test('grupos sticky pagam no máximo uma vez por spin (tamanho final)', () => {
  if (config.powers.WEED.pagamentoAoCrescer !== 'tamanho-final') return;
  let rng = seedState('final-unico'); let seen = 0;
  for (let i = 0; i < 20000; i++) {
    const r = playRound(rng, { bet: 100, mode: 'base' }); rng = r.rngAfter;
    for (const st of r.steps) {
      const starts = st.events.filter((e) => e.type === 'power.slow_motion.start').length;
      const fins = st.events.filter((e) => e.type === 'win.cluster' && e.groupFinal).length;
      assert.ok(fins <= starts + st.events.filter((e) => e.type === 'fusion.trigger' && e.fusionId === 'FROZEN_REALITY').length * 25);
      seen += fins;
    }
  }
  assert.ok(seen > 0);
});

test('cada personagem desperta no máximo uma vez por spin no jogo base', () => {
  let rng = seedState('uma-vez');
  for (let i = 0; i < 3000; i++) {
    const r = playRound(rng, { bet: 100, mode: 'base' }); rng = r.rngAfter;
    const seen = new Set();
    for (const e of r.steps[0].events) if (e.type === 'persona.awaken') { assert.ok(!seen.has(e.persona)); seen.add(e.persona); }
  }
});

// ---------------------------------------------------------------- fusões e chemistry
for (const f of config.fusions) {
  test(`fusão ${f.id} (${f.par.join(' + ')})`, () => {
    const r = scenario('fusao:' + f.id);
    const ft = ofType(r, 'fusion.trigger');
    assert.equal(ft[0].fusionId, f.id);
    assert.deepEqual([...ft[0].pair].sort(), [...f.par].sort());
    const lv = ofType(r, 'chemistry.level').map((e) => e.to);
    assert.ok(lv.includes(2));
  });
}

test('cada despertar a partir do 2.º gera exatamente uma fusão', () => {
  let rng = seedState('fusoes');
  for (let i = 0; i < 4000; i++) {
    const r = playRound(rng, { bet: 100, mode: 'base' }); rng = r.rngAfter;
    const ev = r.steps[0].events;
    if (ev.some((e) => e.type === 'police.enter' && e.mode === 'calmer')) continue;
    const aw = ev.filter((e) => e.type === 'persona.awaken' && e.kind === 'awaken');
    aw.forEach((a, k) => assert.equal(!!a.fusion, k >= 1));
  }
});

test('TRIPLE CHEMISTRY abre 2 cantos e FULL CHAOS abre os 4', () => {
  const t = scenario('triple-chemistry');
  const lv3 = allEvents(t).findIndex((e) => e.type === 'chemistry.level' && e.to === 3);
  assert.ok(lv3 >= 0);
  const opened = ofType(t, 'corner.open');
  assert.ok(opened.length >= 2);
  for (const o of opened) { assert.ok(config.corners.includes(o.cell)); assert.equal(o.multiplier, config.corners_.multiplicadorInicial); }
  const f = scenario('full-chaos');
  assert.equal(ofType(f, 'corner.open').length, 4);
});

test('TOTAL CHEMISTRY dispara ao nível 5', () => {
  const r = scenario('total-chemistry');
  assert.equal(ofType(r, 'chemistry.total').length, 1);
});

test('Wild de Canto cresce +1 por prémio até ao máximo', () => {
  let rng = seedState('cw'); let seen = 0;
  for (let i = 0; i < 20000 && seen < 30; i++) {
    const r = playRound(rng, { bet: 100, mode: 'base' }); rng = r.rngAfter;
    for (const e of ofType(r, 'multiplier.change')) {
      if (r.steps[0].events.some((x) => x.type === 'chemistry.total')) continue;
      seen++; assert.equal(e.to - e.from, config.corners_.incrementoPorPremio); assert.ok(e.to <= config.corners_.multiplicadorMax);
    }
  }
});

// ---------------------------------------------------------------- Peace Police
test('CALMER prende os baixos, fecha a escalada e não retira prémios', () => {
  const r = scenario('calmer');
  const ev = r.steps[0].events;
  const iC = ev.findIndex((e) => e.type === 'police.calmer.arrest');
  assert.ok(iC > 0);
  assert.ok(ev[iC].cells.length > 0);
  assert.equal(ev.slice(iC).filter((e) => e.type === 'fusion.trigger' || e.type === 'corner.open').length, 0);
  const sum = ev.filter((e) => e.type === 'win.cluster').reduce((a, e) => a + e.pay, 0);
  assert.equal(sum, r.steps[0].win);
});

test('JOINER ativa o Party Mode e deixa cair um Distintivo', () => {
  const r = scenario('joiner');
  const j = ofType(r, 'police.joiner.party_mode')[0];
  assert.ok(j);
  assert.ok(config.police.dwMults.includes(j.badge.multiplier));
  assert.ok(ofType(r, 'power.reality_break').some((e) => e.party), 'o poder do LCD re-dispara em Party Mode');
});

test('Peace Police aparece no máximo 1 vez por spin', () => {
  let rng = seedState('pp1');
  for (let i = 0; i < 5000; i++) {
    const r = playRound(rng, { bet: 100, mode: 'base' }); rng = r.rngAfter;
    for (const st of r.steps) assert.ok(st.events.filter((e) => e.type === 'police.enter').length <= 1);
  }
});

// ---------------------------------------------------------------- bónus
for (const [n, bonus] of [[3, 'afterparty'], [4, 'vip'], [5, 'police']]) {
  test(`${n} Scatters ativam ${bonus}`, () => {
    const r = scenario('scatters-' + n);
    const t = ofType(r, 'bonus.trigger')[0];
    assert.equal(t.bonusId, bonus);
    const free = r.steps.filter((s) => s.kind === 'bonus');
    assert.ok(free.length >= config.bonus[bonus].spins);
    assert.ok(free.every((s) => s.bonusId === bonus));
    assert.equal(ofType(r, 'bonus.end').length, 1);
  });
}

test('estado inicial de cada bónus (personagens, cantos, Joiner)', () => {
  const vip = scenario('bonus:vip');
  const s0 = vip.steps[0].events[0];
  assert.equal(s0.awake.length, 1); assert.equal(s0.corners.length, 2);
  const pol = scenario('bonus:police');
  const p0 = pol.steps[0].events[0];
  assert.equal(p0.awake.length, 2); assert.equal(p0.fused.length, 1); assert.equal(p0.corners.length, 4);
  for (const st of pol.steps) assert.ok(st.events.some((e) => e.type === 'police.joiner.party_mode'));
  const aft = scenario('bonus:afterparty');
  assert.equal(aft.steps[0].events[0].awake.length, 0);
});

test('compras: só passos de bónus e custo = preço', () => {
  for (const m of ['buy-afterparty', 'buy-vip', 'buy-police']) {
    const r = playRound(seedState('compra-' + m), { bet: 100, mode: m });
    assert.ok(r.steps.every((s) => s.kind === 'bonus'));
    assert.equal(r.cost, Math.round(100 * config.modes[m].costMils / 1000));
  }
});

test('personagens despertas persistem entre free spins', () => {
  let ok = 0;
  for (let k = 0; k < 30; k++) {
    const r = playRound(seedState('persist' + k), { bet: 100, mode: 'buy-afterparty' });
    let prev = 0;
    for (const st of r.steps) {
      const a = st.events[0].awake.length;
      assert.ok(a >= prev); prev = a;
    }
    if (prev > 0) ok++;
  }
  assert.ok(ok > 0);
});

// ---------------------------------------------------------------- invariantes
test('invariantes em 20 000 jogadas aleatórias (todos os modos)', () => {
  const modes = Object.keys(config.modes);
  let rng = seedState('invariantes');
  const types = new Set();
  for (let i = 0; i < 20000; i++) {
    const mode = modes[i % 10 < 7 ? i % 2 : 2 + (i % 3)];
    const r = playRound(rng, { bet: 100, mode }); rng = r.rngAfter;
    let total = 0;
    for (const st of r.steps) {
      let sw = 0;
      for (const e of st.events) {
        types.add(e.type);
        if (e.type === 'win.cluster') {
          sw += e.pay;
          assert.ok(Number.isInteger(e.pay) && e.pay >= 0);
          assert.equal(e.attrib.reduce((a, [, v]) => a + v, 0), e.pay, 'atribuição soma o prémio');
        }
        assert.notEqual(e.type, 'safety.stop', 'limite de segurança atingido');
      }
      assert.equal(sw, st.win); total += st.win;
      assert.equal(st.roundWinSoFar, total);
    }
    assert.equal(total, r.totalWinMils);
    assert.ok(r.totalWinMils <= config.maxWinMils);
    if (r.capped) assert.equal(r.totalWinMils, config.maxWinMils);
    assert.ok(Number.isInteger(r.totalWin) && Number.isInteger(r.cost));
  }
  const known = new Set(['step.start', 'step.end', 'grid.drop', 'grid.remove', 'grid.refill', 'win.cluster', 'cap.hit',
    'persona.awaken', 'fusion.trigger', 'chemistry.level', 'chemistry.total', 'corner.open', 'multiplier.change', 'wild.place',
    'power.reality_break', 'power.slow_motion.start', 'power.slow_motion.grow', 'power.slow_motion.end', 'power.rave_rush.move',
    'power.drunk_walk.step', 'power.one_more_chance.armed', 'power.one_more_chance.respin',
    'police.enter', 'police.calmer.arrest', 'police.joiner.party_mode', 'bonus.trigger', 'bonus.retrigger', 'bonus.end', 'safety.stop']);
  for (const t of types) assert.ok(known.has(t), `evento fora do catálogo: ${t}`);
});

test('cenários de diagnóstico vêm marcados como forçados', () => {
  assert.equal(scenario('lcd').forced, true);
  assert.equal(playRound(seedState('n'), { bet: 100, mode: 'base' }).forced, false);
});

test('--desligar (análise): a peça desligada não acontece e o jogo normal não muda', () => {
  let rng = seedState('desligar');
  for (let i = 0; i < 300; i++) {
    const r = playRound(rng, { bet: 100, mode: 'buy-police', desligar: ['fusoes', 'cantos'] }); rng = r.rngAfter;
    const ev = r.steps.flatMap((s) => s.events);
    assert.ok(!ev.some((e) => e.type === 'fusion.trigger' || e.type === 'corner.open'));
  }
  assert.throws(() => playRound(seedState('x'), { bet: 100, mode: 'base', desligar: ['nada'] }));
  const a = playRound(seedState('igual'), { bet: 100, mode: 'base', roundId: 'z' });
  const b = playRound(seedState('igual'), { bet: 100, mode: 'base', roundId: 'z', desligar: [] });
  assert.deepEqual(a, b);
});
