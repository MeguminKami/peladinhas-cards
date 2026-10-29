export function pendingBets(
  players: readonly { seat: number; bet: number; leaving: boolean }[],
  drafts: readonly number[],
) {
  return players.filter(p => !p.leaving && !p.bet && drafts[p.seat - 1] > 0)
    .map(p => ({ seat: p.seat, amount: drafts[p.seat - 1] }));
}

export async function confirmBets(
  bets: readonly { seat: number; amount: number }[],
  balance: number,
  send: (amount: number, seat: number) => Promise<unknown>,
  confirmed: (amount: number, seat: number) => void,
) {
  if (!bets.length) return;
  if (bets.some(b => !Number.isSafeInteger(b.amount) || b.amount < 20 || b.amount > 100000 || b.amount % 2))
    throw Error('Aposta inválida.');
  if (bets.reduce((sum, b) => sum + b.amount, 0) > balance)
    throw Error('Saldo insuficiente para confirmar todos os lugares.');
  for (const b of bets) {
    await send(b.amount, b.seat);
    confirmed(b.amount, b.seat);
  }
}
