/** Original, locally synthesised Acidwave effects. D natural minor, A4 = 440 Hz. */
export const sounds = {};
function add(ids, family, duration, priority = 2, gain = .24) {
  for (const id of ids.split(' ')) sounds[id] = { file: `sfx/${id}.wav`, family, duration, priority,
    gain, interval: priority === 1 ? 80 : priority === 2 ? 90 : priority === 3 ? 250 : 600,
    duck: priority >= 4 ? .38 : priority === 3 ? .72 : 1 };
}
add('click bet-step dialog-open dialog-close speed auto-start auto-stop overlay', 'ui', .09, 1, .10);
add('spin-press hunt-on hunt-off', 'ui', .16, 1, .13);
add('buy', 'chrome', .4, 3);
add('column-land cascade-land cluster-clear', 'landing', .16, 2, .18);
add('scatter-land wild-land multiplier-up', 'chrome', .24);
add('win-small', 'reward', .19, 2, .17);
add('win-medium', 'reward', .32, 2, .22);
sounds['win-small'].family = 'landing';
sounds['win-medium'].family = 'chrome';
add('count-tick', 'ui', .065, 1, .075);
add('count-end', 'reward', .3, 2, .18);
add('win-big win-huge win-epic max-win', 'reward', 1.2, 4, .36);
add('weed-hold group-grow group-release awaken-WEED', 'bubble', .46, 3);
add('alcohol-step awaken-ALCOOL', 'glass', .38, 3);
add('copium-ready copium-respin awaken-COPIUM', 'valve', .52, 3);
add('mdma-pull awaken-MDMA', 'pulse', .4, 3);
add('lcd-transform awaken-LCD', 'glitch', .42, 3);
add('calmer-enter calmer-sweep', 'calmer', .52, 3);
add('joiner-enter joiner-land party-on', 'chrome', .6, 3);
add('chemistry-up corner-open', 'chrome', .6, 3);
add('total-chemistry bonus-after bonus-vip bonus-police retrigger bonus-summary', 'reward', 1.1, 4, .32);
// Movement is deliberately lighter and can be repeated without stacking long tails.
for (const id of ['group-grow','group-release','alcohol-step','mdma-pull','weed-hold','copium-ready','calmer-sweep']) {
  Object.assign(sounds[id], { duration: .2, priority: 2, interval: 90, duck: 1, gain: .18 });
}
export const fusionFamilies = {
  NEVER_ENDING_DREAM: ['bubble','valve'], ONE_MORE_ROUND: ['glass','valve'],
  SLOW_DISASTER: ['bubble','glass'], RAVE_DIMENSION: ['pulse','glitch'],
  TOTAL_MAYHEM: ['glass','pulse'], FROZEN_REALITY: ['bubble','glitch'],
  FREEZE_AND_FREAK: ['bubble','pulse'], DREAM_GLITCH: ['valve','glitch'],
  ONE_MORE_RAVE: ['valve','pulse'], DOUBLE_VISION: ['glass','glitch'],
};
for (const [id, families] of Object.entries(fusionFamilies)) {
  add(`fusion-${id}`, 'fusion', .7, 3, .28);
  sounds[`fusion-${id}`].layers = families;
}
// Each cue has its own gesture and material, rather than a transposed family beep.
export const soundDescriptions = {
  click:'Toque seco de botão', 'bet-step':'Pequeno dente mecânico', 'dialog-open':'Deslizar e abrir',
  'dialog-close':'Fechar com toque abafado', speed:'Três impulsos cada vez mais próximos',
  'auto-start':'Engrenagem a arrancar', 'auto-stop':'Travão curto', overlay:'Sopro de papel cromado',
  'spin-press':'Mola e arranque grave', 'hunt-on':'Interruptor e ligação elétrica', 'hunt-off':'Interruptor e descarga',
  buy:'Ficha metálica a encaixar', 'column-land':'Impacto oco de madeira', 'cascade-land':'Cascata de pequenos impactos',
  'cluster-clear':'Dissolução granular', 'scatter-land':'Brilho de vidro com ressonância',
  'wild-land':'Salpico elástico', 'multiplier-up':'Pequeno zíper eletrónico ascendente',
  'win-small':'Confirmação tátil abafada', 'win-medium':'Corda curta e toque de madeira',
  'count-tick':'Grão de contador', 'count-end':'Encaixe e corda resolvida',
  'win-big':'Acorde house e batida', 'win-huge':'Break curto e acordes sincopados',
  'win-epic':'Subida de baixo ácido e percussão', 'max-win':'Impacto grave, acorde amplo e cauda cristalina',
  'weed-hold':'Bolha grave a prender', 'group-grow':'Bolhas que aumentam de corpo', 'group-release':'Bolha que esvazia',
  'awaken-WEED':'Baixo elástico e bolhas orgânicas', 'alcohol-step':'Vidro a tocar e gota líquida',
  'awaken-ALCOOL':'Copo, derrame e gotas desalinhadas', 'copium-ready':'Trinco de válvula',
  'copium-respin':'Válvula abre, ar sai e mecanismo rearma', 'awaken-COPIUM':'Pressão de ar e abertura da botija',
  'mdma-pull':'Sucção rítmica e impacto no destino', 'awaken-MDMA':'Break percussivo com subgrave',
  'lcd-transform':'Grãos digitais que trocam de frequência', 'awaken-LCD':'Cortes de fita digital e estilhaço prismático',
  'calmer-enter':'Travagem filtrada e batida abafada', 'calmer-sweep':'Varredura de ar grave',
  'joiner-enter':'Break de entrada e metal cromado', 'joiner-land':'Impacto metálico pesado',
  'party-on':'Acorde ácido com clap de pista', 'chemistry-up':'Ressonância de corda a abrir',
  'corner-open':'Chave, argola e correntes a soltar', 'total-chemistry':'As cinco texturas convergem num acorde',
  'bonus-after':'Acordes house abertos e shaker', 'bonus-vip':'Baixo profundo e metal escuro',
  'bonus-police':'Break de rave com baixo ácido', retrigger:'Duplo impulso e corda ascendente',
  'bonus-summary':'Corda descendente e ambiente a dissipar',
  'fusion-NEVER_ENDING_DREAM':'Bolhas e dois ciclos de pressão em espiral',
  'fusion-ONE_MORE_ROUND':'Válvula e vidro a ricochetear',
  'fusion-SLOW_DISASTER':'Gotas espaçadas e líquido a desacelerar',
  'fusion-RAVE_DIMENSION':'Break partido por cortes digitais',
  'fusion-TOTAL_MAYHEM':'Impactos irregulares, vidro e percussão',
  'fusion-FROZEN_REALITY':'Estilhaço digital que fica suspenso',
  'fusion-FREEZE_AND_FREAK':'Bolha grave presa sob percussão sincopada',
  'fusion-DREAM_GLITCH':'Ar comprimido fragmentado em grãos digitais',
  'fusion-ONE_MORE_RAVE':'Abertura de válvula que desencadeia um break',
  'fusion-DOUBLE_VISION':'Dois vidros em reflexo e ecos desencontrados',
};
const durations = {
  click:.055,'bet-step':.065,'dialog-open':.18,'dialog-close':.14,speed:.15,'auto-start':.23,'auto-stop':.17,overlay:.23,
  'spin-press':.25,'hunt-on':.24,'hunt-off':.22,buy:.5,'column-land':.15,'cascade-land':.25,'cluster-clear':.24,
  'scatter-land':.42,'wild-land':.29,'multiplier-up':.26,'count-tick':.055,'count-end':.36,
  'win-big':1.3,'win-huge':1.5,'win-epic':1.8,'max-win':2,
  'awaken-WEED':.85,'awaken-ALCOOL':.8,'awaken-COPIUM':.9,'awaken-MDMA':.78,'awaken-LCD':.7,
  'copium-respin':.65,'calmer-enter':.7,'joiner-enter':.8,'party-on':.85,'corner-open':.75,
  'total-chemistry':1.4,'bonus-after':1.35,'bonus-vip':1.5,'bonus-police':1.6,retrigger:.8,'bonus-summary':1.25,
};
const fusionDurations=[1.1,1,.95,.9,.95,1.1,.95,1,.95,1.05];
Object.keys(fusionFamilies).forEach((id,i)=>{durations[`fusion-${id}`]=fusionDurations[i];});
for(const [id,spec] of Object.entries(sounds)){
  if(durations[id])spec.duration=durations[id];
  spec.description=soundDescriptions[id];
}
export const eventSounds = {
  'step.start': null, 'grid.drop': 'column-land', 'win.cluster': 'win-small', 'cap.hit': 'max-win',
  'multiplier.change': 'multiplier-up', 'persona.awaken': 'awaken-WEED', 'fusion.trigger': 'fusion-NEVER_ENDING_DREAM',
  'grid.remove': 'cluster-clear', 'grid.refill': 'cascade-land', 'power.reality_break': 'lcd-transform',
  'power.slow_motion.start': 'weed-hold', 'power.slow_motion.grow': 'group-grow', 'power.slow_motion.end': 'group-release',
  'power.rave_rush.move': 'mdma-pull', 'power.drunk_walk.step': 'alcohol-step',
  'power.one_more_chance.armed': 'copium-ready', 'power.one_more_chance.respin': 'copium-respin',
  'wild.place': 'wild-land', 'chemistry.level': 'chemistry-up', 'corner.open': 'corner-open',
  'chemistry.total': 'total-chemistry', 'police.enter': 'calmer-enter', 'police.calmer.arrest': 'calmer-sweep',
  'police.joiner.party_mode': 'party-on', 'bonus.trigger': 'bonus-after', 'bonus.retrigger': 'retrigger',
  'bonus.end': 'bonus-summary', 'safety.stop': null, 'step.end': null,
};
export const noteRate = index => 2 ** ([0,2,3,5,7,8,10,12][Math.max(0, Math.min(7, index))] / 12);
