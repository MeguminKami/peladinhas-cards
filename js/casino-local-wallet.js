import { callAdmin } from "./db.js";
import { settleCasinoSlot, CASINO_EDITION } from "./casino-economy.js";
import { readCasinoLocal, writeCasinoLocal } from "./casino-local-store.js";
import { tableOperation } from "./casino-table-operation.js";

export function createCasinoLocalWallet(uid, changed = () => {}, { tables = false } = {}) {
  const playerId = `${uid}:${CASINO_EDITION}`;
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
      balance: state.syncBlocked ? 0 : state.balance,
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
      data.wallet.edition !== CASINO_EDITION || data.wallet.sessionProtocol !== 5 ||
      !Number.isSafeInteger(data.sessionBalance) || data.sessionBalance < 0 ||
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
  function assertPlayable() {
    if (!state?.syncBlocked) return;
    const error = Error(state.syncError || "Atualiza o saldo para recuperar o lote pendente antes de continuar.");
    Object.assign(error, { definitive: true, applied: false, balance: 0,
      code: "INSUFFICIENT_BALANCE", publicMessage: error.message });
    throw error;
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
      sessionBalance: result.sessionBalance,
      balance: Math.max(0, balance),
      syncBlocked: balance < 0,
      sequence: result.sequence,
      confirmedSpent: payload.spent,
      confirmedWon: payload.won,
      confirmedNormalSpins: payload.normalSpins || 0,
      pending: null,
      lastRejuice: payload.body.rejuice ? result.rejuice : state.lastRejuice,
      lastVaultDeposit: payload.body.vaultDeposit ? result.vaultDeposited : state.lastVaultDeposit,
      lastPurchase: payload.body.shopCard ? result.purchase : state.lastPurchase,
      closed: result.closed,
      checkedAt: Date.now(),
      syncError: balance < 0 ? "O saldo mudou noutro dispositivo. Atualiza para confirmar o lote pendente antes de continuar." : "",
      dirty:
        state.spent !== payload.spent ||
        state.won !== payload.won ||
        state.progressRevision !== payload.progressRevision,
    };
    if (next.progress) next.progress = { ...next.progress, balance: next.balance };
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
      normalSpins: state.normalSpins || 0,
    };
    await save({ ...state, pending }); // Persist intent before any network request.
    const result = await send(pending.body);
    return accept(result, pending);
  }
  async function restoreFrameCache() {
    if (!state.progress) return;
    const key = `slot-local-v1:player:${encodeURIComponent(playerId)}`;
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
  async function start() {
    if (starting) return starting;
    if (state && !state.opening && !state.closed && !stopped && releaseTab)
      return view();
    starting = (async () => {
      await ownTab();
      return lock(async () => {
        if (stopped) throw Error("Esta página já foi fechada.");
        state = await readCasinoLocal(uid);
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
            normalSpins: 0,
            confirmedNormalSpins: 0,
            balance: 0,
            wallet: previous?.wallet || { balance: 0, recent: [] },
            closed: false,
            opening: true,
            dirty: false,
            pending: null,
            progress: previous?.progress,
            progressRevision:
              previous?.progressRevision || 0,
            rounds: previous?.rounds || {},
            lastOperation: previous?.lastOperation || null,
            tableReceipts: previous?.tableReceipts || {},
            rift: previous?.rift || null,
            riftReceipts: previous?.riftReceipts || {},
            cardoso: previous?.cardoso || null,
            cardosoReceipt: previous?.cardosoReceipt || null,
            cardosoReceipts: previous?.cardosoReceipts || {},
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
          sessionBalance: result.sessionBalance,
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
      assertPlayable();
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
      let next;
      try {
        next = settleCasinoSlot(
          { ...state.wallet, balance: state.balance },
          transaction,
          prior?.roundId === transaction.roundId ? prior : undefined,
        );
      } catch (error) {
        // No local state was changed, so the iframe may safely discard its
        // pending request instead of retrying it on every reload.
        Object.assign(error, {
          definitive: true,
          applied: false,
          balance: state.balance,
        });
        throw error;
      }
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
        wallet: { ...state.wallet, recent: next.wallet.recent },
        spent,
        won,
        dirty: true,
        normalSpins: (state.normalSpins || 0) + (transaction.mode === "base" && transaction.spin === 1 ? 1 : 0),
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
    else if (input.progress?.active === null && (state.normalSpins || 0) - Math.max(state.confirmedNormalSpins || 0, state.lastAttemptNormalSpins || 0) >= 15)
      void checkpoint("spins").catch(() => {});
    return result;
  }
  async function settleTable(game, input) {
    return lock(async () => {
      if (!tables) throw Error("As mesas estão indisponíveis.");
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
      assertPlayable();
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
        wallet: { ...state.wallet, recent: [
          { id: input.id, kind: game, amount: operation.credit - operation.debit, at: Date.now() },
          ...state.wallet.recent,
        ].slice(0, 12) },
        tableReceipts: { ...state.tableReceipts, [input.id]: { fingerprint, balance } },
      });
      return { balance };
    });
  }
  async function riftRequest(action, payload, id) {
    if (!tables) throw Error("A Rift está indisponível.");
    const { applyLocalRift } = await import("./casino-rift-local.js");
    let bonusComplete = false;
    const result = await lock(async () => {
      if (stopped || !state || state.closed || state.opening) throw Error("Reabre o casino para recuperar.");
      if (typeof id !== "string" || !/^[a-zA-Z0-9-]{16,100}$/.test(id)) throw Error("Pedido inválido.");
      const fingerprint = JSON.stringify({ action, payload });
      const receipt = state.riftReceipts && Object.hasOwn(state.riftReceipts, id) ? state.riftReceipts[id] : null;
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) throw Error("Pedido repetido com valores diferentes.");
        return structuredClone(receipt.result);
      }
      if (action === "play") assertPlayable();
      const next = applyLocalRift(state.rift, state.balance, { action, payload });
      bonusComplete = action === "play" && !!state.rift?.state?.round && !next.session.state.round;
      const normalSpin = action === "play" && !state.rift?.state?.round && !payload.buy;
      const spent = state.spent + next.debit, won = state.won + next.credit;
      if (![spent, won].every(n => Number.isSafeInteger(n) && n <= 1e12)) throw Error("Limite da sessão atingido.");
      try {
        await save({ ...state, rift: next.session, balance: next.balance, spent, won,
          dirty: state.dirty || action === "play",
          normalSpins: (state.normalSpins || 0) + (normalSpin ? 1 : 0),
          wallet: { ...state.wallet,
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
    if (bonusComplete) void checkpoint("bonus").catch(() => {});
    else if (action === "play" && !state.rift?.state?.round && (state.normalSpins || 0) - Math.max(state.confirmedNormalSpins || 0, state.lastAttemptNormalSpins || 0) >= 15)
      void checkpoint("spins").catch(() => {});
    return result;
  }
  async function cardosoState() {
    const { fresh } = await import('../assets/games/cardoso-road/engine.mjs');
    return structuredClone({ ...(state?.cardoso || fresh()), balance: state?.balance || 0 });
  }
  async function cardosoAct(action, requestId) {
    const { transition } = await import('../assets/games/cardoso-road/engine.mjs');
    let completed = false;
    const result = await lock(async () => {
      if (stopped || !state || state.closed || state.opening) throw Error('Reabre o casino para recuperar o treino.');
      if (typeof requestId !== 'string' || !/^[\w-]{16,80}$/.test(requestId)) throw Error('Pedido inválido.');
      const fingerprint = JSON.stringify(action);
      const prior = state.cardosoReceipts?.[requestId] || (state.cardosoReceipt?.id === requestId ? state.cardosoReceipt.fingerprint : null);
      if (prior) {
        if (prior !== fingerprint) throw Error('Pedido repetido com valores diferentes.');
        return cardosoState();
      }
      assertPlayable();
      let next;
      try { next = transition(await cardosoState(), action); }
      catch (error) { error.definitive = true; throw error; }
      const debit = action.type === 'start' ? next.round.bet : 0;
      completed = next.round.status !== 'active';
      const credit = completed ? next.round.payment : 0;
      const spent = state.spent + debit, won = state.won + credit;
      if (![spent, won, next.balance].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1e12)) throw Error('Limite da sessão atingido.');
      await save({ ...state, balance: next.balance, spent, won, dirty: true, cardoso: next,
        cardosoReceipt: { id: requestId, fingerprint },
        cardosoReceipts: Object.fromEntries([...Object.entries(state.cardosoReceipts || {}), [requestId, fingerprint]].slice(-600)),
        wallet: { ...state.wallet, recent: debit || completed ? [
          { id: requestId, kind: 'cardoso-road', amount: credit - debit, at: Date.now() },
          ...state.wallet.recent,
        ].slice(0, 12) : state.wallet.recent },
      });
      return structuredClone(next);
    });
    if (completed) void checkpoint('cardoso-round').catch(() => {});
    return result;
  }
  async function checkpoint(reason = "manual", { strict = false } = {}) {
    if (stopped) return view();
    if (synchronizing) {
      if (strict) {
        await synchronizing;
        return checkpoint(reason, { strict });
      }
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
          if (reason === "spins") await save({ ...state, lastAttemptNormalSpins: state.normalSpins || 0 });
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
              normalSpins: state.normalSpins || 0,
            };
            await save({ ...state, pending });
          }
          if (!pending && first && ["entry", "manual", "game-entry"].includes(reason))
            refresh = { action: "open", id: state.id };
        });
        // Never hold the local money lock across a network request. New spins
        // remain durable and their extra totals survive an older confirmation.
        if (pending) {
          const result = await send(pending.body);
          await lock(() => accept(result, pending));
          if (strict && state.dirty) syncRequested = true;
        } else if (refresh) {
          const result = await send(refresh);
          await lock(() => {
            const balance = result.wallet.balance + (state.won - state.confirmedWon) - (state.spent - state.confirmedSpent);
            return save({
              ...state,
              wallet: result.wallet,
              sessionBalance: result.sessionBalance,
              balance: Math.max(0, balance),
              checkedAt: Date.now(),
              syncError: balance < 0 ? "O saldo mudou noutro dispositivo. Atualiza para confirmar o lote pendente antes de continuar." : "",
              syncBlocked: balance < 0,
            });
          });
        }
        first = false;
      } while (syncRequested && !stopped);
      return publish();
    })()
      .catch(async error => {
        const blocked = error.details?.reason === "insufficient-balance";
        const result = await lock(async () => {
          if (state) {
            await save({
              ...state,
              syncBlocked: state.syncBlocked || blocked,
              syncError:
                blocked ? error.message : "Guardado neste dispositivo. A confirmação online fica pendente.",
            });
          }
          return view();
        });
        if (strict) throw error;
        return result;
      })
      .finally(() => {
        synchronizing = undefined;
      });
    return synchronizing;
  }
  async function loadShop() {
    await checkpoint("exit", { strict: true });
    return lock(async () => {
      if (stopped || !state || state.closed || state.opening) throw Error("Reabre o casino para visitar a loja.");
      const result = await send({ action: "shop", id: state.id });
      const balance = result.wallet.balance + state.won - state.confirmedWon - (state.spent - state.confirmedSpent);
      await save({ ...state, wallet: result.wallet, balance: Math.max(0, balance), syncBlocked: balance < 0 });
      return result.shop;
    });
  }
  async function buyShopCard(cardId) {
    if (synchronizing) await synchronizing;
    return lock(async () => {
      if (stopped || !state || state.closed || state.opening) throw Error("Reabre o casino para comprar.");
      if (state.pending) {
        const recovering = state.pending.body.shopCard;
        await flush();
        if (recovering) return state.lastPurchase;
      }
      assertPlayable();
      const pending = {
        body: { action: "sync", id: state.id, sequence: state.sequence + 1,
          spent: state.spent, won: state.won, release: false, shopCard: cardId },
        spent: state.spent, won: state.won, progressRevision: state.progressRevision,
        normalSpins: state.normalSpins || 0,
      };
      await save({ ...state, pending });
      const result = await send(pending.body);
      await accept(result, pending);
      return result.purchase;
    });
  }
  async function depositVault(amount) {
    if (synchronizing) await synchronizing;
    return lock(async () => {
      if (stopped || !state || state.closed || state.opening) throw Error("Espera pela carteira ou volta a abrir o casino.");
      if (state.pending) {
        const recovering = state.pending.body.vaultDeposit;
        await flush();
        if (recovering) return state.lastVaultDeposit;
      }
      assertPlayable();
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > state.balance)
        throw Error("Escolhe um valor até ao saldo disponível na carteira.");
      const pending = {
        body: { action: "sync", id: state.id, sequence: state.sequence + 1,
          spent: state.spent, won: state.won, release: false, vaultDeposit: amount },
        spent: state.spent, won: state.won, progressRevision: state.progressRevision,
        normalSpins: state.normalSpins || 0,
      };
      await save({ ...state, pending });
      const result = await send(pending.body);
      await accept(result, pending);
      return result.vaultDeposited;
    });
  }
  async function rejuice() {
    if (synchronizing) await synchronizing;
    return lock(async () => {
      if (stopped || !state || state.closed || state.opening) throw Error("Espera pela carteira ou volta a abrir o casino.");
      if (state.pending) {
        const recoveringRejuice = state.pending.body.rejuice;
        await flush();
        if (recoveringRejuice) return state.lastRejuice;
      }
      assertPlayable();
      if (state.balance >= 500) return false;
      const pending = {
        body: { action: "sync", id: state.id, sequence: state.sequence + 1,
          spent: state.spent, won: state.won, release: false, rejuice: true },
        spent: state.spent, won: state.won, progressRevision: state.progressRevision,
        normalSpins: state.normalSpins || 0,
      };
      await save({ ...state, pending });
      const result = await send(pending.body);
      await accept(result, pending);
      return result.rejuice;
    });
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
              sessionBalance: result.sessionBalance,
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
    rejuice,
    depositVault,
    loadShop,
    buyShopCard,
    async enterGame() {
      await start();
      return checkpoint("game-entry", { strict: true });
    },
    settle,
    settleTable,
    riftRequest,
    riftActive: () => !!state?.rift?.state?.round,
    cardosoState,
    cardosoAct,
    checkpoint,
    close,
    view,
    async balance() {
      return state?.syncBlocked ? 0 : state?.balance;
    },
  };
}
