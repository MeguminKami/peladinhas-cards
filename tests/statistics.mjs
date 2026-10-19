import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root = resolve("."),
  output = "test-results/statistics";
const server = createServer((req, res) => {
  const path = resolve(
      root,
      "." + new URL(req.url, "http://localhost").pathname,
    ),
    file = path === root ? resolve(root, "index.html") : path;
  if (!file.startsWith(root + sep) || !existsSync(file)) {
    res.writeHead(404).end();
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
      ".png": "image/png",
    }[extname(file)] || "application/octet-stream",
  );
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
mkdirSync(output, { recursive: true });
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    serviceWorkers: "block",
    acceptDownloads: true,
  });
  await context.clock.install({ time: new Date("2026-10-19T12:00:00Z") });
  await context.route("**/js/firebase.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/db.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/db.js", "utf8").replaceAll(
        "../../js/utils.js",
        "./utils.js",
      ),
    }),
  );
  await context.route("**/js/auth.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  await context.route(/https:\/\//, (route) => route.abort());
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error(error.message);
  });
  page.setDefaultTimeout(10000);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(() => (location.hash = "#/statistics"));
  await page.locator(".stats-workspace").waitFor();
  await page.evaluate(async () => {
    const { statisticsPage } = await import("./js/statistics.js");
    const names = [
      "Pedro",
      "João Ávila",
      "Ana Maria de Albuquerque e Vasconcelos",
      "Miguel Costa",
      "Carla Silva",
      "André Luís",
      "José Martins",
      "Inês Duarte",
    ];
    const ids = [
      "pedro",
      "joao",
      "ana",
      "miguel",
      "carla",
      "andre",
      "jose",
      "ines",
    ];
    const players = names.map((name, i) => ({
      uid: ids[i],
      username: ids[i],
      displayName: name,
      primaryPosition: ["ALA", "MED", "DEF", "GR"][i % 4],
      hasCard: i !== 7,
      ovr: 78 + i,
      stats: { physical: 75 + i, shooting: 80 + i, passing: 70 + i },
    }));
    const game = (id, date, a, b, score) => ({
      id,
      title:
        id === "g1"
          ? "Peladinha de quinta-feira"
          : "Jogo com nome muito longo · encontro da comunidade",
      status: "closed",
      scheduledAt: date,
      closedAt: date,
      teamA: { starters: a, bench: [] },
      teamB: { starters: b, bench: [] },
      score: { teamA: score[0], teamB: score[1] },
      performance: {
        teamA: { goals: [...a, ...a.slice(0, 2)], assists: a.slice(0, 3) },
        teamB: { goals: b, assists: b.slice(0, 2) },
      },
    });
    const games = [
      game("g1", "2026-10-10T12:00Z", ids.slice(0, 4), ids.slice(4), [8, 5]),
      game("g2", "2026-10-18T12:00Z", ids.slice(4), ids.slice(0, 4), [9, 7]),
    ];
    const summaries = games.map((game, index) => ({
      id: game.id,
      players: Object.fromEntries(
        players.map((player, i) => [
          player.uid,
          {
            overall: 3 + i * 0.15,
            attack: 3 + i * 0.2,
            passing: 3.5 + i * 0.1,
            defense: 2.8 + i * 0.1,
            physical:
              i === 0
                ? index
                  ? 5
                  : 4
                : i === 1
                  ? 3
                  : Math.min(5, 3.5 + i * 0.2),
            attitude: 4 + i * 0.1,
            goalkeeping: i === 3 ? 4.5 : 4,
            goalkeepingEligible: i === 3,
            ratingCounts: {
              overall: 7,
              attack: 7,
              passing: 7,
              defense: 7,
              physical: index === 1 ? 2 : 7,
              attitude: 7,
              goalkeeping: 7,
            },
          },
        ]),
      ),
    }));
    window.__statsFixture = { players, games, summaries };
    window.__renderStats = () =>
      statisticsPage({
        user: { uid: "pedro" },
        league: window.__statsFixture,
        render: (html) => (document.querySelector("#main").innerHTML = html),
      });
    window.__renderStats();
    document.documentElement.dataset.theme = "volt";
  });
  assert.equal(await page.locator(".statistics-table tbody tr").count(), 8);
  await page.locator('[data-stat-preset="ratings"]').click();
  const pedro = page.locator('[data-stat-player="pedro"]');
  assert.match(await pedro.locator(".stat-ratingPhysical").innerText(), /4,50/);
  assert.match(await pedro.locator(".stat-ratingGoalkeeping").innerText(), /—/);
  assert.match(
    await page
      .locator('[data-stat-player="miguel"] .stat-ratingGoalkeeping')
      .innerText(),
    /4,50/,
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 1100 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const theme of ["volt", "club", "champions", "ultimate"]) {
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `${width}/${theme}: page overflow`,
      );
      assert.equal(
        await page.locator(".statistics-table thead").isVisible(),
        true,
      );
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: `${output}/ratings-${width}-${theme}.png`,
        fullPage: true,
      });
    }
    await page.locator('[data-stat-panel="columns"]').click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `${width}: expanded columns overflow`,
    );
    await page
      .locator("#stats-builder")
      .screenshot({ path: `${output}/columns-${width}.png` });
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .locator('[data-stat-panel="columns"]')
        .evaluate((el) => el === document.activeElement),
      true,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate(() => (document.documentElement.dataset.theme = "volt"));
  await page.locator('[data-stat-panel="columns"]').click();
  await page.locator("#stats-column-search").fill("fisico");
  assert.ok((await page.locator("[data-stat-column]").count()) >= 2);
  assert.equal(
    await page.locator('[data-stat-column="ratingPhysical"]').count(),
    1,
  );
  await page.locator('[data-stat-column="cardPhysical"]').check();
  await page
    .locator('[data-stat-move="cardPhysical"][data-delta="-1"]')
    .click();
  await page.locator("[data-stat-close]").last().click();
  assert.ok(
    (await page.locator(".statistics-table thead th").allTextContents()).some(
      (text) => text.includes("Físico") && text.includes("Carta atual"),
    ),
  );
  await page.locator('[data-stat-panel="filters"]').click();
  await page.locator("#stats-add-rule").click();
  await page.locator("#stats-add-rule").click();
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `${width}: filter overflow`,
    );
    await page
      .locator("#stats-builder")
      .screenshot({ path: `${output}/filters-${width}.png` });
  }
  await page
    .getByRole("button", { name: "Aplicar filtros", exact: true })
    .click();
  assert.ok((await page.locator(".statistics-table tbody tr").count()) < 8);
  assert.equal(await page.locator('[data-stat-player="joao"]').count(), 0);
  await page.locator("#stats-search").fill("pedro");
  assert.equal(await page.locator(".statistics-table tbody tr").count(), 1);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#stats-export").click();
  const download = await downloadPromise;
  const csv = readFileSync(await download.path(), "utf8");
  assert.ok(csv.includes("Pedro"));
  assert.ok(csv.includes("Físico · média"));
  assert.ok(!csv.includes("João Ávila"));
  await page.evaluate(() => window.__renderStats());
  assert.equal(await page.locator("#stats-search").inputValue(), "pedro");
  assert.equal(await page.locator(".statistics-table tbody tr").count(), 1);
  await page.locator("#stats-reset").click();
  await page.locator("#stats-search").fill("joao avila");
  assert.equal(await page.locator('[data-stat-player="joao"]').count(), 1);
  await page.locator("#stats-search").fill("nobody");
  assert.match(
    await page.locator("#statistics-table").innerText(),
    /Nenhum jogador/,
  );
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await page.locator('[data-stat-panel="context"]').click();
  await page.locator('[name="period"]').selectOption("custom");
  await page.locator('[name="from"]').fill("2026-10-19");
  await page.locator('[name="to"]').fill("2026-10-01");
  await page.getByRole("button", { name: "Aplicar recorte" }).click();
  assert.match(
    await page.locator("#stats-context-error").innerText(),
    /posterior/,
  );
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `${width}: context overflow`,
    );
    await page
      .locator("#stats-builder")
      .screenshot({ path: `${output}/context-${width}.png` });
  }
  await page.locator('[name="period"]').selectOption("all");
  await page.locator('[name="minVotes"]').selectOption("7");
  await page.getByRole("button", { name: "Aplicar recorte" }).click();
  await page.locator('[data-stat-preset="ratings"]').click();
  assert.match(
    await page
      .locator('[data-stat-player="pedro"] .stat-ratingPhysical')
      .innerText(),
    /4,00/,
  );
  assert.match(
    await page
      .locator('[data-stat-player="pedro"] .stat-ratingPhysical')
      .innerText(),
    /1 jogo/,
  );
  await page.locator('[data-stat-panel="context"]').click();
  await page.locator('[name="gameId"]').selectOption("g2");
  await page.getByRole("button", { name: "Aplicar recorte" }).click();
  assert.match(
    await page
      .locator('[data-stat-player="pedro"] .stat-ratingPhysical')
      .innerText(),
    /—/,
  );
  await page.locator("#stats-reset").click();
  await page.locator("#statistics-sort").selectOption("ovr");
  await page.locator("#statistics-direction").selectOption("asc");
  assert.equal(
    await page.locator("th.stat-ovr").getAttribute("aria-sort"),
    "ascending",
  );
  await page.evaluate(async () => {
    const { STAT_METRICS } = await import("./js/statistics-model.js");
    const key = "peladinhas:statistics:v1:pedro",
      query = JSON.parse(localStorage.getItem(key));
    query.columns = STAT_METRICS.map((metric) => metric.id);
    localStorage.setItem(key, JSON.stringify(query));
    window.__renderStats();
  });
  await page.setViewportSize({ width: 320, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  const scrolled = await page.locator(".stats-scroll").evaluate((el) => {
    el.scrollLeft = 800;
    return el.scrollLeft;
  });
  await page.locator("#statistics-direction").selectOption("desc");
  assert.equal(
    await page.locator(".stats-scroll").evaluate((el) => el.scrollLeft),
    scrolled,
  );
  await page.locator(".stats-scroll").evaluate((el) => {
    el.scrollTop = 200;
  });
  const headerSticky = await page.locator(".stats-scroll").evaluate((el) => {
    const header = el.querySelector("thead th").getBoundingClientRect();
    return Math.abs(header.top - el.getBoundingClientRect().top) < 3;
  });
  assert.equal(headerSticky, true);
  await page.locator("#stats-reset").click();
  await page.evaluate(() => {
    window.__savedSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw Error("Quota unavailable");
    };
    window.__renderStats();
  });
  assert.match(await page.locator("#stats-save-state").innerText(), /sessão/);
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__savedSetItem;
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `${output}/overview-desktop.png`,
    fullPage: true,
  });
  await page.evaluate(() => {
    window.__statsFixture = { players: [], games: [], summaries: [] };
    window.__renderStats();
  });
  assert.match(
    await page.locator("#statistics-table").innerText(),
    /A liga começa/,
  );
  assert.equal(await page.locator("#stats-export").isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log(
    "Statistics explorer: calculations, column search/order, combined filters, dates/sample scope, CSV, persistence, empty states, keyboard, four widths and themes passed.",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
