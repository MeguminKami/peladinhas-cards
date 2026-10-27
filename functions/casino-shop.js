import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { walletCall } from "./casino.js";
import { SHOP_CARDS } from "../js/casino-shop-catalog.js";
import { currentCasinoWallet, DJABUCOIN } from "../js/casino-economy.js";
import { cardWeek } from "../js/card-week.js";

const owned = (collection) =>
  (collection?.awards || [])
    .filter((a) => a.source === "casino-shop" && !a.revokedAt)
    .map((a) => a.id);
const playerView = (weekly, user) => ({
  displayName: user.displayName || user.username || "Jogador",
  photoURL: weekly?.cardPhoto?.photoURL || user.photoURL || "",
  photoDesign: weekly?.cardPhoto?.design || null,
  primaryPosition: weekly?.primaryPosition || user.primaryPosition || "ALA",
  stats: weekly?.stats || {},
  hasCard:
    !!weekly &&
    weekly.hasCard !== false &&
    weekly.weekId === cardWeek().weekId &&
    Number.isFinite(weekly.ovr),
  ovr: Number.isFinite(weekly?.ovr) ? weekly.ovr : 0,
});

export function casinoShopFunctions() {
  const getCasinoShop = walletCall(
    async (request, user) => {
      if (Object.keys(request.data || {}).length)
        throw new HttpsError("invalid-argument", "Pedido inválido.");
      const db = getFirestore(),
        uid = request.auth.uid;
      const [wallet, collection, weekly] = await db.getAll(
        db.doc(`casinoWallets/${uid}`),
        db.doc(`cardCollections/${uid}`),
        db.doc(`weeklyCards/${uid}`),
      );
      return {
        balance: currentCasinoWallet(wallet.data()).balance,
        owned: owned(collection.data()),
        player: playerView(weekly.data(), user),
      };
    },
    { read: true },
  );

  const buyCasinoCard = walletCall(async (request, user) => {
    const input = request.data;
    if (
      !input ||
      Object.keys(input).some((k) => k !== "cardId") ||
      typeof input.cardId !== "string"
    )
      throw new HttpsError("invalid-argument", "Carta inválida.");
    const card = SHOP_CARDS.find((card) => card.id === input.cardId);
    if (!card)
      throw new HttpsError("invalid-argument", "Esta carta não está à venda.");
    const db = getFirestore(),
      uid = request.auth.uid;
    const walletRef = db.doc(`casinoWallets/${uid}`),
      collectionRef = db.doc(`cardCollections/${uid}`);
    return db.runTransaction(async (tx) => {
      const [walletSnap, collectionSnap, weekly] = await tx.getAll(
        walletRef,
        collectionRef,
        db.doc(`weeklyCards/${uid}`),
      );
      const wallet = currentCasinoWallet(walletSnap.data()),
        collection = collectionSnap.data();
      const player = playerView(weekly.data(), user),
        ids = owned(collection);
      // Ownership itself is the durable receipt: retries can never debit twice.
      if (ids.includes(card.id))
        return {
          balance: wallet.balance,
          owned: ids,
          player,
          alreadyOwned: true,
        };
      if (!player.hasCard)
        throw new HttpsError(
          "failed-precondition",
          "Precisas de uma carta oficial desta semana para comprar.",
        );
      if (player.ovr < card.minOvr)
        throw new HttpsError(
          "failed-precondition",
          `Precisas de ${card.minOvr} OVR para esta carta.`,
        );
      const cost = card.price * DJABUCOIN.scale;
      if (wallet.balance < cost)
        throw new HttpsError(
          "failed-precondition",
          "Saldo insuficiente. Confirma o saldo do casino antes de comprar.",
        );
      const at = new Date().toISOString(),
        balance = wallet.balance - cost;
      const award = {
        id: card.id,
        name: card.name,
        duration: "permanent",
        earnedAt: at,
        sourceDate: at,
        source: "casino-shop",
        price: card.price,
        currency: "DJC",
      };
      tx.set(walletRef, {
        ...wallet,
        balance,
        revision: wallet.revision + 1,
        recent: [
          {
            id: `shop:${card.id}`,
            kind: "shop",
            cardId: card.id,
            amount: -cost,
            at: Date.now(),
          },
          ...wallet.recent,
        ].slice(0, DJABUCOIN.recentLimit),
      });
      // Existing collection consumers already expose these owners to the album.
      // Merge preserves achievements and does not rewrite any weekly snapshot.
      tx.set(
        collectionRef,
        { uid, awards: [...(collection?.awards || []), award] },
        { merge: true },
      );
      return { balance, owned: [...ids, card.id], player, alreadyOwned: false };
    });
  });
  return { getCasinoShop, buyCasinoCard };
}
