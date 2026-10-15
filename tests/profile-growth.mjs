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
const output = `test-results/profile-growth${isWebKit ? "-webkit" : ""}`;
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
    location.hash = "#/player/pedro";
  });
  await page.locator(".attribute-grid").waitFor();
  const values = await page.locator(".attribute-value b").allTextContents();
  await page.evaluate(async (values) => {
    const { cardWeek } = await import("./js/card-week.js");
    const { ATTRIBUTES } = await import("./js/utils.js");
    const weekId = cardWeek(new Date(+cardWeek().opensAt - 1)).weekId;
    window.__testState.history = [
      {
        uid: "pedro",
        weekId,
        ovr: 60,
        stats: Object.fromEntries(
          ATTRIBUTES.map(([key], i) => [
            key,
            Number(values[i]) + (i === 0 ? -3 : i === 1 ? 2 : 0),
          ]),
        ),
        specials: [],
      },
    ];
    location.hash = "#/players";
  }, values);
  await page.locator("#player-grid").waitFor();
  await page.evaluate(() => {
    location.hash = "#/player/pedro";
  });
  await page.locator(".attribute-grid").waitFor();
  assert.match(
    await page.locator(".attribute-change.is-positive").innerText(),
    /↑\s*\+3/,
  );
  assert.match(
    await page.locator(".attribute-change.is-negative").innerText(),
    /↓\s*−2/,
  );
  assert.equal(await page.locator(".attribute-change.is-neutral").count(), 10);
  const currentWeek = await page.evaluate(async () => {
    const { cardWeek } = await import("./js/card-week.js");
    const weekId = cardWeek().weekId;
    window.__testState.history.push({
      uid: "pedro",
      weekId,
      ovr: 54,
      stats: {},
      locked: false,
      baseCard: "bronze-common",
      specials: [],
    });
    location.hash = "#/players";
    return weekId;
  });
  await page.locator("#player-grid").waitFor();
  await page.evaluate(() => {
    location.hash = "#/player/pedro";
  });
  await page.locator(".attribute-grid").waitFor();
  const liveOvr = parseInt(
    await page.locator(".card-stage .card-rating strong").innerText(),
    10,
  );
  const currentHistoryCard = page.locator(
    `[data-history-week="${currentWeek}"]`,
  );
  assert.equal(
    parseInt(
      await currentHistoryCard.locator(".card-rating strong").innerText(),
      10,
    ),
    liveOvr,
  );
  await currentHistoryCard.click();
  assert.equal(
    parseInt(
      await page
        .locator(".history-card-expanded .card-rating strong")
        .innerText(),
      10,
    ),
    liveOvr,
  );
  await page.locator(".close-modal").click();
  for (const width of [320, 360, 390, 430, 844, 1440]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
    const layout = await page.locator(".attribute-grid").evaluate((grid) => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      cellsFit: [...grid.children].every(
        (cell) => cell.scrollWidth <= cell.clientWidth + 1,
      ),
    }));
    assert.equal(layout.overflow, false, `Page overflow ${width}`);
    assert.equal(layout.cellsFit, true, `Attribute overflow ${width}`);
  }
  for (const route of ["#/", "#/players"]) {
    await page.evaluate((route) => {
      location.hash = route;
    }, route);
    await page
      .locator(route === "#/" ? ".my-card-panel" : "#player-grid")
      .waitFor();
    const currentCard = page.locator(
      route === "#/"
        ? ".my-card-panel .football-card"
        : '#player-grid .football-card[href="#/player/pedro"]',
    );
    assert.equal(
      await currentCard.locator(".card-stat-trend.positive").count(),
      1,
    );
    assert.equal(
      await currentCard.locator(".card-stat-trend.negative").count(),
      1,
    );
    assert.ok(await currentCard.locator(".card-ovr-trend").count());
    assert.ok(
      (
        await currentCard
          .locator(".card-stat-trend, .card-ovr-trend")
          .allTextContents()
      ).every((text) => /^[↑↓]$/.test(text)),
      "Cards outside profiles must only show arrows",
    );
    assert.equal(await page.locator(".weekly-evolution").count(), 0);
    for (const width of [320, 360, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `${route} overflow ${width}`,
      );
      assert.ok(
        await currentCard.locator(".card-stat-trend").evaluateAll((trends) =>
          trends.every((trend) => {
            const box = trend.getBoundingClientRect();
            const card = trend
              .closest(".football-card")
              .getBoundingClientRect();
            return box.left >= card.left && box.right <= card.right;
          }),
        ),
        `${route} trend clipping ${width}`,
      );
    }
    await currentCard.screenshot({
      path: `${output}/${route === "#/" ? "home" : "players"}-growth.png`,
    });
  }
  await page.evaluate(() => {
    window.__testState.history = [];
    location.hash = "#/players";
  });
  await page.locator("#player-grid").waitFor();
  await page.evaluate(() => {
    location.hash = "#/player/pedro";
  });
  await page.locator(".attribute-grid").waitFor();
  assert.equal(
    await page
      .locator(".attribute-change.is-positive, .attribute-change.is-negative")
      .count(),
    0,
  );
  assert.ok(
    (await page.locator(".attribute-change").allTextContents()).every(
      (text) => text === "—",
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    `Profile growth ${isWebKit ? "WebKit" : "Chromium"}: weekly comparison, gains, losses, unchanged, missing history and mobile layouts passed.`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
