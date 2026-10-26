import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,relative} from 'node:path';
import {MATH_VERSION} from '../math-config.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const files={};
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){
 const path=join(dir,e.name);
 if(['scripts','tests','build-manifest.json'].includes(e.name))continue;
 if(e.isDirectory())walk(path);else files[relative(root,path).replaceAll('\\','/')]=hash(path);
}}
walk(root);
writeFileSync(new URL('../build-manifest.json',import.meta.url),JSON.stringify({version:MATH_VERSION,
 configurationHash:hash(join(root,'math-config.js')),files},null,2)+'\n');
