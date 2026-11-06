import { musicFiles,prepareLoop } from './music-loop.js';

const fadeValue=(from,to,p)=>Math.sqrt(from*from*Math.cos(p*Math.PI/2)**2+to*to*Math.sin(p*Math.PI/2)**2);
/** Two music decks. Only ready buffers replace the outgoing music. No game-clock dependency. */
export class MusicPlayer {
  constructor(context,destination) {
    this.context=context;this.destination=destination;this.target=null;this.serial=0;this.live=new Map();
    this.cache=new Map();this.pending=new Map();this.failures=new Set();this.closed=false;
    this.transitions=0;this.maxDecks=0;this.fadeSeconds=2;
  }
  async manifest() {
    if(!this.metadata)this.metadata=fetch(new URL('audio/music/manifest.json',import.meta.url)).then(async response=>{
      if(!response.ok)throw Error(`manifesto HTTP ${response.status}`);return response.json();
    });
    return this.metadata;
  }
  async preload(mode) {
    if(!musicFiles[mode]||this.closed)return null;
    if(this.cache.has(mode)){const entry=this.cache.get(mode);this.cache.delete(mode);this.cache.set(mode,entry);return entry;}
    if(this.pending.has(mode))return this.pending.get(mode);
    const promise=(async()=>{
      try {
        const manifest=await this.manifest(),spec=manifest.tracks[mode];
        const response=await fetch(new URL(`audio/music/${musicFiles[mode]}`,import.meta.url));
        if(!response.ok)throw Error(`HTTP ${response.status}`);
        const decoder=new OfflineAudioContext(2,1,32000);
        const original=await decoder.decodeAudioData(await response.arrayBuffer());
        if(this.closed)return null;
        const entry=prepareLoop(this.context,original,spec);
        entry.spec=spec;this.cache.set(mode,entry);
        while(this.cache.size>2)this.cache.delete(this.cache.keys().next().value);
        return entry;
      } catch(error) {if(!this.closed){this.failures.add(mode);console.warn(`[pp música] ${mode}: ${error.message}`);}return null;}
      finally {this.pending.delete(mode);}
    })();
    this.pending.set(mode,promise);return promise;
  }
  async mode(mode) {
    if(this.closed||mode!=null&&!musicFiles[mode])return;
    try {
      this.target=mode;const token=++this.serial;
      if(mode===null){this.transition(null,null);return;}
      const current=this.live.get(mode);
      if(current){this.transition(mode,null);return;}
      const entry=await this.preload(mode);
      if(!entry||this.closed||token!==this.serial)return;
      this.transition(mode,entry);
    } catch(error) {if(!this.closed){this.failures.add(mode);console.warn(`[pp música] transição: ${error.message}`);}}
  }
  value(voice,time) {
    const f=voice.fade;if(!f)return 0;
    return fadeValue(f.from,f.to,Math.max(0,Math.min(1,(time-f.start)/f.duration)));
  }
  ramp(voice,to,time) {
    const from=this.value(voice,time),duration=this.fadeSeconds;
    voice.gain.gain.cancelScheduledValues(0);voice.gain.gain.setValueAtTime(from,time);
    const curve=new Float32Array(129);
    for(let i=0;i<curve.length;i++)curve[i]=fadeValue(from,to,i/(curve.length-1));
    voice.gain.gain.setValueCurveAtTime(curve,time,duration);
    voice.fade={from,to,start:time,duration};
    const cutoff=voice.filter.frequency.value;
    voice.filter.frequency.cancelScheduledValues(time);
    voice.filter.frequency.setValueAtTime(Math.max(700,cutoff),time);
    voice.filter.frequency.exponentialRampToValueAtTime(to?15000:700,time+duration);
  }
  transition(mode,entry) {
    if(this.closed)return;
    const c=this.context,time=c.currentTime;
    // A finished fade may still be waiting for its cleanup timer. Retain its buffer before retiring it.
    entry??=this.live.get(mode)?.entry;
    // Remove finished fades using AudioContext time, including after background suspension.
    for(const [key,v] of this.live)if(v.fade?.to===0&&time>=v.fade.start+v.fade.duration)this.retire(key,v,time);
    let incoming=this.live.get(mode);
    if(incoming&&incoming.fade?.to===1&&[...this.live.values()].every(v=>v===incoming||v.fade?.to===0))return;
    if(mode&&!incoming) {
      if(!entry)return;
      if(this.live.size>=2) {
        const [key,weakest]=[...this.live].sort((a,b)=>this.value(a[1],time)-this.value(b[1],time))[0];
        this.retire(key,weakest,time);
      }
      const source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();
      source.buffer=entry.buffer;source.loop=true;source.playbackRate.value=1;gain.gain.value=0;
      filter.type='lowpass';filter.frequency.value=700;
      source.connect(filter);filter.connect(gain);gain.connect(this.destination);
      incoming={source,gain,filter,fade:{from:0,to:0,start:time,duration:1},mode,entry};this.live.set(mode,incoming);
      source.onended=()=>{if(this.live.get(mode)===incoming)this.live.delete(mode);source.disconnect();filter.disconnect();gain.disconnect();};
      source.start(time);
    }
    for(const v of this.live.values())this.ramp(v,v===incoming?1:0,time);
    this.transitions++;this.maxDecks=Math.max(this.maxDecks,this.live.size);
    this.cleanup();
  }
  cleanup() {
    clearTimeout(this.cleanupTimer);
    this.cleanupTimer=setTimeout(()=>{
      if(this.closed)return;
      const time=this.context.currentTime;
      for(const [key,v] of this.live)if(v.fade.to===0&&time>=v.fade.start+v.fade.duration)this.retire(key,v,time);
      if([...this.live.values()].some(v=>v.fade.to===0))this.cleanup();
    },2100);
  }
  retire(key,voice,time) {
    this.live.delete(key);
    const level=this.value(voice,time);
    voice.gain.gain.cancelScheduledValues(0);voice.gain.gain.setValueAtTime(level,time);voice.gain.gain.linearRampToValueAtTime(0,time+.035);
    try{voice.source.stop(time+.04);}catch{}
  }
  destroy() {
    this.closed=true;this.serial++;clearTimeout(this.cleanupTimer);
    for(const [key,v] of this.live)this.retire(key,v,this.context.currentTime);
    this.cache.clear();
  }
  get diagnostics() {
    const time=this.context.currentTime;
    return {target:this.target,tracks:[...this.live.values()].map(v=>({mode:v.mode,gain:this.value(v,time),rate:v.source.playbackRate.value,
      fadingTo:v.fade.to,duration:v.entry.buffer.duration})),cached:[...this.cache.keys()],loading:[...this.pending.keys()],
      failures:[...this.failures],transitions:this.transitions,maxDecks:this.maxDecks,crossfadeSeconds:this.fadeSeconds};
  }
}
