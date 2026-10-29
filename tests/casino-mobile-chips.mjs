import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from './browser-sandbox.mjs';

const origin = 'http://127.0.0.1:8098';
const server = spawn(process.execPath, ['scripts/dev-server.mjs', '--port', '8098'], {stdio: ['ignore', 'pipe', 'pipe']});
await new Promise((resolve, reject) => {
  server.stdout.once('data', resolve);
  server.once('error', reject);
  server.once('exit', () => reject(Error('Fixture server failed')));
});
const browser = await chromium.launch({headless: true, channel: 'msedge', args: ['--enable-unsafe-swiftshader']});
mkdirSync('test-results/casino-mobile-chips', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, serviceWorkers: 'block', reducedMotion: 'reduce'});
  page.setDefaultTimeout(7000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', r => r.request().url().startsWith(origin + '/') ? r.continue() : r.abort());
  for (const game of ['blackjack', 'roulette'].filter(game => !process.argv[2] || game === process.argv[2])) {
    await page.goto(`${origin}/assets/games/${game}/embed.html`);
    await page.waitForFunction(() => window.mountBlackjackMultiplayer);
    await page.evaluate(async game => {
      const uid = 'mobile-local', now = Date.now();
      const player = {uid, name: 'Jogador local', seat: 3, bet: 0, leaving: false, activeUntil: now + 120000, color: '#74c0fc', plan: null, total: 0, ready: false};
      const table = {id: 'mobile-local-table', revision: 1, deadline: 0, players: [player], round: null, phase: 'betting', roundId: 0, result: null};
      const connection = {
        uid, ready: Promise.resolve({table, balance: 20000}),
        subscribe(fn) { window.pushView = fn; fn({uid, table, balance: 20000, now, pending: false}); return () => {}; },
        subscribeChat(fn) { window.pushChat = fn; fn([]); return () => {}; },
        command: async () => {}, sendChat: async () => {}, getBalance: () => 20000,
        getPending: () => false, retry: async () => {}, destroy() {},
      };
      window.game = game === 'blackjack' ? window.mountBlackjackMultiplayer(connection) : window.mountRouletteMultiplayer(connection);
      window.setCasinoFit(true);
      await window.game.ready;
    }, game);
    await page.locator('[data-chip="500"]:not(:disabled)').waitFor();
    for (const [width, height] of [[320, 740], [390, 844], [768, 900], [1440, 900], [844, 390]]) {
      await page.setViewportSize({width, height});
      const chips = page.locator('.chips [data-chip]');
      assert.equal(await chips.count(), 9);
      assert.equal(await page.locator('.casino-fit-chip').count(), 0);
      const fit = await page.evaluate(() => {
        const row = document.querySelector('.chips').getBoundingClientRect();
        const boxes = [...document.querySelectorAll('.chips [data-chip]')].map(b => b.getBoundingClientRect());
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          minSize: Math.min(...boxes.map(r => Math.min(r.width, r.height))),
          trayFits: row.left >= 0 && row.right <= innerWidth + 1,
          allInTray: boxes.every(r => r.left >= row.left - 1 && r.right <= row.right + 1 && r.top >= row.top - 1 && r.bottom <= row.bottom + 1),
        };
      });
      assert.ok(fit.overflow <= 1, `${game} overflow ${width}: ${JSON.stringify(fit)}`);
      assert.ok(fit.trayFits, `${game} chip tray clipped at ${width}`);
      await page.screenshot({path: `test-results/casino-mobile-chips/${game}-${width}.png`, fullPage: true});
      if (width <= 650) {
        assert.ok(fit.minSize >= 44, `${game} touch targets at ${width}`);
        assert.ok(fit.allInTray, `${game} hidden denominations at ${width}`);
      }
      await page.locator('[data-chip="500"]').click();
      assert.equal(await page.locator('[data-chip="500"]').getAttribute('aria-pressed'), 'true');
      const total = page.locator(game === 'blackjack' ? '[data-bet]' : '[data-total]');
      const amount = async () => Number((await total.innerText()).replace(/\s/g, '').replace(',', '.'));
      const previous = await amount();
      if (game === 'blackjack') {
        await page.locator('[data-action="add-3"]').click();
      } else {
        await page.locator('.outside button').first().click();
      }
      assert.equal(await amount(), previous + 5);
      await page.screenshot({path: `test-results/casino-mobile-chips/${game}-${width}.png`, fullPage: true});
      console.log(`${game} ${width}x${height}: visible chips, selection and placement passed`);
    }
    await page.setViewportSize({width: 390, height: 844});
    if (game === 'blackjack') await page.locator('[data-action="chat"]').click();
    await page.locator('[data-online-tab="chat"]').click();
    await page.locator('.online-chat-input').waitFor();
    assert.equal(await page.locator('.online-chat-input').evaluate(el => document.activeElement === el), false, `${game} opening chat focused input`);
    await page.evaluate(() => window.pushChat([{id: 'local', uid: 'other', user: 'Outro jogador', color: '#74c0fc', message: 'Boa sorte!', createdAt: Date.now()}]));
    assert.equal(await page.locator('.online-chat-input').evaluate(el => document.activeElement === el), false, `${game} incoming message focused input`);
    await page.locator('.online-chat-input').tap();
    await page.locator('.online-chat-input').fill('Olá!');
    assert.equal(await page.locator('.online-chat-input').inputValue(), 'Olá!');
    console.log(`${game}: chat does not focus keyboard until input is tapped`);
    await page.evaluate(() => window.game.destroy());
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  server.kill();
}
