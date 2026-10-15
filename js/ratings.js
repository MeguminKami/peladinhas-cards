import * as DB from "./db.js";
import {
  ATTRIBUTES,
  FEEDBACK,
  completeInitial,
  completeFeedback,
  participants,
} from "./utils.js";
import { pageHead, esc, empty, linkButton, toast, busy } from "./ui.js";
import { icon } from "./icons.js";
import { safeImage, ASSET_PATHS } from "./assets.js";
// Uma fila por formulário: nunca deixa uma gravação antiga ultrapassar a mais recente.
function autosave(ctx, form, save, onComplete) {
  let timer,
    queue = Promise.resolve(),
    dirty = false;
  const state = form.querySelector(".save-state");
  const enqueue = () => {
    if (!dirty) return queue;
    dirty = false;
    const values = readRatings(form);
    state.textContent = "A guardar…";
    queue = queue
      .catch(() => {})
      .then(() => save(values))
      .then(() => {
        state.textContent = "Guardado";
        state.className = "save-state success";
      })
      .catch((error) => {
        dirty = true;
        state.textContent = "Erro ao guardar — tenta novamente";
        state.className = "save-state error";
        toast(error.message, "error");
      });
    return queue;
  };
  form.addEventListener("input", () => {
    dirty = true;
    state.textContent = "A guardar…";
    clearTimeout(timer);
    timer = setTimeout(enqueue, 450);
  });
  form.querySelector("[data-save]")?.addEventListener("click", async () => {
    clearTimeout(timer);
    dirty = true;
    await enqueue();
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    clearTimeout(timer);
    await enqueue();
    try {
      await busy(e.submitter, async () => {
        await save(readRatings(form), true);
        toast("Avaliação concluída.");
        await onComplete();
      });
    } catch {}
  };
  ctx.cleanup(() => {
    clearTimeout(timer);
    return enqueue();
  });
}
function readRatings(form) {
  const r = {};
  form.querySelectorAll("[data-rating]").forEach((input) => {
    const k = input.dataset.rating;
    if (input.value === "") return;
    r[k] = input.value === "na" ? null : Number(input.value);
  });
  return r;
}
function initialForm(title, values, submitted = false) {
  return `<form class="panel rating-form"><div class="section-head"><h2>${esc(title)}</h2><span class="save-state" aria-live="polite">${submitted ? "Concluída" : "Guardado"}</span></div><p class="muted">Preenche cada atributo de 0 a 20. Zero também é uma avaliação válida.</p><div class="rating-sliders">${ATTRIBUTES.map(([k, n]) => `<div class="rating-row"><label for="${k}-number">${n}</label><input type="range" min="0" max="20" value="${values[k] ?? 0}" aria-label="${n}" data-slider="${k}" ${submitted ? "disabled" : ""}><input id="${k}-number" type="number" min="0" max="20" step="1" data-rating="${k}" value="${values[k] ?? 0}" placeholder="—" aria-label="${n}, valor" ${submitted ? "disabled" : ""}></div>`).join("")}</div><div class="section-head"><span class="rating-progress">${Object.keys(values).length} / 12</span>${submitted ? "" : `<div class="actions"><button type="button" data-save class="btn btn-secondary">Guardar agora</button><button class="btn btn-primary">${icon("check")}Concluir</button></div>`}</div></form>`;
}
export async function initialMission(ctx, targetId, adminInitial = false) {
  const self = adminInitial || !targetId;
  if (!adminInitial && targetId === ctx.user.uid)
    throw Error("Não podes avaliar-te nesta missão.");
  const player = ctx.league.players.find(
    (p) => p.uid === (targetId || ctx.user.uid),
  );
  if (!player)
    return ctx.render(
      empty(
        "Jogador não encontrado",
        "Volta à lista de missões.",
        linkButton("#/missions", "Missões", "secondary"),
      ),
    );
  const saved = await DB.read(
      self
        ? `initialRatings/${targetId || ctx.user.uid}`
        : `communityRatings/${ctx.user.uid}_${targetId}`,
    ),
    values = {
      ...Object.fromEntries(ATTRIBUTES.map(([key]) => [key, 0])),
      ...(saved?.ratings20 || {}),
    };
  ctx.render(
    `${pageHead(self ? "A minha primeira carta" : "Avaliação da comunidade", self ? "Conhece o teu jogo" : `Avaliar ${player.displayName || player.username}`, "As alterações são guardadas automaticamente.", linkButton("#/missions", "Todas as missões", "ghost"))}${initialForm(self ? "Autoavaliação" : "Ajuda a criar a primeira carta", values, false)}`,
  );
  const form = document.querySelector("form");
  form.querySelectorAll("[data-slider]").forEach(
    (slider) =>
      (slider.oninput = () => {
        const n = form.querySelector(`[data-rating=${slider.dataset.slider}]`);
        n.value = slider.value;
        form.querySelector(".rating-progress").textContent =
          `${Object.keys(readRatings(form)).length} / 12`;
      }),
  );
  form.querySelectorAll("[data-rating]").forEach(
    (n) =>
      (n.oninput = () => {
        const slider = form.querySelector(`[data-slider=${n.dataset.rating}]`);
        slider.value = n.value;
        form.querySelector(".rating-progress").textContent =
          `${Object.keys(readRatings(form)).length} / 12`;
      }),
  );

  autosave(
    ctx,
    form,
    async (r, submit = false) => {
      if (submit && !completeInitial(r))
        throw Error("Preenche os 12 atributos, entre 0 e 20.");
      if (self) await DB.saveInitial(targetId || ctx.user.uid, r);
      else await DB.saveCommunity(ctx.user.uid, targetId, r, submit);
    },
    async () => {
      await ctx.refresh();
      ctx.go(adminInitial ? "#/admin" : "#/missions");
    },
  );
}
const feedbackHints = {
  overall: "O desempenho neste jogo, no seu conjunto.",
  attack: "Finalização, decisões e contribuição no ataque.",
  passing: "Qualidade do passe, apoio e jogo de equipa.",
  defense: "Marcação, posicionamento e recuperação da bola.",
  physical: "Intensidade, esforço e resistência.",
  goalkeeping: "Escolhe N/A se não jogou à baliza.",
  attitude: "Respeito, cooperação e reação às dificuldades.",
};
export async function feedbackPage(ctx, gid) {
  const g = ctx.league.games.find((g) => g.id === gid);
  if (!g || g.status !== "closed" || !participants(g).includes(ctx.user.uid))
    return ctx.render(
      empty(
        "Avaliação indisponível",
        "Podes avaliar os teus colegas depois de o jogo terminar.",
        linkButton("#/games", "Ver jogos", "secondary"),
      ),
    );
  const existing = await DB.myFeedback(gid, ctx.user.uid),
    targets = [...new Set(participants(g))].filter(
      (uid) => uid !== ctx.user.uid,
    );
  const completed = targets.filter((uid) =>
    existing.some((f) => f.targetId === uid && f.submitted),
  ).length;
  const firstPending = targets.find(
    (uid) => !existing.some((f) => f.targetId === uid && f.submitted),
  );
  ctx.render(`${pageHead("Pós-jogo", `Avaliar ${g.title}`, "Avalia o desempenho dos teus colegas neste jogo.", linkButton(`#/game/${gid}`, "Ver jogo", "ghost"))}
    <div class="feedback-workspace content-stack">
    <section class="panel feedback-overview"><div class="section-head"><div><span class="eyebrow">AVALIAÇÕES</span><h2>${completed === targets.length && targets.length ? "Tudo enviado" : "A tua avaliação conta"}</h2></div><span class="pill ${completed === targets.length && targets.length ? "success" : ""}">${completed} / ${targets.length} enviadas</span></div>
      <div class="progress" role="progressbar" aria-label="Avaliações enviadas" aria-valuemin="0" aria-valuemax="${targets.length || 1}" aria-valuenow="${completed}"><span style="--progress:${targets.length ? Math.round((completed / targets.length) * 100) : 0}%"></span></div>
      <p class="muted">Os rascunhos são guardados automaticamente. Depois de enviada, a avaliação fica concluída.</p>
      <details class="feedback-guide"><summary>Como avaliar</summary><p>Escolhe de 0 a 5 estrelas em cada dimensão. Usa N/A em guarda-redes se o colega não jogou à baliza. As respostas não são mostradas aos outros jogadores.</p><div class="feedback-scale">${["Muito fraco", "Fraco", "Razoável", "Bom", "Muito bom", "Excelente"].map((label, value) => `<span><b>${value}</b>${label}</span>`).join("")}</div></details>
    </section>
    <div class="feedback-grid">${
      targets
        .map((uid) => {
          const p = ctx.league.users.find((x) => x.uid === uid),
            f = existing.find((x) => x.targetId === uid);
          const displayName = p?.displayName || p?.username || "Jogador";
          const ownA = [
            ...(g.teamA?.starters || []),
            ...(g.teamA?.bench || []),
          ].includes(uid);
          return `<details class="panel feedback-review ${f?.submitted ? "feedback-completed" : ""}" ${uid === firstPending || (!firstPending && uid === targets[0]) ? "open" : ""}>
      <summary class="feedback-player"><img src="${esc(safeImage(p?.photoURL))}" alt="" data-fallback="${ASSET_PATHS.avatar}" width="44" height="44"><span class="feedback-player-name"><strong>${esc(displayName)}</strong><small>${ownA ? "Team A" : "Team B"}</small></span><span class="pill feedback-status ${f?.submitted ? "success" : ""}">${f?.submitted ? "Enviada" : f ? "Rascunho" : "Por avaliar"}</span><span class="feedback-toggle" aria-hidden="true">${icon("arrow")}</span></summary>
      <form class="rating-form feedback-form" data-target="${esc(uid)}" aria-label="Avaliar ${esc(displayName)}"><div class="feedback-form-status"><span class="save-state" role="status">${f?.submitted ? "Concluída" : f ? "Guardado" : "Por avaliar"}</span></div><div class="feedback-fields">${FEEDBACK.map(([k, n]) => `<label class="feedback-field"><span>${esc(n.replace("colectivo", "coletivo"))}</span><small>${feedbackHints[k]}</small><select data-rating="${k}" aria-label="${esc(n)}" ${f?.submitted ? "disabled" : ""}>${k === "attitude" && f?.submitted && f.ratings?.attitude == null ? '<option value="" selected>Sem avaliação</option>' : ""}${k === "goalkeeping" ? `<option value="na" ${f?.ratings?.[k] === null ? "selected" : ""}>N/A — não jogou à baliza</option>` : ""}${[0, 1, 2, 3, 4, 5].map((v) => `<option value="${v}" ${f?.ratings?.[k] === v || (f?.ratings?.[k] === undefined && v === 0 && !(k === "attitude" && f?.submitted)) ? "selected" : ""}>${v} ${v === 1 ? "estrela" : "estrelas"}</option>`).join("")}</select></label>`).join("")}</div>${f?.submitted ? '<div class="feedback-sent"><span class="pill success">Avaliação enviada</span></div>' : '<div class="actions feedback-actions"><button type="button" data-save class="btn btn-secondary">Guardar rascunho</button><button class="btn btn-primary">Enviar avaliação</button></div>'}</form></details>`;
        })
        .join("") ||
      empty(
        "Não há colegas para avaliar",
        "Este jogo só tem um participante.",
        "",
        "players",
      )
    }</div></div>`);
  const reviews = [...document.querySelectorAll(".feedback-review")];
  reviews.forEach((review) =>
    review.addEventListener("toggle", () => {
      if (review.open)
        reviews.forEach((other) => {
          if (other !== review) other.open = false;
        });
    }),
  );
  document.querySelectorAll(".feedback-form").forEach((form) => {
    const target = form.dataset.target;
    if (existing.some((f) => f.targetId === target && f.submitted)) return;
    form.addEventListener("input", () => {
      form
        .closest(".feedback-review")
        .querySelector(".feedback-status").textContent = "Rascunho";
    });
    autosave(
      ctx,
      form,
      (r, submit) => {
        if (submit && !completeFeedback(r))
          throw Error(
            "Avalia todas as dimensões. Para guarda-redes, podes escolher N/A.",
          );
        return DB.saveFeedback(gid, ctx.user.uid, target, r, submit);
      },
      async () => {
        await ctx.refresh();
        ctx.go(`#/game/${gid}/feedback`);
      },
    );
  });
}
