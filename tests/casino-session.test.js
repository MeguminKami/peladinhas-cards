import test from "node:test";
import assert from "node:assert/strict";
import { newCasinoWallet, awardCasinoMatch } from "../js/casino-economy.js";
import {
  applyCasinoSession,
  casinoSessionInput,
} from "../js/casino-session-model.js";
const id = "11111111-2222-3333-4444-555555555555";
const open = { action: "open", id, owner: "player" };
const sync = (values = {}) => ({
  action: "sync",
  id,
  owner: "player",
  sequence: 1,
  spent: 200,
  won: 50,
  release: false,
  ...values,
});
test("session entry locks the wallet and repeats without creating another session", () => {
  const first = applyCasinoSession(newCasinoWallet(), undefined, open);
  assert.equal(first.wallet.activeCasinoSession, id);
  assert.equal(
    applyCasinoSession(first.wallet, first.session, open).write,
    false,
  );
  assert.throws(
    () =>
      applyCasinoSession(first.wallet, undefined, {
        ...open,
        id: "different-session-id",
      }),
    /outro dispositivo/,
  );
});
test("cumulative checkpoints preserve external rewards, are idempotent and close explicitly", () => {
  const first = applyCasinoSession(newCasinoWallet(), undefined, open);
  const rewarded = awardCasinoMatch(first.wallet, "football");
  const checkpoint = applyCasinoSession(rewarded, first.session, sync());
  assert.equal(checkpoint.wallet.balance, 11850);
  assert.equal(
    applyCasinoSession(checkpoint.wallet, checkpoint.session, sync()).write,
    false,
  );
  assert.throws(
    () =>
      applyCasinoSession(
        checkpoint.wallet,
        checkpoint.session,
        sync({ won: 60 }),
      ),
    /outros valores/,
  );
  const next = applyCasinoSession(
    checkpoint.wallet,
    checkpoint.session,
    sync({ sequence: 2, spent: 400, won: 70, release: true }),
  );
  assert.equal(next.wallet.balance, 11670);
  assert.equal(next.wallet.activeCasinoSession, null);
  assert.equal(next.session.closed, true);
  assert.equal(
    applyCasinoSession(next.wallet, next.session, open).response.closed,
    true,
  );
  const other = applyCasinoSession(next.wallet, undefined, {
    ...open,
    id: "another-session-id",
  });
  assert.equal(
    applyCasinoSession(
      other.wallet,
      next.session,
      sync({ sequence: 2, spent: 400, won: 70, release: true }),
    ).write,
    false,
  );
});
test("stale/negative/malformed confirmations cannot change the wallet", () => {
  const first = applyCasinoSession(newCasinoWallet(), undefined, open);
  assert.throws(
    () =>
      applyCasinoSession(first.wallet, first.session, sync({ sequence: 2 })),
    /sequência/,
  );
  assert.throws(
    () =>
      applyCasinoSession(
        first.wallet,
        first.session,
        sync({ spent: 20000, won: 0 }),
      ),
    /Saldo/,
  );
  for (const patch of [
    { spent: -1 },
    { won: 0.5 },
    { sequence: 0 },
    { release: 0 },
    { uid: "other" },
    { id: "../../bad" },
  ])
    assert.throws(() => casinoSessionInput(sync(patch)));
  const next = applyCasinoSession(first.wallet, first.session, sync());
  assert.throws(
    () =>
      applyCasinoSession(
        next.wallet,
        next.session,
        sync({ sequence: 2, spent: 100 }),
      ),
    /sequência/,
  );
});
