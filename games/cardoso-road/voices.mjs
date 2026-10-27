export const VOICE_CLIPS=Object.freeze({
 zero_oleo:'Zero óleo!',
 mais_um_pre:'Mais um PR!',
 uma_chupadela_de_cada_vez:'Uma chupadela de cada vez!',
 fui_frito:'Fui frito!',
 e_so_gains:'É só gains!',
 proteina_pura:'Proteína pura!',
 grito_de_cashout:'Gains no bolso!',
 isso_nao_tem_oleo:'Isso não tem óleo!',
});
export const STEP_CLIPS=['mais_um_pre','proteina_pura','e_so_gains','isso_nao_tem_oleo','zero_oleo'];
export function voiceForEvent(event,step=0){
 if(event==='start')return 'uma_chupadela_de_cada_vez';
 if(event==='step')return STEP_CLIPS[(Math.max(1,Math.trunc(step)||1)-1)%STEP_CLIPS.length];
 return {lost:'fui_frito',paid:'grito_de_cashout',won:'zero_oleo'}[event]??null;
}
// One replaceable voice channel. A late download can never replay an old event.
export function createVoicePlayer({context,getSettings,fetchAudio=globalThis.fetch,onState=()=>{},isHidden=()=>false}){
 const cache=new Map();let generation=0,active=null;
 const notify=(clip,status,format)=>onState({clip,status,format});
 function stop(){generation++;if(!active)return;const old=active;active=null;old.source.onended=null;try{old.source.stop();}catch{}old.source.disconnect();old.gain.disconnect();notify(old.clip,'stopped',old.format);}
 async function load(clip){
  if(!cache.has(clip))cache.set(clip,(async()=>{
   for(const format of ['ogg','wav']){try{const response=await fetchAudio(new URL(`./assets/voices/${clip}.${format}`,import.meta.url));if(!response.ok)throw Error('Audio unavailable');const buffer=await context().decodeAudioData(await response.arrayBuffer());return {buffer,format};}catch{}}
   throw Error('Voice unavailable');
  })());
  try{return await cache.get(clip);}catch(error){cache.delete(clip);throw error;}
 }
 function voice(clip){
  stop();if(!Object.hasOwn(VOICE_CLIPS,clip)||!getSettings().voices||getSettings().volume<=0||isHidden())return;
  const request=generation;
  // Intentionally detached from game processing and round settlement.
  void (async()=>{try{
   const audio=context();await audio.resume();const {buffer,format}=await load(clip);
   if(request!==generation||!getSettings().voices||getSettings().volume<=0||isHidden())return;
   const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;gain.gain.value=getSettings().volume;source.connect(gain).connect(audio.destination);
   const playing={source,gain,clip,format};active=playing;
   source.onended=()=>{source.disconnect();gain.disconnect();if(active===playing){active=null;notify(clip,'ended',format);}};
   source.start();notify(clip,'playing',format);
  }catch{if(request===generation)notify(clip,'unavailable');}})();
 }
 function configure(){if(!getSettings().voices||getSettings().volume<=0||isHidden())stop();else if(active)active.gain.gain.value=getSettings().volume;}
 return {voice,stop,configure,get playing(){return !!active;}};
}
