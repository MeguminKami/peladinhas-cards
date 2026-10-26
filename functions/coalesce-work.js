const running = new Map();
// Await all work; a new request arriving mid-flight forces another fresh pass.
// No completed results are cached and no trigger is acknowledged early.
export function coalesceWork(key, work) {
  const existing = running.get(key);
  if (existing) { existing.dirty = true; return existing.promise; }
  const entry = { dirty: true };
  entry.promise = Promise.resolve().then(async () => {
    let result;
    while (entry.dirty) { entry.dirty = false; result = await work(); }
    return result;
  }).finally(() => { if (running.get(key) === entry) running.delete(key); });
  running.set(key, entry);
  return entry.promise;
}
