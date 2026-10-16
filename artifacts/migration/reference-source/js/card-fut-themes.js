// Original vector designs inspired by the visual themes of Ultimate Team.
// Catalog previews only: eligibility is deliberately kept out of THEMES.
const mirror = (art) =>
  `${art}<g transform="translate(100 0) scale(-1 1)">${art}</g>`;
const star = (x, y, size, className = "") =>
  `<path class="${className}" transform="translate(${x} ${y}) scale(${size})" d="m0-10 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>`;
const laurel = mirror(
  '<path d="M14 84Q4 63 13 42"/><path class="theme-leaf" d="M12 77q-10-2-8-9 7 0 8 9Zm-2-10q-9-5-5-11 7 3 5 11Zm0-11q-7-7-2-12 6 4 2 12Zm3 27q7-7 3-12-7 4-3 12Zm-3-14q9-5 6-12-7 2-6 12Z"/>',
);

export const FUT_INSPIRED_EDITIONS = Object.freeze({
  toty: {
    name: "TOTY",
    detail: "Team of the Year · azul imperial e ouro ornamentado",
    outline:
      "50,0 59,7 76,3 87,9 95,6 100,20 96,83 89,93 72,97 50,100 28,97 11,93 4,83 0,20 5,6 13,9 24,3 41,7",
    motif: '<path d="m61 22 8 7 6-16 6 16 8-7-4 19H65ZM65 45h20"/>',
    art:
      mirror(
        '<path class="theme-metal" d="M2 6 19 9 12 18 8 51 5 90 21 97 2 95ZM15 8l14-3 9 6-15 6Z"/><path class="theme-engraving" d="M6 13 14 15 10 40M8 54 6 87 18 93M11 17l8-5 8 1M16 25l7-6 7 3M14 33l7-6 7 3"/><path class="theme-filigree" d="M6 61q12-11 9-21-7-3-6 4 9 3 4 11M8 82q11-4 10-11-7-3-7 3 8 2 4 7"/><path class="theme-fine" d="M26 6 39 13 23 30 15 52M31 9l7 4-15 16"/>',
      ) +
      '<path class="theme-metal" d="m40 4 10-3 10 3-10 7ZM31 96l19-5 19 5-19 3Z"/><path class="theme-engraving" d="m44 4 6 3 6-3M39 96l11-2 11 2"/>' +
      laurel,
  },
  tots: {
    name: "TOTS",
    detail: "Team of the Season · coroa de cristais elétricos",
    outline:
      "6,0 25,6 38,0 50,5 64,1 78,8 95,0 100,17 94,35 100,58 95,85 82,94 61,97 50,100 29,96 8,92 0,79 6,57 0,27",
    motif:
      '<path d="m75 12 15 15-15 20-15-20Zm-15 15h30M75 12l-6 15 6 20 6-20Z"/>',
    art:
      mirror(
        '<path class="theme-crystal" d="m0 2 20 8-9 23Zm8 29 13-17-6 42ZM0 55l15-13-8 28ZM3 77l18-11-9 28ZM12 95l20-16-6 20Z"/><path class="theme-gold" d="m3 5 12 7-6 12Zm7 65 7-2-7 15ZM18 95l9-8-3 9Z"/><path class="theme-fine" d="m1 9 13 5-6 15m2 10 9-18-6 29M3 60l8-9-5 14M7 78l10-7-7 17"/>',
      ) +
      '<path class="theme-crystal" d="m23 0 17 5-9 10ZM42 1l15 4-8 10ZM64 0l14 9-12 5Z"/><path class="theme-gold" d="m38 96 12-7 12 7-12 3Z"/>',
  },
  icon: {
    name: "ICON",
    detail: "Marfim clássico · mármore, arco e louros dourados",
    outline:
      "50,0 67,2 82,7 94,17 100,30 97,83 88,94 72,98 50,100 28,98 12,94 3,83 0,30 6,17 18,7 33,2",
    motif:
      '<path d="M61 23l14-10 14 10ZM64 26h22M67 28v13m8-13v13m8-13v13M62 44h26"/>',
    art:
      '<path class="theme-arch" d="M5 91V29C5-2 95-2 95 29v62M8 88V30C8 2 92 2 92 30v58"/><path class="theme-marble" d="m26 0-4 17 10 8-5 13 16 17-3 17 13 28M81 0 68 18l6 11-11 15 8 21-14 15 3 20M5 60l19 10-2 12 13 18"/>' +
      mirror(
        '<path class="theme-metal" d="M3 31h5v57H3Z"/><path class="theme-engraving" d="M4 27h8M4 30h8M4 89h8M4 92h8"/>',
      ) +
      '<path class="theme-fine" d="M26 9q24-12 48 0M27 94q23 7 46 0"/>' +
      laurel,
  },
  "fut-heroes": {
    name: "FUT HEROES",
    detail: "Cobre cinematográfico · armadura e impacto metálico",
    outline:
      "0,0 22,0 30,8 70,8 78,0 100,0 100,22 94,31 100,43 96,82 84,94 67,94 50,100 33,94 16,94 4,82 0,43 6,31 0,22",
    motif: '<path d="m61 20 14-8 14 8-5 18-9 9-9-9Zm7 4 7-4 7 4-7 13Z"/>',
    art:
      mirror(
        '<path class="theme-armor" d="M0 0h20l9 11-17 8 5 19L5 60 0 53ZM0 78l16-12 7 13-9 15 18 6H0Z"/><path class="theme-metal" d="M3 4h15l5 6-15 5 5 21-8 15ZM4 82l11-10 3 8-9 13 17 6-22-4Z"/><path class="theme-engraving" d="M7 5h9m-5 14 5 17-7 14M9 80l4-3m0 8-5 7"/>',
      ) +
      '<path class="theme-armor" d="m24 0 9 9h34l9-9-13 5H37ZM33 96l17-11 17 11-17 4Z"/><path class="theme-fine" d="M20 52 41 12M24 56 46 13M62 49 84 11M66 53 88 15"/>',
  },
  "fut-birthday": {
    name: "FUT BIRTHDAY",
    detail: "Festa multicolor · fitas, confetes e brilho acetinado",
    outline:
      "16,1 36,5 50,0 64,5 84,1 96,11 100,25 96,81 91,91 78,97 50,100 22,97 9,91 4,81 0,25 4,11",
    motif:
      '<path d="M61 25h28v7H61Zm3 7h22v14H64ZM75 25v21m0-21c-14-1-11-15-4-10l4 10Zm0 0c14-1 11-15 4-10l-4 10Z"/>',
    art: '<path class="theme-ribbon" d="M-4 32Q6 1 29 11T71 9t33 15M-5 82q12 26 35 14t46-1 29-18"/><path class="theme-party-line" d="M-4 26Q6-5 29 5T71 3t33 15M-5 88q12 26 35 14t46-1 29-18"/><path class="theme-candy" d="m6 40 7-4 5 8-7 4ZM83 20l8 5-5 7-8-5ZM18 73l7 2-2 7-7-2ZM79 73l7-4 3 6-7 4Z"/><path class="theme-gold" d="m25 17 3 6-3 2-3-6ZM91 57l4 3-4 4-3-3ZM9 62l3-4 4 3-3 4Z"/><circle class="theme-bubble" cx="17" cy="28" r="5"/><circle class="theme-bubble" cx="86" cy="46" r="6"/><circle class="theme-bubble" cx="27" cy="88" r="3"/><path class="theme-party-line" d="m6 16 6 2m76 69 6-4M38 8l2 5"/>',
  },
  otw: {
    name: "ONES TO WATCH",
    detail: "Ónix violeta · chevrons e sinais luminosos",
    outline:
      "0,6 32,6 42,0 72,0 88,9 100,9 96,32 100,44 96,84 76,96 50,100 24,96 4,84 0,44 4,32",
    motif:
      '<path d="m59 29 16-12 16 12-16 12Zm8 0 8-6 8 6-8 6ZM75 10v4m0 30v4"/>',
    art: '<path class="theme-otw-plate" d="M0 8h26L5 44Zm100 1H73l23 37ZM0 63l24 21L7 98Zm100-7L76 81l17 17Z"/><path class="theme-neon" d="M3 11h18L7 35m90-22H80l13 26M6 74l13 12-8 7m83-26L80 82l9 10"/><path class="theme-fine" d="m4 49 20 18m-20-9 20 18m72-33L79 58m17-6L79 67M29 10h14l7-5h22"/><path class="theme-neon" d="m42 96 8-4 8 4M6 53v7m88-17v8"/>',
  },
  "future-stars": {
    name: "FUTURE STARS",
    detail: "Holografia tecnológica · estrelas e planos digitais",
    outline:
      "50,0 62,7 86,2 91,13 100,20 96,39 100,61 94,84 80,95 61,96 50,100 39,96 20,95 6,84 0,61 4,39 0,20 9,13 14,2 38,7",
    motif: star(75, 29, 1.6),
    art:
      '<path class="theme-holo-frame" d="m3 24 13-17 22 4L50 3l12 8 22-4 13 17-5 21 4 34-14 15-22 2-10 3-10-3-22-2L4 79l4-34Z"/>' +
      star(21, 25, 2.8, "theme-star-plane") +
      star(81, 46, 2.4, "theme-star-plane") +
      '<path class="theme-digital" d="M5 56h8l9-9h8m40-27h10l8 8h8M11 87h14l7-7h8m27 4h8l7 7h9M4 31h5v7m82 26h5v10"/><path class="theme-fine" d="m10 13 30 19-24 26Zm80-2L65 36l24 29ZM13 92l25-21 12 25 17-19 21 16"/>' +
      star(50, 9, 0.5, "theme-holo-gem"),
  },
  futties: {
    name: "FUTTIES",
    detail: "Magenta de gala · arabescos e joias de ouro",
    outline:
      "50,0 64,6 81,4 88,11 96,9 100,23 96,82 90,92 73,97 50,100 27,97 10,92 4,82 0,23 4,9 12,11 19,4 36,6",
    motif: '<path d="m60 27 7-10 8 8 8-8 7 10-15 18Zm0 0h30M67 17l8 28 8-28"/>',
    art:
      mirror(
        '<path class="theme-pink-enamel" d="M2 12 18 8 11 24 8 73 15 91 28 97 7 94 2 81Z"/><path class="theme-filigree" d="M9 18q17-7 14 7-2 9-10 6-5-6 2-7 10 4 1 16M8 71q18-9 16 3-2 10-11 8-6-6 1-8 9 3 2 12M15 91q8-8 14-2"/><path class="theme-gold" d="m5 47 4-7 4 7-4 7ZM19 12l3-4 3 4-3 4Z"/>',
      ) +
      '<path class="theme-filigree" d="M22 5q10 10 28 1 18 9 28-1M25 95q12-7 25 1 13-8 25-1"/>' +
      star(50, 6, 0.5, "theme-gold"),
  },
  shapeshifters: {
    name: "SHAPESHIFTERS",
    detail: "Energia verde · placas assimétricas e circuitos fragmentados",
    outline:
      "0,0 35,7 48,0 70,5 87,0 100,16 94,38 100,47 96,79 85,94 63,95 48,100 26,95 9,99 0,81 6,63 0,51 4,28",
    motif:
      '<path d="m60 20 15-8 15 8v18l-15 9-15-9Zm0 0 15 9 15-9M75 29v18m-8-30 15 8m-15 9 15 8"/>',
    art: '<path class="theme-acid-plate" d="M0 0 32 10 9 18 15 38 0 54ZM100 13 85 8 91 35 78 45 100 38ZM0 76l18-9-7 20 20 13L0 94ZM100 57 83 77l8 13-26 7 35 3Z"/><path class="theme-energy" d="m3 4 23 7-21 9 7 17-9 9m92-27-7-5 6 22-12 9M4 81l10-8-6 15 16 9m70-32L82 79l7 12-18 5"/><path class="theme-circuit" d="M9 54h11l7-8h8M65 13h9l7 8h11M14 62h10l8-8m33 26h10l8-9h13M29 91l8-8h8M4 26h4v6"/><path class="theme-fine" d="m4 9 25 8M70 2l12 6M2 87l18 11M96 44l-9 10M62 95l-12 3"/><circle class="theme-node" cx="35" cy="46" r="1.2"/><circle class="theme-node" cx="65" cy="80" r="1.2"/>',
  },
});
