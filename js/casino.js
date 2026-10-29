import { mountCasinoStore } from "./casino-store.js";
import { mountCasinoVault } from "./casino-vault.js";
import { esc, modal, friendlyError } from "./ui.js";
import { icon } from "./icons.js";
import { createCasinoLocalWallet } from "./casino-local-wallet.js";
import { CASINO_CATALOG, CASINO_TABLES_ENABLED } from "./casino-catalog.js";
import { DJABUCOIN, CASINO_EDITION } from "./casino-economy.js";
import { djabucoin } from "./djabucoin.js";

const number = (value) =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(
    value / DJABUCOIN.scale,
  );
function catalogCount(category = "all") {
  const games = CASINO_CATALOG.filter(game => category === "all" || game.category === category);
  const available = games.filter(game => game.available).length;
  const label = category === "slots" ? "slots" : category === "tables" ? "mesas" : "jogos";
  return games.length + " " + label + " \u00b7 " + available + (available === 1 ? " dispon\u00edvel" : " dispon\u00edveis");
}
const coin = djabucoin();
export function casinoArt(kind) {
  if (kind === "reels")
    return `<div class="casino-reels" aria-hidden="true"><div>7</div><div>7</div><div>7</div></div><span class="casino-art-caption" aria-hidden="true">PELADINHAS ORIGINALS</span>`;
  if (kind === "cards")
    return '<div class="casino-playing-cards" aria-hidden="true"><span><b>A</b><i>♠</i></span><span><b>K</b><i>♥</i></span></div>';
  return '<div class="casino-wheel" aria-hidden="true"><span>♦</span></div><span class="casino-ball" aria-hidden="true"></span>';
}
function gameCard(game) {
  const artwork = game.thumbnail
    ? `<img class="casino-game-thumbnail" src="${esc(new URL("../"+game.thumbnail,import.meta.url).href)}" alt="" width="800" height="1200" loading="eager" decoding="async">`
    : casinoArt(game.art);
  return `<article class="casino-game${game.thumbnail ? " casino-game-has-thumbnail" : ""}"><div class="casino-game-art casino-art-${game.art}">${artwork}<span class="casino-coming ${game.available ? "is-available" : ""}">${game.available ? "Disponível" : "Em breve"}</span></div><div class="casino-game-copy"><span class="casino-kicker">${game.category === "slots" ? "ROLOS & COMBINAÇÕES" : "JOGOS DE MESA"}</span><h3>${esc(game.title)}</h3><p>${esc(game.label)}</p><button class="casino-text-button" type="button" data-casino-game="${game.id}" ${game.available ? 'aria-controls="casino-play-area"' : 'aria-haspopup="dialog"'}>${game.available ? "Jogar agora" : `Conhecer ${esc(game.title)}`} ${icon("arrow")}</button></div></article>`;
}
function walletContent(wallet, loading = false, error = "") {
  return `<div class="casino-wallet-total">${coin}<span><small>O teu saldo</small><span class="casino-balance" aria-live="polite" aria-atomic="true"><strong>${wallet ? number(wallet.balance) : "—"}</strong> <small>DJC</small></span></span></div><button type="button" class="casino-vault-trigger" data-wallet-vault aria-controls="casino-vault-panel" aria-expanded="false">${icon("lock")}<span><small>Vault</small><span class="casino-balance"><strong>${wallet ? number(wallet.vaultBalance || 0) : "—"}</strong><small>DJC</small></span></span></button><div class="casino-wallet-actions"><button type="button" class="casino-text-button" data-wallet-history ${!wallet ? "disabled" : ""}>Movimentos</button><button type="button" class="casino-button casino-button-outline" data-wallet-refresh aria-label="Atualizar saldo" ${loading ? 'disabled aria-busy="true"' : ""}>${icon("refresh")}</button></div><p class="casino-wallet-status${error || wallet?.syncError ? " is-error" : ""}" role="status">${loading ? "A confirmar…" : error ? esc(error) : wallet?.syncError ? esc(wallet.syncError) : wallet?.local ? "Guardado no dispositivo" : "Saldo atualizado"}</p>`;
}

export async function casinoPage(ctx) {
  let active = true,
    wallet,
    loading = false,
    category = "all",
    slot,
    mounting = false, gameRun = 0, onlineBalance;
  const uid = ctx.realUser?.uid || ctx.user.uid;
  const playerId = `${uid}:${CASINO_EDITION}`;
  const localWallet = createCasinoLocalWallet(uid, (value) => {
    if (active && value) {
      wallet = onlineBalance === undefined ? value : { ...value, balance: onlineBalance };
      if (!loading) drawWallet();
    }
  }, { tables: CASINO_TABLES_ENABLED });
  ctx.cleanup(() => {
    active = false;
    slot?.destroy();
    window.removeEventListener("pagehide", leaving);
    window.removeEventListener("pageshow", returning);
    window.removeEventListener("peladinhas-before-logout", beforeLogout);
    document.removeEventListener("visibilitychange", visibility);
    return localWallet.close().catch(() => {});
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
    `<div class="casino-page"><header class="casino-toolbar"><a href="#/" class="casino-back">${icon("arrow")}<span>Voltar à liga</span></a><span class="casino-brand">PELADINHAS <b>CASINO</b></span><div class="casino-game-nav" hidden><button type="button" class="casino-tool casino-back" data-close-slot aria-label="Voltar ao casino">${icon("arrow")}</button><h2 tabindex="-1">Noite de Glória</h2></div><aside class="casino-wallet" aria-label="Carteira Djabucoin">${walletContent(null, true)}</aside><div class="casino-game-tools" hidden><button type="button" class="casino-tool" data-center-game aria-label="Centrar jogo" title="Centrar jogo"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8m-4-4v8"/></svg><span>Centrar jogo</span></button><button type="button" class="casino-tool" data-close-slot aria-label="Fechar jogo" title="Fechar jogo">${icon("close")}</button></div></header><section class="casino-salon" id="casino-games" aria-labelledby="casino-title"><div class="casino-section-heading"><div><p class="casino-kicker">O TEU CLUBE. OS TEUS JOGOS.</p><h1 id="casino-title">Escolhe a próxima jogada.</h1></div><span class="casino-count">${catalogCount()}</span></div><div class="casino-filters" role="group" aria-label="Filtrar jogos"><button type="button" data-casino-filter="all" aria-pressed="true">Para ti</button><button type="button" data-casino-filter="slots" aria-pressed="false">Slots</button><button type="button" data-casino-filter="tables" aria-pressed="false">Jogos de mesa</button></div><section class="casino-rejuice" aria-labelledby="rejuice-title"><div class="casino-rejuice-token" aria-hidden="true"><span>+50</span>${coin}</div><div class="casino-rejuice-copy"><h2 id="rejuice-title">Já perdeste as tuas Djabucoins todas?</h2><p>Queres um Rejuice? Clica em mim.</p><p class="casino-rejuice-notice" role="status" aria-live="polite"></p></div><button type="button" class="casino-button" data-rejuice>Pedir Rejuice</button></section><div class="casino-game-grid">${CASINO_CATALOG.map(gameCard).join("")}</div></section><section id="casino-play-area" class="casino-session" hidden aria-label="Jogo em curso"></section><footer class="casino-footer"><span>PELADINHAS <b>CASINO</b></span><span>A tua liga. Outro jogo.</span></footer></div>`,
  );
  const root = document.querySelector(".casino-page");
  const store = mountCasinoStore(root, localWallet, () => wallet, () => ctx.invalidateLeague?.());
  const shopButton = document.createElement('button');
  shopButton.type = 'button';
  shopButton.className = 'casino-store-entry';
  shopButton.dataset.casinoStore = '';
  shopButton.innerHTML = `${icon('cards')}<span><strong>Loja do casino</strong><small>A sorte passa. A tua carta fica.</small></span>${icon('arrow')}`;
  shopButton.onclick = store.open;
  const shopLink = document.createElement('a');
  shopLink.href = '#/shop';
  shopLink.className = 'casino-button casino-button-outline casino-shop-link';
  shopLink.innerHTML = `${icon('shop')} Loja de cartas ${icon('arrow')}`;
  root.querySelector('.casino-filters').after(shopLink);
  root.querySelector('.casino-filters').after(shopButton);
  const appHeader = document.querySelector("#header");
  const bottomNav = document.querySelector(".bottom-nav");
  const headerSize = new ResizeObserver(() => {
    root.style.setProperty("--casino-header-height", `${appHeader.getBoundingClientRect().height}px`);
    root.style.setProperty("--casino-bottom-height", `${bottomNav?.getBoundingClientRect().height || 0}px`);
    sizeCenteredGame();
  });
  if (appHeader) headerSize.observe(appHeader);
  if (bottomNav) headerSize.observe(bottomNav);
  ctx.cleanup(() => headerSize.disconnect());
  const walletRoot = root.querySelector(".casino-wallet");
  const vault = mountCasinoVault(root, localWallet, () => wallet);
  ctx.cleanup(vault.destroy);
  const toolbar = root.querySelector(".casino-toolbar");
  const toolbarSize = new ResizeObserver(() => {
    root.style.setProperty("--casino-toolbar-height", `${toolbar.getBoundingClientRect().height}px`);
    sizeCenteredGame();
  });
  toolbarSize.observe(toolbar);
  ctx.cleanup(() => toolbarSize.disconnect());
  const playArea = root.querySelector("#casino-play-area");
  const salon = root.querySelector(".casino-salon");
  let launchButton;
  function closeGame() {
    const refreshOnline = slot?.onlineTable;
    onlineBalance = undefined;
    gameRun++;
    mounting = false;
    slot?.destroy();
    slot = undefined;
    playArea.hidden = true;
    playArea.innerHTML = "";
    salon.hidden = false;
    root.classList.remove("is-playing", "is-centered", "is-table");
    root.querySelectorAll(".casino-game-nav, .casino-game-tools").forEach(el => el.hidden = true);
    launchButton?.focus();
    void localWallet.checkpoint(refreshOnline ? "entry" : "exit").catch(() => {});
  }
  function canCloseGame() {
    if (!slot?.canLeave || slot.canLeave()) return true;
    let message = playArea.querySelector(".casino-play-status");
    if (!message) {
      message = document.createElement("p");
      message.className = "casino-session-note casino-play-status";
      message.setAttribute("role", "status");
      playArea.prepend(message);
    }
    message.textContent = "Termina a ronda ou recupera a operação pendente antes de sair da mesa.";
    return false;
  }
  const back = () => {
    if (playArea.hidden) return;
    if (canCloseGame()) closeGame();
    else window.history.pushState({ casinoGame: launchButton.dataset.casinoGame }, "");
  };
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
      button.onclick = () => { if (canCloseGame()) window.history.back(); };
    });
  }
  function sizeCenteredGame() {
    if (!root.classList.contains("is-centered")) return;
    const header = (appHeader?.getBoundingClientRect().height || 0) + toolbar.getBoundingClientRect().height;
    const bottom = bottomNav && getComputedStyle(bottomNav).display !== "none" ? bottomNav.getBoundingClientRect().height : 0;
    const height = `${Math.max(160, innerHeight - header - bottom - 16)}px`;
    if (root.style.getPropertyValue("--casino-fit-height") !== height) root.style.setProperty("--casino-fit-height", height);
  }
  window.addEventListener("resize", sizeCenteredGame);
  ctx.cleanup(() => window.removeEventListener("resize", sizeCenteredGame));
  root.querySelector("[data-center-game]").onclick = () => {
    const game = playArea.querySelector(".casino-slot-mount");
    if (!game) return;
    if (game.classList.contains("casino-blackjack-mount")) {
      root.classList.add("is-centered");
      sizeCenteredGame();
    }
    requestAnimationFrame(() => {
      const header = (appHeader?.getBoundingClientRect().height || 0) + toolbar.getBoundingClientRect().height;
      const bottom = bottomNav && getComputedStyle(bottomNav).display !== "none" ? bottomNav.getBoundingClientRect().height : 0;
      const available = innerHeight - header - bottom;
      const box = game.getBoundingClientRect();
      const top = scrollY + box.top - header - Math.max(0, (available - box.height) / 2);
      window.scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    });
  };
  async function openSlot(button, game) {
    // Let pre-multiplayer rounds finish through their original wallet adapter.
    const savedBlackjack = game.id === 'blackjack' && JSON.parse(localStorage.getItem(`atelier:blackjack:website:${playerId}`) || 'null');
    const legacyBlackjack = !!(savedBlackjack?.pending || savedBlackjack?.state?.round);
    if (CASINO_TABLES_ENABLED) {
      for (const table of CASINO_CATALOG.filter(item => item.category === "tables" && item.id !== game.id)) {
        const saved = JSON.parse(localStorage.getItem(`atelier:${table.id}:website:${playerId}`) || "null");
        if (saved?.pending || saved?.state?.round) {
          modal("Retoma a tua mesa", `<p class="casino-session-note">Tens uma ronda ou operação pendente em ${esc(table.title)}. Abre essa mesa para recuperar antes de mudar de jogo.</p>`);
          return;
        }
      }
    }
    if (game.id !== "rift" && localWallet.riftActive()) {
      modal("Retoma a Rift", "<p>Conclui o b\u00f3nus da Rift Core Overdrive antes de mudar de jogo.</p>");
      return;
    }
    if (slot) {
      playArea.scrollIntoView({ block: "start" });
      return;
    }
    if (mounting) return;
    mounting = true;
    const run = ++gameRun;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    showGame(button);
    bindClose();
    root.querySelector(".casino-game-nav h2").innerHTML = game.id === "cardoso-road" ? '<span class="cardoso-toolbar-logo">CARDOSO<em>ROAD</em></span>' : esc(game.title);
    root.classList.toggle("is-table", game.category === "tables" || game.id === "rift" || game.id === "cardoso-road");
    playArea.innerHTML = '<p role="status">A preparar a tua mesa…</p>';
    try {
      const [sdk, latest] = await Promise.all([
        game.id === "blackjack" && !legacyBlackjack ? import("./casino-blackjack.js") : game.id === "roulette" ? import("./casino-roulette.js") : game.id === "cardoso-road" ? import("../assets/games/cardoso-road/mount.mjs") : game.id === "rift" ? import("./casino-rift-host.js") : game.category === "tables" ? import("./casino-table-host.js") : import("../assets/games/futebol/slot-host.js"),
        localWallet.enterGame(),
      ]);
      if (!active || run !== gameRun) return;
      wallet = latest;
      drawWallet();
      const key = `peladinhas:casino:stream:${uid}`;
      let streamId = localStorage.getItem(key);
      if (!streamId) {
        streamId = crypto.randomUUID();
        localStorage.setItem(key, streamId);
      }
      playArea.innerHTML = `<div class="casino-slot-mount${game.category === "tables" || game.id === "rift" || game.id === "cardoso-road" ? " casino-table-mount" : ""}${game.id === "blackjack" ? " casino-blackjack-mount" : ""}"></div>`;
      if (game.id === "blackjack" && !legacyBlackjack) {
        slot = sdk.mountBlackjackMultiplayer(playArea.querySelector(".casino-slot-mount"), {
          uid,
          onBalance: balance => { if (active && run === gameRun) { onlineBalance = balance; wallet = { ...wallet, balance }; drawWallet(); } },
          onExit: message => { if (active && run === gameRun) { closeGame(); modal("Mesa de Blackjack", `<p>${esc(message)}</p>`); void loadWallet(true); } },
        });
        await slot.ready;
        if (!active || run !== gameRun) return;
      } else if (game.id === "roulette") {
        slot = sdk.mountRouletteMultiplayer(playArea.querySelector(".casino-slot-mount"), {
          uid,
          onBalance: balance => { if (active && run === gameRun) { onlineBalance = balance; wallet = { ...wallet, balance }; drawWallet(); } },
          onExit: message => { if (active && run === gameRun) { closeGame(); modal("Mesa de Roleta", `<p>${esc(message)}</p>`); void loadWallet(true); } },
        });
        await slot.ready;
        if (!active || run !== gameRun) return;
      } else if (game.id === "cardoso-road") {
        slot = sdk.mountCardoso(playArea.querySelector(".casino-slot-mount"), localWallet);
        await slot.ready;
        if (!active || run !== gameRun) return;
      } else if (game.id === "rift") {
        slot = sdk.mountCasinoRift(playArea.querySelector(".casino-slot-mount"), localWallet);
        await slot.ready;
        if (!active || run !== gameRun) return;
      } else if (game.category === "tables") {
        if (!CASINO_TABLES_ENABLED) throw Error("Mesa disponível apenas no teste local.");
        slot = sdk.mountCasinoTable(playArea.querySelector(".casino-slot-mount"), {
          game: game.id, playerId,
          onRoundComplete: () => localWallet.checkpoint("table"),
          wallet: {
            getBalance: () => localWallet.balance(),
            settle: operation => {
              if (!active || run !== gameRun) throw Error("Reabre a mesa para recuperar a operação.");
              return localWallet.settleTable(game.id, operation);
            },
          },
        });
        await slot.ready;
        if (!active || run !== gameRun) return;
      } else slot = sdk.mountSlot(playArea.querySelector(".casino-slot-mount"), {
        src: new URL("../assets/games/futebol/embed.html", import.meta.url)
          .href,
        playerId,
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
      if (active && run === gameRun) {
        slot?.destroy();
        slot = undefined;
        playArea.innerHTML = `<button type="button" class="casino-text-button casino-back" data-close-slot>${icon("arrow")} Voltar ao casino</button><p role="alert">${esc(friendlyError(error))}</p><p class="casino-session-note">Volta ao catálogo para recuperar a sessão e tentar novamente.</p>`;
        bindClose();
      }
    } finally {
      if (run === gameRun) mounting = false;
      if (active) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    }
  }
  function history() {
    modal(
      "Movimentos Djabucoin",
      `<div class="casino-history"><p class="subtitle">Últimos ${DJABUCOIN.recentLimit} movimentos · saldo confirmado de ${number(wallet.balance)} DJC</p>${wallet.recent.length ? `<ol>${wallet.recent.map((entry) => `<li><span>${icon(entry.kind === "welcome" ? "gift" : entry.kind === "slot" ? "studioSymbols" : "games")}<span><strong>${entry.kind === "shop" ? "Compra na loja do casino" : entry.kind === "vault" ? "Depósito na Vault" : entry.kind === "rejuice" ? "Rejuice" : entry.kind === "admin" ? "Moedas do administrador" : entry.kind === "welcome" ? "Boas-vindas à liga" : entry.kind === "blackjack" ? "Blackjack" : entry.kind === "roulette" ? "Roleta" : entry.kind === "cardoso-road" ? "Cardoso Road" : entry.kind === "rift" ? "Rift Core Overdrive" : entry.kind === "slot" ? "Jogos do casino" : "Peladinha concluída"}</strong><small>${esc(new Date(entry.at).toLocaleDateString("pt-PT"))}</small></span></span><b class="${entry.amount < 0 ? "is-debit" : ""}">${entry.amount > 0 ? "+" : ""}${number(entry.amount)} DJC</b></li>`).join("")}</ol>` : "<p>Ainda não há movimentos. Os teus créditos vão aparecer aqui.</p>"}</div>`,
    );
  }
  function drawWallet(error = "") {
    walletRoot.innerHTML = walletContent(wallet, loading, error);
    const vaultTrigger = walletRoot.querySelector("[data-wallet-vault]");
    vaultTrigger.onclick = vault.toggle;
    vaultTrigger.setAttribute("aria-expanded", String(vault.expanded()));
    vault.update();
    store.update();
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
  const rejuiceButton = root.querySelector("[data-rejuice]");
  const rejuiceNotice = root.querySelector(".casino-rejuice-notice");
  function showRejuiceNotice(state, title, message) {
    const symbols = { success: "gift", refused: "ban", error: "info", loading: "refresh" };
    rejuiceNotice.dataset.state = state;
    root.querySelector(".casino-rejuice-copy").classList.add("has-feedback");
    rejuiceNotice.innerHTML = `<span class="casino-rejuice-feedback-icon" aria-hidden="true">${icon(symbols[state])}</span><span class="casino-rejuice-feedback-copy"><strong>${esc(title)}</strong><span>${esc(message)}</span></span>`;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      rejuiceNotice.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 240, easing: "ease-out" });
  }
  let rejuicing = false;
  rejuiceButton.onclick = async () => {
    if (rejuicing) return;
    const refused = "Já estás a pedir mais? Ainda tens Djabucoins suficientes. Volta quando estiveres mesmo falido.";
    if (!wallet || loading) {
      showRejuiceNotice("loading", "Calma, a carteira está a chegar.", "Espera pela confirmação do saldo e tenta novamente.");
      return;
    }
    if (wallet.balance >= 5 * DJABUCOIN.scale) {
      showRejuiceNotice("refused", "Falido? Ainda não.", refused);
      return;
    }
    rejuicing = true;
    rejuiceButton.disabled = true;
    rejuiceButton.setAttribute("aria-busy", "true");
    showRejuiceNotice("loading", "A avaliar os estragos…", "A confirmar se a tua carteira precisa de ajuda.");
    try {
      const awarded = await localWallet.rejuice();
      if (active) {
        if (awarded) showRejuiceNotice("success", "Rejuice aprovado!", "Recebeste 50 Djabucoins. Tenta não perder tudo outra vez tão depressa.");
        else showRejuiceNotice("refused", "Falido? Ainda não.", refused);
      }
    } catch {
      if (active) showRejuiceNotice("error", "A ligação foi à falência.", "Não foi possível confirmar o Rejuice. Tenta novamente; o pedido fica guardado sem duplicar moedas.");
    } finally {
      rejuicing = false;
      rejuiceButton.disabled = false;
      rejuiceButton.removeAttribute("aria-busy");
    }
  };
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
      root.querySelector(".casino-count").textContent = catalogCount(category);
    };
  });
  root.querySelectorAll("[data-casino-game]").forEach((button) => {
    button.onclick = () => {
      const game = CASINO_CATALOG.find(
        (item) => item.id === button.dataset.casinoGame,
      );
      if (game.demoUrl) {
        window.open(new URL(game.demoUrl, document.baseURI).href, "_blank", "noopener,noreferrer");
        return;
      }
      if (game.available) {
        void openSlot(button, game);
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
