import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, dirname, relative, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
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
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
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
    `Peladinhas Cards · http://localhost:${port} · Apenas frontend público`,
  ),
);
