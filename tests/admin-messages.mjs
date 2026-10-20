import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "./browser-sandbox.mjs";
const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
mkdirSync("test-results/admin-messages", { recursive: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("http://localhost:5198/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/") return route.fulfill({ contentType: "text/html", body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/styles.css"><link rel="stylesheet" href="/css/responsive.css"><link rel="stylesheet" href="/css/experience.css"><main class="admin-layout" style="padding:16px;display:block" id="main"></main><div id="toast-region"></div>' });
    if (path === "/js/db.js") return route.fulfill({ contentType: "text/javascript", body: 'export async function callAdmin(name,data){window.__calls.push({name,data}); if(window.__fail)throw Error("Falha de teste");return {data:{sent:window.__sent}};}' });
    if (/^\/(js|css)\/[\w-]+\.(js|css)$/.test(path)) return route.fulfill({ contentType: path.endsWith("css") ? "text/css" : "text/javascript", body: readFileSync("." + path, "utf8") });
    return route.fulfill({ status: 404 });
  });
  await page.goto("http://localhost:5198/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    window.__calls = []; window.__sent = 2;
    const { mountAdminMessages } = await import("/js/admin-messages.js");
    const users = [{ uid: "a", displayName: "João António da Conceição e Silva", username: "joao" }, { uid: "b", displayName: "Álvaro", username: "alvaro" }, { uid: "c", displayName: "Carla" }, { uid: "d", displayName: "Inativo", disabled: true }];
    const games = [{ id: "match", title: "Peladinha da semana", scheduledAt: "2026-10-20T20:00:00Z", teamA: { starters: ["a"], bench: ["b"] }, teamB: { starters: ["d"] } }, { id: "empty", title: "Sem jogadores" }];
    window.__mount = () => mountAdminMessages({ league: { users, games } }, document.querySelector("main"));
    window.__mount();
  });
  const send = page.getByRole("button", { name: "Enviar mensagem" });
  assert.equal(await send.isDisabled(), true);
  await page.locator('[name="gameId"]').selectOption("match");
  assert.match(await page.locator("[data-recipient-count]").innerText(), /2/);
  assert.doesNotMatch(await page.locator("[data-recipient-names]").innerText(), /Carla|Inativo/);
  await page.locator('[name="title"]').fill("Jogo de amanhã");
  await page.locator('[name="body"]').fill("Confirma a tua presença.");
  await send.click();
  assert.deepEqual(await page.evaluate(() => window.__calls[0].data), { title: "Jogo de amanhã", body: "Confirma a tua presença.", audience: "game", gameId: "match" });
  await page.locator('[name="audience"][value="selected"]').check();
  assert.equal(await send.isDisabled(), true);
  await page.locator('[data-player-search]').fill("alvaro");
  assert.equal(await page.locator('[data-message-player]:visible').count(), 1);
  await page.locator('[data-message-player] input[value="b"]').check();
  await page.locator('[data-player-search]').fill("Carla");
  await page.locator('[data-message-player] input[value="c"]').check();
  assert.match(await page.locator('[data-recipient-count]').innerText(), /2/);
  await page.locator('[data-player-search]').fill("");
  await page.locator('[name="title"]').fill("Seleção"); await page.locator('[name="body"]').fill("Mensagem privada");
  await page.evaluate(() => window.__fail = true);
  await send.click();
  assert.match(await page.locator('[data-message-status]').innerText(), /Falha de teste/);
  assert.equal(await page.locator('[name="body"]').inputValue(), "Mensagem privada");
  await page.evaluate(() => window.__fail = false);
  await send.click();
  assert.deepEqual(await page.evaluate(() => window.__calls.at(-1).data.recipientIds), ["b", "c"]);
  await page.locator('[name="audience"][value="all"]').check();
  assert.match(await page.locator('[data-recipient-count]').innerText(), /3/);
  await page.locator('[name="title"]').fill("Todos"); await page.locator('[name="body"]').fill("Liga");
  await send.click();
  assert.deepEqual(await page.evaluate(() => window.__calls.at(-1).data), { title: "Todos", body: "Liga", audience: "all" });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    for (const mode of ["game", "selected", "all"]) {
      await page.locator(`[name="audience"][value="${mode}"]`).check();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${mode}/${width}`);
      await page.screenshot({ path: `test-results/admin-messages/${mode}-${width}.png`, fullPage: true });
    }
  }
  await page.locator('[name="audience"][value="game"]').focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator('[name="audience"][value="selected"]').isChecked(), true);
  assert.deepEqual(errors, []);
  console.log("Admin messages: all audiences, recipient preview, search, error/retry, keyboard and 1440/768/390/320 layouts passed.");
} finally { await browser.close(); }
