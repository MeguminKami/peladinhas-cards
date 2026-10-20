import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

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
const output = "test-results/event-goals";
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
  page.on("pageerror", (e) => { errors.push(e.message); console.error(e.message); });
  page.setDefaultTimeout(10000);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(() => {
    location.hash = "#/admin/events";
  });
  await page.locator("#new-event").waitFor();
  const field=name=>page.locator(`#event-builder-form [name="${name}"]`);
  const step=index=>page.locator(`[data-editor-step="${index}"]`).click();
  for(const kind of ["mission","event"]) {
    await page.locator(kind==="mission"?"#new-mission":"#new-event").click();
    await field("title").fill(`Goal builder ${kind}`);
    await page.locator("#editor-next").click();
    if(kind==="event")await page.locator('[data-selection-method="objective"]').click();
    assert.equal(await page.locator(".event-goal").count(),0);
    await page.locator("#editor-next").click();
    assert.equal(await page.locator('[aria-current="step"]').getAttribute("data-editor-step"),"1");
    await page.locator(".event-goal-add").click();
    assert.equal(await field("metric").locator('option').count(),24);
    assert.equal(await field("metric").locator('option[value="totalGames"]').count(),0);
    await field("metric").selectOption("totalGoalkeeperGames");
    await field("countFrom").selectOption("history");
    await field("countFrom").selectOption("challenge");
    await field("metric").selectOption("winStreak");
    assert.equal(await field("countFrom").locator('[value="history"]').evaluate(option=>option.disabled),true);
    await field("metric").selectOption("goals");await field("target").fill("5");
    await page.locator(".event-goal-add").click();
    assert.equal(await page.locator(".event-goal.is-editing").count(),1);
    assert.match(await page.locator(".event-goal-summary").first().innerText(),/5 golos/);
    await field("metric").selectOption("wins");await field("target").fill("2");
    await page.locator(".event-goal-add").click();
    await page.locator('[data-objective-family="stars"]').click();
    assert.equal(await field("metric").locator('option').count(),4);
    await field("target").fill("2");await field("ratingThreshold").fill("4.2");
    await page.locator(".event-goal-add").click();
    await field("metric").selectOption("games");await field("countFrom").selectOption("history");await field("target").fill("20");
    assert.equal(await field("cadence").isDisabled(),true);
    assert.equal(await page.locator(".event-goal").count(),4);
    for(const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:1100});
      for(const theme of ["club","volt","champions","ultimate"]) {
        await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
        await page.emulateMedia({reducedMotion:"reduce"});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      }
      await page.evaluate(()=>document.documentElement.dataset.theme="club");
      await page.locator(".event-goal-builder").screenshot({path:`${output}/${kind}-${width}.png`});
    }
    await step(3);await page.locator('.event-question [data-reward-mode="card"]').first().click();
    await page.locator('.event-question [name="specialId"]').first().selectOption("mvp");
    await step(4);
    assert.equal(await page.locator(".event-review-card .event-rule-list li").count(),4);
    await page.locator('[name="submitAction"][value="draft"]').click();
    await page.locator("#new-event").waitFor();
    const saved=await page.evaluate(title=>window.__testState.events.find(event=>event.title===title),`Goal builder ${kind}`);
    assert.equal(saved.objective.metric,"all");assert.equal(saved.objective.goals.length,4);
    assert.deepEqual(saved.objective.goals.map(goal=>goal.metric),["goals","wins","ratingGames","totalGames"]);
    await page.locator(`[data-edit="${saved.id}"]`).click();await step(1);
    assert.equal(await page.locator(".event-goal.is-editing").count(),0);
    await page.locator("[data-goal-edit]").first().focus();await page.keyboard.press("Enter");
    await field("target").fill("7");await page.locator(".event-goal-add").click();
    await page.locator("[data-goal-up]").last().click();
    await page.locator("[data-goal-remove]").last().click();
    await step(4);await page.locator('[name="submitAction"][value="draft"]').click();
    await page.locator("#new-event").waitFor();
    const edited=await page.evaluate(id=>window.__testState.events.find(event=>event.id===id),saved.id);
    assert.equal(edited.objective.goals[0].id,saved.objective.goals[0].id);
    assert.equal(edited.objective.goals[0].target,7);
    assert.equal(edited.objective.goals.length,4);
  }
  await page.locator("#new-event").click();await field("title").fill("Voting without goals");
  await step(3);await page.locator('.event-question [data-reward-mode="card"]').first().click();
  await page.locator('.event-question [name="specialId"]').first().selectOption("mvp");
  await step(4);await page.locator('[name="submitAction"][value="draft"]').click();
  await page.locator("#new-event").waitFor();
  assert.equal(await page.evaluate(()=>window.__testState.events.find(event=>event.title==="Voting without goals").objective.metric),"games");
  const activeId=await page.evaluate(()=>{
    const event=window.__testState.events.find(event=>event.title==="Goal builder event");
    event.status="open";event.startsAt="2026-10-10T12:34:56.789Z";event.endsAt="2026-12-01T12:34:56.789Z";
    return event.id;
  });
  await page.locator(`[data-edit="${activeId}"]`).click();await step(1);
  await page.locator("[data-goal-edit]").first().click();await field("target").fill("9");
  assert.ok(await field("startsAt").isDisabled());
  await step(4);await page.locator('[name="submitAction"][value="draft"]').click();
  await page.locator("#new-event").waitFor();
  const activeSaved=await page.evaluate(id=>window.__testState.events.find(event=>event.id===id),activeId);
  assert.equal(activeSaved.startsAt,"2026-10-10T12:34:56.789Z");
  assert.equal(activeSaved.endsAt,"2026-12-01T12:34:56.789Z");
  assert.equal(activeSaved.status,"open");
  await page.evaluate(async()=>{
    const {managedEventPage}=await import("/js/event-pages.js");
    const objective={metric:"all",target:100,goals:[{id:"scoring",metric:"goals",target:7},{id:"winning",metric:"wins",target:2}]};
    const event={id:"goals-detail",schemaVersion:2,title:"Metas em progresso",kind:"mission",method:"objective",scope:"individual",status:"open",
      startsAt:"2026-10-01",endsAt:"2026-12-01",cadence:"once",participantIds:["pedro"],maxRepeats:1,objective,
      progress:[{uid:"pedro",progress:42,eligible:false,ratingState:{progress:42,goals:[{id:"scoring",progress:3,target:7},{id:"winning",progress:1,target:2}]}}],
      claimedPeriods:[],rewardPreview:[],myRewards:[],winners:[],ranking:[]};
    await managedEventPage({user:{uid:"pedro",role:"member"},league:{players:window.__testState.users},render:html=>document.querySelector("#main").innerHTML=html},event);
  });
  assert.equal(await page.locator(".challenge-goal-list > li").count(),2);
  assert.match(await page.locator(".event-combined-progress").innerText(),/3 \/ 7/);
  assert.match(await page.locator(".event-combined-progress").innerText(),/1 \/ 2/);
  assert.equal(await page.locator(".mission-progress-panel > .progress").count(),0);
  assert.doesNotMatch(await page.locator(".event-combined-progress").innerText(),/Meta \d|todas as metas/);
  assert.equal(await page.locator('[role="progressbar"]').first().getAttribute("aria-valuenow"),"3");
  assert.ok(await page.locator("#claim-mission").isDisabled());
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1100});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.locator(".mission-progress-panel").screenshot({path:`${output}/progress-${width}.png`});
  }
  await page.evaluate(async()=>{
    const { missionList } = await import("/js/missions.js");
    const goal = {id:"rated",metric:"ratingGames",target:1,threshold:4};
    document.querySelector("#main").innerHTML = missionList([{
      type:"OBJECTIVE_MISSION",title:"Jogo de ouro",rarity:"gold",icon:"star",href:"#/events/test",
      done:0,total:100,objective:{metric:"all",target:100,goals:[goal]},
      combinedState:{goals:[{id:"rated",progress:0}]},rewards:[],
    }],{grouped:false});
  });
  assert.equal(await page.locator(".mission .progress").count(),1);
  assert.doesNotMatch(await page.locator(".mission").innerText(),/Meta 1|todas as metas|Cumpre as/);
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1100});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.locator(".mission").screenshot({path:`${output}/mission-progress-${width}.png`});
  }
  await page.evaluate(async()=>{
    const {mountGoalBuilder}=await import("/js/event-goal-builder.js");
    document.querySelector("#main").innerHTML='<div class="event-goal-builder content-stack"></div>';
    mountGoalBuilder(document.querySelector(".event-goal-builder"),{
      objective:{metric:"all",target:100,goals:["totalStrikerGames","totalMidfielderGames","totalDefenderGames"].map((metric,i)=>({id:String(i),metric,target:1,countFrom:"challenge"}))},
      pane:document.createElement("div"),readLeaf:()=>({}),writeLeaf:()=>{},changed:()=>{},
    });
  });
  assert.match(await page.locator(".event-goal-summary").last().innerText(),/Joga um jogo como defesa \(DEF\)\./);
  assert.doesNotMatch(await page.locator(".event-goal-builder").innerText(),/Atinge|após o desbloqueio/);
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1100});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.locator(".event-goal-builder").screenshot({path:`${output}/position-copy-${width}.png`});
  }
  await page.evaluate(async()=>{
    const {challengeRules}=await import("/js/event-objective-view.js");
    document.querySelector("#main").innerHTML='<section class="panel event-rarity-surface" data-rarity="gold" style="max-width:760px;margin-inline:auto">'+challengeRules({method:"objective",kind:"mission",objective:{metric:"all",target:100,goals:[{id:"average",metric:"ratingAverage",target:3,threshold:4,comparison:"gte",combine:"all",attributes:["attack","passing","defense","physical"],minRatings:3}]}})+'</section>';
  });
  const summary=page.locator(".goal-rule-details summary");
  await summary.focus();await page.keyboard.press("Enter");
  assert.ok(await summary.evaluate(el=>getComputedStyle(el).outlineStyle!=="none"));
  await summary.evaluate(el=>el.blur());
  if(await page.locator(".toast").count()) await page.locator(".toast").last().waitFor({state:"hidden"});
  assert.equal(await page.locator(".goal-rule-details").getAttribute("open"),"");
  assert.equal(await page.locator(".goal-rule-rows > div").count(),8);
  assert.equal(await page.locator(".goal-rule-tags li").count(),4);
  assert.match(await page.locator(".goal-rule-rows").innerText(),/3 por critério, em cada jogo/);
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1800});
    for(const theme of ["club","volt","champions","ultimate"]){
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    }
    await page.evaluate(()=>document.documentElement.dataset.theme="club");
    await page.locator(".challenge-rules").screenshot({path:`${output}/criteria-${width}.png`});
  }
  await summary.focus();await page.keyboard.press("Enter");
  assert.equal(await page.locator(".goal-rule-details").getAttribute("open"),null);
  assert.deepEqual(errors,[]);
  console.log("Goal builder: add/collapse, all types, edit/reorder/remove, stable IDs, review/save, keyboard and four widths/themes passed.");
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
