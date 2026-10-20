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
const output = `test-results/mobile-event-results${isWebKit ? "-webkit" : ""}`;
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

  await page.goto(url);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(seedDocumentation);
  await page.evaluate(async () => {
    const { managedEventPage } = await import("/js/event-pages.js");
    const { ATTRIBUTES } = await import("/js/utils.js");
    const users = window.__testState.users;
    const event = {
      ...window.__testState.events[0],
      id: "layout",
      method: "objective",
      status: "closed",
      winners: [],
      ranking: users
        .slice(0, 3)
        .map((u, i) => ({
          uid: u.uid,
          position: i + 1,
          progress: 10 - i,
          reward: {
            boosts: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 1])),
            statDuration: "weekly",
          },
        })),
      configuration: { positions: [] },
      title: "Vencedores",
      participantIds: users.map((u) => u.uid),
    };
    await managedEventPage(
      {
        user: { ...users[0], role: "player" },
        league: { users, players: users },
        render: (html) => (document.querySelector("#main").innerHTML = html),
        cleanup: () => {},
      },
      event,
    );
  });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const rows = page.locator(".event-ranking-table tbody tr");
    assert.equal(await rows.count(), 3);
    if (width <= 600) {
      for (const row of await rows.all()) {
        const name = await row.locator("td").nth(1).boundingBox();
        assert.ok(name.width >= 100, JSON.stringify(name));
      }
    }
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page
      .locator("#event-leaderboard")
      .screenshot({ path: output + "/results-" + width + ".png" });
  }
  assert.deepEqual(errors, []);
  console.log(
    "Event rankings: readable player columns and full-width rewards at four viewport widths.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
