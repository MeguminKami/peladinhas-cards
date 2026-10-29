// Mirror only the active game's presentation, never its early ledger settlement.
export function observeCasinoPresentedBalance(container, onBalance) {
  let frame, balanceObserver, lastBalance;
  function watchDocument() {
    balanceObserver?.disconnect();
    const html = frame?.contentDocument?.documentElement;
    if (!html) return;
    const update = () => {
      const raw = html.getAttribute('data-casino-balance');
      if (raw === null || raw.trim() === '') return;
      const balance = Number(raw);
      if (!Number.isSafeInteger(balance) || balance < 0 || balance === lastBalance) return;
      lastBalance = balance;
      onBalance(balance);
    };
    balanceObserver = new MutationObserver(update);
    balanceObserver.observe(html, { attributes: true, attributeFilter: ['data-casino-balance'] });
    update();
  }
  function watchFrame() {
    const next = container.querySelector('iframe');
    if (next === frame) return;
    frame?.removeEventListener('load', watchDocument);
    balanceObserver?.disconnect();
    frame = next;
    lastBalance = undefined;
    frame?.addEventListener('load', watchDocument);
    watchDocument();
  }
  const observer = new MutationObserver(watchFrame);
  observer.observe(container, { childList: true, subtree: true });
  watchFrame();
  return () => {
    observer.disconnect();
    balanceObserver?.disconnect();
    frame?.removeEventListener('load', watchDocument);
  };
}
