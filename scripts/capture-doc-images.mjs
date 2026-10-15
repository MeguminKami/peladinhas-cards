import { createServer } from "node:http";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, extname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { seedDocumentation } from "./documentation-fixtures.mjs";
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
  await page.evaluate(seedDocumentation);
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
  await page.evaluate(() => {
    location.hash = "#/statistics";
  });
  await page.locator(".statistics-table tbody tr").first().waitFor();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: resolve(output, "statistics.png"),
    animations: "disabled",
  });
  // Product tour: capture real routes with the isolated documentation league.
  async function openRoute(hash, selector) {
    await page.evaluate((hash) => {
      location.hash = hash;
    }, hash);
    await page.locator(selector).first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo(0, 0));
    if (await page.getByText("Invalid Date", { exact: true }).count()) {
      throw Error("Invalid date in documentation route: " + hash);
    }
  }
  async function captureViewport(name, height = 860) {
    await page.setViewportSize({ width: 1360, height });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: resolve(output, name),
      animations: "disabled",
    });
  }
  async function captureThrough(name, selector) {
    await page.setViewportSize({ width: 1360, height: 960 });
    await page.evaluate(() => scrollTo(0, 0));
    const bottom = await page
      .locator(selector)
      .first()
      .evaluate((el) => el.getBoundingClientRect().bottom);
    await captureViewport(name, Math.ceil(bottom) + 12);
  }
  const cleanCrop = {
    animations: "disabled",
    style: "#header,.bottom-nav{visibility:hidden!important;}",
  };
  await openRoute("#/", ".dashboard-greeting");
  await captureViewport("home-overview.png", 900);
  await page
    .locator(".install-spotlight")
    .screenshot({ ...cleanCrop, path: resolve(output, "installation.png") });
  await openRoute("#/players", "#player-grid .football-card");
  await captureThrough("players.png", "#player-grid .grid-player");
  await openRoute("#/profile", ".player-hero");
  await captureThrough("profile.png", ".player-hero");
  await page
    .locator(".history-grid")
    .screenshot({ ...cleanCrop, path: resolve(output, "card-history.png") });
  await openRoute("#/games", ".game-list .game-row");
  await captureThrough("games.png", "#main .game-list");
  await openRoute("#/game/demo-next", ".team-balance-panel");
  await captureThrough("game-setup.png", ".team-balance-panel");
  await page
    .locator(".team-builder")
    .screenshot({ ...cleanCrop, path: resolve(output, "game-teams.png") });
  await page.locator("#auto-teams").click();
  await page.locator("#auto-selection").waitFor();
  for (const uid of ["tiago", "beatriz", "diogo", "marta"]) {
    await page.locator('[data-auto-player="' + uid + '"]').click();
  }
  await page.locator(".modal").screenshot({
    animations: "disabled",
    path: resolve(output, "team-draw.png"),
  });
  await page.keyboard.press("Escape");
  await openRoute("#/game/demo-game-0", ".score-panel");
  await page
    .locator(".score-panel")
    .screenshot({ ...cleanCrop, path: resolve(output, "game-result.png") });
  await openRoute("#/game/demo-game-0/feedback", ".feedback-workspace");
  await captureThrough("match-feedback.png", ".feedback-review[open]");
  await openRoute("#/missions", ".missions-workspace");
  await captureThrough("missions.png", ".missions-workspace");
  await openRoute("#/events", "#public-event-list a");
  await captureThrough("events.png", "#public-event-list");
  await openRoute("#/admin", ".admin-overview");
  await captureThrough("administration.png", ".admin-overview");
  await openRoute("#/tickets/demo-support", ".ticket-message");
  await captureViewport("support.png", 1000);
  await openRoute("#/notifications", ".notification-view-tabs");
  await captureThrough("notifications.png", "#notification-content");
  await openRoute("#/", ".dashboard-greeting");
  await page.setViewportSize({ width: 414, height: 896 });
  await page.locator("#mobile-more").click();
  await page.locator(".more-menu").waitFor();
  await page.screenshot({
    path: resolve(output, "mobile-menu.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await openRoute("#/games", ".game-list");
  await page.screenshot({
    path: resolve(output, "mobile-games.png"),
    animations: "disabled",
  });
  await openRoute("#/statistics", "#statistics-sort");
  await page.screenshot({
    path: resolve(output, "mobile-statistics.png"),
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
    "Visita visual atualizada: menus, perfis, jogos, equipas, feedback, eventos, apoio, mobile, Card Lab, estatísticas e raridades. Aplicação real, apenas dados de demonstração.",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
