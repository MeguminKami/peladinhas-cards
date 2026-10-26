import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import "./build-casino-tables.mjs";
import "./build-casino-rift.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "games/futebol");
const target = resolve(root, "assets/games/futebol");
console.log("Fonte da slot: games/futebol (casino_temp não entra no deploy).");
if (relative(root, target).replaceAll("\\", "/") !== "assets/games/futebol")
  throw Error("Destino inválido.");
const result = spawnSync(
  process.execPath,
  [resolve(source, "node_modules/vite/bin/vite.js"), "build"],
  { cwd: source, stdio: "inherit" },
);
if (result.error) throw result.error;
if (result.status !== 0)
  throw Error(
    "A build da slot falhou. Executa npm.cmd ci --prefix games/futebol.",
  );
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const file of ["embed.html", "slot-host.js", "assets"])
  cpSync(resolve(source, "dist", file), resolve(target, file), {
    recursive: true,
  });
// Demo and standalone code are not entrypoints in the integrated product.
for (const file of readdirSync(resolve(target, "assets"))) {
  if (/^demo-.*\.js$/.test(file)) rmSync(resolve(target, "assets", file));
}
console.log("Slot independente preparada em assets/games/futebol.");
