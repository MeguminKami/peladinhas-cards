import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://localhost:5196/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/")
      return route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/styles.css"><link rel="stylesheet" href="/css/responsive.css"><link rel="stylesheet" href="/css/experience.css"><main id="main"></main><div id="toast-region"></div><div id="modal-root"></div>',
      });
    if (path === "/js/db.js")
      return route.fulfill({
        contentType: "text/javascript",
        body: `
      export const watchNotifications=(uid,callback)=>{window.__watch=callback;return ()=>{window.__stops++;};};
      export const notifications=async()=>window.__notices||[];
      export const markRead=async(uid,items)=>{if(window.__readFail)throw Error('Offline'); window.__readCalls.push({uid,ids:items.map(i=>i.id)});};
      export const callAdmin=async(name,data)=>{window.__calls.push({name,...data});if(window.__fail)throw Error('Backend indisponível');return {data:{deviceId:'a'.repeat(64)}};};
    `,
      });
    if (/^\/(js|css)\/[\w-]+\.(js|css)$/.test(path))
      return route.fulfill({
        contentType: path.endsWith(".css") ? "text/css" : "text/javascript",
        body: readFileSync("." + path, "utf8"),
      });
    return route.fulfill({ status: 404 });
  });
  await page.goto("http://localhost:5196/");
  await page.evaluate(async () => {
    window.__calls = [];
    window.__worker = [];
    window.__stops = 0;
    window.__permissionCalls = [];
    window.__subscriptions = 0;
    window.__unsubscribes = 0;
    const permissionStatus = {
      state: "prompt",
      addEventListener: (type, handler) => {
        if (type === "change") window.__permissionChange = handler;
      },
    };
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query: async () => permissionStatus },
    });
    window.__setPermission = async (state) => {
      permissionStatus.state = state;
      Notification.permission = state === "prompt" ? "default" : state;
      await window.__permissionChange?.();
    };
    const notification = {
      permission: "default",
      requestPermission: () => {
        window.__permissionCalls.push(navigator.userActivation.isActive);
        notification.permission = window.__grant || "granted";
        return Promise.resolve(notification.permission);
      },
    };
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: notification,
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: class {},
    });
    let subscription = null;
    const registration = {
      pushManager: {
        getSubscription: async () => subscription,
        subscribe: async (options) => {
          window.__subscriptions++;
          window.__subscribeOptions = {
            userVisibleOnly: options.userVisibleOnly,
            keyLength: options.applicationServerKey.length,
          };
          subscription = {
            options: {
              applicationServerKey: options.applicationServerKey.buffer,
            },
            toJSON: () => ({
              endpoint: "https://fcm.googleapis.com/fake",
              keys: {},
            }),
            unsubscribe: async () => {
              window.__unsubscribes++;
              subscription = null;
              return true;
            },
          };
          return subscription;
        },
      },
      active: {
        postMessage: (data, ports) => {
          window.__worker.push(data);
          ports[0].postMessage({ ok: true });
        },
      },
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        getRegistration: async () => registration,
        addEventListener: () => {},
      },
    });
    window.__push = await import("/js/push.js");
    await window.__push.syncPushIdentity("one", (items) => {
      window.__snapshot = items;
    });
    document.querySelector("#main").innerHTML =
      window.__push.pushSettingsPanel();
    window.__push.bindPushSettings();
  });

  await page.evaluate(() => {
    document.querySelector("#main").innerHTML =
      '<div class="dashboard-greeting">A tua liga</div>' +
      window.__push.homePushInvitation();
    window.__push.bindPushSettings();
  });
  const dialog = page.locator(".push-campaign");
  await dialog.waitFor();
  assert.equal(await page.evaluate(() => window.__permissionCalls.length), 0);
  mkdirSync("test-results/push-home-prompt", { recursive: true });
  for (const width of [390, 320, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await dialog.screenshot({
      path: "test-results/push-home-prompt/prompt-" + width + ".png",
    });
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("Tab");
  assert.ok(await dialog.evaluate((el) => el.contains(document.activeElement)));
  await page.locator("[data-push-later]").click();
  assert.equal(await dialog.count(), 0);
  await page.evaluate(() => window.__push.bindPushSettings());
  assert.equal(await dialog.count(), 0);
  await page.evaluate(async () => {
    await window.__push.syncPushIdentity("prompt-two", () => {});
    document.querySelector("#main").innerHTML =
      '<div class="dashboard-greeting">A tua liga</div>' +
      window.__push.homePushInvitation();
    window.__push.bindPushSettings();
  });
  await dialog.waitFor();
  await dialog.locator("[data-push-enable]").click();
  await page.waitForFunction(() => !document.querySelector(".push-campaign"));
  assert.equal(
    await page.evaluate(() => window.__permissionCalls.at(-1)),
    true,
  );
  assert.ok(
    await page.evaluate(() =>
      window.__calls.some((call) => call.action === "register"),
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "Mobile push campaign: no permission before click, four layouts, keyboard, reduced motion, dismissal, account separation and actual activation passed.",
  );
} finally {
  await browser.close();
}
