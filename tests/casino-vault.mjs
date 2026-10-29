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
    const key='slot-local-v1:player:pedro%3Aofficial-2026-10-26-cardoso-reset';
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


  await page.locator('[data-wallet-vault]').click();
  assert.equal(await page.evaluate(() => window.__casinoCalls.length), 1);
  await page.locator('#vault-amount').fill('25,50');
  await page.evaluate(() => { window.__casinoLoseResponse = true; });
  await page.locator('.casino-vault-form button').click();
  await page.waitForFunction(() => !document.querySelector('.casino-vault-form button').disabled);
  await page.evaluate(() => { window.__casinoLoseResponse = false; });
  await page.locator('.casino-vault-form button').click();
  await page.waitForFunction(() => document.querySelector('.casino-balance strong')?.textContent === '74,5');
  assert.match(await page.locator('[data-vault-balance]').innerText(), /25,5/);
  assert.match(await page.locator('[data-vault-total]').innerText(), /100/);
  const ledger = await page.evaluate(() => JSON.parse(sessionStorage.getItem('casino-fixture-wallet')));
  assert.equal(ledger.wallet.vaultBalance, 2550);
  assert.equal(ledger.wallet.balance, 7450);
  assert.equal(await page.evaluate(() => window.__casinoCalls.length), 3);
  await page.locator('#vault-amount').fill('999');
  await page.locator('.casino-vault-form button').click();
  assert.equal(await page.evaluate(() => window.__casinoCalls.length), 3);
  for (const theme of ['club', 'volt', 'champions', 'ultimate']) {
    await page.evaluate(async theme => (await import('./js/themes.js')).applyTheme(theme), theme);
    for (const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:1100});
      await page.evaluate(() => scrollTo(0,0));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({path:`test-results/vault-${theme}-${width}.png`});
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#vault-amount').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.casino-vault-form button').evaluate(el => el.matches(':focus-visible')),true);
  await page.goto(`${base}/assets/casino/shop/index.html`);
  await page.locator('.shop-test summary').click();
  await page.locator('[name="balance"]').fill('400');
  await page.locator('[name="vaultBalance"]').fill('600');
  await page.locator('#shop-fixtures button').click();
  assert.match(await page.locator('#shop-funds-detail').innerText(), /400.*600/);
  await page.locator('[data-buy="bronze-foundry"]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('peladinhas:casino:shop-demo:v1')).owned.includes('bronze-foundry'));
  const purchase = await page.evaluate(() => JSON.parse(localStorage.getItem('peladinhas:casino:shop-demo:v1')));
  assert.equal(purchase.balance, 0);
  assert.equal(purchase.vaultBalance, 0);
  assert.deepEqual(errors, []);
  console.log('Vault: deposit, lost response, local validation, themes, responsive layout and keyboard passed.');
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
