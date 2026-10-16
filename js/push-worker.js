/* Classic service-worker companion. No Firebase credentials or SDK are needed here. */
(() => {
  const base = new URL("./", self.location.href);
  const ackURL =
    "https://europe-west1-pedalinhas-cards.cloudfunctions.net/ackPushNotification";
  const databaseName = `peladinhas-push:${base.pathname}`;
  let database;
  const open = () =>
    (database ||= new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        for (const name of ["state", "acknowledgements"])
          if (!request.result.objectStoreNames.contains(name))
            request.result.createObjectStore(name);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        database = null;
        reject(request.error);
      };
    }));
  async function store(name, mode, work) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(name, mode),
        request = work(transaction.objectStore(name));
      transaction.oncomplete = () => resolve(request?.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  const state = (key) => store("state", "readonly", (s) => s.get(key));
  const putState = (key, value) =>
    store("state", "readwrite", (s) => s.put(value, key));
  const tag = (uid, id) => `peladinhas:${uid}:${id}`;
  const valid = (data) =>
    data?.version === 1 &&
    data.type === "league-notification" &&
    typeof data.uid === "string" &&
    data.uid.length <= 128 &&
    typeof data.notificationId === "string" &&
    data.notificationId.length <= 256 &&
    /^[a-f0-9]{64}$/.test(data.receiptId || "") &&
    /^[A-Za-z0-9_-]{43}$/.test(data.receiptToken || "") &&
    data.ackURL === ackURL;
  async function badge(count) {
    try {
      if (count > 0) await self.navigator?.setAppBadge?.(count);
      else await self.navigator?.clearAppBadge?.();
    } catch {
      /* Badging is a progressive enhancement. */
    }
  }
  async function closeRead(uid, ids) {
    const wanted = new Set(ids);
    const notifications = await self.registration.getNotifications();
    notifications
      .filter((n) => n.data?.uid === uid && wanted.has(n.data?.notificationId))
      .forEach((n) => n.close());
    const remaining = notifications.filter(
      (n) => n.data?.uid === uid && !wanted.has(n.data?.notificationId),
    );
    await badge(remaining.length);
  }
  async function flush() {
    const pending = await store("acknowledgements", "readonly", (s) =>
      s.getAll(),
    );
    for (const item of pending.slice(0, 30)) {
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(ackURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              receiptId: item.receiptId,
              receiptToken: item.receiptToken,
            },
          }),
          signal: controller.signal,
        });
        if (response.ok || [400, 401, 403, 404].includes(response.status)) {
          await store("acknowledgements", "readwrite", (s) =>
            s.delete(item.receiptId),
          );
          const result = response.ok
            ? await response.json().catch(() => null)
            : null;
          if (result?.result?.read) {
            const clients = await self.clients.matchAll({
              type: "window",
              includeUncontrolled: true,
            });
            for (const client of clients)
              if (client.url.startsWith(base.href))
                client.postMessage({
                  type: "PUSH_READ_SYNCED",
                  uid: item.uid,
                  notificationId: item.notificationId,
                });
          }
        }
      } catch {
        /* Keep the read receipt for the next connection. */
      } finally {
        clearTimeout(timer);
      }
    }
  }
  async function queueRead(data) {
    if (!valid(data)) return;
    await closeRead(data.uid, [data.notificationId]);
    await store("acknowledgements", "readwrite", (s) =>
      s.put(
        {
          receiptId: data.receiptId,
          receiptToken: data.receiptToken,
          uid: data.uid,
          notificationId: data.notificationId,
        },
        data.receiptId,
      ),
    );
    try {
      await self.registration.sync?.register("peladinhas-push-reads");
    } catch {}
  }
  async function acknowledge(data) {
    await queueRead(data);
    await flush();
  }
  async function openDestination(data) {
    const owner = await state("owner");
    const target = new URL(base);
    target.hash =
      owner?.uid === data.uid &&
      typeof data.href === "string" &&
      data.href.startsWith("#/")
        ? data.href
        : "#/notifications";
    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    const client =
      clients.find((c) => c.url.startsWith(base.href) && c.focused) ||
      clients.find((c) => c.url.startsWith(base.href));
    if (client) {
      client.postMessage({
        type: "PUSH_NOTIFICATION_OPEN",
        uid: data.uid,
        notificationId: data.notificationId,
        href: target.hash,
      });
      await client.focus();
      if (client.url !== target.href) await client.navigate(target.href);
    } else await self.clients.openWindow(target.href);
  }
  self.addEventListener("push", (event) => {
    let data;
    try {
      data = event.data?.json();
    } catch {
      return;
    }
    if (!valid(data)) return;
    event.waitUntil(
      (async () => {
        const owner = await state("owner");
        // A device is explicitly detached on sign-out. Never expose another account's data.
        if (!owner || owner.uid !== data.uid) return;
        if (Number.isFinite(data.expiresAt) && data.expiresAt <= Date.now()) return;
        if (await state(`shown:${data.receiptId}`)) return;
        if (await store("acknowledgements", "readonly", s => s.get(data.receiptId))) return;
        const readAt = await state(`read:${data.uid}:${data.notificationId}`);
        if (readAt && Number.isFinite(data.createdAt) && data.createdAt <= readAt) return;
        await self.registration.showNotification(
          String(data.title || "Peladinhas Cards").slice(0, 120),
          {
            body: String(data.body || "Tens novidades na tua liga.").slice(
              0,
              500,
            ),
            icon: new URL("assets/pwa/icon-192.png", base).href,
            badge: new URL("assets/pwa/notification-badge.png", base).href,
            tag: tag(data.uid, data.notificationId),
            renotify: false,
            data,
            actions: [
              { action: "open", title: "Abrir na app" },
              { action: "read", title: "Marcar como lida" },
            ],
          },
        );
        await putState(`shown:${data.receiptId}`, Date.now());
        await badge(
          (await self.registration.getNotifications()).filter(
            (n) => n.data?.uid === data.uid,
          ).length,
        );
      })(),
    );
  });
  self.addEventListener("notificationclick", (event) => {
    const data = event.notification.data;
    event.notification.close(); // Immediate, including when the network is unavailable.
    if (!valid(data)) return;
    event.waitUntil(
      Promise.allSettled([
        acknowledge(data),
        ...(event.action === "read" ? [] : [openDestination(data)]),
      ]),
    );
  });
  self.addEventListener("sync", (event) => {
    if (event.tag === "peladinhas-push-reads") event.waitUntil(flush());
  });
  self.addEventListener("message", (event) => {
    const data = event.data || {};
    if (event.source?.url && !event.source.url.startsWith(base.href)) return;
    const run = async () => {
      if (data.type === "PUSH_OWNER") {
        const previous = await state("owner");
        if (previous?.uid && previous.uid !== data.uid) {
          const notifications = await self.registration.getNotifications();
          notifications.forEach((n) => n.close());
        }
        await putState("owner", { uid: data.uid, deviceId: data.deviceId });
      } else if (data.type === "PUSH_CLEAR_READ") {
        const owner = await state("owner");
        if (owner?.uid === data.uid) {
          const wanted = new Set(Array.isArray(data.ids) ? data.ids : []);
          await Promise.all([...wanted].map(id => putState(`read:${data.uid}:${id}`, Date.now())));
          const native = (await self.registration.getNotifications()).filter(
            (n) =>
              n.data?.uid === data.uid && wanted.has(n.data?.notificationId),
          );
          await closeRead(data.uid, [...wanted]);
          for (const notification of native)
            if (valid(notification.data)) await queueRead(notification.data);
        }
        if (
          owner?.uid === data.uid &&
          Number.isSafeInteger(data.count) &&
          data.count >= 0
        )
          await badge(data.count);
      } else if (data.type === "PUSH_DISABLE") {
        await putState("owner", null);
        (await self.registration.getNotifications()).forEach((n) => n.close());
        await badge(0);
      } else if (data.type === "PUSH_FLUSH_READS") {
        event.ports?.[0]?.postMessage({ ok: true });
        await flush();
        return;
      }
      event.ports?.[0]?.postMessage({ ok: true });
      if (data.type === "PUSH_CLEAR_READ") await flush();
    };
    event.waitUntil(
      run().catch(() => event.ports?.[0]?.postMessage({ ok: false })),
    );
  });
})();
