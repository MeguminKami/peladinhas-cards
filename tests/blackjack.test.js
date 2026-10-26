import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { tableCommand, tableView, BJ } from "../functions/blackjack-table.js";
import { deck } from "../functions/blackjack-engine.js";
import { newCasinoWallet } from "../js/casino-economy.js";

export function harness() {
  let table = null,
    now = 1000000;
  const wallets = Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => [`p${i}`, newCasinoWallet()]),
  );
  const command = (uid, action, extra = {}) => ({
    id: randomUUID(),
    action,
    table: table?.id,
    revision: table?.revision,
    ...extra,
  });
  function send(uid, input, shoe) {
    const r = tableCommand(input, uid, uid, table, wallets, now, shoe);
    table = r.closed ? null : r.table;
    Object.assign(wallets, r.wallets);
    return r;
  }
  return {
    get table() {
      return table;
    },
    wallets,
    command,
    send,
    advance(ms) {
      now += ms;
    },
    get now() {
      return now;
    },
  };
}
test("five players share one shoe, preserve ownership and settle exactly once", () => {
  const h = harness();
  for (let i = 0; i < 5; i++) h.send(`p${i}`, h.command(`p${i}`, "join"));
  assert.throws(() => h.send("p5", h.command("p5", "join")), /cheia/);
  for (let i = 0; i < 5; i++) {
    const uid = `p${i}`;
    const c = h.command(uid, "bet", { amount: 100 });
    h.send(uid, c, deck());
    h.send(uid, c);
    assert.equal(h.wallets[uid].balance, 24900);
  }
  const view = tableView(h.table);
  assert.equal(view.round.seats.length, 5);
  assert.equal(view.round.dealer[1], null);
  assert.equal("shoe" in view.round, false);
  assert.equal("rng" in view, false);
  const serialized = JSON.stringify(view);
  assert.equal(serialized.includes(h.table.session.round.shoe[20].id), false);
  const active = h.table.session.round.active;
  const owner = h.table.players.find((p) =>
    h.table.session.round.seats
      .find((s) => s.number === p.seat)
      ?.hands.some((h) => h.id === active),
  );
  assert.throws(
    () => h.send("p4" === owner.uid ? "p3" : "p4", h.command("p4", "stand")),
    /vez/,
  );
  while (h.table.session.round.phase !== "summary") {
    const r = h.table.session.round;
    const p = h.table.players.find((p) =>
      r.seats
        .find((s) => s.number === p.seat)
        ?.hands.some((x) => x.id === r.active),
    );
    const c = h.command(p.uid, "stand");
    h.send(p.uid, c);
    const after = structuredClone(h.wallets);
    h.send(p.uid, c);
    assert.deepEqual(h.wallets, after);
  }
  const r = h.table.session.round;
  for (const p of r.seats)
    assert.equal(
      h.wallets[`p${p.number - 1}`].balance,
      24900 + p.hands.reduce((n, h) => n + h.gross, 0) + p.insuranceGross,
    );
  h.advance(BJ.summary + 1);
  h.send(null, h.command(null, "tick"));
  assert.equal(h.table.session.round, null);
});
test("room closes after one idle minute despite presence; a live round is protected and completion restarts the minute", () => {
  const empty = harness();
  empty.send("p0", empty.command("p0", "join"));
  empty.advance(30000);
  empty.send("p0", empty.command("p0", "heartbeat"));
  empty.advance(30000);
  empty.send("p0", empty.command("p0", "heartbeat"));
  assert.equal(empty.table, null);

  const h = harness();
  for (let i = 0; i < 5; i++) h.send(`p${i}`, h.command(`p${i}`, "join"));
  for (let i = 0; i < 5; i++)
    h.send(
      `p${i}`,
      h.command(`p${i}`, "bet", { amount: 100 }),
      ordered([2, 2, 2, 2, 2, 10, 8, 8, 8, 8, 8, 7]),
    );
  assert.equal(tableView(h.table).idleDeadline, 0);
  for (let i = 0; i < 5; i++) {
    h.advance(29000);
    for (let j = 0; j < 5; j++)
      h.send(`p${j}`, h.command(`p${j}`, "heartbeat"));
    h.send(`p${i}`, h.command(`p${i}`, "stand"));
  }
  assert.equal(tableView(h.table).idleDeadline, h.now + 60000);
  h.advance(59000);
  for (let j = 0; j < 5; j++) h.send(`p${j}`, h.command(`p${j}`, "heartbeat"));
  h.send(null, h.command(null, "tick"));
  assert.ok(h.table);
  h.advance(1000);
  h.send(null, h.command(null, "tick"));
  assert.equal(h.table, null);
});
test("lost-response retries, stale revisions, altered requests and insufficient funds", () => {
  const h = harness();
  h.send("p0", h.command("p0", "join"));
  h.send("p1", h.command("p1", "join"));
  const old = h.command("p1", "stand");
  const c = h.command("p0", "bet", { amount: 100 });
  h.send("p0", c);
  assert.throws(() => h.send("p0", { ...c, amount: 200 }), /diferentes/);
  const stale = h.send("p1", old);
  assert.equal(stale.stale, true);
  assert.equal(h.wallets.p1.balance, 25000);
  assert.throws(
    () => h.send("p1", h.command("p1", "bet", { amount: 30000 })),
    /Saldo/,
  );
  h.send("p0", h.command("p0", "leave"));
  assert.equal(h.wallets.p0.balance, 25000);
});
test("disconnects and no remaining browser eventually settle and close, presence does not broadcast", () => {
  const h = harness();
  h.send("p0", h.command("p0", "join"));
  h.send("p1", h.command("p1", "join"));
  h.send("p0", h.command("p0", "bet", { amount: 100 }));
  h.advance(21000);
  const presence = h.send("p0", h.command("p0", "heartbeat"));
  assert.equal(presence.publicChanged, false);
  h.send(null, h.command(null, "tick"), deck());
  assert.ok(h.table.session.round);
  for (let i = 0; i < 10 && h.table; i++) {
    h.advance(61000);
    h.send(null, h.command(null, "tick"));
  }
  assert.equal(h.table, null);
  assert.ok(h.wallets.p0.balance >= 24900);
});
test("new arrivals wait for the next round, timeout commits before rejecting a stale decision", () => {
  const h = harness();
  h.send("p0", h.command("p0", "join"));
  h.send("p0", h.command("p0", "bet", { amount: 100 }), deck());
  h.send("p1", h.command("p1", "join"));
  assert.equal(h.table.session.round.seats.length, 1);
  assert.throws(
    () => h.send("p1", h.command("p1", "bet", { amount: 100 })),
    /próxima/,
  );
  h.advance(BJ.turn + 1);
  const before = h.wallets.p0.balance;
  const c = h.command("p0", "hit");
  const result = h.send("p0", c);
  assert.equal(result.stale, true);
  assert.equal(h.table.session.round.phase, "summary");
  assert.ok(h.wallets.p0.balance >= before);
});
function ordered(ranks) {
  const remaining = deck(),
    first = [];
  for (const rank of ranks) {
    const i = remaining.findIndex((c) => c.rank === rank);
    first.push(...remaining.splice(i, 1));
  }
  return [...first, ...remaining];
}
test("split and doubles charge only their owner, with independent returns", () => {
  const h = harness();
  for (const uid of ["p0", "p1"]) h.send(uid, h.command(uid, "join"));
  h.send("p0", h.command("p0", "bet", { amount: 100 }));
  h.send(
    "p1",
    h.command("p1", "bet", { amount: 100 }),
    ordered([8, 5, 10, 8, 6, 7, 2, 3, 10, 10]),
  );
  h.send("p0", h.command("p0", "split"));
  assert.equal(h.wallets.p0.balance, 24800);
  assert.equal(h.wallets.p1.balance, 24900);
  h.send("p0", h.command("p0", "double"));
  assert.equal(h.wallets.p0.balance, 24700);
  h.send("p0", h.command("p0", "stand"));
  h.send("p1", h.command("p1", "double"));
  assert.equal(h.table.session.round.phase, "summary");
  assert.equal(h.wallets.p0.balance, 25100);
  assert.equal(h.wallets.p1.balance, 25200);
});
test("insurance and failed plans preserve all input wallets", () => {
  const h = harness();
  for (const uid of ["p0", "p1"]) h.send(uid, h.command(uid, "join"));
  h.send("p0", h.command("p0", "bet", { amount: 100 }));
  h.send(
    "p1",
    h.command("p1", "bet", { amount: 100 }),
    ordered([2, 3, 1, 4, 5, 9]),
  );
  h.send("p0", h.command("p0", "insure"));
  assert.equal(h.wallets.p0.balance, 24850);
  assert.equal(h.wallets.p1.balance, 24900);
  const before = structuredClone(h.wallets);
  assert.throws(() => h.send("p0", h.command("p0", "insure")), /decidido/);
  assert.deepEqual(h.wallets, before);
  h.send("p1", h.command("p1", "decline"));
});
test("a connected player waiting for a long round is not removed for inactivity", () => {
  const h = harness();
  for (let i = 0; i < 5; i++) h.send(`p${i}`, h.command(`p${i}`, "join"));
  for (let i = 0; i < 5; i++)
    h.send(
      `p${i}`,
      h.command(`p${i}`, "bet", { amount: 100 }),
      ordered([2, 2, 2, 2, 2, 10, 8, 8, 8, 8, 8, 7]),
    );
  for (let i = 0; i < 5; i++) {
    h.advance(29000);
    for (let j = 0; j < 5; j++)
      h.send(`p${j}`, h.command(`p${j}`, "heartbeat"));
    h.send(`p${i}`, h.command(`p${i}`, "stand"));
  }
  assert.equal(
    h.table.players.some((p) => p.leaving),
    false,
  );
  assert.equal(h.table.session.round.phase, "summary");
});
test("a very old bet cannot debit a later round after the bounded receipt cache expires", () => {
  const h = harness();
  for (const uid of ["p0", "p1"]) h.send(uid, h.command(uid, "join"));
  const old = h.command("p0", "bet", { amount: 100 });
  h.send("p0", old);
  h.send(
    "p1",
    h.command("p1", "bet", { amount: 100 }),
    ordered([2, 3, 10, 4, 5, 7]),
  );
  h.send("p0", h.command("p0", "stand"));
  h.send("p1", h.command("p1", "stand"));
  h.advance(BJ.summary + 1);
  h.send(null, h.command(null, "tick"));
  for (let i = 0; i < 70; i++) h.send("p1", h.command("p1", "join"));
  const before = structuredClone(h.wallets);
  assert.equal(h.send("p0", old).stale, true);
  assert.deepEqual(h.wallets, before);
});
