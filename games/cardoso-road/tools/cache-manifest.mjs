import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {VILLAINS} from '../enemies.mjs';
import {VOICE_CLIPS} from '../voices.mjs';
export const runtimeFiles=['index.html','game.html','embed.css','host.css','mount.mjs','preview.css','preview.mjs','style.css','boot.mjs','app.mjs','scene.mjs','render-cache.mjs','progression.mjs','audio.mjs','voices.mjs','enemies.mjs','engine.mjs','sw.js'];
export const resourceFiles=[...runtimeFiles,'assets/Manrope.woff2','assets/characters.png','assets/cardoso-poses-realistic.png','assets/cardoso-relax-v1.png','assets/gym.png',...['easy','normal','hard','extreme'].map(mode=>'assets/gym-'+mode+'-v2.png'),...VILLAINS.map(v=>v.sprite),...['easy_medium_hard.mp3','extreme.mp3','maluco.ogg','perdeu_1.ogg','perdeu_2.ogg','starrt_1.ogg','unlearnthematrix.ogg','win_1.ogg'].map(name=>'assets/audio/'+name),...Object.keys(VOICE_CLIPS).flatMap(name=>['ogg','wav'].map(format=>'assets/voices/'+name+'.'+format))];
export async function cacheManifest(base=new URL('../',import.meta.url)){
 const hash=createHash('sha256');
 for(const name of resourceFiles){hash.update(name);hash.update(await readFile(new URL(name,base)));}
 return 'self.CARDOSO_CACHE='+JSON.stringify({version:hash.digest('hex').slice(0,20),resources:resourceFiles})+';\n';
}
