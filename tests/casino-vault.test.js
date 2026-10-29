import test from "node:test";
import assert from "node:assert/strict";
import { applyCasinoSession, casinoSessionInput } from "../js/casino-session-model.js";
import { newCasinoWallet } from "../js/casino-economy.js";
import { payFromCasinoFunds, shopFunds } from "../js/casino-shop-payment.js";
import { buyShopCard } from "../js/casino-shop-catalog.js";

const id = "vault-session-123456";
const open = { action: "open", owner: "player", id };
const input = { action: "sync", owner: "player", id, sequence: 1, spent: 0, won: 0, release: false, vaultDeposit: 1000 };

test("Vault deposits transfer money once and do not alter the combined total", () => {
  const start = applyCasinoSession(newCasinoWallet(), undefined, open);
  const next = applyCasinoSession(start.wallet, start.session, input);
  assert.equal(next.wallet.balance, 19000);
  assert.equal(next.wallet.vaultBalance, 1000);
  assert.equal(shopFunds(next.wallet), 20000);
  assert.equal(next.response.vaultDeposited, 1000);
  const replay = applyCasinoSession(next.wallet, next.session, input);
  assert.equal(replay.write, false);
  assert.equal(replay.wallet.vaultBalance, 1000);
  assert.throws(() => applyCasinoSession(next.wallet, next.session, { ...input, vaultDeposit: 2000 }));
});
test("Vault validates deposits, settles games first and cannot withdraw", () => {
  for (const vaultDeposit of [-1, 0, .1, "100", 1e12 + 1])
    assert.throws(() => casinoSessionInput({ ...input, vaultDeposit }));
  assert.throws(() => casinoSessionInput({ ...input, rejuice: true }));
  assert.throws(() => casinoSessionInput({ ...input, release: true }));
  const start = applyCasinoSession({ ...newCasinoWallet(), balance: 1100, vaultBalance: 2000 }, undefined, open);
  const denied = applyCasinoSession(start.wallet, start.session, { ...input, spent: 200 });
  assert.equal(denied.response.vaultDeposited, 0);
  assert.equal(denied.wallet.balance, 900);
  assert.equal(denied.wallet.vaultBalance, 2000);
  const deposited = applyCasinoSession(start.wallet, start.session, { ...input, spent: 100 });
  assert.equal(deposited.wallet.balance, 0);
  assert.equal(deposited.wallet.vaultBalance, 3000);
});
test("Shop combines balances and spends Vault first without making it playable", () => {
  const wallet = { balance: 100, vaultBalance: 200 };
  assert.equal(shopFunds(wallet), 300);
  assert.deepEqual(payFromCasinoFunds(wallet, 250), { balance: 50, vaultBalance: 0 });
  assert.deepEqual(payFromCasinoFunds(wallet, 150), { balance: 100, vaultBalance: 50 });
  assert.throws(() => payFromCasinoFunds(wallet, 301));
  assert.throws(() => payFromCasinoFunds(wallet, -1));
  assert.throws(() => shopFunds({ balance: 100, vaultBalance: -1 }));
  const purchased = buyShopCard({ balance: 400, vaultBalance: 600, ovr: 50, owned: [] }, "bronze-foundry");
  assert.equal(purchased.balance, 0);
  assert.equal(purchased.vaultBalance, 0);
  assert.deepEqual(purchased.owned, ["bronze-foundry"]);
});
