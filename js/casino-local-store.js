// Each local settlement commits money and the complete game snapshot together.
// No localStorage fallback: a failed durable write must stop the next spin.
let database;
import { CASINO_EDITION } from "./casino-economy.js";
export function casinoDatabase() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open(`peladinhas-casino-${CASINO_EDITION}`, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("sessions");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || Error("Armazenamento local indisponível."));
      request.onblocked = () =>
        reject(
          Error(
            "Fecha as outras abas para preparar o armazenamento do casino.",
          ),
        );
    }).catch((error) => {
      database = undefined;
      throw error;
    });
  return database;
}
export async function readCasinoLocal(uid) {
  const db = await casinoDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readonly"),
      request = tx.objectStore("sessions").get(uid);
    let value;
    request.onsuccess = () => {
      value = request.result;
    };
    tx.oncomplete = () => resolve(value);
    tx.onerror = tx.onabort = () =>
      reject(tx.error || Error("Não foi possível ler o progresso local."));
  });
}
export async function writeCasinoLocal(uid, value) {
  const db = await casinoDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readwrite", {
      durability: "strict",
    });
    tx.objectStore("sessions").put(value, uid);
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () =>
      reject(
        tx.error ||
          Error(
            "Não foi possível guardar o progresso local. Não voltes a jogar antes de recuperar.",
          ),
      );
  });
}
