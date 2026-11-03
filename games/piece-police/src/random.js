// RNG determinístico xoshiro128** com estado serializável (4 × uint32).
// O motor nunca usa Math.random(): recebe sempre o estado e devolve-o avançado.

function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Cria o estado inicial do RNG a partir de uma seed (texto ou número). */
export function seedState(seed) {
  const s = cyrb128(String(seed));
  if ((s[0] | s[1] | s[2] | s[3]) === 0) s[0] = 1;
  return s;
}

export class Rng {
  constructor(state) {
    this.s = Uint32Array.from(state);
  }
  /** Estado serializável (array simples de 4 inteiros). */
  state() {
    return Array.from(this.s);
  }
  u32() {
    const s = this.s;
    const r = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 11);
    return r;
  }
  /** Inteiro uniforme em [0, n) sem enviesamento (rejeição). */
  int(n) {
    if (n <= 1) return 0;
    const limit = 0x100000000 - (0x100000000 % n);
    let x;
    do { x = this.u32(); } while (x >= limit);
    return x % n;
  }
  /** true com probabilidade pct/100 (pct com até 4 casas decimais). */
  chance(pct) {
    if (pct <= 0) return false;
    if (pct >= 100) return true;
    return this.int(1000000) < Math.round(pct * 10000);
  }
  /** Índice sorteado numa tabela cumulativa de pesos inteiros (cum[last] = total). */
  pickCum(cum) {
    const r = this.int(cum[cum.length - 1]);
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (r < cum[mid]) hi = mid; else lo = mid + 1;
    }
    return lo;
  }
  /** Elemento aleatório de um array (ou undefined se vazio). */
  pick(arr) {
    return arr.length ? arr[this.int(arr.length)] : undefined;
  }
  /** Baralha in-place (Fisher–Yates). */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
}

function rotl(x, k) {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}
