/**
 * Ritmo da apresentacao: um unico relogio para todas as animacoes e esperas da slot.
 *
 * As duracoes escrevem-se sempre em milissegundos "da velocidade Normal". A velocidade escolhida
 * (Normal / Rapido / Ultra), o turbo automatico e a aceleracao por toque mudam apenas rate:
 * animacoes Web Animations registadas aqui recebem playbackRate = rate, e as esperas contam
 * tempo virtual (tempo real x rate). Mudar a velocidade a meio e continuo: nada salta, nada
 * e cortado, e os sons de impacto continuam sincronizados com a queda dos simbolos.
 *
 * So apresenta: nunca escolhe nem altera resultados do motor.
 */

const animations = new Set();
const waits = new Set();
let rate = 1, virtual = 0, lastReal = performance.now(), rampFrame = 0;

function sync() { const real = performance.now(); virtual += (real - lastReal) * rate; lastReal = real; }

/** Tempo virtual em ms (avanca a rate x o tempo real). */
export function now() { sync(); return virtual; }
export function currentRate() { return rate; }

function applyRate(next) {
  sync();
  rate = next;
  for (const animation of animations) {
    try { if (animation.updatePlaybackRate) animation.updatePlaybackRate(next); else animation.playbackRate = next; } catch { }
  }
  for (const pending of waits) pending.schedule();
}

/** Muda a velocidade; com rampMs > 0 a mudanca e gradual (sem solavanco visual). */
export function setRate(next, { rampMs = 0 } = {}) {
  if (!(next > 0) || !Number.isFinite(next)) return;
  cancelAnimationFrame(rampFrame);
  if (!(rampMs > 0) || document.hidden || Math.abs(next - rate) < 1e-3) { applyRate(next); return; }
  const from = rate, start = performance.now();
  const step = time => {
    const x = Math.min(1, (time - start) / rampMs);
    applyRate(from + (next - from) * x * (2 - x)); // ease-out
    if (x < 1) rampFrame = requestAnimationFrame(step);
  };
  rampFrame = requestAnimationFrame(step);
}

/** Regista uma animacao ja criada para seguir o relogio. */
export function track(animation) {
  if (!animation) return animation;
  try { animation.playbackRate = rate; } catch { }
  animations.add(animation);
  const forget = () => animations.delete(animation);
  animation.addEventListener?.('finish', forget);
  animation.addEventListener?.('cancel', forget);
  animation.addEventListener?.('remove', forget);
  return animation;
}

/** element.animate a velocidade do relogio. */
export function animate(element, frames, options) {
  if (!element?.animate) return null;
  return track(element.animate(frames, options));
}

/**
 * Espera ms de tempo virtual. skip() (opcional) termina mais cedo. Em segundo plano usa
 * setTimeout (o browser atrasa-o, mas a apresentacao nao fica presa como com requestAnimationFrame).
 */
export function wait(ms, skip) {
  return new Promise(resolve => {
    if (!(ms > 0) || skip?.()) { resolve(); return; }
    const target = now() + ms;
    const pending = {
      timer: 0,
      schedule() {
        clearTimeout(this.timer);
        const left = target - now();
        if (left <= 0 || skip?.()) { this.done(); return; }
        // Com skip, verifica pelo menos a cada 60 ms reais; sem skip, acorda so no fim.
        this.timer = setTimeout(() => this.schedule(), Math.max(0, Math.min(left / rate, skip ? 60 : Infinity)));
      },
      done() { clearTimeout(this.timer); waits.delete(this); resolve(); },
    };
    waits.add(pending);
    pending.schedule();
  });
}

/** Termina ja todas as esperas em curso (usado quando o jogador salta a apresentacao). */
export function flushWaits() { for (const pending of [...waits]) pending.done(); }

/**
 * Detecao de ritmo do jogador (turbo automatico), ao estilo das slots modernas: quem carrega
 * no spin repetidamente quer jogar depressa, sem ter de ir as definicoes.
 *  - dois toques em RAPID_WINDOW ms, ou um toque logo apos o fim de uma jogada (< AFTER_END ms),
 *    ligam o turbo;
 *  - o turbo mantem-se enquanto os toques continuarem e desliga-se sozinho HOLD ms apos o ultimo;
 *  - manter o espaco premido tambem conta como turbo.
 */
export function createTempo({ rapidWindow = 1200, afterEnd = 700, hold = 1800 } = {}) {
  const presses = [];
  let lastEnd = -Infinity, turboUntil = 0;
  return {
    held: false,
    press({ running = false } = {}) {
      const t = performance.now();
      presses.push(t);
      while (presses.length && t - presses[0] > rapidWindow) presses.shift();
      if (presses.length >= 2 || running || t - lastEnd < afterEnd) turboUntil = t + hold;
    },
    roundEnded() { lastEnd = performance.now(); if (this.turbo) turboUntil = Math.max(turboUntil, lastEnd + hold); },
    get turbo() { return this.held || performance.now() < turboUntil; },
    reset() { presses.length = 0; turboUntil = 0; this.held = false; },
  };
}
