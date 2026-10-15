import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
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
      ".html": "text/html",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
    }[extname(path)] || "text/plain",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(5188, "127.0.0.1", r));
const options = { headless: true };
if (process.platform === "win32") options.channel = "msedge";
const browser = await chromium.launch(options);
mkdirSync("test-results", { recursive: true });
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      hasTouch: true,
      serviceWorkers: "block",
    }),
    page = await context.newPage(),
    errors = [];
  await context.clock.install({ time: new Date("2026-10-16T12:00:00Z") });
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/db.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/db.js", "utf8").replace(
        "'../../js/utils.js'",
        "'./utils.js'",
      ),
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  const navigate = async (hash, title) => {
    await page.evaluate((h) => (location.hash = h), hash);
    await page.locator("h1").filter({ hasText: title }).first().waitFor();
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".skeleton-head").count(), 0);
    const touchingPanels = await page.evaluate(() => {
      const panels = [
        ...document.querySelectorAll("#main .panel, #main .team-panel"),
      ].filter(
        (el) =>
          el.getClientRects().length && el.getBoundingClientRect().height > 0,
      );
      const issues = [];
      for (let i = 0; i < panels.length; i++)
        for (let j = i + 1; j < panels.length; j++) {
          const a = panels[i],
            b = panels[j];
          if (a.contains(b) || b.contains(a)) continue;
          const ra = a.getBoundingClientRect(),
            rb = b.getBoundingClientRect();
          const overlap =
            Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
          const gap = Math.max(ra.top, rb.top) - Math.min(ra.bottom, rb.bottom);
          if (
            overlap >= Math.min(ra.width, rb.width) * 0.8 &&
            gap >= -1 &&
            gap < 8
          )
            issues.push(`${a.className} / ${b.className}: ${gap.toFixed(1)}px`);
        }
      return issues;
    });
    assert.deepEqual(touchingPanels, [], `Painéis encostados em ${hash}`);
    if (hash.startsWith("#/admin")) {
      const actionSpacing = await page.evaluate(() => {
        const issues = [];
        for (const group of document.querySelectorAll("#main .actions")) {
          const buttons = [...group.querySelectorAll(":scope > .btn")].filter(
            (button) => button.getClientRects().length,
          );
          for (let i = 0; i < buttons.length; i++) {
            for (let j = i + 1; j < buttons.length; j++) {
              const a = buttons[i].getBoundingClientRect(),
                b = buttons[j].getBoundingClientRect();
              const dx = Math.max(a.left, b.left) - Math.min(a.right, b.right);
              const dy = Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom);
              if (Math.max(dx, dy) < 9)
                issues.push(
                  `${buttons[i].textContent.trim()} / ${buttons[j].textContent.trim()}`,
                );
            }
          }
        }
        return issues;
      });
      assert.deepEqual(
        actionSpacing,
        [],
        `Botões demasiado próximos em ${hash}`,
      );
    }
  };
  await page.goto("http://127.0.0.1:5188");
  await page.getByRole("heading", { name: "Melhores da semana" }).waitFor();
  const originalDocument = await page.evaluate(() => {
    window.__roleRefreshMarker = "before-role-change";
    return window.__testState.users.find((u) => u.uid === "pedro").role;
  });
  await page.locator("#header [data-role-perspective] summary").click();
  await page.locator('#header [data-perspective-role="member"]').click();
  await page.waitForFunction(
    () =>
      !window.__roleRefreshMarker &&
      document.querySelector("#header [data-role-perspective]")?.dataset
        .role === "member",
  );
  assert.equal(
    await page.evaluate(
      () => window.__testState.users.find((u) => u.uid === "pedro").role,
    ),
    originalDocument,
  );
  await page.evaluate(() => {
    location.hash = "#/admin";
  });
  await page
    .getByRole("heading", { name: "Acesso reservado", exact: true })
    .waitFor();
  await navigate("#/profile", "Pedro");
  assert.equal(await page.locator("#main [data-role-perspective]").count(), 1);
  await page.locator("#main [data-role-perspective] summary").click();
  await page.locator('#main [data-perspective-role="dbs"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector("#main [data-role-perspective]")?.dataset.role ===
      "dbs",
  );
  await page.locator("#main [data-role-perspective] summary").click();
  await page.locator('#main [data-perspective-role="admin"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector("#main [data-role-perspective]")?.dataset.role ===
      "admin",
  );
  await navigate("#/", "Pedro");
  await page.locator("#theme-picker").click();
  assert.equal(await page.locator("[data-interface-theme]").count(), 4);
  for (const id of ["volt", "champions", "ultimate"]) {
    await page.locator(`[data-interface-theme="${id}"]`).click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), id);
    assert.equal(
      await page
        .locator(`[data-interface-theme="${id}"]`)
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.screenshot({ path: `test-results/theme-${id}.png` });
  }
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("heading", { name: "Melhores da semana" }).waitFor();
  assert.equal(
    await page.locator("html").getAttribute("data-theme"),
    "ultimate",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#header [data-role-perspective] summary").click();
  const perspectiveBounds = await page
    .locator("#header .perspective-dropdown")
    .boundingBox();
  assert.ok(
    perspectiveBounds.x >= 0 &&
      perspectiveBounds.x + perspectiveBounds.width <= 390,
  );
  await page.screenshot({ path: "test-results/role-perspective-mobile.png" });
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("#header [data-role-perspective]").getAttribute("open"),
    null,
  );
  await page.locator("#theme-picker").click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator('[data-interface-theme="club"]').click();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    const state = window.__testState;
    state.users.push({
      ...state.users[1],
      uid: "miguel",
      username: "miguel",
      displayName: "Miguel",
    });
    state.initialRatings.push({
      uid: "joao",
      ratings20: { ...state.initialRatings[0].ratings20, pace: 15 },
      completed: true,
    });
    state.initialRatings.push({
      uid: "miguel",
      ratings20: { ...state.initialRatings[0].ratings20, pace: 14 },
      completed: true,
    });
    location.hash = "#/ranking";
  });
  await navigate("#/", "Pedro");
  assert.equal(await page.locator(".podium-place").count(), 3);
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    window.__testState.users = window.__testState.users.filter(
      (p) => p.uid !== "miguel",
    );
  });
  await navigate("#/players", "Jogadores");
  for (const key of [
    "pace",
    "shooting",
    "passing",
    "dribbling",
    "defending",
    "physical",
    "goalkeeping",
    "stamina",
    "vision",
    "positioning",
    "teamwork",
    "composure",
  ]) {
    await page.locator("#sort").selectOption(key);
    await page.locator("#sort-direction").selectOption("desc");
    const descending = await page
      .locator("#player-grid a.football-card")
      .evaluateAll((cards) => cards.map((card) => card.getAttribute("href")));
    await page.locator("#sort-direction").selectOption("asc");
    const ascending = await page
      .locator("#player-grid a.football-card")
      .evaluateAll((cards) => cards.map((card) => card.getAttribute("href")));
    assert.equal(ascending.length, descending.length);
    if (key === "pace") assert.deepEqual(ascending, [...descending].reverse());
  }
  await page.locator("#sort").selectOption("ovr");

  await page.locator("#search").fill("nobody");
  await page.evaluate(() => {
    window.__playersGrid = document.querySelector("#player-grid");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(900);
  assert.equal(await page.locator("#search").inputValue(), "nobody");
  assert.ok(
    await page.evaluate(
      () => window.__playersGrid === document.querySelector("#player-grid"),
    ),
  );

  await page.getByText("Nenhum jogador encontrado").waitFor();
  await page.locator("#search").fill("");
  await page.locator('a.football-card[href="#/player/pedro"]').click();
  await page
    .getByRole("heading", { name: "Pedro", exact: true, level: 1 })
    .waitFor();
  await page.evaluate(() => {
    window.__testState.history = [
      {
        weekId: "2026-W40",
        ovr: 62,
        baseCard: "silver-common",
        stats: {
          pace: 61,
          shooting: 62,
          passing: 63,
          dribbling: 64,
          defending: 65,
          physical: 66,
          goalkeeping: 67,
          stamina: 68,
        },
        specials: [],
      },
    ];
  });
  await navigate("#/profile", "Pedro");
  assert.equal(await page.locator(".history-grid > *").count(), 5);
  assert.equal(await page.locator(".history-placeholder").count(), 4);
  await page.locator("[data-history-week]").click();
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await page
      .locator(".history-card-expanded .card-rating strong")
      .textContent(),
    "62",
  );
  assert.equal(
    await page
      .locator(".history-card-expanded .card-stats b")
      .first()
      .textContent(),
    "61",
  );
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const snapshot = window.__testState.history[0];
    window.__testState.history = Array.from({ length: 7 }, (_, i) => ({
      ...snapshot,
      weekId: `2026-W${40 - i}`,
    }));
  });
  await navigate("#/players", "Jogadores");
  await navigate("#/profile", "Pedro");
  assert.equal(await page.locator(".history-grid > *").count(), 7);
  assert.equal(
    await page
      .locator(".history-grid")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
    true,
  );
  await navigate("#/games", "Jogos");
  await page.getByText("Ainda não existem jogos").waitFor();
  await page.evaluate(async () => {
    const { ATTRIBUTES } = await import("/js/utils.js");
    window.__testState.initialRatings.push({
      uid: "joao",
      completed: true,
      ratings20: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 12])),
    });
  });
  await page.getByRole("link", { name: "Criar jogo" }).first().click();
  await page
    .getByRole("heading", { name: "Criar jogo", exact: true })
    .waitFor();
  await page.locator("[name=title]").fill("Peladinha de teste");
  await page
    .locator('[name="youtubeUrl"]')
    .fill("https://youtu.be/dQw4w9WgXcQ");
  assert.equal(
    await page.locator(".game-video iframe").getAttribute("src"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
  await page.locator("[name=scheduledAt]").fill("2026-10-07T20:00");
  assert.equal(await page.locator(".team-balance-panel").count(), 1);
  const gameSpacing = await page.evaluate(() => {
    const form = document.querySelector("#game-form");
    const details = form
      .querySelector(":scope > .panel")
      .getBoundingClientRect();
    const automatic = form.querySelector(".auto-teams").getBoundingClientRect();
    const frame = form
      .querySelector(".game-teams-frame")
      .getBoundingClientRect();
    const balance = form
      .querySelector(".team-balance-panel")
      .getBoundingClientRect();
    const teams = [
      ...form.querySelectorAll(".team-builder > .team-panel:not(.available)"),
    ].map((el) => el.getBoundingClientRect().top);
    return {
      firstGap: frame.top - details.bottom,
      balanceGap: balance.top - automatic.bottom,
      teamOffset: Math.max(...teams) - Math.min(...teams),
    };
  });
  assert.ok(gameSpacing.firstGap >= 24);
  assert.ok(gameSpacing.balanceGap >= 24);
  assert.ok(gameSpacing.teamOffset < 1);
  assert.equal(await page.locator('[name="youtubeUrl"] + small').count(), 0);
  await page.screenshot({
    path: "test-results/game-spacing-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(() => {
      const description = document
        .querySelector(".auto-teams .section-head > div")
        .getBoundingClientRect();
      const button = document
        .querySelector("#auto-teams")
        .getBoundingClientRect();
      return (
        button.top - description.bottom >= 16 &&
        document.documentElement.scrollWidth <= innerWidth + 1
      );
    }),
  );
  await page.screenshot({
    path: "test-results/game-spacing-mobile.png",
    fullPage: true,
  });
  await page.locator("#auto-teams").click();
  assert.equal(
    await page.locator("#auto-selection [data-auto-player]").count(),
    2,
  );
  assert.ok(
    await page.locator('[role="dialog"]').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return (
        r.left >= 0 &&
        r.right <= innerWidth &&
        r.top >= 0 &&
        r.bottom <= innerHeight
      );
    }),
  );
  assert.ok(await page.locator("#confirm-auto-teams").isDisabled());
  await page.locator("#select-all-players").click();
  assert.ok(await page.locator("#confirm-auto-teams").isEnabled());
  await page.locator("#select-all-players").click();
  assert.ok(await page.locator("#confirm-auto-teams").isDisabled());
  await page.locator("#select-all-players").click();
  assert.ok(await page.locator("#confirm-auto-teams").isEnabled());
  assert.equal(
    await page.locator('#auto-selection input[type="checkbox"]').count(),
    0,
  );
  await page.locator("#draw-selected [data-auto-player]").first().click();
  assert.equal(
    await page.locator("#draw-selected [data-auto-player]").count(),
    1,
  );
  assert.ok(await page.locator("#confirm-auto-teams").isDisabled());
  await page.locator("#draw-available [data-auto-player]").first().click();
  assert.equal(
    await page.locator("#draw-selected [data-auto-player]").count(),
    2,
  );
  await page.screenshot({ path: "test-results/game-selection-mobile.png" });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  assert.equal(await page.locator(".available .team-chip").count(), 2);
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.locator("#auto-teams").click();
  const rowStep = await page.locator("#draw-available").evaluate((list) => {
    const tile = list.querySelector(".draw-player-card");
    for (let i = 0; i < 35; i++) list.append(tile.cloneNode(true));
    return (
      tile.getBoundingClientRect().height +
      parseFloat(getComputedStyle(list).rowGap)
    );
  });
  await page.locator("#draw-available").evaluate((list) => {
    for (let i = 0; i < 8; i++)
      list.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: 120,
          bubbles: true,
          cancelable: true,
        }),
      );
  });
  await page.waitForFunction(
    (step) =>
      Math.abs(document.querySelector("#draw-available").scrollTop - step) < 2,
    rowStep,
  );
  await page.waitForTimeout(200);
  await page.locator("#draw-available").evaluate((list) =>
    list.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: -120,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  await page.waitForFunction(
    () => document.querySelector("#draw-available").scrollTop < 2,
  );
  assert.equal(
    await page
      .locator("#draw-available .football-card")
      .first()
      .evaluate((el) => getComputedStyle(el).filter),
    "none",
  );
  await page.locator("#select-all-players").click();
  await page
    .locator("#draw-selected [data-auto-player]")
    .first()
    .dragTo(page.locator('[data-draw-zone="available"] > h3'));
  assert.equal(
    await page.locator("#draw-selected [data-auto-player]").count(),
    1,
  );
  await page
    .locator("#draw-available [data-auto-player]")
    .first()
    .dragTo(page.locator('[data-draw-zone="selected"] > h3'));
  assert.equal(
    await page.locator("#draw-selected [data-auto-player]").count(),
    2,
  );
  await page.screenshot({ path: "test-results/game-selection-desktop.png" });
  await page.locator("#confirm-auto-teams").click();
  assert.equal(await page.locator(".available .team-chip").count(), 0);
  assert.equal(await page.locator(".captain-badge").count(), 2);
  assert.equal(await page.locator(".game-teams-frame").count(), 1);
  assert.equal(
    await page.locator(".position-leaders .position-tag").count(),
    5,
  );
  assert.equal(
    await page.locator(".team-a .ordered-team-list .team-chip").count(),
    1,
  );
  assert.equal(
    await page.locator(".team-b .ordered-team-list .team-chip").count(),
    1,
  );
  const differences = await page.locator(".ovr-difference").allTextContents();
  assert.equal(
    Number(differences[0].replace(",", ".")),
    -Number(differences[1].replace(",", ".")) || 0,
  );
  await page.locator("#auto-teams").click();
  await page.locator("#confirm-auto-teams").click();
  await page.locator("[data-remove=pedro]").click();
  await page.locator("[data-remove=joao]").click();
  await page.evaluate(() => {
    window.__testState.initialRatings =
      window.__testState.initialRatings.filter((r) => r.uid !== "joao");
  });
  await page.locator("[data-uid=pedro][data-assign=teamA]").click();
  await page.locator("[data-uid=joao][data-assign=teamB]").click();
  assert.equal(await page.locator(".team-chip").count(), 2);
  await page.locator('[name="scoreA"]').fill("2");
  await page.locator('[name="scoreB"]').fill("1");
  await page
    .locator('[data-performance-uid="pedro"][data-performance-key="goals"]')
    .fill("2");
  await page
    .locator('[data-performance-uid="pedro"][data-performance-key="assists"]')
    .fill("1");
  await page
    .locator('[data-performance-uid="joao"][data-performance-key="goals"]')
    .fill("1");
  await page.getByRole("button", { name: "Guardar jogo", exact: true }).click();
  await page.getByRole("button", { name: "Abrir jogo", exact: true }).waitFor();
  await page.getByRole("button", { name: "Abrir jogo", exact: true }).click();
  await page
    .getByRole("button", { name: "Encerrar jogo", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Encerrar jogo" }).click();
  await page
    .getByRole("heading", { name: "Peladinha de teste", exact: true })
    .waitFor();
  await page.evaluate(async () => {
    const { teamBalance, balanceSignature } =
      await import("/js/team-balance.js");
    const game = window.__testState.games.find((g) => g.id === "test-game");
    window.__testState.gameBalances = [
      {
        ...teamBalance(game, [
          { uid: "pedro", hasCard: true, ovr: 80 },
          { uid: "joao", hasCard: true, ovr: 50 },
        ]),
        id: game.id,
        playerOvr: { pedro: 80, joao: 50 },
        signature: balanceSignature(game),
        closedAt: game.closedAt,
      },
    ];
  });
  await navigate("#/games", "Jogos");
  await navigate("#/game/test-game", "Peladinha de teste");
  assert.equal(await page.locator("#auto-teams").count(), 0);
  assert.deepEqual(await page.locator(".ovr-difference").allTextContents(), [
    "+30",
    "-30",
  ]);
  assert.equal(
    await page.locator(".ovr-difference.positive").textContent(),
    "+30",
  );
  assert.equal(
    await page.locator(".ovr-difference.negative").textContent(),
    "-30",
  );
  assert.equal(await page.locator(".team-balance-panel table").count(), 0);
  assert.equal(await page.locator(".captain-badge").count(), 2);
  assert.deepEqual(
    await page
      .locator(
        ".game-highlights .game-highlight a > span:not(.leader-mini-card)",
      )
      .allTextContents(),
    ["80 OVR", "50 OVR"],
  );
  await page.getByRole("button", { name: "Ver detalhes das equipas" }).click();
  assert.deepEqual(
    await page.locator(".balance-audit .metrics b").allTextContents(),
    ["80", "50", "30", "15"],
  );
  assert.ok(
    (await page.locator(".balance-audit").textContent()).includes(
      "600 combinações",
    ),
  );
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.screenshot({
    path: "test-results/game-balance-desktop.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    window.__testState.users.find((u) => u.uid === "pedro").role = "member";
  });
  await navigate("#/games", "Jogos");
  await navigate("#/game/test-game", "Peladinha de teste");
  assert.equal(await page.locator("#balance-details").count(), 0);
  assert.equal(await page.locator(".team-balance-panel table").count(), 0);
  await page.evaluate(() => {
    window.__testState.users.find((u) => u.uid === "pedro").role = "admin";
  });
  await navigate("#/game/test-game/feedback", "Avaliar");
  assert.equal(await page.locator("[data-rating=overall]").inputValue(), "0");
  assert.equal(
    await page.locator("[data-rating=goalkeeping]").inputValue(),
    "0",
  );
  assert.equal(await page.locator("[data-rating=attitude]").inputValue(), "0");
  await page.locator("[data-rating=overall]").selectOption("4");
  await page.waitForTimeout(650);
  await navigate("#/missions", "Missões");
  await navigate("#/game/test-game/feedback", "Avaliar");
  assert.equal(await page.locator("[data-rating=overall]").inputValue(), "4");
  for (const k of ["attack", "passing", "defense", "physical", "attitude"])
    await page.locator(`[data-rating=${k}]`).selectOption("4");
  await page.locator("[data-rating=goalkeeping]").selectOption("na");
  await page.getByRole("button", { name: "Enviar avaliação" }).click();
  await page.getByText("Avaliação enviada", { exact: true }).waitFor();
  await navigate("#/missions/new/joao", "Avaliar João");
  assert.equal(await page.locator("[data-rating=composure]").inputValue(), "0");
  for (const [k, v] of [
    ["pace", 14],
    ["shooting", 16],
    ["passing", 15],
    ["dribbling", 12],
    ["defending", 13],
  ])
    await page.locator(`[data-rating=${k}]`).fill(String(v));
  await page.waitForTimeout(700);
  await navigate("#/missions", "Missões");
  await page.getByText("12 / 12 · 100%").waitFor();
  await navigate("#/missions/new/joao", "Avaliar João");
  assert.equal(await page.locator("[data-rating=pace]").inputValue(), "14");
  await navigate("#/profile/edit", "Editar perfil");
  await page.locator("[name=displayName]").fill("Pedro Silva");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await page
    .getByRole("heading", { name: "Pedro Silva", exact: true, level: 1 })
    .waitFor();
  await page.locator("#bell").click();
  await page.locator("#notification-dropdown").waitFor();
  await page.getByRole("link", { name: "Ver todas", exact: true }).click();
  await page
    .getByRole("heading", { name: "Notificações", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Marcar todas como lidas" }).click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator(".notification.unread").count(), 0);
  assert.equal(await page.locator("#main .notification").count(), 0);
  await page.locator('[data-notification-view="read"]').click();
  assert.ok((await page.locator("#main .notification").count()) > 0);
  assert.equal(await page.locator("#main [data-read]").count(), 0);
  await page.locator('[data-notification-view="unread"]').click();
  await page.locator("#bell").click();
  assert.equal(
    await page.locator("#notification-dropdown .notification").count(),
    0,
  );
  await page.locator("#bell").click();
  await page.evaluate(() => {
    window.__testState.notifications.unshift(
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `read-check-${i}`,
        title: "Já lida",
        body: "Histórico",
        read: true,
        createdAt: { seconds: 9999999999 },
      })),
      {
        id: "unread-check",
        title: "Notificação por ler",
        body: "Nova mensagem",
        read: false,
        createdAt: { seconds: 1 },
      },
    );
  });
  await navigate("#/", "Pedro");
  await page.locator("#bell").click();
  assert.equal(
    await page.locator("#notification-dropdown .notification").count(),
    1,
  );
  await page
    .getByRole("button", { name: "Marcar como lida", exact: true })
    .click();
  await page.getByText("Sem notificações novas", { exact: true }).waitFor();
  assert.equal(await page.locator(".notification").count(), 0);
  assert.equal(await page.locator("#bell .badge").count(), 0);
  assert.equal(await page.evaluate(() => location.hash), "#/");
  assert.equal(await page.locator("#notification-dropdown").count(), 1);
  await page.locator("#bell").click();
  await page.evaluate(() =>
    window.__testState.notifications.push({
      id: "read-all-inline",
      title: "Ler todas aqui",
      body: "Mensagem",
      read: false,
    }),
  );
  await navigate("#/profile", "Pedro Silva");
  await page.locator("#bell").click();
  await page.locator("#notification-dropdown [data-read-all]").click();
  await page
    .locator("#notification-dropdown")
    .getByText("Sem notificações novas", { exact: true })
    .waitFor();
  assert.equal(await page.evaluate(() => location.hash), "#/profile");
  await page.locator("#bell").click();
  await page.evaluate(() =>
    window.__testState.notifications.push({
      id: "open-inline",
      title: "Abrir mensagem aqui",
      body: "Mensagem",
      href: "#/notifications",
      read: false,
    }),
  );
  await navigate("#/", "Pedro");
  await page.locator("#bell").click();
  await page.locator("#notification-dropdown [data-open-notification]").click();
  await page
    .locator("#notification-dropdown")
    .getByText("Sem notificações novas", { exact: true })
    .waitFor();
  assert.equal(await page.evaluate(() => location.hash), "#/");
  await page.locator("#bell").click();
  await navigate("#/notifications", "Notificações");
  assert.equal(await page.locator("#main .notification").count(), 0);
  await page.locator('[data-notification-view="read"]').click();
  assert.ok((await page.locator("#main .notification").count()) > 0);
  assert.equal(await page.locator("#main .notification.unread").count(), 0);

  await navigate("#/ranking", "Ranking semanal");
  await navigate("#/admin", "A tua liga");
  assert.equal(await page.locator(".admin-area-grid a").count(), 0);
  assert.equal(await page.locator("#ovr-settings").count(), 0);
  assert.equal(
    await page.locator('.admin-area-nav [aria-current="page"]').textContent(),
    "Visão geral",
  );
  const navRows = await page
    .locator(".admin-area-nav a")
    .evaluateAll(
      (els) =>
        new Set(els.map((el) => Math.round(el.getBoundingClientRect().top)))
          .size,
    );
  assert.equal(navRows, 1);
  assert.equal(await page.locator(".admin-health").count(), 4);
  await page.screenshot({
    path: "test-results/admin-menu-desktop.png",
    fullPage: true,
  });
  for (const [href, title] of [
    ["#/admin/players", "Jogadores"],
    ["#/admin/games", "Jogos"],
    ["#/admin/weights", "Pesos do OVR"],
    ["#/admin/ratings", "Avaliações"],
    ["#/admin/support", "Tickets"],
    ["#/admin/messages", "Mensagens"],
    ["#/admin/maintenance", "Manutenção"],
  ]) {
    await page.locator(`.admin-area-nav a[href="${href}"]`).click();
    await page
      .getByRole("heading", { name: title, level: 1, exact: true })
      .waitFor();
    assert.equal(
      await page
        .locator('.admin-area-nav [aria-current="page"]')
        .getAttribute("href"),
      href,
    );
    if (href !== "#/admin/weights")
      assert.equal(await page.locator("#ovr-settings").count(), 0);
  }

  await page.evaluate(() => {
    for (let i = 0; i < 25; i++)
      window.__testState.communityRatings.push({
        id: `bulk-${i}`,
        raterId: "pedro",
        targetId: "joao",
        ratings20: { pace: 15, passing: 12 },
        submitted: i % 2 === 0,
      });
  });
  await navigate("#/admin/ratings", "Avaliações");
  assert.equal(await page.locator(".ratings-table tbody tr").count(), 20);
  assert.ok(await page.locator("#raw-next").isEnabled());
  await page.locator("#raw-next").click();
  assert.ok((await page.locator(".ratings-table tbody tr").count()) < 20);
  await page.locator("[data-view]").first().click();
  assert.equal(await page.locator(".rating-detail-grid > div").count(), 12);
  await page.keyboard.press("Escape");
  await page.locator("#raw-status").selectOption("sent");
  assert.ok((await page.locator("#raw-count").textContent()).includes("de"));
  await page.evaluate(() => {
    window.__testState.communityRatings =
      window.__testState.communityRatings.filter(
        (r) => !r.id?.startsWith("bulk-"),
      );
  });
  await page.evaluate(() => {
    window.__testState.tickets = [
      {
        id: "spacing",
        title: "Espaçamento do ticket",
        ownerId: "pedro",
        status: "open",
      },
    ];
    window.__testState.ticketMessages = [
      {
        id: "message",
        authorId: "pedro",
        authorName: "Pedro",
        authorRole: "admin",
        body: "Texto da mensagem.",
        createdAt: { seconds: 1 },
      },
    ];
  });
  await navigate("#/tickets/spacing", "Espaçamento do ticket");
  assert.ok(
    await page.evaluate(() => {
      const chat = document
        .querySelector("#ticket-messages")
        .getBoundingClientRect();
      const reply = document
        .querySelector("#ticket-reply")
        .getBoundingClientRect();
      const header = document
        .querySelector(".ticket-message > div")
        .getBoundingClientRect();
      const body = document
        .querySelector(".ticket-message > p")
        .getBoundingClientRect();
      return reply.top - chat.bottom >= 24 && body.top - header.bottom >= 12;
    }),
  );
  await navigate("#/admin/ovr/pedro", "Cálculo OVR");
  assert.equal(await page.locator("#ovr-weights tbody tr").count(), 12);
  assert.equal(await page.locator("#ovr-attributes tbody tr").count(), 12);
  assert.ok((await page.locator(".ovr-formula").textContent()).includes("18%"));
  const weighted = await page
    .locator("#ovr-weights tbody tr")
    .evaluateAll((rows) =>
      rows.map((r) => [...r.cells].map((c) => c.textContent)),
    );
  assert.ok(weighted.every((r) => r[2].endsWith("%")));
  assert.equal(
    weighted.reduce(
      (total, r) =>
        total +
        Math.round(Number(r[2].replace("%", "").replace(",", ".")) * 100),
      0,
    ),
    10000,
  );
  const sum = weighted.reduce(
    (total, r) => total + Number(r[3].replace(",", ".")),
    0,
  );
  assert.equal(
    Math.round(sum),
    Number(await page.locator("#ovr-displayed").textContent()),
  );
  await page.locator("#ovr-card").selectOption("2026-W40");
  assert.equal(await page.locator("#ovr-displayed").textContent(), "62");
  await page
    .getByText("Esta carta antiga não guardou", { exact: false })
    .waitFor();
  await page.evaluate(async () => {
    const { ATTRIBUTES, calculateOverallDetails } =
      await import("/js/utils.js");
    const stats = Object.fromEntries(
      ATTRIBUTES.map(([key]) => [
        key,
        ["passing", "vision", "teamwork", "composure"].includes(key) ? 90 : 30,
      ]),
    );
    window.__testState.history.push({
      weekId: "2026-W41",
      stats,
      ovr: 72,
      primaryPosition: "MED",
      baseCard: "bronze-rare",
      specials: [],
      ovrCalculation: calculateOverallDetails(stats, {
        weights: Object.fromEntries(
          ATTRIBUTES.map(([key]) => [
            key,
            ["passing", "vision", "teamwork", "composure"].includes(key)
              ? 17.5
              : 3.75,
          ]),
        ),
      }),
    });
  });
  await navigate("#/profile", "Pedro Silva");
  await page.locator('[data-history-week="2026-W41"]').click();
  await page
    .getByRole("link", { name: "Cálculo desta carta", exact: true })
    .click();
  await page.locator("#ovr-weights").waitFor();
  assert.equal(await page.locator("#ovr-card").inputValue(), "2026-W41");
  assert.equal(await page.locator("#ovr-displayed").textContent(), "72");
  assert.ok(
    (await page.locator(".ovr-formula").textContent()).includes("90 × 17,5%"),
  );

  await navigate("#/admin/weights", "Pesos do OVR");
  assert.equal(await page.locator("#ovr-settings input").count(), 12);
  assert.equal(
    await page.locator('#ovr-settings [name="pace"]').inputValue(),
    "18",
  );
  const saveWeights = page.getByRole("button", {
    name: "Guardar pesos e recalcular",
    exact: true,
  });
  await page.locator('#ovr-settings [name="pace"]').fill("19");
  assert.ok(await saveWeights.isDisabled());
  assert.ok((await page.locator("#ovr-total").textContent()).includes("101%"));
  for (const key of [
    "pace",
    "shooting",
    "passing",
    "dribbling",
    "defending",
    "physical",
    "goalkeeping",
    "stamina",
    "vision",
    "positioning",
    "teamwork",
    "composure",
  ])
    await page
      .locator(`#ovr-settings [name="${key}"]`)
      .fill(key === "pace" ? "33.33" : key === "passing" ? "66.67" : "0");
  await page.locator("#ovr-position").selectOption("GR");
  assert.equal(
    await page.locator('#ovr-settings [name="goalkeeping"]').inputValue(),
    "35",
  );
  await page.locator("#ovr-position").selectOption("ALA");
  assert.equal(
    await page.locator('#ovr-settings [name="passing"]').inputValue(),
    "66.67",
  );
  assert.ok(await saveWeights.isEnabled());
  await saveWeights.click();
  await page.waitForFunction(
    () => window.__testState.ovrWeights?.positions?.ALA?.passing === 66.67,
  );
  await navigate("#/admin/ovr/pedro", "Cálculo OVR");
  assert.ok(
    (await page.locator(".ovr-formula").textContent()).includes("× 66,67%"),
  );
  await page.locator("#ovr-card").selectOption("2026-W41");
  assert.ok(
    (await page.locator(".ovr-formula").textContent()).includes("90 × 17,5%"),
  );
  await navigate("#/admin/weights", "Pesos do OVR");
  assert.equal(
    await page.locator('#ovr-settings [name="passing"]').inputValue(),
    "66.67",
  );
  await page.evaluate(async () => {
    const { DEFAULT_OVR_WEIGHTS } = await import("/js/utils.js");
    window.__testState.ovrWeights = DEFAULT_OVR_WEIGHTS;
  });
  await navigate("#/admin/events", "Eventos e missões");
  await page.locator("#new-event").click();
  await page
    .getByText("Descrição, imagem e regras · opcional", { exact: true })
    .click();
  await page.locator("#event-image-url").evaluate((input) => {
    const data = new DataTransfer();
    data.setData("text/plain", "  https://example.com/event.jpg  ");
    input.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  assert.equal(
    await page.locator("#event-image-url").inputValue(),
    "https://example.com/event.jpg",
  );
  await page.locator("#event-image-url").fill("");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { readText: async () => " https://example.com/pasted.jpg " },
    });
  });
  await page.locator("#paste-event-image").click();
  assert.equal(
    await page.locator("#event-image-url").inputValue(),
    "https://example.com/pasted.jpg",
  );
  await page.locator("#event-image-url").fill("");
  assert.equal(
    await page.locator('#event-questions [name="candidates"]').count(),
    0,
  );
  assert.equal(
    await page.locator('#event-builder-form [name="memberIds"]').count(),
    1,
  );
  assert.equal(
    await page
      .locator(
        '#event-questions [name="specialId"] optgroup[label="Cartas padrão"] option',
      )
      .count(),
    16,
  );
  const audience = page.locator('#event-builder-form [name="audience"]');
  const participants = page.locator('#event-builder-form [name="memberIds"]');
  await audience.selectOption("selected");
  assert.equal(
    await page.locator('#event-builder-form [name="gameId"]').isVisible(),
    false,
  );
  assert.equal(
    await page.locator('#event-builder-form [name="month"]').isVisible(),
    false,
  );
  await participants.selectOption(["pedro", "joao"]);
  assert.match(
    await page.locator("#event-participant-summary").textContent(),
    /2 participantes/,
  );
  await audience.selectOption("game");
  assert.equal(
    await page.locator('#event-builder-form [name="gameId"]').isVisible(),
    true,
  );
  const gameIds = await page
    .locator('#event-builder-form [name="gameId"] option')
    .evaluateAll((options) => options.map((option) => option.value));
  if (gameIds.includes("test-game")) {
    await page
      .locator('#event-builder-form [name="gameId"]')
      .selectOption("test-game");
    const expected = await page.evaluate(async () => {
      const { participants } = await import("/js/utils.js");
      return [
        ...new Set(
          participants(
            window.__testState.games.find((game) => game.id === "test-game"),
          ),
        ),
      ]
        .filter((uid) =>
          window.__testState.users.some(
            (user) => user.uid === uid && !user.disabled,
          ),
        )
        .sort();
    });
    assert.deepEqual(
      await participants
        .locator("option")
        .evaluateAll((options) => options.map((option) => option.value).sort()),
      expected,
    );
  }
  await audience.selectOption("all");
  await page.evaluate(() => {
    window.__testState.cardThemes = [
      {
        id: "event-reward",
        name: "Prémio da liga",
        baseTheme: "gold-rare",
        colors: {
          primary: "#123456",
          secondary: "#234567",
          text: "#ffffff",
          border: "#abcdef",
          glow: "#42e66c",
        },
        design: { shape: "shield", nameFont: "modern" },
      },
    ];
  });
  await navigate("#/admin/weights", "Pesos do OVR");
  await navigate("#/admin/events", "Eventos e missões");
  await page.locator("#new-event").click();
  assert.equal(
    await page
      .locator(
        '#event-questions [name="specialId"] option[value="saved:event-reward"]',
      )
      .textContent(),
    "Prémio da liga",
  );
  const customCard = await page.evaluate(async () => {
    const { card, bindImages } = await import("/js/cards.js");
    const { ATTRIBUTES } = await import("/js/utils.js");
    const template = window.__testState.cardThemes[0];
    const wrapper = document.createElement("div");
    wrapper.innerHTML = card(
      {
        uid: "pedro",
        displayName: "Pedro",
        ovr: 80,
        stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 80])),
        specials: [{ id: "saved:event-reward", cardTheme: template }],
      },
      { preview: true },
    );
    bindImages(wrapper);
    const element = wrapper.querySelector(".football-card");
    return {
      designed: element.classList.contains("lab-designed"),
      base: element.classList.contains("gold-rare"),
      primary: element.style.getPropertyValue("--card-a"),
      borders: element.querySelectorAll(".studio-border").length,
    };
  });
  assert.deepEqual(customCard, {
    designed: true,
    base: true,
    primary: "#123456",
    borders: 1,
  });
  await page.locator('[data-editor-step="1"]').click();
  assert.match(
    await page.locator('[data-selection-method="admin"]').innerText(),
    /Competição controlada/,
  );
  await page.locator('[data-selection-method="objective"]').click();
  assert.equal(await page.locator('[name="metric"]').isVisible(), true);
  assert.equal(await page.locator('[name="tieBreak"]').isVisible(), true);
  assert.equal(await page.locator('[name="liveResults"]').isVisible(), true);
  assert.equal(
    await page.locator('[name="needsConfirmation"]').isChecked(),
    false,
  );
  await page.locator('[name="metric"]').selectOption("goalsAndAssists");
  await page.locator('[name="target"]').fill("20");
  await page.locator('[data-editor-step="0"]').click();
  await page.locator('[name="indefinite"]').check();
  assert.equal(await page.locator('[name="endsAt"]').isVisible(), false);
  await page.locator('[name="indefinite"]').uncheck();
  await page.locator('[data-editor-step="1"]').click();
  await page.locator('[data-selection-method="vote"]').click();
  await page.locator('[name="needsConfirmation"]').check();
  await page.locator('[data-editor-step="1"]').click();
  await page
    .locator("#event-editor")
    .screenshot({ path: "test-results/event-editor-desktop.png" });
  await page.locator('[name="winnerCount"]').fill("3");
  await page.locator('[name="winnerCount"]').dispatchEvent("change");
  assert.equal(await page.locator("#event-questions > details").count(), 3);
  await page.locator('[name="winnerCount"]').fill("1");
  await page.locator('[name="winnerCount"]').dispatchEvent("change");
  await page.locator('[data-editor-step="0"]').click();
  await page
    .locator('#event-builder-form [name="title"]')
    .fill("Votação da semana");
  await page
    .locator('#event-builder-form [name="endsAt"]')
    .fill("2026-10-20T20:00");
  await page.locator('[data-editor-step="2"]').click();
  await page.locator('#event-questions [name="boost-vision"]').fill("5");
  await page.locator("#event-preview").click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Publicar evento", exact: true })
    .click();
  await page.waitForFunction(() => window.__testState.events?.length === 1);
  await navigate("#/missions", "Missões");
  await page
    .getByRole("heading", { name: "Votação da semana", exact: true })
    .waitFor();
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", {
        name: "Votação da semana",
        exact: true,
      }),
    })
    .click();
  await page
    .getByRole("heading", { name: "Votação da semana", exact: true })
    .waitFor();
  assert.equal(
    await page.locator('#event-vote-form input[value="pedro"]').count(),
    0,
  );
  await page.locator('#event-vote-form input[value="joao"]').check();
  assert.equal(
    await page
      .locator("#event-vote-form")
      .getByText("Visão de jogo +5", { exact: false })
      .count(),
    0,
  );
  assert.equal(
    await page.evaluate(
      async () =>
        (await (await import("/js/db.js")).eventDetails("event-0")).questions[0]
          .reward,
    ),
    undefined,
  );
  await page.getByRole("button", { name: "Guardar voto", exact: true }).click();
  await page.waitForFunction(
    () => window.__testState.eventVotes?.[0]?.selections?.[0] === "joao",
  );
  await page.evaluate(() => {
    Object.assign(window.__testState.events[0], {
      schemaVersion: 1,
      status: "closed",
      rewardsApplied: true,
      minVotes: 2,
      winners: [
        {
          label: "Prémio",
          uids: [],
          votes: 1,
          reward: { boosts: { vision: 15 }, specialId: "mvp" },
        },
      ],
    });
  });
  await navigate("#/missions", "Missões");
  await navigate("#/event/event-0", "Votação da semana");
  assert.match(
    await page.locator(".event-result").textContent(),
    /não existiram votos suficientes/,
  );
  assert.equal(await page.locator("#event-vote-form").count(), 0);
  assert.equal(await page.locator(".event-revealed-reward").count(), 0);
  await page.evaluate(() => {
    window.__testState.events[0].winners[0].uids = ["joao"];
  });
  await navigate("#/missions", "Missões");
  await navigate("#/event/event-0", "Votação da semana");
  assert.match(
    await page.locator(".event-result").textContent(),
    /recompensa foi atribuída a João/,
  );
  assert.match(
    await page.locator(".event-revealed-reward").textContent(),
    /Visão de jogo \+15/,
  );
  assert.match(
    await page.locator(".event-revealed-reward").textContent(),
    /Melhor em campo/,
  );
  await page.evaluate(() => {
    window.__testState.events[0].status = "open";
    window.__testState.events[0].endsAt = new Date("2020-01-01");
  });
  await navigate("#/missions", "Missões");
  await page.evaluate(() => (location.hash = "#/event/event-0"));
  await page
    .getByRole("heading", { name: "Evento indisponível", exact: true })
    .waitFor();
  await page.evaluate(() => {
    window.__testState.events = [];
    window.__testState.eventVotes = [];
    window.__testState.cardThemes = [];
  });
  await navigate("#/admin/events", "Eventos e missões");
  assert.equal(await page.locator("[data-template]").count(), 0);
  await page.locator("#missions-tab").click();
  await page.locator("#new-mission").click();
  assert.equal(
    await page.locator("#missions-tab").getAttribute("aria-selected"),
    "true",
  );
  await page.locator('[name="title"]').fill("Missão personalizada");
  await page.locator('[name="indefinite"]').check();
  assert.equal(await page.locator('[name="endsAt"]').isVisible(), false);
  assert.equal(await page.locator('[name="endsAt"]').isDisabled(), true);

  await page.locator('[data-editor-step="1"]').click();
  await page.locator('[name="metric"]').selectOption("unbeatenWins");
  await page.locator('[name="target"]').fill("4");
  assert.equal(await page.locator('[name="method"]').inputValue(), "objective");
  assert.equal(await page.locator('[name="winnerCount"]').isVisible(), false);
  assert.equal(await page.locator('[name="allowSelfVote"]').isVisible(), false);
  await page
    .locator("#event-editor")
    .screenshot({ path: "test-results/mission-editor-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page
    .locator("#event-editor")
    .screenshot({ path: "test-results/mission-editor-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.locator('[data-editor-step="2"]').click();
  assert.match(
    await page.locator("#event-questions summary").textContent(),
    /cada jogador que concluir/,
  );
  assert.doesNotMatch(
    await page.locator("#event-questions summary").textContent(),
    /🥇|lugar|posição/,
  );
  await page.locator('[name="rewardMode"]').selectOption("card");
  await page.locator('[name="specialId"]').selectOption("mvp");
  await page.locator("#event-preview").click();
  await page.getByRole("dialog").waitFor();
  assert.match(await page.getByRole("dialog").textContent(), /Melhor em campo/);
  assert.doesNotMatch(await page.getByRole("dialog").textContent(), /🥇|lugar/);
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    window.__testState.events = ["open", "closed", "cancelled"].map(
      (status) => ({
        id: `edit-mission-${status}`,
        schemaVersion: 2,
        kind: "mission",
        method: "objective",
        status,
        title: `Missão ${status}`,
        startsAt: "2026-10-10",
        endsAt: null,
        indefinite: true,
        audience: { mode: "all" },
        participantIds: ["pedro", "joao"],
        objective: { metric: "goals", target: 10 },
        cadence: "once",
        scope: "individual",
        maxRepeats: 1,
        prerequisites: { mode: "all", missionIds: [] },
        winners: [],
        ranking: [],
        configuration: {
          positions: [
            {
              mode: "card",
              specialId: "mvp",
              points: 2,
              boosts: {},
              statDuration: "weekly",
            },
          ],
        },
      }),
    );
  });
  await navigate("#/missions", "Missões");
  await navigate("#/admin/events", "Eventos e missões");
  await page.locator("#missions-tab").click();
  assert.equal(await page.locator("[data-edit]").count(), 3);
  await page.locator('[data-edit="edit-mission-open"]').click();
  await page
    .getByRole("heading", { name: "Editar missão", exact: true })
    .waitFor();
  await page.locator('[name="title"]').fill("Missão editada pelo ADMIN");
  await page.locator('[data-editor-step="1"]').click();
  await page.locator('[name="metric"]').selectOption("assists");
  await page.locator('[name="target"]').fill("7");
  await page.locator('[data-editor-step="2"]').click();
  await page.locator('[name="specialId"]').selectOption("sniper");
  assert.equal(
    await page.locator('[name="submitAction"][value="open"]').isVisible(),
    false,
  );
  await page
    .getByRole("button", { name: "Guardar alterações", exact: true })
    .click();
  await page.getByRole("heading", { name: "Missões", exact: true }).waitFor();
  const savedMission = await page.evaluate(() =>
    window.__testState.events.find((e) => e.id === "edit-mission-open"),
  );
  assert.equal(savedMission.status, "open");
  assert.equal(savedMission.title, "Missão editada pelo ADMIN");
  assert.deepEqual(savedMission.objective, { metric: "assists", target: 7 });
  assert.equal(savedMission.configuration.positions[0].specialId, "sniper");
  assert.equal(await page.locator('[data-action="delete"]').count(), 1);
  await page
    .locator('[data-action="delete"][data-id="edit-mission-cancelled"]')
    .click();
  await page.locator("#modal-root #cancel").click();
  assert.equal(await page.locator('[data-action="delete"]').count(), 1);
  await page
    .locator('[data-action="delete"][data-id="edit-mission-cancelled"]')
    .click();
  await page.locator("#modal-root #confirm").click();
  await page.waitForFunction(
    () =>
      !window.__testState.events.some(
        (event) => event.id === "edit-mission-cancelled",
      ),
  );
  await page.getByRole("heading", { name: "Missões", exact: true }).waitFor();
  assert.equal(
    await page.locator('[data-edit="edit-mission-cancelled"]').count(),
    0,
  );

  await page.evaluate(() => {
    window.__testState.events = [];
  });
  await page.evaluate(() => {
    window.__testState.events.push({
      schemaVersion: 2,
      id: "public-podium",
      title: "Pódio da comunidade",
      kind: "event",
      method: "vote",
      status: "closed",
      startsAt: "2026-10-10",
      endsAt: "2026-10-15",
      participantIds: ["pedro", "joao", "miguel"],
      objective: { metric: "games", target: 1 },
      questions: [],
      totalVotes: 12,
      votesPerUser: 1,
      minVotes: 1,
      tieBreak: "uid",
      ranking: ["pedro", "joao", "miguel"].map((uid, i) => ({
        uid,
        position: i + 1,
        votes: 6 - i * 2,
      })),
      winners: ["pedro", "joao", "miguel"].map((uid, i) => ({
        uid,
        uids: [uid],
        position: i + 1,
        votes: 6 - i * 2,
        reward: {
          mode: "card",
          specialId: "mvp",
          statDuration: "weekly",
          boosts: {},
          points: 10 - i * 3,
        },
      })),
    });
  });
  await navigate("#/events", "Eventos e desafios");
  await page.locator('a[href="#/event/public-podium"]').click();
  await page
    .getByRole("heading", { name: "Pódio da comunidade", exact: true })
    .waitFor();
  assert.equal(await page.locator(".podium-award").count(), 3);
  assert.match(await page.locator(".podium-award.place-1").textContent(), /🥇/);
  await page.evaluate(() => {
    const event = window.__testState.events[0];
    event.participantIds.push("andre");
    event.ranking.push({ uid: "andre", position: 4, votes: 1 });
    event.participationAwards = [
      {
        uid: "andre",
        position: 0,
        reward: {
          mode: "card",
          specialId: "mvp",
          statDuration: "weekly",
          boosts: {},
          points: 2,
        },
      },
    ];
    window.__testState.events.push({
      ...event,
      id: "completed-mission",
      title: "Desafio concluído",
      kind: "mission",
      method: "objective",
      scope: "individual",
      cadence: "once",
      maxRepeats: 1,
      objective: { metric: "games", target: 3 },
      progress: [{ uid: "pedro", progress: 3, eligible: true }],
      myRewards: [
        {
          reward: {
            mode: "card",
            specialId: "mvp",
            statDuration: "weekly",
            boosts: {},
            points: 5,
          },
          expiresAt: "2026-10-23",
        },
      ],
      claimedPeriods: ["once"],
    });
  });
  await navigate("#/events", "Eventos e desafios");
  await navigate("#/event/public-podium", "Pódio da comunidade");
  assert.match(
    await page
      .locator("#event-leaderboard tbody tr")
      .last()
      .locator("td")
      .first()
      .textContent(),
    /4.º/,
  );
  await navigate("#/event/completed-mission", "Desafio concluído");
  assert.match(
    await page.locator(".mission-progress-panel").textContent(),
    /Melhor em campo/,
  );
  assert.equal(await page.locator("#claim-mission").count(), 0);
  assert.equal(await page.locator(".event-podium").count(), 0);
  await page.evaluate(() => {
    const example = window.__testState.events.find(
      (event) => event.id === "completed-mission",
    );
    window.__testState.events.push({
      ...example,
      id: "translated-mission",
      title: "Missão em português",
      status: "open",
      difficulty: "easy",
      endsAt: "2026-10-23",
      objective: { metric: "goals", target: 10 },
      progress: [{ uid: "pedro", progress: 0, eligible: false }],
      claimedPeriods: [],
      myRewards: [],
    });
  });
  await navigate("#/missions", "Missões");
  assert.match(
    await page
      .locator('.mission[href="#/event/translated-mission"] p')
      .textContent(),
    /Fácil/,
  );
  assert.doesNotMatch(
    await page.locator("#main").innerText(),
    /\b(easy|medium|hard)\b/,
  );

  await page.evaluate(() => {
    const example = window.__testState.events.find(
      (e) => e.id === "translated-mission",
    );
    window.__testState.events.push({
      ...example,
      id: "goal-race",
      title: "Corrida às assistências",
      kind: "event",
      method: "objective",
      indefinite: true,
      endsAt: null,
      winnerCount: 1,
      liveResults: true,
      objective: { metric: "assists", target: 10 },
      progress: [{ uid: "pedro", progress: 3, eligible: false }],
      ranking: [{ uid: "pedro", position: 1, progress: 3, eligible: false }],
      winners: [],
    });
  });
  await navigate("#/events", "Eventos e desafios");
  await navigate("#/missions", "Missões");
  assert.match(
    await page.locator('.mission[href="#/event/goal-race"]').innerText(),
    /Competição/i,
  );
  assert.equal(
    await page
      .locator(
        '.mission-competitions .mission-competition[href="#/event/goal-race"]',
      )
      .count(),
    1,
  );
  assert.equal(
    await page
      .locator(".mission-groups > section")
      .first()
      .getAttribute("class"),
    "mission-competitions",
  );
  assert.match(
    await page.locator(".mission-competition-label").innerText(),
    /Competição/i,
  );
  await page
    .locator(".missions-workspace")
    .screenshot({ path: "test-results/missions-competitions-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page
    .locator(".missions-workspace")
    .screenshot({ path: "test-results/missions-competitions-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });

  assert.match(
    await page.locator('.mission[href="#/event/goal-race"]').innerText(),
    /3 \/ 10/,
  );
  await navigate("#/event/goal-race", "Corrida às assistências");
  assert.match(
    await page.locator(".event-rules").innerText(),
    /Vence quem atingir a meta primeiro/,
  );
  assert.equal(await page.locator("#claim-mission").count(), 0);
  assert.match(
    await page.locator(".mission-progress-panel").innerText(),
    /3 \/ 10/,
  );
  await page.evaluate(() => {
    const race = window.__testState.events.find((e) => e.id === "goal-race");
    race.progress = [{ uid: "pedro", progress: 4, eligible: false }];
    race.ranking = [
      { uid: "pedro", position: 1, progress: 4, eligible: false },
    ];
  });
  await context.clock.runFor(6000);
  await page
    .locator(".mission-progress-panel strong")
    .filter({ hasText: "4 / 10" })
    .waitFor();

  await navigate("#/event/translated-mission", "Missão em português");
  assert.deepEqual(await page.locator(".event-rules p").allTextContents(), [
    "Marca 10 golos.",
  ]);
  assert.doesNotMatch(
    await page.locator("#main").innerText(),
    /pelo administrador|conclusão\(ões\)|escolha\(s\)|identificador estável/,
  );
  await page.evaluate(() => {
    window.__testState.events = [];
  });

  await navigate("#/admin/weights", "Pesos do OVR");
  await page.locator("#ovr-preset").selectOption("five");
  await page.getByRole("button", { name: "Carregar", exact: true }).click();
  assert.equal(
    await page.locator('#ovr-settings [name="pace"]').inputValue(),
    "12.4",
  );
  assert.equal(
    await page.locator('#ovr-settings [name="goalkeeping"]').inputValue(),
    "8",
  );
  await page.locator("#ovr-preset").selectOption("position");
  await page.getByRole("button", { name: "Carregar", exact: true }).click();
  await page.evaluate(() => {
    window.__testState.cardThemes = [
      {
        id: "catalog-custom",
        name: "Carta criada",
        baseTheme: "gold-rare",
        colors: {
          primary: "#224466",
          secondary: "#112233",
          text: "#ffffff",
          border: "#aabbcc",
          glow: "#224466",
        },
        design: {
          shape: "crown",
          background: "waves",
          watermark: "crest",
          effect: "holographic",
        },
      },
    ];
  });
  await navigate("#/admin/card-types/pedro", "Cartas");
  assert.ok(
    await page.getByRole("link", { name: "Cartas", exact: true }).count(),
  );
  assert.equal(await page.locator("#weekly-photo-form").count(), 0);
  assert.equal(await page.locator("[data-card-type]").count(), 17);
  assert.equal(await page.locator('[data-card-type="mvp"] .mvp').count(), 1);
  assert.equal(
    await page
      .locator('[data-card-type="saved:catalog-custom"] .lab-designed')
      .count(),
    1,
  );
  assert.equal(
    await page
      .locator('[data-card-type="saved:catalog-custom"] .football-card')
      .getAttribute("data-studio-effect"),
    "holographic",
  );
  await page.locator('[data-card-type="saved:catalog-custom"]').click();
  assert.equal(
    await page.locator("#modal-root .card-caption h3").textContent(),
    "Pedro Silva",
  );
  assert.equal(await page.locator("#modal-root .studio-watermark").count(), 1);
  assert.equal(await page.locator("#modal-root input").count(), 0);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.screenshot({
    path: "test-results/admin-card-catalog-desktop.png",
    fullPage: true,
  });
  await page.locator("#card-types-player").selectOption("");
  await page.waitForFunction(
    () =>
      document.querySelector("#card-types-player")?.value === "" &&
      document.querySelector("#card-type-gallery .card-caption h3")
        ?.textContent === "Jogador exemplo",
  );
  assert.equal(await page.locator("[data-card-type]").count(), 17);
  await page.evaluate(() => {
    window.__testState.cardThemes = [];
  });
  await navigate("#/player/pedro", "Pedro Silva");
  await page
    .getByRole("link", { name: "Editar foto de carta", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Editar foto de carta", exact: true })
    .waitFor();
  assert.equal(await page.locator("#card-types-player").count(), 0);
  assert.equal(await page.locator("[data-card-type]").count(), 0);
  await context.route("https://example.com/card-photo.webp", (r) =>
    r.fulfill({
      contentType: "image/svg+xml",
      body: readFileSync("assets/default-avatar.svg", "utf8"),
    }),
  );
  const memberPhoto = await page.evaluate(
    () => window.__testState.users.find((p) => p.uid === "pedro").photoURL,
  );
  await page
    .locator('#weekly-photo-form [name="photoURL"]')
    .fill("https://example.com/card-photo.webp");
  await page
    .locator('#weekly-photo-form [name="photoScale"]')
    .evaluate((el) => {
      el.value = "140";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  await page.locator("#weekly-card-preview").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.locator('#weekly-photo-form [name="photoX"]').inputValue(),
    "33",
  );
  await page.locator("#save-weekly-photo").click();
  await page.waitForFunction(() =>
    window.__testState.weeklyCardPhotos?.some((p) => p.uid === "pedro"),
  );
  assert.equal(
    await page.evaluate(
      () => window.__testState.users.find((p) => p.uid === "pedro").photoURL,
    ),
    memberPhoto,
  );
  assert.equal(
    await page.evaluate(
      () =>
        window.__testState.weeklyCardPhotos.find((p) => p.uid === "pedro")
          .theme,
    ),
    undefined,
  );
  await page.screenshot({
    path: "test-results/admin-card-types-desktop.png",
    fullPage: true,
  });
  await navigate("#/player/pedro", "Pedro Silva");
  assert.equal(
    await page.locator(".card-stage .card-photo img").getAttribute("src"),
    "https://example.com/card-photo.webp",
  );
  assert.ok(
    (
      await page.locator(".card-stage .card-photo img").getAttribute("style")
    ).includes("scale(1.4)"),
  );
  await navigate("#/admin/card-photo/pedro", "Editar foto de carta");
  await page.locator("#reset-weekly-photo").click();
  await page.waitForFunction(
    () => !window.__testState.weeklyCardPhotos.some((p) => p.uid === "pedro"),
  );
  await page.locator('#weekly-photo-form [name="file"]').setInputFiles({
    name: "carta.png",
    mimeType: "image/png",
    buffer: readFileSync("design/sources/playstyles/ps_fin.png"),
  });
  assert.ok(
    (
      await page
        .locator("#weekly-card-preview .card-photo img")
        .getAttribute("src")
    ).startsWith("blob:"),
  );
  await page.locator("#save-weekly-photo").click();
  await page.waitForFunction(() =>
    window.__testState.weeklyCardPhotos.some(
      (p) =>
        p.uid === "pedro" &&
        p.photoURL === "https://example.com/weekly-photo.webp",
    ),
  );
  assert.ok(
    (
      await page.evaluate(
        () =>
          window.__testState.weeklyCardPhotos.find((p) => p.uid === "pedro")
            .imageBase64,
      )
    ).startsWith("UklG"),
  );
  assert.equal(
    await page.evaluate(
      () => window.__testState.users.find((p) => p.uid === "pedro").photoURL,
    ),
    memberPhoto,
  );
  await page.locator("#reset-weekly-photo").click();
  await page.waitForFunction(
    () => !window.__testState.weeklyCardPhotos.some((p) => p.uid === "pedro"),
  );
  await navigate("#/admin/cards", "Card Lab");
  assert.equal(
    await page.locator('#lab-controls input[type="number"]').count(),
    0,
  );
  assert.equal(await page.locator("[data-studio-preset]").count(), 12);
  await page.locator('[data-studio-preset="violet-wave"]').click();
  assert.equal(
    await page
      .locator("#card-preview .football-card")
      .getAttribute("data-studio-effect"),
    "holographic",
  );
  assert.equal(
    await page.locator("#card-preview .studio-watermark").count(),
    1,
  );
  await page.locator('[data-studio-tab="data"]').click();
  await page.locator("[name=ovr]").selectOption("92");
  await page.locator("#lab-attributes summary").click();
  for (const [key, value] of [
    ["pace", 90],
    ["shooting", 94],
    ["passing", 95],
    ["dribbling", 96],
  ])
    await page.locator(`[name=${key}]`).selectOption(String(value));
  assert.deepEqual(
    await page
      .locator("#card-preview [data-playstyle]")
      .evaluateAll((icons) => icons.map((i) => i.dataset.playstyle)),
    ["dribbling", "passing", "shooting"],
  );
  for (const [key, value] of [
    ["shooting", 89],
    ["passing", 89],
    ["dribbling", 89],
  ])
    await page.locator(`[name=${key}]`).selectOption(String(value));
  assert.equal(
    await page.locator("#card-preview [data-playstyle=pace]").count(),
    1,
  );
  await page.locator("[name=pace]").selectOption("89");
  assert.equal(await page.locator("#card-preview [data-playstyle]").count(), 0);
  for (const key of ["pace", "shooting", "passing"])
    await page.locator(`[name=${key}]`).selectOption("95");
  assert.equal(await page.locator("#card-preview [data-playstyle]").count(), 3);
  assert.ok(
    await page
      .locator("#card-preview [data-playstyle]")
      .evaluateAll((icons) =>
        icons.every((i) => i.complete && i.naturalWidth > 0),
      ),
  );

  await page.locator('[data-studio-tab="models"]').click();
  for (const theme of ["legend-form", "mvp", "gold-rare", "perfect-five"]) {
    await page.locator("[name=theme]").selectOption(theme);
    assert.equal(await page.locator(`#card-preview .${theme}`).count(), 1);
  }
  await page.locator('[data-studio-tab="layers"]').click();
  await page.locator('[data-studio-palette="ocean"]').click();
  await page
    .locator('[data-studio-choice="background"][data-value="grid"]')
    .click();
  await page
    .locator('[data-studio-panel="layers"] details')
    .evaluateAll((els) => els.forEach((el) => (el.open = true)));
  await page
    .locator('[data-studio-choice="effect"][data-value="glow"]')
    .click();
  await page
    .locator('[data-studio-choice="decoration"][data-value="wings"]')
    .click();
  await page
    .locator('[data-studio-choice="watermark"][data-value="crest"]')
    .click();
  assert.equal(
    await page.locator("#card-preview .studio-decoration").count(),
    1,
  );
  assert.equal(
    await page
      .locator("#card-preview .football-card")
      .getAttribute("data-studio-effect"),
    "glow",
  );
  await page.locator('[data-studio-tab="text"]').click();
  await page
    .locator('[data-studio-property="nameFont"]')
    .selectOption("editorial");
  await page.locator('[data-studio-property="nameSize"]').selectOption("125");
  assert.ok(
    (
      await page
        .locator("#card-preview .card-caption h3")
        .evaluate((el) => el.style.fontFamily)
    ).includes("Georgia"),
  );
  await page.locator('[data-studio-property="showStats"]').selectOption("no");
  assert.ok(await page.locator("#card-preview .card-stats").isHidden());
  await page.locator('[data-studio-property="showStats"]').selectOption("yes");
  await page.locator('[data-studio-tab="photo"]').click();
  const photoBefore = Number(
    await page.locator('[name="photoX"]').inputValue(),
  );
  await page.locator("#card-preview").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    Number(await page.locator('[name="photoX"]').inputValue()),
    photoBefore + 2,
  );
  await page.locator("#lab-undo").click();
  assert.equal(
    Number(await page.locator('[name="photoX"]').inputValue()),
    photoBefore,
  );
  await page.locator("#lab-redo").click();
  assert.equal(
    Number(await page.locator('[name="photoX"]').inputValue()),
    photoBefore + 2,
  );
  await page.locator('[data-photo-range="size"]').evaluate((el) => {
    el.value = "84";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator('[data-photo-range="zoom"]').evaluate((el) => {
    el.value = "130";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  assert.equal(
    await page
      .locator("#card-preview .card-photo")
      .evaluate((el) => el.style.width),
    "84%",
  );
  assert.equal(
    await page
      .locator("#card-preview .card-photo img")
      .evaluate((el) => el.style.transform),
    "scale(1.3)",
  );
  const photoBox = await page
    .locator("#card-preview .card-photo")
    .boundingBox();
  await page.mouse.move(
    photoBox.x + photoBox.width / 2,
    photoBox.y + photoBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    photoBox.x + photoBox.width / 2 + 18,
    photoBox.y + photoBox.height / 2 + 8,
  );
  await page.mouse.up();
  assert.ok(
    Number(await page.locator('[name="photoX"]').inputValue()) >
      photoBefore + 2,
  );
  const exportedPhotoX = await page.locator('[name="photoX"]').inputValue();
  await page.locator('[data-studio-tab="data"]').click();
  await page.locator('[name="primaryPosition"]').selectOption("GR");
  assert.equal(
    await page.locator("#card-preview .card-rating > small").textContent(),
    "GR",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#lab-export").click();
  const download = await downloadPromise;
  await download.saveAs("test-results/card-project.json");
  await page.locator('[data-studio-tab="photo"]').click();
  await page.locator("#lab-reset").click();
  assert.equal(await page.locator('[name="photoX"]').inputValue(), "31");
  await page
    .locator("#lab-import")
    .setInputFiles("test-results/card-project.json");
  await page.waitForFunction(
    (value) =>
      document.querySelector('#lab-controls [name="photoX"]').value === value,
    exportedPhotoX,
  );
  await page.locator('[data-studio-tab="models"]').click();
  await page.locator("[name=theme]").selectOption("custom-test");
  await page.getByRole("button", { name: "Guardar composição" }).click();
  await page.screenshot({
    path: "test-results/card-lab-desktop.png",
    fullPage: true,
  });
  await page.evaluate(async () => {
    document.querySelector("#toast-region").replaceChildren();
    const { card } = await import("/js/cards.js");
    const { ATTRIBUTES } = await import("/js/utils.js");
    const player = {
      uid: "preview",
      displayName: "João Silva",
      primaryPosition: "MED",
      countryCode: "PT",
      ovr: 86,
      hasCard: true,
      stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 86])),
    };
    document.querySelector("#main").innerHTML =
      `<h1>Comuns e raras</h1><div id="rarity-comparison" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px;padding:24px;max-width:960px;margin:auto">${["bronze", "silver", "gold"].map((metal) => `<div style="display:flex;flex-direction:column;align-items:center;gap:24px">${["common", "rare"].map((rarity) => card(player, { theme: `${metal}-${rarity}`, preview: true })).join("")}</div>`).join("")}</div>`;
  });
  for (const metal of ["bronze", "silver", "gold"]) {
    assert.equal(
      await page.locator(`.${metal}-common .ornament-facets`).count(),
      0,
    );
    assert.equal(
      await page.locator(`.${metal}-rare .ornament-facets`).count(),
      1,
    );
    assert.equal(
      await page
        .locator(".card-rarity, .card-series, .special-edition")
        .count(),
      0,
    );
    const colors = await page
      .locator(
        `.${metal}-common .card-stats, .${metal}-rare .card-stats, .${metal}-rare .card-rating, .${metal}-rare .card-caption`,
      )
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
    assert.ok(colors.every((color) => color === "rgb(33, 27, 19)"));
    const finishes = await page
      .locator(`.${metal}-common .card-surface, .${metal}-rare .card-surface`)
      .evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).backgroundImage),
      );
    assert.notEqual(finishes[0], finishes[1]);
    const sizes = await page
      .locator(`.${metal}-common, .${metal}-rare`)
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return {
            width: r.width,
            height: r.height,
            shadow: getComputedStyle(el).filter,
          };
        }),
      );
    assert.equal(sizes[0].width, sizes[1].width);
    assert.equal(sizes[0].height, sizes[1].height);
    assert.notEqual(sizes[0].shadow, sizes[1].shadow);
    assert.equal(
      await page.locator(`.${metal}-rare .rare-rim-detail`).count(),
      1,
    );
    const shapes = await page
      .locator(`.${metal}-common .card-surface, .${metal}-rare .card-surface`)
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).clipPath));
    assert.notEqual(shapes[0], shapes[1]);
    assert.equal(
      await page.locator(`.${metal}-rare .ornament-outline`).count(),
      1,
    );
  }
  await page
    .locator("#rarity-comparison")
    .screenshot({ path: "test-results/card-rarities-desktop.png" });
  await page.evaluate(async () => {
    const { card } = await import("/js/cards.js");
    const { SPECIAL_CARD_DESIGNS } = await import("/js/card-specials.js");
    const { ATTRIBUTES } = await import("/js/utils.js");
    const player = {
      uid: "preview",
      displayName: "João Silva",
      primaryPosition: "MED",
      countryCode: "PT",
      ovr: 92,
      hasCard: true,
      stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 92])),
    };
    document.querySelector("#main").innerHTML =
      `<h1>Edições especiais</h1><div id="special-comparison" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:32px;padding:24px;max-width:1180px;margin:auto">${Object.keys(
        SPECIAL_CARD_DESIGNS,
      )
        .map((theme) => card(player, { theme, preview: true }))
        .join("")}</div>`;
    document
      .querySelectorAll("#special-comparison .football-card")
      .forEach((el) => el.style.setProperty("--card-width", "190px"));
  });
  assert.equal(
    await page.locator("#special-comparison .card-special").count(),
    10,
  );
  const specialShapes = await page
    .locator("#special-comparison .card-surface")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).clipPath));
  assert.equal(new Set(specialShapes).size, 10);
  assert.equal(await page.locator(".special-motif").count(), 10);
  await page
    .locator("#special-comparison")
    .screenshot({ path: "test-results/card-specials-desktop.png" });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => {
      document.querySelector("#special-comparison").style.gridTemplateColumns =
        "repeat(2,minmax(0,1fr))";
      document.querySelector("#special-comparison").style.gap = "24px";
      document
        .querySelectorAll("#special-comparison .football-card")
        .forEach((el) =>
          el.style.setProperty(
            "--card-width",
            `${(document.querySelector("#special-comparison").clientWidth - 72) / 2}px`,
          ),
        );
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    const clipped = await page.locator(".card-special").evaluateAll((cards) =>
      cards.some((card) => {
        const r = card.getBoundingClientRect();
        return [
          ...card.querySelectorAll(".card-rating, .card-caption, .card-stats"),
        ].some((el) => {
          const b = el.getBoundingClientRect();
          return (
            b.left < r.left || b.right > r.right + 1 || b.bottom > r.bottom
          );
        });
      }),
    );
    assert.equal(clipped, false);
    const layouts = await page
      .locator("#special-comparison .football-card")
      .evaluateAll((cards) =>
        cards.map((card) => {
          const bounds = card.getBoundingClientRect();
          const rect = card.querySelector("clipPath rect");
          const safe = {
            left: bounds.left + Number(rect.getAttribute("x")) * bounds.width,
            top: bounds.top + Number(rect.getAttribute("y")) * bounds.height,
            right:
              bounds.left +
              (Number(rect.getAttribute("x")) +
                Number(rect.getAttribute("width"))) *
                bounds.width,
            bottom:
              bounds.top +
              (Number(rect.getAttribute("y")) +
                Number(rect.getAttribute("height"))) *
                bounds.height,
          };
          return [
            ...card.querySelectorAll(".card-rating,.card-caption,.card-stats"),
          ].map((el) => {
            const r = el.getBoundingClientRect();
            if (
              r.left < safe.left - 1 ||
              r.top < safe.top - 1 ||
              r.right > safe.right + 1 ||
              r.bottom > safe.bottom + 1
            )
              throw Error("Texto fora do ret?ngulo obrigat?rio");
            return [
              Math.round(((r.left - bounds.left) / bounds.width) * 100),
              Math.round(((r.top - bounds.top) / bounds.height) * 100),
              Math.round((r.width / bounds.width) * 100),
              Math.round((r.height / bounds.height) * 100),
            ];
          });
        }),
      );
    assert.ok(
      layouts.every(
        (layout) => JSON.stringify(layout) === JSON.stringify(layouts[0]),
      ),
    );

    await page
      .locator("#special-comparison")
      .screenshot({ path: `test-results/card-specials-${width}.png` });
  }
  const mobileIssues = [];
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    for (const [hash, title] of [
      ["#/", "Pedro Silva"],
      ["#/players", "Jogadores"],
      ["#/games", "Jogos"],
      ["#/game/new", "Criar jogo"],
      ["#/game/test-game", "Peladinha de teste"],
      ["#/game/test-game/feedback", "Avaliar"],
      ["#/missions", "Missões"],
      ["#/ranking", "Ranking semanal"],
      ["#/statistics", "Estatísticas"],
      ["#/notifications", "Notificações"],
      ["#/tickets", "Tickets"],
      ["#/tickets/new", "Novo ticket"],
      ["#/tickets/spacing", "Espaçamento do ticket"],
      ["#/admin", "A tua liga"],
      ["#/admin/players", "Jogadores"],
      ["#/admin/games", "Jogos"],
      ["#/admin/weights", "Pesos do OVR"],
      ["#/admin/messages", "Mensagens"],
      ["#/admin/maintenance", "Manutenção"],
      ["#/admin/support", "Tickets"],
      ["#/admin/ratings", "Avaliações"],
      ["#/admin/ovr/pedro", "Cálculo OVR"],
      ["#/profile", "Pedro Silva"],
      ["#/profile/edit", "Editar perfil"],
      ["#/admin/card-types", "Cartas"],
      ["#/admin/card-photo/pedro", "Editar foto de carta"],
      ["#/admin/cards", "Card Lab"],
      ["#/assets", "Recursos visuais"],
    ]) {
      await navigate(hash, title);
      const issues = await page.evaluate(() => {
        const issues = [];
        if (document.documentElement.scrollWidth > innerWidth + 1)
          issues.push("page overflow");
        for (const el of document.querySelectorAll(
          "#main .panel, #main .football-card, #main input, #main select, #main textarea, #main .btn",
        )) {
          if (!el.getClientRects().length || el.closest(".chip-card")) continue;
          let scrollContainer = el.parentElement;
          while (
            scrollContainer &&
            scrollContainer !== document.querySelector("#main")
          ) {
            if (
              ["auto", "scroll"].includes(
                getComputedStyle(scrollContainer).overflowX,
              )
            )
              break;
            scrollContainer = scrollContainer.parentElement;
          }
          if (
            scrollContainer &&
            scrollContainer !== document.querySelector("#main")
          )
            continue;
          const r = el.getBoundingClientRect();
          if (r.width && (r.left < -1 || r.right > innerWidth + 1))
            issues.push(
              `${el.className || el.name}: ${Math.round(r.left)}..${Math.round(r.right)}`,
            );
        }
        return issues;
      });
      if (issues.length) mobileIssues.push({ width, hash, issues });
      if (width === 390)
        await page.screenshot({
          path: `test-results/mobile-${hash.replace(/[^a-z0-9]/gi, "") || "home"}.png`,
          fullPage: true,
        });
      if (hash === "#/game/test-game") {
        await page
          .getByRole("button", { name: "Ver detalhes das equipas" })
          .click();
        const dialog = await page.locator('[role="dialog"]').evaluate((el) => {
          const r = el.getBoundingClientRect();
          return {
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
            width: innerWidth,
            height: innerHeight,
          };
        });
        if (
          dialog.left < 0 ||
          dialog.right > dialog.width ||
          dialog.top < 0 ||
          dialog.bottom > dialog.height
        )
          mobileIssues.push({
            width,
            hash,
            issues: ["dialog outside viewport"],
          });
        await page.getByRole("button", { name: "Fechar", exact: true }).click();
      }
    }
    await page.locator("#bell").click();
    assert.ok(
      await page.locator("#notification-dropdown").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.right <= innerWidth + 1 &&
          r.top >= 0 &&
          r.bottom <= innerHeight
        );
      }),
      `Notification popup ${width}`,
    );
    await page.locator("#bell").click();
    await page.locator("#theme-picker").click();
    assert.ok(
      await page.locator('[role="dialog"]').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.right <= innerWidth + 1 &&
          r.top >= 0 &&
          r.bottom <= innerHeight
        );
      }),
      `Theme dialog ${width}`,
    );
    await page.keyboard.press("Escape");
  }
  console.log("Mobile layout audit:", JSON.stringify(mobileIssues));
  assert.deepEqual(mobileIssues, []);
  await page.setViewportSize({ width: 390, height: 844 });
  await navigate("#/admin/players", "Jogadores");
  await page.locator('[data-role="joao"][data-target-role="dbs"]').click();
  await page.locator("#confirm").click();
  await page.waitForFunction(
    () => window.__testState.users.find((u) => u.uid === "joao").role === "dbs",
  );
  await navigate("#/games", "Jogos");
  await navigate("#/admin/players", "Jogadores");
  await page.locator('[data-role="joao"][data-target-role="member"]').click();
  await page.locator("#confirm").click();
  await page.waitForFunction(
    () =>
      window.__testState.users.find((u) => u.uid === "joao").role === "member",
  );
  await page.evaluate(() => {
    const source = window.__testState.games.find((g) => g.id === "test-game");
    window.__testState.games.push({
      ...source,
      id: "dbs-open",
      title: "Jogo aberto DBS",
      creatorId: "joao",
      status: "open",
      closedAt: null,
      closedBy: null,
    });
    window.__testState.games.push({
      ...source,
      id: "dbs-draft",
      title: "Rascunho DBS",
      creatorId: "joao",
      status: "draft",
      closedAt: null,
      closedBy: null,
    });
    window.__testState.users.find((u) => u.uid === "pedro").role = "dbs";
  });
  await navigate("#/game/dbs-open", "Jogo aberto DBS");
  assert.equal(await page.locator("[data-role-perspective]").count(), 0);
  assert.ok(await page.locator('[name="title"]').isEnabled());
  assert.equal(await page.locator("#auto-teams").count(), 1);
  assert.equal(
    await page
      .getByRole("button", { name: "Encerrar jogo", exact: true })
      .count(),
    1,
  );
  await page.locator('[name="location"]').fill("Editado por DBS");
  await page.getByRole("button", { name: "Guardar jogo", exact: true }).click();
  await page.waitForFunction(
    () =>
      window.__testState.games.find((g) => g.id === "dbs-open").location ===
      "Editado por DBS",
  );
  await page
    .getByRole("button", { name: "Encerrar jogo", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      window.__testState.games.find((g) => g.id === "dbs-open").status ===
      "closed",
  );
  await navigate("#/games", "Jogos");
  await navigate("#/game/dbs-open", "Jogo aberto DBS");
  assert.ok(await page.locator('[name="title"]').isDisabled());
  assert.equal(await page.locator("#delete-game").count(), 0);
  await navigate("#/game/dbs-draft", "Rascunho DBS");
  assert.ok(await page.locator('[name="title"]').isEnabled());
  await navigate("#/game/test-game", "Peladinha de teste");
  assert.ok(await page.locator('[name="title"]').isDisabled());
  await page.evaluate(() => {
    location.hash = "#/admin";
  });
  await page
    .getByRole("heading", { name: "Acesso reservado", exact: true })
    .waitFor();
  await page.evaluate(() => {
    window.__testState.users.find((u) => u.uid === "pedro").role = "member";
  });
  await navigate("#/game/dbs-open", "Jogo aberto DBS");
  assert.ok(await page.locator('[name="title"]').isDisabled());
  await page.evaluate(() => {
    window.__testState.users.find((u) => u.uid === "pedro").role = "admin";
  });
  await page.evaluate(() => {
    const source = window.__testState.users.find((u) => u.uid === "joao");
    for (let i = 0; i < 14; i++)
      window.__testState.users.push({
        ...source,
        uid: `available-${i}`,
        username: `disponivel${i}`,
        displayName: `Jogador disponível ${i}`,
      });
  });
  await navigate("#/game/dbs-draft", "Rascunho DBS");
  const availableLayout = await page
    .locator(".available .team-player-list")
    .evaluate((el) => ({
      columns: getComputedStyle(el).gridTemplateColumns.split(" ").length,
      height: el.clientHeight,
      scroll: el.scrollHeight,
      overflow: getComputedStyle(el).overflowY,
    }));
  assert.equal(availableLayout.columns, 2);
  assert.ok(
    availableLayout.height <= 736 &&
      availableLayout.scroll > availableLayout.height,
  );
  assert.equal(availableLayout.overflow, "auto");
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const layout = await page
      .locator(".available .team-player-list")
      .evaluate((el) => ({
        columns: getComputedStyle(el).gridTemplateColumns.split(" ").length,
        height: el.clientHeight,
        scroll: el.scrollHeight,
      }));
    assert.equal(layout.columns, 2);
    assert.ok(layout.scroll > layout.height);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `test-results/available-players-${width}.png`,
    });
  }
  await page.evaluate(() => {
    window.__testState.users = [];
    window.__testState.games = [];
  });
  await navigate("#/players", "Jogadores");
  await page.getByText("Ainda não existem jogadores para mostrar").waitFor();
  await page.evaluate(() => {
    window.__fail = true;
    location.hash = "#/games";
  });
  await page.getByText("Não foi possível carregar", { exact: true }).waitFor();
  await page.evaluate(() => (window.__fail = false));
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await page.getByText("Ainda não existem jogos", { exact: true }).waitFor();
  await page.locator("#mobile-more").click();
  await page.locator("#menu-logout").click();
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Login overflow ${width}`,
    );
    await page
      .getByRole("button", { name: "Criar conta", exact: true })
      .click();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Register overflow ${width}`,
    );
    await page
      .getByRole("button", { name: "Entrar", exact: true })
      .first()
      .click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await page.locator("[name=username]").fill("novo.jogador");
  await page.locator("[name=password]").fill("segredo123");
  await page.locator("[name=confirmPassword]").fill("segredo123");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("[name=displayName]").fill("Novo Jogador");
  await page.locator("[name=birthDate]").fill("1998-05-20");
  await page.locator("[name=heightCm]").fill("178");
  await page.locator("[name=weightKg]").fill("76");
  await page.locator("[name=preferredFoot]").selectOption("right");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("[name=avatar]").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0L8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Criar conta e avaliar" }).click();
  await page
    .getByRole("heading", { name: "Conhece o teu jogo", level: 1 })
    .waitFor();
  for (const k of [
    "pace",
    "shooting",
    "passing",
    "dribbling",
    "defending",
    "physical",
    "goalkeeping",
    "stamina",
    "vision",
    "positioning",
    "teamwork",
    "composure",
  ])
    await page.locator(`[data-rating=${k}]`).fill("15");
  await page.getByRole("button", { name: "Concluir", exact: true }).click();
  await page.getByRole("heading", { name: "Missões", level: 1 }).waitFor();
  await navigate("#/profile", "Novo Jogador");
  await page.getByText("Carta provisória", { exact: true }).waitFor();
  await page.evaluate(() => (location.hash = "#/admin/ovr/new-user"));
  await page
    .getByRole("heading", { name: "Acesso reservado", exact: true })
    .waitFor();
  assert.equal(await page.locator("#ovr-weights").count(), 0);
  assert.equal(await page.locator(".admin-area-nav").count(), 0);
  for (const section of [
    "players",
    "games",
    "weights",
    "messages",
    "maintenance",
    "support",
  ]) {
    await page.evaluate(
      (section) => (location.hash = `#/admin/${section}`),
      section,
    );
    await page
      .getByRole("heading", { name: "Acesso reservado", exact: true })
      .waitFor();
    assert.equal(await page.locator(".admin-area-nav").count(), 0);
  }

  // A new member must see missions even for already official players.
  await page.evaluate(() => {
    window.__testState.users.push({
      uid: "pedro",
      username: "pedro",
      displayName: "Pedro Silva",
      role: "member",
      disabled: false,
      countryCode: "PT",
      primaryPosition: "ALA",
    });
    window.__testState.initialRatings.push({
      uid: "pedro",
      ratings20: Object.fromEntries(
        [
          "pace",
          "shooting",
          "passing",
          "dribbling",
          "defending",
          "physical",
          "goalkeeping",
          "stamina",
          "vision",
          "positioning",
          "teamwork",
          "composure",
        ].map((k) => [k, 16]),
      ),
    });
    window.__testState.communitySummaries = [
      {
        targetId: "pedro",
        count: 3,
        ratings20: Object.fromEntries(
          [
            "pace",
            "shooting",
            "passing",
            "dribbling",
            "defending",
            "physical",
            "goalkeeping",
            "stamina",
            "vision",
            "positioning",
            "teamwork",
            "composure",
          ].map((k) => [k, 16]),
        ),
      },
    ];
  });
  await navigate("#/missions", "Missões");
  await page
    .getByRole("heading", { name: "Avaliar Pedro Silva", exact: true })
    .waitFor();
  await navigate("#/player/pedro", "Pedro Silva");
  await page
    .getByRole("link", { name: "Avaliar jogador", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "Avaliar Pedro Silva",
      exact: true,
      level: 1,
    })
    .waitFor();
  for (const key of [
    "pace",
    "shooting",
    "passing",
    "dribbling",
    "defending",
    "physical",
    "goalkeeping",
    "stamina",
    "vision",
    "positioning",
    "teamwork",
    "composure",
  ])
    await page.locator(`[data-rating=${key}]`).fill("15");
  await page.getByRole("button", { name: "Concluir", exact: true }).click();
  await page.getByRole("heading", { name: "Missões", level: 1 }).waitFor();
  assert.equal(
    await page
      .getByRole("heading", { name: "Avaliar Pedro Silva", exact: true })
      .count(),
    0,
  );
  await navigate("#/player/pedro", "Pedro Silva");
  await page
    .getByRole("link", { name: "Editar a minha avaliação", exact: true })
    .click();
  await page.locator("[data-rating=pace]").fill("18");
  await page.waitForTimeout(700);
  await navigate("#/missions", "Missões");
  assert.equal(
    await page
      .getByRole("heading", { name: "Avaliar Pedro Silva", exact: true })
      .count(),
    0,
  );
  await navigate("#/player/pedro", "Pedro Silva");
  await page
    .getByRole("link", { name: "Editar a minha avaliação", exact: true })
    .click();
  assert.equal(await page.locator("[data-rating=pace]").inputValue(), "18");
  await navigate("#/statistics", "Estatísticas");
  await page.locator("#statistics-sort").selectOption("ovr");
  assert.equal(
    await page
      .locator(".statistics-table th.stat-ovr")
      .getAttribute("aria-sort"),
    "descending",
  );
  await page.locator("#statistics-direction").selectOption("asc");
  assert.equal(
    await page
      .locator(".statistics-table th.stat-ovr")
      .getAttribute("aria-sort"),
    "ascending",
  );
  await page.evaluate(async () => {
    const { card } = await import("/js/cards.js");
    const stats = Object.fromEntries(
      [
        "pace",
        "shooting",
        "passing",
        "dribbling",
        "defending",
        "physical",
        "goalkeeping",
        "stamina",
        "vision",
        "positioning",
        "teamwork",
        "composure",
      ].map((k) => [k, 80]),
    );
    const root = document.createElement("div");
    root.id = "ovr-arrow-test";
    root.innerHTML =
      card(
        { uid: "up", displayName: "Subiu", ovr: 80, ovrDelta: 3, stats },
        { preview: true },
      ) +
      card(
        { uid: "down", displayName: "Desceu", ovr: 80, ovrDelta: -2, stats },
        { preview: true },
      );
    document.querySelector("#main").append(root);
  });
  assert.equal(
    await page.locator("#ovr-arrow-test .card-ovr-trend.positive").count(),
    1,
  );
  assert.equal(
    await page.locator("#ovr-arrow-test .card-ovr-trend.negative").count(),
    1,
  );
  await page.evaluate(() => document.querySelector("#ovr-arrow-test").remove());

  assert.ok(
    await page
      .locator("#statistics-table")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  );
  assert.ok((await page.locator("#statistics-table tbody tr").count()) >= 2);
  await page.locator("#mobile-more").click();
  assert.ok(
    (await page.locator('.more-menu a[href="#/statistics"]').count()) >= 1,
  );
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, []);
  console.log(
    "UI: navegação, equipas, feedback, autosave e defaults 0, perfil, sino, ranking, Card Lab, mobile e empty states passaram.",
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
