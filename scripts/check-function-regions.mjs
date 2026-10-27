import assert from "node:assert/strict";

// Inspect deployment metadata locally. No credentials or cloud reads are needed.
process.env.GCLOUD_PROJECT = "demo-function-regions";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:1";
const exports = await import("../functions/index.js");
const endpoints = Object.entries(exports).filter(([, fn]) => fn?.__endpoint);
assert.ok(endpoints.length, "Nenhuma função encontrada para validar.");
for (const [name, fn] of endpoints) {
  assert.deepEqual(fn.__endpoint.region, ["europe-west1"], `${name}: só é permitida europe-west1. Configura a região antes de criar a função.`);
}
console.log(`Regiões: ${endpoints.length} funções exclusivamente em europe-west1.`);
