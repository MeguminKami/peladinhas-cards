/* Build replaces these two values with a content hash and the complete public inventory. */
importScripts('./js/push-worker.js');
const VERSION = "2026-10-review-1";
const PRECACHE = [
  "offline.html",
  "js/offline.js",
  "css/styles.css",
  "css/experience.css",
  "assets/logo.svg",
  "assets/fonts/manrope-400.woff",
  "assets/fonts/manrope-600.woff",
  "assets/fonts/manrope-700.woff",
  "assets/fonts/manrope-800.woff",
  "manifest.webmanifest",
  "assets/pwa/icon-192.png",
  "assets/pwa/icon-512.png",
  "assets/pwa/maskable-512.png",
  "assets/pwa/apple-touch-icon.png",
];
const BASE = new URL("./", self.location.href);
// Scope belongs to the cache name: other demos on the same host keep their caches.
const PREFIX = `peladinhas:${BASE.pathname}:`;
const CACHE = PREFIX + VERSION;
const urlFor = (path) => new URL(path, BASE).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map(urlFor))),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
// Updates are activated only after the user chooses to reload, protecting forms.
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== BASE.origin ||
    !url.pathname.startsWith(BASE.pathname)
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (!response.ok) return response;
          // Keep the document and modules on the same installed release until
          // the user activates an update. Still check the network for live data.
          if (
            url.pathname === BASE.pathname ||
            url.pathname === new URL("index.html", BASE).pathname
          ) {
            const shell = await (
              await caches.open(CACHE)
            ).match(urlFor("index.html"));
            if (shell) return shell;
          }
          return response;
        } catch {
          return (await caches.open(CACHE)).match(urlFor("offline.html"));
        }
      })(),
    );
    return;
  }
  const path = url.pathname.slice(BASE.pathname.length);
  // No APIs, Firebase requests, private photographs or responses carrying user data.
  if (!PRECACHE.includes(path) || url.search) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(urlFor(path));
      return cached || fetch(request);
    })(),
  );
});
