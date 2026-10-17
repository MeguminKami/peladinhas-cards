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
const output = `test-results/goalkeeper-ui${isWebKit ? "-webkit" : ""}`;
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
    const { feedbackPage } = await import("/js/ratings.js");
    const state = window.__testState;
    await feedbackPage(
      {
        user: state.users.find((u) => u.uid === "pedro"),
        league: {
          games: state.games,
          users: state.users,
          summaries: [
            {
              id: "demo-game-0",
              players: { ana: { goalkeepingEligible: false } },
            },
          ],
        },
        render: (html) => (document.querySelector("#main").innerHTML = html),
        cleanup: () => {},
        refresh: async () => {},
      },
      "demo-game-0",
    );
  });
  const field = page.locator(
    '[data-target="ana"] [data-dimension="goalkeeping"]',
  );
  assert.equal(await field.locator("[data-rating]").inputValue(), "na");
  assert.equal(await field.locator('input[type="radio"]:enabled').count(), 0);
  assert.match(await field.innerText(), /autoavalia/);
  assert.ok(
    (await page
      .locator(
        '[data-target="ana"] [data-dimension="overall"] input[type="radio"]:enabled',
      )
      .count()) > 0,
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await field.screenshot({ path: output + "/blocked-" + width + ".png" });
  }
  assert.deepEqual(errors, []);
  console.log(
    "Goalkeeper UI: forced N/A, disabled stars, explanatory label, other criteria editable and four widths passed.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
