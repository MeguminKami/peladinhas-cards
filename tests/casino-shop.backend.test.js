import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import {
  getCasinoShop,
  buyCasinoCard,
  casinoSession,
  selectWeeklyCard,
} from "../functions/index.js";
import { newCasinoWallet, DJABUCOIN } from "../js/casino-economy.js";
import { cardWeek } from "../js/card-week.js";
import { buildCardCatalog } from "../js/card-catalog-model.js";
import {
  availableCardAchievements,
  mergeCardAchievements,
} from "../js/card-achievements.js";
const db = getFirestore();
const req = (uid, data = {}) => ({
  auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
  data,
});
async function seed(ovr = 80, balance = 30000 * DJABUCOIN.scale) {
  const uid = `shop-${randomUUID()}`;
  await db
    .doc(`users/${uid}`)
    .set({ uid, role: "member", disabled: false, displayName: "Jogador" });
  await db.doc(`casinoWallets/${uid}`).set({ ...newCasinoWallet(), balance });
  await db
    .doc(`weeklyCards/${uid}`)
    .set({
      uid,
      weekId: cardWeek().weekId,
      hasCard: true,
      ovr,
      locked: true,
      stats: { pace: ovr },
    });
  await db
    .doc(`cardCollections/${uid}`)
    .set({
      uid,
      officialSince: "2025-01-01",
      awards: [
        { id: "path-test", duration: "permanent", earnedAt: "2025-01-01" },
      ],
    });
  return uid;
}
test("shop debit and permanent ownership are atomic and retries never charge twice", async () => {
  const uid = await seed();
  const weeklyBefore = (await db.doc(`weeklyCards/${uid}`).get()).data();
  const results = await Promise.all(
    Array.from({ length: 4 }, () =>
      buyCasinoCard.run(req(uid, { cardId: "football-p1" })),
    ),
  );
  assert.equal(results.filter((r) => !r.alreadyOwned).length, 1);
  const view = await getCasinoShop.run(req(uid));
  assert.equal(view.balance, 22000 * DJABUCOIN.scale);
  assert.deepEqual(view.owned, ["football-p1"]);
  const collection = (await db.doc(`cardCollections/${uid}`).get()).data();
  assert.equal(collection.officialSince, "2025-01-01");
  assert.equal(collection.awards.length, 2);
  assert.equal(
    availableCardAchievements(mergeCardAchievements(collection.awards, []))
      .length,
    2,
  );
  assert.deepEqual(
    (await db.doc(`weeklyCards/${uid}`).get()).data(),
    weeklyBefore,
  );
  const catalog = buildCardCatalog({
    users: [{ uid }],
    catalogSources: { collections: [collection] },
  });
  assert.equal(
    catalog.entries.find((c) => c.id === "football-p1").holders[0].uid,
    uid,
  );
  assert.equal(catalog.entries.find((c) => c.id === "football-p2").seen, false);
  const wallet = (await db.doc(`casinoWallets/${uid}`).get()).data();
  assert.equal(wallet.recent.filter((r) => r.kind === "shop").length, 1);
});

test("shop returns the weekly identity, portrait, all attributes and permanent weekly comparison", async () => {
  const uid = await seed();
  await db.doc(`users/${uid}`).update({ countryCode: "PT", primaryPosition: "ALA" });
  const stats = { pace: 91, shooting: 79, passing: 78, dribbling: 77, defending: 76, physical: 75, goalkeeping: 94, stamina: 73 };
  const cardPhoto = { photoURL: "https://example.com/player.png", design: { focusX: 45, photoScale: 120 } };
  await db.doc(`weeklyCards/${uid}`).update({ stats, primaryPosition: "GR", cardPhoto, permanentStats: stats, permanentOvr: 80 });
  const previousWeek = cardWeek(new Date(+cardWeek().opensAt - 1)).weekId;
  await db.doc(`users/${uid}/cardHistory/${previousWeek}`).set({ uid, weekId: previousWeek, stats, permanentStats: { ...stats, pace: 89 }, permanentOvr: 78, ovr: 78 });
  const { player } = await getCasinoShop.run(req(uid));
  assert.equal(player.countryCode, "PT");
  assert.equal(player.primaryPosition, "GR");
  assert.deepEqual(player.stats, stats);
  assert.deepEqual(player.photoDesign, cardPhoto.design);
  assert.equal(player.photoURL, cardPhoto.photoURL);
  assert.equal(player.previousStats.pace, 89);
  assert.equal(player.ovrDelta, 2);
  const bought = await buyCasinoCard.run(req(uid, { cardId: "football-p1" }));
  assert.deepEqual(bought.player, player);
});
test("server rejects forged prices, unavailable editions, missing official card, OVR and balance failures", async () => {
  const uid = await seed(69);
  await assert.rejects(
    buyCasinoCard.run(req(uid, { cardId: "football-p1" })),
    /70 OVR/,
  );
  await assert.rejects(
    buyCasinoCard.run(req(uid, { cardId: "football-p1", price: 1 })),
  );
  await assert.rejects(buyCasinoCard.run(req(uid, { cardId: "casino-royal" })));
  await db.doc(`weeklyCards/${uid}`).update({ ovr: 70 });
  await db.doc(`casinoWallets/${uid}`).update({ balance: 799999 });
  await assert.rejects(
    buyCasinoCard.run(req(uid, { cardId: "football-p1" })),
    /Saldo insuficiente/,
  );
  await db.doc(`casinoWallets/${uid}`).update({ balance: 800000 });
  const result = await buyCasinoCard.run(req(uid, { cardId: "football-p1" }));
  assert.equal(result.balance, 0);
  await db.doc(`weeklyCards/${uid}`).update({ weekId: "2000-W01" });
  await assert.rejects(
    buyCasinoCard.run(req(uid, { cardId: "bronze-foundry" })),
    /carta oficial/,
  );
  await db.doc(`users/${uid}`).update({ disabled: true });
  await assert.rejects(getCasinoShop.run(req(uid)), /Conta indisponível/);
  await assert.rejects(buyCasinoCard.run({ data: { cardId: "football-p1" } }));
});
test("two different concurrent purchases cannot overspend one wallet", async () => {
  const uid = await seed(99, 800000);
  const results = await Promise.allSettled(
    ["gold-vault", "platinum-prism"].map((cardId) =>
      buyCasinoCard.run(req(uid, { cardId })),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const view = await getCasinoShop.run(req(uid));
  assert.ok([300000, 400000].includes(view.balance));
  assert.equal(view.owned.length, 1);
});

test("closing a pre-purchase casino session preserves the shop debit", async () => {
  const uid = await seed(),
    id = randomUUID();
  await casinoSession.run(req(uid, { action: "open", id, owner: uid }));
  await buyCasinoCard.run(req(uid, { cardId: "football-p1" }));
  const closed = await casinoSession.run(
    req(uid, {
      action: "sync",
      id,
      owner: uid,
      sequence: 1,
      spent: 0,
      won: 0,
      release: true,
    }),
  );
  assert.equal(closed.wallet.balance, 2200000);
  const view = await getCasinoShop.run(req(uid));
  assert.equal(view.balance, 2200000);
});

test("only an owner can select a shop edition and locked history stays unchanged", async () => {
  const uid = await seed(),
    weekId = cardWeek().weekId;
  const history = db.doc(`users/${uid}/cardHistory/${weekId}`);
  await history.set({
    uid,
    weekId,
    locked: true,
    selectedCardId: "base",
    ovr: 80,
  });
  const before = (await history.get()).data();
  await assert.rejects(
    selectWeeklyCard.run(req(uid, { weekId, cardId: "football-p1" })),
  );
  await buyCasinoCard.run(req(uid, { cardId: "football-p1" }));
  await selectWeeklyCard.run(req(uid, { weekId, cardId: "football-p1" }));
  assert.equal(
    (await db.doc(`cardSelections/${uid}`).get()).data().selectedCardId,
    "football-p1",
  );
  assert.deepEqual((await history.get()).data(), before);
});
