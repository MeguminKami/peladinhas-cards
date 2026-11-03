/**
 * Encaixe do jogo no espaço disponível: escolhe o desenho e escala o jogo INTEIRO (transform),
 * sem nunca deformar células e sem scroll.
 *
 *  - landscape : computador (coluna lateral + grelha + barra de controlos por baixo)
 *  - portrait  : telemóvel ao alto (grelha a toda a largura, saldo/ganho grandes, spin grande)
 *  - compact   : espaço baixo e largo (telemóvel na horizontal, 1366×768 com menu): grelha ao centro,
 *                controlos numa coluna à direita
 *
 * Escala máxima 1,6. Abaixo do tamanho de referência os rótulos pequenos recebem um reforço
 * (--ui-boost) para não ficarem abaixo de ~9 px reais; os botões pequenos ganham área de toque.
 * Adaptado da Princesa Sofia (games/princesa-sofia/ui/layout.js).
 */
const DESIGN = { portrait: 400, landscape: 1120, compact: 1100 };
const MAX_SCALE = 1.6;
const MAX_BOOST = 1.6;
const COMPACT_BELOW = 0.72;

function safeInsets() {
  let probe = document.getElementById('safe-area-probe');
  if (!probe) {
    probe = document.createElement('div');
    probe.id = 'safe-area-probe';
    probe.setAttribute('aria-hidden', 'true');
    probe.className = 'safe-area-probe';
    document.body.append(probe);
  }
  const cs = getComputedStyle(probe);
  return { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
}

export function installLayout({ shell = document.querySelector('.shell'), force = null } = {}) {
  let pending = 0;
  const measure = layout => {
    shell.dataset.layout = layout;
    document.body.dataset.layout = layout;
    shell.style.width = `${DESIGN[layout]}px`;
    shell.style.height = '';
    return { width: DESIGN[layout], height: shell.offsetHeight };
  };
  const fit = () => {
    pending = 0;
    const vv = window.visualViewport;
    const inset = safeInsets();
    // espaço reservado à direita (painel de diagnóstico aberto)
    const reserve = Number(document.documentElement.dataset.reserveRight || 0);
    const width = Math.max(1, (vv?.width ?? innerWidth) - inset.left - inset.right - reserve);
    const height = Math.max(1, (vv?.height ?? innerHeight) - inset.top - inset.bottom);
    const scaleFor = size => Math.min(width / size.width, height / size.height);
    const portrait = () => {
      const tall = measure('portrait');
      // em telemóveis altos o desenho acompanha a forma do ecrã (sem faixas vazias)
      const target = Math.round(tall.width * height / width);
      if (target > tall.height) { shell.style.height = `${target}px`; tall.height = target; }
      return tall;
    };
    let layout, size;
    const aspect = width / height;
    if (force) { layout = force; size = layout === 'portrait' ? portrait() : measure(layout); }
    else if (aspect < .8) { layout = 'portrait'; size = portrait(); }
    else if (aspect < 1.2) {
      const tall = portrait(), tallScale = scaleFor(tall);
      const wide = measure('landscape'), wideScale = scaleFor(wide);
      if (tallScale > wideScale * 1.12) { layout = 'portrait'; size = portrait(); } else { layout = 'landscape'; size = wide; }
    } else {
      const wide = measure('landscape'), wideScale = scaleFor(wide);
      const compact = measure('compact'), compactScale = scaleFor(compact);
      if (wideScale < COMPACT_BELOW && compactScale > wideScale * 1.12) { layout = 'compact'; size = compact; }
      else { layout = 'landscape'; size = measure('landscape'); }
    }
    let scale = Math.min(MAX_SCALE, scaleFor(size));
    const boost = Math.min(MAX_BOOST, Math.max(1, 1 / scale));
    shell.style.setProperty('--ui-boost', boost.toFixed(3));
    // o reforço do texto pode mudar a altura: medir de novo antes de escalar
    const finalHeight = Math.max(shell.offsetHeight, layout === 'portrait' ? size.height : 0);
    scale = Math.floor(Math.min(MAX_SCALE, width / size.width, height / finalHeight) * 1000) / 1000; // nunca 1 px a mais
    shell.style.transform = `scale(${scale})`;
    shell.style.left = `${inset.left + Math.max(0, (width - size.width * scale) / 2)}px`;
    shell.style.top = `${inset.top + Math.max(0, (height - finalHeight * scale) / 2)}px`;
    document.documentElement.style.setProperty('--game-scale', String(scale));
    document.documentElement.style.setProperty('--ui-boost', boost.toFixed(3));
    document.documentElement.dataset.layout = layout;
    // janelas grandes (regras, compras, histórico) acompanham a escala do jogo
    for (const dialog of document.querySelectorAll('dialog.big[open]')) {
      dialog.style.width = `${layout === 'portrait' ? 440 : 820}px`;
      const s = Math.min(MAX_SCALE * .85, (width - 16) / dialog.offsetWidth, (height - 16) / dialog.offsetHeight);
      dialog.style.transform = `translate(-50%, -50%) scale(${s})`;
    }
    document.dispatchEvent(new Event('game-layout'));
    return { layout, scale };
  };
  const schedule = () => { if (!pending) pending = requestAnimationFrame(fit); };
  const ro = new ResizeObserver(schedule);
  ro.observe(shell);
  const mo = new MutationObserver(records => { if (records.some(r => r.attributeName === 'open')) schedule(); });
  for (const d of document.querySelectorAll('dialog.big')) { mo.observe(d, { attributes: true, attributeFilter: ['open'] }); ro.observe(d); }
  addEventListener('resize', schedule);
  addEventListener('orientationchange', schedule);
  document.addEventListener('fullscreenchange', schedule);
  document.addEventListener('webkitfullscreenchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  document.fonts?.ready?.then(schedule);
  const first = fit();
  return { fit, schedule, get layout() { return shell.dataset.layout; }, first };
}
