import { callAdmin, watchBlackjack } from "./db.js";

// Transport stays in the parent; the game iframe never imports a Firebase SDK.
export function connectBlackjack(uid, onBalance, onExit) {
  let state,
    balance = 0,
    stopped = false,
    unsubscribe,
    heartbeat,
    deadline,
    observer,
    pending,
    inFlight;
  let offset = 0,
    syncedRound;
  const key = `peladinhas:blackjack:pending:${uid}`;
  const notify = () =>
    observer?.({
      table: state,
      balance,
      uid,
      now: Date.now() + offset,
      pending: !!pending,
    });
  function accept(data) {
    if (stopped) return;
    if (
      data.table &&
      state &&
      data.table.id === state.id &&
      data.table.revision < state.revision
    )
      return;
    if (data.serverNow) offset = data.serverNow - Date.now();
    if (Number.isSafeInteger(data.balance)) {
      balance = data.balance;
      onBalance(balance);
    }
    if (
      data.table &&
      (!state ||
        data.table.id !== state.id ||
        data.table.revision >= state.revision)
    )
      state = data.table;
    notify();
  }
  async function call(body) {
    const { data } = await callAdmin("blackjackAction", body, {
      timeout: 10000,
    });
    accept(data);
    return data;
  }
  async function command(action, amount) {
    if (stopped || inFlight) return;
    if (!pending) {
      pending = {
        action,
        id: crypto.randomUUID(),
        ...(state ? { table: state.id, revision: state.revision } : {}),
        ...(amount === undefined ? {} : { amount }),
      };
      sessionStorage.setItem(key, JSON.stringify(pending));
    }
    notify();
    inFlight = call(pending)
      .then((data) => {
        pending = undefined;
        sessionStorage.removeItem(key);
        if (!data.table || !data.seat) {
          stop(false);
          onExit("A tua sessão na mesa terminou.");
        }
        if (data.stale)
          throw Error("A mesa avançou. Confirma a tua próxima decisão.");
        return data;
      })
      .catch((error) => {
        // A definitive rejection cannot have changed money. Unknown network outcomes retain the exact request.
        if (
          error.code &&
          !/unavailable|deadline-exceeded|internal|unknown/.test(error.code)
        ) {
          pending = undefined;
          sessionStorage.removeItem(key);
        }
        throw error;
      })
      .finally(() => {
        inFlight = undefined;
        notify();
      });
    return inFlight;
  }
  function schedule() {
    clearTimeout(deadline);
    if (!state || stopped) return;
    const nextDeadline = Math.min(
      state.deadline || Infinity,
      state.idleDeadline || Infinity,
    );
    if (!Number.isFinite(nextDeadline)) return;
    deadline = setTimeout(
      async () => {
        if (stopped) return;
        try {
          await call({
            action: "tick",
            table: state.id,
            id: crypto.randomUUID(),
          });
        } catch {
          /* A scheduler also recovers deadlines; no tight retry loop. */
        }
      },
      Math.max(
        100,
        nextDeadline -
          Date.now() -
          offset +
          100 +
          ((state.players.find((p) => p.uid === uid)?.seat || 1) - 1) * 400,
      ),
    );
  }
  const ready = (async () => {
    pending = JSON.parse(sessionStorage.getItem(key) || "null") || undefined;
    if (pending) await command();
    if (stopped) return;
    await command("join");
    if (stopped) return;
    unsubscribe = watchBlackjack(
      (table) => {
        if (stopped) return;
        if (
          !table ||
          table.id !== state?.id ||
          !table.players.some((p) => p.uid === uid && !p.leaving)
        ) {
          stop(false);
          onExit(
            "Saíste da mesa. As apostas em curso são resolvidas pelo dealer.",
          );
          return;
        }
        if (table.revision < state.revision) return;
        state = table;
        notify();
        schedule();
        if (
          table.round?.phase === "summary" &&
          syncedRound !== table.round.id
        ) {
          syncedRound = table.round.id;
          void call({
            action: "balance",
            table: table.id,
            id: crypto.randomUUID(),
          }).catch(() => {});
        }
      },
      () => {
        stop(false);
        onExit(
          "A ligação à mesa foi interrompida. Volta a entrar para recuperar.",
        );
      },
    );
    heartbeat = setInterval(() => {
      if (stopped || inFlight || document.hidden) return;
      void call({
        action: "heartbeat",
        table: state.id,
        id: crypto.randomUUID(),
      }).catch((error) => {
        if (error.code === "functions/failed-precondition") {
          stop(false);
          onExit("Saíste da mesa por inatividade.");
        }
      });
    }, 30000);
    schedule();
  })();
  function stop(leave = true) {
    if (stopped) return;
    stopped = true;
    unsubscribe?.();
    clearInterval(heartbeat);
    clearTimeout(deadline);
    if (leave && state) {
      void Promise.resolve(inFlight)
        .catch(() => {})
        .then(() =>
          callAdmin("blackjackAction", {
            action: "leave",
            table: state.id,
            id: crypto.randomUUID(),
          }),
        )
        .catch(() => {});
    }
  }
  return {
    ready,
    command,
    refreshBalance: () =>
      state &&
      call({ action: "balance", table: state.id, id: crypto.randomUUID() }),
    subscribe(fn) {
      observer = fn;
      notify();
      return () => {
        observer = undefined;
      };
    },
    destroy: stop,
  };
}

export function mountBlackjackMultiplayer(
  container,
  { uid, onBalance, onExit },
) {
  const connection = connectBlackjack(uid, onBalance, onExit);
  const frame = document.createElement("iframe");
  frame.title = "Blackjack · Mesa partilhada";
  frame.allow = "fullscreen; autoplay";
  let handle,
    destroyed = false,
    timer,
    rejectReady;
  const ready = new Promise((resolve, reject) => {
    rejectReady = reject;
    const receive = async (event) => {
      if (
        event.source !== frame.contentWindow ||
        event.origin !== location.origin ||
        event.data?.type !== "peladinhas-table-ready"
      )
        return;
      window.removeEventListener("message", receive);
      clearTimeout(timer);
      try {
        await connection.ready;
        if (destroyed) return;
        handle = frame.contentWindow.mountBlackjackMultiplayer(connection);
        frame.contentWindow.setCasinoFit(true);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    window.addEventListener("message", receive);
    frame.cleanup = () => window.removeEventListener("message", receive);
    timer = setTimeout(
      () =>
        reject(
          Error(
            "Não foi possível abrir a mesa. Volta ao casino e tenta novamente.",
          ),
        ),
      20000,
    );
  });
  // Consume a possible early connection rejection before the iframe finishes loading.
  void connection.ready.catch((error) => rejectReady(error));
  frame.src = new URL(
    "../assets/games/blackjack/embed.html",
    import.meta.url,
  ).href;
  container.append(frame);
  return {
    ready,
    onlineTable: true,
    canLeave: () => true,
    refreshBalance: connection.refreshBalance,
    destroy() {
      destroyed = true;
      clearTimeout(timer);
      frame.cleanup();
      handle?.destroy();
      connection.destroy();
      frame.remove();
      rejectReady(Error("Mesa fechada."));
    },
  };
}
