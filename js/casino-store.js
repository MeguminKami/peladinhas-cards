import { SHOP_CARDS } from "./casino-shop-catalog.js";
import { renderCasinoShopCard } from "./casino-shop-art.js";
import { esc } from "./ui.js";
import { icon } from "./icons.js";

const number = value => new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value / 100);

export function mountCasinoStore(root, localWallet, getWallet, onPurchase = () => {}) {
  const salon = root.querySelector(".casino-salon");
  salon.insertAdjacentHTML("afterend", '<section class="casino-store" hidden aria-labelledby="casino-store-title"></section>');
  const store = root.querySelector(".casino-store");
  let profile, busy = false, category = "all", pendingCard;
  function totals() {
    const wallet = getWallet();
    const total = store.querySelector("[data-store-total]");
    if (total && wallet) total.textContent = `${number(wallet.balance + (wallet.vaultBalance || 0))} DJC`;
    const detail = store.querySelector("[data-store-funds]");
    if (detail && wallet) detail.textContent = `${number(wallet.balance)} na carteira + ${number(wallet.vaultBalance || 0)} na Vault`;
  }
  function cards() {
    const owned = new Set([...(profile?.owned || []), ...(getWallet()?.shopOwned || [])]);
    const visible = SHOP_CARDS.filter(card => category === "owned" ? owned.has(card.id) : category === "all" || category === card.group);
    store.querySelector(".casino-store-grid").innerHTML = visible.length ? visible.map(card => `<article class="casino-store-item"><div class="casino-store-art">${renderCasinoShopCard(card, { name: profile.name, ovr: profile.ovr, position: profile.position })}</div><div class="casino-store-item-copy"><span class="casino-kicker">${esc(card.rarity)} · ${card.minOvr} OVR mínimo</span><h3>${esc(card.name)}</h3><p>${esc(card.description)}</p><button class="casino-button" type="button" data-store-buy="${card.id}" ${owned.has(card.id) || busy ? "disabled" : ""}>${icon(owned.has(card.id) ? "check" : "cards")} ${owned.has(card.id) ? "Na tua coleção" : `${number(card.price * 100)} DJC · Comprar`}</button></div></article>`).join("") : '<p class="casino-store-empty">Ainda sem compras. Escolhe uma edição e guarda-a na tua coleção.</p>';
  }
  function feedback(title, message, state = "error") {
    const region = store.querySelector(".casino-store-feedback");
    region.dataset.state = state;
    region.innerHTML = `${icon(state === "success" ? "check" : "info")}<span><strong>${esc(title)}</strong><span>${esc(message)}</span></span>`;
    region.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  function draw() {
    store.innerHTML = `<div class="casino-store-heading"><div><p class="casino-kicker">A SORTE PASSA. A TUA CARTA FICA.</p><h1 id="casino-store-title" tabindex="-1">A loja do casino.</h1><p>Compra o acabamento. Mantém o teu jogador.</p></div><button class="casino-text-button" type="button" data-store-back>${icon("arrow")} Voltar ao salão</button></div><div class="casino-store-summary"><div><small>Disponível para comprar</small><strong data-store-total></strong><span data-store-funds></span></div><p>${icon("lock")} Uma compra, para sempre. Usamos primeiro a Vault e depois a carteira. O teu OVR: <b>${profile.ovr}</b>.</p></div><div class="casino-store-feedback" role="status" aria-live="polite"></div><div class="casino-filters" role="group" aria-label="Filtrar edições da loja">${[["all", "Todas"], ["metals", "Metais"], ["games", "Jogos"], ["owned", "A minha coleção"]].map(([id, label]) => `<button type="button" data-store-filter="${id}" aria-pressed="${category === id}">${label}</button>`).join("")}</div><div class="casino-store-grid"></div>`;
    store.querySelector("[data-store-back]").onclick = close;
    totals();
    cards();
  }
  function close() {
    if (busy) return;
    store.hidden = true;
    salon.hidden = false;
    root.querySelector("[data-casino-store]").focus();
  }
  async function open() {
    if (busy) return;
    busy = true;
    salon.hidden = true;
    store.hidden = false;
    store.innerHTML = '<p role="status">A abrir a montra e a confirmar a tua carteira…</p>';
    try {
      profile = await localWallet.loadShop();
      if (!profile) throw Error("Atualiza o casino para abrir a loja.");
      busy = false;
      draw();
      store.querySelector("h1").focus({ preventScroll: true });
    } catch {
      store.innerHTML = '<p role="status">Não foi possível abrir a loja. Tenta novamente dentro de momentos.</p><button class="casino-text-button" type="button" data-store-back>Voltar ao salão</button>';
      store.querySelector("button").onclick = close;
    } finally { busy = false; }
  }
  store.addEventListener("click", async event => {
    const filter = event.target.closest("[data-store-filter]");
    if (filter && !busy) {
      category = filter.dataset.storeFilter;
      store.querySelectorAll("[data-store-filter]").forEach(button => button.setAttribute("aria-pressed", String(button === filter)));
      cards();
    }
    const button = event.target.closest("[data-store-buy]");
    if (!button || busy || button.disabled) return;
    const cardId = pendingCard || button.dataset.storeBuy;
    busy = true;
    pendingCard = cardId;
    store.querySelectorAll("[data-store-buy]").forEach(item => item.disabled = true);
    button.setAttribute("aria-busy", "true");
    try {
      const result = await localWallet.buyShopCard(cardId);
      pendingCard = undefined;
      if (result?.ok) {
        onPurchase();
        profile.owned = [...new Set([...(profile.owned || []), result.cardId])];
        feedback("Carta conquistada!", "O acabamento já está na tua conta. Escolhe-o na coleção do teu perfil.", "success");
      } else {
        const messages = { owned: "Esta carta já pertence à tua conta.", ovr: "O teu OVR ainda não atinge o requisito desta edição.", funds: "A carteira e a Vault ainda não chegam para esta compra." };
        feedback("Compra não concluída", messages[result?.reason] || "Atualiza a loja e tenta novamente.");
      }
    } catch {
      feedback("A confirmação ficou pendente", "Tenta novamente para recuperar esta compra. Não voltaremos a cobrar a mesma operação.");
    } finally {
      busy = false;
      totals();
      cards();
      store.querySelector(`[data-store-buy="${cardId}"]`)?.closest("article")?.setAttribute("tabindex", "-1");
    }
  });
  return { open, update: totals };
}
