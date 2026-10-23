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
        .replace('export const callAdmin = async (name, data) => {', `export const callAdmin = async (name, data) => {
          if(name === "claimMission") {
            window.__claimCalls=(window.__claimCalls || 0)+1; window.__claimPayload=data;
            if(window.__claimGate) await window.__claimGate;
            if(window.__claimFail) throw Error("Pedido recusado. Tenta novamente.");
            return {data:{pending:!!window.__claimPending,reward:{boosts:{passing:1}}}};
          }`)
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
  await page.evaluate(async () => {
    const { missionList, bindMissionClaims } = await import('./js/missions.js');
    const ready = { id:'ready',eventId:'event-ready',type:'OBJECTIVE_MISSION',claimable:true,title:'Duas assistencias e uma recompensa merecida',description:'Ajuda a equipa.',done:2,total:2,rarity:'gold',icon:'missions',href:'#/event/event-ready',rewards:[{boosts:{passing:1}}],objectivePreview:{text:'Faz duas assistencias.'} };
    window.__originalMissions=[ready,{...ready,id:'competition',eventId:'competition',type:'COMPETITION_OBJECTIVE',claimable:false,title:'Competicao cumprida'},{...ready,id:'blocked',eventId:'blocked',claimable:false,title:'Cumprida sem resgate autorizado'},{...ready,id:'partial',eventId:'partial',done:1,claimable:false,title:'Missao ainda incompleta'},{id:'rating',type:'RATE_NEW_PLAYER',title:'Avaliar Joao',description:'Avalia o teu colega.',done:0,total:12,icon:'players',href:'#/missions/new/joao'},{...ready,id:'past',eventId:'event-past',claimable:false,completed:true,title:'A missao que ja concluiste'}];
    window.__missionContext={missions:structuredClone(window.__originalMissions),refresh:async()=>{ if(window.__refreshFail) throw Error('offline'); window.__missionContext.missions=structuredClone(window.__originalMissions); },go:()=>window.__drawMissions()};
    window.__drawMissions=()=>{
      document.querySelector('#main').innerHTML=`<div class="missions-workspace content-stack">${missionList(window.__missionContext.missions)}</div>`;
      bindMissionClaims(Object.create(window.__missionContext));
    };
    window.__drawMissions();
  });
  assert.equal(await page.locator('.is-achieved').count(),3);
  assert.equal(await page.locator('[data-completed-missions], [data-show-completed], .mission-ready-group').count(),0);
  assert.equal(await page.getByText('A missao que ja concluiste').count(),0);
  assert.equal(await page.locator('.is-achieved').filter({hasText:'Missao ainda incompleta'}).count(),0);
  assert.equal(await page.locator('a button').count(),0,'no nested interactive links');
  for (const theme of ['club','volt','champions','ultimate']) {
    await page.evaluate(async theme=>(await import('./js/themes.js')).applyTheme(theme),theme);
    for (const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${theme} ${width} overflow`);
      const size=await page.locator('[data-claim-mission]').boundingBox();
      assert.ok(size.height>=44);
      await page.screenshot({path:`test-results/mission-claim-${theme}-${width}.png`,fullPage:true});
    }
  }
  await page.evaluate(()=>{window.__claimGate=new Promise(resolve=>window.__releaseClaim=resolve);});
  const claim=page.locator('[data-claim-mission]');
  await claim.focus();
  assert.equal(await claim.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.__claimCalls===1);
  assert.equal(await claim.isDisabled(),true);
  await claim.evaluate(el=>el.onclick());
  assert.equal(await page.evaluate(()=>window.__claimCalls),1);
  assert.equal(await page.evaluate(()=>window.__claimPayload.eventId),'event-ready');
  await page.evaluate(()=>{window.__releaseClaim();window.__claimGate=null;});
  await page.waitForFunction(()=>!document.querySelector('[data-claim-mission]'));
  assert.equal(await page.evaluate(()=>window.__missionContext.missions.some(m=>m.id==='ready')),false);
  await page.evaluate(()=>{window.__missionContext.missions=structuredClone(window.__originalMissions);window.__claimFail=true;window.__drawMissions();});
  await page.locator('[data-claim-mission]').click();
  await page.locator('.mission-claim-error:not([hidden])').waitFor();
  assert.equal(await page.locator('[data-claim-mission]').isEnabled(),true);
  assert.equal(await page.evaluate(()=>window.__missionContext.missions.find(m=>m.id==='ready').completed),undefined);
  await page.evaluate(()=>{window.__claimFail=false;window.__claimPending=true;window.__refreshFail=true;});
  await page.locator('[data-claim-mission]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-claim-mission]'));
  assert.equal(await page.evaluate(()=>window.__missionContext.missions.some(m=>m.id==='ready')),false);
  assert.deepEqual(errors,[]);
  console.log('Mission completion: 4 themes, 4 widths, inline claim, duplicate click, keyboard, error/retry, stale cache and deferred reward passed; no production reads.');
} finally { await browser.close(); server.close(); }
