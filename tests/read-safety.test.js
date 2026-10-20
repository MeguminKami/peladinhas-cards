import test from "node:test";
import assert from "node:assert/strict";
import { firebaseMode } from "../js/runtime-environment.js";
import { assertTestEmulator } from "../functions/test-environment.js";
import { createReadContext } from "../functions/read-context.js";
import { coalesceWork } from "../functions/coalesce-work.js";
import { sameData } from "../functions/equal-data.js";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

test("local Firebase requires an explicit mode and backend tests require demo emulator", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]", "", "192.168.1.12", "10.0.0.2", "172.16.1.5", "169.254.1.1", "laptop.local", "app.localhost", "[fd12::1]"]) {
    assert.throws(() => firebaseMode(host), /bloqueado/);
    assert.equal(firebaseMode(host, "emulator"), "emulator");
    assert.equal(firebaseMode(host, "production"), "production");
  }
  assert.equal(firebaseMode("peladinhas.example"), "production");
  for (const env of [{NODE_TEST_CONTEXT:"1"}, {NODE_TEST_CONTEXT:"1", GCLOUD_PROJECT:"real", FIRESTORE_EMULATOR_HOST:"localhost:8085"}])
    assert.throws(() => assertTestEmulator(env), /demo/);
  assert.doesNotThrow(() => assertTestEmulator({NODE_TEST_CONTEXT:"1", GCLOUD_PROJECT:"demo-test", FIRESTORE_EMULATOR_HOST:"localhost:8085"}));
});

test("read context deduplicates simultaneous reads but never crosses operations", async () => {
  let count = 0;
  const load = async () => ++count;
  const context = createReadContext();
  assert.deepEqual(await Promise.all([context.read("games", load), context.read("games", load)]), [1,1]);
  assert.equal(await createReadContext().read("games", load), 2);
});

test("concurrent work forces a fresh pass and every caller waits; errors can retry", async () => {
  let release, entered, count = 0;
  const started = new Promise(resolve => { entered = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  const work = async () => { count++; if (count === 1) { entered(); await blocked; } };
  const first = coalesceWork("test-game", work);
  await started;
  const second = coalesceWork("test-game", work);
  const third = coalesceWork("test-game", work);
  assert.equal(first, second);
  release();
  await Promise.all([first, second, third]);
  assert.equal(count, 2);
  await assert.rejects(coalesceWork("test-game", async () => { throw Error("retry"); }), /retry/);
  await coalesceWork("test-game", work);
  assert.equal(count, 3);
});

test("semantic equality ignores update timestamps but preserves ratings, order and locks", () => {
  assert.ok(sameData({b:2,a:1,updatedAt:3}, {a:1,b:2,updatedAt:8}));
  assert.ok(!sameData({stats:{fin:73}}, {stats:{fin:74}}));
  assert.ok(!sameData({locked:false}, {locked:true}));
  assert.ok(!sameData({uids:[1,2]}, {uids:[2,1]}));
});

test("audit replay performs zero network reads and blocks missing snapshots and repairs", () => {
  const url = "https://firestore.googleapis.com/v1/projects/demo-test/databases/(default)/documents/users";
  const key = createHash("sha256").update(`GET ${url} `).digest("hex");
  const file = "test-results/read-safety-snapshot.json";
  mkdirSync("test-results", {recursive:true});
  writeFileSync(file, JSON.stringify({collectedAt:new Date().toISOString(), responses:{[key]:{status:200,body:'{"documents":[]}'}}}));
  const code = `globalThis.fetch=()=>{throw Error('NETWORK');}; await import('./scripts/firestore-audit-cache.mjs'); const r=await fetch(${JSON.stringify(url)}); if(!(await r.json()).documents)throw Error('missing'); await import('node:assert/strict').then(async ({default:a})=>{await a.rejects(fetch(${JSON.stringify(url + "/missing")}),/incompleta/);await a.rejects(fetch(${JSON.stringify(url)},{method:'DELETE'}),/bloqueada/);});`;
  for (let n = 0; n < 2; n++) {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", code, "--", "--snapshot", file], {encoding:"utf8"});
    assert.equal(result.status, 0, result.stderr);
  }
  const denied = spawnSync(process.execPath,["--input-type=module", "-e", "await import('./scripts/firestore-audit-cache.mjs')", "--", "--live"],{encoding:"utf8"});
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /max-reads/);
});

test("audit live budget serializes concurrent requests and limits remaining pages", () => {
  const code = `import a from 'node:assert/strict';let requests=0;let pages=[];globalThis.fetch=async url=>{requests++;const size=Math.min(2,Number(new URL(url).searchParams.get('pageSize')));pages.push(size);return new Response(JSON.stringify({documents:Array.from({length:size},()=>({fields:{}}))}),{status:200});};await import('./scripts/firestore-audit-cache.mjs');const url='https://firestore.googleapis.com/v1/projects/demo-test/databases/(default)/documents/users?pageSize=1000';const result=await Promise.allSettled([fetch(url),fetch(url),fetch(url)]);a.deepEqual(result.map(r=>r.status),['fulfilled','fulfilled','rejected']);a.equal(requests,2);a.deepEqual(pages,[2,1]);await a.rejects(fetch(url,{method:'DELETE'}),/bloqueada/);`;
  const result = spawnSync(process.execPath,["--input-type=module","-e",code,"--","--live","--scope","synthetic-test","--max-reads","3","--snapshot","test-results/read-safety-live-snapshot.json"],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr);
});
