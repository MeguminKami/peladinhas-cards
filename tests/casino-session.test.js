import test from "node:test";
import assert from "node:assert/strict";
import { newCasinoWallet, awardCasinoMatch, currentCasinoWallet, CASINO_EDITION } from "../js/casino-economy.js";
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
test('the casino reset starts at 200 coins and rejects pending sessions from the previous edition',()=>{
 const legacy={edition:'official-2026-10-26-cardoso-reset',balance:999999,earned:2000,matches:3,recent:[{kind:'slot'}]};
 const wallet=currentCasinoWallet(legacy,1);
 assert.equal(wallet.balance,20000);assert.equal(wallet.edition,CASINO_EDITION);
 assert.equal(wallet.earned,0);assert.equal(wallet.matches,0);
 const pending={edition:legacy.edition,balance:legacy.balance,sequence:0,spent:0,won:0,closed:false};
 assert.throws(()=>applyCasinoSession(wallet,pending,open));
 assert.throws(()=>applyCasinoSession(wallet,pending,sync({won:999999})));
 const used={...wallet,balance:23000};assert.equal(currentCasinoWallet(used).balance,23000);
});
test("multiple devices open independent sessions and replay once", () => {
  const first = applyCasinoSession(({...newCasinoWallet(), balance:10000}), undefined, open);
  assert.equal(first.wallet.activeCasinoSession, null);
  assert.equal(applyCasinoSession(first.wallet, first.session, open).write, false);
  const second = applyCasinoSession(first.wallet, undefined, { ...open, id: "different-session-id" });
  assert.equal(first.session.balance, 10000);
  assert.equal(second.session.balance, 10000);
  const paid = applyCasinoSession(second.wallet, first.session, sync());
  const other = applyCasinoSession(paid.wallet, second.session, { ...sync(), id: "different-session-id" });
  assert.equal(other.wallet.balance, 9700);
  assert.equal(applyCasinoSession(other.wallet, paid.session, sync()).wallet.balance, 9700);
});
test("shared balance rejects concurrent overspend without altering either ledger", () => {
  const first=applyCasinoSession(({...newCasinoWallet(), balance:10000}),undefined,open);
  const second=applyCasinoSession(first.wallet,undefined,{...open,id:"second-device-00001"});
  const spent=applyCasinoSession(second.wallet,first.session,sync({spent:8000,won:0}));
  assert.equal(spent.wallet.balance,2000);
  assert.throws(()=>applyCasinoSession(spent.wallet,second.session,{...sync(),id:"second-device-00001",spent:3000,won:0}),error=>error.reason==='insufficient-balance');
  assert.equal(second.session.spent,0);
  assert.equal(spent.wallet.balance,2000);
  const rewarded={...spent.wallet,balance:4000};
  const recovered=applyCasinoSession(rewarded,second.session,{...sync(),id:"second-device-00001",spent:3000,won:0});
  assert.equal(recovered.wallet.balance,1000);
  assert.equal(applyCasinoSession(recovered.wallet,recovered.session,{...sync(),id:"second-device-00001",spent:3000,won:0}).wallet.balance,1000);
});
test("cumulative checkpoints preserve external rewards, are idempotent and close explicitly", () => {
  const first = applyCasinoSession(({...newCasinoWallet(), balance:10000}), undefined, open);
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
  const first = applyCasinoSession(({...newCasinoWallet(), balance:10000}), undefined, open);
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
    error => error.reason === "insufficient-balance",
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
