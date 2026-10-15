const paths = {
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
