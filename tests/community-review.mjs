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
      ".woff2": "font/woff2",
      ".webp": "image/webp",
    }[extname(path)] || "application/octet-stream",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(5240, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
mkdirSync("test-results", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    serviceWorkers: "block",
  });
  await context.clock.install({ time: new Date("2026-10-26T12:00:00Z") });
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
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:5240");
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(() => {
    const target = window.__testState.users.find((u) => u.uid === "joao");
    target.displayName = "Cabeça · Nome comprido de avaliação";
    target.username = "cabeca_nome_comprido_de_avaliacao";
    window.__testState.communityRatings.push({
      id: "pedro_joao",
      raterId: "pedro",
      targetId: "joao",
      ratings20: Object.fromEntries(
        [
          "pace",
          "shooting",
          "passing",
          "dribbling",
          "defending",
          "physical",
          "goalkeeping",
          "stamina",
          "vision",
          "positioning",
          "teamwork",
          "composure",
        ].map((key) => [key, 0]),
      ),
      submitted: true,
      submittedAt: new Date("2026-10-01"),
      reviewState: "invalid",
      reviewAttempts: 1,
      reviewToken: null,
      reviewDeadline: null,
    });
  });
  const seeded = await page.evaluate(() => window.__testState);
  await context.addInitScript((state) => (window.__testState = state), seeded);
  await page.reload();
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(() => (location.hash = "#/missions/new/joao"));
  await page.locator(".rating-form").waitFor();
  assert.equal(await page.locator(".rating-form input:enabled").count(), 0);
  assert.equal(await page.locator(".save-state").textContent(), "Nula");
  await page.evaluate(() => (location.hash = "#/admin/ratings"));
  await page.locator("[data-grant-review]").waitFor();
  assert.match(await page.locator("#raw-list").textContent(), /Nula/);
  assert.equal(await page.locator("[data-correct]").count(), 0);
  await page.locator("#raw-status").selectOption("sent");
  assert.equal(await page.locator("[data-grant-review]").count(), 0);
  await page.getByRole("heading", { name: "Sem avaliações", exact: true }).waitFor();
  await page.locator("#raw-status").selectOption("null");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1050 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `admin/${width}`);
    const grantSize = await page.locator("[data-grant-review]").boundingBox();
    assert.ok(grantSize.height >= 44 && grantSize.width > 150, `grant/${width}`);
    await page.screenshot({ path: `test-results/community-null-admin-${width}.png`, fullPage: true });
  }
  await page.evaluate(() => (window.__communityGrantError = true));
  await page.locator("[data-grant-review]").click();
  await page.getByText("Não foi possível autorizar. Tenta novamente.", { exact: true }).waitFor();
  assert.equal(await page.locator("[data-grant-review]").isEnabled(), true);
  await page.evaluate(() => (window.__communityGrantError = false));
  const grant = page.locator("[data-grant-review]");
  await grant.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  assert.ok(await grant.evaluate(node => {
    const style = getComputedStyle(node);
    return document.activeElement === node && (style.outlineStyle !== "none" || style.boxShadow !== "none");
  }));
  await page.keyboard.press("Enter");
  await page.getByText("Tentativa autorizada", { exact: true }).waitFor();
  assert.equal(await page.locator("[data-grant-review]").count(), 0);
  await page.evaluate(() => (location.hash = "#/profile"));
  await page.locator(".community-review-notice").waitFor();
  assert.doesNotMatch(
    await page.locator(".community-review-notice").textContent(),
    /1[.,]9|média|mínimo|baixa/i,
  );
  for (const theme of ["volt", "champions", "ultimate"]) {
    await page.evaluate(
      async (theme) => (await import("./js/themes.js")).applyTheme(theme),
      theme,
    );
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1050 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${theme}/${width}`,
      );
      const notice = page.locator(".community-review-notice");
      await notice.screenshot({
        path: `test-results/community-review-notice-${theme}-${width}.png`,
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 1050 });
  await page
    .getByRole("link", { name: "Rever avaliação", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submeter revisão definitiva" })
    .waitFor();
  assert.equal(await page.locator('[data-rating="pace"]').isDisabled(), false);
  await page.locator('[data-rating="pace"]').fill("12");
  await page.getByRole("button", { name: "Guardar agora" }).click();
  await page.locator(".save-state.success").waitFor();
  assert.equal(
    await page.evaluate(
      () => window.__testState.communityRatings[0].reviewAttempts,
    ),
    1,
  );
  await page.screenshot({
    path: "test-results/community-review-form-mobile.png",
    fullPage: true,
  });
  await page.evaluate(
    () =>
      (window.__communitySubmitResult = {
        reviewAttempts: 2,
        reviewState: "ignored",
        submitted: true,
      }),
  );
  await page
    .getByRole("button", { name: "Submeter revisão definitiva" })
    .click();
  await page.getByRole("heading", { name: "Missões", exact: true }).waitFor();
  await page.evaluate(() => (location.hash = "#/missions/new/joao"));
  await page.locator(".rating-form").waitFor();
  assert.equal(await page.locator(".rating-form input:enabled").count(), 0);
  assert.equal(await page.locator(".rating-form button").count(), 0);
  assert.match(
    await page.locator(".community-review-notice").textContent(),
    /já não pode ser alterada/,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Revisão: aviso privado no perfil, texto sem limiar, 3 temas × 4 larguras, rascunhos sem consumo e formulário final bloqueado passaram.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
