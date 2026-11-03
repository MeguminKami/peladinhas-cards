// Carteira (ui/carteira-local.js): débito único no start, crédito no último passo, passos
// idênticos à jogada do motor, pedidos fora de ordem recusados, versão diferente liquidada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aplicarCarteira, custo } from '../ui/carteira-local.js';
import { playRound, seedState, config } from '../src/index.js';

const start = (w, bal, mode = 'base', bet = 100) => aplicarCarteira(w, bal, { action: 'start', payload: { sessionId: w.sessionId, expectedRevision: w.revision, mode, bet } });

test('start debita uma vez; o prémio entra no último passo; passos iguais ao motor', () => {
  let { session: w, balance } = aplicarCarteira(null, 1_000_000, { action: 'connect' }, { seed: 'carteira-1' });
  for (const mode of ['base', 'hunt', 'buy-afterparty', 'buy-vip', 'buy-police']) {
    const rngBefore = w.rng.slice();
    const s = start(w, balance, mode);
    assert.equal(s.balance, balance - custo(mode, 100));
    const expected = playRound(rngBefore, { bet: 100, mode });
    w = s.session; balance = s.balance;
    let i = 0, last = false;
    while (!last) {
      const r = aplicarCarteira(w, balance, { action: 'step', payload: { sessionId: w.sessionId, roundId: w.round.id, index: i } });
      assert.deepEqual(r.result.step.events, expected.steps[i].events);
      last = r.result.last;
      assert.equal(r.balance, last ? balance + expected.totalWin : balance, 'crédito só no último passo');
      if (last) assert.equal(r.result.totalWin, expected.totalWin);
      w = r.session; balance = r.balance; i++;
    }
    assert.equal(i, expected.steps.length);
    assert.equal(w.round, null);
  }
});

test('pedidos inválidos são recusados sem mexer no saldo', () => {
  const c = aplicarCarteira(null, 50, { action: 'connect' }, { seed: 'x' });
  assert.throws(() => start(c.session, 50, 'base', 100), /insuficiente/);
  assert.throws(() => start(c.session, 1e6, 'base', 123), /inválido/);
  const ok = start(c.session, 1e6, 'base', 100);
  assert.throws(() => start(ok.session, ok.balance), /jogada em curso/);
  assert.throws(() => aplicarCarteira(ok.session, ok.balance, { action: 'step', payload: { sessionId: ok.session.sessionId, roundId: ok.session.round.id, index: 3 } }), /sessão mudou/);
  assert.throws(() => aplicarCarteira(ok.session, ok.balance, { action: 'start', payload: { sessionId: 'outra', expectedRevision: ok.session.revision, mode: 'base', bet: 100 } }), /sessão mudou/);
});

test('jogada pendente de outra versão da matemática é liquidada com o resultado guardado', () => {
  const c = aplicarCarteira(null, 1e6, { action: 'connect' }, { seed: 'v' });
  const s = start(c.session, 1e6, 'buy-afterparty');
  const old = structuredClone(s.session); old.round.version = 'pp-v0';
  const r = aplicarCarteira(old, s.balance, { action: 'connect' });
  assert.equal(r.balance, s.balance + old.round.totalWin);
  assert.equal(r.session.round, null);
  assert.match(r.result.notice, /resultado original/);
});

test('custos de todos os modos e apostas são cêntimos inteiros', () => {
  for (const m of Object.keys(config.modes)) for (const b of config.bets) assert.ok(Number.isSafeInteger(custo(m, b)), `${m} ${b}`);
  assert.equal(seedState('a').length, 4);
});
