import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const env = { ...process.env, DEBUG: "", CI: "true", FIREBASE_CLI_DISABLE_USAGE: "true", XDG_CONFIG_HOME: resolve("test-results/firebase-cli-config") };
for (const name of ["GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_TOKEN", "GOOGLE_OAUTH_ACCESS_TOKEN"]) delete env[name];
const result = spawnSync(process.execPath, ["node_modules/firebase-tools/lib/bin/firebase.js", ...process.argv.slice(2)], { env, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
