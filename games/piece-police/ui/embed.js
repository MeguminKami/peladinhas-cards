// Encaixe do jogo numa pagina (site principal, pagina de demonstracao, pre-visualizacoes).
//
// O jogo (game.html) adapta-se sozinho ao tamanho do iframe onde esta: escolhe o desenho
// (computador, vertical ou compacto) e escala tudo por igual, sem scroll. Este modulo so faz
// o iframe ocupar o espaco VISIVEL por baixo do que estiver por cima dele (ex.: o menu do site),
// e acompanha redimensionamentos, rotacao do telemovel e a barra do browser movel.
//
// Uso no site (ES module):
//   <iframe data-pp-game src="/jogos/piece-police/game.html" title="Peace Police"
//           allow="fullscreen; autoplay" allowfullscreen data-bottom-gap="16"></iframe>
//   <script type="module" src="/jogos/piece-police/ui/embed.js"></script>
// ou, por codigo: import { fitGameFrame } from '.../ui/embed.js'; fitGameFrame(iframe, { bottomGap: 16 });

export function fitGameFrame(frame, { bottomGap = 0, minHeight = 200 } = {}) {
  let scheduled = 0;
  const gapOf = () => (typeof bottomGap === 'function' ? bottomGap() : bottomGap);
  const fit = () => {
    scheduled = 0;
    let inFullscreen = false;
    try { inFullscreen = Boolean(frame.contentDocument?.fullscreenElement); } catch { /* outra origem: ignorar */ }
    if (inFullscreen || document.fullscreenElement) return;
    const viewport = window.visualViewport;
    const visibleBottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight);
    const top = Math.max(0, frame.getBoundingClientRect().top);
    const height = Math.max(minHeight, Math.floor(visibleBottom - top - gapOf()));
    if (frame.clientHeight !== height) frame.style.height = `${height}px`;
  };
  const schedule = () => { if (!scheduled) scheduled = requestAnimationFrame(fit); };
  frame.addEventListener('load', () => {
    try { frame.contentDocument?.addEventListener('fullscreenchange', schedule); } catch { }
    schedule();
  });
  addEventListener('resize', schedule);
  addEventListener('orientationchange', schedule);
  document.addEventListener('fullscreenchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('scroll', schedule);
  // Se o menu mudar de altura (ex.: abre/fecha em telemovel), voltar a medir.
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
  schedule();
  return { fit: schedule };
}

// Ativacao automatica: <iframe data-pp-game data-bottom-gap="16|css|margin">
//  - numero: margem fixa em px por baixo do jogo
//  - css: le a variavel CSS --game-bottom-gap do iframe (permite margens diferentes em telemovel/desktop)
//  - margin: igual a margem superior do elemento pai
for (const frame of document.querySelectorAll('iframe[data-pp-game]')) {
  const gap = frame.dataset.bottomGap;
  const bottomGap = gap === 'css' ? () => parseFloat(getComputedStyle(frame).getPropertyValue('--game-bottom-gap')) || 0
    : gap === 'margin' ? () => parseFloat(getComputedStyle(frame.parentElement).marginTop) || 0
    : Number(gap || 0);
  fitGameFrame(frame, { bottomGap });
}
