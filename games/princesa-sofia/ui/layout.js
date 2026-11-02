/** Fit a responsive composition as a whole; never stretch individual reel cells. */
export function installLayout() {
  const shell = document.querySelector('.shell');
  let pending = 0;
  const fit = () => {
    pending = 0;
    const viewport = window.visualViewport;
    const width = Math.max(1, viewport?.width ?? innerWidth);
    const height = Math.max(1, viewport?.height ?? innerHeight);
    const compact = width / height < .85;
    shell.dataset.layout = compact ? 'portrait' : 'landscape';
    document.body.dataset.layout = shell.dataset.layout;
    // Portrait reorganizes controls into two rows before scaling. Wide screens
    // retain the approved sidebar/board/control hierarchy and scale up as well.
    const designWidth = compact ? 520 : 1040;
    shell.style.width = `${designWidth}px`;
    shell.style.maxWidth = 'none';
    // Measure layout only: decorative transforms and hover shadows cannot resize the game.
    const naturalHeight = shell.offsetHeight;
    const scale = Math.min(width / designWidth, height / naturalHeight);
    shell.style.transform = `scale(${scale})`;
    shell.style.left = `${Math.max(0, (width - designWidth * scale) / 2)}px`;
    shell.style.top = `${Math.max(0, (height - naturalHeight * scale) / 2)}px`;
    shell.style.setProperty('--game-scale', String(scale));
    for (const dialog of document.querySelectorAll('#rules-dialog[open], #buy-dialog[open]')) {
      dialog.style.width = `${compact ? 540 : dialog.id === 'buy-dialog' ? 960 : 760}px`;
      const dialogScale = Math.min(1, (width - 16) / dialog.offsetWidth, (height - 16) / dialog.offsetHeight);
      dialog.style.transform = `translate(-50%, -50%) scale(${dialogScale})`;
    }
    document.dispatchEvent(new Event('game-layout'));
  };
  const schedule = () => { if (!pending) pending = requestAnimationFrame(fit); };
  const observer = new ResizeObserver(schedule);
  observer.observe(shell);
  const dialogs = document.querySelectorAll('#rules-dialog, #buy-dialog');
  const dialogObserver = new MutationObserver(schedule);
  for (const dialog of dialogs) {
    observer.observe(dialog);
    dialogObserver.observe(dialog, { attributes:true, attributeFilter:['open'], childList:true, subtree:true });
  }
  addEventListener('resize', schedule);
  document.addEventListener('fullscreenchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  fit();
  return { fit, destroy() {
    observer.disconnect(); dialogObserver.disconnect(); cancelAnimationFrame(pending);
    removeEventListener('resize', schedule);
    document.removeEventListener('fullscreenchange', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
  } };
}
