// Base material, not a reward edition. All wear is decorative and text-free.
export const SCRAP_OUTLINE = "8,5 25,3 28,6 54,4 57,1 77,4 90,3 98,11 94,17 98,25 97,77 94,85 96,89 82,94 68,94 65,97 48,99 32,95 17,96 5,89 3,79 4,26 1,18 5,14 2,10";

export function scrapArt(id) {
  return `<svg class="scrap-material" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs>
    <pattern id="${id}-pits" width="13" height="17" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".55" fill="#101412"/><circle cx="8" cy="12" r=".35" fill="#afb0a2"/><path d="m4 8 2-.6m4-3 1 .3M1 16l2-.7" stroke="#101412" stroke-width=".35"/></pattern>
    <pattern id="${id}-mesh" width="9" height="9" patternUnits="userSpaceOnUse"><path d="m0 0 9 9m0-9L0 9" fill="none" stroke="#b6b5a3" stroke-width=".3"/></pattern>
  </defs>
  <path class="scrap-rust" d="m0 1 22 1-4 3 7 3-12 1 2 5-7-2 2 10-5-2 2 14-7 7ZM83 0h17v41l-4-7-2 6-1-15-5 4 2-13-8-4 6-3ZM0 91l5 7 2-5 2 18-4-1 6 15-4 5 12 8-2 12H0Zm100 13-6-3 1 14-6-2 2 17-9 4-2 8-15-1-6 9h41Z"/>
  <path class="scrap-oxidation" d="m3 5 12-1-6 7 1 6-5-3ZM95 6l-7 3 6 7-2 13 6-4ZM5 115l4 14 9 12-12 6ZM94 124l-4 14-13 5 17 2Z"/>
  <rect width="100" height="150" fill="url(#${id}-pits)" opacity=".5"/>
  <path d="m38 13 48-3 8 17-3 44-48 5-9-19Z" fill="url(#${id}-mesh)" opacity=".16"/>
  <path class="scrap-flaked-paint" d="m25 12 8-3 3 2 15-2-8 3-13 2Zm19 37 6-2 7 1-6 2Zm-34 72 3 4-2 9-2-3Zm73-23 8-3 2 2-5 2 1 4-5 4Z"/>
  <path class="scrap-seam" d="m9 9 18-2 9 3 20-3 22 2m10 9 3 23-1 32m-83-41 1 39-2 14m3 28 2 20 15 10 20 2 15-1 23-5 8-12"/>
  <path class="scrap-scratches" d="m13 19 8-2m-7 4 3-.6M75 78l15-4m-9 6 5-2M7 102l3-5m78 39 4-8M18 142l17 2m-10-4 6 .5"/>
  <g class="scrap-rivets"><circle cx="7" cy="15" r="1.2"/><circle cx="93" cy="38" r="1.2"/><circle cx="8" cy="135" r="1.2"/><circle cx="91" cy="135" r="1.2"/></g>
  <path class="scrap-rivet-slots" d="m6.3 14.6 1.4 .8m84.7 22 1.2 1.2m-86.3 96 1.4 .8m81.6-1 1.4 1.2"/>
  <g transform="rotate(21 86 10)"><path class="scrap-tape-shadow" d="m73 5 26-1-1 13-26 1Z"/><path class="scrap-tape" d="m73 3 3 1 3-1 2 1 3-1 3 1 3-1 2 1 4-1 1 12-3-1-3 1-3-1-2 1-3-1-2 1-3-1-4 1Z"/><path class="scrap-tape-fibres" d="m76 6 18-1m-18 4 18-1m-17 4 17-1"/></g>
  <path class="scrap-wire" d="m4 94 4-3-2-4 4-4m-7 2 8 6m-7-1 6-4"/>
  </svg>`;
}
