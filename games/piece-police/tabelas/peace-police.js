// ============================================================================
// PEACE POLICE — CALMER / JOINER
// ----------------------------------------------------------------------------
// Em cada despertar há uma probabilidade de o Peace Police aparecer
// (no máximo 1 vez por spin). Depois sorteia-se o modo.
// Probabilidades em PERCENTAGEM, por modo. Nunca dependem do jogador.
// ============================================================================

export const PEACE_POLICE = {
  probAparecer: {        // % por despertar (enquanto ainda não apareceu nesse spin)
    base: 12,
    hunt: 12,
    afterparty: 15,
    vip: 18,
    police: 0,           // no POLICE PARTY o Joiner entra no início de todos os spins (bonus.js)
  },
  probJoiner: {          // % de ser JOINER quando aparece (o resto é CALMER)
    base: 40,
    hunt: 40,
    afterparty: 50,
    vip: 65,
    police: 100,
  },

  // JOINER: re-dispara uma vez, em Party Mode, o poder de cada personagem já desperta
  joinerRepetePoderes: true,

  // Distintivo (DW): multiplicador sorteado por pesos
  distintivo: { 2: 50, 3: 30, 4: 15, 5: 5 },
};
