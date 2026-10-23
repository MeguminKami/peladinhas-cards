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
const output = `test-results/podium-fit${isWebKit ? "-webkit" : ""}`;
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
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}`;
  await context.clock.install({ time: new Date("2026-10-23T12:00:00Z") });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.locator(".dashboard-greeting").waitFor();
  await page.evaluate(seedDocumentation);
  await page.evaluate(() => (location.hash = "#/"));
  await page.locator("#home-podium .football-card").first().waitFor();
  await page.evaluate(async () => {
    const { mountHomePodium } = await import("/js/home-podium.js");
    const { ATTRIBUTES } = await import("/js/utils.js");
    mountHomePodium(
      document.querySelector("#home-podium"),
      ["Telmo Silva", "Vitor Rocha", "Jonas"].map((displayName, i) => ({
        uid: "podium" + i,
        displayName,
        hasCard: true,
        ovr: 88 - i * 3,
        ovrDelta: 3 - i,
        aggregates:[{date:"2026-10-21T20:00:00Z",count:3,overall:4.5-i*.1,attack:4.5-i*.1}],
        stats: Object.fromEntries(ATTRIBUTES.map(([k]) => [k, 85])),
        cardType: "gold-rare",
      })),
    );
  });
  assert.equal(await page.locator("#home-podium .football-card").count(), 3);
  await page.locator('[data-podium-mode="performance"]').click();
  assert.equal(await page.locator("#home-podium .football-card").count(),3,"post-closing games already contribute before card opening");
  await page.locator('[data-podium-mode="ovr"]').click();
  for (const [width, height] of [
    [1440, 900],
    [1366, 768],
    [1536, 864],
    [1280, 720],
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    const bounds = await page.locator(".weekly-section").boundingBox();
    assert.equal(await page.locator(".podium-pause").count(), 0);
    if (width > 800) {
      const tops = await Promise.all([1, 2, 3].map(async place =>
        (await page.locator(`.place-${place} .podium-pedestal`).boundingBox()).y));
      assert.ok(tops[1] - tops[0] >= 24 && tops[2] - tops[1] >= 24, JSON.stringify(tops));
    }
    if (width > 800)
      assert.ok(
        bounds.y + bounds.height <= height + 1,
        JSON.stringify({ width, height, bounds }),
      );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: output + "/podium-" + width + ".png" });
  }
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.locator('[data-podium-mode="performance"]').click();
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.locator("#home-podium .football-card").count(),3);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:output+`/performance-${width}.png`});
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
