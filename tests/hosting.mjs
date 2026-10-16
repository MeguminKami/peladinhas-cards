import assert from "node:assert/strict";
const base = process.env.HOSTING_TEST_URL || "http://127.0.0.1:5000";
for (const path of [
  "/",
  "/js/offline.js",
  "/js/push-worker.js",
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
const document = await fetch(base + '/').then(response => response.text());
assert.doesNotMatch(document, /\.\/js\/app\.js/, 'Hosting serves the React entry');
const modules = [...document.matchAll(/(?:src|href)="(\.\/assets\/[^" ]+\.js)"/g)].map(match => match[1]);
assert.ok(modules.length, 'The Vite entry and preloads are present');
for (const module of modules) {
  const response = await fetch(new URL(module, base + '/'));
  assert.equal(response.status, 200, module);
  assert.match(response.headers.get('content-type') || '', /javascript/);
  assert.doesNotMatch(await response.text(), /BEGIN (?:RSA )?PRIVATE KEY|from ["']firebase-admin/);
}
for (const path of [
  "/js/app.js",
  "/src/main.tsx",
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
