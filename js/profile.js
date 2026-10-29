import { cardSelectionEntry } from "./card-selection-entry.js";
import { matchRatingSeries, matchAverageSummary, matchComponentAverages } from "./match-rating-summary.js";
import { weeklyComparison } from "./weekly-comparison.js";
import { trendArrow } from "./icons.js";
import { cardWeek } from "./card-week.js";
import { historyForDisplay } from "./card-history.js";
import {
  COUNTRIES,
  profileComplete,
  age,
  flag,
  ATTRIBUTES,
  formatDate,
  isoWeek,
} from "./utils.js";
import { ASSET_PATHS, safeImage } from "./assets.js";
import { card, bindImages, weeklyEvolution } from "./cards.js";
import { esc, empty, linkButton, pageHead, busy, toast, modal } from "./ui.js";
import { icon } from "./icons.js";
import * as DB from "./db.js";
import { communityReviewBanner } from "./community-review.js";
import {
  durationName,
  validCardSelection,
  CARD_POLICY,
} from "./card-achievements.js";
export function profileFields(p = {}) {
  return `<div class="form-grid"><label>Nome de jogador<input name="displayName" required maxlength="30" value="${esc(p.displayName || "")}"></label><label>País<select name="countryCode" required>${COUNTRIES.map(([c, n]) => `<option value="${c}" ${p.countryCode === c ? "selected" : ""}>${n}</option>`).join("")}</select></label><label>Data de nascimento<input name="birthDate" type="date" required max="${new Date().toISOString().slice(0, 10)}" value="${esc(p.birthDate || "")}"></label><label>Altura (cm)<input name="heightCm" type="number" required min="120" max="230" value="${p.heightCm || ""}"></label><label>Peso (kg) <span class="muted">opcional</span><input name="weightKg" type="number" min="30" max="250" step=".1" value="${p.weightKg || ""}"></label><label>Pé preferido<select name="preferredFoot" required><option value="">Escolher</option>${[
    ["right", "Direito"],
    ["left", "Esquerdo"],
    ["both", "Ambidestro"],
  ]
    .map(
      ([k, n]) =>
        `<option value="${k}" ${p.preferredFoot === k ? "selected" : ""}>${n}</option>`,
    )
    .join(
      "",
    )}</select></label><label>Posição preferida<select name="primaryPosition">${["GR", "DEF", "ALA", "MED", "AV"].map((v) => `<option ${p.primaryPosition === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Número favorito<input name="shirtNumber" type="number" min="0" max="99" value="${p.shirtNumber ?? ""}"></label><label>Cidade <span class="muted">opcional</span><input name="city" maxlength="60" value="${esc(p.city || "")}"></label><label>Estilo de jogador <span class="muted">opcional</span><input name="playerStyle" maxlength="80" value="${esc(p.playerStyle || "")}"></label><fieldset class="field-wide"><legend>Posições secundárias</legend>${["GR", "DEF", "ALA", "MED", "AV"].map((v) => `<label class="check-label"><input type="checkbox" name="secondaryPositions" value="${v}" ${p.secondaryPositions?.includes(v) ? "checked" : ""}> ${v}</label>`).join("")}</fieldset></div>`;
}
export function readProfile(form) {
  const f = new FormData(form),
    code = f.get("countryCode");
  const p = {
    displayName: String(f.get("displayName") || "").trim(),
    countryCode: code,
    country: COUNTRIES.find(([c]) => c === code)?.[1] || "",
    birthDate: f.get("birthDate"),
    heightCm: Number(f.get("heightCm")),
    weightKg: f.get("weightKg") ? Number(f.get("weightKg")) : null,
    preferredFoot: f.get("preferredFoot"),
    primaryPosition: f.get("primaryPosition"),
    secondaryPositions: f.getAll("secondaryPositions"),
    shirtNumber:
      f.get("shirtNumber") !== "" ? Number(f.get("shirtNumber")) : null,
    city: String(f.get("city") || "").trim(),
    playerStyle: String(f.get("playerStyle") || "").trim(),
    profileCompleted: true,
  };
  if (!profileComplete(p))
    throw Error("Preenche nome, país, nascimento, altura e pé preferido.");
  if (p.birthDate > new Date().toISOString().slice(0, 10))
    throw Error("A data de nascimento não pode ser futura.");
  return p;
}
export function photoField(p = {}) {
  return `<div class="avatar-editor"><img id="avatar-preview" src="${esc(safeImage(p.photoURL))}" alt="Pré-visualização da fotografia" data-fallback="${ASSET_PATHS.avatar}"><label class="camera-button" aria-label="Escolher fotografia">${icon("camera")}<input class="visually-hidden" name="avatar" type="file" accept="image/jpeg,image/png,image/webp"></label></div><p class="muted small">JPG, PNG ou WebP até 5 MB. Recorte quadrado e compressão automáticos.</p>`;
}
export function bindPhoto(form) {
  let objectURL;
  const input = form.querySelector("[name=avatar]");
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      toast("Escolhe uma imagem JPG, PNG ou WebP até 5 MB.", "error");
      input.value = "";
      return;
    }
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = URL.createObjectURL(file);
    form.querySelector("#avatar-preview").src = objectURL;
  };
  return () => {
    if (objectURL) URL.revokeObjectURL(objectURL);
  };
}
export async function editProfile(ctx, p = ctx.user) {
  ctx.render(
    `${pageHead("Perfil", "Editar perfil", "Atualiza a tua fotografia e os dados do perfil.")}<form id="profile-form" class="panel"><div class="profile-form-head">${photoField(p)}<p class="muted">@${esc(p.username)} · username permanente</p></div>${profileFields(p)}<div class="actions"><button class="btn btn-primary">${icon("check")}Guardar perfil</button>${linkButton("#/profile", "Cancelar", "secondary")}</div></form>`,
  );
  const form = document.querySelector("#profile-form");
  ctx.cleanup(bindPhoto(form));
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await busy(e.submitter, async () => {
        const data = readProfile(form),
          file = form.avatar.files[0];
        if (file) data.photoURL = await DB.uploadAvatar(p.uid, file);
        await DB.saveProfile(p.uid, data);
        toast("Perfil guardado.");
        await ctx.refresh();
        ctx.go(p.uid === ctx.user.uid ? "#/profile" : `#/player/${p.uid}`);
      });
    } catch {}
  };
}
export async function playerPage(ctx, uid) {
  const p = ctx.league.players.find((x) => x.uid === uid);
  if (!p)
    return ctx.render(
      empty(
        "Jogador não encontrado",
        "O perfil pode ter sido desactivado.",
        linkButton("#/players", "Ver jogadores", "secondary"),
        "players",
      ),
    );
  const [myRating, savedHistory] = await Promise.all([
    uid !== ctx.user.uid
      ? ctx.cached(`rating:${uid}`, () =>
          DB.read(`communityRatings/${ctx.user.uid}_${uid}`),
        )
      : null,
    ctx.cached(`history:${uid}`, () => DB.history(uid)),
  ]);
  const ratingAction =
    uid !== ctx.user.uid
      ? linkButton(
          `#/missions/new/${uid}`,
          myRating?.reviewState === "required" && myRating?.reviewGrantedAt ? "Rever a minha avaliação" : ["invalid", "ignored", "required"].includes(myRating?.reviewState) || myRating?.reviewAttempts >= 2 ? "Consultar a minha avaliação" : myRating?.submitted ? "Editar a minha avaliação" : "Avaliar jogador",
          "primary",
          "edit",
        )
      : linkButton(
          "#/missions/self",
          "Editar autoavaliação",
          "primary",
          "edit",
        );
  const own = uid === ctx.user.uid,
    history = historyForDisplay(p, savedHistory)
      .map((snapshot) => ({
        ...snapshot,
        ...weeklyComparison(snapshot, null, {
          rewards: ctx.league.eventRewards,
          uid: p.uid,
        }),
      }))
      .sort((a, b) => b.weekId.localeCompare(a.weekId)),
    s = p.matchStats,
    best = ATTRIBUTES.reduce((a, b) => (p.stats[b[0]] > p.stats[a[0]] ? b : a));
  const cardChoices = [
    { id: "base", name: "Carta normal", duration: "base" },
    ...new Map(p.specials.map((s) => [s.id, s])).values(),
  ];
  const collectionProof = p.specials
    .filter((choice) => choice.evidence?.length || choice.criterion)
    .map(
      (choice) =>
        `<details class="collection-proof"><summary>${esc(choice.name)} · Como foi conquistada</summary><p>${esc(choice.criterion || "")}</p>${choice.earnedAt ? `<p>Conquistada em ${formatDate(choice.earnedAt)}.</p>` : ""}${choice.eventId ? `<p><a href="#/event/${esc(choice.eventId)}">Ver evento</a></p>` : ""}<ul>${(
          choice.evidence || []
        )
          .map((id) => {
            const game = ctx.league.games.find((game) => game.id === id);
            return `<li>${game ? `<a href="#/game/${esc(id)}">${esc(game.title || "Ver jogo")}</a>` : "Jogo já indisponível"}</li>`;
          })
          .join("")}</ul></details>`,
    )
    .join("");
  const canChooseCard = own && p.hasCard && cardChoices.length > 1;
  const previousWeek = cardWeek(new Date(+cardWeek().opensAt - 1)).weekId;
  const reviewNotices = own
    ? (ctx.missions || []).filter(mission => mission.type === "COMMUNITY_RATING_REVIEW").map(mission => {
        const target = ctx.league.players.find(player => player.uid === mission.href.split("/").at(-1));
        return communityReviewBanner(target?.displayName || target?.username || "este jogador",{reviewState:"required",reviewGrantedAt:true},mission.href);
      }).join("")
    : communityReviewBanner(p.displayName || p.username,myRating,`#/missions/new/${uid}`);
  const attributePrevious = history.find((h) => h.weekId === previousWeek);
  const previous = attributePrevious;
  Object.assign(
    p,
    weeklyComparison(p, previous, {
      rewards: ctx.league.eventRewards,
      uid: p.uid,
      date: new Date(),
    }),
  );
  const growth =
    p.previousStats && p.permanentStats
      ? ATTRIBUTES.map(([key, name]) => ({
          name,
          delta: p.permanentStats[key] - p.previousStats[key],
        })).sort((a, b) => b.delta - a.delta)[0]
      : null;
  ctx.render(
    `${pageHead(own ? "A minha carta" : "Perfil do jogador", p.displayName || p.username, `@${p.username} · ${p.country || ""}`, own || ctx.user.role === "admin" ? linkButton(own ? "#/profile/edit" : `#/admin/player/${p.uid}/edit`, "Editar perfil", "secondary", "edit") : "")}${ratingAction || ctx.user.role === "admin" ? `<div class="actions profile-actions">${ratingAction}${own ? linkButton("#/missions/path", "Escolhe o teu caminho!", "secondary", "path") : ""}${ctx.user.role === "admin" ? linkButton(`#/admin/ovr/${p.uid}`, "Cálculo OVR", "secondary", "lab") + linkButton(`#/admin/card-photo/${p.uid}`, "Editar foto de carta", "secondary", "camera") : ""}</div>` : ""}${reviewNotices}${canChooseCard ? cardSelectionEntry(p, { profile: true }) : ""}<div class="player-hero"><div class="card-stage">${card(p, { size: "lg" })}${weeklyEvolution(p)}<span class="pill ${p.official ? "success" : "warning"}">${p.cardLocked ? `Semana fechada · Reabre ${new Intl.DateTimeFormat("pt-PT",{timeZone:"Europe/Lisbon",weekday:"long",hour:"2-digit",minute:"2-digit"}).format(cardWeek().nextOpensAt)}` : p.hasCard ? (p.official ? "Carta oficial" : "Carta provisória") : "À espera de autoavaliação"}</span></div><div><p class="eyebrow">Dentro de campo</p><h2>${flag(p.countryCode)} ${esc(p.country || "")}</h2>${p.inactivity?.penalty ? `<p class="pill warning">${p.inactivity.missed} jogos sem participar · −${p.inactivity.penalty} OVR</p>` : ""}<div class="player-facts">${[
      ["Idade", `${age(p.birthDate)} anos`],
      ["Altura", p.heightCm ? `${p.heightCm} cm` : "—"],
      ["Peso", p.weightKg ? `${p.weightKg} kg` : "—"],
      [
        "Pé",
        { right: "Direito", left: "Esquerdo", both: "Ambidestro" }[
          p.preferredFoot
        ] || "—",
      ],
      ["Posição", p.primaryPosition || "—"],
      ["Número", p.shirtNumber != null ? `#${p.shirtNumber}` : "—"],
    ]
      .map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`)
      .join(
        "",
      )}</div><p class="muted">${esc(p.secondaryPositions?.join(" · ") || "")} ${esc(p.playerStyle || "")}</p><div class="metrics">${[
      ["OVR", p.ovr],
      [
        "Últimos 5",
        matchRatingSeries(p.aggregates.slice(-5)),
      ],
      ["Melhor atributo", best[1]],
      ["Avaliações recebidas · 0–20", p.communityCount],
      [
        "Em crescimento",
        growth?.delta > 0 ? `${growth.name} +${growth.delta}` : "Estável",
      ],
      [
        "Evolução OVR permanente",
        Number.isFinite(p.ovrDelta)
          ? `${p.ovrDelta >= 0 ? "+" : ""}${p.ovrDelta} esta semana`
          : "Primeira semana",
      ],
    ]
      .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`)
      .join(
        "",
      )}</div></div></div><section class="panel"><div class="section-head"><h2>Os 12 atributos</h2><span class="muted">Escala 0–99 · Variação dos atributos permanentes</span></div><p class="muted weekly-comparison-note">As setas comparam os atributos e o OVR permanentes entre semanas. Bónus temporários não contam; recompensas permanentes contam. Os valores da carta incluem os bónus ativos.</p><div class="attribute-grid">${ATTRIBUTES.map(([k, n]) => `<div><span>${n}</span><span class="attribute-value"><b>${p.stats[k]}</b>${attributeChange(p.permanentStats?.[k], p.previousStats?.[k])}</span><div class="progress"><span style="--progress:${p.stats[k]}%"></span></div></div>`).join("")}</div></section><section><div class="section-head"><h2>Estatísticas</h2></div><div class="metrics stats-metrics">${[
      ["Jogos", s.played],
      ["Vitórias", s.wins],
      ["Empates", s.draws],
      ["Derrotas", s.losses],
      ["Vitórias %", s.winRate + "%"],
      ["Golos", s.goals],
      ["Assistências", s.assists],
      ["Golos da equipa", s.goalsFor],
      ["Golos sofridos", s.goalsAgainst],
      ["Diferença", s.goalDifference],
    ]
      .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`)
      .join(
        "",
      )}</div></section><section><h2>Forma recente</h2><div class="form-strip">${
      p.aggregates
        .slice(-5)
        .map(
          (g) =>
            `<a href="#/game/${g.gameId}" class="form-score"><b>${matchAverageSummary(matchComponentAverages(g))}</b><small>${formatDate(g.date)}</small></a>`,
        )
        .join("") ||
      empty(
        "O próximo jogo conta",
        "A tua forma aparecerá quando receberes avaliações.",
        "",
        "games",
      )
    }</div></section><section><h2>Cartas especiais</h2>${p.specials.length ? `<div class="special-grid">${p.specials.map((sp) => `<div class="special-badge ${sp.id}">${icon("trophy")}<b>${esc(sp.name)}</b><small>${esc(sp.attribute || "Desbloqueada")}</small></div>`).join("")}</div>` : empty("Ainda sem cartas especiais", "As cartas especiais que receberes aparecem aqui.", "", "trophy")}</section><section><h2>Evolução semanal</h2>${historyStrip(p, history)}</section><section><h2>Últimos jogos</h2>${
      p.matches.length
        ? `<div class="game-list">${p.matches
            .slice(0, 5)
            .map(
              (g) =>
                `<a href="#/game/${g.id}" class="game-row"><span>${icon("games")}</span><div><b>${esc(g.title)}</b><small>${formatDate(g.scheduledAt)}</small></div><strong>${g.status === "closed" ? `${g.score.teamA} — ${g.score.teamB}` : "Agendado"}</strong></a>`,
            )
            .join("")}</div>`
        : empty(
            "Ainda sem jogos",
            "Entra numa equipa na próxima Peladinha.",
            linkButton("#/games", "Ver jogos", "secondary"),
            "games",
          )
    }</section>`,
  );
  document
    .querySelector("#choose-weekly-card")
    ?.addEventListener("click", () => {
      const selected = validCardSelection(p.selectedCardId, p.specials);
      const close = modal(
        "Escolher carta",
        `<p>Escolhe a carta normal ou uma especial disponível. As conquistas permanentes ficam na tua coleção. Ao expirar uma carta, voltas à carta normal.</p><div class="weekly-card-choices">${cardChoices.map((choice) => `<button type="button" class="weekly-card-choice" data-select-card="${esc(choice.id)}" aria-pressed="${choice.id === selected}" aria-label="Escolher ${esc(choice.name)}">${card(p, { size: "sm", preview: true, theme: choice.id === "base" ? p.cardType : choice.id })}<strong>${esc(choice.name)}</strong><small>${choice.id === "base" ? "Sempre disponível" : `${durationName(choice.duration || CARD_POLICY[choice.themeId || choice.id]?.duration)}${choice.expiresAt ? ` · Até ${formatDate(choice.expiresAt)}` : ""}`}</small><span>${choice.id === selected ? "✓ Selecionada" : "Escolher esta carta"}</span></button>`).join("")}</div>${collectionProof}`,
      );
      const root = document.querySelector("#modal-root");
      bindImages(root);
      const buttons = [...root.querySelectorAll("[data-select-card]")];
      buttons.forEach((button) => {
        button.onclick = async () => {
          buttons.forEach((item) => {
            item.disabled = true;
          });
          try {
            await busy(button, async () => {
              await DB.callAdmin("selectWeeklyCard", {
                weekId: cardWeek().weekId,
                cardId: button.dataset.selectCard,
              });
              close();
              toast("Carta selecionada.");
              await ctx.refresh();
              ctx.go(`#/player/${uid}`);
            });
          } catch {
          } finally {
            buttons.forEach((item) => {
              item.disabled = false;
            });
          }
        };
      });
    });
  if (canChooseCard && location.hash === "#/profile/cards") {
    document.querySelector("#choose-weekly-card")?.click();
  }
  document.querySelectorAll("[data-history-week]").forEach((button) => {
    button.onclick = () => {
      const snapshot = history.find(
        (h) => h.weekId === button.dataset.historyWeek,
      );
      modal(
        `Carta · ${snapshot.weekId}`,
        `<div class="history-card-expanded">${card(historicalPlayer(p, snapshot, history[history.indexOf(snapshot) + 1]), { size: "lg", preview: true })}</div>${ctx.user.role === "admin" ? linkButton(`#/admin/ovr/${p.uid}/${snapshot.weekId}`, "Cálculo desta carta", "secondary", "lab") : ""}`,
      );
      bindImages(document.querySelector("#modal-root"));
    };
  });
}
function historyStrip(player, history) {
  const slots = Array.from(
    { length: Math.max(5, history.length) },
    (_, index) => {
      const snapshot = history[index];
      if (!snapshot)
        return `<div class="history-card-button history-placeholder panel"><span class="history-week">Semana por registar</span><div class="history-empty-card" aria-hidden="true">${icon("games")}</div><span class="history-card-hint">Ainda sem carta</span></div>`;
      return `<button type="button" class="history-card-button panel" data-history-week="${esc(snapshot.weekId)}" aria-label="Ampliar carta da semana ${esc(snapshot.weekId)}"><span class="history-week">${esc(snapshot.weekId)} · ${snapshot.locked ? "Fechada" : "Em evolução"}</span>${card(historicalPlayer(player, snapshot, history[index + 1]), { size: "sm", preview: true })}<span class="history-card-hint">Ver carta ampliada</span></button>`;
    },
  ).join("");
  return `<p class="muted small">${history.length} ${history.length === 1 ? "semana guardada" : "semanas guardadas"}. Desliza horizontalmente para percorrer o histórico.</p><div class="history-grid" tabindex="0" role="region" aria-label="Histórico de cartas semanal, deslocação horizontal">${slots}</div>`;
}
export function historicalPlayer(player, snapshot, previous) {
  return {
    ...player,
    ...snapshot.appearance,
    stats: snapshot.stats || {},
    selectedCardId: snapshot.selectedCardId || null,
    ...weeklyComparison(snapshot, previous, { uid: player.uid }),
    cardPhoto: snapshot.cardPhoto || null,
    primaryPosition: snapshot.primaryPosition ?? player.primaryPosition,
    ovr: snapshot.ovr,
    cardType: snapshot.baseCard,
    specials: snapshot.specials || [],
    official: snapshot.official,
    hasCard: true,
  };
}

function attributeChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous))
    return '<small class="attribute-change is-neutral" title="Sem valores permanentes da semana anterior para comparar">—</small>';
  const delta = Math.round((current - previous) * 100) / 100;
  const amount = Math.abs(delta).toLocaleString("pt-PT", {
    maximumFractionDigits: 2,
  });
  const description =
    delta > 0
      ? `Subiu ${amount}`
      : delta < 0
        ? `Desceu ${amount}`
        : "Sem alteração";
  return `<small class="attribute-change ${delta > 0 ? "is-positive" : delta < 0 ? "is-negative" : "is-neutral"}" aria-label="${description} nos atributos permanentes face à carta da semana anterior" title="${description} nos atributos permanentes face à carta da semana anterior">${delta ? trendArrow(delta) : '<span aria-hidden="true">=</span>'} ${delta > 0 ? "+" : delta < 0 ? "−" : ""}${amount}</small>`;
}
