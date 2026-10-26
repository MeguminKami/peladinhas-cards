import {createVoicePlayer,voiceForEvent} from './voices.mjs';
// Original synthesized music/effects, plus the eight supplied voice recordings.
export function createAudio(getSettings){
 let ctx,master,timer,beatAt=0,beat=0,celebrateUntil=0,destroyed=false;
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
 function tick(){if(!getSettings().music||document.hidden)return;try{
  beatAt=now();const final=now()<celebrateUntil,root=[110,130.81,146.83,98][Math.floor(beat/16)%4];
  if(beat%2===0)note(140,'sine',.17,.35,0,43,true);if(beat%4===2)noise(.12,.17,0,true);noise(.025,.055,0,true);
  note(root*(beat%8===7?2:1),'triangle',.16,.12,0,undefined,true);
  if(beat%2===1)note(root*[2,3,4,3][Math.floor(beat/2)%4]*(final?2:1),'sine',.2,final?.09:.04,0,undefined,true);beat++;
 }catch{}}
 function start(){if(timer||destroyed)return;try{void context().resume().catch(()=>{});timer=setInterval(tick,125);}catch{}}
 function configure(){
  if(master)master.gain.setTargetAtTime(getSettings().volume,ctx.currentTime,.015);
  voices.configure();if(getSettings().music&&getSettings().volume>0)start();else{clearInterval(timer);timer=null;}
 }
 function effect(kind){if(kind==='won')celebrateUntil=now()+10000;if(!getSettings().effects)return;try{
  void context().resume().catch(()=>{});
  if(kind==='start'){note(150,'triangle',.12,.22);noise(.08,.1,.09);note(300,'triangle',.15,.14,.1);}
  else if(kind==='step'){noise(.045,.13);noise(.045,.1,.12);[440,554,659].forEach((f,i)=>note(f,'triangle',.17,.16,i*.065));}
  else if(kind==='lost'){noise(.3,.23);[220,165,110,73].forEach((f,i)=>note(f,'sawtooth',.17,.1,i*.11));}
  else if(kind==='paid'){[659,830,988,1318].forEach((f,i)=>note(f,'sine',.3,.2,i*.08));}
  else if(kind==='won'){[523,659,784,1046,1318,1568].forEach((f,i)=>note(f,'triangle',.5,.18,i*.1));}
 }catch{}}
 function visibility(){if(document.hidden)voices.stop();}
 function pageHide(){voices.stop();clearInterval(timer);timer=null;}
 function pageShow(event){if(event.persisted)configure();}
 function destroy(){if(destroyed)return;destroyed=true;pageHide();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pageHide);window.removeEventListener('pageshow',pageShow);if(ctx)void ctx.close().catch(()=>{});}
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pageHide);window.addEventListener('pageshow',pageShow);
 return {configure,unlock(){try{void context().resume().catch(()=>{});if(getSettings().music)start();}catch{}},effect,voice(event,step){voices.voice(voiceForEvent(event,step));},destroy,get beatAt(){return beatAt;}};
}
