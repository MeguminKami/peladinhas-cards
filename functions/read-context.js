// This cache belongs to one operation, never to a warm instance or user session.
export function createReadContext() {
  const pending = new Map();
  return {
    read(key, load) {
      if (!pending.has(key)) pending.set(key, Promise.resolve().then(load));
      return pending.get(key);
    },
  };
}
