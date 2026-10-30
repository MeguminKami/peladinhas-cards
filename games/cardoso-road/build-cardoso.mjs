import {cacheManifest,resourceFiles} from './tools/cache-manifest.mjs';
import {cpSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const source=new URL('./',import.meta.url),target=new URL('../../assets/games/cardoso-road/',import.meta.url);
// Recreate the generated directory so removed authoring assets cannot survive a build.
rmSync(target,{recursive:true,force:true});
mkdirSync(target,{recursive:true});
for(const name of [...resourceFiles,'assets/Manrope-OFL.txt']){
  const destination=new URL(name,target);
  mkdirSync(new URL('./',destination),{recursive:true});
  cpSync(new URL(name,source),destination);
}

writeFileSync(new URL('cache-manifest.js',target),await cacheManifest());
console.log(`Cardoso Road demo preparado em ${fileURLToPath(target)}`);
