import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "./browser-sandbox.mjs";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    // The fixture's weekly ID is filled below from the application's own clock.
    sessionStorage.setItem(
      "casino-fixture-wallet",
      JSON.stringify({
        wallet: {
          edition: "official-2026-10-27-reset-200",
          sessionProtocol: 5,
          balance: 3000000,
          revision: 1,
          earned: 0,
          matches: 0,
          recent: [],
        },
        sessions: {},
        operations: {},
        rounds: {},
      }),
    );
  });
  await page.goto("http://127.0.0.1:8082/#/casino");
  await page.locator('[href="#/shop"].casino-shop-link').waitFor();
  await page.evaluate(async () => {
    const { cardWeek } = await import("/js/card-week.js");
    window.__testState.weeklyCards = [
      {
        uid: "pedro",
        weekId: cardWeek().weekId,
        hasCard: true,
        ovr: 80,
        primaryPosition: "GR",
        stats: { pace: 91, shooting: 79, passing: 78, dribbling: 77, defending: 76, physical: 75, goalkeeping: 94, stamina: 73 },
        previousStats: { pace: 89 },
        ovrDelta: 1,
        cardPhoto: { photoURL: "./assets/default-avatar.svg", design: { photoX: -50, photoY: 100, photoWidth: 160, photoHeight: 120, photoScale: 125 } },
      },
    ];
  });
  await page.locator('[href="#/shop"].casino-shop-link').click();
  await page
    .locator('[data-buy="football-p1"]')
    .waitFor({ timeout: 12000 })
    .catch(async (error) => {
      console.log(await page.locator("body").innerText());
      console.log(
        await page.evaluate(() => ({
          calls: window.__casinoCalls,
          errors: window.__errors,
        })),
      );
      console.log(errors);
      throw error;
    });
  assert.equal(await page.locator(".shop-item").count(), 17);
  assert.equal(await page.locator(".shop-item").first().locator(".sca-stats > span").count(), 8);
  assert.deepEqual(await page.locator(".shop-item").first().locator(".sca-stats small").allTextContents(), ["VEL", "FIN", "PAS", "DRI", "DEF", "FIS", "GR", "RES"]);
  assert.match(await page.locator(".shop-item").first().locator(".sca-rating").innerText(), /OVR[\s\S]*GR/);
  assert.equal(await page.locator('#header a[href="#/shop"]').count(), 1);
  assert.ok((await page.locator(".shop-wallet .djabucoin").count()) > 0);
  await mkdir("artifacts/casino-shop", { recursive: true });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const photo of await page.locator(".sca-photo-frame").all()) {
      const bounds = await photo.boundingBox();
      assert.ok(Math.abs(bounds.width - bounds.height) < 1, `square portrait ${width}`);
      assert.equal(await photo.evaluate(el => getComputedStyle(el).overflow), "hidden");
    }
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow ${width}`,
    );
    await page.locator(".shop-item").first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `artifacts/casino-shop/square-integrated-${width}.png`,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('[data-filter="games"]').click();
  await page.locator('[data-preview="roulette-european"]').focus();
  await page.keyboard.press("Enter");
  await page.locator(".shop-preview-dialog[open] .sca-photo-frame").waitFor();
  await page.screenshot({ path: "artifacts/casino-shop/square-preview-1440.png" });
  await page.keyboard.press("Escape");
  await page.locator('[data-buy="roulette-european"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/casino-shop/square-games-1440.png" });
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.locator('[data-filter="premium"]').click();
  await page.locator('[data-buy="football-p1"]').click();
  await page.locator('.shop-confirm [value="cancel"]').click();
  await page.locator('[data-buy="football-p1"]:enabled').waitFor();
  await page.locator('[data-buy="football-p1"]').click();
  await page.locator('.shop-confirm [value="buy"]').click();
  await page.locator(".shop-toast.is-success").waitFor();
  await page.locator('[data-buy="football-p1"]:disabled').waitFor();
  assert.match(await page.locator("#shop-balance").textContent(), /22/);
  await page.evaluate(() => (location.hash = "#/profile"));
  await page.locator("#choose-weekly-card").click();
  const purchased = page.locator('[data-select-card="football-p1"]');
  await purchased.waitFor();
  assert.equal(await purchased.locator(".sca-stats > span").count(), 8);
  await purchased.click();
  await page.locator("#save-card").click();
  await page.locator(".player-hero .sca-football-p1").waitFor();
  assert.equal(await page.locator(".player-hero .sca-stats > span").count(), 8);
  await page.screenshot({ path: "artifacts/casino-shop/square-purchased-profile-320.png" });
  await page.evaluate(() => (location.hash = "#/players/cards"));
  await page.locator(".catalog-entry h3", { hasText: "P1" }).waitFor();
  const tile = page
    .locator(".catalog-entry")
    .filter({ hasText: "P1 · Talento de Bronze" });
  await tile.locator(".catalog-details-link").click();
  await page.locator(".catalog-holders").waitFor();
  assert.match(await page.locator(".catalog-holders").textContent(), /Pedro/);
  assert.equal(
    (await page.locator(".card-shop .sca-football-p1").count()) > 0,
    true,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.locator("#modal-root .close-modal").click();
  await page.evaluate(() => (location.hash = "#/admin/card-types"));
  await page.locator("#card-type-gallery").waitFor();
  assert.equal(
    await page
      .locator(".card-type-tile")
      .filter({ has: page.locator(".card-shop") })
      .count(),
    17,
  );
  await page.locator('[data-card-type="football-p4"]').click();
  await page.locator("#modal-root .sca-football-p4").waitFor();
  await page
    .locator("#modal-root .modal")
    .screenshot({ path: "artifacts/casino-shop/square-integrated-admin.png" });
  assert.equal(
    await page.evaluate(
      () =>
        window.__casinoCalls.filter((c) => c.name === "getCasinoShop").length,
    ),
    1,
  );
  assert.equal(
    await page.evaluate(
      () =>
        window.__casinoCalls.filter((c) => c.name === "buyCasinoCard").length,
    ),
    1,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Integrated shop: route, header, currency, five widths, confirmation/cancel, debit, public discovery and owner passed.",
  );
} finally {
  await browser.close();
}
