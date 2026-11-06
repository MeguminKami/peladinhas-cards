import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { chromium } from './browser-sandbox.mjs';
import { serve } from '../games/ganza/scripts/serve.js';

const server = await serve(resolve('.'), 0);
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
const base = `http://127.0.0.1:${server.address().port}`;
const passed = [];

async function setup(page) {
  await page.evaluate(async () => {
    const { createCasinoLocalWallet } = await import('/js/casino-local-wallet.js');
    const { readCasinoLocal } = await import('/js/casino-local-store.js');
    const { newCasinoWallet } = await import('/js/casino-economy.js');
    if (!sessionStorage.getItem('casino-fixture-wallet')) sessionStorage.setItem('casino-fixture-wallet', JSON.stringify({ wallet: { ...newCasinoWallet(), balance: 100000000 }, sessions: {} }));
    const uid = 'ganza-sync';
    const wallet = createCasinoLocalWallet(uid, () => {}, { tables: true });
    await wallet.start();
    const connection = await wallet.ganzaRequest('connect', {}, crypto.randomUUID());
    const h = window.h = {
      uid, wallet, initial: await wallet.balance(),
      payload: { sessionId: connection.sessionId, rows: 8, risk: 'baixo', bet: 100 },
      row: () => readCasinoLocal(uid),
      calls: () => (window.__casinoCalls || []).filter(c => c.input?.action === 'sync'),
      server: () => JSON.parse(sessionStorage.getItem('casino-fixture-wallet')),
      poll: () => wallet.checkpoint('ganza-idle'),
      start: (id = crypto.randomUUID()) => wallet.ganzaRequest('start', h.payload, id),
      finish: (r, id = crypto.randomUUID()) => wallet.ganzaRequest('settle', { sessionId: h.payload.sessionId, roundId: r.round.id }, id),
      async batch(n = 1) { const rounds = []; for (let i = 0; i < n; i++) rounds.push(await h.start()); for (const r of rounds) await h.finish(r); return rounds; },
    };
  });
}

async function scenario(name, work) {
  // Each scenario has its own real IndexedDB and a separate fixture authority.
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  await ctx.route('**/js/db.js', r => r.fulfill({ contentType: 'text/javascript', body: "export {casinoFixture as callAdmin} from '/tests/fixtures/casino.js';" }));
  await ctx.route('**/wallet-fixture.html', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><main></main>' }));
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + '/wallet-fixture.html');
    await setup(page);
    await work(page, ctx);
    assert.deepEqual(errors, []);
    passed.push(name);
    console.log('PASS', name);
  } finally { await ctx.close(); }
}

try {
  await scenario('clean wallet: 100 local checks, zero network requests', async page => {
    const result = await page.evaluate(async () => {
      const put = IDBObjectStore.prototype.put; let writes = 0;
      IDBObjectStore.prototype.put = function (...args) { writes++; return put.apply(this, args); };
      try { for (let i = 0; i < 100; i++) await h.poll(); } finally { IDBObjectStore.prototype.put = put; }
      return { sync: h.calls().length, total: window.__casinoCalls.length, writes };
    });
    assert.deepEqual(result, { sync: 0, total: 1, writes: 0 });
  });

  await scenario('100 balls: no sync until the last durable payment; one batch only', async page => {
    const result = await page.evaluate(async () => {
      const rounds = []; for (let i = 0; i < 100; i++) rounds.push(await h.start());
      for (let i = 0; i < 10; i++) await h.poll();
      const inAir = h.calls().length;
      for (const r of rounds.slice(0, -1)) await h.finish(r);
      await h.poll(); const lastInAir = h.calls().length;
      await h.finish(rounds.at(-1)); const before = await h.row();
      await Promise.all(Array.from({ length: 20 }, () => h.poll()));
      const after = await h.row(); for (let i = 0; i < 10; i++) await h.poll();
      return { inAir, lastInAir, count: h.calls().length, spent: h.calls()[0].input.spent, won: h.calls()[0].input.won, before, after, remote: h.server().wallet.balance };
    });
    assert.equal(result.inAir, 0); assert.equal(result.lastInAir, 0);
    assert.equal(result.count, 1); assert.equal(result.spent, 10000);
    assert.equal(result.won, result.before.won);
    assert.equal(result.after.balance, result.before.balance);
    assert.equal(result.remote, result.after.balance);
    assert.equal(result.after.dirty, false); assert.equal(result.after.pending, null);
  });

  await scenario('offline flag: no network probe; reconnect confirms the saved batch', async page => {
    const result = await page.evaluate(async () => {
      await h.batch(3); Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      for (let i = 0; i < 10; i++) await h.poll(); const offline = h.calls().length, local = await h.row();
      delete navigator.onLine; await h.poll();
      return { offline, dirty: local.dirty, count: h.calls().length, after: await h.row(), remote: h.server().wallet.balance };
    });
    assert.equal(result.offline, 0); assert.equal(result.dirty, true); assert.equal(result.count, 1);
    assert.equal(result.after.dirty, false); assert.equal(result.after.balance, result.remote);
  });

  await scenario('network failure: persistent intent, identical retries, no lost totals', async page => {
    const result = await page.evaluate(async () => {
      await h.batch(2); window.__casinoFail = true; await h.poll(); const first = await h.row();
      await h.poll(); const second = await h.row(); window.__casinoFail = false; await h.poll();
      return { first, second, calls: h.calls(), after: await h.row(), remote: h.server().wallet.balance };
    });
    assert.equal(result.first.dirty, true); assert.ok(result.first.pending);
    assert.deepEqual(result.first.pending, result.second.pending);
    assert.equal(result.calls.length, 3);
    assert.deepEqual(result.calls[0].input, result.calls[1].input);
    assert.deepEqual(result.calls[0].input, result.calls[2].input);
    assert.equal(result.after.dirty, false); assert.equal(result.after.balance, result.remote);
  });

  await scenario('lost acknowledgement: replay does not pay or advance sequence twice', async page => {
    const result = await page.evaluate(async () => {
      await h.batch(3); window.__casinoLoseResponse = true; await h.poll();
      const saved = await h.row(), remote = h.server(); window.__casinoLoseResponse = false;
      await h.poll(); await h.poll(); return { saved, remote, after: await h.row(), final: h.server(), calls: h.calls() };
    });
    assert.ok(result.saved.pending); assert.equal(result.calls.length, 2);
    assert.deepEqual(result.calls[0].input, result.calls[1].input);
    assert.equal(result.remote.wallet.balance, result.final.wallet.balance);
    assert.equal(result.after.sequence, 1); assert.equal(result.after.pending, null);
  });

  await scenario('lost acknowledgement plus new balls: no retry in flight and no merged/doubled batch', async page => {
    const result = await page.evaluate(async () => {
      await h.batch(); window.__casinoLoseResponse = true; await h.poll();
      window.__casinoLoseResponse = false;
      const r = await h.start(); await h.poll(); const busyCount = h.calls().length;
      await h.finish(r); await h.poll(); const middle = await h.row(); await h.poll();
      return { busyCount, middle, calls: h.calls(), after: await h.row(), remote: h.server().wallet.balance };
    });
    assert.equal(result.busyCount, 1);
    assert.deepEqual(result.calls[0].input, result.calls[1].input);
    assert.equal(result.middle.dirty, true); assert.equal(result.calls.length, 3);
    assert.equal(result.calls[2].input.sequence, 2);
    assert.equal(result.after.balance, result.remote); assert.equal(result.after.dirty, false);
  });

  await scenario('net-zero batch still confirms spent/won rather than comparing only displayed balance', async page => {
    const result = await page.evaluate(async () => {
      const { playRound } = await import('/assets/games/ganza/src/engine.js');
      // Find valid local seeds for two real 8-row outcomes: 0.52x and 1.05x.
      // Five losses of 48 units and 48 wins of 5 units cancel exactly.
      const random = crypto.getRandomValues.bind(crypto), wordsFor = {};
      for (const k of [2, 3]) {
        for (let attempt = 0; attempt < 10000; attempt++) {
          const words = random(new Uint32Array(8)), seed = Array.from(words, n => n.toString(16).padStart(8, '0')).join('');
          if (playRound(seed, h.payload).k === k) { wordsFor[k] = words; break; }
        }
        if (!wordsFor[k]) throw Error('Could not prepare deterministic fixture');
      }
      for (const [k, count] of [[3, 5], [2, 48]]) {
        crypto.getRandomValues = array => { array.set(wordsFor[k]); return array; };
        try { for (let i = 0; i < count; i++) { const r = await h.start(); await h.finish(r); } }
        finally { crypto.getRandomValues = random; }
      }
      const before = await h.row(); await h.poll();
      return { initial: h.initial, before, after: await h.row(), calls: h.calls() };
    });
    assert.equal(result.before.balance, result.initial); assert.equal(result.before.dirty, true);
    assert.equal(result.calls.length, 1); assert.equal(result.calls[0].input.spent, 5300);
    assert.equal(result.calls[0].input.won, 5300); assert.equal(result.after.dirty, false);
    assert.equal(result.after.balance, result.initial);
  });

  await scenario('slow confirmation: new balls and external reward survive; no duplicate queued tick', async page => {
    await page.evaluate(async () => {
      await h.batch(2); window.__casinoGate = new Promise(resolve => { window.releaseSync = resolve; });
      window.confirmation = h.poll();
    });
    await page.waitForFunction(() => h.calls().length === 1);
    const result = await page.evaluate(async () => {
      const old = h.calls()[0].input; await Promise.all(Array.from({ length: 20 }, () => h.poll()));
      await h.batch(3); const newer = await h.row();
      const remote = h.server(); remote.wallet.balance += 5000; sessionStorage.setItem('casino-fixture-wallet', JSON.stringify(remote));
      window.__casinoGate = null; releaseSync(); await confirmation;
      const middle = await h.row(), middleCount = h.calls().length;
      await h.poll(); return { old, newer, middle, middleCount, after: await h.row(), count: h.calls().length, remote: h.server().wallet.balance };
    });
    assert.equal(result.middleCount, 1); assert.equal(result.middle.dirty, true);
    assert.equal(result.middle.confirmedSpent, result.old.spent);
    assert.equal(result.middle.balance, result.newer.balance + 5000);
    assert.equal(result.count, 2); assert.equal(result.after.dirty, false);
    assert.equal(result.after.balance, result.remote);
  });

  await scenario('start wins the local lock race: the tick must skip the incomplete batch', async page => {
    await page.evaluate(async () => {
      await h.batch();
      window.hold = navigator.locks.request('peladinhas:casino:wallet:ganza-sync', async () => {
        window.held = true; await new Promise(resolve => { window.releaseLock = resolve; });
      });
    });
    await page.waitForFunction(() => window.held);
    await page.evaluate(() => { window.pendingStart = h.start(); });
    await page.waitForFunction(async () => (await navigator.locks.query()).pending.some(l => l.name === 'peladinhas:casino:wallet:ganza-sync'));
    const result = await page.evaluate(async () => {
      const poll = h.poll(); releaseLock(); await hold;
      const r = await pendingStart; await poll; const skipped = h.calls().length;
      await h.finish(r); await h.poll(); return { skipped, count: h.calls().length, state: await h.row() };
    });
    assert.equal(result.skipped, 0); assert.equal(result.count, 1); assert.equal(result.state.dirty, false);
  });

  await scenario('failed durable start: no debit and no sync', async page => {
    const result = await page.evaluate(async () => {
      const before = await h.row(), put = IDBObjectStore.prototype.put; let failed = false;
      IDBObjectStore.prototype.put = function () { throw new DOMException('Full disk', 'QuotaExceededError'); };
      try { await h.start(); } catch { failed = true; } finally { IDBObjectStore.prototype.put = put; }
      await h.poll(); return { failed, before, after: await h.row(), count: h.calls().length };
    });
    assert.ok(result.failed); assert.equal(result.count, 0);
    assert.equal(result.before.balance, result.after.balance); assert.equal(result.after.spent, 0);
    assert.equal(Object.keys(result.after.ganza.rounds).length, 0);
  });

  await scenario('failed durable settlement: animation ending is not enough to sync', async page => {
    const result = await page.evaluate(async () => {
      const r = await h.start(), before = await h.row(), id = crypto.randomUUID(), put = IDBObjectStore.prototype.put;
      let failed = false; IDBObjectStore.prototype.put = function () { throw new DOMException('Full disk', 'QuotaExceededError'); };
      try { await h.finish(r, id); } catch { failed = true; } finally { IDBObjectStore.prototype.put = put; }
      await h.poll(); const blocked = h.calls().length, waiting = await h.row();
      const settled = await h.finish(r, id), duplicate = await h.finish(r, id); await h.poll();
      return { failed, before, waiting, blocked, settled, duplicate, after: await h.row(), count: h.calls().length };
    });
    assert.ok(result.failed); assert.equal(result.blocked, 0);
    assert.equal(result.waiting.balance, result.before.balance); assert.equal(Object.keys(result.waiting.ganza.rounds).length, 1);
    assert.deepEqual(result.settled, result.duplicate);
    assert.equal(result.count, 1); assert.equal(result.after.balance, result.before.balance + result.settled.round.payment);
  });

  await scenario('server committed but saving acknowledgement fails: retry remains idempotent', async page => {
    const result = await page.evaluate(async () => {
      await h.batch(2); const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value, ...args) {
        if (value.sequence === 1 && value.pending === null) throw new DOMException('Full disk', 'QuotaExceededError');
        return put.call(this, value, ...args);
      };
      try { await h.poll(); } finally { IDBObjectStore.prototype.put = put; }
      const pending = await h.row(), remote = h.server().wallet.balance; await h.poll();
      return { pending, remote, final: h.server().wallet.balance, after: await h.row(), calls: h.calls() };
    });
    assert.ok(result.pending.pending); assert.equal(result.pending.sequence, 0);
    assert.equal(result.calls.length, 2); assert.deepEqual(result.calls[0].input, result.calls[1].input);
    assert.equal(result.remote, result.final); assert.equal(result.after.sequence, 1); assert.equal(result.after.dirty, false);
  });

  for (const lostReply of [false, true]) {
    await scenario(`exit with a ball in flight, ${lostReply ? 'lost reply' : 'offline failure'}: reload recovers debit and exact payment`, async page => {
      const saved = await page.evaluate(async lost => {
        const r = await h.start(); sessionStorage.setItem('saved-ball', JSON.stringify(r));
        window.__casinoFail = !lost; window.__casinoLoseResponse = lost;
        await h.wallet.close(); return { row: await h.row(), request: h.calls()[0].input, initial: h.initial };
      }, lostReply);
      assert.equal(saved.request.release, true); assert.ok(saved.row.pending);
      await page.reload(); await setup(page);
      const result = await page.evaluate(async () => {
        const r = JSON.parse(sessionStorage.getItem('saved-ball')), recovered = await h.wallet.ganzaRequest('connect', {}, crypto.randomUUID());
        const settled = await h.finish(r); await h.poll();
        return { recovered, settled, row: await h.row(), remote: h.server().wallet.balance, calls: h.calls() };
      });
      assert.equal(result.recovered.pending.length, 1); assert.equal(result.recovered.pending[0].seed, undefined);
      assert.equal(result.calls[0].input.sequence, saved.request.sequence);
      assert.deepEqual(result.calls[0].input, saved.request);
      assert.equal(result.row.balance, saved.initial - 100 + result.settled.round.payment);
      assert.equal(result.remote, result.row.balance); assert.equal(result.row.dirty, false);
    });
  }

  await scenario('closing during a slow checkpoint: wait, release once, reject further bets', async page => {
    await page.evaluate(async () => {
      await h.batch(2); window.__casinoGate = new Promise(resolve => { window.releaseSync = resolve; }); window.confirmation = h.poll();
    });
    await page.waitForFunction(() => h.calls().length === 1);
    const result = await page.evaluate(async () => {
      const closing = h.wallet.close(); let rejected = false; try { await h.start(); } catch { rejected = true; }
      window.__casinoGate = null; releaseSync(); await confirmation; await closing; await h.poll();
      return { rejected, calls: h.calls(), row: await h.row(), remote: h.server().wallet.balance };
    });
    assert.ok(result.rejected); assert.equal(result.calls.length, 2);
    assert.equal(result.calls[0].input.release, false); assert.equal(result.calls[1].input.release, true);
    assert.equal(result.row.closed, true); assert.equal(result.row.balance, result.remote);
  });

  await scenario('second tab cannot mutate or sync the active on-device wallet', async (page, ctx) => {
    const second = await ctx.newPage(); await second.goto(base + '/wallet-fixture.html');
    const rejected = await second.evaluate(async () => {
      const { createCasinoLocalWallet } = await import('/js/casino-local-wallet.js');
      try { await createCasinoLocalWallet('ganza-sync', () => {}, { tables: true }).start(); return false; } catch { return true; }
    });
    assert.equal(rejected, true); await second.close();
    assert.equal(await page.evaluate(() => h.calls().length), 0);
  });

  await scenario('host clock: first local check at 30s; clean/busy checks cause no requests; destroy cancels it', async page => {
    // Minimal local iframe exercises the real host message boundary without animation timers.
    await page.route('**/assets/games/ganza/game.html?*', r => r.fulfill({ contentType: 'text/html', body: `<script>parent.postMessage({channel:'ganza:v1',type:'request',id:crypto.randomUUID(),action:'connect',payload:{}},location.origin);</script>` }));
    await page.clock.install(); await page.clock.pauseAt(new Date());
    await page.evaluate(async () => {
      const { mountCasinoGanza } = await import('/js/casino-ganza-host.js');
      window.mounted = mountCasinoGanza(document.querySelector('main'), h.wallet); await mounted.ready;
    });
    await page.clock.runFor(300000);
    assert.equal(await page.evaluate(() => window.__casinoCalls.length), 1);
    await page.evaluate(async () => { window.activeBall = await h.start(); });
    await page.clock.runFor(90000);
    assert.equal(await page.evaluate(() => h.calls().length), 0);
    await page.evaluate(async () => { await h.finish(activeBall); });
    await page.clock.runFor(29999); assert.equal(await page.evaluate(() => h.calls().length), 0);
    await page.clock.runFor(1); await page.waitForFunction(() => h.calls().length === 1);
    await page.waitForFunction(() => h.wallet.view().local === false);
    await page.evaluate(async () => { mounted.destroy(); await h.batch(); });
    await page.clock.runFor(90000); assert.equal(await page.evaluate(() => h.calls().length), 1);
    await page.evaluate(async () => { await h.wallet.checkpoint('exit'); });
    assert.equal(await page.evaluate(() => h.calls().length), 2);
  });

  console.log(`${passed.length} hard scenarios passed. Production network blocked; IndexedDB + local fixture authority only.`);
} finally { await browser.close(); server.close(); }
