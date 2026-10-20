import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const args = process.argv;
const live = args.includes("--live");
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : null;
const file = resolve(option("--snapshot") || `test-results/firestore-audits/${basename(args[1] || "audit")}.json`);
const budget = Number(option("--max-reads"));
if (live && (!option("--scope") || !Number.isInteger(budget) || budget < 1))
  throw Error("Uma recolha real exige --live --scope DESCRICAO --max-reads N. Sem --live, usa-se apenas o snapshot local.");
let reads = 0;
const snapshot = !live && existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { collectedAt: new Date().toISOString(), scope: option("--scope"), reads: 0, responses: {} };
if (!live && snapshot.collectedAt && Date.now() - Date.parse(snapshot.collectedAt) > 7 * 86400000 && !args.includes("--allow-stale-snapshot"))
  throw Error("Snapshot com mais de sete dias. Apaga-o após a investigação ou usa --allow-stale-snapshot para analisar explicitamente dados antigos; não há recolha automática.");
const nativeFetch = globalThis.fetch;
let pending = Promise.resolve();
globalThis.fetch = (url, init = {}) => {
  if (!new URL(url).hostname.endsWith("googleapis.com")) return nativeFetch(url, init);
  const next = pending.then(() => auditFetch(url, init));
  pending = next.catch(() => {});
  return next;
};
async function auditFetch(url, init = {}) {
  const target = new URL(url);
  if (!target.hostname.endsWith("googleapis.com")) return nativeFetch(url, init);
  const method = init.method || "GET";
  const write = method !== "GET" && !/:(runQuery|runAggregationQuery|listCollectionIds|getIamPolicy)$|\/entries:list$/.test(target.pathname);
  if (write && (!live || !args.includes("--repair"))) throw Error("Escrita bloqueada: exige --live e --repair explícitos.");
  const key = createHash("sha256").update(`${method} ${url} ${init.body || ""}`).digest("hex");
  if (!live) {
    const cached = snapshot.responses[key];
    if (!cached) throw Error(`Recolha local incompleta para ${target.pathname}. Nenhum acesso real foi efetuado. Recolhe uma vez com --live --scope DESCRICAO --max-reads N.`);
    return new Response(cached.body, { status: cached.status, headers: { "Content-Type": "application/json" } });
  }
  const firestore = target.hostname === "firestore.googleapis.com" && target.pathname.includes("/documents");
  if (firestore && reads >= budget) throw Error(`Orçamento de ${budget} leituras atingido. Recolha interrompida.`);
  if (firestore && !write && method === "GET" && target.pathname.split("/documents/")[1]?.split("/").length % 2 === 1) {
    target.searchParams.set("pageSize", String(Math.min(Number(target.searchParams.get("pageSize") || 100), budget - reads)));
  }
  if (firestore && target.pathname.endsWith(":runQuery") && init.body) {
    const payload = JSON.parse(init.body);
    if (payload.structuredQuery) payload.structuredQuery.limit = Math.min(payload.structuredQuery.limit ?? budget, budget - reads);
    init = { ...init, body: JSON.stringify(payload) };
  }
  const response = await nativeFetch(target, init);
  const body = await response.text();
  let count = 0;
  if (firestore && !write) {
    const value = JSON.parse(body);
    count = Math.max(1, Array.isArray(value) ? value.filter(row => row.document).length : value.documents?.length ?? (value.fields ? 1 : 0));
    reads += count;
  }
  if (!write) snapshot.responses[key] = { status: response.status, body };
  snapshot.reads = reads;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(snapshot, null, 2));
  if (reads > budget) throw Error(`Resposta excedeu o orçamento: ${reads}/${budget}. Não executar mais consultas; reutiliza a recolha guardada.`);
  return new Response(body, { status: response.status, headers: { "Content-Type": "application/json" } });
}
// Offline analysis never opens the Firebase credential store.
export const auditAuth = {
  getGlobalDefaultAccount() { return live ? require("firebase-tools/lib/auth.js").getGlobalDefaultAccount() : { tokens: {} }; },
  async getAccessToken(...values) { return live ? require("firebase-tools/lib/auth.js").getAccessToken(...values) : { access_token: "local-snapshot" }; },
};
