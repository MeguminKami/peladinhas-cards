// ============================================================================
// TABELA DE PAGAMENTOS — em × aposta base, por tamanho de cluster
// ----------------------------------------------------------------------------
// COLUNAS: o tamanho onde começa cada coluna. Cada coluna vale desde o seu tamanho
// até ao tamanho da coluna seguinte − 1. A última (25) é o ecrã cheio com os 4 cantos
// abertos; sem cantos, o maior cluster possível tem 21 células (coluna 21–24).
// Valores com no máximo 3 casas decimais (o motor trabalha em milésimos de aposta).
// O multiplicador do cluster (soma dos Wilds de Canto × Distintivo do Joiner) multiplica este valor.
//
// pp-v5 (decisão do dono): a tabela é DESIGN, fixa — não se mexe para calibrar o RTP
// (calibra-se com probabilidades e multiplicadores). Cada linha = valor base do
// símbolo × a mesma curva de crescimento.
// pp-v7 (decisão do dono, 05-11-2026): os símbolos pagam mais e um cluster grande vale a pena —
// valores base cerca de 2× e curva mais forte no fim (18–20 = ×16, 21–24 = ×25, ecrã cheio = ×50).
//   curva  1 · 1,3 · 1,7 · 2,2 · 2,8 · 3,5 · 4,3 · 5,2 · 6,2 · 7,3 · 8,5 · 10 · 16 · 25 · 50
//   base   N1 0,10 · N2 0,15 · N3 0,20 · N4 0,30 · N5 0,40 · P1 0,70 · P2 0,90 · P3 1,20 · P4 1,60 · P5 2,00
// Regras validadas ao arrancar (src/config.js):
//   0. nenhum valor abaixo de 0,10× (pp-v7, decisão do dono);
//   1. o símbolo de cima paga sempre mais do que o de baixo (sem empates);
//   2. em cada linha cada salto é ≥ ao anterior (o crescimento nunca abranda);
//   3. a diferença entre dois símbolos seguidos nunca encolhe;
//   4. cada coluna paga pelo menos +15 % do que a anterior.
// ============================================================================

export const COLUNAS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 21, 25];

//                 4      5      6      7      8      9     10     11     12     13     14  15–17  18–20  21–24     25
export const PAGAMENTOS = {
  N1: [  0.10,  0.13,  0.17,  0.22,  0.28,  0.35,  0.43,  0.52,  0.62,  0.73,  0.85,  1.00,  1.60,  2.50,  5.00],
  N2: [  0.15, 0.195, 0.255,  0.33,  0.42, 0.525, 0.645,  0.78,  0.93, 1.095, 1.275,  1.50,  2.40,  3.75,  7.50],
  N3: [  0.20,  0.26,  0.34,  0.44,  0.56,  0.70,  0.86,  1.04,  1.24,  1.46,  1.70,  2.00,  3.20,  5.00, 10.00],
  N4: [  0.30,  0.39,  0.51,  0.66,  0.84,  1.05,  1.29,  1.56,  1.86,  2.19,  2.55,  3.00,  4.80,  7.50, 15.00],
  N5: [  0.40,  0.52,  0.68,  0.88,  1.12,  1.40,  1.72,  2.08,  2.48,  2.92,  3.40,  4.00,  6.40, 10.00, 20.00],
  P1: [  0.70,  0.91,  1.19,  1.54,  1.96,  2.45,  3.01,  3.64,  4.34,  5.11,  5.95,  7.00, 11.20, 17.50, 35.00],
  P2: [  0.90,  1.17,  1.53,  1.98,  2.52,  3.15,  3.87,  4.68,  5.58,  6.57,  7.65,  9.00, 14.40, 22.50, 45.00],
  P3: [  1.20,  1.56,  2.04,  2.64,  3.36,  4.20,  5.16,  6.24,  7.44,  8.76, 10.20, 12.00, 19.20, 30.00, 60.00],
  P4: [  1.60,  2.08,  2.72,  3.52,  4.48,  5.60,  6.88,  8.32,  9.92, 11.68, 13.60, 16.00, 25.60, 40.00, 80.00],
  P5: [  2.00,  2.60,  3.40,  4.40,  5.60,  7.00,  8.60, 10.40, 12.40, 14.60, 17.00, 20.00, 32.00, 50.00,100.00],
};
