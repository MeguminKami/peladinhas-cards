import { weeklyComparison } from "./weekly-comparison.js";
import * as DB from "./db.js";
import { historyForDisplay } from "./card-history.js";
import {
  calculateOverallDetails,
  calculateInitialBaseline,
  initialSelfWeight,
  calculatePlayerStatsDetails,
} from "./utils.js";
import { card, bindImages } from "./cards.js";
import { esc, pageHead, empty, linkButton } from "./ui.js";
export async function ovrAuditPage(ctx, uid, initialWeek) {
  if (ctx.user.role !== "admin") return ctx.render(empty("Acesso reservado"));
  const player = ctx.league.players.find((p) => p.uid === uid);
  if (!player) return ctx.render(empty("Jogador não encontrado"));
  if (!player.hasCard)
    return ctx.render(
      empty(
        "Carta pendente",
        "O jogador precisa de concluir a autoavaliação.",
        linkButton(`#/player/${uid}`, "Ver perfil"),
      ),
    );
  const history = historyForDisplay(player, await DB.history(uid)).sort(
    (a, b) => b.weekId.localeCompare(a.weekId),
  );
  ctx.render(
    `${pageHead("Administração", `Cálculo OVR · ${player.displayName || player.username}`, "Consulta o contributo de cada atributo para o OVR. As cartas anteriores mantêm os pesos usados na respetiva semana.", linkButton(`#/player/${uid}`, "Ver perfil", "ghost"))}<section class="panel"><label>Carta a consultar<select id="ovr-card"><option value="current">Carta atual</option>${history.map((h) => `<option value="${esc(h.weekId)}">${esc(h.weekId)} · OVR ${h.ovr}</option>`).join("")}</select></label></section><div id="ovr-calculation" class="content-stack"></div>`,
  );
  const draw = () => {
    const week = document.querySelector("#ovr-card").value;
    const snapshot = history.find((h) => h.weekId === week);
    const historical = !!snapshot;
    const stats = snapshot?.stats || player.stats;
    const knownPosition =
      !historical || Object.hasOwn(snapshot, "primaryPosition");
    const position = historical
      ? snapshot.primaryPosition
      : player.primaryPosition;
    const calculation =
      snapshot?.ovrCalculation ||
      (player.cardLocked ? player.cardCalculation : null) ||
      calculateOverallDetails(
        stats,
        ctx.league.ovrWeights,
        position,
        player.inactivity,
      );
    const displayedOvr = snapshot?.ovr ?? player.ovr;
    const exact = calculation.exact.toLocaleString("pt-PT", {
      maximumFractionDigits: 6,
    });
    const preview = {
      ...player,
      cardPhoto: historical ? snapshot.cardPhoto || null : player.cardPhoto,
      stats,
      ovr: displayedOvr,
      ...(historical
        ? weeklyComparison(
            snapshot,
            history.find((h) => h.weekId < snapshot.weekId),
            { rewards: ctx.league.eventRewards, uid: player.uid },
          )
        : {}),
      cardType: snapshot?.baseCard || player.cardType,
      specials: snapshot?.specials || player.specials,
      primaryPosition: position || player.primaryPosition,
    };
    const note =
      historical && !snapshot.ovrCalculation
        ? '<p class="warning">Esta carta antiga não guardou a fórmula utilizada. A tabela apresenta o cálculo com os pesos atuais de referência; o OVR guardado é preservado. Recalcular o histórico aplica a fórmula atual.</p>'
        : "";
    const topFour = ["top-four-70-30-v1", "top-four-weighted-v2"].includes(
      calculation.version,
    );
    const individual = ["stat-weights-v3", "position-weights-v4"].includes(
      calculation.version,
    );
    const percentages = topFour || individual;
    const format = (n) =>
      n.toLocaleString("pt-PT", { maximumFractionDigits: 6 });
    const formula = individual
      ? `${calculation.rows.map((r) => `${r.value} × ${format(r.weight)}%`).join(" + ")} = ${format(calculation.rawExact ?? calculation.exact)}${calculation.inactivity?.penalty ? ` − ${calculation.inactivity.penalty} = ${exact}` : ""}`
      : topFour
        ? `${format(calculation.topAverage)} × ${calculation.topWeight ?? 70}% + ${format(calculation.remainingAverage)} × ${calculation.remainingWeight ?? 30}% = ${exact}`
        : `${calculation.total} ÷ ${calculation.divisor} = ${exact}`;
    const versionNote =
      historical && snapshot.ovrCalculation && !individual
        ? '<p class="muted">Esta carta foi guardada com a fórmula anterior. O detalhe original mantém-se até recalcular o histórico.</p>'
        : "";
    const currentDetails =
      !historical && !player.cardLocked
        ? player.progression ||
          calculatePlayerStatsDetails(
            calculateInitialBaseline(player.initial, player.community),
            player.cardAggregates || [],
            {
              weights: ctx.league.ovrWeights,
              position: player.primaryPosition,
            },
          )
        : null;
    document.querySelector("#ovr-calculation").innerHTML =
      `<div class="dashboard-columns ovr-audit-layout"><section class="panel my-card-panel">${card(preview, { size: "md", preview: true })}<p>${historical ? esc(week) : "Carta atual"} · Posição: ${esc(position || (knownPosition ? "Sem posição" : "Não registada"))}</p></section><section class="panel"><h2>Conta do OVR</h2>${note}${versionNote}<div class="table-wrap"><table id="ovr-weights"><thead><tr><th>Atributo</th><th>Valor da carta</th><th>Peso</th><th>Valor × peso</th></tr></thead><tbody>${calculation.rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${r.value}</td><td>${individual ? `${format(r.weight)}%` : topFour ? `${r.group === "top" ? "Top 4" : "Restantes 8"} · ${format((r.weight / calculation.divisor) * 100)}%` : r.weight}</td><td>${percentages ? format(r.contribution / calculation.divisor) : r.contribution}</td></tr>`).join("")}</tbody><tfoot><tr><th>Total</th><td></td><th>${percentages ? "100%" : calculation.divisor}</th><th>${percentages ? format(calculation.rawExact ?? calculation.exact) : calculation.total}</th></tr></tfoot></table></div><p class="ovr-formula">${formula}${calculation.inactivity?.penalty ? ` · Penalização por ${calculation.inactivity.missed} ausências: −${calculation.inactivity.penalty} (OVR base ${calculation.rawOvr})` : ""} → <strong>OVR ${calculation.ovr}</strong> (arredondado)</p><p>OVR apresentado nesta carta: <strong id="ovr-displayed">${displayedOvr}</strong>.</p>${calculation.ovr !== displayedOvr ? '<p class="warning">O OVR guardado difere desta fórmula de referência. Os valores da carta não foram alterados.</p>' : ""}</section></div>${currentDetails ? `<section class="panel"><h2>Como se chegou aos atributos</h2><details><summary>Como evoluem os atributos</summary><p>Base: ${player.communityCount ? `${(initialSelfWeight(player.communityCount) * 100).toLocaleString("pt-PT", { maximumFractionDigits: 2 })}% autoavaliação + ${((1 - initialSelfWeight(player.communityCount)) * 100).toLocaleString("pt-PT", { maximumFractionDigits: 2 })}% média da comunidade (${player.communityCount} avaliações)` : "autoavaliação, sem votos externos"}. Escala 0–20 convertida para 0–99. Cada jogo usa as regras em vigor na sua data de fecho. Desde 26/10/2026, os ganhos combinam a nota da dimensão, contribuições individuais e resultado, com comparação gradual e limites por patamar. Um mau desempenho pode retirar atributos mesmo numa vitória. Os jogos anteriores conservam a fórmula original e os decimais são preservados entre jogos. <a href="#/players/evolution">Consultar as regras e experimentar o simulador</a>.</p></details><div class="table-wrap"><table id="ovr-attributes"><thead><tr><th>Atributo</th><th>Base / 20</th><th>Base / 99</th><th>Variações por jogo</th><th>Conta</th><th>Valor da carta</th></tr></thead><tbody>${currentDetails.rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${r.initial20.toLocaleString("pt-PT", { maximumFractionDigits: 4 })}</td><td>${r.baseline}</td><td>${r.contributions.map(format).join(" + ") || "—"}</td><td>${format(r.baseline)}${r.contributions.map((delta) => ` ${delta < 0 ? "−" : "+"} ${format(Math.abs(delta))}`).join("")} = ${format(r.exact)}</td><td>${r.value}${player.eventBoosts?.[r.key] ? ` + ${player.eventBoosts[r.key]} (evento, máximo 99) = ${player.stats[r.key]}` : ""}</td></tr>`).join("")}</tbody></table></div></section>` : '<p class="muted">O cálculo histórico usa os atributos guardados nessa carta; avaliações posteriores não são aplicadas a esta consulta.</p>'}`;
    bindImages(document.querySelector("#ovr-calculation"));
  };
  if (history.some((h) => h.weekId === initialWeek))
    document.querySelector("#ovr-card").value = initialWeek;
  document.querySelector("#ovr-card").onchange = draw;
  draw();
}
