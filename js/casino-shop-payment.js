// Same units as the caller: casino wallets use hundredths; the demo uses DJC.
export function shopFunds(wallet) {
  const vault = wallet.vaultBalance ?? 0;
  if (![wallet.balance, vault].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1e12))
    throw Error("Saldo inválido.");
  return wallet.balance + vault;
}

export function payFromCasinoFunds(wallet, price) {
  const available = shopFunds(wallet);
  if (!Number.isSafeInteger(price) || price < 0 || price > available)
    throw Error("Saldo insuficiente para esta compra.");
  const fromVault = Math.min(wallet.vaultBalance || 0, price);
  return { ...wallet, vaultBalance: (wallet.vaultBalance || 0) - fromVault,
    balance: wallet.balance - (price - fromVault) };
}
