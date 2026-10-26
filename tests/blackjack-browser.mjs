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
    await page.waitForTimeout(450);
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
  }
  await frame.locator('[data-action="add"]').click();
  await frame.locator('[data-action="bet"]').click();
  for (const { page: guest } of guests) {
    const gf = guest.frameLocator("iframe");
    await gf.locator('[data-action="add"]').click();
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
