import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = resolve(".");
const server = createServer((req, res) => {
  const path = resolve(
    root,
    "." + new URL(req.url, "http://localhost").pathname,
  );
  const file = path === root ? resolve(root, "index.html") : path;
  if (!file.startsWith(root + sep) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".css": "text/css",
      ".html": "text/html",
      ".svg": "image/svg+xml",
    }[extname(file)] || "application/octet-stream",
  );
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
let browser;
const output = "test-results/event-creation";
mkdirSync(output, { recursive: true });
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
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
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(() => {
    location.hash = "#/admin/events";
  });
  await page.locator("#new-event").waitFor();
  const step = (index) => page.locator(`[data-editor-step="${index}"]`).click();
  const next = () => page.locator("#editor-next").click();
  const field = (name) => page.locator(`#event-builder-form [name="${name}"]`);
  const checkLayout = async (kind, index) => {
    for (const theme of ["club", "volt", "champions", "ultimate"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
          `${kind}, step ${index}, ${theme}, ${width}`,
        );
        assert.equal(
          await page.locator(".event-editor-step:visible").count(),
          1,
        );
        assert.equal(
          await page
            .locator('[data-editor-step][aria-current="step"]')
            .getAttribute("data-editor-step"),
          String(index),
        );
        assert.equal(await page.locator("#new-event").isVisible(), false);
        const matchesTheme = await page
          .locator('[aria-current="step"]')
          .evaluate((button) => {
            const reference = document.createElement("span");
            reference.style.backgroundColor = "var(--accent-tint)";
            button.append(reference);
            const matches =
              getComputedStyle(button).backgroundColor ===
              getComputedStyle(reference).backgroundColor;
            reference.remove();
            return matches;
          });
        assert.ok(matchesTheme, `Consistent selected color: ${kind}, ${theme}`);
        const checkboxIssues = await page
          .locator("#event-builder-form .check-label")
          .evaluateAll((labels) =>
            labels.flatMap((label) => {
              const input = label.querySelector('input[type="checkbox"]');
              const text = label.querySelector(".event-check-copy");
              if (!input || !text || !input.getClientRects().length) return [];
              const a = input.getBoundingClientRect(),
                b = text.getBoundingClientRect();
              return a.right > b.left ||
                Math.abs(a.y + a.height / 2 - b.y - b.height / 2) > 1
                ? [text.textContent]
                : [];
            }),
          );
        assert.deepEqual(
          checkboxIssues,
          [],
          "Checkbox and text share an aligned row",
        );
        const footer = await page
          .locator(".event-editor-navigation")
          .boundingBox();
        const note = await page.locator("#editor-step-note").boundingBox();
        assert.ok(
          Math.abs(note.x + note.width - footer.x - footer.width) <= 1,
          "Step note in the right corner",
        );
        if (index === 3 && kind === "event") {
          const countGroup = await field("winnerCount")
            .locator("xpath=ancestor::section[1]")
            .boundingBox();
          const prizes = await page.locator("#event-questions").boundingBox();
          const delivery = await field("needsConfirmation")
            .locator("xpath=ancestor::section[1]")
            .boundingBox();
          assert.ok(
            prizes.y - countGroup.y - countGroup.height >= 24,
            "Space before prize cards",
          );
          assert.ok(
            delivery.y - prizes.y - prizes.height >= 24,
            "Space before delivery settings",
          );
        }
        if (index === 0) {
          const rarityBox = await page
            .locator(".event-rarity-control")
            .boundingBox();
          const imageBox = await page
            .locator(".event-image-input")
            .boundingBox();
          assert.ok(
            imageBox.y >= rarityBox.y + rarityBox.height,
            "Image occupies the next row",
          );
          assert.ok(
            Math.abs(rarityBox.width - imageBox.width) <= 1,
            "Full-width presentation rows",
          );
          assert.equal(rarityBox.height, imageBox.height);
          const selectBox = await field("rarity").boundingBox();
          const previewBox = await page
            .locator("#event-rarity-preview")
            .boundingBox();
          assert.ok(
            Math.abs(selectBox.width - previewBox.width) <= 1,
            "Rarity uses equal halves",
          );
          assert.equal(selectBox.height, previewBox.height);
          assert.equal(selectBox.y, previewBox.y);
          const imageInput = await field("image").boundingBox();
          const pasteButton = await page
            .locator("#paste-event-image")
            .boundingBox();
          assert.equal(imageInput.y, pasteButton.y);
          assert.equal(imageInput.height, pasteButton.height);
        }
        if (theme === "club" && [320, 1440].includes(width))
          await page.locator("#event-editor").screenshot({
            path: `${output}/${kind}-${index}-${width}.png`,
            animations: "disabled",
            style: "#header,.bottom-nav{visibility:hidden!important}",
          });
      }
    }
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "club";
    });
  };

  for (const kind of ["event", "mission"]) {
    await page
      .locator(kind === "event" ? "#new-event" : "#new-mission")
      .click();
    assert.equal(await page.locator("[data-editor-step]").count(), 5);
    assert.equal(await page.locator("#event-editor details").count(), 0);
    await next();
    assert.equal(
      await page
        .locator('[aria-current="step"]')
        .getAttribute("data-editor-step"),
      "0",
    );
    assert.ok(await page.locator(".event-editor-error:visible").isVisible());
    await field("title").fill(`${kind} fluid creation`);
    assert.equal(await field("startsAt").isVisible(), false);
    await field("description").fill("Descrição preservada entre etapas.");
    await field("rarity").selectOption("ultimate");
    const initialRarity = await field("rarity").boundingBox();
    const initialPreview = await page
      .locator("#event-rarity-preview")
      .boundingBox();
    for (const rarity of [
      "bronze",
      "silver",
      "gold",
      "special-gold",
      "elite",
      "icon",
      "ultimate",
    ]) {
      await field("rarity").selectOption(rarity);
      const preview = await page
        .locator("#event-rarity-preview")
        .evaluate((element) => ({
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
          outline: getComputedStyle(element).outlineStyle,
        }));
      assert.equal(
        preview.width,
        initialPreview.width,
        `Stable preview width: ${rarity}`,
      );
      const select = await field("rarity").boundingBox();
      assert.equal(
        select.width,
        initialRarity.width,
        `Stable select width: ${rarity}`,
      );
      assert.equal(select.height, 46);
      assert.equal(preview.height, 46);
      assert.equal(preview.outline, "none");
    }
    await checkLayout(kind, 0);
    await next();
    if (kind === "event") {
      for (const method of ["admin", "objective", "vote"]) {
        await page.locator(`[data-selection-method="${method}"]`).click();
        assert.equal(await field("metric").isVisible(), method === "objective");
        assert.equal(
          await page.locator(".event-rating-config").isVisible(),
          false,
        );
        assert.equal(await field("winnerCount").isVisible(), false);
      }
      await field("votesPerUser").fill("2");
      await field("minVotes").fill("2");
    } else {
      assert.equal(
        await page.locator(".event-rating-config").isVisible(),
        false,
      );
      await page.locator('[data-objective-family="stars"]').click();
      assert.equal(
        await page.locator(".event-rating-config").isVisible(),
        true,
      );
      await page.locator('[data-rating-preset="ratingAverage"]').click();
      assert.equal(await field("scope").isDisabled(), true);
      await field("ratingThreshold").fill("4.2");
      await field("target").fill("4");
      await page.locator('[data-objective-family="results"]').click();
      await field("scope").selectOption("group");
      await page.locator('[data-objective-family="stars"]').click();
      assert.equal(await field("metric").inputValue(), "ratingAverage");
      assert.equal(await field("ratingThreshold").inputValue(), "4.2");
      assert.equal(await field("scope").inputValue(), "individual");
      await page.locator('[name="ratingAttribute"][value="overall"]').uncheck();
      await next();
      assert.equal(
        await page
          .locator('[aria-current="step"]')
          .getAttribute("data-editor-step"),
        "1",
      );
      await page.locator('[name="ratingAttribute"][value="overall"]').check();
      assert.equal(await field("unlockMode").isVisible(), false);
    }
    await checkLayout(kind, 1);
    await next();
    await field("startsAt").fill("2026-10-16T14:00");
    await field("endsAt").fill("2026-10-16T13:00");
    await next();
    assert.equal(
      await page
        .locator('[aria-current="step"]')
        .getAttribute("data-editor-step"),
      "2",
    );
    await field("endsAt").fill("2026-10-23T14:00");
    await field("audience").selectOption("selected");
    await field("memberIds").selectOption(["pedro"]);
    if (kind === "mission") {
      await field("indefinite").check();
      await field("cadence").selectOption("weekly");
      await field("maxRepeats").fill("3");
    }
    await checkLayout(kind, 2);
    await next();
    await next();
    assert.equal(
      await page
        .locator('[aria-current="step"]')
        .getAttribute("data-editor-step"),
      "3",
    );
    await page.locator('[data-reward-mode="both"]').first().click();
    await field("specialId").selectOption("mvp");
    await field("boost-vision").fill("2");
    await page.locator('[data-reward-mode="card"]').first().click();
    await page.locator('[data-reward-mode="both"]').first().click();
    assert.equal(await field("boost-vision").inputValue(), "2");
    assert.equal(await field("specialId").inputValue(), "mvp");
    if (kind === "event") {
      await field("winnerCount").fill("2");
      await field("winnerCount").dispatchEvent("change");
      await page
        .locator(".event-question")
        .nth(1)
        .locator('[data-reward-mode="card"]')
        .click();
      await page
        .locator(".event-question")
        .nth(1)
        .locator('[name="specialId"]')
        .selectOption("sniper");
    }
    await checkLayout(kind, 3);
    await next();
    assert.equal(await page.locator(".event-review-card").count(), 4);
    const ruleList = page
      .locator(".event-review-card")
      .nth(1)
      .locator(".event-rule-list");
    assert.ok(
      (await ruleList.locator("li").count()) >= (kind === "mission" ? 6 : 3),
    );
    assert.equal(
      await ruleList.locator("li > .ui-icon").count(),
      await ruleList.locator("li").count(),
    );
    await page.locator("#event-preview").click();
    await page.getByRole("dialog").waitFor();
    assert.ok(
      (await page.locator(".event-preview .event-rule-list > li").count()) > 0,
    );
    await page.keyboard.press("Escape");
    assert.match(
      await page.locator("#event-review").innerText(),
      /fluid creation/,
    );
    assert.match(
      await page.locator("#event-review").innerText(),
      /1 participantes/,
    );
    await checkLayout(kind, 4);
    // Final validation must also catch invalid controls in earlier, hidden steps.
    if (kind === "event") {
      await step(2);
      await field("startsAt").fill("");
      await step(4);
      await page.locator('[name="submitAction"][value="draft"]').click();
      assert.equal(
        await page
          .locator('[aria-current="step"]')
          .getAttribute("data-editor-step"),
        "2",
      );
      await field("startsAt").fill("2026-10-16T14:00");
      await step(4);
    }
    await page.locator('[data-review-step="0"]').click();
    assert.equal(await field("title").inputValue(), `${kind} fluid creation`);
    await field("title").fill(`${kind} reviewed title`);
    await step(4);
    assert.match(
      await page.locator("#event-review").innerText(),
      /reviewed title/,
    );
    await page
      .locator(
        `[name="submitAction"][value="${kind === "event" ? "draft" : "open"}"]`,
      )
      .click();
    await page.locator("#new-event").waitFor();
    const saved = await page.evaluate(
      (title) =>
        window.__testState.events.find((event) => event.title === title),
      `${kind} reviewed title`,
    );
    assert.ok(saved);
    assert.equal(saved.status, kind === "event" ? "draft" : "open");
    assert.deepEqual(saved.audience.memberIds, ["pedro"]);
    if (kind === "mission") {
      assert.equal(saved.objective.metric, "ratingAverage");
      assert.equal(saved.objective.threshold, 4.2);
      assert.equal(saved.objective.target, 4);
      assert.equal(saved.maxRepeats, 3);
    } else assert.equal(saved.winnerCount, 2);
  }
  // Editing an active mission retains its status and the selected star objective.
  const missionId = await page.evaluate(
    () =>
      window.__testState.events.find(
        (event) => event.title === "mission reviewed title",
      ).id,
  );
  await page.locator(`[data-edit="${missionId}"]`).click();
  await step(1);
  assert.equal(await field("metric").inputValue(), "ratingAverage");
  await field("target").fill("5");
  await step(4);
  assert.equal(
    await page.locator('[name="submitAction"][value="open"]').isVisible(),
    false,
  );
  await page.locator('[name="submitAction"][value="draft"]').click();
  await page.locator("#new-event").waitFor();
  const edited = await page.evaluate(
    (id) => window.__testState.events.find((event) => event.id === id),
    missionId,
  );
  assert.equal(edited.status, "open");
  assert.equal(edited.objective.target, 5);
  assert.deepEqual(errors, []);
  console.log(
    "Event and mission creation: decisions, validation, review, saving, four themes and 320–1440px passed.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
