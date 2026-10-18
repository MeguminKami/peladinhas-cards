// Read-only difficulty calibration. Prints aggregates, never identities or credentials.
import { createRequire } from "node:module";
import { firebaseConfig } from "../js/config.js";
import { participants, matchPerformance } from "../js/utils.js";
const require = createRequire(import.meta.url);
const auth = require("firebase-tools/lib/auth.js");
const account = auth.getGlobalDefaultAccount();
if (!account) throw Error("Sem sessão Firebase disponível.");
const token = await auth.getAccessToken(
  account.tokens.refresh_token,
  account.tokens.scopes,
);
const base = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
function decode(value) {
  if (value.mapValue)
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([k, v]) => [
        k,
        decode(v),
      ]),
    );
  if (value.arrayValue) return (value.arrayValue.values || []).map(decode);
  if (value.timestampValue) return new Date(value.timestampValue);
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  return value.stringValue ?? null;
}
async function read(path, list = false) {
  let docs = [],
    pageToken;
  do {
    const query = list
      ? `?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`
      : "";
    const response = await fetch(`${base}/${path}${query}`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (response.status === 404) return list ? [] : null;
    if (!response.ok) throw Error(`Leitura ${path}: HTTP ${response.status}`);
    const result = await response.json();
    const convert = (doc) => ({
      ...decode({ mapValue: { fields: doc.fields || {} } }),
      id: doc.name.split("/").at(-1),
    });
    if (!list) return convert(result);
    docs.push(...(result.documents || []).map(convert));
    pageToken = result.nextPageToken;
  } while (pageToken);
  return docs;
}
const [games, summaries] = await Promise.all([
  read("games", true),
  read("gameSummaries", true),
]);
const closed = games.filter(
  (g) => g.status === "closed" && +g.scheduledAt <= Date.now(),
);
const records = closed.flatMap((g) =>
  participants(g).map((uid) => ({
    game: g.id,
    ...matchPerformance(uid, g),
    ratings: summaries.find((s) => s.id === g.id)?.players?.[uid],
  })),
);
const percentage = (n, total) =>
  total ? +((100 * n) / total).toFixed(1) : null;
const quantiles = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return {
    count: sorted.length,
    median: sorted.length
      ? sorted[Math.floor((sorted.length - 1) * 0.5)]
      : null,
    p75: sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.75)] : null,
    p90: sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.9)] : null,
    max: sorted.at(-1) ?? null,
  };
};
const output = {
  checkedAt: new Date().toISOString(),
  games: closed.length,
  participations: records.length,
  goals: quantiles(records.map((r) => r.goals)),
  goalTargets: [1, 2, 3, 4, 5].map((target) => ({
    target,
    achieved: records.filter((r) => r.goals >= target).length,
    percent: percentage(
      records.filter((r) => r.goals >= target).length,
      records.length,
    ),
  })),
  assists: quantiles(records.map((r) => r.assists)),
  ratings: {},
};
for (const key of [
  "attack",
  "passing",
  "defense",
  "physical",
  "goalkeeping",
  "attitude",
]) {
  const rated = records.filter((r) => Number.isFinite(r.ratings?.[key]));
  const qualified = rated.filter(
    (r) =>
      (r.ratings.ratingCounts?.[key] || 0) >= 7 &&
      (key !== "goalkeeping" || r.ratings.goalkeepingEligible !== false),
  );
  output.ratings[key] = {
    all: quantiles(rated.map((r) => r.ratings[key])),
    withSevenVotes: qualified.length,
    coveragePercent: percentage(qualified.length, records.length),
    targets: [3.5, 4, 4.5, 4.7].map((target) => ({
      target,
      percent: percentage(
        qualified.filter((r) => r.ratings[key] >= target).length,
        qualified.length,
      ),
    })),
  };
}
console.log(JSON.stringify(output, null, 2));
