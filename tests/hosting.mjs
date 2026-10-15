import assert from "node:assert/strict";
const base = "http://127.0.0.1:5000";
for (const path of [
  "/",
  "/js/app.js",
  "/js/ovr-audit.js",
  "/js/config.js",
  "/css/styles.css",
  "/assets/logo.svg",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline.html",
  "/assets/pwa/icon-512.png",
  "/assets/pwa/apple-touch-icon.png",
]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get("cache-control") || "", /no-cache/, path);
}
for (const path of [
  "/functions/index.js",
  "/tests/backend.test.js",
  "/scripts/deploy.mjs",
  "/.firebaserc",
  "/firebase.json",
  "/package.json",
  "/firestore.rules",
  "/DEPLOY.md",
  "/docs/guides/deployment.md",
  "/design/sources/playstyles/ps_fin.png",
  "/.secret.local",
]) {
  assert.equal(
    (await fetch(base + path)).status,
    404,
    `${path} não deve ser público`,
  );
}
console.log(
  "Hosting: frontend acessível, revalidação de cache ativa e ficheiros internos não publicados.",
);
