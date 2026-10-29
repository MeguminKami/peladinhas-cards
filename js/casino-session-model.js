// A checkpoint contains cumulative totals, never a batch of spins. Game state
// and RNG stay on the device. This is a fictional, client-computed economy.
import { DJABUCOIN, CASINO_EDITION } from "./casino-economy.js";
import { SHOP_CARDS } from "./casino-shop-catalog.js";
import { payFromCasinoFunds, shopFunds } from "./casino-shop-payment.js";
export function casinoSessionInput(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !["open", "shop", "sync"].includes(value.action) ||
    typeof value.owner !== "string" ||
    typeof value.id !== "string" ||
    !/^[\w-]{16,80}$/.test(value.id)
  )
    throw Error("Sessão de casino inválida.");
  const keys =
    value.action !== "sync"
      ? ["action", "owner", "id"]
      : ["action", "owner", "id", "sequence", "spent", "won", "release", "rejuice", "vaultDeposit", "shopCard"];
  if (Object.keys(value).some((key) => !keys.includes(key)))
    throw Error("Campos de sessão inválidos.");
  if (
    value.action === "sync" &&
    (!Number.isSafeInteger(value.sequence) ||
      value.sequence < 1 ||
      ![value.spent, value.won].every(
        (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e12,
      ) ||
      typeof value.release !== "boolean" ||
      (value.rejuice !== undefined && (value.rejuice !== true || value.release)) ||
      (value.vaultDeposit !== undefined && (!Number.isSafeInteger(value.vaultDeposit) || value.vaultDeposit <= 0 || value.vaultDeposit > 1e12 || value.release || value.rejuice)) ||
      (value.shopCard !== undefined && (!SHOP_CARDS.some(card => card.id === value.shopCard) || value.release || value.rejuice || value.vaultDeposit)))
  )
    throw Error("Confirmação de saldo inválida.");
  return Object.fromEntries(keys.filter(key => value[key] !== undefined).map((key) => [key, value[key]]));
}

export function applyCasinoSession(wallet, session, input, now = Date.now(), shop = {}) {
  const body = casinoSessionInput(input);
  const reply = (next, record) => ({
    wallet: next,
    sequence: record.sequence,
    sessionBalance: record.balance,
    closed: record.closed,
    spent: record.spent,
    won: record.won,
    rejuice: record.rejuice || false,
    vaultDeposited: record.vaultDeposited || 0,
    purchase: record.purchase || null,
  });
  if (body.action !== "sync") {
    if (session) {
      if (session.edition !== CASINO_EDITION) throw Error("Atualiza a página para a nova carteira.");
      return {
        write: false,
        wallet,
        session,
        response: reply(wallet, session),
      };
    }
    const record = {
      edition: CASINO_EDITION,
      sequence: 0,
      spent: 0,
      won: 0,
      balance: wallet.balance,
      closed: false,
      updatedAt: now,
    };
    const next = {
      ...wallet,
      activeCasinoSession: null,
      sessionProtocol: 5,
    };
    return {
      write: true,
      wallet: next,
      session: record,
      response: reply(next, record),
    };
  }
  if (!session) throw Error("A sessão não existe. Reabre o casino.");
  if (session.edition !== CASINO_EDITION) throw Error("Atualiza a página para a nova carteira.");
  const fingerprint = JSON.stringify([
    body.sequence,
    body.spent,
    body.won,
    body.release,
    ...(body.rejuice ? [true] : []),
    ...(body.vaultDeposit ? [{ vaultDeposit: body.vaultDeposit }] : []),
    ...(body.shopCard ? [{ shopCard: body.shopCard }] : []),
  ]);
  if (body.sequence === session.sequence) {
    if (session.fingerprint !== fingerprint)
      throw Error("Esta confirmação já foi usada com outros valores.");
    return { write: false, wallet, session, response: reply(wallet, session) };
  }
  if (
    session.closed ||
    body.sequence !== session.sequence + 1 ||
    body.spent < session.spent ||
    body.won < session.won
  )
    throw Error("A sequência da carteira não corresponde à sessão.");
  const amount = body.won - session.won - (body.spent - session.spent);
  const settledBalance = wallet.balance + amount;
  const rejuice = !!body.rejuice && settledBalance >= 0 && settledBalance < 5 * DJABUCOIN.scale;
  const bonus = rejuice ? 50 * DJABUCOIN.scale : 0;
  const vaultDeposited = body.vaultDeposit && settledBalance >= body.vaultDeposit ? body.vaultDeposit : 0;
  let vaultBalance = (wallet.vaultBalance || 0) + vaultDeposited;
  if (!Number.isSafeInteger(vaultBalance) || vaultBalance < 0 || vaultBalance > 1e12)
    throw Error("Limite da Vault atingido.");
  let balance = settledBalance + bonus - vaultDeposited;
  if (!Number.isSafeInteger(balance) || balance > 1e12)
    throw Error("Saldo da sessão inválido.");
  if (balance < 0) {
    const error = Error("O saldo foi utilizado noutro dispositivo. O lote está guardado; atualiza o saldo antes de continuar.");
    error.reason = "insufficient-balance";
    throw error;
  }
  let purchase = null;
  let shopOwned = wallet.shopOwned || [];
  if (body.shopCard) {
    const card = SHOP_CARDS.find(card => card.id === body.shopCard);
    const owned = [...new Set([...shopOwned, ...(shop.owned || [])])];
    const reason = owned.includes(card.id) ? "owned" : !Number.isFinite(shop.ovr) || shop.ovr < card.minOvr ? "ovr" : shopFunds({ balance, vaultBalance }) < card.price * DJABUCOIN.scale ? "funds" : null;
    purchase = { cardId: card.id, ok: !reason, reason };
    if (!reason) {
      ({ balance, vaultBalance } = payFromCasinoFunds({ balance, vaultBalance }, card.price * DJABUCOIN.scale));
      shopOwned = [...owned, card.id];
    } else shopOwned = owned;
  }
  const record = {
    ...session,
    sequence: body.sequence,
    spent: body.spent,
    won: body.won,
    balance,
    fingerprint,
    closed: body.release,
    rejuice,
    vaultDeposited,
    purchase,
    updatedAt: now,
  };
  const next = {
    ...wallet,
    balance,
    revision: wallet.revision + 1,
    vaultBalance,
    shopOwned,
    activeCasinoSession: null,
    recent: bonus || amount || vaultDeposited || purchase?.ok
      ? [
          ...(purchase?.ok ? [{ id: `${body.id}:${body.sequence}:shop`, kind: "shop", cardId: purchase.cardId, amount: -SHOP_CARDS.find(card => card.id === purchase.cardId).price * DJABUCOIN.scale, at: now }] : []),
          ...(vaultDeposited ? [{ id: `${body.id}:${body.sequence}:vault`, kind: "vault", amount: -vaultDeposited, at: now }] : []),
          ...(bonus ? [{ id: `${body.id}:${body.sequence}:rejuice`, kind: "rejuice", amount: bonus, at: now }] : []),
          ...(amount ? [{ id: `${body.id}:${body.sequence}`, kind: "slot", amount, at: now }] : []),
          ...wallet.recent,
        ].slice(0, 12)
      : wallet.recent,
  };
  return {
    write: true,
    wallet: next,
    session: record,
    response: reply(next, record),
  };
}
