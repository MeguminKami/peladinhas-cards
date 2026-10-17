import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
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
await new Promise((r) => server.listen(5207, "127.0.0.1", r));
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
  page.setDefaultTimeout(10000);
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
      body: readFileSync("tests/fixtures/db.js", "utf8")
        .replace("'../../js/utils.js'", "'./utils.js'")
        .replace(
          "export const users = async () => {",
          `export const users = async () => {
          window.__userReads = (window.__userReads || 0) + 1;
          if (window.__dataGate) await window.__dataGate;`,
        )
        .replace(
          "export const callAdmin = async (name, data) => {",
          `export const callAdmin = async (name, data) => {
          if (name === "ensureHistory") {
            window.__historyCalls = (window.__historyCalls || 0) + 1;
            if (window.__maintenanceGate) await window.__maintenanceGate;
          }`,
        ),
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:5207");
  await page.getByRole("heading", { name: "No topo da liga" }).waitFor();
  const renderPanel = async (empty = false) =>
    page.evaluate(async (empty) => {
      const { homeCardPanel } = await import("./js/home-card.js");
      const { ATTRIBUTES } = await import("./js/utils.js");
      const game = (id, status, date, a, b) => ({
        id,
        title: "Peladinha " + id,
        status,
        scheduledAt: date,
        closedAt: status === "closed" ? date : null,
        teamA: { starters: ["pedro"], bench: [] },
        teamB: { starters: ["joao"], bench: [] },
        score: { teamA: a, teamB: b },
        performance: { teamA: { goals: ["pedro"], assists: [] } },
      });
      const games = [
        game("vitoria", "closed", "2026-10-14T20:00Z", 3, 1),
        game("empate", "closed", "2026-10-12T20:00Z", 2, 2),
        game("derrota", "closed", "2026-10-10T20:00Z", 1, 2),
        game("proximo", "open", "2026-10-20T20:00Z", 0, 0),
      ];
      games[3].title =
        "Proximo jogo com um nome muito comprido para validar a quebra";
      games[3].location = "Campo Municipal";
      const unrelated = game("unrelated", "open", "2026-10-17T20:00Z", 0, 0);
      unrelated.teamA.starters = ["other"];
      games.push(unrelated);
      const me = {
        ...window.__testState.users[0],
        hasCard: !empty,
        ovr: 83,
        ovrDelta: empty ? null : 2,
        stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 83])),
        communityCount: 2,
        aggregates: empty ? [] : [{ overall: 4.2 }],
        matchStats: {
          played: empty ? 0 : 3,
          wins: 1,
          goals: 3,
          assists: 0,
          winRate: 33,
        },
      };
      document.querySelector(".my-card-panel").outerHTML = homeCardPanel(me, {
        games: empty ? [] : games,
      });
    }, empty);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await renderPanel();
    assert.equal(await page.locator(".my-card-match").count(), 3);
    assert.deepEqual(await page.locator(".my-card-outcome").allTextContents(), [
      "V",
      "E",
      "D",
    ]);
    assert.equal(await page.locator(".my-card-next").count(), 0);
    assert.match(await page.locator(".my-card-status").textContent(), /2\/3/);
    await page.locator(".my-card-match").first().focus();
    assert.equal(
      await page
        .locator(".my-card-match")
        .first()
        .evaluate((el) => el.matches(":focus-visible")),
      true,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await page
      .locator(".my-card-panel")
      .screenshot({ path: `test-results/home-card-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const originalMissions = await page
    .locator(".dashboard-missions .mission-list")
    .innerHTML();
  for (const count of [0, 1, 4, 8]) {
    await page
      .locator(".dashboard-missions .mission-list")
      .evaluate((list, count) => {
        const mission =
          list.querySelector(".mission")?.outerHTML || window.__heightMission;
        window.__heightMission = mission;
        list.innerHTML = Array(count).fill(mission).join("");
      }, count);
    const panels = await page
      .locator(".dashboard-columns > .panel")
      .evaluateAll((items) =>
        items.map((el) => ({
          height: el.getBoundingClientRect().height,
          bottom: el.getBoundingClientRect().bottom,
        })),
      );
    assert.equal(panels.length, 2);
    assert.ok(
      Math.abs(panels[0].height - panels[1].height) < 1,
      JSON.stringify({ count, panels }),
    );
    assert.ok(Math.abs(panels[0].bottom - panels[1].bottom) < 1);
  }
  await page
    .locator(".dashboard-missions .mission-list")
    .evaluate((el, html) => (el.innerHTML = html), originalMissions);
  await page
    .locator(".dashboard-columns")
    .screenshot({ path: "test-results/home-panels-equal-desktop.png" });
  await renderPanel(true);
  assert.equal(await page.locator(".my-card-match").count(), 0);
  assert.equal(
    await page.locator('.my-card-actions a[href="#/missions/self"]').count(),
    1,
  );
  await page
    .locator(".my-card-panel")
    .screenshot({ path: "test-results/home-card-empty-320.png" });
  assert.deepEqual(errors, []);
  console.log(
    "Home card: form, results, qualification, empty state, keyboard and four widths passed.",
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
