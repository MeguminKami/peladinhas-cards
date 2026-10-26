import { icon } from "./icons.js";
import { calculateGameDeltas, ATTRIBUTES } from "./utils.js";
import {
  FAIR_PROGRESSION_FROM,
  gameResultFactors,
} from "./game-progression.js";
import { policyAt } from "./system-policy.js";

const number = (n) =>
  n.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${number(Math.abs(n))}`;
const references = (n) =>
  Object.fromEntries(
    ["attack", "passing", "defense", "physical", "attitude"].map((key) => [
      key,
      n,
    ]),
  );
export const progressionGuideLink = () =>
  `<a class="btn btn-ghost progression-guide-link" href="#/players/evolution">${icon("info")}<span>Como as tuas estatísticas mudam</span></a>`;

export function progressionGuidePage(ctx) {
  const settings = policyAt(
    new Date(Math.max(Date.now(), Date.parse(FAIR_PROGRESSION_FROM))),
  ).progression;
  const questions = [
    [
      "ratingAverage",
      "E se a minha nota ficar abaixo dos colegas?",
      "Até 0,75 estrelas abaixo, não há redução adicional. A uma estrela abaixo, conservas 85% da componente de desempenho; a 1,5, 50%; a duas ou mais, 25%. A transição é gradual.",
      "Com nota de pelo menos 3,5 nessa dimensão, conservas no mínimo 75%. A nota absoluta é a principal referência; superar colegas e adversários dá apenas um ajuste limitado.",
    ],
    [
      "shield",
      "Posso perder atributos mesmo a ganhar?",
      "Sim. Abaixo de 3 estrelas numa dimensão, pode haver perda. A vitória atenua-a; a derrota, sobretudo larga, agrava-a. Golos e assistências podem compensar os atributos a que pertencem, sem resgatar os restantes.",
      `Com a configuração atual, a perda máxima é de ${number(settings.lossCap)} por atributo e jogo. Não marcar não significa jogar mal: defesa, passe, físico e atitude também têm valor.`,
    ],
    [
      "cards",
      "Porque cresço menos quando já tenho atributos altos?",
      "Os ganhos conservam 100% abaixo de 75, 70% de 75 até 85 e 40% de 85 até 90. A partir de 90, o fator começa em 12% e diminui progressivamente até 99.",
      `O teto por atributo, antes do patamar, é ${number(settings.gainCap)}. Os ganhos de um jogo também respeitam um orçamento máximo de +2,5 pontos exatos de OVR, ponderado pela posição. O OVR inteiro pode subir três pontos por arredondamento. Estes limites não são uma melhoria garantida.`,
    ],
    [
      "profile",
      "OVR, atributos e forma são a mesma coisa?",
      "Não. Os atributos são as tuas capacidades. O OVR é a média ponderada desses atributos pela posição. A forma resume avaliações de jogos. Os 3,9 de média de um jogo não são usados como nota de todos os atributos: cada um usa a dimensão que lhe corresponde.",
      "A posição e os pesos podem alterar o OVR. Os decimais da evolução são preservados entre jogos, mesmo quando a carta apresenta números inteiros.",
    ],
    [
      "gift",
      "O que mais pode fazer a carta subir ou descer?",
      "Editar a autoavaliação, receber avaliações da comunidade, corrigir jogos ou receber feedback tardio pode alterar o cálculo atual. Recompensas permanentes e temporárias também afetam os números da carta.",
      "As setas semanais excluem bónus temporários. Uma carta de uma semana fechada conserva os valores originais. A aparência da carta é cosmética. A inatividade não reduz atributos nem OVR.",
    ],
    [
      "clock",
      "E os jogos anteriores a estas regras?",
      "Os jogos encerrados antes de 26 de outubro de 2026 conservam a fórmula anterior. Estes jogos podem ter ganhos diferentes, incluindo o antigo bloqueio em vitórias abaixo de determinadas notas. Recalcular a carta não muda a versão desses jogos.",
      "O feedback pode chegar mais tarde: a data de fecho do jogo, e não a data de envio do voto, determina a fórmula.",
    ],
  ];
  ctx.render(`<article class="evolution-guide">
    <a class="evolution-back" href="#/players">${icon("players")}Voltar aos jogadores</a>
    <header class="evolution-hero">
      <div class="evolution-hero-copy"><p class="eyebrow">DO CAMPO PARA A CARTA</p><h1>Como as tuas<br>estatísticas <em>mudam.</em></h1><p>O que fazes em campo conta. A tua avaliação, os teus contributos e o resultado constroem a tua evolução.</p><a class="btn btn-primary" href="#/players/evolution" data-evolution-jump>Experimentar um jogo ${icon("arrow")}</a><span class="evolution-edition">Regras para jogos encerrados desde 26 out. 2026</span></div>
      <div class="evolution-playbook" aria-label="A evolução combina desempenho, contributos e resultado"><div class="evolution-pitch" aria-hidden="true"><span></span></div><p class="eyebrow">A JOGADA DA TUA EVOLUÇÃO</p><ol>${[
        ["01", "Joga bem.", "Cada dimensão tem a sua nota.", "ratingAverage"],
        [
          "02",
          "Faz a diferença.",
          "Golos e assistências têm valor próprio.",
          "ball",
        ],
        [
          "03",
          "Luta pelo resultado.",
          "Vencer recompensa. Perder pesa.",
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
      <div class="evolution-sim-layout"><form id="evolution-form" class="evolution-controls"><label for="evolution-rating">Nota por dimensão</label><output id="evolution-rating-label" for="evolution-rating">3,9 ★</output><input id="evolution-rating" name="rating" type="range" min="1" max="5" step="0.1" value="3.9"><div class="evolution-fields"><label>Golos<input name="goals" type="number" min="0" max="99" step="1" value="6" inputmode="numeric"></label><label>Assistências<input name="assists" type="number" min="0" max="99" step="1" value="1" inputmode="numeric"></label></div><div class="evolution-fields"><label>Resultado<select name="outcome" aria-label="Resultado"><option value="1">Vitória</option><option value="0">Empate</option><option value="-1">Derrota</option></select></label><label>Diferença de golos<select name="margin" aria-label="Diferença de golos"><option value="1">1 golo</option><option value="2">2 golos</option><option value="3">3 golos</option><option value="4">4 golos</option><option value="5" selected>5 ou mais</option></select></label></div><div class="evolution-fields"><label>Atributos no início<select name="level" aria-label="Atributos no início"><option value="60">60</option><option value="80" selected>80</option><option value="90">90</option><option value="95">95</option></select></label><label>Posição<select name="position" aria-label="Posição"><option>GR</option><option>DEF</option><option selected>ALA</option><option>MED</option><option>AV</option></select></label></div><button type="button" class="btn btn-ghost" id="evolution-reset">${icon("refresh")}Repor exemplo</button></form>
      <div class="evolution-sim-result"><div class="evolution-result-header"><span>O impacto deste jogo</span><strong id="evolution-result-factor"></strong></div><div id="evolution-deltas" class="evolution-deltas" aria-live="polite" aria-atomic="true"></div><p class="evolution-sim-assumptions">A mesma nota nas dimensões de campo; colegas e adversários com 3,5. GR não avaliado. Todos os atributos começam no nível escolhido. Usa os pesos de referência da posição, sem recompensas ou mudanças de base. Os valores são decimais de atributo, não pontos de OVR.</p></div></div>
    </section>
    <section aria-labelledby="evolution-result-title"><div class="evolution-section-heading"><div><p class="eyebrow">O RESULTADO TEM PESO</p><h2 id="evolution-result-title">Jogar bem conta.<br>Ganhar conta mais.</h2></div><p>O resultado ajusta a melhoria merecida. Não oferece ganhos por si só. A influência da margem fica limitada a cinco golos.</p></div><div class="evolution-outcomes">${[
      [
        "trophy",
        "Vitória",
        "92–100",
        "Conservas 92% do ganho numa vitória por um; 96% por três; 100% por cinco ou mais.",
      ],
      [
        "games",
        "Empate",
        "75",
        "Uma boa exibição continua a melhorar a carta, com uma recompensa menor.",
      ],
      [
        "shield",
        "Derrota",
        "40–60",
        "Conservas 60% por um golo de desvantagem; 50% por três; 40% por cinco ou mais.",
      ],
    ]
      .map(
        ([symbol, title, value, text]) =>
          `<div><span class="evolution-outcome-icon">${icon(symbol)}</span><h3>${title}</h3><strong>${value}<span>%</span></strong><p>${text}</p></div>`,
      )
      .join("")}</div></section>
    <section class="evolution-contributions" aria-labelledby="evolution-actions-title"><div><p class="eyebrow">OS MOMENTOS QUE DECIDEM</p><h2 id="evolution-actions-title">Marca. Assiste.<br><em>Faz a diferença.</em></h2><p>Golos reforçam Finalização. Assistências reforçam Passe. Os dois ajudam um pouco no Drible. O bónus tem espaço próprio no cálculo, antes do teto final.</p><p>De 1 a 3, a recompensa é próxima. Com 4 e 5 cresce mais; aos 6 dá um salto. Depois desacelera até ao limite dos 10.</p><p class="evolution-small">Uma avaliação absoluta fraca reduz o bónus, mas estar abaixo da média dos colegas não apaga uma contribuição. Um defesa pode evoluir sem marcar: a sua boa avaliação defensiva conta.</p></div><div class="evolution-action-curve" role="img" aria-label="Bónus de quantidade antes dos patamares: 1 a 3 contribuições têm valores próximos; 4 e 5 aumentam; 6 recebem um salto; 10 atingem o teto"><span>Bónus por golos ou assistências</span><div>${[
      [1, 0.375],
      [2, 0.4375],
      [3, 0.5],
      [4, 0.75],
      [5, 1],
      [6, 1.4375],
      [8, 1.6875],
      [10, 1.875],
    ]
      .map(
        ([count, bonus]) =>
          `<div class="evolution-curve-column ${count === 6 ? "is-highlight" : ""}"><i style="--curve-height:${(bonus / 1.875) * 100}%"></i><b>${count}${count === 10 ? "+" : ""}</b></div>`,
      )
      .join(
        "",
      )}</div><p>Quantidade → <strong>O salto está nos 6.</strong></p><small>Curva antes da qualidade da nota, resultado, patamar e limites. Não representa pontos de OVR.</small></div></section>
    <section class="evolution-details" aria-label="Regras em detalhe">${questions.map(([symbol, title, first, second], i) => `<details ${i === 0 ? "open" : ""}><summary>${icon(symbol)}${title}</summary><div><p>${first}</p><p>${second}</p></div></details>`).join("")}</section>
    <footer class="evolution-footer"><div>${icon("ball")}<p><strong>A tua evolução começa no próximo jogo.</strong><span>Joga pela equipa. Constrói a tua carta.</span></p></div><a class="btn btn-secondary" href="#/players">Ver jogadores ${icon("arrow")}</a></footer>
  </article>`);
  const root = document.querySelector(".evolution-guide"),
    form = root.querySelector("#evolution-form");
  const draw = () => {
    const rating = Number(form.elements.rating.value),
      level = Number(form.elements.level.value),
      outcome = Number(form.elements.outcome.value);
    const validCount = (name) =>
      Math.max(
        0,
        Math.min(99, Math.floor(Number(form.elements[name].value) || 0)),
      );
    const margin = outcome === 0 ? 0 : Number(form.elements.margin.value);
    form.elements.margin.disabled = outcome === 0;
    root.querySelector("#evolution-rating-label").textContent =
      `${rating.toLocaleString("pt-PT", { minimumFractionDigits: 1 })} ★`;
    const aggregate = {
      ...references(rating),
      goalkeeping: null,
      goals: validCount("goals"),
      assists: validCount("assists"),
      outcome,
      goalMargin: outcome * margin,
      teamRatings: references(3.5),
      opponentRatings: references(3.5),
      date: new Date(Math.max(Date.now(), Date.parse(FAIR_PROGRESSION_FROM))),
    };
    const deltas = calculateGameDeltas(
      Object.fromEntries(ATTRIBUTES.map(([key]) => [key, level])),
      aggregate,
      { position: form.elements.position.value },
    );
    root.querySelector("#evolution-result-factor").textContent =
      `${Math.round(gameResultFactors(aggregate).gain * 100)}% do ganho`;
    root.querySelector("#evolution-deltas").innerHTML = [
      ["shooting", "Finalização"],
      ["passing", "Passe"],
      ["dribbling", "Drible"],
      ["defending", "Defesa"],
    ]
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
