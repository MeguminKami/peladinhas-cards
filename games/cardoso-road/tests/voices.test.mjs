import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VOICE_CLIPS,voiceForEvent,createVoicePlayer} from '../voices.mjs';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({fetchAudio,decode}={}){
 const settings={voices:true,volume:.4},events=[],started=[],sources=[],gains=[];
 const audio={destination:{},resume:async()=>{},decodeAudioData:decode|| (async()=>({})),createGain(){const node={gain:{value:0},connect(){return this;},disconnect(){}};gains.push(node);return node;},createBufferSource(){const source={connect(){return this;},disconnect(){},start(){started.push(this);},stop(){this.stopped=true;},onended:null};sources.push(source);return source;}};
 const player=createVoicePlayer({context:()=>audio,getSettings:()=>settings,fetchAudio:fetchAudio|| (async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})),onState:e=>events.push(e)});
 return {player,settings,events,started,sources,gains};
}
test('all eight recordings are mapped and have OGG originals and PCM fallback files',()=>{
 const used=new Set(['start','lost','paid','won'].map(e=>voiceForEvent(e)));
 for(let step=1;step<=10;step++)used.add(voiceForEvent('step',step));
 assert.deepEqual([...used].sort(),Object.keys(VOICE_CLIPS).sort());
 for(const clip of used){assert.equal(readFileSync(new URL(`../assets/voices/${clip}.ogg`,import.meta.url)).subarray(0,4).toString(),'OggS');assert.equal(readFileSync(new URL(`../assets/voices/${clip}.wav`,import.meta.url)).subarray(0,4).toString(),'RIFF');}
});
test('late old downloads cannot interrupt a more recent cashout',async()=>{
 let resolveOld;
 const f=fixture({fetchAudio:async url=>{if(url.pathname.includes('uma_chupadela'))await new Promise(resolve=>{resolveOld=resolve;});return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}});
 f.player.voice('uma_chupadela_de_cada_vez');await flush();f.player.voice('grito_de_cashout');await flush();resolveOld();await flush();
 assert.deepEqual(f.events.filter(e=>e.status==='playing').map(e=>e.clip),['grito_de_cashout']);assert.equal(f.started.length,1);
});
test('voices replace rather than overlap, volume applies live, and disabling stops playback',async()=>{
 const f=fixture();f.player.voice('mais_um_pre');await flush();f.player.voice('e_so_gains');await flush();assert.equal(f.sources[0].stopped,true);assert.equal(f.player.playing,true);
 f.settings.volume=.15;f.player.configure();assert.equal(f.gains.at(-1).gain.value,.15);
 f.settings.voices=false;f.player.configure();assert.equal(f.player.playing,false);assert.equal(f.sources.at(-1).stopped,true);f.player.voice('zero_oleo');await flush();assert.equal(f.started.length,2);
});
test('mute invalidates pending playback and WAV is used if OGG decoding fails',async()=>{
 let release;const muted=fixture({fetchAudio:async()=>{await new Promise(resolve=>{release=resolve;});return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}});
 muted.player.voice('zero_oleo');await flush();muted.settings.volume=0;muted.player.configure();release();await flush();assert.equal(muted.started.length,0);
 const requests=[];const fallback=fixture({fetchAudio:async url=>{requests.push(url.pathname);return {ok:true,arrayBuffer:async()=>Uint8Array.of(url.pathname.endsWith('.ogg')?0:1).buffer};},decode:async bytes=>{if(new Uint8Array(bytes)[0]===0)throw Error('Unsupported codec');return {};}});
 fallback.player.voice('fui_frito');await flush();assert.equal(fallback.events.at(-1).format,'wav');fallback.player.voice('fui_frito');await flush();assert.equal(requests.length,2,'decoded clips are cached');
});
