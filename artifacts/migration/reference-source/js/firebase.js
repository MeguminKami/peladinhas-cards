import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { firebaseConfig } from "./config.js";
const configured = !Object.values(firebaseConfig).some((v) =>
  String(v).startsWith("YOUR_"),
);
export let app, auth, db, storage;
if (configured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  setPersistence(auth, browserLocalPersistence).catch((error) =>
    console.warn("Persistência de autenticação indisponível", error.code),
  );
}
export { configured };
