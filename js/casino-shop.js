import {
  SHOP_CARDS,
  SHOP_ARCHIVED_CARDS,
  buyShopCard,
} from "./casino-shop-catalog.js";
import { renderCasinoShopCard } from "./casino-shop-art.js";
import { icon } from "./icons.js";
import { esc } from "./ui.js";

const root = document.querySelector("#casino-shop");
const key = "peladinhas:casino:shop-demo:v1";
const initial = () => ({ balance: 30000, ovr: 80, owned: [] });
const read = () => JSON.parse(localStorage.getItem(key) || "null") || initial();
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
    name: "O TEU JOGADOR",
    ovr: card.minOvr,
    position: "MC",
  });

function toast(message, success = false) {
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
      : SHOP_CARDS.filter((card) => filter === "all" || card.group === filter);
  root.querySelector("#shop-results").textContent =
    `${visible.length} ${visible.length === 1 ? "carta" : "cartas"}`;
  root.querySelector("#shop-grid").innerHTML = visible.length
    ? visible
        .map((card) => {
          const owned = state.owned.includes(card.id);
          return `<article class="shop-item ${owned ? "is-owned" : ""}" aria-labelledby="title-${card.id}"><div class="shop-art-stage">${preview(card)}<button type="button" class="shop-preview-trigger" data-preview="${card.id}" aria-label="Ver acabamento de ${esc(card.name)}">${icon("search")}</button>${owned ? `<span class="shop-owned">${icon("check")} Comprada</span>` : ""}</div><div class="shop-item-copy"><p class="shop-rarity">${esc(card.rarity)} <span>· ${esc(groupName(card))}</span></p><h3 id="title-${card.id}">${esc(card.name)}</h3><p class="shop-description">${esc(card.description)}</p><div class="shop-requirements"><span>${icon("ratingGames")}<b>${card.minOvr}</b> OVR mínimo</span><span>${icon("lock")} Permanente</span></div><button class="shop-buy" type="button" data-buy="${card.id}" ${owned ? "disabled" : ""}>${icon(owned ? "check" : "cards")}<span>${owned ? "Na tua coleção" : "Comprar carta"}</span>${!owned ? `<strong>${number(card.price)} <small>DJC</small></strong>` : ""}</button></div></article>`;
        })
        .join("")
    : `<div class="shop-empty">${icon("cards")}<h3>A tua coleção começa aqui.</h3><p>Escolhe uma carta no catálogo e torna-a tua para sempre.</p><button class="shop-buy" data-show-all>Explorar cartas</button></div>`;
  root
    .querySelector("[data-show-all]")
    ?.addEventListener("click", () => setFilter("all"));
}
function setFilter(value) {
  filter = value;
  root.querySelector(".shop-ranks").hidden = !["all", "metals"].includes(
    filter,
  );
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
  const archived = SHOP_ARCHIVED_CARDS.filter((card) =>
    state.owned.includes(card.id),
  ).length;
  root.querySelector("#shop-collection-count").textContent =
    `${catalogue.filter((card) => state.owned.includes(card.id)).length} / ${SHOP_CARDS.length + archived}`;
}
root.innerHTML = `<div class="shop-shell"><header class="shop-toolbar"><a href="../../../#/casino">${icon("arrow")} Voltar ao casino</a><a class="shop-brand" href="../../../#/casino">PELADINHAS <b>CASINO</b></a><span class="shop-local">Pré-visualização local</span></header><main id="shop"><section class="shop-intro"><div><p class="shop-eyebrow">A SORTE PASSA. A TUA CARTA FICA.</p><h1>Joga com estilo.<br><em>Coleciona para sempre.</em></h1><p>Edições exclusivas do teu bairro. Escolhe o acabamento, conquista o overall e troca os teus DJC por uma carta que fica contigo.</p><div class="shop-promises"><span>${icon("cards")} ${SHOP_CARDS.length} edições exclusivas</span><span>${icon("lock")} Uma compra, para sempre</span></div></div><aside class="shop-wallet"><span class="shop-coin" aria-hidden="true">D</span><p>Carteira de demonstração</p><strong><span id="shop-balance"></span> <small>DJC</small></strong><div><span>A tua coleção</span><b id="shop-collection-count"></b></div></aside></section><details class="shop-test"><summary>${icon("settings")} Laboratório local <span>Testar saldo e OVR</span></summary><form id="shop-fixtures"><label>Saldo de teste · DJC<input name="balance" type="number" min="0" max="1000000" step="1" value="${state.balance}" required></label><label>Overall do jogador<input name="ovr" type="number" min="1" max="99" step="1" value="${state.ovr}" required></label><button type="submit">Aplicar dados de teste</button></form><p>Dados guardados apenas neste navegador. Não utiliza a carteira real nem atribui cartas à conta. O saldo e o OVR só são validados na compra.</p></details><section aria-labelledby="shop-title"><div class="shop-catalog-heading"><div><p class="shop-eyebrow">O TEU PRÓXIMO DESBLOQUEIO</p><h2 id="shop-title">A montra do bairro</h2></div><span id="shop-results"></span></div><nav class="shop-filters" aria-label="Filtrar cartas">${[
  ["all", "Todas as cartas"],
  ["metals", "Metais especiais"],
  ["games", "Jogos do casino"],
  ["owned", "A minha coleção"],
]
  .map(
    ([id, label]) =>
      `<button type="button" data-filter="${id}" aria-pressed="${id === "all"}">${label}</button>`,
  )
  .join(
    "",
  )}</nav><p class="shop-catalog-note">${icon("info")} Preço e OVR mínimo sempre visíveis. A compra confirma os requisitos e guarda a carta.</p><div class="shop-ranks" aria-label="Progressão das edições metálicas">${SHOP_CARDS.filter(
  (card) => card.group === "metals",
)
  .map(
    (card) =>
      `<div class="shop-rank rank-${card.id}"><span class="shop-rank-gem" aria-hidden="true">◆</span><strong>${card.name.split(" · ")[0].split(" ")[0]}</strong><span>${card.minOvr} <small>OVR</small></span></div>`,
  )
  .join(
    "",
  )}</div><p class="shop-preview-note">Retrato ilustrativo · OVR de referência de cada edição. A compra desbloqueia o acabamento.</p><div id="shop-grid" class="shop-grid"></div></section></main><footer class="shop-footer">PELADINHAS CARDS <span>Do campo para a tua coleção.</span></footer></div><div id="shop-feedback" class="shop-toast is-hidden" role="status" aria-live="polite" aria-atomic="true"></div>`;
totals();
cards();
const dialog = document.createElement("dialog");
dialog.className = "shop-preview-dialog";
dialog.setAttribute("aria-labelledby", "shop-preview-title");
document.body.append(dialog);
function showPreview(id) {
  const card = catalogue.find((card) => card.id === id);
  if (!card) return;
  dialog.innerHTML = `<button type="button" class="shop-preview-close" aria-label="Fechar pré-visualização">${icon("close")}</button><p class="shop-eyebrow">${esc(groupName(card))}</p><h2 id="shop-preview-title">${esc(card.name)}</h2><div class="shop-preview-art">${preview(card)}</div><p>${esc(card.description)}</p><div class="shop-requirements"><span>${icon("ratingGames")} ${card.minOvr} OVR mínimo</span><span>${number(card.price)} DJC</span></div><small>Retrato ilustrativo. Nome, OVR e atributos apresentados como referência.</small>`;
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
root.querySelector("#shop-fixtures").onsubmit = (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  try {
    const next = {
      ...read(),
      balance: Number(data.get("balance")),
      ovr: Number(data.get("ovr")),
    };
    localStorage.setItem(key, JSON.stringify(next));
    state = next;
    totals();
  } catch {
    toast(
      "Não foi possível guardar os dados de teste. Verifica o armazenamento do navegador.",
    );
  }
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
    if (!navigator.locks)
      throw Error("Este navegador não suporta compras locais protegidas.");
    await navigator.locks.request(key, () => {
      const next = buyShopCard(read(), button.dataset.buy);
      localStorage.setItem(key, JSON.stringify(next));
      state = next;
    });
    totals();
    cards();
    const card = SHOP_CARDS.find((card) => card.id === button.dataset.buy);
    toast(
      `${card.name} já está na tua coleção local. Compra permanente confirmada.`,
      true,
    );
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
window.addEventListener("storage", (event) => {
  if (event.key === key) {
    try {
      state = read();
      totals();
      cards();
    } catch {
      toast("Não foi possível recuperar a coleção local.");
    }
  }
});
