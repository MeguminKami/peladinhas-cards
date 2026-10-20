// No reads in hidden/offline tabs, and never overlap a slow request.
export function startLivePoll(task, {
  isCurrent = () => true,
  page = globalThis.document,
  online = () => globalThis.navigator?.onLine !== false,
  scheduler = globalThis,
} = {}) {
  let stopped = false, pending = false;
  const stop = () => { stopped = true; scheduler.clearInterval(timer); };
  const timer = scheduler.setInterval(async () => {
    if (stopped) return;
    if (!isCurrent()) return stop();
    if (pending || page.visibilityState !== "visible" || !online()) return;
    pending = true;
    try { await task(() => !stopped && isCurrent()); }
    catch { /* The next interval retries transient failures. */ }
    finally { pending = false; }
  }, 60000);
  return stop;
}
