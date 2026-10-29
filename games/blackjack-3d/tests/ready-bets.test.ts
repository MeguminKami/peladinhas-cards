import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingBets, confirmBets } from '../src/ready-bets';

test('Pronto confirms every wagered place, excluding empty, leaving and already confirmed places', async () => {
  const bets = pendingBets([
    {seat: 1, bet: 0, leaving: false}, {seat: 2, bet: 100, leaving: false},
    {seat: 3, bet: 0, leaving: false}, {seat: 4, bet: 0, leaving: false},
    {seat: 5, bet: 0, leaving: true},
  ], [100, 100, 200, 0, 100]);
  const sent: number[][] = [], saved: number[][] = [];
  await confirmBets(bets, 300, async (amount, seat) => { sent.push([seat, amount]); }, (amount, seat) => saved.push([seat, amount]));
  assert.deepEqual(sent, [[1, 100], [3, 200]]);
  assert.deepEqual(saved, sent);
});

test('insufficient combined balance or invalid wager sends no commands', async () => {
  let calls = 0;
  for (const [amounts, balance] of [[[100, 200], 299], [[100, 21], 500], [[100, 100002], 200000]] as const) {
    await assert.rejects(confirmBets(amounts.map((amount, i) => ({seat: i + 1, amount})), balance, async () => { calls++; }, () => {}));
  }
  assert.equal(calls, 0);
});

test('a failed command stops confirmation and only records acknowledged places', async () => {
  const saved: number[] = [], sent: number[] = [];
  await assert.rejects(confirmBets([1, 2, 3].map(seat => ({seat, amount: 100})), 300, async (_, seat) => {
    sent.push(seat); if (seat === 2) throw Error('Ligação interrompida');
  }, (_, seat) => saved.push(seat)));
  assert.deepEqual(sent, [1, 2]);
  assert.deepEqual(saved, [1]);
});
