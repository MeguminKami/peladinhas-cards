import { config } from '../src/index.js';
import { GROUP_HELP } from './help-copy.js';

export const DESC_FUSAO = {
  NEVER_ENDING_DREAM: f => `No fim das cascatas, o COPIUM guarda o maior grupo elegível e volta a rodar os símbolos livres. Se o grupo crescer antes das novas cascatas, acrescenta um respin, até ${f.maxRespins} nesta sequência. Observa o grupo guardado em cada respin; pode mudar após os prémios.`,
  ONE_MORE_ROUND: f => `No fim das cascatas, o COPIUM guarda um grupo e faz respin dos símbolos livres. Se esse grupo não crescer, concede outro respin (até ${f.maxRespinsExtra} extra). Antes do seguinte, tenta colocar um wild junto ao grupo então escolhido. Observa o wild novo antes de os restantes símbolos rodarem.`,
  SLOW_DISASTER: f => `O ALCOOL cria um rasto diagonal de wilds que ficam até participarem num prémio; depois saem com o grupo. Nas cascatas seguintes, o percurso continua com mais um passo por ciclo, até ${f.passosExtraMax} passos extra por rasto. Observa os wilds que ficam e as novas células do percurso.`,
  RAVE_DIMENSION: f => `O MDMA procura o maior grupo de uma personagem e copia símbolos iguais livres para junto dele: a origem mantém o símbolo e o destino recebe a cópia. Sem iguais livres, transforma Pastilhas nesse tipo. Observa as duas posições ocupadas pelo mesmo símbolo; esta fusão não faz a transformação geral do LCD.`,
  TOTAL_MAYHEM: f => `Primeiro o ALCOOL cria um rasto diagonal de wilds. Depois das cascatas, os wilds desse rasto que ainda estejam livres trocam de posição com símbolos para ligar dois grupos iguais; sem essa ligação, procuram o maior grupo de uma personagem. Há até ${f.saltosMax} ciclos de saltos. Observa a origem e o destino: o salto move o wild, sem criar uma cópia.`,
  FROZEN_REALITY: f => `Primeiro o LCD transforma baixos no tipo de personagem escolhido. As células transformadas que se tocam na horizontal ou vertical ficam em grupos presos até ao fim da rodada. Após novas quedas, Bob Joints adjacentes transformam-se no tipo de cada grupo e juntam-se a ele. Observa os grupos a crescer: cada um só paga pelo tamanho final se formar um grupo premiado.`,
  FREEZE_AND_FREAK: f => `O grupo que ativa a fusão fica preso. Após cada queda de símbolos, converte Bob Joints adjacentes e depois tenta puxar um símbolo igual livre para junto do grupo, por troca; sem igual livre, pode transformar uma Pastilha. Até ${f.puxoesMax} puxões por grupo. Observa o crescimento antes do pagamento único pelo tamanho final; sem Party Mode, o grupo sai quando deixa de crescer.`,
  DREAM_GLITCH: f => `No fim das cascatas, o COPIUM guarda o maior grupo elegível. As Botijas de Copium livres revelam sempre o tipo escolhido. No respin das restantes células só podem sair esse tipo ou símbolos baixos; depois regressam as cascatas normais. Observa as Botijas de Copium transformadas e os símbolos novos; os Scatters já presentes ficam protegidos.`,
  ONE_MORE_RAVE: f => `No fim das cascatas, o COPIUM guarda um grupo e faz respin dos símbolos livres. Antes de avaliar os novos prémios, troca os símbolos livres do tipo guardado para posições junto do grupo, enquanto houver destinos válidos. Observa os iguais a juntarem-se depois do respin. Esta atração não transforma Pastilhas.`,
  DOUBLE_VISION: f => `O ALCOOL cria primeiro o rasto diagonal de wilds. Depois coloca wilds nas posições refletidas da esquerda para a direita, apenas onde puder: Scatters, wilds e células presas ficam protegidos. Observa o rasto e o seu reflexo horizontal; as diagonais continuam sem ligar grupos para pagamento.`,
};

const WHEN = {
  NEVER_ENDING_DREAM:'Arma o COPIUM na ativação da fusão. O respin começa quando acabam as cascatas; sem grupo elegível, escolhe um tipo de personagem ao acaso.',
  ONE_MORE_ROUND:'Arma o COPIUM; no fim da sequência, os respins extra dependem de o grupo guardado não crescer.',
  SLOW_DISASTER:'O rasto nasce quando a fusão dispara; os passos adicionais acontecem nas cascatas seguintes do mesmo rodada.',
  RAVE_DIMENSION:'Atua nos movimentos do MDMA desta ativação, quando existem símbolos soltos ou Pastilhas para transformar.',
  TOTAL_MAYHEM:'O ALCOOL cria o rasto na ativação; os saltos procuram novas ligações depois das cascatas desse rodada.',
  FROZEN_REALITY:'O LCD transforma símbolos na ativação. Após cada queda de novos símbolos, os Bob Joints adjacentes podem juntar-se aos grupos presos no lugar criados.',
  FREEZE_AND_FREAK:'O grupo preso no lugar nasce da ativação do WEED; enquanto existir, o MDMA atua depois dos queda de novos símboloss desse rodada.',
  DREAM_GLITCH:'Arma o COPIUM. A restrição de símbolos e a revelação garantida das Botijas de Copium só se aplicam ao respin desta sequência.',
  ONE_MORE_RAVE:'Arma o COPIUM. A atração de símbolos acontece durante os respins, depois de guardar o grupo elegível.',
  DOUBLE_VISION:'Os dois rastos diagonais são criados quando a fusão dispara; só ocupam células válidas segundo o poder do ALCOOL.',
};
const HOW = {
  NEVER_ENDING_DREAM:'O grupo escolhido fica no lugar durante o respin; nas cascatas seguintes obedece às regras normais. O crescimento decide se há outra oportunidade; os prémios seguem os grupos e multiplicadores reais.',
  ONE_MORE_ROUND:'O wild extra substitui símbolos pagantes e pode ligar o grupo guardado a outros símbolos. O número de oportunidades extra é limitado, mesmo que não haja crescimento.',
  SLOW_DISASTER:'Cada wild substitui símbolos pagantes, nunca Scatters. Um HOLD wild mantém-se nas cascatas até participar num prémio; depois sai com o cluster.',
  RAVE_DIMENSION:'A cópia fica na origem e o símbolo movido chega ao destino, aumentando as oportunidades de ligar símbolos iguais sem esvaziar a origem.',
  TOTAL_MAYHEM:'Os wilds mudam de posição para tentar ligar grupos; não são multiplicadores novos nem prémios garantidos. Só há saltos para destinos válidos.',
  FROZEN_REALITY:'As células transformadas ficam presas ao grupo. O grupo não paga a cada crescimento: paga uma vez pelo tamanho final, com os multiplicadores desse momento, quando é concluído na rodada.',
  FREEZE_AND_FREAK:'O símbolo puxado junta-se ao grupo que está a crescer. O grupo paga uma vez pelo tamanho final, em vez de repetir o mesmo prémio a cada queda de novos símbolos.',
  DREAM_GLITCH:'O grupo guardado fica no lugar. No resto do tabuleiro, a seleção de símbolos favorece o tipo guardado; as Botijas de Copium transformadas podem ajudar a criar novas ligações.',
  ONE_MORE_RAVE:'Os símbolos do tipo guardado deslocam-se para posições junto do grupo, quando existe espaço válido; os restantes símbolos continuam a obedecer ao respin.',
  DOUBLE_VISION:'Cada passo de um rasto tem um reflexo horizontal. Os wilds substituem símbolos pagantes; os Scatters e as células protegidas continuam a ser respeitados.',
};
export function fusionDescription(id, {bonus=false,detailed=false}={}) {
  const fusion = config.fusions.find(f => f.id === id);
  if(!fusion||!DESC_FUSAO[id])return '';
  const effect=DESC_FUSAO[id](fusion);
  if(!detailed)return effect;
  const duration=bonus?`A fusão fica disponível até ao fim deste bónus e pode voltar a disparar com novos clusters de ${config.awakenMin}+ das personagens envolvidas, até ${config.powers.maxDisparosPorSpin} ativações por personagem e rodada. O Calmer bloqueia novas fusões nessa rodada. Os rastos, grupos e respins desta ativação pertencem à rodada atual.`:'O efeito pertence apenas à rodada atual e às suas cascatas/respins. Não passa para a próxima jogada paga.';
  return `<p>${GROUP_HELP}</p>${fusion.par.includes('COPIUM') ? `<p>Respin significa voltar a rodar os símbolos livres, mantendo o grupo escolhido, os Scatters e as células presas. Guarda de preferência o maior grupo de uma personagem com ${config.powers.COPIUM.grupoMinimo}+ células. Sem ele, o maior grupo de outro tipo. Sem grupo elegível, escolhe um tipo de personagem ao acaso.</p>` : ''}<p><b>Poderes ativados:</b> ${fusion.par.join(' + ')}. A fusão substitui o poder normal desta ativação.</p><p><b>O que acontece:</b> ${effect}</p><p><b>Como funciona:</b> ${HOW[id]}</p><p><b>Quando atua:</b> ${WHEN[id]}</p><p><b>Duração:</b> ${duration}</p>`;
}

// Short reading copy for in-game interruptions. Full explanations remain in help.
export function fusionBrief(id) {
  const f=config.fusions.find(f=>f.id===id);
  if(!f)return '';
  const text={
    NEVER_ENDING_DREAM: () => 'No fim das cascatas, guarda um grupo e roda o resto. Se crescer, ganha outra volta, até '+f.maxRespins+'. O grupo pode mudar entre voltas.',
    ONE_MORE_ROUND: () => 'Guarda um grupo e roda o resto. Se não crescer, dá outra volta e tenta colocar um wild junto ao grupo. Até '+f.maxRespinsExtra+' voltas extra.',
    SLOW_DISASTER: () => 'Cria um rasto diagonal de wilds que ficam até entrarem num prémio. Nas cascatas seguintes, o rasto continua, até '+f.passosExtraMax+' passos extra por percurso.',
    RAVE_DIMENSION: () => 'Copia símbolos iguais para junto do maior grupo de uma personagem, mantendo os originais. Sem iguais livres, transforma Pastilhas nesse tipo.',
    TOTAL_MAYHEM: () => 'Cria um rasto diagonal de wilds. Depois, os wilds livres mudam de lugar para ligar grupos iguais ou aproximar-se do maior grupo. Até '+f.saltosMax+' ciclos de saltos.',
    FROZEN_REALITY: () => 'Transforma baixos em personagens e prende os símbolos transformados até ao fim da rodada. Bob Joints vizinhos juntam-se aos grupos. Cada grupo paga uma vez pelo tamanho final, se formar uma combinação premiada.',
    FREEZE_AND_FREAK: () => 'Prende o grupo. Após cada queda, converte Bob Joints vizinhos e puxa um igual para junto dele, até '+f.puxoesMax+' puxões. Paga uma vez pelo tamanho final. Em Party Mode, fica até ao fim.',
    DREAM_GLITCH: () => 'Guarda um grupo e roda o resto. As botijas de Copium revelam sempre o tipo escolhido. Nos símbolos novos dessa volta só saem esse tipo ou baixos.',
    ONE_MORE_RAVE: () => 'Guarda um grupo e roda o resto. Antes de avaliar os prémios, puxa os símbolos livres desse tipo para junto do grupo, enquanto houver posições válidas.',
    DOUBLE_VISION: () => 'Cria um rasto diagonal de wilds e depois o seu reflexo horizontal nas posições livres. Observa os dois lados da grelha. Os Scatters e os símbolos presos ficam protegidos.',
  }[id];
  return text ? '<p>'+text()+'</p>' : '';
}
