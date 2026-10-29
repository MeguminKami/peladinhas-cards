import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium, webkit } from "./browser-sandbox.mjs";
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
const output = `test-results/card-choice${isWebKit ? "-webkit" : ""}`;
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
  await context.clock.install({ time: new Date("2026-10-23T12:00:00Z") });
  await page.addInitScript(() => {
    const fixture = sessionStorage.getItem("card-choice-fixture");
    if (fixture) window.__testState = JSON.parse(fixture);
  });
  const reloadFixture = async () => {
    await page.evaluate(() => sessionStorage.setItem("card-choice-fixture", JSON.stringify(window.__testState)));
    await page.reload();
  };
  await page.goto(url);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(seedDocumentation);
  await page.evaluate(() => {
    window.__testState.games = [];
    window.__testState.eventRewards = [];
    location.hash = "#/profile";
  });
  await reloadFixture();
  await page.locator(".attribute-grid").waitFor();
  assert.equal(await page.locator("#choose-weekly-card").count(), 0);
  async function setRewards(count) {
    await page.evaluate((count) => {
      window.__testState.eventRewards = ["mvp", "sniper"]
        .slice(0, count)
        .map((specialId) => ({
          uid: "pedro",
          schemaVersion: 2,
          startsAt: new Date("2026-10-22T12:00Z"),
          createdAt: new Date("2026-10-22T12:00Z"),
          expiresAt: new Date("2026-11-02T12:00Z"),
          reward: {
            mode: "card",
            specialId,
            statDuration: "weekly",
            boosts: {},
          },
        }));
      location.hash = "#/players";
    }, count);
    await page.locator("#player-grid").waitFor();
    await page.evaluate(() => {
      location.hash = "#/profile";
    });
    await reloadFixture();
    await page.locator(".attribute-grid").waitFor();
  }
  await setRewards(1);
  assert.equal(await page.locator("#choose-weekly-card").count(), 1);
  await setRewards(2);
  await page.evaluate(() => { location.hash = "#/"; });
  await reloadFixture();
  await page.locator(".dashboard-card-action").waitFor();
  assert.equal(await page.locator('.dashboard-greeting a[href="#/game/new"]').count(), 0);
  assert.equal(await page.locator(".dashboard-greeting").innerText().then(text => text.includes("Pronto para")), false);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator(".dashboard-greeting").screenshot({ path: `test-results/home-card-action-${width}.png` });
    await page.locator(".dashboard-card-action").click();
    assert.equal(await page.evaluate(() => location.hash), "#/");
    assert.equal(await page.locator("#save-card").evaluate(el => el === document.activeElement), true);
    await page.locator('[data-select-card="sniper"]').click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".card-picker").count(), 0);
    assert.equal(await page.locator(".dashboard-card-action").evaluate(el => el === document.activeElement), true);
    await page.locator(".dashboard-card-action").click();
    assert.equal(await page.locator('[data-select-card="base"]').getAttribute("aria-pressed"), "true");
    for (const theme of ["club", "volt", "champions", "ultimate"]) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const clipped = await page.locator(".card-picker").evaluate(el => el.scrollWidth > el.clientWidth + 1);
      assert.equal(clipped, false);
    }
    await page.evaluate(() => { document.documentElement.dataset.theme = "club"; });
    await page.locator("#cancel-card").click();
  }
  await page.locator(".dashboard-card-action").click();
  await page.locator('[data-select-card="sniper"]').click();
  await page.locator("#save-card").click();
  await page.locator(".card-picker").waitFor({ state: "detached" });
  await page.waitForFunction(() => window.__testState.cardSelections?.some(row => row.selectedCardId === "sniper"));
  assert.equal(await page.evaluate(() => location.hash), "#/");
  await page.evaluate(() => { location.hash = "#/profile"; });
  await page.locator(".attribute-grid").waitFor();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator("#choose-weekly-card").tap();
    assert.equal(await page.locator("[data-select-card]").count(), 3);
    assert.equal(await page.locator('[data-select-card="base"]').count(), 1);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `Choice overflow ${width}`,
    );
    await page.locator(".card-picker").screenshot({ path: `test-results/card-picker-${width}.png` });
    await page.locator('[data-select-card="sniper"]').tap();
    assert.equal(await page.locator('[data-select-card="sniper"]').getAttribute("aria-pressed"), "true");
    await page.locator("#cancel-card").tap();
    assert.equal(await page.locator(".card-picker").count(), 0);
    await page.locator("#choose-weekly-card").tap();
    await page.locator('[data-select-card="sniper"]').tap();
    await page.locator("#save-card").tap();
    await page
      .locator("#modal-root .backdrop")
      .waitFor({ state: "detached" });
    await page.locator(".card-stage .sniper").waitFor();
  }
  await page.evaluate(() => {
    location.hash = "#/players";
  });
  await page.locator('#player-grid .sniper[href="#/player/pedro"]').waitFor();
  await page.evaluate(() => {
    location.hash = "#/player/ana";
  });
  await reloadFixture();
  await page.locator(".attribute-grid").waitFor();
  assert.equal(await page.locator("#choose-weekly-card").count(), 0);
  await context.clock.setSystemTime(new Date("2026-10-28T12:00:00Z"));
  await page.evaluate(() => {
    location.hash = "#/profile";
  });
  await reloadFixture();
  await page.locator(".attribute-grid").waitFor();
  assert.equal(await page.locator("#choose-weekly-card").count(), 1);
  await context.clock.setSystemTime(new Date("2026-11-27T12:00:00Z"));
  await page.evaluate(() => {
    window.__testState.cardCollections = [
      {
        uid: "pedro",
        awards: [
          {
            id: "perfect-five",
            name: "Cinco estrelas",
            themeId: "perfect-five",
            duration: "permanent",
            criterion: "Perfeição na mesma dimensão durante três jogos.",
            earnedAt: "2026-10-23T12:00:00Z",
            expiresAt: null,
          },
        ],
      },
    ];
    location.hash = "#/players";
  });
  await page.locator("#player-grid").waitFor();
  await page.evaluate(() => (location.hash = "#/profile"));
  await page.locator("#choose-weekly-card").tap();
  assert.equal(await page.locator("[data-select-card]").count(), 2);
  assert.equal(await page.locator(".collection-proof").count(), 1);
  await page.locator(".collection-proof summary").click();
  assert.ok(
    (await page.locator(".collection-proof").textContent()).includes(
      "Perfeição na mesma dimensão",
    ),
  );
  await page
    .locator("#modal-root .modal")
    .screenshot({ path: "test-results/card-collection-selector.png" });
  await page.locator('[data-select-card="perfect-five"]').tap();
  await page.locator("#save-card").tap();
  await page.locator(".card-stage .perfect-five").waitFor();
  await page.locator("#choose-weekly-card").tap();
  await page.locator('[data-select-card="base"]').tap();
  await page.locator("#save-card").tap();
  await page.locator(".card-stage .football-card:not(.card-special)").waitFor();
  assert.deepEqual(errors, []);
  console.log(
    `Card choice ${isWebKit ? "WebKit" : "Chromium"}: visibility, owner-only, selection, persistence, closed week and mobile passed.`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
