import { auditAuth } from "./firestore-audit-cache.mjs";
// Read-only, single-player OVR audit. Never writes Firestore documents or prints tokens.
import { firebaseConfig } from "../js/config.js";
const uid = process.argv[2];
if (!uid || uid.startsWith("--")) throw Error("Uso: node scripts/audit-player-ovr-drop.mjs UID [--live --scope ... --max-reads N]");
const account = auditAuth.getGlobalDefaultAccount();
const token = await auditAuth.getAccessToken(account.tokens.refresh_token, account.tokens.scopes);
const base = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const decode = (v) => v.mapValue ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]))
  : v.arrayValue ? (v.arrayValue.values || []).map(decode) : v.timestampValue ?? (v.integerValue !== undefined ? Number(v.integerValue) : v.doubleValue ?? v.booleanValue ?? v.stringValue ?? null);
const conv = (d) => ({ id: d.name.split("/").at(-1), updateTime: d.updateTime, ...decode({ mapValue: { fields: d.fields || {} } }) });
async function get(path, list = false) {
  const r = await fetch(`${base}/${path}${list ? "?pageSize=12" : ""}`, { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw Error(`${path}: HTTP ${r.status}`);
  const j = await r.json();
  return list ? (j.documents || []).map(conv) : conv(j);
}
const user = await get(`users/${uid}`);
const community = await get(`communitySummaries/${uid}`);
const settings = await get(`settings/ovr`);
const weekly = await get(`weeklyCards/${uid}`);
const history = await get(`users/${uid}/cardHistory`, true);
const since = new Date(); since.setUTCHours(0, 0, 0, 0); since.setUTCDate(since.getUTCDate() - 1);
const q = await fetch(`${base}:runQuery`, { method: "POST", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "games" }], where: { fieldFilter: { field: { fieldPath: "closedAt" }, op: "GREATER_THAN_OR_EQUAL", value: { timestampValue: since.toISOString() } } }, limit: 5 } }) });
const games = (await q.json()).filter((r) => r.document).map((r) => conv(r.document)).map((g) => ({ id: g.id, title: g.title, status: g.status, closedAt: g.closedAt, updateTime: g.updateTime, hasPlayer: JSON.stringify(g).includes(uid) }));
console.log(JSON.stringify({ user, community, settings, weekly, history, games }, null, 1));
