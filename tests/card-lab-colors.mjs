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
const output = `test-results/card-lab-colors${isWebKit ? "-webkit" : ""}`;
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

  await page.goto(url);

  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(seedDocumentation);
  await page.evaluate(() => (location.hash = "#/admin/cards"));
  await page.locator(".studio-edition-choice").first().waitFor();

  await page.locator('[data-studio-tab="models"]').click();
  await page.locator('[data-studio-edition="gold-rare"]').click();
  await page.locator('[data-studio-tab="colors"]').click();
  await page.locator('[name="color1"]').fill("#112233");
  assert.equal(await page.locator("#card-preview .lab-designed").count(), 1);
  const profile = async (kind) =>
    page.evaluate(async (kind) => {
      const preview = document.querySelector("#card-preview");
      const card = preview.firstElementChild;
      const image = preview.querySelector("img");
      const mutations=[];
      const observer = new MutationObserver(records => mutations.push(...records));
      observer.observe(preview, { childList: true });
      observer.observe(card, { attributes:true, attributeFilter:["style"] });
      const started = performance.now();
      for (let n = 0; n < 120; n++) {
        const input =
          kind === "palette"
            ? document.querySelector('[name="color1"]')
            : document.querySelector(
                '[data-studio-property="nameBackgroundRed"]',
              );
        input.value =
          kind === "palette" ? "#" + (0x112200 + n).toString(16) : String(n);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const ms = performance.now() - started;
      await new Promise(requestAnimationFrame);
      mutations.push(...observer.takeRecords());
      const result = {
        ms,
        cardRetained: preview.firstElementChild === card,
        imageRetained: preview.querySelector("img") === image,
        replacements: mutations.filter(row=>row.type==="childList").length,
        styleWrites: mutations.filter(row=>row.type==="attributes").length,
      };
      observer.disconnect();
      return result;
    }, kind);
  const colors = await profile("palette");
  assert.equal(
    await page
      .locator("#card-preview .football-card")
      .evaluate((el) => el.style.getPropertyValue("--studio-primary")),
    "#112277",
  );
  await page.waitForTimeout(350);
  await page.locator('[data-studio-tab="text"]').click();
  const background = await profile("background");
  await page
    .locator('[data-studio-property="nameBackgroundTransparency"]')
    .fill("40");
  assert.equal(
    await page.locator("#name-background-transparency").textContent(),
    "40%",
  );
  assert.equal(
    await page
      .locator("#card-preview .football-card")
      .evaluate((el) => el.style.getPropertyValue("--name-background")),
    "rgba(119, 0, 0, 0.6)",
  );
  await page.waitForTimeout(350);
  await page.locator("#lab-undo").click();
  assert.equal(
    await page.locator('[name="nameBackgroundRed"]').inputValue(),
    "0",
  );
  await page.locator("#lab-redo").click();
  assert.equal(
    await page.locator('[name="nameBackgroundRed"]').inputValue(),
    "119",
  );
  await page.locator("#save-theme").click();
  await page.waitForFunction(() => window.__testState.cardThemes?.length === 1);
  assert.equal(
    await page.evaluate(() => window.__testState.cardThemes[0].colors.primary),
    "#112277",
  );
  assert.equal(
    await page.evaluate(
      () => window.__testState.cardThemes[0].design.nameBackgroundRed,
    ),
    119,
  );
  for (const result of [colors, background]) {
    assert.equal(result.cardRetained, true);
    assert.equal(result.imageRetained, true);
    assert.equal(result.replacements, 0);
    assert.ok(result.styleWrites<=3,"120 inputs are coalesced into one paint, not 120 style updates");
  }
  await page.locator('[data-studio-tab="colors"]').click();
  await page.locator('[data-studio-palette="gold"]').click();
  assert.equal(
    await page
      .locator('[data-studio-palette="gold"]')
      .getAttribute("aria-pressed"),
    "true",
  );
  const channels = await page.evaluate(async () => {
    const preview = document.querySelector("#card-preview");
    const card = preview.firstElementChild;
    const variables = {
      color1: ["--studio-primary", "--card-a"],
      color2: ["--studio-secondary", "--card-b"],
      textColor: ["--studio-text", "--card-text"],
      borderColor: ["--studio-edge", "--card-edge"],
      glowColor: ["--studio-glow", "--card-glow"],
    };
    const values = [];
    for (const [name, props] of Object.entries(variables)) {
      const input = document.querySelector(`[name="${name}"]`);
      input.value = "#abcdef";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await new Promise(requestAnimationFrame);
    values.push(...Object.values(variables).flatMap(props=>props.map(prop=>card.style.getPropertyValue(prop))));
    return { retained: preview.firstElementChild === card, values };
  });
  assert.equal(channels.retained, true);
  assert.ok(channels.values.every((value) => value === "#abcdef"));
  const finalColor=await page.evaluate(()=>{
    const input=document.querySelector('[name="color1"]');
    input.value="#135790";
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
    return document.querySelector("#card-preview .football-card").style.getPropertyValue("--studio-primary");
  });
  assert.equal(finalColor,"#135790","change flushes the final value immediately");
  assert.equal(
    await page.locator('[data-studio-palette][aria-pressed="true"]').count(),
    0,
  );
  await page.locator('[data-studio-tab="layers"]').click();
  await page
    .locator('[data-studio-choice="lighting"][data-value="on"]')
    .click();
  await page.locator('[data-studio-tab="colors"]').click();
  const beforeGlow = await page.locator("#card-preview .football-card").evaluate(el => getComputedStyle(el).filter);
  await page.locator('[name="glowColor"]').fill("#112233");
  const glow = await page
    .locator("#card-preview .football-card")
    .evaluate((el) => ({
      color: el.style.getPropertyValue("--studio-glow"),
      filter: getComputedStyle(el).filter,
      lights: el.querySelectorAll(".studio-light").length,
    }));
  assert.equal(glow.color, "#112233");
  assert.equal(glow.lights, 1);
  assert.notEqual(glow.filter, beforeGlow);
  assert.match(glow.filter, /drop-shadow/);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("#studio-center").click();
    await page.locator('[data-studio-tab="colors"]').click();
    await page.locator('[name="color1"]').fill("#334455");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: output + "/colors-" + width + ".png" });
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ colors, background }));
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
