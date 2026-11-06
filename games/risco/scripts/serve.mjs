import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const port=Number(process.env.PORT||4187);
createServer(async(req,res)=>{try{const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(relative(root,p).startsWith('..'))throw Error();const file=(await stat(p)).isDirectory()?resolve(p,'game.html'):p;res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end('Não encontrado');}}).listen(port,'127.0.0.1',()=>console.log(`RISCO local: http://127.0.0.1:${port}/game.html`));
