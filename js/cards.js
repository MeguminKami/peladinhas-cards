import { cardClip, expandCardOutline } from "./card-geometry.js";
import { applyCardTemplate } from "./card-design.js";
import { cardPhotoStyles } from "./card-photo.js";
import { SPECIAL_CARD_DESIGNS } from "./card-specials.js";
import { ATTRIBUTES, flag } from "./utils.js";
import { esc } from "./ui.js";
import { safeImage, ASSET_PATHS, PLAYSTYLE_ICONS } from "./assets.js";
export function cardPlaystyles(player) {
  if (player.hasCard === false) return [];
  return ATTRIBUTES.filter(
    ([key]) =>
      PLAYSTYLE_ICONS[key] &&
      Number.isFinite(player.stats?.[key]) &&
      player.stats[key] >= 90,
  )
    .sort(([a], [b]) => player.stats[b] - player.stats[a])
    .slice(0, 3)
    .map(([key, name]) => ({
      key,
      name,
      value: player.stats[key],
      icon: PLAYSTYLE_ICONS[key],
    }));
}
export function card(player, { size = "md", theme, preview = false } = {}) {
  const chosenTheme =
    theme ||
    (player.specials?.some((s) => s.id === player.selectedCardId)
      ? player.selectedCardId
      : null) ||
    player.specials?.[0]?.id ||
    player.cardType ||
    "bronze-common";
  const template = player.specials?.find(
    (sp) => sp.id === chosenTheme,
  )?.cardTheme;
  const t = template?.baseTheme || chosenTheme;
  const special = SPECIAL_CARD_DESIGNS[t];
  const specialShape = special?.outline
    .split(" ")
    .map((point) =>
      point
        .split(",")
        .map((n) => `${n}%`)
        .join(" "),
    )
    .join(", ");
  const specialArt = special
    ? `<svg class="special-ornament" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><polygon class="special-outline" points="${expandCardOutline(special.outline)}" transform="translate(1.5 1.5) scale(.97)"/><polygon class="special-inner" points="${expandCardOutline(special.outline)}" transform="translate(4 4) scale(.92)"/><g class="special-motif">${special.motif}</g></svg><span class="special-insignia" aria-hidden="true">${t === "perfect-five" ? "★★★★★" : "◆"}</span>`
    : "";
  const normal = /^(bronze|silver|gold)-(common|rare)$/.test(t);
  const rare = normal && t.endsWith("-rare");
  const outline =
    special?.outline ||
    (rare
      ? "9,6 38,6 50,1 62,6 91,6 98,13 94,18 98,23 98,79 94,88 81,95 50,99 19,95 6,88 2,79 2,23 6,18 2,13"
      : undefined);
  const clip = cardClip(outline);
  const rareRim = rare
    ? `<svg class="rare-rim-detail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><polygon class="rare-rim-outline" points="${expandCardOutline(outline)}" transform="translate(.8 .8) scale(.984)"/><path class="rare-rim-highlight" d="M12 2.5H36M64 2.5H88M2.8 12V37M97.2 12V37M2.8 63V90M97.2 63V90M16 98.8H36M64 98.8H84"/><path class="rare-rim-inlay" d="m50 1.3 2.5 1.5L50 4.3l-2.5-1.5ZM3 43l1 3-1 3-1-3ZM97 43l1 3-1 3-1-3Z"/></svg>`
    : "";
  const ornament = normal
    ? `<svg class="card-ornament" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true" focusable="false">${
        rare
          ? '<path class="ornament-outline" d="M50 2 62 9 91 9 98 19 94 27 98 35V119L93 126 94 132 81 142 50 148 19 142 6 132 7 126 2 119V35L6 27 2 19 9 9H38Z"/><path class="ornament-facets" d="M10 2 3 11 6 45 11 21ZM90 2 97 11 94 45 89 21ZM5 100 8 130 22 139 15 121ZM95 100 92 130 78 139 85 121ZM28 141 50 148 72 141 50 143Z"/><path class="ornament-lines" d="M15 5H85L94 14 91 128 80 138 50 146 20 138 9 128 6 14ZM10 50V95M90 50V95M20 100H80"/><path class="ornament-gem" d="m50 4 3 3-3 3-3-3Z"/>'
          : '<path class="ornament-lines" d="M15 5H36M64 5H85M3.5 19V59M96.5 19V59M3.5 99V135M96.5 99V135M18 148H38M62 148H82"/><path class="common-edge-highlight" d="M12 3H34M66 3H88M2.5 23V52M97.5 23V52M20 147H37M63 147H80"/><path class="common-edge-inlay" d="M1 17 4 13 4 18ZM99 17 96 13 96 18ZM2 137l3 7H2ZM98 137l-3 7h3Z"/>'
      }</svg>`
    : "";
  const stats = player.stats || {};
  const photoStyles = cardPhotoStyles(player.cardPhoto?.design);
  const photoURL = player.cardPhoto?.photoURL || player.photoURL;
  const playstyles = cardPlaystyles(player);
  const trend =
    player.hasCard !== false &&
    Number.isFinite(player.ovrDelta) &&
    player.ovrDelta !== 0
      ? `<span class="card-ovr-trend ${player.ovrDelta > 0 ? "positive" : "negative"}" role="img" aria-label="${player.ovrDelta > 0 ? "Subiu" : "Desceu"} OVR face à semana anterior">${player.ovrDelta > 0 ? "↑" : "↓"}</span>`
      : "";
  return `<${preview ? "div" : "a"} ${preview ? "" : `href="#/player/${esc(player.uid)}"`} ${template ? `data-reward-template="${esc(JSON.stringify(template))}"` : ""} class="football-card card-${size} ${esc(t)}${special ? " card-special" : ""}" ${special ? `style="--special-shape:polygon(${specialShape})"` : ""} ${preview ? "" : `aria-label="Ver perfil de ${esc(player.displayName || player.username)}"`}>${clip.markup}<div class="card-surface" style="clip-path:url(#${clip.id})"><div class="card-frame"></div>${ornament}${specialArt}${rareRim}<div class="card-rating"><strong>${player.hasCard === false ? "—" : (player.ovr ?? 0)}${trend}</strong><span>OVR</span><small>${esc(player.primaryPosition || "ALA")}</small><span>${flag(player.countryCode)}</span></div><div class="card-photo"${photoStyles.photo ? ` style="${photoStyles.photo}"` : ""}><img${photoStyles.image ? ` style="${photoStyles.image}"` : ""} src="${esc(safeImage(photoURL))}" alt="" data-fallback="${ASSET_PATHS.avatar}"></div><div class="card-caption${(player.displayName || player.username || "").length > 16 ? " long-name" : ""}"><h3>${esc(player.displayName || player.username || "Jogador")}</h3></div><div class="card-stats">${ATTRIBUTES.slice(
    0,
    8,
  )
    .map(
      ([k, , abbr]) =>
        `<span><b>${player.hasCard === false ? "—" : (stats[k] ?? 0)}${player.hasCard === false ? "" : cardStatTrend(stats[k], player.previousStats?.[k])}</b><small>${abbr}</small></span>`,
    )
    .join(
      "",
    )}</div></div>${playstyles.length ? `<div class="card-playstyles" aria-label="Playstyles">${playstyles.map((p) => `<img data-playstyle="${p.key}" src="${p.icon}" alt="Playstyle ${esc(p.name)}" title="${esc(p.name)} · ${p.value}" width="128" height="128">`).join("")}</div>` : ""}</${preview ? "div" : "a"}>`;
}
function cardStatTrend(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return "";
  const delta = Math.round((current - previous) * 100) / 100;
  if (!delta) return "";
  return `<sup class="card-stat-trend ${delta > 0 ? "positive" : "negative"}" aria-label="${delta > 0 ? "Subiu" : "Desceu"} face à semana anterior" title="Face à semana anterior">${delta > 0 ? "↑" : "↓"}</sup>`;
}
export function weeklyEvolution(player) {
  if (!player?.hasCard) return "";
  if (!Number.isFinite(player.ovrDelta))
    return '<p class="weekly-evolution-note">Sem carta da semana anterior para comparar.</p>';
  const delta = player.ovrDelta;
  const changes = ATTRIBUTES.filter(([key]) =>
    Number.isFinite(player.previousStats?.[key]),
  ).map(([key]) => player.stats[key] - player.previousStats[key]);
  const up = changes.filter((value) => value > 0).length;
  const down = changes.filter((value) => value < 0).length;
  return `<div class="weekly-evolution" aria-label="Evolução face à carta da semana anterior"><span class="weekly-evolution-label">Face à semana anterior</span><span class="weekly-evolution-value ${delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"}">${delta > 0 ? "↑ +" : delta < 0 ? "↓ −" : "= "}${Math.abs(delta)} OVR</span>${up ? `<span class="weekly-evolution-value positive">↑ ${up} atributos</span>` : ""}${down ? `<span class="weekly-evolution-value negative">↓ ${down} atributos</span>` : ""}</div>`;
}
export function bindImages(root = document) {
  root
    .querySelectorAll(".football-card[data-reward-template]")
    .forEach((element) => {
      const template = JSON.parse(element.dataset.rewardTemplate);
      delete element.dataset.rewardTemplate;
      applyCardTemplate(element, template);
    });
  root.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.onerror = () => {
      img.onerror = null;
      img.src = img.dataset.fallback;
    };
  });
}
