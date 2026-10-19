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
      ".css": "text/css",
      ".html": "text/html",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
    }[extname(path)] || "application/octet-stream",
  );
  res.end(readFileSync(path));
});
await new Promise((resolve) => server.listen(5225, "127.0.0.1", resolve));
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
mkdirSync("test-results", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.clock.install({ time: new Date("2026-10-16T12:00:00Z") });
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:5225");
  await page.getByRole("heading", { name: "No topo da liga" }).waitFor();
  const navigate = async (hash) => {
    await page.evaluate((value) => (location.hash = value), hash);
    await page.waitForTimeout(250);
    await page.locator("#main h1").first().waitFor();
  };
  await page.evaluate(async () => {
    const { managedEventPage } = await import("./js/event-pages.js");
    const { ATTRIBUTES } = await import("./js/utils.js");
    const state = window.__testState;
    const player = {
      ...state.users[0],
      hasCard: true,
      ovr: 84,
      stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 70])),
    };
    window.__renderDetails = async (mode, mixed = false) => {
      const reward = {
        boosts: mixed
          ? { pace: 2, passing: 1 }
          : Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 1])),
        statDuration: mixed ? "permanent" : "weekly",
        specialId: "in-form",
        cardTheme: { name: "Homem da Noite" },
      };
      const objective = {
        metric:
          mode === "goals"
            ? "goals"
            : mode === "streak"
              ? "ratingStreak"
              : mode === "average"
                ? "ratingAverage"
                : "ratingGames",
        target: mode === "goals" ? 14 : mode === "average" ? 3 : 1,
        threshold: 4.2,
        comparison: mode === "average" ? "gt" : "gte",
        combine: mode === "average" ? "all" : "mean",
        attributes: [
          "overall",
          "attack",
          "passing",
          "defense",
          "physical",
          "attitude",
        ],
        minRatings: 9,
      };
      const event = {
        id: "details-test",
        schemaVersion: 2,
        title: "Missão de avaliação",
        kind: mode === "goals" ? "event" : "mission",
        method:
          mode === "vote" ? "vote" : mode === "admin" ? "admin" : "objective",
        status: "open",
        startsAt: "2026-10-01",
        endsAt: "2026-12-01",
        participantIds: ["pedro", "joao"],
        objective,
        cadence: "once",
        maxRepeats: 1,
        scope: "individual",
        winnerCount: 1,
        winners: [],
        ranking: [],
        progress: [],
        deliveries: [],
        audit: [],
        ballots: [],
        minVotes: 1,
        votesPerUser: 2,
        votingStartsAt: "2026-10-01",
        votingEndsAt: "2026-12-01",
        allowSelfVote: false,
        liveResults: false,
        rarity: "elite",
        configuration: { positions: [reward] },
        rewardPreview: [reward],
      };
      await managedEventPage(
        {
          user: state.users[0],
          league: { users: state.users, players: [player] },
          render: (html) => (document.querySelector("#main").innerHTML = html),
        },
        event,
      );
    };
  });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const mode of [
      "rating",
      "average",
      "streak",
      "goals",
      "vote",
      "admin",
    ]) {
      await page.evaluate((mode) => window.__renderDetails(mode), mode);
      await page.locator(".challenge-rules").waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        mode + "/" + width,
      );
      assert.equal(await page.locator(".reward-all-stats").count(), 2);
      assert.equal(
        await page
          .locator(".event-reward-copy .reward-special-section")
          .count(),
        1,
      );
      if (mode === "rating") {
        assert.equal(await page.locator(".challenge-criteria li").count(), 6);
        assert.equal(
          (await page.locator(".challenge-rules").textContent()).match(
            /Só contam jogos/g,
          ).length,
          1,
        );
        await page.getByText("Condições do objetivo", { exact: true }).click();
        await page.locator(".challenge-conditions").first().focus();
        await page.screenshot({
          path: `test-results/event-details-${width}.png`,
          fullPage: true,
        });
      }
    }
    await page.evaluate(() => window.__renderDetails("rating", true));
    assert.equal(
      await page.locator(".event-reward-copy .reward-stat-list > div").count(),
      2,
    );
    await page
      .locator(".event-reward-copy .reward-stat-section .pill")
      .getByText("Permanente", { exact: true })
      .waitFor();
    await page
      .locator(".event-reward-copy .reward-special-section .pill")
      .getByText("Semanal", { exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "Event details: six objective/method variants, all/mixed rewards, separate duration, configured rewards and 1440/768/390/320px passed.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
