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
await new Promise((r) => server.listen(5205, "127.0.0.1", r));
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
  await context.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({ body: "<html></html>", contentType: "text/html" }),
  );
  await page.goto("http://127.0.0.1:5205");
  await page.getByRole("heading", { name: "No topo da liga" }).waitFor();
  await page.evaluate(async () => {
    const state = window.__testState;
    const base = state.users[0];
    state.users = Array.from({ length: 12 }, (_, i) => ({
      ...base,
      uid: i ? "player-" + i : "pedro",
      role: i ? "member" : "admin",
      username: "jogador" + i,
      displayName:
        i === 3
          ? "Nome de jogador muito comprido para testar a ficha completa"
          : [
              "Pedro",
              "Carlos Costa",
              "Joao",
              "Martim",
              "Telmo Silva",
              "Capela",
              "Cardas",
              "Vitor Rocha",
              "IMA",
              "J. Ferreira",
              "Rui",
              "Miguel",
            ][i],
      primaryPosition: ["GR", "DEF", "ALA", "MED", "AV"][i % 5],
    }));
    const { ATTRIBUTES } = await import("./js/utils.js");
    state.initialRatings = state.users.map((user) => ({
      uid: user.uid,
      completed: true,
      ratings20: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 15])),
    }));
    const ids = state.users.map((user) => user.uid);
    state.games = [
      {
        id: "postmatch-test",
        title: "Peladinha de quinta",
        status: "closed",
        scheduledAt: "2026-10-15T19:00:00Z",
        closedAt: "2026-10-15T21:00:00Z",
        location: "Campo Municipal",
        notes: "",
        youtubeVideoId: "dQw4w9WgXcQ",
        score: { teamA: 3, teamB: 2 },
        teamA: { starters: ids.slice(0, 5), bench: [ids[10]] },
        teamB: { starters: ids.slice(5, 10), bench: [ids[11]] },
        positions: Object.fromEntries(
          state.users.map((user) => [user.uid, user.primaryPosition]),
        ),
        performance: {
          teamA: { goals: ["pedro", "pedro", ids[1]], assists: [ids[2]] },
          teamB: { goals: [ids[5], ids[6]], assists: [] },
        },
      },
    ];
    state.gameSummaries = [
      {
        id: "postmatch-test",
        players: Object.fromEntries(
          ids
            .slice(0, 10)
            .map((uid) => [uid, { overall: 4.2, attack: 4, defense: 3.8, goalkeeping: 2 }]),
        ),
      },
    ];
    const auth = await import("./js/auth.js");
    await auth.logout();
    await auth.login();
  });
  await page.evaluate(() => (location.hash = "#/game/postmatch-test"));
  await page.locator(".postmatch").waitFor();
  assert.equal(
    await page.locator("#game-form, #auto-teams, .performance-counter").count(),
    0,
  );
  assert.equal(await page.locator(".page-head .postmatch-actions").count(), 1);
  assert.equal(await page.locator(".postmatch .postmatch-actions").count(), 0);
  await page.getByRole("link", { name: "Avaliar jogadores", exact: true }).waitFor();
  assert.equal(await page.locator(".postmatch-player").count(), 12);
  assert.equal(await page.locator(".postmatch-player").first().locator(".postmatch-player-rating .match-stars b").textContent(),"4,0");
  assert.equal(await page.locator(".postmatch-player").first().locator(".match-rating-with-gk").textContent(),"(3,5 com GR)");
  assert.equal(
    await page
      .locator(".postmatch-player")
      .first()
      .locator(".postmatch-player-stats b")
      .first()
      .textContent(),
    "2",
  );
  assert.ok(
    await page
      .locator(".postmatch-score")
      .evaluate(
        (el) =>
          !!(
            el.compareDocumentPosition(
              document.querySelector(".postmatch-teams"),
            ) & Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
  );
  assert.ok(
    await page
      .locator(".postmatch-teams")
      .evaluate(
        (el) =>
          !!(
            el.compareDocumentPosition(document.querySelector(".game-video")) &
            Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    const player = page.locator(".postmatch-player").first();
    const before = await player.boundingBox();
    await player.locator("summary").click();
    assert.equal(
      await player.locator(".match-rating-dimensions").isVisible(),
      true,
    );
    const bounds = await player
      .locator(".match-rating-dimensions")
      .boundingBox();
    const expanded = await player.boundingBox();
    assert.ok(expanded.height > before.height);
    await player.screenshot({ path: `test-results/postmatch-player-expanded-${width}.png` });
    assert.ok(
      bounds.x >= expanded.x &&
        bounds.x + bounds.width <= expanded.x + expanded.width + 1,
    );
    assert.ok(
      bounds.y >= expanded.y &&
        bounds.y + bounds.height <= expanded.y + expanded.height + 1,
    );
    await page.keyboard.press("Escape");
    assert.equal(await player.evaluate((el) => el.open), false);
    await player.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await player.evaluate((el) => el.open), true);
    await player.locator("summary").click();
    assert.equal(await player.evaluate((el) => el.open), false);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/postmatch-${width}.png`,
      fullPage: true,
    });
  }
  // Submitted ratings open directly in edit mode; expired rows stay locked.
  await page.evaluate(() => {
    window.__testState.feedback = [
      { gameId: "postmatch-test", raterId: "pedro", targetId: "player-1", submitted: true, submittedAt: new Date("2026-10-16T10:00:00Z"), ratings: { attack: 4, defense: 4, teamwork: 4, goalkeeping: 3 } },
      { gameId: "postmatch-test", raterId: "pedro", targetId: "player-2", submitted: true, submittedAt: new Date("2026-10-01T10:00:00Z"), ratings: { attack: 4, defense: 4, teamwork: 4, goalkeeping: 3 } },
    ];
    location.hash = "#/games";
  });
  await page.locator(".game-list").waitFor();
  await page.evaluate(() => { location.hash = "#/game/postmatch-test"; });
  const editRatings = page.getByRole("link", { name: "Editar avalia??es", exact: true });
  await editRatings.waitFor();
  await editRatings.click();
  await page.locator('.feedback-form[data-target="player-1"][data-submitted="false"]').waitFor({ state: "attached" });
  assert.equal(await page.locator('.feedback-form[data-target="player-2"]').getAttribute("data-submitted"), "true");
  await page.evaluate(() => { location.hash = "#/game/postmatch-test"; });
  await page.locator(".postmatch").waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Editar jogo", exact: true }).click();
  await page.locator("#game-form").waitFor();
  assert.equal(await page.locator("#auto-teams").count(), 0);
  await page.locator('[name="scoreA"]').fill("4");
  await page.getByRole("button", { name: "Guardar jogo", exact: true }).click();
  await page.locator(".postmatch").waitFor();
  assert.equal(
    await page.locator(".postmatch-score-numbers b").first().textContent(),
    "4",
  );
  assert.equal(
    await page.evaluate(() => window.__testState.games[0].status),
    "closed",
  );
  await page.getByRole("link", { name: "Editar jogo", exact: true }).click();
  await page.locator("#game-form").waitFor();
  await page.locator('[name="scoreA"]').fill("999");
  await page.getByRole("link", { name: "Cancelar", exact: true }).click();
  await page.locator(".postmatch").waitFor();
  assert.equal(
    await page.locator(".postmatch-score-numbers b").first().textContent(),
    "4",
  );
  await page.evaluate(async () => {
    window.__testState.users[0].role = "member";
    const auth = await import("./js/auth.js");
    await auth.logout();
    await auth.login();
  });
  await page.locator(".postmatch").waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Editar jogo", exact: true }).count(),
    0,
  );
  await page.evaluate(() => (location.hash = "#/game/postmatch-test/edit"));
  await page.locator(".postmatch").waitFor();
  assert.equal(await page.locator("#game-form").count(), 0);
  // Maximum scores, missing ratings, an empty roster and no video still form a complete report.
  await page.evaluate(async () => {
    const game = window.__testState.games[0];
    game.score = { teamA: 999, teamB: 999 };
    game.teamA = { starters: [], bench: [] };
    game.teamB = { starters: [], bench: [] };
    game.youtubeVideoId = "";
    const auth = await import("./js/auth.js");
    await auth.logout();
    await auth.login();
  });
  await page.locator(".postmatch").waitFor();
  await page.setViewportSize({ width: 320, height: 1000 });
  assert.equal(await page.locator(".postmatch-player, .game-video").count(), 0);
  assert.equal(
    await page.locator(".postmatch-score-numbers b").first().textContent(),
    "999",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  await page.evaluate(
    () => (document.documentElement.dataset.theme = "ultimate"),
  );
  await page.screenshot({
    path: "test-results/postmatch-empty-light-320.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Postmatch: score, team frames, inline player ratings, four widths, admin save/cancel and member access passed.",
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
