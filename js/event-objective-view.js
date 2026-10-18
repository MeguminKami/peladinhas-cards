import { missionObjectivePreview } from "./mission-objective-preview.js";
import { isRatingObjective } from "./event-model.js";
import { FEEDBACK, formatDateTime } from "./utils.js";
import { icon, eventIcon } from "./icons.js";
import { esc } from "./ui.js";
export function challengeRules(event) {
  const facts = [],
    conditions = [];
  const fact = (label, value) =>
    facts.push(`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`);
  const objective = event.objective;
  let lead,
    criteria = "";
  if (event.method === "objective") {
    lead = missionObjectivePreview(event).text;
    if (isRatingObjective(objective)) {
      const attributes = objective.attributes || [];
      criteria = `<div class="challenge-criteria"><h3>Critérios de avaliação</h3><ul>${attributes.map((key) => `<li>${esc((FEEDBACK.find(([id]) => id === key)?.[1] || key).replace("colectivo", "coletivo"))}</li>`).join("")}</ul></div>`;
      fact(
        "Cálculo",
        objective.combine === "mean"
          ? "Média conjunta dos critérios"
          : "Mínimo em cada critério",
      );
      fact(
        "Avaliações mínimas",
        `${objective.minRatings} por critério, em cada jogo`,
      );
      fact(
        "Jogos",
        objective.metric === "ratingAverage"
          ? `Os últimos ${objective.target}`
          : objective.metric === "ratingStreak"
            ? "Consecutivos"
            : "Não precisam de ser consecutivos",
      );
      conditions.push(
        "Só contam jogos encerrados neste período, depois do desbloqueio da missão ou evento.",
      );
      if (objective.metric === "ratingAverage")
        conditions.push(
          "Cada jogo tem o mesmo peso na média. A janela inclui os últimos jogos, mesmo quando ainda aguardam avaliações; todos precisam do mínimo de avaliações.",
        );
      else if (objective.metric === "ratingStreak")
        conditions.push(
          "Conta a melhor sequência. Um jogo abaixo do mínimo ou sem avaliações suficientes interrompe-a.",
        );
      else
        conditions.push(
          "Um jogo só conta quando todos os critérios têm avaliações suficientes.",
        );
    } else {
      fact(
        "Progresso",
        {
          individual: "Individual",
          group: "Soma dos participantes",
          team: "Totais da equipa",
          collective: "Totais da equipa",
        }[event.scope] || "Individual",
      );
      conditions.push(
        "Só contam jogos finalizados neste período, depois do desbloqueio.",
      );
    }
    if (event.kind !== "mission")
      conditions.push(
        event.winnerCount === 1
          ? "Vence quem atingir a meta primeiro."
          : `São premiados os primeiros ${event.winnerCount} jogadores a atingir a meta.`,
      );
    if (event.cadence === "daily" || event.cadence === "weekly")
      fact(
        "Renovação",
        event.cadence === "daily" ? "A cada 24 horas" : "A cada 7 dias",
      );
    if (event.kind === "mission")
      fact(
        "Recompensa",
        event.maxRepeats > 1
          ? `Até ${event.maxRepeats} conclusões, uma por período`
          : "Uma única conclusão",
      );
  } else if (event.method === "vote") {
    lead = `Escolhe até ${event.votesPerUser || 1} ${(event.votesPerUser || 1) === 1 ? "participante" : "participantes"}.`;
    fact("Votar em ti", event.allowSelfVote ? "Permitido" : "Não permitido");
    fact(
      "Mínimo para prémio",
      `${event.minVotes || 1} ${(event.minVotes || 1) === 1 ? "voto" : "votos"}`,
    );
    fact(
      "Resultados",
      event.liveResults
        ? "Contagem disponível durante a votação"
        : "Disponíveis após o fecho",
    );
    if (event.tieBreak === "goals" || event.tieBreak === "participation")
      fact(
        "Desempate",
        event.tieBreak === "goals"
          ? "Mais golos marcados"
          : "Mais jogos disputados",
      );
    conditions.push(
      event.votingEndsAt
        ? `Votação: ${formatDateTime(event.votingStartsAt)} até ${formatDateTime(event.votingEndsAt)}.`
        : "Votação sem prazo de encerramento.",
    );
  } else {
    lead = "A organização escolhe os vencedores e a ordem de classificação.";
    conditions.push("Os resultados serão publicados após o encerramento.");
  }
  return `<div class="event-rules challenge-rules"><h2 class="event-title-with-icon">${icon(eventIcon(event))}${event.method === "objective" ? "Objetivo" : "Como participar"}</h2><p class="challenge-goal">${esc(lead)}</p>${criteria}${facts.length ? `<dl class="challenge-facts">${facts.join("")}</dl>` : ""}${conditions.length ? `<details class="challenge-conditions"><summary>Condições ${event.method === "objective" ? "do objetivo" : "de participação"}</summary><ul>${conditions.map((text) => `<li>${esc(text)}</li>`).join("")}</ul></details>` : ""}${event.rules?.trim() ? `<details class="challenge-conditions"><summary>Regras adicionais</summary><p>${esc(event.rules.trim())}</p></details>` : ""}</div>`;
}
