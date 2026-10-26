import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "./browser-sandbox.mjs";

const root = resolve(".");
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://localhost").pathname).slice(1) || "index.html";
  const absolute = resolve(root, path);
  if (relative(root, absolute).startsWith("..")) { res.writeHead(404); res.end(); return; }
  let body;
  if (path === "js/config.js") body = 'export const runtimeMode="fixtures";export const firebaseConfig={};';
  else if (path === "js/firebase.js") body = "export const configured=true;";
  else if (["js/auth.js", "js/db.js"].includes(path))
    body = readFileSync(resolve(root, "tests/fixtures", path.slice(3)), "utf8").replaceAll("../../js/", "./");
  else if (path === "tests/fixtures/casino.js")
    body = readFileSync(absolute, "utf8").replace("wallet: newCasinoWallet(),", "wallet: {...newCasinoWallet(),balance:100000},");
  else if (path === "wallet-test.html") body = "<!doctype html><title>Carteira de teste</title>";
  else if (existsSync(absolute)) body = readFileSync(absolute);
  else { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2" }[extname(path)] || "application/octet-stream");
  res.end(body);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}), args: ["--enable-unsafe-swiftshader"] });
mkdirSync("test-results", { recursive: true });
try {
  const page = await browser.newPage({ serviceWorkers: "block", reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => route.request().url().startsWith(origin + "/") ? route.continue() : route.abort());
  await page.goto(origin + "/wallet-test.html");
  const accounting = await page.evaluate(async () => {
    const { createCasinoLocalWallet } = await import("./js/casino-local-wallet.js");
    const { readCasinoLocal } = await import("./js/casino-local-store.js");
    let wallet = createCasinoLocalWallet("table-unit", () => {}, { tables: true });
    await wallet.start();
    const operation = { id: "stable-table-operation", debit: 100, credit: 200, entries: [{ id: "debit", amount: -100, label: "Aposta" }, { id: "credit", amount: 200, label: "Retorno" }] };
    const first = await wallet.settleTable("roulette", operation);
    const repeat = await wallet.settleTable("roulette", operation);
    let changedRejected = false, insufficientRejected = false;
    try { await wallet.settleTable("blackjack", operation); } catch { changedRejected = true; }
    try { await wallet.settleTable("blackjack", { id: "insufficient", debit: 200000, credit: 400000, entries: [{ id: "d", amount: -200000, label: "Aposta" }, { id: "c", amount: 400000, label: "Retorno" }] }); }
    catch (e) { insufficientRejected = e.applied === false && e.balance === first.balance; }
    const saved = await readCasinoLocal("table-unit");
    await wallet.close();
    wallet = createCasinoLocalWallet("table-unit", () => {}, { tables: true });
    await wallet.start();
    const recovered = await wallet.settleTable("roulette", operation);
    const after = await readCasinoLocal("table-unit");
    const calls = window.__casinoCalls.length;
    await Promise.all(Array.from({ length: 20 }, (_, i) => wallet.settleTable(i % 2 ? "blackjack" : "roulette", { id: `parallel-${i}`, debit: 20, credit: 0, entries: [{ id: "d", amount: -20, label: "Aposta" }] })));
    const balance = await wallet.balance();
    const noCalls = window.__casinoCalls.length === calls;
    const connected = await wallet.riftRequest("connect", {}, crypto.randomUUID());
    const riftId = crypto.randomUUID();
    const riftPayload = { sessionId: connected.sessionId, expectedRevision: connected.revision, previousRecordId: connected.state.pending?.id || null, bet: 1, hunt: false, buy: null };
    const riftFirst = await wallet.riftRequest("play", riftPayload, riftId);
    const riftRepeat = await wallet.riftRequest("play", riftPayload, riftId);
    const riftBalance = await wallet.balance();
    await wallet.close();
    wallet = createCasinoLocalWallet("table-unit", () => {}, { tables: true });
    await wallet.start();
    const riftRecovered = await wallet.riftRequest("play", riftPayload, riftId);
    await wallet.close();
    const disabled = createCasinoLocalWallet("table-disabled");
    let gated = false;
    try { await disabled.settleTable("roulette", operation); } catch { gated = true; }
    return { first, repeat, recovered, savedBalance: saved.balance, afterBalance: after.balance, balance, noCalls, changedRejected, insufficientRejected, gated, riftFirst, riftRepeat, riftRecovered, riftBalance };
  });
  assert.equal(accounting.first.balance, 100100);
  assert.deepEqual(accounting.repeat, accounting.first);
  assert.deepEqual(accounting.recovered, accounting.first);
  assert.equal(accounting.afterBalance, 100100);
  assert.equal(accounting.balance, 99700);
  assert.deepEqual(accounting.riftRepeat, accounting.riftFirst);
  assert.deepEqual(accounting.riftRecovered, accounting.riftFirst);
  assert.equal(Math.round(accounting.riftFirst.state.balance * 100), accounting.riftBalance);
  for (const key of ["noCalls", "changedRejected", "insufficientRejected", "gated"]) assert.equal(accounting[key], true, key);
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(origin + "/#/casino");
  for (const game of ["roulette", "blackjack"]) {
    await page.locator(`[data-casino-game="${game}"]`).click();
    const frame = page.frameLocator(".casino-table-mount iframe");
    await frame.locator("[data-balance]").filter({ hasText: /[0-9]/ }).waitFor();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(200);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${game} host ${width}`);
      assert.ok(await frame.locator("body").evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${game} iframe ${width}`);
      await page.screenshot({ path: `test-results/${game}-integrated-${width}.png`, fullPage: true });
    }
    const iframe = await page.locator(".casino-table-mount iframe").elementHandle();
    const rng = await page.evaluate(game => JSON.parse(localStorage.getItem(`atelier:${game}:website:pedro`)).state.rng, game);
    await page.locator("[data-center-game]").click();
    for (const [width, height] of [[1366, 768], [768, 1024], [390, 844], [320, 740], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(150);
      const beforeCenter = await page.locator(".casino-table-mount").boundingBox();
      await page.locator("[data-center-game]").click();
      await page.waitForTimeout(150);
      assert.ok(await frame.locator("body").evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth), `${game} fit ${width}x${height}`);
      const bounds = await page.locator(".casino-table-mount").boundingBox();
      assert.equal(bounds.width, beforeCenter.width, "centering preserves width");
      assert.equal(bounds.height, beforeCenter.height, "centering preserves height");
      assert.notEqual(await page.locator(".casino-page").evaluate(node => getComputedStyle(node).position), "fixed");
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= height + 1, "centered frame fits viewport");
      await page.screenshot({ path: `test-results/${game}-centered-${width}.png` });
    }
    assert.deepEqual(await page.evaluate(game => JSON.parse(localStorage.getItem(`atelier:${game}:website:pedro`)).state.rng, game), rng, "centering does not reset the engine");
    await page.locator("[data-center-game]").click();
    assert.ok(await iframe.evaluate(node => node === document.querySelector(".casino-table-mount iframe")), "same iframe after centering");
    await page.locator("[data-center-game]").click();
    await page.setViewportSize({ width: 390, height: 844 });
    await frame.getByLabel("Valor da ficha").selectOption("50");
    assert.equal(await frame.locator('[data-chip="50"]').getAttribute("aria-pressed"), "true");
    await frame.getByLabel("Valor da ficha").selectOption("100");
    await page.setViewportSize({ width: 1440, height: 1000 });
    const beforeCalls = await page.evaluate(() => window.__casinoCalls.length);
    if (game === "roulette") {
      await frame.locator(".number-grid [data-bet-id]").first().click();
      await frame.locator('[data-action="spin"]').click();
    } else {
      await frame.locator('[data-seat-join="0"]').click();
      await frame.locator('[data-seat-bet="0"]').click();
      await frame.locator('[data-action="deal"]').click();
      // A natural may settle immediately; only decisions have a stable leave guard.
      const phase = await page.evaluate(() => JSON.parse(localStorage.getItem("atelier:blackjack:website:pedro")).state.round?.phase);
      if (["play", "insurance"].includes(phase)) {
        await page.locator("[data-close-slot]").last().click();
        assert.equal(await page.locator(".casino-table-mount iframe").count(), 1);
      }
      for (let i = 0; i < 30; i++) {
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("atelier:blackjack:website:pedro")));
        if (!saved.state.round && !saved.pending) break;
        if (await frame.locator('[data-action="declineAll"]:not(:disabled)').count()) await frame.locator('[data-action="declineAll"]').click();
        else if (await frame.locator('[data-action="stand"]:not(:disabled)').count()) await frame.locator('[data-action="stand"]').click();
        await page.waitForTimeout(200);
      }
    }
    await page.waitForFunction(game => {
      const saved = JSON.parse(localStorage.getItem(`atelier:${game}:website:pedro`));
      return saved?.state.history.length === 1 && !saved.state.round && !saved.pending;
    }, game);
    const balance = await frame.locator("[data-balance]").innerText();
    const hostBalance = await page.locator(".casino-balance strong").innerText();
    assert.equal(Number(balance.replaceAll(/\s/g, "").replace(",", ".")), Number(hostBalance.replaceAll(/\s/g, "").replace(",", ".")));
    assert.equal(await page.evaluate(() => window.__casinoCalls.length), beforeCalls, "rounds stay local");
    await page.locator("[data-center-game]").click();
    assert.equal(await page.locator(".casino-table-mount iframe").count(), 1);
    await page.locator("[data-close-slot]").last().click();
    await page.locator(".casino-salon").waitFor({ state: "visible" });
  }
  assert.deepEqual(errors, []);
  console.log("Mesas locais: saldo partilhado, rondas completas, idempotência, limites, concorrência, recuperação, bloqueio de saída, 320/390/768/1440 px e zero chamadas por jogada passaram.");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
