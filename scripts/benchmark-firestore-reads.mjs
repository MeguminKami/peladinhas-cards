import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { emulatorAppOptions } from "../functions/test-environment.js";
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) throw Error("Executar apenas através de npm.cmd run test:reads.");
const index = process.argv.indexOf("--baseline-ref");
const ref = index < 0 ? "056c32e" : process.argv[index + 1];
const credentials = emulatorAppOptions().credential;
const credentialPath = resolve("test-results/read-baseline-credential.json");
mkdirSync(dirname(credentialPath), {recursive:true});
// Generated for this run only; never a real service account or local ADC.
writeFileSync(credentialPath, JSON.stringify({type:"service_account",project_id:process.env.GCLOUD_PROJECT,client_email:credentials.clientEmail,private_key:credentials.privateKey}));
const git = args => {
  const result = spawnSync("git", ["-c", `safe.directory=${resolve(".").replaceAll("\\", "/")}`, ...args], {encoding:"utf8"});
  if (result.status !== 0) throw Error(result.stderr);
  return result.stdout;
};
for (const file of git(["ls-tree","-r","--name-only",ref,"functions","js"]).trim().split("\n")) {
  const destination = `test-results/read-baseline/${file}`;
  mkdirSync(dirname(destination), {recursive:true});
  writeFileSync(destination,git(["show",`${ref}:${file}`]));
}
for (const baseline of ["1","0"]) {
  const result = spawnSync(process.execPath,["--test","tests/firestore-read-budget.backend.test.js"],{stdio:"inherit",env:{...process.env,GOOGLE_APPLICATION_CREDENTIALS:credentialPath,READ_BUDGET_BASELINE:baseline}});
  if (result.status !== 0) process.exit(result.status ?? 1);
}
