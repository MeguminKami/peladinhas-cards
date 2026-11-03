/**
 * PONTO DE LIGAÇÃO DE SOM (Fase 2: sem som).
 *
 * A Fase 4 substitui este ficheiro mantendo a mesma interface:
 *   audio.play(evento, ctx)   chamado para CADA evento, antes da apresentação visual; NÃO bloqueia
 *   audio.ui(nome)            sons de interface da barra: bet-step, dialog-open, dialog-close, speed,
 *                             auto-start, auto-stop, click (e spin-press, buy, hunt-on, hunt-off, overlay)
 *   audio.setVolumes(v)       { music, sfx, muted } já com a curva quadrática da barra
 *   audio.mode(modo)          muda a música: base | hunt | afterparty | vip | police
 *   audio.unlock()            primeiro gesto do jogador (regra dos browsers)
 * ctx: o mesmo objeto que recebe o fx-visual (ver docs/estrutura-ui.md).
 *
 * Nesta fase só regista no painel de diagnóstico o que teria soado.
 */
export const audio = {
  volumes: { music: .1225, sfx: .1225, muted: false },
  current: 'base',
  log: null,
  play(evento, ctx) { this.log?.(`som: ${evento.type}`); },
  ui(nome) { this.log?.(`som ui: ${nome}`); },
  setVolumes(v) { this.volumes = v; },
  mode(modo) { if (modo !== this.current) { this.current = modo; this.log?.(`música: ${modo}`); } },
  unlock() {},
};
