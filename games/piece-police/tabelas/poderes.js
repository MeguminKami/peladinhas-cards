// ============================================================================
// PODERES (Alter Ego), PARTY MODE, FUSÕES E CHEMISTRY
// ----------------------------------------------------------------------------
// Fichas completas em docs/GDD.md §03–§05 e docs/matematica.md.
// Probabilidades em PERCENTAGEM (0–100).
// ============================================================================

export const PODERES = {
  // LCD — REALITY BREAK: todos os Prismas (N5) viram o premium com o maior grupo.
  LCD: {
    celulasMinimas: 4,          // se houver menos Prismas, completa com baixos junto ao maior grupo
    partyTiposExtra: 1,         // Party Mode: nº de tipos de baixo extra a transformar
  },
  // WEED — SLOW MOTION: o cluster que despertou fica sticky; as Lava lamps (N1)
  // adjacentes juntam-se ao grupo após cada refill; volta a pagar sempre que cresce.
  WEED: {
    maxConversoesPorCiclo: 4,   // máx. de Lava lamps convertidas por ciclo
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
    movimentosBase: 2,          // movimentos = base + nº de Colunas de som (N4)
    movimentosMax: 4,
    movimentosMaxParty: 8,
  },
  // ALCOOL — DRUNK WALK: rasto diagonal de wilds a partir de um Copo de shot (N2).
  ALCOOL: {
    passosBase: 1,              // passos = base + nº de Copos de shot (N2). pp-v4: 3 -> 2
    passosMax: 4,               // pp-v4: 6 -> 5 (ecrãs cheios de wilds mais raros)
    rastosParty: 2,
  },
  // COPIUM — ONE MORE CHANCE: no fim da sequência, guarda o maior grupo e faz respin.
  COPIUM: {
    respins: 1,
    respinsParty: 2,
    grupoMinimo: 2,             // tamanho mínimo do grupo a guardar (prefere premium)
    probRaspadinha: 50,         // % de cada Raspadinha (N3) revelar o tipo guardado
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
  { rank: 1,  id: 'NEVER_ENDING_DREAM', par: ['WEED', 'COPIUM'], maxRespins: 5 },
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
  totalDuplicaMultiplicadores: true,
  totalRepetePoderesParty: true,
};

export const CANTOS = {
  multiplicadorInicial: 2,      // Wild de Canto nasce ×2 (POLICE PARTY: ver bonus.js)
  incrementoPorPremio: 1,       // +1 por cada ciclo em que participa num prémio
  multiplicadorMax: 5,
  multiplicadorMaxAbsoluto: 10, // teto após a duplicação do Total Chemistry
};

// --- FUSÃO SURPRESA (pp-v6, decisão do dono: «dar ânimo ao jogo base»)
// Em cada spin do jogo base / MAIS SCATTERS, com esta probabilidade (%), dispara UMA das 10 fusões,
// sorteada com pesos iguais, logo depois de cair a grelha. Não acorda personagens (não conta para o
// Chemistry) e nunca acontece nos bónus.
export const FUSAO_SURPRESA = {
  probabilidade: { base: 3, hunt: 3 },
};
