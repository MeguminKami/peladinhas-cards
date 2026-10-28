import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from '../audio.mjs';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('one feedback channel cancels recordings, pending voices and cues; music switches and keeps its level',async()=>{
 const originals=Object.fromEntries(['Audio','AudioContext','document','window','fetch'].map(k=>[k,globalThis[k]]));
 const originalRandom=Math.random;Math.random=()=>0;
 const media=[],sources=[];let releaseVoice,immediateVoices=false;
 class Media{constructor(src=''){this.src=src;this.originalSrc=src;this.paused=true;this.volume=1;media.push(this);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}load(){this.paused=true;}removeAttribute(){this.src='';}}
 class Context{destination={};currentTime=0;resume(){return Promise.resolve();}close(){return Promise.resolve();}decodeAudioData(){return Promise.resolve({});}createGain(){return {gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this;},disconnect(){}};}createBufferSource(){const s={frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this;},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;},onended:null};sources.push(s);return s;}createOscillator(){return this.createBufferSource();}}
 globalThis.Audio=Media;globalThis.AudioContext=Context;globalThis.document=new EventTarget();document.hidden=false;globalThis.window=new EventTarget();
 globalThis.fetch=async()=>{if(!immediateVoices)await new Promise(resolve=>{releaseVoice=resolve;});return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};};
 const settings={effects:true,voices:true,music:true,volume:.4,musicVolume:.6,mode:'normal'};
 const audio=createAudio(()=>settings),music=media[0];
 try{
  audio.unlock();assert.ok(music.src.endsWith('easy_medium_hard.mp3'));assert.equal(music.volume,.6);
  audio.event('start');const initial=media.at(-1);assert.ok(initial.src.endsWith('starrt_1.ogg'));assert.equal(sources.length,0,'no voice or synthetic fanfare layered on recording');assert.equal(music.volume,.6,'music keeps the chosen level during feedback');
  audio.event('step',1);await flush();assert.equal(initial.paused,true);
  audio.event('paid');const paid=media.at(-1);releaseVoice();await flush();assert.equal(sources.filter(s=>s.started).length,0,'late old voice cannot start over cashout');assert.ok(paid.src.endsWith('win_1.ogg'));
  const played=[];document.addEventListener('cardoso:voice',e=>{if(e.detail.status==='playing')played.push(e.detail.clip);});
  immediateVoices=true;
  for(let i=0;i<7;i++){Math.random=()=>(i+.5)/7;audio.event('step',i+1);await flush();}
  assert.deepEqual([...new Set(played)].sort(),['mais_um_pre','proteina_pura','e_so_gains','isso_nao_tem_oleo','zero_oleo'].sort());
  for(const name of ['unlearnthematrix','maluco'])assert.ok(media.some(a=>a.originalSrc.endsWith(name+'.ogg')));
  audio.event('lost');assert.equal(paid.paused,true);assert.ok(media.at(-1).src.endsWith('perdeu_1.ogg'));
  audio.event('lost');assert.ok(media.at(-1).src.endsWith('perdeu_2.ogg'));assert.equal(media.filter(a=>!a.loop&&!a.paused).length,1);
  settings.effects=false;audio.configure();assert.equal(media.filter(a=>!a.loop&&!a.paused).length,0);assert.equal(music.volume,.6);
  settings.voices=false;settings.effects=true;audio.event('step',2);const victory=media.at(-1);assert.ok(/(maluco|unlearnthematrix)\.ogg$/.test(victory.src));audio.event('start');assert.equal(victory.paused,true);
  settings.mode='extreme';audio.configure();assert.ok(music.src.endsWith('/extreme.mp3'));assert.equal(media.filter(a=>a.loop).length,1);
  settings.volume=0;audio.configure();assert.equal(media.filter(a=>!a.loop&&!a.paused).length,0);
  document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));assert.equal(music.paused,true);
  audio.destroy();audio.event('start');assert.equal(media.filter(a=>!a.paused).length,0);
 }finally{Math.random=originalRandom;audio.destroy();for(const [key,value] of Object.entries(originals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
