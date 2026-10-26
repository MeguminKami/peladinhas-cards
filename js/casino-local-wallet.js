import { callAdmin } from "./db.js";
import { settleCasinoSlot } from "./casino-economy.js";
import { readCasinoLocal, writeCasinoLocal } from "./casino-local-store.js";
import { tableOperation } from "./casino-table-operation.js";

export function createCasinoLocalWallet(uid, changed = () => {}, { tables = false } = {}) {
  let state,
    releaseTab,
    starting,
    closing,
    synchronizing,
    syncRequested = false,
    stopped = false;
  const lock = (work) =>
    navigator.locks.request(`peladinhas:casino:wallet:${uid}`, work);
  const view = () =>
    state &&
    !state.opening && {
      ...state.wallet,
      balance: state.balance,
      local: state.dirty || !!state.pending,
      checkedAt: state.checkedAt,
      syncError: state.syncError || "",
    };
  const publish = () => {
    const value = view();
    if (value) changed(value);
    return value;
  };
  const save = async (next) => {
    await writeCasinoLocal(uid, next);
    state = next;
    return publish();
  };
  const send = async (body) => {
    const { data } = await callAdmin(
      "casinoSession",
      { ...body, owner: uid },
      { timeout: 10000 },
    );
    if (
      !Number.isSafeInteger(data?.wallet?.balance) ||
      data.wallet.balance < 0 ||
      !Array.isArray(data.wallet.recent) ||
      !Number.isSafeInteger(data.sequence) ||
      data.sequence < 0 ||
      typeof data.closed !== "boolean" ||
      (body.action === "sync" &&
        (data.sequence !== body.sequence ||
          data.spent !== body.spent ||
          data.won !== body.won))
    )
      throw Error(
        "Resposta de confirmação inválida. O pedido foi conservado para recuperação.",
      );
    return data;
  };

  async function ownTab() {
    if (releaseTab) return;
    if (!navigator.locks)
      throw Error("Este navegador não suporta a proteção local da carteira.");
    await new Promise((resolve, reject) => {
      navigator.locks
        .request(
          `peladinhas:casino:page:${uid}`,
          { ifAvailable: true },
          async (held) => {
            if (!held) {
              reject(
                Error(
                  "O casino já está aberto noutra aba. Fecha essa aba e tenta novamente.",
                ),
              );
              return;
            }
            await new Promise((done) => {
              releaseTab = done;
              resolve();
            });
          },
        )
        .catch(reject);
    });
  }
  function freeTab() {
    releaseTab?.();
    releaseTab = undefined;
  }
  async function accept(result, payload) {
    // The server may have credited football matches since the previous save.
    const balance =
      result.wallet.balance +
      (state.won - payload.won) -
      (state.spent - payload.spent);
    const next = {
      ...state,
      wallet: result.wallet,
      balance,
      sequence: result.sequence,
      confirmedSpent: payload.spent,
      confirmedWon: payload.won,
      pending: null,
      closed: result.closed,
      checkedAt: Date.now(),
      syncError: "",
      dirty:
        state.spent !== payload.spent ||
        state.won !== payload.won ||
        state.progressRevision !== payload.progressRevision,
    };
    if (next.progress) next.progress = { ...next.progress, balance };
    return save(next);
  }
  async function flush(release = false) {
    if (state.pending) {
      const pending = state.pending;
      const result = await send(pending.body);
      await accept(result, pending);
    }
    if (state.closed || (!state.dirty && !release)) return view();
    const pending = {
      body: {
        action: "sync",
        id: state.id,
        sequence: state.sequence + 1,
        spent: state.spent,
        won: state.won,
        release,
      },
      spent: state.spent,
      won: state.won,
      progressRevision: state.progressRevision,
    };
    await save({ ...state, pending }); // Persist intent before any network request.
    const result = await send(pending.body);
    return accept(result, pending);
  }
  async function restoreFrameCache() {
    if (!state.progress) return;
    const key = `slot-local-v1:player:${encodeURIComponent(uid)}`;
    const pendingRaw = localStorage.getItem(key + ":wallet-pending");
    const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
    const currentRaw = localStorage.getItem(key);
    const current = currentRaw ? JSON.parse(currentRaw) : null;
    if (pending && pending.transaction?.id === state.lastOperation?.id) {
      localStorage.setItem(
        key,
        JSON.stringify({ ...state.progress, balance: state.balance }),
      );
      localStorage.removeItem(key + ":wallet-pending");
    } else if (
      !pending &&
      (!current || current.revision < state.progress.revision)
    ) {
      localStorage.setItem(
        key,
        JSON.stringify({ ...state.progress, balance: state.balance }),
      );
    }
  }
  async function migrateLegacy() {
    const key = `slot-local-v1:player:${encodeURIComponent(uid)}`;
    const raw = localStorage.getItem(key + ":wallet-pending");
    if (!raw) return;
    const pending = JSON.parse(raw);
    if (pending.transaction?.progress) return; // New durable-local protocol.
    const streamId = localStorage.getItem(`peladinhas:casino:stream:${uid}`);
    if (!streamId)
      throw Error(
        "Existe uma jogada antiga pendente. Conserva o armazenamento e contacta o apoio.",
      );
    const { data } = await callAdmin(
      "settleCasinoSlot",
      { ...pending.transaction, streamId },
      { timeout: 10000 },
    );
    localStorage.setItem(
      key,
      JSON.stringify({ ...pending.next, balance: data.balance }),
    );
    localStorage.removeItem(key + ":wallet-pending");
  }
  async function start() {
    if (starting) return starting;
    if (state && !state.opening && !state.closed && !stopped && releaseTab)
      return view();
    starting = (async () => {
      await ownTab();
      return lock(async () => {
        if (stopped) throw Error("Esta página já foi fechada.");
        state = await readCasinoLocal(uid);
        await migrateLegacy();
        let migratedProgress,
          migratedRounds = {};
        if (!state) {
          const raw = localStorage.getItem(
            `slot-local-v1:player:${encodeURIComponent(uid)}`,
          );
          if (raw) {
            const progress = JSON.parse(raw);
            if (progress.schema === 1 && progress.configVersion === "0.6.0") {
              migratedProgress = progress;
              const row = progress.history?.[0],
                stream = localStorage.getItem(
                  `peladinhas:casino:stream:${uid}`,
                );
              if (row && stream)
                migratedRounds = {
                  [stream]: {
                    roundId: row.id,
                    spin: row.spins.length,
                    paid: row.paid,
                    bet: row.bet,
                    mode: row.mode,
                    bonusHunt: row.bonusHunt === true,
                  },
                };
            }
          }
        }
        const recovering =
          state &&
          !state.opening &&
          !state.closed &&
          (state.pending || state.dirty);
        if (state?.pending) await flush();
        if (state && !state.closed && state.dirty) await flush();
        if (recovering && !state.closed) {
          await restoreFrameCache();
          return view();
        }
        if (!state || state.closed) {
          const previous = state;
          await save({
            id: crypto.randomUUID(),
            sequence: 0,
            spent: 0,
            won: 0,
            confirmedSpent: 0,
            confirmedWon: 0,
            balance: 0,
            wallet: previous?.wallet || { balance: 0, recent: [] },
            closed: false,
            opening: true,
            dirty: false,
            pending: null,
            progress: previous?.progress || migratedProgress,
            progressRevision:
              previous?.progressRevision || migratedProgress?.revision || 0,
            rounds: previous?.rounds || migratedRounds,
            lastOperation: previous?.lastOperation || null,
            tableReceipts: previous?.tableReceipts || {},
            rift: previous?.rift || null,
            riftReceipts: previous?.riftReceipts || {},
            checkedAt: 0,
          });
        }
        const result = await send({ action: "open", id: state.id });
        if (result.closed)
          throw Error(
            "Esta sessão já foi encerrada. Volta a abrir a página para continuar.",
          );
        await save({
          ...state,
          opening: false,
          wallet: result.wallet,
          balance: result.wallet.balance,
          checkedAt: Date.now(),
          syncError: "",
        });
        await restoreFrameCache();
        return view();
      });
    })()
      .catch((error) => {
        freeTab();
        throw error;
      })
      .finally(() => {
        starting = undefined;
      });
    return starting;
  }
  async function settle(input) {
    const result = await lock(async () => {
      if (stopped || !state || state.closed || state.opening)
        throw Error("Reabre o casino para recuperar esta jogada.");
      const { progress, bonusComplete, ...transaction } = input;
      const fingerprint = JSON.stringify([
        transaction,
        progress?.revision,
        progress?.rngState,
        bonusComplete,
      ]);
      if (state.lastOperation?.id === input.id) {
        if (state.lastOperation.fingerprint !== fingerprint)
          throw Error("Pedido repetido com valores diferentes.");
        return view();
      }
      if (
        !progress ||
        progress.schema !== 1 ||
        progress.requestIds?.[0] !== input.id ||
        !Number.isSafeInteger(progress.revision) ||
        progress.revision <= state.progressRevision ||
        progress.history?.[0]?.id !== input.roundId ||
        progress.history[0].spins?.length !== input.spin
      )
        throw Error(
          "O progresso da slot não corresponde à jogada. Reabre para recuperar.",
        );
      const prior = state.rounds?.[transaction.streamId];
      const next = settleCasinoSlot(
        { ...state.wallet, balance: state.balance },
        transaction,
        prior?.roundId === transaction.roundId ? prior : undefined,
      );
      const spent = state.spent + transaction.debit,
        won = state.won + transaction.credit;
      if (
        !Number.isSafeInteger(spent) ||
        !Number.isSafeInteger(won) ||
        spent > 1e12 ||
        won > 1e12
      )
        throw Error("Limite da sessão atingido. Guarda e volta a entrar.");
      await save({
        ...state,
        balance: next.wallet.balance,
        wallet: next.wallet,
        spent,
        won,
        dirty: true,
        progress: { ...progress, balance: next.wallet.balance },
        progressRevision: progress.revision,
        rounds: {
          [transaction.streamId]: {
            ...next.round,
            roundId: transaction.roundId,
          },
        },
        lastOperation: { id: input.id, fingerprint },
      });
      return view();
    });
    // The complete final-FS snapshot is already durable. Never sync mid-bonus.
    if (input.bonusComplete && input.progress?.active === null)
      void checkpoint("bonus").catch(() => {});
    return result;
  }
  async function settleTable(game, input) {
    return lock(async () => {
      if (!tables) throw Error("As mesas estão disponíveis apenas no teste local.");
      if (stopped || !state || state.closed || state.opening)
        throw Error("Reabre o casino para recuperar esta operação.");
      let operation;
      try { operation = tableOperation(game, input); }
      catch (error) { error.applied = false; error.balance = state.balance; throw error; }
      const fingerprint = JSON.stringify(operation);
      const receipt = state.tableReceipts && Object.hasOwn(state.tableReceipts, input.id) ? state.tableReceipts[input.id] : null;
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) throw Error("Pedido repetido com valores diferentes.");
        return { balance: receipt.balance };
      }
      const balance = state.balance - operation.debit + operation.credit;
      const spent = state.spent + operation.debit, won = state.won + operation.credit;
      if (state.balance < operation.debit || ![balance, spent, won].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1e12)) {
        const error = Error("Saldo insuficiente ou limite da carteira atingido.");
        error.applied = false;
        error.balance = state.balance;
        throw error;
      }
      // Receipt and money commit together; storage failures remain ambiguous.
      await save({ ...state, balance, spent, won, dirty: true,
        wallet: { ...state.wallet, balance, recent: [
          { id: input.id, kind: game, amount: operation.credit - operation.debit, at: Date.now() },
          ...state.wallet.recent,
        ].slice(0, 12) },
        tableReceipts: { ...state.tableReceipts, [input.id]: { fingerprint, balance } },
      });
      return { balance };
    });
  }
  async function riftRequest(action, payload, id) {
    if (!tables) throw Error("A Rift está disponível apenas no teste local.");
    const { applyLocalRift } = await import("./casino-rift-local.js");
    return lock(async () => {
      if (stopped || !state || state.closed || state.opening) throw Error("Reabre o casino para recuperar.");
      if (typeof id !== "string" || !/^[a-zA-Z0-9-]{16,100}$/.test(id)) throw Error("Pedido inválido.");
      const fingerprint = JSON.stringify({ action, payload });
      const receipt = state.riftReceipts && Object.hasOwn(state.riftReceipts, id) ? state.riftReceipts[id] : null;
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) throw Error("Pedido repetido com valores diferentes.");
        return structuredClone(receipt.result);
      }
      const next = applyLocalRift(state.rift, state.balance, { action, payload });
      const spent = state.spent + next.debit, won = state.won + next.credit;
      if (![spent, won].every(n => Number.isSafeInteger(n) && n <= 1e12)) throw Error("Limite da sessão atingido.");
      try {
        await save({ ...state, rift: next.session, balance: next.balance, spent, won,
          dirty: state.dirty || action === "play",
          wallet: { ...state.wallet, balance: next.balance,
            recent: action === "play" ? [{ id, kind: "rift", amount: next.credit - next.debit, at: Date.now() }, ...state.wallet.recent].slice(0, 12) : state.wallet.recent },
          riftReceipts: action === "play" ? { ...state.riftReceipts, [id]: { fingerprint, result: next.result } } : state.riftReceipts,
        });
      } catch (error) {
        // The supplied client retains pending requests only for ambiguous timeouts.
        error.code = "SITE_TIMEOUT";
        error.publicMessage = "Não foi possível confirmar a gravação local. Repete para recuperar a mesma jogada.";
        throw error;
      }
      return structuredClone(next.result);
    });
  }
  async function checkpoint(reason = "manual") {
    if (stopped) return view();
    if (synchronizing) {
      syncRequested = true;
      return synchronizing;
    }
    synchronizing = (async () => {
      let first = true;
      do {
        syncRequested = false;
        let pending, refresh;
        await lock(async () => {
          if (stopped || !state || state.closed || state.opening) return;
          pending = state.pending;
          if (!pending && state.dirty) {
            pending = {
              body: {
                action: "sync",
                id: state.id,
                sequence: state.sequence + 1,
                spent: state.spent,
                won: state.won,
                release: false,
              },
              spent: state.spent,
              won: state.won,
              progressRevision: state.progressRevision,
            };
            await save({ ...state, pending });
          }
          if (!pending && first && (reason === "entry" || reason === "manual"))
            refresh = { action: "open", id: state.id };
        });
        // Never hold the local money lock across a network request. New spins
        // remain durable and their extra totals survive an older confirmation.
        if (pending) {
          const result = await send(pending.body);
          await lock(() => accept(result, pending));
        } else if (refresh) {
          const result = await send(refresh);
          await lock(() =>
            save({
              ...state,
              wallet: result.wallet,
              balance:
                result.wallet.balance +
                (state.won - state.confirmedWon) -
                (state.spent - state.confirmedSpent),
              checkedAt: Date.now(),
              syncError: "",
            }),
          );
        }
        first = false;
      } while (syncRequested && !stopped);
      return publish();
    })()
      .catch(async () => {
        return lock(() => {
          if (state) {
            state = {
              ...state,
              syncError:
                "Guardado neste dispositivo. A confirmação online fica pendente.",
            };
            publish();
          }
          return view();
        });
      })
      .finally(() => {
        synchronizing = undefined;
      });
    return synchronizing;
  }
  async function close() {
    if (closing) return closing;
    stopped = true;
    closing = (async () => {
      if (synchronizing) await synchronizing;
      return lock(async () => {
        if (!state || state.closed) return view();
        try {
          if (state.opening) {
            const result = await send({ action: "open", id: state.id });
            await save({
              ...state,
              opening: false,
              wallet: result.wallet,
              balance: result.wallet.balance,
            });
          }
          return await flush(true);
        } catch (error) {
          if (state) {
            state = {
              ...state,
              syncError:
                "Guardado neste dispositivo. Volta aqui para concluir a sincronização.",
            };
            publish();
          }
          return view();
        }
      });
    })().finally(freeTab);
    return closing;
  }
  return {
    start,
    settle,
    settleTable,
    riftRequest,
    riftActive: () => !!state?.rift?.state?.round,
    checkpoint,
    close,
    view,
    async balance() {
      return state?.balance;
    },
  };
}
