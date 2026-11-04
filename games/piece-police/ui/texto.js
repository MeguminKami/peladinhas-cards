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

export const SIMBOLOS = Object.fromEntries(config.tables.SIMBOLOS.map(s => [s.id, s]));
const SHORT = { N1: 'Lava lamp', N2: 'Shot', N3: 'Raspadinha', N4: 'Coluna', N5: 'Prisma', W: 'WILD', CW: 'CANTO', DW: 'DISTINTIVO', S: 'VIP', X: 'fechado', '': '' };
/** Nome curto para a célula. */
export function shortName(id) {
  if (SHORT[id] !== undefined) return SHORT[id];
  return SIMBOLOS[id]?.personagem ?? id;
}
/** Nome completo: «P3 COPIUM», «N1 Lava lamp». */
export function symName(id) {
  const s = SIMBOLOS[id];
  if (!s) return id;
  return s.cat === 'premium' ? `${id} ${s.personagem}` : `${id} ${s.nome}`;
}
export const categoria = id => id === 'X' ? 'locked' : id === '' ? 'empty' : (SIMBOLOS[id]?.cat === 'baixo' ? 'low' : SIMBOLOS[id]?.cat ?? 'empty');

export const fusionName = id => id === 'FREEZE_AND_FREAK' ? 'FREEZE & FREAK' : String(id).replaceAll('_', ' ');
export const POWER_NAME = { LCD: 'REALITY BREAK', WEED: 'SLOW MOTION', MDMA: 'RAVE RUSH', ALCOOL: 'DRUNK WALK', COPIUM: 'ONE MORE CHANCE' };
export const LEVEL_NAME = ['—', 'SOLO', 'DUAL CHEMISTRY', 'TRIPLE CHEMISTRY', 'FULL CHAOS', 'TOTAL CHEMISTRY'];
export const BONUS_NAME = Object.fromEntries(Object.entries(config.bonus).map(([id, b]) => [id, b.nome]));
export const MODE_LABEL = { base: 'JOGO BASE', hunt: 'MAIS SCATTERS', 'buy-afterparty': 'COMPRA AFTERPARTY', 'buy-vip': 'COMPRA VIP', 'buy-police': 'COMPRA POLICE PARTY' };
const MOD_NAME = { neverEnding: 'NEVER ENDING DREAM', oneMoreRound: 'ONE MORE ROUND', dreamGlitch: 'DREAM GLITCH', oneMoreRave: 'ONE MORE RAVE' };

/** Próximo objetivo da barra de Chemistry (só o que é possível neste estado). */
export function proximoObjetivo(level, calmer) {
  if (calmer) return 'Calmer: a escalada fechou neste spin (sem fusões nem cantos novos).';
  const ch = config.chemistry;
  switch (level) {
    case 0: return 'Desperta uma personagem: cluster de 5+ de um premium.';
    case 1: return 'A próxima personagem que despertar gera uma fusão.';
    case 2: return `Nível 3 abre ${ch.cantosNivel3} Party Corners.`;
    case 3: return 'Nível 4 abre os restantes Party Corners.';
    case 4: return 'Nível 5: TOTAL CHEMISTRY (multiplicadores ×2 e poderes em Party Mode).';
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
      const base = e.multiplier > 1 ? `${xBet(e.basePay)} × ${e.multiplier} = ${value}` : value;
      if (e.groupFinal) return `Grupo sticky de ${e.size} × ${symName(e.symbol)} paga o tamanho final: ${base}`;
      return `Cluster de ${e.size} × ${symName(e.symbol)}: ${base}`;
    }
    case 'cap.hit': return `Ganho máximo de ${mult3.format(e.limit / 1000)}× atingido. A jogada termina aqui.`;
    case 'multiplier.change': return `${m.grid[e.cell] === 'DW' ? 'Distintivo' : 'Wild de Canto'} ${pos(e.cell)}: ×${e.from} → ×${e.to}`;
    case 'persona.awaken': {
      const what = e.kind === 'refire' ? 'voltou a disparar' : 'despertou';
      return `${e.persona} ${what}${e.party ? ' em Party Mode' : ''}${e.fusion ? '' : ` — ${POWER_NAME[e.persona]}`}`;
    }
    case 'fusion.trigger': return `${e.surprise ? 'FUSÃO SURPRESA' : 'FUSÃO'}: ${fusionName(e.fusionId)} (${e.pair.join(' + ')})`;
    case 'power.reality_break': return `LCD transformou ${e.cells.length} células em ${symName(e.target)}${e.party ? ' (Party Mode: mais um tipo de baixo)' : ''}`;
    case 'power.slow_motion.start':
      if (e.kind === 'frozen') return `FROZEN REALITY: ${e.cells.length} células de ${symName(e.symbol)} ficam sticky e crescem`;
      if (e.kind === 'freeze') return `FREEZE & FREAK: grupo sticky de ${e.cells.length} × ${symName(e.symbol)}; o MDMA puxa iguais para ele`;
      return `WEED — SLOW MOTION: grupo sticky de ${e.cells.length} × ${symName(e.symbol)}${e.party ? ' até ao fim do spin' : ''}`;
    case 'power.slow_motion.grow': return `O grupo sticky cresceu para ${e.newSize}`;
    case 'power.slow_motion.end': return 'O grupo sticky deixou de crescer e saiu';
    case 'power.rave_rush.move':
      if (e.transform) return `MDMA: uma Coluna de som ${pos(e.to)} virou ${symName(e.symbol)}`;
      if (e.copy) return `RAVE DIMENSION: ${symName(e.symbol)} copiado para ${pos(e.to)}`;
      return `MDMA juntou ${symName(e.symbol)} ${pos(e.from)} → ${pos(e.to)}`;
    case 'power.drunk_walk.step':
      if (e.walker === 'espelho') return `DOUBLE VISION: wild em espelho ${pos(e.cell)}`;
      if (e.walker === 'slow_disaster') return `SLOW DISASTER: mais um passo, HOLD wild ${pos(e.cell)}`;
      if (e.jump) return `TOTAL MAYHEM: o wild saltou ${pos(e.from)} → ${pos(e.cell)}`;
      return `ALCOOL — DRUNK WALK: wild ${pos(e.cell)}${e.sticky ? ' (HOLD)' : ''}`;
    case 'power.one_more_chance.armed':
      return `COPIUM armado: respin no fim da sequência${e.mods.length ? ` (${e.mods.map(k => MOD_NAME[k] ?? k).join(', ')})` : ''}`;
    case 'power.one_more_chance.respin':
      return `COPIUM — respin: guardou ${e.held.length - e.revealed.length} células, ${e.revealed.length} Raspadinha(s) raspada(s), alvo ${symName(e.symbol)}`;
    case 'wild.place':
      return e.source === 'DISTINTIVO' ? `O Peace Police deixou cair um Distintivo ×${e.multiplier} ${pos(e.cell)}` : `ONE MORE ROUND: wild junto ao grupo ${pos(e.cell)}`;
    case 'chemistry.level': return `Chemistry ${e.to}/5 — ${LEVEL_NAME[e.to] ?? ''}`;
    case 'corner.open': return `Party Corner ${pos(e.cell)} abriu com um Wild de Canto ×${e.multiplier}`;
    case 'chemistry.total': return 'TOTAL CHEMISTRY: multiplicadores ×2 e cada personagem volta a disparar em Party Mode';
    case 'police.enter': return e.mode === 'calmer' ? 'Peace Police — CALMER: «Everybody calm down!»' : 'Peace Police — JOINER: «I\'m joining the party!»';
    case 'police.calmer.arrest': return `Calmer prendeu ${e.cells.length} símbolos baixos`;
    case 'police.joiner.party_mode': return `Joiner entrou: Party Mode${e.personas.length ? ` para ${e.personas.join(', ')}` : ''}${e.badge ? ` · Distintivo ×${e.badge.multiplier}` : ''}`;
    case 'bonus.trigger': return `${e.scatters} Scatters: ${BONUS_NAME[e.bonusId]} com ${e.freeSpins} free spins`;
    case 'bonus.retrigger': return `${e.scatters} Scatters: +${e.added} free spins (total ${e.total})`;
    case 'bonus.end': return `Fim do ${BONUS_NAME[e.bonusId]}: ${e.spins} spins, ${xBet(e.totalWin)}`;
    case 'safety.stop': return 'Limite de segurança do motor (não devia acontecer).';
    case 'step.end': return e.win > 0 ? `Spin terminado: ${xBet(e.win)} = ${money(winCents(e.win, bet))}` : 'Spin sem prémio.';
    default: return null;
  }
}
