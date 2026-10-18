import * as DB from "./db.js";
import { esc, busy, toast, confirmDialog, linkButton } from "./ui.js";
import { icon } from "./icons.js";
import { parseLisbonDateInput } from "./match-time.js";
import {
  POLICY_FIELDS,
  canManage,
  CAPABILITIES,
  normalizePolicy,
} from "./system-policy.js";
const labels = {
  reduce: "Reduzir ao disponível",
  reject: "Não entregar enquanto exceder",
  defer: "Adiar o prémio completo",
  normal: "Normal",
  readOnly: "Apenas consulta",
};
const tabs = [
  ["config", "settings", "Regras", "lab"],
  ["rewards", "operations", "Recompensas", "gift"],
  ["overview", "operations", "Automatizações", "refresh"],
  ["diagnostics", "operations", "Diagnóstico", "chart"],
  ["access", "access", "Acessos", "shield"],
  ["history", "audit", "Histórico", "ratings"],
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
function field(section, [key, label, initial, min, max], config) {
  const value = config[section][key],
    name = `${section}.${key}`;
  if (typeof initial === "boolean")
    return `<label class="maintenance-toggle"><input name="${name}" type="checkbox" ${value ? "checked" : ""}><span>${esc(label)}</span></label>`;
  const input = Array.isArray(min)
    ? `<select name="${name}">${min.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${esc(labels[option] || option)}</option>`).join("")}</select>`
    : `<input name="${name}" ${typeof initial === "number" ? `type="number" min="${min}" max="${max}" step="${Number.isInteger(initial) ? 1 : 0.01}"` : 'maxlength="300"'} value="${esc(value)}" ${typeof initial === "number" || initial ? "required" : ""}>`;
  return `<label>${esc(label)}${input}</label>`;
}
function report(value) {
  if (value.players)
    return `<p>${esc(value.notice)}</p>${table(
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
    document = null;
  root.innerHTML = `<div class="maintenance-heading"><div><h2>Configuração e operações</h2><p>As alterações ficam registadas e os dados históricos são preservados.</p></div><span class="pill">${icon("shield")} Administração</span></div><nav class="maintenance-tabs" aria-label="Áreas de manutenção">${available.map(([id, , name, symbol]) => `<button type="button" class="btn btn-secondary" data-maint-tab="${id}" aria-pressed="false">${icon(symbol)}${name}</button>`).join("")}</nav><div class="maintenance-body" aria-live="polite"></div>`;
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
    selected = tab;
    root
      .querySelectorAll("[data-maint-tab]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.maintTab === tab)),
      );
    content.innerHTML = '<p class="muted">A carregar…</p>';
    try {
      const value = await read(tab);
      if (selected !== tab || !root.isConnected) return;
      if (tab === "config") {
        document = value.document;
        revision = document.revision || 0;
        const config = value.draft?.config || value.config;
        content.innerHTML = `<form id="maintenance-policy" class="content-stack"><div class="maintenance-status"><span class="pill">Versão ativa ${value.version}</span>${value.draft ? '<span class="pill warning">Rascunho recuperado</span>' : ""}<p>Publicar aplica as regras a partir da data escolhida. Prémios já entregues e cartas fechadas mantêm o histórico.</p></div><div class="maintenance-sections">${POLICY_FIELDS.map(([section, title, fields]) => `<details class="panel" ${section === "rewards" ? "open" : ""}><summary>${esc(title)}</summary><div class="maintenance-fields">${fields.map((f) => field(section, f, config)).join("")}</div></details>`).join("")}</div><section class="panel content-stack"><h3>Publicar configuração</h3><label>Motivo<textarea name="reason" minlength="5" maxlength="300" required></textarea></label><label>Entrada em vigor (vazio = agora)<input name="effectiveAt" type="datetime-local"></label><div class="actions"><button type="submit" class="btn btn-primary">Publicar</button><button type="button" class="btn btn-secondary" data-draft>Guardar rascunho</button><button type="button" class="btn btn-secondary" data-simulate>Simular impacto</button>${document.timeline?.some((row) => +new Date(row.effectiveAt) > Date.now()) ? '<button type="button" class="btn btn-danger" data-cancel>Cancelar agendamento</button>' : ""}</div><p class="muted small">A simulação é hipotética e não altera jogadores. Os limites de 0–99 e os pesos por posição permanecem nas áreas próprias.</p></section></form><div data-result></div>`;
        const form = content.querySelector("form");
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
        form.onsubmit = async (event) => {
          event.preventDefault();
          if (!(await confirmDialog("Publicar estas regras para a liga?")))
            return;
          await task(event.submitter, async () => {
            await act({
              action: "publish",
              config: values(),
              expectedRevision: revision,
              reason: form.elements.reason.value,
              effectiveAt: form.elements.effectiveAt.value
                ? parseLisbonDateInput(
                    form.elements.effectiveAt.value,
                  ).toISOString()
                : null,
            });
            toast("Configuração publicada.");
            await ctx.refresh();
            await load(tab);
          });
        };
        content.querySelector("[data-draft]").onclick = (event) =>
          task(event.currentTarget, async () => {
            await act({ action: "draft", config: values() });
            toast("Rascunho guardado.");
          });
        content.querySelector("[data-simulate]").onclick = (event) =>
          task(event.currentTarget, async () =>
            result(await act({ action: "simulate", config: values() })),
          );
        content
          .querySelector("[data-cancel]")
          ?.addEventListener("click", (event) =>
            task(event.currentTarget, async () => {
              await act({
                action: "cancel-scheduled",
                expectedRevision: revision,
                reason: form.elements.reason.value,
              });
              await load(tab);
            }),
          );
      } else if (tab === "overview") {
        const byId = new Map(value.jobs.map((row) => [row.id, row]));
        content.innerHTML = `<div class="metrics"><div><small>Pedidos no minuto atual</small><b>${value.usage?.requests ?? 0}</b></div><div><small>Tarefas com falha</small><b>${value.jobs.filter((row) => row.status === "failed").length}</b></div><div><small>Recompensas adiadas</small><b>${value.pending.length}</b></div></div><section class="panel content-stack"><h3>Tarefas automáticas</h3><p>Os interruptores em Regras controlam o processamento. Executar novamente respeita essas pausas e impede execuções simultâneas.</p>${table(
          ["Tarefa", "Agenda", "Estado", "Última conclusão", ""],
          value.registered.map((job) => {
            const row = byId.get(job.id) || {};
            return `<tr><td>${esc(job.id)}${row.lastError ? `<small>${esc(row.lastError)}</small>` : ""}</td><td>${esc(job.schedule)}</td><td>${esc(row.status || "Sem execução registada")}</td><td>${when(row.finishedAt)}</td><td><button class="btn btn-secondary" data-job="${job.id}">Executar</button></td></tr>`;
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
        content.innerHTML = `<section class="panel content-stack"><h3>Versões das regras</h3>${table(
          ["Versão", "Estado", "Entrada em vigor", "Autor", "Motivo", ""],
          value.versions.map(
            (row) =>
              `<tr><td>${row.version}</td><td>${row.canceledAt ? "Cancelada" : row.version === value.activeVersion ? "Ativa" : +new Date(row.effectiveAt) > Date.now() ? "Agendada" : "Anterior"}</td><td>${when(row.effectiveAt)}</td><td>${esc(row.actorId)}</td><td>${esc(row.reason)}</td><td>${canManage(ctx.user, "settings") ? `<button class="btn btn-secondary" data-version="${row.version}">Usar como rascunho</button>` : ""}</td></tr>`,
          ),
        )}</section><section class="panel content-stack"><h3>Últimas 100 operações</h3><label>Pesquisar autor, operação ou referência<input data-audit-filter></label><div data-audit-list></div><button class="btn btn-secondary" data-export-audit>Exportar</button></section>`;
        const draw = () => {
          const term = content
            .querySelector("[data-audit-filter]")
            .value.toLowerCase();
          content.querySelector("[data-audit-list]").innerHTML = table(
            ["Data", "Autor", "Operação", "Estado", "Detalhes"],
            value.audit
              .filter((row) => JSON.stringify(row).toLowerCase().includes(term))
              .map(
                (row) =>
                  `<tr><td>${when(row.createdAt)}</td><td>${esc(row.actorId)}</td><td>${esc(row.action)}</td><td>${esc(row.status || "completed")}</td><td>${esc(JSON.stringify(row.details || {}))}</td></tr>`,
              ),
          );
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
    } catch (error) {
      toast(error.message, "error");
    }
  }
  root
    .querySelectorAll("[data-maint-tab]")
    .forEach(
      (button) => (button.onclick = () => load(button.dataset.maintTab)),
    );
  await load(selected);
}
