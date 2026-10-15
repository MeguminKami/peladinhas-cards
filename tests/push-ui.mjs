import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
        body: '<!doctype html><div id="main"></div><div id="toast-region"></div><div id="modal-root"></div>',
      });
    if (path === "/js/db.js")
      return route.fulfill({
        contentType: "text/javascript",
        body: `
      export const watchNotifications=(uid,callback)=>{window.__watch=callback;return ()=>{window.__stops++;};};
      export const callAdmin=async(name,data)=>{window.__calls.push({name,...data});if(window.__fail)throw Error('Backend indisponível');return {data:{deviceId:'a'.repeat(64)}};};
    `,
      });
    if (/^\/js\/[\w-]+\.js$/.test(path))
      return route.fulfill({
        contentType: "text/javascript",
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
  assert.equal(await page.evaluate(() => window.__permissionCalls.length), 0);
  await page.locator("[data-push-enable]").click();
  await page.locator("[data-push-test]").waitFor();
  assert.deepEqual(await page.evaluate(() => window.__permissionCalls), [true]);
  assert.deepEqual(await page.evaluate(() => window.__subscribeOptions), {
    userVisibleOnly: true,
    keyLength: 65,
  });
  assert.equal(await page.evaluate(() => window.__calls[0].action), "register");
  assert.equal(
    await page.evaluate(() =>
      window.__worker.some((m) => m.type === "PUSH_OWNER" && m.uid === "one"),
    ),
    true,
  );
  await page.locator("[data-push-test]").click();
  assert.equal(await page.evaluate(() => window.__calls.at(-1).action), "test");
  await page.evaluate(() =>
    window.__watch([
      { id: "read", read: true },
      { id: "new", read: false },
    ]),
  );
  await page.waitForFunction(() =>
    window.__worker.some((m) => m.type === "PUSH_CLEAR_READ" && m.count === 1),
  );
  assert.deepEqual(
    await page.evaluate(
      () => window.__worker.findLast((m) => m.type === "PUSH_CLEAR_READ").ids,
    ),
    ["read"],
  );
  await page.locator("[data-push-disable]").click();
  await page.locator("[data-push-enable]").waitFor();
  assert.equal(await page.evaluate(() => window.__unsubscribes), 1);
  assert.equal(
    await page.evaluate(() => window.__calls.at(-1).action),
    "unregister",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("peladinhas-push:/")),
    null,
  );
  await page.evaluate(() => {
    window.__fail = true;
  });
  await page.locator("[data-push-enable]").click();
  await page.waitForFunction(() => window.__unsubscribes === 2);
  assert.equal(await page.locator("[data-push-test]").count(), 0);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("peladinhas-push:/")),
    null,
  );
  await page.evaluate(() => {
    window.__fail = false;
    window.__grant = "denied";
    Notification.permission = "default";
  });
  await page.locator("[data-push-enable]").click();
  await page
    .getByText(
      "As notificações estão bloqueadas. Consulta como permitir neste dispositivo.",
    )
    .waitFor();
  assert.equal(await page.evaluate(() => window.__subscriptions), 2);
  await page.locator("[data-push-enable]").click();
  await page.getByRole("dialog").waitFor();
  assert.equal(await page.evaluate(() => window.__permissionCalls.length), 3);
  await page.keyboard.press("Escape");
  await page.evaluate(async () => {
    Notification.permission = "granted";
    window.__grant = "granted";
    window.__push.bindPushSettings();
  });
  await page.locator("[data-push-enable]").click();
  await page.locator("[data-push-test]").waitFor();
  await page.evaluate(() => window.__push.syncPushIdentity("two"));
  await page.locator("[data-push-enable]").waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("peladinhas-push:/")),
    null,
  );
  assert.equal(await page.evaluate(() => window.__stops), 1);
  // Chrome may return default first, then grant permission later through Site Controls.
  const callsBeforeQuiet = await page.evaluate(() => window.__calls.length);
  await page.evaluate(() => {
    Notification.permission = "default";
    window.__grant = "default";
  });
  await page.locator("[data-push-enable]").click();
  await page
    .getByText(
      "O pedido não foi confirmado. Podes permitir as notificações nas definições do site ou tentar novamente.",
    )
    .waitFor();
  assert.equal(
    await page.evaluate(() => window.__calls.length),
    callsBeforeQuiet,
  );
  const permissionRequests = await page.evaluate(
    () => window.__permissionCalls.length,
  );
  await page.evaluate(() => window.__setPermission("granted"));
  await page.locator("[data-push-test]").waitFor();
  assert.equal(
    await page.evaluate(() => window.__permissionCalls.length),
    permissionRequests,
  );
  // A stale enabled panel must not dispatch a test after the permission is revoked.
  const callsBeforeRevocation = await page.evaluate(
    () => window.__calls.length,
  );
  await page.evaluate(() => {
    Notification.permission = "denied";
  });
  await page.locator("[data-push-test]").click();
  await page.locator("[data-push-enable]").waitFor();
  assert.equal(
    await page.evaluate(() => window.__calls.length),
    callsBeforeRevocation,
  );
  // Installed home has a visible opt-in and hides it only after complete activation.
  await page.evaluate(async () => {
    Notification.permission = "granted";
    window.__grant = "granted";
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    });
    document
      .querySelector("#main")
      .insertAdjacentHTML("beforeend", window.__push.homePushInvitation());
    window.__push.bindPushSettings();
  });
  assert.equal(await page.locator(".push-invitation").isVisible(), true);
  await page.locator(".push-invitation [data-push-enable]").click();
  await page.locator("[data-push-test]").waitFor();
  assert.equal(await page.locator(".push-invitation").isHidden(), true);
  await page.evaluate(() => window.__push.detachPushForLogout());
  assert.equal(await page.locator(".push-invitation").isVisible(), true);
  await page.evaluate(() => {
    document.querySelector(".push-invitation").remove();
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: false,
    });
  });
  await page.evaluate(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    delete window.Notification;
    delete window.PushManager;
    window.addEventListener(
      "peladinhas-install",
      () => {
        window.__installRequested = true;
      },
      { once: true },
    );
    window.__push.bindPushSettings();
  });
  assert.equal(await page.locator("[data-push-enable]").isEnabled(), true);
  assert.equal(
    await page.locator("[data-push-enable]").textContent(),
    "Instalar a APP",
  );
  await page.locator("[data-push-enable]").click();
  assert.equal(await page.evaluate(() => window.__installRequested), true);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
    window.__push.bindPushSettings();
  });
  assert.equal(await page.locator("[data-push-enable]").isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log(
    "Push UI: permission gesture, activation, test, read sync, disable, denied/revoked permission, delayed Chrome permission, installed home invitation, account transfer and iOS guidance passed.",
  );
} finally {
  await browser.close();
}
