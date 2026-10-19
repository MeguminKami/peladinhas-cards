import { esc, empty } from "./ui.js";
import { icon } from "./icons.js";
import { asDate, OVR_POSITIONS } from "./utils.js";
import {
  STAT_METRICS,
  STAT_BY_ID,
  STAT_GROUPS,
  STAT_PRESETS,
  STAT_OPERATORS,
  defaultStatQuery,
  normalizeStatQuery,
  normalizeSearch,
  statisticsGames,
  statisticsRows,
  filterStatRows,
  statNumber,
  statisticsCSV,
} from "./statistics-model.js";

const PERIODS = {
  all: "Todos os jogos",
  30: "Últimos 30 dias",
  90: "Últimos 90 dias",
  year: "Este ano",
  custom: "Intervalo de datas",
};
const options = (entries, selected) =>
  entries
    .map(
      ([value, label]) =>
        `<option value="${esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(label)}</option>`,
    )
    .join("");
const metricOptions = (selected) =>
  Object.entries(STAT_GROUPS)
    .map(
      ([group, label]) =>
        `<optgroup label="${label}">${options(
          STAT_METRICS.filter((metric) => metric.group === group).map(
            (metric) => [metric.id, metric.label],
          ),
          selected,
        )}</optgroup>`,
    )
    .join("");
const groupLabel = (group) =>
  ({
    results: "Resultados",
    efficiency: "Por jogo",
    ratings: "Avaliação · /5",
    card: "Carta atual · /99",
  })[group];
const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toLocaleUpperCase("pt-PT");

export function statisticsPage(ctx) {
  const storageKey = `peladinhas:statistics:v1:${ctx.user?.uid || "local"}`;
  let query = defaultStatQuery(),
    panel = null,
    baseRows = [],
    rows = [],
    games = [],
    draftFilters = [],
    columnSearch = "",
    storageAvailable = true,
    lastColumns = "";
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) query = normalizeStatQuery(JSON.parse(stored));
  } catch {
    storageAvailable = false;
  }
  ctx.render(`<div class="stats-workspace">
    <header class="stats-heading"><div><p class="eyebrow">A LIGA, SOB OUTRA PERSPETIVA</p><h1>Estatísticas<span class="stats-heading-mark" aria-hidden="true">${icon("chart")}</span></h1><p>Escolhe os números. Liga os resultados às avaliações.</p></div><div class="stats-data-label">${icon("games")}<span>Dados dos jogos encerrados<small>Resultados e médias por jogador</small></span></div></header>
    <button type="button" class="stats-overview-toggle" id="stats-overview-toggle" aria-expanded="false" aria-controls="stats-overview"><span>Resumo dos jogos</span><span id="stats-overview-toggle-count"></span>${icon("studioChevron")}</button><div class="stats-overview" id="stats-overview" aria-label="Resumo dos jogos selecionados"></div>
    <section class="stats-explorer" aria-labelledby="stats-explorer-title">
      <div class="stats-explorer-top"><div><span class="stats-kicker">EXPLORAR A LIGA</span><h2 id="stats-explorer-title">A tua consulta</h2></div><div class="stats-top-actions"><span id="stats-save-state" class="stats-save-state"></span><button type="button" class="btn btn-ghost" id="stats-reset" aria-label="Repor a consulta inicial">${icon("refresh")}<span>Repor</span></button><button type="button" class="btn btn-secondary" id="stats-export" aria-label="Exportar CSV">${icon("install")}<span>Exportar CSV</span></button></div></div>
      <div class="stats-presets" role="group" aria-label="Vistas rápidas">${Object.entries(
        STAT_PRESETS,
      )
        .map(
          ([id, preset]) =>
            `<button type="button" data-stat-preset="${id}" aria-pressed="false">${icon(preset.icon)}${preset.label}</button>`,
        )
        .join(
          "",
        )}<span class="stats-preset-note">Personaliza com Colunas e Filtros</span></div>
      <div class="stats-query-bar"><label class="stats-search"><span class="visually-hidden">Pesquisar jogador</span>${icon("search")}<input id="stats-search" type="search" placeholder="Pesquisar jogador…" value="${esc(query.search)}" autocomplete="off"></label><div class="stats-query-actions"><button type="button" class="btn btn-ghost" data-stat-panel="context" aria-expanded="false" aria-controls="stats-builder">${icon("games")}<span id="stats-period-label">Período</span></button><button type="button" class="btn btn-ghost" data-stat-panel="filters" aria-expanded="false" aria-controls="stats-builder">${icon("filter")}Filtros<span id="stats-filter-count" class="stats-count">0</span></button><button type="button" class="btn btn-primary" data-stat-panel="columns" aria-expanded="false" aria-controls="stats-builder">${icon("studioComposition")}Colunas<span id="stats-column-count" class="stats-count"></span></button></div></div>
      <div id="stats-builder" class="stats-builder" hidden></div><div id="stats-filter-chips" class="stats-filter-chips" aria-label="Filtros aplicados"></div>
      <div class="stats-results-head"><div><h3 id="stats-view-title">Visão geral</h3><p id="stats-result-count" role="status" aria-live="polite"></p></div><div id="statistics-controls" class="stats-sort-controls"><label>Ordenar por<select id="statistics-sort"><option value="name">Jogador</option>${metricOptions(query.sort)}</select></label><label><span class="visually-hidden">Ordem</span><select id="statistics-direction"><option value="desc">↓ Maior</option><option value="asc">↑ Menor</option></select></label></div></div>
      <div id="statistics-table"></div>
      <footer class="stats-method"><span>${icon("info")}As médias usam o mesmo peso por jogo. GR não aplicável fica excluído.</span><details><summary>Como ler os dados</summary><p>As estatísticas seguem o período e o jogo selecionados, pela data do jogo em Lisboa. Só entram jogos encerrados e não eliminados. A posição junto ao nome é a posição atual do perfil.</p><p>As estrelas são médias das avaliações publicadas de cada jogo, com o mínimo de votos escolhido. A amostra aparece em cada célula; ausência de avaliações é «—», nunca zero. A média das componentes exclui GR e usa as componentes disponíveis em cada jogo. Não é uma simulação do corte de 48 horas das missões.</p><p>OVR e atributos são os valores da carta apresentada atualmente e não mudam com o período. Golos da equipa e sofridos incluem participações como suplente. Os filtros numéricos usam valores antes de arredondar. O CSV contém os jogadores e colunas visíveis, pela ordem atual.</p></details></footer>
    </section></div>`);
  const root = document.querySelector(".stats-workspace"),
    builder = root.querySelector("#stats-builder");
  const allGames = statisticsGames(ctx.league.games || [], defaultStatQuery());
  const rebuild = () => {
    games = statisticsGames(ctx.league.games || [], query);
    baseRows = statisticsRows(ctx.league, query);
  };
  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(query));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
    }
    root.querySelector("#stats-save-state").innerHTML =
      `${icon(storageAvailable ? "check" : "info")}<span>${storageAvailable ? "Vista guardada neste dispositivo" : "Vista apenas nesta sessão"}</span>`;
  };
  const periodLabel = () =>
    query.gameId
      ? (() => {
          const game = allGames.find((game) => game.id === query.gameId);
          return game
            ? `${asDate(game.scheduledAt || game.closedAt).toLocaleDateString("pt-PT")} · ${game.title || "Peladinha"}`
            : "Jogo indisponível";
        })()
      : query.period === "custom"
        ? `${query.from || "Início"} → ${query.to || "Hoje"}`
        : PERIODS[query.period];
  const ruleLabel = (rule) =>
    `${STAT_BY_ID[rule.metric].label} ${STAT_OPERATORS[rule.operator]} ${statNumber(rule.value, rule.metric)}`;
  function cell(row, id) {
    const metric = STAT_BY_ID[id],
      value = row[id];
    if (value == null)
      return '<span class="stats-no-value" title="Sem dados elegíveis">—</span>';
    if (metric.format === "rating")
      return `<span class="stats-rating"><span><b>${statNumber(value, id)}</b><span class="stats-star" aria-label="estrelas">★</span></span><span class="stats-rating-track" aria-hidden="true"><i style="--stat-fill:${Math.max(0, Math.min(100, value * 20))}%"></i></span><small>${row.samples[id]} ${row.samples[id] === 1 ? "jogo" : "jogos"}</small></span>`;
    return `<span class="stats-numeric ${["goals", "assists"].includes(id) ? "is-action" : ""}">${esc(statNumber(value, id))}</span>`;
  }
  function draw() {
    const signature = query.columns.join("|");
    const previousScroll =
      lastColumns === signature
        ? root.querySelector(".stats-scroll")?.scrollLeft || 0
        : 0;
    lastColumns = signature;
    root.style.setProperty("--stats-cols", query.columns.length);
    rows = filterStatRows(baseRows, query);
    save();
    const preset = Object.entries(STAT_PRESETS).find(
      ([, value]) =>
        JSON.stringify(value.columns) === JSON.stringify(query.columns),
    );
    root
      .querySelectorAll("[data-stat-preset]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.statPreset === preset?.[0]),
        ),
      );
    root.querySelector("#stats-view-title").textContent =
      preset?.[1].label || "Vista personalizada";
    root.querySelector("#stats-result-count").textContent =
      `${rows.length} de ${baseRows.length} jogadores · ${games.length} ${games.length === 1 ? "jogo selecionado" : "jogos selecionados"}`;
    root.querySelector("#stats-period-label").textContent = query.gameId
      ? "Um jogo"
      : query.period === "all"
        ? "Período"
        : PERIODS[query.period];
    root.querySelector("#stats-column-count").textContent =
      query.columns.length + 1;
    root.querySelector("#stats-filter-count").textContent =
      query.filters.length + Number(!!query.position);
    root.querySelector("#statistics-sort").value = query.sort;
    root.querySelector("#statistics-direction").value = query.direction;
    root.querySelector("#stats-export").disabled = !rows.length;
    const assists = games.reduce(
        (sum, game) =>
          sum +
          ["teamA", "teamB"].reduce(
            (n, side) => n + (game.performance?.[side]?.assists?.length || 0),
            0,
          ),
        0,
      ),
      totalGoals = games.reduce(
        (sum, game) => sum + game.score.teamA + game.score.teamB,
        0,
      );
    root.querySelector("#stats-overview-toggle-count").textContent =
      `${games.length} jogos · ${totalGoals} golos`;
    root.querySelector("#stats-overview").innerHTML = [
      ["games", games.length, "Jogos encerrados", periodLabel()],
      ["goals", totalGoals, "Golos da liga", "nos jogos selecionados"],
      ["assists", assists, "Assistências", "registadas nesses jogos"],
      [
        "ratingAverage",
        games.length
          ? (totalGoals / games.length).toLocaleString("pt-PT", {
              maximumFractionDigits: 1,
            })
          : "—",
        "Golos por jogo",
        "as duas equipas",
      ],
    ]
      .map(
        ([symbol, value, label, note]) =>
          `<div class="stats-overview-item"><span class="stats-overview-icon">${icon(symbol)}</span><div><small>${label}</small><strong>${value}</strong><span>${esc(note)}</span></div></div>`,
      )
      .join("");
    const chips = [];
    if (query.period !== "all" || query.gameId)
      chips.push(
        `<button type="button" data-stat-clear="period" aria-label="Remover seleção de período">${icon("games")}${esc(periodLabel())}${icon("close")}</button>`,
      );
    if (query.position)
      chips.push(
        `<button type="button" data-stat-clear="position" aria-label="Remover filtro de posição">Posição: ${query.position}${icon("close")}</button>`,
      );
    if (query.minVotes !== 1)
      chips.push(
        `<button type="button" data-stat-clear="votes" aria-label="Repor mínimo de votos">Mínimo ${query.minVotes} votos / critério${icon("close")}</button>`,
      );
    query.filters.forEach((rule, index) =>
      chips.push(
        `<button type="button" data-stat-remove-filter="${index}" aria-label="Remover filtro: ${esc(ruleLabel(rule))}">${esc(ruleLabel(rule))}${icon("close")}</button>`,
      ),
    );
    root.querySelector("#stats-filter-chips").innerHTML = chips.join("");
    const target = root.querySelector("#statistics-table");
    if (!rows.length) {
      target.innerHTML = empty(
        baseRows.length
          ? "Nenhum jogador nesta consulta"
          : "A liga começa aqui",
        baseRows.length
          ? "Experimenta remover um filtro ou alargar o período."
          : "Os jogadores e os dados dos jogos vão aparecer aqui.",
        baseRows.length
          ? '<button type="button" class="btn btn-secondary" data-stat-clear="all">Limpar filtros</button>'
          : "",
        "chart",
      );
      return;
    }
    const head = (id, label, note) =>
      `<th scope="col" class="stat-${id}" aria-sort="${query.sort === id ? (query.direction === "asc" ? "ascending" : "descending") : "none"}"><button type="button" data-stat-sort="${id}" ${STAT_BY_ID[id] ? `title="${esc(STAT_BY_ID[id].description)}"` : ""}><span>${esc(label)}<small>${esc(note)}</small></span><span aria-hidden="true">${query.sort === id ? (query.direction === "asc" ? "↑" : "↓") : "↕"}</span></button></th>`;
    target.innerHTML = `<p class="stats-scroll-hint">${icon("arrow")}Desliza a tabela para explorar todas as colunas</p><div class="stats-scroll" tabindex="0" role="region" aria-label="Tabela de estatísticas. Deslocação horizontal disponível."><table class="statistics-table"><caption class="visually-hidden">${esc(preset?.[1].label || "Estatísticas personalizadas")} · ${esc(periodLabel())}</caption><colgroup><col class="stats-name-col">${query.columns.map(() => '<col class="stats-value-col">').join("")}</colgroup><thead><tr>${head("name", "Jogador", "POSIÇÃO ATUAL")}${query.columns.map((id) => head(id, STAT_BY_ID[id].label, groupLabel(STAT_BY_ID[id].group))).join("")}</tr></thead><tbody>${rows.map((row, index) => `<tr data-stat-player="${esc(row.uid)}" ${row.uid === ctx.user?.uid ? 'class="is-current-player"' : ""}><th scope="row" class="stat-name"><a href="#/player/${encodeURIComponent(row.uid)}"><span class="stats-rank">${String(index + 1).padStart(2, "0")}</span><span class="stats-avatar" aria-hidden="true">${esc(initials(row.name))}</span><span class="stats-player-name"><strong>${esc(row.name)}${row.uid === ctx.user?.uid ? '<span class="stats-you">TU</span>' : ""}</strong><small>${esc(row.position)}${row.username ? ` · @${esc(row.username)}` : ""}</small></span></a></th>${query.columns.map((id) => `<td class="stat-${id}${query.sort === id ? " is-sorted" : ""}">${cell(row, id)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="stats-table-footer"><span>${query.columns.length + 1} colunas · ${rows.length} jogadores</span><span>«—» = sem dados · ★ = média de jogo</span></div>`;
    target.querySelector(".stats-scroll").scrollLeft = previousScroll;
  }
  function closePanel(focus = true) {
    const previous = panel;
    panel = null;
    builder.hidden = true;
    builder.innerHTML = "";
    root
      .querySelectorAll("[data-stat-panel]")
      .forEach((button) => button.setAttribute("aria-expanded", "false"));
    if (focus && previous)
      root.querySelector(`[data-stat-panel="${previous}"]`).focus();
  }
  const closeButton = (label) =>
    `<button type="button" class="btn btn-icon btn-ghost" data-stat-close aria-label="${label}">${icon("close")}</button>`;
  function columnPanel() {
    const previousOrderScroll =
      builder.querySelector(".stats-column-order ol")?.scrollTop || 0;
    const previousCatalogueScroll =
      builder.querySelector("#stats-metric-list")?.scrollTop || 0;
    builder.innerHTML = `<div class="stats-builder-head"><div><h3>Constrói a tua tabela</h3><p>Mistura resultados, avaliações e atributos. O jogador fica sempre à esquerda.</p></div>${closeButton("Fechar escolha de colunas")}</div><div class="stats-columns-layout"><div class="stats-column-order"><h4>Ordem na tabela <span>${query.columns.length + 1}</span></h4><p class="stats-pinned">${icon("lock")}Jogador · fixo</p><ol>${query.columns.map((id, index) => `<li><span><small>${groupLabel(STAT_BY_ID[id].group)}</small><strong>${STAT_BY_ID[id].label}</strong></span><div><button type="button" class="btn btn-icon btn-ghost" data-stat-move="${id}" data-delta="-1" aria-label="Subir ${STAT_BY_ID[id].label}" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" class="btn btn-icon btn-ghost" data-stat-move="${id}" data-delta="1" aria-label="Descer ${STAT_BY_ID[id].label}" ${index === query.columns.length - 1 ? "disabled" : ""}>↓</button><button type="button" class="btn btn-icon btn-ghost" data-stat-remove-column="${id}" aria-label="Remover coluna ${STAT_BY_ID[id].label}" ${query.columns.length === 1 ? "disabled" : ""}>${icon("close")}</button></div></li>`).join("")}</ol></div><div class="stats-column-catalogue"><label>Encontrar uma métrica<input id="stats-column-search" type="search" placeholder="Ex.: físico, golos, vitórias…" value="${esc(columnSearch)}" autocomplete="off"></label><div id="stats-metric-list"></div></div></div><div class="stats-builder-footer"><p>Avaliações: estrelas / 5. Atributos: valores da carta / 99.</p><button type="button" class="btn btn-primary" data-stat-close>Ver tabela${icon("arrow")}</button></div>`;
    metricList();
    builder.querySelector(".stats-column-order ol").scrollTop =
      previousOrderScroll;
    builder.querySelector("#stats-metric-list").scrollTop =
      previousCatalogueScroll;
  }
  function metricList() {
    const visible = STAT_METRICS.filter((metric) =>
      normalizeSearch(
        `${metric.label} ${metric.description} ${STAT_GROUPS[metric.group]}`,
      ).includes(normalizeSearch(columnSearch)),
    );
    builder.querySelector("#stats-metric-list").innerHTML = visible.length
      ? Object.entries(STAT_GROUPS)
          .map(([group, label]) => {
            const metrics = visible.filter((metric) => metric.group === group);
            if (!metrics.length) return "";
            return `<fieldset class="stats-metric-group"><legend>${label}</legend>${metrics.map((metric) => `<label class="stats-metric-choice"><input type="checkbox" data-stat-column="${metric.id}" ${query.columns.includes(metric.id) ? "checked" : ""} ${query.columns.length === 1 && query.columns.includes(metric.id) ? "disabled" : ""}><span><strong>${metric.label}</strong><small>${esc(metric.description)}</small></span></label>`).join("")}</fieldset>`;
          })
          .join("")
      : '<p class="stats-panel-empty">Nenhuma métrica encontrada. Experimenta outro nome.</p>';
  }
  function filterPanel() {
    builder.innerHTML = `<div class="stats-builder-head"><div><h3>Encontra quem cumpre os critérios</h3><p>Combina condições. O jogador tem de cumprir todas; valores sem dados ficam de fora.</p></div>${closeButton("Fechar filtros")}</div><form id="stats-filters-form"><div class="stats-rule-list">${draftFilters.map((rule, index) => `<div class="stats-rule" data-stat-rule="${index}"><span class="stats-rule-join">${index ? "E" : "ONDE"}</span><label>Métrica<select name="metric-${index}">${metricOptions(rule.metric)}</select></label><label>Condição<select name="operator-${index}">${options(Object.entries(STAT_OPERATORS), rule.operator)}</select></label><label>Valor<input name="value-${index}" type="number" step="any" value="${esc(rule.value)}" required></label><button type="button" class="btn btn-icon btn-ghost" data-stat-delete-rule="${index}" aria-label="Remover condição ${index + 1}">${icon("trash")}</button></div>`).join("") || '<div class="stats-panel-empty">Começa, por exemplo, com Físico ≥ 4 e Jogos ≥ 2.</div>'}</div><button type="button" class="stats-add-rule" id="stats-add-rule" ${draftFilters.length >= 12 ? "disabled" : ""}>${icon("plus")}Adicionar condição</button><div class="stats-builder-footer"><p>Exemplo: Físico ≥ 4 <strong>e</strong> Jogos ≥ 2.</p><button class="btn btn-primary" type="submit">Aplicar filtros${icon("arrow")}</button></div></form>`;
  }
  function contextPanel() {
    const gameOptions = [...allGames]
      .reverse()
      .map((game) => [
        game.id,
        `${asDate(game.scheduledAt || game.closedAt).toLocaleDateString("pt-PT")} · ${game.title || "Peladinha"} · ${game.score.teamA}–${game.score.teamB}`,
      ]);
    builder.innerHTML = `<div class="stats-builder-head"><div><h3>Que jogos queres analisar?</h3><p>Define o período, a posição e a amostra das avaliações.</p></div>${closeButton("Fechar seleção de jogos")}</div><form id="stats-context-form"><div class="stats-context-grid"><label>Período<select name="period">${options(Object.entries(PERIODS), query.period)}</select></label><label>Jogo<select name="gameId"><option value="">Todos os jogos do período</option>${options(gameOptions, query.gameId)}</select></label><label>Posição atual do jogador<select name="position"><option value="">Todas as posições</option>${options(
      OVR_POSITIONS.map((position) => [position, position]),
      query.position,
    )}</select></label><label>Mínimo de votos por critério e jogo<select name="minVotes">${options(
      [
        [1, "1 voto por critério"],
        [3, "3 votos por critério"],
        [7, "7 votos por critério"],
      ],
      query.minVotes,
    )}</select></label><label class="stats-custom-date" ${query.period !== "custom" ? "hidden" : ""}>De<input type="date" name="from" value="${query.from}"></label><label class="stats-custom-date" ${query.period !== "custom" ? "hidden" : ""}>Até<input type="date" name="to" value="${query.to}"></label></div><p id="stats-context-error" class="stats-error" role="alert"></p><div class="stats-builder-footer"><p>A posição é a do perfil. OVR e atributos mostram a carta atual.</p><button class="btn btn-primary" type="submit">Aplicar recorte${icon("arrow")}</button></div></form>`;
  }
  const readDraftFilters = () =>
    draftFilters.map((rule, index) => ({
      metric:
        builder.querySelector(`[name="metric-${index}"]`)?.value || rule.metric,
      operator:
        builder.querySelector(`[name="operator-${index}"]`)?.value ||
        rule.operator,
      value:
        builder.querySelector(`[name="value-${index}"]`)?.value ?? rule.value,
    }));
  function openPanel(next) {
    if (panel === next) {
      closePanel();
      return;
    }
    panel = next;
    builder.hidden = false;
    root
      .querySelectorAll("[data-stat-panel]")
      .forEach((button) =>
        button.setAttribute(
          "aria-expanded",
          String(button.dataset.statPanel === panel),
        ),
      );
    if (panel === "columns") {
      columnSearch = "";
      columnPanel();
    }
    if (panel === "filters") {
      draftFilters = structuredClone(query.filters);
      filterPanel();
    }
    if (panel === "context") contextPanel();
    builder
      .querySelector("input,select,[data-stat-close]")
      ?.focus({ preventScroll: true });
  }
  root.addEventListener("input", (event) => {
    if (event.target.id === "stats-search") {
      query.search = event.target.value;
      draw();
    }
    if (event.target.id === "stats-column-search") {
      columnSearch = event.target.value;
      metricList();
    }
  });
  root.addEventListener("change", (event) => {
    if (event.target.matches("[data-stat-column]")) {
      const id = event.target.dataset.statColumn;
      if (event.target.checked) query.columns.push(id);
      else query.columns = query.columns.filter((column) => column !== id);
      if (query.sort === id && !event.target.checked)
        query.sort = query.columns[0];
      draw();
      columnPanel();
      builder
        .querySelector(`[data-stat-column="${id}"]`)
        ?.focus({ preventScroll: true });
    }
    if (event.target.id === "statistics-sort") {
      query.sort = event.target.value;
      if (query.sort !== "name" && !query.columns.includes(query.sort))
        query.columns.push(query.sort);
      query.direction = query.sort === "name" ? "asc" : "desc";
      draw();
    }
    if (event.target.id === "statistics-direction") {
      query.direction = event.target.value;
      draw();
    }
    if (event.target.matches('#stats-context-form [name="period"]'))
      builder
        .querySelectorAll(".stats-custom-date")
        .forEach((label) => (label.hidden = event.target.value !== "custom"));
  });
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    if (button.id === "stats-overview-toggle") {
      const expanded = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(expanded));
      root.dataset.overview = String(expanded);
      return;
    }
    if (button.dataset.statPanel) {
      openPanel(button.dataset.statPanel);
      return;
    }
    if (button.hasAttribute("data-stat-close")) {
      closePanel();
      return;
    }
    if (button.dataset.statPreset) {
      const preset = STAT_PRESETS[button.dataset.statPreset];
      query.columns = [...preset.columns];
      query.sort = preset.sort;
      query.direction = "desc";
      closePanel(false);
      draw();
      return;
    }
    if (button.dataset.statSort) {
      const key = button.dataset.statSort;
      query.direction =
        query.sort === key
          ? query.direction === "asc"
            ? "desc"
            : "asc"
          : key === "name"
            ? "asc"
            : "desc";
      query.sort = key;
      draw();
      root
        .querySelector(`[data-stat-sort="${key}"]`)
        ?.focus({ preventScroll: true });
      return;
    }
    if (button.dataset.statMove) {
      const index = query.columns.indexOf(button.dataset.statMove),
        next = index + Number(button.dataset.delta);
      [query.columns[index], query.columns[next]] = [
        query.columns[next],
        query.columns[index],
      ];
      draw();
      columnPanel();
      const moved = builder.querySelector(
        `[data-stat-move="${button.dataset.statMove}"][data-delta="${button.dataset.delta}"]`,
      );
      (moved?.disabled
        ? builder.querySelector(
            `[data-stat-remove-column="${button.dataset.statMove}"]`,
          )
        : moved
      )?.focus({ preventScroll: true });
      return;
    }
    if (button.dataset.statRemoveColumn) {
      query.columns = query.columns.filter(
        (id) => id !== button.dataset.statRemoveColumn,
      );
      if (query.sort === button.dataset.statRemoveColumn)
        query.sort = query.columns[0];
      draw();
      columnPanel();
      builder.querySelector("[data-stat-close]").focus({ preventScroll: true });
      return;
    }
    if (button.id === "stats-add-rule") {
      draftFilters = readDraftFilters();
      draftFilters.push({
        metric: draftFilters.length ? "played" : "ratingPhysical",
        operator: "gte",
        value: draftFilters.length ? 2 : 4,
      });
      filterPanel();
      builder
        .querySelector(`[name="metric-${draftFilters.length - 1}"]`)
        .focus({ preventScroll: true });
      return;
    }
    if (button.hasAttribute("data-stat-delete-rule")) {
      draftFilters = readDraftFilters();
      draftFilters.splice(Number(button.dataset.statDeleteRule), 1);
      filterPanel();
      builder.querySelector("#stats-add-rule").focus({ preventScroll: true });
      return;
    }
    if (button.hasAttribute("data-stat-remove-filter")) {
      query.filters.splice(Number(button.dataset.statRemoveFilter), 1);
      closePanel(false);
      draw();
      root
        .querySelector('[data-stat-panel="filters"]')
        .focus({ preventScroll: true });
      return;
    }
    if (button.dataset.statClear) {
      const type = button.dataset.statClear;
      if (type === "position" || type === "all") query.position = "";
      if (type === "votes" || type === "all") query.minVotes = 1;
      if (type === "period" || type === "all") {
        query.period = "all";
        query.gameId = "";
        query.from = "";
        query.to = "";
      }
      if (type === "all") {
        query.search = "";
        query.filters = [];
        root.querySelector("#stats-search").value = "";
      }
      closePanel(false);
      rebuild();
      draw();
      root.querySelector("#stats-search").focus({ preventScroll: true });
      return;
    }
    if (button.id === "stats-reset") {
      query = defaultStatQuery();
      root.querySelector("#stats-search").value = "";
      closePanel(false);
      rebuild();
      draw();
      return;
    }
    if (button.id === "stats-export") {
      const url = URL.createObjectURL(
        new Blob([statisticsCSV(rows, query.columns)], {
          type: "text/csv;charset=utf-8",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `peladinhas-estatisticas-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  root.addEventListener("submit", (event) => {
    if (event.target.id === "stats-filters-form") {
      event.preventDefault();
      query.filters = normalizeStatQuery({
        filters: readDraftFilters(),
      }).filters;
      closePanel();
      draw();
    }
    if (event.target.id === "stats-context-form") {
      event.preventDefault();
      const fields = event.target.elements;
      if (
        fields.period.value === "custom" &&
        fields.from.value &&
        fields.to.value &&
        fields.from.value > fields.to.value
      ) {
        builder.querySelector("#stats-context-error").textContent =
          "A data final tem de ser igual ou posterior à data inicial.";
        fields.to.focus();
        return;
      }
      for (const key of ["period", "gameId", "position", "from", "to"])
        query[key] = fields[key].value;
      query.minVotes = Number(fields.minVotes.value);
      closePanel();
      rebuild();
      draw();
    }
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel) {
      event.preventDefault();
      closePanel();
    }
  });
  rebuild();
  draw();
}
