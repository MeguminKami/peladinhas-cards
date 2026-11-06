import { SOUNDS, synthesize } from './synth.js';
export class RiscoAudio {
  constructor() { this.music=.25;this.effects=.65;this.muted=false;this.buffers=new Map();this.layers=[];this.intensity=0;this.waiting=true;this.duckUntil=0; }
  async preload(){const opus=Boolean(new Audio().canPlayType('audio/ogg; codecs="opus"'));this.files=new Map(await Promise.all(Object.keys(SOUNDS).map(async name=>{let response=await fetch(new URL('audio/'+name+(opus?'.ogg':'.wav'),import.meta.url));if(!response.ok&&opus)response=await fetch(new URL('audio/'+name+'.wav',import.meta.url));if(!response.ok)throw Error('Efeito em falta: '+name);return[name,await response.arrayBuffer()];})));}
  async unlock() {
    if(!this.ctx){
      this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);
      this.fx=this.ctx.createGain();this.fx.connect(this.master);this.mix=this.ctx.createGain();this.mix.connect(this.master);
      this.rise=this.ctx.createOscillator();this.rise.type='triangle';this.riseGain=this.ctx.createGain();this.riseGain.gain.value=0;this.rise.connect(this.riseGain);this.riseGain.connect(this.fx);this.rise.start();
      for(const name of Object.keys(SOUNDS)){if(this.files?.has(name))this.buffers.set(name,await this.ctx.decodeAudioData(this.files.get(name).slice(0)));else{const data=synthesize(name,this.ctx.sampleRate),buffer=this.ctx.createBuffer(1,data.length,this.ctx.sampleRate);buffer.copyToChannel(data,0);this.buffers.set(name,buffer);}}
      this.inhale=this.ctx.createBufferSource();this.inhale.buffer=this.buffers.get('sniff-loop');this.inhale.loop=true;this.inhaleGain=this.ctx.createGain();this.inhaleGain.gain.value=0;this.inhale.connect(this.inhaleGain);this.inhaleGain.connect(this.fx);this.inhale.start();
      await this.loadMusic();
      this.timer=setInterval(()=>this.beat(),100);
    }
    await this.ctx.resume();this.update();
  }
  async loadMusic() {
    const manifest=await fetch(new URL('audio/music/manifest.json',import.meta.url)).then(r=>r.json()).catch(()=>({ready:false}));
    if(!manifest.ready)return;
    try{
      const buffers=await Promise.all(manifest.files.map(async file=>this.ctx.decodeAudioData(await fetch(new URL('audio/music/'+file,import.meta.url)).then(r=>{if(!r.ok)throw Error('Faixa em falta');return r.arrayBuffer();}))));
      const durations=buffers.slice(1).map(b=>b.duration);
      if(durations.some(d=>Math.abs(d-durations[0])>.02))throw Error('As camadas têm de estar sincronizadas');
      const start=this.ctx.currentTime+.1;
      buffers.forEach((b,i)=>{const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=b;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.mix);source.start(start);this.layers[i]={source,gain};});
    }catch(error){console.warn('RISCO: música provisória ativa.',error.message);this.layers=[];}
  }
  update() {
    if(!this.ctx)return;
    const t=this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted?0:.7,t,.03);this.fx.gain.setTargetAtTime(this.effects,t,.03);
    this.mix.gain.setTargetAtTime(this.music*(t<this.duckUntil?.23:1),t,.08);
    this.layers.forEach(({gain},i)=>gain.gain.setTargetAtTime(i===0?(this.waiting?1:0):(!this.waiting&&this.intensity>=i-1?1:0),t,.3));
  }
  state(multiplierCents,waiting) { this.intensity=multiplierCents>=10000?3:multiplierCents>=1000?2:multiplierCents>=200?1:0;this.waiting=waiting;this.multiplier=multiplierCents;if(this.ctx&&this.rise){const t=this.ctx.currentTime;this.rise.frequency.setTargetAtTime(90+Math.log(Math.max(1,multiplierCents/100))*65,t,.15);this.riseGain.gain.setTargetAtTime(waiting?0:.025,t,.12);this.inhaleGain?.gain.setTargetAtTime(waiting?0:.2,t,waiting?.008:.08);}this.update(); }
  play(name,{rate=1}={}) { if(!this.ctx)return;const b=this.buffers.get(name);if(!b)return;if(['crash','crash-double','instant','cashout','max'].includes(name)){this.duckUntil=this.ctx.currentTime+1.8;this.update();}const source=this.ctx.createBufferSource();source.buffer=b;source.playbackRate.value=rate;source.connect(this.fx);source.start(); }
  tone(freq,time,duration,volume,type='sine') {
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.008);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g);g.connect(this.mix);o.start(time);o.stop(time+duration+.02);
  }
  beat() {
    if(!this.ctx||this.ctx.state!=='running')return;this.update();if(this.layers.length)return;
    // Temporary, original 124 BPM A-minor scaffold, replaced by the owner's stems.
    const step=60/124/4,t=this.ctx.currentTime;
    if(this.next===undefined){this.next=t+.03;this.step=0;}
    if(this.next<t)this.next=t+.03;
    while(this.next<t+.15){const k=this.step%16,v=this.waiting?.35:1;
      if(k%4===0)this.tone(52,this.next,.15,.23*v);
      const notes=[55,55,82.41,65.41,55,110,98,82.41];this.tone(notes[this.step%8],this.next,.105,.07*v,'sawtooth');
      if(!this.waiting&&this.intensity>=1&&k%2)this.tone(5500,this.next,.025,.035,'triangle');
      if(!this.waiting&&this.intensity>=2)this.tone(notes[(this.step+3)%8]*8,this.next,.12,.025,'triangle');
      if(!this.waiting&&this.intensity>=3&&k%4===0)[220,261.63,329.63].forEach(f=>this.tone(f,this.next,.35,.03,'sawtooth'));
      this.next+=step;this.step++;
    }
  }
  destroy(){clearInterval(this.timer);void this.ctx?.close();}
}
