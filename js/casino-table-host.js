// Same-origin iframe isolates the supplied SDK's global CSS and keyboard handlers.
export function mountCasinoTable(container, { game, playerId, wallet, onRoundComplete = () => {} }) {
  const directory = game === "blackjack" ? "blackjack" : "roulette";
  const frame = document.createElement("iframe");
  frame.title = game === "blackjack" ? "Blackjack" : "Roleta europeia";
  frame.allow = "fullscreen; autoplay";
  frame.allowFullscreen = true;
  let handle, completedRound, roundObserver, destroyed = false, rejectReady;
  const ready = new Promise((resolve, reject) => {
    rejectReady = reject;
    const timeout = setTimeout(() => { frame.cleanup(); reject(Error("Não foi possível carregar a mesa. Volta ao catálogo e tenta novamente.")); }, 20000);
    const receive = async event => {
      if (event.origin !== location.origin || event.source !== frame.contentWindow ||
          event.data?.type !== "peladinhas-table-ready") return;
      frame.cleanup();
      if (destroyed) return;
      try {
        handle = frame.contentWindow.mountCasinoTable({ playerId, wallet });
        frame.contentWindow.setCasinoFit(true);
        await handle.ready;
        completedRound = handle.getState().history?.[0]?.id;
        roundObserver = new MutationObserver(() => {
          const status = handle.getSessionStatus();
          const id = handle.getState().history?.[0]?.id;
          if (status.ready && !status.busy && !status.pending && !status.roundActive && id && id !== completedRound) {
            completedRound = id;
            void Promise.resolve(onRoundComplete()).catch(() => {});
          }
        });
        roundObserver.observe(frame.contentDocument.querySelector("#game"), { childList: true, subtree: true, attributes: true });
        if (!destroyed) resolve();
      } catch (error) { reject(Error(error.message || "Falha ao preparar a mesa.")); }
    };
    window.addEventListener("message", receive);
    frame.cleanup = () => { clearTimeout(timeout); window.removeEventListener("message", receive); };
  });
  frame.src = new URL(`../assets/games/${directory}/embed.html`, import.meta.url).href;
  container.append(frame);
  return {
    ready,
    canLeave: () => !handle || handle.canLeave(),
    refreshBalance: () => handle?.updateBalance(),
    destroy() {
      destroyed = true;
      roundObserver?.disconnect();
      frame.cleanup();
      handle?.destroy();
      frame.remove();
      rejectReady(Error("Mesa fechada."));
    },
  };
}
