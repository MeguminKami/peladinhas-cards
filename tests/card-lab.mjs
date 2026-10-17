import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
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
const output = `test-results/card-lab${isWebKit ? "-webkit" : ""}`;
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
  const catalog = await import("../js/utils.js");
  assert.equal(
    await page.locator("[data-studio-edition]").count(),
    catalog.CATALOG_THEMES.length + 1,
  );
  assert.equal(await page.locator("[data-studio-palette]").count(), 50);
  assert.equal(await page.locator("[data-studio-palette] i").count(), 250);
  await page.locator('[data-studio-tab="colors"]').click();
  await page.locator('[data-studio-palette="gold"]').click();
  assert.equal(
    await page.locator('[name="background"]').inputValue(),
    "diagonal",
  );
  assert.match(
    await page
      .locator("#card-preview .card-surface")
      .evaluate((el) => getComputedStyle(el).backgroundImage),
    /linear-gradient/,
  );
  await page.locator('[data-studio-tab="models"]').click();
  assert.equal(await page.locator('[data-studio-tab="data"]').count(), 0);
  for (const id of catalog.CATALOG_THEMES) {
    await page.locator('[data-studio-edition="' + id + '"]').click();
    assert.equal(
      await page.locator('[name="preserveOriginal"]').inputValue(),
      "yes",
    );
    assert.equal(await page.locator("#card-preview .lab-designed").count(), 0);
  }
  await page.locator('[data-studio-edition="toty"]').click();
  await page.locator("#save-theme").click();
  await page.waitForFunction(() => window.__testState.cardThemes?.length === 1);
  const native = await page.evaluate(() => window.__testState.cardThemes[0]);
  assert.equal(native.baseTheme, "toty");
  assert.equal(native.design.preserveOriginal, "yes");
  assert.equal(
    await page.evaluate(async () => {
      const { applyCardTemplate } = await import("/js/card-design.js");
      const original = document.querySelector("#card-preview .football-card");
      const clone = original.cloneNode(true),
        before = clone.outerHTML;
      applyCardTemplate(clone, window.__testState.cardThemes[0]);
      return before === clone.outerHTML;
    }),
    true,
  );
  await page.locator('[data-studio-tab="composition"]').click();
  await page.locator('[data-studio-property="nameY"]').fill("63");
  await page.locator('[data-studio-property="nameY"]').dispatchEvent("input");
  assert.equal(
    await page
      .locator("#card-preview .card-caption")
      .evaluate((el) => el.style.top),
    "63%",
  );
  await page.locator("#lab-undo").click();
  assert.equal(
    await page.locator('[name="preserveOriginal"]').inputValue(),
    "yes",
  );
  await page.locator("#lab-redo").click();
  await page.locator('[data-studio-tab="layers"]').click();
  await page
    .locator('[data-studio-panel="layers"] summary')
    .filter({ hasText: "Acabamento" })
    .click();
  await page
    .locator('[data-studio-choice="effect"][data-value="holographic"]')
    .click();
  assert.equal(
    await page
      .locator("#card-preview .football-card")
      .getAttribute("data-studio-effect"),
    "holographic",
  );
  await page.locator('[data-studio-tab="symbols"]').click();
  await page
    .locator('[data-studio-choice="symbol"][data-value="sniper"]')
    .click();
  assert.equal(await page.locator("#card-preview .studio-symbol").count(), 1);
  await page.locator("#save-theme").click();
  await page.waitForFunction(
    () => window.__testState.cardThemes?.[0]?.design.symbol === "sniper",
  );
  await page.clock.runFor(6500);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    for (const tab of [
      "models",
      "composition",
      "colors",
      "layers",
      "symbols",
      "text",
      "photo",
      "projects",
    ]) {
      await page.locator('[data-studio-tab="' + tab + '"]').click();
      const geometry = await page.evaluate(() => {
        const card = document
          .querySelector("#card-preview .football-card")
          .getBoundingClientRect();
        const inspector = document
          .querySelector(".studio-inspector")
          .getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          scroll: document.documentElement.scrollHeight > innerHeight + 2,
          card: { top: card.top, bottom: card.bottom },
          inspector: { top: inspector.top, bottom: inspector.bottom },
          height: innerHeight,
        };
      });
      assert.equal(
        geometry.overflow,
        false,
        JSON.stringify({ width, tab, geometry }),
      );
      assert.equal(
        geometry.scroll,
        false,
        JSON.stringify({ width, tab, geometry }),
      );
      assert.ok(
        geometry.card.top >= 0 && geometry.card.bottom <= geometry.height,
        JSON.stringify(geometry),
      );
    }
    await page.locator('[data-studio-tab="colors"]').click();
    await page.screenshot({ path: output + "/workbench-" + width + ".png" });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('[data-studio-tab="models"]').click();
  await page.locator("#studio-model-search").fill("inexistente");
  assert.equal(await page.locator("[data-studio-edition]:visible").count(), 0);
  await page.locator("#studio-model-search").fill("");
  await page.locator('[data-studio-edition="custom-test"]').click();
  assert.equal(await page.locator('[name="decoration"]').inputValue(), "none");
  await page.locator('[data-studio-tab="photo"]').click();
  await page.locator("#card-preview").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator('[name="photoX"]').inputValue(), "33");
  const project = await page.evaluate(() => ({
    version: 2,
    fields: Object.fromEntries(
      new FormData(document.querySelector("#lab-controls")),
    ),
  }));
  await page.locator('[data-studio-tab="projects"]').click();
  await page.locator("#lab-project-import").setInputFiles({
    name: "test-project.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  assert.equal(await page.locator('[name="photoX"]').inputValue(), "33");
  assert.equal(await page.locator('[name="projectId"]').inputValue(), "");
  await page.locator("#lab-project-import").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await page.locator(".toast.error").waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "CardLab: catalog, 50 palettes, native models, save, undo/redo, symbols, effects, keyboard and four viewport layouts passed.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
