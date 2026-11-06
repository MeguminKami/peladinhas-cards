// Versão da matemática. Sobe SEMPRE que uma tabela ou a lógica do motor mudar.
// Os relatórios guardam esta versão: números de versões diferentes não se comparam.
export const MATH_VERSION = 'pp-v7';

// Histórico (a mais recente em cima)
export const HISTORICO = [
  { versao: 'pp-v7', data: '2026-11-05', nota: 'Decisões do dono: o Distintivo do Joiner MULTIPLICA a soma dos cantos (teto por modo: base 30, AFTERPARTY 8, VIP 30, POLICE 100); tabela de pagamentos ~2× com curva mais forte no fim e mínimo 0,10× validado; multiplicadores mais baixos (cantos ×1, Total Chemistry +1 aos cantos); poderes fazem menos clusters gigantes (LCD máx. 5/8 células, WEED 2, MDMA 3/5, ALCOOL 3, NEVER ENDING DREAM 2 respins); empilhamento premium base/hunt 14,5/10,5, AFTERPARTY 17/13; Scatter base 18 (N1 420), hunt 33 (N1 392); compras 126 / 334 / 840 (validação: seed validacao-pp-v7-c, 16M/200k); no bónus no máximo 3 Scatters por spin (3 S → +5).' },
  { versao: 'pp-v6', data: '2026-11-04', nota: 'Decisões do dono: FUSÃO SURPRESA — em 3 % dos spins do jogo base e da MAIS SCATTERS dispara uma das 10 fusões ao acaso, sem acordar personagens; alvo de RTP 98 %. Scatter base 20 → 16 (N1 430); MAIS SCATTERS custa 2× (era 1,4×) com Scatter 26 → 29 (N1 369); compras 160 / 336 / 830 (validação: seed validacao-pp-v6-c, 16M/200k).' },
  { versao: 'pp-v5', data: '2026-11-04', nota: 'Decisões do dono: tabela de pagamentos fixa de design (valor base × curva comum; 4 regras de forma validadas); ganho máximo 25 000×; volatilidade por bónus — AFTERPARTY média (4 cantos ×1, teto ×2), VIP alta (3 cantos persistentes, teto ×10), POLICE PARTY muito alta (cantos fechados, ×1 +2 por prémio até ×50, Distintivo até ×50). Scatter base 20 (N1 430) / hunt 26 (N1 405); preços 161 / 336 / 836 (validação: seed validacao-pp-v5-c, 16M/200k).' },
  { versao: 'pp-v4', data: '2026-11-04', nota: 'Decisões do dono: nenhum prémio abaixo de 0,10×; colunas 18–20, 21–24 e 25 na tabela (×1,5 / ×2,1 / ×4,2 o 15–17); menos wilds (ALCOOL 1+Copos até 4, SLOW DISASTER +2, TOTAL MAYHEM 2 saltos); tabela +2 %; preços 61,5 / 160 / 864 (validação: seed validacao-pp-v4, 8M/200k).' },
  { versao: 'pp-v3', data: '2026-11-03', nota: 'Decisão do dono: os wilds contam por inteiro (clusterMinimoReais 3 -> 1); os HOLD wilds (SLOW DISASTER e W presos em grupos sticky) saem quando pagam. Pagamentos recalibrados.' },
  { versao: 'pp-v2', data: '2026-11-03', nota: 'Decisões do dono: vários Scatters por coluna; grupos sticky pagam o tamanho final uma vez. Pagamentos +13 %, Scatter base 26 / hunt 36 / bónus 12, preços 69 / 216 / 820.' },
  { versao: 'pp-v1', data: '2026-11-03', nota: 'Primeira versão completa: tabelas iniciais e calibração inicial (validação: seed validacao-final, 4M/200k, todos os modos 97–98 %).' },
];
