// Shared visual catalog. Ownership and eligibility live in achievements and reward rules.
import { FUT_INSPIRED_EDITIONS } from "./card-fut-themes.js";
import { PATH_CARD_EDITIONS } from "./path-card-designs.js";
export const COLLECTION_EDITIONS = Object.freeze({
  ...PATH_CARD_EDITIONS,
  ...FUT_INSPIRED_EDITIONS,
  apogee: {
    name: "Apogeu",
    detail: "Safira e ouro · o topo do jogo",
    outline:
      "50,0 62,5 86,5 100,18 96,78 90,90 70,97 50,100 30,97 10,90 4,78 0,18 14,5 38,5",
    motif: '<path d="m62 32 6-13 7 7 7-7 6 13ZM65 39h20m-17 5h14"/>',
    art: '<path class="collection-solid" d="M0 0h22L6 49ZM100 0H78l16 49ZM0 100l22-35-9 35Zm100 0L78 65l9 35Z"/><path d="m6 50 14-35 30-9 30 9 14 35M9 55l14-35 27-9 27 9 14 35M5 91l18-12m72 12L77 79"/><path class="collection-fine" d="M27 8v36M32 7v31M73 8v36M68 7v31"/>',
  },
  legacy: {
    name: "Legado",
    detail: "Marfim esculpido · classe intemporal",
    outline:
      "16,0 40,0 50,5 60,0 84,0 100,16 96,84 82,96 50,100 18,96 4,84 0,16",
    motif:
      '<path d="M64 43V23h22v20M62 23l13-9 13 9M69 27v13m6-13v13m6-13v13M61 44h28"/>',
    art: '<path class="collection-solid" d="M0 0h18v100H0ZM82 0h18v100H82Z"/><path d="M9 12v76m5-72v67m72-67v67m5-71v76M6 12h14M80 12h14M7 88h12m62 0h12"/><path class="collection-fine" d="m18 0 20 23-6 15 28 24-8 16 22 22M68 0 55 17l8 18-20 17 9 17-17 31"/>',
  },
  titan: {
    name: "Titã",
    detail: "Obsidiana e cobre · força monumental",
    outline: "0,8 18,8 25,0 75,0 82,8 100,8 96,86 80,96 50,100 20,96 4,86",
    motif: '<path d="M65 17h20v13L75 43 65 30Zm-5 5h5m20 0h5M70 44h10"/>',
    art: '<path class="collection-solid" d="m0 0 25 12L7 62ZM100 0 75 12l18 50ZM0 100l28-18-8 18Zm100 0L72 82l8 18Z"/><path d="M7 6 22 15 7 55m86-49L78 15l15 40M8 90l20-10m64 10L72 80M28 5h44"/><path class="collection-fine" d="M4 66h15M81 66h15M5 71h12M83 71h12"/>',
  },
  supernova: {
    name: "Supernova",
    detail: "Ametista cósmica · energia estelar",
    outline:
      "50,0 60,6 82,2 92,12 100,16 96,82 85,95 50,100 15,95 4,82 0,16 8,12 18,2 40,6",
    motif: '<path d="m75 12 4 11 12 5-12 5-4 12-4-12-12-5 12-5Z"/>',
    art: '<ellipse cx="60" cy="30" rx="46" ry="15" transform="rotate(-38 60 30)"/><ellipse class="collection-fine" cx="60" cy="30" rx="49" ry="19" transform="rotate(-38 60 30)"/><path d="m12 15 1 4 4 1-4 1-1 4-1-4-4-1 4-1ZM85 51l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/><path class="collection-solid" d="m0 100 34-49-16 49ZM100 0 72 18 82 0Z"/>',
  },
  aurora: {
    name: "Aurora",
    detail: "Opala holográfica · luz em movimento",
    outline: "24,0 76,0 94,8 100,23 96,80 88,94 50,100 12,94 4,80 0,23 6,8",
    motif:
      '<path d="m75 13 14 16-14 16-14-16Zm-14 16h28M75 13l-5 16 5 16 5-16Z"/>',
    art: '<path d="M-10 65Q20-10 60 14t50-10M-10 73Q20-2 60 22t50-10M-10 81Q20 6 60 30t50-10"/><path class="collection-fine" d="M-10 69Q20-6 60 18t50-10M-10 77Q20 2 60 26t50-10M-10 85Q20 10 60 34t50-10"/><path class="collection-solid" d="m0 100 100-42v16L0 100Z"/>',
  },
  eclipse: {
    name: "Eclipse",
    detail: "Ónix e ouro solar · uma presença rara",
    outline:
      "50,0 68,5 86,2 100,17 96,85 80,96 50,100 20,96 4,85 0,17 14,2 32,5",
    motif:
      '<circle cx="75" cy="29" r="13"/><path d="M80 17a13 13 0 0 0 0 24M75 10v4m0 30v4M56 29h4m30 0h4"/>',
    art: '<circle cx="61" cy="28" r="27"/><circle class="collection-fine" cx="61" cy="28" r="30"/><path d="M61 0v-8M35 4l-5-6m57 6 5-6M31 28h-8m76 0h-8M39 50l-5 5m49-5 5 5"/><path class="collection-solid" d="M0 100V75l25 25Zm100 0V75l-25 25Z"/>',
  },
  inferno: {
    name: "Inferno",
    detail: "Rubi vulcânico · intensidade máxima",
    outline:
      "10,0 30,7 42,0 50,6 58,0 70,7 90,0 100,18 96,82 84,94 50,100 16,94 4,82 0,18",
    motif:
      '<path d="M63 40c-7-14 12-17 10-29 18 12 23 23 12 31 2-10-5-12-7-18 0 12-9 10-8 20Z"/>',
    art: '<path class="collection-solid" d="m0 0 24 32-10 24 18 24L0 63Zm100 0L76 32l10 24-18 24 32-17Z"/><path d="m7 0 18 31-8 22 16 22-8 25M93 0 75 31l8 22-16 22 8 25"/><path class="collection-fine" d="m0 30 13 14-5 20 16 17M100 30 87 44l5 20-16 17"/>',
  },
  glacial: {
    name: "Glacial",
    detail: "Cristal polar · precisão absoluta",
    outline:
      "20,0 36,5 50,0 64,5 80,0 100,20 96,83 84,94 50,100 16,94 4,83 0,20",
    motif:
      '<path d="M75 11v36M59 20l32 18M59 38l32-18M70 14l5 5 5-5m-10 30 5-5 5 5M60 25l7-2-1-7m18 26-1-7 7-2M60 33l7 2-1 7m18-26-1 7 7 2"/>',
    art: '<path class="collection-solid" d="M0 0h32L5 57ZM100 0H68l27 57ZM0 100l27-27-8 27Zm100 0L73 73l8 27Z"/><path d="m8 8 23 7L7 58m85-50-23 7 24 43M7 82l17 9m69-9-17 9"/><path class="collection-fine" d="M18 0 10 31 33 9M82 0l8 31L67 9"/>',
  },
  dynasty: {
    name: "Dinastia",
    detail: "Veludo imperial · herança de campeão",
    outline:
      "50,0 60,8 76,3 85,10 94,5 100,22 96,83 83,95 50,100 17,95 4,83 0,22 6,5 15,10 24,3 40,8",
    motif: '<path d="m61 22 8 7 6-15 6 15 8-7-5 19H66ZM66 45h18"/>',
    art: '<path d="M17 8Q3 18 14 29Q23 35 12 44Q3 52 15 61M83 8Q97 18 86 29Q77 35 88 44Q97 52 85 61M9 69q14 3 5 13l-5 6m82-19q-14 3-5 13l5 6"/><path class="collection-fine" d="M21 7Q7 18 18 28Q27 35 16 44M79 7Q93 18 82 28Q73 35 84 44M24 3l26 9L76 3"/><path class="collection-solid" d="m0 0 9 10v80l-9 10Zm100 0-9 10v80l9 10Z"/>',
  },
  carnival: {
    name: "Carnaval",
    detail: "Rosa elétrico · futebol em festa",
    outline:
      "12,0 32,4 50,0 68,4 88,0 100,14 96,84 86,95 50,100 14,95 4,84 0,14",
    motif:
      '<path d="m63 40 4-24 20 20Zm4-24 20 20M82 14l3-5m3 14 7-2M61 27l-5-2M78 42l2 5"/>',
    art: '<path class="collection-solid" d="m0 0 24 12L0 44Zm100 0L68 14l32 25ZM0 100l34-23-12 23Zm100 0L72 78l8 22Z"/><path d="m10 13 8 4-4 8m68-11-6 6 8 7M9 47l7-2m70 8 6 4M24 6l2 5m47-2 3-5M9 79l8 3m66-8 6-2"/><circle cx="26" cy="30" r="2"/><circle cx="88" cy="38" r="2"/><path class="collection-fine" d="M-4 62Q25 14 55 44t50-9M-4 67Q25 19 55 49t50-9"/>',
  },
});
export const COLLECTION_THEME_IDS = Object.freeze(
  Object.keys(COLLECTION_EDITIONS),
);
export const RESERVED_COLLECTION_IDS = Object.freeze([
  "apogee",
  "legacy",
  "titan",
  "carnival",
]);
export const ACTIVE_COLLECTION_IDS = Object.freeze(
  COLLECTION_THEME_IDS.filter((id) => !RESERVED_COLLECTION_IDS.includes(id)),
);
