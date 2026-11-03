/**
 * Regras do jogo, GERADAS A PARTIR DA CONFIGURAÇÃO (tabelas/ via src/config.js).
 * Os números (pagamentos, pesos, parâmetros dos poderes, probabilidades, preços) nunca se escrevem
 * à mão: quando a matemática muda, as regras mudam sozinhas.
 */
import { config, MATH_VERSION } from '../src/index.js';
import { fusionName, POWER_NAME, LEVEL_NAME, money, xBet } from './texto.js';

const T = config.tables;
const f2 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
const f3 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 3 });
const pct = v => `${f2.format(v)} %`;
const x = v => `${f3.format(v)}×`;

const DESC_FUSAO = {
  NEVER_ENDING_DREAM: f => `O respin do COPIUM repete-se enquanto o grupo guardado crescer (máximo ${f.maxRespins}). O grupo fica sticky.`,
  ONE_MORE_ROUND: f => `Cada respin que não faz crescer o grupo deixa um wild adjacente e dá outro respin (máximo ${f.maxRespinsExtra} extra).`,
  SLOW_DISASTER: f => `Os wilds do rasto são <b>HOLD wilds</b> (ficam até entrarem num prémio) e o bêbado dá mais um passo em cada cascata (máximo ${f.passosExtraMax} extra).`,
  RAVE_DIMENSION: () => 'Cada símbolo que o MDMA move deixa uma cópia na célula de onde saiu.',
  TOTAL_MAYHEM: f => `Depois de cada cascata, os wilds do rasto saltam para a célula que liga dois grupos do mesmo tipo (ou para junto do maior grupo). Máximo ${f.saltosMax} saltos.`,
  FROZEN_REALITY: () => 'As células transformadas pelo LCD ficam sticky até ao fim do spin e crescem como o SLOW MOTION (as Lava lamps adjacentes juntam-se).',
  FREEZE_AND_FREAK: f => `Enquanto o grupo sticky do WEED existir, depois de cada refill o MDMA puxa mais um símbolo igual para ele (máximo ${f.puxoesMax}).`,
  DREAM_GLITCH: () => 'No respin só caem símbolos do tipo guardado ou baixos, e as Raspadinhas revelam sempre o tipo guardado.',
  ONE_MORE_RAVE: () => 'No respin, cada símbolo igual ao grupo guardado é puxado de imediato para junto do grupo.',
  DOUBLE_VISION: () => 'Dois rastos de wilds em espelho: o segundo é o reflexo horizontal do primeiro.',
};

function tabelaPagamentos() {
  const sizes = [];
  for (let s = config.clusterMin; s <= config.payMaxSize; s++) sizes.push(s === config.payMaxSize ? `${s}+` : String(s));
  const rows = T.SIMBOLOS.filter(s => s.cat === 'baixo' || s.cat === 'premium').map(s =>
    `<tr><td>${s.id} ${s.cat === 'premium' ? s.personagem : s.nome}</td>${config.pay[config.tables.SIMBOLOS.indexOf(s) + 1].map(v => `<td>${f3.format(v / 1000)}</td>`).join('')}</tr>`);
  return `<table><thead><tr><th>Símbolo \\ tamanho</th>${sizes.map(s => `<th>${s}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function exemploPremio() {
  const p3 = config.pay[8]; // P3
  const i7 = 7 - config.clusterMin;
  const base = p3[i7] / 1000, total = base * 5;
  return `<div class="ex">Exemplo: cluster de 7 × P3 COPIUM com um Wild de Canto ×3 e um Distintivo ×2. Multiplicador = 3 + 2 = ×5 (somam). Prémio = ${x(base)} × 5 = <b>${x(total)}</b> a aposta. Com aposta de 1,00 DJC: ${f2.format(total)} DJC.</div>`;
}

function tabelaPesos() {
  const sets = Object.keys(T.PESOS);
  const ids = Object.keys(T.PESOS.base);
  const rows = ids.map(id => `<tr><td>${id}</td>${sets.map(k => `<td>${pct(config.weights[k].prob[id] * 100)}</td>`).join('')}</tr>`);
  return `<table><thead><tr><th>Símbolo</th>${sets.map(k => `<th>${k}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function seccoes(bet) {
  const P = T.PODERES, PP = T.PEACE_POLICE, B = T.BONUS, R = T.RETRIGGER, C = T.CANTOS, CH = T.CHEMISTRY;
  const modes = config.modes;
  return [
    ['Como se joga', `
      <p>O palco tem 5 colunas com alturas 3–5–5–5–3: 21 células e 4 <b>Party Corners</b> fechados nos cantos, que podem abrir até 25.</p>
      <p>Paga um grupo de <b>${config.clusterMin} ou mais</b> símbolos iguais ligados na horizontal ou na vertical (as diagonais não ligam), com pelo menos ${config.clusterMinReal === 1 ? '1 símbolo real' : `${config.clusterMinReal} símbolos reais`}: os wilds contam por inteiro (um cluster só de wilds não paga). Todos os grupos do ciclo pagam ao mesmo tempo, saem do tabuleiro e caem símbolos novos pelo topo de cada coluna (cascata).</p>
      <p>Os wilds substituem qualquer símbolo pagante, nunca o Scatter. Não caem wilds naturais: nascem dos poderes, dos cantos e do Peace Police.</p>
      <p><b>HOLD wild:</b> um wild que fica no tabuleiro através das cascatas e dos respins (rasto do SLOW DISASTER, wilds que entram num grupo do WEED) até entrar num prémio; quando paga, sai com o cluster. Um HOLD wild só paga uma vez. Os Wilds de Canto e o Distintivo são diferentes: ficam até ao fim do spin.</p>
      <p>Um cluster de <b>${config.awakenMin}+</b> de uma personagem (P1–P5) <b>desperta-a</b> e ativa o seu poder. No jogo base cada personagem desperta no máximo uma vez por spin; no bónus fica desperta até ao fim e volta a disparar a cada novo cluster ${config.awakenMin}+.</p>
      <p><b>Ganho máximo:</b> ${f2.format(config.maxWinMils / 1000)}× a aposta por jogada completa, bónus incluído. As probabilidades nunca dependem do saldo, das perdas ou do histórico.</p>
      <p>Créditos fictícios. Versão da matemática: <b>${MATH_VERSION}</b>.</p>`],
    ['Pagamentos', `<p>Valores em × aposta base, por tamanho do cluster. O multiplicador dos wilds (soma de todos os Wilds de Canto e Distintivos do cluster, mínimo ×1) multiplica este valor.</p>${tabelaPagamentos()}${exemploPremio()}`],
    ['Símbolos', `
      <p>Cada personagem tem um símbolo baixo próprio, a matéria-prima do seu poder.</p>
      <table><thead><tr><th>ID</th><th>Símbolo</th><th>Categoria</th><th>Personagem</th></tr></thead><tbody>
      ${T.SIMBOLOS.map(s => `<tr><td>${s.id}</td><td>${s.nome}</td><td>${s.cat}</td><td>${s.personagem ?? '—'}</td></tr>`).join('')}</tbody></table>
      <h3>Probabilidade de cada símbolo numa célula (antes do empilhamento)</h3>${tabelaPesos()}
      <p>Empilhamento: cada célula nova pode copiar o símbolo de cima ou da esquerda (base: baixos ${pct(T.EMPILHAMENTO.base.baixo.vertical)} / ${pct(T.EMPILHAMENTO.base.baixo.horizontal)}, premium ${pct(T.EMPILHAMENTO.base.premium.vertical)} / ${pct(T.EMPILHAMENTO.base.premium.horizontal)}).</p>
      <p><b>Scatter (Pulseira VIP):</b> pode cair vários na mesma coluna, não paga sozinho, é protegido e conta no fim do spin.</p>`],
    ['Poderes', `
      <h3>LCD — ${POWER_NAME.LCD} (transforma)</h3><p>Todos os Prismas (N5) viram o premium com o maior grupo. Com menos de ${P.LCD.celulasMinimas} Prismas, completa com baixos junto ao maior grupo. Party Mode: transforma também mais ${P.LCD.partyTiposExtra} tipo(s) de baixo.</p>
      <h3>WEED — ${POWER_NAME.WEED} (cresce)</h3><p>O cluster que despertou fica sticky. Depois de cada refill, as Lava lamps (N1) adjacentes juntam-se (máximo ${P.WEED.maxConversoesPorCiclo} por ciclo). Enquanto cresce não paga; quando para de crescer (ou no fim do spin) paga <b>uma vez o tamanho final</b>, com os multiplicadores desse momento. Party Mode: fica sticky até ao fim do spin.</p>
      <h3>MDMA — ${POWER_NAME.MDMA} (junta)</h3><p>Leva símbolos iguais ao maior grupo premium. Movimentos = ${P.MDMA.movimentosBase} + nº de Colunas de som (N4), máximo ${P.MDMA.movimentosMax} (Party Mode: ${P.MDMA.movimentosMaxParty}). Sem símbolos soltos, as Colunas de som transformam-se no tipo do grupo.</p>
      <h3>ALCOOL — ${POWER_NAME.ALCOOL} (rasto de wilds)</h3><p>Começa num Copo de shot (N2) e cambaleia sempre em diagonal, deixando wilds. Passos = ${P.ALCOOL.passosBase} + nº de Copos de shot, máximo ${P.ALCOOL.passosMax}. Party Mode: ${P.ALCOOL.rastosParty} rastos.</p>
      <h3>COPIUM — ${POWER_NAME.COPIUM} (segunda oportunidade)</h3><p>Fica armado até a sequência acabar. Depois guarda o maior grupo (${P.COPIUM.grupoMinimo}+ células), raspa as Raspadinhas (N3: ${pct(P.COPIUM.probRaspadinha)} de revelar o tipo guardado) e faz respin do resto. ${P.COPIUM.respins} respin (Party Mode: ${P.COPIUM.respinsParty}).</p>
      <p>Cada poder dispara no máximo ${P.maxDisparosPorSpin} vezes por spin.</p>`],
    ['Fusões', `
      <p>Cada despertar a partir do segundo gera <b>exatamente uma fusão</b>: com o parceiro desperto de melhor rank ainda não fundido. A fusão substitui o poder normal. No bónus, as fusões persistem.</p>
      <table><thead><tr><th>Rank</th><th>Par</th><th>Fusão</th><th>Efeito</th></tr></thead><tbody>
      ${T.FUSOES.map(f => `<tr><td>${f.rank}</td><td>${f.par.join(' + ')}</td><td>${fusionName(f.id)}</td><td class="l">${DESC_FUSAO[f.id]?.(f) ?? ''}</td></tr>`).join('')}</tbody></table>`],
    ['Chemistry e cantos', `
      <table><thead><tr><th>Nível</th><th>Nome</th><th>Acontece</th></tr></thead><tbody>
      <tr><td>1</td><td>${LEVEL_NAME[1]}</td><td class="l">poder normal</td></tr>
      <tr><td>2</td><td>${LEVEL_NAME[2]}</td><td class="l">primeira fusão</td></tr>
      <tr><td>3</td><td>${LEVEL_NAME[3]}</td><td class="l">fusão + abrem ${CH.cantosNivel3} cantos</td></tr>
      <tr><td>4</td><td>${LEVEL_NAME[4]}</td><td class="l">fusão + abrem os restantes cantos</td></tr>
      <tr><td>5</td><td>${LEVEL_NAME[5]}</td><td class="l">${CH.totalDuplicaMultiplicadores ? 'multiplicadores do tabuleiro ×2 (uma vez)' : ''}${CH.totalRepetePoderesParty ? ' e cada personagem desperta volta a disparar em Party Mode' : ''}</td></tr>
      </tbody></table>
      <p><b>Party Corners:</b> abrem com um Wild de Canto ×${C.multiplicadorInicial}, sticky até ao fim do spin, que ganha +${C.incrementoPorPremio} por cada ciclo em que participa num prémio (máximo ×${C.multiplicadorMax}; ×${C.multiplicadorMaxAbsoluto} depois do Total Chemistry).</p>`],
    ['Peace Police', `
      <p>Em cada despertar há uma probabilidade de o Peace Police aparecer, no máximo uma vez por spin. Depois sorteia-se o modo.</p>
      <table><thead><tr><th>Modo</th><th>Aparecer (por despertar)</th><th>Joiner (quando aparece)</th></tr></thead><tbody>
      ${Object.keys(PP.probAparecer).map(k => `<tr><td>${k}</td><td>${pct(PP.probAparecer[k])}</td><td>${pct(PP.probJoiner[k])}</td></tr>`).join('')}</tbody></table>
      <h3>CALMER — «Everybody calm down!»</h3><p>Prende todos os símbolos baixos (saem, há refill e reavaliação) e fecha a escalada nesse spin: acabam as fusões e não abrem mais cantos. Nunca retira prémios.</p>
      <h3>JOINER — «I'm joining the party!»</h3><p>Todas as personagens despertas, e as que despertarem a seguir, ficam em <b>Party Mode</b>${PP.joinerRepetePoderes ? ' (e os poderes já despertos voltam a disparar)' : ''}. Deixa cair um <b>Distintivo</b>: wild multiplicador sticky, ${Object.entries(PP.distintivo).map(([m, w]) => `×${m} (${pct(100 * w / Object.values(PP.distintivo).reduce((a, b) => a + b, 0))})`).join(', ')}.</p>`],
    ['Bónus', `
      <p>3, 4 ou 5 Scatters no fim de um spin base ativam o bónus. As personagens despertas ficam despertas até ao fim, as fusões persistem e os cantos abertos ficam abertos.</p>
      <table><thead><tr><th></th>${Object.entries(T.ATIVACAO).map(([n, id]) => `<th>${n} S — ${B[id].nome}</th>`).join('')}</tr></thead><tbody>
      <tr><td>Free spins</td>${Object.values(T.ATIVACAO).map(id => `<td>${B[id].spins}</td>`).join('')}</tr>
      <tr><td>Personagens despertas no início</td>${Object.values(T.ATIVACAO).map(id => `<td>${B[id].personagensIniciais}</td>`).join('')}</tr>
      <tr><td>Cantos abertos no início</td>${Object.values(T.ATIVACAO).map(id => `<td>${B[id].cantosIniciais}</td>`).join('')}</tr>
      <tr><td>Wild de Canto</td>${Object.values(T.ATIVACAO).map(id => `<td>×${B[id].multCantoInicial} (máx. ×${B[id].multCantoMax}), ${B[id].cantosPersistemMultiplicador ? 'persiste entre spins' : 'volta ao início em cada spin'}</td>`).join('')}</tr>
      <tr><td>Peace Police</td>${Object.values(T.ATIVACAO).map(id => `<td>${B[id].joinerEmTodosOsSpins ? 'Joiner em todos os spins' : `${pct(PP.probAparecer[id])} por despertar, Joiner ${pct(PP.probJoiner[id])}`}</td>`).join('')}</tr>
      <tr><td>Distintivo</td>${Object.values(T.ATIVACAO).map(id => `<td>${B[id].distintivoEmTodosOsSpins ? '1 novo em cada spin' : 'só via Joiner'}</td>`).join('')}</tr>
      </tbody></table>
      <p><b>Retrigger:</b> ${R.scattersMinimos}+ Scatters dentro do bónus dão +${R.spinsExtra} spins (máximo ${R.spinsMaximoTotal} no total).</p>`],
    ['Compras e aposta extra', `
      <table><thead><tr><th>Modo</th><th>Custo</th><th>Com a aposta atual (${money(bet)})</th></tr></thead><tbody>
      ${Object.values(modes).map(m => `<tr><td>${m.nome}</td><td>${x(m.costMils / 1000)}</td><td>${money(bet * m.costMils / 1000)}</td></tr>`).join('')}</tbody></table>
      <p><b>Aposta extra MAIS SCATTERS:</b> cada spin custa ${x(modes.hunt.costMils / 1000)} a aposta base e caem mais Scatters (peso ${T.PESOS.hunt.S} em vez de ${T.PESOS.base.S}). Os prémios são sempre calculados sobre a aposta base. Não acumula com as compras.</p>
      <p><b>Compras:</b> entram diretamente no bónus, com o estado inicial desse bónus.</p>
      <p>RTP alvo: ${f2.format(T.ALVO.rtpMin)}–${f2.format(T.ALVO.rtpMax)} % em cada modo (medição local por simulação, não certificada).</p>`],
    ['Teclado e ritmo', `
      <p><b>ESPAÇO</b> roda; com uma janela aberta, ESPAÇO = CONTINUAR. Manter premido dá turbo contínuo.</p>
      <p>Durante um spin: 1.º toque acelera 3×, 2.º toque acelera 8× e deixa a jogada seguinte pronta, 3.º toque salta o resto da apresentação desse spin. Dois toques seguidos ligam o turbo automático.</p>
      <p>Velocidades: Normal, Rápido e Ultra (botão na barra).</p>`],
  ];
}

export function montarRegras(tabs, body, getBet) {
  let current = 0;
  const draw = () => {
    const list = seccoes(getBet());
    tabs.replaceChildren(...list.map(([title], i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.role = 'tab'; b.textContent = title;
      b.setAttribute('aria-selected', String(i === current));
      b.addEventListener('click', () => { current = i; draw(); });
      return b;
    }));
    body.innerHTML = `<h3>${list[current][0]}</h3>${list[current][1]}`;
    body.scrollTop = 0;
  };
  draw();
  return { refresh: draw };
}

export { xBet };
