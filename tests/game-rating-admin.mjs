import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "./browser-sandbox.mjs";
const root = resolve(".");
const server = createServer((req, res) => {
  const path = resolve(
    root,
    decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "") ||
      "index.html",
  );
  if (!path.startsWith(root) || !existsSync(path)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".css": "text/css",
      ".html": "text/html",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
    }[extname(path)] || "application/octet-stream",
  );
  res.end(readFileSync(path));
});
await new Promise((resolve) => server.listen(5224, "127.0.0.1", resolve));
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
mkdirSync("test-results", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.clock.install({ time: new Date("2026-10-16T12:00:00Z") });
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/db.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body:
        readFileSync("tests/fixtures/db.js", "utf8").replace(
          "'../../js/utils.js'",
          "'./utils.js'",
        ) +
        '\nObject.assign(window.__testState, JSON.parse(sessionStorage.getItem("ratingSeed") || "{}"));',
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:5224");
  await page.getByRole("heading", { name: "No topo da liga" }).waitFor();
  const navigate = async (hash) => {
    await page.evaluate((value) => (location.hash = value), hash);
    await page.waitForTimeout(250);
    await page.locator("#main h1").first().waitFor();
  };
  await page.evaluate(() => {
    const state = window.__testState;
    const base = state.users[1];
    state.users.push({
      ...base,
      uid: "maria",
      username: "maria",
      displayName: "Maria com um nome muito comprido para testar o painel",
    });
    state.games = [
      {
        id: "rating-ui",
        title: "Peladinha de sexta-feira com nome comprido",
        status: "closed",
        closedAt: { seconds: Math.floor(Date.now() / 1000) },
        scheduledAt: { seconds: Math.floor(Date.now() / 1000) },
        teamA: { starters: ["pedro", "joao"], bench: [] },
        teamB: { starters: ["maria"], bench: [] },
        score: { teamA: 2, teamB: 1 },
      },
    ];
    state.feedback = [
      ...["pedro", "joao", "maria"].map((targetId) => ({
        raterId: "pedro",
        targetId,
        submitted: true,
      })),
      { raterId: "joao", targetId: "pedro", submitted: true },
      { raterId: "joao", targetId: "joao", submitted: false },
    ];
  });
  await page.evaluate(() =>
    sessionStorage.setItem("ratingSeed", JSON.stringify(window.__testState)),
  );
  await page.reload();
  await page.getByRole("heading", { name: "No topo da liga" }).waitFor();
  await navigate("#/admin/games");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await page.evaluate(() => {
      window.__testState.ratingReminders = [];
    });
    await page.getByRole("button", { name: "Avaliações", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Avaliações do jogo" });
    await dialog.getByText("Parcial", { exact: true }).waitFor();
    await dialog.getByText("Concluído", { exact: true }).waitFor();
    await dialog.getByText("Por iniciar", { exact: true }).waitFor();
    assert.equal(
      await dialog
        .getByRole("button", { name: "Lembrar Pedro", exact: true })
        .isDisabled(),
      true,
    );
    await dialog.locator('[data-waive="joao"]').click();
    await dialog.locator('[data-confirm-waiver]').waitFor();
    await page.screenshot({path:`test-results/game-rating-waiver-${width}.png`,fullPage:true});
    await dialog.locator('[data-confirm-waiver]').click();
    await dialog.getByText("Votos em falta anulados",{exact:true}).waitFor();
    assert.equal(await dialog.locator('[data-remind="joao"]').isDisabled(),true);
    assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth+1),false,"waived status does not overflow");
    await dialog.locator('[data-waive="joao"]').click();
    await dialog.locator('[data-confirm-waiver]').click();
    await dialog.getByText("Parcial",{exact:true}).waitFor();
    await dialog.locator("[data-select-all]").check();
    await dialog
      .getByRole("button", { name: "Lembrar selecionados (2)" })
      .click();
    await dialog.getByText("2 lembretes enviados.", { exact: true }).waitFor();
    assert.deepEqual(
      await page.evaluate(() => window.__testState.ratingReminders.sort()),
      ["joao", "maria"],
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    assert.equal(
      await dialog.evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      false,
    );
    await page.screenshot({
      path: `test-results/game-ratings-${width}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    assert.equal(await dialog.count(), 0);
  }
  await page.evaluate(() => {
    window.__testState.ratingReminders = [];
  });
  await page.getByRole("button", { name: "Avaliações", exact: true }).click();
  await page.getByRole("button", { name: "Lembrar João", exact: true }).click();
  await page.getByText("1 lembrete enviado.", { exact: true }).waitFor();
  assert.deepEqual(
    await page.evaluate(() => window.__testState.ratingReminders),
    ["joao"],
  );
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    window.__testState.ratingAdminFail = true;
  });
  await page.getByRole("button", { name: "Avaliações", exact: true }).click();
  await page.getByRole("button", { name: "Tentar novamente" }).waitFor();
  await page.evaluate(() => {
    window.__testState.ratingAdminFail = false;
  });
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await page.getByText("Parcial", { exact: true }).waitFor();
  await page.keyboard.press("Escape");
  for(const theme of ["volt","champions","ultimate"]) {
    await page.evaluate(async theme=>(await import('./js/themes.js')).applyTheme(theme),theme);
    for(const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:1000});
      await page.getByRole("button",{name:"Avalia\u00e7\u00f5es",exact:true}).click();
      const dialog=page.getByRole("dialog",{name:"Avalia\u00e7\u00f5es do jogo"});
      await dialog.locator('[data-waive="joao"]').click();
      assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
      if([1440,390].includes(width)) await page.screenshot({path:`test-results/game-rating-waiver-${theme}-${width}.png`});
      await page.keyboard.press("Escape");
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "Game rating admin UI: states, group/individual sends, cooldown, retry, keyboard and 1440/768/390/320px passed.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
