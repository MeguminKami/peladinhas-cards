import { modal, esc } from "./ui.js";
import { icon } from "./icons.js";

const KEY = "peladinhas-interface-theme";
export const INTERFACE_THEMES = [
  {
    id: "club",
    name: "Club Original",
    description:
      "Preto azulado e verde relvado. A identidade original da liga.",
    colors: ["#080b10", "#161d27", "#42e66c"],
  },
  {
    id: "volt",
    name: "Volt Arena",
    description:
      "Violeta profundo e lima eléctrico. Energia dos menus de futebol modernos.",
    colors: ["#100b24", "#281c44", "#d5ff45"],
  },
  {
    id: "champions",
    name: "Champions Night",
    description:
      "Azul meia-noite e ciano luminoso. Ambiente de grandes noites europeias.",
    colors: ["#071321", "#142e49", "#57ddff"],
  },
  {
    id: "ultimate",
    name: "Ultimate 20",
    description:
      "Cinzento de estádio, grafite, coral e ciano. A energia dos menus FUT 20, com raridades bem definidas.",
    colors: ["#949a9e", "#ff4b62", "#252e35", "#42dce0"],
  },
];
let current = "club";
try {
  const saved = localStorage.getItem(KEY);
  if (INTERFACE_THEMES.some((theme) => theme.id === saved)) current = saved;
} catch {
  /* A preferência também funciona sem armazenamento disponível. */
}

export function applyTheme(id) {
  const theme = INTERFACE_THEMES.find((item) => item.id === id);
  if (!theme) return;
  current = id;
  document.documentElement.dataset.theme = id;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme.colors[0]);
  document
    .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', id === 'ultimate' ? 'default' : 'black-translucent');
  try {
    localStorage.setItem(KEY, id);
  } catch {}
}
applyTheme(current);

export function bindThemePicker(header) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-icon btn-ghost";
  button.id = "theme-picker";
  button.setAttribute("aria-label", "Escolher tema de cores");
  button.setAttribute("aria-haspopup", "dialog");
  button.title = "Temas de cores";
  button.innerHTML = icon("palette");
  const bell = header.querySelector("#header-tickets") || header.querySelector("#bell");
  if (bell) bell.before(button);
  else header.querySelector(".navbar")?.append(button);
  button.onclick = () => {
    modal(
      "Tema de cores",
      `<p class="muted">Escolhe o ambiente da tua liga. Esta preferência fica apenas neste browser; não altera a raridade das cartas.</p><div class="theme-options">${INTERFACE_THEMES.map((theme) => `<button type="button" class="theme-option" data-interface-theme="${theme.id}" aria-pressed="${theme.id === current}"><span class="theme-swatches" aria-hidden="true">${theme.colors.map((color) => `<i style="background:${color}"></i>`).join("")}</span><span><strong>${esc(theme.name)}</strong><small>${esc(theme.description)}</small></span><span class="theme-check" aria-hidden="true">${icon("check")}</span></button>`).join("")}</div>`,
    );
    const root = document.querySelector("#modal-root");
    root.querySelectorAll("[data-interface-theme]").forEach((option) => {
      option.onclick = () => {
        applyTheme(option.dataset.interfaceTheme);
        root
          .querySelectorAll("[data-interface-theme]")
          .forEach((item) =>
            item.setAttribute(
              "aria-pressed",
              String(item.dataset.interfaceTheme === current),
            ),
          );
      };
    });
  };
}
