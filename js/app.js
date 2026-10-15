import { compareEventRarity } from "./event-rarity.js";
import { mountHomePodium } from "./home-podium.js";
import {
  mountInstallButton,
  installSpotlight,
  bindInstallSpotlight,
} from "./pwa.js";
import {
  syncPushIdentity,
  homePushInvitation,
  bindPushSettings,
} from "./push.js";
import {
  activeDestination,
  mobileNavigation,
  bindMobileNavigation,
} from "./navigation.js";
import { eventsPage } from "./event-pages.js";
import { eventPage } from "./events.js";
import { adminCardsPage, editWeeklyCardPhotoPage } from "./admin-cards.js";
import {
  perspectiveUser,
  perspectiveControl,
  bindPerspective,
} from "./role-perspective.js";
import { mountAdminMenu } from "./admin-menu.js";
import { configured } from "./firebase.js";
import { ovrAuditPage } from "./ovr-audit.js";
import { statisticsPage } from "./statistics.js";
import { ticketsPage } from "./tickets.js";
import { bindThemePicker } from "./themes.js";
import { startAuth, currentUser, loadProfile, logout } from "./auth.js";
import { loadLeague } from "./data.js";
import { refreshMissionsForCurrentUser, missionList } from "./missions.js";
import {
  refreshNotifications,
  notificationsPage,
  toggleNotifications,
} from "./notifications.js";
import { authPage } from "./onboarding.js";
import { playerPage, editProfile } from "./profile.js";
import { gamesPage, gamePage, gameRows } from "./games.js";
import { initialMission, feedbackPage } from "./ratings.js";
import { adminPage, cardLab, adminEdit, rawRatings } from "./admin.js";
import { card, bindImages } from "./cards.js";
import {
  ATTRIBUTES,
  calculateWeeklyTopPlayers,
  isoWeek,
  average,
  themeName,
  THEMES,
} from "./utils.js";
import {
  esc,
  setMain,
  empty,
  pageHead,
  linkButton,
  skeleton,
  errorPage,
  toast,
  busy,
  closeModal,
} from "./ui.js";
import { icon } from "./icons.js";
import { ASSET_PATHS, safeImage } from "./assets.js";
import * as DB from "./db.js";
const ctx = {
  user: null,
  realUser: null,
  league: null,
  missions: [],
  notifications: [],
  disposers: [],
  render(html) {
    setMain(html);
    document
      .querySelector("#main")
      .classList.toggle("admin-layout", /^#\/admin(\/|$)/.test(location.hash));
    document
      .querySelector("#main")
      .classList.toggle(
        "wide-layout",
        /^#\/(admin|statistics|game)(\/|$)/.test(location.hash),
      );
    bindImages();
    if (
      this.user &&
      this.realUser?.role === "admin" &&
      ["#/profile", `#/player/${this.user.uid}`].includes(location.hash)
    ) {
      const heading = document.querySelector("#main .page-head h1");
      heading?.insertAdjacentHTML(
        "afterend",
        perspectiveControl(this.realUser, this.user.role),
      );
      bindPerspective(document.querySelector("#main"), this);
    }
  },
  cleanup(fn) {
    this.disposers.push(fn);
  },
  go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  },
  async refresh() {
    this.realUser = await loadProfile();
    this.user = perspectiveUser(this.realUser);
    syncPushIdentity(
      this.realUser && !this.realUser.disabled ? this.realUser.uid : null,
      (items) => {
        if (!ctx.realUser || ctx.realUser.disabled) return;
        ctx.notifications = items.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
        header();
        if (location.hash === "#/notifications") notificationsPage(ctx);
      },
    ).catch(() => {});
    if (!this.user || this.user.disabled) return;
    this.league = await loadLeague();
    this.missions = await refreshMissionsForCurrentUser(this.user, this.league);
    await this.refreshNotifications();
  },
  async refreshNotifications() {
    this.notifications = await refreshNotifications(
      this.user.uid,
      this.missions,
    );
    header();
  },
};
let routeNumber = 0;
const playerFilters = { search: "", sort: "ovr", direction: "desc" };
const searchable = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
function header() {
  const dropdownOpen =
    !!document.querySelector("#notification-dropdown") &&
    document.querySelector("#header").dataset.route === location.hash;
  const p = ctx.user,
    hash = location.hash || "#/",
    unread = ctx.notifications.filter((n) => !n.read).length;
  const links = [
    ["#/", "home", "Início"],
    ["#/players", "players", "Jogadores"],
    ["#/games", "games", "Jogos"],
    ["#/statistics", "trophy", "Estatísticas"],
    ["#/missions", "missions", "Missões"],
    ["#/tickets", "tickets", "Tickets"],
  ];
  document.querySelector("#header").innerHTML =
    `<nav class="navbar"><a class="brand" href="#/" aria-label="Peladinhas Cards — início"><img src="${ASSET_PATHS.logo}" alt=""><span>PELADINHAS<small>CARDS</small></span></a>${p ? `<div class="desktop-nav">${links.map(([h, i, n]) => `<a href="${h}" class="nav-link ${activeDestination(h, hash) ? "active" : ""}">${icon(i)}${n}${i === "missions" && ctx.missions.length ? `<span class="badge">${ctx.missions.length}</span>` : ""}</a>`).join("")}${p.role === "admin" ? `<a class="nav-link ${hash.startsWith("#/admin") ? "active" : ""}" href="#/admin">${icon("shield")}Admin</a>` : ""}</div><div class="header-actions">${p.role === "admin" ? `<a class="btn btn-icon btn-ghost mobile-admin" href="#/admin" aria-label="Administração">${icon("shield")}</a>` : ""}<button id="bell" class="btn btn-icon btn-ghost" aria-label="Notificações${unread ? `, ${unread} por ler` : ""}">${icon("bell")}${unread ? `<span class="badge notification-count">${unread}</span>` : ""}</button><div class="profile-perspective-menu"><a class="user-link" href="#/profile" aria-label="Ver o meu perfil"><img src="${esc(safeImage(p.photoURL))}" alt="" data-fallback="${ASSET_PATHS.avatar}"><span>${esc(p.displayName || p.username)}</span></a>${perspectiveControl(ctx.realUser, p.role, true)}</div><button id="logout" class="btn btn-icon btn-ghost" aria-label="Terminar sessão">${icon("logout")}</button></div>` : '<span class="club-label">A TUA LIGA. A TUA CARTA.</span>'}</nav>${p ? mobileNavigation(p, ctx.missions.length) : ""}`;
  document
    .querySelector("#bell")
    ?.addEventListener("click", () => toggleNotifications(ctx));
  document.querySelector("#logout")?.addEventListener("click", async (e) => {
    const signedOutUid = ctx.realUser?.uid;
    try {
      await busy(e.currentTarget, logout);
      if (signedOutUid)
        sessionStorage.removeItem(`peladinhas-perspective:${signedOutUid}`);
      ctx.user = null;
      ctx.realUser = null;
      ctx.league = null;
      ctx.notifications = [];
      ctx.missions = [];
      toast("Sessão terminada.");
      ctx.go("#/");
    } catch {}
  });
  bindMobileNavigation(p);
  mountInstallButton(document.querySelector("#header"));
  bindPerspective(document.querySelector("#header"), ctx);
  bindThemePicker(document.querySelector("#header"));
  bindImages(document.querySelector("#header"));
  document.querySelector("#header").dataset.route = location.hash;
  if (dropdownOpen && p) toggleNotifications(ctx);
}
function home() {
  const me = ctx.league.players.find((p) => p.uid === ctx.user.uid),
    players = ctx.league.players.filter((p) => p.hasCard);
  const visibleMissions = [...ctx.missions]
    .sort(compareEventRarity)
    .slice(0, 4);
  const hour = Number(
    new Intl.DateTimeFormat("pt-PT", {
      timeZone: "Europe/Lisbon",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  ctx.render(
    `<div class="dashboard-greeting"><div><p class="eyebrow">${ctx.league.cycle.weekId} / ${ctx.league.cycle.phase === "closed" ? "CARTAS FECHADAS" : "A TUA COMUNIDADE"}</p><h1>${hour < 12 ? "Bom dia" : hour < 19 ? "Boa tarde" : "Boa noite"}, ${esc(ctx.user.displayName || ctx.user.username)}.</h1><p>Pronto para mais uma Peladinha?</p></div>${["admin", "dbs"].includes(ctx.user.role) ? linkButton("#/game/new", "Criar jogo", "secondary", "plus") : ""}</div>${installSpotlight()}<section class="weekly-section"><div class="section-head"><div><p class="eyebrow">Os destaques da liga</p><h2>No topo da liga</h2></div>${linkButton("#/ranking", "Ver classificação completa", "ghost", "trophy")}</div><div id="home-podium"></div></section><div class="dashboard-columns"><section class="panel my-card-panel"><div class="section-head"><h2>A minha carta</h2>${linkButton("#/profile", "Ver perfil", "ghost")}</div>${me ? card(me, { size: "md" }) : empty("Perfil em preparação")}<div class="metrics compact-metrics">${[
      ["OVR", me?.hasCard ? me.ovr : "—"],
      [
        "Forma",
        me?.aggregates.length
          ? average(me.aggregates.slice(-5).map((g) => g.overall)).toFixed(1)
          : "—",
      ],
      ["Jogos", me?.matchStats.played || 0],
      ["Vitórias", me?.matchStats.wins || 0],
      ["Golos", me?.matchStats.goals || 0],
      ["Assistências", me?.matchStats.assists || 0],
      ["% vitórias", `${me?.matchStats.winRate || 0}%`, true],
      ["Golos / jogo", me?.matchStats.played ? (me.matchStats.goals / me.matchStats.played).toLocaleString("pt-PT", { maximumFractionDigits: 1 }) : "0", true],
      ["Assist. / jogo", me?.matchStats.played ? (me.matchStats.assists / me.matchStats.played).toLocaleString("pt-PT", { maximumFractionDigits: 1 }) : "0", true],
    ]
      .map(([k, v, extra]) => `<div${extra ? ' class="dashboard-extra-stat"' : ""}><small>${k}</small><b>${v}</b></div>`)
      .join(
        "",
      )}</div><div class="my-card-actions">${linkButton("#/statistics", "Comparar na liga", "secondary", "chart")}</div></section><section class="panel dashboard-missions content-stack"><div class="section-head"><h2>As tuas missões</h2><span class="pill">${ctx.missions.length} ${ctx.missions.length === 1 ? "pendente" : "pendentes"}</span></div>${missionList(visibleMissions, { grouped: false })}${ctx.missions.length > 4 ? `<div class="missions-toolbar">${linkButton("#/missions", "Ver todas as missões", "secondary")}</div>` : ""}</section></div><section><div class="section-head"><h2>Últimas Peladinhas</h2>${linkButton("#/games", "Todos os jogos", "ghost")}</div>${ctx.league.games.length ? gameRows(ctx.league.games.slice(0, 3)) : empty("O próximo jogo começa aqui", ["admin", "dbs"].includes(ctx.user.role) ? "Cria uma Peladinha e reúne os teus colegas." : "Assim que a liga marcar uma Peladinha, encontras aqui as equipas e os detalhes.", ["admin", "dbs"].includes(ctx.user.role) ? linkButton("#/game/new", "Criar jogo", "primary", "plus") : "", "games")}</section>`,
  );
  const main = document.querySelector("#main");
  main
    .querySelector(".dashboard-greeting")
    .insertAdjacentHTML("afterend", homePushInvitation());
  bindPushSettings(main);
  ctx.cleanup(bindInstallSpotlight(main));
  ctx.cleanup(mountHomePodium(main.querySelector("#home-podium"), players));
}
function playersPage() {
  ctx.render(
    `${pageHead("A comunidade", "Jogadores", "Cada carta tem uma história. As setas verdes e vermelhas mostram a variação face à semana anterior.")}<div class="filters panel"><label class="search-field">Procurar<input id="search" placeholder="Nome ou username"></label><label>Ordenar<select id="sort"><option value="ovr">OVR</option><option value="name">Nome</option>${ATTRIBUTES.map(([key, name]) => `<option value="${key}">${esc(name)}</option>`).join("")}</select></label><label>Por<select id="sort-direction"><option value="desc">Decrescente</option><option value="asc">Crescente</option></select></label></div><div id="player-grid" class="card-grid"></div>`,
  );
  document.querySelector("#search").value = playerFilters.search;
  document.querySelector("#sort").value = playerFilters.sort;
  document.querySelector("#sort-direction").value = playerFilters.direction;
  const draw = () => {
    const q = searchable(document.querySelector("#search").value),
      sortKey = document.querySelector("#sort").value,
      sortDirection = document.querySelector("#sort-direction").value;
    Object.assign(playerFilters, {
      search: document.querySelector("#search").value,
      sort: sortKey,
      direction: sortDirection,
    });
    const players = ctx.league.players
      .filter((p) => searchable(`${p.username} ${p.displayName}`).includes(q))
      .sort((a, b) => {
        const byName = (a.displayName || a.username).localeCompare(
          b.displayName || b.username,
          "pt-PT",
        );
        if (sortKey === "name")
          return sortDirection === "desc" ? -byName : byName;
        if (a.hasCard !== b.hasCard) return a.hasCard ? -1 : 1;
        const value = (p) => (sortKey === "ovr" ? p.ovr : p.stats?.[sortKey]);
        return (
          ((Number(value(a)) || 0) - (Number(value(b)) || 0)) *
            (sortDirection === "asc" ? 1 : -1) || byName
        );
      });
    document.querySelector("#player-grid").innerHTML = players.length
      ? players
          .map(
            (p) =>
              `<div class="grid-player">${card(p, { size: "sm" })}<span class="pill">${p.hasCard ? (p.official ? "Oficial" : "Provisória") : "Carta pendente"}</span></div>`,
          )
          .join("")
      : empty(
          ctx.league.players.length
            ? "Nenhum jogador encontrado"
            : "Ainda não existem jogadores para mostrar",
          ctx.league.players.length
            ? "Experimenta outros filtros."
            : "Quando novos jogadores entrarem nas Peladinhas Cards, as suas cartas irão aparecer aqui.",
          "",
          "players",
        );
    bindImages();
  };
  document
    .querySelectorAll(".filters input,.filters select")
    .forEach((e) => (e.oninput = draw));
  draw();
}
function rankingPage() {
  const players = calculateWeeklyTopPlayers(
    ctx.league.players.filter((p) => p.hasCard),
  );
  ctx.render(
    `${pageHead(isoWeek(), "Ranking semanal", "Média dos jogos da semana com pelo menos 2 avaliações válidas; desempate por OVR. Sem avaliações, o OVR serve de referência.")}<div class="ranking-list">${players.map((p, i) => `<a class="ranking-row panel" href="#/player/${p.uid}"><span class="ranking-number">${i + 1}</span><img src="${esc(safeImage(p.photoURL))}" alt="" data-fallback="${ASSET_PATHS.avatar}"><div><b>${esc(p.displayName || p.username)}</b><small>${themeName(p.cardType)}</small></div><div><small>OVR</small><b>${p.ovr}</b></div><div><small>Forma semanal</small><b>${p.weeklyPerformance?.toFixed(2) || "—"}</b></div>${icon("arrow")}</a>`).join("") || empty("A classificação começa contigo", "Conclui a autoavaliação para criares a tua carta.", linkButton("#/missions", "Missões"), "trophy")}</div>`,
  );
}
async function route() {
  const turn = ++routeNumber;
  const routeHash = location.hash;
  const isCurrent = () => turn === routeNumber && location.hash === routeHash;
  const pageCtx = Object.create(ctx);
  pageCtx.render = (html) => {
    if (!isCurrent())
      throw Object.assign(new Error("Navigation superseded"), {
        code: "navigation-cancelled",
      });
    ctx.render(html);
  };
  pageCtx.cleanup = (dispose) => {
    if (isCurrent()) ctx.cleanup(dispose);
    else dispose();
  };
  pageCtx.go = (hash) => {
    if (isCurrent()) ctx.go(hash);
  };
  pageCtx.refresh = () => ctx.refresh();
  pageCtx.refreshNotifications = () => ctx.refreshNotifications();
  for (const fn of ctx.disposers.splice(0)) {
    try {
      await fn();
    } catch (e) {
      console.error(e);
    }
  }
  if (turn !== routeNumber) return;
  closeModal();
  if (!configured) {
    header();
    ctx.render(
      empty(
        "Configuração necessária",
        "Preenche js/config.js e segue as instruções do README.",
        "",
        "shield",
      ),
    );
    return;
  }
  if (!currentUser) {
    syncPushIdentity(null).catch(() => {});
    ctx.user = null;
    ctx.realUser = null;
    header();
    authPage(ctx);
    return;
  }
  setMain(skeleton());
  try {
    await ctx.refresh();
    if (turn !== routeNumber) return;
    if (!ctx.user) {
      ctx.render(
        empty(
          "Perfil indisponível",
          "Não foi possível carregar o teu perfil. Contacta o apoio da liga.",
          '<button id="missing-logout" class="btn btn-secondary">Terminar sessão</button>',
          "profile",
        ),
      );
      document.querySelector("#missing-logout").onclick = () => logout();
      return;
    }
    header();
    if (ctx.user.disabled)
      return ctx.render(
        empty("Conta desativada", "Contacta o apoio da liga.", "", "shield"),
      );
    const parts = (location.hash || "#/").slice(2).split("/").filter(Boolean);
    if (parts[0] === "admin" && ctx.user.role !== "admin")
      return ctx.render(
        empty(
          "Acesso reservado",
          "Esta área está disponível apenas a administradores.",
          linkButton("#/", "Início"),
          "shield",
        ),
      );
    if (!parts.length) {
      home();
      DB.callAdmin("ensureHistory", {}).catch((error) =>
        toast(
          "O histórico está temporariamente indisponível. Tenta novamente mais tarde.",
          "error",
        ),
      );
    } else if (parts[0] === "players") playersPage();
    else if (parts[0] === "player") await playerPage(pageCtx, parts[1]);
    else if (parts[0] === "profile")
      parts[1] === "edit"
        ? await editProfile(pageCtx)
        : await playerPage(pageCtx, ctx.user.uid);
    else if (parts[0] === "games") gamesPage(pageCtx);
    else if (parts[0] === "game")
      parts[2] === "feedback"
        ? await feedbackPage(pageCtx, parts[1])
        : await gamePage(pageCtx, parts[1]);
    else if (parts[0] === "events") await eventsPage(pageCtx);
    else if (parts[0] === "event") await eventPage(pageCtx, parts[1]);
    else if (parts[0] === "missions") {
      if (parts[1] === "self") await initialMission(pageCtx);
      else if (parts[1] === "new") await initialMission(pageCtx, parts[2]);
      else
        ctx.render(
          `${pageHead("A tua evolução", "Missões", "Acompanha os teus objetivos e as avaliações por concluir.")}<div class="missions-workspace content-stack"><div class="missions-toolbar">${linkButton("#/events", "Calendário e histórico de eventos", "secondary")}</div>${missionList(ctx.missions)}</div>`,
        );
    } else if (parts[0] === "notifications") notificationsPage(pageCtx);
    else if (parts[0] === "tickets") await ticketsPage(pageCtx, parts[1]);
    else if (parts[0] === "ranking") rankingPage();
    else if (parts[0] === "statistics") statisticsPage(pageCtx);
    else if (parts[0] === "admin") {
      if (parts[1] === "ovr") await ovrAuditPage(pageCtx, parts[2], parts[3]);
      else if (parts[1] === "card-types")
        await adminCardsPage(pageCtx, parts[2]);
      else if (parts[1] === "card-photo")
        await editWeeklyCardPhotoPage(pageCtx, parts[2]);
      else if (parts[1] === "cards") await cardLab(pageCtx, parts[2]);
      else if (parts[1] === "initial")
        await initialMission(pageCtx, parts[2], true);
      else if (parts[1] === "player") await adminEdit(pageCtx, parts[2]);
      else if (parts[1] === "ratings") await rawRatings(pageCtx, parts[2]);
      else if (parts[1] === "support") await ticketsPage(pageCtx);
      else await adminPage(pageCtx, parts[1]);
    } else if (parts[0] === "assets")
      ctx.render(
        `${pageHead("Identidade da liga", "Recursos visuais", "Recursos locais para as cartas e identidade visual.")}<div class="panel assets-preview"><img src="${ASSET_PATHS.logo}" alt="Logótipo Peladinhas Cards"><div><h2>Identidade Peladinhas</h2><p>Logótipo original, imagem de perfil padrão e molduras de cartas em CSS.</p>${ctx.user.role === "admin" ? linkButton("#/admin/cards", "Experimentar no Card Lab", "secondary", "lab") : ""}</div></div>`,
      );
    else
      ctx.render(
        empty(
          "Página não encontrada",
          "Segue para a página inicial.",
          linkButton("#/", "Início"),
        ),
      );
    if (!isCurrent()) return;
    if (parts[0] === "admin") mountAdminMenu();
    bindImages();
    const title = document.querySelector("#main h1, #main .empty-state h3");
    document.title = `${title?.textContent.trim() || "A tua liga"} · Peladinhas Cards`;
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector("#main").focus({ preventScroll: true });
  } catch (error) {
    if (isCurrent()) errorPage(error, route);
  }
}
window.addEventListener("hashchange", route);
window.addEventListener("peladinhas-push-read", async (event) => {
  const notice = event.detail;
  if (ctx.realUser?.uid !== notice.uid || !ctx.user || ctx.user.disabled)
    return;
  if (notice.type === "PUSH_NOTIFICATION_OPEN") {
    ctx.notifications = ctx.notifications.map((n) =>
      n.id === notice.notificationId ? { ...n, read: true } : n,
    );
    header();
    if (location.hash === "#/notifications") notificationsPage(ctx);
    return;
  }
  try {
    await ctx.refreshNotifications();
    if (location.hash === "#/notifications") notificationsPage(ctx);
  } catch {
    /* The service worker retains the read receipt for an offline retry. */
  }
});
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  document.querySelector("#main").focus();
});
// Refresh league data and missions only on navigation, manual reload or auth changes.
if (configured)
  startAuth(
    () => route(),
    (error) => errorPage(error, route),
  );
else route();
