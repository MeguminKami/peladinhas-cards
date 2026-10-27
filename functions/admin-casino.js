import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { walletCall } from "./casino.js";
import { currentCasinoWallet } from "../js/casino-economy.js";

export function adminCasinoFunctions() {
  const getCasinoPlayerBalance = walletCall(async (request, admin) => {
    if (admin.role !== "admin")
      throw new HttpsError("permission-denied", "Apenas administradores podem consultar este saldo.");
    const input = request.data;
    if (!input || typeof input !== "object" || Array.isArray(input) ||
        Object.keys(input).some(key => key !== "uid") ||
        typeof input.uid !== "string" || !/^[\w-]{1,128}$/.test(input.uid))
      throw new HttpsError("invalid-argument", "Escolhe um jogador válido.");
    const snapshot = await getFirestore().doc(`casinoWallets/${input.uid}`).get();
    return { uid: input.uid, balance: currentCasinoWallet(snapshot.data()).balance };
  }, { read: true });
  return { getCasinoPlayerBalance };
}
