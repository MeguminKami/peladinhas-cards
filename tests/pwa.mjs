import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";
import { PLAYSTYLE_ICONS } from "../js/assets.js";
const root = resolve(process.argv.includes('--react') ? '.firebase/react-test' : '.firebase/site');
let revision = 0;
const server = createServer((req, res) => {
  const requestPath = new URL(req.url, "http://localhost").pathname;
  let path = requestPath.replace(/^\/demos\/peladinha-cards\//, "/");
  if (path.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");
    res.end('{"private":true}');
    return;
  }
  const file = resolve(root, path.replace(/^\//, "") || "index.html");
  if (!file.startsWith(root + sep) || !existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".html": "text/html",
      ".css": "text/css",
      ".png": "image/png",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".ttf": "font/ttf",
      ".webmanifest": "application/manifest+json",
    }[extname(file)] || "text/plain",
  );
  let content = readFileSync(file);
  if (path === "/sw.js" && revision)
    content = content
      .toString()
      .replace(
        /const VERSION = ["'][^"']+["'];/,
        `const VERSION = 'test-update-${revision}';`,
      );
  if (path === "/js/firebase.js") content = "export const configured=true;";
  if (path === "/js/auth.js")
    content = readFileSync("tests/fixtures/auth.js", "utf8");
  if (path === "/js/db.js")
    content = readFileSync("tests/fixtures/db.js", "utf8").replace(
      '"../../js/utils.js"',
      '"./utils.js"',
    );
  res.end(content);
});
await new Promise((r) => server.listen(5191, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
mkdirSync("test-results/pwa", { recursive: true });
try {
  for (const prefix of ["", "/demos/peladinha-cards"]) {
    revision = 0;
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:5191${prefix}/`);
    await page.locator(".dashboard-greeting").waitFor();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(()=>document.querySelector('#main').lastElementChild?.classList.contains('install-spotlight'));
    assert.equal(
      await page.evaluate(() =>
        document
          .querySelector("#main")
          .lastElementChild?.classList.contains("install-spotlight"),
      ),
      true,
      "Desktop: install promotion belongs at the end of home",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(()=>document.querySelector('.dashboard-greeting').nextElementSibling?.classList.contains('install-spotlight'));
    assert.equal(
      await page.evaluate(() =>
        document
          .querySelector(".dashboard-greeting")
          .nextElementSibling?.classList.contains("install-spotlight"),
      ),
      true,
      "Mobile: install promotion belongs after the greeting",
    );
    assert.equal(
      await page.locator(".install-spotlight").count(),
      1,
      "Resizing must move the same banner without duplicating it",
    );
    await page.locator('[data-install-platform="ios"]').click();
    await page
      .getByText("Abre este site no Safari.", { exact: true })
      .waitFor();
    await page.screenshot({
      path: `test-results/pwa/home-install-ios${prefix ? "-nested" : ""}.png`,
    });
    await page.keyboard.press("Escape");
    await page.locator('[data-install-platform="android"]').click();
    await page
      .getByText("Abre este site no Chrome.", { exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: `test-results/pwa/home-install${prefix ? "-nested" : ""}.png`,
    });
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise((r) =>
          navigator.serviceWorker.addEventListener("controllerchange", r, {
            once: true,
          }),
        );
    });
    const manifest = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      const url = new URL(link.href);
      const data = await fetch(url).then((r) => r.json());
      return { data, url: url.href };
    });
    assert.equal(manifest.data.display, "standalone");
    assert.equal(
      new URL(manifest.data.scope, manifest.url).pathname,
      prefix + "/",
    );
    assert.equal(
      new URL(manifest.data.start_url, manifest.url).pathname,
      prefix + "/",
    );
    for (const item of manifest.data.icons) {
      const dimensions = await page.evaluate(async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        return `${image.naturalWidth}x${image.naturalHeight}`;
      }, new URL(item.src, manifest.url).href);
      assert.equal(dimensions, item.sizes);
    }
    const playstyles = await page.evaluate(async (PLAYSTYLE_ICONS) => {
      return Promise.all(
        Object.values(PLAYSTYLE_ICONS).map(async (src) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          return {
            width: image.naturalWidth,
            height: image.naturalHeight,
            bytes: (await fetch(src).then((r) => r.arrayBuffer())).byteLength,
          };
        }),
      );
    }, PLAYSTYLE_ICONS);
    assert.equal(playstyles.length, 8);
    assert.ok(
      playstyles.every(
        (icon) => icon.width <= 256 && icon.height <= 256 && icon.bytes < 25000,
      ),
      "Optimized playstyles load with bounded dimensions and transfer size",
    );
    const cdp = await context.newCDPSession(page);
    const appManifest = await cdp.send("Page.getAppManifest");
    assert.deepEqual(appManifest.errors, []);
    const eligibility = await cdp.send("Page.getInstallabilityErrors");
    // Playwright's isolated contexts are incognito. Validate site requirements
    // here, then repeat the complete eligibility check in a normal profile below.
    assert.deepEqual(
      eligibility.installabilityErrors.filter(
        (error) => error.errorId !== "in-incognito",
      ),
      [],
      "Browser installation requirements",
    );
    await page.locator("#mobile-more").click();
    await page.locator("#menu-install").click();
    await page
      .getByRole("heading", { name: "A tua liga, sempre contigo" })
      .waitFor();
    await page.screenshot({
      path: `test-results/pwa/install${prefix ? "nested" : ""}.png`,
    });
    await page.keyboard.press("Escape");
    await page.evaluate(async () => {
      await caches.open("another-app");
      await fetch("./api/private");
    });
    const cachedURLs = await page.evaluate(async () => {
      const keys = await caches.keys();
      return (
        await Promise.all(
          keys
            .filter((k) => k.startsWith("peladinhas:"))
            .map(async (k) =>
              (await (await caches.open(k)).keys()).map((r) => r.url),
            ),
        )
      ).flat();
    });
    for (const resource of ['index.html','manifest.webmanifest','offline.html','css/styles.css','js/push-worker.js','assets/pwa/icon-512.png']) {
      assert.ok(cachedURLs.some(url => new URL(url).pathname === `${prefix}/${resource}`), `Precache includes ${resource}`);
    }
    assert.ok(
      !cachedURLs.some(
        (url) =>
          url.includes("/api/") ||
          url.includes("googleapis") ||
          url.includes("gstatic"),
      ),
    );
    await context.setOffline(true);
    await page.locator("#connection-status").waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "A liga espera por ti." })
      .waitFor();
    await page.locator("#offline-retry").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#offline-status")
        ?.textContent.startsWith("Ainda estás sem ligação"),
    );
    await page.screenshot({
      path: `test-results/pwa/offline${prefix ? "nested" : ""}.png`,
    });
    await context.setOffline(false);
    await page.locator("#offline-retry").click();
    try {
      await page.locator(".dashboard-greeting").waitFor();
    } catch (error) {
      console.log(
        "Recovery diagnostic",
        await page.evaluate(() => ({
          url: location.href,
          text: document.body.innerText,
        })),
        errors,
      );
      throw error;
    }
    revision++;
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
    });
    await page.locator("#app-update").waitFor();
    await page.locator("#app-update [data-later]").click();
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange")),
    );
    await page.locator("#app-update").waitFor();
    await page.locator("#app-update [data-update]").click();
    await page.waitForFunction(
      () =>
        !document.querySelector("#app-update") &&
        document.querySelector(".dashboard-greeting"),
    );
    const keys = await page.evaluate(() => caches.keys());
    assert.ok(keys.includes("another-app"));
    assert.ok(keys.includes(`peladinhas:${prefix}/:test-update-${revision}`));
    assert.equal(
      keys.filter((k) => k.startsWith(`peladinhas:${prefix}/:`)).length,
      1,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PWA: manifest, icons, scope, offline, private cache exclusion and update passed",
      prefix || "/",
    );
    await context.close();
  }
  revision = 0;
  const normal = await chromium.launchPersistentContext(
    resolve(`test-results/pwa/profile-${Date.now()}`),
    {
      headless: true,
      ...(process.platform === "win32" ? { channel: "msedge" } : {}),
    },
  );
  try {
    const normalPage = await normal.newPage();
    await normalPage.goto("http://127.0.0.1:5191/");
    await normalPage.locator(".dashboard-greeting").waitFor();
    await normalPage.evaluate(() => navigator.serviceWorker.ready);
    const normalCDP = await normal.newCDPSession(normalPage);
    const eligible = await normalCDP.send("Page.getInstallabilityErrors");
    assert.deepEqual(
      eligible.installabilityErrors,
      [],
      "Normal browser installation eligibility",
    );
    console.log("PWA: normal browser reports no installation errors");
  } finally {
    await normal.close();
  }
  // Platform help is tested independently of the native OS installation UI.
  const android = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36",
  });
  await android.addInitScript(() =>
    Object.defineProperty(navigator, "standalone", { value: true }),
  );
  const androidPage = await android.newPage();
  const androidErrors = [];
  androidPage.on("pageerror", (error) => androidErrors.push(error.message));
  await androidPage.goto("http://127.0.0.1:5191/");
  await androidPage.locator(".push-invitation [data-push-enable]").waitFor();
  assert.equal(
    await androidPage.locator(".install-spotlight").count(),
    0,
    "Installed app shows notification opt-in instead of install promotion",
  );
  for (const width of [390, 360, 320]) {
    await androidPage.setViewportSize({ width, height: 844 });
    assert.equal(
      await androidPage.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "Installed Android opt-in must not overflow",
    );
    await androidPage.screenshot({
      path: `test-results/pwa/android-push-activation-${width}.png`,
    });
  }
  assert.deepEqual(androidErrors, []);
  await android.close();
  const ios = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",
    serviceWorkers: "block",
  });
  const page = await ios.newPage();
  await page.goto("http://127.0.0.1:5191/");
  await page.locator("#mobile-more").click();
  await page.locator("#menu-install").click();
  await page.getByText("Abre este site no Safari.", { exact: true }).waitFor();
  await page.screenshot({ path: "test-results/pwa/install-ios.png" });
  await ios.close();
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
