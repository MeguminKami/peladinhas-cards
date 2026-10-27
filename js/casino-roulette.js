import { callAdmin, watchRoulette, watchRouletteChat } from "./db.js";

const transient = (error) =>
  [
    "functions/unavailable",
    "functions/deadline-exceeded",
    "functions/internal",
    "functions/unknown",
  ].includes(error?.code);

export function connectRoulette(uid, onBalance, onExit) {
  const pendingKey = `peladinhas:roulette:pending:${uid}`;
  let state,
    balance = 0,
    stopped = false,
    unsubscribe,
    unsubscribeChat,
    heartbeat,
    deadline,
    retryTimer,
    inFlight,
    observer,
    chatObserver,
    pendingSpin = JSON.parse(sessionStorage.getItem(pendingKey) || "null"),
    pendingWait,
    syncedRound = 0,
    balanceSync;
  let offset = 0;
  const notify = () =>
    observer?.({
      table: state,
      balance,
      uid,
      now: Date.now() + offset,
      pending: !!pendingSpin,
    });

  function accept(table, response = {}) {
    if (stopped) return;
    if (Number.isFinite(response.serverNow)) offset = response.serverNow - Date.now();
    if (Number.isSafeInteger(response.balance)) {
      balance = response.balance;
      onBalance(balance);
    }
    if (
      table &&
      (!state || table.id !== state.id || table.revision >= (state.revision || 0))
    )
      state = table;
    notify();
    schedule();
    const result = state?.result;
    if (result && result.id !== syncedRound && result.players.some((player) => player.uid === uid)) {
      syncedRound = result.id;
      if (!Number.isSafeInteger(response.balance) && !pendingSpin) {
        balanceSync ||= request("balance")
          .then((data) => {
            if (Number.isSafeInteger(data.balance)) {
              balance = data.balance;
              onBalance(balance);
            }
            return data;
          })
          .catch((error) => {
            if (!stopped) onExit(`Não foi possível atualizar o saldo da Roleta: ${error.message}`);
          })
          .finally(() => (balanceSync = undefined));
      }
    }
    if (result && pendingWait && result.id === pendingWait.roundId) {
      const personal = result.players.find((player) => player.uid === uid);
      if (personal) {
        clearTimeout(pendingWait.timer);
        const wait = pendingWait;
        pendingWait = undefined;
        Promise.resolve(balanceSync).then(() => {
          wait.resolve({
            ...personal,
            roundId: result.id,
            number: result.number,
            winningColor: result.color,
            balance,
          });
        });
      }
    }
  }

  async function request(action, extra = {}) {
    if (stopped) throw Error("A mesa foi fechada.");
    const { data } = await callAdmin("rouletteAction", {
      action,
      id: crypto.randomUUID(),
      ...(state ? { table: state.id } : {}),
      ...extra,
    }, { timeout: 10000 });
    accept(data.table, data);
    return data;
  }

  async function sendPendingSpin() {
    if (!pendingSpin) throw Error("Não há aposta pendente.");
    if (inFlight) return inFlight;
    inFlight = (async () => {
      for (;;) {
        if (stopped) throw Error("A mesa foi fechada.");
        try {
          const { data } = await callAdmin(
            "rouletteAction",
            pendingSpin,
            { timeout: 10000 },
          );
          accept(data.table, data);
          pendingSpin = undefined;
          sessionStorage.removeItem(pendingKey);
          if (data.stale) throw Error("A ronda avançou. Confirma a tua próxima aposta.");
          const roundId = data.table?.roundId;
          const own = data.table?.result?.players?.find((player) => player.uid === uid);
          if (own && data.table.result.id === roundId)
            return {
              ...own,
              roundId,
              number: data.table.result.number,
              winningColor: data.table.result.color,
              balance: data.balance,
            };
          if (data.table?.phase === "closing" && roundId) {
            return new Promise((resolve, reject) => {
              pendingWait = {
                roundId,
                resolve,
                reject,
                timer: setTimeout(() => {
                  pendingWait = undefined;
                  reject(Error("A mesa ainda não confirmou o resultado. Tenta recuperar."));
                }, 30000),
              };
              if (state?.result?.id === roundId) accept(state);
            });
          }
          throw Error("O servidor ainda não devolveu a tua ronda.");
        } catch (error) {
          if (!transient(error)) {
            pendingSpin = undefined;
            sessionStorage.removeItem(pendingKey);
            throw error;
          }
          await new Promise((resolve) => {
            retryTimer = setTimeout(resolve, 2000);
          });
        }
      }
    })().finally(() => {
      inFlight = undefined;
      notify();
    });
    return inFlight;
  }

  function schedule() {
    clearTimeout(deadline);
    if (stopped || !["closing", "result"].includes(state?.phase) || !state.deadline) return;
    deadline = setTimeout(
      () => void request("tick").catch((error) => {
        if (!stopped && !transient(error)) onExit(`A ronda não foi atualizada: ${error.message}`);
      }),
      Math.max(100, state.deadline - Date.now() - offset + 100),
    );
  }

  const ready = (async () => {
    unsubscribe = watchRoulette(
      (table) => accept(table),
      (error) => {
        if (!stopped) onExit(`A ligação à mesa foi interrompida: ${error.message}`);
      },
    );
    const joined = await request("join");
    if (stopped) return;
    if (pendingSpin) await sendPendingSpin();
    if (stopped) return;
    heartbeat = setInterval(() => {
      if (stopped || document.hidden || inFlight) return;
      void request("heartbeat").catch((error) => {
        if (!stopped && !transient(error)) onExit(`A sessão da mesa terminou: ${error.message}`);
      });
    }, 30000);
    return { ...joined, table: state, balance };
  })();

  function subscribe(fn) {
    observer = fn;
    notify();
    return () => {
      if (observer === fn) observer = undefined;
    };
  }

  function subscribeChat(fn, onError = () => {}) {
    unsubscribeChat?.();
    chatObserver = fn;
    unsubscribeChat = watchRouletteChat(
      (messages) => {
        if (!stopped) chatObserver?.(messages);
      },
      (error) => {
        if (!stopped) onError(error);
      },
    );
    return () => {
      unsubscribeChat?.();
      unsubscribeChat = undefined;
      chatObserver = undefined;
    };
  }

  return {
    uid,
    ready,
    subscribe,
    subscribeChat,
    getState: () => state,
    getBalance: () => balance,
    getPending: () => !!pendingSpin,
    async spin(plan) {
      await ready;
      if (pendingSpin) return sendPendingSpin();
      if (!state) throw Error("A mesa ainda não está pronta.");
      pendingSpin = {
        action: "spin",
        id: crypto.randomUUID(),
        table: state.id,
        plan,
      };
      sessionStorage.setItem(pendingKey, JSON.stringify(pendingSpin));
      notify();
      return sendPendingSpin();
    },
    async retry() {
      if (pendingSpin) return sendPendingSpin();
      return request("balance");
    },
    async sendChat(message) {
      await ready;
      return request("chat", { message });
    },
    destroy() {
      if (stopped) return;
      stopped = true;
      unsubscribe?.();
      unsubscribeChat?.();
      clearInterval(heartbeat);
      clearTimeout(deadline);
      clearTimeout(retryTimer);
      if (pendingWait) {
        clearTimeout(pendingWait.timer);
        pendingWait.reject(Error("A mesa foi fechada."));
        pendingWait = undefined;
      }
      if (state)
        void callAdmin("rouletteAction", {
          action: "leave",
          id: crypto.randomUUID(),
          table: state.id,
        }).catch(() => {});
    },
  };
}

export function mountRouletteMultiplayer(
  container,
  { uid, onBalance, onExit },
) {
  const connection = connectRoulette(uid, onBalance, onExit);
  const frame = document.createElement("iframe");
  frame.title = "Roleta · Mesa partilhada";
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
        const joined = await connection.ready;
        if (destroyed) return;
        handle = frame.contentWindow.mountRouletteMultiplayer(connection);
        frame.contentWindow.setCasinoFit(true);
        await handle.ready;
        if (!destroyed) resolve(joined);
      } catch (error) {
        reject(error);
      }
    };
    window.addEventListener("message", receive);
    frame.cleanup = () => window.removeEventListener("message", receive);
    timer = setTimeout(
      () => reject(Error("Não foi possível abrir a mesa. Volta ao casino e tenta novamente.")),
      20000,
    );
  });
  void connection.ready.catch((error) => rejectReady(error));
  frame.src = new URL("../assets/games/roulette/embed.html", import.meta.url).href;
  container.append(frame);
  return {
    ready,
    onlineTable: true,
    canLeave: () => !connection.getPending(),
    refreshBalance: connection.retry,
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
