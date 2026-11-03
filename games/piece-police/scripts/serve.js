// Servidor local de desenvolvimento: só ficheiros estáticos (o jogo não precisa de servidor).
// npm run dev            -> http://127.0.0.1:4177/game.html
// npm run dev -- --rede  -> aceita outros aparelhos da mesma rede (telemóvel)
// --open jogo|pc|telemovel|site|carteira|debug abre a página no browser
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
const lan = process.argv.includes('--rede');
const portIndex = process.argv.indexOf('--port');
const port = portIndex < 0 ? 4177 : Number(process.argv[portIndex + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Porta inválida');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.opus': 'audio/ogg', '.json': 'application/json' };
// Pastas que não se servem (relatórios, referências privadas, guias).
const blocked = /^(ASSETS|relatorios|node_modules|\.git)([\\/]|$)/;
const PAGES = { jogo: 'game.html', pc: 'pc.html', telemovel: 'telemovel.html', site: 'site.html', carteira: 'carteira.html', debug: 'game.html?debug=1' };

export function startServer({ port: p = port, host = lan ? '0.0.0.0' : '127.0.0.1', quiet = false } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
      const target = resolve(root, `.${path === '/' ? '/index.html' : path}`);
      const local = relative(root, target);
      if (local.startsWith(`..${sep}`) || local === '..' || blocked.test(local) || !types[extname(target)]) { res.writeHead(404).end(); return; }
      const content = await readFile(target);
      res.writeHead(200, { 'Content-Type': `${types[extname(target)]}; charset=utf-8`, 'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; worker-src 'self'; img-src 'self' data:; media-src 'self'; base-uri 'none'; frame-ancestors 'self'" });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch { res.writeHead(404).end(); }
  });
  return new Promise((ok, fail) => {
    server.on('error', fail);
    server.listen(p, host, () => {
      const base = `http://127.0.0.1:${server.address().port}`;
      if (!quiet) {
        console.log(`Jogo:                 ${base}/game.html\nDiagnóstico:          ${base}/game.html?debug=1\nCarteira simulada:    ${base}/carteira.html\nNo site (com menu):   ${base}/site.html\nPré-visualização PC:  ${base}/pc.html\nTelemóvel:            ${base}/telemovel.html`);
        if (host === '0.0.0.0') for (const ip of Object.values(networkInterfaces()).flat().filter(n => n?.family === 'IPv4' && !n.internal)) console.log(`No telemóvel (mesma rede): http://${ip.address}:${server.address().port}/game.html`);
      }
      ok({ server, base });
    });
  });
}

function openPage() {
  const i = process.argv.indexOf('--open');
  const page = i < 0 ? null : PAGES[process.argv[i + 1]];
  if (!page) return;
  const url = `http://127.0.0.1:${port}/${page}`;
  const [cmd, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref(); } catch { console.log(`Abre: ${url}`); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  startServer().then(openPage).catch(error => {
    if (error.code !== 'EADDRINUSE') throw error;
    console.log(`A porta ${port} já está em uso: uso o servidor que já está a correr.`);
    openPage();
  });
}
