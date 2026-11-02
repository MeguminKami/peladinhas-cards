/**
 * Fit a responsive composition as a whole; never stretch individual reel cells.
 *
 * Tres desenhos com largura de referencia, escalados por igual (transform) para caber no ecra:
 *  - portrait  : ecras altos (telemovel na vertical). Barra de estado por cima da grelha, grelha a toda a largura.
 *  - landscape : desenho de computador aprovado (coluna lateral, grelha, barra de controlos por baixo).
 *  - compact   : ecras baixos e largos (telemovel na horizontal, janelas baixas). Controlos numa coluna a direita.
 * Escolhe-se o desenho pela forma do espaco disponivel; o compact so entra quando o desenho de computador
 * ficaria claramente mais pequeno, para nao mudar o aspeto normal no desktop.
 *
 * Limites: a escala nao passa de MAX_SCALE (ecras muito grandes ficam centrados, sem crescer sem fim).
 * Abaixo de COMFORT_SCALE os textos pequenos recebem um reforco (--ui-boost) para continuarem legiveis.
 * Nunca ha scroll: em ecras pequenos o jogo encolhe por inteiro.
 */
const DESIGN = { portrait: 430, landscape: 1040, compact: 1180 };
const MAX_SCALE = 1.6;
const COMFORT_SCALE = 1; // abaixo do tamanho de referencia os textos pequenos sao reforcados (rotulos ~9 px reais)
const MAX_BOOST = 1.75;
const MIN_CELL_RATIO = 0.9; // vertical: as celulas podem crescer em altura ate quase quadradas (simbolos nunca deformam: object-fit contain)
const COMPACT_BELOW = 0.7; // o desenho de computador so da lugar ao compacto quando ficaria abaixo de 70%

// Margens seguras (entalhe, barra inferior do iPhone). Lidas de env() atraves de um elemento invisivel.
function safeInsets() {
  let probe = document.getElementById('safe-area-probe');
  if (!probe) {
    probe = document.createElement('div');
    probe.id = 'safe-area-probe';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;inset:0;' +
      'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.append(probe);
  }
  const cs = getComputedStyle(probe);
  return { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
}

export function installLayout() {
  const shell = document.querySelector('.shell');
  let pending = 0;
  const measure = layout => {
    shell.dataset.layout = layout;
    document.body.dataset.layout = layout;
    shell.style.width = `${DESIGN[layout]}px`;
    shell.style.maxWidth = 'none';
    shell.style.height = '';
    // Measure layout only: decorative transforms and hover shadows cannot resize the game.
    return { width: DESIGN[layout], height: shell.offsetHeight };
  };
  const fit = () => {
    pending = 0;
    const viewport = window.visualViewport;
    const inset = safeInsets();
    const fullWidth = Math.max(1, viewport?.width ?? innerWidth);
    const fullHeight = Math.max(1, viewport?.height ?? innerHeight);
    const width = Math.max(1, fullWidth - inset.left - inset.right);
    const height = Math.max(1, fullHeight - inset.top - inset.bottom);
    const scaleFor = size => Math.min(width / size.width, height / size.height);

    // Interface vertical: a altura do desenho acompanha a forma do ecra (nunca abaixo do conteudo),
    // e os blocos distribuem-se por ela - sem faixas vazias em telemoveis altos.
    const measurePortrait = () => {
      shell.style.setProperty('--cell-ratio', '1.18');
      const tall = measure('portrait');
      const target = Math.round(tall.width * height / width);
      // Espaco vertical livre vai para a grelha: celulas mais altas, simbolos maiores.
      const cell = shell.querySelector('#board .cell');
      const spare = target - tall.height - 24; // pequena folga para os blocos respirarem
      if (spare > 0 && cell?.offsetHeight) {
        const ratio = Math.max(MIN_CELL_RATIO, cell.offsetWidth / (cell.offsetHeight + spare / 5));
        shell.style.setProperty('--cell-ratio', ratio.toFixed(3));
        tall.height = shell.offsetHeight;
      }
      tall.height = Math.max(tall.height, target);
      shell.style.height = `${tall.height}px`;
      return tall;
    };
    let layout, size;
    const aspect = width / height;
    if (aspect < .85) {
      layout = 'portrait'; size = measurePortrait();
    } else if (aspect < 1.25) {
      // Janelas quase quadradas: fica o desenho que aparece maior (o de computador tem prioridade em empate).
      const tall = measurePortrait(), tallScale = scaleFor(tall);
      const wide = measure('landscape'), wideScale = scaleFor(wide);
      if (tallScale > wideScale * 1.15) { layout = 'portrait'; size = measurePortrait(); }
      else { layout = 'landscape'; size = wide; }
    } else {
      const wide = measure('landscape'), wideScale = scaleFor(wide);
      const compact = measure('compact'), compactScale = scaleFor(compact);
      // O compacto so substitui o desenho de computador em ecras baixos (telemovel na horizontal, janelas
      // muito baixas): quando este ficaria abaixo de COMPACT_BELOW e o compacto e claramente maior.
      if (wideScale < COMPACT_BELOW && compactScale > wideScale * 1.2) { layout = 'compact'; size = compact; }
      else { layout = 'landscape'; size = measure('landscape'); }
    }
    const scale = Math.min(MAX_SCALE, scaleFor(size));
    const boost = Math.min(MAX_BOOST, Math.max(1, COMFORT_SCALE / scale));
    shell.style.setProperty('--ui-boost', boost.toFixed(3));
    // O reforco de texto pode alterar ligeiramente a altura: medir de novo antes de escalar.
    const finalHeight = Math.max(shell.offsetHeight, layout === 'portrait' ? size.height : 0);
    const finalScale = Math.min(MAX_SCALE, width / size.width, height / finalHeight);
    shell.style.transform = `scale(${finalScale})`;
    shell.style.left = `${inset.left + Math.max(0, (width - size.width * finalScale) / 2)}px`;
    shell.style.top = `${inset.top + Math.max(0, (height - finalHeight * finalScale) / 2)}px`;
    shell.style.setProperty('--game-scale', String(finalScale));
    for (const dialog of document.querySelectorAll('#rules-dialog[open], #buy-dialog[open]')) {
      dialog.style.width = `${layout === 'portrait' ? 540 : dialog.id === 'buy-dialog' ? 960 : 760}px`;
      const dialogScale = Math.min(MAX_SCALE * .8, (width - 16) / dialog.offsetWidth, (height - 16) / dialog.offsetHeight);
      dialog.style.transform = `translate(-50%, -50%) scale(${dialogScale})`;
    }
    // Restantes janelas (avisos, autoplay, magia) acompanham a escala do jogo.
    document.documentElement.style.setProperty('--game-scale', String(finalScale));
    document.documentElement.style.setProperty('--ui-boost', boost.toFixed(3));
    document.dispatchEvent(new Event('game-layout'));
  };
  const schedule = () => { if (!pending) pending = requestAnimationFrame(fit); };
  const observer = new ResizeObserver(schedule);
  observer.observe(shell);
  const dialogs = document.querySelectorAll('#rules-dialog, #buy-dialog');
  // So interessa quando uma destas janelas abre/fecha ou muda estando aberta. Fechadas, alteracoes de texto
  // la dentro (ex.: o botao do Hunt, reescrito em cada spin) disparavam um recalculo completo e um frame preso.
  const dialogObserver = new MutationObserver(records => {
    if (records.some(record => record.attributeName === 'open') || document.querySelector('#rules-dialog[open], #buy-dialog[open]')) schedule();
  });
  for (const dialog of dialogs) {
    observer.observe(dialog);
    dialogObserver.observe(dialog, { attributes:true, attributeFilter:['open'], childList:true, subtree:true });
  }
  addEventListener('resize', schedule);
  addEventListener('orientationchange', schedule);
  document.addEventListener('fullscreenchange', schedule);
  document.addEventListener('webkitfullscreenchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  fit();
  // As fontes podem chegar depois do primeiro calculo e mudar alturas.
  document.fonts?.ready?.then(schedule);
  return { fit, destroy() {
    observer.disconnect(); dialogObserver.disconnect(); cancelAnimationFrame(pending);
    removeEventListener('resize', schedule);
    removeEventListener('orientationchange', schedule);
    document.removeEventListener('fullscreenchange', schedule);
    document.removeEventListener('webkitfullscreenchange', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
  } };
}
