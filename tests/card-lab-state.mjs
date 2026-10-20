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
const output = `test-results/card-lab-state${isWebKit ? "-webkit" : ""}`;
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

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(seedDocumentation);
  await page.evaluate(() => (location.hash = "#/admin/cards"));
  await page.locator(".studio-edition-choice").first().waitFor();
  await page.evaluate(async () => {
    const { cardLab } = await import("/js/card-lab.js");
    const { ATTRIBUTES } = await import("/js/utils.js");
    const user = {
      ...window.__testState.users[0],
      role: "admin",
      stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 85])),
      hasCard: true,
      ovr: 85,
      specials: [
        {
          id: "gold-rare",
          cardTheme: {
            baseTheme: "gold-rare",
            design: {
              background: "mesh",
              effect: "holographic",
              preserveOriginal: "no",
            },
            colors: {
              primary: "#FF0000",
              secondary: "#0000FF",
              text: "#FFFFFF",
              border: "#FFFFFF",
              glow: "#FFFFFF",
            },
          },
        },
      ],
    };
    await cardLab({
      user,
      league: { players: [user] },
      render: (html) => (document.querySelector("#main").innerHTML = html),
      cleanup: () => {},
    });
  });
  await page.locator('[data-studio-tab="layers"]').click();
  assert.equal(
    await page.locator("#card-preview [data-reward-template]").count(),
    0,
  );
  const surface = page.locator("#card-preview .card-surface");
  const details = page
    .locator('[data-studio-panel="layers"] details')
    .filter({ has: page.locator('[data-studio-choice="background"]') });
  await page
    .locator('[data-studio-choice="background"][data-value="solid"]')
    .click();
  assert.equal(
    await surface.evaluate((el) => getComputedStyle(el).backgroundImage),
    "none",
  );
  for (const pseudo of ["::before", "::after"])
    assert.equal(
      await surface.evaluate(
        (el, p) => getComputedStyle(el, p).display,
        pseudo,
      ),
      "none",
    );
  await page.locator('[data-studio-tab="models"]').click();
  await page.locator('[data-studio-edition="custom-test"]').click();
  for (const [key, value] of Object.entries({
    background: "solid",
    decoration: "none",
    effect: "none",
    lighting: "off",
    border: "none",
  }))
    assert.equal(
      await page.locator('[name="' + key + '"]').inputValue(),
      value,
    );
  await page.locator("#save-theme").click();
  await page.waitForFunction(() => window.__testState.cardThemes?.length > 0);
  await page.locator('[data-studio-tab="projects"]').click();
  const saved = await page.evaluate(() => window.__testState.cardThemes.at(-1));
  await page.locator('[data-studio-tab="models"]').click();
  await page.locator(`[data-saved-edit="${saved.id}"]`).click();
  assert.equal(await page.locator('[name="projectId"]').inputValue(),saved.id);
  await page.locator('[name="themeName"]').fill("Carta editada");
  await page.locator("#save-theme").click();
  await page.waitForFunction(id=>window.__testState.cardThemes.find(t=>t.id===id)?.name==="Carta editada",saved.id);
  const beforeCopy=await page.evaluate(()=>window.__testState.cardThemes.length);
  await page.locator(`[data-saved-model="${saved.id}"]`).click();
  assert.equal(await page.locator('[name="projectId"]').inputValue(),"");
  await page.locator("#save-theme").click();
  await page.waitForFunction(count=>window.__testState.cardThemes.length===count+1,beforeCopy);
  assert.equal(await page.evaluate(id=>window.__testState.cardThemes.find(t=>t.id===id).name,saved.id),"Carta editada");
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.locator(".studio-saved-cards").screenshot({path:`${output}/saved-cards-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-studio-tab="projects"]').click();
  await page.locator("#studio-saved-project").selectOption(saved.id);
  await page.locator('[data-studio-tab="models"]').click();
  await page.locator('[data-studio-edition="toty"]').click();
  assert.equal(await page.locator('[name="projectId"]').inputValue(), "");
  await page.evaluate(async () => {
    const { cardTemplateDesign, validCardDesign } =
      await import("/js/card-design.js");
    if (cardTemplateDesign({ texture: "radial" }).background !== "radial")
      throw Error("Legacy texture lost");
    if (
      cardTemplateDesign({ texture: "radial", design: { background: "solid" } })
        .background !== "solid"
    )
      throw Error("Legacy overrides explicit background");
    if (!validCardDesign({ effect: "original" }))
      throw Error("Original finish invalid");
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator('[data-studio-tab="models"]').click();
    await page.locator('[data-studio-edition="custom-test"]').click();
    await page.locator('[data-studio-tab="layers"]').click();
    await page.screenshot({ path: output + "/blank-" + width + ".png" });
  }
  assert.deepEqual(errors, []);
  console.log(
    "No player-template leakage, solid background removes native texture, clean blank state, detached saved project and legacy texture migration passed.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
