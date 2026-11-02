import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, SYMBOLS, PPM } from '../src/config.js';
import { createRandom } from '../src/random.js';
import { createEngine, evaluateBoard, fillBoard, compactBoard, applyMagic, magicParameters, wild, tierForSize, ExecutionLimitError } from '../src/engine.js';

const config = () => { const c = structuredClone(DEFAULT_CONFIG); delete c.bonusPay100; return c; };

test('shared payouts increase by tier and never decrease by symbol; XP thresholds are positive integers', () => {
  assert.equal(DEFAULT_CONFIG.bonusPay100, undefined);
  DEFAULT_CONFIG.pay100.forEach((row, i) => row.forEach((v, t) => {
    if (t) assert.ok(v > row[t - 1]);
    if (i) assert.ok(v >= DEFAULT_CONFIG.pay100[i - 1][t]);
  }));
  const thresholds = ['base', 'common', 'super', 'secret'].map(m => DEFAULT_CONFIG.xpThreshold100[m]);
  thresholds.forEach(v => { assert.equal(v % 100, 0); assert.ok(v > 0); });
  for (const mutate of [c => c.pay100[0][1] = c.pay100[0][0], c => c.pay100[1][0] = c.pay100[0][0] - 1, c => c.bonusPay100 = {common:c.pay100}]) {
    const c = config(); mutate(c); assert.throws(() => createEngine({config:c}));
  }
});
const zero = () => ({ next: () => 0 });
const quiet = () => Array.from({ length: 30 }, (_, p) => (Math.floor(p / 6) + p % 6) % 2 ? 'P3' : 'P2');
function cluster(symbol, size) {
  const board = Array.from({ length: 30 }, (_, p) => SYMBOLS.filter(s => s !== symbol)[(Math.floor(p / 6) + p % 6) % 2]);
  for (let p = 0; p < size; p++) board[p] = symbol;
  return board;
}
// Refill all available cells with P2/P3 in a checkerboard, using legal RNG
// draws: scatter fails, regular draw, premium copy draw fails.
function checkerRandom() {
  let index = 0;
  return { next() {
    const position = Math.floor(index / 3) % 30;
    const col = Math.floor(position / 5), row = 4 - position % 5;
    const value = index % 3 === 1 ? ((row + col) % 2 ? .93 : .85) : .99;
    index++;
    return value;
  } };
}

test('all 60 payouts and XP use the exact symbol and interval boundaries', () => {
  for (let i = 0; i < 10; i++) {
    for (const size of [5, 6, 7, 8, 10, 11, 13, 14, 15, 17, 18, 30]) {
      const hit = evaluateBoard(cluster(SYMBOLS[i], size), 'base').find(h => h.symbol === SYMBOLS[i]);
      assert.equal(hit.size, size);
      assert.equal(hit.rawPay100, String(DEFAULT_CONFIG.pay100[i][tierForSize(size)]));
      assert.equal(hit.xp100, DEFAULT_CONFIG.xpPerCluster100[i < 5 ? 'normal' : 'premium'][size === 14 ? 3 : tierForSize(size)]);
    }
  }
});

test('four positions and diagonal-only symbols do not pay', () => {
  assert.equal(evaluateBoard(cluster('N1', 4), 'base').length, 0);
  const board = quiet();
  for (const p of [0, 7, 14, 21, 28]) board[p] = 'N1';
  assert.equal(evaluateBoard(board, 'base').length, 0);
});

test('shared wild helps only physically connected groups and keeps its own multiplier', () => {
  const board = quiet();
  for (const p of [6, 7, 12, 13]) board[p] = 'N1';
  for (const p of [15, 16, 21, 22]) board[p] = 'P1';
  board[14] = wild(2);
  board[29] = wild(9);
  const hits = evaluateBoard(board, 'super');
  for (const symbol of ['N1', 'P1']) {
    const hit = hits.find(h => h.symbol === symbol);
    assert.equal(hit.size, 5);
    assert.equal(hit.multiplier, '2');
    assert.equal(hit.xp100, 0);
    assert.ok(hit.positions.includes(14));
    assert.ok(!hit.positions.includes(29));
  }
});

test('wild chains bridge the same symbol; different symbols and scatters do not bridge', () => {
  const board = quiet();
  for (const p of [0, 3, 4]) board[p] = 'N1';
  board[1] = wild(2); board[2] = wild(3);
  const hit = evaluateBoard(board, 'super').find(h => h.symbol === 'N1');
  assert.equal(hit.multiplier, '5');
  assert.equal(hit.size, 5);
  assert.equal(hit.xp100, 0);
  board[2] = 'S';
  assert.ok(!evaluateBoard(board, 'super').some(h => h.symbol === 'N1'));
});

test('ordinary base wilds never multiply a win', () => {
  const board = cluster('N1', 5);
  board[1] = wild(); board[2] = wild();
  for (const mode of ['base']) {
    const hit = evaluateBoard(board, mode).find(h => h.symbol === 'N1');
    assert.equal(hit.multiplier, '1');
    assert.equal(hit.rawPay100, String(DEFAULT_CONFIG.pay100[0][0]));
  }
});

test('full screens of wilds/scatters pay P5 18+ once, including 25 wilds', () => {
  for (const mode of ['base', 'common', 'super', 'secret']) {
    for (let scatters = 0; scatters <= (mode === 'base' ? 5 : 3); scatters++) {
      const multi = mode !== 'base';
      const board = Array.from({ length: 30 }, (_, p) => p < scatters ? 'S' : wild(multi ? 2 : 0));
      const hits = evaluateBoard(board, mode);
      assert.equal(hits.length, 1);
      assert.equal(hits[0].symbol, 'P5');
      assert.equal(hits[0].tier, 5);
      assert.equal(hits[0].rawPay100, String(DEFAULT_CONFIG.pay100[9][5] * (multi ? 2 * (30 - scatters) : 1)));
      assert.equal(hits[0].xp100, 0);
    }
  }
});

test('position scatter probability changes immediately and respects the spin cap', () => {
  const c = config();
  c.scatterPPM.base = [PPM, PPM, PPM, PPM, PPM];
  c.scatterPPM.common = [PPM, PPM, PPM];
  for (const [mode, cap] of [['base', 5], ['common', 3]]) {
    const board = Array(30).fill(null);
    const draws = fillBoard(board, mode, zero(), c);
    assert.equal(board.filter(s => s === 'S').length, cap);
    assert.deepEqual(draws.filter(g => g.symbol === 'S').map(g => g.position), [24, 18, 12, 6, 0].slice(0, cap));
    // Removing regulars and refilling cannot create further scatters.
    for (let p = 0; p < 30; p++) if (board[p] !== 'S') board[p] = null;
    fillBoard(board, mode, zero(), c);
    assert.equal(board.filter(s => s === 'S').length, cap);
  }
  const board = Array(30).fill(null);
  c.scatterPPM.base = [PPM, 0, PPM, PPM, PPM];
  fillBoard(board, 'base', zero(), c);
  assert.equal(board.filter(s => s === 'S').length, 1);
});

test('normal and premium pairs are orthogonal, vacant and never recurse', () => {
  const c = config(); c.scatterPPM.base.fill(0); c.pairPPM = PPM; c.repeatPairPPM = 0;
  const board = Array(30).fill('P5'); board[0] = board[1] = board[2] = null;
  const generated = fillBoard(board, 'base', zero(), c);
  assert.deepEqual(generated.map(g => [g.position, g.source]), [[0, 'draw'], [1, 'pair'], [2, 'draw']]);
  const blocked = Array(30).fill('P5'); blocked[0] = null;
  assert.equal(fillBoard(blocked, 'base', zero(), c).length, 1);
  const premium = Array(30).fill('N1'); premium[0] = premium[1] = null;
  const onlyP5 = config(); onlyP5.scatterPPM.base.fill(0); onlyP5.weights.fill(0); onlyP5.weights[9] = PPM;
  onlyP5.premiumPairPPM = PPM; onlyP5.repeatPairPPM = 0;
  assert.deepEqual(fillBoard(premium, 'base', zero(), onlyP5).map(g=>g.source),['draw','pair']);
});

test('gravity preserves scatter and wild identity/multiplier', () => {
  const board = Array(30).fill(null); board[0] = 'S'; board[12] = wild(7);
  const compacted = compactBoard(board);
  assert.equal(compacted[18], 'S');
  assert.deepEqual(compacted[24], wild(7));
  assert.equal(compacted.filter(Boolean).length, 2);
});

test('entry copy scale affects base generation only and leaves every bonus unchanged', () => {
  const c = config(); c.baseCopyScalePPM = 0;
  c.scatterPPM.base.fill(0); c.scatterPPM.common.fill(0);
  const board = quiet(); board[0] = board[1] = null;
  assert.deepEqual(fillBoard([...board], 'base', zero(), c).map(g => g.source), ['draw', 'draw']);
  assert.deepEqual(fillBoard([...board], 'common', zero(), c).map(g => g.source), ['draw', 'pair']);
  for (const mode of ['common', 'super', 'secret']) {
    const original = createEngine({seed:4321});
    const changed = createEngine({seed:4321, config:{...structuredClone(DEFAULT_CONFIG),baseCopyScalePPM:0}});
    assert.deepEqual(changed.play({mode}), original.play({mode}));
  }
  for (const scale of [-1,1000001,1.5]) {
    const invalid = config(); invalid.baseCopyScalePPM = scale;
    assert.throws(() => createEngine({config:invalid}));
  }
});

test('bonus rewards retain the ten-WILD cap and preserve every surviving multiplier', () => {
  for(const mode of ['common','super','secret']) {
    const first=magicParameters(mode,1,null);
    assert.deepEqual(first,{requested:2,multiplier:mode==='common'?1:2});
    const board=quiet();for(let i=0;i<9;i++)board[i]=wild(i+1);board[10]='S';
    const applied=applyMagic(board,mode,1000,zero(),DEFAULT_CONFIG,{requested:9,multiplier:20});
    assert.equal(applied.placed,1);assert.equal(board.filter(c=>c?.symbol==='W').length,10);
    assert.equal(board[10],'S');
    for(let i=0;i<9;i++)assert.equal(board[i].multiplier,i+1);
    assert.equal(board[applied.positions[0]].multiplier,applied.multiplier);
    const next=applyMagic(board,mode,1001,zero(),DEFAULT_CONFIG,applied);
    assert.equal(next.placed,0);assert.ok(next.multiplier>applied.multiplier);
    for(let i=0;i<9;i++)assert.equal(board[i].multiplier,i+1);
    assert.equal(board[applied.positions[0]].multiplier,applied.multiplier);
    assert.deepEqual(next.reward.wildDraws,[]);
    board[0]=wild(10000);applyMagic(board,mode,1,zero());assert.equal(board[0].multiplier,10000);
  }
  for (const [draw,requested] of [[0,1],[.5,2],[.85,3]]) assert.equal(magicParameters('base',1,{next:()=>draw}).requested,requested);
});

test('magic increments are guaranteed: Normal 1/1 and Super 1/2', () => {
  for(const [mode,w,m] of [['common',1,1],['super',1,2]]) {
    const first=magicParameters(mode,1,null);const previous={requested:first.requested,multiplier:first.multiplier};
    const next=magicParameters(mode,2,null,DEFAULT_CONFIG,previous);
    assert.equal(next.requested,previous.requested+w);assert.equal(next.multiplier,previous.multiplier+m);
    assert.equal(next.reward.wildGain,w);assert.equal(next.reward.multiplierGain,m);
    const cap=magicParameters(mode,20,null,DEFAULT_CONFIG,{requested:9,multiplier:20});
    assert.equal(cap.requested,10);assert.equal(cap.multiplier,20+m);
    const full=magicParameters(mode,21,null,DEFAULT_CONFIG,cap);
    assert.equal(full.requested,10);assert.equal(full.multiplier,20+2*m);assert.deepEqual(full.reward.wildDraws,[]);
    assert.deepEqual(previous,{requested:first.requested,multiplier:first.multiplier});
  }
  assert.throws(()=>magicParameters('super',2,zero()));
});

test('Secret starts at 2x then alternates +2/+3, including at the wild cap, and resets in a new bonus', () => {
  const expected = [2,4,7,9,12,14,17,19,22,24];
  for (let bonus = 0; bonus < 2; bonus++) {
    let previous;
    for (const [i, multiplier] of expected.entries()) {
      const next = magicParameters('secret', i + 1, null, DEFAULT_CONFIG, previous);
      assert.equal(next.multiplier, multiplier);
      assert.equal(next.requested, Math.min(10, 2 * (i + 1)));
      if (i) assert.equal(next.reward.multiplierGain, i % 2 ? 2 : 3);
      previous = next;
    }
  }
  for (const cycle of [[], [2], [2,3,2], [2,0], [2,4.5]]) {
    const c = config(); c.magic.secret.multiplierGainCycle = cycle;
    assert.throws(() => createEngine({config:c}));
  }
});

test('XP aggregates hits, resets excess, and magic precedes the next evaluation', () => {
  const c = config(); c.xpThreshold100.common = 1;
  const engine = createEngine({ config: c, rng: checkerRandom() });
  const result = engine.step(engine.start({ mode: 'common' }), { initialBoard: cluster('N1', 5) });
  const types = result.events.map(e => e.type);
  const magicAt = types.indexOf('magic');
  assert.ok(magicAt > types.indexOf('refill'));
  const magic = result.events[magicAt];
  assert.equal(magic.xp100, 0);
  assert.equal(magic.discarded100, 299);
  assert.equal(magic.level, 1);
  assert.equal(magic.placed, 2);
  assert.ok(types.indexOf('hits', magicAt + 1) === -1 || types.indexOf('hits', magicAt + 1) > magicAt);
});

test('XP persists across bonus spins, but every new board loses unused wilds', () => {
  const engine = createEngine({ rng: checkerRandom() });
  let state = engine.start({ mode: 'super' });
  const first = engine.step(state, { initialBoard: cluster('N1', 5) });
  state = first.state;
  assert.ok(state.xp100 >= 300);
  const before = state.xp100;
  const next = engine.step(state, { initialBoard: quiet() });
  assert.equal(next.state.xp100, before);
  assert.equal(next.events[0].xp100, before);
  const unused = quiet(); unused[0] = wild(7);
  const previous = engine.step(next.state, { initialBoard: unused });
  const fresh = engine.step(previous.state);
  assert.ok(fresh.events[0].board.every(c => c?.symbol !== 'W'));
});

test('a newly formed winning group is evaluated only after magic, and shared removals are unique', () => {
  const c = config(); c.xpThreshold100.common = 300;
  const fallback = checkerRandom();
  const stream = [...Array(15).fill(.99), 0, 0];
  const engine = createEngine({ config: c, rng: { next: () => stream.length ? stream.shift() : fallback.next() } });
  const result = engine.step(engine.start({ mode: 'common' }), { initialBoard: cluster('N1', 5) });
  const magicAt = result.events.findIndex(e => e.type === 'magic');
  const subsequent = result.events.slice(magicAt + 1).find(e => e.type === 'hits');
  const p5 = subsequent.hits.find(h => h.symbol === 'P5');
  assert.equal(p5.size, 5);
  assert.equal(p5.positions.filter(p => result.events[magicAt].board[p]?.symbol === 'W').length, 2);

  const board = quiet();
  for (const p of [6, 7, 12, 13]) board[p] = 'N1';
  for (const p of [15, 16, 21, 22]) board[p] = 'P1';
  board[14] = wild(2);
  const sharedEngine = createEngine({ rng: checkerRandom() });
  const shared = sharedEngine.step(sharedEngine.start({ mode: 'super' }), { initialBoard: board });
  const hitEvent = shared.events.find(e => e.type === 'hits');
  assert.equal(hitEvent.hits.length, 2);
  assert.equal(shared.events.find(e => e.type === 'xp-gained').xpGained100, 0);
  const removed = shared.events.find(e => e.type === 'refill').removed;
  assert.equal(removed.length, 9);
  assert.equal(removed.filter(p => p === 14).length, 1);
});

test('each scatter trigger starts exactly 12 bonus spins, with zero XP and level', () => {
  for (const [scatters, mode] of [[3, 'common'], [4, 'super'], [5, 'secret']]) {
    const engine = createEngine({ rng: checkerRandom() });
    const board = quiet();
    for (let p = 0; p < scatters; p++) board[p] = 'S';
    const { state, events } = engine.step(engine.start(), { initialBoard: board });
    assert.equal(state.mode, mode); assert.equal(state.remainingSpins, 12);
    assert.equal(state.xp100, 0); assert.equal(state.magicLevel, 0);
    assert.equal(state.complete, false);
    assert.ok(events.findIndex(e => e.type === 'bonus-start') > events.findIndex(e => e.type === 'spin-end'));
  }
});

test('base hits do not carry XP into a naturally triggered bonus', () => {
  const board = cluster('N1', 5); board[24] = board[25] = board[26] = 'S';
  const engine = createEngine({ rng: checkerRandom() });
  const outcome = engine.step(engine.start(), { initialBoard: board });
  assert.ok(outcome.events.some(e => e.type === 'xp-gained'));
  assert.equal(outcome.state.mode, 'common');
  assert.equal(outcome.state.xp100, 0);
});

test('retriggers happen once at spin end, including on the last bonus spin', () => {
  const engine = createEngine();
  let state = engine.start({ mode: 'secret' });
  for (let i = 0; i < 11; i++) state = engine.step(state, { initialBoard: quiet() }).state;
  const board = quiet(); board[0] = board[1] = 'S';
  let outcome = engine.step(state, { initialBoard: board });
  assert.equal(outcome.state.remainingSpins, 2); assert.equal(outcome.state.complete, false);
  assert.equal(outcome.events.filter(e => e.type === 'retrigger').length, 1);
  board[2] = 'S';
  outcome = engine.step(outcome.state, { initialBoard: board });
  assert.equal(outcome.state.remainingSpins, 5);
  assert.equal(outcome.state.addedSpins, 6);
  assert.equal(outcome.state.mode, 'secret');
});

test('purchase charges once, starts without a paid trigger spin and settles only at round end', () => {
  for (const mode of ['common', 'super', 'secret']) {
    const engine = createEngine();
    let state = engine.start({ mode, betUnits: 123 });
    assert.equal(state.costUnits, 123 * DEFAULT_CONFIG.buyPrices[mode]);
    assert.equal(state.remainingSpins, 12); assert.equal(state.paid100, 0);
    for (let i = 0; i < 12; i++) {
      const outcome = engine.step(state, { initialBoard: quiet() });
      state = outcome.state;
      assert.equal(outcome.events.filter(e => e.type === 'round-end').length, i === 11 ? 1 : 0);
    }
    assert.equal(state.complete, true); assert.equal(state.bonusSpinsPlayed, 12);
    assert.throws(() => engine.step(state), /completed/);
  }
});

test('MAX WIN is one cumulative cap, stops without refill/retrigger and prevents replay', () => {
  const engine = createEngine({ rng: checkerRandom() });
  let state = engine.start({ mode: 'super', betUnits: 123 });
  const modest = cluster('N1', 5);
  modest[0] = wild(1);
  const first = engine.step(state, { initialBoard: modest });
  state = first.state;
  assert.ok(state.paid100 > 0 && state.paid100 < DEFAULT_CONFIG.maxWin100);
  const board = Array.from({ length: 30 }, () => wild(1000000));
  board[0] = board[1] = board[2] = 'S';
  const result = engine.step(state, { initialBoard: board });
  assert.equal(result.state.paid100, 1000000);
  assert.equal(result.state.maxWin, true);
  assert.equal(result.state.remainingSpins, 0);
  assert.equal(result.events.filter(e => e.type === 'max-win').length, 1);
  assert.ok(!result.events.some(e => ['refill', 'magic', 'retrigger', 'spin-end'].includes(e.type)));
  assert.equal(result.events.at(-1).creditedUnits, 10000 * 123);
  assert.throws(() => engine.step(state), /stale/);
  assert.throws(() => engine.step(result.state), /completed/);
});

test('fractional awards accumulate before one final rounding', () => {
  const engine = createEngine({ rng: checkerRandom() });
  const result = engine.step(engine.start({ betUnits: 3 }), { initialBoard: cluster('N1', 5) });
  const end = result.events.find(e => e.type === 'round-end');
  assert.equal(end.creditedUnits, Number(3n * BigInt(result.state.paid100) / 100n));
  assert.equal(end.netUnits, end.creditedUnits - 3);
});

test('events and state are snapshots; old states, other engines and invalid input are rejected', () => {
  const engine = createEngine(); const state = engine.start();
  assert.ok(Object.isFrozen(state));
  assert.throws(() => { state.paid100 = 123; }, TypeError);
  const outcome = engine.step(state, { initialBoard: quiet() });
  outcome.events[0].board[0] = 'S';
  assert.notEqual(outcome.events.find(e => e.type === 'spin-end').board[0], 'S');
  assert.throws(() => engine.step(state), /stale/);
  assert.throws(() => createEngine().step(outcome.state), /another engine/);
  for (const betUnits of [0, -1, 1.2, Infinity, Number.MAX_SAFE_INTEGER]) assert.throws(() => engine.start({ betUnits }));
  assert.throws(() => engine.start({ mode: 'unknown' }));
  assert.throws(() => engine.step(engine.start(), { initialBoard: Array(30).fill('W') }));
  const c = config(); c.weights[0]++;
  assert.throws(() => createEngine({ config: c }));
  const bad = config(); bad.buyPrices.super = 251;
  assert.throws(() => createEngine({ config: bad }));
});

test('technical limits throw instead of returning an incomplete settled round', () => {
  const c = config(); c.weights.fill(0); c.weights[0] = PPM; c.scatterPPM.base.fill(0);
  assert.throws(() => createEngine({ config: c, maxCascades: 1 }).play(), ExecutionLimitError);
  const engine = createEngine({ maxSpins: 1 });
  const first = engine.step(engine.start({ mode: 'common' }), { initialBoard: quiet() });
  assert.throws(() => engine.step(first.state), ExecutionLimitError);
  const broken = createEngine({ rng: { next: () => 1 } });
  const initial = broken.start();
  assert.throws(() => broken.step(initial), /RNG/);
  assert.throws(() => broken.step(initial), /stale/);
});

test('seeded games replay exactly and serialise without BigInt values', () => {
  for (const mode of ['base', 'common', 'super', 'secret']) {
    const a = createEngine({ seed: 87654 }).play({ mode, trace: true });
    const b = createEngine({ seed: 87654 }).play({ mode, trace: true });
    assert.deepEqual(a, b);
    assert.doesNotThrow(() => JSON.stringify(a));
    assert.equal(a.state.paid100, Object.values(a.state.paidByMode100).reduce((sum, n) => sum + n, 0));
  }
  const a = createRandom(123); a.next();
  const resumed = createRandom(a.snapshot());
  assert.equal(a.next(), resumed.next());
});

test('XP activation never adds spins and all three bonuses start with twelve', () => {
  for (const mode of ['base', 'common', 'super', 'secret']) {
    const c = config(); c.xpThreshold100[mode] = 1;
    const engine = createEngine({ config: c, rng: checkerRandom() });
    const initial = engine.start({ mode });
    assert.equal(initial.remainingSpins, mode === 'base' ? 1 : 12);
    const {state, events} = engine.step(initial, {initialBoard:cluster('N1', 5)});
    assert.ok(events.some(e => e.type === 'magic'));
    assert.equal(state.addedSpins, 0);
    assert.equal(state.retriggers, 0);
    assert.equal(state.costUnits, initial.costUnits);
    assert.equal(state.remainingSpins, state.maxWin || mode === 'base' ? 0 : 11);
  }
});

test('a successful pair stops after two copies when later chances are zero', () => {
  const c = config(); c.scatterPPM.base.fill(0); c.pairPPM = PPM; c.repeatPairPPM = PPM;
  c.extraCopyPPM.normal.fill(0);
  const board = quiet();
  for (const p of [24, 25, 26, 27]) board[p] = null;
  const generated = fillBoard(board, 'base', zero(), c);
  assert.deepEqual(generated.map(g => [g.position, g.source]), [[24,'draw'],[25,'pair'],[26,'repeat-pair'],[27,'draw']]);
  assert.equal(generated[2].parent,25);
  const withoutRepeat = quiet(); for (const p of [24,25,26]) withoutRepeat[p]=null;
  c.repeatPairPPM=0;
  assert.ok(!fillBoard(withoutRepeat,'base',zero(),c).some(g=>g.source==='repeat-pair'));
});

test('copy chains support exactly one to five additional copies, stay connected and stop at five', () => {
  for (const symbol of ['N1', 'P1']) for (let count = 1; count <= 5; count++) {
    const c = config(); c.scatterPPM.base.fill(0); c.weights.fill(0);
    c.weights[SYMBOLS.indexOf(symbol)] = PPM;
    c.pairPPM = c.premiumPairPPM = PPM; c.repeatPairPPM = count >= 2 ? PPM : 0;
    for (const type of ['normal', 'premium']) c.extraCopyPPM[type] = [3,4,5].map(n => n <= count ? PPM : 0);
    const board = quiet();
    for (const p of [24,25,26,27,28,29,23]) board[p] = null;
    const generated = fillBoard(board, 'base', zero(), c);
    const chain = generated.slice(0, count + 1);
    assert.equal(chain[0].source, 'draw');
    assert.equal(generated[count + 1].source, 'draw');
    assert.equal(new Set(chain.map(g => g.position)).size, count + 1);
    for (let i = 1; i < chain.length; i++) {
      assert.equal(chain[i].parent, chain[i - 1].position);
      const a = chain[i].position, b = chain[i].parent;
      assert.equal(Math.abs(Math.floor(a / 6) - Math.floor(b / 6)) + Math.abs(a % 6 - b % 6), 1);
    }
  }
  for (const mutate of [c => c.extraCopyPPM.normal.pop(), c => c.extraCopyPPM.premium[0] = PPM + 1]) {
    const c = config(); mutate(c); assert.throws(() => createEngine({ config: c }));
  }
});

test('every mode uses the identical shared symbol payout table without changing XP', () => {
  for (const mode of ['base','common','super','secret']) {
    const table=DEFAULT_CONFIG.pay100;
    for (let i=0;i<SYMBOLS.length;i++) for(const size of [5,6,8,11,15,18]) {
      const hit=evaluateBoard(cluster(SYMBOLS[i],size),mode).find(h=>h.symbol===SYMBOLS[i]);
      assert.equal(hit.rawPay100,String(table[i][tierForSize(size)]));
      assert.equal(hit.xp100,DEFAULT_CONFIG.xpPerCluster100[i < 5 ? 'normal' : 'premium'][size === 14 ? 3 : tierForSize(size)]);
    }
  }
});

test('three different WILD multipliers are added once per hit in every bonus', () => {
  for (const mode of ['common','super','secret']) {
    const board=cluster('N1',5); board[1]=wild(2); board[2]=wild(3); board[3]=wild(7);
    const hit=evaluateBoard(board,mode).find(h=>h.symbol==='N1');
    assert.equal(hit.multiplier,'12'); assert.equal(hit.rawPay100,String(DEFAULT_CONFIG.pay100[0][0]*12));
    assert.equal(hit.xp100,0);
  }
});

test('fixed normal and premium cluster XP uses regular counts across every boundary and mode', () => {
  for (const mode of ['base','common','super','secret']) for (const [i, symbol] of SYMBOLS.entries()) {
    for (const size of [5,6,7,8,10,11,14,15,17,18,30]) {
      const hit=evaluateBoard(cluster(symbol,size),mode).find(h=>h.symbol===symbol);
      assert.equal(hit.xp100,DEFAULT_CONFIG.xpPerCluster100[i < 5 ? 'normal' : 'premium'][size === 14 ? 3 : tierForSize(size)]);
    }
    const board=cluster(symbol,8);
    for(const p of [5,6,7]) board[p]=wild(mode==='base'?0:9);
    const hit=evaluateBoard(board,mode).find(h=>h.symbol===symbol);
    assert.equal(hit.size,8); assert.equal(hit.xp100,i < 5 ? 300 : 500);
  }
  for (const mutate of [c=>c.xpPerCluster100.normal.pop(), c=>c.xpPerCluster100.premium[0]=501, c=>c.xpPerCluster100.normal[1]=300]) {
    const c=config(); mutate(c); assert.throws(()=>createEngine({config:c}));
  }
});

test('magic upgrades persist between bonus spins and validate explicit price ceilings', () => {
  const fixture=config(); fixture.xpThreshold100.super=1300;
  const engine=createEngine({config:fixture,rng:checkerRandom()});
  let state=engine.start({mode:'super'});assert.deepEqual(state.magicProgress,{requested:0,multiplier:1});
  const first=engine.step(state,{initialBoard:cluster('N1',18)});state=first.state;
  assert.ok(state.magicLevel>=1);
  const magic=first.events.filter(e=>e.type==='magic').at(-1);
  assert.deepEqual(state.magicProgress,{requested:magic.requested,multiplier:magic.multiplier});
  assert.equal(state.maxMagicWilds, Math.max(...first.events.filter(e=>e.type==='magic').map(e=>e.requested)));
  const quietSpin=engine.step(state,{initialBoard:quiet()});assert.deepEqual(quietSpin.state.magicProgress,state.magicProgress);
  for(const [mode,min,max] of [['common',80,100],['super',200,250],['secret',1,800]]) {
    const c=config();c.buyPrices[mode]=max;assert.doesNotThrow(()=>createEngine({config:c}));
    c.buyPrices[mode]=max+1;assert.throws(()=>createEngine({config:c}));
    c.buyPrices[mode]=min;assert.doesNotThrow(()=>createEngine({config:c}));
    c.buyPrices[mode]=min-1;assert.throws(()=>createEngine({config:c}));
  }
  for(const mutate of [c=>c.magic.common.wildCap=9,c=>c.magic.super.startWilds=11,c=>c.maxWilds=11,c=>c.magic.secret.rewardRolls=0,c=>c.magic.super.wildGainWeights=[1,2,3],c=>c.magic.secret.multiplierGainWeights=[1000000,0,0,-1]]) {
    const c=config();mutate(c);assert.throws(()=>createEngine({config:c}));
  }
});

test('attached payout table converts bet 0.10 amounts and separates payment and XP at 14', () => {
  assert.deepEqual(DEFAULT_CONFIG.pay100, [[10,20,50,100,200,500],[10,20,50,100,200,500],[10,20,50,100,200,1000],[20,40,70,150,300,1000],[20,40,70,150,300,1000],[50,80,150,300,1000,5000],[50,80,150,300,1000,5000],[80,120,250,500,1500,7500],[80,120,250,500,1500,10000],[100,150,500,1000,2500,15000]]);
  assert.equal(tierForSize(13), 3);
  assert.equal(tierForSize(14), 4);
  const hit = evaluateBoard(cluster('P5', 14), 'base').find(h => h.symbol === 'P5');
  assert.equal(hit.rawPay100, '2500');
  assert.equal(hit.xp100, 1100);
});

test('every premium draw is rarer than every normal draw in the default configuration', () => {
  const normal = DEFAULT_CONFIG.weights.slice(0,5), premium = DEFAULT_CONFIG.weights.slice(5);
  assert.ok(Math.max(...premium) < Math.min(...normal));
  assert.equal(DEFAULT_CONFIG.weights.reduce((a,b)=>a+b,0), PPM);
});

test('default rarity strictly increases N1 to P5 and normals copy more often than premiums', () => {
  DEFAULT_CONFIG.weights.forEach((weight, i, weights) => {
    if (i) assert.ok(weight < weights[i - 1], `${SYMBOLS[i]} must be rarer than ${SYMBOLS[i - 1]}`);
  });
  assert.ok(DEFAULT_CONFIG.pairPPM > DEFAULT_CONFIG.premiumPairPPM);
  for (const p of [DEFAULT_CONFIG.pairPPM, DEFAULT_CONFIG.premiumPairPPM, DEFAULT_CONFIG.repeatPairPPM]) {
    assert.equal(p % 10000, 0, 'Copy probabilities use whole percentages');
  }
});
