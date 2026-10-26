import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "games/rift-core-overdrive");
const target = resolve(root, "assets/games/rift");
mkdirSync(target, { recursive: true });
for (const file of readdirSync(source)) {
  if (file === "index.html" || /\.(js|css)$/.test(file))
    cpSync(resolve(source, file), resolve(target, file));
}
cpSync(resolve(source, "assets"), resolve(target, "assets"), {
  recursive: true,
  filter: file => !/[/\\]cover[/\\].*\.png$/.test(file),
});
mkdirSync(resolve(target, "integration"), { recursive: true });
cpSync(resolve(source, "integration/host.js"), resolve(target, "integration/host.js"));
// Keep the temporary site fully local, including typography.
const fonts = resolve(target, "assets/fonts");
mkdirSync(fonts, { recursive: true });
for (const [packageName, file, name] of [
  ["@fontsource/barlow-condensed", "barlow-condensed-latin-500-normal.woff2", "barlow-500.woff2"],
  ["@fontsource/barlow-condensed", "barlow-condensed-latin-700-normal.woff2", "barlow-700.woff2"],
  ["@fontsource-variable/oxanium", "oxanium-latin-wght-normal.woff2", "oxanium.woff2"],
]) {
  const dependency = resolve(root, "games/futebol/node_modules", packageName);
  cpSync(resolve(dependency, "files", file), resolve(fonts, name));
  cpSync(resolve(dependency, "LICENSE"), resolve(fonts, `${name}.LICENSE.txt`));
}
const localFonts = `@font-face{font-family:'Barlow Condensed';src:url('./assets/fonts/barlow-500.woff2') format('woff2');font-weight:400 600;font-display:swap}
@font-face{font-family:'Barlow Condensed';src:url('./assets/fonts/barlow-700.woff2') format('woff2');font-weight:700 900;font-display:swap}
@font-face{font-family:Rajdhani;src:url('./assets/fonts/oxanium.woff2') format('woff2');font-weight:400 700;font-display:swap}`;
writeFileSync(resolve(target, "style.css"), readFileSync(resolve(source, "style.css"), "utf8").replace(/@import url\([^)]*\);/, localFonts));
writeFileSync(resolve(target, "index.html"), readFileSync(resolve(source, "index.html"), "utf8").replace("</head>", '<link rel="stylesheet" href="../../../css/casino-rift-fit.css"></head>'));
console.log("Rift Core Overdrive preparada para o casino temporário local.");
