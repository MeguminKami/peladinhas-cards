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
test("five game editions replace generic editions without erasing owned cards", () => {
  assert.deepEqual(
    SHOP_CARDS.filter((card) => card.group === "games").map((card) => card.id),
    [
      "blackjack-private",
      "roulette-european",
      "cardoso-asphalt",
      "rift-core",
      "glory-night",
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
