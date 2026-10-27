import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "./browser-sandbox.mjs";
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
try {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:8082/assets/casino/shop/");
  await page.locator("[data-buy]").first().waitFor();
  assert.equal(await page.locator(".shop-item").count(), 13);
  assert.equal(await page.locator(".shop-rank").count(), 8);
  await mkdir("artifacts/casino-shop", { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow at ${width}`,
    );
    await page.screenshot({
      path: `artifacts/casino-shop/shop-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-filter="metals"]').click();
  await page
    .locator("#shop-grid")
    .screenshot({ path: "artifacts/casino-shop/metals-detail.png" });
  await page.locator('[data-filter="games"]').click();
  await page
    .locator("#shop-grid")
    .screenshot({ path: "artifacts/casino-shop/games-detail.png" });
  await page.setViewportSize({ width: 320, height: 1000 });
  assert.equal(await page.locator(".shop-item").count(), 5);
  await page.locator('[data-preview="roulette-european"]').focus();
  await page.keyboard.press("Enter");
  await page.locator("dialog[open]").waitFor();
  assert.equal(
    await page.evaluate(() =>
      document.querySelector("dialog").contains(document.activeElement),
    ),
    true,
  );
  assert.equal(
    await page
      .locator("dialog")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
  );
  await page.screenshot({
    path: "artifacts/casino-shop/roulette-preview-320.png",
  });
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .locator('[data-preview="roulette-european"]')
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.locator('[data-filter="all"]').click();
  await page.locator('[data-buy="bronze-foundry"]').click();
  await page.locator(".shop-toast.is-success").waitFor();
  assert.equal(
    await page.locator('[data-buy="bronze-foundry"]').isDisabled(),
    true,
  );
  await page.reload();
  await page.locator('[data-buy="bronze-foundry"]:disabled').waitFor();
  await page.locator('[data-buy="osmium-apex"]').click();
  await page.locator(".shop-toast.is-error").waitFor();
  assert.match(await page.locator("#shop-feedback").innerText(), /95 OVR/);
  await page.locator("summary").click();
  await page.locator('[name="balance"]').fill("0");
  await page.locator('[name="ovr"]').fill("99");
  await page.locator("#shop-fixtures button").click();
  await page.locator('[data-buy="silver-mirror"]').click();
  await page.waitForFunction(() =>
    document
      .querySelector("#shop-feedback")
      .textContent.includes("Saldo insuficiente"),
  );
  assert.match(
    await page.locator("#shop-feedback").innerText(),
    /Saldo insuficiente/,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".casino-shop-card")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    "0s",
  );
  await page.locator('[data-filter="owned"]').click();
  assert.equal(await page.locator(".shop-item").count(), 1);
  await page.keyboard.press("Tab");
  await page.evaluate(() =>
    localStorage.setItem(
      "peladinhas:casino:shop-demo:v1",
      JSON.stringify({
        balance: 30000,
        ovr: 95,
        owned: ["peladinhas-founders", "casino-royal"],
      }),
    ),
  );
  await page.reload();
  await page.locator('[data-filter="owned"]').click();
  assert.equal(await page.locator(".shop-item").count(), 2);
  assert.equal(
    await page.locator('[data-buy="casino-royal"]').isDisabled(),
    true,
  );
  assert.equal(
    await page.locator("#shop-collection-count").innerText(),
    "2 / 15",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "Shop: 13 editions, four widths, preview keyboard/focus, purchase persistence, OVR and balance errors, archived collection and reduced motion passed.",
  );
} finally {
  await browser.close();
}
