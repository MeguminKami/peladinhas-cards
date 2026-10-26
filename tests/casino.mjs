import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "./browser-sandbox.mjs";
import { createSession } from '../games/futebol/src/session.ts';

const root = resolve(".");
const server = createServer((req, res) => {
  const path = resolve(
    root,
    decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "") ||
      "index.html",
  );
  if (relative(root, path).startsWith("..") || !existsSync(path)) {
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
      ".png": "image/png",
      ".webp": "image/webp",
      ".woff2": "font/woff2",
      ".woff": "font/woff",
    }[extname(path)] || "text/plain",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
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
  const fixtureSession=createSession('casino-ui-fixed');fixtureSession.balance=10000;
  await context.addInitScript(snapshot=>{
    const key='slot-local-v1:player:pedro%3Aofficial-2026-10-26-cardoso-reset';
    if(!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(snapshot));
  },fixtureSession);
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  for (const name of ["auth", "db"])
    await context.route(`**/js/${name}.js`, (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: readFileSync(`tests/fixtures/${name}.js`, "utf8").replaceAll(
          "../../js/",
          "./",
        ),
      }),
    );
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(15000);
  const base = `http://127.0.0.1:${server.address().port}`;
  await page.goto(`${base}/#/casino`);
  await page.waitForFunction(
    () =>
      document.querySelector(".casino-balance strong")?.textContent === "100",
  );
  assert.equal(await page.locator(".casino-game").count(), 5);
  assert.equal(
    await page.locator('#header a[href="#/casino"]').count(),
    0,
    "hidden from all navigation",
  );
  assert.equal(await page.evaluate(() => window.__casinoCalls.length), 1);
  assert.equal(new URL(page.url()).hash, "#/casino");
  await page.locator('[data-casino-filter="slots"]').click();
  assert.equal(await page.locator(".casino-game:visible").count(), 3);
  await page.locator('[data-casino-filter="tables"]').click();
  assert.equal(await page.locator(".casino-game:visible").count(), 2);
  assert.equal(await page.locator('[data-casino-game="blackjack"]').isEnabled(), true);
  await page.locator('[data-casino-filter="all"]').click();
  await page.locator("[data-wallet-history]").click();
  assert.equal(
    await page.getByText("Boas-vindas à liga", { exact: true }).count(),
    1,
  );
  await page.keyboard.press("Escape");
  for (const theme of ["club", "volt", "champions", "ultimate"]) {
    await page.evaluate(
      async (theme) => (await import("./js/themes.js")).applyTheme(theme),
      theme,
    );
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1050 });
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${theme} ${width} page overflow`,
      );
      for (const selector of [
        "[data-wallet-refresh]",
        '[data-casino-game="futebol"]',
      ]) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box.height >= 44);
      }
      await page.screenshot({
        path: `test-results/casino-${theme}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    const state = JSON.parse(sessionStorage.getItem("casino-fixture-wallet"));
    state.wallet.balance = 1000000000000;
    state.wallet.recent = [];
    sessionStorage.setItem("casino-fixture-wallet", JSON.stringify(state));
  });
  await page.locator("[data-wallet-refresh]").click();
  await page.waitForFunction(
    () =>
      document
        .querySelector(".casino-balance strong")
        ?.textContent.replace(/\s/g, "") === "10000000000",
  );
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1050 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "maximum balance fits",
    );
  }
  await page.locator("[data-wallet-history]").click();
  await page.getByText("Ainda não há movimentos.", { exact: false }).waitFor();
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const state = JSON.parse(sessionStorage.getItem("casino-fixture-wallet"));
    state.wallet.balance = 10000;
    sessionStorage.setItem("casino-fixture-wallet", JSON.stringify(state));
  });
  await page.locator("[data-wallet-refresh]").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".casino-balance strong")?.textContent === "100",
  );
  await page.keyboard.press("Tab");
  await page.locator("[data-wallet-refresh]").focus();
  assert.equal(
    await page
      .locator("[data-wallet-refresh]")
      .evaluate((el) => getComputedStyle(el).outlineStyle),
    "solid",
  );
  await page.evaluate(() => {
    window.__casinoFail = true;
  });
  await page.locator("[data-wallet-refresh]").click();
  await page
    .getByText("A confirmação online fica pendente.", { exact: false })
    .waitFor();
  assert.equal(
    await page.locator(".casino-balance strong").textContent(),
    "100",
  );
  await page.evaluate(() => {
    window.__casinoFail = false;
    window.__casinoGate = new Promise((r) => (window.__casinoRelease = r));
  });
  await page.locator("[data-wallet-refresh]").click();
  assert.equal(await page.locator("[data-wallet-refresh]").isDisabled(), true);
  await page.evaluate(() => {
    window.__casinoRelease();
    window.__casinoGate = null;
  });
  await page.waitForFunction(
    () => !document.querySelector("[data-wallet-refresh]").disabled,
  );
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.evaluate(async () =>
    (await import("./js/themes.js")).applyTheme("club"),
  );
  await page.locator('[data-casino-game="futebol"]').click();
  const frame = page.frameLocator(".casino-slot-mount iframe");
  await frame.locator('body[data-assets="ready"]').waitFor({ timeout: 45000 });
  await frame.locator("#spin:not(:disabled)").waitFor();
  const before = await page.evaluate(() => window.__casinoCalls.length);
  await frame.locator("body").evaluate(() => {
    const key = "slot-local-v1:player:pedro%3Aofficial-2026-10-26-cardoso-reset";
    localStorage.setItem(
      key + ":preferences",
      JSON.stringify({
        speed: "super",
        autoFs: false,
        reduced: true,
        sound: false,
        lines: false,
      }),
    );
  });
  await frame.locator("body").evaluate(() => location.reload());
  await frame.locator('body[data-assets="ready"]').waitFor({ timeout: 45000 });
  await frame.locator("#spin:not(:disabled)").waitFor();
  await frame.locator("#spin").click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("slot-local-v1:player:pedro%3Aofficial-2026-10-26-cardoso-reset"))?.history
        ?.length === 1,
  );
  await page.waitForFunction(
    () => !localStorage.getItem("slot-local-v1:player:pedro%3Aofficial-2026-10-26-cardoso-reset:wallet-pending"),
  );
  const after = await page.evaluate(() => ({
    calls: window.__casinoCalls,
    state: JSON.parse(localStorage.getItem("slot-local-v1:player:pedro%3Aofficial-2026-10-26-cardoso-reset")),
    wallet: JSON.parse(sessionStorage.getItem("casino-fixture-wallet")).wallet,
  }));
  assert.equal(
    after.calls.length,
    before,
    "no online balance reads before spins",
  );
  assert.equal(
    after.state.balance,
    10000 - after.state.history[0].cost + after.state.history[0].paid,
  );
  assert.equal(after.wallet.balance, 10000, "ordinary spins remain local");
  assert.equal(after.state.history.length, 1);
  await page
    .getByText("Guardado no dispositivo", { exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 1050 });
  await page
    .locator(".casino-wallet")
    .screenshot({ path: "test-results/casino-local-wallet-390.png" });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await frame
    .locator("#state")
    .filter({ hasText: /^(?!A apresentar$)/ })
    .waitFor({ timeout: 45000 });
  await frame.locator("#fullscreen").click();
  await frame.locator('body[data-expanded="true"]').waitFor();
  assert.equal(await page.locator(".casino-slot-mount iframe").count(), 1);
  await frame.locator("#fullscreen").click();
  await frame.locator('body[data-expanded="false"]').waitFor();
  await page.locator("[data-wallet-refresh]").click();
  await page.waitForFunction(
    () => !document.querySelector("[data-wallet-refresh]").disabled,
  );
  assert.equal(
    await page.locator(".casino-slot-mount iframe").count(),
    1,
    "manual wallet refresh keeps the same game",
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `slot host ${width} overflow`,
    );
    assert.ok(
      await frame
        .locator("body")
        .evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `slot ${width} overflow`,
    );
    await page.screenshot({
      path: `test-results/casino-slot-${width}.png`,
      fullPage: true,
    });
  }
  await page.locator("[data-close-slot]").last().click();
  assert.equal(await page.locator(".casino-slot-mount iframe").count(), 0);
  // A lost checkpoint reply must recover the same on-device progress.
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.locator('[data-casino-game="futebol"]').click();
  await frame.locator('body[data-assets="ready"]').waitFor({ timeout: 45000 });
  await frame.locator("#spin:not(:disabled)").waitFor();
  await frame.locator("#spin").click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("slot-local-v1:player:pedro%3Aofficial-2026-10-26-cardoso-reset"))?.history
        ?.length === 2,
  );
  await page.evaluate(() => {
    window.__casinoLoseResponse = true;
  });
  await page.locator("[data-close-slot]").last().click();
  await page.waitForFunction(
    async () =>
      !!(
        await (
          await import("./js/casino-local-store.js")
        ).readCasinoLocal("pedro")
      )?.pending,
  );
  const saved = await page.evaluate(() => ({
    progress: JSON.parse(localStorage.getItem("slot-local-v1:player:pedro%3Aofficial-2026-10-26-cardoso-reset")),
    wallet: JSON.parse(sessionStorage.getItem("casino-fixture-wallet")).wallet
      .balance,
  }));
  await page.evaluate(() => {
    window.__casinoFail = true;
  });
  await page.reload();
  await page.locator('[data-casino-game="futebol"]').click();
  await frame.locator('body[data-assets="ready"]').waitFor({ timeout: 45000 });
  await page.waitForFunction(
    () => !localStorage.getItem("slot-local-v1:player:pedro%3Aofficial-2026-10-26-cardoso-reset:wallet-pending"),
  );
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("slot-local-v1:player:pedro%3Aofficial-2026-10-26-cardoso-reset")).rngState,
    ),
    saved.progress.rngState,
  );
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(sessionStorage.getItem("casino-fixture-wallet")).wallet
          .balance,
    ),
    saved.wallet,
  );
  await page.locator("[data-close-slot]").last().click();
  await page
    .getByRole("button", { name: "Terminar sessão", exact: true })
    .click();
  await page.waitForFunction(() => !document.querySelector(".casino-page"));
  assert.equal(await page.locator("iframe").count(), 0);
  assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('casino-fixture-wallet')).wallet.activeCasinoSession),null,'logout saves before losing authentication');
  assert.deepEqual(errors, []);
  console.log(
    "Casino: themes, 320/390/768/1440 px, keyboard, reduced motion, wallet errors, iframe, local spins without remote calls, checkpoint recovery and logout passed using local fixtures.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
