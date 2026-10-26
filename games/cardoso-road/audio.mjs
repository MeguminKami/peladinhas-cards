import {createVoicePlayer,voiceForEvent} from './voices.mjs';
// Local music tracks and event recordings; synthesized step cues and Cardoso voices.
export function createAudio(getSettings){
 const track=new Audio();track.loop=true;track.preload='none';let trackName='',unlocked=false,lossIndex=0;const clips=new Set();
 let ctx,master,timer,beatAt=0,destroyed=false;
 const now=()=>performance.now();
 function context(){
  if(destroyed)throw Error('Audio closed');
  if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=getSettings().volume;master.connect(ctx.destination);}
  return ctx;
 }
 const voices=createVoicePlayer({context,getSettings,isHidden:()=>document.hidden,onState:detail=>document.dispatchEvent(new CustomEvent('cardoso:voice',{detail}))});
 function note(freq,type,duration,gain,delay=0,slide,isMusic=false){
  if(getSettings().volume<=0)return;
  const a=context(),t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+duration);
  const level=gain*(isMusic&&voices.playing?.25:1);
  g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,level),t+.008);g.gain.exponentialRampToValueAtTime(.001,t+duration);
  o.connect(g).connect(master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 function noise(duration,gain,delay=0,isMusic=false){
  if(getSettings().volume<=0)return;
  const a=context(),t=a.currentTime+delay,buffer=a.createBuffer(1,Math.ceil(a.sampleRate*duration),a.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);
  const source=a.createBufferSource(),filter=a.createBiquadFilter(),g=a.createGain();source.buffer=buffer;filter.type='highpass';filter.frequency.value=1400;g.gain.value=gain*(isMusic&&voices.playing?.25:1);
  source.connect(filter).connect(g).connect(master);source.start(t);source.onended=()=>{source.disconnect();filter.disconnect();g.disconnect();};
 }
 function start(){if(destroyed)return;const settings=getSettings(),name=settings.mode==='extreme'?'extreme':'easy_medium_hard';
  if(trackName!==name){clearInterval(timer);timer=null;track.pause();track.src=`assets/audio/${name}.mp3`;trackName=name;}
  track.volume=Math.max(0,Math.min(1,settings.musicVolume??.3));
  if(unlocked&&settings.music&&track.volume>0&&!document.hidden){if(track.paused)void track.play().catch(()=>{});if(!timer)timer=setInterval(()=>{beatAt=now();},settings.mode==='extreme'?95:125);}else{track.pause();clearInterval(timer);timer=null;}
 }
 function recording(kind){const name=kind==='start'?'starrt_1':kind==='lost'?`perdeu_${1+lossIndex++%2}`:['won','paid'].includes(kind)?'win_1':null;if(!name)return;
  for(const clip of clips){clip.pause();clip.src='';}clips.clear();
  const clip=new Audio(`assets/audio/${name}.ogg`);clip.volume=Math.max(0,Math.min(1,getSettings().volume));clips.add(clip);const done=()=>clips.delete(clip);clip.onended=done;clip.onerror=done;void clip.play().catch(done);
 }
 function configure(){
  if(master)master.gain.setTargetAtTime(getSettings().volume,ctx.currentTime,.015);
  voices.configure();for(const clip of clips){clip.volume=Math.max(0,Math.min(1,getSettings().volume));if(!getSettings().effects)clip.pause();}if(!getSettings().effects)clips.clear();start();
 }
 function effect(kind){if(!getSettings().effects)return;try{
  void context().resume().catch(()=>{});recording(kind);
  if(kind==='start'){note(150,'triangle',.12,.22);noise(.08,.1,.09);note(300,'triangle',.15,.14,.1);}
  else if(kind==='step'){noise(.045,.13);noise(.045,.1,.12);[440,554,659].forEach((f,i)=>note(f,'triangle',.17,.16,i*.065));}
  else if(kind==='lost'){noise(.3,.23);[220,165,110,73].forEach((f,i)=>note(f,'sawtooth',.17,.1,i*.11));}
  else if(kind==='paid'){[659,830,988,1318].forEach((f,i)=>note(f,'sine',.3,.2,i*.08));}
  else if(kind==='won'){[523,659,784,1046,1318,1568].forEach((f,i)=>note(f,'triangle',.5,.18,i*.1));}
 }catch{}}
 function visibility(){if(document.hidden){voices.stop();for(const clip of clips)clip.pause();clips.clear();}start();}
 function pageHide(){track.pause();for(const clip of clips)clip.pause();clips.clear();voices.stop();clearInterval(timer);timer=null;}
 function pageShow(event){if(event.persisted)configure();}
 function destroy(){if(destroyed)return;destroyed=true;pageHide();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pageHide);window.removeEventListener('pageshow',pageShow);if(ctx)void ctx.close().catch(()=>{});}
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pageHide);window.addEventListener('pageshow',pageShow);
 return {configure,unlock(){unlocked=true;try{void context().resume().catch(()=>{});if(getSettings().music)start();}catch{}},effect,voice(event,step){voices.voice(voiceForEvent(event,step));},destroy,get beatAt(){return beatAt;}};
}
