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
    pesos: 'afterparty',
    spins: 10,
    personagensIniciais: 0,
    cantosIniciais: 0,
    multCantoInicial: 2,
    multCantoMax: 5,
    cantosPersistemMultiplicador: false, // os CW voltam a ×inicial em cada spin
    joinerEmTodosOsSpins: false,
    distintivoEmTodosOsSpins: false,
  },
  vip: {
    nome: 'VIP AFTERPARTY',
    pesos: 'vip',
    spins: 10,
    personagensIniciais: 1,
    cantosIniciais: 2,
    multCantoInicial: 2,
    multCantoMax: 4,
    cantosPersistemMultiplicador: true,
    joinerEmTodosOsSpins: false,
    distintivoEmTodosOsSpins: false,
  },
  police: {
    nome: 'POLICE PARTY',
    pesos: 'police',
    spins: 10,
    personagensIniciais: 2,              // e a fusão desse par já ativa
    cantosIniciais: 4,
    multCantoInicial: 2,
    multCantoMax: 4,
    cantosPersistemMultiplicador: true,
    joinerEmTodosOsSpins: true,          // Party Mode em todos os spins
    distintivoEmTodosOsSpins: true,      // 1 Distintivo novo por spin
  },
};

export const RETRIGGER = {
  scattersMinimos: 3,
  spinsExtra: 5,
  spinsMaximoTotal: 30,
};
