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
  ...(!isWebKit && process.platform === "win32" ? { ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {channel:"msedge"}) } : {}),
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
  const modal = page.locator('.rating-method-dialog');
  assert.equal(await modal.isVisible(), true);
  assert.equal(await modal.locator('.rating-method-confirm').isDisabled(), true);
  await page.keyboard.press('Escape');
  assert.equal(await modal.isVisible(), true);
  const chooseMethod = async id => {
    await page.locator('[data-method="' + id + '"]').click();
    await page.getByRole('button', {name:'Escolho Este',exact:true}).click();
  };
  for (const width of [1440,390,320]) {
    await page.setViewportSize({width,height:900});
    for (const id of ['stars','half','values','words']) {
      await modal.locator('[data-method="'+id+'"]').click();
      assert.equal(await modal.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    }
  }
  await modal.locator('[data-method="half"]').click();
  await modal.locator('[data-value="0.5"] input').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await modal.locator('[data-rating]').inputValue(),'1');
  await page.keyboard.press('Enter');
  assert.equal(await modal.isVisible(),true);
  await chooseMethod('half');
  const form = page.locator('.feedback-review[open] .feedback-form');
  const field = form.locator('[data-dimension="overall"]');
  await field.locator('[data-value="2.5"]').click();
  assert.equal(await field.locator('[data-rating]').inputValue(),'2.5');
  const target = await form.getAttribute('data-target');
  await page.waitForFunction(target=>window.__testState.feedback.some(f=>f.gameId==='demo-game-0' && f.targetId===target && f.ratings.overall===2.5),target);
  for (const id of ['values','words','stars','half']) {
    await page.locator('[data-change-rating-method]').click();
    await chooseMethod(id);
    assert.equal(await field.locator('[data-rating]').inputValue(),'2.5');
    assert.ok(!(await field.locator('.feedback-rating-result').innerText()).includes('undefined'));
  }
  await page.locator('[data-change-rating-method]').click();
  await chooseMethod('values');
  const track=field.locator('.rating-wheel-track');
  await track.dispatchEvent('pointerdown');
  await track.evaluate(el=>el.scrollLeft=el.children[0].getBoundingClientRect().width*7);
  await page.waitForFunction(()=>document.querySelector('.feedback-review[open] [data-dimension="overall"] [data-rating]').value==='3.5');
  await form.locator('[data-dimension="goalkeeping"] [data-value="na"]').click();
  assert.equal(await form.locator('[data-dimension="goalkeeping"] [data-rating]').inputValue(),'na');
  await page.evaluate(()=>location.hash='#/games');
  await page.locator('.game-list').waitFor();
  await openFeedback();
  assert.equal(await page.locator('.rating-method-dialog').count(),0);
  assert.equal(await page.locator('.feedback-form').first().getAttribute('data-method'),'values');
  assert.deepEqual(errors,[]);
  console.log('Rating methods: mandatory choice, previews, mobile layouts, halves, decimal autosave, method switching, wheel gesture, N/A and profile persistence passed.');
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
