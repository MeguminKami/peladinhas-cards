import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium, webkit } from "./browser-sandbox.mjs";
import { seedDocumentation } from "../scripts/documentation-fixtures.mjs";
const root = resolve(".");
const server = createServer((req, res) => {
  const file = resolve(
    root,
    "." + new URL(req.url, "http://localhost").pathname,
  );
  const path = file === root ? resolve(root, "index.html") : file;
  if (!path.startsWith(root + sep) || !existsSync(path)) {
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
      ".woff": "font/woff",
    }[extname(path)] || "application/octet-stream",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const isWebKit = process.argv.includes("--webkit");
const browser = await (isWebKit ? webkit : chromium).launch({
  headless: true,
  ...(!isWebKit && process.platform === "win32" ? { channel: "msedge" } : {}),
});
const output = `test-results/card-lab-lighting${isWebKit ? "-webkit" : ""}`;
mkdirSync(output, { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
    hasTouch: true,
  });
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/db.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/db.js", "utf8").replaceAll(
        "../../js/utils.js",
        "./utils.js",
      ),
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  await context.route(/https:\/\//, (r) => r.abort());
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}`;
  await context.clock.install({ time: new Date("2026-10-23T12:00:00Z") });

  await page.goto(url);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(seedDocumentation);
  await page.evaluate(() => (location.hash = "#/admin/cards"));
  await page.locator(".studio-edition-choice").first().waitFor();
  await page.locator('[data-studio-tab="layers"]').click();
  const lightControls = page.locator("[data-studio-light-adjustments]");
  assert.equal(await lightControls.isVisible(), false);
  await page
    .locator('[data-studio-choice="lighting"][data-value="on"]')
    .click();
  assert.equal(await lightControls.isVisible(), true);
  const adjust = async (key, value) =>
    page
      .locator('[data-studio-property="' + key + '"]')
      .evaluate((el, value) => {
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }, value);
  await adjust("lightIntensity", 80);
  await adjust("lightAngle", 270);
  await adjust("lightSoftness", 40);
  const card = page.locator("#card-preview .football-card");
  assert.equal(await card.locator(".studio-light").count(), 1);
  assert.equal(
    await card
      .locator(".studio-light")
      .evaluate((el) => getComputedStyle(el).opacity),
    "0.8",
  );
  const filter = await card.evaluate((el) => el.style.filter);
  assert.match(filter, /-10px/);
  await page
    .locator('[data-studio-choice="lighting"][data-value="off"]')
    .click();
  assert.equal(await lightControls.isVisible(), false);
  assert.equal(await card.locator(".studio-light").count(), 0);
  await page
    .locator('[data-studio-choice="lighting"][data-value="on"]')
    .click();
  const outline = page
    .locator('[data-studio-panel="layers"] details')
    .filter({ has: page.locator("[data-studio-outline-adjustments]") });
  await outline.locator("summary").click();
  await adjust("borderWidth", 3);
  await adjust("borderInset", 6);
  await adjust("borderOpacity", 45);
  assert.equal(await page.locator('[name="border"]').inputValue(), "single");
  const border = card.locator(".studio-border");
  assert.equal(
    await border.evaluate((el) => getComputedStyle(el).borderTopWidth),
    "3px",
  );
  assert.equal(
    await border.evaluate((el) => getComputedStyle(el).opacity),
    "0.45",
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await outline.scrollIntoViewIfNeeded();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: output + "/outline-" + width + ".png" });
  }
  await page
    .locator('[data-studio-choice="border"][data-value="none"]')
    .click();
  assert.equal(
    await page.locator("[data-studio-outline-adjustments]").isVisible(),
    false,
  );
  await page
    .locator('[data-studio-choice="border"][data-value="single"]')
    .click();
  await page.locator("#save-theme").click();
  await page.waitForFunction(() => window.__testState.cardThemes?.length === 1);
  const saved = await page.evaluate(() => window.__testState.cardThemes[0]);
  assert.equal(saved.design.lighting, "on");
  assert.equal(saved.design.lightAngle, 270);
  assert.equal(saved.design.borderWidth, 3);
  await page.evaluate(async (saved) => {
    const { applyCardTemplate } = await import("/js/card-design.js");
    const { card } = await import("/js/cards.js");
    const wrapper = document.createElement("div");
    wrapper.innerHTML = card(
      { uid: "saved", displayName: "Saved", hasCard: true, ovr: 80, stats: {} },
      { preview: true, theme: saved.baseTheme },
    );
    applyCardTemplate(wrapper.firstElementChild, saved);
    if (wrapper.querySelectorAll(".studio-light").length !== 1)
      throw Error("Missing saved light");
    if (wrapper.firstElementChild.dataset.studioLighting !== "on")
      throw Error("Missing lighting state");
  }, saved);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.deepEqual(errors, []);
  console.log(
    "Lighting on/off, direction, intensity, diffusion, outline width/inset/opacity, saved rendering and four widths passed.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
