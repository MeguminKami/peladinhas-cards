import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium, webkit } from "playwright";
const source = readFileSync("js/push-worker.js", "utf8");
const engine = process.argv.includes("--webkit") ? webkit : chromium;
const browser = await engine.launch({
  headless: true,
  ...(engine === chromium && process.platform === "win32"
    ? { channel: "msedge" }
    : {}),
});
try {
  const page = await browser.newPage();
  await page.route("http://localhost:5195/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Push worker contract</title>",
    }),
  );
  await page.goto("http://localhost:5195/");
  const checks = await page.evaluate(async (source) => {
    const assert = (condition, message) => {
      if (!condition) throw Error(message);
    };
    const checks = [],
      notifications = [],
      requests = [],
      messages = [],
      opened = [],
      badges = [];
    let online = true,
      result = { read: true },
      handlers;
    const scope = "http://localhost:5195/demos/peladinha-cards/";
    const client = {
      url: scope + "#/notifications",
      focused: true,
      postMessage: (value) => messages.push(value),
      focus: async () => client,
      navigate: async (url) => {
        client.url = url;
        return client;
      },
    };
    const foreign = {
      url: "http://localhost:5195/another-app/",
      postMessage: () => {
        throw Error("cross-scope message");
      },
    };
    const mock = {
      location: { href: scope + "sw.js" },
      navigator: {
        setAppBadge: async (n) => badges.push(n),
        clearAppBadge: async () => badges.push(0),
      },
      registration: {
        getNotifications: async () => notifications.filter((n) => !n.closed),
        sync: { register: async () => {} },
        showNotification: async (title, options) => {
          notifications
            .filter((n) => n.tag === options.tag && !n.closed)
            .forEach((n) => n.close());
          const n = {
            title,
            ...options,
            closed: false,
            close() {
              this.closed = true;
            },
          };
          notifications.push(n);
        },
      },
      clients: {
        matchAll: async () => [foreign, client],
        openWindow: async (url) => opened.push(url),
      },
      addEventListener: (name, handler) => handlers.set(name, handler),
    };
    const fetchMock = async (url, options) => {
      requests.push({ url, ...JSON.parse(options.body) });
      if (!online) throw Error("offline");
      return { ok: true, status: 200, json: async () => ({ result }) };
    };
    const start = () => {
      handlers = new Map();
      new Function("self", "fetch", source)(mock, fetchMock);
    };
    start();
    const dispatch = async (type, options = {}) => {
      let work;
      handlers.get(type)({
        ...options,
        waitUntil: (promise) => {
          work = promise;
        },
      });
      await work;
    };
    const message = (data) =>
      dispatch("message", {
        data,
        source: { url: scope },
        ports: [{ postMessage: () => {} }],
      });
    const payload = (id, extras = {}) => ({
      version: 1,
      type: "league-notification",
      uid: "one",
      notificationId: id,
      title: "Novo jogo",
      body: "A tua liga",
      href: "#/games",
      receiptId: id.padEnd(64, "a").slice(0, 64),
      receiptToken: "T".repeat(43),
      ackURL:
        "https://europe-west1-pedalinhas-cards.cloudfunctions.net/ackPushNotification",
      ...extras,
    });
    const push = (data) => dispatch("push", { data: { json: () => data } });
    const current = (id) =>
      notifications.findLast((n) => n.data.notificationId === id && !n.closed);
    await message({ type: "PUSH_OWNER", uid: "one", deviceId: "device" });
    await push(payload("b"));
    await push(payload("b"));
    assert(
      notifications.filter((n) => !n.closed).length === 1,
      "duplicate alert",
    );
    assert(
      current("b").icon === scope + "assets/pwa/icon-192.png",
      "wrong nested icon scope",
    );
    assert(
      current("b").badge.endsWith("notification-badge.png"),
      "missing native monochrome badge",
    );
    checks.push("one native alert per notification, scoped icons and badge");
    online = false;
    let clickWork;
    const alert = current("b");
    handlers.get("notificationclick")({
      notification: alert,
      action: "",
      waitUntil: (promise) => {
        clickWork = promise;
      },
    });
    assert(alert.closed, "tap must close synchronously before network");
    await clickWork;
    assert(client.url === scope + "#/games", "tap did not open intended route");
    assert(
      messages.some(
        (m) => m.type === "PUSH_NOTIFICATION_OPEN" && m.notificationId === "b",
      ),
      "missing optimistic UI read",
    );
    assert(
      !messages.some((m) => m.type === "PUSH_READ_SYNCED"),
      "offline receipt falsely synced",
    );
    checks.push("offline tap closes immediately and opens the correct app");
    start();
    online = true;
    await message({ type: "PUSH_FLUSH_READS" });
    const count = requests.length;
    await message({ type: "PUSH_FLUSH_READS" });
    assert(requests.length === count, "successful receipt replayed");
    assert(
      messages.some(
        (m) => m.type === "PUSH_READ_SYNCED" && m.notificationId === "b",
      ),
      "persistent offline receipt lost after worker restart",
    );
    assert(
      requests.at(-1).data.receiptToken === "T".repeat(43),
      "receipt capability changed",
    );
    checks.push("read queue survives worker restart and flushes once");
    await push(payload("c"));
    const previousURL = client.url;
    await dispatch("notificationclick", {
      notification: current("c"),
      action: "read",
    });
    assert(!current("c"), "read action kept alert");
    assert(client.url === previousURL, "read-only action navigated");
    checks.push("native mark-as-read action closes without opening");
    await push(payload("d"));
    online = false;
    await message({
      type: "PUSH_CLEAR_READ",
      uid: "one",
      ids: ["d"],
      count: 0,
    });
    assert(!current("d"), "in-app read kept native alert");
    assert(badges.at(-1) === 0, "read-all badge not cleared");
    online = true;
    await message({ type: "PUSH_FLUSH_READS" });
    assert(
      messages.some(
        (m) => m.type === "PUSH_READ_SYNCED" && m.notificationId === "d",
      ),
      "in-app offline native receipt was not queued",
    );
    checks.push(
      "in-app read clears native alert and badge, with durable receipt",
    );
    await push(payload("e"));
    result = { obsolete: true };
    const prior = messages.length;
    await dispatch("notificationclick", {
      notification: current("e"),
      action: "read",
    });
    assert(
      !messages.slice(prior).some((m) => m.type === "PUSH_READ_SYNCED"),
      "obsolete receipt acknowledged a newer notification",
    );
    result = { read: true };
    checks.push("obsolete alerts never claim to read updated messages");
    await push(payload("f"));
    await message({ type: "PUSH_OWNER", uid: "two", deviceId: "new-device" });
    assert(!current("f"), "account change leaked previous alert");
    const before = notifications.length;
    await push(payload("g"));
    assert(
      notifications.length === before,
      "notification for previous account was displayed",
    );
    await message({ type: "PUSH_DISABLE" });
    await push(payload("h", { uid: "two" }));
    assert(
      notifications.length === before,
      "signed-out device displayed private alert",
    );
    assert(badges.at(-1) === 0, "logout badge kept");
    checks.push("account transfer and logout remove private native alerts");
    await message({ type: "PUSH_OWNER", uid: "one", deviceId: "device" });
    await push(payload("a", { href: "https://evil.test/" }));
    await dispatch("notificationclick", {
      notification: current("a"),
      action: "",
    });
    assert(
      client.url === scope + "#/notifications",
      "external notification link allowed",
    );
    const unsafeBefore = notifications.length;
    await push(payload("i", { ackURL: "https://evil.test/" }));
    assert(notifications.length === unsafeBefore, "unsafe receipt accepted");
    checks.push("links and receipt endpoint are restricted to this app");
    await push(payload("bb"));
    current("bb").close();
    const dismissedCount = notifications.length;
    start();
    await push(payload("bb"));
    assert(notifications.length === dismissedCount, "dismissed alert reappeared after restart");
    await push(payload("bc", { expiresAt: Date.now() - 1000 }));
    assert(notifications.length === dismissedCount, "expired alert displayed");
    await message({ type:"PUSH_CLEAR_READ", uid:"one", ids:["bd"], count:0 });
    await push(payload("bd", { createdAt: Date.now() - 1000 }));
    assert(notifications.length === dismissedCount, "delayed read alert displayed");
    checks.push("persistent deduplication, expiry and read-before-delivery suppression");
    mock.clients.matchAll = async () => [];
    start();
    await push(payload("be"));
    assert(!!current("be"), "push required an open app client");
    checks.push("worker displays native alerts with all app clients closed");
    return checks;
  }, source);
  assert.equal(checks.length, 10);
  console.log(
    `${engine === webkit ? "WebKit" : "Chromium"}: ${checks.length} native push lifecycle scenarios passed.`,
  );
} finally {
  await browser.close();
}
