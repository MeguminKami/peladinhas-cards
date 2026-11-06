// PEACE POLICE: THE AFTERPARTY no casino: o iframe apresenta, a carteira local do site joga (como a Rift).
const CHANNEL = "peace-police:v1";
const ACTIONS = ["connect", "start", "step"];

export function mountCasinoPeacePolice(container, wallet) {
  const frame = document.createElement("iframe");
  frame.title = "PEACE POLICE: THE AFTERPARTY";
  frame.allow = "fullscreen; autoplay";
  frame.allowFullscreen = true;
  const url = new URL("../assets/games/piece-police/game.html", import.meta.url);
  url.searchParams.set("wallet", "host");
  url.searchParams.set("parentOrigin", window.location.origin);
  let readyResolve, readyReject, destroyed = false;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  const timer = setTimeout(() => readyReject(Error("Não foi possível abrir o PEACE POLICE: THE AFTERPARTY. Volta ao catálogo para tentar novamente.")), 25000);
  const handler = async event => {
    const data = event.data;
    if (destroyed || event.source !== frame.contentWindow || event.origin !== url.origin || data?.channel !== CHANNEL || data.type !== "request") return;
    if (typeof data.id !== "string" || data.id.length > 100 || !ACTIONS.includes(data.action)) return;
    let response;
    try {
      const result = await wallet.peacePoliceRequest(data.action, data.payload, data.id);
      if (data.action === "connect") { clearTimeout(timer); readyResolve(); }
      response = { ok: true, result };
    } catch (error) {
      if (data.action === "connect") { clearTimeout(timer); readyReject(error); }
      response = { ok: false, error: { code: error.code || "SITE_REJECTED", message: error.publicMessage || error.message || "Não foi possível confirmar a operação no site." } };
    }
    if (!destroyed) frame.contentWindow?.postMessage({ channel: CHANNEL, type: "response", id: data.id, ...response }, url.origin);
  };
  window.addEventListener("message", handler);
  // O jogo escala-se sozinho. O host só mede o espaço visível sob o menu.
  let fitTask = 0;
  const fit = () => {
    fitTask = 0;
    if (destroyed || document.fullscreenElement || frame.contentDocument?.fullscreenElement) return;
    const viewport = window.visualViewport;
    const bottom = (viewport?.offsetTop || 0) + (viewport?.height || innerHeight);
    const height = Math.max(160, Math.floor(bottom - Math.max(0, frame.getBoundingClientRect().top) - 16));
    if (frame.clientHeight !== height) frame.style.height = height + "px";
  };
  const scheduleFit = () => { if (!fitTask) fitTask = requestAnimationFrame(fit); };
  const observer = new ResizeObserver(scheduleFit);
  observer.observe(document.body);
  for (const type of ["resize", "scroll", "fullscreenchange"]) window.addEventListener(type, scheduleFit);
  window.visualViewport?.addEventListener("resize", scheduleFit);
  // A introdução é manual e pode demorar. O timeout cobre a carga, não a leitura.
  frame.addEventListener("load", () => { clearTimeout(timer); readyResolve(); scheduleFit(); }, { once: true });
  frame.src = url.href;
  container.append(frame);
  scheduleFit();
  return {
    ready,
    canLeave: () => !wallet.peacePoliceActive(),
    refreshBalance: async () => {},
    destroy() {
      destroyed = true; clearTimeout(timer);
      window.removeEventListener("message", handler);
      observer.disconnect(); cancelAnimationFrame(fitTask);
      for (const type of ["resize", "scroll", "fullscreenchange"]) window.removeEventListener(type, scheduleFit);
      window.visualViewport?.removeEventListener("resize", scheduleFit);
      frame.remove(); readyReject(Error("Jogo fechado."));
    },
  };
}
