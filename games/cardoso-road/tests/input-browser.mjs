import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "../../../tests/browser-sandbox.mjs";
const game = fileURLToPath(new URL("../", import.meta.url)),
  root = resolve(game, "../..");
const server = http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, "http://local").pathname;
    let body;
    if (path === "/input-test.html")
      body = '<!doctype html><div id="game" style="height:760px"></div>';
    else if (path === "/js/config.js")
      body =
        'export const runtimeMode="fixtures";export const firebaseConfig={};';
    else if (path === "/js/firebase.js") body = "export const configured=true;";
    else if (["/js/auth.js", "/js/db.js"].includes(path))
      body = (
        await readFile(resolve(root, "tests/fixtures", path.slice(4)), "utf8")
      ).replaceAll("../../js/", "./");
    else {
      const file = path.startsWith("/assets/games/cardoso-road/")
        ? resolve(game, path.slice("/assets/games/cardoso-road/".length))
        : resolve(root, "." + path);
      if (relative(root, file).startsWith("..")) throw Error();
      body = await readFile(file);
    }
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".webp": "image/webp",
        ".woff2": "font/woff2",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
        ".wav": "audio/wav",
      }[extname(path)] || "application/octet-stream",
    );
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CARDOSO_BROWSER
    ? { executablePath: process.env.CARDOSO_BROWSER }
    : { channel: "msedge" }),
});
try {
  for (const rate of [1, 6]) {
    const context = await browser.newContext({
        serviceWorkers: "block",
        viewport: { width: 390, height: 844 },
      }),
      page = await context.newPage(),
      errors = [];
    await context.route("**/*", (r) =>
      r
        .request()
        .url()
        .startsWith(origin + "/")
        ? r.continue()
        : r.abort(),
    );
    page.on("pageerror", (e) => errors.push(e.message));
    await context.addInitScript(() => {
      Object.defineProperty(crypto, "getRandomValues", {
        value: (a) => {
          a.fill(0);
          return a;
        },
      });
      Math.random = () => 0;
      const Native = AudioContext;
      window.contexts = 0;
      window.AudioContext = new Proxy(Native, {
        construct(target, args) {
          window.contexts++;
          return Reflect.construct(target, args);
        },
      });
    });
    await page.goto(origin + "/input-test.html");
    const session = await context.newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate });
    await page.evaluate(async () => {
      const { createCasinoLocalWallet } =
          await import("/js/casino-local-wallet.js"),
        { mountCardoso } = await import("/assets/games/cardoso-road/mount.mjs");
      window.wallet = createCasinoLocalWallet("input-test");
      await wallet.start();
      window.actions = [];
      window.delay = 0;
      window.rejectNext = false;
      const act = wallet.cardosoAct;
      wallet.cardosoAct = async (...args) => {
        actions.push(args[0].type);
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        if (rejectNext) {
          rejectNext = false;
          throw Object.assign(Error("Falha local simulada"), {
            definitive: true,
          });
        }
        return act(...args);
      };
      window.host = mountCardoso(document.querySelector("#game"), wallet);
      await host.ready;
    });
    const frame = page.frames().find((f) => f.url().includes("game.html"));
    await frame.waitForFunction(
      () =>
        !!document.querySelector("canvas")?.dataset.camera &&
        !document.querySelector("#play").disabled,
    );
    assert.equal(await frame.evaluate(() => contexts), 1);
    await page.evaluate(() => (window.delay = 600));
    const response = await frame.evaluate(() => {
      const button = document.querySelector("#play"),
        at = performance.now(),
        balance = document.querySelector("#balance").textContent;
      button.click();
      button.dispatchEvent(new MouseEvent("click"));
      return {
        ms: performance.now() - at,
        text: button.textContent,
        busy: button.getAttribute("aria-busy"),
        balance,
      };
    });
    assert.equal(response.text, "A apostar…");
    assert.equal(response.busy, "true");
    await page.waitForFunction(() => actions.length === 1);
    await page.waitForTimeout(120);
    assert.equal(
      await frame.locator("#balance").textContent(),
      response.balance,
      "unconfirmed debit must not appear as confirmed",
    );
    await frame.waitForFunction(() => !window.cardosoBusy);
    assert.equal(
      await frame.locator("#markers").getAttribute("aria-valuenow"),
      "0",
    );
    await page.evaluate(() => (window.delay = 0));
    const step = await frame.evaluate(async () => {
      const at = performance.now();
      document.querySelector("#play").click();
      const immediate = document.querySelector("#play").textContent;
      while (window.cardosoBusy) await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return { immediate, ms: performance.now() - at };
    });
    assert.equal(step.immediate, "A avançar…");
    assert.equal(
      await frame.locator("#markers").getAttribute("aria-valuenow"),
      "1",
    );
    assert.equal(
      await frame.evaluate(() => contexts),
      1,
      "clicks must not construct the audio context",
    );
    const phaseAtCashout = await frame.evaluate(
      () => document.body.dataset.pipeline,
    );
    assert.equal(
      await frame.locator("#play").isDisabled(),
      true,
      "another advance waits for presentation",
    );
    await frame.locator("#cashout").click();
    if (rate === 1)
      assert.equal(
        phaseAtCashout,
        "animate",
        "cashout must be tested before the animation ends",
      );
    await frame.waitForFunction(() => !window.cardosoBusy);
    assert.equal(
      await frame.locator("#markers").getAttribute("aria-valuenow"),
      "0",
    );
    const pacing = await frame.evaluate(async () => {
      const times = [];
      for (let i = 0; i < 60; i++)
        times.push(await new Promise(requestAnimationFrame));
      const gaps = times
        .slice(1)
        .map((t, i) => t - times[i])
        .sort((a, b) => a - b);
      return {
        p95: gaps[Math.floor(gaps.length * 0.95)],
        over25ms: gaps.filter((ms) => ms > 25).length,
      };
    });
    const balance = await frame.locator("#balance").textContent();
    await page.evaluate(() => (window.rejectNext = true));
    await frame.locator("#play").click();
    await frame.waitForFunction(() => !window.cardosoBusy);
    assert.equal(await frame.locator("#balance").textContent(), balance);
    assert.match(await frame.locator("#error").textContent(), /Falha local/);
    assert.equal(await frame.locator("#play").isEnabled(), true);
    await page.waitForTimeout(80);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        cpuRate: rate,
        pendingFeedbackMs: response.ms,
        stepConfirmedMs: step.ms,
        frameP95Ms: pacing.p95,
        framesAbove25ms: pacing.over25ms,
        cloud: "fixtures only",
      }),
    );
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
