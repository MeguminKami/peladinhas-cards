import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { chromium } from './browser-sandbox.mjs';
import { serve } from '../games/ganza/scripts/serve.js';

const server = await serve(resolve('.'), 0);
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  for (const width of [1366, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
    const held = [];
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    // Hold cold audio downloads until the loading state has been verified.
    await context.route('**/ui/audio/**', route => { held.push(route); });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/assets/games/ganza/game.html`);
    await page.waitForFunction(() => window.ganza && document.querySelector('progress').value >= 1);
    await page.waitForFunction(() => ganza.audio.ctx && !ganza.audio.available);
    assert.equal(await page.locator('#drop').isDisabled(), true);
    assert.equal(await page.locator('#loading').isVisible(), true);
    assert.ok(held.length > 0);
    await context.unroute('**/ui/audio/**');
    await Promise.all(held.map(route => route.continue()));
    await page.waitForFunction(() => ganza.state.sessionId && ganza.audio.available && !ganza.state.busy);
    assert.equal(await page.locator('#loading').isVisible(), false);
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    for (const risk of ['baixo', 'medio', 'alto', 'extremo']) await page.locator(`[data-risk="${risk}"]`).click();
    await page.setViewportSize({ width: width === 390 ? 844 : 390, height: 844 });
    await page.setViewportSize({ width, height: 844 });
    for (let i = 0; i < 20; i++) {
      await page.locator('#drop').click();
      await page.waitForFunction(() => !ganza.state.busy, null, { timeout: 1500 });
    }
    await page.waitForFunction(() => ganza.state.air === 0 && ganza.state.history.length === 20, null, { timeout: 15000 });
    assert.deepEqual(requests, [], 'Prepared gameplay must not download assets');
    assert.equal(await page.evaluate(() => ganza.audio.ctx.state), 'running');
    assert.equal(await page.evaluate(() => ganza.scene.buoySprites.size), 2, 'All buoys must reuse the normal and illuminated sprites');
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: loading gate, all risks, rotation, 20 payments, no gameplay downloads; ${await page.evaluate(() => Math.round(ganza.state.fps))} FPS locally`);
    await context.close();
  }
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' && !route.request().url().includes('/ui/audio/') ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/assets/games/ganza/game.html`);
  await page.locator('#loading').waitFor({ state: 'hidden' });
  await page.locator('#drop').click();
  await page.waitForFunction(() => ganza.state.history.length === 1);
  console.log('PASS unavailable audio: entry and payment remain possible');
  await context.close();
} finally {
  await browser.close();
  server.close();
}
