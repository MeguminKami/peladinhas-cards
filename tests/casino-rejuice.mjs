import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "./browser-sandbox.mjs";
import { createSession } from '../games/futebol/src/session.ts';

const root = resolve(".");
const server = createServer((req, res) => {
  const path = resolve(
    root,
    decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "") ||
      "index.html",
  );
  if (relative(root, path).startsWith("..") || !existsSync(path)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".html": "text/html",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".webp": "image/webp",
      ".woff2": "font/woff2",
      ".woff": "font/woff",
    }[extname(path)] || "text/plain",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
mkdirSync("test-results", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    serviceWorkers: "block",
  });
  const fixtureSession=createSession('casino-ui-fixed');fixtureSession.balance=10000;
  await context.addInitScript(snapshot=>{
    const key='slot-local-v1:player:pedro%3Aofficial-2026-10-27-reset-200';
    if(!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(snapshot));
  },fixtureSession);
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  for (const name of ["auth", "db"])
    await context.route(`**/js/${name}.js`, (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: readFileSync(`tests/fixtures/${name}.js`, "utf8").replaceAll(
          "../../js/",
          "./",
        ),
      }),
    );
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(15000);
  const base = `http://127.0.0.1:${server.address().port}`;
  await page.goto(`${base}/#/casino`);
  await page.waitForFunction(
    () =>
      document.querySelector(".casino-balance strong")?.textContent === "100",
  );

  const initialHeight = (await page.locator('.casino-rejuice').boundingBox()).height;
  assert.equal(await page.locator('.casino-store-entry').count(), 0);
  assert.deepEqual(await page.locator('[data-rejuice]').boundingBox().then(({width,height})=>({width,height})), await page.locator('.casino-shop-link').boundingBox().then(({width,height})=>({width,height})));
  assert.equal(await page.locator('[data-rejuice]').innerText(), 'Pedir Rejuice');
  await page.locator('[data-rejuice]').click();
  assert.equal((await page.locator('.casino-rejuice').boundingBox()).height, initialHeight);
  assert.equal(await page.evaluate(() => window.__casinoCalls.length), 1);
  assert.match(await page.locator('.casino-rejuice-notice').innerText(), /Ainda tens/);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator('[data-rejuice]').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({path: `test-results/rejuice-${width}.png`});
  }
  await page.locator('.casino-rejuice-notice:not(.is-visible)').waitFor({state:'attached',timeout:7000});
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-rejuice]').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('[data-rejuice]').evaluate(el => el.matches(':focus-visible')), true);
  await context.close();
  // A fresh profile with 4.99 coins, entirely from fixtures.
  const low = await browser.newContext({ viewport: {width: 390, height: 1000}, serviceWorkers: 'block' });
  await low.route('**/js/firebase.js', r => r.fulfill({contentType:'text/javascript',body:'export const configured=true;'}));
  for (const name of ['auth','db']) await low.route(`**/js/${name}.js`, r => r.fulfill({contentType:'text/javascript',body:readFileSync(`tests/fixtures/${name}.js`,'utf8').replaceAll('../../js/','./')}));
  await low.addInitScript(() => sessionStorage.setItem('casino-fixture-wallet',JSON.stringify({wallet:{edition:'official-2026-10-27-reset-200',sessionProtocol:5,balance:499,revision:1,recent:[]},sessions:{},operations:{},rounds:{}})));
  const mobile = await low.newPage();
  await mobile.goto(`${base}/#/casino`);
  await mobile.waitForFunction(() => document.querySelector('.casino-balance strong')?.textContent === '4,99');
  const mobileHeight = (await mobile.locator('.casino-rejuice').boundingBox()).height;
  await mobile.evaluate(() => { window.__casinoLoseResponse = true; });
  await mobile.locator('[data-rejuice]').click();
  await mobile.getByText('Não foi possível confirmar o Rejuice.',{exact:false}).waitFor();
  await mobile.locator('.casino-rejuice-notice').scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(400);
  assert.equal((await mobile.locator('.casino-rejuice').boundingBox()).height, mobileHeight);
  await mobile.screenshot({path:'test-results/rejuice-error.png'});
  await mobile.evaluate(() => { window.__casinoLoseResponse = false; });
  await mobile.locator('[data-rejuice]').click();
  await mobile.waitForFunction(() => document.querySelector('.casino-balance strong')?.textContent === '54,99');
  assert.match(await mobile.locator('.casino-rejuice-notice').innerText(),/Rejuice aprovado/);
  assert.equal((await mobile.locator('.casino-rejuice').boundingBox()).height, mobileHeight);
  const ledger = await mobile.evaluate(() => JSON.parse(sessionStorage.getItem('casino-fixture-wallet')));
  assert.equal(ledger.wallet.balance, 5499);
  assert.equal(ledger.wallet.recent.filter(e => e.kind === 'rejuice').length,1);
  assert.equal(await mobile.evaluate(() => window.__casinoCalls.length),3);
  for (const width of [1440, 768, 390, 320]) {
    await mobile.setViewportSize({ width, height: 1000 });
    await mobile.locator('[data-rejuice]').click();
    await mobile.locator('.casino-rejuice-notice').scrollIntoViewIfNeeded();
    await mobile.waitForTimeout(400);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await mobile.screenshot({path:`test-results/rejuice-success-${width}.png`});
  }
  assert.deepEqual(errors, []);
  console.log('Rejuice: local refusal, lost-response recovery, responsive layout and keyboard passed.');
  await low.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
