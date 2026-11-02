// Ambiente sonoro partilhado pelos efeitos do jogo e pela pagina de teste (audio-lab.html).
// sfx -> corte suave de agudos e da zona 2 kHz -> compressor leve -> seco + reverberacao -> destino

export function buildSfxBus(ctx, input, destination) {
  const shelf = ctx.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 4500; shelf.gain.value = -6;
  const presence = ctx.createBiquadFilter(); presence.type = 'peaking'; presence.frequency.value = 2200; presence.Q.value = 0.9; presence.gain.value = -3;
  const air = ctx.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = 11000; air.Q.value = 0.4;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.25;
  input.connect(shelf); shelf.connect(presence); presence.connect(air); air.connect(comp); comp.connect(destination);
  // Reverberacao gerada (cauda de 2,4 s, escura e difusa), sem ficheiros extra.
  const send = ctx.createGain();
  const verb = ctx.createConvolver(); verb.buffer = makeImpulse(ctx, 2.4);
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 5200;
  const wet = ctx.createGain(); wet.gain.value = 0.16; // menos cauda: os sons nao se misturam numa massa
  send.connect(verb); verb.connect(tone); tone.connect(wet); wet.connect(comp);
  return send;
}

function makeImpulse(ctx, seconds) {
  const rate = ctx.sampleRate, n = Math.floor(rate * seconds);
  const ir = ctx.createBuffer(2, n, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch); let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      lp += 0.35 * ((Math.random() * 2 - 1) - lp); // ruido filtrado: cauda mais escura
      d[i] = lp * Math.min(1, t / 0.02) * Math.pow(1 - i / n, 2.6) * Math.exp(-t * 1.4);
    }
  }
  return ir;
}

// Perfil por som: volume relativo, reverberacao e variacao natural em cada repeticao
// (cents = desafinacao aleatoria +/-, jitter = variacao de volume). Repetidos nunca soam iguais.
// Sons com notas ficam quase afinados (<= 6 cents) para nao desafinarem com a marimba das colunas (do pentatonico).
// Os ficheiros "normalized" ja vem com o volume final (efeitos v2); os antigos estavam todos no maximo.
const PROFILES = {
  'spin-whoosh': { vol: 0.38, verb: 0.3, cents: 40, jitter: 0.1 },
  'symbols-land': { vol: 0.3, verb: 0.15, cents: 60, jitter: 0.15 },
  'cascade-dissolve': { vol: 0.35, verb: 0.4, cents: 50, jitter: 0.12 },
  'hit-small': { vol: 0.42, verb: 0.35, cents: 6, jitter: 0.12 },
  'hit-medium': { vol: 0.5, verb: 0.4, cents: 4, jitter: 0.1 },
  'hit-large': { vol: 0.6, verb: 0.45, cents: 0, jitter: 0.06 },
  'hit-epic': { vol: 0.68, verb: 0.5, cents: 0, jitter: 0 },
  'win-count': { vol: 0.28, verb: 0.25, cents: 0, jitter: 0 },
  'win-count-end': { vol: 0.45, verb: 0.4, cents: 0, jitter: 0 },
  'xp-fly': { vol: 0.36, verb: 0.5, cents: 25, jitter: 0.15 },
  'magic-ready': { vol: 0.55, verb: 0.5, cents: 0, jitter: 0 },
  'magic-cast': { vol: 0.65, verb: 0.55, cents: 0, jitter: 0 },
  'wild-place': { vol: 0.45, verb: 0.45, cents: 0, jitter: 0.08 },
  'scatter-land': { vol: 0.5, verb: 0.4, cents: 0, jitter: 0.06 },
  'scatter-converge': { vol: 0.55, verb: 0.5, cents: 0, jitter: 0 },
  'music-transition': { vol: 0.4, verb: 0.6, cents: 0, jitter: 0 },
  'reel-land': { vol: 0.55, verb: 0.3, cents: 0, jitter: 0.08 },
  'scatter-anticipation': { vol: 0.5, verb: 0.55, cents: 0, jitter: 0 },
};

export function sfxProfile(name, normalized = []) {
  const base = name.startsWith('ui-') ? { vol: 0.32, verb: 0.12, cents: 25, jitter: 0.08 } : PROFILES[name] || { vol: 0.62, verb: 0.4, cents: 0, jitter: 0 };
  return normalized.includes(name) ? { ...base, vol: 1 } : base;
}
