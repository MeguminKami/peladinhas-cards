// Only tiny revision documents are observed. Hidden pages own no listener or
// refresh timer; returning to the page verifies server state once.
export function startRevisionUpdates({
  subscribe,
  refresh,
  versions = [],
  validUntil,
  ignoreInitial = false,
  page = globalThis.document,
  connection = globalThis,
  scheduler = globalThis,
  isCurrent = () => true,
}) {
  let stopped = false,
    dispose,
    timer,
    dueTimer,
    running = false,
    dirty = false;
  const live = () =>
    !stopped && isCurrent() && page.visibilityState === "visible";
  const detach = () => {
    dispose?.();
    dispose = null;
    scheduler.clearTimeout(timer);
    scheduler.clearTimeout(dueTimer);
  };
  const schedule = (delay = 800) => {
    dirty = true;
    if (!live() || running) return;
    scheduler.clearTimeout(timer);
    timer = scheduler.setTimeout(run, delay);
  };
  const arm = () => {
    scheduler.clearTimeout(dueTimer);
    if (live() && Number.isFinite(validUntil))
      dueTimer = scheduler.setTimeout(
        () => schedule(0),
        Math.max(100, Math.min(2147483647, validUntil - Date.now() + 100)),
      );
  };
  async function run() {
    if (!live() || running) return;
    dirty = false;
    running = true;
    try {
      const result = await refresh(live);
      if (!live()) return;
      if (result?.versions) versions = result.versions;
      if (result?.validUntil !== undefined) validUntil = result.validUntil;
      else if (validUntil <= Date.now()) validUntil = undefined;
      arm();
    } catch {
      if (live()) {
        dirty = false;
        scheduler.clearTimeout(timer);
        timer = scheduler.setTimeout(() => schedule(0), 30000);
      }
    } finally {
      running = false;
      if (dirty && live()) schedule();
    }
  }
  const attach = () => {
    if (!live()) return;
    dispose = subscribe(
      (index, version) => {
        if (ignoreInitial && versions[index] === undefined) {
          versions[index] = version;
          return;
        }
        if (version !== (versions[index] || "initial")) schedule();
      },
      () => schedule(30000),
    );
    arm();
  };
  const visibility = () => {
    detach();
    if (live()) {
      attach();
      schedule(0);
    }
  };
  const reconnect = () => {
    if (live()) schedule(0);
  };
  page.addEventListener("visibilitychange", visibility);
  connection.addEventListener?.("online", reconnect);
  attach();
  return () => {
    stopped = true;
    detach();
    page.removeEventListener("visibilitychange", visibility);
    connection.removeEventListener?.("online", reconnect);
  };
}
