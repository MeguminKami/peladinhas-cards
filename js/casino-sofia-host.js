// Princesa Sofia no casino: o iframe apresenta, a carteira local do site joga (como a Rift).
const CHANNEL = "princesa-sofia:v1";
const ACTIONS = ["connect", "start", "step"];

export function mountCasinoSofia(container, wallet) {
  const frame = document.createElement("iframe");
  frame.title = "Princesa Sofia";
  frame.allow = "fullscreen; autoplay";
  frame.allowFullscreen = true;
  const url = new URL("../assets/games/princesa-sofia/game.html", import.meta.url);
  url.searchParams.set("wallet", "host");
  url.searchParams.set("parentOrigin", window.location.origin);
  let readyResolve, readyReject, destroyed = false;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  const timer = setTimeout(() => readyReject(Error("Não foi possível abrir a Princesa Sofia. Volta ao catálogo para tentar novamente.")), 25000);
  const handler = async event => {
    const data = event.data;
    if (destroyed || event.source !== frame.contentWindow || event.origin !== url.origin || data?.channel !== CHANNEL || data.type !== "request") return;
    if (typeof data.id !== "string" || data.id.length > 100 || !ACTIONS.includes(data.action)) return;
    let response;
    try {
      const result = await wallet.sofiaRequest(data.action, data.payload, data.id);
      if (data.action === "connect") { clearTimeout(timer); readyResolve(); }
      response = { ok: true, result };
    } catch (error) {
      if (data.action === "connect") { clearTimeout(timer); readyReject(error); }
      response = { ok: false, error: { code: error.code || "SITE_REJECTED", message: error.publicMessage || error.message || "Não foi possível confirmar a operação no site." } };
    }
    if (!destroyed) frame.contentWindow?.postMessage({ channel: CHANNEL, type: "response", id: data.id, ...response }, url.origin);
  };
  window.addEventListener("message", handler);
  frame.src = url.href;
  container.append(frame);
  return {
    ready,
    canLeave: () => !wallet.sofiaActive(),
    refreshBalance: async () => {},
    destroy() {
      destroyed = true; clearTimeout(timer);
      window.removeEventListener("message", handler);
      frame.remove(); readyReject(Error("Jogo fechado."));
    },
  };
}
