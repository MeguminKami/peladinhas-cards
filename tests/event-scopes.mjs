import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
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
const output = `test-results/event-scopes${isWebKit ? "-webkit" : ""}`;
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
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(url);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(seedDocumentation);
  await page.evaluate(() => {
    location.hash = "#/admin/events";
  });
  await page.locator("#new-event").waitFor();
  // Hidden collection conditions must not leak through generated or stale missions.
  const missionChecks = await page.evaluate(async () => {
    const { refreshMissionsForCurrentUser, missionList } = await import("./js/missions.js");
    const { ACTIVE_COLLECTION_IDS } = await import("./js/card-collection.js");
    const user = { uid: "hidden-card-member", hasCard: true };
    const league = { players: [user], games: [], events: [] };
    const generated = await refreshMissionsForCurrentUser(user, league);
    const withRevokedCard = await refreshMissionsForCurrentUser(user, {
      ...league,
      players: [{ ...user, earnedCards: [{ themeId: ACTIVE_COLLECTION_IDS[0], revokedAt: "2026-10-01" }] }],
    });
    const visible = { id: "visible", type: "COMPLETE_PROFILE", title: "Visible mission",
      description: "Complete your profile", done: 0, total: 1, href: "#/profile/edit", icon: "profile" };
    const hidden = [
      { ...visible, id: "secret-flag", title: "Secret flag condition", hiddenCard: true },
      { ...visible, id: "secret-type", title: "Secret type condition", type: "HIDDEN_CARD" },
      { ...visible, id: "secret-competition", title: "Secret competition condition", type: "COMPETITION_OBJECTIVE", hiddenCard: true },
    ];
    return {
      generated, withRevokedCard,
      renderings: [true, false].map(grouped => ({
        mixed: missionList([...hidden, visible], { grouped }),
        onlyHidden: missionList(hidden, { grouped }),
        empty: missionList([], { grouped }),
      })),
    };
  });
  for (const missions of [missionChecks.generated, missionChecks.withRevokedCard]) {
    assert.ok(missions.some(m => m.type === "COMPLETE_PROFILE"));
    assert.ok(missions.some(m => m.type === "SELF_INITIAL_RATING"));
    assert.ok(missions.every(m => !m.hiddenCard && m.type !== "HIDDEN_CARD"));
  }
  for (const rendering of missionChecks.renderings) {
    assert.match(rendering.mixed, /Visible mission/);
    assert.doesNotMatch(rendering.mixed, /Secret|Miss\u00e3o escondida|mission-competitions/);
    assert.equal(rendering.onlyHidden, rendering.empty);
  }
  for (const kind of ["event", "mission"]) {
    for (const width of [320, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      if (await page.locator("#event-editor").isVisible()) await page.locator("#close-editor").click();
      await page
        .locator(kind === "event" ? "#new-event" : "#new-mission")
        .click();
      const rarity = page.locator('#event-editor [name="rarity"]');
      assert.equal(await rarity.locator("option").count(), 7);
      await rarity.selectOption("ultimate");
      assert.equal(await page.locator("#event-rarity-preview").getAttribute("data-rarity"), "ultimate");
      await page.locator('[data-editor-step="1"]').click();
      if (kind === "event")
        await page.locator('[data-selection-method="objective"]').click();
      const scope = page.locator('#event-editor [name="scope"]');
      assert.ok(await scope.isVisible(), `${kind} scope visible`);
      assert.deepEqual(
        await scope
          .locator("option")
          .evaluateAll((options) => options.map((option) => option.value)),
        ["individual", "group", "team"],
      );
      for (const value of ["group", "team"]) {
        await scope.selectOption(value);
        await page
          .locator('#event-editor [name="metric"]')
          .selectOption("goals");
        assert.equal(await scope.inputValue(), value);
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `${kind} overflow ${width}`,
      );
    }
  }
  await page.locator("#close-editor").click();
  await page.evaluate(async () => {
    const { missionList } = await import("./js/missions.js");
    document.querySelector("main").innerHTML = missionList([{
      type: "COMPETITION_OBJECTIVE", title: "Djabugoleador",
      description: "Marca 14 golos.",
      objectivePreview: {text:"Marca 14 golos.",criteria:""},
      eventDescription: "Uma corrida pelos golos da semana. Mostra a tua qualidade e conquista o topo! <teste>",
      done: 1, total: 14, href: "#/event/example", icon: "trophy",
    }]);
  });
  assert.equal(await page.locator(".mission-event-description").count(), 0);
  assert.equal(await page.locator(".mission-content > p").count(), 1);
  assert.equal(await page.locator(".mission-objective").innerText(),"Marca 14 golos.");
  assert.equal(await page.locator(".mission").getAttribute("href"), "#/event/example");
  assert.equal(await page.locator(".mission-event-description teste").count(), 0);
  for (const width of [320, 390, 640, 844, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Event description overflow ${width}`);
    assert.ok(await page.locator(".mission-heading h3").isVisible());
  }
  mkdirSync("test-results/event-scopes", { recursive: true });
  await page.locator(".mission-competition").screenshot({ path: `test-results/event-scopes/description-${isWebKit ? "webkit" : "chromium"}.png` });
  await page.evaluate(async () => {
    const { missionList } = await import("./js/missions.js");
    document.querySelector("main").innerHTML = missionList(["COMPETITION_OBJECTIVE", "OBJECTIVE_MISSION", "EVENT_VOTE"].map(type => ({ type, title: type, eventDescription: "A description shared by every challenge type.", description: "Objective or voting instructions.", done: 1, total: 3, href: "#/event/example", icon: "trophy" })));
  });
  assert.equal(await page.locator(".mission-event-description").count(), 0);
  assert.equal(await page.locator(".mission-content > p").count(), 3);
  for (const width of [320, 390, 844, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `All challenge descriptions overflow ${width}`);
  }
  await page.evaluate(async () => {
    const { rewardShowcase } = await import("./js/event-presentation.js");
    const { eventIcon } = await import("./js/icons.js");
    const metrics = ["games", "goals", "assists", "wins", "winStreak", "unbeatenWins", "unbeatenGames", "goalsAndAssists", "cleanSheets"];
    window.__metricIcons = metrics.map(metric => eventIcon({ method: "objective", objective: { metric } }));
    document.querySelector("main").innerHTML += rewardShowcase({ kind: "mission", status: "open", rewardPreview: [{ boosts: { pace: 2 }, statDuration: "weekly", specialId: "in-form" }] }, { uid: "pedro", displayName: "Pedro Silva", ovr: 84, stats: {} });
  });
  assert.equal(new Set(await page.evaluate(() => window.__metricIcons)).size, 9);
  assert.equal(await page.locator(".event-reward-card .football-card.in-form").count(), 1);
  assert.equal(await page.locator(".event-reward-markers > span").count(), 2);
  for (const width of [320, 390, 430, 844, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Reward preview overflow ${width}`);
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.locator(".event-reward-showcase").screenshot({ path: `test-results/event-scopes/reward-${isWebKit ? "webkit" : "chromium"}.png` });
  await page.evaluate(async () => {
    const { missionList } = await import("./js/missions.js");
    const { EVENT_RARITIES } = await import("./js/event-rarity.js");
    document.querySelector("main").innerHTML = missionList(Object.keys(EVENT_RARITIES).map(rarity => ({ type: "COMPETITION_OBJECTIVE", rarity, title: "A conquista da semana", description: "Ganha 3 jogos.", eventDescription: "Entra em campo e deixa a tua marca.", done: 1, total: 3, href: "#/event/example", icon: "wins" })));
  });
  assert.equal(await page.locator(".event-rarity-badge").count(), 7);
  for (const width of [320, 390, 844, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Rarity overflow ${width}`);
  }
  await page.locator(".mission-list").screenshot({ animations: "disabled", style: "#header,.bottom-nav{visibility:hidden!important}", path: `test-results/event-scopes/rarities-${isWebKit ? "webkit" : "chromium"}.png` });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.locator('.mission[data-rarity="ultimate"]').screenshot({ animations: "disabled", path: `test-results/event-scopes/rarity-mobile-${isWebKit ? "webkit" : "chromium"}.png` });
  await page.clock.install();
  await page.evaluate(async () => {
    const { mountHomePodium, podiumPlayers } = await import("./js/home-podium.js");
    if (podiumPlayers([{ hasCard: true, ovr: 80, aggregates: [], ovrDelta: -1 }], "performance").length || podiumPlayers([{ hasCard: true, ovr: 80, ovrDelta: -1 }], "growth").length) throw new Error("Empty rankings must not fall back to OVR");
    const { cardWeek } = await import("./js/card-week.js");
    const date = new Date(+cardWeek().opensAt + 60000).toISOString();
    const main = document.querySelector("main");
    main.innerHTML = '<section class="weekly-section"><div id="home-podium"></div></section>';
    const players = [
      { uid: "ovr", ovr: 90, ovrDelta: -2, performance: 3 },
      { uid: "performance", ovr: 80, ovrDelta: 1, performance: 5 },
      { uid: "growth", ovr: 70, ovrDelta: 4, performance: 4 },
      { uid: "absent", ovr: 85, ovrDelta: null },
    ].map(p => ({ ...p, username: p.uid, displayName: p.uid, hasCard: true, stats: {}, aggregates: p.performance ? [{ date, count: 2, overall: p.performance }] : [] }));
    window.__disposePodium = mountHomePodium(main.querySelector("#home-podium"), players);
  });
  const podium = page.locator("#home-podium");
  assert.equal(await podium.getAttribute("data-mode"), "ovr");
  assert.equal(await podium.locator('.place-1 .football-card').getAttribute("href"), "#/player/ovr");
  await page.mouse.move(0, 0);
  await page.clock.fastForward(5001);
  assert.equal(await podium.getAttribute("data-mode"), "performance");
  assert.equal(await podium.locator('.place-1 .football-card').getAttribute("href"), "#/player/performance");
  assert.equal(await podium.locator('.football-card[href="#/player/absent"]').count(), 0);
  await page.clock.fastForward(5001);
  assert.equal(await podium.getAttribute("data-mode"), "growth");
  assert.equal(await podium.locator('.place-1 .football-card').getAttribute("href"), "#/player/growth");
  assert.equal(await podium.locator(".podium-place").count(), 2);
  await podium.locator(".podium").focus();

  await page.clock.fastForward(20001);
  assert.equal(await podium.getAttribute("data-mode"), "growth");
  for (const mode of ["ovr", "performance", "growth"]) {
    await podium.locator(`[data-podium-mode="${mode}"]`).click();
    assert.equal(await podium.getAttribute("data-mode"), mode);
    for (const width of [320, 390, 430, 844, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Podium ${mode} overflow ${width}`);
    }
  }
  await podium.locator('[data-podium-mode="ovr"]').click();
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.clock.fastForward(1000);
  await podium.screenshot({ animations: "disabled", path: `test-results/event-scopes/podium-${isWebKit ? "webkit" : "chromium"}.png` });
  await page.setViewportSize({ width: 390, height: 1000 });
  await podium.screenshot({ animations: "disabled", path: `test-results/event-scopes/podium-mobile-${isWebKit ? "webkit" : "chromium"}.png` });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await podium.locator(".podium-place").first().evaluate(el => getComputedStyle(el).animationName), "none");
  await page.evaluate(() => window.__disposePodium());
  assert.deepEqual(errors, []);
  console.log(
    `Event scopes ${isWebKit ? "WebKit" : "Chromium"}: mission/event scope choices and mobile layouts passed.`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
