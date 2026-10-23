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
await new Promise((resolve) => server.listen(5197, "127.0.0.1", resolve));
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
mkdirSync("test-results/paths", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
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
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  await context.route("**/js/db.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body:
        readFileSync("tests/fixtures/db.js", "utf8")
          .replace("'../../js/utils.js'", "'./utils.js'")
          .replace(
            'displayName: "Pedro"',
            'displayName: "Alexandre João da Conceição"',
          ) +
        `
    import {emptyPathState, createPathOffers, pathNode, settlePathState, rerollPathOffers, unifyPathState} from './path-model.js';
    export const getPath=async()=>window.__pathState ||= {...emptyPathState('pedro'),activePath:'shooting'};
    export const pathAction=async(action, values={})=>{
      if(window.__pathError) throw Error('Sem ligação. Tenta novamente.');
      const current=await getPath();
      if(action==='select') current.selectedNode=values.nodeId;
      if(action==='activate')current.activePath=values.routeId;
      if(action==='unify')window.__pathState=unifyPathState(current,values.routeId);
      if(action==='reroll') window.__pathState=rerollPathOffers(current,pathNode(values.nodeId),new Date(),()=>.9);
      if(action==='offers')current.offers[values.nodeId] ||= createPathOffers(pathNode(values.nodeId),()=>.9);
      if(action==='accept')current.active={id:'ui-attempt',nodeId:values.nodeId,offer:current.offers[values.nodeId].find(x=>x.id===values.offerId),gameId:null,acceptedAt:new Date().toISOString(),waitingReason:'À espera do próximo jogo.'};
      if(action==='abandon')current.active=null;
      return structuredClone(window.__pathState);
    };
  `,
    }),
  );
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error("Browser:", error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") console.error("Console:", message.text());
  });
  await page.goto("http://127.0.0.1:5197/#/missions");
  await page
    .getByRole("heading", { name: "Escolhe o teu caminho!", exact: true })
    .waitFor();
  await page
    .locator(".path-mission-spotlight")
    .screenshot({ path: "test-results/paths/mission-entry.png" });
  await page.locator('a[href^="#/missions/path"]').first().click();
  await page.locator(".path-hero h1").waitFor();
  await page.getByRole("button", { name: "Revelar as três missões" }).click();
  await page.locator(".path-proposal").nth(2).waitFor();
  assert.equal(await page.locator(".path-proposal").count(), 3);
  assert.equal(
    await page.locator(".path-proposal .event-rarity-badge").count(),
    3,
  );
  assert.equal(await page.locator(".path-route-grid").count(), 0);
  await page.locator("[data-path-help]").click();
  await page
    .getByRole("dialog", { name: "O teu jogo. O teu caminho." })
    .waitFor();
  assert.equal(await page.locator(".path-guide li").count(), 5);
  await page
    .locator(".modal")
    .screenshot({ path: "test-results/paths/tutorial.png" });
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .locator("[data-path-help]")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.locator("[data-path-reroll]").click();
  await page.locator("[data-path-reroll]:disabled").waitFor();
  await page.evaluate(() => {
    const offer = window.__pathState.offers["shooting-0-0"][2];
    offer.rarity = "ultimate";
    offer.advance = 200;
  });
  await page.locator("[data-path-refresh]").click();
  assert.equal(
    await page.locator('.path-proposal[data-rarity="ultimate"]').count(),
    1,
  );

  assert.equal(
    await page
      .locator(".path-hero-art .path-art-route")
      .evaluate((element) => getComputedStyle(element).animationName),
    "path-travel",
  );
  await page.waitForFunction(() => !document.querySelector(".toast"));
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/paths/desktop.png",
    fullPage: true,
  });
  assert.equal(await page.locator(".path-map .path-detail").count(), 1);
  assert.equal(await page.locator(".path-playground > .path-detail").count(), 0);
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await page.waitForTimeout(350);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `horizontal overflow at ${width}`,
    );
    const overlap = await page
      .locator(".path-proposal")
      .evaluateAll((items) =>
        items.some(
          (a, i) =>
            i > 0 &&
            a.getBoundingClientRect().top <
              items[i - 1].getBoundingClientRect().bottom,
        ),
      );
    assert.equal(overlap, false);
    if (width === 390) {
      await page.locator(".path-hero-action").click();
      await page.waitForTimeout(450);
      assert.ok(
        await page
          .locator("#path-detail-title")
          .evaluate(
            (element) =>
              element.getBoundingClientRect().top >=
              document.querySelector("#header").getBoundingClientRect().bottom,
          ),
        "sticky navigation must not cover the selected node title",
      );
    }
    await page.screenshot({
      path: `test-results/paths/${width}.png`,
      fullPage: true,
    });
    if (width === 390) {
      await page
        .locator(".path-detail")
        .screenshot({ path: "test-results/paths/mobile-missions.png" });
      await page
        .locator(".path-final-card")
        .screenshot({ path: "test-results/paths/mobile-card.png" });
    }
  }
  await page.getByRole("button", { name: "Escolher missão" }).nth(2).click();
  await page.locator(".path-active").waitFor();
  const activeLines=await page.evaluate(async()=>{
    const {pathObjectiveLines}=await import("/js/path-missions.js");
    return pathObjectiveLines(window.__pathState.active.offer.objective);
  });
  for(const line of activeLines)assert.ok((await page.locator(".path-active").innerText()).includes(line));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator(".path-active").screenshot({ path: `test-results/paths/prepared-${width}.png`, style: "#header, .mobile-nav, .toast { visibility: hidden !important; }" });
  }

  await page.evaluate(() => {
    window.__pathState.nodes["shooting-0-0"] = { progress: 75 };
  });
  await page.locator("[data-path-change]").click();
  await page.locator('[data-path-accept="0"]').click();
  assert.equal(
    await page.evaluate(
      () => window.__pathState.nodes["shooting-0-0"].progress,
    ),
    75,
  );
  await page.locator("[data-path-abandon]").click();
  assert.equal(
    await page.evaluate(
      () => window.__pathState.nodes["shooting-0-0"].progress,
    ),
    75,
  );
  await page.reload();
  // The fixture deliberately keeps state only within this page. Persistence is covered by backend tests.
  await page.locator(".path-hero h1").waitFor();
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await page.locator("[data-path-help]").click();
    assert.ok(
      await page
        .locator(".modal")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    );
    await page.keyboard.press("Escape");
    await page.locator("[data-path-picker]").click();
    assert.ok(
      await page
        .locator(".modal")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    );
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await page.evaluate(() => !!document.activeElement.closest(".modal")),
      true,
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .locator(".close-modal")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page
      .locator(".modal")
      .screenshot({ path: `test-results/paths/chooser-${width}.png` });
    await page.keyboard.press("Escape");
  }
  await page.locator("[data-path-picker]").click();
  await page.locator('[data-picker-route="goalkeeping"]').click();
  assert.match(await page.locator(".path-final-card").innerText(), /nó 25.*100%/);
  assert.equal(await page.locator("[data-path-chapter]").count(), 5);
  await page.locator('[data-path-chapter="4"]').click();
  assert.equal(
    await page.locator('[data-path-node="goalkeeping-24-0"]').count(),
    1,
  );
  await page.locator('[data-path-node="goalkeeping-24-0"]').click();
  await page.locator(".path-locked").waitFor();
  await page.locator("[data-path-picker]").click();
  await page.locator('[data-picker-route="shooting"]').click();
  await page.locator('[data-path-chapter="1"]').click();
  assert.equal(await page.locator(".path-map-row").count(), 5);
  await page.locator('[data-path-node="shooting-9-0"]').click();
  await page.locator(".path-locked").waitFor();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("[data-path-picker]").click();
  await page.locator('[data-picker-route="shooting"]').click();
  assert.equal(
    await page
      .locator(".path-detail")
      .evaluate((element) => getComputedStyle(element).animationName),
    "none",
  );
  for (const theme of ["club", "volt", "champions", "ultimate"]) {
    await page.evaluate(
      (id) => (document.documentElement.dataset.theme = id),
      theme,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `test-results/paths/theme-${theme}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => (location.hash = "#/profile"));
  await page.locator('.profile-actions a[href="#/missions/path"]').waitFor();
  await page.locator('.profile-actions a[href="#/missions/path"]').click();
  await page.locator(".path-hero h1").waitFor();
  await page.getByRole("button", { name: "Revelar as três missões" }).click();
  await page.evaluate(() => (window.__pathError = true));
  await page.locator("[data-path-accept]").first().click();
  await page.locator(".toast.error").waitFor();
  assert.equal(await page.locator(".path-proposal").count(), 3);
  await page.evaluate(() => (window.__pathError = false));
  await page.locator("[data-path-accept]").first().focus();
  await page.keyboard.press("Enter");
  await page.locator(".path-active").waitFor();
  assert.equal(
    await page
      .locator("#path-detail-title")
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await page.evaluate(() => {
    window.__pathState.active = null;
    window.__pathState.nodes["shooting-0-0"] = {
      progress: 100,
      completedAt: "2026-10-18",
    };
    window.__pathState.nodes["shooting-1-0"] = { progress: 0 };
    window.__pathState.lastResult = {
      id: "failure-preview",
      nodeId: "shooting-1-0",
      status: "failure",
      reason: "Faltou 1 golo para atingir a meta.",
      progress: 0,
    };
  });
  await page.locator("[data-path-refresh]").click();
  await page.locator(".path-result.failure").waitFor();
  assert.match(
    await page.locator(".path-result").innerText(),
    /anteriores mantêm-se/,
  );
  await page.screenshot({
    path: "test-results/paths/failure.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    window.__pathState.lastResult = {
      id: "final-preview",
      nodeId: "shooting-9-0",
      status: "success",
      reason: "3 / 3 golos.",
      completed: true,
      progress: 100,
      reward: { specialId: "path-shooting", boosts: { shooting: 1 } },
    };
    window.__pathState.history.push(window.__pathState.lastResult);
  });
  await page.locator("[data-path-refresh]").click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("[data-path-reveal]").click();
  await page
    .locator(".path-celebration .football-card.path-shooting")
    .waitFor();
  assert.equal(
    await page
      .locator(".path-celebration .football-card")
      .evaluate((element) => getComputedStyle(element).animationName),
    "path-reveal",
  );
  await page.waitForTimeout(650);
  await page.screenshot({ path: "test-results/paths/final-card.png" });
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    window.__pathState.active = null;
    window.__pathState.activePath = "shooting";
    window.__pathState.selectedNode = "shooting-1-0";
    window.__pathState.nodes["shooting-4-0"] = {
      progress: 100,
      completedAt: "2026-10-18",
    };
  });
  await page.locator("[data-path-refresh]").click();
  await page.locator(".path-discovery").waitFor();
  assert.match(
    await page.locator(".path-discovery").innerText(),
    /marco 5 em Drible/,
  );
  await page.locator('.path-discovery [data-path-route="dribbling"]').click();
  await page.evaluate(() => {
    window.__pathState.nodes["dribbling-4-0"] = {
      progress: 100,
      completedAt: "2026-10-18",
    };
  });
  await page.locator("[data-path-refresh]").click();
  await page.locator('[data-path-unify="fusion-predator"]').click();
  await page.locator(".path-focus").waitFor();
  assert.equal(await page.locator(".path-focus button").count(), 3);
  assert.equal(await page.locator(".path-map-row").count(), 5);
  await page.locator("[data-path-picker]").click();
  assert.equal(
    await page
      .locator('[data-picker-route="shooting"],[data-picker-route="dribbling"]')
      .count(),
    0,
  );
  assert.equal(
    await page.locator('[data-picker-route="fusion-predator"]').count(),
    1,
  );
  await page.keyboard.press("Escape");
  await page.locator('.path-focus [data-path-route="dribbling"]').click();
  await page.evaluate(() => {
    window.__pathState.nodes["dribbling-0-0"] = { progress: 75 };
    window.__pathState.pending = [
      {
        id: "review-preview",
        nodeId: "dribbling-0-0",
        gameId: "closed-preview",
        frozenAt: new Date().toISOString(),
        windowVersion: 3,
        reviewDeadline: Date.now() + 47 * 3600000,
        ratingCounts: { passing: 6 },
        offer: {
          advance: 150,
          proposalVersion: 3,
          objective: {
            kind: "rating",
            criterion: "passing",
            target: 4,
            minRatings: 7,
          },
        },
      },
    ];
  });
  await page.locator("[data-path-refresh]").click();
  await page.locator(".path-pending-attempt").waitFor();
  assert.match(
    await page.locator(".path-pending-attempt").innerText(),
    /6\/7 votos/,
  );
  assert.match(await page.locator(".path-pending [data-path-deadline]").innerText(), /47h/);
  assert.match(await page.locator(".path-pending-attempt").innerText(), /Entrega antecipada com sete votos por critério e sucesso garantido/);
  await page.waitForFunction(() => !document.querySelector(".toast"));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      JSON.stringify(
        await page.evaluate(() => ({
          width: innerWidth,
          offenders: [...document.querySelectorAll("*")]
            .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
            .slice(0, 15)
            .map((el) => ({
              tag: el.tagName,
              cls: el.className,
              right: el.getBoundingClientRect().right,
              scroll: el.scrollWidth,
            })),
        })),
      ),
    );
    await page
      .locator(".path-pending")
      .evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.evaluate(() => scrollBy(0, -100));
    await page
      .locator(".path-pending")
      .screenshot({ path: `test-results/paths/review-${width}.png` });
  }
  await page.locator('.path-focus [data-path-route="fusion-predator"]').click();
  assert.match(await page.locator(".path-final-card").innerText(), /marco 5 em Finalização e Drible.*5 nós.*100%/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/paths/unified-fusion.png",
    fullPage: true,
  });
  await page.evaluate(async () => {
    const { emptyPathState } = await import("/js/path-model.js");
    window.__pathState = emptyPathState("pedro");
    location.hash = "#/missions";
  });
  await page.locator(".path-mission-spotlight").waitFor();
  await page.locator('.path-mission-spotlight[href^="#/missions/path"]').click();
  await page.locator(".path-workspace").waitFor();
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.locator("[data-path-next-route]").click();
  await page.getByRole("dialog", { name: "Onde queres chegar?" }).waitFor();
  assert.equal(await page.locator(".path-picker-dialog small, .path-picker-reward").count(), 0);
  await page.locator('[data-picker-route="passing"]').click();
  await page.locator('[data-path-activate="passing"]').click();
  assert.equal(
    await page.evaluate(() => window.__pathState.activePath),
    "passing",
  );
  await page.evaluate(async () => {
    const { PATH_CARD_EDITIONS } = await import("/js/path-card-designs.js");
    const { card } = await import("/js/cards.js");
    const { ATTRIBUTES } = await import("/js/utils.js");
    const player = {
      uid: "art-review",
      displayName: "João da Conceição",
      countryCode: "PT",
      country: "Portugal",
      primaryPosition: "ALA",
      hasCard: true,
      ovr: 79,
      stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 79])),
    };
    document.body.innerHTML = `<section class="path-design-review">${Object.entries(
      PATH_CARD_EDITIONS,
    )
      .map(
        ([id, edition]) =>
          `<article>${card(player, { preview: true, theme: id })}<h2>${edition.name}</h2><p>${edition.material}</p></article>`,
      )
      .join("")}</section>`;
  });
  await page.addStyleTag({
    content:
      ".path-design-review{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px;padding:24px;background:#10141b;color:#f4f6fa}.path-design-review article{display:grid;justify-items:center;gap:12px;min-width:0}.path-design-review .football-card{--card-width:175px}.path-design-review h2{font-size:16px;margin:0}.path-design-review p{font-size:12px;line-height:1.6;text-align:center;margin:0;color:#b8c2d2}.path-design-review .football-card{transform:none}",
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page
    .locator(".path-design-review")
    .screenshot({ path: "test-results/paths/reward-cards.png" });
  await page
    .locator(".path-design-review")
    .evaluate((el) => (el.style.filter = "grayscale(1)"));
  await page
    .locator(".path-design-review")
    .screenshot({ path: "test-results/paths/reward-cards-monochrome.png" });
  assert.deepEqual(errors, []);
  console.log(
    "Paths UI: mission/profile entry, single nodes, fusion dependencies, rarity choices, daily reroll, tutorial, active mission, error recovery, keyboard, reduced motion, four widths and all themes passed.",
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
