import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "./browser-sandbox.mjs";
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
await new Promise((r) => server.listen(5199, "127.0.0.1", r));
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
  await page.goto("http://127.0.0.1:5199");
  await page.getByRole("heading", { name: "No topo da liga" }).waitFor();
  const reads = await page.evaluate(() => window.__userReads);
  const navigate = async (hash, title) => {
    await page.evaluate((hash) => (location.hash = hash), hash);
    await page
      .getByRole("heading", { name: title, exact: true, level: 1 })
      .waitFor();
    assert.equal(await page.locator(".skeleton-head").count(), 0);
  };
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await navigate("#/players", "Jogadores");
    await navigate("#/ranking", "Ranking semanal");
    await navigate("#/missions", "Miss\u00f5es");
    assert.equal(
      await page.evaluate(() => window.__userReads),
      reads,
      "Cached navigation must not reload the league",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }

  // A slow refresh must not prevent navigating with the last good snapshot.
  await page.evaluate(() => {
    window.__dataGate = new Promise(
      (resolve) => (window.__releaseData = resolve),
    );
    window.__maintenanceGate = new Promise(
      (resolve) => (window.__releaseMaintenance = resolve),
    );
  });
  await context.clock.fastForward(301000);
  await navigate("#/players", "Jogadores");
  await page.waitForFunction((reads) => window.__userReads > reads, reads);
  await navigate("#/ranking", "Ranking semanal");
  await navigate("#/profile", "Pedro");
  await page.evaluate(() => {
    window.__releaseData();
    window.__releaseMaintenance();
  });
  await page.waitForTimeout(100);

  // Explicit updates after a write must invalidate profile details and league data.
  await navigate("#/profile/edit", "Editar perfil");
  const beforeWrite = await page.evaluate(() => window.__userReads);
  await page.locator('[name="displayName"]').fill("Pedro Atualizado");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await page
    .getByRole("heading", { name: "Pedro Atualizado", level: 1 })
    .waitFor();
  assert.ok(
    await page.evaluate((before) => window.__userReads > before, beforeWrite),
  );
  await navigate("#/profile/edit", "Editar perfil");
  // An auth change must discard all cached data.
  await page.evaluate(async () => {
    const auth = await import("./js/auth.js");
    await auth.logout();
    await auth.login();
  });
  await page
    .getByRole("heading", { name: "Editar perfil", exact: true })
    .waitFor();
  assert.ok(
    await page.evaluate((before) => window.__userReads > before, beforeWrite),
  );
  // A superseded async destination must never replace the current page.
  await page.evaluate(() => {
    window.__historyGate = new Promise(
      (resolve) => (window.__releaseHistory = resolve),
    );
    location.hash = "#/profile";
  });
  await page.waitForTimeout(50);
  await navigate("#/players", "Jogadores");
  await page.evaluate(() => window.__releaseHistory());
  await page.waitForTimeout(50);
  await page.getByRole("heading", { name: "Jogadores", level: 1 }).waitFor();

  // Failed background reads retain the last valid league snapshot.
  await page.evaluate(() => (window.__fail = true));
  await context.clock.fastForward(31000);
  await navigate("#/ranking", "Ranking semanal");
  await page.waitForTimeout(50);
  await navigate("#/players", "Jogadores");
  await page.evaluate(() => (window.__fail = false));
  assert.deepEqual(errors, []);
  console.log(
    "Navigation: cached routes, slow refresh, nonblocking history, auth reset and 320/390/768/1440px passed.",
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
