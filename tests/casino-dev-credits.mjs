import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from './browser-sandbox.mjs';

const server = spawn(process.execPath, ['scripts/dev-server.mjs', '--port', '8194'], {
  windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve);
    server.once('error', reject);
    server.once('exit', code => reject(Error(`Dev server exited: ${code}`)));
  });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ serviceWorkers: 'block' });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:8194') return route.abort();
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Dev credits</title>' });
    return route.continue();
  });
  await page.goto('http://127.0.0.1:8194/');
  const results = await page.evaluate(async () => {
    const { casinoFixture } = await import('/tests/fixtures/casino.js');
    const { newCasinoWallet } = await import('/js/casino-economy.js');
    async function open(balance, overrides = {}) {
      const state = { wallet: { ...newCasinoWallet(), balance }, sessions: {}, operations: {}, rounds: {} };
      localStorage.setItem('casino-fixture-wallet', JSON.stringify(state));
      sessionStorage.setItem('casino-fixture-wallet', JSON.stringify(state));
      Object.assign(window, { __casinoPersistentFixture: true, __casinoDevCredits: 100000 }, overrides);
      const input = { action: 'open', owner: 'dev-test', id: crypto.randomUUID() };
      const first = (await casinoFixture('casinoSession', input)).data;
      const second = (await casinoFixture('casinoSession', input)).data;
      return { balance: first.wallet.balance, revision: first.wallet.revision, repeatedRevision: second.wallet.revision };
    }
    return {
      empty: await open(0), low: await open(499), boundary: await open(500),
      funded: await open(123456), disabled: await open(0, { __casinoDevCredits: 0 }),
      custom: await open(0, { __casinoDevCredits: 200000 }),
      isolated: await open(0, { __casinoPersistentFixture: false }),
      normalFixture: await open(0, { __casinoDevCredits: undefined }),
    };
  });
  assert.equal(results.empty.balance, 100000);
  assert.equal(results.low.balance, 100000);
  assert.equal(results.boundary.balance, 500);
  assert.equal(results.funded.balance, 123456);
  assert.equal(results.disabled.balance, 0);
  assert.equal(results.custom.balance, 200000);
  assert.equal(results.isolated.balance, 0);
  assert.equal(results.normalFixture.balance, 0);
  assert.equal(results.empty.revision, results.empty.repeatedRevision);
  console.log('Dev credits: refill, threshold, persistence, custom amount and fixture isolation passed.');
} finally {
  await browser?.close();
  server.kill();
}
