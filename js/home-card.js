import { matchSeriesAverages } from "./match-rating-summary.js";
import { policyAt } from "./system-policy.js";
import { card } from "./cards.js";
import { esc, linkButton } from "./ui.js";
import {
  asDate,
  participants,
  matchOutcome,
  matchPerformance,
  formatDate,
} from "./utils.js";

export function homeCardPanel(player, league) {
  if (!player)
    return `<section class="panel my-card-panel"><h2>A minha carta</h2><p>O teu perfil está em preparação.</p>${linkButton("#/profile", "Ver perfil", "secondary")}</section>`;
  const games = league.games.filter((game) =>
    participants(game).includes(player.uid),
  );
  const recent = games
    .filter(
      (game) =>
        game.status === "closed" &&
        !game.deleting &&
        +asDate(game.closedAt || game.scheduledAt) <= Date.now(),
    )
    .sort((a, b) => +asDate(b.scheduledAt) - +asDate(a.scheduledAt));
  const stats = player.matchStats || {};
  const delta = player.ovrDelta;
  const format = (value) =>
    Number(value || 0).toLocaleString("pt-PT", { maximumFractionDigits: 1 });
  const average = matchSeriesAverages((player.aggregates || []).slice(-5)).withoutGoalkeeping;
  const ratingNumber = average?.toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const rating = average === null
    ? '<span class="my-card-form-empty">Por avaliar</span>'
    : `<span class="my-card-form" role="img" aria-label="${ratingNumber} de 5 estrelas"><span class="match-rating-number">${ratingNumber}</span><span class="my-card-form-star" aria-hidden="true">&#9733;</span></span>`;
  const qualification = player.official
    ? "Carta oficial"
    : `Carta provisória · ${Math.min(policyAt().rules.communityMinimum, player.communityCount || 0)}/${policyAt().rules.communityMinimum} avaliações`;
  return `<section class="panel my-card-panel"><div class="section-head"><h2>A minha carta</h2>${linkButton("#/profile", "Ver perfil", "ghost")}</div>${card(player, { size: "md" })}<div class="my-card-status"><span>${player.hasCard ? qualification : "Cria a tua primeira carta"}</span>${player.hasCard && Number.isFinite(delta) ? `<strong>${delta > 0 ? "+" : ""}${format(delta)} OVR <small>esta semana</small></strong>` : ""}</div><div class="metrics compact-metrics">${[
    ["Forma", rating],
    ["Jogos", stats.played || 0],
    ["Vitórias", stats.wins || 0],
    ["Golos", stats.goals || 0],
    ["Assistências", stats.assists || 0],
    ["% vitórias", `${stats.winRate || 0}%`],
  ]
    .map(
      ([label, value]) => `<div><small>${label}</small><b>${value}</b></div>`,
    )
    .join(
      "",
    )}</div><div class="my-card-insights"><section class="my-card-recent" aria-labelledby="my-card-recent-title"><div class="my-card-insight-head"><h3 id="my-card-recent-title">Últimos jogos</h3><span>O teu desempenho</span></div>${
    recent.length
      ? `<div class="my-card-match-list">${recent
          .slice(0, 3)
          .map((game) => {
            const outcome = matchOutcome(player.uid, game);
            const label =
              outcome === 1 ? "Vitória" : outcome === 0 ? "Empate" : "Derrota";
            const performance = matchPerformance(player.uid, game);
            return `<a class="my-card-match" href="#/game/${esc(game.id)}"><span class="my-card-outcome" data-outcome="${outcome}" aria-label="${label}">${label[0]}</span><span class="my-card-match-copy"><b>${esc(game.title)}</b><small>${esc(formatDate(game.scheduledAt))} · ${performance.goals} G / ${performance.assists} A</small></span><strong aria-label="Resultado ${game.score.teamA} a ${game.score.teamB}">${game.score.teamA}<span>–</span>${game.score.teamB}</strong></a>`;
          })
          .join(
            "",
          )}</div><p class="my-card-stat-key">G: golos · A: assistências</p>`
      : `<p class="my-card-note">Ainda não tens jogos concluídos. O teu desempenho aparece aqui depois da primeira Peladinha.</p>`
  }</section></div><div class="my-card-actions">${linkButton(player.hasCard ? "#/statistics" : "#/missions/self", player.hasCard ? "Comparar na liga" : "Criar a minha carta", "secondary", player.hasCard ? "chart" : "missions")}</div></section>`;
}
