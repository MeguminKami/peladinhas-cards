// Original procedural score and sound design. No external recordings or samples.
export type AudioScene='base'|'normal'|'superior'|'legend'|'entry'|'win'|'summary';
export interface AudioSettings {sound:boolean;masterVolume:number;musicVolume:number;effectsVolume:number;ambienceVolume:number}
export const audioDefaults:AudioSettings={sound:true,masterVolume:.7,musicVolume:.4,effectsVolume:.75,ambienceVolume:.25};
type Voice={source:AudioScheduledSourceNode;nodes:AudioNode[];bus:'music'|'effects'|'ambience'};
let ctx:AudioContext|undefined,master:GainNode,music:GainNode,effects:GainNode,ambience:GainNode,duck:GainNode,meter:AnalyserNode;
let settings={...audioDefaults},scene:AudioScene='base',tier=3,beat=0,nextBeat=0,clock:ReturnType<typeof setInterval>|undefined;
let noiseBuffer:AudioBuffer,rolling=false,tension=false,duckUntil=0,lastPulse=0,remainingFs=10;
const voices=new Set<Voice>();
const clamp=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
function ramp(node:AudioParam,value:number,time=.08){if(!ctx)return;node.cancelScheduledValues(ctx.currentTime);node.setTargetAtTime(value,ctx.currentTime,time);}
export function configureAudio(value:Partial<AudioSettings>){settings={...settings,...value};for(const key of ['masterVolume','musicVolume','effectsVolume','ambienceVolume'] as const)settings[key]=clamp(settings[key]);if(ctx){ramp(master.gain,settings.sound?settings.masterVolume:0);ramp(music.gain,settings.musicVolume);ramp(effects.gain,settings.effectsVolume);ramp(ambience.gain,settings.ambienceVolume);}if(!settings.sound)stopEffects();}
function ready(){return !!ctx&&ctx.state==='running'&&settings.sound&&!document.hidden;}
export function unlockAudio(){
 try{
  if(!ctx){
   ctx=new AudioContext();master=ctx.createGain();music=ctx.createGain();effects=ctx.createGain();ambience=ctx.createGain();duck=ctx.createGain();
   const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=12;limiter.ratio.value=8;limiter.attack.value=.004;limiter.release.value=.18;
   meter=ctx.createAnalyser();meter.fftSize=256;
   music.connect(duck);ambience.connect(duck);duck.connect(master);effects.connect(master);master.connect(limiter).connect(meter).connect(ctx.destination);
   noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=noiseBuffer.getChannelData(0);let seed=4781;
   for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=seed/2147483648;}
   configureAudio(settings);nextBeat=ctx.currentTime+.06;clock=setInterval(schedule,80);
  }
  if(!document.hidden&&ctx.state==='suspended')void ctx.resume().then(()=>{nextBeat=ctx!.currentTime+.04;}).catch(()=>{});
 }catch{/* Browsers without audio keep the complete visual experience. */}
}
function attach(source:AudioScheduledSourceNode,nodes:AudioNode[],bus:Voice['bus'],time:number,duration:number){
 if(!ctx||voices.size>=64){source.disconnect();nodes.forEach(n=>n.disconnect());return;}
 const voice={source,nodes,bus};voices.add(voice);source.onended=()=>{source.disconnect();nodes.forEach(n=>n.disconnect());voices.delete(voice);};source.start(time);source.stop(time+duration);
}
function tone(frequency:number,time:number,duration=.16,volume=.08,type:OscillatorType='sine',bus:Voice['bus']='effects',endFrequency?:number){
 if(!ready())return;const oscillator=ctx!.createOscillator(),gain=ctx!.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,time);if(endFrequency)oscillator.frequency.exponentialRampToValueAtTime(endFrequency,time+duration);
 gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
 oscillator.connect(gain).connect(bus==='music'?music:bus==='ambience'?ambience:effects);attach(oscillator,[gain],bus,time,duration+.02);
}
function noise(time:number,duration:number,volume:number,frequency:number,bus:Voice['bus']='effects',q=.7){
 if(!ready())return;const source=ctx!.createBufferSource(),filter=ctx!.createBiquadFilter(),gain=ctx!.createGain();source.buffer=noiseBuffer;source.loop=true;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=q;
 gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+Math.min(.08,duration/3));gain.gain.exponentialRampToValueAtTime(.0001,time+duration);source.connect(filter).connect(gain).connect(bus==='music'?music:bus==='ambience'?ambience:effects);attach(source,[filter,gain],bus,time,duration+.03);
}
function duckMusic(seconds=.7){if(ctx)duckUntil=Math.max(duckUntil,ctx.currentTime+seconds);}
const melody=[0,7,10,7,3,7,12,10,0,7,15,12,10,7,3,7];
function schedule(){
 if(!ready())return;
 const now=ctx!.currentTime;ramp(duck.gain,now<duckUntil?.35:1,.1);
 if(nextBeat<now-.2)nextBeat=now+.02;
 const bpm=scene==='legend'?136:scene==='superior'?128:scene==='normal'?120:scene==='win'?116:105,step=60/bpm/2;
 while(nextBeat<now+.18){
  const t=nextBeat,b=beat++%32,quiet=scene==='entry'||scene==='summary',root=[146.832,130.813,116.541,130.813][Math.floor(b/8)];
  if(b%4===0){tone(root/2,t,.35,quiet?.035:.085,'triangle','music');tone(root,t,.65,.018,'sine','music');tone(root*1.4983,t,.65,.014,'sine','music');}
  if(!quiet){
   if(b%4===0)tone(110,t,.15,.12,'sine','music',42);
   if(b%4===2){noise(t,.13,.055,1700,'music');noise(t+.035,.08,.035,2200,'music');}
   noise(t,.04,.012,b%2?6500:4500,'music');
   if(b%2===0)tone(root*2*Math.pow(2,melody[(b/2)%16]/12),t,.21,.027,'triangle','music');
   if((scene==='normal'||scene==='superior'||scene==='legend')&&remainingFs<=3&&b%2===1)noise(t,.055,.025,2800,'music');
   if(scene==='legend'||scene==='superior'||scene==='win'&&tier>=5){if(b%8===0){tone(root*2,t,.45,.025,'sawtooth','music');tone(root*2.5,t,.45,.018,'triangle','music');}}
  }else if(b%8===0)tone(root*4,t,.7,.025,'sine','music');
  if(b%8===0){noise(t,1.8,.028,650,'ambience');noise(t+.1,1.5,.012,1800,'ambience');}
  if(rolling)noise(t,.12,.025,850,'effects');
  if(tension){tone(65,t,.12,.065,'sine');tone(523.25,t,.12,.018,'triangle');duckMusic(.4);}
  nextBeat+=step;
 }
}
export function setAudioScene(value:AudioScene){if(scene===value)return;scene=value;beat=0;if(ctx)nextBeat=ctx.currentTime+.05;}
export function setAudioFreeSpins(remaining:number){remainingFs=remaining;}
export function stopEffects(){rolling=false;tension=false;for(const voice of [...voices])if(voice.bus==='effects'){try{voice.source.stop();}catch{/* Already stopped. */}}}
export function reelAudio(active:boolean){rolling=active;if(active)audioCue('spin');else tension=false;}
export function suspenseAudio(){tension=true;duckMusic(1);}
export function counterAudio(progress:number){if(!ready()||ctx!.currentTime-lastPulse<.105)return;lastPulse=ctx!.currentTime;tone(587.33*Math.pow(2,Math.floor(progress*7)/12),lastPulse,.075,.018,'sine');}
export function victoryAudio(value:number){tier=value;audioCue('victory',value);}
export function audioCue(name:string,value=0,delay=0){
 if(!ready())return;const t=ctx!.currentTime+delay;
 if(name==='ui'){tone(440,t,.045,.035,'sine');return;}
 if(name==='bet'){tone(value<0?330:494,t,.07,.045,'triangle');return;}
 if(name==='line'){tone([587.33,659.25,783.99,880][value%4],t,.11,.055,'sine');return;}
 if(name==='spin'){noise(t,.18,.07,1200);tone(110,t,.12,.08,'sine',undefined,55);return;}
 if(name==='land'){noise(t,.06,.08,650+value*65);tone(120+value*8,t,.07,.055,'sine');return;}
 if(name==='wild'){tone(392,t,.18,.055,'triangle');tone(784,t+.04,.2,.035);return;}
 if(name==='scatter'){duckMusic(.6);[523.25,659.25,783.99].slice(0,Math.min(3,value)).forEach((f,i)=>tone(f,t+i*.045,.3,.065,'triangle'));return;}
 if(name==='charge'){duckMusic(1.5);tone(220,t,.45,.055,'sine','effects',880);noise(t,.35,.04,2200);return;}
 if(name==='power'){
  duckMusic(1);const notes=[[392,784],[196,392,784],[523.25,659.25,783.99],[261.63,329.63,392,523.25]][value-1]??[392];notes.forEach((f,i)=>tone(f,t+i*.08,.3,.075,'triangle'));if(value===2||value===4)noise(t,.3,.09,value===2?850:450);return;
 }
 if(name==='convert'){tone([523.25,587.33,659.25,783.99][value%4],t,.13,.04,'triangle');return;}
 if(name==='sticky'){duckMusic(1);tone(98,t,.3,.1,'sine');[587.33,783.99,1174.66].forEach((f,i)=>tone(f,t+i*.1,.5,.05,'triangle'));return;}
 if(name==='last'){tone(392,t,.16,.04,'triangle');tone(523.25,t+.12,.22,.045,'triangle');return;}
 if(name==='victory'||name==='bonus'||name==='retrigger'||name==='final'){
  duckMusic(1.4);const notes=name==='retrigger'?[659.25,783.99,1046.5]:[392,493.88,587.33,783.99];notes.forEach((f,i)=>tone(f,t+i*.1,.45,.055,name==='bonus'?'triangle':'sine'));
  noise(t,.8,name==='victory'&&value<3?.06:.13,1100);if(name==='retrigger')tone(1760,t,.11,.035,'sine');
 }
}
export function audioStatus(){const samples=new Float32Array(256);meter?.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length);return {state:ctx?.state??'locked',scene,voices:voices.size,effectVoices:[...voices].filter(v=>v.bus==='effects').length,settings:{...settings},rolling,tension,rms};}
if(typeof document !== 'undefined') document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden){stopEffects();void ctx.suspend().catch(()=>{});}else if(settings.sound){nextBeat=ctx.currentTime+.04;void ctx.resume().catch(()=>{});}});
if(typeof window !== 'undefined') window.addEventListener('pagehide',()=>{clearInterval(clock);stopEffects();void ctx?.close().catch(()=>{});});
