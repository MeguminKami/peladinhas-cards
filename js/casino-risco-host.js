const CHANNEL = "risco:v1";
export function mountCasinoRisco(container, wallet) {
  const frame = document.createElement("iframe");
  frame.title = "RISCO · LCD The Glitch";
  frame.allow = "fullscreen; autoplay";
  frame.allowFullscreen = true;
  const url = new URL("../assets/games/risco/game.html", import.meta.url);
  url.searchParams.set("wallet", "host");
  url.searchParams.set("parentOrigin", location.origin);
  let resolveReady, rejectReady, destroyed = false;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const timer = setTimeout(() => rejectReady(Error("Não foi possível abrir o RISCO.")), 25000);
  const handler = async event => {
    const data = event.data;
    if (destroyed || event.source !== frame.contentWindow || event.origin !== url.origin || data?.channel !== CHANNEL || data.type !== "request") return;
    if (typeof data.id !== "string" || data.id.length > 100 || !["connect", "start", "poll", "cashout"].includes(data.action)) return;
    let response;
    try {
      const result = await wallet.riscoRequest(data.action, data.payload, data.id);
      if (data.action === "connect") { clearTimeout(timer); resolveReady(); }
      response = { ok: true, result };
    } catch (error) {
      if (data.action === "connect") { clearTimeout(timer); rejectReady(error); }
      response = { ok: false, error: { code: error.code || "SITE_REJECTED", message: error.publicMessage || error.message || "Não foi possível confirmar a operação." } };
    }
    if (!destroyed) frame.contentWindow?.postMessage({ channel: CHANNEL, type: "response", id: data.id, ...response }, url.origin);
  };
  window.addEventListener("message", handler);
  frame.src = url.href;
  container.append(frame);
  // Fit the actual remaining space, including the site's toolbar and mobile bars.
  // A viewport-height estimate alone misses wrapping controls and pending-round notices.
  let fitPending = 0;
  const viewport = window.visualViewport;
  const fit = () => {
    fitPending = 0;
    if (destroyed || document.fullscreenElement || frame.contentDocument?.fullscreenElement) return;
    const bottom = (viewport?.offsetTop || 0) + (viewport?.height || innerHeight);
    const navigation = document.querySelector('.bottom-nav');
    const navigationHeight = navigation && getComputedStyle(navigation).display !== 'none' ? navigation.getBoundingClientRect().height : 0;
    const height = Math.max(160, Math.floor(bottom - frame.getBoundingClientRect().top - navigationHeight - 8));
    if (frame.clientHeight !== height) frame.style.height = `${height}px`;
  };
  const scheduleFit = () => { if (!destroyed && !fitPending) fitPending = requestAnimationFrame(fit); };
  const resize = new ResizeObserver(scheduleFit);
  for (const element of [container, container.parentElement, document.querySelector('.casino-toolbar'), document.querySelector('#header'), document.querySelector('.bottom-nav')])
    if (element) resize.observe(element);
  frame.addEventListener('load', scheduleFit);
  window.addEventListener('resize', scheduleFit);
  window.addEventListener('scroll', scheduleFit, { passive: true });
  viewport?.addEventListener('resize', scheduleFit);
  viewport?.addEventListener('scroll', scheduleFit);
  document.addEventListener('fullscreenchange', scheduleFit);
  scheduleFit();
  return { ready, canLeave: () => !wallet.riscoActive(), refreshBalance: async () => {}, destroy() {
    destroyed = true; clearTimeout(timer); cancelAnimationFrame(fitPending); resize.disconnect();
    frame.removeEventListener('load', scheduleFit);window.removeEventListener('resize', scheduleFit);window.removeEventListener('scroll', scheduleFit);
    viewport?.removeEventListener('resize', scheduleFit);viewport?.removeEventListener('scroll', scheduleFit);document.removeEventListener('fullscreenchange', scheduleFit);
    window.removeEventListener("message", handler); frame.remove(); rejectReady(Error("Jogo fechado."));
  } };
}
