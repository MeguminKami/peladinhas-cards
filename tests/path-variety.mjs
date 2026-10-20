import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

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
await new Promise((resolve) => server.listen(5198, "127.0.0.1", resolve));
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
mkdirSync("test-results/path-variety", { recursive: true });
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
          .replace("export const list = async (path) =>", "export const list = async (path) => path === 'pathStates' ? (window.__reviewStates || []) :")
          .replaceAll('"../../js/', '"./').replaceAll("'../../js/", "'./")
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

  await page.goto("http://127.0.0.1:5198/#/missions/path");
  await page.locator(".path-hero h1").waitFor();
  const reopen = async () => {
    await page.evaluate(() => (location.hash = "#/missions"));
    await page.locator(".path-mission-spotlight").waitFor();
    await page.evaluate(() => (location.hash = "#/missions/path"));
    await page.locator(".path-hero h1").waitFor();
  };
  await page.evaluate(async () => {
    const { emptyPathState } = await import("./js/path-model.js");
    const { pathMissionTemplates } = await import("./js/path-missions.js");
    const state = {
      ...emptyPathState("pedro"),
      activePath: "goalkeeping",
      selectedNode: "goalkeeping-0-0",
    };
    state.offers["goalkeeping-0-0"] = ["solid-pass", "next-mean", "next-overall"].map(
      (id, i) => ({
        ...pathMissionTemplates("goalkeeping", 0, i).find(
          (row) => row.templateId === "goalkeeping:" + id,
        ),
        id: String(i),
        difficulty: i,
        advance: [25, 50, 100][i],
        proposalVersion: 4,
        rarity: ["bronze", "silver", "gold"][i],
      }),
    );
    window.__pathState = state;
  });
  await reopen();
  await page
    .locator(".path-proposal .path-mission-conditions")
    .first()
    .waitFor();
  assert.equal(await page.locator(".path-proposal").count(), 3);
  assert.equal(
    await page.locator(".path-proposal").first().locator("li").count(),
    4,
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["club", "volt", "champions", "ultimate"]) {
      await page.evaluate(
        (id) => (document.documentElement.dataset.theme = id),
        theme,
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "page overflow",
      );
      const clipped = await page
        .locator(".path-proposal, .path-mission-conditions")
        .evaluateAll((elements) =>
          elements
            .filter((el) => el.scrollWidth > el.clientWidth + 1)
            .map((el) => el.className),
        );
      assert.deepEqual(clipped, []);
      if (theme === "club")
        await page
          .locator(".path-detail")
          .screenshot({
            path: "test-results/path-variety/offers-" + width + ".png",
          });
    }
  }
  await page.locator("[data-path-accept]").first().focus();
  assert.ok(
    await page
      .locator("[data-path-accept]")
      .first()
      .evaluate(
        (el) =>
          getComputedStyle(el).outlineStyle !== "none" ||
          getComputedStyle(el).boxShadow !== "none",
      ),
  );
  await page.keyboard.press("Enter");
  await page.locator(".path-active .path-mission-conditions").waitFor();
  assert.equal(
    await page.locator(".path-active .path-mission-conditions li").count(),
    4,
  );
  assert.ok(
    await page
      .locator("#path-detail-title")
      .evaluate((el) => el === document.activeElement),
  );
  await page.locator(".toast").waitFor({ state: "hidden" });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: "test-results/path-variety/prepared-" + width + ".png",
      fullPage: true,
    });
  }
  await page.evaluate(() => (location.hash = "#/missions"));
  await page.locator(".path-chosen-brand").waitFor();
  assert.deepEqual(await page.locator(".mission-groups > .activity-group").evaluateAll(groups => groups.slice(0,2).map(group => group.dataset.activityCategory)), ["path", "rating"]);
  assert.equal(await page.locator(".missions-workspace > :last-child a").getAttribute("href"), "#/events");
  assert.ok(await page.locator(".path-chosen-brand").evaluate(el =>
    parseFloat(getComputedStyle(el).fontSize) >= 20 &&
    Number(getComputedStyle(el).fontWeight) >= 800 &&
    el.lastElementChild.tagName.toLowerCase() === "svg"
  ));
  for (const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator(".has-chosen-mission").screenshot({path:`test-results/path-variety/spotlight-title-${width}.png`});
  }
  await page.evaluate(() => (location.hash = "#/missions/path"));
  await page.locator(".path-hero h1").waitFor();
  await page.evaluate(async () => {
    const state = window.__pathState,
      active = state.active;
    state.pending = [
      {
        ...active,
        frozenAt: new Date().toISOString(),
        gameId: "test-game",
        reviewDeadline: Date.now() + 3600000,
        ratingCounts: { goalkeeping: 6, passing: 7 },
      },
    ];
    state.active = null;
  });
  await page.locator("[data-path-refresh]").click();
  await page
    .locator(".path-pending-attempt .path-mission-conditions")
    .waitFor();
  assert.match(await page.locator(".path-vote-counts").innerText(), /6\/7/);
  assert.match(await page.locator(".path-vote-counts").innerText(), /7\/7/);
  assert.ok(
    !(await page.locator(".path-pending-attempt").innerText()).includes(
      "undefined",
    ),
  );
  await page.evaluate(async () => {
    const { emptyPathState } = await import("./js/path-model.js");
    const { pathMissionTemplates } = await import("./js/path-missions.js");
    const state = {
      ...emptyPathState("pedro"),
      activePath: "shooting",
      selectedNode: "shooting-0-0",
    };
    const template = pathMissionTemplates("shooting").find(
      (row) => row.templateId === "shooting:serve",
    );
    state.offers["shooting-0-0"] = [
      {
        ...template,
        id: "0",
        difficulty: 0,
        advance: 25,
        rarity: "bronze",
        proposalVersion: 4,
      },
    ];
    window.__pathState = state;
  });
  await reopen();
  await page.locator(".path-proposal").waitFor();
  assert.ok(
    !(await page.locator(".path-proposal").innerText()).includes("48 horas"),
  );
  await page.evaluate(async () => {
    const { pathAdminPage } = await import("./js/path-admin.js");
    const { pathMissionTemplates } = await import("./js/path-missions.js");
    const offer = pathMissionTemplates("goalkeeping").find((row) => row.templateId === "goalkeeping:solid-pass");
    window.__reviewStates = [{ uid: "pedro", pending: [{ id: "review", offer }], reviews: { review: { gameId: "test-game", nodeId: "goalkeeping-0-0", pending: true } } }];
    await pathAdminPage({ render: (html) => document.querySelector("#main").innerHTML = html, league: { players: [{ uid: "pedro", displayName: "Alexandre Jo\u00e3o da Concei\u00e7\u00e3o" }] } });
  });
  assert.equal(await page.locator(".path-review-mission li").count(), 4);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if ([1440, 320].includes(width)) await page.screenshot({ path: `test-results/path-variety/admin-${width}.png`, fullPage: true });
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "V4 UI passed: conditions, numeric/mixed copy, prepared/pending, per-criterion counts, keyboard, reduced motion, 4 themes and 1440/768/390/320 widths.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
