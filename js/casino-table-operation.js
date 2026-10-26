// Validate local accounting before the cumulative server checkpoint.
export function tableOperation(game, input) {
  if (!["blackjack", "roulette"].includes(game) || !input ||
      typeof input.id !== "string" || !input.id.length || input.id.length > 4096 ||
      ![input.debit, input.credit].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1e12) ||
      !Array.isArray(input.entries) || !input.entries.length || input.entries.length > 100) {
    throw Error("Operação de mesa inválida.");
  }
  const ids = new Set();
  let debit = 0, credit = 0;
  const entries = input.entries.map(entry => {
    if (!entry || typeof entry.id !== "string" || !entry.id.length || entry.id.length > 1024 ||
        ids.has(entry.id) || !Number.isSafeInteger(entry.amount) || Math.abs(entry.amount) > 1e12 ||
        typeof entry.label !== "string" || entry.label.length > 256) {
      throw Error("Movimentos da mesa inválidos.");
    }
    ids.add(entry.id);
    if (entry.amount < 0) debit -= entry.amount;
    else credit += entry.amount;
    return { id: entry.id, amount: entry.amount, label: entry.label };
  });
  if (debit !== input.debit || credit !== input.credit)
    throw Error("Os movimentos não correspondem ao débito e retorno.");
  return { game, id: input.id, debit, credit, entries };
}
