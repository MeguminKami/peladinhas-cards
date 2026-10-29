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
      ".html": "text/html",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2",
      ".webp": "image/webp",
    }[extname(path)] || "application/octet-stream",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(5238, "127.0.0.1", r));
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
  await context.clock.install({ time: new Date("2026-10-30T12:00:00Z") });
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
  await page.goto("http://127.0.0.1:5238/#/players");
  const link = page.getByRole("link", {
    name: "Como as tuas estatísticas mudam",
  });
  await link.waitFor();
  await link.click();
  await page.locator(".evolution-guide h1").waitFor();
  assert.equal(new URL(page.url()).hash, "#/players/evolution");
  const readShooting = async () =>
    Number(
      (await page.locator(".evolution-delta b").first().textContent())
        .replace("+", "")
        .replace("−", "-")
        .replace(",", "."),
    );
  const win = await readShooting();
  assert.ok(win > 0);
  await page.getByLabel("Avaliações por dimensão", { exact: true }).fill("1");
  assert.ok(await readShooting() < win);
  await page.getByLabel("Avaliações por dimensão", { exact: true }).fill("0");
  assert.equal(await readShooting(), 0);
  await page.getByRole("button", { name: "Repor exemplo" }).click();
  assert.equal(await readShooting(), win);
  const readComposure = async () => Number((await page.locator(".evolution-delta").filter({ has: page.locator("span", { hasText: /^Compostura$/ }) }).locator("b").textContent()).replace("+", "").replace("−", "-").replace(",", "."));
  await page.getByLabel("Atributos no início", { exact: true }).selectOption("75");
  await page.getByLabel("Atitude", { exact: true }).fill("4.5");
  await page.getByLabel("Desempenho geral", { exact: true }).fill("4");
  assert.equal(await readComposure(), 3);
  await page.getByLabel("Atitude", { exact: true }).fill("1");
  assert.ok(await readComposure() < 0);
  await page.getByRole("button", { name: "Repor exemplo" }).click();
  const range = page.getByLabel("Nota por dimensão", { exact: true });
  await range.focus();
  await range.press("ArrowRight");
  assert.match(
    await page.locator("#evolution-rating-label").textContent(),
    /4,0/,
  );
  assert.ok(
    await range.evaluate((el) => getComputedStyle(el).outlineStyle !== "none"),
  );
  await range.fill("2");
  await page.getByLabel("Golos", { exact: true }).fill("0");
  await page.getByLabel("Assistências", { exact: true }).fill("0");
  assert.ok((await readShooting()) < 0);
  const summary = page.getByText("Posso perder atributos mesmo a ganhar?", {
    exact: true,
  });
  await summary.focus();
  await summary.press("Space");
  assert.equal(await summary.evaluate((el) => el.parentElement.open), true);
  await page.getByRole("button", { name: "Repor exemplo" }).click();
  await page.evaluate(() =>
    document
      .querySelectorAll(".evolution-details details")
      .forEach((el) => (el.open = true)),
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
        `${theme}/${width}: page overflow`,
      );
      assert.deepEqual(
        await page
          .locator("#evolution-form")
          .evaluate((form) =>
            [...form.querySelectorAll("input,select,button")]
              .filter((el) => el.getBoundingClientRect().height < 43)
              .map((el) => el.name || el.id),
          ),
        [],
      );
      await page.screenshot({
        path: `test-results/progression-guide-${theme}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/progression-guide-desktop.png" });
  await page.setViewportSize({ width: 390, height: 1050 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/progression-guide-mobile.png" });
  await page.getByRole("link", { name: "Experimentar um jogo" }).click();
  assert.equal(
    await range.evaluate((el) => document.activeElement === el),
    true,
  );
  await page.screenshot({
    path: "test-results/progression-guide-simulator-mobile.png",
  });
  await page.reload();
  await page.locator(".evolution-guide h1").waitFor();
  assert.deepEqual(errors, []);
  await page.getByRole("link", { name: "Voltar aos jogadores" }).click();
  await page.getByRole("heading", { name: "Jogadores", exact: true }).waitFor();
  await page.setViewportSize({ width: 320, height: 1050 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Players help link fits at 320px",
  );
  console.log(
    "Guia: acesso e ligação direta, simulador v3, contagens, atitude, perdas, reposição, teclado, movimento reduzido e 3 temas × 4 larguras passaram.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
