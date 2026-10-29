import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "./browser-sandbox.mjs";

const root = resolve(".");
const server = createServer((req, res) => {
  const path = resolve(
    root,
    "." + new URL(req.url, "http://localhost").pathname,
  );
  const file = path === root ? resolve(root, "index.html") : path;
  if (!file.startsWith(root + sep) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".css": "text/css",
      ".html": "text/html",
      ".svg": "image/svg+xml",
    }[extname(file)] || "application/octet-stream",
  );
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
let browser;
const output = "test-results/event-admin-cards";
mkdirSync(output, { recursive: true });
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  await context.clock.install({ time: new Date("2026-10-16T12:00:00Z") });
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
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(() => {
    location.hash = "#/admin/events";
  });
  await page.locator("#new-event").waitFor();
  const field=name=>page.locator(`#event-builder-form [name="${name}"]`);
  const step=index=>page.locator(`[data-editor-step="${index}"]`).click();
  await page.evaluate(async()=>{
    window.__testState.events=["open","draft","scheduled","review","closed","cancelled"].map((status,i)=>({
      id:`compact-${i}`,schemaVersion:2,kind:"mission",method:"objective",status,
      title:i===0?"Carregas ou és carregado":"Missão com um nome mais comprido para conferir a leitura",
      description:"Soma golos em equipa para ganhares pontos de finalização e de jogo de equipa. Os detalhes completos ficam disponíveis na consulta do desafio.",
      rarity:["gold","silver","bronze","elite","icon","ultimate"][i],
      startsAt:"2026-10-15",endsAt:"2026-12-01",indefinite:i===0,
      objective:{metric:"goals",target:3},participantIds:["pedro"],
      positions:[{mode:"card",specialId:"mvp",boosts:{shooting:2},statDuration:"permanent"}],cadence:"once",maxRepeats:1,
    }));
    const {mountEventAdmin}=await import("/js/event-admin.js");
    const state=window.__testState;
    await mountEventAdmin({user:state.users.find(u=>u.uid==="pedro"),league:{users:state.users,players:state.users,games:state.games},refresh:async()=>{}},document.querySelector("#main"),"mission");
  });
  assert.equal(await page.locator(".event-admin-card").count(),6);
  assert.match(await page.locator(".event-admin-rewards").first().innerText(), /Por conclusão/);
  assert.match(await page.locator(".event-admin-rewards").first().innerText(), /\+2 Finalização \(Permanente\)/);
  assert.match(await page.locator(".event-admin-rewards").first().innerText(), /Carta .*\(Semanal\)/);
  assert.equal(await page.locator('[data-action="open"]').getAttribute("aria-label"),"Publicar");
  assert.equal(await page.locator('[data-action="delete"]').getAttribute("aria-label"),"Apagar");
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    for(const theme of ["club","volt","champions","ultimate"]) {
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      await page.emulateMedia({reducedMotion:"reduce"});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const dimensions=await page.locator(".event-admin-card").first().evaluate(el=>({height:el.getBoundingClientRect().height,children:[...el.children].map(child=>({name:child.className,height:child.getBoundingClientRect().height}))}));
      assert.ok(dimensions.height<500,JSON.stringify({width,theme,...dimensions}));
      const issues=await page.locator(".event-card-action").evaluateAll(els=>els.filter(el=>{
        const box=el.getBoundingClientRect();return box.width<44 || box.height<44 || !el.getAttribute("aria-label");
      }).length);
      assert.equal(issues,0);
    }
    await page.evaluate(()=>document.documentElement.dataset.theme="club");
    await page.locator(".event-admin-card").first().screenshot({path:`${output}/card-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:1000});
  const edit=page.locator('[data-edit="compact-0"]');
  await edit.focus();
  assert.equal(await edit.evaluate(el=>getComputedStyle(el).outlineStyle),"solid");
  assert.equal(await edit.evaluate(el=>getComputedStyle(el,"::after").opacity),"1");
  await page.keyboard.press("Enter");
  await page.locator("#event-builder-form").waitFor();
  assert.equal(await field("title").inputValue(),"Carregas ou és carregado");
  await page.locator("#close-editor").click();
  await page.emulateMedia({reducedMotion:"no-preference"});
  const button=page.locator('.event-card-action').first();
  await button.scrollIntoViewIfNeeded();
  const before=await page.locator(".event-admin-card").first().boundingBox();
  await button.hover();await page.waitForTimeout(220);
  const after=await page.locator(".event-admin-card").first().boundingBox();
  assert.equal(before.width,after.width);assert.equal(before.height,after.height);
  await page.evaluate(async () => {
    const state = window.__testState;
    state.events = [{ ...state.events[0], kind: "event", positions: [
      { boosts: { pace: 3 }, statDuration: "monthly" },
      { specialId: "mvp" },
    ] }];
    const { mountEventAdmin } = await import("/js/event-admin.js");
    await mountEventAdmin({ user: state.users.find(u => u.uid === "pedro"), league: { users: state.users, players: state.users, games: state.games }, refresh: async () => {} }, document.querySelector("#main"));
  });
  const eventRewards = await page.locator(".event-admin-rewards").innerText();
  assert.match(eventRewards, /1.* lugar/);
  assert.match(eventRewards, /2.* lugar/);
  assert.match(eventRewards, /\+3 Velocidade \(Mensal\)/);
  assert.deepEqual(errors,[]);
  console.log("Compact admin cards: six states, accessible actions, keyboard/edit, stable hover, reduced motion, four themes and four widths passed.");
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
