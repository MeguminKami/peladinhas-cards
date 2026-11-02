import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { listCandidates, applyChoices } from './apply-audio-choices.js';
import { resolve, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
// --rede: aceita ligacoes de outros aparelhos na mesma rede (ex.: o teu telemovel). Por omissao so este computador.
const lan = process.argv.includes('--rede');
const lanAddresses = () => Object.values(networkInterfaces()).flat().filter(n => n && n.family === 'IPv4' && !n.internal).map(n => n.address);

const root = fileURLToPath(new URL('../', import.meta.url));
const portIndex = process.argv.indexOf('--port');
const port = portIndex < 0 ? 4175 : Number(process.argv[portIndex + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid local port');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.opus': 'audio/ogg', '.json': 'application/json' };

// Pagina de teste de som: lista dos candidatos e gravacao das escolhas (so neste servidor local).
async function audioLab(req, res, path) {
  if (req.method === 'GET' && path === '/audio-lab/candidates.json') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(await listCandidates(root))); return true;
  }
  if (req.method === 'POST' && path === '/audio-lab/choices') {
    if (req.headers.origin && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(req.headers.origin)) { res.writeHead(403).end(); return true; }
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 100000) { res.writeHead(413).end(); return true; } }
    const data = JSON.parse(body);
    await writeFile(new URL('../audio-lab/choices.json', import.meta.url), JSON.stringify({ savedAt: new Date().toISOString(), choices: data.choices || {}, notes: data.notes || {} }, null, 2) + '\n');
    const report = data.apply ? await applyChoices(root) : [];
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ ok: true, applied: report.length }));
    return true;
  }
  return false;
}
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.startsWith('/audio-lab/') && await audioLab(req, res, path)) return;
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const target = resolve(root, `.${path === '/' ? '/index.html' : path}`);
    const local = relative(root, target);
    if (local.startsWith(`..${sep}`) || local === '..' || !types[extname(target)]) { res.writeHead(404).end(); return; }
    const content = await readFile(target);
    res.writeHead(200, { 'Content-Type': `${types[extname(target)]}; charset=utf-8`, 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; media-src 'self'; base-uri 'none'; frame-ancestors 'self'" });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404).end(); }
}).on('error', error => {
  // Se o servidor ja estiver ligado (ex.: npm run dev noutra janela), so abre a pagina pedida.
  if (error.code !== 'EADDRINUSE') throw error;
  console.log(`A porta ${port} ja esta em uso: uso o servidor que ja esta a correr.`);
  if (openPage()) setTimeout(() => process.exit(0), 800); else process.exit(0);
}).listen(port, lan ? '0.0.0.0' : '127.0.0.1', () => {
  const base = `http://127.0.0.1:${port}`;
  console.log(`Jogo:                ${base}/game.html\nNo site (com menu):  ${base}/site.html\nPré-visualização PC: ${base}/pc.html\nTelemóvel:           ${base}/telemovel.html\nTeste de som:        ${base}/audio-lab.html`);
  if (lan) for (const ip of lanAddresses()) console.log(`No telemóvel (mesma rede Wi-Fi): http://${ip}:${port}/game.html`);
  openPage();
});

// --open pc | telemovel | som | jogo : abre a pagina no browser predefinido
function openPage() {
  const openIndex = process.argv.indexOf('--open');
  const page = openIndex < 0 ? null : { pc: 'pc.html', telemovel: 'telemovel.html', site: 'site.html', som: 'audio-lab.html', jogo: 'game.html' }[process.argv[openIndex + 1]];
  if (page == null) return false;
  const url = `http://127.0.0.1:${port}/${page}`;
  const [cmd, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref(); } catch { console.log(`Abre manualmente: ${url}`); }
  return true;
}
