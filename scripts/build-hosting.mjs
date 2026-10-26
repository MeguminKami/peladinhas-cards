import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve, relative, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import './build-casino.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, ".firebase/site");
if (relative(root, target) !== join(".firebase", "site"))
  throw Error("Destino inválido.");
// This directory is generated exclusively by this script.
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const name of [
  "index.html",
  "offline.html",
  "manifest.webmanifest",
  "sw.js",
  "js",
  "css",
  "assets",
])
  cpSync(resolve(root, name), resolve(target, name), {
    recursive: true,
    // Authoring input: the app uses the smaller static WOFF files.
    filter: (source) =>
      !source.endsWith("manrope-variable.ttf") &&
      !/[\\/]playstyle[\\/].*\.png$/.test(source),
  });
const forbidden =
  /^(functions|tests|scripts|node_modules|README\.md|package.*|firestore.*|storage.*|firebase.*)$/;
if (readdirSync(target).some((name) => forbidden.test(name)))
  throw Error("Ficheiro interno no site.");
const index = readFileSync(resolve(target, "index.html"), "utf8");
if (!index.includes("./js/app.js")) throw Error("Entrada do site inválida.");
const inventory = [];
const visit = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (entry.name !== "sw.js")
      inventory.push(relative(target, path).replaceAll("\\", "/"));
  }
};
visit(target);
inventory.sort();
const digest = createHash("sha256");
for (const path of inventory)
  digest.update(path).update(readFileSync(join(target, path)));
const worker = readFileSync(join(target, "sw.js"), "utf8");
// Hidden games load on demand; never download all casino art during PWA install.
const precache = inventory.filter(path => !path.startsWith('assets/games/'));
digest.update(worker);
const version = digest.digest("hex").slice(0, 16);
const versionPattern = /const VERSION = ["'][^"']+["'];/;
if (!versionPattern.test(worker) || !worker.includes("const PRECACHE = ["))
  throw Error("Service worker sem marcadores de versão e inventário.");
writeFileSync(
  join(target, "sw.js"),
  worker
    .replace(versionPattern, `const VERSION = '${version}';`)
    .replace(
      /const PRECACHE = \[[\s\S]*?\];/,
      `const PRECACHE = ${JSON.stringify(precache)};`,
    ),
);
console.log(
  `Frontend e PWA preparados em .firebase/site. Versão ${version}; ${inventory.length} recursos públicos.`,
);
