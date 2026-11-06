import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "./browser-sandbox.mjs";
import { SPECIAL_CARD_DESIGNS } from "../js/card-specials.js";
import { CATALOG_THEMES } from "../js/utils.js";
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
await new Promise((r) => server.listen(5188, "127.0.0.1", r));
const options = { headless: true };
if (process.platform === "win32") {
  const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
  if (existsSync(edge)) options.executablePath = edge;
  else options.channel = "msedge";
}
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
      body: readFileSync("tests/fixtures/db.js", "utf8").replace(
        "'../../js/utils.js'",
        "'./utils.js'",
      ),
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );

  await page.goto("http://127.0.0.1:5188/offline.html");
  await page.evaluate(async () => {
    document.head.innerHTML += '<link rel="stylesheet" href="/css/styles.css"><link rel="stylesheet" href="/css/cards.css"><link rel="stylesheet" href="/css/responsive.css"><link rel="stylesheet" href="/css/experience.css">';
    const players = Array.from({length:12}, (_,i)=>({uid:'p'+i,displayName:i===0?'Jogador com nome muito longo para verificar':'Jogador '+i,primaryPosition:'MED',hasCard:true,ovr:80-i,stats:{pace:80,shooting:70,passing:70,dribbling:80,defending:60,physical:70,goalkeeping:40,stamina:80}}));
    const game = {id:'pitch-test',title:'5v5',status:'open',teamSize:5,scheduledAt:new Date(),teamA:{starters:players.slice(0,5).map(p=>p.uid),bench:['p10']},teamB:{starters:players.slice(5,10).map(p=>p.uid),bench:['p11']},score:{teamA:0,teamB:0}};
    window.pitchCtx={user:{uid:'p0',role:'admin'},league:{games:[game],players},render:html=>document.body.innerHTML='<main style="max-width:1280px;margin:auto;padding:16px">'+html+'</main><div id="modal-root"></div><div id="toast-root"></div>',cleanup:()=>{}};
    await (await import('/js/games.js')).gamePage(window.pitchCtx,game.id);
  });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.five-player').count(),10);
  const slots = () => page.locator('[data-pitch-uid]').evaluateAll(els=>els.map(el=>el.dataset.pitchUid));
  const initial=await slots();
  await page.locator('.five-management > summary').click();
  await page.locator('[name="teamSize"]').selectOption('6');
  assert.equal(await page.locator('.five-pitch').count(),0);
  assert.equal(await page.locator('.team-builder .team-chip').count(),12);
  await page.locator('[name="teamSize"]').selectOption('5');
  assert.deepEqual(await slots(),initial);
  await page.locator('.five-management > summary').click();
  await page.locator('[data-remove="p3"]').click();
  const removed=await slots();
  initial.forEach((uid,i)=>assert.equal(removed[i],uid==='p3'?'p10':uid,'Only removed slot changes'));
  await page.locator('.five-management > summary').click();
  await page.locator('[data-remove="p10"]').click();
  await page.locator('.five-management > summary').click();
  await page.locator('.five-management [data-slot-team="teamA"]').first().click();
  await page.locator('[data-pick="p3"]').click();
  assert.deepEqual(await slots(),initial,'Replacement fills vacated slot');
  for (const [width,height] of [[1440,1000],[768,1024],[390,844],[320,568],[844,390],[667,375],[568,320]]) {
    await page.setViewportSize({width,height});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'page overflow '+width);
    const boxes=await page.locator('.five-position').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
    for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'card overlap '+width);}
    if(width<=1000) {
      assert.ok(await page.locator('.five-pitch-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'No pitch scroll '+width);
      assert.ok(await page.locator('.five-pitch').evaluate(el=>{const p=el.getBoundingClientRect();return [...el.querySelectorAll('.five-player')].every(c=>{const r=c.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1&&r.top>=p.top-1&&r.bottom<=p.bottom+1;});}),'All ten cards contained '+width);
      await page.locator('.five-player').first().click();
      assert.equal(await page.locator('.five-preview-modal .football-card').count(),1);
      assert.ok(await page.locator('.five-preview-modal a').isVisible());
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Modal overflow '+width);
      await page.keyboard.press('Escape');
      assert.ok(await page.locator('.five-player').first().evaluate(el=>el===document.activeElement));
      await page.locator('.five-player').first().evaluate(el=>el.blur());
      await page.locator('.five-match').screenshot({path:'test-results/five-a-side-mobile-'+width+'x'+height+'.png'});
    }
    await page.screenshot({path:'test-results/five-a-side-'+width+'.png',fullPage:true});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.five-player').first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.five-preview-modal').count(),1);
  await page.keyboard.press('Escape');
  await page.evaluate(async()=>{window.pitchCtx.league.games[0].status='draft';await (await import('/js/games.js')).gamePage(window.pitchCtx,'pitch-test');});
  assert.equal(await page.locator('.five-pitch').count(),0,'No pitch during draft');
  await page.evaluate(async()=>{window.pitchCtx.league.games[0].status='open';await (await import('/js/games.js')).gamePage(window.pitchCtx,'pitch-test');});
  assert.deepEqual(await slots(),initial,'Stable placement when reopening');
  assert.deepEqual(errors,[]);
  console.log('5v5: ten cards, stable slots, other formats, responsive layout and keyboard passed.');
} finally { await browser.close(); await new Promise(r=>server.close(r)); }
