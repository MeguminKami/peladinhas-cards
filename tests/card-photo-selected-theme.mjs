import assert from "node:assert/strict";
import { chromium } from "./browser-sandbox.mjs";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  const page = await browser.newPage({ serviceWorkers: "block", viewport: { width: 1440, height: 1000 } });
  await page.goto("http://127.0.0.1:8082/");
  await page.locator("#main").waitFor();
  for (const [selectedCardId, selector] of [["football-p3", ".sca-football-p3"], ["base", ".football-card.gold-common"]]) {
    await page.evaluate(async selectedCardId => {
      const { editWeeklyCardPhotoPage } = await import("/js/admin-cards.js");
      document.querySelector("#photo-theme-test")?.remove();
      const root = document.createElement("section");
      root.id = "photo-theme-test";
      root.style.cssText = "max-width:1200px;margin:auto;padding:16px";
      document.body.append(root);
      window.__photoTestPlayer = {
        uid: "photo-player", displayName: "Jogador", hasCard: true, ovr: 85,
        cardType: "gold-common", selectedCardId, photoURL: "/assets/default-avatar.svg",
        specials: [{ id: "in-form" }, { id: "football-p3" }],
      };
      await editWeeklyCardPhotoPage({
        league: { cycle: { phase: "open", weekId: "fixture-week" }, players: [window.__photoTestPlayer] },
        render: html => { root.innerHTML = html; }, cleanup() {},
      }, "photo-player");
    }, selectedCardId);
    const root = page.locator("#photo-theme-test"), frame = root.locator(".card-photo");
    assert.equal(await root.locator(`#weekly-card-preview ${selector}`).count(), 1);
    assert.equal(await root.locator('[data-photo-tool]').count(), 0);
    assert.equal(await root.locator('input[type="range"]:visible').count(), 2, "only size and rotation initially");
    await frame.evaluate(el => { el.dataset.sameNode = "yes"; });
    await root.locator('[name="photoScale"]').fill("150");
    await root.locator('[name="photoScale"]').dispatchEvent("input");
    assert.equal(await frame.getAttribute("data-same-node"), "yes", "live edits reuse the image node");
    assert.match(await frame.getAttribute("style"), /scale\(1\.5\)/);
    await root.locator('[name="photoRotate"]').fill("15");
    await root.locator('[name="photoRotate"]').dispatchEvent("input");
    assert.match(await frame.getAttribute("style"), /rotate\(15deg\)/);
    const beforeKeyboard = await frame.boundingBox();
    await root.locator("#weekly-card-preview").focus();
    await page.keyboard.press("ArrowRight");
    assert.ok((await frame.boundingBox()).x > beforeKeyboard.x);
    const xBeforeDrag = Number(await root.locator('[name="photoX"]').inputValue());
    const bounds = await root.locator("#weekly-card-preview").boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 15, bounds.y + bounds.height / 2, { steps: 3 });
    await page.mouse.up();
    assert.ok(Number(await root.locator('[name="photoX"]').inputValue()) > xBeforeDrag, "canvas drag moves freely");
    await root.locator("summary").click();
    for (const key of ["photoX", "photoY"]) {
      await root.locator(`[name="${key}"]`).fill("-10");
      await root.locator(`[name="${key}"]`).dispatchEvent("input");
    }
    assert.equal(await frame.evaluate(el => getComputedStyle(el).overflow), "visible");
    assert.equal(await frame.evaluate(el => !!el.closest(".card-surface")), false, "outside the silhouette clip");
    const cardBounds = await root.locator("#weekly-card-preview > .football-card").boundingBox();
    const freeBounds = await frame.boundingBox();
    assert.ok(freeBounds.x < cardBounds.x && freeBounds.y < cardBounds.y, "image crosses the card border");
    await root.locator(".weekly-photo-stage").screenshot({ path: `artifacts/casino-shop/free-photo-outside-${selectedCardId}.png` });
    await root.locator("#save-weekly-photo").click();
    await page.waitForFunction(() => window.__photoTestPlayer.cardPhoto?.design?.placement === "free");
    const saved = await page.evaluate(async () => {
      const { card } = await import("/js/cards.js");
      const holder = document.createElement("div");
      holder.innerHTML = card(window.__photoTestPlayer, { preview: true, size: "lg" });
      const photo = holder.querySelector(".card-photo");
      return { style: photo.style.cssText, clipped: !!photo.closest(".card-surface"), design: window.__photoTestPlayer.cardPhoto.design };
    });
    assert.equal(saved.design.photoX, -10);
    assert.equal(saved.design.photoY, -10);
    assert.match(saved.style, /overflow: visible/);
    assert.equal(saved.clipped, false, "saved appearance also ignores the frame");
    await root.locator("#reset-photo-adjustments").click();
    assert.equal(await root.locator('[name="photoScale"]').inputValue(), "100");
    assert.equal(await root.locator('[name="photoRotate"]').inputValue(), "0");
    await root.locator("summary").click();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow ${width}`);
      await root.locator(".weekly-photo-stage").screenshot({ path: `artifacts/casino-shop/free-photo-${selectedCardId}-${width}.png` });
      await root.locator(".weekly-photo-editor").screenshot({ path: `artifacts/casino-shop/free-photo-controls-${selectedCardId}-${width}.png` });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  console.log("ADMIN photo: simplified controls, stable DOM, drag/keyboard, free placement, save and responsive preview passed.");
} finally { await browser.close(); }
