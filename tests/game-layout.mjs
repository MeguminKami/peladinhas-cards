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
      '<link rel="stylesheet" href="/css/styles.css"><link rel="stylesheet" href="/css/cards.css"><link rel="stylesheet" href="/css/responsive.css"><link rel="stylesheet" href="/css/experience.css"><link rel="stylesheet" href="/css/postmatch.css">';
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
            players: { one: { overall: 4.25, attack: 4, goalkeeping: 2 }, two: { overall: 4 } },
          },
        ],
      },
      cleanup: () => {},
      render: (html) => (document.body.innerHTML = html + '<div id="modal-root"></div><div id="toast-root"></div>'),
    };
    window.__positionChecks = [
      matchPositions(game, players),
      matchPositions({ ...game, positions: { one: "MED" } }, players),
      matchPositions(
        { ...game, status: "open", positions: { one: "MED" } },
        players,
      ),
    ];
    await gamePage(window.__gameLayoutContext, game.id, { edit: true });
  });
  await page.waitForTimeout(500);
  assert.equal(await page.locator(".match-rating-player").count(), 0);
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
    await page.screenshot({
      path: `test-results/game-refresh-${width}.png`,
      fullPage: true,
    });
  }
  await page.evaluate(async () => {
    const ctx = window.__gameLayoutContext;
    ctx.league.games[0].status = "open";
    for (let i=3;i<=13;i++) ctx.league.players.push({uid:`slot-${i}`,displayName:`Jogador com nome bastante longo ${i}`,primaryPosition:"MED",hasCard:true,ovr:70+i});
    await (await import("/js/games.js")).gamePage(ctx,ctx.league.games[0].id);
  });
  assert.equal(await page.locator(".available,[draggable],.drop-zone").count(),0);
  assert.equal(await page.locator('.team-a .team-slot').count(),5);
  await page.locator('.team-a .team-slot').last().click();
  for (const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    await page.locator('.slot-choice .football-card').first().waitFor({state:'visible'});
    await page.waitForTimeout(300);
    const size = await page.locator('.slot-choice .football-card').first().boundingBox();
    assert.ok(size.width >= 63 && size.height >= 94, `Picker card too small at ${width}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false);
    await page.screenshot({path:`test-results/game-picker-${width}.png`,fullPage:true});
  }
  await page.keyboard.press('Escape');
  for (let i=3;i<=8;i++) {
    await page.locator('.team-a .team-slot').last().click();
    await page.locator('#slot-search').fill(`longo ${i}`);
    await page.locator(`[data-pick="slot-${i}"]`).click();
  }
  assert.equal(await page.locator('.team-a .team-chip').count(),7);
  assert.equal(await page.locator('.team-a .team-slot').count(),1);
  await page.locator('.team-a [data-remove]').first().click();
  assert.equal(await page.locator('.team-a .team-chip').count(),6);
  await page.locator('#auto-teams').click();
  assert.equal(await page.locator('.draw-help,[draggable]').count(),0);
  await page.locator('#select-all-players').click();
  assert.ok(await page.locator('#confirm-auto-teams').isEnabled());
  for (const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,`Draw overflow at ${width}`);
    await page.screenshot({path:`test-results/game-draw-${width}.png`,fullPage:true});
  }
  await page.locator('#confirm-auto-teams').click();
  assert.equal(await page.locator('.team-chip').count(),13);
  const cardColourIssues = await page.locator('.team-panel .football-card').evaluateAll(cards => cards.flatMap(card => {
    const copy=card.cloneNode(true);
    copy.style.setProperty("--card-width",getComputedStyle(card).getPropertyValue("--card-width"));
    document.body.append(copy);
    const actual=getComputedStyle(card.querySelector('.card-caption h3'));
    const expected=getComputedStyle(copy.querySelector('.card-caption h3'));
    const mismatch=actual.color!==expected.color || actual.fontSize!==expected.fontSize || actual.margin!==expected.margin;
    const issue={actual:actual.color,expected:expected.color};
    copy.remove();
    return mismatch ? [issue] : [];
  }));
  assert.deepEqual(cardColourIssues, []);

  await page.emulateMedia({reducedMotion:'reduce'});
  for (const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,`Workspace overflow at ${width}`);
    await page.screenshot({path:`test-results/game-slots-${width}.png`,fullPage:true});
  }
  await page.locator('.team-a .team-slot').focus();
  assert.equal(await page.locator('.team-a .team-slot').evaluate(el => el === document.activeElement),true);
  await page.evaluate(async () => {
    const { gamesPage } = await import("/js/games.js");
    window.__gameLayoutContext.league.games[0].status = "closed";
    gamesPage(window.__gameLayoutContext);
  });
  assert.equal(
    await page.locator(".game-own-rating .match-stars b").textContent(),
    "4,1",
  );
  assert.equal(await page.locator(".game-own-rating .match-rating-with-gk").textContent(),"(3,4 com GR)");
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
  console.log(
    "Match editing and game list passed at 1440, 768, 390 and 320px.",
  );
} finally {
  await browser.close();
  server.close();
}
