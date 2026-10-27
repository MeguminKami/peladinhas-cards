// Authored SVG scenes. The portrait and readable statistics are composited above.
const line = (d, cls = "scg-engraving") => `<path class="${cls}" d="${d}"/>`;
const bolts = (points) =>
  points
    .map(
      ([x, y]) =>
        `<g class="scg-bolt"><circle cx="${x}" cy="${y}" r="4"/><path d="m${x - 2} ${y - 2} 4 4m0-4-4 4"/></g>`,
    )
    .join("");
const spade = (x, y, s = 1) =>
  `<path class="scg-spade" transform="translate(${x} ${y}) scale(${s})" d="M0-16C-5-8-17-3-17 5c0 10 12 13 17 4-1 8-3 12-8 14H8C3 21 1 17 0 9c5 9 17 6 17-4C17-3 5-8 0-16Z"/>`;
const diamond = (x, y) =>
  `<path class="scg-diamond" d="m${x} ${y - 8} 6 8-6 8-6-8Z"/>`;
const chip = (x, y, r, color) =>
  `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="5" rx="${r}" ry="${r * 0.35}" fill="#100e10"/><ellipse rx="${r}" ry="${r * 0.35}" fill="${color}" stroke="#e6d4a0" stroke-width="1.4"/><ellipse rx="${r * 0.65}" ry="${r * 0.22}" fill="none" stroke="#e6d4a0" stroke-width=".8"/><path d="M${-r * 0.85} -2v4M${r * 0.85} -2v4M-3 ${-r * 0.32}h6M-3 ${r * 0.32}h6" stroke="#f4e5c5" stroke-width="2"/></g>`;
const deck = (x, y, angle, rank) =>
  `<g transform="translate(${x} ${y}) rotate(${angle})"><rect x="-25" y="-44" width="50" height="78" rx="4" fill="#e8dfc4" stroke="#b59c6a" stroke-width="1.3"/><rect x="-21" y="-40" width="42" height="70" rx="2" fill="none" stroke="#a78a52" stroke-width=".6"/><text x="-16" y="-22" class="scg-card-rank">${rank}</text>${spade(-13, -12, 0.24)}${spade(1, 1, 0.62)}<path d="M-14 20H14M-10 24h20" stroke="#8d7546" stroke-width=".6"/></g>`;
const woodLines = Array.from({ length: 8 }, (_, i) =>
  line(
    `M${18 + i * 2} 75q4 60 0 120t0 120m${264 - i * 2} -240q-4 60 0 120t0 120`,
    "scg-woodgrain",
  ),
).join("");
const blackjack = `<path class="scg-wood" d="M18 29 43 9h214l25 20 8 33-8 279-25 44-107 33-107-33-25-44-8-279Z"/><path class="scg-brass" d="M24 40 47 20h206l23 20-13 15-18-17H55L37 55ZM23 340l30 34 97 29 97-29 30-34-20 5-17 19-90 27-90-27-17-19Z"/><path class="scg-felt" d="M42 60Q150 5 258 60l-9 217H51Z"/><path class="scg-felt-stitch" d="M48 69Q150 19 252 69M55 77q95-44 190 0M48 80l7 183m197-183-7 183"/>${woodLines}<path class="scg-brass-line" d="M36 58v265m228-265v265M60 366l90 27 90-27"/>${spade(150, 46, 0.55)}${deck(100, 155, -18, "A")}${deck(204, 153, 18, "K")}<path class="scg-felt-stitch" d="M73 239q77-35 154 0M77 245q73-34 146 0"/>${chip(72, 254, 18, "#a24337")}${chip(72, 249, 18, "#315d4c")}${chip(72, 244, 18, "#a24337")}${chip(228, 251, 18, "#2b343d")}${chip(228, 246, 18, "#ac9254")}${spade(28, 155, 0.29)}${diamond(272, 155)}${spade(272, 206, 0.29)}${diamond(28, 206)}${bolts(
  [
    [29, 47],
    [271, 47],
    [28, 330],
    [272, 330],
  ],
)}<path class="scg-brass-line" d="m78 22 5 5 5-5m124 0 5 5 5-5M88 386l62 19 62-19"/>`;

const rouletteSegments = Array.from({ length: 37 }, (_, i) => {
  const a = ((-180 + (i * 180) / 37) * Math.PI) / 180,
    b = ((-180 + ((i + 1) * 180) / 37) * Math.PI) / 180;
  const p = (r, t) =>
    `${(150 + r * Math.cos(t)).toFixed(2)} ${(190 + r * Math.sin(t)).toFixed(2)}`;
  return `<path d="M${p(109, a)}A109 109 0 0 1 ${p(109, b)}L${p(86, b)}A86 86 0 0 0 ${p(86, a)}Z" fill="${i === 18 ? "#31896d" : i % 2 ? "#a63e3c" : "#111c20"}" stroke="#c5aa70" stroke-width=".65"/>`;
}).join("");
const rouletteTicks = Array.from({ length: 19 }, (_, i) => {
  const a = ((-180 + i * 10) * Math.PI) / 180;
  return line(
    `M${150 + 116 * Math.cos(a)} ${190 + 116 * Math.sin(a)}l${5 * Math.cos(a)} ${5 * Math.sin(a)}`,
    "scg-brass-line",
  );
}).join("");
const roulette = `<path class="scg-wood" d="M29 40 58 11h184l29 29 18 39-9 261-29 45-101 33-101-33-29-45-9-261Z"/><path class="scg-brass" d="M29 40 58 11h184l29 29-15 16-24-27H68L44 56ZM20 340l29 45 101 33 101-33 29-45-25 6-18 24-87 27-87-27-18-24Z"/>${woodLines}<path d="M36 190a114 114 0 0 1 228 0" fill="none" stroke="#19100c" stroke-width="31"/><path d="M36 190a114 114 0 0 1 228 0" fill="none" stroke="#b28e49" stroke-width="29"/>${rouletteSegments}<path d="M66 190a84 84 0 0 1 168 0" fill="none" stroke="#e6cf94" stroke-width="2"/><path d="M78 190a72 72 0 0 1 144 0" fill="none" stroke="#573425" stroke-width="21"/><path d="M87 190a63 63 0 0 1 126 0" fill="none" stroke="#bd9a62" stroke-width="1.3"/>${rouletteTicks}<path class="scg-brass-line" d="M30 205v115m240-115v115M54 371l96 32 96-32"/><circle cx="233" cy="128" r="6" fill="#fff1cf" stroke="#b49b64" stroke-width="1.4"/><circle cx="231" cy="126" r="1.8" fill="#fff"/><path d="M119 47q31-17 62 0m-54 3q23-12 46 0" fill="none" stroke="#caac71" stroke-width="1.2"/>${diamond(28, 233)}${diamond(272, 233)}${bolts(
  [
    [37, 56],
    [263, 56],
    [32, 335],
    [268, 335],
  ],
)}`;

const stair = Array.from(
  { length: 10 },
  (_, i) =>
    `<path d="m${31 + (i % 2) * 3} ${93 + i * 22}h${12 + (i % 3) * 2}v8H${31 + (i % 2) * 3}" fill="none" stroke="${i < 7 ? "#b6e062" : "#e2ae55"}" stroke-width="1.7"/><path d="m${269 - (i % 2) * 3} ${93 + i * 22}h-${12 + (i % 3) * 2}v8h${12 + (i % 3) * 2}" fill="none" stroke="#76807b" stroke-width="1.1"/>`,
).join("");
const cardoso = `<path class="scg-rubber" d="M16 38 38 14h78l11-10h46l11 10h78l22 24 6 43-13 263-25 43-102 31-102-31-25-43L10 81Z"/><path class="scg-steel" d="M16 38 38 14h78l11-10h46l11 10h78l22 24-22 14-15-20h-69l-15-10h-26l-15 10H53L38 52ZM23 344l25 43 102 31 102-31 25-43-25 9-14 20-88 26-88-26-14-20Z"/><path d="M56 63h28v151H56Zm160 0h28v151h-28Z" fill="#31373a" stroke="#74817e" stroke-width="1.3"/><path d="M64 64v149m13-149v149m147-149v149m13-149v149" stroke="#111719" stroke-width="4"/><path d="M88 58h33v12H98v41m81-53h33v53h-11V70h-22" fill="none" stroke="#677375" stroke-width="7"/><path d="M90 58h29m63 0h27v48" stroke="#b9c1b2" stroke-width="1"/><g fill="#171f21" stroke="#8d9b8f" stroke-width="1.3"><rect x="41" y="139" width="11" height="54" rx="3"/><rect x="36" y="147" width="8" height="38" rx="2"/><rect x="248" y="139" width="11" height="54" rx="3"/><rect x="256" y="147" width="8" height="38" rx="2"/></g><path d="M50 165h200" stroke="#c5cbb8" stroke-width="4"/>${stair}<path d="m236 199 13-16-3 22 13-8-16 29 4-20-11 7Z" fill="#b7f178"/><path d="m242 218-5 22-12 11" fill="none" stroke="#b7f178" stroke-width="1.5"/><path d="M66 229q-13 13-5 20t18 2q9-12 1-20t-14-2Z" fill="none" stroke="#9ba59d" stroke-width="4"/><path d="m78 240 10-14m-5 26 9-11" stroke="#c1e47c" stroke-width="2"/><path d="m225 235 4 26h18l4-26Zm5-7h16v8h-16Z" fill="#716791" stroke="#c4abd4" stroke-width="1"/><path d="m63 258 6-13 7 14q2 10-7 10t-6-11Z" fill="#b78f3b" opacity=".75"/>${bolts(
  [
    [30, 42],
    [270, 42],
    [28, 329],
    [272, 329],
    [76, 27],
    [224, 27],
  ],
)}<path d="m106 15 9 8-9 6m88-14-9 8 9 6" stroke="#cfb35e" fill="none" stroke-width="1.6"/>`;

const reactor = Array.from({ length: 12 }, (_, i) => {
  const a = ((i * 30 - 103) * Math.PI) / 180,
    b = ((i * 30 - 80) * Math.PI) / 180,
    p = (r, t) =>
      `${(150 + r * Math.cos(t)).toFixed(2)} ${(153 + r * Math.sin(t)).toFixed(2)}`;
  return `<path d="M${p(91, a)}A91 91 0 0 1 ${p(91, b)}L${p(77, b)}A77 77 0 0 0 ${p(77, a)}Z" fill="${i % 3 ? "#29354e" : "#644395"}" stroke="${i % 3 ? "#70e9f2" : "#b49be9"}" stroke-width="1"/>`;
}).join("");
const rift = `<path fill="#0d1423" stroke="#60738b" stroke-width="1.5" d="M35 7 111 18 134 6h32l23 12 76-11 26 39-12 66 13 58-15 176-28 41-99 32-99-32-28-41L8 170l13-58L9 46Z"/><path class="scg-titanium" d="M9 46 35 7l38 24-37 38-15 43Zm282 0L265 7l-38 24 37 38 15 43ZM23 346l28 41 99 32 99-32 28-41-29 10-16 17-82 27-82-27-16-17Z"/><circle cx="150" cy="153" r="94" fill="#101527" stroke="#4f6e84" stroke-width="1.4"/>${reactor}<circle cx="150" cy="153" r="69" fill="#191435" stroke="#83f1f5" stroke-width="2"/><circle cx="150" cy="153" r="63" fill="none" stroke="#a896e8" stroke-width=".7" stroke-dasharray="1 4"/><path d="M150 78v16m0 118v16M75 153h16m118 0h16m-127-53 11 11m84 84 11 11m0-106-11 11m-84 84-11 11" stroke="#d6ffff" stroke-width="2"/><path d="M33 35 45 23 58 35 40 54Zm234 0-12-12-13 12 18 19Z" fill="#aa95ed" stroke="#d9c7ff" stroke-width="1"/><path d="m16 165 18-27 11 15-11 37 16 25-18 35-10-38Zm268 0-18-27-11 15 11 37-16 25 18 35 10-38Z" fill="#433264" stroke="#77eaf8" stroke-width="1"/><path d="m26 171 5 15-4 21m247-36-5 15 4 21M73 38l22 12 12-10m86 0 12 10 22-12" fill="none" stroke="#dbffff" stroke-width="2"/><path d="m51 243 9-25 11 23-9 22Zm187-25 11 25-13 20-9-22Z" fill="#8be4ed" stroke="#efffff" stroke-width=".9"/><path d="m44 278-8 35 14 23m206-58 8 35-14 23M70 382l80 26 80-26" fill="none" stroke="#8c77d2" stroke-width="1.5"/>${bolts(
  [
    [41, 62],
    [259, 62],
    [34, 333],
    [266, 333],
  ],
)}`;

const net =
  Array.from({ length: 14 }, (_, i) =>
    line(`M${50 + i * 15} 175v82`, "scg-goalnet"),
  ).join("") +
  Array.from({ length: 6 }, (_, i) =>
    line(`M50 ${180 + i * 14}h200`, "scg-goalnet"),
  ).join("");
const fence = Array.from({ length: 15 }, (_, i) =>
  line(`M${45 + i * 15} 144v70`, "scg-fence"),
).join("");
const windows = [
  [76, 127],
  [84, 127],
  [76, 138],
  [84, 138],
  [213, 113],
  [221, 113],
  [213, 124],
  [221, 124],
  [233, 140],
  [241, 140],
]
  .map(
    ([x, y]) =>
      `<rect x="${x}" y="${y}" width="3" height="5" fill="#d8bf76" opacity=".55"/>`,
  )
  .join("");
const light = (x, y) =>
  `<g><path d="M${x} ${y}v106" stroke="#71829f" stroke-width="2"/><rect x="${x - 11}" y="${y - 5}" width="22" height="11" rx="1" fill="#333e56" stroke="#a4b4c9"/>${[-7, 0, 7].map((dx) => `<path d="m${x + dx - 1} ${y - 1}h3v3h-3Z" fill="#eff6d7"/>`).join("")}<path d="m${x - 10} ${y + 7} 30 83h-44Z" fill="#cedcf5" opacity=".045"/></g>`;
const glory = `<path fill="#111b35" stroke="#c2a767" stroke-width="1.3" d="M35 26 74 26 88 8h124l14 18h39l23 28-8 288-27 43-103 34-103-34-27-43L12 54Z"/><path fill="#493c69" opacity=".7" d="M40 60Q150 9 260 60v145H40Z"/><path fill="#19243b" d="M62 155v-44h33v44h12v-22h31v22h42v-45h23V93h27v62h22v-28h17v50H42v-22Z"/>${windows}<path fill="#102e31" d="M42 208h216v65H42Z"/><path d="m73 260 77-30 77 30m-77-30v42" stroke="#8c9d7c" fill="none" stroke-width=".8" opacity=".65"/>${fence}<path class="scg-fence" d="M42 154h216M42 166h216M42 190h216"/><path d="M50 257v-82h200v82" stroke="#c1bda0" stroke-width="3" fill="none"/>${net}${light(52, 80)}${light(248, 80)}<path class="scg-worn-gold" d="M12 54 35 26h39L88 8h124l14 18h39l23 28-23 6-13-17h-38l-14-17H100L86 43H48L35 60ZM20 342l27 43 103 34 103-34 27-43-25 5-18 23-87 29-87-29-18-23Z"/><path d="M32 77v244m236-244v244M58 377l92 31 92-31" stroke="#d6bc77" fill="none" stroke-width="1"/><path d="m41 43 9-4m27-6 7-2m35-14h10m39 0h10m38 16 8 2m27 8 8 3M53 383l8-1m16 11 8-1m132 0 8-1" stroke="#efe0b0" stroke-width="1.3" opacity=".6"/><circle cx="229" cy="76" r="6" fill="#c5c5e4" opacity=".65"/><path d="M232 70a6 6 0 0 0 0 11" fill="#313051"/>`;

const refinements = {
  blackjack: `<g class="scg-suit-engraving"><path d="M28 255c-17-11-8-20 0-12 8-8 17 1 0 12Z"/><path d="M272 249c-12 11-19-5-9-8-8-8 8-15 9-5 1-10 17-3 9 5 10 3 3 19-9 8Zm0-2-5 12h10Z"/></g><g transform="translate(204 146) rotate(18)" class="scg-king-engraving"><path d="m-10-6 3 9H7l3-9-6 3-4-6-4 6Zm-7 17h14M-4 4v11h8V4m-4 11-8 7h16Z"/><circle cy="-10" r="1.2"/><path d="m-11 27 4-4h14l4 4"/></g>`,
  cardoso: `<path class="scg-factory-depth" d="M86 118V86h25v40h-8V95H94v23Zm102 12V78h26v52h-8V87h-10v43ZM83 137h32v10H83Zm102 1h32v10h-32Z"/><path d="M90 95v22m120-30v42" fill="none" stroke="#ab8fc4" stroke-width="1.2" opacity=".55"/><path class="scg-lime-line" d="M85 122h15v37m99-23v24h19M39 353l15 22m192 0 15-22"/><g class="scg-broken-chain"><path d="m54 230-5 8q-4 9 4 12t13-6l5-9m-9 16 7 6q8 6 13-1l3-5m-3-13 3-4q5-7 12-2t2 12l-2 3"/><path class="scg-chain-break" d="m76 240 5 4m-8 2 5 5m6-8 5 3"/></g><path class="scg-oil" d="m33 325 7 9 5-4 3 17-6 5-8-9-7 1 2-11Zm229 13 8-9 5 7-3 13-9 4-5-8ZM39 360l7 3 4 10-8-4Zm219 6 7-9 2 7-7 9Z"/><g fill="#d5a43b" opacity=".65"><circle cx="32" cy="316" r="2"/><circle cx="46" cy="323" r="1.5"/><circle cx="274" cy="318" r="2"/><circle cx="265" cy="359" r="1.5"/></g>`,
  rift: `<circle class="scg-reactor-halo" cx="150" cy="153" r="72"/><circle cx="150" cy="153" r="66" fill="none" stroke="#a78be4" stroke-width="2.5" opacity=".5"/><path class="scg-fracture-bed" d="m24 98 9-18-3-12 15-15m230 43-9-14 4-16-13-15M22 203l10 18-5 13 16 20m234-49-10 18 6 13-17 22M54 374l17 4 10 9 22 3m143-16-17 4-10 9-22 3"/><path class="scg-fracture-core" d="m24 98 9-18-3-12 15-15m230 43-9-14 4-16-13-15M22 203l10 18-5 13 16 20m234-49-10 18 6 13-17 22M54 374l17 4 10 9 22 3m143-16-17 4-10 9-22 3"/>`,
  glory: `<g class="scg-gold-filaments"><path d="M65 211q12-17 27-16t27-13M69 217q15-17 28-16t24-14M235 211q-12-17-27-16t-27-13M231 217q-15-17-28-16t-24-14M81 182l9 13-2 14m124-27-9 13 2 14"/></g><g class="scg-lit-particles"><circle cx="83" cy="194" r="1.5"/><circle cx="102" cy="186" r="1.1"/><circle cx="116" cy="177" r="1"/><circle cx="220" cy="194" r="1.6"/><circle cx="197" cy="185" r="1.2"/><circle cx="185" cy="176" r=".9"/><circle cx="74" cy="225" r=".8"/><circle cx="226" cy="227" r=".8"/></g><path class="scg-gold-wear" d="m44 48 9-2m-12 8 5-1m43-23 7-5m26-8 9 1m60 1 6 1m36 18 4 5m25 6 8 3M38 357l3 6m12 15 7 1m32 13 11 3m103-1 8-3m29-16 6-4"/>`,
};

export const GAME_DESIGNS = Object.freeze({
  "blackjack-private": {
    shape:
      "43,9 257,9 282,29 290,62 282,341 257,385 150,418 43,385 18,341 10,62 18,29",
    art: blackjack + refinements.blackjack,
  },
  "roulette-european": {
    shape:
      "58,11 242,11 271,40 289,79 280,340 251,385 150,418 49,385 20,340 11,79 29,40",
    art: roulette,
  },
  "cardoso-asphalt": {
    shape:
      "38,14 116,14 127,4 173,4 184,14 262,14 284,38 290,81 277,344 252,387 150,418 48,387 23,344 10,81 16,38",
    art: cardoso + refinements.cardoso,
  },
  "rift-core": {
    shape:
      "35,7 111,18 134,6 166,6 189,18 265,7 291,46 279,112 292,170 277,346 249,387 150,419 51,387 23,346 8,170 21,112 9,46",
    art: rift + refinements.rift,
  },
  "glory-night": {
    shape:
      "35,26 74,26 88,8 212,8 226,26 265,26 288,54 280,342 253,385 150,419 47,385 20,342 12,54",
    art: glory + refinements.glory,
  },
});
