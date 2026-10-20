import { SPECIAL_CARD_DESIGNS } from "./card-specials.js";
import { STUDIO_DECORATIONS } from "./card-studio-catalog.js";

// Independent element names; existing IDs keep saved projects compatible.
const names = {
  "ultimate-guarda-redes-v2": ["Armadura Reflexo", "Placas prismáticas", "Luva do guarda-redes"],
  "ultimate-goleador-v2": ["Recorte de impacto", "Fragmentos de obsidiana", "Brasão do goleador"],
  "ultimate-participacao-v2": ["Medalhão de eternidade", "Órbitas de continuidade", "Selo de presença"],
  "ultimate-modric-v2": ["Recorte Maestro", "Fitas de titânio", "Triângulo do maestro"],
  "ultimate-vitorioso-v2": ["Recorte monumental", "Monólitos de ouro", "Taça do vencedor"],
  toty: ["Cume lapidado", "Filigrana dourada", "Coroa de pontas"],
  tots: ["Cristal recortado", "Estilhaços de cristal", "Cristal facetado"],
  icon: ["Arco clássico", "Mármore e colunas", "Frontão de templo"],
  "fut-heroes": ["Ombros angulares", "Placas de armadura", "Brasão angular"],
  "fut-birthday": ["Topo em fita", "Fitas e confetes", "Presente com laço"],
  otw: ["Ombros escalonados", "Placas e néon", "Losangos concêntricos"],
  "future-stars": [
    "Estrela recortada",
    "Estrelas e circuitos",
    "Estrela geométrica",
  ],
  futties: ["Escudo festonado", "Arcos luminosos", "Coração facetado"],
  shapeshifters: [
    "Corte assimétrico",
    "Planos fragmentados",
    "Cubo em perspetiva",
  ],
  apogee: ["Cume central", "Lâminas paralelas", "Coroa de três pontas"],
  legacy: ["Arco monumental", "Gravura arquitetónica", "Pilar clássico"],
  titan: ["Ombros largos", "Painéis metálicos", "Taça em escudo"],
  supernova: ["Pontas orbitais", "Constelação radial", "Estrela orbital"],
  aurora: ["Arco suave", "Ondas sobrepostas", "Diamante luminoso"],
  eclipse: ["Escudo de ombros retos", "Anéis concêntricos", "Disco eclipsado"],
  inferno: ["Crista pontiaguda", "Rastos de chama", "Chama dupla"],
  glacial: ["Cortes glaciais", "Veios de gelo", "Floco de neve"],
  dynasty: ["Coroa escalonada", "Contornos nobres", "Coroa imperial"],
  carnival: ["Ondulação festiva", "Serpentinas", "Chapéu de festa"],
  "in-form": ["Escudo chanfrado", "Chevrons gravados", "Chevrons triplos"],
  "hot-streak": ["Crista dupla", "Chama gravada", "Labareda"],
  playmaker: ["Escudo de vértices", "Rede de passe gravada", "Rede de passe"],
  sniper: ["Topo com patamares", "Alvo gravado", "Mira de precisão"],
  "the-wall": ["Topo ameado", "Blocos gravados", "Muralha de tijolos"],
  engine: ["Engrenagem recortada", "Raio gravado", "Raio circular"],
  "safe-hands": ["Ombros arredondados", "Escudo gravado", "Escudo com visto"],
  "perfect-five": [
    "Coroa facetada",
    "Estrela gravada",
    "Estrela de cinco pontas",
  ],
  mvp: ["Topo ondulado", "Taça gravada", "Taça com asas"],
  "legend-form": ["Coroa de vértices", "Coroa e losangos", "Coroa ornamentada"],
};
for (const [id, design] of Object.entries(SPECIAL_CARD_DESIGNS)) {
  if (id.startsWith("path-"))
    names[id] = [
      `Recorte ${design.name}`,
      `Percurso ${design.name}`,
      `Símbolo ${design.name}`,
    ];
}
export const STUDIO_SHAPES = {
  original: "Original",
  shield: "Escudo",
  diamond: "Diamante",
  rounded: "Arredondada",
  ticket: "Bilhete",
  hexagon: "Hexágono",
  notched: "Recortada",
  crown: "Coroa",
  arch: "Arco",
  ...Object.fromEntries(
    Object.keys(SPECIAL_CARD_DESIGNS).map((id) => [id, names[id][0]]),
  ),
};
export const STUDIO_ORNAMENTS = {
  ...STUDIO_DECORATIONS,
  ...Object.fromEntries(
    Object.keys(SPECIAL_CARD_DESIGNS).map((id) => [
      "edition-" + id,
      names[id][1],
    ]),
  ),
};
export const STUDIO_SYMBOLS = {
  none: "Sem símbolo",
  ...Object.fromEntries(
    Object.keys(SPECIAL_CARD_DESIGNS).map((id) => [id, names[id][2]]),
  ),
};

export const STUDIO_ORNAMENT_GROUPS = [
  [
    "Essenciais",
    ["original", "none", "corners", "stripes", "facets", "hexagons"],
  ],
  [
    "Geometria e tecnologia",
    [
      "edition-tots",
      "edition-fut-heroes",
      "edition-otw",
      "edition-shapeshifters",
      "edition-apogee",
      "edition-titan",
      "edition-playmaker",
      "edition-sniper",
      "edition-the-wall",
      "edition-engine",
    ],
  ],
  [
    "Luz e natureza",
    [
      "stars",
      "lightning",
      "orbit",
      "edition-supernova",
      "edition-aurora",
      "edition-eclipse",
      "edition-inferno",
      "edition-glacial",
      "edition-hot-streak",
    ],
  ],
  [
    "Emblemas e gravuras",
    [
      "wings",
      "laurel",
      "edition-toty",
      "edition-icon",
      "edition-legacy",
      "edition-dynasty",
      "edition-in-form",
      "edition-safe-hands",
      "edition-perfect-five",
      "edition-mvp",
      "edition-legend-form",
      "edition-ultimate-goleador-v2",
      "edition-ultimate-participacao-v2",
      "edition-ultimate-modric-v2",
      "edition-ultimate-vitorioso-v2",
      "edition-ultimate-guarda-redes-v2",
    ],
  ],
  [
    "Festa e movimento",
    [
      "ribbons",
      "edition-fut-birthday",
      "edition-future-stars",
      "edition-futties",
      "edition-carnival",
    ],
  ],
  [
    "Percursos pessoais",
    Object.keys(STUDIO_ORNAMENTS).filter((id) =>
      id.startsWith("edition-path-"),
    ),
  ],
];
// A new edition must remain selectable even before it gets a curated category.
const groupedOrnaments = new Set(
  STUDIO_ORNAMENT_GROUPS.flatMap(([, ids]) => ids),
);
const remainingOrnaments = Object.keys(STUDIO_ORNAMENTS).filter(
  (id) => !groupedOrnaments.has(id),
);
if (remainingOrnaments.length)
  STUDIO_ORNAMENT_GROUPS.push(["Outras edições", remainingOrnaments]);
