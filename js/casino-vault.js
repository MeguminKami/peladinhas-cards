import { esc } from "./ui.js";
import { icon } from "./icons.js";
import { djabucoin } from "./djabucoin.js";

const format = value => new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value / 100);

export function mountCasinoVault(root, localWallet, getWallet) {
  const toolbar = root.querySelector(".casino-toolbar");
  toolbar.insertAdjacentHTML("afterend", `<section id="casino-vault-panel" class="casino-vault" hidden role="dialog" aria-modal="false" aria-labelledby="vault-title"><div class="casino-vault-content"><div class="casino-vault-heading"><h2 id="vault-title">${icon("lock")} Vault</h2><button type="button" class="casino-tool" data-vault-close aria-label="Fechar Vault">${icon("close")}</button></div><div class="casino-vault-totals"><div><span>Na Vault</span><span class="casino-vault-value">${djabucoin()}<strong data-vault-balance>—</strong><small>DJC</small></span></div><div><span>Para a loja<small>Carteira + Vault</small></span><span class="casino-vault-value">${djabucoin()}<strong data-vault-total>—</strong><small>DJC</small></span></div></div><form class="casino-vault-form"><label for="vault-amount">Depositar na Vault <span class="casino-vault-input"><input id="vault-amount" name="amount" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" required aria-describedby="vault-help"><span>DJC</span></span></label><button type="submit" class="casino-button">${icon("lock")} Depositar</button></form><p id="vault-help" class="casino-vault-help">Só para compras na loja. Depósitos definitivos, sem levantamentos nem apostas.</p><p class="casino-vault-feedback" role="status" aria-live="polite"></p></div></section>`);
  const panel = root.querySelector(".casino-vault");
  const form = panel.querySelector("form");
  const input = form.elements.amount;
  const button = form.querySelector("button");
  const feedback = panel.querySelector(".casino-vault-feedback");
  let busy = false;
  const update = () => {
    const wallet = getWallet();
    panel.querySelector("[data-vault-balance]").textContent = wallet ? format(wallet.vaultBalance || 0) : "—";
    panel.querySelector("[data-vault-total]").textContent = wallet ? format(wallet.balance + (wallet.vaultBalance || 0)) : "—";
  };
  const trigger = () => root.querySelector("[data-wallet-vault]");
  const position = () => {
    if (panel.hidden) return;
    const anchor = trigger()?.getBoundingClientRect();
    if (!anchor || root.classList.contains("is-playing")) { close(); return; }
    const margin = 12;
    const width = panel.getBoundingClientRect().width;
    const left = Math.max(margin, Math.min(anchor.right - width, window.innerWidth - width - margin));
    const top = Math.max(margin, anchor.bottom + 10);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.maxHeight = `${Math.max(0, window.innerHeight - top - margin)}px`;
    panel.style.setProperty("--vault-anchor", `${Math.max(20, Math.min(width - 20, anchor.left + anchor.width / 2 - left))}px`);
  };
  const outside = event => {
    if (!panel.contains(event.target) && !trigger()?.contains(event.target)) close();
  };
  const keyboard = event => {
    if (event.key === "Escape") { event.preventDefault(); close(true); }
  };
  const close = (restoreFocus = false) => {
    panel.hidden = true;
    trigger()?.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outside, true);
    document.removeEventListener("focusin", outside);
    document.removeEventListener("keydown", keyboard);
    window.removeEventListener("resize", position);
    window.removeEventListener("scroll", position, true);
    if (restoreFocus) trigger()?.focus({ preventScroll: true });
  };
  const toggle = () => {
    if (!panel.hidden) { close(); return; }
    panel.hidden = false;
    update();
    trigger()?.setAttribute("aria-expanded", "true");
    position();
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", keyboard);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    input.focus({ preventScroll: true });
  };
  panel.querySelector("[data-vault-close]").onclick = () => close(true);
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
  return { update, toggle, destroy: () => close(), expanded: () => !panel.hidden };
}
