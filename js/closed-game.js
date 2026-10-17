import * as DB from "./db.js";
import { card, bindImages } from "./cards.js";
import { matchStars } from "./match-stars.js";
import { bindMatchRatingDetails } from "./match-rating-details.js";
import { formatMatchDate } from "./match-time.js";
import { participants, matchPerformance, FEEDBACK } from "./utils.js";
import { esc, pageHead, linkButton, toast } from "./ui.js";
import { icon } from "./icons.js";
import { youtubePlayer } from "./youtube.js";
import { balanceMatches } from "./team-balance.js";

export function closedGamePage(ctx, game) {
  if (!game.cardWeekId && !game._cardsRequested) {
    game._cardsRequested = true;
    DB.callAdmin("ensureGameCards", {gameId:game.id}).then(result => {
      Object.assign(game, result.data || result);
      if (document.querySelector("#share-closed-game") && location.hash.includes(game.id)) closedGamePage(ctx, game);
    }).catch(() => { game._cardsRequested = false; });
  }
  const frozen = ctx.league.balances?.find(
    (row) => row.id === game.id && balanceMatches(game, row),
  );
  const ratings =
    ctx.league.summaries?.find((row) => row.id === game.id)?.players || {};
  const score = game.score || { teamA: 0, teamB: 0 };
  const draw = score.teamA === score.teamB;
  const winner = draw ? null : score.teamA > score.teamB ? "teamA" : "teamB";
  const teamName = (side) => esc(game.teamNames?.[side] || `Equipa ${side === "teamA" ? "A" : "B"}`);
  const result = (side) =>
    draw ? "Empate" : winner === side ? "Vitória" : "Derrota";
  const playerRow = (uid, side, bench, index) => {
    const player = ctx.league.players.find((row) => row.uid === uid) || {
      uid,
      displayName: "Jogador inativo",
      hasCard: false,
    };
    const name = game.playerCards?.[uid]?.displayName || player.displayName || player.username;
    const rating = ratings[uid] || {};
    const performance = matchPerformance(uid, game);
    const position = game.playerCards?.[uid]?.primaryPosition || game.positions?.[uid] || player.primaryPosition;
    const recordedOvr = frozen?.playerOvr?.[uid];
    const displayPlayer = {
      ...player,
      primaryPosition: position,
      ...(Number.isFinite(recordedOvr)
        ? { ovr: recordedOvr, hasCard: true }
        : {}),
      ...(game.playerCards?.[uid] || {hasCard:false}),
    };
    return `<details class="match-rating-player postmatch-player ${uid === ctx.user.uid ? "is-self" : ""}"><summary aria-controls="postmatch-${side}-${index}"><span class="postmatch-card" aria-hidden="true">${card(displayPlayer, { size: "sm", preview: true })}</span><span class="postmatch-player-info"><span class="postmatch-player-name">${esc(name)}${uid === ctx.user.uid ? "<small>Tu</small>" : ""}</span><span class="postmatch-position">${esc(position || "Jogador")}</span><span class="postmatch-player-rating">${matchStars(rating.overall)}<span class="postmatch-rating-toggle" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg></span></span></span><span class="postmatch-player-stats"><span>${icon("ball")}<b>${performance.goals}</b><small>Golos</small></span><span>${icon("assists")}<b>${performance.assists}</b><small>Assistências</small></span></span></summary><div class="match-rating-dimensions" id="postmatch-${side}-${index}">${FEEDBACK.map(([key, label]) => `<div><span>${label}</span>${matchStars(rating[key])}</div>`).join("")}</div></details>`;
  };
  const team = (side) => {
    const starters = game[side]?.starters || [];
    const bench = game[side]?.bench || [];
    const count = starters.length + bench.length;
    return `<section class="postmatch-team" data-side="${side}" aria-label="${teamName(side)}"><header class="postmatch-team-head"><div><span class="eyebrow">${result(side)}</span><h2>${teamName(side)}</h2></div><span class="postmatch-team-count">${count} ${count === 1 ? "jogador" : "jogadores"}</span></header><div class="postmatch-roster">${starters.map((uid, index) => playerRow(uid, side, false, index)).join("")}${bench.length ? `${bench.map((uid, index) => playerRow(uid, side, true, starters.length + index)).join("")}` : ""}${!count ? '<p class="muted">Sem jogadores registados.</p>' : ""}</div></section>`;
  };
  ctx.render(
    `${pageHead("O apito final", game.title, `${formatMatchDate(game.scheduledAt)}${game.location ? ` · ${game.location}` : ""}`, ctx.user.role === "admin" ? linkButton(`#/game/${game.id}/edit`, "Editar jogo", "secondary", "edit") : "")}<div class="postmatch content-stack"><section class="postmatch-score panel" aria-label="Resultado final"><div class="postmatch-score-status"><span class="pill">${icon("check")}Jogo encerrado</span><span>Resultado final</span></div><div class="postmatch-scoreboard"><div class="postmatch-score-team ${winner === "teamA" ? "is-winner" : ""}"><span class="postmatch-crest">A</span><h2>${teamName("teamA")}</h2><span>${result("teamA")}</span></div><div class="postmatch-score-numbers"><b>${score.teamA}</b><span>–</span><b>${score.teamB}</b></div><div class="postmatch-score-team ${winner === "teamB" ? "is-winner" : ""}"><span class="postmatch-crest">B</span><h2>${teamName("teamB")}</h2><span>${result("teamB")}</span></div></div><div class="postmatch-score-footer">${draw ? "As equipas terminam empatadas." : `${teamName(winner)} vence a Peladinha.`}</div></section><section class="postmatch-lineups" aria-label="Equipas e desempenho dos jogadores"><div class="postmatch-teams">${team("teamA")}${team("teamB")}</div></section>${youtubePlayer(game.youtubeVideoId)}<div class="postmatch-actions">${linkButton("#/games", "Todos os jogos", "ghost", "arrow")}<button type="button" id="share-closed-game" class="btn btn-secondary">${icon("share")}Partilhar jogo</button>${participants(game).includes(ctx.user.uid) ? linkButton(`#/game/${game.id}/feedback`, "Avaliar jogadores", "primary", "missions") : ""}</div></div>`,
  );
  bindImages();
  ctx.cleanup(
    bindMatchRatingDetails(document.querySelector(".postmatch-teams")),
  );
  document.querySelector("#share-closed-game").onclick = async () => {
    const url = new URL(location.href);
    url.hash = `/game/${game.id}`;
    try {
      if (navigator.share)
        await navigator.share({
          title: game.title,
          text: `${teamName("teamA")} ${score.teamA} – ${score.teamB} ${teamName("teamB")}`,
          url: url.href,
        });
      else {
        await navigator.clipboard.writeText(url.href);
        toast("Link do jogo copiado.");
      }
    } catch (error) {
      if (error.name !== "AbortError")
        toast("Não foi possível partilhar o jogo.", "error");
    }
  };
}
