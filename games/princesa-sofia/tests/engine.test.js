import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, SYMBOLS, PPM } from '../src/config.js';
import { createRandom } from '../src/random.js';
import { createEngine, evaluateBoard, fillBoard, compactBoard, applyMagic, magicParameters, wild, tierForSize, ExecutionLimitError } from '../src/engine.js';

const config = () => { const c = structuredClone(DEFAULT_CONFIG); delete c.bonusPay100; return c; };

test('revised tables guarantee minimum hit payouts and retain XP and scatter rules', () => {
  for (const row of DEFAULT_CONFIG.pay100) {
    for (let tier = 1; tier < row.length; tier++) assert.ok(row[tier] >= row[tier - 1]);
  }
  for (const [mode, oldThreshold] of Object.entries({ base: 4000, common: 3200, super: 2400, secret: 2400 })) {
    assert.ok(DEFAULT_CONFIG.xpThreshold100[mode] < oldThreshold);
    const previous = mode === 'base' ? [30000, 20000, 6500, 1200, 250] : [20000, 8000, 2000];
    assert.ok(DEFAULT_CONFIG.scatterPPM[mode].every((chance, i) => chance > previous[i]));
  }
  assert.equal(DEFAULT_CONFIG.pairPPM, 520000);
  assert.equal(DEFAULT_CONFIG.calibrated, false);
  for (const table of [DEFAULT_CONFIG.pay100, ...Object.values(DEFAULT_CONFIG.bonusPay100)]) assert.ok(table.every(row => row.every(value => value >= 25)));
  assert.equal(DEFAULT_CONFIG.maxWin100, 1000000);
});
const zero = () => ({ next: () => 0 });
const quiet = () => Array.from({ length: 30 }, (_, p) => (Math.floor(p / 6) + p % 6) % 2 ? 'P3' : 'P2');
function cluster(symbol, size) {
  const board = Array.from({ length: 30 }, (_, p) => SYMBOLS.filter(s => s !== symbol)[(Math.floor(p / 6) + p % 6) % 2]);
  for (let p = 0; p < size; p++) board[p] = symbol;
  return board;
}
// Refill all available cells with P2/P3 in a checkerboard, using legal RNG
// draws: scatter fails, regular draw, no pair draw for a premium symbol.
function checkerRandom() {
  let index = 0;
  return { next() {
    const position = Math.floor(index / 2) % 30;
    const col = Math.floor(position / 5), row = 4 - position % 5;
    const value = index % 2 === 0 ? .99 : ((row + col) % 2 ? .94 : .90);
    index++;
    return value;
  } };
}

test('all 60 payouts and XP use the exact symbol and interval boundaries', () => {
  for (let i = 0; i < 10; i++) {
    for (const size of [5, 6, 7, 8, 10, 11, 14, 15, 17, 18, 30]) {
      const hit = evaluateBoard(cluster(SYMBOLS[i], size), 'base').find(h => h.symbol === SYMBOLS[i]);
      assert.equal(hit.size, size);
      assert.equal(hit.rawPay100, String(DEFAULT_CONFIG.pay100[i][tierForSize(size)]));
      assert.equal(hit.xp100, size * DEFAULT_CONFIG.xpPerCell100[i]);
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
    assert.equal(hit.xp100, 4 * DEFAULT_CONFIG.xpPerCell100[SYMBOLS.indexOf(symbol)]);
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
  assert.equal(hit.xp100, 300);
  board[2] = 'S';
  assert.ok(!evaluateBoard(board, 'super').some(h => h.symbol === 'N1'));
});

test('ordinary base wilds never multiply a win', () => {
  const board = cluster('N1', 5);
  board[1] = wild(); board[2] = wild();
  for (const mode of ['base']) {
    const hit = evaluateBoard(board, mode).find(h => h.symbol === 'N1');
    assert.equal(hit.multiplier, '1');
    assert.equal(hit.rawPay100, String((DEFAULT_CONFIG.bonusPay100?.[mode] ?? DEFAULT_CONFIG.pay100)[0][0]));
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
      assert.equal(hits[0].rawPay100, String((DEFAULT_CONFIG.bonusPay100?.[mode] ?? DEFAULT_CONFIG.pay100)[9][5] * (multi ? 2 * (30 - scatters) : 1)));
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

test('pair copies are orthogonal, vacant, normal-only and never recurse', () => {
  const c = config(); c.scatterPPM.base.fill(0); c.pairPPM = PPM; c.repeatPairPPM = 0;
  const board = Array(30).fill('P5'); board[0] = board[1] = board[2] = null;
  const generated = fillBoard(board, 'base', zero(), c);
  assert.deepEqual(generated.map(g => [g.position, g.source]), [[0, 'draw'], [1, 'pair'], [2, 'draw']]);
  const blocked = Array(30).fill('P5'); blocked[0] = null;
  assert.equal(fillBoard(blocked, 'base', zero(), c).length, 1);
  const premium = Array(30).fill('N1'); premium[0] = premium[1] = null;
  const onlyP5 = config(); onlyP5.scatterPPM.base.fill(0); onlyP5.weights.fill(0); onlyP5.weights[9] = PPM;
  assert.ok(fillBoard(premium, 'base', zero(), onlyP5).every(g => g.source === 'draw'));
});

test('gravity preserves scatter and wild identity/multiplier', () => {
  const board = Array(30).fill(null); board[0] = 'S'; board[12] = wild(7);
  const compacted = compactBoard(board);
  assert.equal(compacted[18], 'S');
  assert.deepEqual(compacted[24], wild(7));
  assert.equal(compacted.filter(Boolean).length, 2);
});

test('bonus XP progressions alternate upgrades, cap at six and keep growing multipliers', () => {
  const expected = {
    common:[[2,1],[3,1],[3,2],[4,2],[4,3],[5,3],[5,4],[6,4],[6,5],[6,6]],
    super:[[2,2],[2,4],[3,4],[3,6],[4,6],[4,8],[5,8],[5,10],[6,10],[6,12]],
    secret:[[2,2],[3,4],[4,6],[5,8],[6,10],[6,12],[6,14],[6,16],[6,18],[6,20]]
  };
  for(const [mode,steps] of Object.entries(expected)) {
    steps.forEach(([requested,multiplier],i)=>assert.deepEqual(magicParameters(mode,i+1,null),{requested,multiplier}));
    assert.ok(magicParameters(mode,1000,null).multiplier > steps.at(-1)[1]);
    const board=quiet(); for(let i=0;i<5;i++)board[i]=wild(1);
    board[10]='S';
    const applied=applyMagic(board,mode,1000,zero());
    assert.equal(applied.placed,1); assert.equal(board.filter(c=>c?.symbol==='W').length,6);
    assert.equal(board[10],'S');assert.equal(board[0].multiplier,applied.multiplier);
    assert.equal(applyMagic(board,mode,1001,zero()).placed,0);
    assert.equal(board[0].multiplier,magicParameters(mode,1001,null).multiplier);
    board[0]=wild(10000);
    applyMagic(board,mode,1,zero());
    assert.equal(board[0].multiplier,10000);
  }
  for (const [draw, requested] of [[0,1],[.5,2],[.85,3]]) assert.equal(magicParameters('base',1,{next:()=>draw}).requested,requested);
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
  assert.equal(magic.discarded100, 499);
  assert.equal(magic.level, 1);
  assert.equal(magic.placed, 2);
  assert.ok(types.indexOf('hits', magicAt + 1) === -1 || types.indexOf('hits', magicAt + 1) > magicAt);
});

test('XP persists across bonus spins, but every new board loses unused wilds', () => {
  const engine = createEngine({ rng: checkerRandom() });
  let state = engine.start({ mode: 'super' });
  const first = engine.step(state, { initialBoard: cluster('N1', 5) });
  state = first.state;
  assert.ok(state.xp100 >= 500);
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
  const c = config(); c.xpThreshold100.common = 500;
  const fallback = checkerRandom();
  const stream = [...Array(10).fill(.99), 0, 0];
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
  assert.equal(shared.events.find(e => e.type === 'xp-gained').xpGained100, 840);
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
  const board = Array.from({ length: 30 }, () => wild(100));
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
  const bad = config(); bad.buyPrices.super = 241;
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

test('a successful pair may copy once more, with no recursive chain', () => {
  const c = config(); c.scatterPPM.base.fill(0); c.pairPPM = PPM; c.repeatPairPPM = PPM;
  const board = quiet();
  for (const p of [24, 25, 26, 27]) board[p] = null;
  const generated = fillBoard(board, 'base', zero(), c);
  assert.deepEqual(generated.map(g => [g.position, g.source]), [[24,'draw'],[25,'pair'],[26,'repeat-pair'],[27,'draw']]);
  assert.equal(generated[2].parent,25);
  const withoutRepeat = quiet(); for (const p of [24,25,26]) withoutRepeat[p]=null;
  c.repeatPairPPM=0;
  assert.ok(!fillBoard(withoutRepeat,'base',zero(),c).some(g=>g.source==='repeat-pair'));
});

test('every mode uses its own symbol payout table without changing XP', () => {
  for (const mode of ['base','common','super','secret']) {
    const table=DEFAULT_CONFIG.bonusPay100?.[mode] ?? DEFAULT_CONFIG.pay100;
    for (let i=0;i<SYMBOLS.length;i++) for(const size of [5,6,8,11,15,18]) {
      const hit=evaluateBoard(cluster(SYMBOLS[i],size),mode).find(h=>h.symbol===SYMBOLS[i]);
      assert.equal(hit.rawPay100,String(table[i][tierForSize(size)]));
      assert.equal(hit.xp100,size*DEFAULT_CONFIG.xpPerCell100[i]);
    }
  }
});
