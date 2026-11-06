// ============================================================================
// SÍMBOLOS E PESOS
// ----------------------------------------------------------------------------
// Cada posição da grelha é sorteada com estes PESOS RELATIVOS (não são
// percentagens). Probabilidade de um símbolo numa posição = peso / soma dos pesos.
// Regra de raridade (validada pelo motor): N1 > N2 > ... > N5 > P1 > ... > P5.
// W, CW e DW NUNCA caem naturalmente (peso 0): nascem dos poderes, cantos e Peace Police.
// ============================================================================

export const SIMBOLOS = [
  // id    nome                      categoria    personagem ligada
  { id: 'N1', nome: 'Bob Joint',            cat: 'baixo',   personagem: 'WEED' },
  { id: 'N2', nome: 'Copo de shot',         cat: 'baixo',   personagem: 'ALCOOL' },
  { id: 'N3', nome: 'Cope Cannister',           cat: 'baixo',   personagem: 'COPIUM' },
  { id: 'N4', nome: 'Pastilha',        cat: 'baixo',   personagem: 'MDMA' },
  { id: 'N5', nome: 'Selo',               cat: 'baixo',   personagem: 'LCD' },
  { id: 'P1', nome: 'WEED — The Chiller',   cat: 'premium', personagem: 'WEED' },
  { id: 'P2', nome: 'ALCOOL — The Wildcard',cat: 'premium', personagem: 'ALCOOL' },
  { id: 'P3', nome: 'COPIUM — The Dreamer', cat: 'premium', personagem: 'COPIUM' },
  { id: 'P4', nome: 'MDMA — The Rave Maniac',cat: 'premium', personagem: 'MDMA' },
  { id: 'P5', nome: 'LCD — The Glitch',     cat: 'premium', personagem: 'LCD' },
  { id: 'W',  nome: 'Wild',                 cat: 'wild' },
  { id: 'CW', nome: 'Wild de Canto',        cat: 'wild' },
  { id: 'DW', nome: 'Joiner',           cat: 'wild' },
  { id: 'S',  nome: 'Passe da Afterparty',         cat: 'scatter' },
];

// Pesos por conjunto. Cada modo/bónus aponta para um conjunto (ver jogo.js e bonus.js).
// Os respins do COPIUM usam o conjunto do modo em que acontecem.
//                 N1  N2  N3  N4  N5   P1  P2  P3  P4  P5    S
export const PESOS = {
  base:       { N1: 420, N2: 320, N3: 250, N4: 190, N5: 150, P1: 140, P2: 120, P3: 100, P4: 85, P5: 70, S: 18 },
  hunt:       { N1: 392, N2: 320, N3: 250, N4: 190, N5: 150, P1: 140, P2: 120, P3: 100, P4: 85, P5: 70, S: 33 },
  afterparty: { N1: 400, N2: 320, N3: 250, N4: 190, N5: 150, P1: 140, P2: 120, P3: 100, P4: 85, P5: 70, S: 12 },
  vip:        { N1: 400, N2: 320, N3: 250, N4: 190, N5: 150, P1: 140, P2: 120, P3: 100, P4: 85, P5: 70, S: 12 },
  police:     { N1: 400, N2: 320, N3: 250, N4: 190, N5: 150, P1: 140, P2: 120, P3: 100, P4: 85, P5: 70, S: 12 },
};

// ----------------------------------------------------------------------------
// EMPILHAMENTO («cópias vizinhas») — como nos rolos com stacks
// ----------------------------------------------------------------------------
// Cada célula nova pode COPIAR o símbolo da célula de cima (vertical) ou, se não
// copiar, o da esquerda (horizontal), com estas probabilidades em %.
// A probabilidade depende da categoria do símbolo vizinho (baixo / premium).
// Só se copiam símbolos pagantes (nunca Scatter nem wilds). Se não copiar,
// sorteia-se normalmente pelos PESOS. É isto que controla a frequência de
// clusters grandes (e portanto de despertares) sem mexer nas regras.
export const EMPILHAMENTO = {
  base:       { baixo: { vertical: 5, horizontal: 4 }, premium: { vertical: 14.5, horizontal: 10.5 } },
  hunt:       { baixo: { vertical: 5, horizontal: 4 }, premium: { vertical: 14.5, horizontal: 10.5 } },
  afterparty: { baixo: { vertical: 5, horizontal: 4 }, premium: { vertical: 17, horizontal: 13 } },
  vip:        { baixo: { vertical: 5, horizontal: 4 }, premium: { vertical: 15, horizontal: 11.5 } },
  police:     { baixo: { vertical: 3, horizontal: 2 }, premium: { vertical: 6, horizontal: 4 } },
};
