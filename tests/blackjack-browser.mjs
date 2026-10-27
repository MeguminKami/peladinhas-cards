import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
const origin = "http://127.0.0.1:8093";
const server = spawn(
  process.execPath,
  ["scripts/dev-server.mjs", "--port", "8093"],
  { stdio: ["ignore", "pipe", "pipe"] },
);
await new Promise((resolve, reject) => {
  server.stdout.once("data", resolve);
  server.once("error", reject);
  server.once("exit", () => reject(Error("Dev server failed")));
});
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  args: ["--enable-unsafe-swiftshader"],
});
const errors = [],
  results = [];
mkdirSync("test-results/blackjack", { recursive: true });
const http = async (uid, action, extra = {}) => {
  const t = await fetch(origin + "/__blackjack").then((r) => r.json());
  const response = await fetch(origin + "/__blackjack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid,
      name: uid,
      input: {
        action,
        id: crypto.randomUUID(),
        table: t?.id,
        revision: t?.revision,
        ...extra,
      },
    }),
  });
  const data = await response.json();
  assert.ok(response.ok, data.error);
  return data;
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) =>
    route
      .request()
      .url()
      .startsWith(origin + "/")
      ? route.continue()
      : route.abort(),
  );
  await page.goto(origin + "/#/casino");
  await page.locator('[data-casino-game="blackjack"]').click({ force: true });
  const frame = page.frameLocator(
    'iframe[title="Blackjack · Mesa partilhada"]',
  );
  await frame.locator("[data-people]").filter({ hasText: "1/5" }).waitFor();
  const guests = [];
  for (const uid of [
    "João com nome muito comprido 🏆",
    "Mariana",
    "André",
    "Rui",
  ]) {
    const guest = await browser.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    guest.on("pageerror", (e) => errors.push(e.message));
    await guest.route(origin + "/blackjack-test.html", (route) =>
      route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: `<!doctype html><html><body style="margin:0"><div id="game" style="height:844px"></div><script type="module">import {mountBlackjackMultiplayer} from './js/casino-blackjack.js';window.__blackjackUid=${JSON.stringify(uid)};window.__blackjackName=${JSON.stringify(uid)};window.game=mountBlackjackMultiplayer(document.querySelector('#game'),{uid:${JSON.stringify(uid)},onBalance(){},onExit(){}});document.querySelector('iframe').style.cssText='border:0;width:100%;height:100%';await window.game.ready;</script></body></html>`,
      }),
    );
    await guest.goto(origin + "/blackjack-test.html");
    await guest.frameLocator("iframe").locator("[data-people]").waitFor();
    guests.push({ uid, page: guest });
  }
  await frame.locator("[data-people]").filter({ hasText: "5/5" }).waitFor();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator('[data-center-game]').click();
    await page.waitForTimeout(450);
    assert.ok(await frame.locator('.control-bar').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+1), `Chips outside centered frame at ${width}`);
    assert.ok(await page.locator('iframe').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight-(getComputedStyle(document.querySelector('.bottom-nav')).display==='none'?0:document.querySelector('.bottom-nav').getBoundingClientRect().height)+1), `Centered frame clipped at ${width}`);
    const box = await frame
      .locator("body")
      .evaluate((el) => ({ width: el.clientWidth, scroll: el.scrollWidth }));
    assert.ok(
      box.scroll <= box.width + 1,
      `iframe overflow ${width}: ${JSON.stringify(box)}`,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `page overflow ${width}`,
    );
    const buttons = await frame
      .locator(".decision-dock button")
      .evaluateAll((els) =>
        els.map((el) => ({
          text: el.textContent,
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        })),
      );
    assert.ok(
      buttons.every((b) => b.height >= 44 && b.width >= 44),
      JSON.stringify(buttons),
    );
    await page.screenshot({
      path: `test-results/blackjack/${width}-betting.png`,
      fullPage: true,
    });
    results.push({ width, box, buttons });
    const layout = await frame.locator('.decision-dock').evaluate(dock => {
      const d=dock.getBoundingClientRect(),f=document.querySelector('.table-floor').getBoundingClientRect(),c=document.querySelector('.control-bar').getBoundingClientRect();
      return {dock:{top:d.top,bottom:d.bottom},floor:{top:f.top,bottom:f.bottom},control:c.top,style:document.querySelector(".table-floor").getAttribute("style"),layout:getComputedStyle(document.querySelector(".shell")).display,floorHeight:getComputedStyle(document.querySelector(".table-floor")).height};
    });
    assert.ok(layout.dock.top>=layout.floor.top-1&&layout.dock.bottom<=layout.floor.bottom+1&&layout.dock.bottom<=layout.control+1, `Action dock overlaps controls at ${width}px: ${JSON.stringify(layout)}`);
  }
  await frame.locator('[data-action^="add-"]').click();
  await frame.locator('[data-action="bet"]').click();
  for (const { page: guest } of guests) {
    const gf = guest.frameLocator("iframe");
    await gf.locator('[data-action^="add-"]').click();
    await gf.locator('[data-action="bet"]').click();
  }
  await frame.locator(".dealer-hud .card").first().waitFor();
  let iterations = 0;
  while (iterations++ < 30) {
    const t = await fetch(origin + "/__blackjack").then((r) => r.json());
    if (t.round?.phase === "summary") break;
    if (t.round?.phase === "insurance") {
      for (const p of t.round.seats.filter((p) => p.insured === null)) {
        const owner = t.players.find((x) => x.seat === p.number);
        await http(owner.uid, "decline");
      }
    } else if (t.round?.active) {
      const p = t.round.seats.find((p) =>
          p.hands.some((h) => h.id === t.round.active),
        ),
        owner = t.players.find((x) => x.seat === p.number);
      if (owner.uid === "pedro") {
        await frame.locator('[data-action="stand"]').waitFor();
        await frame.locator('[data-action="stand"]').click();
      } else {
        const guest = guests.find((g) => g.uid === owner.uid);
        assert.ok(
          guest,
          JSON.stringify({
            owner,
            players: t.players,
            guests: guests.map((g) => g.uid),
          }),
        );
        const gf = guest.page.frameLocator("iframe");
        await gf.locator('[data-action="stand"]').waitFor();
        await gf.locator('[data-action="stand"]').click();
      }
    }
  }
  await frame.locator(".decision-caption").filter({ hasText: /DJC/ }).waitFor();
  await page.screenshot({
    path: "test-results/blackjack/320-summary.png",
    fullPage: true,
  });
  for (const { page: guest } of guests)
    await guest
      .frameLocator("iframe")
      .locator(".decision-caption")
      .filter({ hasText: /DJC/ })
      .waitFor();
  // Settings and keyboard focus, without leaving the local fixture server.
  await frame.locator('[data-action="rules"]').click();
  await frame.locator("dialog[open]").waitFor();
  await page.keyboard.press("Escape");
  await frame.locator('[data-action="rules"]').focus();
  assert.ok(
    await frame
      .locator('[data-action="rules"]')
      .evaluate((el) => el.matches(":focus-visible")),
  );
  // Reopen the same public table with one person occupying two places.
  for (const uid of ["pedro", ...guests.map((g) => g.uid)])
    await http(uid, "leave");
  const closingTable = await fetch(origin + "/__blackjack").then((r) =>
    r.json(),
  );
  if (closingTable?.deadline)
    await page.waitForTimeout(
      Math.max(0, closingTable.deadline - Date.now() + 100),
    );
  await http("pedro", "tick");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    window.__cardSounds = 0;
    const original = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      window.__cardSounds++;
      return original.call(this);
    };
  });
  await page.reload();
  await page.locator('[data-casino-game="blackjack"]').click({ force: true });
  await frame.locator('[data-action="repeat"]:enabled').waitFor();
  await frame.locator('[data-action="repeat"]').click();
  assert.equal(await frame.locator('[data-bet]').innerText(),'1,00');
  await frame.locator('[data-action="double-bet"]').click();
  assert.equal(await frame.locator('[data-bet]').innerText(),'2,00');
  await frame.locator('[data-action="undo"]').click();
  assert.equal(await frame.locator('[data-bet]').innerText(),'1,00');
  await frame.locator('[data-action="clear"]').click();
  assert.equal(await frame.locator('[data-bet]').innerText(),'0,00');
  await frame.locator('[data-action="occupy-2"]').click();
  await frame.locator("[data-people]").filter({ hasText: "2/5" }).waitFor();
  assert.equal(
    await frame.locator('button.avatar[data-action^="focus-"]').count(),
    2,
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(100);
    assert.ok(
      await frame
        .locator("body")
        .evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    );
    const colors = await frame
      .locator(".decision-dock button")
      .evaluateAll((buttons) =>
        buttons.map((b) => getComputedStyle(b).backgroundImage),
      );
    assert.equal(
      new Set(colors).size,
      5,
      "Reset, Limpar, Repetir, Dobrar aposta and Pronto have distinct colors",
    );
    await page.screenshot({
      path: `test-results/blackjack/${width}-two-places.png`,
      fullPage: true,
    });
  }
  await frame.locator('[data-action="add-1"]').click();
  await frame.locator('[data-action="bet"]').click();
  await frame.locator('[data-action="add-2"]').click();
  await frame.locator('[data-action="bet"]').click();
  for (let i = 0; i < 12; i++) {
    const table = await fetch(origin + "/__blackjack").then((r) => r.json());
    if (table.round?.phase === "summary") break;
    if (table.round?.phase === "insurance") {
      for (const s of table.round.seats.filter((s) => s.insured === null)) {
        await frame.locator(`[data-action="focus-${s.number}"]`).click();
        await frame.locator('[data-action="decline"]').click();
      }
    } else {
      await frame.locator('[data-action="stand"]').waitFor();
      await frame.locator('[data-action="stand"]').click();
    }
  }
  await frame.locator(".decision-caption").filter({ hasText: /DJC/ }).waitFor();
  assert.ok(
    await frame.locator("body").evaluate(() => window.__cardSounds >= 6),
    "paper card sounds were synthesized for the deal",
  );
  const dealer = await frame.locator("[data-dealer-total]").evaluate((el) => {
    const total = el.getBoundingClientRect(),
      cards = el.previousElementSibling.getBoundingClientRect();
    return {
      text: el.textContent,
      afterCards: total.top >= cards.bottom + 4,
      size: parseFloat(getComputedStyle(el).fontSize),
    };
  });
  assert.ok(
    dealer.afterCards && dealer.size >= 18 && /^\d+$/.test(dealer.text),
    JSON.stringify(dealer),
  );
  await page.screenshot({
    path: "test-results/blackjack/320-two-places-summary.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  writeFileSync(
    "test-results/blackjack/browser.json",
    JSON.stringify(
      { date: new Date().toISOString(), results, errors },
      null,
      2,
    ),
  );
  console.log(
    "Blackjack: five players, complete shared round, 1440/768/390/320px, reduced motion and keyboard passed.",
  );
} finally {
  await browser.close();
  server.kill();
}
