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
    body = readFileSync(absolute, "utf8").replace("wallet: {...newCasinoWallet(), balance:10000},", "wallet: {...newCasinoWallet(),balance:100000},");
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
  await page.locator('[data-casino-game="rift"]').click();
  const riftFrame=page.frameLocator('.casino-table-mount iframe');
  await riftFrame.locator('#spin:not(:disabled)').waitFor({timeout:30000});
  await riftFrame.locator('#board .tile').first().waitFor({timeout:30000});
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:844});
    await riftFrame.locator('#powerBanner').evaluate(banner=>{
      banner.className='power-readable';
      banner.innerHTML='<div class="power-copy"><strong>RIFT LINK</strong><div class="power-explanation">Colunas 4 → 3 · cópia</div></div><div class="power-preview">✦ → ✦</div>';
    });
    const fit=await riftFrame.locator('body').evaluate(()=>{
      const notice=document.querySelector('#powerBanner').getBoundingClientRect();
      const status=document.querySelector('#status').getBoundingClientRect();
      const controls=document.querySelector('footer').getBoundingClientRect();
      const board=document.querySelector('.board-frame').getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth-innerWidth,noticeBottom:notice.bottom,boardHeight:board.height,statusTop:status.top,controlsTop:controls.top};
    });
    await page.screenshot({path:`test-results/rift-integrated-${width}.png`,fullPage:true});
    assert.ok(fit.overflow<=1&&fit.boardHeight>=160&&fit.noticeBottom<=fit.statusTop&&fit.noticeBottom<=fit.controlsTop,`Rift integrated mobile layout ${width}: ${JSON.stringify(fit)}`);
    await riftFrame.locator('#powerBanner').evaluate(banner=>{banner.className='';banner.replaceChildren();});
  }
  await page.locator('[data-close-slot]').last().click();
  await page.setViewportSize({width:1440,height:1000});
  // The roulette uses the online room and the shared casino wallet.
  for (const game of ["roulette"]) {
    await page.locator(`[data-casino-game="${game}"]`).click();
    const frame = page.frameLocator(".casino-table-mount iframe");
    await frame.locator("[data-online]:not([hidden])").waitFor();
    await frame.locator(".online-player").filter({ hasText: "Pedro" }).waitFor();
    await page.evaluate(() => {
      window.__rouletteRoom.players.push({
        uid: "joao",
        name: "João com um nome bastante comprido 🏆",
        color: "#da77f2",
        activeUntil: Date.now() + 75000,
        plan: { "straight:0": 100 },
        total: 100,
        ready: true,
      });
      window.__notifyRoulette();
    });
    await frame.locator(".online-player").filter({ hasText: "João" }).waitFor();
    const otherChip = frame.locator(".others-layer .other-chip");
    await otherChip.first().waitFor();
    assert.match(await otherChip.first().getAttribute("title"), /João/, "other players' chips are visible on the felt");
    const iframe = await page.locator(".casino-table-mount iframe").elementHandle();
    const beforeCalls = await page.evaluate(() => window.__casinoCalls.length);
    await frame.locator('.number-grid [data-bet-id="straight:0"]').click();
    await frame.locator('[data-action="spin"]').click();
    await frame.locator(".winning-number").filter({ hasText: "0" }).waitFor();
    assert.equal(await frame.locator(".online-player").filter({ hasText: "João" }).locator("b").innerText(), "0,00");
    await page.waitForFunction(() => {
      const saved = JSON.parse(localStorage.getItem("atelier:roulette:online:pedro"));
      return saved?.state.history.length === 1 && !saved.state.round;
    });
    assert.equal(await page.evaluate(() => window.__rouletteRoom.phase), "betting", "the table reopens as soon as the round is paid");
    assert.equal(await frame.locator('.number-grid [data-bet-id="straight:0"]').isDisabled(), false, "betting is available right after the shared result");
    const balance = await frame.locator("[data-balance]").innerText();
    const hostBalance = await page.locator(".casino-wallet .casino-balance strong").innerText();
    assert.equal(Number(balance.replaceAll(/\s/g, "").replace(",", ".")), Number(hostBalance.replaceAll(/\s/g, "").replace(",", ".")));
    assert.equal(await page.evaluate(() => window.__casinoCalls.length), beforeCalls, "the round does not make an extra wallet/session read");
    await frame.locator('[data-online-tab="chat"]').click();
    await frame.locator(".online-chat-input").fill("Olá, mesa!");
    await frame.locator(".online-chat-input").press("Enter");
    await frame.locator(".online-message.is-mine").filter({ hasText: "Olá, mesa!" }).waitFor();
    await page.evaluate(() => {
      const other = {
        id: "other-player-message",
        uid: "joao",
        user: "João com nome comprido 🏆",
        color: "#da77f2",
        message: "Boa sorte!",
        createdAt: Date.now(),
      };
      const stale = { ...other, id: "stale-message", message: "Mensagem antiga", createdAt: Date.now() - 31 * 60 * 1000 };
      window.__rouletteMessages.push(other);
      for (const callback of window.__rouletteChatSubscribers || [])
        callback([...window.__rouletteMessages, stale]);
    });
    await frame.locator(".online-message:not(.is-mine)").filter({ hasText: "Boa sorte!" }).waitFor();
    assert.equal(await frame.locator(".online-message").filter({ hasText: "Mensagem antiga" }).count(), 0, "chat ignores messages older than 30 minutes");
    const alignment = await frame.locator(".online-chat-log").evaluate(log => {
      const mine = log.querySelector(".online-message.is-mine").getBoundingClientRect();
      const other = log.querySelector(".online-message:not(.is-mine)").getBoundingClientRect();
      return {
        mine: mine.left + mine.width / 2,
        other: other.left + other.width / 2,
        colors: [...log.querySelectorAll(".online-message strong")].map(node => getComputedStyle(node).color),
      };
    });
    assert.ok(alignment.mine > alignment.other, "own messages on the right, other players on the left");
    assert.notEqual(alignment.colors[0], alignment.colors[1], "players have distinct message colors");
    for (const [width, height] of [[1440, 1000], [768, 900], [390, 844], [320, 740]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(200);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${game} host ${width}`);
      const fit = await frame.locator("body").evaluate(() => {
        const form = document.querySelector(".online-chat-form").getBoundingClientRect();
        const children = [...document.querySelector(".online-chat-form").children].map(node => node.getBoundingClientRect());
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          formRight: form.right,
          childrenRight: Math.max(...children.map(rect => rect.right)),
          viewport: innerWidth,
        };
      });
      assert.ok(fit.overflow <= 1 && fit.formRight <= fit.viewport + 1 && fit.childrenRight <= fit.viewport + 1, `${game} chat layout ${width}: ${JSON.stringify(fit)}`);
      await page.screenshot({ path: `test-results/${game}-integrated-${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("[data-center-game]").click();
    assert.ok(await iframe.evaluate(node => node === document.querySelector(".casino-table-mount iframe")), "same iframe after centering");
    assert.equal(await page.locator(".casino-table-mount iframe").count(), 1);
    await page.locator("[data-close-slot]").last().click();
    await page.locator(".casino-salon").waitFor({ state: "visible" });
  }
  assert.deepEqual(errors, []);
  console.log("Roleta online: aposta/pagamento partilhados, saldo, chat, expiração de mensagens, alinhamento e 320/390/768/1440 px passaram.");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
