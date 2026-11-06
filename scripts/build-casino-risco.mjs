import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "games/risco");
const target = resolve(root, "assets/games/risco");
if (relative(root, target).replaceAll("\\", "/") !== "assets/games/risco") throw Error("Destino inválido.");
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const name of ["game.html", "ui", "src", "tabelas"])
  cpSync(resolve(source, name), resolve(target, name), { recursive: true });
mkdirSync(resolve(root, "assets/casino/covers"), { recursive: true });
cpSync(resolve(source, "ui/art/casino-thumbnail.webp"), resolve(root, "assets/casino/covers/risco.webp"));
console.log("RISCO preparado em assets/games/risco. Fontes de arte e promo não são publicadas.");
