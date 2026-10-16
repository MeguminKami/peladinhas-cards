import { average, clamp } from "./utils.js";
export const BALANCE_SETTINGS = Object.freeze({
  tolerance: 1,
  attempts: 600,
});
export function teamBalance(game, players) {
  const values = new Map(
    players.map((p) => [
      p.uid,
      p.hasCard !== false && Number.isFinite(p.ovr)
        ? clamp(p.ovr, 0, 99)
        : null,
    ]),
  );
  const sides = Object.fromEntries(
    ["teamA", "teamB"].map((side) => {
      const ids = [
        ...(game[side]?.starters || []),
        ...(game[side]?.bench || []),
      ];
      const known = ids.map((uid) => values.get(uid)).filter(Number.isFinite);
      const starters = (game[side]?.starters || [])
        .map((uid) => values.get(uid))
        .filter(Number.isFinite);
      return [
        side,
        {
          count: ids.length,
          rated: known.length,
          average: known.length ? average(known) : null,
          startersAverage: starters.length ? average(starters) : null,
        },
      ];
    }),
  );
  const complete =
    sides.teamA.count > 0 &&
    sides.teamB.count > 0 &&
    [sides.teamA, sides.teamB].every((s) => s.count === s.rated);
  const difference =
    sides.teamA.average == null || sides.teamB.average == null
      ? null
      : Math.abs(sides.teamA.average - sides.teamB.average);
  return {
    version: "team-balance-v1",
    ...sides,
    complete,
    difference,
    meanDeviation: difference == null ? null : difference / 2,
  };
}
export function balanceMatches(game, balance) {
  if (!balance || balance.signature !== balanceSignature(game)) return false;
  const milliseconds = (v) =>
    v?.toMillis?.() ??
    (v?.seconds != null ? v.seconds * 1000 + (v.nanoseconds || 0) / 1e6 : null);
  return milliseconds(game.closedAt) === milliseconds(balance.closedAt);
}
export function balanceSignature(game) {
  return JSON.stringify(
    ["teamA", "teamB"].map((side) =>
      ["starters", "bench"].map((kind) =>
        [...(game[side]?.[kind] || [])].sort(),
      ),
    ),
  );
}
export function balancedTeams(
  players,
  { random = Math.random, previous = null } = {},
) {
  if (
    players.length < 2 ||
    players.length > 60 ||
    new Set(players.map((p) => p.uid)).size !== players.length ||
    players.some((p) => p.hasCard === false || !Number.isFinite(p.ovr))
  )
    throw Error("Seleciona entre 2 e 60 jogadores com carta e OVR válido.");
  const candidates = [],
    split = Math.ceil(players.length / 2);
  let best = Infinity;
  for (let attempt = 0; attempt < BALANCE_SETTINGS.attempts; attempt++) {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const side = (list) => ({
      starters: list.slice(0, 5).map((p) => p.uid),
      bench: list.slice(5).map((p) => p.uid),
    });
    const game = {
      teamA: side(shuffled.slice(0, split)),
      teamB: side(shuffled.slice(split)),
    };
    const balance = teamBalance(game, players);
    const score = Math.max(
      balance.difference,
      Math.abs(balance.teamA.startersAverage - balance.teamB.startersAverage),
    );
    best = Math.min(best, score);
    candidates.push({ ...game, score });
  }
  let pool = [
    ...new Map(
      candidates
        .filter((c) => c.score <= best + BALANCE_SETTINGS.tolerance)
        .map((c) => [balanceSignature(c), c]),
    ).values(),
  ];
  const different = pool.filter((c) => balanceSignature(c) !== previous);
  if (different.length) pool = different;
  const selected = pool[Math.floor(random() * pool.length)];
  return { teamA: selected.teamA, teamB: selected.teamB };
}
