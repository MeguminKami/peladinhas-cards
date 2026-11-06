/**
 * Regras do jogo, GERADAS A PARTIR DA CONFIGURAÇÃO (tabelas/ via src/config.js).
 * Os números (pagamentos, pesos, parâmetros dos poderes, probabilidades, preços) nunca se escrevem
 * à mão: quando a matemática muda, as regras mudam sozinhas.
 */
import { config, MATH_VERSION } from '../src/index.js';
import { artImage, FUSION_ART, BONUS_ART, PERSONA_ID } from './art-loader.js';
import { fusionName, POWER_NAME, LEVEL_NAME, money, xBet } from './texto.js';

import { fusionDescription } from './fusion-copy.js';
import { GROUP_HELP, AWAKEN_HELP, powerDescription, bonusDescription } from './help-copy.js';

const T = config.tables;
const f2 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
const f3 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 3 });
const pct = v => `${f2.format(v)} %`;
const x = v => `${f3.format(v)}×`;



function tabelaPagamentos() {
  const sizes = config.payColumns.map(c => c.label);
  const rows = T.SIMBOLOS.filter(s => s.cat === 'baixo' || s.cat === 'premium').map(s =>
    `<tr><td>${s.id} ${s.cat === 'premium' ? s.personagem : s.nome}</td>${config.payTable[config.tables.SIMBOLOS.indexOf(s) + 1].map(v => `<td>${f3.format(v / 1000)}</td>`).join('')}</tr>`);
  return `<table><thead><tr><th>Símbolo \\ tamanho</th>${sizes.map(s => `<th>${s}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function exemploPremio() {
  const p3 = config.pay[8]; // P3
  const i7 = 7 - config.clusterMin;
  const base = p3[i7] / 1000, total = base * 6;
  return `<div class="ex">Exemplo: cluster de 7 × P3 COPIUM com dois Wilds de Canto ×2 e ×1 e um Joiner ×2. Multiplicador = (2 + 1) × 2 = ×6 (os cantos somam; o Joiner multiplica). Prémio = ${x(base)} × 6 = <b>${x(total)}</b> a aposta. Com aposta de 1,00 DJC: ${f2.format(total)} DJC.</div>`;
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
      <p>Um <b>cluster</b> é um grupo de símbolos iguais ligados na horizontal ou vertical. Paga um grupo de <b>${config.clusterMin} ou mais</b> símbolos iguais ligados na horizontal ou na vertical (as diagonais não ligam), com pelo menos ${config.clusterMinReal === 1 ? '1 símbolo real' : `${config.clusterMinReal} símbolos reais`}: os wilds contam por inteiro (um cluster só de wilds não paga). Todos os grupos do ciclo pagam ao mesmo tempo, saem do tabuleiro e caem símbolos novos pelo topo de cada coluna (cascata).</p>
      <p>Os wilds substituem qualquer símbolo pagante, nunca o Scatter. Não caem wilds naturais: nascem dos poderes, dos cantos e do Peace Police.</p>
      <p><b>HOLD wild:</b> um wild que fica no tabuleiro através das cascatas e dos respins (rasto do SLOW DISASTER, wilds que entram num grupo do WEED) até entrar num prémio; quando paga, sai com o cluster. Um HOLD wild só paga uma vez. Os Wilds de Canto e o Joiner são diferentes: ficam até ao fim do spin.</p>
      <p>Um cluster de <b>${config.awakenMin}+</b> de uma personagem (P1–P5) <b>desperta-a</b> e ativa o seu poder. No jogo base cada personagem desperta no máximo uma vez por spin; no bónus fica desperta até ao fim e volta a disparar a cada novo cluster ${config.awakenMin}+.</p>
      <p><b>Ganho máximo:</b> ${f2.format(config.maxWinMils / 1000)}× a aposta por jogada completa, bónus incluído. As probabilidades nunca dependem do saldo, das perdas ou do histórico.</p>
      <p>Créditos fictícios. Versão da matemática: <b>${MATH_VERSION}</b>.</p>`],
    ['Pagamentos', `<p>Valores em × aposta base, por tamanho do cluster. O multiplicador do cluster (soma dos Wilds de Canto do cluster × Joiner, mínimo ×1, com teto por modo) multiplica este valor.</p>${tabelaPagamentos()}${exemploPremio()}`],
    ['Símbolos', `
      <p>Cada personagem tem um símbolo baixo próprio, a matéria-prima do seu poder.</p>
      <table><thead><tr><th>ID</th><th>Símbolo</th><th>Categoria</th><th>Personagem</th></tr></thead><tbody>
      ${T.SIMBOLOS.map(s => `<tr><td>${s.id}</td><td>${s.nome}</td><td>${s.cat}</td><td>${s.personagem ?? '—'}</td></tr>`).join('')}</tbody></table>
      <h3>Probabilidade de cada símbolo numa célula (antes do empilhamento)</h3>${tabelaPesos()}
      <p>Empilhamento: cada célula nova pode copiar o símbolo de cima ou da esquerda (base: baixos ${pct(T.EMPILHAMENTO.base.baixo.vertical)} / ${pct(T.EMPILHAMENTO.base.baixo.horizontal)}, premium ${pct(T.EMPILHAMENTO.base.premium.vertical)} / ${pct(T.EMPILHAMENTO.base.premium.horizontal)}).</p>
      <p><b>Scatter (Passe da Afterparty):</b> pode cair vários na mesma coluna, não paga sozinho, é protegido e conta no fim do spin.</p>`],
    ['Poderes', `<p>${GROUP_HELP}</p><p>${AWAKEN_HELP()}</p>${Object.keys(POWER_NAME).map(p => `<h3>${p} — ${POWER_NAME[p]}</h3><p><b>Ativação:</b> grupo de ${config.awakenMin}+ de ${p}, ou repetição pelo Joiner/Total Chemistry.</p><p>${powerDescription(p)}</p>`).join('')}`],
    ['Fusões', `
      <p>Cada despertar a partir do segundo gera <b>exatamente uma fusão</b>: com o parceiro desperto de melhor rank ainda não fundido. A fusão substitui o poder normal. No bónus, as fusões persistem.</p>
      <p><b>Fusão surpresa:</b> no jogo base e no MAIS SCATTERS, ${pct(T.FUSAO_SURPRESA.probabilidade.base)} dos spins disparam uma fusão ao acaso logo depois de cair a grelha. Não acorda personagens nem conta para o Chemistry.</p>
      <table><thead><tr><th>Rank</th><th>Par</th><th>Fusão</th><th>Efeito</th></tr></thead><tbody>
      ${T.FUSOES.map(f => `<tr><td>${f.rank}</td><td>${f.par.join(' + ')}</td><td>${fusionName(f.id)}</td><td class="l">${fusionDescription(f.id, { detailed: true, bonus: true })}</td></tr>`).join('')}</tbody></table>`],
    ['Chemistry e cantos', `
      <table><thead><tr><th>Nível</th><th>Nome</th><th>Acontece</th></tr></thead><tbody>
      <tr><td>1</td><td>${LEVEL_NAME[1]}</td><td class="l">poder normal</td></tr>
      <tr><td>2</td><td>${LEVEL_NAME[2]}</td><td class="l">primeira fusão</td></tr>
      <tr><td>3</td><td>${LEVEL_NAME[3]}</td><td class="l">fusão + abrem ${CH.cantosNivel3} cantos</td></tr>
      <tr><td>4</td><td>${LEVEL_NAME[4]}</td><td class="l">fusão + abrem os restantes cantos</td></tr>
      <tr><td>5</td><td>${LEVEL_NAME[5]}</td><td class="l">${CH.totalSomaCantos ? `cada Wild de Canto +${CH.totalSomaCantos} (uma vez)` : ''}${CH.totalRepetePoderesParty ? ' e cada personagem desperta volta a disparar em Party Mode' : ''}</td></tr>
      </tbody></table>
      <p><b>Party Corners:</b> abrem com um Wild de Canto ×${C.multiplicadorInicial}, sticky até ao fim do spin, que ganha +${C.incrementoPorPremio} por cada ciclo em que participa num prémio (máximo ×${C.multiplicadorMax}; ×${C.multiplicadorMaxAbsoluto} depois do Total Chemistry). O Joiner multiplica a soma dos cantos do cluster (máximo ×${C.multClusterMax} por cluster no jogo base).</p>`],
    ['Peace Police', `
      <p>Em cada despertar há uma probabilidade de o Peace Police aparecer, no máximo uma vez por spin. Depois sorteia-se o modo.</p>
      <table><thead><tr><th>Modo</th><th>Aparecer (por despertar)</th><th>Joiner (quando aparece)</th></tr></thead><tbody>
      ${Object.keys(PP.probAparecer).map(k => `<tr><td>${k}</td><td>${pct(PP.probAparecer[k])}</td><td>${pct(PP.probJoiner[k])}</td></tr>`).join('')}</tbody></table>
      <h3>CALMER — «Everybody calm down!»</h3><p>Prende todos os símbolos baixos (saem, há refill e reavaliação) e fecha a escalada nesse spin: acabam as fusões e não abrem mais cantos. Nunca retira prémios.</p>
      <h3>JOINER — «I'm joining the party!»</h3><p>Todas as personagens despertas, e as que despertarem a seguir, ficam em <b>Party Mode</b>${PP.joinerRepetePoderes ? ' (e os poderes já despertos voltam a disparar)' : ''}. Deixa cair um <b>Joiner</b>: wild multiplicador sticky, ${Object.entries(PP.distintivo).map(([m, w]) => `×${m} (${pct(100 * w / Object.values(PP.distintivo).reduce((a, b) => a + b, 0))})`).join(', ')}.</p>`],
    ['Bónus', `
      ${Object.entries(B).map(([id,b]) => `<h3>${b.nome}</h3>${bonusDescription(id)}`).join('')}
      <table><thead><tr><th></th>${Object.entries(T.ATIVACAO).map(([n, id]) => `<th>${n} S — ${B[id].nome}</th>`).join('')}</tr></thead><tbody>
      <tr><td>Volatilidade</td>${Object.values(T.ATIVACAO).map(id => `<td>${B[id].volatilidade || ''}</td>`).join('')}</tr>
      <tr><td>Free spins</td>${Object.values(T.ATIVACAO).map(id => `<td>${B[id].spins}</td>`).join('')}</tr>
      <tr><td>Personagens despertas no início</td>${Object.values(T.ATIVACAO).map(id => `<td>${B[id].personagensIniciais}</td>`).join('')}</tr>
      <tr><td>Cantos abertos no início</td>${Object.values(T.ATIVACAO).map(id => `<td>${B[id].cantosIniciais}</td>`).join('')}</tr>
      <tr><td>Wild de Canto</td>${Object.values(T.ATIVACAO).map(id => `<td>×${B[id].multCantoInicial}, +${B[id].incrementoCanto || C.incrementoPorPremio} por prémio (máx. ×${B[id].multCantoMax}${(B[id].multMaxAbsoluto ?? C.multiplicadorMaxAbsoluto) > B[id].multCantoMax ? `; ×${B[id].multMaxAbsoluto ?? C.multiplicadorMaxAbsoluto} com o Total Chemistry` : ''}), ${B[id].cantosPersistemMultiplicador ? 'persiste entre spins' : 'volta ao início em cada spin'}</td>`).join('')}</tr>
      <tr><td>Peace Police</td>${Object.values(T.ATIVACAO).map(id => `<td>${B[id].joinerEmTodosOsSpins ? 'Joiner em todos os spins' : `${pct(PP.probAparecer[id])} por despertar, Joiner ${pct(PP.probJoiner[id])}`}</td>`).join('')}</tr>
      <tr><td>Joiner</td>${Object.values(T.ATIVACAO).map(id => `<td>${B[id].distintivoEmTodosOsSpins ? '1 novo em cada spin' : 'só via Joiner'}${B[id].distintivo ? `: ${Object.keys(B[id].distintivo).map(m => `×${m}`).join(', ')}` : ''}</td>`).join('')}</tr>
      </tbody></table>
      <p><b>Retrigger:</b> ${Object.entries(R.spinsPorScatters).map(([n, s]) => `${n} Scatters dão +${s} spins`).join('; ')} (no máximo ${R.scattersMaximoNoBonus} Scatters por spin no bónus; máximo ${R.spinsMaximoTotal} spins no total).</p>`],
    ['Compras e aposta extra', `
      <table><thead><tr><th>Modo</th><th>Custo</th><th>Com a aposta atual (${money(bet)})</th></tr></thead><tbody>
      ${Object.values(modes).map(m => `<tr><td>${m.nome}</td><td>${x(m.costMils / 1000)}</td><td>${money(bet * m.costMils / 1000)}</td></tr>`).join('')}</tbody></table>
      <p><b>Aposta extra MAIS SCATTERS:</b> cada spin custa ${x(modes.hunt.costMils / 1000)} a aposta base e caem mais Scatters (peso ${T.PESOS.hunt.S} em vez de ${T.PESOS.base.S}). Os prémios são sempre calculados sobre a aposta base. Não acumula com as compras.</p>
      <p><b>Compras:</b> entram diretamente no bónus, com o estado inicial desse bónus.</p>
      <p>RTP alvo: ${f2.format(T.ALVO.rtpMin)}–${f2.format(T.ALVO.rtpMax)} % em cada modo (medição local por simulação, não certificada).</p>`],
    ['Teclado e ritmo', `
      <p><b>ESPAÇO</b> roda; nos avisos de bónus, ESPAÇO = CONTINUAR depois do intervalo de proteção. Nas outras janelas, a tecla atua no botão focado.</p>
      <p>O seletor permite Normal, Rápido e Turbo, no jogo base e nos bónus. Só muda a apresentação: resultados e probabilidades são os mesmos. Podes mudar a velocidade durante um spin.</p>
      <p>Toques em RODAR durante a apresentação não criam uma fila nem saltam o resultado. Manter ESPAÇO premido não inicia jogadas adicionais. O Autoplay usa a velocidade selecionada e pode ser parado sem interromper a jogada atual.</p>`],
  ];
}

export function montarRegras(tabs, body, getBet, getArt = () => ({ images: new Map() })) {
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
    const title = list[current][0];
    const ids = title === 'Pagamentos' ? config.tables.SIMBOLOS.filter(s => s.cat === 'baixo' || s.cat === 'premium').map(s => ['SYM-' + s.id, s.id + ' · ' + (s.personagem || s.nome)])
      : title === 'Poderes' ? Object.entries(POWER_NAME).map(([p,name]) => ['CHR-' + PERSONA_ID[p] + '-PORT', p + ' · ' + name])
      : title === 'Fusões' ? config.fusions.map(f => [FUSION_ART[f.id], fusionName(f.id)])
      : title === 'Bónus' || title === 'Compras e aposta extra' ? Object.entries(BONUS_ART).map(([id,key]) => ['EMB-' + key, config.bonus[id].nome])
      : title === 'Peace Police' ? [['CHR-POL-CALMER','CALMER'],['CHR-POL-JOINER','JOINER']]
      : title === 'Chemistry e cantos' ? [['SYM-CW','Wild de Canto'],['SYM-DW','Joiner']]
      : [['SYM-W','WILD'],['SYM-S','SCATTER']];
    const gallery = document.createElement('div'); gallery.className = 'rule-gallery';
    for (const [id,label] of ids) { const img = artImage(getArt(), id); if (!img) continue; const figure = document.createElement('figure'), caption = document.createElement('figcaption'); caption.textContent = label; figure.append(img,caption); gallery.append(figure); }
    if (gallery.children.length) body.querySelector('h3').after(gallery);
    body.scrollTop = 0;
  };
  draw();
  return { refresh: draw };
}

export { xBet };
