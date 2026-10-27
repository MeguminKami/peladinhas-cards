import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { randomUUID } from "node:crypto";
import { walletCall } from "./casino.js";
import {
  tableCommand,
  walletIds,
  playerView,
  tableView,
  expiredPlayer,
  roomExpired,
} from "./blackjack-table.js";
import { currentCasinoWallet, CASINO_EDITION } from "../js/casino-economy.js";

export const BLACKJACK_PRIVATE = "casinoBlackjackPrivate/main";
export const BLACKJACK_PUBLIC = "casinoBlackjack/main";
function neededWallets(table, input, uid, now) {
  if (!table) return uid ? [uid] : [];
  if (roomExpired(table, now)) return walletIds(table, uid);
  if (input.action === "heartbeat") return [];
  const deadline = table.deadline && table.deadline <= now;
  const expired = table.players.some((p) => expiredPlayer(p, table, now));
  if (deadline || expired) return walletIds(table, uid);
  if (input.action === "tick") return [];
  const r = table.session.round;
  if (["join", "occupy", "leave"].includes(input.action)) return [uid];
  if (
    input.action === "bet" &&
    table.players.some((p) => p.uid !== uid && !p.bet && !p.leaving)
  )
    return [uid];
  if (
    r?.phase === "play" &&
    r.seats.flatMap((p) => p.hands).filter((h) => !h.done).length > 1
  )
    return [uid];
  if (
    r?.phase === "insurance" &&
    r.seats.filter((p) => p.insured === null).length > 1
  )
    return [uid];
  return walletIds(table, uid);
}
export async function runBlackjack(
  input,
  uid,
  name,
  now = Date.now(),
  db = getFirestore(),
  forcedShoe,
) {
  const ref = db.doc(BLACKJACK_PRIVATE),
    publicRef = db.doc(BLACKJACK_PUBLIC);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    // A reset discards the previous edition's table and wagers. Never refund
    // old stakes into the new wallets or leave the shared table unusable.
    const old = snapshot.data()?.edition === CASINO_EDITION ? snapshot.data() : null;
    if (!old && input.action !== "join") {
      if (snapshot.exists) { tx.delete(ref); tx.delete(publicRef); }
      return { table: null, balance: null, seat: null };
    }
    if (input.action === "balance") {
      if (input.table !== old.id || !old.players.some((p) => p.uid === uid))
        throw new HttpsError(
          "failed-precondition",
          "A tua sessão na mesa terminou.",
        );
      const wallet = await tx.get(db.doc(`casinoWallets/${uid}`));
      return {
        ...playerView(old, uid, currentCasinoWallet(wallet.data()).balance),
        serverNow: now,
      };
    }
    // Presence does not read wallets. Financial actions include every possible recipient,
    // because a decision/timeout may finish the round in the same transaction.
    const ids = neededWallets(old, input, uid, now);
    const docs = ids.length
      ? await tx.getAll(...ids.map((id) => db.doc(`casinoWallets/${id}`)))
      : [];
    const wallets = Object.fromEntries(
      ids.map((id, i) => [id, currentCasinoWallet(docs[i].data())]),
    );
    let result;
    try {
      result = tableCommand(input, uid, name, old, wallets, now, forcedShoe);
    } catch (e) {
      throw new HttpsError("failed-precondition", e.message);
    }
    if (result.changed) {
      for (const [id, wallet] of Object.entries(result.wallets))
        tx.set(db.doc(`casinoWallets/${id}`), wallet);
      if (result.closed) {
        tx.delete(ref);
        tx.delete(publicRef);
      } else {
        tx.set(ref, result.table);
        if (result.publicChanged) tx.set(publicRef, tableView(result.table));
      }
    }
    const balance = uid
      ? ((result.wallets[uid] || wallets[uid])?.balance ?? null)
      : null;
    return {
      ...playerView(result.closed ? null : result.table, uid, balance),
      stale: !!result.stale,
      serverNow: now,
    };
  });
}

export function blackjackFunctions() {
  const blackjackAction = walletCall((request, user) => {
    const input = request.data;
    if (
      !input ||
      Object.keys(input).some(
        (k) =>
          !["action", "id", "table", "revision", "amount", "seat"].includes(k),
      ) ||
      (input.action === "tick" && !input.table)
    )
      throw new HttpsError("invalid-argument", "Pedido inválido.");
    return runBlackjack(
      input,
      request.auth.uid,
      user.displayName || user.username,
    );
  });

  // A single fixed document: empty casino costs one read/minute, never a collection scan.
  // Connected clients wake deadlines precisely; this is the recovery path when everyone leaves.
  const blackjackSweep = onSchedule(
    { schedule: "every 1 minutes", region: "europe-west1", maxInstances: 1 },
    async () => {
      const snapshot = await getFirestore().doc(BLACKJACK_PRIVATE).get();
      if (!snapshot.exists) return;
      const table = snapshot.data();
      await runBlackjack(
        { action: "tick", table: table.id, id: randomUUID() },
        null,
        null,
      );
    },
  );
  return { blackjackAction, blackjackSweep };
}
