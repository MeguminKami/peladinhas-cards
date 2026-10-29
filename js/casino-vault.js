import { esc } from "./ui.js";
import { icon } from "./icons.js";

const format = value => new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value / 100);

export function mountCasinoVault(root, localWallet, getWallet) {
  const toolbar = root.querySelector(".casino-toolbar");
  toolbar.insertAdjacentHTML("afterend", `<section class="casino-vault" hidden aria-labelledby="vault-title"><div class="casino-vault-art" aria-hidden="true">${icon("lock")}<span>VAULT</span></div><div class="casino-vault-content"><div class="casino-vault-heading"><div><p class="casino-kicker">FORA DA MESA. DENTRO DOS TEUS PLANOS.</p><h2 id="vault-title">A tua Vault</h2></div><button type="button" class="casino-tool" data-vault-close aria-label="Fechar Vault">${icon("close")}</button></div><p>Guarda para a próxima conquista. O que entra aqui não volta às apostas.</p><div class="casino-vault-totals"><span>Na Vault<strong data-vault-balance>—</strong></span><span>Carteira + Vault<small>Disponível para a loja</small><strong data-vault-total>—</strong></span></div><form class="casino-vault-form"><label for="vault-amount">Depositar Djabucoins<input id="vault-amount" name="amount" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" required aria-describedby="vault-help"></label><button type="submit" class="casino-button">${icon("lock")} Guardar na Vault</button></form><p id="vault-help" class="casino-vault-help">Depósito definitivo. Sem levantamentos. As moedas da Vault só servem para compras na loja.</p><p class="casino-vault-feedback" role="status" aria-live="polite"></p></div></section>`);
  const panel = root.querySelector(".casino-vault");
  const form = panel.querySelector("form");
  const input = form.elements.amount;
  const button = form.querySelector("button");
  const feedback = panel.querySelector(".casino-vault-feedback");
  let busy = false;
  const update = () => {
    const wallet = getWallet();
    panel.querySelector("[data-vault-balance]").textContent = wallet ? `${format(wallet.vaultBalance || 0)} DJC` : "—";
    panel.querySelector("[data-vault-total]").textContent = wallet ? `${format(wallet.balance + (wallet.vaultBalance || 0))} DJC` : "—";
  };
  const toggle = () => {
    panel.hidden = !panel.hidden;
    update();
    root.querySelector("[data-wallet-vault]")?.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) input.focus({ preventScroll: true });
  };
  panel.querySelector("[data-vault-close]").onclick = () => {
    panel.hidden = true;
    const trigger = root.querySelector("[data-wallet-vault]");
    trigger?.setAttribute("aria-expanded", "false");
    trigger?.focus();
  };
  form.onsubmit = async event => {
    event.preventDefault();
    if (busy) return;
    const value = input.value.trim();
    const amount = /^\d+(?:[,.]\d{1,2})?$/.test(value) ? Math.round(Number(value.replace(",", ".")) * 100) : NaN;
    const wallet = getWallet();
    feedback.dataset.state = "error";
    if (!wallet || !Number.isSafeInteger(amount) || amount <= 0 || amount > wallet.balance) {
      feedback.textContent = "Indica um valor válido, até ao saldo da carteira, com no máximo duas casas decimais.";
      return;
    }
    busy = true;
    button.disabled = true;
    input.disabled = true;
    button.setAttribute("aria-busy", "true");
    feedback.textContent = "A fechar o cofre…";
    try {
      const deposited = await localWallet.depositVault(amount);
      feedback.dataset.state = deposited ? "success" : "error";
      feedback.innerHTML = deposited ? `${icon("check")}<span><strong>${esc(format(deposited))} DJC a salvo.</strong> A próxima compra ficou mais perto.</span>` : "O saldo mudou. O depósito não foi efetuado; confirma a carteira e tenta novamente.";
      if (deposited) input.value = "";
      update();
    } catch (error) {
      feedback.textContent = error.message || "Não foi possível confirmar. Repete para recuperar o depósito sem o duplicar.";
    } finally {
      busy = false;
      button.disabled = false;
      input.disabled = false;
      button.removeAttribute("aria-busy");
    }
  };
  return { update, toggle, expanded: () => !panel.hidden };
}
