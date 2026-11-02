import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "./browser-sandbox.mjs";

const reserve = createServer();
await new Promise(resolve => reserve.listen(0, "127.0.0.1", resolve));
const port = reserve.address().port;
await new Promise(resolve => reserve.close(resolve));
const server = spawn(process.execPath, ["scripts/dev-server.mjs", "--port", String(port)], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(Error("Local fixture server timed out")), 10000);
  server.stdout.on("data", data => { if (String(data).includes("Modo fixtures")) { clearTimeout(timer); resolve(); } });
  server.on("error", reject);
  server.on("exit", code => { if (code) reject(Error(`Local server exited: ${code}`)); });
});
const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
mkdirSync("test-results/football-clubs", { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block", reducedMotion: "reduce" });
  await context.route("https://media.api-sports.io/**", route => route.fulfill({ status: 404, body: "fixture: image unavailable" }));
  const page = await context.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const base = `http://127.0.0.1:${port}`;
  await page.goto(base);
  await page.getByRole("link", { name: "Escolhe o teu clube" }).click();
  await page.locator("[name=clubSearch]").fill("ben");
  await page.locator("[name=clubSearch]").fill("benf");
  await page.getByRole("button", { name: /Benfica.*Portugal/ }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.__clubSearches), ["benf"], "debounce sends only the last query");
  await page.locator(".club-result").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("[name=favoriteClubId]").inputValue(), "af-211");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await page.waitForURL("**/#/profile");
  await page.locator(".card-country-symbols .club-badge").first().waitFor();
  await page.waitForFunction(() => document.querySelector(".card-country-symbols .club-badge img")?.getAttribute("src") === "./assets/club-placeholder.svg");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `profile overflow at ${width}`);
  }
  await page.goto(`${base}/#/`);
  assert.equal(await page.getByRole("link", { name: "Escolhe o teu clube" }).count(), 0);
  await page.goto(`${base}/#/ranking`);
  await page.locator(".ranking-row .club-badge").waitFor();

  // Verify responsive search, errors, empty results and both allowed changes.
  for (const [query, expected] of [["sporting", "Sporting CP"], ["porto", "FC Porto"]]) {
    await page.goto(`${base}/#/profile/edit`);
    await page.locator("[name=clubSearch]").fill(query);
    await page.locator("[name=clubSearch]").press("Enter");
    await page.getByRole("button", { name: new RegExp(`${expected}.*Portugal`) }).click();
    await page.getByRole("button", { name: "Guardar perfil" }).click();
    await page.waitForURL("**/#/profile");
  }
  await page.goto(`${base}/#/profile/edit`);
  await page.locator("[name=clubSearch]").fill("benf");
  await page.locator("[name=clubSearch]").press("Enter");
  await page.getByRole("button", { name: /Benfica.*Portugal/ }).click();
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await page.getByText(/Já alteraste o clube duas vezes hoje/).waitFor();
  await page.locator("[name=clubSearch]").fill("unknown");
  await page.locator("[name=clubSearch]").press("Enter");
  await page.getByText(/Nenhum clube encontrado/).waitFor();
  await page.evaluate(() => { window.__clubSearchError = "Pesquisa de clubes ainda não configurada."; });
  await page.locator("[name=clubSearch]").fill("indisponivel");
  await page.locator("[name=clubSearch]").press("Enter");
  await page.getByText("Pesquisa de clubes ainda não configurada.", { exact: true }).waitFor();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `picker overflow at ${width}`);
  }
  await page.screenshot({ path: "test-results/football-clubs/profile-mobile.png", fullPage: true });

  // One shared renderer supplies catalogue previews, selector tiles and full cards.
  await page.evaluate(async () => {
    const { card, bindImages } = await import("./js/cards.js");
    const { ATTRIBUTES } = await import("./js/utils.js");
    const { historicalPlayer } = await import("./js/profile.js");
    const player = { uid: "sample", displayName: "Jogador com nome longo", countryCode: "PT", favoriteClub: { id: "af-211", name: "Benfica" }, primaryPosition: "GR", hasCard: true, ovr: 99, stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 99])), cardType: "gold-rare" };
    const old = historicalPlayer(player, { stats: {}, ovr: 75, baseCard: "gold-rare", appearance: {}, locked: true });
    if (old.favoriteClub !== null) throw Error("Old snapshots must not acquire the current club");
    document.querySelector("#main").innerHTML = `<div id="club-gallery" style="display:flex;flex-wrap:wrap;gap:24px;justify-content:center">${["gold-rare", "scrap", "toty", "bronze-foundry"].map(theme => card(player, { theme, preview: true, size: "md" })).join("")}</div>`;
    bindImages(document);
  });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const failures = await page.locator("#club-gallery .card-country-symbols").evaluateAll(elements => elements.flatMap(element => {
      const flag = element.firstElementChild.getBoundingClientRect(), club = element.querySelector(".club-badge").getBoundingClientRect();
      const card = element.closest(".football-card,.casino-shop-card").getBoundingClientRect();
      return club.top < flag.bottom - 1 || club.bottom > card.bottom || club.left < card.left || club.right > card.right ? [element.outerHTML] : [];
    }));
    assert.deepEqual(failures, [], `club must fit below country at ${width}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `gallery overflow at ${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/football-clubs/cards-desktop.png", fullPage: true });
  assert.deepEqual(errors, []);

  // The same picker participates in onboarding and keeps its choice on back/next.
  const guest = await context.newPage();
  await guest.addInitScript(() => { window.__guest = true; });
  await guest.goto(base);
  await guest.getByRole("button", { name: "Criar conta", exact: true }).click();
  await guest.locator("[name=username]").fill("clubtest");
  await guest.locator("[name=password]").fill("Password123");
  await guest.locator("[name=confirmPassword]").fill("Password123");
  await guest.getByRole("button", { name: "Continuar" }).click();
  await guest.locator("[name=displayName]").fill("Teste Clube");
  await guest.locator("[name=birthDate]").fill("1998-05-20");
  await guest.locator("[name=heightCm]").fill("178");
  await guest.locator("[name=preferredFoot]").selectOption("right");
  await guest.locator("[name=clubSearch]").fill("real");
  await guest.locator("[name=clubSearch]").press("Enter");
  await guest.getByRole("button", { name: /Real Madrid.*Spain/ }).click();
  await guest.getByRole("button", { name: "Continuar" }).click();
  await guest.getByRole("button", { name: "Voltar" }).click();
  assert.equal(await guest.locator("[name=favoriteClubId]").inputValue(), "af-541");
  await guest.getByRole("button", { name: "Continuar" }).click();
  await guest.getByRole("button", { name: "Continuar" }).click();
  await guest.getByRole("button", { name: "Criar conta e avaliar" }).click();
  await guest.waitForURL("**/#/missions/self");
  assert.equal(await guest.evaluate(async () => (await (await import("./js/db.js")).users()).find(user => user.uid === "new-user").favoriteClub.id), "af-541");
  console.log("Clubs UI: onboarding, editing, quota, debounce, keyboard, fallback, ranking, snapshots and 320/390/768/1440 px passed.");
} finally {
  await browser.close();
  server.kill();
}
