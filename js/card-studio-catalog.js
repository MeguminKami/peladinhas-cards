export const STUDIO_FONTS = {
  dinRegular: [
    "DIN Pro Condensed Regular",
    '"DIN Pro Condensed Regular", "DIN Pro Condensed", "Arial Narrow", sans-serif',
  ],
  dinMedium: [
    "DIN Pro Condensed Medium",
    '"DIN Pro Condensed Medium", "DIN Pro Condensed", "Arial Narrow", sans-serif',
  ],
  dinBold: [
    "DIN Pro Condensed Bold",
    '"DIN Pro Condensed Bold", "DIN Pro Condensed", Impact, sans-serif',
  ],
  posterama: [
    "Posterama 1927 Bold",
    '"Posterama 1927 Bold", "Posterama 1927", "Arial Black", sans-serif',
  ],
  condensed: [
    "Barlow Condensed",
    '"Barlow Condensed", "Arial Narrow", sans-serif',
  ],
  geometric: ["Geométrica", '"Century Gothic", Futura, sans-serif'],
  slab: ["Slab editorial", "Rockwell, Georgia, serif"],
  sport: [
    "Desportiva",
    'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
  ],
  modern: ["Moderna", '"Segoe UI", Arial, sans-serif'],
  heavy: ["Bold", '"Arial Black", Gadget, sans-serif'],
  narrow: [
    "Condensada",
    '"Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif',
  ],
  editorial: ["Editorial", 'Georgia, "Times New Roman", serif'],
  classic: ["Clássica", '"Palatino Linotype", "Book Antiqua", Palatino, serif'],
  rounded: ["Humanista", '"Trebuchet MS", Arial, sans-serif'],
  mono: ["Monoespaçada", '"Courier New", monospace'],
};
export const STUDIO_BACKGROUNDS = {
  original: ["Original", "none"],
  solid: ["Cor sólida", "var(--studio-primary)"],
  diagonal: [
    "Diagonal",
    "linear-gradient(var(--studio-angle,135deg),var(--studio-primary) var(--studio-spread,35%),var(--studio-secondary))",
  ],
  radial: [
    "Halo",
    "radial-gradient(ellipse at var(--studio-x,50%) var(--studio-y,25%),var(--studio-secondary),var(--studio-primary) var(--studio-spread,65%))",
  ],
  split: [
    "Bicolor",
    "linear-gradient(var(--studio-angle,135deg),var(--studio-primary) max(0%,calc(var(--studio-spread,50%) - 25%)),var(--studio-secondary) min(100%,calc(var(--studio-spread,50%) + 25%)))",
  ],
  aurora: [
    "Aurora",
    "radial-gradient(ellipse at 20% 15%,var(--studio-secondary),transparent 65%),linear-gradient(145deg,var(--studio-primary),#080c1b)",
  ],
  mesh: [
    "Mesh",
    "radial-gradient(at 85% 10%,var(--studio-secondary),transparent 55%),radial-gradient(at 10% 80%,var(--studio-secondary),transparent 65%),var(--studio-primary)",
  ],
  diagonal: [
    "Diagonal",
    "repeating-linear-gradient(135deg,transparent 0 12px,#ffffff14 12px 14px),linear-gradient(145deg,var(--studio-primary),var(--studio-secondary))",
  ],
  dots: [
    "Pontos",
    "radial-gradient(#ffffff30 1px,transparent 1.5px),linear-gradient(160deg,var(--studio-primary),var(--studio-secondary))",
  ],
  grid: [
    "Grelha",
    "repeating-linear-gradient(0deg,#ffffff12 0 1px,transparent 1px 20px),repeating-linear-gradient(90deg,#ffffff12 0 1px,transparent 1px 20px),linear-gradient(var(--studio-primary),var(--studio-secondary))",
  ],
  rays: [
    "Raios",
    "repeating-conic-gradient(from 20deg at 50% 28%,#ffffff12 0 7deg,transparent 7deg 17deg),linear-gradient(var(--studio-primary),var(--studio-secondary))",
  ],
  marble: [
    "Mármore",
    "repeating-linear-gradient(120deg,transparent 0 22px,#ffffff1a 24px,#00000014 26px,transparent 32px),linear-gradient(30deg,var(--studio-primary),var(--studio-secondary))",
  ],
  waves: [
    "Ondas",
    "repeating-radial-gradient(ellipse at 0 0,transparent 0 16px,#ffffff14 17px 19px,transparent 20px 32px),linear-gradient(145deg,var(--studio-primary),var(--studio-secondary))",
  ],
  prism: [
    "Prisma",
    "conic-gradient(from 45deg at 60% 40%,var(--studio-primary),var(--studio-secondary),var(--studio-primary),var(--studio-secondary),var(--studio-primary))",
  ],
  pitch: [
    "Campo",
    "repeating-linear-gradient(90deg,#ffffff0d 0 30px,transparent 30px 60px),linear-gradient(var(--studio-primary),var(--studio-secondary))",
  ],
  halftone: [
    "Halftone",
    "radial-gradient(#00000033 2px,transparent 2.5px),linear-gradient(160deg,var(--studio-primary),var(--studio-secondary))",
  ],
  sunset: [
    "Horizonte",
    "linear-gradient(0deg,var(--studio-primary) 10%,var(--studio-secondary) 55%,var(--studio-primary) 100%)",
  ],
};
// Each palette combines two surface hues with contrasting text, frame and light.
export const STUDIO_PALETTES = {
  gold: [
    "Coroa Solar",
    ["#E8CF77", "#B99A44", "#10121C", "#F8E7A8", "#40331B"],
  ],
  midnight: [
    "Prata Lunar",
    ["#DDE0E2", "#929CA6", "#10121C", "#F7F8FA", "#444C55"],
  ],
  amethyst: [
    "Cobre Ancestral",
    ["#C99570", "#86543B", "#10121C", "#E8B995", "#402A25"],
  ],
  emerald: [
    "Noite de Gala",
    ["#111114", "#25272D", "#FFFFFF", "#CBA64D", "#F8E7A6"],
  ],
  crimson: [
    "Trono Celeste",
    ["#071B55", "#1238A0", "#FFFFFF", "#D9B85F", "#F5E1A0"],
  ],
  ice: [
    "Maré de Glória",
    ["#08235B", "#1159C7", "#FFFFFF", "#E8C95B", "#8AD9FF"],
  ],
  copper: [
    "Festa Astral",
    ["#482075", "#A535C5", "#FFFFFF", "#F34AA5", "#F4D3FF"],
  ],
  monochrome: [
    "Pulso do Futuro",
    ["#0D2757", "#13B4D5", "#FFFFFF", "#EE4EBA", "#B3F4FF"],
  ],
  neon: [
    "Prisma Mutante",
    ["#28135C", "#6431A4", "#FFFFFF", "#20D6BF", "#F349C8"],
  ],
  pearl: [
    "Rebelde Solar",
    ["#32104F", "#DD3769", "#FFFFFF", "#F07328", "#18101F"],
  ],
  ocean: [
    "Radar Laranja",
    ["#151723", "#343C65", "#FFFFFF", "#E58B27", "#F7B45B"],
  ],
  fire: [
    "Manchete Rubra",
    ["#B91D3A", "#ED573B", "#FFFFFF", "#E5B96E", "#511A39"],
  ],
  palette0: [
    "Solstício Polar",
    ["#103C5C", "#34B4B2", "#FFFFFF", "#E6FBF8", "#B53C6B"],
  ],
  palette1: [
    "Miragem Arcana",
    ["#291C64", "#6845C0", "#FFFFFF", "#36D7C5", "#BBA8FF"],
  ],
  palette2: [
    "Sonho Elétrico",
    ["#25114D", "#7244B5", "#FFFFFF", "#E458D4", "#53E5D5"],
  ],
  palette3: [
    "Comando Escarlate",
    ["#162E50", "#CB363F", "#FFFFFF", "#E3C073", "#F7EBDB"],
  ],
  palette4: [
    "Lenda de Âmbar",
    ["#462622", "#A95137", "#FFFFFF", "#E4A65A", "#F8D3A0"],
  ],
  palette5: [
    "Templo de Marfim",
    ["#F4F0E5", "#DED5BF", "#10121C", "#B99C63", "#FFFFFF"],
  ],
  palette6: [
    "Memória Imperial",
    ["#172953", "#345A94", "#FFFFFF", "#DBBC78", "#DDEBFF"],
  ],
  palette7: [
    "Rota da Conquista",
    ["#091B48", "#164C9D", "#FFFFFF", "#F0A539", "#71C4FF"],
  ],
  palette8: [
    "Passaporte Real",
    ["#162A68", "#3964C5", "#FFFFFF", "#D59C3F", "#EDE1A5"],
  ],
  palette9: [
    "Rosa Explosiva",
    ["#E92A91", "#FA65BA", "#10121C", "#F9C7E6", "#772A9E"],
  ],
  palette10: [
    "Relíquia Dourada",
    ["#DCC49C", "#AA824D", "#10121C", "#F8F0D9", "#5C4733"],
  ],
  palette11: [
    "Dinastia de Seda",
    ["#30204A", "#8A346F", "#FFFFFF", "#CC9F62", "#F4D8AB"],
  ],
  palette12: [
    "Trovão Imperial",
    ["#151524", "#543DA5", "#FFFFFF", "#F2B54E", "#F5ECDE"],
  ],
  palette13: [
    "Rasto de Cometa",
    ["#271A31", "#BD3E6B", "#FFFFFF", "#EE8C41", "#FFDA93"],
  ],
  palette14: [
    "Arena Nobre",
    ["#263A56", "#C7A46A", "#FFFFFF", "#F5E8CC", "#A34C42"],
  ],
  palette15: [
    "Fúria Vulcânica",
    ["#541B28", "#D83C2F", "#FFFFFF", "#FA963F", "#FFDB8D"],
  ],
  palette16: [
    "Coração Glacial",
    ["#0C3E69", "#288DC5", "#FFFFFF", "#9BE8FA", "#EAFBFF"],
  ],
  palette17: [
    "Feitiço da Meia-Noite",
    ["#211337", "#713C9D", "#FFFFFF", "#E87529", "#BDE65B"],
  ],
  palette18: [
    "Samba Neon",
    ["#063E3C", "#087A62", "#FFFFFF", "#FFE34D", "#FF4FAD"],
  ],
  palette19: [
    "Pitaya Cósmica",
    ["#40146B", "#9B1978", "#FFFFFF", "#B6FF47", "#56F5E4"],
  ],
  palette20: [
    "Coral Atómico",
    ["#FF765B", "#FFB74D", "#10121C", "#0A6570", "#CFFFF4"],
  ],
  palette21: [
    "Onda Ultravioleta",
    ["#172378", "#512DB5", "#FFFFFF", "#39F6D2", "#FF74DF"],
  ],
  palette22: [
    "Jade Soberano",
    ["#073D34", "#11754F", "#FFFFFF", "#EBCD66", "#68FFB0"],
  ],
  palette23: [
    "Lavanda Solar",
    ["#DAC9FF", "#FFD293", "#10121C", "#553291", "#FFFFF0"],
  ],
  palette24: [
    "Asfalto Laser",
    ["#111A25", "#29374A", "#FFFFFF", "#C6FF36", "#16DFF8"],
  ],
  palette25: [
    "Rubi Tropical",
    ["#65124C", "#AF2259", "#FFFFFF", "#4FF5C0", "#FFE45E"],
  ],
  palette26: [
    "Manga Galáctica",
    ["#FFBF47", "#FF7E70", "#10121C", "#50349A", "#DCFDFF"],
  ],
  palette27: [
    "Petróleo Elétrico",
    ["#04344D", "#08667B", "#FFFFFF", "#FFDA38", "#FF58BE"],
  ],
  palette28: [
    "Dragão Esmeralda",
    ["#123F20", "#376728", "#FFFFFF", "#F8DE51", "#40F5CB"],
  ],
  palette29: [
    "Orquídea Real",
    ["#351C67", "#6E267D", "#FFFFFF", "#FFD064", "#FF8DDF"],
  ],
  palette30: [
    "Atlântida Pop",
    ["#064B62", "#177D8A", "#FFFFFF", "#FF91D4", "#F4ED65"],
  ],
  palette31: [
    "Pêssego Turbo",
    ["#FFD1AF", "#F6B9DE", "#10121C", "#80346B", "#73DCCE"],
  ],
  palette32: [
    "Limão Magnético",
    ["#D5ED6B", "#85D6B1", "#10121C", "#23365A", "#FF6B9D"],
  ],
  palette33: [
    "Veludo de Fogo",
    ["#4F133C", "#9C2D37", "#FFFFFF", "#FFBF56", "#67E7FF"],
  ],
  palette34: [
    "Safira Rebelde",
    ["#101F63", "#313AA5", "#FFFFFF", "#FF783D", "#5DF0F2"],
  ],
  palette35: [
    "Gelo de Melancia",
    ["#BDF4E9", "#FFD0D9", "#10121C", "#185A60", "#EF5680"],
  ],
  palette36: [
    "Carnaval Profundo",
    ["#18254B", "#512564", "#FFFFFF", "#F8CF49", "#3DE1D6"],
  ],
  palette37: [
    "Ouro Aurora",
    ["#ECD37B", "#F5B77C", "#10121C", "#743C82", "#57DFCE"],
  ],
};
export const STUDIO_DECORATIONS = {
  original: "Original",
  none: "Clean",
  facets: "Facetas",
  stripes: "Faixas",
  stars: "Constelação",
  hexagons: "Hexágonos",
  wings: "Asas",
  ribbons: "Fitas",
  lightning: "Relâmpagos",
  laurel: "Louros",
  corners: "Cantos",
  orbit: "Órbitas",
};
export const STUDIO_EFFECTS = {
  original: "Original",
  none: "Sem efeito",
  foil: "Folha metálica",
  holographic: "Holográfico",
  grain: "Grão",
  glow: "Luz secundária",
  glass: "Vidro",
  duotone: "Duotone",
  spotlight: "Spotlight",
};
export const STUDIO_WATERMARKS = {
  none: "Sem marca",
  ball: "Bola",
  crest: "Escudo",
  star: "Estrela",
  crown: "Coroa",
  laurel: "Louros",
  hexagon: "Hexágono",
  logo: "Peladinhas",
  number: "Número 10",
};
export const STUDIO_BORDERS = {
  original: "Original",
  none: "Sem moldura",
  single: "Linha fina",
  double: "Dupla",
  glow: "Luminosa",
  dashed: "Tracejada",
  corners: "Cantos",
};
export const STUDIO_LAYOUTS = {
  classic: [
    "Clássica",
    {
      photoX: 31,
      photoY: 7,
      photoWidth: 65,
      photoHeight: 46,
      nameY: 57,
      statsY: 67,
      ratingX: 10,
      ratingY: 12,
    },
  ],
  portrait: [
    "Retrato",
    {
      photoX: 15,
      photoY: 3,
      photoWidth: 82,
      photoHeight: 51,
      nameY: 57,
      statsY: 67,
      ratingX: 10,
      ratingY: 12,
    },
  ],
  spotlight: [
    "Destaque",
    {
      photoX: 25,
      photoY: 1,
      photoWidth: 75,
      photoHeight: 55,
      nameY: 57,
      statsY: 67,
      ratingX: 10,
      ratingY: 12,
    },
  ],
  balanced: [
    "Equilibrada",
    {
      photoX: 35,
      photoY: 10,
      photoWidth: 60,
      photoHeight: 44,
      nameY: 57,
      statsY: 67,
      ratingX: 10,
      ratingY: 12,
    },
  ],
  compact: [
    "Compacta",
    {
      photoX: 32,
      photoY: 9,
      photoWidth: 62,
      photoHeight: 40,
      nameY: 57,
      statsY: 67,
      ratingX: 10,
      ratingY: 12,
    },
  ],
};
export const STUDIO_PRESETS = [
  [
    "gold-elite",
    "Ouro de elite",
    "gold-rare",
    "gold",
    "marble",
    "facets",
    "foil",
    "crest",
    "original",
  ],
  [
    "night-champion",
    "Campeão da noite",
    "mvp",
    "midnight",
    "rays",
    "stars",
    "spotlight",
    "crown",
    "shield",
  ],
  [
    "violet-wave",
    "Onda violeta",
    "in-form",
    "amethyst",
    "waves",
    "orbit",
    "holographic",
    "star",
    "diamond",
  ],
  [
    "emerald-club",
    "Clube esmeralda",
    "the-wall",
    "emerald",
    "pitch",
    "laurel",
    "glow",
    "crest",
    "shield",
  ],
  [
    "red-storm",
    "Tempestade vermelha",
    "hot-streak",
    "crimson",
    "diagonal",
    "lightning",
    "duotone",
    "ball",
    "ticket",
  ],
  [
    "ice-master",
    "Mestre do gelo",
    "playmaker",
    "ice",
    "grid",
    "hexagons",
    "glass",
    "hexagon",
    "hexagon",
  ],
  [
    "copper-classic",
    "Cobre clássico",
    "bronze-rare",
    "copper",
    "original",
    "corners",
    "foil",
    "laurel",
    "original",
  ],
  [
    "neon-future",
    "Néon futurista",
    "engine",
    "neon",
    "grid",
    "lightning",
    "glow",
    "logo",
    "notched",
  ],
  [
    "pearl-icon",
    "Ícone pérola",
    "legend-form",
    "pearl",
    "marble",
    "laurel",
    "foil",
    "crown",
    "crown",
  ],
  [
    "ocean-flow",
    "Ondas do oceano",
    "safe-hands",
    "ocean",
    "waves",
    "wings",
    "glass",
    "ball",
    "rounded",
  ],
  [
    "graphic-pro",
    "Grafismo profissional",
    "gold-common",
    "monochrome",
    "halftone",
    "ribbons",
    "grain",
    "number",
    "arch",
  ],
  [
    "fire-striker",
    "Goleador de fogo",
    "sniper",
    "fire",
    "sunset",
    "stripes",
    "spotlight",
    "star",
    "diamond",
  ],
];
export const WATERMARK_ART = {
  ball: '<circle cx="50" cy="50" r="43"/><path d="m50 30 20 15-8 24H38l-8-24Z M50 7v23M7 50l23-5M22 85l16-16M78 85 62 69M93 50l-23-5"/>',
  crest: '<path d="M50 7 86 21v35c0 19-36 38-36 38S14 75 14 56V21Z"/>',
  star: '<path d="m50 4 13 30 33 3-25 23 7 34-28-18-28 18 7-34L4 37l33-3Z"/>',
  crown: '<path d="m10 25 23 20L50 12l17 33 23-20-9 52H19Z M20 89h60"/>',
  laurel:
    '<path d="M41 90C5 74 12 30 30 12M59 90c36-16 29-60 11-78 M21 30 9 22M18 44 5 40M22 61 7 61M30 75l-15 6M79 30l12-8M82 44l13-4M78 61h15M70 75l15 6"/>',
  hexagon: '<path d="m50 4 41 23v46L50 96 9 73V27Z"/>',
  logo: '<path d="M50 5 85 20v35L50 95 15 55V20Z m0 20 20 15-8 24H38l-8-24Z"/>',
  number:
    '<text x="50" y="75" text-anchor="middle" font-size="76" font-family="Impact,Arial" fill="currentColor" stroke="none">10</text>',
};
export const DECORATION_ART = {
  facets:
    '<path d="M0 0 30 0 0 35ZM100 0H70l30 35ZM0 100l35-20-15 20ZM100 100 65 80l15 20Z" fill="currentColor" stroke="none"/>',
  stripes:
    '<path d="M-10 45 100-10M-10 60 110 0M-10 75 110 15M-10 90 110 30" stroke-width="3"/>',
  stars:
    '<path d="m12 20 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1ZM80 16l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z M87 78l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z"/>',
  hexagons:
    '<path d="m12 10 10 6v12l-10 6-10-6V16Zm72 15 12 7v14l-12 7-12-7V32ZM15 66l13 8v16l-13 8-13-8V74Z"/>',
  wings:
    '<path d="M6 22 28 38 10 33 31 46 12 44 30 55M94 22 72 38l18-5-21 13 19-2-18 11" stroke-width="2"/>',
  ribbons:
    '<path d="M-5 12 105 67v7L-5 19ZM-5 65 105 10v7L-5 72Z" fill="currentColor" stroke="none"/>',
  lightning:
    '<path d="m16 2-10 30h13L9 61l27-38H21L32 2ZM86 57 69 84h13l-6 16 24-26H87l10-17Z" fill="currentColor" stroke="none"/>',
  laurel: WATERMARK_ART.laurel,
  corners:
    '<path d="M5 25V5h20M75 5h20v20M5 75v20h20M75 95h20V75" stroke-width="2"/>',
  orbit:
    '<ellipse cx="50" cy="40" rx="48" ry="14" transform="rotate(-35 50 40)"/><ellipse cx="50" cy="40" rx="48" ry="14" transform="rotate(35 50 40)"/>',
};
