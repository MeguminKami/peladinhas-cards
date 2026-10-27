export interface AudioSettings {
  master: number;
  effects: number;
  music: number;
  muted: boolean;
  reduced: boolean;
}
/** Original procedural audio; no samples, external media, or licences required. */
export class AudioBus {
  context?: AudioContext;
  musicNodes: OscillatorNode[] = [];
  musicGain?: GainNode;
  settings: AudioSettings;
  private cardBuffer?: AudioBuffer;
  private visibility = () => {
    if (document.hidden) void this.context?.suspend();
    else if (this.context?.state === "suspended") void this.context.resume();
  };
  constructor(private key: string) {
    this.settings = JSON.parse(localStorage.getItem(key) || "null") || {
      master: 0.4,
      effects: 0.65,
      music: 0,
      muted: false,
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
    document.addEventListener("visibilitychange", this.visibility);
  }
  unlock() {
    this.context ||= new AudioContext();
    if (!document.hidden) void this.context.resume();
    this.updateMusic();
  }
  persist() {
    localStorage.setItem(this.key, JSON.stringify(this.settings));
    this.updateMusic();
  }
  tone(
    kind:
      | "chip"
      | "card"
      | "win"
      | "error"
      | "spin"
      | "click"
      | "bust"
      | "push"
      | "blackjack"
      | "bounce" = "click",
  ) {
    this.unlock();
    const c = this.context!;
    if (this.settings.muted || document.hidden) return;
    if (kind === "card") {
      // A short paper slide followed by the dry contact of the card on the felt.
      if (!this.cardBuffer) {
        this.cardBuffer = c.createBuffer(
          1,
          Math.ceil(c.sampleRate * 0.2),
          c.sampleRate,
        );
        const data = this.cardBuffer.getChannelData(0);
        let seed = 4207,
          previous = 0;
        for (let i = 0; i < data.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          const noise = (seed / 0x100000000) * 2 - 1;
          data[i] = noise - previous * 0.65;
          previous = noise;
        }
      }
      const source = c.createBufferSource(),
        filter = c.createBiquadFilter(),
        gain = c.createGain();
      source.buffer = this.cardBuffer;
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2600, c.currentTime);
      filter.Q.value = 0.6;
      const volume = this.settings.master * this.settings.effects * 0.42,
        t = c.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(
        0.012 * volume + 0.0001,
        t + 0.105,
      );
      gain.gain.linearRampToValueAtTime(volume * 0.65, t + 0.125);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.195);
      source.connect(filter).connect(gain).connect(c.destination);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      source.start();
      return;
    }
    const frequency = {
      chip: 850,
      card: 220,
      win: 660,
      error: 140,
      spin: 110,
      click: 420,
      bust: 100,
      push: 330,
      blackjack: 880,
      bounce: 1300,
    }[kind];
    const duration =
      kind === "win" || kind === "blackjack"
        ? 0.5
        : kind === "spin"
          ? 0.9
          : 0.09;
    const osc = c.createOscillator(),
      gain = c.createGain();
    osc.type = kind === "spin" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(frequency, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      frequency * (kind === "win" || kind === "blackjack" ? 2 : 0.65),
      c.currentTime + duration,
    );
    gain.gain.setValueAtTime(
      this.settings.master * this.settings.effects * 0.14,
      c.currentTime,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  }
  updateMusic() {
    if (!this.context) return;
    const c = this.context;
    if (!this.musicGain) {
      this.musicGain = c.createGain();
      this.musicGain.connect(c.destination);
      for (const f of [130.8128, 164.8138, 195.9977, 246.9417]) {
        const o = c.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(this.musicGain);
        o.start();
        this.musicNodes.push(o);
      }
    }
    this.musicGain.gain.setTargetAtTime(
      this.settings.muted
        ? 0
        : this.settings.master * this.settings.music * 0.012,
      c.currentTime,
      0.2,
    );
  }
  destroy() {
    document.removeEventListener("visibilitychange", this.visibility);
    for (const o of this.musicNodes) o.stop();
    void this.context?.close();
  }
}
