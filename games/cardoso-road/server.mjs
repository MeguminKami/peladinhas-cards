import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
http.createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!(path+sep).startsWith(root)||path.includes(`${sep}node_modules${sep}`))throw Error();const file=new URL(req.url,'http://localhost').pathname.endsWith('/')?resolve(path,'index.html'):path;const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.ogg':'audio/ogg','.wav':'audio/wav','.png':'image/png','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end('Não encontrado');}}).listen(5178,'127.0.0.1',()=>console.log('Cardoso Road: http://127.0.0.1:5178'));
