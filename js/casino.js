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
  return `<div class="casino-wallet-heading">${coin}<span>A TUA CARTEIRA<strong>Djabucoin</strong></span></div><div class="casino-balance" aria-live="polite" aria-atomic="true"><strong>${wallet ? number(wallet.balance) : "—"}</strong><span>DJC disponíveis</span></div><p class="casino-wallet-status" role="status">${loading ? "A confirmar o saldo…" : error || wallet?.syncError ? esc(error || wallet.syncError) : wallet?.local ? "Guardado neste dispositivo · por sincronizar" : `Confirmado às ${new Date(wallet.checkedAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`}</p><div class="casino-wallet-actions"><button type="button" class="casino-button casino-button-outline" data-wallet-refresh ${loading ? 'disabled aria-busy="true"' : ""}>${icon("refresh")}${error ? "Tentar novamente" : "Atualizar saldo"}</button><button type="button" class="casino-text-button" data-wallet-history ${!wallet ? "disabled" : ""} aria-haspopup="dialog">Movimentos ${icon("arrow")}</button></div><p class="casino-wallet-footnote">Moeda da liga. Sem compras ou levantamentos.</p>`;
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
    `<div class="casino-page"><div class="casino-topline"><a href="#/" class="casino-back">${icon("arrow")}Voltar à liga</a><span>${icon("lock")} Abertura em preparação</span></div><section class="casino-hero" aria-labelledby="casino-title"><div class="casino-hero-copy"><p class="casino-kicker">PELADINHAS CARDS · CLUB CASINO</p><h1 id="casino-title">O jogo continua.<br><em>Fora das quatro linhas.</em></h1><p>O teu lugar à mesa. A tua próxima combinação.<br>Bem-vindo ao casino da tua liga.</p><a class="casino-button" href="#casino-games">Explorar o salão ${icon("arrow")}</a><span class="casino-hero-note">Slots & jogos de mesa · Apenas Djabucoins</span></div><div class="casino-hero-art" aria-hidden="true"><div class="casino-table-line"></div><div class="casino-hero-cards"><span>♠</span><span>♥</span></div><div class="casino-chip casino-chip-one">D</div><div class="casino-chip casino-chip-two">D</div><div class="casino-chip casino-chip-three">D</div><span class="casino-table-signature">A SORTE VESTE A TUA CAMISOLA.</span></div></section><div class="casino-lounge-layout"><section class="casino-salon" id="casino-games" aria-labelledby="casino-games-title"><div class="casino-section-heading"><div><p class="casino-kicker">ESCOLHE O TEU LUGAR</p><h2 id="casino-games-title">O salão</h2></div><span class="casino-count">1 disponível · 2 em preparação</span></div><div class="casino-filters" role="group" aria-label="Filtrar jogos"><button type="button" data-casino-filter="all" aria-pressed="true">Todo o salão</button><button type="button" data-casino-filter="slots" aria-pressed="false">Slots</button><button type="button" data-casino-filter="tables" aria-pressed="false">Mesas</button></div><div class="casino-game-grid">${CASINO_CATALOG.map(gameCard).join("")}</div><p class="casino-availability" role="status">${icon("clock")} Noite de Glória já está disponível. Novas mesas a caminho.</p></section><aside class="casino-wallet" aria-label="Carteira Djabucoin">${walletContent(null, true)}</aside></div><section id="casino-play-area" class="casino-session" hidden aria-label="Jogo em curso"></section><section class="casino-rewards" aria-labelledby="casino-rewards-title"><div class="casino-reward-symbol" aria-hidden="true">${coin}</div><div><p class="casino-kicker">DO RELVADO PARA O SALÃO</p><h2 id="casino-rewards-title">Joga na liga. Ganha Djabucoins.</h2><p>Cada peladinha concluída em que participes vale <strong>+${number(DJABUCOIN.perMatch)} DJC</strong>. O crédito é automático, uma vez por jogo.</p></div><div class="casino-reward-amount"><strong>+${number(DJABUCOIN.initial)}</strong><span>DJC de boas-vindas<br>uma vez, para começar</span></div></section><details class="casino-rules"><summary>Como funciona a Djabucoin ${icon("info")}</summary><div><p>Começas com ${number(DJABUCOIN.initial)} DJC. A partir da ativação desta funcionalidade, recebes ${number(DJABUCOIN.perMatch)} DJC quando uma peladinha em que participaste é concluída, independentemente do resultado. Os jogos anteriores não são contabilizados.</p><p>O prémio pertence aos participantes registados no jogo, incluindo suplentes. Reabrir e voltar a fechar o mesmo jogo não repete o crédito. Alterações posteriores ao resultado não alteram o prémio.</p><p>A Djabucoin é uma moeda virtual da liga, sem valor monetário. Não existem depósitos, compras, transferências ou levantamentos. Podes consultar os últimos ${DJABUCOIN.recentLimit} movimentos na carteira.</p></div></details><footer class="casino-footer"><span>PELADINHAS <b>CASINO</b></span><span>A tua liga. Outro jogo.</span></footer></div>`,
  );
  const root = document.querySelector(".casino-page");
  const walletRoot = root.querySelector(".casino-wallet");
  const playArea = root.querySelector("#casino-play-area");
  root.querySelector('a[href="#casino-games"]').onclick = (event) => {
    event.preventDefault();
    root.querySelector("#casino-games-title").setAttribute("tabindex", "-1");
    root.querySelector("#casino-games-title").focus({ preventScroll: true });
    root.querySelector("#casino-games").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
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
    playArea.hidden = false;
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
      playArea.innerHTML = `<div class="casino-session-head"><div><p class="casino-kicker">FUTEBOL DE BAIRRO</p><h2 tabindex="-1">Noite de Glória</h2></div><button type="button" class="casino-button casino-button-outline" data-close-slot>Fechar jogo ${icon("close")}</button></div><p class="casino-session-note">Jogas com Djabucoins. Os valores da slot correspondem a DJC; aposta mínima de 0,20 DJC.</p><div class="casino-slot-mount"></div><p class="casino-session-note">Podes expandir o jogo sem interromper a ronda. O progresso fica guardado neste navegador.</p>`;
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
      playArea.querySelector("[data-close-slot]").onclick = () => {
        slot.destroy();
        slot = undefined;
        playArea.hidden = true;
        playArea.innerHTML = "";
        button.focus();
        void localWallet.checkpoint("exit").catch(() => {});
      };
      playArea.querySelector("h2").focus({ preventScroll: true });
      playArea.scrollIntoView({ block: "start" });
    } catch (error) {
      if (active) {
        playArea.innerHTML = `<p role="alert">${esc(friendlyError(error))}</p><p class="casino-session-note">Seleciona Jogar agora para tentar novamente. Nenhuma aposta foi iniciada.</p>`;
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
          ? "1 disponível · 2 em preparação"
          : category === "slots"
            ? "1 jogo disponível"
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
