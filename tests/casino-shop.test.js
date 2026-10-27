import test from "node:test";
import assert from "node:assert/strict";
import {
  SHOP_CARDS,
  SHOP_ARCHIVED_CARDS,
  buyShopCard,
} from "../js/casino-shop-catalog.js";
import { calculateBaseCard } from "../js/utils.js";
import {
  CASINO_SHOP_ART_IDS,
  renderCasinoShopCard,
} from "../js/casino-shop-art.js";
test("catalogue starts at 1000; every edition has an OVR requirement", () => {
  assert.equal(Math.min(...SHOP_CARDS.map((card) => card.price)), 1000);
  assert.equal(
    new Set(SHOP_CARDS.map((card) => card.id)).size,
    SHOP_CARDS.length,
  );
  for (const card of SHOP_CARDS) {
    assert.ok(card.minOvr > 0 && card.minOvr <= 99);
    if (!["bronze-foundry", "silver-mirror", "gold-vault"].includes(card.id))
      assert.ok(card.price >= 5000);
    assert.ok(
      CASINO_SHOP_ART_IDS.includes(card.id),
      `missing art for ${card.id}`,
    );
  }
});
test("buy validates OVR, money, ownership and never mutates failed state", () => {
  const state = { balance: 1000, ovr: 50, owned: [] };
  assert.throws(
    () => buyShopCard({ ...state, ovr: 49 }, "bronze-foundry"),
    /50 OVR/,
  );
  assert.throws(
    () => buyShopCard({ ...state, balance: 999 }, "bronze-foundry"),
    /Faltam 1 DJC/,
  );
  assert.throws(() => buyShopCard(state, "unknown"), /não existe/);
  const result = buyShopCard(state, "bronze-foundry");
  assert.equal(result.balance, 0);
  assert.deepEqual(result.owned, ["bronze-foundry"]);
  assert.throws(() => buyShopCard(result, "bronze-foundry"), /já faz parte/);
  assert.deepEqual(state, { balance: 1000, ovr: 50, owned: [] });
});
test("metals follow league thresholds and prestige runs from 85 to 95", () => {
  const metals = SHOP_CARDS.filter((card) => card.group === "metals");
  assert.deepEqual(
    metals.map((card) => card.minOvr),
    [50, 65, 75, 85, 88, 90, 93, 95],
  );
  assert.deepEqual(
    metals.slice(0, 3).map((card) => calculateBaseCard(card.minOvr)),
    ["bronze-common", "silver-common", "gold-common"],
  );
  for (const card of metals) {
    assert.throws(
      () =>
        buyShopCard(
          { balance: 100000, ovr: card.minOvr - 1, owned: [] },
          card.id,
        ),
      /Precisas de/,
    );
    assert.deepEqual(
      buyShopCard({ balance: 100000, ovr: card.minOvr, owned: [] }, card.id)
        .owned,
      [card.id],
    );
  }
});
test("nine game editions replace generic editions without erasing owned cards", () => {
  assert.deepEqual(
    SHOP_CARDS.filter((card) => card.group === "games").map((card) => card.id),
    [
      "blackjack-private",
      "roulette-european",
      "cardoso-asphalt",
      "rift-core",
      "glory-night",
      "football-p1",
      "football-p2",
      "football-p3",
      "football-p4",
    ],
  );
  const owned = SHOP_ARCHIVED_CARDS.map((card) => card.id);
  assert.deepEqual(
    buyShopCard({ balance: 1000, ovr: 95, owned }, "bronze-foundry").owned,
    [...owned, "bronze-foundry"],
  );
  assert.throws(
    () => buyShopCard({ balance: 100000, ovr: 99, owned: [] }, owned[0]),
    /não existe/,
  );
});
test("card preview escapes identity and repeated previews have unique paint ids", () => {
  const card = SHOP_CARDS[0];
  const first = renderCasinoShopCard(card, {
    name: "<img src=x onerror=alert(1)>",
    position: "<script>",
  });
  const second = renderCasinoShopCard(card);
  assert.ok(!first.includes("<img"));
  assert.ok(first.includes("&lt;img"));
  assert.notEqual(
    first.match(/id="([^"]+)-metal"/)[1],
    second.match(/id="([^"]+)-metal"/)[1],
  );
});

test("Football premium editions require 70 OVR and start at 8000 DJC", () => {
  const cards = SHOP_CARDS.filter(card => card.id.startsWith("football-p"));
  assert.deepEqual(cards.map(card => card.price), [8000, 10000, 12000, 15000]);
  for (const card of cards) {
    assert.equal(card.minOvr, 70);
    assert.throws(() => buyShopCard({balance: 100000, ovr: 69, owned: []}, card.id), /70 OVR/);
    assert.deepEqual(buyShopCard({balance: card.price, ovr: 70, owned: []}, card.id), {balance: 0, ovr: 70, owned: [card.id]});
  }
});

test("premium finishes preserve player identity without embedding slot symbols", () => {
  const cards = SHOP_CARDS.filter((card) => card.id.startsWith("football-p"));
  const seenIds = new Set();
  for (const card of cards) {
    for (let repeat = 0; repeat < 2; repeat++) {
      const markup = renderCasinoShopCard(card, {
        name: "JOÃO & MIGUEL",
        ovr: 87,
        position: "GR",
      });
      assert.ok(!markup.includes("<image"), `${card.id} embeds a symbol`);
      assert.ok(markup.includes("JOÃO &amp; MIGUEL"));
      assert.ok(markup.includes("87 OVR, GR"));
      const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
      for (const id of ids) {
        assert.ok(!seenIds.has(id), `duplicate SVG id: ${id}`);
        seenIds.add(id);
      }
      for (const [, reference] of markup.matchAll(/url\(#([^)]+)\)/g)) {
        assert.ok(ids.includes(reference), `missing SVG paint: ${reference}`);
      }
    }
  }
});
