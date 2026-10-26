import { getFirestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { withPolicy, assertFeature } from "./policy-runtime.js";
import { policyAt } from "../js/system-policy.js";
import { participants } from "../js/utils.js";
import {
  newCasinoWallet,
  awardCasinoMatch,
  DJABUCOIN,
  validateSlotTransaction,
  settleCasinoSlot,
} from "../js/casino-economy.js";
import { createHash } from "node:crypto";
import {
  casinoSessionInput,
  applyCasinoSession,
} from "../js/casino-session-model.js";

// Same identity / revocation / global-mode / App Check gates as policyCall,
// with the quota kept in the wallet's existing atomic write. No separate
// per-operation or global rate-limit documents are read on every spin.
function walletCall(handler, { read = false } = {}) {
  return onCall((request) =>
    withPolicy(async () => {
      if (!request.auth)
        throw new HttpsError("unauthenticated", "Inicia sessão.");
      const user = (
        await getFirestore().doc(`users/${request.auth.uid}`).get()
      ).data();
      if (!user || user.disabled)
        throw new HttpsError("permission-denied", "Conta indisponível.");
      if ((request.auth.token?.auth_time || 0) < (user.tokensValidAfter || 0))
        throw new HttpsError(
          "unauthenticated",
          "A sessão terminou. Volta a iniciar sessão.",
        );
      if (policyAt().security.requireAppCheck && !request.app)
        throw new HttpsError(
          "unauthenticated",
          "Verificação da aplicação necessária.",
        );
      if (!read) assertFeature();
      return handler(request);
    }),
  );
}
function counted(wallet) {
  const minute = Math.floor(Date.now() / 60000);
  const count =
    wallet.requestWindow?.minute === minute ? wallet.requestWindow.count : 0;
  const limit = Math.min(
    policyAt().security.requestsPerMinute,
    policyAt().security.totalRequestsPerMinute,
  );
  if (count >= limit)
    throw new HttpsError(
      "resource-exhausted",
      "Demasiadas operações. Aguarda um minuto.",
      { definitive: true },
    );
  return { ...wallet, requestWindow: { minute, count: count + 1 } };
}

export function casinoFunctions() {
  const casinoSession = walletCall(async (request) => {
    let input;
    try {
      input = casinoSessionInput(request.data);
    } catch (error) {
      throw new HttpsError("invalid-argument", error.message, {
        definitive: true,
      });
    }
    if (input.owner !== request.auth.uid)
      throw new HttpsError(
        "permission-denied",
        "A sessão pertence a outra conta.",
      );
    const db = getFirestore(),
      ref = db.doc(`casinoWallets/${request.auth.uid}`),
      sessionRef = ref.collection("sessions").doc(input.id);
    return db.runTransaction(async (tx) => {
      const [wallet, session] = await tx.getAll(ref, sessionRef);
      let result;
      try {
        result = applyCasinoSession(
          wallet.data() || newCasinoWallet(),
          session.data(),
          input,
        );
      } catch (error) {
        throw new HttpsError("failed-precondition", error.message, {
          definitive: true,
        });
      }
      if (result.write) {
        tx.set(ref, counted(result.wallet));
        tx.set(sessionRef, result.session);
      }
      return result.response;
    });
  });
  const getCasinoWallet = walletCall(
    async (request) => {
      if (Object.keys(request.data || {}).length)
        throw new HttpsError(
          "invalid-argument",
          "A carteira pertence à tua sessão.",
        );
      const db = getFirestore();
      const ref = db.doc(`casinoWallets/${request.auth.uid}`);
      return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) assertFeature();
        const wallet = counted(snapshot.data() || newCasinoWallet());
        tx.set(ref, wallet);
        return wallet;
      });
    },
    { read: true },
  );

  const settleCasinoSlotOperation = walletCall(async (request) => {
    let input;
    try {
      input = validateSlotTransaction(request.data);
    } catch (error) {
      throw new HttpsError("invalid-argument", error.message, {
        definitive: true,
      });
    }
    const db = getFirestore();
    const ref = db.doc(`casinoWallets/${request.auth.uid}`);
    const receiptRef = ref.collection("operations").doc(input.id);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const streamKey = createHash("sha256").update(input.streamId).digest("hex");
    return db.runTransaction(async (tx) => {
      const [snapshot, receipt] = await tx.getAll(ref, receiptRef);
      if (!snapshot.exists)
        throw new HttpsError(
          "failed-precondition",
          "Abre a carteira antes de jogar.",
          { definitive: true },
        );
      const wallet = counted(snapshot.data());
      if (receipt.exists) {
        if (receipt.data().fingerprint !== fingerprint)
          throw new HttpsError(
            "already-exists",
            "Este pedido já foi usado com outros valores.",
            { definitive: true },
          );
        tx.set(ref, wallet);
        return wallet;
      }
      // Old bundles can only recover receipts already applied before upgrade.
      if (wallet.sessionProtocol >= 2 || wallet.activeCasinoSession)
        throw new HttpsError(
          "failed-precondition",
          "Atualiza a página para usar a carteira local.",
          { definitive: true },
        );
      let next;
      const streams = wallet.slotStreams || {};
      const prior = streams[streamKey];
      try {
        if (!prior && Object.keys(streams).length >= 64)
          throw Error(
            "Limite de dispositivos da slot atingido. Contacta o apoio.",
          );
        if (
          prior &&
          (input.roundId < prior.roundId ||
            (input.roundId > prior.roundId && input.spin !== 1))
        )
          throw Error("A sequência da ronda não corresponde à carteira.");
        next = settleCasinoSlot(
          wallet,
          input,
          prior?.roundId === input.roundId ? prior : undefined,
        );
        next.wallet.slotStreams = {
          ...streams,
          [streamKey]: { ...next.round, roundId: input.roundId },
        };
      } catch (error) {
        throw new HttpsError("failed-precondition", error.message, {
          definitive: true,
        });
      }
      tx.set(ref, next.wallet);
      tx.create(receiptRef, {
        fingerprint,
        debit: input.debit,
        credit: input.credit,
        at: Date.now(),
      });
      return next.wallet;
    });
  });

  // Filter the event before any read. No league scan, history backfill or poll.
  const onCasinoGame = onDocumentWritten(
    { document: "games/{gid}", retry: true },
    async (event) => {
      const before = event.data?.before?.data();
      const after = event.data?.after?.data();
      if (
        !after ||
        after.deleting ||
        after.status !== "closed" ||
        before?.status === "closed"
      )
        return;
      const db = getFirestore();
      for (const uid of new Set(participants(after))) {
        await db.runTransaction(async (tx) => {
          const receipt = db.doc(
            `casinoWallets/${uid}/matchAwards/${event.params.gid}`,
          );
          const walletRef = db.doc(`casinoWallets/${uid}`);
          const [awarded, user, wallet] = await tx.getAll(
            receipt,
            db.doc(`users/${uid}`),
            walletRef,
          );
          if (awarded.exists || !user.exists || user.data().disabled) return;
          const next = awardCasinoMatch(wallet.data(), event.params.gid);
          tx.set(walletRef, next);
          tx.create(receipt, { amount: DJABUCOIN.perMatch, at: Date.now() });
        });
      }
    },
  );
  return {
    casinoSession,
    getCasinoWallet,
    settleCasinoSlot: settleCasinoSlotOperation,
    onCasinoGame,
  };
}
