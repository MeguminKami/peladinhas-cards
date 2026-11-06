// Frame pieces are drawn for the shared card body, rather than cropped from
// another silhouette. Coordinates keep player content clear (x=30..270).
const mirror = (art) => `${art}<g transform="translate(300 0) scale(-1 1)">${art}</g>`;
const metal = (d) => `<path class="scf-metal" d="${d}"/>`;
const seam = (d) => `<path class="scf-seam" d="${d}"/>`;
const gem = (x, y, r = 7) => `<g transform="translate(${x} ${y})">
  <path class="scf-socket" d="M0 ${-r - 3} ${r + 3} 0 0 ${r + 3} ${-r - 3} 0Z"/>
  <path class="scf-gem" d="M0 ${-r} ${r} 0 0 ${r} ${-r} 0Z"/>
  <path class="scf-gem-light" d="M0 ${-r} 0 0 ${-r} 0Z M0 0 ${r} 0 0 ${r}Z"/>
  <path class="scf-polish" d="M0 ${-r} ${r} 0 0 ${r}"/>
</g>`;
const cap = (peak = 0) => metal(`M30 1H113L150 ${peak} 187 1H270L295 9 283 19H185L150 11 115 19H17L5 9Z`)
  + seam('M31 5H113L150 0 187 5H269M22 15H114M186 15H278');
const foot = () => metal('M13 395 37 402 111 406 150 415 189 406 263 402 287 395 279 413 189 417 150 424 111 417 21 413Z')
  + seam('M24 408 111 412 150 420 189 412 276 408');
const crown = (royal = false) => metal(royal
  ? 'M103 14 101 -4 124 5 150 -15 176 5 199 -4 197 14 184 23H116Z'
  : 'M109 13 107 -2 128 5 150 -12 172 5 193 -2 191 13 180 21H120Z')
  + `<path class="scf-enamel" d="M119 13 116 5 130 11 150 -4 170 11 184 5 181 13 174 17H126Z"/>`
  + seam('M120 21H180M125 24H175') + gem(150, 5, royal ? 8 : 6);
const laurel = () => mirror(`<path class="scf-stem" d="M9 149Q-1 243 15 365"/>
  ${Array.from({ length: 7 }, (_, i) => {
    const y = 162 + i * 27;
    return metal(`M8 ${y + 21}Q-9 ${y + 6} -3 ${y - 5}Q12 ${y} 8 ${y + 21}Z M9 ${y + 27}Q25 ${y + 13} 20 ${y + 3}Q7 ${y + 9} 9 ${y + 27}Z`)
      + seam(`M7 ${y + 17} 0 ${y + 3}M11 ${y + 23} 18 ${y + 10}`);
  }).join('')}`);
const bolts = () => mirror([43, 377].map(y => `<circle class="scf-socket" cx="10" cy="${y}" r="4"/><path class="scf-seam" d="M8 ${y}h4"/>`).join(''));
const ribs = () => mirror(Array.from({ length: 5 }, (_, i) => metal(`M4 ${172 + i * 37} 19 ${158 + i * 37} 17 ${172 + i * 37} 4 ${185 + i * 37}Z`)).join(''));
const bevels = () => mirror(metal('M29 1 4 8 8 89 18 69 13 15 36 8Z') + seam('M8 12 12 66'));
const sweep = () => mirror(metal('M6 145Q-8 192 0 249L8 361 19 383 14 327 7 243Q3 185 16 153Z') + seam('M5 168Q-2 209 5 260L13 352'));
const spade = (x) => `<path class="scf-inlay" d="M${x} 7c-3 4-7 5-7 9 0 4 5 5 7 1l-2 6h4l-2-6c2 4 7 3 7-1 0-4-4-5-7-9Z"/>`;
const prestige = {
  'platinum-prism': 1, 'palladium-flare': 2, 'iridium-pulse': 3,
  'rhodium-crown': 4, 'osmium-apex': 5,
  'football-p1': 1, 'football-p2': 2, 'football-p3': 4, 'football-p4': 5,
};
const darkMetal = (d) => `<path class="scf-gunmetal" d="${d}"/>`;
const armour = (rank) => mirror(
  darkMetal('M19 12H89L102 23H29L18 36 14 130 7 146 6 30Z M12 249 21 263 24 379 38 395 97 402 89 411 26 405 16 389Z')
  + `<path class="scf-steel" d="M20 16H77L82 20H25L19 28Z M19 283l4 87-4-6-3-91Z"/>`
  + seam('M13 43 11 114M24 382l9 12 44 6')
  + (rank >= 3 ? Array.from({ length: rank }, (_, i) => `<path class="scf-vent" d="M${34 + i * 8} 14l4 5"/>`).join('') : '')
  + (rank >= 4 ? darkMetal('M7 167 18 179 13 205 4 216 1 194Z') + seam('M6 186 11 179') : '')
);
const chip = (x, y, color) => `<g transform="translate(${x} ${y})"><ellipse cy="4" rx="15" ry="5" fill="#101917"/><ellipse rx="15" ry="5" fill="${color}" stroke="#e9dfba" stroke-width="1"/><ellipse rx="10" ry="3" fill="none" stroke="#e9dfba" stroke-width=".6"/><path d="M-13-1v3M13-1v3M-3-4h6M-3 4h6" stroke="#eee4cb" stroke-width="2"/></g>`;
const playingCard = (x, angle, red = false) => `<g transform="translate(${x} 49) rotate(${angle})"><rect x="-17" y="-25" width="34" height="50" rx="3" fill="#e9e0c8" stroke="#ac955d"/><rect x="-14" y="-22" width="28" height="44" rx="2" fill="none" stroke="#b5a77f" stroke-width=".6"/><path transform="scale(.7)" fill="${red ? '#ad3f3a' : '#162c24'}" d="M0-13C-4-7-12-3-12 3c0 8 8 10 12 4l-4 11h8L0 7c4 6 12 4 12-4 0-6-8-10-12-16Z"/><circle cx="-10" cy="-17" r="2" fill="${red ? '#ad3f3a' : '#162c24'}"/></g>`;

function gameFrame(id) {
  if (id === 'blackjack-private') return mirror(`<path class="scf-wood-inlay" d="M7 40 17 54 22 369 15 385Z"/>${spade(12)}`)
    + chip(59, 404, '#913b38') + chip(59, 399, '#1d6650') + chip(59, 394, '#913b38');
  if (id === 'roulette-european') return mirror(`<path class="scf-wood-inlay" d="M7 42 18 54 22 371 15 385Z"/>`)
    + `<circle cx="150" cy="410" r="5" fill="#fff5db" stroke="#bca166"/>`;
  if (id === 'cardoso-asphalt') return mirror(darkMetal('M3 30 20 44 24 381 14 401 8 371Z')
    + `<g class="scf-hazard">${[0,1,2,3].map(i => `<path d="M${24 + i * 13} 6h7l-5 13h-7Z"/>`).join('')}</g>`
    + `<path class="scf-vent" d="M8 139h11m-10 6h10m-10 6h10m-9 6h9"/>`
    + `<path class="scf-oil" d="M12 336q-9 12-6 17t10 1q4-5-4-18Z"/>`)
    + `<path class="scf-chain" d="m113 400 14-5q7-2 9 4t-4 9l-13 4q-8 1-9-5m77-7-14-5q-7-2-9 4t4 9l13 4q8 1 9-5M143 399l-3 5m17-5 3 5"/>`;
  if (id === 'rift-core') return mirror(darkMetal('M10 42 22 52 17 121 24 141 14 166 20 191 11 220 17 286 10 379 3 392 8 287 2 219 12 190 6 166 16 140 10 120Z'))
    + `<g transform="translate(150 8)"><circle class="scf-reactor-shell" r="16"/><circle class="scf-energy" r="11"/><path class="scf-energy" d="m-5-5 10 10m0-10L-5 5"/></g>`;
  if (id === 'glory-night') return mirror(darkMetal('M7 38 16 43 22 382 14 394Z')
    + `<path class="scf-fence-detail" d="M8 90 19 108 9 127 20 146 10 165 21 184M19 90 8 108 20 127 9 146 21 165 10 184"/>`)
    + `<path class="scf-pitch-mark" d="M90 405h120v13H90Zm60 0v13m-10-7h20"/>`;
  return '';
}

// Recognisable game scenery sits below the player layers, never over identity.
export function shopGameScene(id) {
  let art = '';
  if (id === 'blackjack-private') art = `<path fill="#184733" d="M21 27H279V229H21Z"/><path class="scf-table-stitch" d="M30 217Q150 162 270 217M30 32H270"/>`
    + playingCard(135, -16) + playingCard(173, 12, true)
    + `<path class="scf-table-stitch" d="M103 94Q154 112 206 94"/>`;
  if (id === 'roulette-european') {
    const pockets = Array.from({length: 37}, (_, i) => {
      const a = i * Math.PI * 2 / 37 - Math.PI / 2, b = (i + 1) * Math.PI * 2 / 37 - Math.PI / 2;
      const point = (r, angle) => `${(181 + r * Math.cos(angle)).toFixed(2)} ${(111 + r * Math.sin(angle)).toFixed(2)}`;
      return `<path d="M${point(83,a)}A83 83 0 0 1 ${point(83,b)}L${point(65,b)}A65 65 0 0 0 ${point(65,a)}Z" fill="${i === 0 ? '#257a55' : i % 2 ? '#a73531' : '#141817'}" stroke="#c1a467" stroke-width=".55"/>`;
    }).join('');
    art = `<circle cx="181" cy="111" r="89" fill="#37241c" stroke="#bca16a" stroke-width="3"/>${pockets}<circle cx="181" cy="111" r="61" fill="#59382a" stroke="#d0b47b" stroke-width="2"/><path d="M128 81 234 141M151 164l60-106" stroke="#c2a46d" stroke-width="2"/><circle cx="181" cy="111" r="12" fill="#bc9756"/><circle cx="238" cy="57" r="5" fill="#fff4d7" stroke="#92764b"/><circle cx="237" cy="55" r="1.5" fill="white"/>`;
  }
  if (id === 'cardoso-asphalt') art = `<path fill="#151c1f" d="M23 25H277V231H23Z"/><path fill="#303a3d" d="M108 143V45h22v53h17V30h28v87h22V51h30v95h25V79h20v133H97Z"/><path class="scf-factory-pipe" d="M117 132V40h27v31m43 62V32h43v62m-26 20h53v62"/><path class="scf-factory-joint" d="M113 62h8m62-7h8m33 22h12M119 128h23v7h-23Z"/><path class="scf-fence-detail" d="M24 192h252m-250 9h249"/><path class="scf-hazard" d="M106 33h6v13h-6Zm10 0h6v13h-6Z"/>`;
  if (id === 'rift-core') art = `<path fill="#0d1222" d="M23 26H277V231H23Z"/><circle cx="182" cy="112" r="85" fill="#17152f" stroke="#374553" stroke-width="9"/><circle cx="182" cy="112" r="73" fill="none" stroke="#68d8e8" stroke-width="2"/><circle cx="182" cy="112" r="66" fill="none" stroke="#9d7fe2" stroke-width="4" stroke-dasharray="13 6"/><path class="scf-reactor-ticks" d="M182 28v19m0 130v19M98 112h19m130 0h19M122 52l13 13m94 94 13 13m0-120-13 13m-94 94-13 13"/><path class="scf-energy" d="m118 38 18 17-7 16 17 14M251 46l-12 18 9 16-11 16"/>`;
  if (id === 'glory-night') art = `<path fill="#142136" d="M23 26H277V231H23Z"/><path fill="#243247" d="M107 101V62h21v27h13V44h26v48h18V59h35V41h20v55h25V70h14v101H99Z"/><path fill="#174134" d="M22 171H278V232H22Z"/><path class="scf-fence-detail" d="M26 115H274M26 135H274M26 155H274M110 96v71m22-71v71m22-71v71m22-71v71m22-71v71m22-71v71m22-71v71m22-71v71"/><path class="scf-goal-frame" d="M112 184V93H262v91"/><path class="scf-goal-net" d="M119 101h135v75H119Zm0 15h135m-135 15h135m-135 15h135m-135 15h135m-112-60v75m22-75v75m22-75v75m22-75v75m22-75v75"/><path class="scf-light-beam" d="M111 31 83 168 182 133Z M255 31 194 136 277 164Z"/><g class="scf-floodlight">${[0,1,2].map(i=>`<rect x="${100+i*9}" y="28" width="7" height="6" rx="1"/><rect x="${242+i*9}" y="28" width="7" height="6" rx="1"/>`).join('')}</g>`;
  return art ? `<g class="sca-game-scene" data-game-scene="${id}">${art}<path class="scf-rating-panel" d="M25 42H97V193H25Z"/></g>` : '';
}

function editionPieces(id) {
  switch (id) {
    case 'bronze-foundry':
      return bevels() + bolts() + mirror(seam('M10 64 15 352'));
    case 'silver-mirror':
      return bevels() + mirror(metal('M6 105 19 86 13 160 8 201Z M9 323 20 351 17 379 11 363Z'));
    case 'gold-vault':
      return bevels() + gem(150, 7, 7) + mirror(seam('M11 54 16 372M14 61l4 296'));
    case 'platinum-prism':
      return bevels() + gem(150, 6, 11) + mirror(gem(6, 178, 6) + metal('M8 277 22 297 15 326 7 309Z'));
    case 'palladium-flare':
      return sweep() + mirror(metal('M8 67Q37 34 91 10L114 9Q40 36 18 80Z')) + gem(150, 8, 7);
    case 'iridium-pulse':
      return ribs() + mirror(`<path class="scf-energy" d="M10 65 13 115 4 133 13 159 10 220 16 238 11 262 16 367"/>`) + gem(150, 5, 10);
    case 'rhodium-crown':
      return crown() + laurel();
    case 'osmium-apex':
      return bevels() + ribs() + metal('M150 -10 157 0 173 5 159 12 150 24 141 12 127 5 143 0Z') + gem(150, 6, 7);
    case 'blackjack-private':
      return bevels() + spade(55) + spade(245) + mirror(`<path class="scf-stitch" d="M17 33 22 384"/>`) + gem(150, 410, 6);
    case 'roulette-european': {
      const ticks = Array.from({ length: 19 }, (_, i) => {
        const a = Math.PI + i * Math.PI / 18;
        const x = 150 + Math.cos(a) * 65, y = 17 + Math.sin(a) * 12;
        return `<path d="M${x.toFixed(2)} ${y.toFixed(2)}l0 5" stroke="${i % 2 ? '#ba4740' : '#171b1a'}" stroke-width="6"/>`;
      }).join('');
      return `<path class="scf-socket" d="M78 24Q150 -14 222 24L216 28Q150 -1 84 28Z"/>${ticks}` + bolts();
    }
    case 'cardoso-asphalt':
      return bevels() + bolts() + mirror(Array.from({ length: 8 }, (_, i) => seam(`M8 ${161 + i * 17}l8 -4`)).join(''));
    case 'rift-core':
      return bevels() + mirror(metal('M7 118 18 136 10 157 18 187 8 212 14 264 6 293 14 367 7 383 1 290 7 263 1 211 11 185 3 156 11 136Z')
        + `<path class="scf-energy" d="M8 119 15 136 7 157 15 186 5 212 11 264 3 293 11 367"/>`) + gem(150, 6, 9);
    case 'glory-night':
      return bevels() + mirror(`<g class="scf-lights">${[0, 1, 2].map(i => `<rect x="${32 + i * 10}" y="6" width="7" height="5" rx="1"/>`).join('')}</g>`)
        + mirror(`<path class="scf-stitch" d="M12 57 17 370"/>`) + gem(150, 410, 6);
    case 'football-p1':
      return cap(-7) + ribs() + foot() + mirror(seam('M7 41 12 134M12 302 17 388'));
    case 'football-p2':
      return cap(-7) + sweep() + mirror(gem(4, 183, 8)) + foot() + gem(150, 410, 8);
    case 'football-p3':
      return crown() + laurel() + foot() + gem(150, 411, 10);
    case 'football-p4':
      return crown(true) + mirror(Array.from({ length: 5 }, (_, i) => {
        const y = 165 + i * 43;
        return metal(`M7 ${y - 15} 21 ${y} 8 ${y + 21} -5 ${y}Z`) + gem(8, y, 5);
      }).join('')) + foot() + gem(150, 410, 11);
    default:
      return bevels() + gem(150, 8, 7) + bolts();
  }
}

export function shopFrameArt(id, paint, outline) {
  const rank = prestige[id] || 0;
  return `<g class="sca-crafted-frame${rank ? ' scf-rare' : ''}" style="--scf-fill:url(#${paint}-frame-metal);--scf-gunmetal:url(#${paint}-gunmetal)">
    <defs><linearGradient id="${paint}-gunmetal" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#10151c"/><stop offset=".28" stop-color="#4d5663"/><stop offset=".47" stop-color="#1c222b"/><stop offset=".51" stop-color="#707986"/><stop offset=".57" stop-color="#262d37"/><stop offset="1" stop-color="#0b1016"/></linearGradient><linearGradient id="${paint}-frame-metal" x1="0" y1="0" x2="1" y2=".8">
      <stop class="scf-stop-light"/><stop offset=".22" class="scf-stop-mid"/>
      <stop offset=".46" class="scf-stop-light"/><stop offset=".52" class="scf-stop-mid"/>
      <stop offset="1" class="scf-stop-dark"/>
    </linearGradient></defs>
    <polygon class="scf-channel" points="${outline}" transform="translate(6 8.4) scale(.96)"/>
    <polygon class="sca-base-rim" points="${outline}" mask="url(#${paint}-rail)"/>
    ${mirror(metal('M30 1 2 8 12 393 21 414 35 416 23 393 10 14 32 7Z') + seam('M6 15 17 392'))}
    <path class="scf-collar" d="M31 2H269L292 9 282 19H18L8 9Z"/>
    ${seam('M34 5H266M26 14H106M194 14H274')}
    <path class="scf-collar" d="M19 401 113 407 150 415 187 407 281 401 277 414 188 418 150 422 112 418 23 414Z"/>
    ${rank ? armour(rank) : ''}
    ${editionPieces(id)}
    ${gameFrame(id)}
  </g>`;
}
