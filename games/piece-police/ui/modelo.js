/**
 * Modelo da apresentação: o estado que o ecrã mostra, construído SÓ a partir dos eventos do motor.
 *
 * Cada evento é aplicado por ordem (aplicar(evento)). O modelo nunca sorteia, nunca calcula prémios
 * e nunca compara grelhas para adivinhar o que aconteceu: copia o que o evento diz. Os eventos que
 * trazem a grelha inteira (grid.drop, grid.refill, power.one_more_chance.respin) substituem-na.
 *
 * Não usa DOM: é partilhado pela interface (ui/app.js), pelo painel de diagnóstico e pelos testes
 * (tests/modelo.test.js confirma, em milhares de jogadas, que o modelo bate sempre certo com as
 * grelhas completas que o motor envia).
 */

export const PERSONAS = ['WEED', 'ALCOOL', 'COPIUM', 'MDMA', 'LCD'];
export const PERSONA_PREMIUM = { WEED: 'P1', ALCOOL: 'P2', COPIUM: 'P3', MDMA: 'P4', LCD: 'P5' };

export function novoModelo() {
  return {
    grid: new Array(25).fill(''),
    mult: {},              // célula -> multiplicador (CW, DW)
    groups: [],            // grupos sticky vivos: { symbol, kind, cells: Set }
    stickyW: new Set(),    // W sticky (SLOW DISASTER)
    awake: [],             // personagens despertas (ordem de despertar)
    fused: [],             // fusões ativas
    level: 0,              // nível de Chemistry
    partyMode: false,
    police: null,          // 'calmer' | 'joiner' | null (neste spin)
    total: false,          // TOTAL CHEMISTRY neste spin/bónus
    copiumArmed: false,
    kind: 'base', bonusId: null,
    freeSpins: null,       // { played, total }
    stepWin: 0,            // milésimos de aposta, somados a partir dos win.cluster
    roundWin: 0,
    lastWin: null,         // último win.cluster
    capped: false,
  };
}

const groupOf = (m, cell) => m.groups.find(g => g.cells.has(cell));

/** Aplica um evento ao modelo. Devolve o modelo (muta-o). */
export function aplicar(m, e) {
  switch (e.type) {
    case 'step.start':
      m.kind = e.kind; m.bonusId = e.bonusId; m.freeSpins = e.freeSpins;
      m.groups = []; m.stickyW = new Set(); m.police = null; m.partyMode = false; m.copiumArmed = false;
      m.stepWin = 0; m.lastWin = null;
      if (e.kind === 'bonus') {
        m.awake = [...(e.awake || [])]; m.fused = [...(e.fused || [])]; m.level = m.awake.length;
      } else {
        m.awake = []; m.fused = []; m.level = 0; m.total = false; m.roundWin = 0; m.capped = false;
      }
      break;
    case 'grid.drop':
      m.grid = [...e.grid]; m.mult = { ...(e.mult || {}) };
      break;
    case 'win.cluster':
      m.stepWin += e.pay; m.roundWin += e.pay; m.lastWin = e;
      break;
    case 'cap.hit': m.capped = true; break;
    case 'multiplier.change': m.mult[e.cell] = e.to; break;
    case 'persona.awaken':
      if (!m.awake.includes(e.persona)) m.awake.push(e.persona);
      m.level = m.awake.length;
      break;
    case 'fusion.trigger': if (!m.fused.includes(e.fusionId)) m.fused.push(e.fusionId); break;
    case 'grid.remove':
      for (const c of e.cells) { m.grid[c] = ''; delete m.mult[c]; m.stickyW.delete(c); for (const g of m.groups) g.cells.delete(c); }
      break;
    case 'grid.refill':
      m.grid = [...e.grid];
      for (const c of Object.keys(m.mult)) if (!['CW', 'DW'].includes(m.grid[c])) delete m.mult[c];
      break;
    case 'power.reality_break':
      for (const c of e.cells) m.grid[c] = e.target;
      break;
    case 'power.slow_motion.start':
      m.groups.push({ symbol: e.symbol, kind: e.kind, cells: new Set(e.cells) });
      break;
    case 'power.slow_motion.grow': {
      // Duas formas: Lava lamps convertidas (passam a e.symbol) ou o grupo inteiro depois de fundir clusters.
      for (const c of e.cells) if (m.grid[c] === 'N1') m.grid[c] = e.symbol;
      const g = e.cells.map(c => groupOf(m, c)).find(Boolean)
        || m.groups.find(gr => gr.symbol === e.symbol && [...gr.cells].some(c => e.cells.some(n => adjacentes(c, n))))
        || m.groups.find(gr => gr.symbol === e.symbol);
      if (g) for (const c of e.cells) g.cells.add(c);
      break;
    }
    case 'power.slow_motion.end': {
      const set = new Set(e.cells);
      m.groups = m.groups.filter(g => g.kind !== 'weed' || ![...g.cells].some(c => set.has(c)));
      break;
    }
    case 'power.rave_rush.move':
      if (e.transform) m.grid[e.to] = e.symbol;
      else {
        const moved = e.symbol ?? m.grid[e.from];
        if (!e.copy) m.grid[e.from] = e.swapped;
        m.grid[e.to] = moved;
      }
      for (const g of m.groups) if (g.cells.has(e.from) && !e.copy) g.cells.delete(e.from);
      { // FREEZE & FREAK: o símbolo puxado junta-se ao grupo sticky vizinho do mesmo tipo (só para o contorno)
        const g = m.groups.find(gr => gr.kind === 'freeze' && gr.symbol === m.grid[e.to] && [...gr.cells].some(c => adjacentes(c, e.to)));
        if (g) g.cells.add(e.to);
      }
      break;
    case 'power.drunk_walk.step':
      if (e.jump) { const was = m.grid[e.cell]; m.grid[e.from] = was; }
      m.grid[e.cell] = 'W';
      if (e.sticky) m.stickyW.add(e.cell);
      break;
    case 'power.one_more_chance.armed': m.copiumArmed = true; break;
    case 'power.one_more_chance.respin':
      m.grid = [...e.grid]; m.copiumArmed = false;
      for (const c of Object.keys(m.mult)) if (!['CW', 'DW'].includes(m.grid[c])) delete m.mult[c];
      break;
    case 'wild.place':
      m.grid[e.cell] = e.source === 'DISTINTIVO' ? 'DW' : 'W';
      if (e.source === 'DISTINTIVO') m.mult[e.cell] = e.multiplier;
      break;
    case 'chemistry.level': m.level = e.to; break;
    case 'corner.open': m.grid[e.cell] = 'CW'; m.mult[e.cell] = e.multiplier; break;
    case 'chemistry.total': m.total = true; break;
    case 'police.enter': m.police = e.mode; break;
    case 'police.calmer.arrest': for (const c of e.cells) m.grid[c] = ''; break;
    case 'police.joiner.party_mode': m.partyMode = true; break;
    case 'bonus.trigger': break;
    case 'bonus.retrigger': if (m.freeSpins) m.freeSpins = { ...m.freeSpins, total: e.total }; break;
    case 'bonus.end': break;
    case 'step.end': break;
    default: break;
  }
  return m;
}

function adjacentes(a, b) {
  const ca = Math.floor(a / 5), ra = a % 5, cb = Math.floor(b / 5), rb = b % 5;
  return Math.abs(ca - cb) + Math.abs(ra - rb) === 1;
}

/**
 * Antecipação honesta para a barra de Chemistry: para cada personagem ainda a dormir, a fusão que o
 * despertar dela geraria AGORA (regra do GDD §04: o parceiro desperto com o melhor rank, ainda não
 * fundido). Lê a tabela de fusões da configuração; não sorteia nada. Com o Calmer não há fusões.
 */
export function proximasFusoes(fusoes, awake, fused, calmer) {
  const out = {};
  if (calmer || !awake.length) return out;
  for (const p of PERSONAS) {
    if (awake.includes(p)) continue;
    let best = null;
    for (const q of awake) {
      const f = fusoes.find(x => x.par.includes(p) && x.par.includes(q));
      if (f && !fused.includes(f.id) && (!best || f.rank < best.rank)) best = f;
    }
    if (best) out[p] = best;
  }
  return out;
}
