import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { getFunctions, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";
import * as runtimeConfig from "./config.js";
import { firebaseMode } from "./runtime-environment.js";
const { firebaseConfig } = runtimeConfig;
const mode = firebaseMode(location.hostname, runtimeConfig.runtimeMode);
const configured = !Object.values(firebaseConfig).some((v) =>
  String(v).startsWith("YOUR_"),
);
export let app, auth, db, storage;
if (configured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  if (mode === "emulator") {
    if (!firebaseConfig.projectId.startsWith("demo-")) throw Error("Integração local exige um projeto demo-.");
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8085);
    connectFunctionsEmulator(getFunctions(app, "europe-west1"), "127.0.0.1", 5001);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }
  setPersistence(auth, browserLocalPersistence).catch((error) =>
    console.warn("Persistência de autenticação indisponível", error.code),
  );
}
export { configured };

let systemAppCheck=null, systemAppCheckKey="";
export async function configureAppCheck(policy) {
  if (mode !== "production") return;
  if(!app || !policy?.security?.appCheckSiteKey) return;
  const {initializeAppCheck, ReCaptchaV3Provider}=await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check.js");
  if(systemAppCheck && systemAppCheckKey!==policy.security.appCheckSiteKey) {location.reload();return;}
  if(!systemAppCheck) {systemAppCheck=initializeAppCheck(app,{provider:new ReCaptchaV3Provider(policy.security.appCheckSiteKey),isTokenAutoRefreshEnabled:true});systemAppCheckKey=policy.security.appCheckSiteKey;}
}
