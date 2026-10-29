import * as DB from "./db.js";
import { esc, pageHead, linkButton, busy, toast } from "./ui.js";
import { pathNode, pathObjectiveText } from "./path-model.js";
import { pathObjectiveLines } from "./path-missions.js";
import { icon } from "./icons.js";

export async function pathAdminPage(ctx) {
  const states = await DB.list("pathStates");
  const pending = states.flatMap((state) =>
    Object.entries(state.reviews || {})
      .filter(([id, review]) => !review.acknowledgedAt && (state.pending || []).some(row => row.id === id))
      .map(([attemptId, review]) => ({
        uid: state.uid,
        attemptId,
        ...review,
        offer: [...(state.pending || []), ...(state.history || [])].find(
          (row) => row.id === attemptId,
        )?.offer,
      })),
  );
  ctx.render(
    `${pageHead("Gestão de missões", "Percursos em revisão", "As correções são apuradas automaticamente nos ciclos de atualização. Decide apenas os casos sem informação suficiente; os outros percursos continuam disponíveis.", linkButton("#/admin/events", "Eventos e missões", "secondary", "trophy"))}<div class="content-stack">${
      pending
        .map((review, index) => {
          const player = ctx.league.players.find(
            (player) => player.uid === review.uid,
          );
          const objective = review.offer?.objective;
          const mission = objective
            ? `<div class="path-review-mission"><h3>${esc(review.offer.title || "Missão em revisão")}</h3>${
                objective.kind === "conditions"
                  ? `<ul class="path-mission-conditions">${pathObjectiveLines(
                      objective,
                    )
                      .map((line) => `<li>${esc(line)}</li>`)
                      .join("")}</ul>`
                  : `<p>${esc(pathObjectiveText(objective))}</p>`
              }</div>`
            : "";
          return `<form class="panel path-review-form" data-path-review="${index}"><div class="section-head"><div><p class="eyebrow">${review.pending ? "TENTATIVA EM VALIDAÇÃO" : "RESULTADO CORRIGIDO"}</p><h2>${esc(player?.displayName || review.uid)}</h2></div>${linkButton(`#/game/${review.gameId}`, "Consultar jogo", "secondary", "games")}</div><p>${esc(pathNode(review.nodeId)?.label || review.nodeId)}</p>${mission}<p class="muted">${esc(review.reason || "Falta informação para apurar automaticamente esta tentativa.")} Atribuir aplica o avanço de +${review.offer?.advance || 0}% da missão e entrega apenas as recompensas dos nós que completar, respeitando os limites. Não atribuir cancela sem perder progresso.</p><label for="path-review-decision-${index}">Decisão</label><select id="path-review-decision-${index}" name="decision" required><option value="">Escolhe uma decisão</option><option value="grant">Atribuir avanço e recompensas correspondentes</option><option value="cancel">Não atribuir recompensa · Preservar progresso</option></select><label for="path-review-reason-${index}">Motivo da decisão</label><textarea id="path-review-reason-${index}" name="reason" required minlength="5" maxlength="500" rows="3" placeholder="Explica a decisão para esta tentativa."></textarea><button class="btn btn-primary" type="submit">${icon("check")}Registar decisão</button></form>`;
        })
        .join("") ||
      '<div class="panel"><h2>Tudo em dia.</h2><p>Não existem percursos à espera de revisão.</p></div>'
    }</div>`,
  );
  document.querySelectorAll("[data-path-review]").forEach(
    (form) =>
      (form.onsubmit = async (event) => {
        event.preventDefault();
        const review = pending[Number(form.dataset.pathReview)];
        try {
          await busy(event.submitter, async () => {
            await DB.pathAction("resolveReview", {
              uid: review.uid,
              attemptId: review.attemptId,
              decision: new FormData(form).get("decision"),
              reason: new FormData(form).get("reason"),
            });
            toast("Decisão registada. A tentativa foi apurada.");
            await pathAdminPage(ctx);
          });
        } catch {
          /* Keep the reason available for retry. */
        }
      }),
  );
}
