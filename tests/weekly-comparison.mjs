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
const output = `test-results/weekly-comparison${isWebKit ? "-webkit" : ""}`;
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

  await page.clock.install({ time: new Date("2026-10-23T12:00:00Z") });
  await page.addInitScript(() => {
    const stored = sessionStorage.getItem("weekly-fixture");
    if (stored) window.__testState = JSON.parse(stored);
  });
  const reloadFixture = async () => {
    await page.evaluate(() =>
      sessionStorage.setItem(
        "weekly-fixture",
        JSON.stringify(window.__testState, (key, value) =>
          value?.toDate ? value.toDate().toISOString() : value,
        ),
      ),
    );
    await page.reload();
  };
  await page.goto(url);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(seedDocumentation);
  const expected = await page.evaluate(async () => {
    const { ATTRIBUTES, calculateOverallDetails } =
      await import("./js/utils.js");
    const { cardWeek } = await import("./js/card-week.js");
    const { loadLeague } = await import("./js/data.js");
    const { applyEventRewards } = await import("./js/event-rules.js");
    const currentCycle = cardWeek(),
      previousCycle = cardWeek(new Date(+currentCycle.opensAt - 1));
    const start = new Date(+previousCycle.opensAt + 3600000).toISOString();
    const newStart = new Date(+currentCycle.opensAt + 3600000).toISOString();
    window.__testState.eventRewards = [
      {
        uid: "pedro",
        schemaVersion: 2,
        startsAt: start,
        createdAt: start,
        expiresAt: currentCycle.opensAt.toISOString(),
        reward: { statDuration: "weekly", boosts: { pace: 5, defending: 3 } },
      },
      {
        uid: "pedro",
        schemaVersion: 2,
        startsAt: newStart,
        createdAt: newStart,
        expiresAt: currentCycle.nextOpensAt.toISOString(),
        reward: { statDuration: "weekly", boosts: { shooting: 3 } },
      },
      {
        uid: "pedro",
        schemaVersion: 2,
        startsAt: newStart,
        createdAt: newStart,
        expiresAt: currentCycle.nextOpensAt.toISOString(),
        reward: { statDuration: "permanent", boosts: { passing: 1 } },
      },
    ];
    const league = await loadLeague(),
      p = league.players.find((p) => p.uid === "pedro");
    const raw = { ...p.progression.stats, pace: p.progression.stats.pace - 2 };
    const previous = applyEventRewards(
      raw,
      window.__testState.eventRewards,
      "pedro",
      previousCycle.closesAt,
    );
    const previousCalculation = calculateOverallDetails(
      previous.stats,
      league.ovrWeights,
      p.primaryPosition,
      p.inactivity,
    );
    const previousPermanent = calculateOverallDetails(
      raw,
      league.ovrWeights,
      p.primaryPosition,
      p.inactivity,
    );
    window.__testState.history = [
      {
        uid: "pedro",
        weekId: previousCycle.weekId,
        stats: previous.stats,
        gameStats: raw,
        eventBoosts: previous.boosts,
        ovr: previousCalculation.ovr,
        ovrCalculation: previousCalculation,
        sourceCutoffDate: previousCycle.closesAt.toISOString(),
        baseCard: "gold-common",
        specials: [],
        official: true,
        locked: true,
      },
    ];
    const currentSnapshot = {
      uid: "pedro",
      weekId: currentCycle.weekId,
      stats: p.stats,
      gameStats: p.progression.stats,
      eventBoosts: p.eventBoosts,
      ovr: p.ovr,
      ovrCalculation: p.cardCalculation,
      sourceCutoffDate: currentCycle.closesAt.toISOString(),
      baseCard: p.cardType,
      specials: [],
      official: true,
      locked: true,
    };
    window.__testState.weeklyCards = [currentSnapshot];
    location.hash = "#/player/pedro";
    return {
      stats: p.stats,
      previousStats: previous.stats,
      ovrDelta: p.permanentOvr - previousPermanent.ovr,
      currentSnapshot,
      closesAt: currentCycle.closesAt.toISOString(),
    };
  });
  await reloadFixture();
  await page.locator(".attribute-grid").waitFor();
  const assertArrows = async () => {
    const cells = page.locator(".attribute-grid > div");
    assert.match(
      await cells.nth(0).locator(".attribute-change").innerText(),
      /\+2/,
    );
    assert.match(
      await cells.nth(1).locator(".attribute-change").innerText(),
      /=\s*0/,
    );
    assert.match(
      await cells.nth(2).locator(".attribute-change").innerText(),
      /\+1/,
    );
    assert.match(
      await cells.nth(4).locator(".attribute-change").innerText(),
      /=\s*0/,
    );
    assert.equal(
      await cells.nth(1).locator("b").innerText(),
      String(expected.stats.shooting),
    );
    assert.equal(
      await page.locator(".card-stage .card-stat-trend.negative").count(),
      0,
    );
    assert.equal(
      await page.locator(".card-stage .card-stat-trend.positive").count(),
      2,
    );
    assert.match(
      await page.locator(".weekly-comparison-note").innerText(),
      /Bónus temporários não contam/,
    );
    assert.match(
      await page.locator(".weekly-evolution").innerText(),
      new RegExp(Math.abs(expected.ovrDelta) + " OVR"),
    );
  };
  await assertArrows();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      "Overflow " + width,
    );
    const panel = page.locator(".weekly-comparison-note").locator("..");
    await panel.screenshot({
      path: output + "/permanent-stats-" + width + ".png",
    });
  }
  // Other cards in the league use the same permanent comparisons.
  await page.evaluate(() => (location.hash = "#/players"));
  await page.locator("#player-grid").waitFor();
  const playerCard = page.locator(
    '#player-grid .football-card[href="#/player/pedro"]',
  );
  assert.equal(
    await playerCard.locator(".card-stat-trend.positive").count(),
    2,
  );
  assert.equal(
    await playerCard.locator(".card-stat-trend.negative").count(),
    0,
  );
  // The closed week must use its own snapshot, never the live progression.
  await page.clock.setSystemTime(new Date(expected.closesAt));
  await page.evaluate((snapshot) => {
    window.__testState.history.push(snapshot);
    location.hash = "#/player/pedro";
  }, expected.currentSnapshot);
  await reloadFixture();
  await page.locator(".attribute-grid").waitFor();
  await assertArrows();
  await page
    .locator('[data-history-week="' + expected.currentSnapshot.weekId + '"]')
    .click();
  assert.equal(
    await page
      .locator(".history-card-expanded .card-stat-trend.positive")
      .count(),
    2,
  );
  assert.equal(
    await page
      .locator(".history-card-expanded .card-stat-trend.negative")
      .count(),
    0,
  );
  await page.locator(".close-modal").click();
  // Missing raw data in an old boosted snapshot must produce no invented arrows.
  await page.evaluate(() => {
    window.__testState.history = window.__testState.history.filter(
      (h) => !h.locked || h.weekId !== window.__testState.weeklyCards[0].weekId,
    );
    const previous = window.__testState.history[0];
    delete previous.gameStats;
    location.hash = "#/player/pedro";
  });
  await reloadFixture();
  await page.locator(".attribute-grid").waitFor();
  assert.equal(
    await page
      .locator(".attribute-change.is-positive,.attribute-change.is-negative")
      .count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Weekly comparison: temporary gains/expiry excluded, permanent rewards included, frozen snapshots, history, league cards and four profile widths passed.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
