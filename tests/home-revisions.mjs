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
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const options = { headless: true };
if (process.platform === "win32") options.channel = "msedge";
const browser = await chromium.launch(options);
mkdirSync("test-results", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const page = await context.newPage(),
    errors = [];
  await context.clock.install({ time: new Date("2026-10-18T14:00:00Z") });
  page.on("pageerror", (error) => errors.push(error.message));
  await context.addInitScript(() => {
    window.__listeners = new Set();
    window.__versions = ["a", "b"];
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (window.__hidden ? "hidden" : "visible"),
    });
  });
  await context.route("**/js/firebase.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/auth.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8").replace(
        "(await users()).find((u) => u.uid === currentUser.uid)",
        "window.__testState.users.find((u) => u.uid === currentUser.uid)",
      ),
    }),
  );
  await context.route("**/js/db.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body:
        readFileSync("tests/fixtures/db.js", "utf8")
          .replace("'../../js/utils.js'", "'./utils.js'")
          .replace(
            "export const users = async () => {",
            "export const users = async () => { if (!window.__insideApi) window.__leagueLoads = (window.__leagueLoads || 0) + 1;",
          ) +
        `
    export const getHome = async () => {
      window.__homeCalls = (window.__homeCalls || 0) + 1;
      if (window.__homeGate) await window.__homeGate;
      window.__insideApi = true;
      try {
        const {loadLeague} = await import('./data.js');
        const {buildMissions} = await import('./mission-model.js');
        const api = await import('./db.js');
        const league = await loadLeague();
        const user = state.users.find(player => player.uid === 'pedro');
        const missions = await buildMissions(user, league, api);
        return JSON.parse(JSON.stringify({user, missions, league:{cycle:league.cycle,players:league.players,users:league.users,games:league.games.slice(0,3),personalGames:league.games}, versions:[...window.__versions], validUntil:Date.now()+3600000,policyDocument:null}, (key,value) => value?.toDate ? value.toDate().toISOString() : value));
      } finally {window.__insideApi = false; window.__homeCompleted = (window.__homeCompleted || 0) + 1;}
    };
    export const watchHomeSignals = (uid, callback) => {
      window.__listeners.add(callback);
      window.__versions.forEach((version,index) => callback(index,version));
      return () => window.__listeners.delete(callback);
    };
    `,
    }),
  );
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole("heading", { name: "No topo da liga" }).waitFor();
  assert.equal(
    await page.evaluate(() => window.__leagueLoads || 0),
    0,
    "home does not invoke the complete league loader outside its mocked API",
  );
  assert.equal(await page.evaluate(() => window.__homeCalls), 1);
  assert.equal(await page.evaluate(() => window.__listeners.size), 1);
  await context.clock.fastForward(120000);
  assert.equal(
    await page.evaluate(() => window.__homeCalls),
    1,
    "idle visible home has no polling",
  );
  await page.evaluate(() => {
    window.__testState.users.find((user) => user.uid === "pedro").displayName =
      "Pedro Atualizado";
    window.__versions[0] = "changed";
    for (const listener of window.__listeners) {
      listener(0, "changed");
      listener(0, "changed");
    }
  });
  await context.clock.fastForward(900);
  await page
    .getByRole("heading", { name: /Pedro Atualizado/, level: 1 })
    .waitFor();
  assert.equal(await page.evaluate(() => window.__homeCalls), 2);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: `test-results/home-revisions-${width}.png`,
      fullPage: true,
    });
  }
  await page.evaluate(() => {
    window.__hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(await page.evaluate(() => window.__listeners.size), 0);
  await context.clock.fastForward(120000);
  assert.equal(await page.evaluate(() => window.__homeCalls), 2);
  await page.evaluate(() => {
    window.__hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await context.clock.fastForward(1);
  await page.waitForFunction(() => window.__homeCalls === 3);
  await page.waitForFunction(() => window.__listeners.size === 1);
  await page.evaluate(() => (location.hash = "#/players"));
  await page.getByRole("heading", { name: "Jogadores", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__listeners.size), 0);
  assert.ok(
    await page.evaluate(() => window.__leagueLoads > 0),
    "the players destination loads a complete model",
  );
  await page.evaluate(() => (location.hash = "#/"));
  await page.getByRole("heading", { name: "No topo da liga" }).waitFor();
  await page.waitForFunction(() => window.__listeners.size === 1);
  await page.evaluate(() => (location.hash = "#/players"));
  await page.getByRole("heading", { name: "Jogadores", exact: true }).waitFor();
  const beforeSlowHome = await page.evaluate(() => ({
    calls: window.__homeCalls,
    done: window.__homeCompleted,
    loads: window.__leagueLoads,
  }));
  await page.evaluate(() => {
    window.__homeGate = new Promise((resolve) => {
      window.__releaseHome = resolve;
    });
    location.hash = "#/";
  });
  await page.waitForFunction(
    (calls) => window.__homeCalls > calls,
    beforeSlowHome.calls,
  );
  await page.evaluate(() => (location.hash = "#/players"));
  await page.getByRole("heading", { name: "Jogadores", exact: true }).waitFor();
  await page.evaluate(() => {
    window.__releaseHome();
    window.__homeGate = null;
  });
  await page.waitForFunction(
    (done) => window.__homeCompleted > done,
    beforeSlowHome.done,
  );
  await page.evaluate(() => (location.hash = "#/ranking"));
  await page
    .getByRole("heading", { name: "Ranking semanal", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(() => window.__leagueLoads),
    beforeSlowHome.loads,
    "a late home response never replaces a full destination model",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Home revisions: API-only start, reactive updates, no idle polling, hidden unsubscribe, full destination isolation and 1440/768/390/320px passed.",
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
