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
  await context.addInitScript(() => sessionStorage.setItem("casino-fixture-wallet", JSON.stringify({ wallet: { edition: "official-2026-10-27-reset-200", sessionProtocol: 5, balance: 250000, vaultBalance: 60000, revision: 1, recent: [] }, sessions: {} })));
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(15000);
  const base = `http://127.0.0.1:${server.address().port}`;
  await page.goto(`${base}/#/casino`);
  await page.waitForFunction(
    () =>
      document.querySelector(".casino-balance strong")?.textContent.replace(/\s/g, "") === "2500",
  );


  await page.locator('[data-casino-store]').click();
  await page.locator('[data-store-buy="bronze-foundry"]').waitFor();
  assert.equal(await page.locator('.casino-store-item').count(),17);
  for (const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await page.screenshot({path:`test-results/casino-store-${width}.png`});
    await page.locator('.casino-store-item').first().screenshot({path:`test-results/casino-store-item-${width}.png`});
  }
  for (const theme of ['volt', 'champions', 'ultimate', 'club']) {
    await page.evaluate(async theme => (await import('./js/themes.js')).applyTheme(theme), theme);
    await page.screenshot({path:`test-results/casino-store-${theme}.png`});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-store-buy="bronze-foundry"]').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('[data-store-buy="bronze-foundry"]').evaluate(el => el.matches(':focus-visible')),true);
  await page.locator('[data-store-buy="osmium-apex"]').click();
  await page.locator('.casino-store-feedback[data-state="error"]').waitFor();
  await page.evaluate(() => window.__casinoLoseResponse = true);
  await page.locator('[data-store-buy="bronze-foundry"]').click();
  await page.waitForFunction(() => document.querySelector('.casino-store-feedback')?.textContent.includes('pendente'));
  await page.evaluate(() => window.__casinoLoseResponse = false);
  await page.locator('[data-store-buy="bronze-foundry"]').click();
  await page.locator('.casino-store-feedback[data-state="success"]').waitFor();
  const wallet = await page.evaluate(() => JSON.parse(sessionStorage.getItem('casino-fixture-wallet')).wallet);
  assert.equal(wallet.balance,210000);
  assert.equal(wallet.vaultBalance,0);
  assert.deepEqual(wallet.shopOwned,['bronze-foundry']);
  assert.equal(await page.locator('[data-store-buy="bronze-foundry"]').isDisabled(),true);
  await page.locator('[data-store-filter="owned"]').click();
  assert.equal(await page.locator('.casino-store-item').count(),1);
  await page.screenshot({path:'test-results/casino-store-owned.png'});
  await page.locator('[data-store-back]').click();
  assert.equal(await page.locator('[data-casino-store]').isVisible(),true);
  // Render a purchased edition through the normal card component.
  await page.evaluate(async () => {
    const { card } = await import('./js/cards.js');
    document.querySelector('.casino-salon').innerHTML = card({ uid:'pedro',displayName:'Pedro da Conceicao',ovr:80,primaryPosition:'MC',selectedCardId:'casino-shop-bronze-foundry',specials:[{id:'casino-shop-bronze-foundry'}],stats:{pace:80,shooting:79,passing:81,dribbling:82,defending:70,physical:76,stamina:85,goalkeeping:40} },{preview:true});
  });
  await page.screenshot({path:'test-results/casino-store-equipped.png'});
  assert.equal(await page.locator('.card-shop .sca-stats > span').count(),8);
  assert.deepEqual(errors,[]);
  console.log('Real store: catalogue, four widths, OVR refusal, lost reply, combined payment, ownership and equipped rendering passed.');
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
