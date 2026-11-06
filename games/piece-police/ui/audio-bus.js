import { sounds } from './audio-catalog.js';
import { MusicPlayer } from './music-player.js';

/** Presentation only. Missing/blocked audio degrades to silence. */
export class AudioBus {
  constructor({music=false,mode='base'}={}) {
    this.context=null;this.buffers=new Map();this.voices=new Set();this.last=new Map();this.failures=new Set();
    this.volumes={music:.1225,sfx:.1225,muted:false};this.played=0;this.peakVoices=0;this.closed=false;
    this.musicEnabled=music;this.musicMode=mode;this.suspenseLevel=0;
    this.onVisibility=()=>{
      this.stop();if(!this.context)return;
      clearTimeout(this.suspendTimer);
      const t=this.context.currentTime;this.master.gain.cancelScheduledValues(t);
      if(document.hidden){this.master.gain.setTargetAtTime(0,t,.01);this.suspendTimer=setTimeout(()=>{if(document.hidden&&!this.closed)this.context.suspend().catch(()=>{});},60);}
      else {this.master.gain.setValueAtTime(0,t);this.context.resume().then(()=>{if(!document.hidden&&!this.closed)this.master.gain.setTargetAtTime(this.volumes.muted?0:1,this.context.currentTime,.06);}).catch(()=>{});}
    };
    this.onPageHide=e=>{if(e.persisted){this.stop();this.context?.suspend().catch(()=>{});}else this.destroy();};
    this.onPageShow=e=>{if(e.persisted)this.onVisibility();};
    globalThis.document?.addEventListener('visibilitychange',this.onVisibility);
    globalThis.addEventListener?.('pagehide',this.onPageHide);
    globalThis.addEventListener?.('pageshow',this.onPageShow);
  }
  unlock() {
    if(this.closed)return Promise.resolve();
    try {
      if(!this.context) {
        const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return Promise.resolve();
        const c=this.context=new Context();
        this.master=c.createGain();this.sfx=c.createGain();this.music=c.createGain();this.filter=c.createBiquadFilter();this.compressor=c.createDynamicsCompressor();
        this.filter.type='lowpass';this.filter.frequency.value=6500;
        this.compressor.threshold.value=-12;this.compressor.knee.value=12;this.compressor.ratio.value=3;
        this.compressor.attack.value=.004;this.compressor.release.value=.12;
        this.sfx.connect(this.filter);this.music.connect(this.compressor);this.filter.connect(this.compressor);this.compressor.connect(this.master);this.master.connect(c.destination);
        this.room=c.createConvolver();this.wet=c.createGain();this.wet.gain.value=.08;
        const impulse=c.createBuffer(2,Math.ceil(c.sampleRate*.14),c.sampleRate);let seed=71;
        for(let ch=0;ch<2;ch++)for(let i=0;i<impulse.length;i++){
          seed=(Math.imul(seed,1664525)+1013904223)>>>0;
          impulse.getChannelData(ch)[i]=(seed/2147483648-1)*Math.exp(-i/(c.sampleRate*.025));
        }
        this.room.buffer=impulse;this.room.normalize=false;this.wet.gain.value=.008;
        this.sfx.connect(this.room);this.room.connect(this.wet);this.wet.connect(this.filter);
        this.setVolumes(this.volumes);
        if(this.musicEnabled){this.musicPlayer=new MusicPlayer(c,this.music);this.musicPlayer.mode(this.musicMode);}
      }
      if(!globalThis.document?.hidden)this.context.resume().catch(()=>{});
      if(!this.loading)this.loading=this.load();return this.loading;
    } catch {this.failures.add('AudioContext');return Promise.resolve();}
  }
  async load() {
    const queue=Object.entries(sounds);
    await Promise.all(Array.from({length:6},async()=>{
      while(queue.length&&!this.closed) {
        const [id,spec]=queue.shift();
        try {
          const response=await fetch(new URL(`audio/${spec.file}`,import.meta.url));if(!response.ok)throw Error(`HTTP ${response.status}`);
          const buffer=await this.context.decodeAudioData(await response.arrayBuffer());if(!this.closed)this.buffers.set(id,buffer);
        } catch(error) {this.failures.add(id);console.warn(`[pp áudio] ${id}: ${error.message}`);}
      }
    }));
  }
  setVolumes(value) {
    this.volumes={...this.volumes,...value};if(!this.context)return;
    const t=this.context.currentTime;
    const ramp=(param,v)=>{param.cancelScheduledValues(t);param.setTargetAtTime(v,t,.012);};
    const valid=v=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;
    ramp(this.master.gain,this.volumes.muted||globalThis.document?.hidden?0:1);ramp(this.sfx.gain,valid(this.volumes.sfx));
    this.updateMusicGain();
  }
  setMode(mode) {this.musicMode=mode;return this.musicPlayer?.mode(mode);}
  preloadMusic(mode) {return this.musicPlayer?.preload(mode);}
  suspense(level) {this.suspenseLevel=level;this.updateMusicGain();}
  updateMusicGain() {
    if(!this.context||!this.music)return;
    const t=this.context.currentTime,duck=t<(this.duckUntil??0)?this.duckAmount:1;
    const value=this.volumes.music*Math.max(.35,1-this.suspenseLevel*.18);
    this.music.gain.cancelScheduledValues(t);this.music.gain.setTargetAtTime(value*duck,t,.06);
    if(duck<1)this.music.gain.setTargetAtTime(value,this.duckUntil,.15);
  }
  play(id,{rate=1,pan=0,volume=1,loop=false,interval=null}={}) {
    const spec=sounds[id],c=this.context,buffer=this.buffers.get(id);
    if(this.closed||!spec||!buffer||c?.state!=='running'||globalThis.document?.hidden||this.volumes.muted||this.volumes.sfx<=0)return null;
    const t=c.currentTime;if(t-(this.last.get(id)??-Infinity)<(interval??spec.interval)/1000)return null;
    const same=[...this.voices].find(v=>v.id===id);if(same)this.stopVoice(same);
    if(this.voices.size>=6) {
      const weakest=[...this.voices].sort((a,b)=>a.priority-b.priority||a.started-b.started)[0];
      if(weakest.priority>spec.priority)return null;this.stopVoice(weakest);
    }
    if(spec.priority===4)for(const v of [...this.voices])if(v.priority<=2)this.stopVoice(v);
    const source=c.createBufferSource(),gain=c.createGain(),panner=c.createStereoPanner();
    source.buffer=buffer;source.loop=loop;source.playbackRate.value=Math.max(.5,Math.min(2,rate));
    gain.gain.value=Math.max(0,Math.min(1,volume));panner.pan.value=Math.max(-.65,Math.min(.65,pan));
    source.connect(gain);gain.connect(panner);panner.connect(this.sfx);
    const voice={id,source,gain,panner,priority:spec.priority,started:t};
    source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect();panner.disconnect();};
    this.voices.add(voice);this.last.set(id,t);this.played++;this.peakVoices=Math.max(this.peakVoices,this.voices.size);
    if(spec.duck<1) {
      this.duckAmount=t<(this.duckUntil??0)?Math.min(this.duckAmount,spec.duck):spec.duck;
      this.duckUntil=Math.max(this.duckUntil??0,t+spec.duration);this.updateMusicGain();
    }
    source.start();return voice;
  }
  stopVoice(voice) {
    if(!this.voices.delete(voice))return;
    const t=this.context.currentTime;voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(0,t,.005);
    try{voice.source.stop(t+.025);}catch{}
  }
  stop() {for(const voice of [...this.voices])this.stopVoice(voice);}
  destroy() {
    this.closed=true;clearTimeout(this.suspendTimer);this.musicPlayer?.destroy();this.stop();this.buffers.clear();globalThis.document?.removeEventListener('visibilitychange',this.onVisibility);
    globalThis.removeEventListener?.('pagehide',this.onPageHide);globalThis.removeEventListener?.('pageshow',this.onPageShow);this.context?.close().catch(()=>{});
  }
  get diagnostics() {return {state:this.context?.state??'locked',loaded:this.buffers.size,failures:[...this.failures],voices:this.voices.size,peakVoices:this.peakVoices,played:this.played,
    music:this.musicPlayer?.diagnostics??null};}
}
