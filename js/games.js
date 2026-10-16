import { bindRowScroll } from "./row-scroll.js";
import {
  lisbonDateInput,
  parseLisbonDateInput,
  formatMatchDate,
} from "./match-time.js";
import {
  balancedTeams,
  teamBalance,
  balanceSignature,
  balanceMatches,
  BALANCE_SETTINGS,
} from "./team-balance.js";
import * as DB from "./db.js";
import {
  participants,
  formatDate,
  asDate,
  matchPerformance,
  FEEDBACK,
} from "./utils.js";
import {
  esc,
  pageHead,
  empty,
  linkButton,
  busy,
  toast,
  confirmDialog,
  modal,
} from "./ui.js";
import { icon } from "./icons.js";
import { card } from "./cards.js";
import { youtubeVideoId, youtubePlayer } from "./youtube.js";
export function matchStars(value) {
  return Number.isFinite(value)
    ? `<span class="match-stars" aria-label="${value.toFixed(1)} de 5 estrelas"><span aria-hidden="true">★★★★★<span style="width:${Math.max(0, Math.min(100, value * 20))}%">★★★★★</span></span><b>${value.toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b></span>`
    : '<span class="muted">Por avaliar</span>';
}
export function matchPositions(game, players) {
  return Object.fromEntries(
    participants(game).flatMap((uid) => {
      // Preserve the position recorded in closed games when today's card changes.
      const position =
        (game.status === "closed" && game.positions?.[uid]) ||
        players.find((player) => player.uid === uid)?.primaryPosition;
      return ["GR", "DEF", "ALA", "MED", "AV"].includes(position)
        ? [[uid, position]]
        : [];
    }),
  );
}
export function gameRows(games, { uid, summaries = [] } = {}) {
  return `<div class="game-list">${games
    .map((g) => {
      const ownRating =
        g.status === "closed" && uid && participants(g).includes(uid)
          ? `<div class="game-own-rating"><small>A tua avaliação</small>${matchStars(summaries.find((row) => row.id === g.id)?.players?.[uid]?.overall)}</div>`
          : "";
      return `<a class="game-row ${ownRating ? "has-own-rating" : ""}" href="#/game/${g.id}"><span class="game-symbol">${icon("games")}</span><div class="game-row-info"><b>${esc(g.title)}</b><small>${formatMatchDate(g.scheduledAt)} · ${esc(g.location || "Local a definir")}</small></div>${ownRating}<span class="pill ${g.status === "closed" ? "" : "success"}">${{ draft: "Rascunho", open: "Aberto", closed: "Encerrado" }[g.status]}</span><strong>${g.status === "closed" ? `${g.score.teamA} — ${g.score.teamB}` : "VS"}</strong>${icon("arrow")}</a>`;
    })
    .join("")}</div>`;
}
export function gamesPage(ctx) {
  ctx.render(
    `${pageHead("Dentro de campo", "Jogos", "Organiza a próxima Peladinha e revê os resultados.", ["admin", "dbs"].includes(ctx.user.role) ? linkButton("#/game/new", "Criar jogo", "primary", "plus") : "")}${ctx.league.games.length ? gameRows(ctx.league.games, { uid: ctx.user.uid, summaries: ctx.league.summaries }) : empty("Ainda não existem jogos", "As equipas e os resultados ficam todos aqui.", ["admin", "dbs"].includes(ctx.user.role) ? linkButton("#/game/new", "Criar jogo", "primary", "plus") : "", "games")}`,
  );
}
function dateInput(timestamp) {
  return lisbonDateInput(timestamp);
}
export async function gamePage(ctx, id) {
  const saved = id === "new" ? null : ctx.league.games.find((x) => x.id === id);
  if (id !== "new" && !saved)
    return ctx.render(
      empty(
        "Jogo não encontrado",
        "Pode ter sido eliminado.",
        linkButton("#/games", "Ver jogos", "secondary"),
      ),
    );
  const g = saved
    ? structuredClone({
        ...saved,
        scheduledAt: dateInput(saved.scheduledAt),
        createdAt: null,
        closedAt: null,
        updatedAt: null,
      })
    : {
        title: "",
        location: "",
        notes: "",
        status: "draft",
        teamA: { starters: [], bench: [] },
        teamB: { starters: [], bench: [] },
        score: { teamA: 0, teamB: 0 },
        scheduledAt: "",
      };
  const performance = new Map(
    participants(g).map((uid) => [uid, matchPerformance(uid, g)]),
  );
  const manager = ["admin", "dbs"].includes(ctx.user.role);
  const editable =
    manager && (g.status !== "closed" || ctx.user.role === "admin");
  const canClose = manager && g.status === "open";
  if (!saved && !manager)
    return ctx.render(
      empty(
        "Acesso reservado",
        "Só DBS e administradores podem criar jogos.",
        linkButton("#/games", "Ver jogos"),
      ),
    );
  ctx.render(
    `${pageHead("Peladinha", saved?.title || "Criar jogo", editable ? "Escolhe as equipas e guarda o jogo." : "Equipas e resultado desta Peladinha.", "")}<form id="game-form" class="content-stack game-workspace"><div id="game-details" class="panel game-details-panel"><div class="form-grid"><label>Título<input name="title" required maxlength="80" value="${esc(g.title)}" ${editable ? "" : "disabled"}></label><label>Data e hora (Lisboa)<input type="datetime-local" name="scheduledAt" required value="${g.scheduledAt}" ${editable ? "" : "disabled"}></label><label>Local<input name="location" maxlength="120" value="${esc(g.location)}" ${editable ? "" : "disabled"}></label><input type="hidden" name="notes" value="${esc(g.notes)}"></div></div><div id="team-builder" class="content-stack"></div><div id="game-result" class="panel score-panel"><div class="score-heading"><h2>Resultado</h2></div><div class="score"><label>Equipa A<input type="number" min="0" max="999" name="scoreA" value="${g.score.teamA}" ${editable ? "" : "disabled"}></label><b>—</b><label>Equipa B<input type="number" min="0" max="999" name="scoreB" value="${g.score.teamB}" ${editable ? "" : "disabled"}></label></div><div id="game-ratings"></div><div id="match-performances"></div></div><div id="game-video"></div><div class="game-actionbar">${linkButton("#/games", "Todos os jogos", "ghost")}<button type="button" id="share-game" class="btn btn-ghost">Partilhar jogo</button>${editable ? `<div class="actions"><button class="btn btn-primary" name="action" value="save">Guardar jogo</button>${saved && g.status === "draft" ? '<button class="btn btn-secondary" name="action" value="open">Abrir jogo</button>' : saved && g.status === "open" ? '<button class="btn btn-secondary" name="action" value="draft">Tornar rascunho</button><button class="btn btn-success" name="action" value="close">Encerrar jogo</button>' : ""}</div>` : ""}${saved && (ctx.user.role === "admin" || (ctx.user.role === "dbs" && g.status !== "closed")) ? '<div class="actions"><button type="button" id="delete-game" class="btn btn-danger">Eliminar jogo</button></div>' : ""}${saved?.status === "closed" && participants(saved).includes(ctx.user.uid) ? linkButton(`#/game/${id}/feedback`, "Avaliar jogadores", "primary", "missions") : ""}</div></form>`,
  );
  document.querySelector("#share-game").onclick = async () => {
    if (!saved) return toast("Guarda o jogo antes de partilhar.");
    const url = new URL(location.href);
    url.hash = `/game/${id}`;
    try {
      if (navigator.share)
        await navigator.share({
          title: saved.title,
          text: `${saved.title} · ${formatMatchDate(saved.scheduledAt)}`,
          url: url.href,
        });
      else {
        await navigator.clipboard.writeText(url.href);
        toast("Link do jogo copiado.");
      }
    } catch (error) {
      if (error.name !== "AbortError")
        toast(
          "Não foi possível partilhar o jogo. Copia o endereço da página.",
          "error",
        );
    }
  };
  if (saved?.status === "closed") {
    const summary =
      ctx.league.summaries?.find((row) => row.id === id)?.players || {};
    document.querySelector("#game-ratings").innerHTML =
      `<section class="panel match-ratings"><div class="section-head"><div><small>O jogo aos olhos da equipa</small><h2>Estrelas do jogo</h2></div><span class="pill">Médias da comunidade</span></div><p class="muted">As estrelas vão surgindo à medida que as avaliações são enviadas. Abre um jogador para ver cada dimensão.</p><div class="match-ratings-list">${
        participants(saved)
          .map((uid) => {
            const player = ctx.league.players.find((row) => row.uid === uid);
            const rating = summary[uid] || {};
            return `<details class="match-rating-player ${uid === ctx.user.uid ? "is-self" : ""}"><summary><span>${esc(player?.displayName || player?.username || "Jogador inativo")}${uid === ctx.user.uid ? " <small>Tu</small>" : ""}</span>${matchStars(rating.overall)}</summary><div class="match-rating-dimensions">${FEEDBACK.map(([key, label]) => `<div><span>${label}</span>${matchStars(rating[key])}</div>`).join("")}</div></details>`;
          })
          .join("") || '<p class="muted">Este jogo não tem jogadores.</p>'
      }</div></section>`;
  }
  const builder = document.querySelector("#team-builder");
  document
    .querySelector("#delete-game")
    ?.addEventListener("click", async (event) => {
      if (
        !(await confirmDialog(
          "Eliminar este jogo e todas as suas avaliações e estatísticas?",
        ))
      )
        return;
      try {
        await busy(event.currentTarget, () =>
          DB.callAdmin("deleteGame", { gameId: id }),
        );
        await ctx.refresh();
        ctx.go("#/games");
      } catch (error) {
        toast(error.message, "error");
      }
    });
  const fields = document.querySelector("#game-form .form-grid");
  if (editable) {
    fields.insertAdjacentHTML(
      "beforeend",
      `<label>Vídeo no YouTube (opcional)<input type="url" name="youtubeUrl" maxlength="500" placeholder="https://www.youtube.com/watch?v=…" value="${esc(g.youtubeVideoId ? `https://www.youtube.com/watch?v=${g.youtubeVideoId}` : "")}"></label>`,
    );
  }
  const video = document.createElement("div");
  video.innerHTML = youtubePlayer(g.youtubeVideoId);
  document.querySelector("#game-video").append(video);
  fields
    .querySelector('[name="youtubeUrl"]')
    ?.addEventListener("input", (event) => {
      const id = youtubeVideoId(event.target.value);
      event.target.setCustomValidity(
        id === null ? "Introduz um link de vídeo válido do YouTube." : "",
      );
      video.innerHTML = youtubePlayer(id);
    });
  const assigned = (uid) =>
    ["teamA", "teamB"].some((t) =>
      ["starters", "bench"].some((k) => g[t][k].includes(uid)),
    );
  const ratedPlayers = ctx.league.players.filter(
    (p) => p.hasCard && Number.isFinite(p.ovr),
  );
  const chosen = new Set(
    (participants(g).length
      ? ratedPlayers.filter((p) => assigned(p.uid))
      : []
    ).map((p) => p.uid),
  );
  const signed = (value) =>
    `${value >= 0 ? "+" : ""}${value.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}`;
  const number = (value) =>
    value == null
      ? "—"
      : value.toLocaleString("pt-PT", { maximumFractionDigits: 2 });
  const referenceBalance = () =>
    g.status === "closed"
      ? ctx.league.balances?.find(
          (b) =>
            b.id === id &&
            balanceMatches({ ...saved, teamA: g.teamA, teamB: g.teamB }, b),
        )
      : null;
  const teamPlayers = (side) => {
    const reference = referenceBalance();
    return [...g[side].starters, ...g[side].bench]
      .map((uid) => {
        const player = ctx.league.players.find((p) => p.uid === uid);
        if (!player) return null;
        const referenceOvr = reference?.playerOvr?.[uid];
        return {
          ...player,
          hasCard: Number.isFinite(referenceOvr) || player.hasCard,
          ovr: Number.isFinite(referenceOvr) ? referenceOvr : player.ovr,
        };
      })
      .filter((p) => p?.hasCard && Number.isFinite(p.ovr))
      .sort((a, b) => b.ovr - a.ovr || a.uid.localeCompare(b.uid));
  };
  const playerHighlight = (label, player) =>
    `<div class="game-highlight"><small>${label}</small>${player ? `<a href="#/player/${esc(player.uid)}"><span class="leader-mini-card">${card(player, { size: "sm", preview: true })}</span><b>${esc(player.displayName || player.username)}</b><span>${number(player.ovr)} OVR</span></a>` : '<b class="muted">—</b>'}</div>`;
  const balancePanel = (details = false) => {
    const frozen =
      g.status === "closed"
        ? ctx.league.balances?.find(
            (b) =>
              b.id === id &&
              balanceMatches({ ...saved, teamA: g.teamA, teamB: g.teamB }, b),
          )
        : null;
    const balance = frozen || teamBalance(g, ctx.league.players);
    if (!details) {
      const difference =
        balance.teamA.average == null || balance.teamB.average == null
          ? null
          : balance.teamA.average - balance.teamB.average;
      const badge = (side, value) =>
        `<div><span>Equipa ${side}</span><strong class="ovr-difference ${value > 0 ? "positive" : value < 0 ? "negative" : "neutral"}">${value == null ? "—" : value === 0 ? "0" : signed(value)}</strong></div>`;
      const ranked = [...teamPlayers("teamA"), ...teamPlayers("teamB")].sort(
        (a, b) => b.ovr - a.ovr || a.uid.localeCompare(b.uid),
      );
      const total = (balance.teamA.average || 0) + (balance.teamB.average || 0);
      const share = total ? (100 * (balance.teamA.average || 0)) / total : 50;
      return `<div class="team-balance-panel"><div class="section-head"><h3>Equilíbrio · OVR</h3>${ctx.user.role === "admin" ? `<button type="button" id="balance-details" class="btn btn-icon btn-ghost" aria-label="Ver detalhes das equipas">${icon("plus")}</button>` : ""}</div><div class="balance-summary">${badge("A", difference)}${badge("B", difference == null ? null : -difference)}</div><div class="balance-scale" aria-hidden="true"><span style="width:${share}%"></span><span style="width:${100 - share}%"></span></div><div class="balance-averages"><span>Equipa A · ${number(balance.teamA.average)} OVR</span><span>Equipa B · ${number(balance.teamB.average)} OVR</span></div><details class="game-scouting"><summary>Destaques e melhores por posição</summary><div class="game-highlights">${playerHighlight("Maior OVR", ranked[0])}${playerHighlight("Menor OVR", ranked.at(-1))}</div><div class="position-leaders">${[
        "GR",
        "DEF",
        "ALA",
        "MED",
        "AV",
      ]
        .map(
          (position) =>
            `<div><span class="position-tag">${position}</span>${playerHighlight(
              "Melhor da posição",
              ranked.find((p) => p.primaryPosition === position),
            )}</div>`,
        )
        .join("")}</div></details></div>`;
    }
    return `<section class="balance-audit"><div class="section-head"><h2>Equilíbrio das equipas</h2><span class="pill">${g.status === "closed" ? (frozen ? "OVR de referência guardado" : "Sem referência guardada") : "Prévia com OVR atual"}</span></div><div class="metrics"><div><small>Média OVR · Equipa A</small><b>${number(balance.teamA.average)}</b><small>${balance.teamA.rated}/${balance.teamA.count} com carta</small></div><div><small>Média OVR · Equipa B</small><b>${number(balance.teamB.average)}</b><small>${balance.teamB.rated}/${balance.teamB.count} com carta</small></div><div><small>Diferença entre equipas</small><b>${number(balance.difference)}</b></div><div><small>Desvio médio entre equipas</small><b>${number(balance.meanDeviation)}</b></div></div><div class="table-wrap"><table><thead><tr><th>Equipa</th><th>Média dos titulares</th><th>Média de todos os jogadores</th></tr></thead><tbody>${[
      ["A", balance.teamA],
      ["B", balance.teamB],
    ]
      .map(
        ([side, team]) =>
          `<tr><td>Equipa ${side}</td><td>${number(team.startersAverage)}</td><td>${number(team.average)}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><p class="muted">A média inclui titulares e suplentes. O desvio é metade da diferença entre as duas médias. Jogadores com OVR inferior à média dos colegas recebem até 25% de bónus nos ganhos quando são avaliados acima dessa média. A referência de OVR é guardada no fecho do jogo.</p>${!frozen && g.status === "closed" ? '<p class="warning">Sem referência guardada, não é aplicado o bónus por OVR inferior ao dos colegas.</p>' : ""}<p class="muted">Sorteio: até ${BALANCE_SETTINGS.attempts} combinações, escolhendo aleatoriamente entre as que ficam até ${number(BALANCE_SETTINGS.tolerance)} ponto da melhor diferença encontrada. Compara as médias de todos os jogadores e dos titulares. Máximo de 5 titulares por equipa.</p></section>`;
  };
  const autoPanel = () =>
    `<div class="auto-teams"><div class="section-head"><div><h2>Equipas</h2></div>${editable && g.status !== "closed" ? '<button type="button" id="auto-teams" class="btn btn-primary">Sortear equipas</button>' : `<span class="pill">${g.status === "closed" ? "Jogo encerrado" : g.status === "open" ? "Jogo aberto" : "Rascunho"}</span>`}</div></div>`;
  const drawPerformance = () => {
    const root = document.querySelector("#match-performances");
    root.innerHTML = `<div class="match-performance-grid">${["teamA", "teamB"]
      .map(
        (side) =>
          `<section><h3>Equipa ${side === "teamA" ? "A" : "B"} · Golos e assistências</h3>${
            [...g[side].starters, ...g[side].bench]
              .map((uid) => {
                const player = ctx.league.players.find((p) => p.uid === uid),
                  row = performance.get(uid) || { goals: 0, assists: 0 };
                performance.set(uid, row);
                return `<div class="match-performance-row"><b>${esc(player?.displayName || player?.username || "Jogador")}</b>${[
                  ["goals", "Golos"],
                  ["assists", "Assistências"],
                ]
                  .map(
                    ([key, label]) =>
                      `<label>${label}<span class="performance-counter">${editable ? `<button type="button" data-counter="-1" aria-label="Diminuir ${label} de ${esc(player?.displayName || uid)}">−</button>` : ""}<input type="number" min="0" max="999" step="1" value="${row[key]}" data-performance-uid="${esc(uid)}" data-performance-key="${key}" aria-label="${label} de ${esc(player?.displayName || uid)}" ${editable ? "" : "disabled"}>${editable ? `<button type="button" data-counter="1" aria-label="Aumentar ${label} de ${esc(player?.displayName || uid)}">+</button>` : ""}</span></label>`,
                  )
                  .join("")}</div>`;
              })
              .join("") || '<p class="muted">Adiciona jogadores à equipa.</p>'
          }</section>`,
      )
      .join("")}</div>`;
    root.onclick = (event) => {
      const button = event.target.closest("[data-counter]");
      if (!button) return;
      const input = button.parentElement.querySelector("input");
      input.value = Math.max(
        0,
        Math.min(999, Number(input.value) + Number(button.dataset.counter)),
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    root.oninput = (event) => {
      const input = event.target;
      if (!input.dataset.performanceUid) return;
      performance.get(input.dataset.performanceUid)[
        input.dataset.performanceKey
      ] = Number(input.value);
    };
  };
  const draw = () => {
    for (const side of ["teamA", "teamB"]) {
      const ranked = teamPlayers(side),
        rank = new Map(ranked.map((p, i) => [p.uid, i]));
      for (const kind of ["starters", "bench"])
        g[side][kind].sort(
          (a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999),
        );
    }
    drawPerformance();
    builder.innerHTML = `<section class="panel game-teams-frame content-stack">${autoPanel()}${balancePanel()}<div class="team-builder ${editable && ctx.league.players.some((p) => !assigned(p.uid)) ? "has-available" : ""}"><section class="team-panel available"><div class="section-head"><h2>Disponíveis</h2><small>${ctx.league.players.filter((p) => !assigned(p.uid)).length}</small></div><div class="team-player-list">${
      ctx.league.players
        .filter((p) => !assigned(p.uid))
        .map((p) => chip(p, "available"))
        .join("") ||
      '<p class="muted">Todos os jogadores estão nas equipas.</p>'
    }</div></section>${["A", "B"]
      .map((side) => {
        const team = `team${side}`,
          rank = teamPlayers(team),
          ordered = [...participants({ teamA: g[team] })].sort(
            (a, b) =>
              (rank.findIndex((p) => p.uid === a) < 0
                ? 999
                : rank.findIndex((p) => p.uid === a)) -
              (rank.findIndex((p) => p.uid === b) < 0
                ? 999
                : rank.findIndex((p) => p.uid === b)),
          );
        return `<section class="team-panel team-${side.toLowerCase()}"><div class="section-head"><h2>Equipa ${side}</h2><span class="team-letter">${side}</span></div>${editable ? `<div class="team-drop-targets">${["starters", "bench"].map((kind) => `<div class="drop-zone" data-team="${team}" data-kind="${kind}"><h3>${kind === "starters" ? `Titulares ${g[team].starters.length}/5` : `Suplentes ${g[team].bench.length}`}</h3><span class="drop-hint">Arrastar para aqui</span></div>`).join("")}</div>` : ""}<div class="team-player-list ordered-team-list">${ordered.map((uid) => chip(ctx.league.players.find((p) => p.uid === uid) || { uid, displayName: "Jogador inativo" }, `${side}-${g[team].starters.includes(uid) ? "starters" : "bench"}`)).join("") || '<p class="muted">Sem jogadores</p>'}</div></section>`;
      })
      .join("")}</div></section>`;
    builder.querySelector("#balance-details")?.addEventListener("click", () => {
      if (ctx.user.role === "admin")
        modal("Detalhes das equipas", balancePanel(true));
    });
    if (!editable) return;
    builder.querySelector("#auto-teams")?.addEventListener("click", () => {
      const selection = new Set(chosen);
      const close = modal(
        "Escolher jogadores",
        `<form id="auto-selection"><p class="draw-help">Arrasta as cartas para o balde ou toca para adicionar e retirar.</p><div class="auto-selection-head"><button type="button" id="select-all-players" class="btn btn-ghost">Selecionar todos</button></div><div class="draw-pool-layout"><section class="draw-pool" data-draw-zone="available" aria-label="Jogadores disponíveis"><h3>Disponíveis</h3><div class="draw-card-list" id="draw-available"></div></section><section class="draw-pool draw-bucket" data-draw-zone="selected" aria-label="Balde do sorteio"><h3>${icon("players")} Balde do sorteio<span id="auto-selected-count" class="pill success" role="status" aria-live="polite" aria-atomic="true"></span></h3><div class="draw-card-list" id="draw-selected"></div></section></div><div class="actions"><button id="confirm-auto-teams" class="btn btn-primary">Sortear equipas</button></div></form>`,
      );
      const form = document.querySelector("#auto-selection");
      form.closest(".modal").classList.add("draw-selection-modal");
      form.querySelectorAll(".draw-card-list").forEach(bindRowScroll);
      const eligible = new Set(ratedPlayers.map((p) => p.uid));
      const tile = (p) => {
        const selected = selection.has(p.uid),
          disabled = !eligible.has(p.uid);
        return `<button type="button" class="draw-player-card" data-auto-player="${esc(p.uid)}" draggable="${!disabled}" ${disabled ? "disabled" : ""} aria-label="${selected ? "Retirar" : "Adicionar"} ${esc(p.displayName || p.username)} ${selected ? "do" : "ao"} balde">${card(p, { size: "sm", preview: true })}<span class="draw-card-action">${disabled ? "Carta pendente" : selected ? "− Retirar" : "+ Adicionar"}</span></button>`;
      };
      const update = () => {
        form.querySelector("#auto-selected-count").textContent = String(
          selection.size,
        );
        form
          .querySelector("#auto-selected-count")
          .setAttribute("aria-label", `${selection.size} jogadores no sorteio`);
        form.querySelector("#confirm-auto-teams").disabled = selection.size < 2;
        form.querySelector("#select-all-players").textContent =
          selection.size === ratedPlayers.length
            ? "Limpar seleção"
            : "Selecionar todos";
        const available = ctx.league.players.filter(
          (p) => !selection.has(p.uid),
        );
        const selected = ratedPlayers.filter((p) => selection.has(p.uid));
        form.querySelector("#draw-available").innerHTML =
          available.map(tile).join("") ||
          '<p class="draw-empty">Todas as cartas estão no balde.</p>';
        form.querySelector("#draw-selected").innerHTML =
          selected.map(tile).join("") ||
          '<p class="draw-empty">Arrasta as cartas para aqui</p>';
      };
      const moveSelection = (uid, selected) => {
        if (!eligible.has(uid)) return;
        if (selected) selection.add(uid);
        else selection.delete(uid);
        update();
        [...form.querySelectorAll("[data-auto-player]")]
          .find((el) => el.dataset.autoPlayer === uid)
          ?.focus({ preventScroll: true });
      };
      form.onclick = (event) => {
        const tile = event.target.closest("[data-auto-player]");
        if (tile && !tile.disabled)
          moveSelection(
            tile.dataset.autoPlayer,
            !selection.has(tile.dataset.autoPlayer),
          );
      };
      form.ondragstart = (event) => {
        const tile = event.target.closest("[data-auto-player]");
        if (!tile || tile.disabled) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData("text/plain", tile.dataset.autoPlayer);
        event.dataTransfer.effectAllowed = "move";
      };
      form.querySelectorAll("[data-draw-zone]").forEach((zone) => {
        zone.ondragover = (event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          zone.classList.add("drag-over");
        };
        zone.ondragleave = (event) => {
          if (!zone.contains(event.relatedTarget))
            zone.classList.remove("drag-over");
        };
        zone.ondrop = (event) => {
          event.preventDefault();
          zone.classList.remove("drag-over");
          moveSelection(
            event.dataTransfer.getData("text/plain"),
            zone.dataset.drawZone === "selected",
          );
        };
      });
      form.ondragend = () =>
        form
          .querySelectorAll(".drag-over")
          .forEach((zone) => zone.classList.remove("drag-over"));
      form.querySelector("#select-all-players").onclick = () => {
        const clear = selection.size === ratedPlayers.length;
        selection.clear();
        if (!clear) ratedPlayers.forEach((p) => selection.add(p.uid));
        update();
      };
      update();
      form.onsubmit = (event) => {
        event.preventDefault();
        try {
          const result = balancedTeams(
            ratedPlayers.filter((p) => selection.has(p.uid)),
            { previous: balanceSignature(g) },
          );
          chosen.clear();
          selection.forEach((uid) => chosen.add(uid));
          g.teamA = result.teamA;
          g.teamB = result.teamB;
          close();
          draw();
          toast("Equipas sorteadas. Guarda o jogo para confirmar.");
        } catch (error) {
          toast(error.message, "error");
        }
      };
    });
    builder
      .querySelectorAll("[data-assign]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            move(b.dataset.uid, b.dataset.assign, b.dataset.kind)),
      );
    builder
      .querySelectorAll("[data-remove]")
      .forEach((b) => (b.onclick = () => move(b.dataset.remove)));
    builder
      .querySelectorAll("[draggable]")
      .forEach(
        (el) =>
          (el.ondragstart = (e) =>
            e.dataTransfer.setData("text/plain", el.dataset.uid)),
      );
    builder.querySelectorAll(".drop-zone").forEach((zone) => {
      zone.ondragover = (e) => {
        e.preventDefault();
        zone.classList.add("drag-over");
      };
      zone.ondragleave = () => zone.classList.remove("drag-over");
      zone.ondrop = (e) => {
        e.preventDefault();
        move(
          e.dataTransfer.getData("text/plain"),
          zone.dataset.team,
          zone.dataset.kind,
        );
      };
    });
  };
  function chip(p, place) {
    const side = place.startsWith("A-")
      ? "teamA"
      : place.startsWith("B-")
        ? "teamB"
        : null;
    const captain = side && teamPlayers(side)[0]?.uid === p.uid;
    const hasDisplayCard =
      p.hasCard ||
      (side && Number.isFinite(referenceBalance()?.playerOvr?.[p.uid]));
    const displayedOvr = side
      ? (teamPlayers(side).find((player) => player.uid === p.uid)?.ovr ?? p.ovr)
      : p.ovr;
    return `<div class="team-chip ${captain ? "is-captain" : ""}" ${editable ? 'draggable="true"' : ""} data-uid="${esc(p.uid)}"><div class="chip-card">${card(p, { size: "sm", preview: true })}</div><div class="chip-info"><b>${esc(p.displayName || p.username)}</b><small>${hasDisplayCard ? "OVR " + displayedOvr : "Carta pendente"}${place !== "available" ? ` · ${place.endsWith("bench") ? "Suplente" : "Titular"}` : ""}${captain ? ' <span class="captain-badge" title="Maior OVR da equipa">C · Capitão</span>' : ""}</small>${editable ? `<div class="chip-controls">${place === "available" ? `<button type="button" data-uid="${p.uid}" data-assign="teamA" data-kind="starters" class="btn btn-ghost">→ A</button><button type="button" data-uid="${p.uid}" data-assign="teamB" data-kind="starters" class="btn btn-ghost">→ B</button>` : `<select data-move-select="${p.uid}" aria-label="Mover ${esc(p.displayName)}"><option value="">Mover para…</option><option value="teamA/starters">A · Titular</option><option value="teamA/bench">A · Suplente</option><option value="teamB/starters">B · Titular</option><option value="teamB/bench">B · Suplente</option></select><button type="button" data-remove="${p.uid}" class="btn btn-icon btn-ghost" aria-label="Remover jogador">${icon("close")}</button>`}</div>` : ""}</div></div>`;
  }
  function move(uid, team, kind) {
    if (!ctx.league.players.some((p) => p.uid === uid)) return;
    if (
      team &&
      kind === "starters" &&
      g[team].starters.filter((x) => x !== uid).length >= 5
    )
      return toast("Máximo de 5 titulares por equipa.", "error");
    ["teamA", "teamB"].forEach((t) =>
      ["starters", "bench"].forEach(
        (k) => (g[t][k] = g[t][k].filter((x) => x !== uid)),
      ),
    );
    if (team) g[team][kind].push(uid);
    draw();
  }
  builder.addEventListener("change", (e) => {
    if (e.target.matches("[data-move-select]") && e.target.value) {
      const [team, kind] = e.target.value.split("/");
      move(e.target.dataset.moveSelect, team, kind);
    }
  });
  draw();
  document.querySelector("#game-form").onsubmit = async (e) => {
    e.preventDefault();
    if (!editable) return;
    const action = e.submitter.value;
    if (action === "close" && !canClose) return;
    if (
      action === "reopen" &&
      !(await confirmDialog(
        "Reabrir este jogo? As missões de avaliação ficarão suspensas até ao próximo encerramento.",
      ))
    )
      return;
    if (
      action === "close" &&
      (!g.teamA.starters.length || !g.teamB.starters.length)
    )
      return toast("Adiciona pelo menos um titular em cada equipa.", "error");
    try {
      await busy(e.submitter, async () => {
        const f = new FormData(e.target),
          data = {
            title: f.get("title").trim(),
            location: f.get("location").trim(),
            notes: f.get("notes").trim(),
            youtubeVideoId: youtubeVideoId(f.get("youtubeUrl")),
            scheduledAt: parseLisbonDateInput(f.get("scheduledAt")),
            teamA: g.teamA,
            teamB: g.teamB,
            positions: matchPositions(g, ctx.league.players),
            performance: Object.fromEntries(
              ["teamA", "teamB"].map((side) => [
                side,
                Object.fromEntries(
                  ["goals", "assists"].map((key) => [
                    key,
                    [...g[side].starters, ...g[side].bench].flatMap((uid) => {
                      const count = performance.get(uid)?.[key] || 0;
                      if (!Number.isInteger(count) || count < 0 || count > 999)
                        throw Error(
                          "Introduz golos e assistências inteiros entre 0 e 999.",
                        );
                      return Array(count).fill(uid);
                    }),
                  ]),
                ),
              ]),
            ),
            score: {
              teamA: Number(f.get("scoreA")),
              teamB: Number(f.get("scoreB")),
            },
            status:
              action === "close"
                ? "closed"
                : action === "open"
                  ? "open"
                  : action === "draft"
                    ? "draft"
                    : g.status,
          };
        for (const side of ["teamA", "teamB"]) {
          if (
            data.performance[side].goals.length > data.score[side] ||
            data.performance[side].assists.length > data.score[side]
          )
            throw Error(
              `Os golos e assistências de Equipa ${side === "teamA" ? "A" : "B"} não podem ultrapassar o resultado da equipa.`,
            );
        }
        const gameId = await DB.saveGame(saved?.id, data, ctx.user);
        toast(
          action === "close"
            ? "Jogo encerrado."
            : saved
              ? "Jogo guardado."
              : "Jogo criado.",
        );
        await ctx.refresh();
        ctx.go(`#/game/${gameId}`);
      });
    } catch {}
  };
}
