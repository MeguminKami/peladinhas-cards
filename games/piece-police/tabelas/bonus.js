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
    multClusterMax: 8,                   // pp-v7: teto do multiplicador de um cluster (Σ cantos × Joiner)
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
    multCantoInicial: 1,                 // pp-v7: 2 -> 1
    multCantoMax: 4,                     // pp-v7: 10 -> 4
    multMaxAbsoluto: 5,                  // teto depois do +1 do Total Chemistry. pp-v7: 20 -> 5
    multClusterMax: 30,                  // pp-v7: teto do multiplicador de um cluster (Σ cantos × Joiner)
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
    multCantoMax: 10,                    // pp-v7: 50 -> 10
    multMaxAbsoluto: 11,                 // pp-v7: 50 -> 11
    multClusterMax: 100,                 // pp-v7: teto do multiplicador de um cluster (Σ cantos × Joiner)
    incrementoCanto: 1,                  // +1 por cada ciclo em que o canto participa num prémio. pp-v7: 2 -> 1
    cantosPersistemMultiplicador: true,
    joinerEmTodosOsSpins: true,          // Party Mode em todos os spins
    distintivoEmTodosOsSpins: true,      // 1 Distintivo novo por spin
    distintivo: { 2: 52, 3: 28, 4: 11, 6: 5, 12: 3, 25: 1 }, // pesos próprios (os outros bónus: PEACE_POLICE). pp-v7: multiplica a soma dos cantos
  },
};

// pp-v7 (decisão do dono, 05-11-2026): no bónus nunca há mais de 3 Scatters no ecrã num spin
// (contando as cascatas). 3 Scatters dão +5 free spins (o número de spins do retrigger mantém-se).
export const RETRIGGER = {
  scattersMaximoNoBonus: 3,
  spinsPorScatters: { 3: 5 },
  spinsMaximoTotal: 30,
};
