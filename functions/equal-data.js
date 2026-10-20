export function sameData(left, right) {
  const canonical = value => {
    if (value?.toMillis) return value.toMillis();
    if (value instanceof Date) return +value;
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).filter(key => key !== "updatedAt").sort().map(key => [key, canonical(value[key])]));
    return value;
  };
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}
