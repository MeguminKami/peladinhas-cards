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
const output = `test-results/ultimate-v2${isWebKit ? "-webkit" : ""}`;
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
        "../../js/",
        "./",
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
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.log(error.message);
  });
  const url = `http://127.0.0.1:${server.address().port}`;

  page.on("console", (message) => {
    if (message.type() === "error") console.log(message.text());
  });
  await page.goto(url);

  try {
    await page.locator(".dashboard-greeting").waitFor({ timeout: 10000 });
  } catch (error) {
    console.log(await page.locator("body").innerText());
    throw error;
  }
  await page.evaluate(seedDocumentation);
  await page.evaluate(() => (location.hash = "#/admin/cards"));
  await page.locator(".studio-edition-choice").first().waitFor();
  await page.evaluate(()=>document.querySelector('[data-studio-choice="decoration"][data-value="edition-ultimate-modric-v2"]').click());
  assert.notEqual(await page.locator("#card-preview .studio-edition-art .ultimate-metal").first().evaluate(el=>getComputedStyle(el).fill),"none");

  await page.evaluate(() => (location.hash = "#/admin/card-types"));
  await page.locator("#card-type-gallery").waitFor();
  const ids = [
    "ultimate-goleador-v2",
    "ultimate-participacao-v2",
    "ultimate-modric-v2",
    "ultimate-vitorioso-v2",
    "ultimate-guarda-redes-v2",
  ];
  for (const id of ids)
    assert.equal(
      await page.locator('[data-card-type="' + id + '"]').count(),
      1,
    );
  await page.evaluate(async () => {
    const { card, bindImages } = await import("/js/cards.js");
    const { ULTIMATE_CARD_EDITIONS } =
      await import("/js/card-ultimate-designs.js");
    const { ATTRIBUTES } = await import("/js/utils.js");
    const { CARD_POLICY } = await import("/js/card-achievements.js");
    const { validEventReward } = await import("/js/event-model.js");
    for (const id of Object.keys(ULTIMATE_CARD_EDITIONS)) {
      if (
        CARD_POLICY[id].duration !== "permanent" ||
        !validEventReward({
          mode: "card",
          boosts: {},
          specialId: id,
          statDuration: "permanent",
          cardDuration: "permanent",
        })
      )
        throw Error("Invalid merit reward " + id);
    }
    window.__ultimateCards = Object.entries(ULTIMATE_CARD_EDITIONS)
      .map(([id, edition], i) => {
        const player = {
          uid: "proof",
          displayName: "JOÃO SILVA",
          primaryPosition: id.includes("guarda-redes") ? "GR" : id.includes("goleador") ? "AV" : "MED",
          countryCode: "PT",
          ovr: 94,
          hasCard: true,
          stats: Object.fromEntries(
            ATTRIBUTES.map(([key], n) => [key, 90 + (n % 8)]),
          ),
        };
        return (
          "<article>" +
          card(player, { theme: id, size: "lg", preview: true }) +
          "<h2>" +
          edition.name +
          "</h2><p>" +
          edition.detail +
          "</p></article>"
        );
      })
      .join("");
    document.querySelector("#main").innerHTML =
      '<section class="ultimate-proof-grid">' +
      window.__ultimateCards +
      "</section>";
    const style = document.createElement("style");
    style.textContent =
      ".ultimate-proof-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:36px 24px;padding:24px 0}.ultimate-proof-grid article{min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px}.ultimate-proof-grid h2{font-size:1rem;margin:0}.ultimate-proof-grid p{font-size:.9rem;max-width:320px;margin:0;color:var(--text-secondary)}.ultimate-proof-grid .football-card{--card-width:min(300px,calc(100vw - 72px))}@media(max-width:600px){.ultimate-proof-grid{grid-template-columns:minmax(0,1fr)}}";
    document.head.append(style);
    bindImages(document.querySelector("#main"));
  });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const theme of ["club", "volt", "champions", "ultimate"]) {
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
    }
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "club"),
    );
    for (const id of ids) {
      assert.equal(
        await page.locator("." + id + " .ultimate-identity").count(),
        0,
      );
      assert.doesNotMatch(
        await page.locator("." + id).innerText(),
        /THE ULTIMATE|V2|GOLEADOR|PARTICIPAÇÃO|MODRIC|VITORIOSO|GUARDA-REDES/,
      );
      assert.equal(
        (await page.locator("." + id + " .collection-art path").count()) > 0,
        true,
      );
      await page
        .locator("." + id)
        .screenshot({ path: output + "/" + id + "-" + width + ".png" });
    }
    if (width === 1440)
      await page
        .locator(".ultimate-proof-grid")
        .screenshot({ path: output + "/collection.png" });
  }
  assert.deepEqual(errors, []);
  console.log(
    "Five Ultimate V2 editions: native catalogue, permanent reward validation, vector artwork, 4 themes and four viewport widths passed.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
