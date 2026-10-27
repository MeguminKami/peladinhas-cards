import {
  SHOP_CARDS,
  SHOP_ARCHIVED_CARDS,
  buyShopCard,
} from "./casino-shop-catalog.js";
import { renderCasinoShopCard } from "./casino-shop-art.js";
import { icon } from "./icons.js";
import { esc } from "./ui.js";
import * as shopRuntime from "./config.js";
import { djabucoin } from "./djabucoin.js";

export function mountCasinoShop(root, options = {}) {
  let active = true;
  const key = "peladinhas:casino:shop-demo:v1";
  const initial = () => ({ balance: 30000, ovr: 80, owned: [] });
  const read = () =>
    options.state ||
    JSON.parse(localStorage.getItem(key) || "null") ||
    initial();
  const number = (value) => new Intl.NumberFormat("pt-PT").format(value);
  let filter = "all",
    timer,
    busy = false,
    state;
  try {
    state = read();
  } catch {
    state = initial();
  }
  const catalogue = [...SHOP_CARDS, ...SHOP_ARCHIVED_CARDS];
  const category = (card) =>
    card.id.startsWith("football-p") ? "premium" : card.group;
  const groupName = (card) =>
    card.group === "games"
      ? "Jogos do casino"
      : card.group === "club"
        ? "Arquivo · primeira coleção"
        : card.minOvr >= 85
          ? "Metais de prestígio"
          : "Edições metálicas";
  const preview = (card) =>
    renderCasinoShopCard(card, {
      ...state.player,
      name: state.player?.displayName || "O TEU JOGADOR",
      ovr: state.player?.ovr ?? card.minOvr,
      position: state.player?.primaryPosition || "MC",
      stats: state.player?.stats,
      photoURL: state.player?.photoURL,
      photoDesign: state.player?.photoDesign,
    });

  function toast(message, success = false) {
    if (!active) return;
    const region = root.querySelector("#shop-feedback");
    clearTimeout(timer);
    region.className = `shop-toast ${success ? "is-success" : "is-error"}`;
    region.innerHTML = `${icon(success ? "check" : "info")}<span><strong>${success ? "Carta conquistada" : "Compra não concluída"}</strong>${esc(message)}</span><button type="button" aria-label="Fechar aviso">${icon("close")}</button>`;
    region.querySelector("button").onclick = () =>
      region.classList.add("is-hidden");
    timer = setTimeout(() => region.classList.add("is-hidden"), 6500);
  }
  function cards() {
    const visible =
      filter === "owned"
        ? catalogue.filter((card) => state.owned.includes(card.id))
        : SHOP_CARDS.filter(
            (card) => filter === "all" || category(card) === filter,
          );
    root.querySelector("#shop-results").textContent =
      `${visible.length} ${visible.length === 1 ? "carta" : "cartas"}`;
    root.querySelector("#shop-grid").innerHTML = visible.length
      ? visible
          .map((card) => {
            const owned = state.owned.includes(card.id);
            return `<article class="shop-item ${owned ? "is-owned" : ""}" aria-labelledby="title-${card.id}"><div class="shop-art-stage">${preview(card)}<button type="button" class="shop-preview-trigger" data-preview="${card.id}" aria-label="Ver acabamento de ${esc(card.name)}">${icon("search")}</button>${owned ? `<span class="shop-owned">${icon("check")} Comprada</span>` : ""}</div><div class="shop-item-copy"><p class="shop-rarity">${esc(card.rarity)} <span>· ${esc(category(card) === "premium" ? "Futebol de Bairro" : groupName(card))}</span></p><h3 id="title-${card.id}">${esc(card.name)}</h3><div class="shop-requirements ${state.ovr < card.minOvr ? "is-locked" : "is-eligible"}"><span>${icon(state.ovr < card.minOvr ? "lock" : "check")}<b>${card.minOvr}</b> OVR mínimo</span></div><button class="shop-buy" type="button" data-buy="${card.id}" ${owned ? "disabled" : ""}>${icon(owned ? "check" : "cards")}<span>${owned ? "Na coleção" : "Comprar"}</span>${!owned ? `<strong>${number(card.price)} <small>${djabucoin()} DJC</small></strong>` : ""}</button></div></article>`;
          })
          .join("")
      : `<div class="shop-empty">${icon("cards")}<h3>A tua coleção começa aqui.</h3><p>Escolhe uma carta no catálogo e torna-a tua para sempre.</p><button class="shop-buy" data-show-all>Explorar cartas</button></div>`;
    root
      .querySelector("[data-show-all]")
      ?.addEventListener("click", () => setFilter("all"));
    root.querySelectorAll("img[data-fallback]").forEach(img => { img.onerror = () => { img.onerror = null; img.src = img.dataset.fallback; }; });
  }
  function setFilter(value) {
    filter = value;
    root
      .querySelectorAll("[data-filter]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.filter === filter),
        ),
      );
    cards();
  }
  function totals() {
    root.querySelector("#shop-balance").textContent = number(state.balance);
    root.querySelector(".shop-wallet").classList.toggle("is-large", number(state.balance).length > 10);
    root.querySelector("#shop-player-ovr").textContent = `${state.ovr} OVR`;
    const archived = SHOP_ARCHIVED_CARDS.filter((card) =>
      state.owned.includes(card.id),
    ).length;
    root.querySelector("#shop-collection-count").textContent =
      `${catalogue.filter((card) => state.owned.includes(card.id)).length} / ${SHOP_CARDS.length + archived}`;
  }
  root.innerHTML = `<div class="shop-shell">
<header class="shop-toolbar"><a class="shop-back" href="#/casino">${icon("arrow")}<span>Casino</span></a><a class="shop-brand" href="#/casino"><img src="${new URL("../assets/logo.svg", import.meta.url).href}" alt="">PELADINHAS <b>CASINO</b></a><button class="shop-collection-link" data-open-collection>${icon("cards")}<span>A minha coleção</span><b id="shop-collection-count"></b></button></header>
<div id="shop"><section class="shop-intro" aria-labelledby="shop-title"><div><p class="shop-eyebrow">LOJA DE CARTAS</p><h1 id="shop-title">O teu jogo.<br><em>A tua assinatura.</em></h1><p>Desbloqueia acabamentos exclusivos com os teus DJC.</p></div><aside class="shop-wallet" aria-label="Carteira e jogador"><div class="shop-wallet-label">${djabucoin()}<span>Saldo disponível</span></div><strong><span id="shop-balance"></span> <small>${djabucoin()} DJC</small></strong><div class="shop-player">${icon("ratingGames")}<span>O teu overall</span><b id="shop-player-ovr"></b></div></aside></section>
<section aria-label="Catálogo de cartas"><div class="shop-catalog-heading"><h2>Escolhe a tua próxima carta</h2><span id="shop-results" role="status" aria-live="polite"></span></div><nav class="shop-filters" aria-label="Filtrar cartas">${[
    ["all", "Todas", "cards"],
    ["metals", "Metais", "studioMaterials"],
    ["games", "Jogos", "casinoGames"],
    ["premium", "Premium do Bairro", "trophy"],
    ["owned", "Coleção", "check"],
  ]
    .map(
      ([id, label, symbol]) =>
        `<button type="button" data-filter="${id}" aria-pressed="${id === "all"}">${icon(symbol)}<span>${label}</span></button>`,
    )
    .join(
      "",
    )}</nav><p class="shop-purchase-note">${icon("info")} O acabamento fica na tua coleção. Os atributos do jogador mantêm-se.</p><div id="shop-grid" class="shop-grid"></div></section></div><footer class="shop-footer">PELADINHAS CARDS <span>Do campo para a tua coleção.</span></footer></div><div id="shop-feedback" class="shop-toast is-hidden" role="status" aria-live="polite" aria-atomic="true"></div>`;

  totals();
  cards();
  const dialog = document.createElement("dialog");
  dialog.className = "shop-preview-dialog";
  dialog.setAttribute("aria-labelledby", "shop-preview-title");
  document.body.append(dialog);
  function showPreview(id) {
    const card = catalogue.find((card) => card.id === id);
    if (!card) return;
    dialog.innerHTML = `<button type="button" class="shop-preview-close" aria-label="Fechar pré-visualização">${icon("close")}</button><p class="shop-eyebrow">${esc(groupName(card))}</p><h2 id="shop-preview-title">${esc(card.name)}</h2><div class="shop-preview-art">${preview(card)}</div><p>${esc(card.description)}</p><div class="shop-requirements"><span>${icon("ratingGames")} ${card.minOvr} OVR mínimo</span><span>${djabucoin()} ${number(card.price)} DJC</span></div><small>O acabamento adapta-se ao teu jogador. Comprar não altera os atributos.</small>`;
    dialog.querySelector(".shop-preview-close").onclick = () => dialog.close();
    dialog.showModal();
  }
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  });
  root
    .querySelectorAll("[data-filter]")
    .forEach(
      (button) => (button.onclick = () => setFilter(button.dataset.filter)),
    );
  root.querySelector("[data-open-collection]").onclick = () => {
    setFilter("owned");
    root.querySelector('[data-filter="owned"]').focus();
    root
      .querySelector(".shop-catalog-heading")
      .scrollIntoView({ block: "start" });
  };
  root.addEventListener("click", async (event) => {
    const previewButton = event.target.closest("[data-preview]");
    if (previewButton) {
      showPreview(previewButton.dataset.preview);
      return;
    }
    const button = event.target.closest("[data-buy]");
    if (!button || busy || button.disabled) return;
    busy = true;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      if (options.buy) {
        const next = await options.buy(button.dataset.buy);
        if (!next) {
          button.disabled = false;
          return;
        }
        state = next;
        if (!active) return;
      } else {
        if (!navigator.locks)
          throw Error("Este navegador não suporta compras protegidas.");
        await navigator.locks.request(key, () => {
          const next = buyShopCard(read(), button.dataset.buy);
          localStorage.setItem(key, JSON.stringify(next));
          state = next;
        });
      }
      totals();
      cards();
      const card = SHOP_CARDS.find((card) => card.id === button.dataset.buy);
      toast(`${card.name} já está na tua coleção.`, true);
      root
        .querySelector(`[data-buy="${card.id}"]`)
        ?.closest("article")
        ?.setAttribute("tabindex", "-1");
      root
        .querySelector(`[data-buy="${card.id}"]`)
        ?.closest("article")
        ?.focus({ preventScroll: true });
    } catch (error) {
      toast(error.message);
      button.disabled = false;
    } finally {
      busy = false;
      button.removeAttribute("aria-busy");
    }
  });
  const storageChanged = (event) => {
    if (options.buy) return;
    if (event.key === key) {
      try {
        state = read();
        totals();
        cards();
      } catch {
        toast("Não foi possível atualizar a coleção. Recarrega a página.");
      }
    }
  };
  window.addEventListener("storage", storageChanged);
  return () => {
    active = false;
    clearTimeout(timer);
    dialog.remove();
    window.removeEventListener("storage", storageChanged);
  };
}
const standalone = document.querySelector("#casino-shop");
if (standalone) {
  if (shopRuntime.runtimeMode === "fixtures") mountCasinoShop(standalone);
  else location.replace(new URL("../../../index.html#/shop", location.href));
}
