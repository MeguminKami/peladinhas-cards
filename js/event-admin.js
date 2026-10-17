import { groupActivities } from "./activity-categories.js";
import { EVENT_RARITIES, eventRarityId, rarityBadge } from "./event-rarity.js";
import { CARD_POLICY } from "./card-achievements.js";
import { DIFFICULTY_LABELS } from "./labels.js";
import * as DB from "./db.js";
import {
  ATTRIBUTES,
  FEEDBACK,
  THEMES,
  themeName,
  asDate,
  formatDate,
  formatDateTime,
} from "./utils.js";
import { icon, eventIcon } from "./icons.js";
import { votersFor, eventDeadline } from "./event-rules.js";
import {
  OBJECTIVES,
  isRatingObjective,
  validRatingObjective,
  objectiveSummary,
  medal,
  positionLabel,
  rewardText,
  validEventReward,
  eventEndLabel,
  eventEndMillis,
} from "./event-model.js";
import { esc, busy, toast, modal, confirmDialog } from "./ui.js";
const names = (ctx, uid) =>
  ctx.league.users.find((u) => u.uid === uid)?.displayName || uid;
const statusName = {
  draft: "Rascunho",
  scheduled: "Agendado",
  open: "Ativo",
  review: "A confirmar",
  closed: "Terminado",
  cancelled: "Cancelado",
};
const wallDate = (date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Lisbon",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(asDate(date))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
const options = (values, selected) =>
  values
    .map(
      ([id, label]) =>
        `<option value="${esc(id)}" ${id === selected ? "selected" : ""}>${esc(label)}</option>`,
    )
    .join("");
const creationRules = (event) => {
  const o = event.objective || {};
  const entries = [];
  const add = (symbol, title, text) =>
    entries.push(
      `<li>${icon(symbol)}<div><strong>${esc(title)}</strong><p>${esc(text)}</p></div></li>`,
    );
  if (event.method === "objective" && isRatingObjective(o)) {
    const goals = {
      ratingAverage: `Média dos últimos ${o.target} jogos`,
      ratingGames: `${o.target} jogos com avaliação mínima`,
      ratingStreak: `${o.target} jogos consecutivos`,
      ratingWins: `${o.target} vitórias com avaliação mínima`,
    };
    add(eventIcon(event), "Meta", goals[o.metric]);
    add(
      "ratingGames",
      "Estrelas",
      `${o.comparison === "gt" ? "Mais de" : "Pelo menos"} ${o.threshold} em ${o.combine === "mean" ? "média entre as dimensões" : "cada dimensão"}.`,
    );
    add(
      "players",
      "Dimensões",
      (o.attributes || [])
        .map((key) => FEEDBACK.find(([id]) => id === key)?.[1] || key)
        .join(" · "),
    );
    add(
      "check",
      "Avaliações mínimas",
      `${o.minRatings} por dimensão e por jogo.`,
    );
    add(
      "games",
      "Jogos válidos",
      "Encerrados neste período, após o desbloqueio. As dimensões precisam de avaliações suficientes.",
    );
    if (o.metric === "ratingAverage")
      add(
        "ratingAverage",
        "Janela de cálculo",
        "Inclui os últimos jogos disputados. Um jogo sem avaliações suficientes impede a conclusão; o mínimo tem de estar cumprido na verificação.",
      );
    if (o.metric === "ratingStreak")
      add(
        "streak",
        "Sequência",
        "Conta a melhor sequência. Um jogo abaixo do mínimo ou por avaliar interrompe-a.",
      );
  } else if (event.method === "objective") {
    add(eventIcon(event), "Meta", objectiveSummary(event));
  } else if (event.method === "vote") {
    add("vote", "Votação", "Os participantes escolhem os vencedores.");
    add("players", "Escolhas por votante", String(event.votesPerUser || 1));
    add("check", "Votos mínimos", String(event.minVotes || 1));
  } else
    add(
      "decision",
      "Classificação",
      "O administrador escolhe os vencedores e a ordem.",
    );
  if (event.method === "objective")
    add(
      "shield",
      "Progresso",
      {
        individual: "Individual",
        group: "Soma dos participantes",
        team: "Totais da equipa",
        collective: "Totais da equipa",
      }[event.scope] || "Individual",
    );
  for (const rule of (event.rules || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean))
    add("check", "Regra adicional", rule);
  return `<ul class="event-rule-list">${entries.join("")}</ul>`;
};
export async function mountEventAdmin(ctx, root, initialArea = "event") {
  const [events, themes] = await Promise.all([
    DB.list("events"),
    DB.list("cardThemes"),
  ]);
  let editing = null,
    activeArea = "event";
  root.innerHTML = `<div class="event-workspace content-stack"><section class="event-command panel"><div><span class="eyebrow">CENTRO DE COMPETIÇÕES</span><h2>Eventos e missões</h2><p>Cria eventos e missões e acompanha as recompensas.</p></div><div class="actions"><button class="btn btn-primary" id="new-event">Criar evento</button><button class="btn btn-secondary" id="new-mission">Criar missão</button><a class="btn btn-ghost" href="#/events">Histórico público</a></div></section><div class="event-metrics">${["open", "scheduled", "review", "closed"].map((state) => `<article class="panel"><small>${statusName[state]}</small><strong>${events.filter((e) => e.status === state).length}</strong></article>`).join("")}</div><section class="panel"><div class="event-area-tabs" role="tablist" aria-label="Área de gestão"><button type="button" role="tab" id="events-tab" aria-selected="true">Eventos <span>Classificação e vencedores</span></button><button type="button" role="tab" id="missions-tab" aria-selected="false">Missões <span>Objetivos e progresso</span></button></div><p id="event-area-description" class="muted"></p><div class="event-toolbar"><label>Pesquisar<input id="event-search" type="search" placeholder="Nome do evento ou missão"></label><label>Estado<select id="event-status"><option value="">Todos</option>${options(Object.entries(statusName))}</select></label></div><div id="event-admin-list" class="activity-groups"></div></section><section id="event-editor" class="panel event-builder" hidden></section></div>`;
  const list = root.querySelector("#event-admin-list"),
    editor = root.querySelector("#event-editor");
  const drawList = () => {
    const search = root.querySelector("#event-search").value.toLowerCase(),
      state = root.querySelector("#event-status").value,
      kind = activeArea;
    const filtered = events
      .filter(
        (e) =>
          e.title.toLowerCase().includes(search) &&
          (!state || e.status === state) &&
          (!kind ||
            e.kind === kind ||
            (kind === "event" && e.kind !== "mission")),
      )
      .sort(
        (a, b) =>
          eventEndMillis(b) - eventEndMillis(a) ||
          a.title.localeCompare(b.title),
      );
    const eventCard = (event) =>
      `<article class="event-management-card event-rarity-surface" data-rarity="${eventRarityId(event)}">${rarityBadge(event)}<div class="section-head"><span class="pill">${statusName[event.status]}</span><small>${event.kind === "mission" ? "Missão" : "Evento"}</small></div><h3>${esc(event.title)}</h3><p>${esc(event.description || "")}</p><small>${formatDate(event.startsAt || event.createdAt)} → ${eventEndLabel(event)}</small><div class="actions"><a class="btn btn-ghost" href="#/event/${esc(event.id)}">Consultar / auditar</a>${event.schemaVersion === 2 ? `<button class="btn btn-secondary" data-edit="${esc(event.id)}">Editar</button>` : ""}${event.schemaVersion === 2 ? `<button class="btn btn-ghost" data-action="duplicate" data-id="${esc(event.id)}">Duplicar</button>` : ""}${event.schemaVersion === 2 && event.status === "cancelled" ? `<button class="btn btn-danger" data-action="delete" data-id="${esc(event.id)}">Apagar ${event.kind === "mission" ? "missão" : "evento"}</button>` : ""}${event.status === "draft" ? `<button class="btn btn-primary" data-action="open" data-id="${esc(event.id)}">Publicar</button>` : ""}${event.status === "open" && event.kind !== "mission" ? `<button class="btn btn-secondary" data-action="prepare" data-id="${esc(event.id)}">Preparar resultados</button>` : ""}${["draft", "scheduled", "open", "review"].includes(event.status) ? `<button class="btn btn-ghost" data-action="cancel" data-id="${esc(event.id)}">Cancelar</button>` : ""}</div></article>`;
    list.innerHTML =
      groupActivities(filtered)
        .map(
          (group) =>
            `<section class="activity-group" data-activity-category="${group.id}" aria-label="${esc(group.title)}"><div class="mission-group-head activity-group-head"><div class="activity-group-identity"><span class="activity-group-symbol">${icon(group.icon)}</span><div><h2>${esc(group.title)}</h2><p>${esc(group.description)}</p></div></div><span class="pill">${group.items.length}</span></div><div class="event-grid">${group.items.map(eventCard).join("")}</div></section>`,
        )
        .join("") ||
      '<p class="muted" role="status">Nenhum desafio encontrado. Experimenta outros filtros.</p>';
  };
  const selectArea = (area) => {
    activeArea = area;
    root.querySelector(".event-command h2").textContent =
      area === "mission" ? "Missões" : "Eventos";
    root.querySelector(".event-command p").textContent =
      area === "mission"
        ? "Define um objetivo e recompensa cada jogador que o cumprir."
        : "Organiza uma competição e premeia os primeiros classificados.";
    for (const [id, scope] of [
      ["new-event", "event"],
      ["new-mission", "mission"],
    ]) {
      const button = root.querySelector(`#${id}`);
      button.hidden = false;
      button.classList.toggle("btn-primary", scope === area);
      button.classList.toggle("btn-secondary", scope !== area);
    }
    root.querySelectorAll(".event-metrics strong").forEach((value, index) => {
      const state = ["open", "scheduled", "review", "closed"][index];
      value.textContent = events.filter(
        (e) =>
          e.status === state &&
          (area === "mission" ? e.kind === "mission" : e.kind !== "mission"),
      ).length;
    });
    root
      .querySelector("#events-tab")
      .setAttribute("aria-selected", String(area === "event"));
    root
      .querySelector("#missions-tab")
      .setAttribute("aria-selected", String(area === "mission"));
    root.querySelector("#event-area-description").textContent =
      area === "mission"
        ? "Cada participante cumpre um objetivo e recebe a recompensa de conclusão. Acompanha missões ativas, agendadas e concluídas."
        : "Define uma classificação, escolhe quantos jogadores recebem prémios e confirma os resultados.";
    editor.hidden = true;
    delete root.querySelector(".event-workspace").dataset.editing;
    drawList();
  };
  root.querySelector("#events-tab").onclick = () => selectArea("event");
  root.querySelector("#missions-tab").onclick = () => selectArea("mission");
  for (const id of ["event-search", "event-status"])
    root.querySelector(`#${id}`).oninput = drawList;
  selectArea(initialArea);
  const rewardFields = (reward = {}, index = 1) =>
    `<section class="event-question"><h4 class='event-section-title'>${positionLabel(index)} lugar · recompensa</h4><div class="event-question-fields"><div class="form-grid"><label>Modalidade<select name="rewardMode">${options(
      [
        ["stats", "Stats"],
        ["card", "Carta"],
        ["both", "Stats + carta"],
      ],
      reward.mode || "stats",
    )}</select></label><label>Duração da recompensa<select name="statDuration">${options(
      [
        ["weekly", "Semanal · 7 dias"],
        ["monthly", "Mensal · 1 mês"],
        ["permanent", "Permanente"],
      ],
      reward.statDuration || "weekly",
    )}</select></label><label>Duração da carta<select name="cardDuration">${options(
      [
        ["weekly", "Semanal · 7 dias"],
        ["monthly", "Mensal · 1 mês"],
        ["season", "Época · 2 meses"],
        ["year", "Ano · 4 meses"],
        ["permanent", "Permanente"],
      ],
      CARD_POLICY[reward.specialId]?.duration ||
        reward.cardDuration ||
        reward.statDuration ||
        "weekly",
    )}</select></label><label>Carta<select name="specialId"><option value="">Sem carta</option><optgroup label="Cartas padrão">${options(
      THEMES.map((id) => [id, themeName(id)]),
      reward.specialId,
    )}</optgroup>${
      themes.length
        ? `<optgroup label="Card Lab">${options(
            themes.map((t) => [`saved:${t.id}`, t.name]),
            reward.specialId,
          )}</optgroup>`
        : ""
    }</select></label></div><div class="event-boost-grid">${ATTRIBUTES.map(([key, name]) => `<label>${name} +<input name="boost-${key}" type="number" min="0" max="10" value="${reward.boosts?.[key] || 0}"></label>`).join("")}</div><p class="muted small">Semanais e mensais: até 10 por atributo e 20 por prémio. A duração da carta é independente das stats; as cartas padrão seguem a sua regra. Permanentes: máximo acumulado de +10 por atributo e por jogador.</p></div></section>`;
  const readReward = (section) => ({
    mode: section.querySelector('[name="rewardMode"]').value,
    statDuration: section.querySelector('[name="statDuration"]').value,
    cardDuration: section.querySelector('[name="cardDuration"]').value,
    specialId:
      section.querySelector('[name="rewardMode"]').value === "stats"
        ? null
        : section.querySelector('[name="specialId"]').value || null,
    boosts: Object.fromEntries(
      ATTRIBUTES.map(([key]) => [
        key,
        section.querySelector('[name="rewardMode"]').value === "card"
          ? 0
          : Number(section.querySelector(`[name="boost-${key}"]`).value),
      ]),
    ),
  });
  const openEditor = (event = {}, configuration = {}) => {
    const isMission = event.kind === "mission";
    selectArea(isMission ? "mission" : "event");
    editing = event.id || null;
    editor.hidden = false;
    root.querySelector(".event-workspace").dataset.editing = "true";
    editor.dataset.creationType = isMission ? "mission" : "event";
    const start = event.startsAt || new Date(),
      end =
        event.endsAt && +asDate(event.endsAt) > Date.now()
          ? event.endsAt
          : new Date(Date.now() + 7 * 86400000);
    editor.innerHTML = `<div class="section-head"><div><span class="eyebrow">${isMission ? "OBJETIVO → CONCLUSÃO → RECOMPENSA" : "COMPETIÇÃO → CLASSIFICAÇÃO → PRÉMIOS"}</span><h2>${editing ? "Editar" : "Criar"} ${event.kind === "mission" ? "missão" : "evento"}</h2></div><button class="btn btn-ghost" type="button" id="close-editor">Fechar</button></div><form id="event-builder-form" class="content-stack"><fieldset class="event-form-section"><legend>${isMission ? "Sobre a missão" : "Sobre o evento"}</legend><div class="form-grid"><label>Título<input name="title" required maxlength="80" value="${esc(event.title || "")}"></label><label ${isMission ? "hidden" : ""}>Formato do evento<select name="kind">${options(
      [
        ["event", "Evento"],
        ["monthly", "Jogador do Mês"],
        ...(isMission ? [["mission", "Missão"]] : []),
      ],
      event.kind || "event",
    )}</select></label><label>Raridade visual<select name="rarity">${options(
      Object.entries(EVENT_RARITIES).map(([id, rarity]) => [id, rarity.name]),
      eventRarityId(event),
    )}</select><small class="muted">Apenas visual. Sem efeito nas recompensas ou dificuldade.</small></label><div class="event-rarity-preview event-rarity-surface" id="event-rarity-preview" data-rarity="${eventRarityId(event)}">${rarityBadge(event)}</div><label class="field-wide">Descrição<textarea name="description" maxlength="2000">${esc(event.description || "")}</textarea></label><div class="field-wide"><label for="event-image-url">Imagem HTTPS</label><div class="event-image-input"><input id="event-image-url" name="image" type="url" inputmode="url" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="1000" placeholder="https://exemplo.pt/imagem.jpg" value="${esc(event.image || "")}"><button id="paste-event-image" type="button" class="btn btn-secondary">Colar link</button></div><small class="muted">Cola o endereço da imagem com Ctrl+V ou usa o botão.</small></div><label class="field-wide">Regras e condições<textarea name="rules" maxlength="2000">${esc(event.rules || "")}</textarea></label></div></fieldset><fieldset class="event-form-section"><legend>Datas e participantes</legend><div class="form-grid"><label>Início<input name="startsAt" type="datetime-local" required value="${wallDate(start)}"></label><label class="check-label"><input name="indefinite" type="checkbox" ${event.indefinite ? "checked" : ""}>Sem prazo de conclusão</label><label>Fim<input name="endsAt" type="datetime-local" required value="${wallDate(end)}"></label><label>Início da votação<input name="votingStartsAt" type="datetime-local" value="${event.votingStartsAt ? wallDate(event.votingStartsAt) : ""}"></label><label>Fim da votação<input name="votingEndsAt" type="datetime-local" value="${event.votingEndsAt ? wallDate(event.votingEndsAt) : ""}"></label><label>Participantes<select name="audience">${options(
      [
        ["all", "Todos os membros"],
        ["game", "Participantes de um jogo"],
        ["selected", "Membros escolhidos"],
      ],
      event.audience?.mode || "all",
    )}</select></label><label>Jogo<select name="gameId">${options(
      ctx.league.games.map((g) => [g.id, g.title]),
      event.audience?.gameId,
    )}</select></label><label>Mês<input name="month" type="month" value="${event.month || new Date().toISOString().slice(0, 7)}"></label><label class="field-wide"><span id="participant-list-label">${isMission ? "Quem pode cumprir a missão" : "Quem participa e pode receber votos"}</span><select name="memberIds" multiple size="6"></select><small id="event-participant-summary"></small></label></div></fieldset><fieldset class="event-form-section"><legend>${isMission ? "O que é preciso cumprir" : "Como se escolhem os vencedores"}</legend><div class="form-grid"><label>Seleção dos vencedores<select name="method">${options(
      [
        ["vote", "Votação"],
        ["admin", "Competição controlada"],
        ["objective", "Competição"],
      ],
      event.method || (event.kind === "mission" ? "objective" : "vote"),
    )}</select></label><label>Posições premiadas<input name="winnerCount" type="number" min="1" max="20" value="${event.winnerCount || 1}"></label><label>Escolhas por votante<input name="votesPerUser" type="number" min="1" max="10" value="${event.votesPerUser || 1}"></label><label>Votos mínimos<input name="minVotes" type="number" min="1" max="2000" value="${event.minVotes || 1}"></label><label>Desempate<select name="tieBreak">${options(
      [
        ["uid", "Identificador estável"],
        ["goals", "Mais golos no período"],
        ["participation", "Mais jogos no período"],
      ],
      event.tieBreak || "uid",
    )}</select></label><label>Objetivo<select name="metric">${options(Object.entries(OBJECTIVES), event.objective?.metric || "games")}</select></label><label>Quantidade alvo<input name="target" type="number" min="1" max="1000" value="${event.objective?.target || 3}"></label><label>Âmbito<select name="scope">${options(
      [
        ["individual", "Individual"],
        ["group", "Grupo · soma dos participantes"],
        ["team", "Equipa · totais da equipa de cada jogador"],
      ],
      event.scope === "collective" ? "team" : event.scope || "individual",
    )}</select></label><label>Frequência<select name="cadence">${options(
      [
        ["once", "Especial · uma conclusão"],
        ["daily", "Diária · períodos de 24 horas"],
        ["weekly", "Semanal · períodos de 7 dias"],
      ],
      event.cadence || "once",
    )}</select></label><label>Conclusões máximas<input name="maxRepeats" type="number" min="1" max="12" value="${event.maxRepeats || 1}"></label><label>Dificuldade<select name="difficulty">${options(
      Object.entries(DIFFICULTY_LABELS),
      event.difficulty || "medium",
    )}</select></label></div><div class="event-switches"><label class="check-label"><input name="allowSelfVote" type="checkbox" ${event.allowSelfVote ? "checked" : ""}>Permitir votar em si próprio</label><label class="check-label"><input name="liveResults" type="checkbox" ${event.liveResults ? "checked" : ""}>Mostrar contagens durante a votação</label><label class="check-label"><input name="needsConfirmation" type="checkbox" ${event.needsConfirmation !== false ? "checked" : ""}>ADMIN confirma antes da entrega</label></div></fieldset><fieldset class="event-form-section"><legend>${isMission ? "Recompensa por conclusão" : "Prémios da classificação"}</legend><div id="event-questions" class="content-stack"></div><p class="muted">A recompensa só é revelada depois da atribuição.</p></fieldset><div class="actions event-create-actions"><button class="btn btn-ghost" type="button" id="event-preview">Pré-visualizar</button><button class="btn btn-secondary" name="submitAction" value="draft">Guardar rascunho</button><button class="btn btn-primary" name="submitAction" value="open">${isMission ? "Publicar missão" : "Publicar evento"}</button></div></form>`;
    const form = editor.querySelector("form"),
      positions = editor.querySelector("#event-questions");
    if (isMission)
      form.elements.title.closest("label").classList.add("field-wide");
    editor.querySelector(".section-head .eyebrow").textContent =
      "DESAFIOS DA LIGA";
    const ratingFields = document.createElement("div");
    ratingFields.className = "event-rating-config content-stack";
    const rating = event.objective || {};
    ratingFields.innerHTML = `<div class="event-rating-presets" aria-label="Exemplos de objetivos por estrelas">${[
      ["ratingGames", "Regularidade", "4 estrelas em 5 jogos"],
      ["ratingAverage", "Em forma", "Média superior a 4 nos últimos 3 jogos"],
      ["ratingStreak", "Consistência", "4 estrelas em 3 jogos seguidos"],
      ["ratingWins", "Vitórias de classe", "3 vitórias com 4 estrelas"],
    ]
      .map(
        ([metric, title, description]) =>
          `<button type="button" class="btn btn-ghost" data-rating-preset="${metric}">${icon(eventIcon({ objective: { metric } }))}<span><b>${title}</b><small>${description}</small></span></button>`,
      )
      .join(
        "",
      )}</div><div id="rating-conditions"><p class="muted">Escolhe as dimensões avaliadas em estrelas no final do jogo.</p><div class="event-rating-attributes">${FEEDBACK.map(([key, label]) => `<label class="check-label"><input type="checkbox" name="ratingAttribute" value="${key}" ${(rating.attributes || ["overall"]).includes(key) ? "checked" : ""}>${label}</label>`).join("")}</div><div class="form-grid"><label>Estrelas exigidas<input name="ratingThreshold" type="number" min="0" max="5" step="0.1" value="${rating.threshold ?? 4}"></label><label>Comparação<select name="ratingComparison">${options(
      [
        ["gte", "Pelo menos (≥)"],
        ["gt", "Superior a (>)"],
      ],
      rating.comparison || "gte",
    )}</select></label><label>Várias dimensões<select name="ratingCombine">${options(
      [
        ["all", "Exigir mínimo em cada dimensão"],
        ["mean", "Usar a média das dimensões escolhidas"],
      ],
      rating.combine || "all",
    )}</select></label><label>Avaliações mínimas por dimensão e jogo<input name="ratingMinRatings" type="number" min="1" max="100" step="1" value="${rating.minRatings ?? 3}"></label></div><p class="muted">Jogos por avaliar não são ignorados na janela dos últimos jogos e interrompem sequências. A janela começa no início do período ou no desbloqueio da missão. Para médias, o critério tem de estar cumprido quando se verifica o objetivo.</p></div><div id="rating-objective-preview" class="event-rating-preview" role="status" aria-live="polite"></div>`;
    const presets = document.createElement("section");
    presets.className = "event-optional-fields event-rating-examples";
    presets.innerHTML =
      "<h4 class='event-section-title'>Começar com um exemplo <small>Opcional</small></h4>";
    presets.append(ratingFields.querySelector(".event-rating-presets"));
    ratingFields.prepend(presets);
    const ratingAdvanced = document.createElement("section");
    ratingAdvanced.className = "event-optional-fields";
    ratingAdvanced.innerHTML =
      "<h4 class='event-section-title'>Critérios de avaliação</h4><div class='form-grid'></div>";
    for (const key of [
      "ratingThreshold",
      "ratingComparison",
      "ratingCombine",
      "ratingMinRatings",
    ])
      ratingAdvanced
        .querySelector(".form-grid")
        .append(ratingFields.querySelector(`[name="${key}"]`).closest("label"));
    const conditions = ratingFields.querySelector("#rating-conditions");
    conditions
      .querySelectorAll(":scope > p")
      .forEach((element) => element.remove());
    conditions.append(ratingAdvanced);
    form.elements.metric.closest(".form-grid").after(ratingFields);
    for (const key of [
      "target",
      "winnerCount",
      "votesPerUser",
      "minVotes",
      "maxRepeats",
      "ratingThreshold",
      "ratingMinRatings",
    ])
      form.elements[key].required = true;
    const readObjective = () => ({
      metric: form.elements.metric.value,
      target: Number(form.elements.target.value),
      ...(isRatingObjective({ metric: form.elements.metric.value })
        ? {
            attributes: [
              ...form.querySelectorAll('[name="ratingAttribute"]:checked'),
            ].map((input) => input.value),
            threshold: Number(form.elements.ratingThreshold.value),
            comparison: form.elements.ratingComparison.value,
            combine: form.elements.ratingCombine.value,
            minRatings: Number(form.elements.ratingMinRatings.value),
          }
        : {}),
    });
    const refreshRating = () => {
      const objective = readObjective();
      const enabled = form.elements.method.value === "objective";
      const stars = enabled && isRatingObjective(objective);
      ratingFields.hidden = !stars;
      ratingFields
        .querySelectorAll("[data-rating-preset]")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(button.dataset.ratingPreset === objective.metric),
          ),
        );
      ratingFields.querySelector("#rating-conditions").hidden = !stars;
      ratingFields.querySelector("#rating-objective-preview").hidden = !stars;
      ratingFields
        .querySelectorAll("#rating-conditions input, #rating-conditions select")
        .forEach((input) => (input.disabled = !stars));
      if (stars) {
        form.elements.scope.value = "individual";
        form.elements.scope.disabled = true;
        ratingFields.querySelector("#rating-objective-preview").innerHTML =
          creationRules({
            method: "objective",
            objective,
            scope: form.elements.scope.value,
          });
      } else form.elements.scope.disabled = false;
      const targetLabel = form.elements.target.closest("label");
      targetLabel.firstChild.textContent =
        objective.metric === "ratingAverage"
          ? "Últimos quantos jogos"
          : stars
            ? "Número de jogos a cumprir"
            : "Quantidade alvo";
    };
    ratingFields.querySelectorAll("[data-rating-preset]").forEach(
      (button) =>
        (button.onclick = () => {
          const metric = button.dataset.ratingPreset;
          form.elements.metric.value = metric;
          form.elements.target.value = metric === "ratingGames" ? "5" : "3";
          form.elements.ratingThreshold.value = "4";
          form.elements.ratingComparison.value =
            metric === "ratingAverage" ? "gt" : "gte";
          refreshRating();
        }),
    );
    form.addEventListener("input", refreshRating);
    form.addEventListener("change", refreshRating);
    form.elements.rarity.addEventListener("change", () => {
      const preview = editor.querySelector("#event-rarity-preview");
      preview.dataset.rarity = form.elements.rarity.value;
      preview.innerHTML = rarityBadge({ rarity: form.elements.rarity.value });
    });
    if (editing && event.status !== "draft") {
      const save = form.querySelector('[name="submitAction"][value="draft"]');
      save.textContent = "Guardar alterações";
      save.classList.replace("btn-secondary", "btn-primary");
      form.querySelector('[name="submitAction"][value="open"]').hidden = true;
      editor
        .querySelector(".section-head")
        .insertAdjacentHTML(
          "afterend",
          '<p class="muted">As novas condições atualizam o progresso pendente. As recompensas entregues e o estado do desafio mantêm-se.</p>',
        );
    }

    const sections = [...form.querySelectorAll("fieldset.event-form-section")];
    const stepLabels = [
      "Identidade",
      isMission ? "Objetivo" : "Regras",
      "Participantes e datas",
      "Recompensas",
      "Revisão",
    ];
    const stepDescriptions = [
      "Dá um nome ao desafio e escolhe como o apresentas à liga.",
      isMission
        ? "Define o que cada jogador precisa de cumprir."
        : "Escolhe como se chega à classificação final.",
      "Escolhe quem participa e quando o desafio está disponível.",
      isMission
        ? "Define a recompensa de cada conclusão."
        : "Define o prémio de cada posição da classificação.",
      "Confirma as escolhas antes de guardar ou publicar.",
    ];
    const steps = stepLabels.map(() => document.createElement("div"));
    steps.forEach((step, i) => {
      step.className = "event-editor-step content-stack";
      step.dataset.step = String(i);
    });
    form.prepend(...steps);
    steps[0].append(sections[0]);
    steps[1].append(sections[2]);
    steps[2].append(sections[1]);
    steps[3].append(sections[3]);
    steps[4].innerHTML =
      '<div id="event-review" class="event-review-grid"></div>';
    steps.forEach((step, index) =>
      step.insertAdjacentHTML(
        "afterbegin",
        `<header class="event-step-heading"><span class="eyebrow">ETAPA ${index + 1} DE ${steps.length}</span><h3 tabindex="-1">${stepLabels[index]}</h3><p>${stepDescriptions[index]}</p></header>`,
      ),
    );
    steps.forEach((step) =>
      step
        .querySelector("header")
        .insertAdjacentHTML(
          "afterend",
          '<p class="event-editor-error" role="alert" hidden></p>',
        ),
    );
    const navigation = document.createElement("div");
    navigation.className = "event-editor-navigation";
    navigation.innerHTML = `<button type="button" class="btn btn-ghost" id="editor-back">← Anterior</button><span id="editor-step-note"></span><button type="button" class="btn btn-primary" id="editor-next">Continuar →</button>`;
    form.append(navigation);
    navigation.append(form.querySelector(".event-create-actions"));
    form.noValidate = true;
    editor
      .querySelector(".section-head")
      .insertAdjacentHTML(
        "afterend",
        `<p class="event-editor-intro">${isMission ? "Um objetivo claro. Uma recompensa por conclusão." : "Uma competição com regras e prémios claros."}</p><nav class="event-editor-steps" aria-label="Passos de criação">${stepLabels.map((label, i) => `<button type="button" data-editor-step="${i}" aria-controls="event-creation-step-${i}" aria-label="Etapa ${i + 1}: ${label}"><span aria-hidden="true">${i + 1}</span><b class="event-step-full" aria-hidden="true">${label}</b><b class="event-step-short" aria-hidden="true">${["Nome", isMission ? "Meta" : "Regras", "Agenda", "Prémios", "Rever"][i]}</b></button>`).join("")}</nav>`,
      );
    let currentStep = 0;
    form.addEventListener("input", () => {
      steps[currentStep].querySelector(".event-editor-error").hidden = true;
    });
    form.addEventListener("change", () => {
      steps[currentStep].querySelector(".event-editor-error").hidden = true;
    });
    const showStep = (step) => {
      currentStep = step;
      steps.forEach((element, i) => {
        element.hidden = i !== step;
        element.id = `event-creation-step-${i}`;
      });
      editor
        .querySelectorAll("[data-editor-step]")
        .forEach((button) =>
          button.setAttribute(
            "aria-current",
            Number(button.dataset.editorStep) === step ? "step" : "false",
          ),
        );
      form.querySelector(".event-create-actions").hidden =
        step !== steps.length - 1;
      form.querySelector("#editor-back").hidden = step === 0;
      form.querySelector("#editor-next").hidden = step === steps.length - 1;
      form.querySelector("#editor-next").textContent =
        step === steps.length - 2 ? "Rever escolhas →" : "Continuar →";
      form.querySelector("#editor-step-note").textContent =
        `Passo ${step + 1} de ${steps.length}`;
      if (step === steps.length - 1) renderReview();
    };
    const validateStep = (index) => {
      const error = steps[index].querySelector(".event-editor-error");
      error.hidden = true;
      let message = "";
      if (index === 0 && !form.elements.title.value.trim())
        message = "Dá um título ao desafio para continuar.";
      if (
        index === 1 &&
        form.elements.method.value === "objective" &&
        !validRatingObjective(readObjective(), form.elements.scope.value)
      )
        message =
          "Escolhe as dimensões, as estrelas exigidas e um mínimo válido de avaliações.";
      if (
        index === 2 &&
        isMission &&
        form.elements.unlockMode.value !== "none" &&
        !form.elements.prerequisiteIds.selectedOptions.length
      )
        message =
          "Escolhe as missões que precisam de ser concluídas antes desta.";
      if (
        index === 3 &&
        ![...positions.children]
          .map(readReward)
          .every((reward) => validEventReward(reward, themes))
      )
        message =
          "Completa a recompensa: escolhe uma carta ou atribui melhorias aos atributos, dentro dos limites indicados.";
      if (message) {
        showStep(index);
        error.textContent = message;
        error.hidden = false;
        error.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return false;
      }
      const invalid = [
        ...steps[index].querySelectorAll("input, select, textarea"),
      ].find((input) => {
        const hidden = input.closest("[hidden]");
        return (!hidden || hidden === steps[index]) && !input.checkValidity();
      });
      if (!invalid) return true;
      showStep(index);
      const details = invalid.closest("details");
      if (details) details.open = true;
      invalid.reportValidity();
      return false;
    };
    const navigate = (step) => {
      showStep(step);
      steps[step].querySelector("h3").focus({ preventScroll: true });
      editor.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    editor
      .querySelectorAll("[data-editor-step]")
      .forEach(
        (button) =>
          (button.onclick = () => navigate(Number(button.dataset.editorStep))),
      );
    form.querySelector("#editor-back").onclick = () =>
      navigate(Math.max(0, currentStep - 1));
    form.querySelector("#editor-next").onclick = () => {
      if (validateStep(currentStep))
        navigate(Math.min(steps.length - 1, currentStep + 1));
    };
    showStep(0);
    form.addEventListener(
      "invalid",
      (e) => {
        const step = e.target.closest("[data-step]");
        if (step) showStep(Number(step.dataset.step));
        const details = e.target.closest("details");
        if (details) details.open = true;
      },
      true,
    );
    // Presentation stays fully visible alongside the main identity fields.
    const presentation = document.createElement("section");
    presentation.className = "event-optional-fields";
    presentation.innerHTML =
      "<h4 class='event-section-title'>Personalizar apresentação <small>Opcional</small></h4><p class='muted'>Descrição, imagem e raridade visual para a página do desafio.</p>";
    for (const key of ["description", "image", "rarity"])
      presentation.append(
        form.elements[key].closest(key === "image" ? ".field-wide" : "label"),
      );
    sections[0].append(presentation);
    const presentationGrid = document.createElement("div");
    presentationGrid.className = "form-grid event-presentation-grid";
    presentation.append(presentationGrid);
    for (const key of ["rarity", "image", "description"])
      presentationGrid.append(
        form.elements[key].closest(key === "image" ? ".field-wide" : "label"),
      );
    const rarityLabel = form.elements.rarity.closest("label");
    rarityLabel.classList.add("field-wide");
    const rarityControl = document.createElement("div");
    rarityControl.className = "event-rarity-control";
    rarityLabel.append(rarityControl);
    const rarityPreview = form.querySelector("#event-rarity-preview");
    rarityPreview.classList.remove("event-rarity-surface");
    rarityControl.append(form.elements.rarity, rarityPreview);
    rarityLabel.querySelector("small")?.remove();
    presentation.querySelector(":scope > p")?.remove();
    form.elements.image.closest(".field-wide").querySelector("small")?.remove();
    form.elements.description.closest("label").classList.add("field-wide");
    form.elements.image.closest(".field-wide").classList.remove("field-wide");
    form.elements.image.parentElement.parentElement.classList.add(
      "event-image-field",
      "field-wide",
    );
    editor.querySelector(".event-editor-intro").remove();
    steps.forEach((step) =>
      step.querySelector(".event-step-heading p").remove(),
    );
    presentation.querySelector(".event-section-title").textContent =
      "Apresentação";
    presets.querySelector(".event-section-title").textContent =
      "Modelos de objetivo";
    sections[2].append(form.elements.rules.closest("label"));
    if (!isMission) {
      const methodCards = document.createElement("div");
      methodCards.className = "event-method-options";
      methodCards.innerHTML = [
        ["vote", "Votação", "Os participantes escolhem os colegas."],
        ["admin", "Competição controlada", "Escolhes os vencedores e a ordem."],
        ["objective", "Competição", "Vencem os primeiros a atingir a meta."],
      ]
        .map(
          ([value, title, description]) =>
            `<button type="button" data-selection-method="${value}"><strong>${title}</strong><span>${description}</span></button>`,
        )
        .join("");
      sections[2].prepend(methodCards);
      methodCards.onclick = (e) => {
        const button = e.target.closest("[data-selection-method]");
        if (button) {
          form.elements.method.value = button.dataset.selectionMethod;
          if (!editing && button.dataset.selectionMethod === "objective") {
            form.elements.needsConfirmation.checked = false;
            form.elements.liveResults.checked = true;
          }
          update();
        }
      };
    }
    if (isMission) {
      const gate = document.createElement("fieldset");
      gate.className = "event-form-section";
      gate.innerHTML = `<legend>Quando aparece ao jogador</legend><label>Disponibilidade<select name="unlockMode"><option value="none">Disponível desde o início</option><option value="all" ${event.prerequisites?.mode === "all" && event.prerequisites?.missionIds?.length ? "selected" : ""}>Depois de concluir todas as missões escolhidas</option><option value="any" ${event.prerequisites?.mode === "any" && event.prerequisites?.missionIds?.length ? "selected" : ""}>Depois de concluir pelo menos uma das missões escolhidas</option></select></label><label id="prerequisite-missions">Missões anteriores<select name="prerequisiteIds" multiple size="5">${events
        .filter(
          (mission) =>
            mission.kind === "mission" &&
            mission.schemaVersion === 2 &&
            mission.id !== editing &&
            mission.status !== "cancelled",
        )
        .map(
          (mission) =>
            `<option value="${esc(mission.id)}" ${event.prerequisites?.missionIds?.includes(mission.id) ? "selected" : ""}>${esc(mission.title)}</option>`,
        )
        .join(
          "",
        )}</select><small>Escolhe uma ou várias missões. Só contam jogos finalizados depois do desbloqueio. As recompensas anteriores podem ter expirado; as conclusões continuam válidas.</small></label>`;
      steps[2].append(gate);
    }
    const votingSettings = document.createElement("section");
    votingSettings.className = "event-optional-fields";
    votingSettings.innerHTML =
      "<h4 class='event-section-title'>Regras e período de votação · opções avançadas</h4><div class='form-grid'></div>";
    for (const key of [
      "votesPerUser",
      "minVotes",
      "tieBreak",
      "votingStartsAt",
      "votingEndsAt",
      "allowSelfVote",
      "liveResults",
    ])
      votingSettings
        .querySelector(".form-grid")
        .append(form.elements[key].closest("label"));
    sections[2].append(votingSettings);
    const groupFields = (parent, title, keys) => {
      const group = document.createElement("section");
      group.className = "event-config-group";
      group.innerHTML = `<h4>${title}</h4><div class="form-grid"></div>`;
      keys.forEach((key) =>
        group
          .querySelector(".form-grid")
          .append(form.elements[key].closest("label")),
      );
      parent.append(group);
      return group;
    };
    const objectiveGroup = groupFields(sections[2], "A meta a atingir", [
      "metric",
      "target",
      "scope",
      "difficulty",
    ]);
    objectiveGroup.append(ratingFields);
    const objectiveFamilies = document.createElement("div");
    objectiveFamilies.className = "event-choice-grid";
    objectiveFamilies.innerHTML = `<button type="button" data-objective-family="results"><strong>Resultados dos jogos</strong><span>Jogos, golos, assistências e vitórias.</span></button><button type="button" data-objective-family="stars"><strong>Avaliações em estrelas</strong><span>Desempenho avaliado pelos jogadores.</span></button>`;
    objectiveGroup.querySelector("h4").after(objectiveFamilies);
    const rememberedMetrics = { results: "games", stars: "ratingGames" };
    let resultScope = form.elements.scope.value;
    const selectObjectiveFamily = (family) => {
      const stars = family === "stars";
      const current = form.elements.metric.value;
      if (current)
        rememberedMetrics[
          isRatingObjective({ metric: current }) ? "stars" : "results"
        ] = current;
      form.elements.metric.innerHTML = options(
        Object.entries(OBJECTIVES).filter(
          ([metric]) => isRatingObjective({ metric }) === stars,
        ),
        rememberedMetrics[family],
      );
      objectiveFamilies
        .querySelectorAll("button")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(button.dataset.objectiveFamily === family),
          ),
        );
    };
    selectObjectiveFamily(
      isRatingObjective(event.objective) ? "stars" : "results",
    );
    objectiveFamilies.onclick = (e) => {
      const button = e.target.closest("[data-objective-family]");
      if (!button) return;
      if (!isRatingObjective({ metric: form.elements.metric.value }))
        resultScope = form.elements.scope.value;
      selectObjectiveFamily(button.dataset.objectiveFamily);
      if (button.dataset.objectiveFamily === "results")
        form.elements.scope.value = resultScope;
      update();
      refreshRating();
    };
    const votingGroup = groupFields(
      sections[2],
      "Classificação e visibilidade",
      ["tieBreak", "liveResults"],
    );
    const voteLimits = groupFields(sections[2], "Regras da votação", [
      "votesPerUser",
      "minVotes",
    ]);
    sections[2].insertBefore(voteLimits, votingSettings);
    votingSettings.querySelector(".event-section-title").textContent =
      "Desempate e visibilidade";
    groupFields(sections[1], "Quando acontece", [
      "startsAt",
      "endsAt",
      "votingStartsAt",
      "votingEndsAt",
      "month",
      "indefinite",
    ]);
    const audienceGroup = groupFields(sections[1], "Quem participa", [
      "audience",
      "gameId",
      "memberIds",
    ]);
    form.elements.audience.closest("label").classList.add("field-wide");
    groupFields(sections[1], "Repetição da missão", [
      "cadence",
      "maxRepeats",
    ]).hidden = !isMission;
    const prizeGroup = groupFields(sections[3], "Lugares premiados", [
      "winnerCount",
    ]);
    sections[3].prepend(prizeGroup);
    sections[3].querySelector(":scope > p").remove();
    groupFields(sections[3], "Entrega das recompensas", [
      "needsConfirmation",
    ]).hidden = isMission;
    form.elements.rules.closest("label").classList.add("event-written-rules");
    const writtenRules = document.createElement("section");
    writtenRules.className = "event-optional-fields";
    writtenRules.innerHTML =
      "<h4 class='event-section-title'>Acrescentar regras escritas <small>Opcional</small></h4>";
    writtenRules.append(form.elements.rules.closest("label"));
    writtenRules.querySelector(".event-section-title").textContent =
      "Regras escritas";
    writtenRules.querySelector(".event-section-title").remove();
    sections[2].append(writtenRules);
    const updatePositions = () => {
      const count = Math.max(
        1,
        Math.min(20, Number(form.elements.winnerCount.value) || 1),
      );
      while (positions.children.length > count)
        positions.lastElementChild.remove();
      while (positions.children.length < count) {
        const i = positions.children.length;
        positions.insertAdjacentHTML(
          "beforeend",
          rewardFields(configuration.positions?.[i], i + 1),
        );
        const section = positions.lastElementChild;
        const modeLabel = section
          .querySelector('[name="rewardMode"]')
          .closest("label");
        modeLabel.hidden = true;
        const choices = document.createElement("div");
        choices.className = "event-choice-grid event-reward-choices";
        choices.setAttribute("aria-label", "Tipo de recompensa");
        choices.innerHTML = [
          ["stats", "Atributos", "Melhora os atributos da carta."],
          ["card", "Carta", "Atribui uma edição de carta."],
          ["both", "Atributos + carta", "Combina as duas recompensas."],
        ]
          .map(
            ([value, title, description]) =>
              `<button type="button" data-reward-mode="${value}"><strong>${title}</strong><span>${description}</span></button>`,
          )
          .join("");
        section.querySelector(".event-question-fields").prepend(choices);
      }
    };
    const raceNote = document.createElement("div");
    raceNote.className = "event-context-note";
    raceNote.innerHTML = `<ul class="event-rule-list"><li>${icon("wins")}<div><strong>Vencedores</strong><p>Os primeiros a atingir a meta.</p></div></li><li>${icon("check")}<div><strong>Verificação</strong><p>Resultados e avaliações dos jogos.</p></div></li><li>${icon("decision")}<div><strong>Desempate</strong><p>Se a meta for atingida no mesmo jogo, aplica-se o critério escolhido.</p></div></li><li>${icon("shield")}<div><strong>Fim da competição</strong><p>Quando todas as posições premiadas estiverem preenchidas.</p></div></li></ul>`;
    sections[2].append(raceNote);
    const update = () => {
      const mission = form.elements.kind.value === "mission",
        monthly = form.elements.kind.value === "monthly";
      const unlimited = form.elements.indefinite.checked;
      form.elements.indefinite.closest("label").hidden = false;
      form.elements.endsAt.closest("label").hidden = unlimited;
      form.elements.endsAt.disabled = unlimited;
      form.elements.endsAt.required = !unlimited;
      if (mission) {
        const gated = form.elements.unlockMode.value !== "none";
        form.elements.prerequisiteIds.closest("label").hidden = !gated;
        form.elements.prerequisiteIds.disabled = !gated;
      }
      if (mission) {
        form.elements.method.value = "objective";
        form.elements.winnerCount.value = "1";
        form.elements.needsConfirmation.checked = false;
      }
      form.elements.method.disabled = mission;
      form.elements.method.closest("label").hidden = true;
      form.elements.winnerCount.closest("label").hidden = mission;
      const competition =
        !mission && form.elements.method.value === "objective";
      objectiveGroup.hidden = form.elements.method.value !== "objective";
      votingGroup.hidden = !competition;
      prizeGroup.hidden = mission;
      raceNote.hidden = !competition;
      form.elements.allowSelfVote.closest("label").hidden =
        mission || form.elements.method.value !== "vote";
      form.elements.liveResults.closest("label").hidden =
        mission || form.elements.method.value === "admin";
      form.elements.liveResults.closest("label").lastChild.textContent =
        competition
          ? "Mostrar progresso da competição"
          : "Mostrar contagens durante a votação";
      if (competition) {
        form.elements.cadence.value = "once";
        form.elements.maxRepeats.value = "1";
      }
      root.querySelector("#participant-list-label").textContent = mission
        ? "Quem pode cumprir a missão"
        : competition
          ? "Quem compete"
          : form.elements.method.value === "admin"
            ? "Quem pode vencer"
            : "Quem vota e pode receber votos";
      form.elements.needsConfirmation.closest("label").hidden = mission;
      editor
        .querySelectorAll("[data-selection-method]")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(
              button.dataset.selectionMethod === form.elements.method.value,
            ),
          ),
        );
      for (const key of ["scope", "cadence", "maxRepeats", "difficulty"])
        form.elements[key].closest("label").hidden =
          key === "difficulty" || key === "scope"
            ? !(mission || competition)
            : !mission;
      if (mission && form.elements.cadence.value === "once") {
        form.elements.maxRepeats.value = "1";
        form.elements.maxRepeats.closest("label").hidden = true;
      }

      form.elements.winnerCount.disabled = mission;
      form.elements.needsConfirmation.disabled = mission;
      form.elements.month.closest("label").hidden = !monthly;
      form.elements.gameId.closest("label").hidden =
        form.elements.audience.value !== "game";
      const vote = form.elements.method.value === "vote";
      voteLimits.hidden = !vote;
      votingSettings.hidden = !vote;
      for (const key of [
        "votesPerUser",
        "minVotes",
        "votingStartsAt",
        "votingEndsAt",
      ])
        form.elements[key].closest("label").hidden = !vote;
      for (const key of ["tieBreak", "liveResults"]) {
        const destination = competition
          ? votingGroup.querySelector(".form-grid")
          : votingSettings.querySelector(".form-grid");
        destination.append(form.elements[key].closest("label"));
      }
      form.elements.tieBreak.closest("label").hidden = !(vote || competition);
      for (const key of ["metric", "target"])
        form.elements[key].closest("label").hidden =
          form.elements.method.value !== "objective";
      const selected = [...form.elements.memberIds.selectedOptions].map(
        (o) => o.value,
      );
      const all = votersFor(
        {
          kind: form.elements.kind.value,
          month: form.elements.month.value,
          audience:
            form.elements.audience.value === "selected"
              ? { mode: "all" }
              : {
                  mode: form.elements.audience.value,
                  gameId: form.elements.gameId.value,
                },
        },
        ctx.league.users,
        ctx.league.games,
      );
      const chosen = selected.length
        ? selected
        : event.audience?.memberIds || [];
      form.elements.memberIds.innerHTML = ctx.league.users
        .filter((u) => all.includes(u.uid))
        .map(
          (u) =>
            `<option value="${esc(u.uid)}" ${form.elements.audience.value !== "selected" || chosen.includes(u.uid) ? "selected" : ""}>${esc(u.displayName || u.uid)}</option>`,
        )
        .join("");
      form.elements.memberIds.disabled =
        form.elements.audience.value !== "selected";
      form.elements.memberIds.closest("label").hidden =
        form.elements.audience.value !== "selected";
      form.elements.memberIds.required =
        form.elements.audience.value === "selected";
      form.elements.gameId.required = form.elements.audience.value === "game";
      form.elements.gameId.disabled = form.elements.audience.value !== "game";
      form.elements.endsAt.setCustomValidity(
        !unlimited && form.elements.endsAt.value <= form.elements.startsAt.value
          ? "Escolhe uma data de fim posterior ao início."
          : "",
      );
      editor.querySelector("#event-participant-summary").textContent = mission
        ? `${form.elements.memberIds.selectedOptions.length} jogadores podem cumprir este objetivo e receber a recompensa.`
        : `${form.elements.memberIds.selectedOptions.length} participantes · a mesma lista define candidatos e votantes.`;
      let audienceSummary = audienceGroup.querySelector(
        ".event-audience-summary",
      );
      if (!audienceSummary) {
        audienceSummary = document.createElement("p");
        audienceSummary.className = "event-audience-summary";
        audienceGroup.append(audienceSummary);
      }
      audienceSummary.textContent = `${form.elements.memberIds.selectedOptions.length} participantes${mission ? " podem cumprir a missão." : competition ? " entram na competição." : form.elements.method.value === "admin" ? " podem ser escolhidos como vencedores." : " podem votar e receber votos."}`;
      updatePositions();
      positions
        .querySelectorAll(".event-section-title")
        .forEach((summary, i) => {
          summary.textContent = mission
            ? "Recompensa para cada jogador que concluir"
            : `${positionLabel(i + 1)} lugar · prémio`;
        });
      for (const section of positions.children) {
        const mode = section.querySelector('[name="rewardMode"]').value;
        section
          .querySelectorAll("[data-reward-mode]")
          .forEach((button) =>
            button.setAttribute(
              "aria-pressed",
              String(button.dataset.rewardMode === mode),
            ),
          );
        const stats = mode === "stats" || mode === "both",
          card = mode === "card" || mode === "both";
        const rewardHint = section.querySelector(".muted.small");
        rewardHint.hidden = !stats;
        rewardHint.textContent =
          "Limites: +10 por atributo; +20 por prémio temporário. Permanentes: +10 acumulados por atributo.";
        section.querySelector(".event-boost-grid").hidden = !stats;
        section.querySelector('[name="statDuration"]').closest("label").hidden =
          !stats;
        const special = section.querySelector('[name="specialId"]');
        const cardDuration = section.querySelector('[name="cardDuration"]');
        cardDuration.closest("label").hidden = !card;
        cardDuration.disabled = !!CARD_POLICY[special.value];
        if (CARD_POLICY[special.value])
          cardDuration.value = CARD_POLICY[special.value].duration;
        special.closest("label").hidden = !card;
        section.querySelectorAll('[name^="boost-"]').forEach((input) => {
          input.max = "10";
        });
      }
    };
    const payload = () => {
      const f = form.elements;
      const objective = readObjective();
      if (
        f.method.value === "objective" &&
        !validRatingObjective(objective, f.scope.value)
      )
        throw Error(
          "Escolhe pelo menos uma dimensão, um mínimo válido de estrelas e de avaliações. Estes objetivos são individuais.",
        );
      if (
        isMission &&
        f.unlockMode.value !== "none" &&
        !f.prerequisiteIds.selectedOptions.length
      )
        throw Error(
          "Escolhe pelo menos uma missão anterior para o desbloqueio.",
        );
      const positionsValue = [...positions.children].map(readReward);
      if (!positionsValue.every((reward) => validEventReward(reward, themes)))
        throw Error("Revê as modalidades e os limites das recompensas.");
      return {
        schemaVersion: 2,
        action: editing ? "update" : "create",
        ...(editing ? { eventId: editing } : {}),
        title: f.title.value,
        rarity: f.rarity.value,
        description: f.description.value,
        image: f.image.value.trim(),
        rules: f.rules.value,
        kind: f.kind.value,
        method: f.method.value,
        startsAt: eventDeadline(f.startsAt.value),
        indefinite: f.indefinite.checked,
        prerequisites: {
          mode: isMission && f.unlockMode.value === "any" ? "any" : "all",
          missionIds:
            isMission && f.unlockMode.value !== "none"
              ? [...f.prerequisiteIds.selectedOptions].map(
                  (option) => option.value,
                )
              : [],
        },
        endsAt: f.indefinite.checked ? null : eventDeadline(f.endsAt.value),
        votingStartsAt: f.votingStartsAt.value
          ? eventDeadline(f.votingStartsAt.value)
          : eventDeadline(f.startsAt.value),
        votingEndsAt: f.votingEndsAt.value
          ? eventDeadline(f.votingEndsAt.value)
          : f.indefinite.checked
            ? null
            : eventDeadline(f.endsAt.value),
        month: f.month.value,
        audience: {
          mode: f.audience.value,
          gameId: f.gameId.value,
          memberIds: [...f.memberIds.selectedOptions].map((o) => o.value),
        },
        winnerCount: Number(f.winnerCount.value),
        positions: positionsValue,
        votesPerUser: Number(f.votesPerUser.value),
        minVotes: Number(f.minVotes.value),
        tieBreak: f.tieBreak.value,
        allowSelfVote: f.allowSelfVote.checked,
        liveResults: f.liveResults.checked,
        needsConfirmation: f.needsConfirmation.checked,
        objective,
        scope: f.scope.value,
        cadence: f.cadence.value,
        maxRepeats: Number(f.maxRepeats.value),
        difficulty: f.difficulty.value,
      };
    };
    const renderReview = () => {
      const f = form.elements;
      const dateText = (value) =>
        value ? formatDateTime(eventDeadline(value)) : "Por definir";
      const selectedText = (key) =>
        f[key].selectedOptions?.[0]?.textContent || f[key].value;
      const summaryCard = (title, step, body) =>
        `<section class="event-review-card"><div><h4>${title}</h4><button type="button" class="btn btn-ghost" data-review-step="${step}" aria-label="Editar ${title}">Editar</button></div>${body}</section>`;
      form.querySelector("#event-review").innerHTML = [
        summaryCard(
          "Identidade",
          0,
          `<h3>${esc(f.title.value || "Sem título")}</h3><p>${esc(f.description.value || "Sem descrição adicional.")}</p>${rarityBadge({ rarity: f.rarity.value })}`,
        ),
        summaryCard(
          isMission ? "Objetivo" : "Regras",
          1,
          creationRules({
            method: f.method.value,
            objective: readObjective(),
            scope: f.scope.value,
            rules: f.rules.value,
            votesPerUser: Number(f.votesPerUser.value),
            minVotes: Number(f.minVotes.value),
          }),
        ),
        summaryCard(
          "Participantes e datas",
          2,
          `<p>${esc(audienceSummaryText())}</p><p>${esc(dateText(f.startsAt.value))} → ${f.indefinite.checked ? "Sem prazo de conclusão" : esc(dateText(f.endsAt.value))}</p>${isMission ? `<p>${esc(selectedText("cadence"))}${f.cadence.value !== "once" ? ` · até ${esc(f.maxRepeats.value)} conclusões` : ""}</p>${f.unlockMode.value !== "none" ? `<p>Após concluir ${f.unlockMode.value === "all" ? "todas" : "pelo menos uma"}: ${[...f.prerequisiteIds.selectedOptions].map((option) => esc(option.textContent)).join(", ") || "Escolhe as missões anteriores."}</p>` : ""}` : ""}`,
        ),
        summaryCard(
          "Recompensas",
          3,
          [...positions.children]
            .map(
              (section, i) =>
                `<div class="event-review-prize"><strong>${isMission ? "Por conclusão" : `${positionLabel(i + 1)} lugar`}</strong><p>${esc(rewardText(readReward(section)))}</p></div>`,
            )
            .join(""),
        ),
      ].join("");
      form.querySelectorAll("[data-review-step]").forEach((button) => {
        button.onclick = () => navigate(Number(button.dataset.reviewStep));
      });
    };
    const audienceSummaryText = () =>
      audienceGroup.querySelector(".event-audience-summary")?.textContent ||
      "Escolhe os participantes.";
    positions.onclick = (e) => {
      const button = e.target.closest("[data-reward-mode]");
      if (!button) return;
      button
        .closest(".event-question")
        .querySelector('[name="rewardMode"]').value = button.dataset.rewardMode;
      update();
    };
    form.querySelectorAll(".check-label").forEach((label) => {
      const copy = document.createElement("span");
      copy.className = "event-check-copy";
      [...label.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .forEach((node) => copy.append(node));
      label.append(copy);
    });
    update();
    refreshRating();
    form.onchange = () => {
      update();
      refreshRating();
    };
    const imageInput = form.elements.image;
    imageInput.addEventListener("paste", (e) => {
      const value =
        e.clipboardData?.getData("text/uri-list") ||
        e.clipboardData?.getData("text/plain");
      if (!value) return;
      const link = value.trim();
      if (!/^https?:\/\//i.test(link)) return;
      e.preventDefault();
      imageInput.setRangeText(
        link,
        imageInput.selectionStart ?? 0,
        imageInput.selectionEnd ?? imageInput.value.length,
        "end",
      );
      imageInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    editor.querySelector("#paste-event-image").onclick = async (e) => {
      try {
        if (!navigator.clipboard?.readText)
          throw Error("Clipboard indisponível");
        const link = (
          await busy(e.currentTarget, () => navigator.clipboard.readText())
        ).trim();
        if (!link) return toast("Não existe texto para colar.", "error");
        imageInput.value = link;
        imageInput.dispatchEvent(new Event("input", { bubbles: true }));
        imageInput.focus();
      } catch {
        imageInput.focus();
        toast(
          "O navegador não permitiu ler a área de transferência. Cola diretamente no campo com Ctrl+V.",
          "error",
        );
      }
    };
    editor.querySelector("#close-editor").onclick = () => {
      editor.hidden = true;
      delete root.querySelector(".event-workspace").dataset.editing;
    };
    editor.querySelector("#event-preview").onclick = () => {
      try {
        const p = payload();
        modal(
          "Pré-visualização",
          `<div class="event-preview event-rarity-surface" data-rarity="${eventRarityId(p)}">${rarityBadge(p)}<span class="pill">${isMission ? "Missão" : "Evento"}</span><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><p>${formatDate(p.startsAt)} → ${eventEndLabel(p)}</p>${creationRules(p)}${isMission && p.prerequisites.missionIds.length ? `<p>Desbloqueio após concluir ${p.prerequisites.mode === "all" ? "todas" : "pelo menos uma"}: ${p.prerequisites.missionIds.map((id) => esc(events.find((mission) => mission.id === id)?.title || id)).join(" · ")}</p>` : ""}${p.positions.map((reward, i) => `<article><strong>${isMission ? "Por cada conclusão" : `${positionLabel(i + 1)} lugar`}</strong><p>${esc(rewardText(reward))}</p></article>`).join("")}<p class="muted">Pré-visualização ADMIN: as recompensas ficam visíveis na página do desafio.</p></div>`,
        );
      } catch (error) {
        toast(error.message, "error");
      }
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (currentStep < steps.length - 1) {
        if (validateStep(currentStep)) navigate(currentStep + 1);
        return;
      }
      if (!steps.every((_, index) => validateStep(index))) return;
      try {
        const p = payload();
        p.openNow = e.submitter.value === "open";
        await busy(e.submitter, () => DB.callAdmin("eventAction", p));
        toast(isMission ? "Missão guardada." : "Evento guardado.");
        await ctx.refresh();
        await mountEventAdmin(ctx, root, activeArea);
      } catch (error) {
        toast(error.message, "error");
      }
    };
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  root.querySelector("#new-event").onclick = () => openEditor();
  root.querySelector("#new-mission").onclick = () =>
    openEditor({ kind: "mission" });
  list.onclick = async (e) => {
    const edit = e.target.closest("[data-edit]"),
      button = e.target.closest("[data-action]");
    try {
      if (edit) {
        const event = await DB.eventDetails(edit.dataset.edit);
        openEditor(event, event.configuration || {});
      }
      if (button) {
        const action =
          button.dataset.action === "prepare" &&
          events.find((x) => x.id === button.dataset.id)?.schemaVersion !== 2
            ? "close"
            : button.dataset.action;
        if (
          action === "cancel" &&
          !(await confirmDialog("Cancelar este desafio?"))
        )
          return;
        if (
          action === "delete" &&
          !(await confirmDialog(
            "Apagar este desafio cancelado? O desafio e os seus detalhes serão removidos. Esta ação não pode ser desfeita.",
          ))
        )
          return;
        const result = await busy(button, () =>
          DB.callAdmin("eventAction", {
            action,
            eventId: button.dataset.id,
            ...(action === "delete" ? { schemaVersion: 2 } : {}),
          }),
        );
        if (action === "delete") toast("Desafio apagado.");
        if (action === "duplicate") {
          const copy = await DB.eventDetails(result.data.id);
          openEditor(copy, copy.configuration);
        } else {
          await ctx.refresh();
          await mountEventAdmin(ctx, root, activeArea);
        }
      }
    } catch (error) {
      toast(error.message, "error");
    }
  };
}
