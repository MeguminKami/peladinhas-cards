import {createVoicePlayer,voiceForEvent} from './voices.mjs';
// Music has its own volume. All game feedback shares one replaceable channel.
export function createAudio(getSettings){
 const track=new Audio();track.loop=true;track.preload='none';
 let ctx,trackName='',unlocked=false,destroyed=false,timer=null,beatAt=0;
 let generation=0,clip=null,cue=null,voicePending=false,lossIndex=0;
 const volume=()=>Math.max(0,Math.min(1,getSettings().volume));
 function context(){if(!ctx)ctx=new AudioContext();return ctx;}
 function mix(){track.volume=Math.max(0,Math.min(1,getSettings().musicVolume??.3))*((clip||cue||voicePending||voices.playing)?.22:1);}
 const voices=createVoicePlayer({context,getSettings,isHidden:()=>destroyed||document.hidden,onState:detail=>{
  voicePending=false;mix();document.dispatchEvent(new CustomEvent('cardoso:voice',{detail}));
 }});
 function stopFeedback(){
  generation++;voicePending=false;voices.stop();
  if(clip){const old=clip;clip=null;old.onended=null;old.onerror=null;old.pause();old.removeAttribute('src');old.load();}
  if(cue){const old=cue;cue=null;old.source.onended=null;try{old.source.stop();}catch{}old.source.disconnect();old.gain.disconnect();}
  mix();
 }
 function start(){
  if(destroyed)return;
  const settings=getSettings(),name=settings.mode==='extreme'?'extreme':'easy_medium_hard';
  if(trackName!==name){track.pause();track.src=`assets/audio/${name}.mp3`;track.load();trackName=name;clearInterval(timer);timer=null;}
  mix();
  if(unlocked&&settings.music&&track.volume>0&&!document.hidden){
   if(track.paused)void track.play().catch(()=>{});
   if(!timer)timer=setInterval(()=>{beatAt=performance.now();},settings.mode==='extreme'?95:125);
  }else{track.pause();clearInterval(timer);timer=null;}
 }
 function recording(name,request){
  const current=new Audio(`assets/audio/${name}.ogg`);clip=current;current.volume=volume();mix();
  const done=()=>{if(request!==generation||clip!==current)return;clip=null;mix();};
  current.onended=done;current.onerror=done;void current.play().catch(done);
 }
 function stepCue(){
  const a=context(),source=a.createOscillator(),gain=a.createGain(),t=a.currentTime;
  source.type='triangle';source.frequency.setValueAtTime(440,t);source.frequency.exponentialRampToValueAtTime(880,t+.15);
  gain.gain.setValueAtTime(Math.max(.001,volume()*.3),t);gain.gain.exponentialRampToValueAtTime(.001,t+.18);
  source.connect(gain).connect(a.destination);const current={source,gain};cue=current;mix();
  source.onended=()=>{source.disconnect();gain.disconnect();if(cue===current){cue=null;mix();}};
  source.start();source.stop(t+.2);
 }
 function event(kind,step){
  stopFeedback();if(destroyed||document.hidden||volume()<=0)return;
  const settings=getSettings();
  // Supplied recordings replace legacy voices and synthesized fanfares.
  const name=kind==='start'?'starrt_1':kind==='lost'?`perdeu_${1+lossIndex++%2}`:['won','paid'].includes(kind)?'win_1':null;
  if(name&&settings.effects){recording(name,generation);return;}
  if(settings.voices){voicePending=true;voices.voice(voiceForEvent(kind,step));mix();}
  else if(kind==='step'&&settings.effects){try{void context().resume().catch(()=>{});stepCue();}catch{}}
 }
 function configure(){
  const settings=getSettings();
  if(volume()<=0||document.hidden||(!settings.effects&&clip)||(!settings.effects&&cue)||(!settings.voices&&(voicePending||voices.playing)))stopFeedback();
  else{voices.configure();if(clip)clip.volume=volume();if(cue)cue.gain.gain.value=volume()*.3;}
  start();
 }
 function visibility(){if(document.hidden)stopFeedback();start();}
 function pageHide(){stopFeedback();track.pause();clearInterval(timer);timer=null;}
 function pageShow(e){if(e.persisted)configure();}
 function destroy(){if(destroyed)return;destroyed=true;pageHide();track.removeAttribute('src');track.load();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pageHide);window.removeEventListener('pageshow',pageShow);if(ctx)void ctx.close().catch(()=>{});}
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pageHide);window.addEventListener('pageshow',pageShow);
 return {configure,event,unlock(){if(destroyed)return;unlocked=true;start();},destroy,get beatAt(){return beatAt;}};
}
