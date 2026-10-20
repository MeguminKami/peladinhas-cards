import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "./browser-sandbox.mjs";
const root = resolve(".");
const server = createServer((req, res) => {
  const path = resolve(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "") || "index.html");
  if (!path.startsWith(root) || !existsSync(path)) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", ({".js":"text/javascript", ".css":"text/css", ".html":"text/html", ".svg":"image/svg+xml", ".webp":"image/webp"})[extname(path)] || "application/octet-stream");
  res.end(readFileSync(path));
});
await new Promise(resolve => server.listen(5226, "127.0.0.1", resolve));
const browser = await chromium.launch({headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {})});
mkdirSync("test-results", {recursive:true});
try {
  const context = await browser.newContext({viewport:{width:1440,height:1000}, serviceWorkers:"block"});
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await context.clock.install({time:new Date("2026-10-16T12:00:00Z")});
  await context.route("**/js/firebase.js", r => r.fulfill({contentType:"text/javascript",body:"export const configured=true;"}));
  await context.route("**/js/db.js", r => r.fulfill({contentType:"text/javascript",body:readFileSync("tests/fixtures/db.js","utf8").replace("'../../js/utils.js'", "'./utils.js'")}));
  await context.route("**/js/auth.js", r => r.fulfill({contentType:"text/javascript",body:readFileSync("tests/fixtures/auth.js","utf8")}));
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("http://127.0.0.1:5226");
  await page.getByRole("heading", {name:"No topo da liga"}).waitFor();
  const navigate = async hash => {
    await page.evaluate(value => location.hash = value, hash);
    await page.waitForTimeout(250);
    await page.locator("#main h1").first().waitFor();
  };
  await page.evaluate(async()=>{
    const {ATTRIBUTES}=await import("./js/utils.js");
    const {cardWeek}=await import("./js/card-week.js");
    const state=window.__testState,date=new Date(+cardWeek().opensAt+60000).toISOString();
    const a={overall:5,attack:1,passing:1,defense:1,physical:1,attitude:1,goalkeeping:5,count:3};
    const b={overall:4,attack:4,passing:4,defense:4,physical:4,attitude:4,goalkeeping:0,count:3};
    state.initialRatings=state.users.map(user=>({uid:user.uid,ratings20:Object.fromEntries(ATTRIBUTES.map(([key])=>[key,16])),completed:true}));
    state.games=[{id:"consistent-rating",title:"Jogo de avaliação",status:"closed",closedAt:date,scheduledAt:date,teamA:{starters:["pedro"],bench:[]},teamB:{starters:["joao"],bench:[]},score:{teamA:1,teamB:1}}];
    state.gameSummaries=[{id:"consistent-rating",players:{pedro:a,joao:b}}];
    state.feedback=[{raterId:"pedro",targetId:"pedro",ratings:a,submitted:true},{raterId:"joao",targetId:"joao",ratings:b,submitted:true}];
    const auth=await import("./js/auth.js");await auth.logout();await auth.login();
  });
  await navigate("#/ranking");
  await page.waitForFunction(()=>document.querySelectorAll(".ranking-row").length===2);
  assert.equal(await page.locator(".ranking-row").first().getAttribute("href"),"#/player/joao");
  assert.equal(await page.locator(".ranking-row").first().locator(".match-rating-number").textContent(),"4,00");
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    for(const path of ["#/ranking","#/statistics","#/player/pedro","#/admin/ratings/pedro"]) {
      await navigate(path);
      if(path==="#/statistics") {
        if(await page.locator("#statistics-sort").isVisible()) await page.locator("#statistics-sort").selectOption("form"); else await page.locator('[data-stat-sort="form"]').click();
        assert.equal(await page.locator(".statistics-table tbody tr").first().locator(".stat-name a").getAttribute("href"),"#/player/joao");
        assert.equal(await page.locator(".statistics-table tbody tr").first().locator(".stat-form .match-rating-number").textContent(),"4,00");
      }
      if(path==="#/player/pedro") {
        assert.equal(await page.locator(".form-score .match-rating-number").textContent(),"1,7");
        assert.equal(await page.locator(".form-score .match-rating-with-gk").textContent(),"(2,1 com GR)");
      }
      if(path==="#/admin/ratings/pedro") {
        const row=page.locator(".ratings-table tbody tr").filter({hasText:"Pós-jogo"}).first();
        assert.equal(await row.locator(".match-rating-number").textContent(),"1,7");
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,path+"/"+width);
      await page.screenshot({path:`test-results/rating-consistency-${path.split("/")[1]}-${width}.png`,fullPage:true});
    }
  }
  await navigate("#/");
  if(await page.locator("[data-push-later]").isVisible()) await page.locator("[data-push-later]").click();
  await page.locator('[data-podium-mode="performance"]').click();
  assert.equal(await page.locator(".podium-results .place-1 .football-card").getAttribute("href"),"#/player/joao");
  assert.equal(await page.locator(".podium-results .place-1 .match-rating-number").textContent(),"4,00");
  assert.deepEqual(errors,[]);
  console.log("Rating consistency: ranking order, statistics, profile, admin and podium use component means; 1440/768/390/320px passed.");
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
