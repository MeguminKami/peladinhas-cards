import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { chromium, webkit } from "playwright";
const root = resolve(".");
const server = createServer((req, res) => {
  const path = resolve(
    root,
    decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "") ||
      "index.html",
  );
  if (!path.startsWith(root + sep) || !existsSync(path)) {
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
      ".png": "image/png",
      ".webp": "image/webp",
      ".webmanifest": "application/manifest+json",
    }[extname(path)] || "text/plain",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(5190, "127.0.0.1", r));
const isWebKit = process.argv.includes("--webkit");
const browser = await (isWebKit ? webkit : chromium).launch({
  headless: true,
  ...(!isWebKit && process.platform === "win32" ? { channel: "msedge" } : {}),
});
const output = `test-results/review${isWebKit ? "-webkit" : ""}`;
mkdirSync(output, { recursive: true });
const issues = [],
  errors = [];
try {
  const context = await browser.newContext({ serviceWorkers: "block" });
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
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5190");
  await page.locator(".dashboard-greeting").waitFor();
  // An open cycle and a populated plantel expose card geometry and long names too.
  await page.evaluate(async () => {
    const state = window.__testState;
    for (const [uid, displayName, value] of [
      ["joao", "João Fernandes", 15],
      ["miguel", "Miguel Costa", 14],
      ["ana", "Ana Maria Rodrigues", 17],
    ]) {
      if (!state.users.some((u) => u.uid === uid))
        state.users.push({
          ...state.users[1],
          uid,
          username: uid,
          displayName,
        });
      else state.users.find((u) => u.uid === uid).displayName = displayName;
      state.initialRatings.push({
        uid,
        completed: true,
        ratings20: Object.fromEntries(
          Object.keys(state.initialRatings[0].ratings20).map((k) => [k, value]),
        ),
      });
    }
    const { cardWeek } = await import("./js/card-week.js");
    const {
      calculateInitialBaseline,
      calculatePlayerStats,
      calculateOverall,
      calculateBaseCard,
    } = await import("./js/utils.js");
    state.weeklyCards = state.users.map((u) => {
      const initial = state.initialRatings.find(
        (r) => r.uid === u.uid,
      ).ratings20;
      const stats = calculatePlayerStats(calculateInitialBaseline(initial), []);
      const ovr = calculateOverall(stats);
      return {
        id: u.uid,
        uid: u.uid,
        weekId: cardWeek().weekId,
        stats,
        ovr,
        baseCard: calculateBaseCard(ovr),
        specials: [],
        official: true,
        appearance: {
          displayName: u.displayName,
          countryCode: "PT",
          country: "Portugal",
          primaryPosition: "ALA",
        },
      };
    });
    location.hash = "#/players";
  });
  await page.locator(".card-grid").waitFor();
  const routes = [
    "/",
    "/players",
    "/games",
    "/game/new",
    "/missions",
    "/events",
    "/ranking",
    "/statistics",
    "/notifications",
    "/tickets",
    "/tickets/new",
    "/profile",
    "/profile/edit",
    "/admin",
    "/admin/players",
    "/admin/games",
    "/admin/events",
    "/admin/weights",
    "/admin/messages",
    "/admin/maintenance",
    "/admin/support",
    "/admin/ratings",
    "/admin/ovr/pedro",
    "/admin/card-types",
    "/admin/card-photo/pedro",
    "/admin/cards",
    "/assets",
  ];
  for (const [width, height] of [
    [1440, 900],
    [1024, 900],
    [768, 900],
    [430, 900],
    [390, 844],
    [360, 800],
    [320, 568],
    [932, 430],
    [844, 390],
    [780, 360],
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      await page.evaluate((h) => {
        location.hash = h;
      }, "#" + route);
      await page.waitForFunction(
        () =>
          !document.querySelector(".skeleton-head") &&
          document.querySelector("#main")?.textContent.trim(),
      );
      await page.waitForTimeout(90);
      const findings = await page.evaluate(() => {
        const results = [];
        if (document.documentElement.scrollWidth > innerWidth + 1)
          results.push("horizontal overflow");
        for (const tile of document.querySelectorAll(".podium-place")) {
          const card = tile.querySelector(".football-card");
          if (
            card &&
            tile.getBoundingClientRect().width + 1 <
              card.getBoundingClientRect().width
          )
            results.push("podium track clips its card");
        }
        for (const el of document.querySelectorAll(
          "#main input,#main select,#main textarea,#main .btn,.bottom-nav a,.bottom-nav button",
        )) {
          if (!el.getClientRects().length || el.closest("[hidden]")) continue;
          const r = el.getBoundingClientRect();
          if (
            r.width > 0 &&
            (r.left < -1 || r.right > innerWidth + 1) &&
            !el.closest(".table-wrap,.admin-area-nav")
          )
            results.push(
              "outside: " +
                (el.id || el.name || el.textContent.trim().slice(0, 40)),
            );
        }
        return results;
      });
      if (findings.length) issues.push({ width, route, findings });
      if (route === "/") {
        const bottomGap = await page
          .locator(".my-card-panel")
          .evaluate((panel) => {
            const action = panel.querySelector(".my-card-actions");
            return (
              panel.getBoundingClientRect().bottom -
              action.getBoundingClientRect().bottom
            );
          });
        if (bottomGap > 40)
          issues.push({
            width,
            route,
            findings: [`Card panel has ${bottomGap}px of unused bottom space`],
          });
        if ([1440, 390, 320].includes(width))
          await page
            .locator(".my-card-panel")
            .screenshot({ path: `${output}/${width}-my-card.png` });
      }
      if ([1440, 390].includes(width))
        await page.screenshot({
          path: `test-results/review${isWebKit ? "-webkit" : ""}/${width}-${route.replaceAll("/", "_")}.png`,
          fullPage: true,
        });
    }
    console.log("Reviewed", width);
  }
  await page.locator("#mobile-more").click();
  await page.locator('.more-menu a[href="#/statistics"]').click();
  await page.locator("#statistics-sort").waitFor();
  await page.locator("#statistics-sort").selectOption("ovr");
  await page.locator("#statistics-direction").selectOption("asc");
  if (
    (await page
      .locator('.statistics-table .stat-ovr[aria-sort="ascending"]')
      .count()) !== 1
  )
    issues.push("mobile sort not synchronized");
  await page.locator("#theme-picker").click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  if (await page.locator("#header").evaluate((el) => el.inert))
    issues.push("modal did not restore background");
  const confirmation = await page.evaluate(async () => {
    const { confirmDialog } = await import("./js/ui.js");
    window.__confirmation = confirmDialog("Teste de cancelamento");
    return true;
  });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  if ((await page.evaluate(() => window.__confirmation)) !== false)
    issues.push("Escape confirmation unresolved");
  await page.evaluate(() => {
    location.hash = "#/players";
  });
  await page.locator("#search").waitFor();
  await page.locator("#search").fill("joao");
  if ((await page.locator("#player-grid .football-card").count()) !== 1)
    issues.push("accent-insensitive search failed");
  await page.locator("#player-grid .football-card").click();
  await page.locator(".player-hero").waitFor();
  await page.evaluate(() => {
    location.hash = "#/players";
  });
  await page.locator("#search").waitFor();
  if ((await page.locator("#search").inputValue()) !== "joao")
    issues.push("player filter lost on return");
  await page.locator("#search").fill("");
  await page.evaluate(() => {
    window.__historyGate = new Promise((resolve) => {
      window.__releaseHistory = resolve;
    });
    location.hash = "#/profile";
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    location.hash = "#/games";
  });
  await page
    .getByRole("heading", { name: "Jogos", exact: true, level: 1 })
    .waitFor();
  await page.evaluate(() => {
    window.__releaseHistory();
    delete window.__historyGate;
  });
  await page.waitForTimeout(200);
  if ((await page.locator("#main h1").textContent()) !== "Jogos")
    issues.push("slow response replaced current route");
  await page.evaluate(() => {
    location.hash = "#/";
  });
  await page.locator(".my-card-actions").waitFor();
  await page.locator(".my-card-actions a").click();
  await page.locator("#statistics-sort").waitFor();
  if (await page.evaluate(() => location.hash !== "#/statistics"))
    issues.push("my card statistics action did not open league statistics");
  // Reproduce the home composition with one competition and four objective missions.
  await page.evaluate(() => {
    const state = window.__testState;
    state.users = state.users.filter((u) => u.uid === "pedro");
    state.games = [];
    state.events = [
      "Djabugoleador",
      "Vitorioso #1",
      "Participação absoluta #1",
      "Goleador #1",
      "És o Modrić #1",
    ].map((title, index) => ({
      id: `balance-${index}`,
      schemaVersion: 2,
      title,
      status: "open",
      kind: index ? "mission" : "event",
      method: "objective",
      participantIds: ["pedro"],
      startsAt: new Date(Date.now() - 86400000).toISOString(),
      indefinite: true,
      endsAt: null,
      cadence: "once",
      maxRepeats: 1,
      scope: "individual",
      difficulty: "easy",
      objective: {
        metric:
          index === 1
            ? "wins"
            : index === 2
              ? "games"
              : index === 4
                ? "assists"
                : "goals",
        target: index + 3,
      },
      prerequisites: { missionIds: [], mode: "all" },
      progress: [{ uid: "pedro", progress: 0 }],
    }));
    document.documentElement.dataset.theme = "volt";
    location.hash = "#/";
  });
  await page.locator(".dashboard-missions .mission-competition").waitFor();
  if ((await page.locator(".dashboard-missions .mission").count()) !== 4)
    issues.push("home mission preview should contain four entries");
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => ({
      difference: Math.abs(
        document.querySelector(".my-card-panel").getBoundingClientRect()
          .height -
          document.querySelector(".dashboard-missions").getBoundingClientRect()
            .height,
      ),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    }));
    if (width > 800 && geometry.difference > 8)
      issues.push({ width, missionPanelHeightDifference: geometry.difference });
    if (geometry.overflow) issues.push({ width, missionPreviewOverflow: true });
    await page
      .locator(".dashboard-columns")
      .screenshot({
        path: `${output}/${width}-dashboard-balanced.png`,
        style: "#header,.mobile-nav{visibility:hidden!important;}",
      });
  }
  await page.locator(".dashboard-missions .missions-toolbar a").click();
  await page.locator(".missions-workspace .mission-groups").waitFor();
  if ((await page.locator(".missions-workspace .mission").count()) !== 5)
    issues.push("full missions page lost a mission from the home preview");
  console.log(JSON.stringify({ issues, errors }));
  writeFileSync(
    `${output}/results.json`,
    JSON.stringify({ issues, errors }, null, 2),
  );
  if (issues.length || errors.length) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
