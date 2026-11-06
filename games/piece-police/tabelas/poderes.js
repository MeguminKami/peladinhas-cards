// ============================================================================
// PODERES (Alter Ego), PARTY MODE, FUSÕES E CHEMISTRY
// ----------------------------------------------------------------------------
// Fichas completas em docs/GDD.md §03–§05 e docs/matematica.md.
// Probabilidades em PERCENTAGEM (0–100).
// ============================================================================

export const PODERES = {
  // LCD — REALITY BREAK: todos os Selos (N5) viram o premium com o maior grupo.
  LCD: {
    celulasMinimas: 4,          // se houver menos Selos, completa com baixos junto ao maior grupo
    celulasMax: 5,              // pp-v7: teto de células transformadas (escolhidas ao acaso se houver mais)
    celulasMaxParty: 8,         // pp-v7: teto em Party Mode (vale também para as fusões que usam o LCD)
    partyTiposExtra: 1,         // Party Mode: nº de tipos de baixo extra a transformar
  },
  // WEED — SLOW MOTION: o cluster que despertou fica sticky; os Bob Joints (N1)
  // adjacentes juntam-se ao grupo após cada refill; volta a pagar sempre que cresce.
  WEED: {
    maxConversoesPorCiclo: 2,   // máx. de Bob Joints convertidas por ciclo. pp-v7: 4 -> 2
    // Como paga um grupo sticky (vale também para FROZEN REALITY e FREEZE & FREAK):
    //   'tamanho-final' -> (decisão do dono) não paga enquanto cresce, nem o cluster que o criou;
    //                      paga UMA vez o tamanho final, com os multiplicadores desse momento,
    //                      quando para de crescer ou quando o spin acaba
    //   'diferenca'     -> paga a cada crescimento a diferença da tabela face ao já pago
    //   'novo-tamanho'  -> paga a cada crescimento o valor completo (muito explosivo)
    pagamentoAoCrescer: 'tamanho-final',
  },
  // MDMA — RAVE RUSH: junta símbolos iguais ao maior grupo premium.
  MDMA: {
    movimentosBase: 2,          // movimentos = base + nº de Pastilhas (N4)
    movimentosMax: 3,           // pp-v7: 4 -> 3
    movimentosMaxParty: 5,      // pp-v7: 8 -> 5
  },
  // ALCOOL — DRUNK WALK: rasto diagonal de wilds a partir de um Copo de shot (N2).
  ALCOOL: {
    passosBase: 1,              // passos = base + nº de Copos de shot (N2). pp-v4: 3 -> 2
    passosMax: 3,               // pp-v4: 6 -> 5; pp-v7: 4 -> 3 (menos clusters gigantes)
    rastosParty: 2,
  },
  // COPIUM — ONE MORE CHANCE: no fim da sequência, guarda o maior grupo e faz respin.
  COPIUM: {
    respins: 1,
    respinsParty: 2,
    grupoMinimo: 2,             // tamanho mínimo do grupo a guardar (prefere premium)
    probRaspadinha: 50,         // % de cada Botija de Copium (N3) revelar o tipo guardado
  },

  // Nº máximo de vezes que o poder de uma personagem dispara num spin
  // (no bónus, a personagem desperta volta a disparar a cada novo cluster 5+).
  maxDisparosPorSpin: 2,
};

// ----------------------------------------------------------------------------
// FUSÕES — rank 1 = mais forte. Ao despertar a 2.ª personagem (ou seguinte),
// funde com o parceiro desperto de menor rank (o mais forte) ainda não fundido.
// ----------------------------------------------------------------------------
export const FUSOES = [
  // rank id                    par                    parâmetros
  { rank: 1,  id: 'NEVER_ENDING_DREAM', par: ['WEED', 'COPIUM'], maxRespins: 2 }, // pp-v7: 5 -> 2
  { rank: 2,  id: 'ONE_MORE_ROUND',     par: ['ALCOOL', 'COPIUM'], maxRespinsExtra: 3 },
  { rank: 3,  id: 'SLOW_DISASTER',      par: ['WEED', 'ALCOOL'], passosExtraMax: 2 },
  { rank: 4,  id: 'RAVE_DIMENSION',     par: ['LCD', 'MDMA'] },
  { rank: 5,  id: 'TOTAL_MAYHEM',       par: ['MDMA', 'ALCOOL'], saltosMax: 2 },
  { rank: 6,  id: 'FROZEN_REALITY',     par: ['LCD', 'WEED'] },
  { rank: 7,  id: 'FREEZE_AND_FREAK',   par: ['WEED', 'MDMA'], puxoesMax: 5 },
  { rank: 8,  id: 'DREAM_GLITCH',       par: ['LCD', 'COPIUM'] },
  { rank: 9,  id: 'ONE_MORE_RAVE',      par: ['MDMA', 'COPIUM'] },
  { rank: 10, id: 'DOUBLE_VISION',      par: ['LCD', 'ALCOOL'] },
];

// ----------------------------------------------------------------------------
// CHEMISTRY — níveis e Party Corners
// ----------------------------------------------------------------------------
export const CHEMISTRY = {
  cantosNivel3: 2,              // nº de cantos que abrem ao chegar ao nível 3
  cantosNivel4: 4,              // nível 4 abre todos os que faltam
  // Nível 5 — TOTAL CHEMISTRY
  totalSomaCantos: 1,           // pp-v7: +1 a cada Wild de Canto (antes duplicava CW e DW)
  totalRepetePoderesParty: true,
};

export const CANTOS = {
  // pp-v7 (decisão do dono): os cantos somam e o Distintivo do Joiner multiplica essa soma,
  // por isso os multiplicadores baixam.
  multiplicadorInicial: 1,      // Wild de Canto nasce ×1 (bónus: ver bonus.js). pp-v7: 2 -> 1
  incrementoPorPremio: 1,       // +1 por cada ciclo em que participa num prémio
  multiplicadorMax: 3,          // pp-v7: 5 -> 3
  multiplicadorMaxAbsoluto: 4,  // teto depois do +1 do Total Chemistry. pp-v7: 10 -> 4
  multClusterMax: 30,           // pp-v7: teto do multiplicador de um cluster (Σ cantos × Joiner) no jogo base
};

// --- FUSÃO SURPRESA (pp-v6, decisão do dono: «dar ânimo ao jogo base»)
// Em cada spin do jogo base / MAIS SCATTERS, com esta probabilidade (%), dispara UMA das 10 fusões,
// sorteada com pesos iguais, logo depois de cair a grelha. Não acorda personagens (não conta para o
// Chemistry) e nunca acontece nos bónus.
export const FUSAO_SURPRESA = {
  probabilidade: { base: 3, hunt: 3 },
};
