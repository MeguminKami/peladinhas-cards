// Cenários de diagnóstico (forçados). Só para testes e para o painel de debug.
// Nunca entram em relatórios de RTP nem liquidam saldo.
//
// As grelhas escrevem-se por LINHAS (de cima para baixo), 5 tokens por linha.
// 'X' = canto fechado, '.' = enchimento neutro (padrão de baixos sem clusters).
// force.police: 'calmer' | 'joiner' força o modo; 'none' impede o Peace Police nesse spin.

const FILL = ['N1', 'N2', 'N3', 'N4', 'N5'];
function fromRows(rows) {
  const g = new Array(25);
  for (let r = 0; r < 5; r++) {
    const t = rows[r].trim().split(/\s+/);
    if (t.length !== 5) throw new Error(`linha ${r} do cenário tem ${t.length} tokens`);
    for (let c = 0; c < 5; c++) {
      let v = t[c];
      if (v === '.') v = FILL[(c + 2 * r) % 5];
      g[c * 5 + r] = v;
    }
  }
  return g;
}

const P = { LCD: 'P5', MDMA: 'P4', COPIUM: 'P3', ALCOOL: 'P2', WEED: 'P1' };
const row5 = (s) => `${s} ${s} ${s} ${s} ${s}`;
const single = (persona) => fromRows(['X . . . X', '. . . . .', row5(P[persona]), '. . . . .', 'X . . . X']);
const pair = (a, b) => fromRows(['X . . . X', row5(P[a]), '. . . . .', row5(P[b]), 'X . . . X']);

export const SCENARIOS = {
  'lcd': { force: { grid: single('LCD') } },
  'weed': { force: { grid: single('WEED') } },
  // seed própria: o poder age depois do refill, que é sorteado (pp-v5 mudou os pesos do jogo base)
  // FUSÃO SURPRESA (pp-v6): grelha neutra, a fusão dispara logo depois da queda
  'surpresa': { force: { grid: fromRows(['X . . . X', '. . . . .', '. . . . .', '. . . . .', 'X . . . X']), surprise: 'SLOW_DISASTER' } },
  'mdma': { force: { grid: single('MDMA') }, seed: 'scenario:mdma:1' },
  'alcool': { force: { grid: single('ALCOOL') } },
  'copium': { force: { grid: single('COPIUM') } },

  'fusao:NEVER_ENDING_DREAM': { force: { grid: pair('WEED', 'COPIUM') } },
  'fusao:ONE_MORE_ROUND': { force: { grid: pair('ALCOOL', 'COPIUM') } },
  'fusao:SLOW_DISASTER': { force: { grid: pair('WEED', 'ALCOOL') } },
  'fusao:RAVE_DIMENSION': { force: { grid: pair('LCD', 'MDMA') } },
  'fusao:TOTAL_MAYHEM': { force: { grid: pair('MDMA', 'ALCOOL') } },
  'fusao:FROZEN_REALITY': { force: { grid: pair('LCD', 'WEED') } },
  'fusao:FREEZE_AND_FREAK': { force: { grid: pair('WEED', 'MDMA') } },
  'fusao:DREAM_GLITCH': { force: { grid: pair('LCD', 'COPIUM') } },
  'fusao:ONE_MORE_RAVE': { force: { grid: pair('MDMA', 'COPIUM') } },
  'fusao:DOUBLE_VISION': { force: { grid: pair('LCD', 'ALCOOL') } },

  'calmer': { force: { grid: single('LCD'), police: 'calmer' } },
  'joiner': { force: { grid: single('LCD'), police: 'joiner' } },

  'triple-chemistry': { force: { grid: fromRows(['X . . . X', row5('P5'), row5('P4'), row5('P1'), 'X . . . X']), police: 'none' } },
  'full-chaos': { force: { grid: pair('LCD', 'MDMA'), preAwake: ['WEED', 'ALCOOL'], police: 'none' } },
  'total-chemistry': { force: { grid: pair('LCD', 'MDMA'), preAwake: ['WEED', 'ALCOOL', 'COPIUM'], police: 'none' } },

  'scatters-3': { force: { grid: fromRows(['X . S . X', '. . . . .', 'S . . . S', '. . . . .', 'X . . . X']) } },
  'scatters-4': { force: { grid: fromRows(['X . S . X', '. S . . .', 'S . . . S', '. . . . .', 'X . . . X']) } },
  'scatters-5': { force: { grid: fromRows(['X . S . X', '. S . S .', 'S . . . S', '. . . . .', 'X . . . X']) } },

  'bonus:afterparty': { mode: 'buy-afterparty', force: {} },
  'bonus:vip': { mode: 'buy-vip', force: {} },
  'bonus:police': { mode: 'buy-police', force: {} },
};

export { fromRows };
