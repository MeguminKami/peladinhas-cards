export interface AudioSettings { master: number; effects: number; music: number; muted: boolean; reduced: boolean }
/** Original procedural audio; no samples, external media, or licences required. */
export class AudioBus {
  context?: AudioContext; musicNodes: OscillatorNode[] = []; musicGain?: GainNode;
  settings: AudioSettings;
  private visibility = () => { if (document.hidden) void this.context?.suspend(); else if (this.context?.state === 'suspended') void this.context.resume(); };
  constructor(private key: string) { this.settings = JSON.parse(localStorage.getItem(key) || 'null') || {master:.4,effects:.65,music:0,muted:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}; document.addEventListener('visibilitychange',this.visibility); }
  unlock() { this.context ||= new AudioContext(); if (!document.hidden) void this.context.resume(); this.updateMusic(); }
  persist() { localStorage.setItem(this.key,JSON.stringify(this.settings)); this.updateMusic(); }
  tone(kind: 'chip'|'card'|'win'|'error'|'spin'|'click'|'bust'|'push'|'blackjack'|'bounce' = 'click') {
    this.unlock(); const c=this.context!; if(this.settings.muted||document.hidden)return;
    const frequency={chip:850,card:220,win:660,error:140,spin:110,click:420,bust:100,push:330,blackjack:880,bounce:1300}[kind];
    const duration=kind==='win'||kind==='blackjack'?.5:kind==='spin'?.9:.09;
    const osc=c.createOscillator(),gain=c.createGain(); osc.type=kind==='card'||kind==='spin'?'triangle':'sine'; osc.frequency.setValueAtTime(frequency,c.currentTime); osc.frequency.exponentialRampToValueAtTime(frequency*(kind==='win'||kind==='blackjack'?2:0.65),c.currentTime+duration);
    gain.gain.setValueAtTime(this.settings.master*this.settings.effects*.14,c.currentTime); gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration); osc.connect(gain).connect(c.destination); osc.start(); osc.stop(c.currentTime+duration);
  }
  updateMusic() {
    if(!this.context)return; const c=this.context;
    if(!this.musicGain){this.musicGain=c.createGain();this.musicGain.connect(c.destination);for(const f of [130.8128,164.8138,195.9977,246.9417]){const o=c.createOscillator();o.type='sine';o.frequency.value=f;o.connect(this.musicGain);o.start();this.musicNodes.push(o);}}
    this.musicGain.gain.setTargetAtTime(this.settings.muted?0:this.settings.master*this.settings.music*.012,c.currentTime,.2);
  }
  destroy(){document.removeEventListener('visibilitychange',this.visibility);for(const o of this.musicNodes)o.stop();void this.context?.close();}
}
