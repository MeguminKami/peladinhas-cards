import { build } from 'vite';
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function buildFrontend({target = '.firebase/react-site', mode = 'production'} = {}) {
  const output = resolve(root,target);
  if (!['.firebase/react-site','.firebase/site','.firebase/react-test'].includes(relative(root,output).replaceAll('\\','/'))) throw Error('Destino de build inválido.');
  if (mode !== 'production' && target === '.firebase/site') throw Error('Fixtures de teste não podem ser preparadas para deploy.');
  const check = spawnSync(process.execPath,[resolve(root,'node_modules/typescript/bin/tsc'),'--noEmit'],{cwd:root,stdio:'inherit'});
  if (check.status !== 0) throw Error('A verificação TypeScript falhou.');
  await build({configFile:resolve(root,'vite.config.ts'),mode,build:{outDir:output}});
  for (const name of ['assets','css','manifest.webmanifest','offline.html','sw.js']) cpSync(resolve(root,name),resolve(output,name),{recursive:true,filter:source => !source.endsWith('manrope-variable.ttf') && !/[\\/]playstyle[\\/].*\.png$/.test(source)});
  for (const name of ['offline.js','push-worker.js']) cpSync(resolve(root,'js',name),resolve(output,'js',name),{recursive:true});
  const indexPath=join(output,'index.html');
  writeFileSync(indexPath,readFileSync(indexPath,'utf8').replaceAll('href="/css/','href="./css/'));
  const files=[];
  function visit(directory) {for(const entry of readdirSync(directory,{withFileTypes:true})) {const path=join(directory,entry.name);if(entry.isDirectory())visit(path);else if(entry.name!=='sw.js')files.push(relative(output,path).replaceAll('\\','/'));}}
  visit(output);files.sort();
  const forbidden=/^(functions|tests|scripts|src|node_modules|docs|design)(\/|$)|(?:^|\/)(?:\.secret.*|\.env.*|package.*\.json|firebase.*\.json|.*\.rules)$/;
  if(files.some(path=>forbidden.test(path)))throw Error('Ficheiro interno no build público.');
  for (const path of files.filter(path=>/\.(?:js|html)$/.test(path))) {
    const source=readFileSync(join(output,path),'utf8');
    if (/from\s*["']firebase-(?:admin|functions)(?:\/|["'])|defineSecret\(["']|BEGIN (?:RSA )?PRIVATE KEY/.test(source)) throw Error(`Código privado no recurso público: ${path}`);
  }
  if(!files.includes('js/push-worker.js')||!files.includes('js/offline.js'))throw Error('PWA incompleta.');
  const worker=readFileSync(join(output,'sw.js'),'utf8'),digest=createHash('sha256');
  for(const path of files)digest.update(path).update(readFileSync(join(output,path)));
  const version=digest.update(worker).digest('hex').slice(0,16);
  writeFileSync(join(output,'sw.js'),worker.replace(/const VERSION = ["'][^"']+["'];/,`const VERSION = '${version}';`).replace(/const PRECACHE = \[[\s\S]*?\];/,`const PRECACHE = ${JSON.stringify(files)};`));
  console.log(`Frontend React e PWA preparados em ${relative(root,output)}. Versão ${version}; ${files.length} recursos públicos; modo ${mode}.`);
  return output;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildFrontend(process.argv.includes('--test') ? {target:'.firebase/react-test',mode:'test'} : {});
