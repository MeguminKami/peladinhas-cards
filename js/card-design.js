import { setSafeCardShape } from "./card-geometry.js";
import {
  STUDIO_FONTS,
  STUDIO_BACKGROUNDS,
  STUDIO_DECORATIONS,
  STUDIO_EFFECTS,
  STUDIO_WATERMARKS,
  STUDIO_BORDERS,
  WATERMARK_ART,
  DECORATION_ART,
} from "./card-studio-catalog.js";
export const DESIGN_FIELDS = [
  ["countrySize", "Tamanho da bandeira", 60, 160, 100],
  ["badgeSize", "Tamanho do emblema", 60, 160, 100],
  ["ratingSize", "Tamanho do OVR", 60, 160, 100],
  ["labelsSize", "Tamanho das legendas", 60, 160, 100],
  ["positionSize", "Tamanho da posição", 60, 160, 100],
  ["watermarkOpacity", "Marca de água", 5, 70, 20],
  ["photoX", "Imagem · horizontal (%)", -50, 100, 31],
  ["photoY", "Imagem · vertical (%)", -50, 100, 7],
  ["photoWidth", "Largura da imagem (%)", 10, 160, 65],
  ["photoHeight", "Altura da imagem (%)", 10, 120, 46],
  ["photoScale", "Ampliação da imagem (%)", 50, 200, 100],
  ["photoRotate", "Rotação da imagem (°)", -45, 45, 0],
  ["focusX", "Enquadramento horizontal (%)", 0, 100, 50],
  ["focusY", "Enquadramento vertical (%)", 0, 100, 25],
  ["photoOpacity", "Opacidade da imagem (%)", 0, 100, 100],
  ["saturation", "Saturação (%)", 0, 200, 100],
  ["nameY", "Nome · vertical (%)", 40, 90, 54],
  ["nameSize", "Tamanho do nome (%)", 60, 150, 100],
  ["nameBackgroundRed", "Fundo do nome · vermelho", 0, 255, 0],
  ["nameBackgroundGreen", "Fundo do nome · verde", 0, 255, 0],
  ["nameBackgroundBlue", "Fundo do nome · azul", 0, 255, 0],
  [
    "nameBackgroundTransparency",
    "Fundo do nome · transparência (%)",
    0,
    100,
    100,
  ],
  ["statsY", "Stats · vertical (%)", 50, 90, 68],
  ["statsSize", "Tamanho dos atributos (%)", 60, 140, 100],
  ["ratingX", "OVR · horizontal (%)", 0, 60, 9],
  ["ratingY", "OVR · vertical (%)", 0, 60, 9],
  ["ornamentOpacity", "Detalhes / ornamentos (%)", 0, 100, 100],
  ["borderOpacity", "Moldura (%)", 0, 100, 100],
  ["playstyleSize", "Tamanho dos playstyles (%)", 8, 25, 16],
  ["playstyleY", "Playstyles · vertical (%)", 10, 75, 30],
];
export const DESIGN_CHOICES = {
  background: Object.keys(STUDIO_BACKGROUNDS),
  decoration: Object.keys(STUDIO_DECORATIONS),
  effect: Object.keys(STUDIO_EFFECTS),
  watermark: Object.keys(STUDIO_WATERMARKS),
  border: Object.keys(STUDIO_BORDERS),
  watermarkPosition: ["center", "top", "bottom", "corner"],
  nameFont: Object.keys(STUDIO_FONTS),
  ratingFont: Object.keys(STUDIO_FONTS),
  statsFont: Object.keys(STUDIO_FONTS),
  labelsFont: Object.keys(STUDIO_FONTS),
  positionFont: Object.keys(STUDIO_FONTS),
  fit: ["cover", "contain"],
  shape: [
    "original",
    "shield",
    "diamond",
    "rounded",
    "ticket",
    "hexagon",
    "notched",
    "crown",
    "arch",
  ],
  fade: ["soft", "none"],
  statsColumns: ["4", "2"],
  showPhoto: ["yes", "no"],
  showStats: ["yes", "no"],
  showRating: ["yes", "no"],
  showPlaystyles: ["yes", "no"],
};
export function validCardDesign(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.entries(value).every(([key, v]) => {
      const field = DESIGN_FIELDS.find(([k]) => k === key);
      return field
        ? Number.isFinite(v) && v >= field[2] && v <= field[3]
        : DESIGN_CHOICES[key]?.includes(v);
    })
  );
}
export function applyCardTemplate(card, template) {
  if (!validCardDesign(template.design || {})) return;
  card.classList.add("lab-designed");
  for (const [key, studio, variable] of [
    ["primary", "--studio-primary", "--card-a"],
    ["secondary", "--studio-secondary", "--card-b"],
    ["text", "--studio-text", "--card-text"],
    ["border", "--studio-edge", "--card-edge"],
    ["glow", "--studio-glow", "--card-glow"],
  ]) {
    const value = template.colors?.[key];
    if (/^#[0-9a-f]{6}$/i.test(value || "")) {
      card.style.setProperty(studio, value);
      card.style.setProperty(variable, value);
    }
  }
  applyCardDesign(card, template.design || {});
  card
    .querySelector(".card-surface")
    .insertAdjacentHTML(
      "beforeend",
      '<div class="studio-border" aria-hidden="true"></div><div class="studio-effect" aria-hidden="true"></div>',
    );
}
export function applyCardDesign(card, design = {}) {
  if (!validCardDesign(design)) return;
  const defaults = Object.fromEntries(
    DESIGN_FIELDS.map(([key, , , , value]) => [key, value]),
  );
  const d = {
    ...defaults,
    fit: "cover",
    shape: "original",
    fade: "soft",
    statsColumns: "4",
    ...design,
  };
  const photo = card.querySelector(".card-photo"),
    image = photo.querySelector("img");
  Object.assign(photo.style, {
    left: `${d.photoX}%`,
    top: `${d.photoY}%`,
    width: `${d.photoWidth}%`,
    height: `${d.photoHeight}%`,
    transform: `rotate(${d.photoRotate}deg)`,
    opacity: d.photoOpacity / 100,
  });
  Object.assign(image.style, {
    transform: `scale(${d.photoScale / 100})`,
    objectFit: d.fit,
    objectPosition: `${d.focusX}% ${d.focusY}%`,
    filter: `saturate(${d.saturation}%)`,
  });
  if (d.fade === "none") {
    image.style.maskImage = "none";
    image.style.webkitMaskImage = "none";
  }
  const caption = card.querySelector(".card-caption"),
    stats = card.querySelector(".card-stats"),
    rating = card.querySelector(".card-rating");
  caption.style.top = "57%";
  card.style.setProperty(
    "--name-background",
    `rgba(${d.nameBackgroundRed}, ${d.nameBackgroundGreen}, ${d.nameBackgroundBlue}, ${1 - d.nameBackgroundTransparency / 100})`,
  );
  caption.querySelector("h3").style.fontSize =
    `calc(var(--card-width) * ${(0.078 * d.nameSize) / 100})`;
  stats.style.top = "67%";
  stats
    .querySelectorAll("b")
    .forEach(
      (el) =>
        (el.style.fontSize = `calc(var(--card-width) * ${(0.079 * d.statsSize) / 100})`),
    );
  stats.style.gridTemplateColumns = "repeat(4,1fr)";
  rating.style.left = "10%";
  rating.style.top = "12%";
  card
    .querySelectorAll(".card-ornament,.special-ornament,.rare-rim-detail")
    .forEach((el) => (el.style.opacity = d.ornamentOpacity / 100));
  card.querySelector(".card-frame").style.opacity = d.borderOpacity / 100;
  const playstyles = card.querySelector(".card-playstyles");
  if (playstyles) {
    playstyles.style.top = `${d.playstyleY}%`;
    playstyles
      .querySelectorAll("img")
      .forEach(
        (img) =>
          (img.style.width = `calc(var(--card-width) * ${d.playstyleSize / 100})`),
      );
  }
  for (const [key, el] of [
    ["showPhoto", photo],
    ["showStats", stats],
    ["showRating", rating],
    ["showPlaystyles", playstyles],
  ])
    if (el) el.hidden = d[key] === "no";
  for (const [key, selector] of [
    ["nameFont", ".card-caption h3"],
    ["ratingFont", ".card-rating strong"],
    ["statsFont", ".card-stats b"],
    ["labelsFont", ".card-stats small,.card-rating span"],
    ["positionFont", ".card-rating > small"],
  ]) {
    if (STUDIO_FONTS[d[key]])
      card
        .querySelectorAll(selector)
        .forEach((el) => (el.style.fontFamily = STUDIO_FONTS[d[key]][1]));
  }
  card.querySelector(".card-rating strong").style.fontSize =
    `calc(var(--card-width) * ${(0.19 * d.ratingSize) / 100})`;
  card
    .querySelectorAll(".card-stats small,.card-rating span")
    .forEach(
      (el) =>
        (el.style.fontSize = `calc(var(--card-width) * ${(0.032 * d.labelsSize) / 100})`),
    );
  card.querySelector(".card-rating > small").style.fontSize =
    `calc(var(--card-width) * ${(0.065 * d.positionSize) / 100})`;
  card.querySelector(".card-rating > span:last-child").style.fontSize =
    `calc(var(--card-width) * ${(0.065 * d.countrySize) / 100})`;
  const badge = card.querySelector(".special-insignia");
  if (badge)
    badge.style.fontSize = `calc(var(--card-width) * ${(0.035 * d.badgeSize) / 100})`;
  const surface = card.querySelector(".card-surface");
  if (d.background && d.background !== "original") {
    surface.style.background = STUDIO_BACKGROUNDS[d.background][1];
    if (["dots", "halftone"].includes(d.background))
      surface.style.backgroundSize = "12px 12px,100% 100%";
  }
  if (d.decoration && d.decoration !== "original") {
    card
      .querySelectorAll(
        ".card-ornament,.special-ornament,.special-insignia,.rare-rim-detail",
      )
      .forEach((el) => (el.hidden = true));
    if (DECORATION_ART[d.decoration])
      surface.insertAdjacentHTML(
        "beforeend",
        `<svg class="studio-decoration" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width=".8" aria-hidden="true">${DECORATION_ART[d.decoration]}</svg>`,
      );
  }
  if (WATERMARK_ART[d.watermark])
    surface.insertAdjacentHTML(
      "beforeend",
      `<svg class="studio-watermark watermark-${d.watermarkPosition || "center"}" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" style="opacity:${d.watermarkOpacity / 100}" aria-hidden="true">${WATERMARK_ART[d.watermark]}</svg>`,
    );
  card.dataset.studioEffect = d.effect || "none";
  card.dataset.studioBorder = d.border || "original";
  const shapes = {
    ticket:
      "polygon(8% 0,92% 0,100% 8%,95% 35%,100% 40%,100% 85%,85% 100%,15% 100%,0 85%,0 40%,5% 35%,0 8%)",
    hexagon:
      "polygon(18% 0,82% 0,100% 18%,100% 82%,82% 100%,18% 100%,0 82%,0 18%)",
    notched:
      "polygon(10% 0,90% 0,100% 10%,96% 20%,100% 30%,100% 85%,50% 100%,0 85%,0 30%,4% 20%,0 10%)",
    crown:
      "polygon(0 12%,15% 5%,30% 12%,50% 0,70% 12%,85% 5%,100% 12%,100% 82%,85% 95%,50% 100%,15% 95%,0 82%)",
    arch: "inset(0 round 40% 40% 8% 8%)",
    shield: "polygon(5% 0,95% 0,100% 75%,50% 100%,0 75%)",
    diamond: "polygon(15% 0,85% 0,100% 15%,95% 85%,50% 100%,5% 85%,0 15%)",
    rounded: "inset(0 round 12%)",
  };
  if (shapes[d.shape]) setSafeCardShape(card, shapes[d.shape]);
}
