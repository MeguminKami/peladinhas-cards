import { cardSelectionEntry } from "./card-selection-entry.js";
import { casinoSpotlight } from "./casino-spotlight.js";
import { componentWeeklyTopPlayers, matchAverageSummary } from "./match-rating-summary.js";
import { policyAt, canManage, setPolicyDocument } from "./system-policy.js";
import * as Firebase from "./firebase.js";
import { homeCardPanel } from "./home-card.js";
import { mountHomePodium } from "./home-podium.js";
import { applyPendingReads } from "./notification-read-queue.js";
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
  missionRewardBadge,
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
import { mountAdminMenu, adminAreaCapability } from "./admin-menu.js";
import { configured } from "./firebase.js";
import { ovrAuditPage } from "./ovr-audit.js";
import { statisticsPage } from "./statistics.js";
import { progressionGuidePage, progressionGuideLink } from "./progression-guide.js";
import { ticketsPage } from "./tickets.js";
import { bindThemePicker } from "./themes.js";
import { startAuth, currentUser, loadProfile, logout } from "./auth.js";
import { loadLeague } from "./data.js";
import { cardWeek } from "./card-week.js";
import { startRevisionUpdates } from "./revision-updates.js";
import { pathReviewText } from "./path-entry.js";
import { refreshMissionsForCurrentUser, missionList, compareMissionPriority, bindMissionClaims } from "./missions.js";
import {
  refreshNotifications,
  notificationsPage,
  toggleNotifications,
} from "./notifications.js";
import { authPage } from "./onboarding.js";
import { playerPage, editProfile } from "./profile.js";
import { pathsPage } from "./paths.js";
import { casinoPage } from './casino.js';
import { casinoShopPage } from './shop-page.js';
import { pathAdminPage } from "./path-admin.js";
import { gamesPage, gamePage, gameRows } from "./games.js";
import { initialMission, feedbackPage } from "./ratings.js";
import { adminPage, cardLab, adminEdit, rawRatings } from "./admin.js";
import { card, bindImages } from "./cards.js";
import { cardCatalogPage } from "./card-catalog.js";
import {
  ATTRIBUTES,
  isoWeek,
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
    setMain(`${policyAt().features.mode === "readOnly" ? `<p class="maintenance-public-notice" role="status">${esc(policyAt().features.message)}</p>` : ""}${html}`);
    if (/^#\/admin(?:\/|$)/.test(location.hash) && this.user?.role === "admin")
      mountAdminMenu(this.user);
    clearTimeout(this.cardExpiryTimer);
    if (
      /^#\/(?:profile|players|ranking|statistics)?$/.test(location.hash) ||
      /^#\/player\/[^/]+$/.test(location.hash)
    ) {
      const expiry = Math.min(
        ...(this.league?.players || [])
          .flatMap((player) => player.specials || [])
          .map((card) =>
            card.expiresAt ? +new Date(card.expiresAt) : Infinity,
          )
          .filter((value) => value > Date.now()),
      );
      if (Number.isFinite(expiry)) {
        const timer = setTimeout(
          () => route(),
          Math.min(86400000, Math.max(100, expiry - Date.now() + 50)),
        );
        this.cardExpiryTimer = timer;
        this.cleanup(() => clearTimeout(timer));
      }
    }
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
    if (document.querySelector("#main [data-path-review]")) {
      const clock = setInterval(() => {
        if (document.hidden) return;
        document.querySelectorAll("#main [data-path-review]").forEach(element => { element.textContent = pathReviewText(Number(element.dataset.pathReview)); });
      }, 60000);
      this.cleanup(() => clearInterval(clock));
    }
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
  detailCache: new Map(),
  cached(key, load) {
    const entry = this.detailCache.get(key);
    if (entry && Date.now() - entry.time < 30000) return entry.promise;
    const promise = Promise.resolve().then(load);
    const record = { time: Date.now(), promise };
    this.detailCache.set(key, record);
    promise.catch(() => {
      if (this.detailCache.get(key) === record) this.detailCache.delete(key);
    });
    return promise;
  },
  async refresh() {
    this.detailCache.clear();
    // Explicit refreshes after writes must observe the write, even if a
    // navigation refresh was already in flight.
    if (this.refreshTask) {
      await this.refreshTask.catch(() => {});
    }
    this.detailCache.clear();
    // Triggers bump the revision documents asynchronously, so a refresh after
    // a write must reload instead of trusting unchanged versions.
    return this.updateData({ force: true });
  },
  // Last full model, reused while the revision documents are unchanged. A full
  // reload reads every league collection; the check reads two documents.
  fullCache: null,
  updateData({ homeOnly = !location.hash || location.hash === "#/" || location.hash === "#", force = false } = {}) {
    if (this.refreshTask) return this.refreshTask;
    if (force) this.fullCache = null;
    const owner = currentUser?.uid;
    const session = authSession;
    const task = (async () => {
      const realUser = await loadProfile();
      if (currentUser?.uid !== owner || authSession !== session) return;
      this.realUser = realUser;
      this.user = perspectiveUser(realUser);
      syncPushIdentity(
        realUser && !realUser.disabled ? owner : null,
        (items) => {
          if (
            currentUser?.uid !== owner ||
            authSession !== session ||
            !ctx.realUser ||
            ctx.realUser.disabled
          )
            return;
          ctx.notifications = applyPendingReads(owner, items).sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
          );
          header();
          if (location.hash === "#/notifications") notificationsPage(ctx);
        },
      ).catch(() => {});
      if (!this.user || this.user.disabled) {
        this.league = null;
        return;
      }
      // Read the versions before the data: a change during the load leaves
      // them different, so the next check reloads.
      // getHome returns its own versions: a first home load needs no check.
      const fullLoad = !homeOnly || typeof DB.getHome !== "function" || this.homeUnavailable;
      const versions = typeof DB.homeVersions === "function" && (fullLoad || (!force && this.homeSnapshot))
        ? await DB.homeVersions(owner).catch(() => null) : null;
      if (currentUser?.uid !== owner || authSession !== session) return;
      const week = cardWeek(), cacheKey = versions && `${versions.join(":")}:${owner}:${this.user.role}:${week.weekId}:${week.phase}`;
      const fresh = (time) => !force && cacheKey && Date.now() - time < 300000;
      const home = this.homeSnapshot;
      if (homeOnly && home && this.leagueKind === "home" && fresh(this.homeTime) && versions.join(":") === home.versions?.join(":") && !(home.validUntil <= Date.now())) {
        this.loadedAt = Date.now();
        return;
      }
      const full = this.fullCache;
      if (fullLoad && full?.key === cacheKey && fresh(full.time)) {
        this.league = full.league;
        this.leagueKind = "full";
        this.homeSnapshot = null;
        this.missions = full.missions;
        this.loadedAt = Date.now();
        header();
        return;
      }
      let snapshot;
      if (homeOnly && typeof DB.getHome === "function") {
        try { snapshot = await DB.getHome(); }
        catch (error) {
          // Rolling deployments may briefly serve the previous backend.
          if (!["functions/not-found", "functions/unimplemented"].includes(error.code)) throw error;
          this.homeUnavailable = true;
        }
      }
      if (snapshot) { setPolicyDocument(snapshot.policyDocument); await Firebase.configureAppCheck?.(policyAt()); this.realUser = snapshot.user; this.user = perspectiveUser(snapshot.user); }
      const league = snapshot?.league || await loadLeague();
      if (currentUser?.uid !== owner || authSession !== session) return;
      const missions = snapshot?.missions || await refreshMissionsForCurrentUser(this.user, league);
      if (currentUser?.uid !== owner || authSession !== session) return;
      // A slow home response must never replace the full model of a page the
      // player opened while that request was still running.
      if (snapshot && location.hash && !["#/", "#"].includes(location.hash)) return;
      this.league = league;
      this.leagueKind = snapshot ? "home" : "full";
      this.homeSnapshot = snapshot || null;
      this.missions = missions;
      this.loadedAt = Date.now();
      if (snapshot) this.homeTime = this.loadedAt;
      else this.fullCache = cacheKey ? { key: cacheKey, league, missions, time: this.loadedAt } : null;
      header();
      // Notifications are auxiliary: never hold up the destination page.
      this.refreshNotifications().catch(() => {});
    })();
    this.refreshTask = task;
    task
      .finally(() => {
        if (this.refreshTask === task) this.refreshTask = null;
      })
      .catch(() => {});
    return task;
  },
  async refreshNotifications() {
    const owner = this.user.uid;
    const session = authSession;
    const items = await refreshNotifications(owner, this.missions.filter(mission => !mission.completed));
    if (currentUser?.uid !== owner || authSession !== session) return;
    this.notifications = items;
    header();
    if (location.hash === "#/notifications") notificationsPage(ctx);
  },
};
let authSession = 0;
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
    unread = ctx.notifications.filter((n) => !n.read).length,
    readyMissions = ctx.missions.filter((mission) => mission.claimable).length;
  const links = [
    ["#/", "home", "Início"],
    ["#/players", "players", "Jogadores"],
    ["#/games", "games", "Jogos"],
    ["#/statistics", "trophy", "Estatísticas"],
    ["#/missions", "missions", "Missões"],
    ["#/players/cards", "cards", "Cartas"],
    ["#/shop", "shop", "Loja"],
  ];
  document.querySelector("#header").innerHTML =
    `<nav class="navbar"><a class="brand" href="#/" aria-label="Peladinhas Cards — início"><img src="${ASSET_PATHS.logo}" alt=""><span>PELADINHAS<small>CARDS</small></span></a>${p ? `<div class="desktop-nav">${links.map(([h, i, n]) => `<a href="${h}" class="nav-link ${activeDestination(h, hash) ? "active" : ""}">${icon(i)}${n}${i === "missions" && ctx.missions.length ? `<span class="badge">${ctx.missions.length}</span>` : ""}${i === "missions" ? missionRewardBadge(readyMissions) : ""}</a>`).join("")}${p.role === "admin" ? `<a class="nav-link ${hash.startsWith("#/admin") ? "active" : ""}" href="#/admin">${icon("shield")}Admin</a>` : ""}</div><div class="header-actions">${p.role === "admin" ? `<a class="btn btn-icon btn-ghost mobile-admin" href="#/admin" aria-label="Administração">${icon("shield")}</a>` : ""}<a id="header-tickets" href="#/tickets" class="btn btn-icon btn-ghost ${hash.startsWith("#/tickets") ? "active" : ""}" aria-label="Tickets" title="Tickets">${icon("tickets")}</a><button id="bell" class="btn btn-icon btn-ghost" aria-label="Notificações${unread ? `, ${unread} por ler` : ""}">${icon("bell")}${unread ? `<span class="badge notification-count">${unread}</span>` : ""}</button><div class="profile-perspective-menu"><a class="user-link" href="#/profile" aria-label="Ver o meu perfil"><img src="${esc(safeImage(p.photoURL))}" alt="" data-fallback="${ASSET_PATHS.avatar}"><span>${esc(p.displayName || p.username)}</span></a>${perspectiveControl(ctx.realUser, p.role, true)}</div><button id="logout" class="btn btn-icon btn-ghost" aria-label="Terminar sessão">${icon("logout")}</button></div>` : '<span class="club-label">A TUA LIGA. A TUA CARTA.</span>'}</nav>${p ? mobileNavigation(p, ctx.missions.length, readyMissions) : ""}`;
  document
    .querySelector("#bell")
    ?.addEventListener("click", () => toggleNotifications(ctx));
  document.querySelector("#logout")?.addEventListener("click", async (e) => {
    const signedOutUid = ctx.realUser?.uid;
    try {
      await busy(e.currentTarget, async () => {
        const preparations=[];
        window.dispatchEvent(new CustomEvent('peladinhas-before-logout', {
          detail: { waitUntil: task => preparations.push(task) },
        }));
        await Promise.allSettled(preparations);
        await logout();
      });
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
  const pendingMissions = ctx.missions.filter(mission => !mission.completed);
  const visibleMissions = [...pendingMissions]
    .sort(compareMissionPriority)
    .slice(0, 4);
  const hour = Number(
    new Intl.DateTimeFormat("pt-PT", {
      timeZone: "Europe/Lisbon",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  ctx.render(
    `<div class="dashboard-greeting"><div><p class="eyebrow">${ctx.league.cycle.weekId} / ${ctx.league.cycle.phase === "closed" ? "CARTAS FECHADAS" : "A TUA COMUNIDADE"}</p><h1>${hour < 12 ? "Bom dia" : hour < 19 ? "Boa tarde" : "Boa noite"}, ${esc(ctx.user.displayName || ctx.user.username)}.</h1><p>Pronto para mais uma Peladinha?</p></div>${["admin", "dbs"].includes(ctx.user.role) ? linkButton("#/game/new", "Criar jogo", "secondary", "plus") : ""}</div>${cardSelectionEntry(me)}${installSpotlight()}<section class="weekly-section"><div class="section-head"><div><p class="eyebrow">Os destaques da liga</p><h2>No topo da liga</h2></div></div><div id="home-podium"></div></section>${casinoSpotlight()}<div class="dashboard-columns">${homeCardPanel(me, ctx.league)}<section class="panel dashboard-missions content-stack"><div class="section-head"><h2>As tuas missões</h2><span class="pill">${pendingMissions.length} ${pendingMissions.length === 1 ? "pendente" : "pendentes"}</span></div>${missionList(visibleMissions)}${pendingMissions.length > 4 ? `<div class="missions-toolbar">${linkButton("#/missions", "Ver todas as missões", "secondary")}</div>` : ""}</section></div><section><div class="section-head"><h2>Últimas Peladinhas</h2>${linkButton("#/games", "Todos os jogos", "ghost")}</div>${ctx.league.games.length ? gameRows(ctx.league.games.slice(0, 3)) : empty("O próximo jogo começa aqui", ["admin", "dbs"].includes(ctx.user.role) ? "Cria uma Peladinha e reúne os teus colegas." : "Assim que a liga marcar uma Peladinha, encontras aqui as equipas e os detalhes.", ["admin", "dbs"].includes(ctx.user.role) ? linkButton("#/game/new", "Criar jogo", "primary", "plus") : "", "games")}</section>`,
  );
  const main = document.querySelector("#main");
  bindMissionClaims(ctx, main);
  main
    .querySelector(".dashboard-greeting")
    .insertAdjacentHTML("afterend", homePushInvitation());
  bindPushSettings(main);
  ctx.cleanup(bindInstallSpotlight(main));
  ctx.cleanup(mountHomePodium(main.querySelector("#home-podium"), players));
  if (ctx.homeSnapshot && typeof DB.watchHomeSignals === "function") {
    const owner = currentUser.uid, session = authSession;
    ctx.cleanup(startRevisionUpdates({
      versions: ctx.homeSnapshot.versions, validUntil: ctx.homeSnapshot.validUntil,
      isCurrent: () => currentUser?.uid === owner && authSession === session && (!location.hash || location.hash === "#/" || location.hash === "#"),
      subscribe: (changed, error) => DB.watchHomeSignals(owner, changed, error),
      refresh: async valid => {
        let snapshot;
        try { snapshot = await DB.getHome(); }
        catch (error) {
          if (!valid()) return;
          if (error.code === "functions/unauthenticated") return logout();
          if (error.code === "functions/permission-denied") {
            await ctx.updateData({ homeOnly: false });
            if (valid()) await route({ cachedOnly: true });
            return;
          }
          throw error;
        }
        if (!valid()) return;
        setPolicyDocument(snapshot.policyDocument);
        ctx.realUser = snapshot.user; ctx.user = perspectiveUser(snapshot.user);
        ctx.league = snapshot.league; ctx.missions = snapshot.missions;
        ctx.homeSnapshot = snapshot; ctx.leagueKind = "home"; ctx.loadedAt = ctx.homeTime = Date.now();
        await route({ cachedOnly: true });
        return snapshot;
      },
    }));
  }
}
function playersPage() {
  ctx.render(
    `${pageHead("A comunidade", "Jogadores", "Cada carta tem uma história. As setas verdes e vermelhas mostram a variação face à semana anterior.", progressionGuideLink())}<div class="filters panel"><label class="search-field">Procurar<input id="search" placeholder="Nome ou username"></label><label>Ordenar<select id="sort"><option value="ovr">OVR</option><option value="name">Nome</option>${ATTRIBUTES.map(([key, name]) => `<option value="${key}">${esc(name)}</option>`).join("")}</select></label><label>Por<select id="sort-direction"><option value="desc">Decrescente</option><option value="asc">Crescente</option></select></label></div><div id="player-grid" class="card-grid"></div>`,
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
  const players = componentWeeklyTopPlayers(
    ctx.league.players.filter((p) => p.hasCard),
  );
  ctx.render(
    `${pageHead(isoWeek(), "Ranking semanal", "Média dos jogos desde o último fecho semanal, com pelo menos 2 avaliações válidas; desempate por OVR. Sem avaliações, o OVR serve de referência.")}<div class="ranking-list">${players.map((p, i) => `<a class="ranking-row panel" href="#/player/${p.uid}"><span class="ranking-number">${i + 1}</span><img src="${esc(safeImage(p.photoURL))}" alt="" data-fallback="${ASSET_PATHS.avatar}"><div><b>${esc(p.displayName || p.username)}</b><small>${themeName(p.cardType)}</small></div><div><small>OVR</small><b>${p.ovr}</b></div><div><small>Forma semanal</small><b>${matchAverageSummary(p.weeklyComponentAverages,{digits:2})}</b></div>${icon("arrow")}</a>`).join("") || empty("A classificação começa contigo", "Conclui a autoavaliação para criares a tua carta.", linkButton("#/missions", "Missões"), "trophy")}</div>`,
  );
}
async function route({ cachedOnly = false } = {}) {
  const turn = ++routeNumber;
  const routeHash = location.hash;
  const isCurrent = () => turn === routeNumber && location.hash === routeHash;
  let rendered = false;
  let loadingTimer;
  const pageCtx = Object.create(ctx);
  pageCtx.render = (html) => {
    if (!isCurrent())
      throw Object.assign(new Error("Navigation superseded"), {
        code: "navigation-cancelled",
      });
    rendered = true;
    clearTimeout(loadingTimer);
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
  pageCtx.invalidateLeague = () => { ctx.league = null; ctx.fullCache = null; ctx.loadedAt = 0; ctx.detailCache.clear(); };
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
    try {setPolicyDocument(await DB.read("settings/system"));await Firebase.configureAppCheck?.(policyAt());}catch {}
    syncPushIdentity(null).catch(() => {});
    ctx.user = null;
    ctx.realUser = null;
    ctx.league = null;
    ctx.missions = [];
    ctx.notifications = [];
    ctx.loadedAt = 0;
    header();
    authPage(ctx);
    return;
  }
  // The casino needs identity and its own wallet, never league scans,
  // card recalculation or mission/notification subscriptions.
  if (['#/casino', '#/shop'].includes(location.hash)) {
    setMain(skeleton());
    try {
      const [user, casinoPolicy] = await Promise.all([
        loadProfile(), ctx.cached('casino-policy', () => DB.read('settings/system')),
      ]);
      if (!isCurrent()) return;
      setPolicyDocument(casinoPolicy);
      await Firebase.configureAppCheck?.(policyAt());
      if (!isCurrent()) return;
      ctx.realUser = user;
      ctx.user = user;
      header();
      if (!user || user.disabled) {
        pageCtx.render(empty('Conta indisponível', 'Contacta o apoio da liga.', '', 'shield'));
        return;
      }
      const casinoTask = location.hash === '#/shop' ? casinoShopPage(pageCtx) : casinoPage(pageCtx);
      if (isCurrent()) {
        document.title = `${location.hash === '#/shop' ? 'Loja' : 'Casino'} · Peladinhas Cards`;
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.querySelector('#main').focus({ preventScroll: true });
      }
      await casinoTask;
    } catch (error) {
      if (isCurrent()) errorPage(error, route);
    }
    return;
  }
  const homeOnly = !location.hash || location.hash === "#/" || location.hash === "#";
  const useHome = homeOnly && typeof DB.getHome === "function" && !ctx.homeUnavailable;
  const cached = ctx.league && ctx.realUser?.uid === currentUser.uid && (useHome ? ctx.leagueKind === "home" : ctx.leagueKind !== "home");
  if (!cached) setMain(skeleton());
  try {
    if (!cached) await ctx.updateData({ homeOnly });
    else {
      ctx.user = perspectiveUser(ctx.realUser);
      if (!cachedOnly && Date.now() - ctx.loadedAt > 30000) {
        ctx
          .updateData()
          .then(() => {
            if (
              isCurrent() &&
              (!ctx.user ||
                ctx.user.disabled ||
                (location.hash.startsWith("#/admin") &&
                  ctx.user.role !== "admin"))
            ) {
              return route({ cachedOnly: true });
            }
            // Refresh read-only destinations without replacing a form in use.
            if (
              isCurrent() &&
              !document.activeElement?.closest(
                "#main input, #main select, #main textarea",
              ) &&
              /^#\/(?:players|ranking|statistics|missions|notifications)?$/.test(
                location.hash,
              )
            ) {
              route({ cachedOnly: true });
            }
          })
          .catch(() => {});
      }
    }
    if (turn !== routeNumber) return;
    if ((!homeOnly && ctx.leagueKind === "home") || (useHome && !ctx.homeUnavailable && ctx.leagueKind !== "home")) {
      await ctx.updateData({ homeOnly });
      if (turn !== routeNumber) return;
    }
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
    // Cached destinations paint in the same turn. Only show a placeholder
    // when a destination really needs an uncached network request.
    loadingTimer = setTimeout(() => {
      if (isCurrent() && !rendered) setMain(skeleton());
    }, 150);
    const parts = (location.hash || "#/").slice(2).split("/").filter(Boolean);
    const adminCapability = adminAreaCapability(parts[1]);
    if (parts[0] === "admin" && (ctx.user.role !== "admin" || adminCapability && !canManage(ctx.user,adminCapability)))
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
    } else if (parts[0] === "players") parts[1] === "cards" ? cardCatalogPage(pageCtx) : parts[1] === "evolution" ? progressionGuidePage(pageCtx) : playersPage();
    else if (parts[0] === "player") await playerPage(pageCtx, parts[1]);
    else if (parts[0] === "profile")
      parts[1] === "edit"
        ? await editProfile(pageCtx)
        : await playerPage(pageCtx, ctx.user.uid);
    else if (parts[0] === "games") gamesPage(pageCtx);
    else if (parts[0] === "game")
      parts[2] === "feedback"
        ? await feedbackPage(pageCtx, parts[1], parts[3] === "edit")
        : await gamePage(pageCtx, parts[1], { edit: parts[2] === "edit" });
    else if (parts[0] === "events") await eventsPage(pageCtx);
    else if (parts[0] === "event") await eventPage(pageCtx, parts[1]);
    else if (parts[0] === "missions") {
      if (parts[1] === "path") await pathsPage(pageCtx, parts[2]);
      else if (parts[1] === "self") await initialMission(pageCtx);
      else if (parts[1] === "new") await initialMission(pageCtx, parts[2]);
      else {
        ctx.render(
          `${pageHead("A tua evolução", "Missões", "Acompanha os teus objetivos e as avaliações por concluir.")}<div class="missions-workspace content-stack">${missionList(ctx.missions)}<div class="missions-toolbar">${linkButton("#/events", "Calendário e histórico de eventos", "secondary")}</div></div>`,
        );
        bindMissionClaims(pageCtx);
      }
    } else if (parts[0] === "notifications") notificationsPage(pageCtx);
    else if (parts[0] === "tickets") await ticketsPage(pageCtx, parts[1]);
    else if (parts[0] === "ranking") rankingPage();
    else if (parts[0] === "statistics") statisticsPage(pageCtx);
    else if (parts[0] === "admin") {
      if (parts[1] === "paths") await pathAdminPage(pageCtx);
      else if (parts[1] === "ovr") await ovrAuditPage(pageCtx, parts[2], parts[3]);
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
    bindImages();
    const title = document.querySelector("#main h1, #main .empty-state h3");
    document.title = `${title?.textContent.trim() || "A tua liga"} · Peladinhas Cards`;
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector("#main").focus({ preventScroll: true });
  } catch (error) {
    if (isCurrent()) errorPage(error, route);
  } finally {
    clearTimeout(loadingTimer);
  }
}
window.addEventListener("hashchange", route);
window.addEventListener("peladinhas-notification-read", (event) => {
  if (ctx.user?.uid !== event.detail.uid) return;
  const ids = new Set(event.detail.ids);
  ctx.notifications = ctx.notifications.map((notice) =>
    ids.has(notice.id) ? { ...notice, read: true } : notice,
  );
  header();
});
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
    () => {
      authSession++;
      ctx.refreshTask = null;
      ctx.detailCache.clear();
      ctx.league = null;
      ctx.homeSnapshot = null;
      ctx.fullCache = null;
      ctx.homeUnavailable = false;
      ctx.realUser = null;
      ctx.user = null;
      ctx.missions = [];
      ctx.notifications = [];
      return route();
    },
    (error) => errorPage(error, route),
  );
else route();
