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
      ".css": "text/css",
      ".html": "text/html",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
    }[extname(path)] || "application/octet-stream",
  );
  res.end(readFileSync(path));
});
await new Promise((resolve) => server.listen(5225, "127.0.0.1", resolve));
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
mkdirSync("test-results", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
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
      body: readFileSync("tests/fixtures/db.js", "utf8").replaceAll('"../../js/', '"./').replaceAll("'../../js/", "'./"),
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:5225");
  await page.locator(".dashboard-greeting").waitFor();
  const navigate = async (hash) => {
    await page.evaluate((value) => (location.hash = value), hash);
    await page.waitForTimeout(250);
    await page.locator("#main h1").first().waitFor();
  };
  await page.evaluate(async () => {
    const { managedEventPage } = await import("./js/event-pages.js");
    const { ATTRIBUTES } = await import("./js/utils.js");
    const state = window.__testState;
    const player = {
      ...state.users[0],
      hasCard: true,
      ovr: 84,
      stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 70])),
    };
    window.__renderDetails = async (mode, mixed = false, winners = 1) => {
      const users = [...state.users, { uid: "podium-long-name", displayName: "Pedro Alexandre da Conceição e Silva" }];
      const reward = {
        boosts: mixed
          ? { pace: 2, passing: 1 }
          : Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 1])),
        statDuration: mixed ? "permanent" : "monthly",
        specialId: "in-form",
        cardTheme: { name: "Homem da Noite" },
      };
      if (mode === "closed") Object.assign(reward, {
        boosts: { shooting: 10 }, statDuration: "monthly", cardDuration: "permanent",
        specialId: "saved:goals-fixture", cardTheme: { name: "Goleador DBS" },
      });
      const objective = {
        metric:
          mode === "goals"
            ? "goals"
            : mode === "streak"
              ? "ratingStreak"
              : mode === "average"
                ? "ratingAverage"
                : "ratingGames",
        target: mode === "goals" ? 14 : mode === "average" ? 3 : 1,
        threshold: 4.2,
        comparison: mode === "average" ? "gt" : "gte",
        combine: mode === "average" ? "all" : "mean",
        attributes: [
          "overall",
          "attack",
          "passing",
          "defense",
          "physical",
          "attitude",
        ],
        minRatings: 9,
      };
      const event = {
        id: "details-test",
        schemaVersion: 2,
        title: "Missão de avaliação",
        kind: ["goals", "closed"].includes(mode) ? "event" : "mission",
        method:
          mode === "vote" ? "vote" : mode === "admin" ? "admin" : "objective",
        status: mode === "closed" ? "closed" : "open",
        startsAt: "2026-10-01",
        endsAt: "2026-12-01",
        participantIds: ["pedro", "joao"],
        objective,
        cadence: "once",
        maxRepeats: 1,
        scope: "individual",
        winnerCount: 1,
        winners: mode === "closed" ? users.slice(0, winners).map((user, index) => ({ uid: user.uid, position: index + 1, reward })) : [],
        ranking: [],
        progress: [],
        deliveries: [],
        audit: [],
        ballots: [],
        minVotes: 1,
        votesPerUser: 2,
        votingStartsAt: "2026-10-01",
        votingEndsAt: "2026-12-01",
        allowSelfVote: false,
        liveResults: false,
        rarity: "elite",
        configuration: { positions: [reward] },
        rewardPreview: [reward],
      };
      await managedEventPage(
        {
          user: state.users[0],
          league: { users, players: [player] },
          render: (html) => (document.querySelector("#main").innerHTML = html),
        },
        event,
      );
    };
  });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1800 });
    for (const mode of [
      "rating",
      "average",
      "streak",
      "goals",
      "vote",
      "admin",
    ]) {
      await page.evaluate((mode) => window.__renderDetails(mode), mode);
      await page.locator(".challenge-rules").waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        mode + "/" + width,
      );
      assert.equal(await page.locator(".reward-all-stats").count(), 2);
      assert.equal(
        await page
          .locator(".event-reward-copy .reward-special-section")
          .count(),
        1,
      );
      if (mode === "rating") {
        assert.equal(await page.locator(".event-reward-showcase > .event-reward-markers").count(),0);
        const sizes=await page.locator(".event-reward-copy").first().evaluate(el=>[".reward-all-stats strong",".reward-all-stats span",".reward-breakdown h4",".reward-special-section > strong"].map(selector=>getComputedStyle(el.querySelector(selector)).fontSize));
        assert.equal(new Set(sizes).size,1,"reward values and labels share one type scale");
        for(const theme of ["club","volt","champions","ultimate"]){
          await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        }
        await page.evaluate(()=>document.documentElement.dataset.theme="club");
        await page.locator(".event-reward-copy").first().screenshot({path:`test-results/event-rewards-${width}.png`});
        assert.equal(await page.locator(".challenge-criteria li").count(), 6);
        assert.equal(
          (await page.locator(".challenge-rules").textContent()).match(
            /Só contam jogos/g,
          ).length,
          1,
        );
        await page.getByText("Condições do objetivo", { exact: true }).click();
        await page.locator(".challenge-conditions").first().focus();
        await page.screenshot({
          path: `test-results/event-details-${width}.png`,
          fullPage: true,
        });
      }
    }
    await page.evaluate(() => window.__renderDetails("rating", true));
    assert.equal(
      await page.locator(".event-reward-copy .reward-stat-list > div").count(),
      2,
    );
    await page
      .locator(".event-reward-copy .reward-stat-section .pill")
      .getByText("Permanente", { exact: true })
      .waitFor();
    await page
      .locator(".event-reward-copy .reward-special-section .pill")
      .getByText("Semanal", { exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
  }
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1200 });
    for (const count of [1, 2, 3]) {
      await page.evaluate(count => window.__renderDetails("closed", false, count), count);
      assert.equal(await page.locator(".podium-award").count(), count);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `closed/${count}/${width}`);
      const headings = await page.locator(".podium-award .reward-section-heading h4").evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
      assert.ok(headings.every(height => height < 60), `reward labels must not wrap vertically: ${width}`);
      if (count === 1) {
        await page.locator("#event-leaderboard").screenshot({ path: `test-results/event-final-${width}.png` });
        if (width === 1440) await page.locator(".event-detail-layout").screenshot({ path: "test-results/event-final-desktop.png" });
      }
    }
  }
  await page.evaluate(async()=>{
    const {managedEventPage}=await import("/js/event-pages.js");
    const users=[{uid:"carlos",displayName:"Carlos"},{uid:"joao",displayName:"João"},{uid:"pedro",displayName:"Pedro Alexandre da Conceição e Silva"},{uid:"zero",displayName:"Álvaro"},{uid:"locked",displayName:"Filipe"}];
    window.__participantsUsers=users;
    window.__renderParticipants=async(complex=false,scope="individual")=>{
      const objective=complex?{metric:"all",target:100,goals:[{id:"goals",metric:"goals",target:10},{id:"wins",metric:"wins",target:2}]}:{metric:"goals",target:10};
      const rows=[{uid:"zero",progress:0,percent:0},{uid:"joao",progress:10,percent:100,completed:true,claimed:true},{uid:"pedro",progress:4,percent:40},{uid:"locked",progress:0,percent:0,locked:true},{uid:"carlos",progress:10,percent:100,completed:true}].map(row=>({...row,target:complex?100:10,...(complex?{goals:[{id:"goals",progress:row.percent/10,target:10},{id:"wins",progress:row.completed?2:row.percent>0?1:0,target:2}]}:{})}));
      const event={id:"participants-fixture",schemaVersion:2,title:"Missão pessoal",kind:"mission",method:"objective",scope:"individual",status:"open",startsAt:"2026-10-01",endsAt:"2026-12-01",cadence:"once",maxRepeats:1,participantIds:users.map(row=>row.uid),objective,participantProgress:rows,progress:[{uid:"pedro",progress:complex?40:4,eligible:false}],claimedPeriods:[],rewardPreview:[],myRewards:[],winners:[],ranking:[]};
      event.scope=scope;
      if(scope!=="individual") event.title="Carregas ou és carregado";
      await managedEventPage({user:{uid:"pedro",role:"member"},league:{users,players:users},render:html=>document.querySelector("#main").innerHTML=html},event);
    };
    await window.__renderParticipants();
  });
  assert.deepEqual(await page.locator("[data-participant-uid]").evaluateAll(rows=>rows.map(row=>row.dataset.participantUid)),["carlos","joao","pedro","zero","locked"]);
  assert.equal(await page.locator(".mission-participant.is-complete").count(),2);
  assert.equal(await page.locator(".mission-participant.is-you").getAttribute("data-participant-uid"),"pedro");
  assert.match(await page.locator('[data-participant-uid="pedro"]').innerText(),/40%/);
  assert.match(await page.locator('[data-participant-uid="pedro"]').innerText(),/4 \/ 10/);
  await page.locator("[data-participant-search]").fill("alvaro");
  assert.equal(await page.locator("[data-participant-uid]").count(),1);
  assert.equal(await page.locator("[data-participant-uid]").getAttribute("data-participant-uid"),"zero");
  await page.locator("[data-participant-search]").fill("inexistente");
  assert.match(await page.locator("[data-participant-list]").innerText(),/Nenhum jogador encontrado/);
  await page.locator("[data-participant-search]").fill("");
  await page.locator("[data-participant-search]").evaluate(el=>el.blur());
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:2600});
    for(const theme of ["club","volt","champions","ultimate"]){
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    }
    await page.evaluate(()=>document.documentElement.dataset.theme="club");
    await page.locator("#event-leaderboard").screenshot({path:`test-results/mission-participants-${width}.png`});
  }
  await page.evaluate(()=>window.__renderParticipants(true));
  const details=page.locator('[data-participant-uid="pedro"] summary');
  await details.focus();await page.keyboard.press("Enter");
  assert.equal(await page.locator('[data-participant-uid="pedro"] [role="progressbar"]').count(),3);
  assert.match(await page.locator('[data-participant-uid="pedro"] .event-combined-progress').innerText(),/4 \/ 10/);
  for(const scope of ["team","collective","group"]){
    await page.evaluate(scope=>window.__renderParticipants(false,scope),scope);
    assert.equal(await page.locator("[data-participant-uid]").count(),5,scope);
    assert.deepEqual(await page.locator("[data-participant-uid]").evaluateAll(rows=>rows.map(row=>row.dataset.participantUid)),["carlos","joao","pedro","zero","locked"]);
    assert.match(await page.locator('[data-participant-uid="pedro"]').innerText(),/40%/);
  }
  await page.evaluate(async()=>{
    const {managedEventPage}=await import("/js/event-pages.js");
    window.__renderClosedMission=async(mode="ready")=>managedEventPage({
      user:{uid:"jonas",role:"member"},league:{users:[{uid:"jonas",displayName:"Jonas"}],players:[]},
      render:html=>document.querySelector("#main").innerHTML=html,
    },{id:"closed-night",schemaVersion:2,title:"Revelação de um jogo noturno",kind:"mission",method:"objective",scope:"individual",
      status:"closed",startsAt:"2026-10-01",endsAt:"2026-10-15",cadence:"once",maxRepeats:1,participantIds:["jonas"],
      objective:{metric:"games",target:1},progress:[{uid:"jonas",progress:1,eligible:true}],
      participantProgress:[{uid:"jonas",progress:1,target:1,percent:100,completed:true}],
      claimMode:mode,claimedPeriods:[],rewardPreview:[],myRewards:[],winners:[],ranking:[]});
    await window.__renderClosedMission();
  });
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1200});
    assert.equal(await page.locator("#claim-mission").isEnabled(),true);
    assert.match(await page.locator(".mission-progress-panel").innerText(),/Podes receber a recompensa/);
    await page.locator("#claim-mission").focus();
    assert.equal(await page.locator("#claim-mission").evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:`test-results/closed-mission-${width}.png`,fullPage:true});
  }
  await page.evaluate(()=>window.__renderClosedMission("blocked"));
  assert.equal(await page.locator("#claim-mission").count(),0);
  await page.evaluate(()=>window.__renderClosedMission("deferred"));
  assert.equal(await page.getByRole("button",{name:"Concluir e aguardar"}).isEnabled(),true);
  assert.deepEqual(errors, []);
  console.log(
    "Event details: six objective/method variants, all/mixed rewards, separate duration, configured rewards and 1440/768/390/320px passed.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
