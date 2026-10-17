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
await new Promise((r) => server.listen(5202, "127.0.0.1", r));
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
  await page.goto("http://127.0.0.1:5202");
  await page.getByRole("heading", { name: "No topo da liga" }).waitFor();
  const seedEvents = [
    {
      id: "cup",
      kind: "event",
      method: "objective",
      title: "Cup",
      objective: { metric: "goals", target: 10 },
    },
    { id: "vote", kind: "monthly", method: "vote", title: "Monthly vote" },
    {
      id: "personal",
      kind: "mission",
      method: "objective",
      title: "O meu primeiro objetivo",
      objective: { metric: "games", target: 3 },
    },
    { id: "future", kind: "future", method: "new", title: "Um novo desafio" },
  ].map((event) => ({
    ...event,
    schemaVersion: 2,
    status: "open",
    rarity: "rare",
    description: "Um objetivo claro para participar na liga.",
    startsAt: "2026-10-01T12:00:00Z",
    endsAt: "2026-12-01T12:00:00Z",
  }));
  await page.evaluate(
    (events) => (window.__testState.events = events),
    seedEvents,
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(async () => {
      const { missionList } = await import("./js/missions.js");
      const entries = [
        ["COMPETITION_OBJECTIVE", "trophy"],
        ["EVENT_VOTE", "vote"],
        ["OBJECTIVE_MISSION", "missions"],
        ["GAME_FEEDBACK", "games"],
        ["RATE_NEW_PLAYER", "players"],
        ["SELF_INITIAL_RATING", "edit"],
        ["FUTURE", "games"],
      ].map(([type, icon], i) => ({
        type,
        icon,
        title: "Desafio " + i,
        description: "Participa e acompanha o teu progresso.",
        done: 2,
        total: 12,
        href: "#/missions/self",
      }));
      document.querySelector("#main").innerHTML = missionList(entries);
    });
    assert.equal(await page.locator(".activity-group").count(), 5);
    assert.equal(
      await page.locator('[data-activity-category="rating"] .mission').count(),
      3,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: `test-results/activity-missions-${width}.png`,
      fullPage: true,
    });

    await page.evaluate(() => (location.hash = "#/events"));
    await page
      .getByRole("heading", { name: "Eventos e desafios", level: 1 })
      .waitFor();
    assert.equal(
      await page.locator("#public-event-list .activity-group").count(),
      4,
    );
    await page.locator("#public-event-type").selectOption("vote");
    assert.equal(await page.locator(".event-public-card").count(), 1);
    await page.locator("#public-event-type").focus();
    assert.equal(
      await page
        .locator("#public-event-type")
        .evaluate((el) => el.matches(":focus-visible")),
      true,
    );
    await page.keyboard.press("Tab");
    await page.locator("#public-event-type").selectOption("");
    await page.screenshot({
      path: `test-results/activity-events-${width}.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.locator("#public-event-search").fill("zzzzzz");
    assert.equal(await page.locator(".activity-group").count(), 0);
    await page
      .getByRole("status")
      .filter({ hasText: "Nenhum desafio" })
      .waitFor();
    // Leave the route so the next width can mount a fresh calendar.
    await page.evaluate(() => (location.hash = "#/ranking"));
    await page
      .getByRole("heading", { name: "Ranking semanal", level: 1 })
      .waitFor();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(async () => {
    const { mountEventAdmin } = await import("./js/event-admin.js");
    const main = document.querySelector("#main");
    main.innerHTML = '<div id="category-admin-test"></div>';
    await mountEventAdmin(
      {
        user: window.__testState.users[0],
        league: { users: window.__testState.users, games: [] },
      },
      main.firstElementChild,
    );
  });
  assert.equal(
    await page.locator("#event-admin-list .activity-group").count(),
    3,
  );
  await page.locator("#missions-tab").click();
  assert.equal(
    await page
      .locator('#event-admin-list [data-activity-category="personal"]')
      .count(),
    1,
  );
  await page.locator("#events-tab").click();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `test-results/activity-admin-${width}.png`, fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log(
    "Activity groups: missions, calendar, category filters, empty state, keyboard, reduced motion and four widths passed.",
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
