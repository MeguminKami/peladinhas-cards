import { missionObjectivePreview } from "./mission-objective-preview.js";
import { isCombinedObjective, usesRatingObjective, isRatingObjective } from "./event-model.js";
import { isLifetimeObjective, usesLifetimeObjective, TOTAL_OBJECTIVES } from "./event-totals.js";
import { FEEDBACK, formatDateTime } from "./utils.js";
import { icon, eventIcon } from "./icons.js";
import { esc } from "./ui.js";
import { isGoalList } from "./event-goals.js";

export function goalCriteria(event) {
  const o = event.objective, metric = TOTAL_OBJECTIVES[o.metric]?.metric || o.metric;
  const rows = [];
  const row = (symbol,label,value) => rows.push(`<div><dt>${icon(symbol)}<span>${esc(label)}</span></dt><dd>${value}</dd></div>`);
  if (isRatingObjective(o)) {
    const threshold = Number(o.threshold).toLocaleString("pt-PT");
    const limit = o.comparison === "gt" ? `Mais de ${threshold} ★` : `Pelo menos ${threshold} ★`;
    const evaluation = metric === "ratingAverage"
      ? `Média ${o.comparison === "gt" ? "superior a" : "de pelo menos"} ${threshold} ★${o.combine === "mean" ? " entre os critérios" : " em cada critério"}`
      : `${limit}${o.combine === "mean" ? " na média conjunta" : " em cada critério"}`;
    row("ratingAverage","Avaliação",esc(evaluation));
    row("filter","Critérios",`<ul class="goal-rule-tags">${(o.attributes || []).map(key=>`<li>${esc((FEEDBACK.find(([id])=>id===key)?.[1] || key).replace("colectivo","coletivo"))}</li>`).join("")}</ul>`);
    row("players","Votos mínimos",`<strong>${esc(o.minRatings ?? 3)}</strong> por critério, em cada jogo`);
    row("games","Jogos",esc(metric === "ratingAverage" ? (o.target===1 ? "O último jogo" : `Os últimos ${o.target} jogos`) : metric === "ratingStreak" ? "Consecutivos" : "Não precisam de ser consecutivos"));
  }
  row("lock","Contagem",esc(isLifetimeObjective(o) ? "Histórico completo, incluindo jogos anteriores ao desafio." : "Jogos encerrados após o início do desafio e o desbloqueio desta meta."));
  if (metric === "ratingAverage") {
    row("info","Jogos por avaliar","Ficam na janela dos últimos jogos. Todos precisam dos votos mínimos.");
    row("ratingAverage","Peso dos jogos","Cada jogo tem o mesmo peso na média.");
    row("check","Verificação","A média exigida tem de estar cumprida quando o objetivo é verificado.");
  } else if (metric === "ratingStreak") {
    row("ratingStreak","Sequência","Conta a melhor sequência. Um jogo abaixo do mínimo ou sem votos suficientes interrompe-a.");
  } else if (isRatingObjective(o)) {
    row("check","Validação","Um jogo só conta quando todos os critérios têm votos suficientes.");
  }
  if(o.attributes?.includes("goalkeeping")) row("info","Guarda-redes","Só conta se jogaste à baliza. A opção «Não foi à baliza» exclui esta avaliação.");
  return `<dl class="goal-rule-rows">${rows.join("")}</dl>`;
}

export function challengeRules(event) {
  if(event.method==="objective" && isGoalList(event.objective)) return `<section class="challenge-rules"><h2>Cumpre todas as metas</h2><ol class="challenge-goal-list">${event.objective.goals.map(goal=>{
    const preview=missionObjectivePreview({...event,objective:goal});
    return `<li><strong>${esc(preview.text)}</strong>${preview.criteria?`<p>${esc(preview.criteria)}</p>`:""}<details class="goal-rule-details"><summary>${icon("info")}<span>Critérios desta meta</span>${icon("arrow")}</summary>${goalCriteria({...event,objective:goal})}</details></li>`;
  }).join("")}</ol>${event.rules?`<p>${esc(event.rules)}</p>`:""}</section>`;
  const facts = [],
    conditions = [];
  const fact = (label, value) =>
    facts.push(`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`);
  const objective = event.objective;
  const ratingObjective = isCombinedObjective(objective) ? objective.ratings : objective;
  let lead,
    criteria = "";
  if (event.method === "objective") {
    lead = missionObjectivePreview(event).text;
    if (isCombinedObjective(objective)) {
      fact("Conclusão", usesLifetimeObjective(objective) ? "Cumprir ambas, com a contagem indicada em cada meta" : "Cumprir ambas as metas no mesmo período");
      conditions.push(usesLifetimeObjective(objective) ? "As metas de histórico incluem jogos anteriores; as metas de período contam depois do início e desbloqueio." : "As metas de resultados e estrelas podem ser cumpridas em jogos diferentes dentro do mesmo período.");
    }
    if (usesRatingObjective(objective)) {
      const attributes = ratingObjective.attributes || [];
      criteria = `<div class="challenge-criteria"><h3>Critérios de avaliação</h3><ul>${attributes.map((key) => `<li>${esc((FEEDBACK.find(([id]) => id === key)?.[1] || key).replace("colectivo", "coletivo"))}</li>`).join("")}</ul></div>`;
      fact(
        "Cálculo",
        ratingObjective.combine === "mean"
          ? "Média conjunta dos critérios"
          : "Mínimo em cada critério",
      );
      fact(
        "Avaliações mínimas",
        `${ratingObjective.minRatings} por critério, em cada jogo`,
      );
      fact(
        "Jogos",
        ratingObjective.metric === "ratingAverage"
          ? `Os últimos ${ratingObjective.target}`
          : ratingObjective.metric === "ratingStreak"
            ? "Consecutivos"
            : "Não precisam de ser consecutivos",
      );
      conditions.push(
        isLifetimeObjective(ratingObjective) ? "Contam todos os jogos encerrados do histórico, incluindo anteriores ao desafio, com avaliações suficientes até à verificação ou ao fecho." : "Só contam jogos encerrados neste período, depois do desbloqueio da missão ou evento.",
      );
      if (ratingObjective.metric === "ratingAverage")
        conditions.push(
          "Cada jogo tem o mesmo peso na média. A janela inclui os últimos jogos, mesmo quando ainda aguardam avaliações; todos precisam do mínimo de avaliações.",
        );
      else if (ratingObjective.metric === "ratingStreak")
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
        isLifetimeObjective(objective) ? "Contam todos os jogos finalizados do histórico, incluindo anteriores ao desafio. Jogos reabertos ou eliminados não contam." : "Só contam jogos finalizados neste período, depois do desbloqueio.",
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
