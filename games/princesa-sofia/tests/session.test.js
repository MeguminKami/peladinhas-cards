import test from 'node:test';
import assert from 'node:assert/strict';
import { TestSession, autoCount, AUTO_SPIN_COUNTS } from '../ui/session.js';
import { createEngine } from '../src/index.js';
import { demoScenario } from '../ui/fixtures.js';

const quiet = () => Array.from({ length: 30 }, (_, p) => (Math.floor(p / 6) + p % 6) % 2 ? 'P3' : 'P2');

test('autoplay selection uses the two required step sizes and rejects invalid indices', () => {
  assert.deepEqual(AUTO_SPIN_COUNTS, [10,20,30,40,50,60,70,80,90,100,200,300,400,500]);
  assert.equal(autoCount(9), 100); assert.equal(autoCount(10), 200); assert.equal(autoCount(13), 500);
  for (const i of [-1, 14, 1.2]) assert.throws(() => autoCount(i));
});

test('test session charges once, credits once and rejects duplicate advancement', () => {
  const session = new TestSession({ balanceUnits: 10000 });
  session.start('hunt', 100);
  assert.equal(session.balanceUnits, 9600);
  assert.throws(() => session.start('base', 100));
  session.advance({ initialBoard: quiet() });
  assert.equal(session.balanceUnits, 9600);
  assert.throws(() => session.advance());
  assert.equal(session.balanceUnits, 9600);
});

test('insufficient credits cannot debit or begin an active round', () => {
  const session = new TestSession({ balanceUnits: 399 });
  assert.throws(() => session.start('hunt', 100), /insuficiente/);
  assert.equal(session.balanceUnits, 399); assert.equal(session.active, false);
});

test('a failed local round refunds the cost, with no partial prize retained', () => {
  const engine = createEngine({ rng: { next: () => 1 } });
  const session = new TestSession({ balanceUnits: 10000, engine });
  session.start('base', 100);
  assert.throws(() => session.advance(), /RNG/);
  assert.equal(session.balanceUnits, 10000); assert.equal(session.active, false);
});

test('MAX WIN fixture settles the engine result once and demo sessions are isolated', () => {
  const regular = new TestSession({ balanceUnits: 1000000 });
  const demo = new TestSession({ balanceUnits: 1000000 });
  demo.start('super', 100);
  const outcome = demo.advance({ initialBoard: demoScenario('max').board });
  assert.equal(outcome.state.maxWin, true);
  assert.equal(demo.balanceUnits, 1000000 - 22500 + 1000000);
  assert.equal(regular.balanceUnits, 1000000);
  assert.throws(() => demo.advance());
});
