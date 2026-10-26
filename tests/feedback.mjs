import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium, webkit } from "./browser-sandbox.mjs";
import { seedDocumentation } from "../scripts/documentation-fixtures.mjs";
const root = resolve(".");
const server = createServer((req, res) => {
  const file = resolve(
    root,
    "." + new URL(req.url, "http://localhost").pathname,
  );
  const path = file === root ? resolve(root, "index.html") : file;
  if (!path.startsWith(root + sep) || !existsSync(path)) {
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
      ".woff": "font/woff",
    }[extname(path)] || "application/octet-stream",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const isWebKit = process.argv.includes("--webkit");
const browser = await (isWebKit ? webkit : chromium).launch({
  headless: true,
  ...(!isWebKit && process.platform === "win32" ? { channel: "msedge" } : {}),
});
const output = `test-results/feedback${isWebKit ? "-webkit" : ""}`;
mkdirSync(output, { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
    hasTouch: true,
  });
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/db.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/db.js", "utf8").replaceAll(
        "../../js/utils.js",
        "./utils.js",
      ),
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  await context.route(/https:\/\//, (r) => r.abort());
  await context.route("**/js/app.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body:
        readFileSync("js/app.js", "utf8") +
        "\nwindow.__feedbackTestContext=ctx;",
    }),
  );
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.clock.install({ time: new Date("2026-10-23T12:00:00Z") });
  await page.goto(url);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(seedDocumentation);
  await page.evaluate(() => {
    window.__testState.feedback = window.__testState.feedback.filter(
      (f) => f.gameId !== "demo-game-0",
    );
  });
  await page.locator("#player-grid").waitFor();
  await page.clock.fastForward(31000);
  async function openFeedback() {
    await page.evaluate(async () => {
      await window.__feedbackTestContext.refresh();
      location.hash = "#/game/demo-game-0/feedback";
    });
    await page.locator(".feedback-review[open]").waitFor();
  }
  await openFeedback();
  assert.equal((await page.locator(".feedback-scoreline > strong").textContent()).trim(), "5:3");
  assert.match(await page.locator('[data-target="pedro"]').locator("..").locator(".feedback-player-stats").innerText(), /2\s+golos.*1\s+assist/s);
  const form = page.locator(".feedback-review[open] .feedback-form");
  const field = (key) => form.locator(`[data-dimension="${key}"]`);
  const choose = (key, value) =>
    field(key).locator(`label[data-value="${value}"]`).click();
  assert.equal(await page.locator(".feedback-team").count(), 2);
  assert.equal(
    await page.locator(".feedback-team-a .feedback-review").count(),
    5,
  );
  assert.equal(
    await page.locator(".feedback-team-b .feedback-review").count(),
    5,
  );
  assert.equal(await page.locator('[data-target="pedro"]').count(), 1);
  assert.equal(await page.locator(".feedback-self-review").count(), 1);
  assert.equal(await page.locator("#edit-game-feedback").count(), 0);
  assert.equal(await form.locator("select").count(), 0);
  assert.equal(
    await field("overall").locator("[data-rating]").inputValue(),
    "",
  );
  assert.equal(await form.evaluate((f) => f.checkValidity()), false);
  await choose("overall", "4");
  assert.equal(await field("overall").locator(".is-filled").count(), 4);
  const xs = await field("overall")
    .locator(".feedback-star")
    .evaluateAll((stars) =>
      stars.map((star) => star.getBoundingClientRect().x),
    );
  assert.ok(
    xs.every((x, i) => !i || x > xs[i - 1]),
    "Stars must increase left to right",
  );
  await field("overall").locator("input:checked").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await field("overall").locator("[data-rating]").inputValue(),
    "5",
  );
  assert.equal(await field("overall").locator(".is-filled").count(), 5);
  await page.keyboard.press("ArrowLeft");
  assert.equal(
    await field("overall").locator("[data-rating]").inputValue(),
    "4",
  );
  await field("overall").locator('.feedback-star[data-value="5"]').hover();
  assert.equal(await field("overall").locator(".is-filled").count(), 5);
  assert.equal(
    await field("overall").locator("[data-rating]").inputValue(),
    "4",
  );
  await field("overall").locator(".feedback-dimension").hover();
  assert.equal(await field("overall").locator(".is-filled").count(), 4);
  await choose("attack", "0");
  await choose("goalkeeping", "na");
  assert.equal(
    await field("attack").locator("[data-rating]").inputValue(),
    "0",
  );
  assert.equal(
    await field("goalkeeping").locator("[data-rating]").inputValue(),
    "na",
  );
  await page.waitForFunction(() =>
    window.__testState.feedback.some(
      (f) =>
        f.gameId === "demo-game-0" &&
        f.targetId === "ana" &&
        f.ratings.overall === 4 &&
        f.ratings.attack === 0 &&
        f.ratings.goalkeeping === null,
    ),
  );
  await page.evaluate(() => {
    location.hash = "#/games";
  });
  await page.locator(".game-list").waitFor();
  await openFeedback();
  assert.equal(
    await field("overall").locator("[data-rating]").inputValue(),
    "4",
  );
  assert.equal(
    await field("attack").locator("[data-rating]").inputValue(),
    "0",
  );
  assert.equal(
    await field("goalkeeping").locator("[data-rating]").inputValue(),
    "na",
  );
  for (const key of ["passing", "defense", "physical", "attitude"])
    await choose(key, "4");
  assert.equal(await form.evaluate((f) => f.checkValidity()), true);
  assert.match(
    await form.locator("[data-rating-count]").innerText(),
    /^7 \/ 7/,
  );
  for (const theme of ["club", "volt", "champions", "ultimate"]) {
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
    }, theme);
    for (const width of [1440, 1024, 768, 701, 700, 430, 390, 360, 320]) {
      await page.setViewportSize({ width, height: 920 });
      const geometry = await form.evaluate((f) => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        rows: [...f.querySelectorAll(".feedback-field")].map(
          (row) => row.getBoundingClientRect().top,
        ),
        minStar: Math.min(
          ...[...f.querySelectorAll(".feedback-star")].map(
            (star) => star.getBoundingClientRect().width,
          ),
        ),
      }));
      assert.equal(geometry.overflow, false, `Overflow ${theme} ${width}`);
      const teams = await page.locator("section.feedback-team").evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width }; }));
      if (width >= 1100) {
        assert.ok(Math.abs(teams[0].y - teams[1].y) < 2);
        assert.ok(Math.abs(teams[0].width - teams[1].width) < 2);
      }
      if (theme === "club" && [1440, 768, 390, 320].includes(width))
        await page.screenshot({ path: `${output}/page-${width}.png`, fullPage: true, animations: "disabled" });
      assert.ok(
        geometry.rows.every((y, i) => !i || y > geometry.rows[i - 1]),
        "Each dimension must occupy its own row",
      );
      assert.ok(
        geometry.minStar >= 38,
        `Star touch width ${geometry.minStar} at ${width}`,
      );
      if (width <= 700) {
        const na = field("goalkeeping").locator(".feedback-na");
        await na.tap();
        assert.equal(
          await field("goalkeeping").locator("[data-rating]").inputValue(),
          "na",
        );
        const box = await na.boundingBox();
        assert.ok(
          box.height >= 44 && box.x >= 0 && box.x + box.width <= width,
          `N/A touch target ${theme} ${width}`,
        );
      }
      if (theme === "club" && [1440, 390, 320].includes(width))
        await page.locator("section.feedback-team-a").screenshot({
          path: `${output}/${width}.png`,
          animations: "disabled",
          style: "#header,.bottom-nav{visibility:hidden!important;}",
        });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await field("passing").locator('.feedback-star[data-value="5"]').tap();
  assert.equal(await field("passing").locator(".is-filled").count(), 5);
  const submit = page.getByRole("button", { name: "Submeter", exact: true });
  await submit.tap();
  assert.equal(
    await page.locator('.feedback-form[data-submitted="true"]').count(),
    0,
  );
  const geometry = await submit.evaluate((button) => {
    const box = button.getBoundingClientRect();
    return {
      height: box.height,
      center: box.left + box.width / 2,
      viewport: innerWidth,
    };
  });
  assert.ok(geometry.height >= 64);
  assert.ok(Math.abs(geometry.center - geometry.viewport / 2) < 4);
  await page.evaluate(() => {
    document
      .querySelectorAll(
        '.feedback-form[data-submitted="false"] .feedback-field',
      )
      .forEach((field) => {
        if (field.querySelector("[data-rating]").value !== "") return;
        const choice = field.querySelector(
          'input[data-feedback-choice][value="3"]',
        );
        choice.checked = true;
        choice.dispatchEvent(new Event("input", { bubbles: true }));
      });
  });
  await submit.tap();
  await page
    .locator('[data-target="ana"][data-submitted="true"]')
    .waitFor({ state: "attached" });
  const sent = page.locator('[data-target="ana"]');
  assert.equal(
    await sent.locator("input[data-feedback-choice]:enabled").count(),
    0,
  );
  assert.equal(
    await sent.locator('[data-dimension="attack"] [data-rating]').inputValue(),
    "0",
  );
  assert.equal(
    await sent
      .locator('[data-dimension="goalkeeping"] [data-rating]')
      .inputValue(),
    "na",
  );
  assert.ok(await page.locator("[data-edit-remaining]").isVisible());
  assert.ok(
    (await page.locator("[data-edit-remaining]").textContent()).startsWith(
      "Restam",
    ),
  );
  assert.ok(
    (await page
      .locator(".feedback-team-shortcuts")
      .evaluate((el) => el.getBoundingClientRect().bottom)) <=
      (await page
        .locator(".feedback-edit-bar")
        .evaluate((el) => el.getBoundingClientRect().top)),
  );
  await page.locator(".feedback-info-button").focus();
  assert.ok(await page.locator(".feedback-info-tooltip").isVisible());
  assert.ok(
    (await page.locator(".feedback-info-tooltip").textContent()).includes(
      "não reinicia",
    ),
  );
  for (const width of [320, 390, 844, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `Editing toolbar overflow ${width}`,
    );
  }
  await page.locator(".feedback-self-review > summary").click();
  assert.ok(await page.locator(".feedback-self-notice").isVisible());
  await page
    .locator(".feedback-self-review")
    .screenshot({ path: `${output}/self-review.png` });
  await page
    .locator(".feedback-overview")
    .screenshot({ path: `${output}/edit-toolbar.png` });
  const firstSubmission = await page.evaluate(() =>
    window.__testState.feedback
      .find(
        (row) =>
          row.gameId === "demo-game-0" &&
          row.targetId === "ana" &&
          row.raterId === "pedro",
      )
      .submittedAt.toISOString(),
  );
  await page
    .getByRole("button", { name: "Editar avaliações enviadas", exact: true })
    .click();
  await page
    .locator('[data-target="ana"]')
    .evaluate((form) => (form.closest("details").open = true));
  await page
    .locator(
      '[data-target="ana"] [data-dimension="attack"] .feedback-star[data-value="4"]',
    )
    .tap();
  await page.waitForFunction(() =>
    window.__testState.feedback.some(
      (row) =>
        row.gameId === "demo-game-0" &&
        row.targetId === "ana" &&
        row.raterId === "pedro" &&
        row.ratings.attack === 4 &&
        row.submitted,
    ),
  );
  assert.equal(
    await page.evaluate(() =>
      window.__testState.feedback
        .find(
          (row) =>
            row.gameId === "demo-game-0" &&
            row.targetId === "ana" &&
            row.raterId === "pedro",
        )
        .submittedAt.toISOString(),
    ),
    firstSubmission,
  );
  await page.getByRole("button", { name: "Submeter", exact: true }).click();
  await page.locator('[data-target="ana"][data-submitted="true"]').waitFor();
  await page.clock.fastForward(8 * 86400000);
  await page.evaluate(() => {
    location.hash = "#/games";
  });
  await page.locator(".game-list").waitFor();
  await openFeedback();
  assert.equal(
    await page
      .getByRole("button", { name: "Editar avaliações enviadas", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page
      .locator(".feedback-form input[data-feedback-choice]:enabled")
      .count(),
    0,
  );
  await page.locator('[data-feedback-team="B"]').click();
  assert.equal(
    await page
      .locator("#feedback-team-heading-B")
      .evaluate((el) => document.activeElement === el),
    true,
  );
  await page.locator(".feedback-team-b .feedback-player").first().click();
  await page.waitForFunction(
    () => document.querySelectorAll(".feedback-review[open]").length === 1,
  );
  assert.ok(
    (await page
      .locator(".feedback-team-b .feedback-review")
      .first()
      .getAttribute("open")) !== null,
  );
  await page.evaluate(() => {
    window.__testState.feedback = window.__testState.feedback.filter(
      (row) => row.targetId !== "joao",
    );
    window.__testState.feedback.push({
      gameId: "demo-game-0",
      raterId: "pedro",
      targetId: "joao",
      submitted: true,
      ratings: {
        overall: 4,
        attack: 4,
        passing: 3,
        defense: 3,
        physical: 4,
        goalkeeping: null,
      },
    });
    location.hash = "#/games";
  });
  await page.locator(".game-list").waitFor();
  await openFeedback();
  await page
    .locator('[data-target="joao"]')
    .locator("..")
    .locator(".feedback-player")
    .click();
  const legacy = page.locator(
    '[data-target="joao"] [data-dimension="attitude"]',
  );
  assert.equal(await legacy.locator("[data-rating]").inputValue(), "");
  assert.equal(await legacy.locator("input:checked").count(), 0);
  assert.equal(
    await legacy.locator(".feedback-rating-result").innerText(),
    "Sem avalia" + String.fromCharCode(231, 227) + "o",
  );
  assert.equal(await page.locator(".feedback-form button").count(), 0);
  await page.evaluate(async () => {
    window.__testState.users.find((user) => user.uid === "pedro").role =
      "admin";
    await window.__feedbackTestContext.refresh();
    location.hash = "#/game/demo-game-0/edit";
  });
  await page.locator("#game-form").waitFor();
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 360, 390, 430, 844]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `Admin game overflow ${width}`,
    );
    assert.ok(await page.locator('[name="title"]').isEnabled());
    await page
      .locator('[name="location"]')
      .fill(`Correção no telemóvel ${width}`);
    await page
      .getByRole("button", { name: "Guardar jogo", exact: true })
      .click();
    await page.waitForFunction(
      (width) =>
        window.__testState.games.find((game) => game.id === "demo-game-0")
          .location === `Correção no telemóvel ${width}`,
      width,
    );
    await page.evaluate(() => {
      location.hash = "#/game/demo-game-0/edit";
    });
    await page.locator("#game-form").waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          window.__testState.games.find((game) => game.id === "demo-game-0")
            .status,
      ),
      "closed",
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    `Feedback ${isWebKit ? "WebKit" : "Chromium"}: stars, keyboard, zero/N-A, draft persistence, submission, teams, themes and responsive layouts passed.`,
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
