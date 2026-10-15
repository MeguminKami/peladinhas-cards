import { icon } from "./icons.js";
import { esc } from "./ui.js";

// Add future administration areas here: navigation and dashboard share this catalog.
export const ADMIN_AREAS = [
  {
    id: "overview",
    href: "#/admin",
    label: "Visão geral",
    icon: "home",
    description: "Resumo e acessos rápidos à administração.",
  },
  {
    id: "players",
    href: "#/admin/players",
    label: "Jogadores",
    icon: "players",
    description: "Editar perfis, gerir administradores e consultar cartas.",
  },
  {
    id: "games",
    href: "#/admin/games",
    label: "Jogos",
    icon: "games",
    description: "Gerir jogos, equipas e resultados.",
  },
  {
    id: "weights",
    href: "#/admin/weights",
    label: "Pesos do OVR",
    icon: "lab",
    description: "Definir a percentagem de cada atributo no OVR.",
  },
  {
    id: "card-types",
    href: "#/admin/card-types",
    label: "Cartas",
    icon: "assets",
    description:
      "Consultar tipos de carta padrão e criados, com pré-visualização.",
  },
  {
    id: "cards",
    href: "#/admin/cards",
    label: "Card Lab",
    icon: "palette",
    description: "Experimentar cartas e criar temas personalizados.",
  },
  {
    id: "ratings",
    href: "#/admin/ratings",
    label: "Avaliações",
    icon: "edit",
    description: "Consultar votos e corrigir avaliações.",
  },
  {
    id: "support",
    href: "#/admin/support",
    label: "Tickets",
    icon: "tickets",
    description: "Responder aos tickets dos jogadores.",
  },
  {
    id: "messages",
    href: "#/admin/messages",
    label: "Mensagens",
    icon: "bell",
    description: "Enviar uma notificação a toda a liga.",
  },
  {
    id: "events",
    href: "#/admin/events",
    label: "Eventos e missões",
    icon: "trophy",
    description: "Criar desafios, configurar prémios e auditar resultados.",
  },
  {
    id: "maintenance",
    href: "#/admin/maintenance",
    label: "Manutenção",
    icon: "shield",
    description: "Recalcular as cartas e o histórico da liga.",
  },
];
export function adminDashboard() {
  return `<section><div class="section-head"><h2>Gerir a liga</h2></div><div class="admin-area-grid">${ADMIN_AREAS.filter(
    (a) => a.id !== "overview",
  )
    .map(
      (a) =>
        `<a class="panel admin-area-card" href="${a.href}"><span class="admin-area-icon">${icon(a.icon)}</span><div><h3>${esc(a.label)}</h3><p>${esc(a.description)}</p></div>${icon("arrow", "admin-area-arrow")}</a>`,
    )
    .join("")}</div></section>`;
}
export function mountAdminMenu() {
  const section = location.hash.slice(2).split("/")[1] || "overview";
  const selected = ["player", "initial", "ovr", "card-photo"].includes(section)
    ? "players"
    : section;
  const html = `<nav class="admin-area-nav" aria-label="Menu de administração">${ADMIN_AREAS.map((a) => `<a href="${a.href}" ${a.id === selected ? 'class="active" aria-current="page"' : ""}>${icon(a.icon)}<span>${esc(a.label)}</span></a>`).join("")}</nav>`;
  document
    .querySelector("#main .page-head")
    ?.insertAdjacentHTML("afterend", html);
  const mobileSelect = document.createElement("label");
  mobileSelect.className = "admin-mobile-select";
  mobileSelect.innerHTML = `Área da liga<select aria-label="Área de administração">${ADMIN_AREAS.map((a) => `<option value="${a.href}" ${a.id === selected ? "selected" : ""}>${esc(a.label)}</option>`).join("")}</select>`;
  document.querySelector(".admin-area-nav")?.after(mobileSelect);
  mobileSelect.querySelector("select").onchange = (event) => {
    location.hash = event.target.value;
  };
}
