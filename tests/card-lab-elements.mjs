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
const output = `test-results/card-lab-elements${isWebKit ? "-webkit" : ""}`;
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

  await page.goto(url + "/#/admin/cards");
  await page.locator('[data-studio-tab="composition"]').waitFor();
  const elements = await import("../js/card-studio-elements.js");
  const { SPECIAL_CARD_DESIGNS } = await import("../js/card-specials.js");
  for (const [key, tab, catalog, example] of [
    ["shape", "composition", elements.STUDIO_SHAPES, "fut-heroes"],
    ["decoration", "layers", elements.STUDIO_ORNAMENTS, "edition-toty"],
    ["symbol", "symbols", elements.STUDIO_SYMBOLS, "mvp"],
  ]) {
    await page.locator('[data-studio-tab="' + tab + '"]').click();
    assert.equal(
      await page.locator('[data-studio-property="' + key + '"]').count(),
      0,
    );
    if (key === "decoration")
      await page
        .locator('[data-studio-panel="layers"] summary')
        .filter({ hasText: "Detalhes" })
        .click();
    const choices = page.locator('[data-studio-choice="' + key + '"]');
    assert.equal(await choices.count(), Object.keys(catalog).length);
    for (const [id, label] of Object.entries(catalog)) {
      const item = page.locator(
        '[data-studio-choice="' + key + '"][data-value="' + id + '"]',
      );
      assert.equal(await item.locator("small").textContent(), label);
      if (SPECIAL_CARD_DESIGNS[id.replace(/^edition-/, "")])
        assert.equal(await item.locator("svg").count(), 1);
    }
    const exampleChoice = page.locator(
      '[data-studio-choice="' + key + '"][data-value="' + example + '"]',
    );
    await exampleChoice.click();
    assert.equal(await exampleChoice.getAttribute("aria-pressed"), "true");
    assert.equal(
      await page.locator('[name="' + key + '"]').inputValue(),
      example,
    );
    await exampleChoice.focus();
    await page.keyboard.press("Enter");
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await exampleChoice.scrollIntoViewIfNeeded();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      const bounds = await exampleChoice.evaluate((el) => ({
        button: el.getBoundingClientRect().toJSON(),
        text: el.querySelector("small").getBoundingClientRect().toJSON(),
        svg: el.querySelector("svg").getBoundingClientRect().toJSON(),
      }));
      assert.ok(
        bounds.text.x >= bounds.button.x &&
          bounds.text.right <= bounds.button.right + 1,
        JSON.stringify(bounds),
      );
      assert.ok(bounds.svg.width > 0 && bounds.svg.height > 0);
      await page.screenshot({
        path: output + "/" + key + "-" + width + ".png",
      });
    }
  }
  await page.locator("#save-theme").click();
  await page.waitForFunction(() => window.__testState.cardThemes?.length === 1);
  const saved = await page.evaluate(() => window.__testState.cardThemes[0]);
  assert.equal(saved.design.shape, "fut-heroes");
  assert.equal(saved.design.decoration, "edition-toty");
  assert.equal(saved.design.symbol, "mvp");
  await page.locator('[data-studio-tab="projects"]').click();
  await page.locator("#lab-new-project").click();
  await page.locator("#studio-saved-project").selectOption(saved.id);
  assert.equal(await page.locator('[name="shape"]').inputValue(), "fut-heroes");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.deepEqual(errors, []);
  console.log(
    "CardLab elements: integrated galleries, independent names, SVG previews, keyboard selection, saved IDs and four viewport widths passed.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
