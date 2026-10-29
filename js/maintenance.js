import * as DB from "./db.js";
import { esc, busy, toast, confirmDialog, linkButton } from "./ui.js";
import { icon } from "./icons.js";
import { MAINTENANCE_PAGES, WEEKDAYS, pageGroups, policyChanges, policyValue, nextPolicyOpening } from "./maintenance-pages.js";
import { parseLisbonDateInput } from "./match-time.js";
import { maintenanceLimits } from "./maintenance-limits.js";
import {
  POLICY_FIELDS,
  canManage,
  CAPABILITIES,
  normalizePolicy,
  policyAt,
} from "./system-policy.js";
const labels = {
  reduce: "Reduzir ao disponível",
  reject: "Não entregar enquanto exceder",
  defer: "Adiar o prémio completo",
  normal: "Normal",
  readOnly: "Apenas consulta",
};
const tabs = [
  ["config", "settings", "Páginas da aplicação", "settings"],
  ["rewards", "operations", "Recompensas", "gift"],
  ["overview", "operations", "Automatizações", "refresh"],
  ["diagnostics", "operations", "Diagnóstico", "chart"],
  ["access", "access", "Acessos", "shield"],
  ["history", "audit", "Histórico", "clock"],
  ["backups", "operations", "Recuperação", "assets"],
];
const read = async (section, extra = {}) =>
  (await DB.callAdmin("maintenanceRead", { section, ...extra })).data;
const act = async (data) =>
  (await DB.callAdmin("maintenanceAction", data)).data;
const when = (value) =>
  value
    ? new Date(value?.seconds ? value.seconds * 1000 : value).toLocaleString(
        "pt-PT",
        { timeZone: "Europe/Lisbon" },
      )
    : "—";
function download(name, value) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function table(headings, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headings.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${headings.length}">Sem registos.</td></tr>`}</tbody></table></div>`;
}
const operationLabels = {
  "rating-waiver":"Votos em falta anulados ou repostos",
  publish:"Configuração publicada", draft:"Rascunho guardado", simulate:"Simulação de impacto", "cancel-scheduled":"Agendamento cancelado",
  "run-job":"Execução manual", permissions:"Permissões alteradas", recovery:"Conta recuperada", rebuild:"Recálculo", "task-item-failed":"Falha numa tarefa",
};
const jobLabels = {automationCycle:"Atualizar todos os sistemas",closeCardWeek:"Fechar cartas semanais",openCardWeek:"Abrir nova semana",closeEvents:"Apurar eventos e recompensas",settlePaths:"Apurar missões do ETC",refreshCardCollection:"Atualizar coleção de cartas",scheduledNotifications:"Enviar lembretes",systemHeartbeat:"Verificar estado da liga",systemCleanup:"Limpar dados transitórios",processFeedback:"Atualizar avaliações de jogos"};
const pageLinks = {
  cards:[["cards","#/admin/weights","Pesos do OVR"],["cards","#/admin/card-types","Tipos de carta"]],
  games:[["games","#/admin/games","Gerir jogos e equipas"]],
  ratings:[["ratings","#/admin/ratings","Consultar e corrigir avaliações"]],
  missions:[["events","#/admin/events","Criar e editar missões"],["events","#/admin/paths","Gerir percursos do ETC"]],
  events:[["events","#/admin/events","Gerir eventos e votações"]],
  players:[["access","#/admin/players","Gerir jogadores e contas"]],
};
function versionEntry(row, previous, activeVersion, canEdit) {
  const before=previous?.config || policyAt(new Date(+new Date(row.effectiveAt)-1),{timeline:[]});
  const changes=policyChanges(normalizePolicy(row.config),normalizePolicy(before));
  const status=row.canceledAt ? "Cancelada" : row.version===activeVersion ? "Ativa" : +new Date(row.effectiveAt)>Date.now() ? "Agendada" : "Anterior";
  return `<article class="maintenance-version"><div class="maintenance-version-head"><span class="maintenance-version-number">V${row.version}</span><div><h4>${esc(row.reason || "Atualização das regras")}</h4><p>${when(row.effectiveAt)} · ${esc(row.actorId || "Administração")}</p></div><span class="pill ${status==="Ativa"?"success":""}">${status}</span></div><details><summary>${changes.length} alterações · Ver antes e depois</summary><dl class="maintenance-change-list">${changes.map(change=>`<div><dt>${esc(change.label)}</dt><dd><span>${esc(policyValue(change.name,change.before))}</span>${icon("arrow")}<strong>${esc(policyValue(change.name,change.after))}</strong></dd></div>`).join("")}</dl></details>${canEdit?`<button type="button" class="btn btn-ghost" data-version="${row.version}">${icon("copy")}Usar como rascunho</button>`:""}</article>`;
}
function auditEntry(row) {
  return `<article class="maintenance-audit-entry"><div><strong>${esc(operationLabels[row.action] || row.action)}</strong><span class="pill">${esc({completed:"Concluída",failed:"Falhou",running:"Em curso"}[row.status || "completed"] || row.status)}</span></div><p>${when(row.createdAt)} · ${esc(row.actorId || "Sistema")}</p>${Object.keys(row.details || {}).length?`<details><summary>Ver detalhes</summary><dl class="maintenance-change-list">${Object.entries(row.details).map(([key,value])=>`<div><dt>${esc({reason:"Motivo",uid:"Jogador",eventId:"Evento",gameId:"Jogo",scope:"Âmbito",version:"Versão",id:"Referência",action:"Ação"}[key] || key)}</dt><dd>${esc(typeof value==="object"?JSON.stringify(value):value)}</dd></div>`).join("")}</dl></details>`:""}</article>`;
}
function field(section, [key, label, initial, min, max], config) {
  const value = config[section][key],
    name = `${section}.${key}`;
  if (typeof initial === "boolean")
    return `<label class="maintenance-toggle"><input name="${name}" type="checkbox" ${value ? "checked" : ""}><span>${esc(label)}</span></label>`;
  if (section === "cycle" && ["openDay","closeDay"].includes(key))
    return `<label>${esc(label)}<select name="${name}">${WEEKDAYS.map((day,index)=>`<option value="${index}" ${value===index?"selected":""}>${day}</option>`).join("")}</select><small>Hora de Portugal continental.</small></label>`;
  const input = Array.isArray(min)
    ? `<select name="${name}">${min.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${esc(labels[option] || option)}</option>`).join("")}</select>`
    : `<input name="${name}" ${typeof initial === "number" ? `type="number" min="${min}" max="${max}" step="${Number.isInteger(initial) ? 1 : 0.01}"` : 'maxlength="300"'} value="${esc(value)}" ${typeof initial === "number" || initial ? "required" : ""}>`;
  return `<label>${esc(label)}${input}</label>`;
}
function report(value) {
  if (value.players)
    return `<h3>${icon("lab")} Simulação de impacto</h3><p>${esc(value.notice)}</p><p class="muted small">${value.players.filter(player=>player.delta!==0).length} de ${value.players.length} jogadores com alteração no OVR.</p>${table(
      ["Jogador", "Atual", "Simulado", "Variação"],
      value.players.map(
        (p) =>
          `<tr><td>${esc(p.name)}</td><td>${p.before}</td><td>${p.after}</td><td>${p.delta > 0 ? "+" : ""}${p.delta}</td></tr>`,
      ),
    )}`;
  if (value.issues)
    return `<p>${value.issues.length} verificações a rever · ${value.counts.users} jogadores · ${value.counts.games} jogos</p>${table(
      ["Tipo", "Referência", "Resultado"],
      value.issues.map(
        (row) =>
          `<tr><td>${esc(row.kind)}</td><td>${esc(row.id)}</td><td>${esc(row.message)}</td></tr>`,
      ),
    )}`;
  return `<pre class="maintenance-result">${esc(JSON.stringify(value, null, 2))}</pre>`;
}
export async function mountMaintenance(ctx, root) {
  const available = tabs.filter(([, cap]) => canManage(ctx.user, cap));
  if (!available.length) {
    root.innerHTML = "<p>Acesso reservado.</p>";
    return;
  }
  let selected = available[0][0],
    revision = 0,
    document = null, working = null, capture = null, pageId = "cards";
  root.innerHTML = `<header class="maintenance-heading"><div><p class="eyebrow">${icon("settings")} CONTROLO DA LIGA</p><h2>Central de manutenção</h2><p>Escolhe a página. Ajusta as regras. Simula antes de publicar.</p></div><span class="pill">${icon("shield")} Administração</span></header><nav class="maintenance-tabs" aria-label="Áreas de manutenção">${available.map(([id, , name, symbol]) => `<button type="button" class="btn btn-ghost" data-maint-tab="${id}" aria-pressed="false">${icon(symbol)}${name}</button>`).join("")}</nav><div class="maintenance-body"></div>`;
  const content = root.querySelector(".maintenance-body");
  const output = () => content.querySelector("[data-result]");
  const result = (value) => {
    if (output()) output().innerHTML = report(value);
  };
  function showOperation(value) {
    result(value);
    if (value.name && !value.done) {
      output().insertAdjacentHTML(
        "beforeend",
        '<button class="btn btn-secondary" data-operation-status>Atualizar estado</button>',
      );
      content.querySelector("[data-operation-status]").onclick = (event) =>
        task(event.currentTarget, async () =>
          showOperation(
            await read("backup-operation", { operation: value.name }),
          ),
        );
    }
  }
  async function load(tab) {
    if(selected === "config" && capture) working = capture();
    capture = null;
    selected = tab;
    root
      .querySelectorAll("[data-maint-tab]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.maintTab === tab)),
      );
    content.innerHTML = '<p class="muted" role="status">A carregar…</p>';
    try {
      const value = await read(tab);
      if (selected !== tab || !root.isConnected) return;
      if (tab === "config") {
        document = value.document;
        revision = working?.revision ?? (document.revision || 0);
        const config = normalizePolicy(working?.config || value.config);
        content.innerHTML = `<form id="maintenance-policy" class="maintenance-policy-layout"><nav class="maintenance-pages" aria-label="P&#225;ginas da aplica&#231;&#227;o">${MAINTENANCE_PAGES.map(page=>`<button type="button" data-maint-page="${page.id}" aria-controls="maintenance-page-${page.id}" aria-pressed="${page.id===pageId}">${icon(page.icon)}<span>${esc(page.label)}</span>${icon("arrow")}</button>`).join("")}</nav><div class="maintenance-editor"><div class="maintenance-status"><span class="pill">Vers&#227;o ativa ${value.version}</span>${value.draft ? '<button type="button" class="btn btn-secondary" data-restore-draft>Recuperar rascunho guardado</button>' : ""}<span class="maintenance-edit-status" data-unsaved>Sem altera&#231;&#245;es</span><button type="button" class="btn btn-secondary" data-simulate>${icon("lab")}Simular impacto</button></div>${MAINTENANCE_PAGES.map(page=>`<section class="maintenance-page" id="maintenance-page-${page.id}" data-maint-panel="${page.id}" ${page.id===pageId?"":"hidden"}><header class="maintenance-page-heading"><span>${icon(page.icon)}</span><div><h3>${esc(page.label)}</h3><p>${esc(page.description)}</p></div></header><div class="maintenance-related-links">${(pageLinks[page.id] || []).filter(([cap])=>canManage(ctx.user,cap)).map(([,href,label])=>linkButton(href,label,"ghost","arrow")).join("")}</div>${pageGroups(page).map(group=>`<section class="maintenance-rule-group"><h4>${esc(group.label)}</h4>${group.fields.some(row=>row.name==="cycle.openDay")?'<p class="maintenance-calendar-preview" data-calendar-preview></p>':""}<div class="maintenance-fields">${group.fields.map(row=>field(row.section,row.field,config)).join("")}</div></section>`).join("")}${page.id==="players" && canManage(ctx.user,"access")?'<button type="button" class="btn btn-secondary" data-maint-open="access">Gerir acessos e recuperar contas</button>':""}</section>`).join("")}<section class="maintenance-publish"><header><div><h3>Rever e publicar</h3><p>O rascunho inclui todas as p&#225;ginas. As cartas fechadas e os pr&#233;mios entregues mant&#234;m-se.</p></div></header><div class="maintenance-fields"><label>Motivo da altera&#231;&#227;o<textarea name="reason" minlength="5" maxlength="300" required></textarea></label><label>Entrada em vigor<input name="effectiveAt" type="datetime-local"><small>Vazio = agora. Se alterares o calend&#225;rio, propomos automaticamente a pr&#243;xima abertura antes de confirmares.</small><button type="button" class="maintenance-schedule-link" data-next-opening>Usar pr&#243;xima abertura</button></label></div><div class="actions"><button type="submit" class="btn btn-primary">${icon("publish")}Publicar</button><button type="button" class="btn btn-secondary" data-draft>${icon("edit")}Guardar rascunho</button><button type="button" class="btn btn-ghost" data-simulate>${icon("lab")}Simular impacto</button></div></section></div></form><section class="maintenance-simulation" data-result aria-live="polite"></section>`;
        const form = content.querySelector("form");
        const pending = (document.timeline || []).filter(row => +new Date(row.effectiveAt) > Date.now());
        if (pending.length) form.querySelector(".maintenance-status").insertAdjacentHTML("afterend", `<section class="maintenance-rule-group"><h3>Alteração agendada</h3><p>Entrada em vigor: ${pending.map(row => esc(when(row.effectiveAt))).join(", ")} (Lisboa). Os campos abaixo mostram os valores ativos.</p><label>Motivo do cancelamento<input data-cancel-reason minlength="5" maxlength="300" placeholder="Ex.: Corrigir o horário semanal"></label><div class="actions"><button type="button" class="btn btn-danger" data-cancel>Cancelar agendamento</button></div></section>`);
        form.querySelector("[data-restore-draft]")?.addEventListener("click", () => {
          working = {config: value.draft.config, revision, reason: form.elements.reason.value, effectiveAt: form.elements.effectiveAt.value};
          capture = null;
          load(tab);
        });
        const calendarFields = form.querySelector("[data-calendar-preview]").parentElement.querySelector(".maintenance-fields");
        calendarFields.classList.add("maintenance-calendar-controls");
        const cycleFields = POLICY_FIELDS.find(([section])=>section === "cycle")[2];
        calendarFields.innerHTML = ["open","close"].map(prefix=>`<fieldset><legend>${icon(prefix === "open" ? "clock" : "lock")}${prefix === "open" ? "Abertura" : "Fecho"}</legend>${cycleFields.filter(([key])=>key.startsWith(prefix)).map(definition=>field("cycle",[definition[0],definition[0].endsWith("Hour") ? "Hora" : definition[0].endsWith("Minute") ? "Minutos" : definition[1],...definition.slice(2)],config)).join("")}</fieldset>`).join("");
        function values() {
          return Object.fromEntries(
            POLICY_FIELDS.map(([section, , fields]) => [
              section,
              Object.fromEntries(
                fields.map(([key, , initial]) => {
                  const field = form.elements[`${section}.${key}`];
                  return [
                    key,
                    typeof initial === "boolean"
                      ? field.checked
                      : typeof initial === "number"
                        ? Number(field.value)
                        : field.value,
                  ];
                }),
              ),
            ]),
          );
        }
        form.elements.reason.value = working?.reason || "";
        form.elements.effectiveAt.value = working?.effectiveAt || "";
        let automaticDate = working?.automaticDate ?? !form.elements.effectiveAt.value;
        capture = () => ({config:values(),reason:form.elements.reason.value,effectiveAt:form.elements.effectiveAt.value,automaticDate,revision});
        const calendarChanged = candidate => ["openDay","openHour","openMinute","closeDay","closeHour","closeMinute"].some(key => candidate.cycle[key] !== value.config.cycle[key]);
        form.elements.effectiveAt.addEventListener("input", () => { automaticDate = !form.elements.effectiveAt.value; });
        for (const id of ["cards","missions","events"])
          form.querySelector(`[data-maint-panel="${id}"] .maintenance-related-links`).insertAdjacentHTML("afterend", `<details class="maintenance-limits" data-limits="${id}"><summary>${icon("rewardStats")}Tetos de stats e recompensas</summary><div></div></details>`);
        const dateError = root.ownerDocument.createElement("p");
        dateError.className = "maintenance-publish-error";
        dateError.setAttribute("role", "alert");
        dateError.hidden = true;
        form.querySelector(".maintenance-publish .actions").before(dateError);
        form.dataset.baseRevision = revision;
        if(revision !== (document.revision || 0))
          form.querySelector(".maintenance-status").insertAdjacentHTML("beforeend",'<p class="warning" role="status">Existe uma versão mais recente. Guarda o rascunho e recarrega para rever antes de publicar.</p>');
        const updatePreview = () => {
          const candidate = values();
          const count = policyChanges(candidate,value.config).length;
          form.querySelector("[data-unsaved]").textContent = count ? `${count} ajustes por publicar` : "Sem altera\u00e7\u00f5es";
          const cycle = candidate.cycle, time = (h,m)=>`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
          const schedule = c => `${WEEKDAYS[c.openDay]} ${time(c.openHour,c.openMinute)} → ${WEEKDAYS[c.closeDay]} ${time(c.closeHour,c.closeMinute)}`;
          if (calendarChanged(candidate) && automaticDate && POLICY_FIELDS.find(([key])=>key==="cycle")[2].slice(0,6).every(([key,,,min,max])=>Number.isInteger(cycle[key]) && cycle[key]>=min && cycle[key]<=max))
            form.elements.effectiveAt.value = nextPolicyOpening(cycle).input;
          form.querySelector("[data-calendar-preview]").innerHTML = `<b>Ativo:</b> ${esc(schedule(value.config.cycle))}${calendarChanged(candidate) ? `<br><b>Por publicar:</b> ${esc(schedule(cycle))}<br><small>Aplica-se a partir da abertura agendada. A semana atual e as cartas fechadas mantêm-se.</small>` : ""}<br><small>Hora de Lisboa</small>`;
          for (const entry of (document.timeline || []).filter(row => row.config && !row.canceledAt && +new Date(row.effectiveAt) > Date.now()))
            form.querySelector("[data-calendar-preview]").insertAdjacentHTML("beforeend", `<br><small><b>Já agendado para ${esc(when(entry.effectiveAt))}:</b> ${esc(schedule(normalizePolicy(entry.config).cycle))}</small>`);
          form.querySelectorAll("[data-limits]").forEach(panel => {
            const rows = maintenanceLimits(candidate,panel.dataset.limits), active = maintenanceLimits(value.config,panel.dataset.limits);
            panel.querySelector("div").innerHTML = `<p>Valores em edição. As alterações só se aplicam depois de publicadas e em vigor.</p><dl>${rows.map((row,index)=>`<div><dt>${esc(row.title)}</dt><dd><strong>${esc(row.value)}</strong>${row.value !== active[index].value ? `<small>Ativo: ${esc(active[index].value)}</small>` : ""}<p>${esc(row.help)}</p></dd></div>`).join("")}</dl>`;
          });
        };
        updatePreview();
        form.addEventListener("input",updatePreview);
        form.querySelectorAll("[data-maint-page]").forEach(button=>button.onclick=()=>{
          pageId=button.dataset.maintPage;
          form.querySelectorAll("[data-maint-page]").forEach(node=>node.setAttribute("aria-pressed",String(node===button)));
          form.querySelectorAll("[data-maint-panel]").forEach(node=>node.hidden=node.dataset.maintPanel!==pageId);
        });
        form.querySelector("[data-maint-open]")?.addEventListener("click",()=>load("access"));
        form.querySelector("[data-next-opening]").onclick=()=>{
          automaticDate = true;
          const next=nextPolicyOpening(values().cycle);
          form.elements.effectiveAt.value=next.input;
          toast("Entrada em vigor na pr\u00f3xima abertura.");
        };
        form.onsubmit = async (event) => {
          event.preventDefault();
          const candidate = values();
          if (calendarChanged(candidate) && (automaticDate || !form.elements.effectiveAt.value))
            form.elements.effectiveAt.value = nextPolicyOpening(candidate.cycle).input;
          const scheduled = form.elements.effectiveAt.value;
          dateError.hidden = true;
          let activation;
          try { activation = scheduled ? parseLisbonDateInput(scheduled) : null; }
          catch (error) {
            dateError.textContent = error.message;
            dateError.hidden = false;
            form.elements.effectiveAt.focus();
            return;
          }
          if (calendarChanged(candidate)) {
            const at = activation;
            const clock = at && Object.fromEntries(new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/Lisbon",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(at).map(part=>[part.type,part.value]));
            if (!at || +at <= Date.now()+60000 || clock.weekday !== ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][candidate.cycle.openDay] || +clock.hour !== candidate.cycle.openHour || +clock.minute !== candidate.cycle.openMinute) {
              dateError.textContent = "Escolhe uma abertura futura do novo horário ou usa «Usar próxima abertura». A data deve coincidir com a abertura, com mais de um minuto de antecedência.";
              dateError.hidden = false;
              form.elements.effectiveAt.focus();
              return;
            }
          }
          const confirmation = scheduled
            ? `Publicar estas regras para a liga, com entrada em vigor em ${parseLisbonDateInput(scheduled).toLocaleString("pt-PT", {timeZone:"Europe/Lisbon", dateStyle:"short", timeStyle:"short"})} (hora de Lisboa)?`
            : "Publicar estas regras para a liga?";
          if (!(await confirmDialog(confirmation)))
            return;
          await task(event.submitter, async () => {
            await act({
              action: "publish",
              config: candidate,
              expectedRevision: revision,
              reason: form.elements.reason.value,
              effectiveAt: form.elements.effectiveAt.value
                ? parseLisbonDateInput(
                    form.elements.effectiveAt.value,
                  ).toISOString()
                : null,
            });
            working = null; capture = null;
            toast(activation && +activation > Date.now() ? `Configuração agendada para ${when(activation)} (Lisboa).` : "Configuração publicada.");
            await ctx.refresh();
            await load(tab);
          });
        };
        content.querySelector("[data-draft]").onclick = (event) =>
          task(event.currentTarget, async () => {
            await act({ action: "draft", config: values() });
            toast("Rascunho guardado.");
          });
        content.querySelectorAll("[data-simulate]").forEach(button => button.onclick = event =>
          task(event.currentTarget, async () => {
            result(await act({ action: "simulate", config: values() }));
            output()?.scrollIntoView({behavior:"auto",block:"start"});
          }));
        content
          .querySelector("[data-cancel]")
          ?.addEventListener("click", (event) =>
            task(event.currentTarget, async () => {
              const reasonInput = form.querySelector("[data-cancel-reason]");
              if (reasonInput.value.trim().length < 5) {
                reasonInput.setCustomValidity("Indica um motivo com pelo menos 5 caracteres.");
                reasonInput.reportValidity();
                reasonInput.oninput = () => reasonInput.setCustomValidity("");
                return;
              }
              if (!(await confirmDialog("Cancelar a alteração agendada? Os valores ativos mantêm-se."))) return;
              await act({
                action: "cancel-scheduled",
                expectedRevision: revision,
                reason: reasonInput.value.trim(),
              });
              working = null; capture = null;
              toast("Agendamento cancelado.");
              await ctx.refresh();
              await load(tab);
            }),
          );
      } else if (tab === "overview") {
        const byId = new Map(value.jobs.map((row) => [row.id, row]));
        content.innerHTML = `<div class="metrics"><div><small>Pedidos no minuto atual</small><b>${value.usage?.requests ?? 0}</b></div><div><small>Tarefas com falha</small><b>${value.jobs.filter((row) => row.status === "failed").length}</b></div><div><small>Recompensas adiadas</small><b>${value.pending.length}</b></div></div><section class="panel content-stack"><h3>Tarefas automáticas</h3><p>Os interruptores em Regras controlam o processamento. Executar novamente respeita essas pausas e impede execuções simultâneas.</p>${table(
          ["Tarefa", "Agenda", "Estado", "Última conclusão", ""],
          value.registered.map((job) => {
            const row = byId.get(job.id) || {};
            return `<tr><td>${esc(jobLabels[job.id] || job.id)}${row.lastError ? `<small>${esc(row.lastError)}</small>` : ""}</td><td>${esc({"0 8,12,17,22 * * *":"08:00 · 12:00 · 17:00 · 22:00 (Lisboa)","0 8 * * *":"Diariamente às 08:00 (Lisboa)","0 * * * *":"De hora a hora","15 * * * *":"Aos 15 minutos de cada hora"}[job.schedule] || job.schedule)}</td><td>${esc({completed:"Concluída",failed:"Falhou",running:"Em execução","completed-with-issues":"Com itens por rever"}[row.status] || row.status || "Sem execução registada")}</td><td>${when(row.finishedAt)}</td><td><button class="btn btn-secondary" data-job="${job.id}">Executar</button></td></tr>`;
          }),
        )}<label>Motivo<input id="job-reason" minlength="5" maxlength="300"></label><div data-result></div></section>`;
        content.querySelectorAll("[data-job]").forEach(
          (b) =>
            (b.onclick = () =>
              task(b, async () => {
                const outcome = await act({
                  action: "run-job",
                  id: b.dataset.job,
                  reason: content.querySelector("#job-reason").value,
                });
                await load(tab);
                result(outcome);
              })),
        );
      } else if (tab === "diagnostics") {
        content.innerHTML = `<section class="panel content-stack"><h3>Integridade dos dados</h3>${report(value)}</section><form class="panel content-stack" id="rebuild-form"><h3>Recalcular com âmbito</h3><p>Reutiliza o cálculo da plataforma e preserva cartas históricas fechadas.</p><div class="maintenance-fields"><label>Âmbito<select name="scope"><option value="player">Jogador</option><option value="game">Jogo</option><option value="league">Toda a liga</option></select></label><label>ID do jogador ou jogo<input name="id" maxlength="128"></label></div><label>Motivo<input name="reason" minlength="5" maxlength="300" required></label><button class="btn btn-secondary">Pré-visualizar</button></form><div data-result></div>`;
        content.querySelector("form").onsubmit = (event) => {
          event.preventDefault();
          const form = event.target,
            data = {
              action: "rebuild",
              ...Object.fromEntries(new FormData(form)),
            };
          task(event.submitter, async () => {
            const preview = await act(data);
            result(preview.projection);
            if (
              await confirmDialog(
                `Executar recálculo: ${data.scope} ${data.id || ""}?`,
              )
            ) {
              await act({ ...data, confirm: true });
              toast("Recálculo concluído.");
              await load(tab);
            }
          });
        };
      } else if (tab === "rewards") {
        const names = new Map(
          ctx.league.players.map((p) => [p.uid, p.displayName || p.username]),
        );
        const total = (r) =>
          Object.values(r.reward?.boosts || {}).reduce((a, b) => a + b, 0);
        content.innerHTML = `<section class="panel content-stack"><div class="section-head"><h3>Entregas e limites</h3><button class="btn btn-secondary" data-download>Exportar</button></div><label>Filtrar jogador ou origem<input data-filter placeholder="Nome, ID ou evento"></label><div data-reward-list></div></section>`;
        const draw = () => {
          const term = content
            .querySelector("[data-filter]")
            .value.toLocaleLowerCase("pt-PT");
          content.querySelector("[data-reward-list]").innerHTML = table(
            ["Jogador", "Origem", "Configurado", "Entregue", "Estado"],
            value.rewards
              .filter((row) =>
                `${names.get(row.uid) || row.uid} ${row.eventId}`
                  .toLocaleLowerCase("pt-PT")
                  .includes(term),
              )
              .map(
                (row) =>
                  `<tr><td>${esc(names.get(row.uid) || row.uid)}</td><td>${esc(row.source || "evento")}<small>${esc(row.eventId)}</small></td><td>${Object.values(row.configuredReward?.boosts || row.reward?.boosts || {}).reduce((a, b) => a + b, 0)}</td><td>${total(row)}</td><td>${row.revokedAt ? "Revogado" : row.pending ? "Adiado" : row.reward?.statDuration !== "permanent" && +new Date(row.expiresAt) < Date.now() ? "Expirado" : "Entregue"}</td></tr>`,
              ),
          );
        };
        content.querySelector("[data-filter]").oninput = draw;
        draw();
        content.querySelector("[data-download]").onclick = () =>
          download("recompensas.json", value);
      } else if (tab === "access") {
        content.innerHTML = `<section class="panel content-stack"><h3>Capacidades administrativas</h3><p>Os perfis de acesso são atribuídos em Jogadores. Aqui limitas o que cada administrador pode gerir.</p><form id="permissions-form"><label>Administrador<select name="uid">${value.users.map((user) => `<option value="${esc(user.uid)}">${esc(user.name)}</option>`).join("")}</select></label><label class="maintenance-toggle"><input type="checkbox" name="full"><span>Acesso total</span></label><div class="maintenance-fields">${Object.entries(
          CAPABILITIES,
        )
          .map(
            ([key, label]) =>
              `<label class="maintenance-toggle"><input type="checkbox" name="cap-${key}"><span>${label}</span></label>`,
          )
          .join(
            "",
          )}</div><label>Motivo<input name="reason" minlength="5" maxlength="300" required></label><button class="btn btn-primary">Guardar permissões</button></form></section><section class="panel content-stack"><h3>Recuperar conta</h3><p>Confirma a identidade do jogador por um canal conhecido. É necessário ter iniciado sessão nos últimos cinco minutos. Todas as sessões da conta são revogadas.</p><form id="recovery-form"><label>Jogador<select name="uid">${ctx.league.users.map((user) => `<option value="${esc(user.uid || user.id)}">${esc(user.displayName || user.username)}</option>`).join("")}</select></label><label>Nova palavra-passe<input type="password" autocomplete="new-password" name="newPassword" minlength="12" maxlength="128" required></label><label>Motivo<input name="reason" minlength="5" maxlength="300" required></label><button class="btn btn-danger">Recuperar acesso</button></form></section>`;
        const form = content.querySelector("#permissions-form");
        if (Array.isArray(ctx.user.adminCapabilities)) {
          form.closest("section").hidden = true;
        }
        const sync = () => {
          const user = value.users.find(
            (u) => u.uid === form.elements.uid.value,
          );
          form.elements.full.checked = !user?.adminCapabilities;
          for (const key in CAPABILITIES)
            form.elements[`cap-${key}`].checked =
              !user?.adminCapabilities || user.adminCapabilities.includes(key);
        };
        form.elements.uid.onchange = sync;
        sync();
        form.onsubmit = (event) => {
          event.preventDefault();
          task(event.submitter, async () => {
            await act({
              action: "permissions",
              uid: form.elements.uid.value,
              capabilities: form.elements.full.checked
                ? null
                : Object.keys(CAPABILITIES).filter(
                    (key) => form.elements[`cap-${key}`].checked,
                  ),
              reason: form.elements.reason.value,
            });
            toast("Permissões atualizadas.");
            await load(tab);
          });
        };
        content.querySelector("#recovery-form").onsubmit = async (event) => {
          event.preventDefault();
          if (
            !(await confirmDialog(
              "Alterar a palavra-passe e terminar as sessões deste jogador?",
            ))
          )
            return;
          task(event.submitter, async () => {
            await act({
              action: "recovery",
              ...Object.fromEntries(new FormData(event.target)),
            });
            event.target.reset();
            toast("Conta recuperada.");
          });
        };
      } else if (tab === "history") {
        const versions=[...value.versions].sort((a,b)=>b.version-a.version);
        content.innerHTML = `<section class="panel content-stack"><div class="section-head"><div><p class="eyebrow">REGRAS DA LIGA</p><h3>Histórico de alterações</h3></div><span class="pill">${versions.length} versões</span></div><p>Consulta o que mudou, compara os valores e recupera uma versão como rascunho.</p><div class="maintenance-versions">${versions.map((row,index)=>versionEntry(row,versions.slice(index+1).find(previous=>!previous.canceledAt),value.activeVersion,canManage(ctx.user,"settings"))).join("") || '<p class="muted">Ainda não há alterações publicadas.</p>'}</div></section><section class="panel content-stack"><div><p class="eyebrow">ATIVIDADE ADMINISTRATIVA</p><h3>Últimas 100 operações</h3></div><label>Pesquisar autor, operação ou referência<input data-audit-filter type="search" placeholder="Filtra o histórico"></label><div data-audit-list></div><button class="btn btn-secondary" data-export-audit>${icon("download")}Exportar histórico</button></section>`;
        const draw = () => {
          const term = content
            .querySelector("[data-audit-filter]")
            .value.toLowerCase();
          content.querySelector("[data-audit-list]").innerHTML = [...value.audit]
              .sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt))
              .filter((row) => JSON.stringify(row).toLowerCase().includes(term))
              .map(auditEntry).join("") || '<p class="muted">Sem operações para este filtro.</p>';
        };
        content.querySelector("[data-audit-filter]").oninput = draw;
        draw();
        content.querySelector("[data-export-audit]").onclick = () =>
          download("auditoria.json", value.audit);
        content.querySelectorAll("[data-version]").forEach(
          (b) =>
            (b.onclick = () =>
              task(b, async () => {
                await act({
                  action: "draft",
                  config: normalizePolicy(
                    value.versions.find(
                      (row) => row.version === +b.dataset.version,
                    ).config,
                  ),
                });
                working = null; capture = null;
                await load("config");
              })),
        );
      } else if (tab === "backups") {
        content.innerHTML = `<section class="panel content-stack"><h3>Cópias de segurança cloud</h3><p>O restauro cria uma base de dados separada. Nunca substitui automaticamente a base em produção.</p>${table(
          ["Cópia", "Estado", "Criada"],
          value.backups.map(
            (row) =>
              `<tr><td>${esc(row.name)}</td><td>${esc(row.state)}</td><td>${when(row.snapshotTime)}</td></tr>`,
          ),
        )}<h4>Agendamentos</h4>${report(value.schedules)}<form id="backup-form"><label>Retenção diária (dias)<input name="retentionDays" type="number" min="7" max="98" value="30" required></label><label>Motivo<input name="reason" minlength="5" maxlength="300" required></label><button class="btn btn-secondary">Criar agendamento diário</button></form><form id="restore-form"><h4>Restaurar numa nova base de dados</h4><label>Cópia<select name="backup">${value.backups.map((row) => `<option value="${esc(row.name)}">${esc(row.name)}</option>`).join("")}</select></label><label>ID da nova base de dados<input name="databaseId" pattern="[a-z][a-z0-9-]{3,30}" required></label><label>Motivo<input name="reason" minlength="5" maxlength="300" required></label><button class="btn btn-danger">Iniciar restauro</button></form><div data-result></div></section>`;
        for (const [id, action] of [
          ["backup-form", "backup-schedule"],
          ["restore-form", "restore-backup"],
        ])
          content.querySelector(`#${id}`).onsubmit = async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(event.target));
            if (data.retentionDays) data.retentionDays = +data.retentionDays;
            if (!(await confirmDialog("Executar esta operação cloud?"))) return;
            task(event.submitter, async () => {
              const outcome = await act({ action, ...data });
              if (action === "restore-backup") showOperation(outcome);
              else result(outcome);
            });
          };
      }
      if (tab === "backups" || tab === "diagnostics") appendDataTools();
    } catch (error) {
      content.innerHTML = `<section class="panel content-stack"><h3>Não foi possível carregar esta área</h3><p>${esc(error.message)}</p><button class="btn btn-secondary" data-retry>Tentar novamente</button></section>`;
      content.querySelector("[data-retry]").onclick = () => load(tab);
      if (tab === "backups") appendDataTools();
    }
  }
  function appendDataTools() {
    content.insertAdjacentHTML(
      "beforeend",
      `<section class="panel content-stack"><h3>Exportação e limpeza</h3><form id="export-data"><label>Dados<select name="collection">${["users", "games", "initialRatings", "communityRatings", "eventRewards", "weeklyCards", "cardCollections", "systemAudit"].map((name) => `<option>${name}</option>`).join("")}</select></label><button class="btn btn-secondary">Exportar coleção completa</button></form><form id="retention-data"><p>A limpeza remove apenas notificações já lidas, contadores temporários e estados antigos de operações. Não remove jogos, prémios ou auditoria.</p><label>Motivo<input name="reason" minlength="5" maxlength="300" required></label><button class="btn btn-secondary">Pré-visualizar limpeza</button></form><div data-data-result></div></section>`,
    );
    const dataResult = content.querySelector("[data-data-result]");
    content.querySelector("#export-data").onsubmit = (event) => {
      event.preventDefault();
      const collection = event.target.elements.collection.value;
      task(event.submitter, async () => {
        let cursor = null,
          values = [];
        do {
          const page = await act({ action: "export", collection, cursor });
          values.push(...page.rows);
          cursor = page.next;
        } while (cursor);
        download(`${collection}.json`, values);
        toast(`${values.length} registos exportados.`);
      });
    };
    content.querySelector("#retention-data").onsubmit = (event) => {
      event.preventDefault();
      const reason = event.target.elements.reason.value;
      task(event.submitter, async () => {
        const preview = await act({ action: "retention", reason });
        dataResult.innerHTML = `<p>${preview.count} registos elegíveis.</p>`;
        if (
          preview.count &&
          (await confirmDialog(
            `Eliminar ${preview.count} registos transitórios?`,
          ))
        ) {
          await act({ action: "retention", reason, confirm: true });
          toast("Limpeza concluída.");
        }
      });
    };
  }
  async function task(button, fn) {
    try {
      await busy(button, fn);
    } catch {
      // busy already presents the error; keep the form available for retry.
    }
  }
  root
    .querySelectorAll("[data-maint-tab]")
    .forEach(
      (button) => (button.onclick = () => load(button.dataset.maintTab)),
    );
  await load(selected);
}
