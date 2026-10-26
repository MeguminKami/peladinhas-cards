import {cpSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const source=new URL('./',import.meta.url),target=new URL('../../assets/games/cardoso-road/',import.meta.url);
mkdirSync(target,{recursive:true});
for(const name of ['index.html','game.html','embed.css','host.css','mount.mjs','preview.css','preview.mjs','style.css','app.mjs','scene.mjs','progression.mjs','audio.mjs','voices.mjs','enemies.mjs','engine.mjs','assets'])cpSync(new URL(name,source),new URL(name,target),{recursive:true});
console.log(`Cardoso Road demo preparado em ${fileURLToPath(target)}`);
