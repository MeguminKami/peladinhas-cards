import { mountRift } from "../assets/games/rift/integration/host.js";

export function mountCasinoRift(container, wallet) {
  const frame = document.createElement("iframe");
  frame.title = "Rift Core Overdrive";
  frame.allowFullscreen = true;
  let readyResolve, readyReject, destroyed = false;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  const timer = setTimeout(() => readyReject(Error("Não foi possível abrir a Rift. Volta ao catálogo para tentar novamente.")), 25000);
  const disconnect = mountRift({
    iframe: frame,
    gameUrl: new URL("../assets/games/rift/index.html", import.meta.url).href,
    request: async (action, payload, id) => {
      if (destroyed) throw Error("Jogo fechado.");
      try {
        const result = await wallet.riftRequest(action, payload, id);
        if (action === "connect") { clearTimeout(timer); readyResolve(); }
        return result;
      } catch (error) {
        if (action === "connect") { clearTimeout(timer); readyReject(error); }
        throw error;
      }
    },
    onError: () => {}, // The frame presents confirmed errors and recovery actions.
  });
  frame.addEventListener("load", () => frame.contentDocument?.documentElement.setAttribute("data-casino-fit", ""));
  container.append(frame);
  return {
    ready,
    canLeave: () => !wallet.riftActive() && !frame.contentDocument?.querySelector("#spin")?.disabled,
    refreshBalance: async () => {},
    destroy() { destroyed = true; clearTimeout(timer); disconnect(); frame.remove(); readyReject(Error("Jogo fechado.")); },
  };
}
