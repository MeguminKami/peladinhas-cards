import { pageHead, esc, empty } from "./ui.js";
import { matchSeriesAverages, matchAverageSummary } from "./match-rating-summary.js";
export function statisticsPage(ctx) {
  const closed = ctx.league.games.filter((g) => g.status === "closed"),
    goals = closed.reduce((n, g) => n + g.score.teamA + g.score.teamB, 0);
  ctx.render(
    `${pageHead("A liga em números", "Estatísticas")}<div class="metrics statistics-metrics">${[
      ["Jogadores", ctx.league.players.length],
      ["Jogos finalizados", closed.length],
      ["Golos da liga", goals],
      [
        "Assistências",
        ctx.league.players.reduce((n, p) => n + p.matchStats.assists, 0),
      ],
      [
        "Golos por jogo",
        closed.length ? (goals / closed.length).toFixed(1) : "—",
      ],
    ]
      .map(
        ([label, value]) => `<div><small>${label}</small><b>${value}</b></div>`,
      )
      .join(
        "",
      )}</div><section class="panel statistics-panel"><div id="statistics-controls" class="statistics-controls"></div><div id="statistics-table"></div></section>`,
  );
  const columns = [
    ["name", "Jogador"],
    ["position", "Posição"],
    ["ovr", "OVR"],
    ["played", "Jogos"],
    ["wins", "Vitórias"],
    ["draws", "Empates"],
    ["losses", "Derrotas"],
    ["winRate", "Vitórias (%)"],
    ["goals", "Golos"],
    ["assists", "Assistências"],
    ["goalsFor", "Golos da equipa"],
    ["goalsAgainst", "Golos sofridos"],
    ["form", "Forma / 5"],
  ];
  let key = "goals",
    direction = "desc";
  const root = document.querySelector("#statistics-table");
  const controls = document.querySelector("#statistics-controls");
  controls.innerHTML = `<label>Ordenar por<select id="statistics-sort">${columns.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></label><label>Ordem<select id="statistics-direction"><option value="desc">Maior primeiro</option><option value="asc">Menor primeiro</option></select></label>`;
  const draw = () => {
    controls.querySelector("#statistics-sort").value = key;
    controls.querySelector("#statistics-direction").value = direction;
    const players = ctx.league.players.map((p) => ({
      ...p,
      ...p.matchStats,
      name: p.displayName || p.username,
      position: p.primaryPosition || "—",
      ovr: p.hasCard ? p.ovr : null,
      form: matchSeriesAverages(p.aggregates).withoutGoalkeeping,
      formAverages: matchSeriesAverages(p.aggregates),
    }));
    players.sort((a, b) => {
      if (a[key] == null) return b[key] == null ? 0 : 1;
      if (b[key] == null) return -1;
      const difference =
        typeof a[key] === "string"
          ? a[key].localeCompare(b[key], "pt-PT")
          : a[key] - b[key];
      return (
        difference * (direction === "asc" ? 1 : -1) ||
        a.name.localeCompare(b.name)
      );
    });
    root.innerHTML = players.length
      ? `<table class="statistics-table"><thead><tr>${columns.map(([id, label]) => `<th scope="col" class="stat-${id}" aria-sort="${id === key ? (direction === "asc" ? "ascending" : "descending") : "none"}"><button type="button" data-stat-sort="${id}">${label}<span aria-hidden="true">${id === key ? (direction === "asc" ? "↑" : "↓") : "↕"}</span></button></th>`).join("")}</tr></thead><tbody>${players.map((p) => `<tr>${columns.map(([id, label]) => `<td class="stat-${id}" data-label="${label}">${id === "name" ? `<a href="#/player/${esc(p.uid)}">${esc(p.name)}</a>` : id === "form" ? matchAverageSummary(p.formAverages,{digits:2}) : id === "winRate" ? `${p.winRate}%` : esc(p[id] ?? "—")}</td>`).join("")}</tr>`).join("")}</tbody></table>`
      : empty("Ainda sem jogadores");
  };
  controls.onchange = (event) => {
    if (event.target.id === "statistics-sort") {
      key = event.target.value;
      direction = ["name", "position"].includes(key) ? "asc" : "desc";
    } else direction = event.target.value;
    draw();
  };
  root.onclick = (event) => {
    const button = event.target.closest("[data-stat-sort]");
    if (!button) return;
    if (key === button.dataset.statSort)
      direction = direction === "asc" ? "desc" : "asc";
    else {
      key = button.dataset.statSort;
      direction = ["name", "position"].includes(key) ? "asc" : "desc";
    }
    draw();
  };
  draw();
}
