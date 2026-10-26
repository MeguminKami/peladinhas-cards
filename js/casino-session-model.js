// A checkpoint contains cumulative totals, never a batch of spins. Game state
// and RNG stay on the device. This is a fictional, client-computed economy.
import { CASINO_EDITION } from "./casino-economy.js";
export function casinoSessionInput(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !["open", "sync"].includes(value.action) ||
    typeof value.owner !== "string" ||
    typeof value.id !== "string" ||
    !/^[\w-]{16,80}$/.test(value.id)
  )
    throw Error("Sessão de casino inválida.");
  const keys =
    value.action === "open"
      ? ["action", "owner", "id"]
      : ["action", "owner", "id", "sequence", "spent", "won", "release"];
  if (Object.keys(value).some((key) => !keys.includes(key)))
    throw Error("Campos de sessão inválidos.");
  if (
    value.action === "sync" &&
    (!Number.isSafeInteger(value.sequence) ||
      value.sequence < 1 ||
      ![value.spent, value.won].every(
        (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e12,
      ) ||
      typeof value.release !== "boolean")
  )
    throw Error("Confirmação de saldo inválida.");
  return Object.fromEntries(keys.filter(key => value[key] !== undefined).map((key) => [key, value[key]]));
}

export function applyCasinoSession(wallet, session, input, now = Date.now()) {
  const body = casinoSessionInput(input);
  const reply = (next, record) => ({
    wallet: next,
    sequence: record.sequence,
    sessionBalance: record.balance,
    closed: record.closed,
    spent: record.spent,
    won: record.won,
  });
  if (body.action === "open") {
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
  const balance = wallet.balance + amount;
  if (!Number.isSafeInteger(balance) || balance > 1e12)
    throw Error("Saldo da sessão inválido.");
  if (balance < 0) {
    const error = Error("O saldo foi utilizado noutro dispositivo. O lote está guardado; atualiza o saldo antes de continuar.");
    error.reason = "insufficient-balance";
    throw error;
  }
  const record = {
    ...session,
    sequence: body.sequence,
    spent: body.spent,
    won: body.won,
    balance,
    fingerprint,
    closed: body.release,
    updatedAt: now,
  };
  const next = {
    ...wallet,
    balance,
    revision: wallet.revision + 1,
    activeCasinoSession: null,
    recent: amount
      ? [
          { id: `${body.id}:${body.sequence}`, kind: "slot", amount, at: now },
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
