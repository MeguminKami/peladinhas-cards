import { icon } from "./icons.js";
import { calculateGameDeltas, ATTRIBUTES } from "./utils.js";
import {
  EXPECTATION_PROGRESSION_FROM, expectedGoals, expectedAssists, expectedRating,
} from "./expectation-progression.js";

const number = (n) =>
  n.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${number(Math.abs(n))}`;
const references = (n) =>
  Object.fromEntries(
    ["overall", "attack", "passing", "defense", "physical", "attitude"].map((key) => [
      key,
      n,
    ]),
  );
export const progressionGuideLink = () =>
  `<a class="btn btn-ghost progression-guide-link" href="#/players/evolution">${icon("info")}<span>Como as tuas estatísticas mudam</span></a>`;

export function progressionGuidePage(ctx) {
  const questions = [
    ["edit", "Recebi um pedido para rever uma avaliação. E agora?", "Abre o aviso no perfil ou nas notificações e revê os atributos para refletirem o que observaste em campo. Uma avaliação nula fica excluída da base.", "Uma revisão definitiva autorizada deve ser submetida no prazo indicado. Guardar rascunhos não gasta essa oportunidade."],
    ["ratingAverage", "Que nota preciso para manter o atributo?", "A referência depende do valor antes do jogo: 75 exige 3,6; 85 exige 4; 90 exige 4,3; 95 exige 4,7. Entre os pontos, a exigência sobe gradualmente.", "Finalização cruza 60% da avaliação com 40% dos golos face à expectativa; Passe faz o mesmo com assistências. A comparação com os colegas não altera a nova fórmula."],
    ["shield", "Posso perder atributos mesmo a ganhar?", "Sim. O desempenho individual determina a subida ou descida; resultado e margem não mudam os deltas desta versão. Ter um atributo alto aumenta a exigência e a gravidade das perdas.", "As perdas têm limites próprios: Finalização até 4,8; Passe até 4; Defesa e GR até 2,4; Velocidade até 0,2. Não há perda por ausência ou por falta de avaliação."],
    ["cards", "Porque cresço menos com atributos altos?", "A subida acelera quando superas a expectativa. Com Defesa 90 e nota 4,6, o primeiro jogo dá +0,5; outro igual leva aproximadamente a 90,93. Com 95, a nota de referência já é 4,7.", "Compostura usa 80% atitude e 20% desempenho geral. Jogo de equipa usa 60% atitude e 40% passe/jogo coletivo. Ambos podem ganhar até 3 pontos por jogo até 75; depois desaceleram gradualmente."],
    ["profile", "Como contam os decimais e as avaliações?", "Os cálculos, OVR e valores exatos guardados conservam os decimais. A carta apresenta inteiros. Cinco avaliações válidas por dimensão dão o peso completo; menos avaliações reduzem proporcionalmente a variação.", "Dimensões N/A não inventam notas. Nas notas compostas, uma dimensão ausente é omitida e a disponível mantém o seu valor. Velocidade evolui pouco porque a avaliação física é apenas uma indicação indireta."],
    ["gift", "O que mais pode fazer a carta subir ou descer?", "A base comunitária, correções de jogos e recompensas também afetam a carta. O OVR pondera os atributos pela posição; não recebe uma segunda penalização independente.", "As setas semanais excluem bónus temporários. Semanas fechadas conservam os valores guardados. A aparência é cosmética e a inatividade não reduz atributos nem OVR."],
    ["clock", "E os jogos anteriores a estas regras?", "A nova fórmula aplica-se a jogos encerrados desde 29 de outubro de 2026, às 00:00 UTC. Os jogos anteriores conservam as versões de 26/10 ou anteriores, conforme a data.", "A data de fecho do jogo determina a versão, mesmo quando o feedback chega depois. Recalcular não transforma jogos antigos em jogos novos."],
  ];
  ctx.render(`<article class="evolution-guide">
    <a class="evolution-back" href="#/players">${icon("players")}Voltar aos jogadores</a>
    <header class="evolution-hero">
      <div class="evolution-hero-copy"><p class="eyebrow">DO CAMPO PARA A CARTA</p><h1>Como as tuas<br>estatísticas <em>mudam.</em></h1><p>O que fazes em campo conta. A tua avaliação e os teus contributos são comparados com o que os teus atributos prometem.</p><a class="btn btn-primary" href="#/players/evolution" data-evolution-jump>Experimentar um jogo ${icon("arrow")}</a><span class="evolution-edition">Regras para jogos encerrados desde 29 out. 2026</span></div>
      <div class="evolution-playbook" aria-label="A evolução combina desempenho, contributos e atitude"><div class="evolution-pitch" aria-hidden="true"><span></span></div><p class="eyebrow">A JOGADA DA TUA EVOLUÇÃO</p><ol>${[
        ["01", "Joga bem.", "Cada dimensão tem a sua nota.", "ratingAverage"],
        [
          "02",
          "Faz a diferença.",
          "Golos e assistências têm valor próprio.",
          "ball",
        ],
        [
          "03",
          "Joga pela equipa.",
          "A atitude constrói a compostura e o coletivo.",
          "trophy",
        ],
      ]
        .map(
          ([n, title, text, symbol]) =>
            `<li><span>${n}</span><div><strong>${title}</strong><small>${text}</small></div>${icon(symbol)}</li>`,
        )
        .join(
          "",
        )}</ol><div class="evolution-playbook-foot">12 atributos <span>Uma carta tua.</span></div></div>
    </header>
    <section class="evolution-intro" aria-labelledby="evolution-three-title"><div><p class="eyebrow">ANTES DE OLHARES PARA A SETA</p><h2 id="evolution-three-title">Há três peças<br>na tua carta.</h2></div><ol class="evolution-sources">${[
      [
        "A tua base",
        "A autoavaliação e as avaliações da comunidade definem o ponto de partida. Novas avaliações podem fazê-lo subir ou descer, mesmo sem jogares.",
      ],
      [
        "Os teus jogos",
        "Cada jogo acrescenta ganhos ou perdas por atributo. Uma boa exibição não garante que todos os atributos subam.",
      ],
      [
        "As tuas recompensas",
        "Missões, percursos e eventos podem acrescentar pontos permanentes ou bónus temporários.",
      ],
    ]
      .map(
        ([title, text], i) =>
          `<li><span>0${i + 1}</span><div><h3>${title}</h3><p>${text}</p></div></li>`,
      )
      .join("")}</ol></section>
    <aside class="evolution-note">${icon("info")}<p><strong>Um bom jogo pode coincidir com uma seta para baixo.</strong> A comparação semanal também inclui mudanças da base e recompensas permanentes. A entrada ou expiração de bónus temporários não conta para as setas. As ausências não retiram atributos nem OVR.</p></aside>
    <section class="evolution-simulator" id="evolution-simulator" aria-labelledby="evolution-simulator-title"><div class="evolution-section-heading"><div><p class="eyebrow">PÕE AS REGRAS EM JOGO</p><h2 id="evolution-simulator-title">E se este fosse<br>o teu jogo?</h2></div><p>Muda os valores e vê os ganhos exatos de alguns atributos. Simulação ilustrativa, sem alterar a tua carta.</p></div>
      <div class="evolution-sim-layout"><form id="evolution-form" class="evolution-controls"><label for="evolution-rating">Nota por dimensão</label><output id="evolution-rating-label" for="evolution-rating">3,9 ★</output><input id="evolution-rating" name="rating" type="range" min="1" max="5" step="0.1" value="3.9"><div class="evolution-fields"><label>Golos<input name="goals" type="number" min="0" max="99" step="1" value="6" inputmode="numeric"></label><label>Assistências<input name="assists" type="number" min="0" max="99" step="1" value="1" inputmode="numeric"></label></div><div class="evolution-fields"><label>Atitude<input name="attitude" type="number" min="0" max="5" step="0.1" value="3.9" inputmode="decimal"></label><label>Desempenho geral<input name="overall" type="number" min="0" max="5" step="0.1" value="3.9" inputmode="decimal"></label></div><div class="evolution-fields"><label>Atributos no início<select name="level" aria-label="Atributos no início"><option value="60">60</option><option value="75">75</option><option value="80" selected>80</option><option value="85">85</option><option value="90">90</option><option value="95">95</option></select></label><label>Avaliações por dimensão<input name="count" type="number" min="0" max="99" step="1" value="5" inputmode="numeric"></label></div><button type="button" class="btn btn-ghost" id="evolution-reset">${icon("refresh")}Repor exemplo</button></form>
      <div class="evolution-sim-result"><div class="evolution-result-header"><span>O impacto deste jogo</span><strong id="evolution-result-factor"></strong></div><div id="evolution-deltas" class="evolution-deltas" aria-live="polite" aria-atomic="true"></div><p class="evolution-sim-assumptions">A nota do cursor aplica-se a ataque, passe, defesa e físico; atitude e desempenho geral têm controlos próprios. GR não avaliado. Todos os atributos começam no nível escolhido, sem recompensas ou mudanças de base. Os valores são decimais de atributo, não pontos de OVR.</p></div></div>
    </section>
    <section aria-labelledby="evolution-result-title"><div class="evolution-section-heading"><div><p class="eyebrow">A EXIGÊNCIA ACOMPANHA A CARTA</p><h2 id="evolution-result-title">Mais capacidade.<br>Mais responsabilidade.</h2></div><p>Uma boa exibição permite crescer mais depressa abaixo de 85. Acima de 90, manter a carta exige consistência. Atributos que medimos indiretamente variam menos.</p></div><div class="evolution-outcomes">${[
      ["ratingAverage", "Atributo 85", "4,0", "Nota esperada para manter um atributo diretamente avaliado."],
      ["cards", "Atributo 90", "4,3", "Dois bons jogos de Defesa com nota 4,6 dão aproximadamente +0,93."],
      ["trophy", "Atributo 95", "4,7", "Uma nota abaixo desta referência pressiona o atributo para descer."],
    ].map(([symbol, title, value, text]) => `<div><span class="evolution-outcome-icon">${icon(symbol)}</span><h3>${title}</h3><strong>${value}<span>★</span></strong><p>${text}</p></div>`).join("")}</div></section>
    <section class="evolution-contributions" aria-labelledby="evolution-actions-title"><div><p class="eyebrow">OS MOMENTOS QUE DECIDEM</p><h2 id="evolution-actions-title">Marca. Assiste.<br><em>Supera a expectativa.</em></h2><p>Finalização e Passe combinam 60% da avaliação com 40% dos golos ou assistências face à expectativa individual. Com 80 de Finalização, a referência é 1,5 golos; com 90, 2,67; com 95, 3,57.</p><p>Golos não dão bónus direto ao Drible. Boa atitude ajuda Compostura e Jogo de equipa, com ganhos reforçados até 75. Velocidade fica limitada a +0,2 ou −0,2 por jogo.</p><p class="evolution-small">As expectativas são referências de exigência, não golos garantidos. A proporção de assistências é uma calibração inicial de 44 assistências para 76 golos observados.</p></div><div class="evolution-action-curve" role="img" aria-label="Golos esperados crescem exponencialmente com a finalização"><span>Finalização → golos esperados</span><div>${[60, 70, 75, 80, 85, 90, 95, 99].map(level => `<div class="evolution-curve-column ${level === 90 ? "is-highlight" : ""}"><i style="--curve-height:${expectedGoals(level) / expectedGoals(99) * 100}%"></i><b>${level}</b></div>`).join("")}</div><p>Exigência → <strong>Crescimento exponencial.</strong></p><small>Referência individual antes de cruzar com a avaliação. Não representa pontos de OVR.</small></div></section>
    <section class="evolution-details" aria-label="Regras em detalhe">${questions.map(([symbol, title, first, second], i) => `<details ${i === 0 ? "open" : ""}><summary>${icon(symbol)}${title}</summary><div><p>${first}</p><p>${second}</p></div></details>`).join("")}</section>
    <footer class="evolution-footer"><div>${icon("ball")}<p><strong>A tua evolução começa no próximo jogo.</strong><span>Joga pela equipa. Constrói a tua carta.</span></p></div><a class="btn btn-secondary" href="#/players">Ver jogadores ${icon("arrow")}</a></footer>
  </article>`);
  const root = document.querySelector(".evolution-guide"),
    form = root.querySelector("#evolution-form");
  const draw = () => {
    const rating = Number(form.elements.rating.value),
      level = Number(form.elements.level.value);
    const validCount = (name) =>
      Math.max(
        0,
        Math.min(99, Math.floor(Number(form.elements[name].value) || 0)),
      );
    const validRating = name => Math.max(0, Math.min(5, Number(form.elements[name].value) || 0));
    root.querySelector("#evolution-rating-label").textContent =
      `${rating.toLocaleString("pt-PT", { minimumFractionDigits: 1 })} ★`;
    const aggregate = {
      ...references(rating),
      goalkeeping: null,
      goals: validCount("goals"),
      assists: validCount("assists"),
      attitude: validRating("attitude"),
      overall: validRating("overall"),
      count: validCount("count"),
      date: new Date(Math.max(Date.now(), Date.parse(EXPECTATION_PROGRESSION_FROM))),
    };
    const deltas = calculateGameDeltas(
      Object.fromEntries(ATTRIBUTES.map(([key]) => [key, level])),
      aggregate,
      {},
    );
    root.querySelector("#evolution-result-factor").textContent =
      `Nota esperada ${number(expectedRating(level))} · Golos ${number(expectedGoals(level))} · Assistências ${number(expectedAssists(level))}`;
    root.querySelector("#evolution-deltas").innerHTML = ATTRIBUTES.filter(([key]) => key !== "goalkeeping")
      .map(
        ([key, name]) =>
          `<div class="evolution-delta ${deltas[key] < 0 ? "is-negative" : ""}"><span>${name}</span><b>${signed(deltas[key])}</b><div aria-hidden="true"><i style="--delta-width:${Math.max(0, Math.min(100, (Math.abs(deltas[key]) / 5) * 100))}%"></i></div></div>`,
      )
      .join("");
  };
  form.addEventListener("input", draw);
  form.addEventListener("change", draw);
  form.addEventListener("submit", (event) => event.preventDefault());
  root.querySelector("#evolution-reset").onclick = () => {
    form.reset();
    draw();
  };
  root.querySelector("[data-evolution-jump]").onclick = (event) => {
    event.preventDefault();
    root
      .querySelector("#evolution-simulator")
      .scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    form.elements.rating.focus({ preventScroll: true });
  };
  draw();
}
