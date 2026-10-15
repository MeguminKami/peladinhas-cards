import * as DB from "./db.js";
import {
  CATALOG_THEMES,
  informTheme,
  COLLECTION_EDITIONS,
  ATTRIBUTES,
  themeName,
  clamp,
} from "./utils.js";
import { esc, pageHead, linkButton, busy, toast } from "./ui.js";
import { icon } from "./icons.js";
import { RESERVED_COLLECTION_IDS } from "./card-collection.js";
import { card, bindImages } from "./cards.js";
import {
  DESIGN_FIELDS,
  DESIGN_CHOICES,
  applyCardDesign,
  validCardDesign,
} from "./card-design.js";
import {
  STUDIO_FONTS,
  STUDIO_BACKGROUNDS,
  STUDIO_PALETTES,
  STUDIO_DECORATIONS,
  STUDIO_EFFECTS,
  STUDIO_WATERMARKS,
  STUDIO_BORDERS,
  STUDIO_LAYOUTS,
  STUDIO_PRESETS,
  DECORATION_ART,
  WATERMARK_ART,
} from "./card-studio-catalog.js";
const optionNumbers = (value) =>
  Array.from(
    { length: 100 },
    (_, i) =>
      `<option value="${i}" ${i === Math.round(value) ? "selected" : ""}>${i}</option>`,
  ).join("");
const defaults = () => ({
  ...Object.fromEntries(DESIGN_FIELDS.map(([k, , , , v]) => [k, v])),
  ...Object.fromEntries(
    Object.entries(DESIGN_CHOICES).map(([k, v]) => [k, v[0]]),
  ),
  nameY: 57,
  statsY: 67,
  nameFont: "sport",
  ratingFont: "sport",
  statsFont: "modern",
  labelsFont: "narrow",
  positionFont: "heavy",
});
export async function cardLab(ctx, uid) {
  const players = ctx.league.players,
    experimental = await DB.list("cardThemes"),
    selected = players.find((p) => p.uid === uid) || players[0];
  const sample = {
    uid: "preview",
    displayName: "O teu craque",
    countryCode: "PT",
    primaryPosition: "ALA",
    photoURL: "",
    hasCard: true,
    ovr: 82,
    stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 82])),
  };
  const base = selected || sample,
    designDefaults = defaults();
  const gallery = (key, catalog, kind = "") =>
    `<div class="studio-gallery ${kind}">${Object.entries(catalog)
      .map(
        ([value, entry]) =>
          `<button type="button" class="studio-choice" data-studio-choice="${key}" data-value="${value}" aria-pressed="false"><span class="studio-sample sample-${key} sample-${value}" ${key === "background" ? `style="background:${STUDIO_BACKGROUNDS[value][1] === "none" ? "var(--studio-primary)" : STUDIO_BACKGROUNDS[value][1]};${["dots", "halftone"].includes(value) ? "background-size:10px 10px,100% 100%" : ""}"` : ""}>${key === "decoration" && DECORATION_ART[value] ? `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${DECORATION_ART[value]}</svg>` : key === "watermark" && WATERMARK_ART[value] ? `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">${WATERMARK_ART[value]}</svg>` : key === "watermark" ? "—" : ""}</span><small>${esc(Array.isArray(entry) ? entry[0] : entry)}</small></button>`,
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
  ctx.render(`${pageHead("Card Lab", "Card Lab", "Combina modelos, materiais e detalhes para criar a tua carta.", linkButton("#/admin", "Administração", "ghost"))}
  <div class="studio-project-bar panel"><label>Projeto<input form="lab-controls" name="themeName" value="A minha carta" maxlength="40"></label><div class="actions"><button type="button" id="lab-undo" class="btn btn-ghost" aria-label="Desfazer">↶</button><button type="button" id="lab-redo" class="btn btn-ghost" aria-label="Refazer">↷</button><button type="button" id="lab-export" class="btn btn-secondary">${icon("arrow")}Exportar projeto</button><label class="btn btn-secondary studio-import">${icon("assets")}Importar<input type="file" id="lab-import" accept="application/json,.json" class="visually-hidden"></label><button type="button" id="save-theme" class="btn btn-primary">${icon("check")}Guardar composição</button></div></div>
  <div class="lab-layout studio-layout"><form id="lab-controls" class="studio-inspector panel"><nav class="studio-tabs" aria-label="Ferramentas de criação">${[
    ["models", "Modelos", "assets"],
    ["layers", "Camadas", "palette"],
    ["text", "Texto", "edit"],
    ["photo", "Foto", "camera"],
    ["data", "Dados", "profile"],
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
  <section data-studio-panel="models"><h2>Começa por um modelo</h2><p class="studio-help">Escolhe um ponto de partida. Depois combina as peças.</p><div class="studio-preset-grid">${STUDIO_PRESETS.map(([id, name, theme, palette, , , effect, , shape]) => `<button type="button" class="studio-preset" data-studio-preset="${id}"><span class="studio-mini-card mini-${shape} mini-${effect}" style="--mini-a:${STUDIO_PALETTES[palette][1][0]};--mini-b:${STUDIO_PALETTES[palette][1][1]};--mini-text:${STUDIO_PALETTES[palette][1][2]}"><b>92</b><i></i><strong>${name.split(" ")[0]}</strong><em>VEL · FIN · PAS · DRI</em></span><small>${name}</small></button>`).join("")}</div><label>Estilo base<select name="theme">${[...CATALOG_THEMES, "custom-test"].map((t) => `<option value="${t}" ${t === "gold-rare" ? "selected" : ""}>${t === "custom-test" ? "Livre" : themeName(t)}</option>`).join("")}${experimental.map((t) => `<option value="saved:${esc(t.id)}">${esc(t.name)} · guardado</option>`).join("")}</select></label><h3>Composição</h3>${gallery("layout", Object.fromEntries(Object.entries(STUDIO_LAYOUTS).map(([k, v]) => [k, v[0]])))}<h3>Forma</h3>${gallery("shape", { original: "Original", shield: "Escudo", diamond: "Diamante", rounded: "Arredondada", ticket: "Bilhete", hexagon: "Hexágono", notched: "Recortada", crown: "Coroa", arch: "Arco" })}</section>
  <section data-studio-panel="layers" hidden><h2>Materiais e camadas</h2><h3>Paletas</h3><div class="studio-palette-grid">${Object.entries(
    STUDIO_PALETTES,
  )
    .map(
      ([id, [name, colors]]) =>
        `<button type="button" data-studio-palette="${id}" aria-label="Paleta ${name}"><span>${colors
          .slice(0, 4)
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
    )}</div><details open><summary>Fundos</summary>${gallery("background", STUDIO_BACKGROUNDS)}</details><details><summary>Detalhes</summary>${gallery("decoration", STUDIO_DECORATIONS)}</details><details><summary>Efeito da cor secundária</summary>${gallery("effect", STUDIO_EFFECTS)}</details><details><summary>Molduras</summary>${gallery("border", STUDIO_BORDERS)}</details><details><summary>Marcas de água</summary>${gallery("watermark", STUDIO_WATERMARKS)}<div class="studio-two-col">${picker("watermarkPosition", "Posição", { center: "Centro", top: "Superior", bottom: "Inferior", corner: "Canto" })}${picker("watermarkOpacity", "Intensidade", { 10: "Discreta", 20: "Suave", 35: "Visível", 50: "Forte", 65: "Muito forte" })}</div></details></section>
  <section data-studio-panel="text" hidden><h2>Tipografia</h2><fieldset class="studio-type-group"><legend>Fundo do nome</legend><p class="studio-help">Escolhe a cor RGB da faixa. Com 100% de transparência, o fundo desaparece.</p><div class="studio-two-col">${[
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
        `<fieldset class="studio-type-group"><legend>${label}</legend><div class="studio-two-col">${picker(font, "Fonte", Object.fromEntries(Object.entries(STUDIO_FONTS).map(([k, v]) => [k, v[0]])))}${fontSize(size, "Tamanho")}</div><span class="studio-font-preview" data-font-preview="${font}">Peladinhas 92</span></fieldset>`,
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
  <section data-studio-panel="photo" hidden><h2>Fotografia</h2><label>Imagem (URL)<input name="photoURL" type="url" value="${esc(base.photoURL || "")}"></label><div class="studio-photo-tools">${[
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
  <section data-studio-panel="data" hidden><h2>Identidade</h2><label>Jogador<select name="player"><option value="">Jogador fictício</option>${players.map((p) => `<option value="${p.uid}" ${p.uid === selected?.uid ? "selected" : ""}>${esc(p.displayName || p.username)}</option>`).join("")}</select></label><label>Nome<input name="displayName" value="${esc(base.displayName || base.username)}" maxlength="30"></label><div class="studio-two-col"><label>OVR<select name="ovr">${optionNumbers(base.ovr)}</select></label><label>Posição<select name="primaryPosition">${["GR", "DEF", "ALA", "MED", "AV"].map((p) => `<option ${p === base.primaryPosition ? "selected" : ""}>${p}</option>`).join("")}</select></label></div><label>País<select name="countryCode">${[
    ...new Set([
      base.countryCode,
      "PT",
      "BR",
      "ES",
      "FR",
      "GB",
      "DE",
      "IT",
      "AR",
      "AO",
      "CV",
    ]),
  ]
    .filter(Boolean)
    .map(
      (c) =>
        `<option ${c === base.countryCode ? "selected" : ""}>${c}</option>`,
    )
    .join(
      "",
    )}</select></label><details id="lab-attributes"><summary>Stats</summary><div class="studio-two-col">${ATTRIBUTES.map(([key, label]) => `<label>${label}<select name="${key}">${optionNumbers(base.stats?.[key] ?? 82)}</select></label>`).join("")}</div></details></section></form>
  <section class="lab-preview studio-stage"><div class="studio-stage-head"><span class="pill">Pré-visualização</span><span id="studio-selection-label">Modelo livre</span></div><div id="card-preview" class="studio-canvas"></div><div class="studio-stage-footer"><span>Combina livremente · Cartas reais preservadas</span><span id="studio-change-state" aria-live="polite"></span></div></section></div>`);
  const form = document.querySelector("#lab-controls"),
    preview = document.querySelector("#card-preview"),
    history = [],
    tools = { tab: "models", photo: "move" };
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
  const draw = () => {
    const f = fields(),
      saved = experimental.find((t) => `saved:${t.id}` === f.theme);
    document.querySelector("#name-background-transparency").value =
      `${f.nameBackgroundTransparency}%`;
    const collectionPreview = RESERVED_COLLECTION_IDS.includes(f.theme);
    const saveButton = document.querySelector("#save-theme");
    saveButton.disabled = RESERVED_COLLECTION_IDS.includes(f.theme);
    saveButton.innerHTML = RESERVED_COLLECTION_IDS.includes(f.theme)
      ? "Design em reserva · Só pré-visualização"
      : `${icon("check")}Guardar composição`;
    const p = {
      ...(players.find((p) => p.uid === f.player) || sample),
      displayName: f.displayName,
      primaryPosition: f.primaryPosition,
      countryCode: f.countryCode,
      photoURL: f.photoURL,
      cardPhoto: null,
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
    el.classList.add("lab-designed");
    if (collectionPreview) {
      for (const [studio, material] of [
        ["--studio-primary", "--card-a"],
        ["--studio-secondary", "--card-b"],
        ["--studio-text", "--card-text"],
        ["--studio-edge", "--card-edge"],
        ["--studio-glow", "--card-glow"],
      ])
        el.style.setProperty(studio, `var(${material})`);
    }
    for (const [key, v] of [
      ["color1", "--studio-primary"],
      ["color2", "--studio-secondary"],
      ["textColor", "--studio-text"],
      ["borderColor", "--studio-edge"],
      ["glowColor", "--studio-glow"],
    ])
      if (!collectionPreview) el.style.setProperty(v, f[key]);
    for (const [key, v] of [
      ["color1", "--card-a"],
      ["color2", "--card-b"],
      ["textColor", "--card-text"],
      ["borderColor", "--card-edge"],
      ["glowColor", "--card-glow"],
    ])
      if (!collectionPreview) el.style.setProperty(v, f[key]);
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
    document
      .querySelectorAll("[data-font-preview]")
      .forEach(
        (el) =>
          (el.style.fontFamily = STUDIO_FONTS[f[el.dataset.fontPreview]][1]),
      );
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
  const changed = () => {
    draw();
    commit();
  };
  form.onsubmit = (e) => e.preventDefault();
  form.oninput = (e) => {
    if (e.target.matches("[data-photo-range]")) {
      const key = e.target.dataset.photoRange,
        value = Number(e.target.value);
      if (key === "size") {
        set("photoWidth", value);
        set("photoHeight", Math.min(120, (value * 46) / 65));
      } else set(key === "zoom" ? "photoScale" : "photoRotate", value);
    } else if (e.target.dataset.studioProperty) {
      const key = e.target.dataset.studioProperty;
      const field = DESIGN_FIELDS.find(([name]) => name === key);
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
  form.querySelectorAll("[data-studio-preset]").forEach(
    (button) =>
      (button.onclick = () => {
        const [
          ,
          name,
          theme,
          colors,
          background,
          decoration,
          effect,
          watermark,
          shape,
        ] = STUDIO_PRESETS.find((p) => p[0] === button.dataset.studioPreset);
        Object.entries(defaults()).forEach(([key, value]) => set(key, value));
        set("theme", theme);
        palette(colors);
        for (const [key, value] of Object.entries({
          background,
          decoration,
          effect,
          watermark,
          shape,
          border: "double",
        }))
          set(key, value);
        document.querySelector("#studio-selection-label").textContent = name;
        changed();
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
    if (
      COLLECTION_EDITIONS[form.theme.value] &&
      !RESERVED_COLLECTION_IDS.includes(form.theme.value)
    ) {
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
      for (const [key, , , , value] of DESIGN_FIELDS.filter(([name]) =>
        name.startsWith("nameBackground"),
      ))
        set(key, value);
      Object.entries(saved.design || {}).forEach(([key, value]) =>
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
  document.querySelector("#save-theme").onclick = async (e) => {
    if (RESERVED_COLLECTION_IDS.includes(fields().theme)) return;
    commit();
    const f = fields(),
      saved = experimental.find((t) => `saved:${t.id}` === f.theme),
      payload = {
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
    try {
      const result = await busy(e.currentTarget, () =>
        DB.callAdmin("saveTheme", payload),
      );
      if (result.data.id) {
        experimental.push({ ...payload, id: result.data.id });
        form.theme.add(
          new Option(`${payload.name} · guardado`, `saved:${result.data.id}`),
        );
        set("theme", `saved:${result.data.id}`);
        draw();
      }
      document.querySelector("#studio-change-state").textContent =
        "Composição guardada";
      toast("Composição guardada.");
    } catch {}
  };
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
      const design = { ...defaults() };
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
      changed();
      toast("Projeto carregado.");
    } catch (error) {
      toast(error.message, "error");
    }
    e.target.value = "";
  };
  ctx.cleanup(() => clearTimeout(timer));
  draw();
  commit();
  document.querySelector("#studio-change-state").textContent =
    "Pronto para criar";
}
