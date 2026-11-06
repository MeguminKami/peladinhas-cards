import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLocalRisco, seedCommitment } from '../js/casino-risco-local.js';
import { timeAtMultiplier } from '../games/risco/src/engine.js';

const connect = (previous = null, balance = 1000000, now = 1000) => applyLocalRisco(previous, balance, { action: 'connect', now });
const start = async (autoCashoutCents = null) => {
  const opened = await connect();
  return applyLocalRisco(opened.session, opened.balance, { action: 'start', now: 1000,
    payload: { sessionId: opened.session.sessionId, expectedRevision: opened.session.revision, betUnits: 100, autoCashoutCents } });
};
const request = (value, action, elapsed, extra = {}) => applyLocalRisco(value.session, value.balance, {
  action, now: value.session.round.startedAt + elapsed,
  payload: { sessionId: value.session.sessionId, roundId: value.session.round.id, ...extra },
});

test('RISCO debita uma vez e esconde até o crash imediato começar', async () => {
  const value = await start();
  assert.equal(value.debit, 10000);
  assert.equal(value.balance, 990000);
  assert.equal(value.credit, 0);
  assert.equal(value.result.round.commitment, await seedCommitment(value.session.round.engine.seed));
  value.session.round.engine.crashCents = 100;
  const waiting = await request(value, 'poll', -1);
  assert.equal(waiting.result.round.phase, 'waiting');
  assert.equal('seed' in waiting.result.round, false);
  assert.equal('crashCents' in waiting.result.round, false);
  assert.equal(waiting.debit, 0);
  const end = await request(waiting, 'poll', 0);
  assert.equal(end.result.round.crashCents, 100);
  assert.equal(end.result.round.phase, 'crashed');
  assert.equal(end.completed.creditedUnits, 0);
  assert.equal(end.session.history.length, 1);
  assert.equal((await request(end, 'poll', 100)).completed, null);
});

test('RISCO auto liquida uma vez mesmo após recarregar e após o crash', async () => {
  const value = await start(200);
  value.session.round.engine.crashCents = 200;
  const snapshot = structuredClone(value.session);
  const end = await connect(snapshot, value.balance, value.session.round.startedAt + timeAtMultiplier(300));
  assert.deepEqual(value.session, snapshot);
  assert.equal(end.credit, 20000);
  assert.equal(end.balance, 1010000);
  assert.equal(end.result.round.cashoutCents, 200);
  const repeated = await request(end, 'poll', timeAtMultiplier(400));
  assert.equal(repeated.credit, 0);
  assert.equal(repeated.completed, null);
  assert.equal(repeated.balance, end.balance);
  assert.deepEqual(repeated.session.history, [200]);
});

test('RISCO usa relógio do anfitrião e mantém crash oculto após cashout', async () => {
  const value = await start();
  value.session.round.engine.crashCents = 500;
  const paid = await request(value, 'cashout', timeAtMultiplier(150), { multiplierCents: 999900, elapsedMs: 1e9 });
  assert.equal(paid.credit, 15000);
  assert.equal(paid.result.round.phase, 'running');
  assert.equal('seed' in paid.result.round, false);
  const repeated = await request(paid, 'cashout', timeAtMultiplier(200));
  assert.equal(repeated.credit, 0);
  assert.equal(repeated.balance, paid.balance);
});

test('RISCO poll entre fronteiras não altera sessão persistida', async () => {
  const value = await start();
  value.session.round.engine.crashCents = 1000;
  const polled = await request(value, 'poll', timeAtMultiplier(150));
  assert.deepEqual(polled.session, value.session);
  assert.equal(polled.result.round.multiplierCents, 150);
  assert.equal(polled.debit + polled.credit, 0);
});

test('RISCO converte DJC inteiros para centésimos sem gastar frações do saldo', async () => {
  const opened = await connect(null, 12345);
  const value = await applyLocalRisco(opened.session, opened.balance, { action: 'start', now: 1000,
    payload: { sessionId: opened.session.sessionId, expectedRevision: opened.session.revision, betUnits: 1, autoCashoutCents: 150 } });
  assert.equal(value.debit, 100);
  assert.equal(value.balance, 12245);
  value.session.round.engine.crashCents = 500;
  const paid = await request(value, 'poll', timeAtMultiplier(200));
  assert.equal(paid.result.round.payoutUnits, 1, '1 DJC × 1.5 arredonda para 1 DJC no motor');
  assert.equal(paid.credit, 100);
  assert.equal(paid.balance, 12345);
  assert.equal(paid.completed.costUnits, 100);
  const poor = await connect(null, 99);
  await assert.rejects(applyLocalRisco(poor.session, poor.balance, { action: 'start', now: 1000,
    payload: { sessionId: poor.session.sessionId, expectedRevision: poor.session.revision, betUnits: 1 } }), /saldo inválido/i);
});

test('RISCO recusa IDs antigos, aposta inválida e nova ronda durante a anterior', async () => {
  const value = await start();
  await assert.rejects(request(value, 'cashout', 0, { roundId: 'old' }), /ronda mudou/i);
  await assert.rejects(request(value, 'cashout', 0, { sessionId: 'old' }), /ronda mudou/i);
  await assert.rejects(applyLocalRisco(value.session, value.balance, { action: 'start', now: 1000,
    payload: { sessionId: value.session.sessionId, expectedRevision: value.session.revision, betUnits: 100 } }), /fim da ronda/i);
  const opened = await connect();
  await assert.rejects(applyLocalRisco(opened.session, opened.balance, { action: 'start', now: 1000,
    payload: { sessionId: opened.session.sessionId, expectedRevision: opened.session.revision, betUnits: 0 } }), /inválid/i);
});

test('RISCO carteira IndexedDB repete recibos sem duplicar débito ou crédito', async () => {
  const { createServer } = await import('node:http');
  const { readFile } = await import('node:fs/promises');
  const { existsSync } = await import('node:fs');
  const { chromium } = await import('./browser-sandbox.mjs');
  const root = new URL('../', import.meta.url);
  const server = createServer(async (req, res) => {
    if (req.url === '/risco-wallet-test.html') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>RISCO fixture</title>'); return; }
    try {
      const target = new URL(req.url.split('?')[0].replace(/^\//, ''), root);
      if (!target.href.startsWith(root.href)) throw Error('Invalid path');
      res.setHeader('Content-Type', target.pathname.endsWith('.js') ? 'text/javascript' : 'text/plain');
      res.end(await readFile(target));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const installedEdge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' && existsSync(installedEdge) ? installedEdge : null);
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/js/db.js', route => route.fulfill({ contentType: 'text/javascript',
      body: "import {casinoFixture} from '../tests/fixtures/casino.js';export const callAdmin=casinoFixture;" }));
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/risco-wallet-test.html`);
    const result = await page.evaluate(async () => {
      const { createCasinoLocalWallet } = await import('/js/casino-local-wallet.js');
      const { readCasinoLocal } = await import('/js/casino-local-store.js');
      const wallet = createCasinoLocalWallet('risco-regression', () => {}, { tables: true });
      await wallet.start();
      const opened = await wallet.riscoRequest('connect', {}, crypto.randomUUID());
      const payload = { sessionId: opened.sessionId, expectedRevision: opened.revision, betUnits: 1, autoCashoutCents: 200 };
      const startId = crypto.randomUUID();
      const started = await wallet.riscoRequest('start', payload, startId);
      const repeated = await wallet.riscoRequest('start', payload, startId);
      const first = await readCasinoLocal('risco-regression');
      let collision = '';
      try { await wallet.riscoRequest('start', { ...payload, betUnits: 200 }, startId); } catch (error) { collision = error.message; }
      const originalNow = Date.now;
      Date.now = () => started.round.startedAt - 1;
      try {
        const before = await readCasinoLocal('risco-regression');
        const pending = await wallet.riscoRequest('poll', {}, crypto.randomUUID());
        const after = await readCasinoLocal('risco-regression');
        Date.now = () => started.round.startedAt + 1000000;
        const settled = await wallet.riscoRequest('poll', {}, crypto.randomUUID());
        const settledAgain = await wallet.riscoRequest('poll', {}, crypto.randomUUID());
        const ledger = await readCasinoLocal('risco-regression');
        const expectedCredit = first.risco.round.engine.crashCents >= 200 ? 200 : 0;
        return { balance: started.balance, repeated: repeated.balance, spent: first.spent, collision,
          hidden: !('seed' in pending.round) && !('crashCents' in pending.round), unchanged: JSON.stringify(before) === JSON.stringify(after),
          finalBalance: settled.balance, repeatedFinalBalance: settledAgain.balance, ledgerWon: ledger.won, expectedCredit,
          movements: ledger.wallet.recent.filter(row => row.kind === 'risco').length };
      } finally { Date.now = originalNow; }
    });
    assert.equal(result.balance, 9900);
    assert.equal(result.repeated, 9900);
    assert.equal(result.spent, 100);
    assert.match(result.collision, /repetido/i);
    assert.equal(result.hidden, true);
    assert.equal(result.unchanged, true);
    assert.equal(result.finalBalance, 9900 + result.expectedCredit);
    assert.equal(result.repeatedFinalBalance, result.finalBalance);
    assert.equal(result.ledgerWon, result.expectedCredit);
    assert.equal(result.movements, 1);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
