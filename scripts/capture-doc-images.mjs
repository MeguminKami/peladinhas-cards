import { createServer } from "node:http";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, extname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "docs/media");
mkdirSync(output, { recursive: true });
const server = createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const path = resolve(
    root,
    "." + (pathname === "/" ? "/index.html" : pathname),
  );
  const rel = relative(root, path);
  if (
    rel.startsWith("..") ||
    ![
      "index.html",
      "offline.html",
      "manifest.webmanifest",
      "sw.js",
      "js",
      "css",
      "assets",
    ].includes(rel.split(sep)[0]) ||
    !existsSync(path)
  ) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".webp": "image/webp",
      ".woff": "font/woff",
    }[extname(path)] || "text/plain",
  );
  res.end(readFileSync(path));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1360, height: 960 },
    serviceWorkers: "block",
  });
  await context.route("**/js/firebase.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/db.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: readFileSync(
        resolve(root, "tests/fixtures/db.js"),
        "utf8",
      ).replaceAll("../../js/utils.js", "./utils.js"),
    }),
  );
  await context.route("**/js/auth.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: readFileSync(resolve(root, "tests/fixtures/auth.js"), "utf8"),
    }),
  );
  // No real Firebase/network calls, even if a fixture stops covering a new feature.
  await context.route(/https:\/\//, (route) => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(async () => {
    const state = window.__testState;
    const {
      ATTRIBUTES,
      calculateInitialBaseline,
      calculatePlayerStats,
      calculateOverall,
      calculateBaseCard,
    } = await import("./js/utils.js");
    const { cardWeek } = await import("./js/card-week.js");
    const template = state.users[1];
    state.users[0].displayName = "Pedro Silva";
    state.users[1].displayName = "João Fernandes";
    state.users.push(
      ...["Miguel Costa", "Ana Rodrigues", "Rui Martins"].map(
        (displayName, index) => ({
          ...template,
          displayName,
          username: `demo-${index}`,
          uid: `demo-${index}`,
        }),
      ),
    );
    state.initialRatings = state.users.slice(0, 2).map((u, index) => ({
      uid: u.uid,
      completed: true,
      ratings20: Object.fromEntries(
        ATTRIBUTES.map(([key]) => [key, 16 - index]),
      ),
    }));
    const now = Date.now();
    state.games = Array.from({ length: 3 }, (_, index) => ({
      id: `demo-game-${index}`,
      title: "Peladinha da comunidade",
      status: "closed",
      scheduledAt: new Date(now - (index + 1) * 86400000).toISOString(),
      closedAt: new Date(now - (index + 1) * 86400000).toISOString(),
      teamA: { starters: ["pedro"], bench: [] },
      teamB: { starters: ["joao"], bench: [] },
      score: { teamA: 5, teamB: index === 1 ? 5 : 3 },
      performance: {
        teamA: { goals: ["pedro"], assists: ["pedro"] },
        teamB: { goals: ["joao"], assists: [] },
      },
    }));
    state.gameSummaries = state.games.map((game) => ({
      id: game.id,
      players: {
        pedro: { overall: 4.2, passing: 4.3, count: 3 },
        joao: { overall: 4.0, passing: 4.1, count: 3 },
      },
    }));
    state.weeklyCards = state.users.slice(0, 2).map((u) => {
      const initial = state.initialRatings.find(
        (r) => r.uid === u.uid,
      ).ratings20;
      const stats = calculatePlayerStats(calculateInitialBaseline(initial), []),
        ovr = calculateOverall(stats);
      return {
        id: u.uid,
        uid: u.uid,
        weekId: cardWeek().weekId,
        stats,
        ovr,
        baseCard: calculateBaseCard(ovr),
        specials: [],
        official: false,
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
  await page.locator("#player-grid").waitFor();
  await page.evaluate(() => {
    location.hash = "#/";
  });
  await page.locator(".my-card-actions").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".dashboard-columns").screenshot({
    path: resolve(output, "dashboard.png"),
    animations: "disabled",
    style: "#header,.mobile-nav{visibility:hidden!important;}",
  });
  await page.setViewportSize({ width: 414, height: 896 });
  await page.locator(".my-card-panel").scrollIntoViewIfNeeded();
  await page.evaluate(() =>
    scrollTo(
      0,
      document.querySelector(".my-card-panel").getBoundingClientRect().top +
        scrollY -
        88,
    ),
  );
  await page.screenshot({
    path: resolve(output, "mobile.png"),
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1360, height: 960 });
  await page.evaluate(() => {
    location.hash = "#/admin/cards";
  });
  await page.locator(".lab-preview").waitFor();
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() =>
    scrollTo(
      0,
      document.querySelector(".studio-layout").getBoundingClientRect().top +
        scrollY -
        96,
    ),
  );
  await page.screenshot({
    path: resolve(output, "card-lab.png"),
    animations: "disabled",
  });
  const gallery = await context.newPage();
  await gallery.goto(url);
  await gallery.locator(".dashboard-greeting").waitFor();
  await gallery.evaluate(async () => {
    const { card, bindImages } = await import("./js/cards.js");
    const { ATTRIBUTES, THEMES } = await import("./js/utils.js");
    document.body.innerHTML = `<div id="readme-gallery" style="display:grid;grid-template-columns:repeat(6,1fr);gap:24px;padding:36px;background:#080b10">${THEMES.slice(
      0,
      6,
    )
      .map(
        (theme, index) =>
          `<div style="text-align:center">${card({ uid: `gallery-${index}`, hasCard: true, displayName: ["Rui Martins", "João Fernandes", "Ana Rodrigues", "Pedro Silva", "Miguel Costa", "Inês Santos"][index], primaryPosition: "MED", countryCode: "PT", stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 60 + index * 6])), ovr: 60 + index * 6, specials: [] }, { theme, size: "sm", preview: true })}<p style="margin:18px 0 0;font-size:12px;color:#aebacb">${theme.replace("bronze", "Bronze").replace("silver", "Prata").replace("gold", "Ouro").replace("-common", " comum").replace("-rare", " rara")}</p></div>`,
      )
      .join("")}</div>`;
    document
      .querySelectorAll(".football-card")
      .forEach((card) => card.style.setProperty("--card-width", "190px"));
    bindImages();
    await document.fonts.ready;
  });
  await gallery.locator("#readme-gallery").screenshot({
    path: resolve(output, "card-rarities.png"),
    animations: "disabled",
  });
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "Imagens atualizadas: dashboard, mobile, Card Lab e raridades. Aplicação real, apenas dados de demonstração.",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
