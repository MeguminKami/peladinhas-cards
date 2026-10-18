import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root = resolve(".");
const server = createServer((req, res) => {
  const path = resolve(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "") || "index.html");
  if (!path.startsWith(root) || !existsSync(path)) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", ({".js":"text/javascript", ".css":"text/css", ".html":"text/html", ".svg":"image/svg+xml", ".webp":"image/webp"})[extname(path)] || "application/octet-stream");
  res.end(readFileSync(path));
});
await new Promise(resolve => server.listen(5217, "127.0.0.1", resolve));
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
  await page.goto("http://127.0.0.1:5217");
  await page.getByRole("heading", {name:"No topo da liga"}).waitFor();
  const navigate = async hash => {
    await page.evaluate(value => location.hash = value, hash);
    await page.waitForTimeout(250);
    await page.locator("#main h1").first().waitFor();
  };
  for (const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    for (const hash of ["#/admin", "#/admin/players", "#/admin/cards", "#/admin/initial/pedro", "#/admin/player/pedro/edit", "#/admin/ovr/pedro", "#/admin/ratings/pedro", "#/admin/events"]) {
      await navigate(hash);
      assert.equal(await page.locator(".admin-area-nav").count(),1,hash);
      assert.equal(await page.locator(".admin-mobile-select").count(),1,hash);
      assert.ok(await page.locator(width<=800 ? ".admin-mobile-select" : ".admin-area-nav").isVisible(),hash);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,hash);
      if(hash === "#/admin") assert.equal(await page.getByText("Fecho: quarta",{exact:false}).count(),0);
      if(hash === "#/admin/players") {
        assert.ok(await page.locator(".admin-player-actions").first().evaluate(row => {
          const tops=[...row.children].map(node=>node.getBoundingClientRect().top);
          return Math.max(...tops)-Math.min(...tops)<1 && [...row.children].every(node=>node.getAttribute("aria-label") && node.querySelector("svg"));
        }));
        await page.screenshot({path:`test-results/admin-actions-${width}.png`,fullPage:true});
        const edit = page.locator(".admin-player-actions").first().getByRole("link", {name:"Editar jogador", exact:true});
        await page.mouse.move(0, 0);
        await edit.evaluate(node => node.blur());
        const collapsedWidth = await edit.evaluate(node => node.getBoundingClientRect().width);
        await edit.hover();
        await page.waitForTimeout(220);
        assert.equal(await edit.locator(".admin-action-caption").evaluate(node => getComputedStyle(node).opacity), "1");
        assert.ok(await edit.evaluate((node, width) => node.getBoundingClientRect().width > width, collapsedWidth));
        assert.ok(await page.locator(".admin-player-actions").first().evaluate(row => [...row.children].every(node => getComputedStyle(node).borderTopWidth === "1px" && getComputedStyle(node).borderTopStyle === "solid")));
        await page.screenshot({path:`test-results/admin-caption-${width}.png`,fullPage:true});
        await page.mouse.move(0, 0);
        await edit.focus();
        assert.equal(await edit.locator(".admin-action-caption").evaluate(node => getComputedStyle(node).opacity), "1");
        await edit.evaluate(node => node.blur());

      }
      if(hash === "#/admin/cards") await page.screenshot({path:`test-results/admin-menu-lab-${width}.png`,fullPage:true});
    }
    await navigate("#/missions");
    await page.evaluate(async()=>{
      const {missionList}=await import("./js/missions.js");
      const {missionObjectivePreview}=await import("./js/mission-objective-preview.js");
      const base={type:"OBJECTIVE_MISSION",description:"LONG_RULES",eventDescription:"LONG_DESCRIPTION",rarity:"rare",done:0,total:1,href:"#/event/test-mission",icon:"ratingGames"};
      const preview=objective=>missionObjectivePreview({objective});
      const stars={metric:"ratingGames",target:1,threshold:4,comparison:"gte",combine:"all",attributes:["overall","attack","passing","defense","physical","attitude"]};
      document.querySelector("#main").innerHTML=missionList([
        {...base,title:"Quatro estrelas",objectivePreview:preview(stars)},
        {...base,title:"Diabugoleador",type:"COMPETITION_OBJECTIVE",objectivePreview:preview({metric:"goals",target:14})},
        {...base,title:"Regularidade",objectivePreview:preview({...stars,metric:"ratingAverage",combine:"mean",comparison:"gt",threshold:4.5,target:3})},
      ]);
    });
    assert.equal(await page.getByText("LONG_RULES",{exact:false}).count(),0);
    assert.equal(await page.getByText("LONG_DESCRIPTION",{exact:false}).count(),0);
    assert.equal(await page.locator(".mission").first().getAttribute("href"),"#/event/test-mission");
    await page.getByText("Marca 14 golos.",{exact:true}).waitFor();
    await page.getByText("6 critérios · mínimo em cada um",{exact:true}).waitFor();
    await page.getByText("Média superior a 4,5 ★ nos últimos 3 jogos.",{exact:false}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:`test-results/mission-simple-${width}.png`,fullPage:true});
  }
  await page.evaluate(async () => {
    const state = window.__testState;
    const base = { schemaVersion:2,kind:"mission",method:"objective",status:"open",title:"Recompensa",startsAt:"2026-10-01T00:00:00Z",endsAt:"2026-12-01T00:00:00Z",participantIds:["pedro"],maxRepeats:1,cadence:"once",objective:{metric:"games",target:1},progress:[{uid:"pedro",progress:1,eligible:true}] };
    state.events = [
      {...base,id:"ready-a"}, {...base,id:"ready-b"},
      {...base,id:"pending",progress:[{uid:"pedro",progress:1,eligible:false}]},
      {...base,id:"claimed",claimedPeriods:["once"]},
      {...base,id:"closed",status:"closed"},
      {...base,id:"expired",endsAt:"2026-10-02T00:00:00Z"},
      {...base,id:"locked",prerequisites:{missionIds:["missing"],mode:"all"}},
      {...base,id:"competition",kind:"event"},
    ];
    const {refreshMissionsForCurrentUser}=await import("./js/missions.js");
    const missions=await refreshMissionsForCurrentUser(state.users.find(user=>user.uid==="pedro"),{players:state.users,users:state.users,games:[],events:state.events});
    window.__readyIds=missions.filter(mission=>mission.claimable).map(mission=>mission.id);
  });
  assert.deepEqual(await page.evaluate(()=>window.__readyIds),["event-ready-a","event-ready-b"]);
  await context.clock.fastForward(31000);
  await navigate("#/missions/self");
  await page.locator(".desktop-nav .mission-ready-badge").waitFor({state:"attached"});
  for (const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    const badge=page.locator(width>800 ? ".desktop-nav .mission-ready-badge" : ".bottom-nav .mission-ready-badge");
    await badge.waitFor({state:"visible"});
    assert.equal(await badge.innerText(),"2");
    assert.equal(await badge.locator("svg").count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:`test-results/mission-ready-${width}.png`,fullPage:true});
  }
  await page.evaluate(()=>window.__testState.events.forEach(event=>event.claimedPeriods=["once"]));
  await context.clock.fastForward(31000);
  await navigate("#/missions");
  await page.waitForFunction(()=>document.querySelectorAll(".mission-ready-badge").length===0);
  assert.deepEqual(errors,[]);
  console.log("Admin e missoes: menu em todas as subpaginas, accoes numa linha, sem overflow; 1440/768/390/320 px.");
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
