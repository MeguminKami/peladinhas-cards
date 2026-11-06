/**
 * Textos da interface: nomes dos símbolos, das fusões e dos níveis, e a narração de cada evento.
 * Os números vêm sempre do evento (ou da configuração); aqui só se formatam.
 */
import { config } from '../src/index.js';

const number = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mult3 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 3 });

/** Cêntimos -> «1 234,50 DJC». */
export const money = cents => `${number.format(cents / 100)} DJC`;
export const amount = cents => number.format(cents / 100);
/** Milésimos de aposta -> «2,25×». */
export const xBet = mils => `${mult3.format(mils / 1000)}×`;
/** Prémio em cêntimos para uma aposta (o motor arredonda o total da jogada para baixo; aqui o mesmo). */
export const winCents = (mils, bet) => Math.floor(bet * mils / 1000);

const exactBase = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 5 });
/** Format event values only. A limited payout is never presented as an ordinary product. */
export function clusterEquation(event, bet, { inBet = false } = {}) {
  const limited = event.pay < event.basePay * event.multiplier;
  const base = inBet ? xBet(event.basePay) : exactBase.format(bet * event.basePay / 100000);
  const result = inBet ? xBet(event.pay) : amount(winCents(event.pay, bet));
  const operator = limited ? '→' : !inBet && bet * event.pay % 1000 !== 0 ? '≈' : '=';
  return base + ' × ' + event.multiplier + ' ' + operator + ' ' + result + (limited ? ' (limite)' : '');
}


export const SIMBOLOS = Object.fromEntries(config.tables.SIMBOLOS.map(s => [s.id, s]));
const SHORT = { N1: 'Bob Joint', N2: 'Shot', N3: 'Cope Cannister', N4: 'Pastilha', N5: 'Selo', W: 'WILD', CW: 'CANTO', DW: 'Joiner', S: 'SCATTER', X: 'fechado', '': '' };
/** Nome curto para a célula. */
export function shortName(id) {
  if (SHORT[id] !== undefined) return SHORT[id];
  return SIMBOLOS[id]?.personagem ?? id;
}
/** Nome completo: «P3 COPIUM», «N1 Bob Joint». */
export function symName(id) {
  const s = SIMBOLOS[id];
  if (!s) return id;
  return s.cat === 'premium' ? `${id} ${s.personagem}` : `${id} ${s.nome}`;
}
export const categoria = id => id === 'X' ? 'locked' : id === '' ? 'empty' : (SIMBOLOS[id]?.cat === 'baixo' ? 'low' : SIMBOLOS[id]?.cat ?? 'empty');

export const fusionName = id => id === 'FREEZE_AND_FREAK' ? 'FREEZE & FREAK' : String(id).replaceAll('_', ' ');
export const POWER_NAME = { LCD: 'REALITY BREAK', WEED: 'SLOW MOTION', MDMA: 'RAVE RUSH', ALCOOL: 'DRUNK WALK', COPIUM: 'ONE MORE CHANCE' };
export const POWER_HINT = {LCD:'Transforma',WEED:'Faz crescer',MDMA:'Junta iguais',ALCOOL:'Rasto de wilds',COPIUM:'Guarda + respin'};
export const LEVEL_NAME = ['—', 'SOLO', 'DUAL CHEMISTRY', 'TRIPLE CHEMISTRY', 'FULL CHAOS', 'TOTAL CHEMISTRY'];
export const BONUS_NAME = Object.fromEntries(Object.entries(config.bonus).map(([id, b]) => [id, b.nome]));
export const MODE_LABEL = { base: 'JOGO BASE', hunt: 'MAIS SCATTERS', 'buy-afterparty': 'COMPRA AFTERPARTY', 'buy-vip': 'COMPRA VIP', 'buy-police': 'COMPRA POLICE PARTY' };
const MOD_NAME = { neverEnding: 'NEVER ENDING DREAM', oneMoreRound: 'ONE MORE ROUND', dreamGlitch: 'DREAM GLITCH', oneMoreRave: 'ONE MORE RAVE' };

/** Próximo objetivo da barra de Chemistry (só o que é possível neste estado). */
export function proximoObjetivo(level, calmer) {
  if (calmer) return 'Calmer: a escalada fechou neste spin (sem fusões nem cantos novos).';
  const ch = config.chemistry;
  switch (level) {
    case 0: return 'Desperta uma personagem: grupo de 5+ símbolos de uma personagem.';
    case 1: return 'A próxima personagem que despertar gera uma fusão.';
    case 2: return `Nível 3 abre ${ch.cantosNivel3} Party Corners.`;
    case 3: return 'Nível 4 abre os restantes Party Corners.';
    case 4: return `Próximo: Total Chemistry · cantos +${ch.totalSomaCantos || 0} e poderes Party.`;
    default: return 'TOTAL CHEMISTRY atingido.';
  }
}

const pos = c => `(${Math.floor(c / 5) + 1},${(c % 5) + 1})`;

/**
 * Narração curta de um evento. `m` = modelo DEPOIS do evento; `bet` em cêntimos.
 * Devolve null para eventos sem texto próprio.
 */
export function narrar(e, m, bet) {
  switch (e.type) {
    case 'win.cluster': {
      const value = `${xBet(e.pay)} = ${money(winCents(e.pay, bet))}`;
      const base = e.multiplier > 1 || e.pay < e.basePay * e.multiplier ? clusterEquation(e, bet, { inBet: true }) + ' · ' + money(winCents(e.pay, bet)) : value;
      if (e.groupFinal) return `Grupo preso de ${e.size} × ${symName(e.symbol)} paga o tamanho final: ${base}`;
      return `Cluster de ${e.size} × ${symName(e.symbol)}: ${base}`;
    }
    case 'cap.hit': return `Ganho máximo de ${mult3.format(e.limit / 1000)}× atingido. A jogada termina aqui.`;
    case 'multiplier.change': return `${m.grid[e.cell] === 'DW' ? 'Joiner' : 'Wild de Canto'} ${pos(e.cell)}: ×${e.from} → ×${e.to}`;
    case 'persona.awaken': {
      const what = e.kind === 'refire' ? 'voltou a disparar' : 'despertou';
      return `${e.persona} ${what}${e.party ? ' em Party Mode' : ''}${e.fusion ? '' : ` — ${POWER_NAME[e.persona]}`}`;
    }
    case 'fusion.trigger': return `${e.surprise ? 'FUSÃO SURPRESA' : 'FUSÃO'}: ${fusionName(e.fusionId)} (${e.pair.join(' + ')})`;
    case 'power.reality_break': return `LCD transformou ${e.cells.length} células em ${symName(e.target)}${e.party ? ' (Party Mode: mais um tipo de baixo)' : ''}`;
    case 'power.slow_motion.start':
      if (e.kind === 'frozen') return `FROZEN REALITY: ${e.cells.length} células de ${symName(e.symbol)} ficam sticky e crescem`;
      if (e.kind === 'freeze') return `FREEZE & FREAK: grupo preso de ${e.cells.length} × ${symName(e.symbol)}; o MDMA puxa iguais para ele`;
      return `WEED — SLOW MOTION: grupo preso de ${e.cells.length} × ${symName(e.symbol)}${e.party ? ' até ao fim do spin' : ''}`;
    case 'power.slow_motion.grow': return `O grupo preso cresceu para ${e.newSize}`;
    case 'power.slow_motion.end': return 'O grupo preso deixou de crescer e saiu';
    case 'power.rave_rush.move':
      if (e.transform) return `MDMA: uma Pastilha ${pos(e.to)} virou ${symName(e.symbol)}`;
      if (e.copy) return `RAVE DIMENSION: ${symName(e.symbol)} copiado para ${pos(e.to)}`;
      return `MDMA juntou ${symName(e.symbol)} ${pos(e.from)} → ${pos(e.to)}`;
    case 'power.drunk_walk.step':
      if (e.walker === 'espelho') return `DOUBLE VISION: wild em espelho ${pos(e.cell)}`;
      if (e.walker === 'slow_disaster') return `SLOW DISASTER: mais um passo, HOLD wild ${pos(e.cell)}`;
      if (e.jump) return `TOTAL MAYHEM: o wild saltou ${pos(e.from)} → ${pos(e.cell)}`;
      return `ALCOOL — DRUNK WALK: wild ${pos(e.cell)}${e.sticky ? ' (HOLD)' : ''}`;
    case 'power.one_more_chance.armed':
      return `COPIUM preparado: guarda um grupo e volta a rodar o resto no fim das cascatas${e.mods.length ? ` (${e.mods.map(k => MOD_NAME[k] ?? k).join(', ')})` : ''}`;
    case 'power.one_more_chance.respin':
      return `COPIUM — respin: guardou ${e.held.length - e.revealed.length} células, ${e.revealed.length} Botija(s) de Copium aberta(s), alvo ${symName(e.symbol)}`;
    case 'wild.place':
      return e.source === 'DISTINTIVO' ? `O Peace Police deixou cair um Joiner ×${e.multiplier} ${pos(e.cell)}` : `ONE MORE ROUND: wild junto ao grupo ${pos(e.cell)}`;
    case 'chemistry.level': return `Chemistry ${e.to}/5 — ${LEVEL_NAME[e.to] ?? ''}`;
    case 'corner.open': return `Party Corner ${pos(e.cell)} abriu com um Wild de Canto ×${e.multiplier}`;
    case 'chemistry.total': return `TOTAL CHEMISTRY: cantos +${config.chemistry.totalSomaCantos} e repetição dos poderes em Party Mode`;
    case 'police.enter': return e.mode === 'calmer' ? 'Peace Police — CALMER: «Everybody calm down!»' : 'Peace Police — JOINER: «I\'m joining the party!»';
    case 'police.calmer.arrest': return `Calmer prendeu ${e.cells.length} símbolos baixos`;
    case 'police.joiner.party_mode': return `Joiner entrou: Party Mode${e.personas.length ? ` para ${e.personas.join(', ')}` : ''}${e.badge ? ` · Joiner ×${e.badge.multiplier}` : ''}`;
    case 'bonus.trigger': return `${e.scatters} Scatters: ${BONUS_NAME[e.bonusId]} com ${e.freeSpins} rodadas grátis`;
    case 'bonus.retrigger': return `${e.scatters} Scatters: +${e.added} rodadas grátis (total ${e.total})`;
    case 'bonus.end': return `Fim do ${BONUS_NAME[e.bonusId]}: ${e.spins} spins, ${xBet(e.totalWin)}`;
    case 'safety.stop': return 'Limite de segurança do motor (não devia acontecer).';
    case 'step.end': return e.win > 0 ? `Spin terminado: ${xBet(e.win)} = ${money(winCents(e.win, bet))}` : 'Spin sem prémio.';
    default: return null;
  }
}
