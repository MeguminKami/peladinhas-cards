import { cardPlaystyles, cardStatsMarkup, cardOvrTrend } from "./card-player-content.js";
import { flag } from "./utils.js";
import { cardPhotoStyles } from "./card-photo.js";
import { safeImage } from "./assets.js";
// Shop editions are authored locally. No image requests or player reads.
import { GAME_DESIGNS } from "./casino-shop-game-art.js";
import { METAL_DESIGNS } from "./casino-shop-metal-art.js";
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const legacyDesigns = {
  "bronze-foundry": {
    shape: "28,6 272,6 291,31 285,339 258,390 150,417 42,390 15,339 9,31",
    art: '<path class="sca-metal" d="m9 31 19-25 20 20-14 280-19 33Zm282 0L272 6l-20 20 14 280 19 33ZM42 390l16-30 92 27 92-27 16 30-108 27Z"/><path class="sca-etch" d="m24 48 5 224M276 48l-5 224M67 381l83 22 83-22"/><g class="sca-detail"><circle cx="29" cy="40" r="4"/><circle cx="271" cy="40" r="4"/><circle cx="36" cy="329" r="4"/><circle cx="264" cy="329" r="4"/></g><path class="sca-motif" d="m111 100 39-25 39 25v51l-39 25-39-25Zm0 0 39 25 39-25m-39 25v51"/>',
  },
  "silver-mirror": {
    shape: "52,5 248,5 289,44 289,324 268,371 150,416 32,371 11,324 11,44",
    art: '<path class="sca-metal" d="M52 5h196l41 39-21 7-32-31H64L32 51l-21-7ZM11 324l21-10 16 43 102 39 102-39 16-43 21 10-21 47-118 45-118-45Z"/><path class="sca-prism" d="M33 57 75 27h145l-75 17ZM276 70l-12 215-21 44 11-211ZM53 367l97 36 90-34-90 13Z"/><path class="sca-etch" d="M20 76v219m260-219v219M64 15h172M62 371l88 32 88-32"/><path class="sca-motif" d="m150 71 46 48-46 60-46-60Zm0 0v108m-46-60h92m-69-24 46 48m0-48-46 48"/>',
  },
  "gold-vault": {
    shape:
      "31,12 114,12 125,3 175,3 186,12 269,12 293,36 286,349 260,386 150,416 40,386 14,349 7,36",
    art: '<path class="sca-metal" d="m7 36 24-24h83l11-9h50l11 9h83l24 24-24 14-12-19h-71l-16-9h-40l-16 9H43L31 50ZM14 349l26 37 110 30 110-30 26-37-24-6-15 25-97 26-97-26-15-25Z"/><path class="sca-etch" d="M23 65v244M277 65v244M48 375l102 28 102-28"/><g class="sca-detail"><circle cx="240" cy="102" r="33"/><circle cx="240" cy="102" r="23"/><path d="M240 69v66m-33-33h66m-56-23 46 46m0-46-46 46"/></g><path class="sca-motif" d="m113 84 37-18 37 18-6 67-31 24-31-24Z"/>',
  },
  "peladinhas-founders": {
    shape:
      "42,12 108,12 122,0 178,0 192,12 258,12 288,43 282,344 254,386 150,418 46,386 18,344 12,43",
    art: '<path class="sca-metal" d="M12 43 42 12h66l14-12h56l14 12h66l30 31-24 14-18-25h-63l-12-13h-42l-12 13H54L36 57ZM18 344l28 42 104 32 104-32 28-42-26-4-16 27-90 29-90-29-16-27Z"/><path class="sca-detail" d="m47 89 7 13-10 9 10 13-9 12 10 12-9 13m207-72-7 13 10 9-10 13 9 12-10 12 9 13"/><path class="sca-motif" d="M119 79h62v48q-2 28-31 44-29-16-31-44Zm14 10h34v34q0 18-17 30-17-12-17-30Z"/><path class="sca-etch" d="M33 65v243m234-243v243M63 379l87 28 87-28"/>',
  },
  "peladinhas-tactics": {
    shape: "26,8 274,8 292,29 283,346 260,385 150,417 40,385 17,346 8,29",
    art: '<path class="sca-metal" d="M8 29 26 8h248l18 21-30 14H38ZM17 346l23 39 110 32 110-32 23-39-25-2-15 22-93 29-93-29-15-22Z"/><path class="sca-detail" d="M55 58h190v148H55Zm95 0v148m-95-98h32v48H55m190-48h-32v48h32"/><circle class="sca-detail" cx="150" cy="132" r="26"/><path class="sca-motif" d="m99 99 52 18 46-38m-15 1 15-1-4 15M106 168l50-22 47 24m-15-2 15 2-7-13"/><g class="sca-prism"><circle cx="99" cy="99" r="6"/><circle cx="156" cy="146" r="6"/><circle cx="106" cy="168" r="6"/></g><path class="sca-etch" d="M25 63v240m250-240v240M51 379l99 29 99-29"/>',
  },
  "casino-royal": {
    shape:
      "18,25 62,25 72,5 111,21 150,0 189,21 228,5 238,25 282,25 291,53 282,343 256,385 150,419 44,385 18,343 9,53",
    art: '<path class="sca-metal" d="M9 53 18 25h44L72 5l39 16 39-21 39 21 39-16 10 20h44l9 28-25 6-9-16h-33l-9-17-28 12-37-18-37 18-28-12-9 17H43l-9 16ZM18 343l26 42 106 34 106-34 26-42-27 2-15 23-90 29-90-29-15-23Z"/><path class="sca-detail" d="M40 83q26 0 26 28T40 139m220-56q-26 0-26 28t26 28M39 157q25 0 25 28t-25 28m222-56q-25 0-25 28t25 28"/><path class="sca-motif" d="m150 70 35 52-35 52-35-52Zm0 17 24 35-24 35-24-35Z"/><path class="sca-etch" d="M26 66v245m248-245v245M57 381l93 29 93-29"/>',
  },
};

const designs = { ...legacyDesigns, ...METAL_DESIGNS, ...GAME_DESIGNS };
export const CASINO_SHOP_ART_IDS = Object.freeze(Object.keys(designs));
let previewSerial = 0;

export function renderCasinoShopCard(item, player = {}) {
  const id = Object.hasOwn(designs, item?.id) ? item.id : "bronze-foundry";
  const design = designs[id];
  const paint = `casino-shop-paint-${++previewSerial}`;
  const name = String(player.name || "A TUA CARTA");
  const ovr = player.hasCard === false ? "—" : (player.ovr ?? 0);
  const position = player.position || player.primaryPosition || "ALA";
  const statMarkup = cardStatsMarkup(player);
  const playstyles = cardPlaystyles(player);
  const playstyleMarkup = playstyles.length ? `<div class="card-playstyles" aria-label="Playstyles">${playstyles.map(p => `<img data-playstyle="${p.key}" src="${new URL(p.icon, new URL("../", import.meta.url)).href}" alt="Playstyle ${esc(p.name)}" title="${esc(p.name)} &middot; ${p.value}" width="128" height="128">`).join("")}</div>` : "";
  const photoStyles = cardPhotoStyles(player.photoDesign);
  const photo = `<div class="sca-photo-frame"><img src="${esc(new URL(safeImage(player.photoURL), new URL("../", import.meta.url)).href)}" alt="" data-fallback="${new URL("../assets/default-avatar.svg", import.meta.url).href}"${photoStyles.image ? ` style="${photoStyles.image}"` : ""}></div>`;
  // Unique paint IDs let several editions and repeated previews coexist.
  return `<div class="casino-shop-card sca-${id}" style="--sca-metal-fill:url(#${paint}-metal);--sca-shell-fill:url(#${paint}-shell)" role="img" aria-label="${esc(name)}, ${ovr} OVR, ${esc(position)}"><svg class="sca-art" viewBox="0 0 300 420" aria-hidden="true"><defs><linearGradient id="${paint}-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="sca-stop-bright"/><stop offset=".18" class="sca-stop-mid"/><stop offset=".38" class="sca-stop-bright"/><stop offset=".4" class="sca-stop-mid"/><stop offset=".7" class="sca-stop-base"/><stop offset=".91" class="sca-stop-mid"/><stop offset="1" class="sca-stop-bright"/></linearGradient><radialGradient id="${paint}-shell" cx=".7" cy=".2" r=".9"><stop class="sca-stop-mid" stop-opacity=".8"/><stop offset=".48" class="sca-stop-base"/><stop offset="1" class="sca-stop-shadow"/></radialGradient><linearGradient id="${paint}-skin"><stop stop-color="#f4c598"/><stop offset=".52" stop-color="#c79370"/><stop offset="1" stop-color="#795647"/></linearGradient></defs><polygon class="sca-shell" points="${design.shape}"/><path class="sca-surface" d="M42 48h216l-9 291-20 27-79 25-79-25-20-27Z"/>${typeof design.art === "function" ? design.art(paint) : design.art}<path class="sca-underlay" d="M48 270h204v70l-23 26-79 25-79-25-23-26Z"/><path class="sca-bottom-mark" d="m141 375 9-5 9 5-9 6Z"/></svg>${photo}<div class="sca-rating" aria-hidden="true"><b>${ovr}${cardOvrTrend(player)}</b><small>OVR</small><span>${esc(position)}</span><i>${flag(player.countryCode)}</i></div><div class="sca-identity" aria-hidden="true"><strong class="${name.length > 19 ? "sca-long-name" : ""}">${esc(name)}</strong><div class="sca-stats">${statMarkup}</div></div>${playstyleMarkup}</div>`;
}
