import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname, relative } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "./browser-sandbox.mjs";
import { createSession, execute } from "../games/futebol/src/session.ts";
const root = resolve(".");
const server = createServer((req, res) => {
  if (req.url === "/wallet-test.html") {
    res.setHeader("Content-Type", "text/html");
    res.end("<!doctype html><html><body>Carteira local</body></html>");
    return;
  }
  const path = resolve(root, req.url.split("?")[0].replace(/^\//, ""));
  if (relative(root, path).startsWith("..") || !existsSync(path)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    { ".js": "text/javascript", ".html": "text/html" }[extname(path)] ||
      "text/plain",
  );
  res.end(readFileSync(path));
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
try {
  const context = await browser.newContext({ serviceWorkers: "block" });
  await context.route("**/js/db.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `import {casinoFixture} from '../tests/fixtures/casino.js';export const callAdmin=casinoFixture;`,
    }),
  );
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}/wallet-test.html`;
  await page.goto(url);
  const result = await page.evaluate(async () => {
    const { createCasinoLocalWallet } =
      await import("./js/casino-local-wallet.js");
    const { readCasinoLocal } = await import("./js/casino-local-store.js");
    const uid = "pedro";
    window.__wallet = createCasinoLocalWallet(uid);
    const wallet = window.__wallet;
    window.__casinoLoseOpenResponse = true;
    // A lost open acknowledgement must retain the same durable session ID.
    await wallet.start().catch(() => {});
    window.__casinoLoseOpenResponse = false;
    await wallet.start();
    const first = await readCasinoLocal(uid);
    const streamId = crypto.randomUUID();
    let revision = 0;
    const operation = (
      roundId,
      spin = 1,
      mode = "base",
      credit = 20,
      complete = true,
    ) => {
      const id = crypto.randomUUID();
      revision++;
      return {
        id,
        streamId,
        configVersion: "0.6.0",
        bet: 20,
        mode,
        bonusHunt: false,
        debit: spin === 1 ? (mode === "base" ? 20 : 1800) : 0,
        credit,
        roundId,
        spin,
        bonusComplete: mode !== "base" && complete,
        progress: {
          schema: 1,
          revision,
          rngState: 123456 + revision,
          requestIds: [id],
          active: complete ? null : { remaining: 11 - spin },
          counter: roundId,
          history: [
            { id: roundId, spins: Array.from({ length: spin }, () => ({})) },
          ],
        },
      };
    };
    const before = window.__casinoCalls.length;
    let last;
    for (let i = 1; i <= 1000; i++) {
      last = operation(i);
      await wallet.settle(last);
    }
    const after = window.__casinoCalls.length;
    const local = await readCasinoLocal(uid);
    await wallet.settle(last);
    const repeated = await readCasinoLocal(uid);
    // No server checkpoint during the first 10 spins of a purchased bonus.
    await wallet.settle(operation(1001, 1, "normal", 0, false));
    for (let spin = 2; spin <= 10; spin++)
      await wallet.settle(operation(1001, spin, "normal", 1, false));
    const duringBonus = window.__casinoCalls.length;
    await wallet.settle(operation(1001, 11, "normal", 1, true));
    window.__operation = operation;
    window.__streamId = streamId;
    window.__readLocal = () => readCasinoLocal(uid);
    return {
      before,
      after,
      duringBonus,
      id: first.id,
      localBalance: local.balance,
      spent: local.spent,
      won: local.won,
      repeatedSpent: repeated.spent,
      progress: local.progress.rngState,
    };
  });
  assert.equal(
    result.before,
    result.after,
    "1000 spins must make zero remote calls",
  );
  assert.equal(
    result.duringBonus,
    result.after,
    "no checkpoint before the bonus ends",
  );
  assert.equal(result.localBalance, 10000);
  assert.equal(result.spent, 20000);
  assert.equal(result.won, 20000);
  assert.equal(
    result.repeatedSpent,
    result.spent,
    "local pending replay applies once",
  );
  await page.waitForFunction(async () => {
    const row = await window.__readLocal();
    return !row.dirty && !row.pending;
  });
  assert.equal(
    await page.evaluate(
      () =>
        window.__casinoCalls.filter((call) => call.input?.action === "sync")
          .length,
    ),
    1,
    "one final bonus checkpoint",
  );

  // A slow server confirmation must not block or overwrite later local spins.
  await page.evaluate(async () => {
    await window.__wallet.settle(window.__operation(1002, 1, "base", 0));
    window.__casinoGate = new Promise((resolve) => {
      window.__releaseConfirmation = resolve;
    });
    window.__slowConfirmation = window.__wallet.checkpoint("manual");
  });
  await page.waitForFunction(
    () =>
      window.__casinoCalls.filter((call) => call.input?.action === "sync")
        .length === 2,
  );
  const concurrent = await page.evaluate(async () => {
    const balance = window.__wallet.view().balance;
    const result = await Promise.race([
      window.__wallet.settle(window.__operation(1003, 1, "base", 2)),
      new Promise((_, reject) =>
        setTimeout(() => reject(Error("A rede bloqueou o spin local")), 1000),
      ),
    ]);
    const server = JSON.parse(sessionStorage.getItem("casino-fixture-wallet"));
    server.wallet.balance += 2000;
    sessionStorage.setItem("casino-fixture-wallet", JSON.stringify(server));
    window.__releaseConfirmation();
    window.__casinoGate = null;
    await window.__slowConfirmation;
    const record = await window.__readLocal();
    return {
      before: balance,
      local: result.balance,
      after: record.balance,
      dirty: record.dirty,
      remaining: record.spent - record.confirmedSpent,
    };
  });
  assert.equal(concurrent.local, concurrent.before - 18);
  assert.equal(
    concurrent.after,
    concurrent.local + 2000,
    "new football reward and unconfirmed local spins both survive",
  );
  assert.equal(concurrent.dirty, true);
  assert.equal(concurrent.remaining, 20);

  // Another tab cannot mutate the same on-device session.
  const other = await context.newPage();
  await other.goto(url);
  const tabError = await other.evaluate(async () => {
    const { createCasinoLocalWallet } =
      await import("./js/casino-local-wallet.js");
    try {
      await createCasinoLocalWallet("pedro").start();
      return "";
    } catch (error) {
      return error.message;
    }
  });
  assert.match(tabError, /outra aba/);
  await other.close();

  const failure = await page.evaluate(async () => {
    const before = await window.__readLocal();
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Disco cheio", "QuotaExceededError");
    };
    let error;
    try {
      await window.__wallet.settle(window.__operation(1004));
    } catch (value) {
      error = value.message;
    } finally {
      IDBObjectStore.prototype.put = original;
    }
    const after = await window.__readLocal();
    return {
      before: before.balance,
      after: after.balance,
      error,
      spentBefore: before.spent,
      spentAfter: after.spent,
    };
  });
  assert.ok(failure.error);
  assert.equal(failure.before, failure.after);
  assert.equal(failure.spentBefore, failure.spentAfter);

  // Leave offline, then recover the exact same stable checkpoint after reload.
  const saved = await page.evaluate(async () => {
    await window.__wallet.settle(window.__operation(1004, 1, "base", 2));
    window.__casinoFail = true;
    await window.__wallet.close();
    const row = await window.__readLocal();
    return {
      id: row.id,
      balance: row.balance,
      rng: row.progress.rngState,
      pending: row.pending.body,
    };
  });
  assert.equal(saved.pending.release, true);
  await page.reload();
  const recovered = await page.evaluate(async () => {
    const { createCasinoLocalWallet } =
      await import("./js/casino-local-wallet.js");
    const { readCasinoLocal } = await import("./js/casino-local-store.js");
    window.__wallet = createCasinoLocalWallet("pedro");
    await window.__wallet.start();
    return {
      state: await readCasinoLocal("pedro"),
      calls: window.__casinoCalls,
    };
  });
  assert.equal(recovered.state.balance, saved.balance);
  assert.equal(recovered.state.progress.rngState, saved.rng);
  assert.equal(recovered.state.pending, null);
  assert.notEqual(recovered.state.id, saved.id);
  assert.deepEqual(recovered.calls[0].input, {
    ...saved.pending,
    owner: "pedro",
  });

  const lost = await page.evaluate(async () => {
    const { readCasinoLocal } = await import("./js/casino-local-store.js");
    const state = await readCasinoLocal("pedro"),
      streamId = Object.keys(state.rounds)[0];
    const id = crypto.randomUUID(),
      revision = state.progressRevision + 1;
    await window.__wallet.settle({
      id,
      streamId,
      configVersion: "0.6.0",
      bet: 20,
      mode: "base",
      bonusHunt: false,
      debit: 20,
      credit: 0,
      roundId: 1005,
      spin: 1,
      bonusComplete: false,
      progress: {
        ...state.progress,
        revision,
        requestIds: [id],
        rngState: 98765,
        counter: 1005,
        history: [{ id: 1005, spins: [{}] }],
      },
    });
    window.__casinoLoseResponse = true;
    await window.__wallet.close();
    return {
      row: await readCasinoLocal("pedro"),
      server: JSON.parse(sessionStorage.getItem("casino-fixture-wallet")).wallet
        .balance,
    };
  });
  assert.ok(lost.row.pending);
  await page.reload();
  const acknowledged = await page.evaluate(async () => {
    const { createCasinoLocalWallet } =
      await import("./js/casino-local-wallet.js");
    const wallet = createCasinoLocalWallet("pedro");
    const view = await wallet.start();
    await wallet.close();
    return view;
  });
  assert.equal(
    acknowledged.balance,
    lost.server,
    "lost response never reapplies delta",
  );
  // Upgrade an old online-per-spin pending purchase, already in a real bonus.
  const legacyContext = await browser.newContext({ serviceWorkers: "block" });
  await legacyContext.route("**/js/db.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `import {casinoFixture} from '../tests/fixtures/casino.js';export const callAdmin=casinoFixture;`,
    }),
  );
  const legacyPage = await legacyContext.newPage();
  await legacyPage.goto(url);
  const initial = createSession("session");
  initial.balance = 10000;
  const first = execute(
    initial,
    { type: "start", mode: "normal" },
    "legacy-operation-000001",
    "2026-10-25T10:00:00Z",
  );
  const next = execute(
    first,
    { type: "next" },
    "new-local-operation-000002",
    "2026-10-25T10:01:00Z",
  );
  const third = execute(
    next,
    { type: "next" },
    "new-local-operation-000003",
    "2026-10-25T10:02:00Z",
  );
  const migrated = await legacyPage.evaluate(
    async ({ initial, first, next, third }) => {
      const key = "slot-local-v1:player:pedro",
        streamId = "migration-stream-000001";
      localStorage.setItem("peladinhas:casino:stream:pedro", streamId);
      localStorage.setItem(key, JSON.stringify(initial));
      const row = first.history[0],
        spin = row.spins.at(-1);
      localStorage.setItem(
        key + ":wallet-pending",
        JSON.stringify({
          before: initial.revision,
          next: first,
          transaction: {
            id: first.requestIds[0],
            debit: row.cost,
            credit: spin.paid,
            roundId: row.id,
            spin: 1,
            configVersion: first.configVersion,
            bet: row.bet,
            mode: row.mode,
            bonusHunt: false,
          },
        }),
      );
      const { createCasinoLocalWallet } =
        await import("./js/casino-local-wallet.js");
      const wallet = createCasinoLocalWallet("pedro");
      await wallet.start();
      const entered = JSON.parse(localStorage.getItem(key));
      const calls = window.__casinoCalls.length;
      const paid = next.history[0].spins.at(-1).paid;
      const local = await wallet.settle({
        id: next.requestIds[0],
        streamId,
        debit: 0,
        credit: paid,
        roundId: 1,
        spin: 2,
        configVersion: next.configVersion,
        bet: 20,
        mode: "normal",
        bonusHunt: false,
        progress: next,
        bonusComplete: false,
      });
      const after = window.__casinoCalls.length;
      await wallet.close();
      const resumed = createCasinoLocalWallet("pedro");
      await resumed.start();
      const resumedProgress = JSON.parse(localStorage.getItem(key));
      await resumed.settle({
        id: third.requestIds[0],
        streamId,
        debit: 0,
        credit: third.history[0].spins.at(-1).paid,
        roundId: 1,
        spin: 3,
        configVersion: third.configVersion,
        bet: 20,
        mode: "normal",
        bonusHunt: false,
        progress: third,
        bonusComplete: false,
      });
      await resumed.close();
      return {
        resumedProgress,
        entered,
        local,
        calls,
        after,
        pending: localStorage.getItem(key + ":wallet-pending"),
        server: JSON.parse(sessionStorage.getItem("casino-fixture-wallet"))
          .wallet.balance,
      };
    },
    { initial, first, next, third },
  );
  assert.equal(migrated.entered.rngState, first.rngState);
  assert.equal(migrated.entered.active.remaining, 9);
  assert.equal(migrated.local.balance, next.balance);
  assert.equal(migrated.pending, null);
  assert.equal(migrated.resumedProgress.rngState, next.rngState);
  assert.equal(migrated.resumedProgress.active.remaining, 8);
  assert.equal(
    migrated.after,
    migrated.calls,
    "continuing a migrated bonus remains local",
  );
  assert.equal(
    migrated.server,
    third.balance,
    "legacy purchase and free spins across reentry are each counted once",
  );
  await legacyContext.close();
  assert.deepEqual(errors, []);
  console.log(
    "Local wallet: 1000 spins without server calls, final-bonus checkpoint, lost open/reply, offline exit/reentry, duplicate operation, full storage and exclusive tabs passed.",
  );
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
