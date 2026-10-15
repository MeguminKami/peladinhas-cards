import { icon } from "./icons.js";
import { esc, modal } from "./ui.js";

export function activeDestination(href, hash = location.hash || "#/") {
  if (href === "#/") return hash === "#/";
  if (href === "#/players") return /^#\/(players|player)(\/|$)/.test(hash);
  if (href === "#/games") return /^#\/(games|game)(\/|$)/.test(hash);
  if (href === "#/missions")
    return /^#\/(missions|events|event)(\/|$)/.test(hash);
  return hash === href || hash.startsWith(href + "/");
}

export function mobileNavigation(user, pending) {
  return `<nav class="bottom-nav" aria-label="Navegação mobile">${[
    ["#/", "home", "Início"],
    ["#/players", "players", "Jogadores"],
    ["#/games", "games", "Jogos"],
    ["#/missions", "missions", "Missões"],
  ]
    .map(
      ([href, symbol, label]) =>
        `<a href="${href}" ${activeDestination(href) ? 'class="active" aria-current="page"' : ""}>${icon(symbol)}<span>${label}</span>${symbol === "missions" && pending ? '<i class="nav-dot" aria-hidden="true"></i>' : ""}</a>`,
    )
    .join(
      "",
    )}<button type="button" id="mobile-more" aria-haspopup="dialog" class="${/^#\/(statistics|ranking|tickets|profile|admin|assets|notifications)(\/|$)/.test(location.hash) ? "active" : ""}">${icon("menu")}<span>Mais</span></button></nav>`;
}

export function bindMobileNavigation(user) {
  document.querySelector("#mobile-more")?.addEventListener("click", () => {
    const entries = [
      ["#/profile", "profile", "O meu perfil", "A tua carta, forma e evolução"],
      ["#/statistics", "trophy", "Estatísticas", "Os números de toda a liga"],
      ["#/ranking", "trophy", "Ranking semanal", "Quem está em destaque"],
      [
        "#/events",
        "missions",
        "Eventos e desafios",
        "Calendário, objetivos e recompensas",
      ],
      ["#/tickets", "tickets", "Apoio à liga", "Os teus pedidos e conversas"],
      ...(user.role === "admin"
        ? [
            [
              "#/admin",
              "shield",
              "Administração",
              "Gerir jogadores, jogos e cartas",
            ],
          ]
        : []),
    ];
    const close = modal(
      "A tua liga",
      `<p class="subtitle">Tudo o que faz parte das Peladinhas.</p><div class="more-menu">${entries.map(([href, symbol, label, detail]) => `<a href="${href}" ${activeDestination(href) ? 'aria-current="page"' : ""}>${icon(symbol)}<span><strong>${esc(label)}</strong><small>${esc(detail)}</small></span>${icon("arrow")}</a>`).join("")}</div><div class="more-footer"><button type="button" id="menu-install" class="btn btn-secondary">Instalar aplicação</button><button type="button" id="menu-logout" class="btn btn-ghost">${icon("logout")}Terminar sessão</button></div>`,
    );
    document
      .querySelectorAll(".more-menu a")
      .forEach((a) => a.addEventListener("click", close));
    document.querySelector("#menu-logout").onclick = () => {
      close();
      document.querySelector("#logout")?.click();
    };
    document.querySelector("#menu-install").onclick = () => {
      close();
      window.dispatchEvent(new Event("peladinhas-install"));
    };
  });
}
