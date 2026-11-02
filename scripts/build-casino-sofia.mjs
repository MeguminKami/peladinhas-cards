import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Publica só o necessário à Princesa Sofia (ver games/princesa-sofia/INTEGRACAO.md).
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "games/princesa-sofia");
const target = resolve(root, "assets/games/princesa-sofia");
if (relative(root, target).replaceAll("\\", "/") !== "assets/games/princesa-sofia") throw Error("Destino inválido.");
const excluded = /(^|[/\\])(preview\.(js|css)|site\.css|audio-lab\.(js|css)|fixtures-dev\.js)$|\.full\.opus$/;
// Arte sem referência no código publicado (variantes antigas) fica de fora: ~23 MB a menos.
const code = ["game.html", ...readdirSync(resolve(source, "ui")).filter(f => /\.(js|css)$/.test(f) && !excluded.test(f)).map(f => "ui/" + f)]
  .map(f => readFileSync(resolve(source, f), "utf8")).join("\n");
const unusedArt = file => /[/\\]ui[/\\]art[/\\][^/\\]+\.png$/.test(file) && (() => {
  const name = file.split(/[/\\]/).pop();
  return !code.includes(name) && !code.includes(`'${name.slice(0, -4)}'`);
})();
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(resolve(source, "game.html"), resolve(target, "game.html"));
for (const folder of ["ui", "src"])
  cpSync(resolve(source, folder), resolve(target, folder), { recursive: true, filter: file => !excluded.test(file) && !unusedArt(file) });
console.log("Princesa Sofia preparada em assets/games/princesa-sofia.");
