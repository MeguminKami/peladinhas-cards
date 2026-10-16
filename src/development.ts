/** An installed release must not serve cached CSS/modules over the Vite app. */
export async function prepareDevelopment() {
  if (!import.meta.env.DEV || !('serviceWorker' in navigator)) return false;
  const base = new URL('./', location.href);
  const workerURL = new URL('sw.js', base).href;
  const controlled = navigator.serviceWorker.controller?.scriptURL === workerURL;
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    if (registration.scope !== base.href) continue;
    if (![registration.active, registration.waiting, registration.installing].some(worker => worker?.scriptURL === workerURL)) continue;
    await registration.unregister();
  }
  if ('caches' in window) {
    const prefix = `peladinhas:${base.pathname}:`;
    await Promise.all((await caches.keys()).filter(key => key.startsWith(prefix)).map(key => caches.delete(key)));
  }
  if (controlled) {
    location.reload();
    return true;
  }
  return false;
}
