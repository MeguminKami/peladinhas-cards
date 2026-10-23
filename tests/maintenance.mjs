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
await new Promise((resolve) => server.listen(5223, "127.0.0.1", resolve));
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
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.clock.install({ time: new Date("2026-10-16T12:00:00Z") });
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/db.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/db.js", "utf8").replace(
        "'../../js/utils.js'",
        "'./utils.js'",
      ),
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:5223");
  await page.getByRole("heading", { name: "No topo da liga" }).waitFor();
  const navigate = async (hash) => {
    await page.evaluate((value) => (location.hash = value), hash);
    await page.waitForTimeout(250);
    await page.locator("#main h1").first().waitFor();
  };
  await navigate("#/admin/maintenance");
  await page.locator("#maintenance-policy").waitFor();
  const field = page.locator('[name="rewards.dailyBudget"]');
  await field.fill("6");
  await page
    .getByRole("button", { name: "Guardar rascunho", exact: true })
    .click();
  await page.getByText("Rascunho guardado.", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Simular impacto", exact: true }).first()
    .click();
  await page.getByText("Simulado", { exact: true }).waitFor();
  await page.locator('[name="reason"]').fill("Ajustar o equilibrio da liga");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page.locator("#confirm").click();
  await page
    .getByText("Configura\u00e7\u00e3o publicada.", { exact: true })
    .waitFor();
  assert.equal(await field.inputValue(), "6");
  assert.equal(
    await page.evaluate(() => window.__testState.systemPolicy.revision),
    1,
  );
  await page.locator('[name="cycle.openDay"]').selectOption("1");
  await page.locator('[name="cycle.openHour"]').fill("19");
  await page.locator('[name="cycle.openMinute"]').fill("30");
  await page.locator('[name="effectiveAt"]').fill("");
  await page.locator('[name="reason"]').fill("Ajustar o horario de abertura");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page.locator("#confirm").waitFor();
  assert.equal(await page.locator('[name="effectiveAt"]').inputValue(),"2026-10-19T19:30","blank calendar activation proposes next opening");
  assert.ok((await page.locator('#modal-root').textContent()).includes("19:30"),"confirmation explains activation time");
  await page.locator("#cancel").click();
  await page.locator('[name="cycle.openHour"]').fill("20");
  assert.equal(await page.locator('[name="effectiveAt"]').inputValue(),"2026-10-19T20:30","automatic activation follows edited opening");
  await page.locator('[name="effectiveAt"]').fill("2026-10-19T19:30");
  await page.getByRole("button", { name:"Publicar", exact:true }).click();
  await page.locator('.maintenance-publish-error:not([hidden])').waitFor();
  assert.equal(await page.locator('#confirm').count(),0,"invalid manual date is rejected before confirmation");
  await page.locator('[name="cycle.openHour"]').fill("19");
  await page.locator('[data-next-opening]').click();
  assert.equal(await page.locator('[name="effectiveAt"]').inputValue(),"2026-10-19T19:30");
  assert.ok((await page.locator('[data-calendar-preview]').textContent()).includes("19:30"));
  for(const pageId of ["games","ratings","missions","events","players","app","cards"]) {
    await page.locator(`[data-maint-page="${pageId}"]`).click();
    assert.equal(await page.locator(`[data-maint-panel="${pageId}"]`).isVisible(),true);
  }
  assert.equal(await page.locator('[name="cycle.openMinute"]').inputValue(),"30","page navigation keeps edits");
  await page.locator('[data-maint-tab="history"]').click();
  await page.locator('.maintenance-version details summary').click();
  assert.ok((await page.locator('.maintenance-change-list').first().textContent()).includes("6"));
  await page.evaluate(()=>window.__testState.systemPolicy.revision=2);
  await page.locator('[data-maint-tab="config"]').click();
  assert.equal(await page.locator('[name="cycle.openMinute"]').inputValue(),"30","tool navigation keeps edits");
  assert.equal(await page.locator('#maintenance-policy').getAttribute('data-base-revision'),"1","unsaved edits retain their original revision");
  await page.locator('[data-limits="cards"] summary').click();
  assert.ok((await page.locator('[data-limits="cards"]').textContent()).includes("+15 por atributo"));
  assert.ok((await page.locator('[data-limits="cards"]').textContent()).includes("+25 a GR"));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const tab of [
      "config",
      "rewards",
      "overview",
      "diagnostics",
      "access",
      "history",
      "backups",
    ]) {
      await page.locator(`[data-maint-tab="${tab}"]`).click();
      await page.waitForTimeout(100);
      await page
        .locator(".maintenance-body section, .maintenance-body form")
        .first()
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        tab + "/" + width,
      );
      await page.screenshot({
        path: `test-results/maintenance-${tab}-${width}.png`,
        fullPage: true,
      });
    }
    await page.locator('[data-maint-tab="config"]').click();
    await page.locator('[data-maint-tab="rewards"]').focus();
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { name: "Entregas e limites" }).waitFor();
  }
  await page.locator('[data-maint-tab="history"]').click();
  await page.locator('.maintenance-version details summary').first().click();
  await page.screenshot({path:'test-results/maintenance-history-expanded-320.png',fullPage:true});
  assert.deepEqual(errors, []);
  for (const theme of ["volt","champions","ultimate"]) {
    await page.evaluate(async theme=>(await import('./js/themes.js')).applyTheme(theme),theme);
    await page.locator('[data-maint-tab="config"]').click();
    for(const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:1000});
      for(const pageId of ["cards","games","ratings","missions","events","players","app"]) {
        await page.locator(`[data-maint-page="${pageId}"]`).click();
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${theme}/${width}/${pageId}`);
      }
      await page.locator('[data-maint-page="cards"]').click();
      await page.locator('[data-limits="cards"]').evaluate(el=>el.open=true);
      await page.screenshot({path:`test-results/maintenance-pages-${theme}-${width}.png`,fullPage:true});
      if(theme === "ultimate" && [390,1440].includes(width)) {
        await page.locator('[data-limits="cards"] summary').scrollIntoViewIfNeeded();
        await page.screenshot({path:`test-results/maintenance-limits-${width}.png`});
        await page.locator('[data-calendar-preview]').scrollIntoViewIfNeeded();
        await page.screenshot({path:`test-results/maintenance-calendar-${width}.png`});
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "Maintenance UI: drafts, publish, simulation, seven tabs, keyboard and 1440/768/390/320px passed.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

