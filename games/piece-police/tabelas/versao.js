// Versão da matemática. Sobe SEMPRE que uma tabela ou a lógica do motor mudar.
// Os relatórios guardam esta versão: números de versões diferentes não se comparam.
export const MATH_VERSION = 'pp-v3';

// Histórico (a mais recente em cima)
export const HISTORICO = [
  { versao: 'pp-v3', data: '2026-11-03', nota: 'Decisão do dono: os wilds contam por inteiro (clusterMinimoReais 3 -> 1); os HOLD wilds (SLOW DISASTER e W presos em grupos sticky) saem quando pagam. Pagamentos recalibrados.' },
  { versao: 'pp-v2', data: '2026-11-03', nota: 'Decisões do dono: vários Scatters por coluna; grupos sticky pagam o tamanho final uma vez. Pagamentos +13 %, Scatter base 26 / hunt 36 / bónus 12, preços 69 / 216 / 820.' },
  { versao: 'pp-v1', data: '2026-11-03', nota: 'Primeira versão completa: tabelas iniciais e calibração inicial (validação: seed validacao-final, 4M/200k, todos os modos 97–98 %).' },
];
