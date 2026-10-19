import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
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
    }[extname(path)] || "application/octet-stream",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(5208, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
mkdirSync("test-results/password-recovery", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
    reducedMotion: "reduce",
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/db.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/db.js", "utf8")
        .replaceAll('"../../js/', '"./')
        .replace(
          "export const callAdmin = async (name, data) => {",
          `export const callAdmin = async (name, data) => {
    if(name === "passwordRecoveryAction") {
      window.__recoveryAdminCalls = [...(window.__recoveryAdminCalls || []),data];
      return {data:{ok:true,code:"aBcdEFgh12345678ijkL_mNO",expiresAt:new Date(Date.now()+3600000).toISOString()}};
    }`,
        ),
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  await page.goto("http://127.0.0.1:5208/#/admin/players");
  const button = page.locator('[data-reset-password="joao"]');
  await button.waitFor();
  assert.equal(await button.getAttribute("aria-label"), "Reset password");
  await button.click();
  await page.locator("#authorize-recovery").click();
  await page.locator("#recovery-code").waitFor();
  assert.equal(
    await page.locator("#recovery-code").inputValue(),
    "aBcdEFgh12345678ijkL_mNO",
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    assert.ok(await page.locator("#copy-recovery").isVisible());
    await page
      .locator(".modal")
      .screenshot({
        path: `test-results/password-recovery/admin-${width}.png`,
      });
  }
  await page.locator("#revoke-recovery").click();
  assert.deepEqual(
    await page.evaluate(() => window.__recoveryAdminCalls.map((x) => x.action)),
    ["authorize", "cancel"],
  );
  await context.addInitScript(() => {
    window.__guest = true;
  });
  await page.reload();
  await page.locator("#auth-form").waitFor();
  await page.locator('[name="username"]').fill("joao");
  await page.locator("#toggle-recovery").click();
  assert.equal(await page.locator('[name="username"]').inputValue(), "joao");
  assert.equal(
    await page
      .locator('[name="recoveryCode"]')
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.locator('[name="recoveryCode"]').fill("aBcdEFgh12345678ijkL_mNO");
  await page.locator('[name="password"]').fill("ChosenPassword123!");
  await page.locator('[name="confirmPassword"]').fill("Mismatch123!");
  await page
    .locator('#auth-form button[type="submit"],#auth-form button:not([type])')
    .first()
    .click();
  assert.match(await page.locator("#auth-error").textContent(), /coincidem/);
  assert.equal(
    await page.evaluate(() => window.__recoveryCalls?.length || 0),
    0,
  );
  await page.locator('[name="confirmPassword"]').fill("ChosenPassword123!");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await page
      .locator(".auth-panel")
      .screenshot({
        path: `test-results/password-recovery/login-${width}.png`,
      });
  }
  await page.locator('[name="confirmPassword"]').focus();
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .locator("#auth-form button:not([type])")
      .first()
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__recoveryCalls?.length === 1);
  assert.equal(
    await page.evaluate(() => window.__recoveryCalls[0].username),
    "joao",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Recovery: admin authorization/revocation, login confirmation, keyboard and four viewport widths passed.",
  );
} finally {
  await browser.close();
  server.close();
}
