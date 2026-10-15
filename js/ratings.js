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
  goalkeeping: "Avalia só se o jogador esteve à baliza.",
  attitude: "Respeito, cooperação e reação às dificuldades.",
};
const feedbackScale = [
  "Muito fraco",
  "Fraco",
  "Razoável",
  "Bom",
  "Muito bom",
  "Excelente",
];
const feedbackStar =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.9 9.4l6.3-.9Z"/></svg>';
function feedbackField(uid, key, name, saved, submitted, index) {
  const raw = saved?.[key];
  const value =
    raw === null
      ? key === "goalkeeping"
        ? "na"
        : ""
      : Number.isFinite(raw)
        ? String(raw)
        : "";
  const choice = (score, content, className) =>
    `<label class="${className}${value === score ? " is-selected" : ""}" data-value="${score}"><input class="visually-hidden" type="radio" name="rating-${key}" value="${score}" data-feedback-choice ${value === score ? "checked" : ""} ${submitted ? "disabled" : "required"} aria-label="${score === "na" ? "Não jogou à baliza" : `${score} ${score === "1" ? "estrela" : "estrelas"} — ${feedbackScale[Number(score)]}`}">${content}</label>`;
  return `<fieldset class="feedback-field" data-dimension="${key}" data-score="${value}" aria-describedby="feedback-${uid}-${key}-hint"><legend class="visually-hidden">${esc(name)}</legend><div class="feedback-dimension"><span class="feedback-dimension-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><div><span class="feedback-dimension-name">${esc(name.replace("colectivo", "coletivo"))}</span><small id="feedback-${uid}-${key}-hint">${feedbackHints[key]}</small><span class="feedback-rating-result" aria-live="polite">${value === "na" ? "Não aplicável" : value === "" ? (submitted ? "Sem avaliação" : "Por avaliar") : `${value}/5 · ${feedbackScale[Number(value)]}`}</span></div></div><div class="feedback-rating"><input type="hidden" data-rating="${key}" value="${value}"><div class="feedback-stars" aria-label="Escolher estrelas">${[1, 2, 3, 4, 5].map((score) => choice(String(score), feedbackStar, "feedback-star")).join("")}</div><div class="feedback-rating-extras">${choice("0", "<span>0 estrelas</span>", "feedback-zero")}${key === "goalkeeping" ? choice("na", "<span>Não jogou à baliza</span>", "feedback-na") : ""}</div></div></fieldset>`;
}
function bindFeedbackStars(form) {
  form.querySelectorAll(".feedback-field").forEach((field) => {
    const input = field.querySelector("[data-rating]");
    const paint = (value) => {
      field.querySelectorAll(".feedback-star").forEach((star) => {
        star.classList.toggle(
          "is-filled",
          value !== "" &&
            value !== "na" &&
            Number(star.dataset.value) <= Number(value),
        );
      });
    };
    const sync = () => {
      const value = input.value;
      field.dataset.score = value;
      field
        .querySelectorAll("label[data-value]")
        .forEach((label) =>
          label.classList.toggle("is-selected", label.dataset.value === value),
        );
      field.querySelector(".feedback-rating-result").textContent =
        value === "na"
          ? "Não aplicável"
          : value === ""
            ? form.dataset.submitted === "true"
              ? "Sem avaliação"
              : "Por avaliar"
            : `${value}/5 · ${feedbackScale[Number(value)]}`;
      paint(value);
    };
    field.addEventListener("input", (event) => {
      if (!event.target.matches("[data-feedback-choice]")) return;
      input.value = event.target.value;
      sync();
      form.querySelector("[data-rating-count]").textContent =
        `${Object.keys(readRatings(form)).length} / ${FEEDBACK.length} dimensões`;
    });
    field.querySelectorAll(".feedback-star").forEach((star) => {
      star.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "mouse" && form.dataset.submitted !== "true")
          paint(star.dataset.value);
      });
    });
    field
      .querySelector(".feedback-stars")
      .addEventListener("pointerleave", () => paint(input.value));
    sync();
  });
}
export async function feedbackPage(ctx, gid) {
  const g = ctx.league.games.find((g) => g.id === gid);
  if (!g || g.status !== "closed" || !participants(g).includes(ctx.user.uid))
    return ctx.render(
      empty(
        "Avaliação indisponível",
        "Podes avaliar os teus colegas depois de o jogo terminar.",
        linkButton("#/games", "Ver jogos", "secondary"),
        "games",
      ),
    );
  const existing = await DB.myFeedback(gid, ctx.user.uid);
  const targets = [...new Set(participants(g))].filter(
    (uid) => uid !== ctx.user.uid,
  );
  const isCompleted = (uid) =>
    existing.some((f) => f.targetId === uid && f.submitted);
  const completed = targets.filter(isCompleted).length;
  const firstPending = targets.find((uid) => !isCompleted(uid));
  const teams = ["A", "B"]
    .map((side) => {
      const team = g[`team${side}`];
      const players = targets.filter((uid) =>
        [...(team?.starters || []), ...(team?.bench || [])].includes(uid),
      );
      return {
        side,
        players,
        completed: players.filter(isCompleted).length,
        own: [...(team?.starters || []), ...(team?.bench || [])].includes(
          ctx.user.uid,
        ),
      };
    })
    .filter((team) => team.players.length);
  function playerReview(uid, team) {
    const p = ctx.league.users.find((p) => p.uid === uid);
    const f = existing.find((f) => f.targetId === uid);
    const submitted = !!f?.submitted;
    const name = p?.displayName || p?.username || "Jogador";
    const selectedCount = FEEDBACK.filter(
      ([key]) =>
        Number.isFinite(f?.ratings?.[key]) ||
        (key === "goalkeeping" && f?.ratings?.[key] === null),
    ).length;
    const bench = g[`team${team.side}`]?.bench?.includes(uid);
    return `<details name="match-feedback" class="panel feedback-review ${submitted ? "feedback-completed" : ""}" ${uid === firstPending || (!firstPending && uid === targets[0]) ? "open" : ""}>
      <summary class="feedback-player"><span class="feedback-avatar"><img src="${esc(safeImage(p?.photoURL))}" alt="" data-fallback="${ASSET_PATHS.avatar}" width="48" height="48"><i aria-hidden="true">${team.side}</i></span><span class="feedback-player-name"><strong>${esc(name)}</strong><small>${esc(p?.primaryPosition || "Jogador")} · ${bench ? "Suplente" : "Titular"}</small></span><span class="pill feedback-status ${submitted ? "success" : ""}">${submitted ? "Enviada" : f ? "Rascunho" : "Por avaliar"}</span><span class="feedback-toggle" aria-hidden="true">${icon("arrow")}</span></summary>
      <form class="rating-form feedback-form" data-target="${esc(uid)}" data-submitted="${submitted}" aria-label="Avaliar ${esc(name)}"><div class="feedback-form-status"><span data-rating-count>${selectedCount} / ${FEEDBACK.length} dimensões</span><span class="save-state" role="status">${submitted ? "Concluída" : f ? "Guardado" : "Escolhe as estrelas"}</span></div><div class="feedback-fields">${FEEDBACK.map(([key, label], index) => feedbackField(uid, key, label, f?.ratings, submitted, index)).join("")}</div>${submitted ? '<div class="feedback-sent"><span class="pill success">Avaliação enviada</span></div>' : '<div class="actions feedback-actions"><button type="button" data-save class="btn btn-secondary">Guardar rascunho</button><button class="btn btn-primary">Enviar avaliação</button></div>'}</form></details>`;
  }
  ctx.render(`${pageHead("Pós-jogo", `Avaliar ${g.title}`, "Escolhe as estrelas para cada jogador. Cinco estrelas é a avaliação máxima.", linkButton(`#/game/${gid}`, "Ver jogo", "ghost"))}
    <div class="feedback-workspace content-stack"><section class="panel feedback-overview"><div class="section-head"><div><span class="eyebrow">AVALIAÇÃO DO JOGO</span><h2>${completed === targets.length && targets.length ? "Tudo enviado" : "O jogo, pela tua perspetiva"}</h2></div><span class="pill ${completed === targets.length && targets.length ? "success" : ""}">${completed} / ${targets.length} enviadas</span></div><div class="progress" role="progressbar" aria-label="Avaliações enviadas" aria-valuemin="0" aria-valuemax="${targets.length || 1}" aria-valuenow="${completed}"><span style="--progress:${targets.length ? Math.round((completed / targets.length) * 100) : 0}%"></span></div><p>Os rascunhos ficam guardados. As avaliações enviadas ficam concluídas e as respostas individuais não são mostradas aos outros jogadores.</p><div class="feedback-team-shortcuts">${teams.map((team) => `<button type="button" class="feedback-team-shortcut feedback-team-${team.side.toLowerCase()}" data-feedback-team="${team.side}"><span>Equipa ${team.side}</span><small>${team.own ? "A tua equipa" : "Adversários"} · ${team.completed}/${team.players.length} enviadas</small>${icon("arrow")}</button>`).join("")}</div><details class="feedback-guide"><summary>Como usar a escala</summary><p>Toca numa estrela para preencher todas até à escolhida. Usa 0 estrelas para a classificação mínima e «Não jogou à baliza» quando guarda-redes não se aplica.</p><div class="feedback-scale">${feedbackScale.map((label, value) => `<span><b>${value}</b>${label}</span>`).join("")}</div></details></section>
    <div class="feedback-grid">${teams.map((team) => `<section class="feedback-team feedback-team-${team.side.toLowerCase()}" id="feedback-team-${team.side}" aria-labelledby="feedback-team-heading-${team.side}"><div class="feedback-team-heading"><span class="feedback-team-letter" aria-hidden="true">${team.side}</span><div><p>${team.own ? "A tua equipa" : "Equipa adversária"}</p><h2 id="feedback-team-heading-${team.side}" tabindex="-1">Equipa ${team.side}</h2></div><span class="feedback-team-count">${team.completed}<span> / ${team.players.length} enviadas</span></span></div><div class="feedback-team-players">${team.players.map((uid) => playerReview(uid, team)).join("")}</div></section>`).join("") || empty("Não há colegas para avaliar", "Este jogo só tem um participante.", "", "players")}</div></div>`);
  document.querySelectorAll("[data-feedback-team]").forEach((button) => {
    button.onclick = () => {
      const heading = document.querySelector(
        `#feedback-team-heading-${button.dataset.feedbackTeam}`,
      );
      heading.focus({ preventScroll: true });
      heading.closest(".feedback-team").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    };
  });
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
    bindFeedbackStars(form);
    const target = form.dataset.target;
    if (form.dataset.submitted === "true") return;
    form.addEventListener("input", () => {
      form
        .closest(".feedback-review")
        .querySelector(".feedback-status").textContent = "Rascunho";
    });
    autosave(
      ctx,
      form,
      (ratings, submit) => {
        if (submit && !completeFeedback(ratings))
          throw Error(
            "Avalia todas as dimensões. Para guarda-redes, podes escolher «Não jogou à baliza».",
          );
        return DB.saveFeedback(gid, ctx.user.uid, target, ratings, submit);
      },
      async () => {
        await ctx.refresh();
        ctx.go(`#/game/${gid}/feedback`);
      },
    );
  });
}
