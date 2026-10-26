import { newCasinoWallet, settleCasinoSlot } from "../../js/casino-economy.js";
import { applyCasinoSession } from "../../js/casino-session-model.js";
export async function casinoFixture(name, input) {
  window.__casinoCalls ||= [];
  window.__casinoCalls.push({ name, input });
  if (window.__casinoFail)
    throw Error("Carteira temporariamente indisponível.");
  if (window.__casinoGate) await window.__casinoGate;
  const key = "casino-fixture-wallet";
  const state = JSON.parse(sessionStorage.getItem(key) || "null") || {
    wallet: {...newCasinoWallet(), balance:10000},
    operations: {},
    rounds: {},
    sessions: {},
  };
  if (name === "casinoSession") {
    state.sessions ||= {};
    let result;
    try { result = applyCasinoSession(
      state.wallet,
      state.sessions[input.id],
      input,
    ); } catch (error) {
      error.details = { definitive: true, reason: error.reason || "invalid-checkpoint" };
      throw error;
    }
    if (result.write) {
      state.wallet = result.wallet;
      state.sessions[input.id] = result.session;
      sessionStorage.setItem(key, JSON.stringify(state));
      if (window.__casinoLoseResponse && input.action === "sync")
        throw Error("Resposta perdida após confirmação.");
      if (window.__casinoLoseOpenResponse && input.action === "open")
        throw Error("Resposta de entrada perdida.");
    }
    return { data: structuredClone(result.response) };
  }
  if (name === "grantCasinoCoins") {
    const grantKey = `casino-fixture-grants:${input.uid}`;
    const grants = JSON.parse(sessionStorage.getItem(grantKey) || "{}");
    if (!grants[input.id]) {
      grants[input.id] = input.amount;
      sessionStorage.setItem(grantKey, JSON.stringify(grants));
    }
    return { data: { balance: 10000 + Object.values(grants).reduce((sum, amount) => sum + amount, 0) } };
  }
  if (name === "settleCasinoSlot") {
    if (!state.operations[input.id]) {
      const roundKey = `${input.streamId}:${input.roundId}`;
      try {
        const next = settleCasinoSlot(
          state.wallet,
          input,
          state.rounds[roundKey],
        );
        state.wallet = next.wallet;
        state.rounds[roundKey] = next.round;
        state.operations[input.id] = input;
      } catch (error) {
        error.details = { definitive: true };
        throw error;
      }
      sessionStorage.setItem(key, JSON.stringify(state));
      if (window.__casinoLoseResponse)
        throw Error("Resposta perdida após liquidação.");
    }
  }
  sessionStorage.setItem(key, JSON.stringify(state));
  return { data: structuredClone(state.wallet) };
}
