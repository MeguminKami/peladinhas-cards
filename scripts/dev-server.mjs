import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, dirname, relative, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
import { blackjackFixtureServer } from '../tests/fixtures/blackjack-server.mjs';
const blackjackFixture = blackjackFixtureServer();
const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex < 0 ? "fixtures" : process.argv[modeIndex + 1];
if (!["fixtures", "emulator", "production"].includes(mode)) throw Error("Modo local inválido.");
const creditsIndex = process.argv.indexOf("--casino-credits");
const casinoCredits = creditsIndex < 0 ? null : Number(process.argv[creditsIndex + 1]);
if (casinoCredits !== null && (mode !== "fixtures" || !Number.isSafeInteger(casinoCredits * 100) || casinoCredits < 0 || casinoCredits > 1000000))
  throw Error("Créditos de teste inválidos: usar apenas no modo fixtures.");
const index = process.argv.indexOf("--port");
const port = index < 0 ? 8080 : Number(process.argv[index + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw Error("Porta inválida.");
const publicEntries = new Set([
  "index.html",
  "offline.html",
  "manifest.webmanifest",
  "sw.js",
  "js",
  "css",
  "assets",
]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".webmanifest": "application/manifest+json",
};
const server = createServer(async (req, res) => {
  try {
    if (mode === 'fixtures' && req.url === '/__blackjack') { await blackjackFixture(req,res); return; }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const localModule = path.replace(/^\//, "");
    if (path === '/casino') {
      res.writeHead(302, { Location: '/#/casino' });
      res.end();
      return;
    }
    if (mode === "fixtures" && ["tests/fixtures/game-ratings.js", "tests/fixtures/maintenance.js", "tests/fixtures/casino.js"].includes(localModule)) {
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
      let source = await readFile(resolve(root, localModule), "utf8");
      if (localModule === "tests/fixtures/casino.js" && casinoCredits !== null)
        source = source.replace("wallet: newCasinoWallet(),", `wallet: { ...newCasinoWallet(), balance: ${casinoCredits * 100}, recent: [] },`);
      res.end(source);
      return;
    }
    if (mode === "fixtures" && ["js/firebase.js", "js/auth.js", "js/db.js"].includes(localModule)) {
      res.setHeader("Content-Type", "text/javascript; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(localModule === "js/firebase.js" ? "export const configured=true;" :
        (await readFile(resolve(root, "tests/fixtures", localModule.slice(3)), "utf8")).replaceAll("../../js/", "./"));
      return;
    }
    if (localModule === "js/config.js") {
      res.setHeader("Content-Type", "text/javascript; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(mode === "fixtures" ? 'export const runtimeMode="fixtures"; export const firebaseConfig={};' : mode === "emulator" ? `export const runtimeMode="emulator"; export const firebaseConfig=${JSON.stringify({ apiKey: "demo-key", authDomain: "demo-peladinhas-development.firebaseapp.com", projectId: "demo-peladinhas-development", storageBucket: "demo-peladinhas-development.appspot.com", appId: "demo-app" })};` :
        (await readFile(resolve(root, "js/config.js"), "utf8")) + '\nexport const runtimeMode="production";');
      return;
    }
    const file = resolve(
      root,
      "." + (path.endsWith("/") ? path + "index.html" : path),
    );
    const rel = relative(root, file);
    if (
      rel.startsWith("..") ||
      !publicEntries.has(rel.split(sep)[0]) ||
      rel.split(sep).some((part) => part.startsWith(".")) ||
      (await stat(file)).isDirectory()
    )
      throw Error("Not public");
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(req.method === "HEAD" ? undefined : await readFile(file));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Peladinhas Cards · http://localhost:${port} · Modo ${mode}`,
  ),
);
