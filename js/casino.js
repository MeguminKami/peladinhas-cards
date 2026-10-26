import { esc, modal, friendlyError } from "./ui.js";
import { icon } from "./icons.js";
import { createCasinoLocalWallet } from "./casino-local-wallet.js";
import { CASINO_CATALOG } from "./casino-catalog.js";
import { DJABUCOIN } from "./casino-economy.js";

const number = (value) =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(
    value / DJABUCOIN.scale,
  );
const coin =
  '<span class="djabucoin" aria-hidden="true">D<span>₫</span></span>';
export function casinoArt(kind) {
  if (kind === "reels")
    return `<div class="casino-reels" aria-hidden="true"><div>7</div><div>7</div><div>7</div></div><span class="casino-art-caption" aria-hidden="true">PELADINHAS ORIGINALS</span>`;
  if (kind === "cards")
    return '<div class="casino-playing-cards" aria-hidden="true"><span><b>A</b><i>♠</i></span><span><b>K</b><i>♥</i></span></div>';
  return '<div class="casino-wheel" aria-hidden="true"><span>♦</span></div><span class="casino-ball" aria-hidden="true"></span>';
}
function gameCard(game) {
  const artwork = game.thumbnail
    ? `<img class="casino-game-thumbnail" src="${esc(game.thumbnail)}" alt="" width="1200" height="675" loading="lazy" decoding="async">`
    : casinoArt(game.art);
  return `<article class="casino-game${game.thumbnail ? " casino-game-has-thumbnail" : ""}"><div class="casino-game-art casino-art-${game.art}">${artwork}<span class="casino-coming ${game.available ? "is-available" : ""}">${game.available ? "Disponível" : "Em breve"}</span></div><div class="casino-game-copy"><span class="casino-kicker">${game.category === "slots" ? "ROLOS & COMBINAÇÕES" : "JOGOS DE MESA"}</span><h3>${esc(game.title)}</h3><p>${esc(game.label)}</p><button class="casino-text-button" type="button" data-casino-game="${game.id}" ${game.available ? 'aria-controls="casino-play-area"' : 'aria-haspopup="dialog"'}>${game.available ? "Jogar agora" : `Conhecer ${esc(game.title)}`} ${icon("arrow")}</button></div></article>`;
}
function walletContent(wallet, loading = false, error = "") {
  return `<div class="casino-wallet-total">${coin}<span><small>O teu saldo</small><span class="casino-balance" aria-live="polite" aria-atomic="true"><strong>${wallet ? number(wallet.balance) : "—"}</strong> <small>DJC</small></span></span></div><div class="casino-wallet-actions"><button type="button" class="casino-text-button" data-wallet-history ${!wallet ? "disabled" : ""}>Movimentos</button><button type="button" class="casino-button casino-button-outline" data-wallet-refresh aria-label="Atualizar saldo" ${loading ? 'disabled aria-busy="true"' : ""}>${icon("refresh")}</button></div><p class="casino-wallet-status${error || wallet?.syncError ? " is-error" : ""}" role="status">${loading ? "A confirmar…" : error ? esc(error) : wallet?.syncError ? esc(wallet.syncError) : wallet?.local ? "Guardado no dispositivo" : "Saldo atualizado"}</p>`;
}

export async function casinoPage(ctx) {
  let active = true,
    wallet,
    loading = false,
    category = "all",
    slot,
    mounting = false;
  const uid = ctx.realUser?.uid || ctx.user.uid;
  const localWallet = createCasinoLocalWallet(uid, (value) => {
    if (active && value) {
      wallet = value;
      if (!loading) drawWallet();
    }
  });
  ctx.cleanup(() => {
    active = false;
    slot?.destroy();
    window.removeEventListener("pagehide", leaving);
    window.removeEventListener("pageshow", returning);
    window.removeEventListener("peladinhas-before-logout", beforeLogout);
    document.removeEventListener("visibilitychange", visibility);
    void localWallet.close().catch(() => {});
  });
  const leaving = () => {
    void localWallet.close().catch(() => {});
  };
  const returning = (event) => {
    if (event.persisted) ctx.go("#/casino");
  };
  const beforeLogout = (event) => {
    slot?.destroy();
    slot = undefined;
    event.detail.waitUntil(localWallet.close());
  };
  const visibility = () => {
    if (active)
      void localWallet
        .checkpoint(document.hidden ? "exit" : "entry")
        .catch(() => {});
  };
  window.addEventListener("pagehide", leaving);
  window.addEventListener("pageshow", returning);
  window.addEventListener("peladinhas-before-logout", beforeLogout);
  document.addEventListener("visibilitychange", visibility);
  ctx.render(
    `<div class="casino-page"><header class="casino-toolbar"><a href="#/" class="casino-back">${icon("arrow")}<span>Voltar à liga</span></a><span class="casino-brand">PELADINHAS <b>CASINO</b></span><div class="casino-game-nav" hidden><button type="button" class="casino-tool casino-back" data-close-slot aria-label="Voltar ao casino">${icon("arrow")}</button><h2 tabindex="-1">Noite de Glória</h2></div><aside class="casino-wallet" aria-label="Carteira Djabucoin">${walletContent(null, true)}</aside><div class="casino-game-tools" hidden><button type="button" class="casino-tool" data-center-game aria-label="Centrar jogo" aria-pressed="false" title="Centrar jogo"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8m-4-4v8"/></svg><span>Centrar jogo</span></button><button type="button" class="casino-tool" data-close-slot aria-label="Fechar jogo" title="Fechar jogo">${icon("close")}</button></div></header><section class="casino-salon" id="casino-games" aria-labelledby="casino-title"><div class="casino-section-heading"><div><p class="casino-kicker">O TEU CLUBE. OS TEUS JOGOS.</p><h1 id="casino-title">Escolhe a próxima jogada.</h1></div><span class="casino-count">4 jogos · 1 disponível</span></div><div class="casino-filters" role="group" aria-label="Filtrar jogos"><button type="button" data-casino-filter="all" aria-pressed="true">Para ti</button><button type="button" data-casino-filter="slots" aria-pressed="false">Slots</button><button type="button" data-casino-filter="tables" aria-pressed="false">Jogos de mesa</button></div><div class="casino-game-grid">${CASINO_CATALOG.map(gameCard).join("")}</div></section><section id="casino-play-area" class="casino-session" hidden aria-label="Jogo em curso"></section><footer class="casino-footer"><span>PELADINHAS <b>CASINO</b></span><span>A tua liga. Outro jogo.</span></footer></div>`,
  );
  const root = document.querySelector(".casino-page");
  const appHeader = document.querySelector("#header");
  const headerSize = new ResizeObserver(() => {
    root.style.setProperty("--casino-header-height", `${appHeader.getBoundingClientRect().height}px`);
  });
  if (appHeader) headerSize.observe(appHeader);
  ctx.cleanup(() => headerSize.disconnect());
  const walletRoot = root.querySelector(".casino-wallet");
  const toolbar = root.querySelector(".casino-toolbar");
  const toolbarSize = new ResizeObserver(() => {
    root.style.setProperty("--casino-toolbar-height", `${toolbar.getBoundingClientRect().height}px`);
  });
  toolbarSize.observe(toolbar);
  ctx.cleanup(() => toolbarSize.disconnect());
  const playArea = root.querySelector("#casino-play-area");
  const salon = root.querySelector(".casino-salon");
  let launchButton;
  function closeGame() {
    slot?.destroy();
    slot = undefined;
    playArea.hidden = true;
    playArea.innerHTML = "";
    salon.hidden = false;
    root.classList.remove("is-playing", "is-centered");
    root.querySelectorAll(".casino-game-nav, .casino-game-tools").forEach(el => el.hidden = true);
    root.querySelector("[data-center-game]").setAttribute("aria-pressed", "false");
    launchButton?.focus();
    void localWallet.checkpoint("exit").catch(() => {});
  }
  const back = () => { if (!playArea.hidden) closeGame(); };
  window.addEventListener("popstate", back);
  ctx.cleanup(() => window.removeEventListener("popstate", back));
  function showGame(button) {
    launchButton = button;
    salon.hidden = true;
    playArea.hidden = false;
    root.classList.add("is-playing");
    root.querySelectorAll(".casino-game-nav, .casino-game-tools").forEach(el => el.hidden = false);
    window.history.pushState({ casinoGame: button.dataset.casinoGame }, "");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function bindClose() {
    root.querySelectorAll("[data-close-slot]").forEach(button => {
      button.onclick = () => window.history.back();
    });
  }
  root.querySelector("[data-center-game]").onclick = (event) => {
    const centered = root.classList.toggle("is-centered");
    event.currentTarget.setAttribute("aria-pressed", String(centered));
    const toolbar = root.querySelector(".casino-toolbar");
    root.style.setProperty("--casino-toolbar-height", toolbar.getBoundingClientRect().height + "px");
    window.scrollTo({ top: root.offsetTop, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  async function openSlot(button) {
    if (slot) {
      playArea.scrollIntoView({ block: "start" });
      return;
    }
    if (mounting) return;
    mounting = true;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    showGame(button);
    playArea.innerHTML = '<p role="status">A preparar a tua mesa…</p>';
    const uid = ctx.realUser?.uid || ctx.user.uid;
    try {
      const [sdk, latest] = await Promise.all([
        import("../assets/games/futebol/slot-host.js"),
        localWallet.start(),
      ]);
      if (!active) return;
      wallet = latest;
      drawWallet();
      const key = `peladinhas:casino:stream:${uid}`;
      let streamId = localStorage.getItem(key);
      if (!streamId) {
        streamId = crypto.randomUUID();
        localStorage.setItem(key, streamId);
      }
      playArea.innerHTML = `<div class="casino-slot-mount"></div>`;
      slot = sdk.mountSlot(playArea.querySelector(".casino-slot-mount"), {
        src: new URL("../assets/games/futebol/embed.html", import.meta.url)
          .href,
        playerId: uid,
        // The SDK asks before each spin; this is intentionally a memory read.
        getBalance: () => localWallet.balance(),
        settle: async (transaction) => {
          if (!active) throw Error("Reabre o jogo para recuperar esta jogada.");
          const result = await localWallet.settle({
            ...transaction,
            streamId,
          });
          if (active) {
            wallet = result;
            drawWallet();
          }
          return { balance: result.balance };
        },
      });
      bindClose();
      root.querySelector(".casino-game-nav h2").focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (error) {
      if (active) {
        playArea.innerHTML = `<button type="button" class="casino-text-button casino-back" data-close-slot>${icon("arrow")} Voltar ao casino</button><p role="alert">${esc(friendlyError(error))}</p><p class="casino-session-note">Volta ao catálogo para tentar novamente. Nenhuma aposta foi iniciada.</p>`;
        bindClose();
      }
    } finally {
      mounting = false;
      if (active) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    }
  }
  function history() {
    modal(
      "Movimentos Djabucoin",
      `<div class="casino-history"><p class="subtitle">Últimos ${DJABUCOIN.recentLimit} movimentos · saldo confirmado de ${number(wallet.balance)} DJC</p>${wallet.recent.length ? `<ol>${wallet.recent.map((entry) => `<li><span>${icon(entry.kind === "welcome" ? "gift" : entry.kind === "slot" ? "studioSymbols" : "games")}<span><strong>${entry.kind === "welcome" ? "Boas-vindas à liga" : entry.kind === "slot" ? "Noite de Glória" : "Peladinha concluída"}</strong><small>${esc(new Date(entry.at).toLocaleDateString("pt-PT"))}</small></span></span><b class="${entry.amount < 0 ? "is-debit" : ""}">${entry.amount > 0 ? "+" : ""}${number(entry.amount)} DJC</b></li>`).join("")}</ol>` : "<p>Ainda não há movimentos. Os teus créditos vão aparecer aqui.</p>"}</div>`,
    );
  }
  function drawWallet(error = "") {
    walletRoot.innerHTML = walletContent(wallet, loading, error);
    walletRoot.querySelector("[data-wallet-refresh]").onclick = () =>
      loadWallet(true);
    walletRoot.querySelector("[data-wallet-history]").onclick = history;
  }
  async function loadWallet(force = false) {
    if (loading) return;
    loading = true;
    drawWallet();
    try {
      const result =
        force && localWallet.view()
          ? await localWallet.checkpoint("manual")
          : await localWallet.start();
      if (!active) return;
      wallet = result;
      loading = false;
      drawWallet();
      if (slot) await slot.refreshBalance();
    } catch (error) {
      if (!active) return;
      loading = false;
      drawWallet(
        wallet
          ? "Não foi possível atualizar. O saldo apresentado é o último confirmado."
          : friendlyError(error),
      );
    }
  }
  root.querySelectorAll("[data-casino-filter]").forEach((button) => {
    button.onclick = () => {
      category = button.dataset.casinoFilter;
      root
        .querySelectorAll("[data-casino-filter]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      root.querySelectorAll(".casino-game").forEach((item, index) => {
        item.hidden =
          category !== "all" && CASINO_CATALOG[index].category !== category;
      });
      root.querySelector(".casino-count").textContent =
        category === "all"
          ? "4 jogos · 1 disponível"
          : category === "slots"
            ? "2 slots · 1 disponível"
            : "2 em preparação";
    };
  });
  root.querySelectorAll("[data-casino-game]").forEach((button) => {
    button.onclick = () => {
      const game = CASINO_CATALOG.find(
        (item) => item.id === button.dataset.casinoGame,
      );
      if (game.available) {
        void openSlot(button);
        return;
      }
      modal(
        game.title,
        `<div class="casino-game-preview"><div class="casino-game-art casino-art-${game.art}">${casinoArt(game.art)}</div><p>${esc(game.description)}</p><p class="subtitle">Em preparação · ainda sem apostas ou débitos de Djabucoin.</p><button type="button" class="btn btn-secondary" disabled>Disponível em breve</button></div>`,
      );
    };
  });
  // Do not block rendering the local lounge on a network request.
  await loadWallet();
}
