// Native vector editions: no downloaded artwork or extra rendering dependencies.
const finals = [
  ["pace", "Rasante", "M61 37 72 15h9l-6 13h14L68 46l5-14Z"],
  ["shooting", "Predador", "m60 18 15 7 15-7-6 24-9-8-9 8Z"],
  ["passing", "Arquiteto", "M60 40 75 15 90 40ZM67 29h16M75 15v25"],
  ["dribbling", "Ilusionista", "M61 35q0-25 14-10t14-5M61 40l7-5m16-15 7-5"],
  ["defending", "Bastião", "M60 17h30v18L75 47 60 35ZM67 17v13h16V17"],
  ["physical", "Colosso", "m60 26 7-10h16l7 10-15 18Zm0 0h30M67 16l8 28 8-28"],
  ["goalkeeping", "Sentinela", "M59 41V16h32v25M65 35l10-15 10 15ZM75 20v21"],
  [
    "stamina",
    "Incansável",
    "M62 37a15 15 0 1 1 26-2M62 37v-9m0 9h9m17-2v-9m0 9h-9",
  ],
  ["vision", "Oráculo", "M58 29q17-25 34 0-17 25-34 0ZM75 22v14M68 29h14"],
  [
    "positioning",
    "Bússola",
    "m75 13 16 16-16 16-16-16ZM75 13v32M59 29h32m-16-9-5 14 14-5Z",
  ],
  ["teamwork", "Elo", "M74 21q-15-14-15 5t15 5m2-10q15-14 15 5t-15 5M67 26h16"],
  ["composure", "Imperturbável", "M58 32q8-18 17 0t17 0M61 41h28M75 13v8"],
  [
    "fusion-attack",
    "Dupla Ameaça",
    "m60 16 13 13-13 13Zm30 0L77 29l13 13ZM73 29h4",
  ],
  [
    "fusion-wall",
    "Fortaleza",
    "M59 16h32v19L75 46 59 35ZM67 36V23h16v13M75 23v13",
  ],
  [
    "fusion-engine",
    "Dínamo",
    "m75 12 4 10 11 7-11 7-4 10-4-10-11-7 11-7ZM75 22v14",
  ],
];
// Each composition is authored for its own concept; no modulo/recolour template.
// Concept sheets: docs/plans/path-reward-card-concepts.md.
const concepts = {
  pace: {
    concept: "Uma asa que rasga o campo: aletas e correntes de velocidade.",
    material: "Carbono acetinado",
    outline: "20,0 65,0 94,8 100,20 96,78 83,92 48,100 17,91 4,79 0,25 8,9",
    art: '<path class="collection-solid" d="M0 13 43 0 9 38ZM100 20 78 44l22-6ZM1 72l33 15-20 7ZM100 72 65 93l23-3Z"/><path d="M3 37 28 14 61 5M2 48 26 25M2 60 20 42M98 43 77 62M96 56 72 79M88 89 53 97 20 87"/><path class="collection-fine" d="M5 32 30 9M4 43 31 16M4 55 24 33M98 50 75 72M95 66 76 83"/>',
  },
  shooting: {
    concept:
      "Instinto de predador, com presas incisivas e uma mira de precisão.",
    material: "Metal rubro escovado",
    outline:
      "10,9 23,0 36,8 50,0 64,8 77,0 90,9 100,23 95,82 79,94 50,100 21,94 5,82 0,23",
    art: '<path class="collection-solid" d="m8 8 16 5-12 19Zm84 0-16 5 12 19ZM4 53l17 24-8-4 5 16L5 80Zm92 0L79 77l8-4-5 16 13-9Z"/><path d="m8 22 10 21-7-5 8 20M92 22 82 43l7-5-8 20M21 87l29 9 29-9M36 8l14 10L64 8"/><g class="collection-fine"><circle cx="77" cy="37" r="13"/><circle cx="77" cy="37" r="7"/><path d="M77 20v8m0 18v8M60 37h8m18 0h8"/></g>',
  },
  passing: {
    concept: "Um projeto de jogo construído em arcos, cotas e linhas de passe.",
    material: "Vidro azul e desenho técnico",
    outline:
      "18,4 31,4 31,0 69,0 69,4 82,4 100,20 97,79 86,91 50,100 14,91 3,79 0,20",
    art: '<path class="collection-solid" d="M4 21h12v57H4ZM84 21h12v57H84ZM17 7h66v8H17Z"/><path d="M10 80V25Q50-9 90 25v55M20 80V30Q50 4 80 30v50M10 80l40 17 40-17M20 30l60 50M80 30 20 80"/><path class="collection-fine" d="M3 33h18M3 46h18M3 59h18M79 33h18M79 46h18M79 59h18M24 6v12M38 4v12M52 4v12M66 4v12M80 6v12"/>',
  },
  dribbling: {
    concept: "Fitas que mudam de direção e desenham trajetórias impossíveis.",
    material: "Esmalte iridescente",
    outline:
      "17,4 32,0 50,5 67,0 85,5 96,15 100,31 96,48 100,65 94,82 79,94 50,100 21,94 6,82 0,65 4,48 0,31 5,15",
    art: '<path class="collection-solid" d="M0 35Q35 7 22 0L8 8Q34 12 0 49ZM100 57Q65 76 84 96l13-15Q68 84 100 69Z"/><path d="M9 75C43 37-17 42 14 16S88 45 91 13M8 91C46 70 6 52 14 42M92 90C54 74 114 54 82 38S34 9 58 4"/><path class="collection-fine" d="M4 70C36 38-15 39 9 19M95 87C61 70 114 54 88 41M20 94q24-15 39-3t25-2"/>',
  },
  defending: {
    concept: "Duas torres, uma passagem fechada: o bastião defensivo.",
    material: "Pedra verde e placas de proteção",
    outline:
      "10,0 25,0 25,7 41,7 41,0 59,0 59,7 75,7 75,0 90,0 100,15 96,80 81,93 50,100 19,93 4,80 0,15",
    art: '<path class="collection-solid" d="M5 14h19v65L5 73ZM76 14h19v59L76 79ZM20 86l30 11 30-11-10-8H30Z"/><path d="M8 18h15M7 32h16M6 46h17M6 60h17M77 18h15M77 32h16M77 46h17M77 60h17M23 75V30Q50 9 77 30v45M31 80V38h38v42M40 38v42m10-42v42m10-42v42"/><path class="collection-fine" d="M14 18v14m0 14v14M85 32v14m0 14v14M30 83h40"/>',
  },
  physical: {
    concept: "Placas monumentais, facetas e fendas de uma força inabalável.",
    material: "Bronze e rocha facetada",
    outline:
      "19,0 81,0 100,17 96,36 100,52 94,80 76,94 50,100 24,94 6,80 0,52 4,36 0,17",
    art: '<path class="collection-solid" d="M0 19 21 5l-7 41L3 60Zm100 0L79 5l7 41 11 14ZM5 76l22-7 23 28-23-8Zm90 0-22-7L50 97l23-8Z"/><path d="m7 24 12-10-8 35 8 9-9 19M93 24 81 14l8 35-8 9 9 19M26 5l24 9L74 5M24 83l26 9 26-9"/><path class="collection-fine" d="m15 31-5 7 4 7-6 11M85 31l5 7-4 7 6 11M31 87l7-6 7 8 6-6 7 8 9-8"/>',
  },
  goalkeeping: {
    concept: "A baliza e a luva formam a última barreira do campo.",
    material: "Malha dourada e couro de luva",
    outline:
      "14,9 20,0 30,6 39,0 50,7 61,0 70,6 80,0 86,9 98,16 100,35 96,78 81,93 50,100 19,93 4,78 0,35 2,16",
    art: '<path class="collection-solid" d="M5 18h10v62H5ZM85 18h10v62H85ZM14 10h72v8H14Z"/><path d="M11 80V17h78v63M22 18v60m14-60v60m14-60v60m14-60v60m14-60v60M12 31h76M12 45h76M12 59h76M12 73h76"/><path class="collection-fine" d="m20 5 5 9M39 4l5 10M61 4l-5 10M80 5l-5 9M3 50l21 17M97 50 76 67M20 87l30 9 30-9"/>',
  },
  stamina: {
    concept: "Uma pista contínua, sempre pronta para mais uma volta.",
    material: "Borracha de pista e metal mate",
    outline:
      "25,0 75,0 91,8 99,22 100,77 93,89 75,97 50,100 25,97 7,89 0,77 1,22 9,8",
    art: '<path d="M25 5Q5 5 5 25v49q0 17 22 20l23 3 23-3q22-3 22-20V25Q95 5 75 5M27 10Q11 10 11 28v44q0 15 19 17l20 3 20-3q19-2 19-17V28Q89 10 73 10M29 15Q17 15 17 30v40q0 12 15 14l18 3 18-3q15-2 15-14V30Q83 15 71 15"/><path class="collection-fine" d="M5 31h12M5 45h12M5 59h12M5 73h12M83 31h12M83 45h12M83 59h12M83 73h12M29 89l-1 6M50 92v5M71 89l1 6"/>',
  },
  vision: {
    concept: "Um olho de campo encontra constelações de passes antes de todos.",
    material: "Cristal e céu mineral",
    outline:
      "50,0 70,5 88,4 100,20 96,43 100,64 93,82 75,95 50,100 25,95 7,82 0,64 4,43 0,20 12,4 30,5",
    art: '<path class="collection-solid" d="M4 19Q50-9 96 19L86 28Q50 8 14 28ZM20 89l30 8 30-8-30-11Z"/><path d="M8 24Q50-5 92 24M17 25Q50 4 83 25M6 43l13 9-8 21 18 12M94 43l-13 9 8 21-18 12M19 52l62 0M11 73l78 0"/><g class="collection-fine"><circle cx="19" cy="52" r="3"/><circle cx="81" cy="52" r="3"/><circle cx="11" cy="73" r="2"/><circle cx="89" cy="73" r="2"/><circle cx="50" cy="16" r="5"/></g>',
  },
  positioning: {
    concept: "Coordenadas e rosa dos ventos para estar no lugar certo.",
    material: "Latão cartográfico gravado",
    outline:
      "50,0 61,7 83,5 95,15 100,34 96,51 100,73 88,87 69,92 50,100 31,92 12,87 0,73 4,51 0,34 5,15 17,5 39,7",
    art: '<path d="M50 4v14M50 83v14M4 50h14M82 50h14M14 15l10 11M86 15 76 26M14 85l10-11M86 85 76 74M50 7 56 15H44ZM50 95l-6-8h12Z"/><path class="collection-fine" d="M3 63q15-22 27-16t22-7 45-12M3 69q15-22 27-16t22-7 45-12M3 75q15-22 27-16t22-7 45-12M14 28q21-17 34-9t38-2M23 91q20-20 48-5"/><circle cx="50" cy="50" r="36" stroke-dasharray="2 4"/>',
  },
  teamwork: {
    concept: "Elos e nós coletivos fazem do jogador parte de algo maior.",
    material: "Aço turquesa polido",
    outline:
      "15,0 33,5 50,0 67,5 85,0 98,14 95,34 100,50 95,69 98,82 83,94 65,94 50,100 35,94 17,94 2,82 5,69 0,50 5,34 2,14",
    art: '<path d="M12 19q-12 0-7 15t14 2l8-14q5-13-8-14t-7 11M88 19q12 0 7 15T81 36l-8-14q-5-13 8-14t7 11M11 61q-11 0-5 15t14 0l6-12q6-13-7-14t-8 11M89 61q11 0 5 15T80 76l-6-12q-6-13 7-14t8 11"/><path class="collection-fine" d="m20 84 30-30 30 30H20Zm0 0 30 11 30-11M18 41l64 0M21 9l29 8L79 9"/><g class="collection-solid"><circle cx="20" cy="84" r="4"/><circle cx="80" cy="84" r="4"/><circle cx="50" cy="54" r="4"/></g>',
  },
  composure: {
    concept: "Água imóvel e espaço para pensar, mesmo sob pressão.",
    material: "Cerâmica mate e água calma",
    outline:
      "28,0 72,0 89,7 98,23 100,65 94,82 78,94 50,100 22,94 6,82 0,65 2,23 11,7",
    art: '<path d="M7 22Q50 3 93 22M12 26Q50 10 88 26M5 70q18-6 45 0t45 0M7 77q18-6 43 0t43 0M12 84q16-5 38 0t38 0M22 91q14-4 28 0t28 0"/><g class="collection-fine"><circle cx="50" cy="22" r="9"/><circle cx="50" cy="22" r="13"/><path d="M8 49h17M75 49h17"/></g>',
  },
  "fusion-attack": {
    concept:
      "A garra do remate encontra a rede de passe: duas ameaças numa identidade.",
    material: "Metal ofensivo e vidro técnico",
    outline:
      "13,0 37,9 50,3 63,9 87,0 100,18 96,79 80,92 61,94 50,100 39,94 20,92 4,79 0,18",
    art: '<path class="collection-solid" d="M4 15 27 8 11 37ZM4 47l19 29-11-4 6 15-14-9ZM94 15h-9v63h9Z"/><path d="M9 24 18 42l-8-5 10 25M89 78V22L72 12M77 23v51M65 15l24 20M65 38l24 20M65 61l24 20M20 85l30 11 30-11"/><path class="collection-fine" d="M22 49Q50 20 79 50M22 49q29 36 57 1"/><circle cx="50" cy="49" r="7"/>',
  },
  "fusion-wall": {
    concept: "Muralha e baliza unem duas linhas de proteção.",
    material: "Pedra azul, aço e rede clara",
    outline:
      "8,0 24,0 24,7 35,7 35,2 65,2 65,7 76,7 76,0 92,0 100,17 96,80 80,93 50,100 20,93 4,80 0,17",
    art: '<path class="collection-solid" d="M5 11h19v67L5 74ZM76 11h19v63L76 78ZM21 83h58L50 97Z"/><path d="M11 76V20h11M89 76V20H78M24 79V34Q50 8 76 34v45M31 78V38Q50 18 69 38v40M38 31v47m12-51v51m12-47v47M31 44h38M31 56h38M31 68h38"/><path class="collection-fine" d="M6 30h17M6 44h17M6 58h17M77 30h17M77 44h17M77 58h17M24 87l26 8 26-8"/>',
  },
  "fusion-engine": {
    concept: "Um rotor distribui energia por uma rede de decisões.",
    material: "Cobre de circuito e núcleo violeta",
    outline:
      "50,0 61,6 75,3 83,12 96,15 100,29 96,43 100,57 96,76 86,87 72,91 62,97 50,100 38,97 28,91 14,87 4,76 0,57 4,43 0,29 4,15 17,12 25,3 39,6",
    art: '<path class="collection-solid" d="M49 8 65 14 52 30ZM84 20 92 35 69 37ZM94 60 83 77 70 55ZM64 88 45 95 50 71ZM20 83 8 67 31 63ZM7 40 14 22 32 43Z"/><circle cx="50" cy="50" r="37"/><circle cx="50" cy="50" r="28" stroke-dasharray="3 6"/><path class="collection-fine" d="M18 14 26 27M82 14 74 27M97 50H80M20 50H3M28 85l9-15M72 85 63 70M37 9l5 17M63 9l-5 17"/>',
  },
};
export const PATH_CARD_EDITIONS = Object.fromEntries(
  finals.map(([id, name, motif]) => [
    `path-${id}`,
    {
      name,
      detail: `Escolhe o teu caminho! · ${concepts[id].material}`,
      ...concepts[id],
      motif: `<path d="${motif}"/>`,
    },
  ]),
);
