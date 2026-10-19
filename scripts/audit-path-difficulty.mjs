// Read-only difficulty calibration. Prints aggregates, never identities or credentials.
import { createRequire } from "node:module";
import { firebaseConfig } from "../js/config.js";
import { participants, matchPerformance } from "../js/utils.js";
import { analyzeGoalDifficulty } from "./path-difficulty-analysis.mjs";
import { pathHistoricalSummary, pathReviewDeadline } from "../js/path-window.js";
import { readFile, writeFile } from "node:fs/promises";
import { PATH_DIFFICULTY_REVISION } from "../js/path-difficulty.js";
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
const formatIndex=process.argv.indexOf("--team-size");
const teamSize=formatIndex>=0?Number(process.argv[formatIndex+1]):null;
if(formatIndex>=0&&(!Number.isInteger(teamSize)||teamSize<5||teamSize>12))throw Error("--team-size: usa um inteiro de 5 a 12.");
const closed = games.filter(
  (g) => g.status === "closed" && !g.deleting && +g.closedAt <= Date.now() && (teamSize===null||(g.teamSize||5)===teamSize),
);
const historical = await Promise.all(closed.map(async game=>{
  const [votes,revisions]=await Promise.all([read(`games/${game.id}/feedback`,true),read(`games/${game.id}/pathVoteRevisions`,true)]);
  return {game,summary:pathHistoricalSummary(game,votes,revisions,pathReviewDeadline(game))};
}));
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
    mean: sorted.length ? +(sorted.reduce((sum,value)=>sum+value,0)/sorted.length).toFixed(2) : null,
    median: sorted.length
      ? (sorted[Math.floor((sorted.length - 1) * 0.5)]+sorted[Math.ceil((sorted.length - 1) * 0.5)])/2
      : null,
    p75: sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.75)] : null,
    p90: sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.9)] : null,
    max: sorted.at(-1) ?? null,
  };
};
const output = {
  checkedAt: new Date().toISOString(),
  calibrationRevision:PATH_DIFFICULTY_REVISION,
  teamSizeFilter:teamSize,
  ratingNote:"Top-level ratings use current summaries. goalDifficulty uses reconstructed 48h votes and excludes unfinished review windows.",
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
  assistTargets: [1, 2, 3].map(target=>({target,achieved:records.filter(r=>r.assists>=target).length,
    percent:percentage(records.filter(r=>r.assists>=target).length,records.length)})),
  teamGoals: quantiles(closed.flatMap(g=>[g.score?.teamA,g.score?.teamB])),
  teamGoalTargets: [2,3,4,5,6,8,10].map(target=>{
    const scores=closed.flatMap(g=>[g.score?.teamA,g.score?.teamB]).filter(Number.isFinite);
    return {target,achieved:scores.filter(score=>score>=target).length,teams:scores.length,
      percent:percentage(scores.filter(score=>score>=target).length,scores.length)};
  }),
  ratings: {},
  goalDifficulty:analyzeGoalDifficulty(historical),
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
const outputIndex=process.argv.indexOf("--output");
const comparisonIndex=process.argv.indexOf("--compare");
if(comparisonIndex>=0){
  const previous=JSON.parse(await readFile(process.argv[comparisonIndex+1],"utf8"));
  const key=row=>`${row.templateId}:${row.stage}:${row.difficulty}`;
  const previousRows=new Map(previous.goalDifficulty.missions.map(row=>[key(row),row]));
  output.comparison={previousCheckedAt:previous.checkedAt,previousRevision:previous.calibrationRevision||null,
    gamesDelta:output.games-previous.games,
    note:"Differences can reflect new matches, vote corrections and changed targets. Check conditions and sample sizes before attributing a cause.",
    missions:output.goalDifficulty.missions.flatMap(row=>{
      const before=previousRows.get(key(row));
      return before?[{templateId:row.templateId,stage:row.stage,difficulty:row.difficulty,
        previousConditions:before.conditions,conditions:row.conditions,previousEligible:before.eligible,eligible:row.eligible,
        previousSuccessPercent:before.successPercent,successPercent:row.successPercent}]:[];
    })};
}
if(outputIndex>=0){
  const destination=process.argv[outputIndex+1];
  if(!destination) throw Error("Indica o ficheiro de destino depois de --output.");
  await writeFile(destination,JSON.stringify(output,null,2)+"\n");
  console.log(JSON.stringify({checkedAt:output.checkedAt,calibrationRevision:output.calibrationRevision,games:output.games,
    participations:output.participations,formats:output.goalDifficulty.statistics.formats,
    missions:output.goalDifficulty.missions.length,output:destination},null,2));
} else console.log(JSON.stringify(output, null, 2));
