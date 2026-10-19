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
const output = `test-results/card-symbols${isWebKit ? "-webkit" : ""}`;
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
  await page.evaluate(async () => {
    const { card, bindImages } = await import("/js/cards.js");
    const { CATALOG_THEMES, ATTRIBUTES, themeName } =
      await import("/js/utils.js");
    const gallery = document.createElement("section");
    gallery.id = "symbol-gallery";
    gallery.style =
      "display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;padding:24px;background:var(--bg-app)";
    const player = {
      uid: "preview",
      displayName: "Peladinhas",
      hasCard: true,
      ovr: 84,
      stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 84])),
    };
    gallery.innerHTML = CATALOG_THEMES.map(
      (id) =>
        '<div data-symbol-theme="' +
        id +
        '" style="display:grid;justify-items:center;gap:12px"><strong>' +
        themeName(id) +
        "</strong>" +
        card(player, { theme: id, preview: true }) +
        "</div>",
    ).join("");
    document.querySelector("#main").append(gallery);
    gallery
      .querySelectorAll(".football-card")
      .forEach((card) => card.style.setProperty("--card-width", "220px"));
    bindImages(gallery);
  });
  const checkGeometry = async (selector) => {
    const measurements = await page.locator(selector).evaluateAll((symbols) =>
      symbols.map((svg) => {
        const box = svg.getBoundingClientRect(),
          ink = svg.firstElementChild.getBoundingClientRect(),
          raw = svg.firstElementChild.getBBox(),
          card = svg
            .closest(".football-card")
            .querySelector(".card-surface")
            .getBoundingClientRect();
        return {
          theme: svg.closest("[data-symbol-theme]")?.dataset.symbolTheme,
          center: Math.abs(ink.x + ink.width / 2 - card.x - card.width / 2),
          vertical: Math.abs(
            ink.y + ink.height / 2 - card.y - card.height * 0.94,
          ),
          width: box.width / card.width,
          height: box.height / card.height,
          bottom: (card.bottom - box.bottom) / card.height,
          gap:
            ink.top -
            Math.max(
              ...[
                ...svg
                  .closest(".football-card")
                  .querySelectorAll(".card-stats small"),
              ].map((label) => label.getBoundingClientRect().bottom),
            ),
          proportion: Math.abs(ink.width / ink.height - raw.width / raw.height),
        };
      }),
    );
    assert.ok(measurements.length);
    for (const measurement of measurements) {
      assert.ok(measurement.center < 1, JSON.stringify(measurement));
      assert.ok(measurement.vertical < 1, JSON.stringify(measurement));
      assert.ok(
        measurement.width <= 0.111 && measurement.height <= 0.051,
        JSON.stringify(measurement),
      );
      assert.ok(measurement.bottom >= 0.03, JSON.stringify(measurement));
      assert.ok(measurement.proportion < 0.02, JSON.stringify(measurement));
      assert.ok(measurement.gap >= 0, JSON.stringify(measurement));
    }
  };
  assert.equal(
    await page.locator(".collection-edition,.special-insignia").count(),
    0,
  );
  await checkGeometry("#symbol-gallery .card-symbol");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator("#symbol-gallery").evaluate((gallery, width) => {
      gallery.style.gridTemplateColumns =
        width < 500 ? "minmax(0,1fr)" : "repeat(auto-fit,minmax(220px,1fr))";
      gallery
        .querySelectorAll(".football-card")
        .forEach((card) =>
          card.style.setProperty(
            "--card-width",
            Math.min(220, width - 96) + "px",
          ),
        );
    }, width);
    await checkGeometry("#symbol-gallery .card-symbol");
    if (width === 1440)
      await page
        .locator("#symbol-gallery")
        .screenshot({ path: output + "/all-symbols.png" });
  }
  await page.evaluate(() => {
    document.querySelector("#symbol-gallery").remove();
    location.hash = "#/admin/cards";
  });
  await page.locator('[data-studio-edition="mvp"]').click();
  await checkGeometry("#card-preview .card-symbol");
  await page.locator('[data-studio-tab="symbols"]').click();
  await page.locator('[data-studio-choice="symbol"][data-value="mvp"]').click();
  await checkGeometry("#card-preview .studio-symbol");
  assert.equal(
    await page.locator("#card-preview .special-motif:visible").count(),
    0,
  );
  await page.locator('input[data-studio-property="badgeSize"]').fill("90");
  await page
    .locator('input[data-studio-property="badgeSize"]')
    .dispatchEvent("input");
  await checkGeometry("#card-preview .studio-symbol");
  // Previously saved projects used the old, displaced top-right defaults.
  const project = await page.evaluate(() => ({
    version: 2,
    fields: {
      ...Object.fromEntries(
        new FormData(document.querySelector("#lab-controls")),
      ),
      badgeX: "75",
      badgeY: "25",
      badgeSize: "100",
    },
  }));
  await page.locator('[data-studio-tab="projects"]').click();
  await page.locator("#lab-project-import").setInputFiles({
    name: "legacy-symbol.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.waitForFunction(
    () => document.querySelector('[name="badgeX"]').value === "50",
  );
  assert.equal(await page.locator('[name="badgeY"]').inputValue(), "94");
  await checkGeometry("#card-preview .studio-symbol");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator('[data-studio-tab="models"]').click();
    await page.locator('[data-studio-edition="mvp"]').click();
    await checkGeometry("#card-preview .card-symbol");
    assert.equal(
      await page.locator(".collection-edition,.special-insignia").count(),
      0,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: output + "/cardlab-" + width + ".png" });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await checkGeometry("#card-preview .card-symbol");
  assert.deepEqual(errors, []);
  console.log(
    "Card symbols: all editions centered without distortion, bottom clearance, removed names, CardLab, legacy projects and four widths passed.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
