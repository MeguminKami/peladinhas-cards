import { SHOP_CARDS, buyShopCard } from "../../js/casino-shop-catalog.js";
import { cardWeek } from "../../js/card-week.js";
import { currentCasinoWallet, newCasinoWallet, settleCasinoSlot } from "../../js/casino-economy.js";
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
  state.wallet = currentCasinoWallet(state.wallet);
  if (name === "getCasinoShop" || name === "buyCasinoCard") {
    const league = window.__testState;
    const uid = "pedro";
    const user = league.users.find(u=>u.uid===uid);
    const weekly = (league.weeklyCards || []).find(row=>row.uid===uid);
    const player = {...user, photoURL:weekly?.cardPhoto?.photoURL || user.photoURL, photoDesign:weekly?.cardPhoto?.design || null, permanentStats:weekly?.permanentStats ?? weekly?.stats ?? null, previousStats:weekly?.previousStats ?? null, ovrDelta:weekly?.ovrDelta ?? null, primaryPosition:weekly?.primaryPosition || user.primaryPosition, ovr:weekly?.ovr || 0, stats:weekly?.stats || {}, hasCard:!!weekly && weekly.weekId===cardWeek().weekId && weekly.hasCard!==false};
    league.cardCollections ||= [];
    let collection = league.cardCollections.find(c=>(c.uid||c.id)===uid);
    if(!collection){collection={uid,awards:[]};league.cardCollections.push(collection);}
    const owned = collection.awards.filter(a=>a.source==="casino-shop").map(a=>a.id);
    if(name==="buyCasinoCard" && !owned.includes(input.cardId)) {
      if(!player.hasCard)throw Error("Precisas de uma carta oficial desta semana para comprar.");
      const next=buyShopCard({balance:state.wallet.balance/100,ovr:player.ovr,owned},input.cardId);
      state.wallet.balance=next.balance*100;
      state.wallet.revision++;
      const card=SHOP_CARDS.find(c=>c.id===input.cardId);
      collection.awards.push({id:card.id,name:card.name,duration:"permanent",earnedAt:new Date().toISOString(),source:"casino-shop"});
      sessionStorage.setItem(key,JSON.stringify(state));
    }
    return {data:{balance:state.wallet.balance,owned:collection.awards.filter(a=>a.source==="casino-shop").map(a=>a.id),player}};
  }
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
  if (name === "getCasinoPlayerBalance") {
    const grants = JSON.parse(sessionStorage.getItem(`casino-fixture-grants:${input.uid}`) || "{}");
    const balance = (window.__casinoPlayerBalances?.[input.uid] ?? 10000) + Object.values(grants).reduce((sum, amount) => sum + amount, 0);
    return {data:{uid:input.uid,balance}};
  }
  if (name === "grantCasinoCoins") {
    const grantKey = `casino-fixture-grants:${input.uid}`;
    const grants = JSON.parse(sessionStorage.getItem(grantKey) || "{}");
    if (!grants[input.id]) {
      grants[input.id] = input.amount;
      sessionStorage.setItem(grantKey, JSON.stringify(grants));
    }
    return { data: { balance: (window.__casinoPlayerBalances?.[input.uid] ?? 10000) + Object.values(grants).reduce((sum, amount) => sum + amount, 0) } };
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

export async function rouletteFixture(input) {
  const key = "casino-fixture-wallet";
  const state = JSON.parse(sessionStorage.getItem(key) || "null") || {
    wallet: { ...newCasinoWallet(), balance: 10000 },
    operations: {},
    rounds: {},
    sessions: {},
  };
  state.wallet = currentCasinoWallet(state.wallet);
  const uid = "pedro";
  const now = Date.now();
  const room =
    window.__rouletteRoom ||
    (window.__rouletteRoom = {
      id: "fixture-roulette-room",
      revision: 0,
      phase: "betting",
      deadline: 0,
      roundId: 0,
      result: null,
      players: [],
    });
  let balance = null;
  if (input.action === "join") {
    if (!room.players.some((player) => player.uid === uid))
      room.players.push({
        uid,
        name: "Pedro",
        color: "#74c0fc",
        activeUntil: now + 75000,
        plan: null,
        total: 0,
        ready: false,
      });
    balance = state.wallet.balance;
    room.revision++;
  } else if (input.action === "heartbeat") {
    const player = room.players.find((entry) => entry.uid === uid);
    if (player) player.activeUntil = now + 75000;
    room.revision++;
  } else if (input.action === "leave") {
    room.players = room.players.filter((player) => player.uid !== uid);
    room.revision++;
  } else if (input.action === "balance") {
    balance = state.wallet.balance;
  } else if (input.action === "tick" && room.phase === "result" && room.deadline <= now) {
    room.phase = "betting";
    room.deadline = 0;
    room.result = null;
    room.players.forEach((player) => {
      player.plan = null;
      player.total = 0;
      player.ready = false;
    });
    room.revision++;
  } else if (input.action === "spin") {
    const player = room.players.find((entry) => entry.uid === uid);
    if (!player) throw Error("Entra primeiro na mesa.");
    if (room.phase === "result") throw Error("Aguarda o próximo giro.");
    player.plan = input.plan;
    player.total = Object.values(input.plan).reduce((sum, amount) => sum + amount, 0);
    player.ready = true;
    const number = 0;
    const roundPlayers = room.players.filter((entry) => entry.plan).map((entry) => {
      const planTotal = Object.values(entry.plan).reduce((sum, amount) => sum + amount, 0);
      const lines = Object.entries(entry.plan).map(([id, stake]) => ({
        id,
        stake,
        won: id === "straight:0",
        gross: id === "straight:0" ? stake * 36 : 0,
      }));
      const gross = lines.reduce((sum, line) => sum + line.gross, 0);
      return {
        uid: entry.uid,
        name: entry.name,
        color: entry.color,
        plan: entry.plan,
        total: planTotal,
        gross,
        net: gross - planTotal,
        lines,
      };
    });
    const personal = roundPlayers.find((entry) => entry.uid === uid);
    state.wallet.balance -= personal.total;
    state.wallet.balance += personal.gross;
    state.wallet.revision++;
    sessionStorage.setItem(key, JSON.stringify(state));
    room.roundId++;
    room.phase = "result";
    room.deadline = now + 12000;
    room.result = {
      id: room.roundId,
      number,
      color: "green",
      at: now,
      players: roundPlayers,
    };
    balance = state.wallet.balance;
    room.revision++;
  } else if (input.action === "chat") {
    const messages = (window.__rouletteMessages ||= []);
    messages.push({
      id: input.id,
      uid,
      user: "Pedro",
      color: "#74c0fc",
      message: String(input.message).trim(),
      createdAt: now,
    });
  }
  window.__rouletteRoom = room;
  window.__notifyRoulette?.();
  return { table: structuredClone(room), balance, serverNow: now };
}
