import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { firebaseConfig } from "../js/config.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = process.argv.includes("--frontend");
const backend = process.argv.includes("--backend");
if (frontend && backend) throw Error("Escolhe frontend ou backend.");
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run(process.execPath, ["scripts/check.mjs"]);
run(process.execPath, [
  "--test",
  "tests/logic.test.js",
  "tests/card-achievements.test.js",
  "tests/youtube.test.js",
  "tests/team-balance.test.js",
  "tests/card-week.test.js",
  "tests/progression.test.js",
  "tests/game-progression.test.js",
  "tests/events.test.js",
  "tests/match-time.test.js",
  "tests/push-config.test.js",
  "tests/paths.test.js",
  "tests/path-window.test.js",
]);
run(process.execPath, [
  "node_modules/firebase-tools/lib/bin/firebase.js",
  "deploy",
  "--project",
  firebaseConfig.projectId,
  "--only",
  frontend
    ? "hosting"
    : backend
      ? "firestore,storage,functions"
      : "hosting,firestore,storage,functions",
]);
