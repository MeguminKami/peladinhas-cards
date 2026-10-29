import {cacheManifest,runtimeFiles} from './tools/cache-manifest.mjs';
import {cpSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const source=new URL('./',import.meta.url),target=new URL('../../assets/games/cardoso-road/',import.meta.url);
mkdirSync(target,{recursive:true});
for(const name of [...runtimeFiles,'art-gallery.html','art-gallery.css','art-gallery.mjs','assets'])cpSync(new URL(name,source),new URL(name,target),{recursive:true});

writeFileSync(new URL('cache-manifest.js',target),await cacheManifest());
console.log(`Cardoso Road demo preparado em ${fileURLToPath(target)}`);
