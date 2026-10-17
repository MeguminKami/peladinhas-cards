import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import {
  COLLECTION_EDITIONS,
  RESERVED_COLLECTION_IDS,
} from "../js/card-collection.js";
import { CARD_POLICY } from "../js/card-achievements.js";
import { CATALOG_THEMES } from "../js/utils.js";
const root = resolve(".");
const server = createServer((req, res) => {
  try {
    const name = new URL(req.url, "http://localhost").pathname;
    const file = resolve(root, "." + (name === "/" ? "/index.html" : name));
    if (!file.startsWith(root + sep)) throw Error("Invalid path");
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".html": "text/html",
        ".woff": "font/woff",
        ".webp": "image/webp",
      }[extname(file)] || "application/octet-stream",
    );
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
mkdirSync("test-results", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  for (const module of ["db", "auth"])
    await context.route(`**/js/${module}.js`, (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: readFileSync(`tests/fixtures/${module}.js`, "utf8").replaceAll(
          "../../js/utils.js",
          "./utils.js",
        ),
      }),
    );
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route(/https:\/\//, (r) => r.abort());
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    `http://127.0.0.1:${server.address().port}/#/admin/card-types`,
  );
  await page.locator("#card-type-gallery").waitFor();
  for (const metal of ["bronze", "silver", "gold"]) {
    assert.equal(
      await page
        .locator(`[data-card-type="in-form-${metal}"] .in-form-${metal}`)
        .count(),
      1,
    );
  }
  for (const [id, edition] of Object.entries(COLLECTION_EDITIONS)) {
    const tile = page.locator(`[data-card-type="${id}"]`);
    assert.ok(
      (await tile.textContent()).includes(edition.name) ||
        ["toty", "tots", "fut-birthday"].includes(id),
    );
    assert.equal(
      (await tile.textContent()).includes("Design em reserva"),
      RESERVED_COLLECTION_IDS.includes(id),
    );
    await tile.click();
    await page.locator(`#modal-root .${id}`).waitFor();
    assert.ok(
      (await page.locator("#modal-root").textContent()).includes(
        edition.detail,
      ),
    );
    await page.locator("#modal-root .close-modal").click();
  }
  await page.evaluate(async () => {
    const { card } = await import("/js/cards.js");
    const { ATTRIBUTES } = await import("/js/utils.js");
    const { COLLECTION_EDITIONS } = await import("/js/card-collection.js");
    document.querySelector("#header").style.display = "none";
    window.scrollTo(0, 0);
    const player = {
      uid: "preview",
      displayName: "João Silva",
      primaryPosition: "MED",
      countryCode: "PT",
      hasCard: true,
      ovr: 92,
      stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 82])),
    };
    document.querySelector("#main").innerHTML =
      `<section id="collection-preview" style="padding:28px;background:#100c20"><h1 style="margin:0 0 28px">Coleção especial</h1><div class="collection-preview-grid" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:28px">${Object.entries(
        COLLECTION_EDITIONS,
      )
        .map(
          ([id, e]) =>
            `<div style="min-width:0;text-align:center">${card(player, { theme: id, preview: true })}<h2 style="font-size:16px;margin:12px 0 4px">${e.name}</h2><p style="font-size:11px;opacity:.65;margin:0">${e.detail}</p></div>`,
        )
        .join("")}</div></section>`;
    document
      .querySelectorAll(".football-card")
      .forEach((el) => el.style.setProperty("--card-width", "100%"));
    // Card typography uses an absolute width token.
    document
      .querySelectorAll(".football-card")
      .forEach((el) =>
        el.style.setProperty(
          "--card-width",
          `${el.parentElement.clientWidth}px`,
        ),
      );
  });
  await page.locator(".card-photo img").first().waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/card-collection-desktop.png",
    fullPage: true,
  });
  const layouts = await page.locator(".card-collection").evaluateAll((cards) =>
    cards.map((card) => {
      const style = getComputedStyle(card.querySelector(".card-stats"));
      const photoZ = Number(
        getComputedStyle(card.querySelector(".card-photo")).zIndex,
      );
      return {
        material: getComputedStyle(card.querySelector(".card-surface"))
          .backgroundImage,
        stats: style.backgroundImage,
        portraitClear: [".collection-art", ".special-ornament"].every(
          (s) =>
            Number(getComputedStyle(card.querySelector(s)).zIndex) < photoZ,
        ),
      };
    }),
  );
  assert.equal(
    new Set(layouts.map((x) => x.material)).size,
    Object.keys(COLLECTION_EDITIONS).length,
  );
  assert.ok(layouts.every((x) => x.portraitClear));
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => {
      document.querySelector(
        ".collection-preview-grid",
      ).style.gridTemplateColumns = "repeat(2,minmax(0,1fr))";
      document.querySelector(".collection-preview-grid").style.gap = "20px";
      document
        .querySelectorAll(".football-card")
        .forEach((el) =>
          el.style.setProperty(
            "--card-width",
            `${el.parentElement.clientWidth}px`,
          ),
        );
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await page.screenshot({
      path: `test-results/card-collection-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate(async () => {
    const { FUT_INSPIRED_EDITIONS } = await import("/js/card-fut-themes.js");
    document
      .querySelectorAll(".collection-preview-grid > div")
      .forEach((tile) => {
        if (
          !Object.keys(FUT_INSPIRED_EDITIONS).some((id) =>
            tile.querySelector(`.${id}`),
          )
        )
          tile.remove();
      });
    const grid = document.querySelector(".collection-preview-grid");
    grid.style.gridTemplateColumns = "repeat(3,minmax(0,1fr))";
    grid.style.gap = "32px";
    grid.style.maxWidth = "980px";
    grid.style.margin = "auto";
    document.querySelector("#collection-preview h1").textContent =
      "Ultimate Collection · 9 edições";
    document
      .querySelectorAll(".football-card")
      .forEach((el) => el.style.setProperty("--card-width", "250px"));
    document
      .querySelectorAll(".football-card")
      .forEach((el) => (el.style.margin = "auto"));
    window.scrollTo(0, 0);
  });
  await page
    .locator("#collection-preview")
    .screenshot({ path: "test-results/card-fut-themes.png" });
  await page.evaluate(() => {
    document
      .querySelectorAll(".card-photo,.card-caption,.card-rating,.card-stats")
      .forEach((el) => (el.style.visibility = "hidden"));
    document.querySelector("#collection-preview h1").textContent =
      "Molduras e materiais · sem jogadores";
  });
  await page
    .locator("#collection-preview")
    .screenshot({ path: "test-results/card-fut-frames.png" });
  await page.goto(`http://127.0.0.1:${server.address().port}/#/admin/cards`);
  await page.locator("[data-studio-edition]").first().waitFor();
  for (const id of Object.keys(COLLECTION_EDITIONS)) {
    await page.locator(`[data-studio-edition="${id}"]`).click();
    assert.equal(await page.locator("#save-theme").isDisabled(), false);
    assert.equal(await page.locator(`#card-preview .${id}`).count(), 1);
  }
  await page.locator('[data-studio-edition="gold-rare"]').click();
  assert.equal(await page.locator("#save-theme").isEnabled(), true);
  // Every catalog edition can be used in an editable saved composition.
  assert.equal(
    await page.locator("[data-studio-edition]").count(),
    CATALOG_THEMES.length + 1,
  );
  await page.locator('[data-studio-edition="apogee"]').click();
  await page.locator('[name="themeName"]').fill("Edição do ADMIN");
  await page.locator("#save-theme").click();
  const original = await page.evaluate(() => ({
    count: window.__testState.cardThemes.length,
    theme: structuredClone(window.__testState.cardThemes.at(-1)),
  }));
  assert.equal(original.theme.baseTheme, "apogee");
  assert.match(
    await page.locator("#save-theme").innerText(),
    /Guardar alterações/,
  );
  await page.locator('[name="themeName"]').fill("Edição revista");
  await page.locator('[data-studio-edition="toty"]').click();
  await page.locator("#save-theme").click();
  const updated = await page.evaluate(
    (id) => ({
      count: window.__testState.cardThemes.length,
      theme: window.__testState.cardThemes.find((theme) => theme.id === id),
    }),
    original.theme.id,
  );
  assert.equal(updated.count, original.count);
  assert.equal(updated.theme.name, "Edição revista");
  assert.equal(updated.theme.baseTheme, "toty");
  await page.locator('[data-studio-tab="projects"]').click();
  await page.locator("#save-theme-copy").click();
  assert.equal(
    await page.evaluate(() => window.__testState.cardThemes.length),
    original.count + 1,
  );
  await page.locator("#lab-new-project").click();
  assert.equal(await page.locator('[name="projectId"]').inputValue(), "");
  await page.locator("#studio-saved-project").selectOption(original.theme.id);
  assert.equal(
    await page.locator('[name="themeName"]').inputValue(),
    "Edição revista",
  );
  assert.equal(await page.locator("#card-preview .toty").count(), 1);
  await page.evaluate(() => {
    location.hash = "#/admin/card-types";
  });
  await page.locator("#card-type-gallery").waitFor();
  await page.locator(`[data-card-type="saved:${original.theme.id}"]`).click();
  await page.getByRole("link", { name: "Editar no Card Lab" }).click();
  await page.locator('[data-studio-tab="projects"]').click();
  await page.locator("#studio-saved-project").waitFor();
  assert.equal(
    await page.locator('[name="projectId"]').inputValue(),
    original.theme.id,
  );
  assert.equal(
    await page.locator('[name="themeName"]').inputValue(),
    "Edição revista",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `Card Lab library overflow ${width}`,
    );
    await page.locator(".studio-library").screenshot({
      path: `test-results/card-lab-library-${width}.png`,
      animations: "disabled",
      style: "#header,.bottom-nav,#toast-region{visibility:hidden!important}",
    });
    if ([320, 1440].includes(width)) {
      await page.locator('[data-studio-tab="models"]').click();
      await page.locator(".studio-edition-grid").screenshot({
        path: `test-results/card-lab-editions-${width}.png`,
        animations: "disabled",
        style: "#header,.bottom-nav,#toast-region{visibility:hidden!important}",
      });
      await page.locator('[data-studio-tab="projects"]').click();
    }
  }
  await page.locator("#lab-new-project").click();
  await page.locator('[data-studio-tab="models"]').click();
  for (const [metal, edge] of [
    ["bronze", "#e8b58b"],
    ["silver", "#dceaf8"],
    ["gold", "#eac775"],
  ]) {
    await page.locator(`[data-studio-edition="in-form-${metal}"]`).click();
    assert.equal(
      await page.locator(`#card-preview .in-form-${metal}`).count(),
      1,
    );
    assert.equal(
      await page.locator('#lab-controls [name="borderColor"]').inputValue(),
      edge,
    );
  }
  await page.locator('[data-studio-tab="text"]').click();
  const captionBackground = () =>
    page
      .locator("#card-preview .card-caption")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  assert.equal(await captionBackground(), "rgba(0, 0, 0, 0)");
  for (const [channel, value] of [
    ["Red", "24"],
    ["Green", "120"],
    ["Blue", "220"],
  ]) {
    await page
      .locator(`[data-studio-property="nameBackground${channel}"]`)
      .fill(value);
  }
  await page
    .locator('[data-studio-property="nameBackgroundTransparency"]')
    .fill("40");
  assert.equal(await captionBackground(), "rgba(24, 120, 220, 0.6)");
  assert.equal(
    await page.locator("#name-background-transparency").textContent(),
    "40%",
  );
  await page.waitForTimeout(300);
  await page.locator("#lab-undo").click();
  assert.equal(await captionBackground(), "rgba(0, 0, 0, 0)");
  await page.locator("#lab-redo").click();
  assert.equal(await captionBackground(), "rgba(24, 120, 220, 0.6)");
  const reapplied = await page.evaluate(async () => {
    const { applyCardTemplate } = await import("/js/card-design.js");
    const form = document.querySelector("#lab-controls");
    const design = Object.fromEntries(
      ["Red", "Green", "Blue", "Transparency"].map((key) => [
        `nameBackground${key}`,
        Number(form.elements[`nameBackground${key}`].value),
      ]),
    );
    const card = document.querySelector("#card-preview .football-card");
    applyCardTemplate(card, { design: JSON.parse(JSON.stringify(design)) });
    return getComputedStyle(card.querySelector(".card-caption"))
      .backgroundColor;
  });
  assert.equal(reapplied, "rgba(24, 120, 220, 0.6)");
  await page
    .locator('[data-studio-property="nameBackgroundTransparency"]')
    .fill("100");
  assert.equal(await captionBackground(), "rgba(24, 120, 220, 0)");
  assert.deepEqual(errors, []);
  console.log(
    "Collection: catalog previews, modal names, distinct materials, clear portraits, mobile layout, nine blank FUT frames and Card Lab passed.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
