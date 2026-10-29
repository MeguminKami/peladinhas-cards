import test from "node:test";
import assert from "node:assert/strict";
import { applyCasinoSession, casinoSessionInput } from "../js/casino-session-model.js";
import { newCasinoWallet } from "../js/casino-economy.js";
const id = "shop-test-session-1234";
const open = { action: "open", owner: "player", id };
const body = { action: "sync", owner: "player", id, sequence: 1, spent: 0, won: 0, release: false, shopCard: "bronze-foundry" };
test("real shop charges catalogue price in hundredths, spends Vault first and replays once", () => {
  const start = applyCasinoSession({ ...newCasinoWallet(), balance: 40000, vaultBalance: 60000 }, null, open);
  const purchased = applyCasinoSession(start.wallet, start.session, body, 100, { ovr: 50 });
  assert.equal(purchased.wallet.balance, 0);
  assert.equal(purchased.wallet.vaultBalance, 0);
  assert.equal(purchased.response.purchase.ok, true);
  assert.deepEqual(purchased.wallet.shopOwned, ["bronze-foundry"]);
  const replay = applyCasinoSession(purchased.wallet, purchased.session, body, 200, { ovr: 0 });
  assert.equal(replay.write, false);
  assert.equal(replay.response.purchase.ok, true);
  const duplicate = applyCasinoSession(purchased.wallet, purchased.session, { ...body, sequence: 2 }, 200, { ovr: 99 });
  assert.equal(duplicate.response.purchase.reason, "owned");
});
test("shop refuses OVR, funds, malformed fields, duplicate collection ownership and settles pending losses", () => {
  const start = applyCasinoSession({ ...newCasinoWallet(), balance: 100000 }, null, open);
  assert.equal(applyCasinoSession(start.wallet, start.session, body, 1, { ovr: 49 }).response.purchase.reason, "ovr");
  assert.equal(applyCasinoSession(start.wallet, start.session, { ...body, spent: 1 }, 1, { ovr: 50 }).response.purchase.reason, "funds");
  assert.equal(applyCasinoSession(start.wallet, start.session, body, 1, { ovr: 99, owned: ["bronze-foundry"] }).response.purchase.reason, "owned");
  for (const extra of [{ price: 1 }, { shopCard: "unknown" }, { ovr: 99 }, { rejuice: true }, { vaultDeposit: 1 }, { release: true }])
    assert.throws(() => casinoSessionInput({ ...body, ...extra }));
});
