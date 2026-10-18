import { createHash } from "node:crypto";

// Hash complete evidence once; per-player snapshots keep compact contributions.
export function pathGameCoreSignature(game) {
  const date = game?.scheduledAt?.toDate?.() || game?.scheduledAt;
  const canonical = (value) =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, canonical(value[key])]),
          )
        : value;
  return createHash("sha256")
    .update(
      JSON.stringify(
        canonical({
          status: game?.status || null,
          scheduledAt: date ? +new Date(date) : null,
          ...Object.fromEntries(
            ["teamA", "teamB", "score", "performance", "positions"].map(
              (key) => [key, game?.[key] ?? null],
            ),
          ),
        }),
      ),
    )
    .digest("hex");
}
