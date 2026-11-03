import { auditAuth } from "./firestore-audit-cache.mjs";
// Read-only: updateTime of the given games' summaries/balances. Never writes Firestore documents or prints tokens.
import { firebaseConfig } from "../js/config.js";
const ids = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--"));
const account = auditAuth.getGlobalDefaultAccount();
const token = await auditAuth.getAccessToken(account.tokens.refresh_token, account.tokens.scopes);
const base = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const out = [];
for (const id of ids) for (const col of ["gameSummaries", "gameBalances", "games"]) {
  const r = await fetch(`${base}/${col}/${id}`, { headers: { Authorization: `Bearer ${token.access_token}` } });
  const j = r.ok ? await r.json() : null;
  const f = j?.fields || {};
  out.push({ col, id, status: r.status, updateTime: j?.updateTime, updatedAt: f.updatedAt?.timestampValue, closedAt: f.closedAt?.timestampValue, gameStatus: f.status?.stringValue,
    players: f.players?.mapValue ? Object.fromEntries(Object.entries(f.players.mapValue.fields).map(([k, v]) => [k, Number(v.mapValue?.fields?.count?.integerValue ?? NaN)])) : undefined });
}
console.log(JSON.stringify(out, null, 1));
