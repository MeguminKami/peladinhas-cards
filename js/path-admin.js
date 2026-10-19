import * as DB from "./db.js";
import { esc, pageHead, linkButton, busy, toast } from "./ui.js";
import { pathNode, pathObjectiveText } from "./path-model.js";
import { pathObjectiveLines } from "./path-missions.js";
import { icon } from "./icons.js";

export async function pathAdminPage(ctx) {
  const states = await DB.list("pathStates");
  const pending = states.flatMap((state) =>
    Object.entries(state.reviews || {})
      .filter(([, review]) => !review.acknowledgedAt)
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
    `${pageHead("Gestão de missões", "Percursos em revisão", "Correções de jogos suspendem novas escolhas até revisão. As conquistas validadas e as semanas fechadas são preservadas.", linkButton("#/admin/events", "Eventos e missões", "secondary", "trophy"))}<div class="content-stack">${
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
          return `<form class="panel path-review-form" data-path-review="${index}"><div class="section-head"><div><p class="eyebrow">${review.pending ? "TENTATIVA EM VALIDAÇÃO" : "RESULTADO CORRIGIDO"}</p><h2>${esc(player?.displayName || review.uid)}</h2></div>${linkButton(`#/game/${review.gameId}`, "Consultar jogo", "secondary", "games")}</div><p>${esc(pathNode(review.nodeId)?.label || review.nodeId)}</p>${mission}<p class="muted">${review.pending ? "Esta tentativa ainda não foi apurada. A decisão conserva os dados numéricos guardados no fecho e retoma o apuramento com os votos válidos às 48 horas; não atribui pontos manualmente." : "Esta ação conserva a conquista registada antes da correção e permite continuar o percurso. Não atribui pontos adicionais nem recalcula cartas históricas."}</p><label>Motivo da decisão<textarea name="reason" required minlength="5" maxlength="500" rows="3" placeholder="Explica por que se conserva esta conquista."></textarea></label><button class="btn btn-primary" type="submit">${icon("check")}${review.pending ? "Conservar registo do fecho e apurar" : "Conservar conquista e desbloquear percurso"}</button></form>`;
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
            await DB.pathAction("acknowledge", {
              uid: review.uid,
              attemptId: review.attemptId,
              reason: new FormData(form).get("reason"),
            });
            toast("Decisão registada. O jogador pode continuar.");
            await pathAdminPage(ctx);
          });
        } catch {
          /* Keep the reason available for retry. */
        }
      }),
  );
}
