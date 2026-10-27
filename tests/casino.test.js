import test from "node:test";
import assert from "node:assert/strict";
import { casinoMatchReward, currentCasinoWallet } from "../js/casino-economy.js";

test("football rewards cover outcomes, margin, goals, assists and 20–200 bounds", () => {
  const game = { status: "closed", teamA: { starters: ["p"], bench: ["b"] }, teamB: { starters: ["r"] }, score: {teamA: 0, teamB: 5} };
  assert.equal(casinoMatchReward(game,"p"),2000);
  game.score={teamA:1,teamB:1};
  assert.equal(casinoMatchReward(game,"b"),6500);
  game.score={teamA:5,teamB:0};
  assert.equal(casinoMatchReward(game,"p"),12000);
  game.performance={teamA:{goals:["p","p","p","p"],assists:["p","p"]}};
  assert.equal(casinoMatchReward(game,"p"),20000);
  assert.equal(casinoMatchReward(game,"absent"),0);
  game.status="open";
  assert.equal(casinoMatchReward(game,"p"),0);
  const reset=currentCasinoWallet({balance:999999});
  assert.equal(reset.balance,20000);
  reset.balance=12345;
  assert.equal(currentCasinoWallet(reset).balance,12345);
});
import {
  newCasinoWallet,
  awardCasinoMatch,
  settleCasinoSlot,
  validateSlotTransaction,
} from "../js/casino-economy.js";
const transaction = (values = {}) => ({
  id: "12345678-1234-1234-1234-123456789012",
  streamId: "12345678-1234-1234-1234-123456789013",
  debit: 20,
  credit: 8,
  roundId: 1,
  spin: 1,
  configVersion: "0.7.0",
  bet: 20,
  mode: "base",
  bonusHunt: false,
  ...values,
});
test("DJC uses exact hundredths; welcome is 200 and each football match adds 20", () => {
  const wallet = newCasinoWallet(1),
    next = awardCasinoMatch(wallet, "game", 2);
  assert.equal(wallet.balance, 20000);
  assert.equal(next.balance, 22000);
  assert.equal(next.matches, 1);
  assert.equal(next.earned, 2000);
  assert.equal(wallet.recent.length, 1);
  let many = next;
  for (let i = 0; i < 30; i++) many = awardCasinoMatch(many, String(i));
  assert.equal(many.recent.length, 12);
});
test("slot debits before considering credit and preserves fractional coin payments", () => {
  const next = settleCasinoSlot(newCasinoWallet(), transaction());
  assert.equal(next.wallet.balance, 19988);
  assert.equal(next.wallet.recent[0].amount, -12);
  assert.throws(
    () =>
      settleCasinoSlot(
        { ...newCasinoWallet(), balance: 0 },
        transaction({ credit: 200000 }),
      ),
    /insuficientes/,
  );
});
test("slot metadata permits configured Hunt and purchases, rejects arbitrary debit/extra identity", () => {
  validateSlotTransaction(transaction({ bonusHunt: true, debit: 60 }));
  validateSlotTransaction(transaction({ mode: "normal", debit: 1800 }));
  validateSlotTransaction(transaction({ mode: "superior", debit: 4400 }));
  for (const values of [
    { debit: 1 },
    { credit: -1 },
    { bet: 21 },
    { credit: 0.5 },
    { uid: "other" },
    { configVersion: "0.5.0" },
    { spin: 0 },
    { id: "../../users" },
    { id: 1234567890123456 },
    { streamId: 1234567890123456 },
  ])
    assert.throws(() => validateSlotTransaction(transaction(values)));
});
test("free spins require sequential round metadata; accumulated cap is enforced", () => {
  const first = settleCasinoSlot(
    newCasinoWallet(),
    transaction({ mode: "normal", debit: 1800, credit: 199999 }),
  );
  const free = transaction({ mode: "normal", debit: 0, spin: 2, credit: 1 });
  const second = settleCasinoSlot(first.wallet, free, first.round);
  assert.equal(second.round.paid, 200000);
  assert.throws(
    () =>
      settleCasinoSlot(
        second.wallet,
        { ...free, spin: 3, credit: 1 },
        second.round,
      ),
    /limite/,
  );
  assert.throws(
    () => settleCasinoSlot(first.wallet, { ...free, spin: 3 }, first.round),
    /sequência/,
  );
  assert.throws(() => settleCasinoSlot(first.wallet, free), /sequência/);
  assert.throws(
    () => settleCasinoSlot(first.wallet, transaction(), first.round),
    /sequência/,
  );
});
