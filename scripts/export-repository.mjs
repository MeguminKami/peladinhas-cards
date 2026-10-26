import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  lstatSync,
} from "node:fs";
import { resolve, dirname, relative, sep, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(root, ".repository-export/peladinhas-cards");
if (
  relative(root, destination) !== join(".repository-export", "peladinhas-cards")
)
  throw Error("Destino inválido.");
const entries = [
  "README.md",
  ".gitignore",
  ".firebaserc",
  "package.json",
  "package-lock.json",
  "firebase.json",
  "firebase.backend.json",
  "firebase.casino.json",
  "firestore.rules",
  "firestore.indexes.json",
  "storage.rules",
  "index.html",
  "offline.html",
  "manifest.webmanifest",
  "sw.js",
  "assets",
  "css",
  "design",
  "docs",
  "functions",
  "games",
  "js",
  "scripts",
  "tests",
];
const privatePath = (path) =>
  /^(?:games\/(?:futebol|blackjack-3d|roleta-europeia-3d)\/dist|assets\/games)(?:\/|$)/.test(relative(root,path).replaceAll('\\','/')) || relative(root, path)
    .split(sep)
    .some(
      (part) =>
        part.startsWith(".env") ||
        part.startsWith(".secret") ||
        part === "node_modules" ||
        part === ".git" ||
        part === "test-results" ||
        part === "__pycache__" ||
        part.endsWith("-debug.log") ||
        part.endsWith(".pyc"),
    );
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
for (const entry of entries)
  cpSync(resolve(root, entry), resolve(destination, entry), {
    recursive: true,
    filter: (path) => {
      if (lstatSync(path).isSymbolicLink())
        throw Error("A exportação não inclui links simbólicos.");
      return !privatePath(path);
    },
  });
const files = [];
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else files.push(relative(destination, path).replaceAll("\\", "/"));
  }
}
visit(destination);
if (
  files.some((name) => /(^|\/)(\.secret|\.env|node_modules|\.git\/)/.test(name))
)
  throw Error("Ficheiro privado na exportação.");
// Verify locally without printing the value: the private VAPID key may never enter the copy.
let privateKey;
try {
  privateKey = readFileSync(resolve(root, ".secret.local"), "utf8")
    .match(/^WEB_PUSH_PRIVATE_KEY=(.*)$/m)?.[1]
    ?.trim();
} catch {}
if (
  privateKey &&
  files.some((name) =>
    readFileSync(resolve(destination, name)).includes(Buffer.from(privateKey)),
  )
)
  throw Error("A exportação contém o valor de um segredo.");
writeFileSync(
  resolve(root, ".repository-export/inventory.json"),
  JSON.stringify(
    { files: files.sort(), source: "peladinhas-cards", containsSecrets: false },
    null,
    2,
  ) + "\n",
);
console.log(
  `Cópia preparada em .repository-export/peladinhas-cards: ${files.length} ficheiros. Sem segredos, dependências, caches, logs ou histórico Git.`,
);
