import { esc } from "./ui.js";
import { icon } from "./icons.js";
import { combinedProgress } from "./event-presentation.js";

const playerName = (ctx, uid) =>
  ctx.league.users?.find(player=>player.uid===uid)?.displayName ||
  ctx.league.players?.find(player=>player.uid===uid)?.displayName || uid;
export function personalMissionBoard(ctx, event) {
  const rows = event.participantProgress;
  const done = (rows || []).filter((row) => row.completed).length;
  const summary=rows?.length ? `${done} de ${rows.length} ${rows.length===1?"jogador concluiu":"jogadores concluíram"}${["daily","weekly"].includes(event.cadence)?" neste período":""}` : rows ? "Ainda não há participantes nesta missão." : "O progresso dos participantes ainda não está disponível.";
  return `<div class="mission-participants"><div class="mission-participants-head"><h2>${icon("players")}Progresso dos jogadores</h2><p>${summary}</p></div>${rows?.length ? `<label class="mission-participants-search">Procurar jogador<input type="search" data-participant-search placeholder="Nome do jogador" autocomplete="off"></label><p class="mission-participants-result" data-participant-result role="status"></p><ul class="mission-participants-list" data-participant-list></ul>` : ""}</div>`;
}
export function bindPersonalMissionBoard(ctx, event) {
  const root = document.querySelector(".mission-participants"),
    rows = event.participantProgress;
  if (!root || !rows?.length) return;
  const fold = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-PT");
  const sorted = [...rows].sort(
    (a, b) =>
      b.percent - a.percent ||
      Number(b.completed) - Number(a.completed) ||
      playerName(ctx, a.uid).localeCompare(playerName(ctx, b.uid), "pt-PT") ||
      a.uid.localeCompare(b.uid),
  );
  const input = root.querySelector("[data-participant-search]");
  const draw = () => {
    const filtered = sorted.filter((row) =>
      fold(playerName(ctx, row.uid)).includes(fold(input.value.trim())),
    );
    root.querySelector("[data-participant-result]").textContent =
      input.value.trim()
        ? `${filtered.length} ${filtered.length === 1 ? "jogador encontrado" : "jogadores encontrados"}`
        : "Do maior para o menor progresso";
    root.querySelector("[data-participant-list]").innerHTML =
      filtered
        .map((row) => {
          const name = playerName(ctx, row.uid),
            own = row.uid === ctx.user.uid;
          const started =
            row.progress > 0 || row.goals?.some((goal) => goal.progress > 0);
          const status = row.completed
            ? "Concluída"
            : row.locked
              ? "Por desbloquear"
              : started
                ? "Em progresso"
                : "Por iniciar";
          const symbol = row.completed
            ? "check"
            : row.locked
              ? "lock"
              : started
                ? "ratingAverage"
                : "pause";
          const count =
            ["all", "combined"].includes(event.objective.metric) ||
            (row.claimed && row.progress < row.target)
              ? ""
              : `${row.progress} / ${row.target}`;
          return `<li data-participant-uid="${esc(row.uid)}" class="mission-participant${own ? " is-you" : ""}${row.completed ? " is-complete" : ""}"><div class="mission-participant-heading"><strong>${esc(name)}${own ? '<span class="mission-participant-you">Tu</span>' : ""}</strong><span class="mission-participant-percent">${row.percent}%</span></div><div class="progress" role="progressbar" aria-label="Progresso de ${esc(name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${row.percent}"><span style="--progress:${row.percent}%"></span></div><div class="mission-participant-state"><span>${icon(symbol)}${status}</span>${count ? `<span>${esc(count)}</span>` : ""}</div>${row.goals?.length && !row.claimed ? `<details class="mission-participant-goals"><summary>Ver objetivos</summary>${combinedProgress(event, { goals: row.goals })}</details>` : ""}</li>`;
        })
        .join("") || '<li class="muted">Nenhum jogador encontrado.</li>';
  };
  input.addEventListener("input", draw);
  draw();
}
