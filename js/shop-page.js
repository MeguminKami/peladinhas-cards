import { mountCasinoShop } from "./casino-shop.js";
import { createCasinoLocalWallet } from "./casino-local-wallet.js";
import * as DB from "./db.js";
import { empty, esc, friendlyError } from "./ui.js";
import { djabucoin } from "./djabucoin.js";
import { DJABUCOIN } from "./casino-economy.js";

export async function casinoShopPage(ctx) {
  let active = true,
    unmount;
  const wallet = createCasinoLocalWallet(ctx.user.uid);
  ctx.cleanup(() => {
    active = false;
    document.querySelector(".shop-confirm")?.close("cancel");
    unmount?.();
    return wallet.close().catch(() => {});
  });
  const view = (data) => ({
    ...data,
    balance: data.balance / DJABUCOIN.scale,
    vaultBalance: (data.vaultBalance || 0) / DJABUCOIN.scale,
    ovr: data.player.ovr,
  });
  async function load() {
    ctx.render(
      '<section class="shop-loading" role="status">A preparar a tua loja…</section>',
    );
    try {
      await wallet.start();
      const { data } = await DB.callAdmin("getCasinoShop", {});
      if (!active) return;
      ctx.render('<div class="shop-integrated" id="casino-shop-root"></div>');
      unmount = mountCasinoShop(document.querySelector("#casino-shop-root"), {
        state: view(data),
        async buy(cardId) {
          if (!active) throw Error("Reabre a loja para comprar.");
          if (!(await confirmPurchase(cardId))) return null;
          if (!active) return null;
          const { data: bought } = await DB.callAdmin("buyCasinoCard", {
            cardId,
          });
          // The award is already in the existing collection source. Reload it
          // on the next league destination, without scanning the league here.
          ctx.invalidateLeague();
          // This page never plays: closing adds zero game delta to the latest
          // server wallet. Returning to the casino opens with its new balance.
          return view(bought);
        },
      });
      if (!data.player.hasCard)
        document.querySelector(".shop-purchase-note").textContent =
          "Precisas de uma carta oficial desta semana para comprar. Podes explorar todas as edições.";
    } catch (error) {
      if (!active) return;
      ctx.render(
        empty(
          "Não foi possível abrir a loja",
          error.code === "functions/internal" || /^internal$/i.test(error.message || "")
            ? "A loja está temporariamente indisponível. Tenta novamente dentro de instantes."
            : friendlyError(error),
          '<button class="btn btn-primary" id="shop-retry">Tentar novamente</button>',
          "cards",
        ),
      );
      document.querySelector("#shop-retry").onclick = load;
    }
  }
  await load();
}

// Confirmation uses the static catalogue; prices are revalidated on the server.
import { SHOP_CARDS } from "./casino-shop-catalog.js";
function confirmPurchase(id) {
  const card = SHOP_CARDS.find((c) => c.id === id);
  if (!card) return Promise.resolve(false);
  const dialog = document.createElement("dialog");
  dialog.className = "shop-confirm";
  dialog.setAttribute("aria-labelledby", "shop-confirm-title");
  dialog.innerHTML = `<form method="dialog"><h2 id="shop-confirm-title">Confirmar compra</h2><p>${esc(card.name)}</p><strong>${djabucoin()} ${card.price.toLocaleString("pt-PT")} DJC</strong><p>O acabamento fica na tua coleção. Os atributos mantêm-se.</p><div class="actions"><button class="btn btn-secondary" value="cancel" autofocus>Cancelar</button><button class="btn btn-primary" value="buy">Comprar carta</button></div></form>`;
  document.body.append(dialog);
  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => {
        const bought = dialog.returnValue === "buy";
        dialog.remove();
        resolve(bought);
      },
      { once: true },
    );
    dialog.showModal();
  });
}
