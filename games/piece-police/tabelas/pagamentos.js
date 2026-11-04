// ============================================================================
// TABELA DE PAGAMENTOS — em × aposta base, por tamanho de cluster
// ----------------------------------------------------------------------------
// COLUNAS: o tamanho onde começa cada coluna. Cada coluna vale desde o seu tamanho
// até ao tamanho da coluna seguinte − 1. A última (25) é o ecrã cheio com os 4 cantos
// abertos; sem cantos, o maior cluster possível tem 21 células (coluna 21–24).
// Valores com no máximo 3 casas decimais (o motor trabalha em milésimos de aposta).
// O multiplicador dos wilds (CW, DW) dentro do cluster multiplica este valor.
//
// pp-v5 (decisão do dono): a tabela é DESIGN, fixa — não se mexe para calibrar o RTP
// (calibra-se com probabilidades e multiplicadores). Cada linha = valor base do
// símbolo × a mesma curva de crescimento:
//   curva  1 · 1,25 · 1,6 · 2 · 2,5 · 3,1 · 3,8 · 4,6 · 5,5 · 6,5 · 7,6 · 9 · 14 · 22 · 50
//   base   N1 0,10 · N2 0,12 · N3 0,15 · N4 0,18 · N5 0,22 · P1 0,40 · P2 0,50 · P3 0,65 · P4 0,85 · P5 1,10
// Regras validadas ao arrancar (src/config.js):
//   1. o símbolo de cima paga sempre mais do que o de baixo (sem empates);
//   2. em cada linha cada salto é ≥ ao anterior (o crescimento nunca abranda);
//   3. a diferença entre dois símbolos seguidos nunca encolhe;
//   4. cada coluna paga pelo menos +15 % do que a anterior.
// ============================================================================

export const COLUNAS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 21, 25];

//                 4      5      6      7      8      9     10     11     12     13     14  15–17  18–20  21–24     25
export const PAGAMENTOS = {
  N1: [0.10, 0.13, 0.16, 0.20, 0.25, 0.31, 0.38, 0.46, 0.55, 0.65, 0.76, 0.90, 1.40, 2.20, 5.00],
  N2: [0.12, 0.15, 0.19, 0.24, 0.30, 0.37, 0.46, 0.55, 0.66, 0.78, 0.91, 1.08, 1.68, 2.64, 6.00],
  N3: [0.15, 0.19, 0.24, 0.30, 0.38, 0.47, 0.57, 0.69, 0.83, 0.98, 1.14, 1.35, 2.10, 3.30, 7.50],
  N4: [0.18, 0.22, 0.29, 0.36, 0.45, 0.56, 0.68, 0.83, 0.99, 1.17, 1.37, 1.62, 2.52, 3.96, 9.00],
  N5: [0.22, 0.28, 0.35, 0.44, 0.55, 0.68, 0.84, 1.01, 1.21, 1.43, 1.67, 1.98, 3.08, 4.84, 11.00],
  P1: [0.40, 0.50, 0.64, 0.80, 1.00, 1.24, 1.52, 1.84, 2.20, 2.60, 3.04, 3.60, 5.60, 8.80, 20.00],
  P2: [0.50, 0.63, 0.80, 1.00, 1.25, 1.55, 1.90, 2.30, 2.75, 3.25, 3.80, 4.50, 7.00, 11.00, 25.00],
  P3: [0.65, 0.81, 1.04, 1.30, 1.63, 2.02, 2.47, 2.99, 3.58, 4.23, 4.94, 5.85, 9.10, 14.30, 32.50],
  P4: [0.85, 1.06, 1.36, 1.70, 2.13, 2.64, 3.23, 3.91, 4.68, 5.53, 6.46, 7.65, 11.90, 18.70, 42.50],
  P5: [1.10, 1.38, 1.76, 2.20, 2.75, 3.41, 4.18, 5.06, 6.05, 7.15, 8.36, 9.90, 15.40, 24.20, 55.00],
};
