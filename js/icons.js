import { TOTAL_OBJECTIVES } from "./event-totals.js";
const paths = {
  cards: "M8 3h11l2 3v13l-7 3-7-3V5Z M4 6H2v12l3 2 M10 8h8 M10 12h8 M10 16h5",
  ban: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M5 5l14 14",
  search: "M15 15l6 6 M17 9a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  filter: "M3 5h18 M6 12h12 M9 19h6 M8 2v6 M16 9v6 M11 16v6",
  info: "M12 17v-5 M12 8h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  lock: "M6 10h12v11H6Z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3",
  resetPassword: "M15 7a5 5 0 1 1-4.8 6.4L3 20H1v-3l7.6-7.2A5 5 0 0 1 15 7Z M16 10h.01 M4 16l2 2",
  copy: "M9 9h12v12H9Z M5 15H3V3h12v2",
  publish: "M12 16V3 m-5 5 5-5 5 5 M4 15v6h16v-6",
  path: "M12 21v-7M12 14 5 8M12 14l7-6M5 8V3M19 8V3M2 3h6M16 3h6M9 21h6 M9 14h6",
  gift: "M3 8h18v4H3Z M5 12v9h14v-9 M12 8v13 M12 8H8a3 3 0 1 1 3-3l1 3Z M12 8h4a3 3 0 1 0-3-3l-1 3Z",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3l-.6 2.2-2 .9-2-.6L2 9.8l1.5 1.6v2.3L2 15.3l2.5 4.3 2-.6 2 .9L9 22h6l.6-2.1 2-.9 2 .6 2.5-4.3-1.5-1.6v-2.3l1.5-1.6-2.5-4.3-2 .6-2-.9L15 3Z",
  download: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
  preview: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  refresh: "M20 4v6h-6 M4 20v-6h6 M5 9a7 7 0 0 1 12-4l3 5 M4 14l3 5a7 7 0 0 0 12-4",
  studioModels: "M6 3h12v18H6Z M3 6v12 M21 6v12 M9 7h6 M9 11h6 M9 16h3",
  studioComposition:
    "M3 3h7v7H3Z M14 3h7v7h-7Z M3 14h7v7H3Z M14 14h7v7h-7Z M12 2v20 M2 12h20",
  studioMaterials: "m12 3 10 5-10 5L2 8Z M2 12l10 5 10-5 M2 16l10 5 10-5",
  studioSymbols: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z",
  studioType: "M3 5h12 M9 5v16 M5 21h8 M15 12h7 M18.5 12v9 M16 21h5",
  studioLight:
    "M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  studioOutline: "M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5 M7 7h10v10H7Z",
  studioChevron: "m8 10 4 4 4-4",
  share: "M12 16V3 m-4 4 4-4 4 4 M5 11H3v10h18V11h-2",
  ratingGames: "m12 2 3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1Z M3 22h18",
  ratingAverage: "M3 20h18 M5 16l4-5 4 2 6-8 M16 5h3v3 M4 4h5 M6.5 2v4",
  ratingStreak: "m13 2-3 7 5-1-5 14 1-9-5 1Z M18 10l2-2 2 2 M18 15l2-2 2 2",
  ratingWins:
    "M8 3h8v7a4 4 0 0 1-8 0Z M8 5H4v3a4 4 0 0 0 4 4 M16 5h4v3a4 4 0 0 1-4 4 M12 14v7 M8 21h8 m-4-16 1 2 2 .5-1.5 1.5.5 2-2-1-2 1 .5-2L9 7.5l2-.5Z",
  pause: "M8 5v14 M16 5v14",
  play: "m8 4 12 8-12 8Z",
  goals:
    "M4 20V6h16v14 M4 10h16 M8 6v14 M16 6v14 M4 15h9 M20 15h-2 M17 17h.01 M20 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  assists:
    "M3 14V5h6l1 6 5 3 6 1v5H3Z M3 17h18 M6 20v2 M11 20v2 M17 20v2 M10 10l3-2 M13 12l3-2",
  appearances: "m8 3-5 4 3 4 2-2v12h8V9l2 2 3-4-5-4 M9 3a3 3 0 0 0 6 0",
  wins: "M8 3h8v8a4 4 0 0 1-8 0Z M8 5H4v3a4 4 0 0 0 4 4 M16 5h4v3a4 4 0 0 1-4 4 M12 15v6 M8 21h8 m2-13 1.5 1.5L14 7",
  streak: "m13 2-2 7 5-2-1 5 4-1-7 11 1-8-5 2 2-7-4 1 7-8Z",
  unbeatenWins: "M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6Z m-4 10 3 3 5-6 M12 5v2",
  unbeatenGames: "M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6Z m-4 10 3 3 5-6",
  cleanSheets: "M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6Z M9 9h6v7H9Z",
  goalContributions:
    "M3 20V6h11v5 M3 10h11 M7 6v14 M3 15h7 M13 19h3a5 5 0 0 0 5-5v-3 m-3 3 3-3 2 3",
  vote: "m9 3 8 5-5 8-8-5Z M4 14H2v7h20v-7h-5 M9 17h6",
  decision: "m14 3 7 7-3 3-7-7Z m0 6-7 7 M3 21h12 M5 18h8v3",
  rewardCard: "m8 2 4 2 4-2 5 4v12l-9 4-9-4V6Z M8 9h8 M8 13h8 M10 17h4",
  rewardStats: "M4 20h16 M7 16v-5 M12 16V8 M17 16V4 m-3 3 3-3 3 3",

  install: "M12 3v12 m-4-4 4 4 4-4 M4 16v5h16v-5",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  tickets: "M4 4h16v12H9l-5 4Z M8 8h8 M8 12h5",
  palette:
    "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 1.5 1.5 0 0 1 1-2.8h2a4 4 0 0 0 4-4C21 6.4 17 3 12 3 M7 9h.01 M10 6h.01 M15 6h.01 M18 10h.01",
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1Z",
  players:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  games:
    "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
  missions: "m8 12 3 3 5-6 M21 12a9 9 0 1 1-4-7.5",
  profile: "M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  trophy:
    "M8 3h8v8a4 4 0 0 1-8 0Z M8 5H4v3a4 4 0 0 0 4 4 M16 5h4v3a4 4 0 0 1-4 4 M12 15v6 M8 21h8",
  chart: "M4 3v17h17 M8 16v-5 M13 16V7 M18 16V4",
  edit: "m16 3 5 5-12 12-6 1 1-6Z M13 6l5 5",
  plus: "M12 5v14 M5 12h14",
  arrow: "M5 12h14 m-6-6 6 6-6 6",
  camera: "M14 4h-4L8 7H4v13h16V7h-4Z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  shield: "M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7Z",
  lab: "M9 3h6 M10 3v7L4 20h16l-6-10V3 M7 16h10",
  logout: "M9 3H3v18h6 M10 12h11 m-4-4 4 4-4 4",
  close: "m6 6 12 12 M6 18 18 6",
  ball: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 8l4 3-2 5h-4l-2-5Z",
  trash: "M3 6h18 M8 6V3h8v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  check: "m4 12 5 5L20 6",
  assets: "M3 3h7v7H3Z M14 3h7v7h-7Z M3 14h7v7H3Z M14 14h7v7h-7Z",
};
export const icon = (name, cls = "") =>
  `<svg class="ui-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.ball}"/></svg>`;

// A compact, faceted arrow shared by cards and profile comparisons.
export const trendArrow = (delta) =>
  `<svg class="trend-arrow${delta < 0 ? " trend-arrow-down" : ""}" viewBox="0 0 16 20" fill="none" aria-hidden="true" focusable="false"><path class="trend-arrow-body" d="M8 1.5 14.5 8H10v9.5H6V8H1.5L8 1.5Z"/><path class="trend-arrow-facet" d="M8 1.5V17.5H6V8H1.5L8 1.5Z"/><path class="trend-arrow-edge" d="m2 7.5 6-6 6 6"/></svg>`;

export function eventIcon(event = {}) {
  if (TOTAL_OBJECTIVES[event.objective?.metric]) return eventIcon({...event, objective:{...event.objective, metric:TOTAL_OBJECTIVES[event.objective.metric].metric}});
  if (
    ["ratingGames", "ratingAverage", "ratingStreak", "ratingWins"].includes(
      event.objective?.metric,
    ) &&
    event.method !== "vote" &&
    event.method !== "admin"
  )
    return event.objective.metric;
  if (event.method === "vote" || (!event.method && event.kind === "vote"))
    return "vote";
  if (event.method === "admin") return "decision";
  return (
    {
      games: "appearances",
      goals: "goals",
      assists: "assists",
      wins: "wins",
      winStreak: "streak",
      unbeatenWins: "unbeatenWins",
      unbeatenGames: "unbeatenGames",
      goalsAndAssists: "goalContributions",
      cleanSheets: "cleanSheets",
      combined: "goalContributions",
      all: "missions",
      draws: "games",
      losses: "games",
      nonLosses: "unbeatenGames",
      goalsFor: "goals",
      goalsAgainst: "cleanSheets",
      scoringGames: "goals",
      assistingGames: "assists",
      contributingGames: "goalContributions",
    }[event.objective?.metric] || "trophy"
  );
}
