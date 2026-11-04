// ============================================================================
// BÓNUS — 3 / 4 / 5 SCATTERS
// ----------------------------------------------------------------------------
// Comum: 10 free spins; personagens despertas ficam despertas até ao fim;
// fusões persistem; cantos abertos ficam abertos.
// ============================================================================

export const ATIVACAO = {
  // nº de Scatters no fim de um spin base -> bónus
  3: 'afterparty',
  4: 'vip',
  5: 'police',
};

export const BONUS = {
  afterparty: {
    nome: 'AFTERPARTY',
    volatilidade: 'média',            // só informativo (regras do jogo); medida no simulador
    pesos: 'afterparty',
    spins: 10,
    // pp-v5 — volatilidade MÉDIA: os 4 cantos abertos desde o início, multiplicador baixo que volta
    // ao início em cada spin. Paga muitas vezes um valor razoável e raramente explode.
    personagensIniciais: 0,
    cantosIniciais: 4,
    multCantoInicial: 1,
    multCantoMax: 2,
    cantosPersistemMultiplicador: false, // os CW voltam a ×inicial em cada spin
    joinerEmTodosOsSpins: false,
    distintivoEmTodosOsSpins: false,
  },
  vip: {
    nome: 'VIP AFTERPARTY',
    volatilidade: 'alta',            // só informativo (regras do jogo); medida no simulador
    pesos: 'vip',
    spins: 10,
    // pp-v5 — volatilidade ALTA: 3 cantos abertos que guardam o multiplicador de spin para spin, até ×10.
    personagensIniciais: 1,
    cantosIniciais: 3,
    multCantoInicial: 2,
    multCantoMax: 10,
    multMaxAbsoluto: 20,                 // teto depois da duplicação do Total Chemistry
    cantosPersistemMultiplicador: true,
    joinerEmTodosOsSpins: false,
    distintivoEmTodosOsSpins: false,
  },
  police: {
    nome: 'POLICE PARTY',
    volatilidade: 'muito alta',            // só informativo (regras do jogo); medida no simulador
    pesos: 'police',
    spins: 10,
    // pp-v5 — volatilidade MUITO ALTA: os cantos começam fechados e abrem com o Chemistry; quando abrem
    // nascem ×1, crescem +2 por prémio e guardam o multiplicador até ×50. Distintivo com cauda rara.
    personagensIniciais: 2,              // e a fusão desse par já ativa
    cantosIniciais: 0,
    multCantoInicial: 1,
    multCantoMax: 50,
    multMaxAbsoluto: 50,
    incrementoCanto: 2,                  // +2 por cada ciclo em que o canto participa num prémio (os outros: CANTOS)
    cantosPersistemMultiplicador: true,
    joinerEmTodosOsSpins: true,          // Party Mode em todos os spins
    distintivoEmTodosOsSpins: true,      // 1 Distintivo novo por spin
    distintivo: { 2: 40, 3: 30, 5: 18, 10: 8, 25: 3, 50: 1 }, // pesos próprios (os outros bónus: PEACE_POLICE)
  },
};

export const RETRIGGER = {
  scattersMinimos: 3,
  spinsExtra: 5,
  spinsMaximoTotal: 30,
};
