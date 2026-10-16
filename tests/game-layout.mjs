import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
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
if (process.platform === "win32") options.channel = "msedge";
const browser = await chromium.launch(options);
mkdirSync("test-results", { recursive: true });
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      hasTouch: true,
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
    const { gamePage, matchPositions } = await import("/js/games.js");
    const game = {
      id: "visual-game",
      title: "Visual game",
      status: "closed",
      scheduledAt: new Date(),
      teamA: { starters: ["one"], bench: [] },
      teamB: { starters: ["two"], bench: [] },
      score: { teamA: 2, teamB: 1 },
    };
    document.head.innerHTML +=
      '<link rel="stylesheet" href="/css/styles.css"><link rel="stylesheet" href="/css/cards.css"><link rel="stylesheet" href="/css/responsive.css"><link rel="stylesheet" href="/css/experience.css">';
    const players = [
      {
        uid: "one",
        displayName: "Player one",
        primaryPosition: "GR",
        hasCard: true,
        ovr: 80,
      },
      {
        uid: "two",
        displayName: "Player two",
        primaryPosition: "DEF",
        hasCard: true,
        ovr: 75,
      },
    ];
    window.__gameLayoutContext = {
      user: { role: "admin", uid: "one" },
      league: {
        games: [game],
        players,
        summaries: [
          {
            id: game.id,
            players: { one: { overall: 4.25, attack: 4 }, two: { overall: 4 } },
          },
        ],
      },
      render: (html) => (document.body.innerHTML = html),
    };
    window.__positionChecks = [
      matchPositions(game, players),
      matchPositions({ ...game, positions: { one: "MED" } }, players),
      matchPositions(
        { ...game, status: "open", positions: { one: "MED" } },
        players,
      ),
    ];
    await gamePage(window.__gameLayoutContext, game.id);
  });
  await page.waitForTimeout(500);
  assert.equal(await page.locator(".match-rating-player").count(), 2);
  assert.equal(
    await page.locator(".match-stars").first().getAttribute("aria-label"),
    "4.3 de 5 estrelas",
  );
  assert.deepEqual(await page.evaluate(() => window.__positionChecks), [
    { one: "GR", two: "DEF" },
    { one: "MED", two: "DEF" },
    { one: "GR", two: "DEF" },
  ]);
  assert.equal(
    await page.locator("[data-game-position],.game-jumpbar").count(),
    0,
  );
  assert.ok(
    await page
      .locator("#game-form > :last-child")
      .evaluate((el) => el.classList.contains("game-actionbar")),
  );
  assert.ok(
    await page
      .locator(".score")
      .evaluate((el) => el.nextElementSibling.id === "game-ratings"),
  );
  await page.locator(".game-scouting > summary").click();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const issues = await page.evaluate(
      () =>
        [...document.querySelectorAll(".match-performance-row")].filter(
          (el) => el.scrollWidth > el.clientWidth + 1,
        ).length,
    );
    assert.equal(issues, 0, `Overflow at ${width}`);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `Page overflow at ${width}`,
    );
    assert.ok(await page.locator(".leader-mini-card").first().isVisible());
    assert.ok(
      await page
        .locator(".leader-mini-card .football-card")
        .first()
        .evaluate((el) => el.getBoundingClientRect().width <= 61),
    );
    const ratingWidths = await page
      .locator(".match-rating-player > summary .match-stars b")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    assert.ok(Math.abs(ratingWidths[0] - ratingWidths[1]) < 1);
    await page.screenshot({
      path: `test-results/game-refresh-${width}.png`,
      fullPage: true,
    });
  }
  await page.evaluate(async () => {
    const { gamesPage } = await import("/js/games.js");
    gamesPage(window.__gameLayoutContext);
  });
  assert.equal(
    await page.locator(".game-own-rating .match-stars b").textContent(),
    "4,3",
  );
  assert.ok(
    await page
      .locator(".game-own-rating .match-stars b")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 20),
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `Game list overflow at ${width}`,
    );
    await page.screenshot({
      path: `test-results/game-list-${width}.png`,
      fullPage: true,
    });
  }
  console.log("Match layout and ratings passed at 1440, 768 and 390px.");
} finally {
  await browser.close();
  server.close();
}
