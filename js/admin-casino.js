import { callAdmin } from "./db.js";
import { esc, modal, busy, toast, friendlyError } from "./ui.js";

export function openCasinoGrant(player, adminUid) {
  const key = `casino-grant:${adminUid}:${player.uid}`;
  let pending = JSON.parse(sessionStorage.getItem(key) || "null");
  const close = modal("Enviar moedas", `<form class="casino-grant"><p>Para <strong>${esc(player.displayName || player.username)}</strong></p><label for="casino-grant-amount">Quantidade de moedas</label><input id="casino-grant-amount" name="amount" type="number" min="0" max="10000" step="0.01" required value="${pending ? pending.amount / 100 : 100}" ${pending ? "disabled" : ""} aria-describedby="casino-grant-help"><p id="casino-grant-help" class="subtitle">Entre 0 e 10 000 DJC. As moedas são adicionadas ao saldo do jogador.</p><p role="status" class="casino-grant-status">${pending ? "Existe um envio por confirmar. Repete para recuperar sem duplicar moedas." : ""}</p><div class="actions"><button class="btn btn-primary" type="submit">${pending ? "Confirmar envio pendente" : "Enviar moedas"}</button></div></form>`);
  const form = document.querySelector(".casino-grant");
  form.onsubmit = async event => {
    event.preventDefault();
    if (!pending) {
      const amount = Math.round(Number(form.elements.amount.value) * 100);
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000) return;
      pending = { uid: player.uid, id: crypto.randomUUID(), amount };
      sessionStorage.setItem(key, JSON.stringify(pending));
    }
    form.elements.amount.disabled = true;
    try {
      await busy(event.submitter, () => callAdmin("grantCasinoCoins", pending));
      sessionStorage.removeItem(key);
      close();
      toast(`${new Intl.NumberFormat("pt-PT").format(pending.amount / 100)} moedas enviadas.`);
    } catch (error) {
      form.querySelector('[role="status"]').textContent = `${friendlyError(error)} Repete para confirmar o mesmo envio.`;
    }
  };
}
