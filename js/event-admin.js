import { EVENT_RARITIES, eventRarityId, rarityBadge } from "./event-rarity.js";
import { CARD_POLICY } from "./card-achievements.js";
import { DIFFICULTY_LABELS } from "./labels.js";
import * as DB from "./db.js";
import { ATTRIBUTES, THEMES, themeName, asDate, formatDate } from "./utils.js";
import { votersFor, eventDeadline } from "./event-rules.js";
import {
  OBJECTIVES,
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
export async function mountEventAdmin(ctx, root, initialArea = "event") {
  const [events, themes] = await Promise.all([
    DB.list("events"),
    DB.list("cardThemes"),
  ]);
  let editing = null,
    activeArea = "event";
  root.innerHTML = `<div class="event-workspace content-stack"><section class="event-command panel"><div><span class="eyebrow">CENTRO DE COMPETIÇÕES</span><h2>Eventos e missões</h2><p>Cria eventos e missões e acompanha as recompensas.</p></div><div class="actions"><button class="btn btn-primary" id="new-event">Criar evento</button><button class="btn btn-secondary" id="new-mission">Criar missão</button><a class="btn btn-ghost" href="#/events">Histórico público</a></div></section><div class="event-metrics">${["open", "scheduled", "review", "closed"].map((state) => `<article class="panel"><small>${statusName[state]}</small><strong>${events.filter((e) => e.status === state).length}</strong></article>`).join("")}</div><section class="panel"><div class="event-area-tabs" role="tablist" aria-label="Área de gestão"><button type="button" role="tab" id="events-tab" aria-selected="true">Eventos <span>Classificação e vencedores</span></button><button type="button" role="tab" id="missions-tab" aria-selected="false">Missões <span>Objetivos e progresso</span></button></div><p id="event-area-description" class="muted"></p><div class="event-toolbar"><label>Pesquisar<input id="event-search" type="search" placeholder="Nome do evento ou missão"></label><label>Estado<select id="event-status"><option value="">Todos</option>${options(Object.entries(statusName))}</select></label></div><div id="event-admin-list" class="event-grid"></div></section><section id="event-editor" class="panel event-builder" hidden></section></div>`;
  const list = root.querySelector("#event-admin-list"),
    editor = root.querySelector("#event-editor");
  const drawList = () => {
    const search = root.querySelector("#event-search").value.toLowerCase(),
      state = root.querySelector("#event-status").value,
      kind = activeArea;
    list.innerHTML =
      events
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
        )
        .map(
          (event) =>
            `<article class="event-management-card event-rarity-surface" data-rarity="${eventRarityId(event)}">${rarityBadge(event)}<div class="section-head"><span class="pill">${statusName[event.status]}</span><small>${event.kind === "mission" ? "Missão" : "Evento"}</small></div><h3>${esc(event.title)}</h3><p>${esc(event.description || "")}</p><small>${formatDate(event.startsAt || event.createdAt)} → ${eventEndLabel(event)}</small><div class="actions"><a class="btn btn-ghost" href="#/event/${esc(event.id)}">Consultar / auditar</a>${event.schemaVersion === 2 ? `<button class="btn btn-secondary" data-edit="${esc(event.id)}">Editar</button>` : ""}${event.schemaVersion === 2 ? `<button class="btn btn-ghost" data-action="duplicate" data-id="${esc(event.id)}">Duplicar</button>` : ""}${event.schemaVersion === 2 && event.status === "cancelled" ? `<button class="btn btn-danger" data-action="delete" data-id="${esc(event.id)}">Apagar ${event.kind === "mission" ? "missão" : "evento"}</button>` : ""}${event.status === "draft" ? `<button class="btn btn-primary" data-action="open" data-id="${esc(event.id)}">Publicar</button>` : ""}${event.status === "open" && event.kind !== "mission" ? `<button class="btn btn-secondary" data-action="prepare" data-id="${esc(event.id)}">Preparar resultados</button>` : ""}${["draft", "scheduled", "open", "review"].includes(event.status) ? `<button class="btn btn-ghost" data-action="cancel" data-id="${esc(event.id)}">Cancelar</button>` : ""}</div></article>`,
        )
        .join("") ||
      `<p class="muted">Não há ${activeArea === "mission" ? "missões" : "eventos"} com estes filtros.</p>`;
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
    drawList();
  };
  root.querySelector("#events-tab").onclick = () => selectArea("event");
  root.querySelector("#missions-tab").onclick = () => selectArea("mission");
  for (const id of ["event-search", "event-status"])
    root.querySelector(`#${id}`).oninput = drawList;
  selectArea(initialArea);
  const rewardFields = (reward = {}, index = 1) =>
    `<details class="event-question" open><summary>${positionLabel(index)} lugar · recompensa</summary><div class="event-question-fields"><div class="form-grid"><label>Modalidade<select name="rewardMode">${options(
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
    }</select></label></div><div class="event-boost-grid">${ATTRIBUTES.map(([key, name]) => `<label>${name} +<input name="boost-${key}" type="number" min="0" max="10" value="${reward.boosts?.[key] || 0}"></label>`).join("")}</div><p class="muted small">Semanais e mensais: até 10 por atributo e 20 por prémio. A duração da carta é independente das stats; as cartas padrão seguem a sua regra. Permanentes: máximo acumulado de +10 por atributo e por jogador.</p></div></details>`;
  const readReward = (section) => ({
    mode: section.querySelector('[name="rewardMode"]').value,
    statDuration: section.querySelector('[name="statDuration"]').value,
    cardDuration: section.querySelector('[name="cardDuration"]').value,
    specialId: section.querySelector('[name="specialId"]').value || null,
    boosts: Object.fromEntries(
      ATTRIBUTES.map(([key]) => [
        key,
        Number(section.querySelector(`[name="boost-${key}"]`).value),
      ]),
    ),
  });
  const openEditor = (event = {}, configuration = {}) => {
    const isMission = event.kind === "mission";
    selectArea(isMission ? "mission" : "event");
    editing = event.id || null;
    editor.hidden = false;
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
    )}</select><small class="muted">Apenas visual. Sem efeito nas recompensas ou dificuldade.</small></label><div class="event-rarity-preview event-rarity-surface" id="event-rarity-preview" data-rarity="${eventRarityId(event)}">${rarityBadge(event)}</div><label class="field-wide">Descrição<textarea name="description" maxlength="2000">${esc(event.description || "")}</textarea></label><div class="field-wide"><label for="event-image-url">Imagem HTTPS</label><div class="event-image-input"><input id="event-image-url" name="image" type="url" inputmode="url" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="1000" placeholder="https://exemplo.pt/imagem.jpg" value="${esc(event.image || "")}"><button id="paste-event-image" type="button" class="btn btn-secondary">Colar link</button></div><small class="muted">Cola o endereço da imagem com Ctrl+V ou usa o botão.</small></div><label class="field-wide">Regras e condições<textarea name="rules" maxlength="2000">${esc(event.rules || "")}</textarea></label></div></fieldset><fieldset class="event-form-section"><legend>Datas e participantes</legend><div class="form-grid"><label>Início (Lisboa)<input name="startsAt" type="datetime-local" required value="${wallDate(start)}"></label><label class="check-label"><input name="indefinite" type="checkbox" ${event.indefinite ? "checked" : ""}>Sem prazo de conclusão</label><label>Fim (Lisboa)<input name="endsAt" type="datetime-local" required value="${wallDate(end)}"></label><label>Início da votação<input name="votingStartsAt" type="datetime-local" value="${event.votingStartsAt ? wallDate(event.votingStartsAt) : ""}"></label><label>Fim da votação<input name="votingEndsAt" type="datetime-local" value="${event.votingEndsAt ? wallDate(event.votingEndsAt) : ""}"></label><label>Participantes<select name="audience">${options(
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
    const steps = [
      document.createElement("div"),
      document.createElement("div"),
      document.createElement("div"),
    ];
    steps.forEach((step, i) => {
      step.className = "event-editor-step content-stack";
      step.dataset.step = String(i);
    });
    form.prepend(...steps);
    steps[0].append(sections[0], sections[1]);
    steps[1].append(sections[2]);
    steps[2].append(sections[3]);
    const navigation = document.createElement("div");
    navigation.className = "event-editor-navigation";
    navigation.innerHTML = `<button type="button" class="btn btn-ghost" id="editor-back">← Anterior</button><span id="editor-step-note"></span><button type="button" class="btn btn-primary" id="editor-next">Continuar →</button>`;
    form.append(navigation);
    editor
      .querySelector(".section-head")
      .insertAdjacentHTML(
        "afterend",
        `<p class="event-editor-intro">${isMission ? "Define um objetivo e a recompensa de quem o cumprir." : "Define a classificação e os prémios de cada posição."}</p><nav class="event-editor-steps" aria-label="Passos de criação">${["Detalhes", isMission ? "Objetivo" : "Classificação", "Recompensas"].map((label, i) => `<button type="button" data-editor-step="${i}"><span>${i + 1}</span>${label}</button>`).join("")}</nav>`,
      );
    let currentStep = 0;
    const showStep = (step) => {
      currentStep = step;
      steps.forEach((element, i) => {
        element.hidden = i !== step;
      });
      editor
        .querySelectorAll("[data-editor-step]")
        .forEach((button) =>
          button.setAttribute(
            "aria-current",
            Number(button.dataset.editorStep) === step ? "step" : "false",
          ),
        );
      form.querySelector(".event-create-actions").hidden = step !== 2;
      form.querySelector("#editor-back").hidden = step === 0;
      form.querySelector("#editor-next").hidden = step === 2;
      form.querySelector("#editor-step-note").textContent =
        `Passo ${step + 1} de 3`;
    };
    editor
      .querySelectorAll("[data-editor-step]")
      .forEach(
        (button) =>
          (button.onclick = () => showStep(Number(button.dataset.editorStep))),
      );
    form.querySelector("#editor-back").onclick = () =>
      showStep(Math.max(0, currentStep - 1));
    form.querySelector("#editor-next").onclick = () =>
      showStep(Math.min(2, currentStep + 1));
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
    // Optional presentation fields stay out of the main setup path.
    const presentation = document.createElement("details");
    presentation.className = "event-optional-fields";
    presentation.innerHTML =
      "<summary>Descrição, imagem e regras · opcional</summary>";
    for (const key of ["description", "image", "rules"])
      presentation.append(
        form.elements[key].closest(key === "image" ? ".field-wide" : "label"),
      );
    sections[0].append(presentation);
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
      steps[1].append(gate);
    }
    const votingSettings = document.createElement("details");
    votingSettings.className = "event-optional-fields";
    votingSettings.innerHTML =
      "<summary>Regras e período de votação · opções avançadas</summary><div class='form-grid'></div>";
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
    if (isMission)
      sections[2].insertAdjacentHTML(
        "afterbegin",
        '<p class="event-context-note">Cada jogador recebe a recompensa ao cumprir o objetivo. O progresso é verificado nos jogos finalizados.</p>',
      );
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
      }
    };
    const raceNote = document.createElement("p");
    raceNote.className = "event-context-note";
    raceNote.textContent =
      "Os objetivos são verificados no fim de cada jogo. Vencem os primeiros a atingir a meta. Se a meta for atingida no mesmo jogo, aplica-se o desempate escolhido. A competição termina quando todas as posições premiadas forem preenchidas.";
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
          ? sections[2].querySelector(".form-grid")
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
      editor.querySelector("#event-participant-summary").textContent = mission
        ? `${form.elements.memberIds.selectedOptions.length} jogadores podem cumprir este objetivo e receber a recompensa.`
        : `${form.elements.memberIds.selectedOptions.length} participantes · a mesma lista define candidatos e votantes.`;
      updatePositions();
      positions.querySelectorAll("summary").forEach((summary, i) => {
        summary.textContent = mission
          ? "Recompensa para cada jogador que concluir"
          : `${positionLabel(i + 1)} lugar · prémio`;
      });
      for (const section of positions.children) {
        const mode = section.querySelector('[name="rewardMode"]').value;
        const stats = mode === "stats" || mode === "both",
          card = mode === "card" || mode === "both";
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
        if (!card) special.value = "";
        section.querySelectorAll('[name^="boost-"]').forEach((input) => {
          input.max = "10";
          if (!stats) input.value = "0";
        });
      }
    };
    const payload = () => {
      const f = form.elements;
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
        objective: { metric: f.metric.value, target: Number(f.target.value) },
        scope: f.scope.value,
        cadence: f.cadence.value,
        maxRepeats: Number(f.maxRepeats.value),
        difficulty: f.difficulty.value,
      };
    };
    update();
    form.onchange = update;
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
    };
    editor.querySelector("#event-preview").onclick = () => {
      try {
        const p = payload();
        modal(
          "Pré-visualização",
          `<div class="event-preview event-rarity-surface" data-rarity="${eventRarityId(p)}">${rarityBadge(p)}<span class="pill">${isMission ? "Missão" : "Evento"}</span><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><p>${formatDate(p.startsAt)} → ${eventEndLabel(p)}</p><p>${esc(p.rules)}</p>${isMission && p.prerequisites.missionIds.length ? `<p>Desbloqueio após concluir ${p.prerequisites.mode === "all" ? "todas" : "pelo menos uma"}: ${p.prerequisites.missionIds.map((id) => esc(events.find((mission) => mission.id === id)?.title || id)).join(" · ")}</p>` : ""}${p.positions.map((reward, i) => `<article><strong>${isMission ? "Por cada conclusão" : `${positionLabel(i + 1)} lugar`}</strong><p>${esc(rewardText(reward))}</p></article>`).join("")}<p class="muted">Pré-visualização ADMIN: as recompensas ficam visíveis na página do desafio.</p></div>`,
        );
      } catch (error) {
        toast(error.message, "error");
      }
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (currentStep < 2) {
        showStep(currentStep + 1);
        return;
      }
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
