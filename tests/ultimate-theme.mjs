import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "./browser-sandbox.mjs";
const root = resolve(".");
const server = createServer((req, res) => {
  const path = resolve(
    root,
    decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "") ||
      "index.html",
  );
  if (!path.startsWith(root) || !existsSync(path)) {
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
      ".webp": "image/webp",
    }[extname(path)] || "text/plain",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const options = { headless: true };
if (process.platform === "win32") options.channel = "msedge";
const browser = await chromium.launch(options);
mkdirSync("test-results", { recursive: true });
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      hasTouch: false,
      serviceWorkers: "block",
    }),
    page = await context.newPage(),
    errors = [];
  await context.clock.install({ time: new Date("2026-10-16T12:00:00Z") });
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/db.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/db.js", "utf8")
        .replace("'../../js/utils.js'", "'./utils.js'")
        .replace(
          "export const users = async () => {",
          `export const users = async () => {
          window.__userReads = (window.__userReads || 0) + 1;
          if (window.__dataGate) await window.__dataGate;`,
        )
        .replace(
          "export const callAdmin = async (name, data) => {",
          `export const callAdmin = async (name, data) => {
          if (name === "ensureHistory") {
            window.__historyCalls = (window.__historyCalls || 0) + 1;
            if (window.__maintenanceGate) await window.__maintenanceGate;
          }`,
        ),
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole("heading", { name: "No topo da liga" }).waitFor();
  await page.evaluate(async () => (await import('./js/themes.js')).applyTheme('ultimate'));
  const overflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page overflow');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await overflow();
    await page.screenshot({ path: `test-results/ultimate-home-${width}.png`, fullPage: true });
  }
  await page.evaluate(() => { location.hash = '#/missions'; });
  await page.waitForFunction(() => document.querySelector('.path-mission-spotlight'));
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await overflow();
    await page.screenshot({ path: `test-results/ultimate-missions-${width}.png`, fullPage: true });
  }
  await page.evaluate(async () => {
    const { pathMissionSpotlight } = await import('./js/paths.js');
    document.querySelector('.path-mission-spotlight').outerHTML = pathMissionSpotlight({
      href:'#/missions/path', done:0, mission:{
        routeLabel:'Visão de jogo', nodeNumber:1, nodeLabel:'Primeiro toque', nodeId:'vision-0-0',
        offer:{ rarity:'gold', advance:100, objective:{kind:'assists',target:2} },
        counts:{}, rated:false, boosts:{vision:1},
      }, stateText:'Escolha bloqueada · Missão associada a um jogo', stateIcon:'lock',
    });
  });
  for (const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    await overflow();
    await page.screenshot({path:`test-results/ultimate-chosen-${width}.png`,fullPage:true});
  }
  await page.evaluate(() => { location.hash = '#/statistics'; });
  await page.waitForFunction(() => document.querySelector('.stats-workspace'));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await overflow();
    await page.screenshot({ path: `test-results/ultimate-statistics-${width}.png`, fullPage: true });
  }
  await page.evaluate(async () => {
    const { rarityBadge, EVENT_RARITIES } = await import('./js/event-rarity.js');
    document.querySelector('#main').innerHTML = `<div class="page-head"><div><p class="eyebrow">Ultimate 20</p><h1>Cor com contraste</h1><p>Miss\u00f5es, avalia\u00e7\u00f5es e estados da interface.</p></div></div><div id="theme-gallery" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:20px">${Object.keys(EVENT_RARITIES).map(rarity => `<section class="panel event-rarity-surface" data-rarity="${rarity}">${rarityBadge({ rarity })}<h2 style="margin-top:16px">No pr\u00f3ximo jogo</h2><p>Marca dois golos e ajuda a tua equipa a vencer.</p><div class="progress"><span style="width:64%"></span></div><p style="margin-top:12px">64% conclu\u00eddo</p></section>`).join('')}<section class="panel"><h2>Avalia\u00e7\u00f5es</h2><p class="feedback-self-notice">A tua autoavalia\u00e7\u00e3o</p><div class="feedback-scale"><b>4,6 \u2605</b></div><p class="success">Objetivo conclu\u00eddo</p><p class="error">Se falhares: este n\u00f3 recome\u00e7a em 0%.</p><p class="muted">Podes mudar at\u00e9 \u00e0 abertura do jogo.</p></section><section class="panel"><h2>A\u00e7\u00f5es</h2><div class="actions"><button class="btn btn-primary">Escolher miss\u00e3o</button><button class="btn btn-secondary">Ver percurso</button><button class="btn btn-success">Conclu\u00eddo</button></div><label>Pesquisar<input placeholder="Nome do jogador"></label></section></div>`;
  });
  const contrast = await page.evaluate(() => {
    const luminance = rgb => rgb.map(n => { n /= 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((sum, n, i) => sum + n * [.2126,.7152,.0722][i], 0);
    const rgb = value => value.match(/[\d.]+/g).slice(0,3).map(Number);
    const results = [];
    for (const element of document.querySelectorAll('.page-head p, #theme-gallery .event-rarity-badge, #theme-gallery p, #theme-gallery .feedback-scale b, #theme-gallery .btn')) {
      const style = getComputedStyle(element);
      let background = style.backgroundColor;
      for (let parent = element.parentElement; background === 'rgba(0, 0, 0, 0)' && parent; parent = parent.parentElement) background = getComputedStyle(parent).backgroundColor;
      const [a,b] = [luminance(rgb(style.color)), luminance(rgb(background))].sort((x,y) => y-x);
      results.push({ text: element.textContent.trim(), foreground:style.color, background, ratio: (a + .05)/(b + .05) });
    }
    return results;
  });
  for (const item of contrast) assert.ok(item.ratio >= 4.5, JSON.stringify(item));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await overflow();
    await page.screenshot({ path: `test-results/ultimate-palette-${width}.png`, fullPage: true });
  }
  await page.locator('.btn-primary').focus();
  assert.equal(await page.locator('.btn-primary').evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Ver percurso');
  const ultimateColour = await page.locator('[data-rarity="gold"] .event-rarity-badge').evaluate(el => getComputedStyle(el).color);
  for (const theme of ['club', 'volt', 'champions']) {
    await page.evaluate(async theme => (await import('./js/themes.js')).applyTheme(theme), theme);
    const colour = await page.locator('[data-rarity="gold"] .event-rarity-badge').evaluate(el => getComputedStyle(el).color);
    assert.notEqual(colour, ultimateColour);
    assert.equal(colour, 'rgb(237, 203, 116)', `${theme} keeps its original gold`);
  }
  await page.evaluate(async () => (await import('./js/themes.js')).applyTheme('ultimate'));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.stats-workspace'));
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'ultimate');
  assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'), '#949a9e');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ widths:[1440,768,390,320], contrastChecks:contrast.length, minimumContrast:Math.min(...contrast.map(row => row.ratio)), screenshots:19, keyboard:true, productionReads:0 }));
} finally { await browser.close(); server.close(); }
