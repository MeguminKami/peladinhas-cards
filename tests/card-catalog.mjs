import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium, webkit } from "./browser-sandbox.mjs";
import { seedDocumentation } from "../scripts/documentation-fixtures.mjs";
const root = resolve(".");
const server = createServer((req, res) => {
  const file = resolve(
    root,
    "." + new URL(req.url, "http://localhost").pathname,
  );
  const path = file === root ? resolve(root, "index.html") : file;
  if (!path.startsWith(root + sep) || !existsSync(path)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".css": "text/css",
      ".html": "text/html",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".woff": "font/woff",
    }[extname(path)] || "application/octet-stream",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const isWebKit = process.argv.includes("--webkit");
const browser = await (isWebKit ? webkit : chromium).launch({
  headless: true,
  ...(!isWebKit && process.platform === "win32" ? { channel: "msedge" } : {}),
});
const output = `test-results/card-catalog${isWebKit ? "-webkit" : ""}`;
mkdirSync(output, { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
    hasTouch: true,
  });
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/db.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/db.js", "utf8").replaceAll(
        "../../js/utils.js",
        "./utils.js",
      ),
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  await context.route(/https:\/\//, (r) => r.abort());
  await context.route("**/js/app.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body:
        readFileSync("js/app.js", "utf8") +
        "\nwindow.__feedbackTestContext=ctx;",
    }),
  );
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.clock.install({ time: new Date("2026-10-23T12:00:00Z") });
  await page.goto(url);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(seedDocumentation);

  await page.evaluate(() => {
    window.__testState.cardCollections = [{uid:'pedro',awards:[{id:'mvp',earnedAt:'2025-01-01',expiresAt:'2025-01-08'}]},{uid:'ana',awards:[{id:'mvp',earnedAt:'2025-02-01',expiresAt:'2025-02-08'}]}];
    window.__testState.users.find(u=>u.uid==='ana').displayName='Ana Maria dos Santos e Silva';
  });
  await page.evaluate(async()=>{await window.__feedbackTestContext.refresh();location.hash='#/players';});
  await page.locator('.desktop-nav').getByRole('link',{name:'Cartas',exact:true}).click();
  await page.locator('.card-catalog').waitFor();
  assert.equal(await page.locator('.page-head h1').innerText(),'Cartas vistas');
  assert.equal(await page.locator('#theme-picker + #header-tickets').count(),1);
  assert.equal(await page.locator('.desktop-nav a').allTextContents().then(items=>items.join('|').includes('Cartas')),true);
  const mvp=page.getByRole('button',{name:'Ver Melhor em campo, requisitos e detentores',exact:true});
  assert.equal(await mvp.count(),1);
  for(const theme of ['club','volt','champions','ultimate']) {
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    for(const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:844});
      await page.evaluate(()=>scrollTo(0,0));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${theme} ${width}`);
      if(width<=768){
        const nav=await page.locator('.bottom-nav > *').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,width:r.width};}));
        assert.equal(nav.length,6);assert.ok(nav.every(r=>Math.abs(r.top-nav[0].top)<2 && r.width>=44));
        assert.equal(await page.locator('.bottom-nav a.active').innerText(),'Cartas');
      }
      const offsets=await page.locator('.catalog-entry').evaluateAll(es=>es.map(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('.football-card,.catalog-mystery').getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2)}));
      assert.ok(offsets.every(x=>x<2),'centered cards');
      if(theme==='club')await page.screenshot({path:`${output}/catalog-${width}.png`,fullPage:true});
      await mvp.focus();await page.keyboard.press('Enter');await page.locator('.catalog-modal').waitFor();
      assert.equal(await page.locator('.catalog-holders li').count(),2);
      assert.match(await page.locator('.catalog-requirements').innerText(),/4,5/);
      assert.equal(await page.locator('.catalog-modal').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
      if(theme==='club')await page.screenshot({path:`${output}/detail-${width}.png`});
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.locator('.catalog-modal').evaluate(e=>e.contains(document.activeElement)),true);
      await page.keyboard.press('Escape');assert.equal(await mvp.evaluate(e=>e===document.activeElement),true);
    }
  }
  await page.getByRole('button',{name:/^Por descobrir/}).click();assert.equal(await page.locator('[data-catalog-state=seen]:visible').count(),0);
  await page.getByRole('button',{name:/^Vistas/}).click();assert.equal(await page.locator('[data-catalog-state=unknown]:visible').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});await mvp.click();await page.getByRole('button',{name:'Fechar',exact:true}).click();
  await page.getByRole('link',{name:'Jogadores',exact:true}).filter({has:page.locator('svg')}).last().click();
  await page.evaluate(async()=>{
    const {cardCatalogPage}=await import('/js/card-catalog.js');
    window.__catalogPage=cardCatalogPage;
    cardCatalogPage({league:{},render:html=>document.querySelector('#main').innerHTML=html});
  });
  await page.getByRole('button',{name:/^Vistas/}).click();
  assert.equal(await page.locator('.catalog-filter-empty:visible').count(),1);
  await page.evaluate(()=>window.__catalogPage({league:null,render:html=>document.querySelector('#main').innerHTML=html}));
  assert.equal(await page.locator('.catalog-loading[role=status]').count(),1);
  await page.evaluate(()=>window.__catalogPage({league:{get players(){throw Error('fixture error')}},render:html=>document.querySelector('#main').innerHTML=html}));
  assert.equal(await page.locator('#retry-catalog').count(),1);
  assert.deepEqual(errors,[]);
  console.log('Catalog: history, filters, holders, focus, modal, themes and responsive layouts passed.');
} finally {await browser.close();await new Promise(r=>server.close(r));}
