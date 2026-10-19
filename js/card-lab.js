import {
  STUDIO_SHAPES,
  STUDIO_ORNAMENTS,
  STUDIO_ORNAMENT_GROUPS,
  STUDIO_SYMBOLS,
} from "./card-studio-elements.js";
import { enhanceCardLabInterface } from "./card-lab-interface.js";
import {
  cardSymbol,
  fitCardSymbols,
  normalizeSymbolPosition,
} from "./card-symbol.js";
import { SPECIAL_CARD_DESIGNS } from "./card-specials.js";
import * as DB from "./db.js";
import {
  CATALOG_THEMES,
  informTheme,
  ATTRIBUTES,
  themeName,
  clamp,
} from "./utils.js";
import { esc, pageHead, linkButton, busy, toast, empty } from "./ui.js";
import { icon } from "./icons.js";
import { card, bindImages } from "./cards.js";
import {
  DESIGN_FIELDS,
  DESIGN_CHOICES,
  applyCardDesign,
  cardTemplateDesign,
  validCardDesign,
} from "./card-design.js";
import {
  STUDIO_FONTS,
  STUDIO_BACKGROUNDS,
  STUDIO_PALETTES,
  STUDIO_EFFECTS,
  STUDIO_WATERMARKS,
  STUDIO_BORDERS,
  STUDIO_LAYOUTS,
  DECORATION_ART,
  WATERMARK_ART,
} from "./card-studio-catalog.js";
const defaults = () => ({
  ...Object.fromEntries(DESIGN_FIELDS.map(([k, , , , v]) => [k, v])),
  ...Object.fromEntries(
    Object.entries(DESIGN_CHOICES).map(([k, v]) => [k, v[0]]),
  ),
  nameY: 57,
  statsY: 67,
  ratingX: 10,
  ratingY: 12,
  nameFont: "original",
  ratingFont: "original",
  statsFont: "original",
  labelsFont: "original",
  positionFont: "original",
});
const ratingPresets = {
  topLeft: ["Um pouco acima e à esquerda", 9, 11, -135],
  up: ["Um pouco acima", 10, 11, -90],
  topRight: ["Um pouco acima e à direita", 11, 11, -45],
  left: ["Um pouco à esquerda", 9, 12, 180],
  original: ["Posição original", 10, 12, null],
  right: ["Um pouco à direita", 11, 12, 0],
  bottomLeft: ["Um pouco abaixo e à esquerda", 9, 13, 135],
  down: ["Um pouco abaixo", 10, 13, 90],
  bottomRight: ["Um pouco abaixo e à direita", 11, 13, 45],
};
export async function cardLab(ctx, uid) {
  if (ctx.user?.role !== "admin") {
    ctx.render(
      empty(
        "Acesso reservado",
        "O Card Lab está disponível para ADMIN.",
        "",
        "shield",
      ),
    );
    return;
  }
  const players = ctx.league.players,
    experimental = await DB.list("cardThemes"),
    selected = players.find((p) => p.uid === ctx.user.uid) || ctx.user,
    adminPhoto = selected.photoURL || ctx.user.photoURL || "";
  const sample = {
    uid: "preview",
    displayName: "O teu craque",
    countryCode: "PT",
    primaryPosition: "ALA",
    photoURL: adminPhoto,
    hasCard: true,
    ovr: 82,
    stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 82])),
  };
  const base = selected || sample,
    designDefaults = defaults();
  const elementPreview = (key, value) => {
    const element =
      SPECIAL_CARD_DESIGNS[
        key === "decoration" ? value.replace(/^edition-/, "") : value
      ];
    if (key === "symbol")
      return value === "none"
        ? "—"
        : cardSymbol(element.motif, "studio-element-symbol");
    if (!element) return "";
    if (key === "shape")
      return `<svg class="studio-shape-art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="${element.outline}" fill="currentColor"/></svg>`;
    if (key === "decoration" && !element.art)
      return cardSymbol(element.motif, "studio-element-symbol");
    if (key === "decoration")
      return `<svg class="collection-art studio-ornament-art" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">${element.art || element.motif}</svg>`;
    return "";
  };
  const gallery = (key, catalog, kind = "") =>
    `<div class="studio-gallery ${kind}">${Object.entries(catalog)
      .map(
        ([value, entry]) =>
          `<button type="button" class="studio-choice" data-studio-choice="${key}" data-value="${value}" aria-pressed="false"><span class="studio-sample sample-${key} sample-${value}${(key === "shape" && SPECIAL_CARD_DESIGNS[value]) || (key === "decoration" && value.startsWith("edition-")) || key === "symbol" ? " studio-element-preview" : ""}" ${key === "background" ? `style="background:${STUDIO_BACKGROUNDS[value][1] === "none" ? "var(--studio-primary)" : STUDIO_BACKGROUNDS[value][1]};${["dots", "halftone"].includes(value) ? "background-size:10px 10px,100% 100%" : ""}"` : ""}>${elementPreview(key, value) || (key === "decoration" && DECORATION_ART[value] ? `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${DECORATION_ART[value]}</svg>` : key === "watermark" && WATERMARK_ART[value] ? `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">${WATERMARK_ART[value]}</svg>` : key === "watermark" ? "—" : "")}</span><small>${esc(Array.isArray(entry) ? entry[0] : entry)}</small></button>`,
      )
      .join("")}</div>`;
  const picker = (key, label, values) =>
    `<label>${label}<select data-studio-property="${key}">${Object.entries(
      values,
    )
      .map(
        ([v, n]) =>
          `<option value="${v}" ${String(designDefaults[key]) === v ? "selected" : ""}>${esc(n)}</option>`,
      )
      .join("")}</select></label>`;
  const fontSize = (key, label) =>
    picker(
      key,
      label,
      Object.fromEntries(
        [75, 90, 100, 110, 125, 140].map((v, i) => [
          v,
          [
            "Muito pequeno",
            "Pequeno",
            "Normal",
            "Médio",
            "Grande",
            "Muito grande",
          ][i],
        ]),
      ),
    );
  ctx.render(`${pageHead("Card Lab", "Card Lab", "A tua bancada de criação. Do primeiro traço ao último brilho.", linkButton("#/admin", "Administração", "ghost"))}
  <div class="studio-project-bar panel"><label>Projeto<input form="lab-controls" name="themeName" value="A minha carta" maxlength="40"></label><div class="actions"><button type="button" id="lab-undo" class="btn btn-ghost" aria-label="Desfazer">↶</button><button type="button" id="lab-redo" class="btn btn-ghost" aria-label="Refazer">↷</button><button type="button" id="lab-export" class="btn btn-secondary">${icon("arrow")}Exportar projeto</button><label class="btn btn-secondary studio-import">${icon("assets")}Importar<input type="file" id="lab-import" accept="application/json,.json" class="visually-hidden"></label><button type="button" id="save-theme" class="btn btn-primary">${icon("check")}Guardar composição</button></div></div>
  <div class="lab-layout studio-layout"><form id="lab-controls" class="studio-inspector panel"><nav class="studio-tabs" aria-label="Ferramentas de criação">${[
    ["models", "Modelos", "rewardCard"],
    ["composition", "Composição", "assets"],
    ["colors", "Cores", "palette"],
    ["layers", "Materiais", "lab"],
    ["symbols", "Símbolos", "shield"],
    ["text", "Texto", "edit"],
    ["photo", "Foto", "camera"],
  ]
    .map(
      ([id, label, symbol]) =>
        `<button type="button" data-studio-tab="${id}" aria-pressed="${id === "models"}">${icon(symbol)}<span>${label}</span></button>`,
    )
    .join("")}</nav>
  ${Object.entries(designDefaults)
    .map(
      ([key, value]) => `<input type="hidden" name="${key}" value="${value}">`,
    )
    .join("")}<input type="hidden" name="texture" value="plain">
  <section data-studio-panel="models"><h2>Começa por um modelo</h2><p class="studio-help">Escolhe um ponto de partida. Depois combina as peças.</p><label>Estilo base<select name="theme">${[...CATALOG_THEMES, "custom-test"].map((t) => `<option value="${t}" ${t === "gold-rare" ? "selected" : ""}>${t === "custom-test" ? "Livre" : themeName(t)}</option>`).join("")}${experimental.map((t) => `<option value="saved:${esc(t.id)}">${esc(t.name)} · guardado</option>`).join("")}</select></label></section><section data-studio-panel="composition" hidden><h2>Forma e composição</h2><p class="studio-help">Define a silhueta e organiza os elementos da carta.</p><h3>Composição</h3>${gallery("layout", Object.fromEntries(Object.entries(STUDIO_LAYOUTS).map(([k, v]) => [k, v[0]])))}<h3>Forma</h3>${gallery("shape", STUDIO_SHAPES)}</section>
  <section data-studio-panel="colors" hidden><h2>A cor da tua carta</h2><p class="studio-help">50 combinações de cores. Fundos em duas cores, com texto, moldura e luz a combinar.</p><div class="studio-palette-grid">${Object.entries(
    STUDIO_PALETTES,
  )
    .map(
      ([id, [name, colors]]) =>
        `<button type="button" data-studio-palette="${id}" aria-label="Paleta ${esc(name)}"><span>${colors
          .map((c) => `<i style="background:${c}"></i>`)
          .join("")}</span><small>${name}</small></button>`,
    )
    .join("")}</div><div class="studio-colors">${[
    ["color1", "Principal", "#9c6414"],
    ["color2", "Secundária", "#f4d891"],
    ["textColor", "Texto", "#211b13"],
    ["borderColor", "Moldura", "#fff0b4"],
    ["glowColor", "Luz", "#f0c45b"],
  ]
    .map(
      ([key, label, color]) =>
        `<label>${label}<input type="color" name="${key}" value="${color}"></label>`,
    )
    .join(
      "",
    )}</div></section><section data-studio-panel="layers" hidden><h2>Superfície e luz</h2><p class="studio-help">Combina a distribuição da cor com o acabamento.</p><details open><summary>Fundos</summary>${gallery("background", STUDIO_BACKGROUNDS)}</details><details><summary>Detalhes</summary>${STUDIO_ORNAMENT_GROUPS.map(([label, ids]) => `<section class="studio-element-category" aria-label="${esc(label)}"><h3>${esc(label)}</h3>${gallery("decoration", Object.fromEntries(ids.map((id) => [id, STUDIO_ORNAMENTS[id]])))}</section>`).join("")}</details><details><summary>Acabamento</summary>${gallery("effect", STUDIO_EFFECTS)}</details><details><summary>Molduras</summary>${gallery("border", STUDIO_BORDERS)}</details></section><section data-studio-panel="symbols" hidden><h2>Símbolos e assinaturas</h2><p class="studio-help">Combina símbolos, marcas de água e posições.</p><details open><summary>Marcas de água</summary>${gallery("watermark", STUDIO_WATERMARKS)}<div class="studio-two-col">${picker("watermarkPosition", "Posição", { center: "Centro", top: "Superior", bottom: "Inferior", corner: "Canto" })}${picker("watermarkOpacity", "Intensidade", { 10: "Discreta", 20: "Suave", 35: "Visível", 50: "Forte", 65: "Muito forte" })}</div></details></section>
  <section data-studio-panel="text" hidden><h2>Tipografia</h2><p class="studio-help">Vê cada alteração diretamente na carta. DIN Pro e Posterama usam as fontes instaladas neste computador.</p><fieldset class="studio-type-group"><legend>Fundo do nome</legend><p class="studio-help">Escolhe a cor RGB da faixa. Com 100% de transparência, o fundo desaparece.</p><div class="studio-two-col">${[
    ["nameBackgroundRed", "Vermelho (R)"],
    ["nameBackgroundGreen", "Verde (G)"],
    ["nameBackgroundBlue", "Azul (B)"],
  ]
    .map(
      ([key, label]) =>
        `<label>${label}<input type="number" data-studio-property="${key}" min="0" max="255" step="1" value="0"></label>`,
    )
    .join(
      "",
    )}</div><label>Transparência · <output id="name-background-transparency">100%</output><input type="range" data-studio-property="nameBackgroundTransparency" min="0" max="100" step="1" value="100"></label></fieldset>${[
    ["nameFont", "nameSize", "Nome"],
    ["ratingFont", "ratingSize", "Número OVR"],
    ["statsFont", "statsSize", "Números dos atributos"],
    ["labelsFont", "labelsSize", "Legendas"],
    ["positionFont", "positionSize", "Posição"],
  ]
    .map(
      ([font, size, label]) =>
        `<fieldset class="studio-type-group"><legend>${label}</legend><div class="studio-two-col">${picker(font, "Fonte", Object.fromEntries(Object.entries(STUDIO_FONTS).map(([k, v]) => [k, v[0]])))}${fontSize(size, "Tamanho")}</div></fieldset>`,
    )
    .join(
      "",
    )}<div class="studio-two-col">${fontSize("countrySize", "Bandeira")}${fontSize("badgeSize", "Emblema especial")}</div><h3>Elementos visíveis</h3><div class="studio-two-col">${[
    ["showPhoto", "Fotografia"],
    ["showStats", "Stats"],
    ["showRating", "OVR"],
    ["showPlaystyles", "Playstyles"],
  ]
    .map(([key, label]) =>
      picker(key, label, { yes: "Mostrar", no: "Ocultar" }),
    )
    .join("")}</div></section>
  <section data-studio-panel="photo" hidden><h2>Fotografia</h2><p class="studio-help">A tua fotografia de perfil é usada automaticamente.</p><input name="photoURL" type="hidden" value="${esc(adminPhoto)}"><div class="studio-photo-tools">${[
    ["move", "Mover", "arrow"],
    ["size", "Tamanho", "assets"],
    ["zoom", "Ampliação", "plus"],
  ]
    .map(
      ([id, label, symbol]) =>
        `<button type="button" data-photo-tool="${id}" aria-pressed="${id === "move"}">${icon(symbol)}${label}</button>`,
    )
    .join(
      "",
    )}</div><p class="studio-help" id="photo-tool-help">Arrasta a fotografia na carta para a mover.</p><label>Tamanho<input type="range" data-photo-range="size" min="35" max="130" value="65" aria-label="Tamanho da fotografia"></label><label>Ampliar<input type="range" data-photo-range="zoom" min="50" max="200" value="100" aria-label="Ampliação da fotografia"></label><label>Rotação<input type="range" data-photo-range="rotate" min="-45" max="45" value="0" aria-label="Rotação da fotografia"></label><div class="studio-two-col">${picker("fit", "Enquadramento", { cover: "Preencher", contain: "Imagem completa" })}${picker("fade", "Recorte", { soft: "Desvanecer", none: "Sem efeito" })}${picker("photoOpacity", "Opacidade", { 100: "Total", 75: "Suave", 50: "Transparente" })}${picker("saturation", "Cor", { 0: "Preto e branco", 65: "Suave", 100: "Original", 140: "Viva", 180: "Intensa" })}</div><div class="actions"><button type="button" id="lab-center-photo" class="btn btn-secondary">Centrar fotografia</button><button type="button" id="lab-reset" class="btn btn-ghost">Repor composição</button></div></section>
  <div hidden><input name="player" value="${selected?.uid || ""}"><input name="displayName" value="${esc(base.displayName || base.username)}"><input name="ovr" value="${base.ovr || 82}"><input name="primaryPosition" value="${base.primaryPosition || "ALA"}"><input name="countryCode" value="${base.countryCode || "PT"}">${ATTRIBUTES.map(([key]) => `<input name="${key}" value="${base.stats?.[key] ?? 82}">`).join("")}</div></form>
  <section class="lab-preview studio-stage"><div class="studio-stage-head"><span class="pill">Pré-visualização</span><span id="studio-selection-label">Modelo livre</span><button type="button" id="studio-center" class="btn btn-secondary studio-center">${icon("studioOutline")}Centrar editor</button></div><div id="card-preview" class="studio-canvas"></div><div class="studio-stage-footer"><span>PELADINHAS / CARD STUDIO</span><span id="studio-change-state" aria-live="polite"></span></div></section></div>`);
  const form = document.querySelector("#lab-controls"),
    preview = document.querySelector("#card-preview"),
    history = [],
    tools = { tab: "models", photo: "move" };
  form.insertAdjacentHTML(
    "afterbegin",
    '<input type="hidden" name="projectId" value="">',
  );
  document
    .querySelector(".studio-project-bar")
    .insertAdjacentHTML(
      "afterend",
      `<section class="studio-library panel"><div><span class="eyebrow">BIBLIOTECA DO ADMIN</span><h2>As tuas composições</h2><p id="studio-project-status" role="status">Nova composição</p></div><label>Editar composição guardada<select id="studio-saved-project"><option value="">Selecionar composição</option></select></label><div class="actions"><button type="button" class="btn btn-secondary" id="lab-new-project">${icon("plus")}Nova composição</button><button type="button" class="btn btn-secondary" id="save-theme-copy" hidden>${icon("assets")}Guardar uma cópia</button></div></section>`,
    );
  const library = document.querySelector("#studio-saved-project");
  const refreshLibrary = () => {
    const selected = form.elements.projectId.value;
    library.innerHTML =
      '<option value="">Selecionar composição</option>' +
      experimental
        .map(
          (theme) =>
            `<option value="${esc(theme.id)}" ${theme.id === selected ? "selected" : ""}>${esc(theme.name)}</option>`,
        )
        .join("");
  };
  refreshLibrary();
  const workspace = document.createElement("div");
  workspace.className = "studio-workspace";
  const main = form.closest("main");
  main.classList.add("card-lab-page");
  const bar = document.querySelector(".studio-project-bar");
  bar.before(workspace);
  workspace.append(bar, document.querySelector(".studio-layout"));
  const layout = workspace.querySelector(".studio-layout");
  const header = document.querySelector("#header");
  const bottomNav = document.querySelector(".bottom-nav");
  const sizeWorkbench = () => {
    main.style.setProperty(
      "--studio-top",
      `${(header?.getBoundingClientRect().height || 0) + 12}px`,
    );
    main.style.setProperty(
      "--studio-bottom",
      `${(bottomNav?.getBoundingClientRect().height || 0) + 12}px`,
    );
  };
  const workbenchResize = new ResizeObserver(sizeWorkbench);
  if (header) workbenchResize.observe(header);
  if (bottomNav) workbenchResize.observe(bottomNav);
  sizeWorkbench();
  document.querySelector("#studio-center").onclick = () => {
    sizeWorkbench();
    layout.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  ctx.cleanup(() => {
    workbenchResize.disconnect();
    main.style.removeProperty("--studio-top");
    main.style.removeProperty("--studio-bottom");
  });
  const libraryPanel = document.querySelector(".studio-library");
  libraryPanel.removeAttribute("class");
  libraryPanel.className = "studio-library";
  const projects = document.createElement("section");
  projects.dataset.studioPanel = "projects";
  projects.hidden = true;
  projects.append(libraryPanel);
  form.append(projects);
  libraryPanel.insertAdjacentHTML(
    "beforeend",
    '<div class="actions"><button type="button" class="btn btn-secondary" id="lab-project-export">Exportar JSON</button><label class="btn btn-secondary studio-import">Importar JSON<input type="file" id="lab-project-import" accept="application/json,.json" class="visually-hidden"></label></div>',
  );
  form
    .querySelector(".studio-tabs")
    .insertAdjacentHTML(
      "beforeend",
      `<button type="button" data-studio-tab="projects" aria-pressed="false">${icon("assets")}<span>Projetos</span></button>`,
    );
  ctx.cleanup(() => main.classList.remove("card-lab-page"));
  const models = form.querySelector('[data-studio-panel="models"]');
  const editionCatalog = document.createElement("section");
  editionCatalog.className = "studio-edition-catalog";
  editionCatalog.innerHTML = `<label>Procurar modelo<input type="search" id="studio-model-search" placeholder="Nome da carta…"></label><p id="studio-model-count" class="studio-help" role="status"></p><div class="studio-edition-grid">${[
    ["custom-test", { name: "Do zero" }],
    ...CATALOG_THEMES.map((id) => [id, { name: themeName(id) }]),
  ]
    .map(
      ([id, edition]) =>
        `<button type="button" class="studio-edition-choice" data-studio-edition="${id}" aria-pressed="false"><span class="studio-edition-preview" aria-hidden="true">${id === "custom-test" ? '<span class="studio-blank-model">+<small>Uma tela em branco</small></span>' : card(sample, { theme: id, preview: true, size: "sm" })}</span><strong>${esc(id === "custom-test" ? "Do zero" : themeName(id))}</strong></button>`,
    )
    .join("")}</div>`;
  models.querySelector('[name="theme"]').closest("label").hidden = true;
  models.append(editionCatalog);
  fitCardSymbols(models);
  const search = editionCatalog.querySelector("#studio-model-search");
  search.oninput = (event) => {
    event.stopPropagation();
    const query = search.value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    let count = 0;
    editionCatalog
      .querySelectorAll("[data-studio-edition]")
      .forEach((button) => {
        button.hidden = !button.textContent
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(query);
        if (!button.hidden) count++;
      });
    editionCatalog.querySelector("#studio-model-count").textContent = count
      ? count + " modelos"
      : "Sem resultados. Experimenta outro nome.";
  };
  search.oninput({ stopPropagation() {} });
  const sliders = (keys) =>
    '<div class="studio-adjustments">' +
    keys
      .map((key) => {
        const [, label, min, max, value] = DESIGN_FIELDS.find(
          ([id]) => id === key,
        );
        return `<label><span class="studio-range-label">${label}<output data-studio-readout="${key}">${value}</output></span><input type="range" data-studio-property="${key}" min="${min}" max="${max}" value="${value}"></label>`;
      })
      .join("") +
    "</div>";
  form.querySelector('[data-studio-panel="composition"] h3').insertAdjacentHTML(
    "beforebegin",
    '<fieldset class="studio-type-group studio-rating-presets"><legend>OVR + posição + país</legend><p class="studio-help">Ajustes mínimos em torno da posição original. A ordem e o espaçamento mantêm-se.</p><div class="studio-rating-options" role="group" aria-label="Posições do bloco, com um desvio de 1%">' +
      Object.entries(ratingPresets)
        .map(
          ([id, [label, , , angle]]) =>
            `<button type="button" class="btn btn-secondary" data-rating-preset="${id}" aria-label="${label}" title="${label}" aria-pressed="false">${angle === null ? icon("studioOutline") : `<span class="studio-rating-direction" style="--direction:${angle}deg">${icon("arrow")}</span>`}</button>`,
        )
        .join("") +
      "</div><details><summary>Afinar posição do bloco</summary>" +
      sliders(["ratingX", "ratingY"]) +
      "</details></fieldset>",
  );
  form
    .querySelector('[data-studio-panel="composition"]')
    .insertAdjacentHTML(
      "beforeend",
      sliders(["nameY", "statsY", "ornamentOpacity"]),
    );
  form
    .querySelector('[data-studio-panel="layers"]')
    .insertAdjacentHTML(
      "beforeend",
      '<section data-studio-surface-adjustments hidden><h3>Distribuição e intensidade</h3><p class="studio-help">Ajusta as cores do fundo e a intensidade do acabamento selecionado.</p>' +
        sliders([
          "backgroundAngle",
          "backgroundSpread",
          "backgroundX",
          "backgroundY",
          "effectIntensity",
        ]) +
        "</section>",
    );
  form.querySelector('[data-studio-panel="composition"]').insertAdjacentHTML(
    "beforeend",
    picker("statsColumns", "Colunas dos atributos", {
      4: "Quatro colunas",
      2: "Duas colunas",
    }) + sliders(["playstyleSize", "playstyleY"]),
  );
  form
    .querySelector('[data-studio-panel="photo"]')
    .insertAdjacentHTML(
      "beforeend",
      sliders([
        "photoX",
        "photoY",
        "photoWidth",
        "photoHeight",
        "focusX",
        "focusY",
      ]),
    );
  form
    .querySelector('[data-studio-panel="symbols"]')
    .insertAdjacentHTML(
      "beforeend",
      "<h3>Símbolos</h3>" +
        gallery("symbol", STUDIO_SYMBOLS) +
        sliders([
          "badgeX",
          "badgeY",
          "badgeSize",
          "badgeRotate",
          "badgeOpacity",
          "watermarkX",
          "watermarkY",
          "watermarkSize",
          "watermarkRotate",
        ]),
    );
  const materials = form.querySelector('[data-studio-panel="layers"]');
  const outline = materials.querySelectorAll("details")[3];
  outline.querySelector("summary").textContent = "Traçado junto ao perímetro";
  outline.insertAdjacentHTML(
    "beforeend",
    "<div data-studio-outline-adjustments>" +
      sliders(["borderWidth", "borderInset", "borderOpacity"]) +
      '</div><p class="studio-help">A cor do traçado está em Cores · Moldura.</p>',
  );
  materials.insertAdjacentHTML(
    "afterbegin",
    '<details open class="studio-light-controls"><summary>Iluminação</summary><p class="studio-help">Controla a luz sobre a carta e o brilho exterior. Escolhe a cor em Cores · Luz.</p>' +
      gallery("lighting", {
        original: "Luz original",
        on: "Luz dirigida",
        off: "Sem luz",
      }) +
      "<div data-studio-light-adjustments hidden>" +
      sliders(["lightIntensity", "lightAngle", "lightSoftness"]) +
      "</div></details>",
  );
  enhanceCardLabInterface(form, (fn) => ctx.cleanup(fn));
  form.querySelector('[data-studio-panel="text"] > .studio-help').textContent =
    "Original do modelo mantém a letra e as proporções da carta. Peladinhas Sans está incluída na aplicação. As fontes locais usam uma substituição quando não estão instaladas.";
  const localFonts = {
    dinRegular: "DIN Pro Condensed Regular",
    dinMedium: "DIN Pro Condensed Medium",
    dinBold: "DIN Pro Condensed Bold",
    posterama: "Posterama 1927 Bold",
  };
  for (const [id, name] of Object.entries(localFonts)) {
    document.fonts.load(`16px "${name}"`).then(
      (faces) => {
        labelFont(faces.length > 0);
      },
      () => labelFont(false),
    );
    function labelFont(available) {
      form.querySelectorAll(`option[value="${id}"]`).forEach((option) => {
        option.textContent = `${name} · ${available ? "instalada" : "substituição local"}`;
      });
    }
  }
  fitCardSymbols(form);
  let historyIndex = -1,
    timer,
    dragging;
  const fields = () => Object.fromEntries(new FormData(form));
  const readDesign = () =>
    Object.fromEntries([
      ...DESIGN_FIELDS.map(([key]) => [key, Number(form.elements[key].value)]),
      ...Object.keys(DESIGN_CHOICES).map((key) => [
        key,
        form.elements[key].value,
      ]),
    ]);
  const set = (key, value) => {
    if (key === "photoURL") value = adminPhoto;
    if (key === "theme" && value === "in-form")
      value = informTheme(base.cardType, base.ovr);
    const input = form.elements.namedItem(key);
    if (input) input.value = value;
  };
  const palette = (id) => {
    const colors = STUDIO_PALETTES[id][1];
    ["color1", "color2", "textColor", "borderColor", "glowColor"].forEach(
      (key, i) => set(key, colors[i]),
    );
  };
  const fitPreview = () => {
    const canvas = preview.getBoundingClientRect();
    const padding = getComputedStyle(preview);
    const width =
      canvas.width -
      parseFloat(padding.paddingLeft) -
      parseFloat(padding.paddingRight);
    const height =
      canvas.height -
      parseFloat(padding.paddingTop) -
      parseFloat(padding.paddingBottom);
    preview.firstElementChild?.style.setProperty(
      "--card-width",
      Math.max(50, Math.min(width, height * 0.67)) + "px",
    );
  };
  form
    .querySelector('[data-studio-panel="colors"] .studio-palette-grid')
    .before(form.querySelector(".studio-colors"));
  const resize = new ResizeObserver(fitPreview);
  resize.observe(preview);
  ctx.cleanup(() => resize.disconnect());
  const draw = () => {
    const normalized = normalizeSymbolPosition(readDesign());
    set("badgeX", normalized.badgeX);
    set("badgeY", normalized.badgeY);
    const f = fields(),
      saved = experimental.find((t) => `saved:${t.id}` === f.theme);
    document.querySelector("#name-background-transparency").value =
      `${f.nameBackgroundTransparency}%`;
    document.querySelector("#studio-selection-label").textContent =
      saved?.name ||
      (f.theme === "custom-test" ? "Do zero" : themeName(f.theme));
    const surfaceAdjustments = form.querySelector(
      "[data-studio-surface-adjustments]",
    );
    const customSurface = f.preserveOriginal !== "yes";
    const usable = {
      backgroundAngle:
        customSurface && ["diagonal", "split"].includes(f.background),
      backgroundSpread:
        customSurface && ["diagonal", "split", "radial"].includes(f.background),
      backgroundX: customSurface && f.background === "radial",
      backgroundY: customSurface && f.background === "radial",
      effectIntensity:
        customSurface && !["original", "none"].includes(f.effect),
    };
    for (const [key, visible] of Object.entries(usable))
      surfaceAdjustments
        .querySelector('[data-studio-property="' + key + '"]')
        .closest("label").hidden = !visible;
    surfaceAdjustments.hidden = !Object.values(usable).some(Boolean);
    form.querySelector("[data-studio-light-adjustments]").hidden =
      f.lighting !== "on";
    form.querySelector("[data-studio-outline-adjustments]").hidden =
      f.border === "none";

    const saveButton = document.querySelector("#save-theme");
    saveButton.innerHTML = `${icon("check")}${f.projectId ? "Guardar alterações" : "Guardar carta"}`;
    document.querySelector("#save-theme-copy").hidden = !f.projectId;
    document.querySelector("#studio-project-status").textContent = f.projectId
      ? `A editar: ${experimental.find((theme) => theme.id === f.projectId)?.name || f.themeName}`
      : "Nova composição";
    library.value = f.projectId || "";
    editionCatalog
      .querySelectorAll("[data-studio-edition]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(
            button.dataset.studioEdition === (saved?.baseTheme || f.theme),
          ),
        ),
      );
    const p = {
      ...(players.find((p) => p.uid === f.player) || sample),
      displayName: f.displayName,
      primaryPosition: f.primaryPosition,
      countryCode: f.countryCode,
      photoURL: adminPhoto,
      cardPhoto: null,
      specials: [],
      hasCard: true,
      ovr: Number(f.ovr),
      stats: Object.fromEntries(
        ATTRIBUTES.map(([key]) => [key, Number(f[key])]),
      ),
    };
    preview.innerHTML = card(p, {
      theme: saved?.baseTheme || (saved ? "custom-test" : f.theme),
      size: "lg",
      preview: true,
    });
    form.style.setProperty("--studio-primary", f.color1);
    form.style.setProperty("--studio-secondary", f.color2);
    const el = preview.firstElementChild;
    if (f.preserveOriginal !== "yes") {
      el.classList.add("lab-designed");
      for (const [key, v] of [
        ["color1", "--studio-primary"],
        ["color2", "--studio-secondary"],
        ["textColor", "--studio-text"],
        ["borderColor", "--studio-edge"],
        ["glowColor", "--studio-glow"],
      ])
        el.style.setProperty(v, f[key]);
      for (const [key, v] of [
        ["color1", "--card-a"],
        ["color2", "--card-b"],
        ["textColor", "--card-text"],
        ["borderColor", "--card-edge"],
        ["glowColor", "--card-glow"],
      ])
        el.style.setProperty(v, f[key]);
    }
    applyCardDesign(el, readDesign());
    el.querySelector(".card-surface").insertAdjacentHTML(
      "beforeend",
      '<div class="studio-border" aria-hidden="true"></div><div class="studio-effect" aria-hidden="true"></div>',
    );
    el.querySelector(".card-photo").insertAdjacentHTML(
      "beforeend",
      '<span class="studio-photo-handle" aria-hidden="true"></span>',
    );
    preview.dataset.photoEditing = String(tools.tab === "photo");
    preview.dataset.photoTool = tools.photo;
    document
      .querySelectorAll("[data-studio-choice]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(
            b.dataset.studioChoice === "layout"
              ? false
              : f[b.dataset.studioChoice] === b.dataset.value,
          ),
        ),
      );
    document
      .querySelectorAll("[data-studio-property]")
      .forEach((input) => (input.value = f[input.dataset.studioProperty]));
    form.querySelectorAll("[data-rating-preset]").forEach((button) => {
      const [, x, y] = ratingPresets[button.dataset.ratingPreset];
      button.setAttribute(
        "aria-pressed",
        String(
          f.ratingLayout === "original" &&
            Number(f.ratingX) === x &&
            Number(f.ratingY) === y,
        ),
      );
    });
    document
      .querySelectorAll("[data-studio-readout]")
      .forEach(
        (output) =>
          (output.value = Math.round(Number(f[output.dataset.studioReadout]))),
      );
    form.querySelectorAll("[data-studio-palette]").forEach((button) => {
      const colors = STUDIO_PALETTES[button.dataset.studioPalette][1];
      button.setAttribute(
        "aria-pressed",
        String(
          ["color1", "color2", "textColor", "borderColor", "glowColor"].every(
            (key, i) => f[key].toLowerCase() === colors[i].toLowerCase(),
          ),
        ),
      );
    });
    document
      .querySelectorAll("[data-photo-range]")
      .forEach(
        (input) =>
          (input.value =
            f[
              { size: "photoWidth", zoom: "photoScale", rotate: "photoRotate" }[
                input.dataset.photoRange
              ]
            ]),
      );
    bindImages(preview);
    fitPreview();
  };
  const commit = () => {
    clearTimeout(timer);
    const value = JSON.stringify(fields());
    if (history[historyIndex] === value) return;
    history.splice(historyIndex + 1);
    history.push(value);
    if (history.length > 50) history.shift();
    historyIndex = history.length - 1;
    document.querySelector("#lab-undo").disabled = historyIndex < 1;
    document.querySelector("#lab-redo").disabled = true;
    document.querySelector("#studio-change-state").textContent =
      "Alterações no projeto";
  };
  const restore = (values) => {
    for (const [key, value] of Object.entries(values)) set(key, value);
    draw();
  };
  const changed = (preserve = false) => {
    if (!preserve) set("preserveOriginal", "no");
    draw();
    commit();
  };
  form.onsubmit = (e) => e.preventDefault();
  form.querySelectorAll("[data-rating-preset]").forEach((button) => {
    button.onclick = () => {
      const [, x, y] = ratingPresets[button.dataset.ratingPreset];
      set("ratingLayout", "original");
      set("ratingX", x);
      set("ratingY", y);
      changed();
    };
  });
  form.oninput = (e) => {
    if (e.target === library) return;
    if (e.target.name !== "themeName") set("preserveOriginal", "no");
    if (e.target.matches("[data-photo-range]")) {
      const key = e.target.dataset.photoRange,
        value = Number(e.target.value);
      if (key === "size") {
        set("photoWidth", value);
        set("photoHeight", Math.min(120, (value * 46) / 65));
      } else set(key === "zoom" ? "photoScale" : "photoRotate", value);
    } else if (e.target.dataset.studioProperty) {
      const key = e.target.dataset.studioProperty;
      if (key === "watermarkPosition") {
        const [x, y] = {
          center: [50, 45],
          top: [50, 20],
          bottom: [50, 78],
          corner: [78, 20],
        }[e.target.value];
        set("watermarkX", x);
        set("watermarkY", y);
      }
      const field = DESIGN_FIELDS.find(([name]) => name === key);
      if (
        ["borderWidth", "borderInset", "borderOpacity"].includes(key) &&
        form.elements.border.value === "original"
      )
        set("border", "single");
      set(
        key,
        field ? clamp(e.target.value, field[2], field[3]) : e.target.value,
      );
    }
    draw();
    clearTimeout(timer);
    timer = setTimeout(commit, 250);
  };
  document.querySelector('[form="lab-controls"][name="themeName"]').oninput =
    form.oninput;
  form.querySelectorAll("[data-studio-tab]").forEach(
    (button) =>
      (button.onclick = () => {
        tools.tab = button.dataset.studioTab;
        form
          .querySelectorAll("[data-studio-panel]")
          .forEach(
            (panel) => (panel.hidden = panel.dataset.studioPanel !== tools.tab),
          );
        form
          .querySelectorAll("[data-studio-tab]")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        draw();
      }),
  );
  form.querySelectorAll("[data-studio-choice]").forEach(
    (button) =>
      (button.onclick = () => {
        const key = button.dataset.studioChoice,
          value = button.dataset.value;
        if (key === "layout")
          Object.entries(STUDIO_LAYOUTS[value][1]).forEach(([k, v]) =>
            set(k, v),
          );
        else set(key, value);
        changed();
      }),
  );
  form.querySelectorAll("[data-studio-palette]").forEach(
    (button) =>
      (button.onclick = () => {
        palette(button.dataset.studioPalette);
        if (form.elements.background.value === "original")
          set("background", "diagonal");
        changed();
      }),
  );
  form.querySelectorAll("[data-photo-tool]").forEach(
    (button) =>
      (button.onclick = () => {
        tools.photo = button.dataset.photoTool;
        form
          .querySelectorAll("[data-photo-tool]")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        document.querySelector("#photo-tool-help").textContent = {
          move: "Arrasta a fotografia na carta para a mover.",
          size: "Arrasta o canto da fotografia para ajustar o tamanho.",
          zoom: "Arrasta para cima ou usa a barra para aproximar a imagem.",
        }[tools.photo];
        draw();
      }),
  );
  form.theme.onchange = () => {
    const saved = experimental.find(
      (t) => `saved:${t.id}` === form.theme.value,
    );
    if (!saved) {
      set("projectId", "");
      Object.entries(defaults()).forEach(([key, value]) => set(key, value));
      set("preserveOriginal", "yes");
    }
    if (CATALOG_THEMES.includes(form.theme.value)) {
      const probe = document.createElement("div");
      probe.hidden = true;
      probe.innerHTML = card(sample, {
        theme: form.theme.value,
        preview: true,
      });
      document.body.append(probe);
      const material = getComputedStyle(probe.firstElementChild);
      const edge = material.getPropertyValue("--card-edge").trim();
      for (const [key, variable] of [
        ["color1", "--card-a"],
        ["color2", "--card-b"],
        ["textColor", "--card-text"],
        ["borderColor", "--card-edge"],
        ["glowColor", "--card-glow"],
      ]) {
        const value = material.getPropertyValue(variable).trim();
        set(key, /^#[0-9a-f]{6}$/i.test(value) ? value : edge);
      }
      probe.remove();
    }
    const informColors = {
      "in-form-bronze": ["#70472e", "#171318", "#f7faff", "#e8b58b", "#9c522e"],
      "in-form-silver": ["#46596e", "#10141e", "#f7faff", "#dceaf8", "#5d7f9d"],
      "in-form-gold": ["#605027", "#14131b", "#f7faff", "#eac775", "#b47720"],
    }[form.theme.value];
    if (informColors) {
      ["color1", "color2", "textColor", "borderColor", "glowColor"].forEach(
        (key, i) => set(key, informColors[i]),
      );
    }
    if (saved) {
      set("projectId", saved.id);
      set("themeName", saved.name);
      Object.entries(defaults()).forEach(([key, value]) => set(key, value));
      set("preserveOriginal", "no");
      Object.entries(cardTemplateDesign(saved)).forEach(([key, value]) =>
        set(key, value),
      );
      ["color1", "color2", "textColor", "borderColor", "glowColor"].forEach(
        (key, i) =>
          set(
            key,
            saved.colors[["primary", "secondary", "text", "border", "glow"][i]],
          ),
      );
    }
    document.querySelector("#studio-selection-label").textContent =
      saved?.name ||
      (form.theme.value === "custom-test"
        ? "Do zero"
        : themeName(form.theme.value));
    if (form.theme.value === "custom-test") {
      palette("monochrome");
      set("preserveOriginal", "no");
      set("background", "solid");
      set("decoration", "none");
      set("border", "none");
      set("effect", "none");
      set("lighting", "off");
    }
    changed(true);
  };
  library.onchange = () => {
    if (!library.value) return;
    set("theme", `saved:${library.value}`);
    form.theme.onchange();
  };
  editionCatalog.onclick = (e) => {
    const button = e.target.closest("[data-studio-edition]");
    if (!button) return;
    set("theme", button.dataset.studioEdition);
    form.theme.onchange();
  };
  document.querySelector("#lab-new-project").onclick = () => {
    set("projectId", "");
    set("theme", "custom-test");
    set("themeName", "A minha carta");
    Object.entries(defaults()).forEach(([key, value]) => set(key, value));
    palette("monochrome");
    set("background", "solid");
    set("effect", "none");
    set("lighting", "off");
    set("decoration", "none");
    set("border", "none");
    history.length = 0;
    historyIndex = -1;
    changed();
  };
  form.player.onchange = () => {
    const p = players.find((p) => p.uid === form.player.value) || sample;
    for (const key of [
      "displayName",
      "ovr",
      "countryCode",
      "primaryPosition",
      "photoURL",
    ])
      set(key, p[key] ?? (key === "displayName" ? p.username : sample[key]));
    ATTRIBUTES.forEach(([key]) => set(key, p.stats?.[key] ?? 82));
    changed();
  };
  preview.onpointerdown = (e) => {
    if (tools.tab !== "photo" || !e.target.closest(".card-photo")) return;
    e.preventDefault();
    commit();
    const rect = preview.firstElementChild.getBoundingClientRect();
    dragging = {
      pointer: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      rect,
      design: readDesign(),
      mode: tools.photo,
    };
    preview.setPointerCapture(e.pointerId);
  };
  preview.onpointermove = (e) => {
    if (!dragging || e.pointerId !== dragging.pointer) return;
    const dx = ((e.clientX - dragging.x) / dragging.rect.width) * 100,
      dy = ((e.clientY - dragging.y) / dragging.rect.height) * 100,
      d = dragging.design;
    if (dragging.mode === "move") {
      set("photoX", clamp(d.photoX + dx, -50, 100));
      set("photoY", clamp(d.photoY + dy, -50, 100));
    }
    if (dragging.mode === "size") {
      const width = clamp(d.photoWidth + dx, 10, 160);
      set("photoWidth", width);
      set(
        "photoHeight",
        clamp((d.photoHeight * width) / d.photoWidth, 10, 120),
      );
    }
    if (dragging.mode === "zoom")
      set("photoScale", clamp(d.photoScale - dy * 2, 50, 200));
    const photo = preview.querySelector(".card-photo"),
      next = readDesign();
    Object.assign(photo.style, {
      left: `${next.photoX}%`,
      top: `${next.photoY}%`,
      width: `${next.photoWidth}%`,
      height: `${next.photoHeight}%`,
    });
    photo.querySelector("img").style.transform =
      `scale(${next.photoScale / 100})`;
  };
  preview.tabIndex = 0;
  preview.setAttribute(
    "aria-label",
    "Pré-visualização da carta. Na ferramenta Foto, usa as setas para mover a imagem.",
  );
  preview.onkeydown = (event) => {
    if (
      tools.tab !== "photo" ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    commit();
    const d = readDesign();
    set(
      "photoX",
      clamp(
        d.photoX +
          (event.key === "ArrowLeft" ? -2 : event.key === "ArrowRight" ? 2 : 0),
        -50,
        100,
      ),
    );
    set(
      "photoY",
      clamp(
        d.photoY +
          (event.key === "ArrowUp" ? -2 : event.key === "ArrowDown" ? 2 : 0),
        -50,
        100,
      ),
    );
    changed();
  };
  const endDrag = () => {
    if (!dragging) return;
    dragging = null;
    changed();
  };
  preview.onpointerup = endDrag;
  preview.onpointercancel = endDrag;
  preview.onlostpointercapture = endDrag;
  document.querySelector("#lab-center-photo").onclick = () => {
    set("photoX", (100 - Number(form.photoWidth.value)) / 2);
    set("photoY", 7);
    changed();
  };
  document.querySelector("#lab-reset").onclick = () => {
    Object.entries(defaults()).forEach(([key, value]) => set(key, value));
    changed();
  };
  for (const [id, direction] of [
    ["lab-undo", -1],
    ["lab-redo", 1],
  ])
    document.querySelector(`#${id}`).onclick = () => {
      commit();
      const next = historyIndex + direction;
      if (next < 0 || next >= history.length) return;
      historyIndex = next;
      restore(JSON.parse(history[next]));
      document.querySelector("#lab-undo").disabled = next < 1;
      document.querySelector("#lab-redo").disabled = next >= history.length - 1;
    };
  let saving = false;
  const saveComposition = async (e, copy = false) => {
    if (saving) return;
    commit();
    const f = fields(),
      saved = experimental.find((t) => `saved:${t.id}` === f.theme),
      payload = {
        ...(!copy && f.projectId ? { id: f.projectId } : {}),
        name: f.themeName,
        baseTheme: saved?.baseTheme || (saved ? "custom-test" : f.theme),
        design: readDesign(),
        colors: {
          primary: f.color1,
          secondary: f.color2,
          text: f.textColor,
          border: f.borderColor,
          glow: f.glowColor,
        },
        texture: "plain",
      };
    if (!payload.name.trim()) return toast("Dá um nome à composição.", "error");
    saving = true;
    try {
      const result = await busy(e.currentTarget, () =>
        DB.callAdmin("saveTheme", payload),
      );
      if (result.data.id) {
        const index = experimental.findIndex(
          (theme) => theme.id === result.data.id,
        );
        const next = {
          ...(experimental[index] || {}),
          ...payload,
          id: result.data.id,
        };
        if (index < 0) experimental.push(next);
        else experimental[index] = next;
        const option = [...form.theme.options].find(
          (option) => option.value === `saved:${result.data.id}`,
        );
        if (option) option.textContent = `${payload.name} · guardado`;
        else
          form.theme.add(
            new Option(`${payload.name} · guardado`, `saved:${result.data.id}`),
          );
        set("projectId", result.data.id);
        set("theme", `saved:${result.data.id}`);
        refreshLibrary();
        commit();
        draw();
      }
      document.querySelector("#studio-change-state").textContent =
        "Composição guardada";
      toast("Composição guardada.");
    } catch (error) {
      toast(error.message || "Não foi possível guardar a composição.", "error");
    } finally {
      saving = false;
    }
  };
  document.querySelector("#save-theme").onclick = (e) => saveComposition(e);
  document.querySelector("#save-theme-copy").onclick = (e) =>
    saveComposition(e, true);
  document.querySelector("#lab-export").onclick = () => {
    const url = URL.createObjectURL(
        new Blob([JSON.stringify({ version: 2, fields: fields() }, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "peladinhas-card-project.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  document.querySelector("#lab-import").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 100000) throw Error("Projeto demasiado grande.");
      const project = JSON.parse(await file.text());
      if (
        ![1, 2].includes(project.version) ||
        !project.fields ||
        typeof project.fields !== "object"
      )
        throw Error("Projeto inválido.");
      const design = { ...defaults(), preserveOriginal: "no" };
      for (const [key] of DESIGN_FIELDS)
        if (project.fields[key] !== undefined)
          design[key] = Number(project.fields[key]);
      for (const key of Object.keys(DESIGN_CHOICES))
        if (project.fields[key] !== undefined)
          design[key] = project.fields[key];
      if (!validCardDesign(design)) throw Error("Composição inválida.");
      for (const key of [
        "color1",
        "color2",
        "textColor",
        "borderColor",
        "glowColor",
      ])
        if (!/^#[0-9a-f]{6}$/i.test(project.fields[key] || ""))
          throw Error("Paleta inválida.");
      Object.entries(design).forEach(([key, v]) => set(key, v));
      for (const [key, v] of Object.entries(project.fields))
        if (
          !Object.hasOwn(design, key) &&
          typeof v === "string" &&
          v.length < 2000
        )
          set(key, v);
      set("projectId", "");
      changed();
      toast("Projeto carregado.");
    } catch (error) {
      toast(error.message, "error");
    }
    e.target.value = "";
  };
  document.querySelector("#lab-project-export").onclick = () =>
    document.querySelector("#lab-export").click();
  document.querySelector("#lab-project-import").onchange =
    document.querySelector("#lab-import").onchange;
  preview.addEventListener("pointermove", (event) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = preview.getBoundingClientRect();
    preview.style.setProperty(
      "--holo-x",
      ((event.clientX - rect.left) / rect.width) * 100 + "%",
    );
    preview.style.setProperty(
      "--holo-y",
      ((event.clientY - rect.top) / rect.height) * 100 + "%",
    );
  });
  ctx.cleanup(() => clearTimeout(timer));
  if (uid && [...form.theme.options].some((option) => option.value === uid)) {
    set("theme", uid);
    form.theme.onchange();
  }
  if (!uid) form.theme.onchange();
  draw();
  commit();
  document.querySelector("#studio-change-state").textContent =
    "Pronto para criar";
}
