import { artImage, PERSONA_ID } from './art-loader.js';
import { config } from '../src/index.js';
import { audio } from './fx-audio.js';

export const INTRO_KEY = 'pp-intro-v1-hidden';
const p = config.powers;
const scenes = [
  ['WEED', 'O grupo fica. A festa cresce.', [
    ['ATIVA', 'Liga 5+ WEED na horizontal ou vertical.'],
    ['CRESCE', 'O grupo fica preso. Até '+p.WEED.maxConversoesPorCiclo+' Bob Joints vizinhos por cascata viram WEED e juntam-se.'],
    ['PAGA', 'Uma vez pelo tamanho final, quando para de crescer.'],
    ['PARTY MODE', 'Fica até ao fim da rodada e paga nessa altura.'],
  ]],
  ['ALCOOL', 'Segue o rasto de wilds.', [
    ['ATIVA', 'Liga 5+ ALCOOL na horizontal ou vertical.'],
    ['PERCORRE', 'Parte de um Copo de shot livre e deixa até '+p.ALCOOL.passosMax+' wilds num rasto diagonal. Sem copos, parte de outro símbolo pagante livre.'],
    ['OBSERVA', 'Os wilds substituem símbolos. Só as ligações horizontais e verticais pagam; o rasto termina nesta rodada.'],
    ['PARTY MODE', 'Cria até '+p.ALCOOL.rastosParty+' rastos.'],
  ]],
  ['COPIUM', 'Mais uma volta à pista.', [
    ['ATIVA', 'Liga 5+ COPIUM na horizontal ou vertical. Espera pelo fim das cascatas.'],
    ['GUARDA', 'Mantém o maior grupo elegível, de preferência de uma personagem. Volta a rodar os símbolos livres.'],
    ['REVELA', 'Cada Cope Cannister (botija de Copium) livre tem '+p.COPIUM.probRaspadinha+' % de virar o tipo guardado. Caso contrário, revela outro símbolo sorteado.'],
    ['PARTY MODE', p.COPIUM.respinsParty+' novas voltas em vez de '+p.COPIUM.respins+'. Termina nesta rodada.'],
  ]],
  ['MDMA', 'Os iguais juntam-se na pista.', [
    ['ATIVA', 'Liga 5+ MDMA na horizontal ou vertical.'],
    ['JUNTA', 'Troca símbolos iguais livres para junto do maior grupo de uma personagem, até '+p.MDMA.movimentosMax+' movimentos.'],
    ['TRANSFORMA', 'Sem iguais livres, uma Pastilha pode virar o tipo do grupo. Depois seguem-se as cascatas.'],
    ['PARTY MODE', 'Até '+p.MDMA.movimentosMaxParty+' movimentos nesta ativação.'],
  ]],
  ['LCD', 'Os Selos mudam a realidade.', [
    ['ATIVA', 'Liga 5+ LCD na horizontal ou vertical.'],
    ['TRANSFORMA', 'Selos viram o tipo de personagem com o maior grupo. Completa com outros baixos se necessário, até '+p.LCD.celulasMax+' células.'],
    ['OBSERVA', 'A mudança é imediata; seguem-se as cascatas normais.'],
    ['PARTY MODE', 'Inclui mais um tipo de baixo e transforma até '+p.LCD.celulasMaxParty+' células.'],
  ]],
  ['PEACE POLICE', 'Acalma… ou entra na festa.', [
    ['ENTRA', 'Pode aparecer após uma ativação, no máximo uma vez por rodada.'],
    ['CALMER', 'Substitui os baixos livres e bloqueia novas fusões e cantos nessa rodada. Não retira prémios.'],
    ['JOINER', 'Ativa o Party Mode até ao fim da rodada e tenta colocar o Joiner. No POLICE PARTY, entra em todas as rodadas grátis.'],
    ['NA GRELHA', 'É um wild: multiplica a soma dos cantos do grupo em que participa. Fica até ao fim da rodada.'],
  ]],
];

/** Presentation only. The preference is saved only after the final scene. */
export async function showIntro(art) {
  try { if (localStorage.getItem(INTRO_KEY) === '1') return; } catch {}
  const d = document.createElement('dialog');
  d.id = 'intro-dialog'; d.className = 'intro-dialog';
  d.setAttribute('aria-labelledby', 'intro-name');
  d.addEventListener('cancel', e => e.preventDefault());
  d.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
    if (e.repeat && ['Enter', ' '].includes(e.key)) e.preventDefault();
  });
  document.body.append(d);
  try {
    for (let i = 0; i < scenes.length; i++) {
      const [name, headline, steps] = scenes[i], last = i === scenes.length - 1;
      d.dataset.persona = name;
      d.style.setProperty('--intro-color', name === 'PEACE POLICE' ? 'var(--acid-lime)' : 'var(--' + name + ')');
      d.innerHTML = '<div class="intro-scene"><p class="kicker">CONHECE A FESTA · ' + (i + 1) + ' / ' + scenes.length + '</p><div class="intro-portrait" aria-hidden="true"></div><h2 id="intro-name">' + name + '</h2><h3>' + headline + '</h3><section class="intro-how" aria-label="Como funciona"><h4>COMO FUNCIONA</h4><dl>' + steps.map(([label,text]) => '<div><dt>'+label+'</dt><dd>'+text+'</dd></div>').join('') + '</dl></section></div><footer class="intro-actions' + (last ? ' intro-actions-final' : '') + '">' + (last ? '<label class="primary intro-preference"><input type="checkbox" id="intro-hide"><span>Não mostrar novamente</span></label>' : '') + '<p class="intro-wait" role="status"><span aria-hidden="true">✦</span> A PISTA ESTÁ A CHAMAR…</p><button type="button" class="primary intro-next" hidden>' + (last ? 'JOGAR' : 'CONTINUAR') + '</button></footer>';
      const portrait = d.querySelector('.intro-portrait');
      const image = artImage(art, name === 'PEACE POLICE' ? 'CHR-POL-JOINER' : 'CHR-' + PERSONA_ID[name] + '-PORT');
      if (image) portrait.append(image);
      if (last) { const calmer = artImage(art, 'CHR-POL-CALMER'); if (calmer) portrait.prepend(calmer); }
      if (!d.open) d.showModal();
      audio.event(name === 'PEACE POLICE' ? {type:'police.enter',mode:'joiner'} : {type:'persona.awaken',persona:name});
      d.tabIndex = -1; d.focus();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches && document.body.dataset.reduced !== 'true') {
        portrait.animate([{opacity:0, transform:'translateY(18px) scale(.94)'},{opacity:1, transform:'none'}], {duration:650,easing:'ease-out'});
      }
      const button = d.querySelector('.intro-next');
      await new Promise(resolve => setTimeout(resolve, 1500));
      d.querySelector('.intro-wait').hidden = true;
      button.hidden = false;
      // Preserve focus on the final preference if the player selected it.
      if (document.activeElement === d) button.focus({preventScroll:true});
      await new Promise(resolve => button.addEventListener('click', resolve, {once:true}));
      if (last && d.querySelector('#intro-hide').checked) {
        try { localStorage.setItem(INTRO_KEY, '1'); } catch {}
      }
    }
  } finally { d.close(); d.remove(); }
}
