// ============================================================================
// PEACE POLICE: THE AFTERPARTY — regras gerais, apostas, custos e limites
// ----------------------------------------------------------------------------
// Este ficheiro é uma TABELA: só contém valores. O motor (src/) lê-o e valida-o
// ao arrancar. Qualquer mudança aqui obriga a subir MATH_VERSION em versao.js.
// ============================================================================

export const JOGO = {
  // --- Grelha 3-5-5-5-3 numa área 5×5 (col, row; origem no canto superior esquerdo)
  colunas: 5,
  linhas: 5,
  // Cantos fechados no início (Party Corners): [col, row]
  cantos: [[0, 0], [4, 0], [0, 4], [4, 4]],

  // --- Pagamento por clusters ortogonais
  clusterMinimo: 4,      // tamanho mínimo para pagar
  clusterMinimoReais: 1, // nº mínimo de símbolos REAIS (não-wild) num cluster. pp-v3 (decisão do dono):
                         // os wilds contam por inteiro; basta 1 símbolo real para dar o tipo ao cluster
                         // (um cluster só de wilds não paga). Os HOLD wilds saem quando pagam (motor).
  despertarMinimo: 5,    // tamanho mínimo de cluster premium para despertar a personagem

  // --- Scatter
  scatterMaximoPorColuna: 5, // vários Scatters na mesma coluna (5 = sem limite prático)

  // --- Apostas (em cêntimos da moeda do jogo)
  apostas: [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000],

  // --- Ganho máximo por jogada completa (bónus incluído), em × aposta base
  ganhoMaximo: 25000,

  // --- Limites de segurança (anti-loop). Nunca cortam prémios já determinados:
  //     se forem atingidos, o motor termina a resolução em segurança.
  limiteCiclosPorSpin: 300,
};

// --- Modos de jogo e custos (× aposta base). Os prémios são SEMPRE sobre a aposta base.
export const MODOS = {
  base: { nome: 'Jogo base', custo: 1, pesos: 'base' },
  hunt: { nome: 'Aposta extra MAIS SCATTERS', custo: 2, pesos: 'hunt' },
  // Compras: entram diretamente no bónus. Preço = valor medido do bónus / RTP alvo.
  'buy-afterparty': { nome: 'Compra AFTERPARTY', custo: 160, bonus: 'afterparty' },
  'buy-vip': { nome: 'Compra VIP AFTERPARTY', custo: 336, bonus: 'vip' },
  'buy-police': { nome: 'Compra POLICE PARTY', custo: 830, bonus: 'police' },
};

// --- Alvo de RTP (só informativo: o motor nunca o usa para decidir resultados)
export const ALVO = {
  rtpMin: 97.0,
  rtpMax: 98.0,
};
