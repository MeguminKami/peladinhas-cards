import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_CONFIG as config, SYMBOLS, entryCostMultiplier } from '../src/config.js';
import { createEngine, magicParameters } from '../src/engine.js';

// Replay the existing sample without changing engine rules or RNG consumption.
const source = JSON.parse(readFileSync(new URL('../rtp-reduced-copies-15-v19-validation.json', import.meta.url)));
const hash = createHash('sha256').update(JSON.stringify(config)).digest('hex');
const names = { base: 'Base', hunt: 'Hunt', common: 'Normal', super: 'Super', secret: 'Secret' };
const fmt = (v, digits = 4) => Number(v).toLocaleString('pt-PT', { maximumFractionDigits: digits });
const pct = v => `${fmt(v * 100)}%`;
const table = (headers, rows) => [headers, headers.map(() => '---'), ...rows].map(r => `| ${r.join(' | ')} |`).join('\n');
const edges = [0, 1, 2, 5, 10, 20, 50, 100, 250, 500, 1000, 2500, 5000, 10000, Infinity];
function histogram(values, price) {
  const bins = [{ label: '0', count: 0, sum: 0 }, ...edges.slice(0, -1).map((lo, i) => ({
    label: lo === 0 ? ']0; 1[' : `[${lo}; ${edges[i + 1] === Infinity ? '+inf' : edges[i + 1]}[`, count: 0, sum: 0,
  }))];
  let total = 0;
  for (const value of values) {
    const x = value / price;
    const index = x === 0 ? 0 : edges.findIndex((lo, i) => x >= lo && x < edges[i + 1]) + 1;
    assert.ok(index >= 0 && index < bins.length);
    bins[index].count++;
    bins[index].sum += value;
    total += value;
  }
  assert.equal(bins.reduce((n, b) => n + b.count, 0), values.length);
  assert.ok(Math.abs(bins.reduce((n, b) => n + b.sum, 0) - total) < 1e-5);
  return bins.map(b => ({ ...b, probability: b.count / values.length,
    rtpContribution: b.sum / (values.length * price), payoutShare: total ? b.sum / total : 0 }));
}
const reports = [];
const csv = ['mode,paid_base_bets,count,probability,rtp_contribution'];
for (const old of source.reports) {
  assert.equal(old.configHash, hash, 'Reference sample must match current config');
  const engine = createEngine({ seed: old.seed });
  const values = [];
  const frequencies = new Map();
  const natural = Object.fromEntries(['common', 'super', 'secret'].map(m => [m, { count: 0, bonusPaid: 0 }]));
  let paid100 = 0, max = 0, anyRetrigger = 0;
  for (let i = 0; i < old.count; i++) {
    const { state } = engine.play({ mode: old.mode, betUnits: old.betUnits });
    const x = state.paid100 / 100;
    values.push(x); paid100 += state.paid100; max = Math.max(max, x);
    frequencies.set(state.paid100, (frequencies.get(state.paid100) ?? 0) + 1);
    anyRetrigger += Number(state.retriggers > 0);
    if (['base', 'hunt'].includes(old.mode) && state.bonusType) {
      natural[state.bonusType].count++;
      natural[state.bonusType].bonusPaid += state.paidByMode100[state.bonusType] / 100;
    }
  }
  assert.ok(Math.abs(paid100 / 100 - old.totalReturnBaseBets) < 1e-5, 'Replay must reproduce the original payout');
  values.sort((a, b) => a - b);
  const cost = entryCostMultiplier(old.mode);
  const quantiles = Object.fromEntries([.1, .25, .5, .75, .9, .95, .99, .999, 1].map(p => [`p${p * 100}`, values[Math.floor((values.length - 1) * p)]]));
  const mean = paid100 / 100 / old.count;
  const sd = Math.sqrt(old.sampleVariance) * cost;
  const skewnessMoment = values.reduce((n, x) => n + ((x - mean) / sd) ** 3, 0) / values.length;
  const topShare = fraction => values.slice(-Math.ceil(values.length * fraction)).reduce((a, b) => a + b, 0) / (paid100 / 100);
  for (const [pay, count] of [...frequencies].sort((a, b) => a[0] - b[0])) csv.push([old.mode, pay / 100, count, count / old.count, pay / 100 * count / (old.count * cost)].join(','));
  reports.push({ ...old, cost, maxObservedBaseBets: max, quantiles, standardDeviationBaseBets: sd,
    skewnessMoment, top1PercentPayoutShare: topShare(.01), top01PercentPayoutShare: topShare(.001),
    anyRetriggerCount: anyRetrigger, anyRetriggerFrequency: anyRetrigger / old.count, natural,
    histogramBaseBets: histogram(values, 1).map(b => ({ ...b, rtpContribution: b.rtpContribution / cost })),
    histogramCostMultiples: histogram(values, cost),
    exactReturnProbabilities: [...frequencies].sort((a, b) => a[0] - b[0]).map(([pay, count]) => ({ paidBaseBets: pay / 100, count, probability: count / old.count })),
  });
  console.log(JSON.stringify({ mode: old.mode, mean, sd, quantiles, anyRetriggerFrequency: anyRetrigger / old.count }));
}

const parts = [
  '# Matemática e distribuição de pagamentos — v19',
  `Configuração: ${config.version}. Hash SHA-256: ${hash}. Análise local da amostra de 2026-10-31, reproduzida com as mesmas seeds; não é uma validação independente, calibração adicional ou certificação. Nenhum parâmetro do jogo foi alterado.`,
  '## Unidades e método',
  'B = aposta base; X = prémio bruto total / B, somando todas as cascatas, bónus e retriggers de uma entrada completa. C = custo da entrada em B; Y = X/C é o retorno por custo pago. Lucro líquido em B = X − C. RTP = E[X]/C = E[Y]. Um bónus comprado é uma observação completa, não um free spin. O prémio da tabela e os X abaixo são retornos brutos, não lucros.',
  'A distribuição de X não é uma normal/gaussiana: tem massa em zero, suporte não negativo, assimetria e cauda longa, limitada pelo MAX WIN. Os intervalos de confiança apresentados aproximam a incerteza da média; não descrevem a distribuição dos prémios individuais nem garantem cobertura de eventos raros.',
  'Motor: grelha 6 × 5; clusters ortogonais com pelo menos cinco posições (incluindo wilds ligados); diagonais não ligam. Um wild pode participar em grupos de símbolos diferentes. Remoções partilhadas acontecem uma vez. Gravidade conserva sobreviventes; novas posições usam as mesmas regras de sorteio e cópia. Não há uma probabilidade configurada por tamanho de cluster: ela emerge destes processos dependentes.',
  '## Custos, limites e barras',
  table(['Modo', 'Custo C', 'XP', 'Spins iniciais', 'MAX WIN / custo'], Object.keys(names).map(m => [names[m], `${entryCostMultiplier(m)}×`, config.xpThreshold100[m === 'hunt' ? 'base' : m] / 100, ['base', 'hunt'].includes(m) ? '1 + eventual bónus' : config.bonusSpins, fmt(10000 / entryCostMultiplier(m)) + '×'])),
  'Preços máximos permitidos: Normal 100×, Super 250×, Secret 800×. MAX WIN = 10.000× B por entrada completa, incluindo bónus e retriggers. Ao atingir o teto, termina sem novos preenchimentos/retriggers. XP e magia base/Hunt continuam ativos a 40 XP; só a barra visual foi retirada. A liquidação acumula centésimos de aposta e arredonda para baixo uma única vez nas unidades de crédito.',
  '## Símbolos e pagamentos partilhados',
  table(['Símbolo', 'Peso PPM', 'P(símbolo | não scatter)', '5', '6–7', '8–10', '11–13', '14–17', '18+'], SYMBOLS.map((s, i) => [s, config.weights[i], pct(config.weights[i] / 1e6), ...config.pay100[i].map(v => `${fmt(v / 100)}×`)])),
  'Esta tabela é única para base, Hunt e os três bónus, antes dos multiplicadores dos wilds. Pesos somam 1.000.000. P(símbolo num sorteio) = (1 − q_scatter) × peso/1.000.000. Uma posição preenchida por cópia não executa um novo sorteio; estes pesos não são a ocupação final de cada casa. N5 tem o mesmo peso de N3 e P2 é mais frequente que P1; todos os premium são mais raros que qualquer normal.',
  '## Cópias vizinhas — todos os modos',
  table(['Parâmetro', 'Normais', 'Premium'], [
    ['Primeira cópia p', pct(config.pairPPM / 1e6), pct(config.premiumPairPPM / 1e6)],
    ['Segunda cópia condicionada à primeira r', pct(config.repeatPairPPM / 1e6), pct(config.repeatPairPPM / 1e6)],
    ['Só original: 1−p', pct(1 - config.pairPPM / 1e6), pct(1 - config.premiumPairPPM / 1e6)],
    ['Original + 1: p(1−r)', pct(config.pairPPM / 1e6 * (1 - config.repeatPairPPM / 1e6)), pct(config.premiumPairPPM / 1e6 * (1 - config.repeatPairPPM / 1e6))],
    ['Original + 2: pr', pct(config.pairPPM / 1e6 * config.repeatPairPPM / 1e6), pct(config.premiumPairPPM / 1e6 * config.repeatPairPPM / 1e6)],
    ['E[células geradas] = 1+p+pr', fmt(1 + config.pairPPM / 1e6 * (1 + config.repeatPairPPM / 1e6)), fmt(1 + config.premiumPairPPM / 1e6 * (1 + config.repeatPairPPM / 1e6))],
  ]),
  'As últimas quatro linhas pressupõem vizinhos livres para ambas as cópias. A primeira escolhe uniformemente um vizinho ortogonal livre do original; a segunda escolhe um vizinho livre da primeira cópia. Sem espaço, a cópia falha. Máximo de duas cópias por sorteio, sem recursão. Preenchimento por coluna, da esquerda para a direita, de baixo para cima; cópias podem ocupar casas que ainda seriam sorteadas.',
  '## Scatters por posição sorteada',
  table(['Próximo scatter', 'Base PPM / %', 'Hunt PPM / %', 'Normal PPM / %', 'Super PPM / %', 'Secret PPM / %'], Array.from({ length: 5 }, (_, i) => [i + 1, ...['base', 'hunt', 'common', 'super', 'secret'].map(m => { const q = m === 'hunt' ? Math.round((config.scatterPPM.base[i] ?? 0) * config.bonusHunt.scatterMultiplier) : config.scatterPPM[m][i] ?? 0; return `${q} / ${pct(q / 1e6)}`; })])),
  'Hunt custa 4× e multiplica as probabilidades base por 2,415, arredondadas ao PPM mais próximo. O aumento aplica-se também aos refills do spin base; o bónus obtido usa probabilidades normais do seu modo. Cada scatter atualiza imediatamente a contagem. Máximo de cinco no base/Hunt e três nos bónus, incluindo cascatas. Não há sorteio antecipado da quantidade. Scatters sobrevivem às cascatas e não pagam prémio próprio.',
  table(['Contagem no fim do spin completo', 'Base/Hunt', 'Durante qualquer bónus'], [
    ['0–1', 'Sem entrada', 'Sem retrigger'], ['2', 'Sem entrada', '+2 spins'], ['3', 'Normal: 12 spins', '+4 spins'], ['4', 'Super: 12 spins', 'Não gerável'], ['5', 'Secret: 12 spins', 'Não gerável'],
  ]),
  'Gatilhos são contagens exatas, avaliadas uma vez depois de todas as cascatas e magias; contagens não acumulam entre spins. Retriggers não promovem o bónus. Os PPM são probabilidades condicionais por posição, não probabilidades de bónus/retrigger por entrada.',
  '## XP — independente dos escalões de pagamento',
  table(['Regulares no cluster', '5', '6–7', '8–10', '11–14', '15–17', '18+'], [['Normais', 3, 5, 7, 9, 11, 13], ['Premium', 5, 7, 9, 11, 13, 15]]),
  'Menos de cinco regulares dá zero XP, mesmo quando wilds completam um cluster vencedor. Somam-se os XP dos hits de cada cascata; multiplicadores monetários não multiplicam XP. Após remover, aplicar gravidade e preencher, se XP ≥ barra, ocorre uma magia e todo o excesso de XP é descartado. No base/Hunt, XP e nível reiniciam no fim do spin; no bónus persistem entre spins. Um novo bónus começa a zero. Os wilds não persistem para o tabuleiro inicial do spin seguinte.',
  '## Magia e multiplicadores',
  table(['Regra', 'Base/Hunt', 'Normal', 'Super', 'Secret'], [
    ['Primeira magia', '1/2/3 wilds: 50%/35%/15%', '2 wilds ×1', '2 wilds ×2', '2 wilds ×2'],
    ['Evolução por magia seguinte', 'Novo sorteio 1/2/3, sem multiplicador', '+1 wild / +1×', '+1 wild / +2×', '+2 wilds / +4×'],
    ['No limite de 10', 'Só cabe o espaço livre', 'Só +1×', 'Só +2×', 'Só +4×'],
  ]),
  table(['Ativação k', 'Normal: pedidos / multiplicador', 'Super: pedidos / multiplicador', 'Secret: pedidos / multiplicador'], Array.from({ length: 10 }, (_, i) => { const k = i + 1; return [k, `${Math.min(10, k + 1)} / ×${k}`, `${Math.min(10, k + 1)} / ×${2 * k}`, `${Math.min(10, 2 * k)} / ×${4 * k - 2}`]; })),
  'Detalhe executável relevante: «pedidos» é o número de novos wilds que a ativação tenta colocar, não um objetivo de wilds totais no tabuleiro. Colocados = min(pedidos, 10 − sobreviventes, posições regulares elegíveis). A posição é escolhida uniformemente sem reposição entre os regulares; scatters não são substituídos. Todos os wilds sobreviventes do bónus são atualizados para max(multiplicador anterior, multiplicador da magia). A contagem pedida e o multiplicador persistem no bónus, mesmo que não caibam todos os wilds pedidos.',
  'No bónus: multiplicador do hit = soma dos multiplicadores dos wilds ligados; sem wild, vale 1. Exemplo: wilds ×2 e ×3 dão ×5, não ×6. Base/Hunt: wilds são substitutos sem multiplicador monetário. Um ecrã só de wilds/scatters paga uma vez como P5; respeitando o limite de scatters teria pelo menos 25 wilds e portanto escalão 18+. Máximo de dez wilds gerados em jogo; a situação de ecrã completo só de wilds/scatters não é alcançável com esses limites.',
  'Vetores de evolução, em PPM (cada sorteio atual é determinístico):',
  table(['Bónus', 'Ganho wild +1/+2/+3', 'Ganho × +1/+2/+3/+4', 'Sorteios por recompensa'], ['common', 'super', 'secret'].map(m => [names[m], config.magic[m].wildGainWeights.join('/'), config.magic[m].multiplierGainWeights.join('/'), config.magic[m].rewardRolls])),
  '## RTP e dispersão observados',
  table(['Modo', 'N', 'C', 'E[X] em B', 'RTP', 'IC95% aproximado RTP', 'Desvio-padrão X', 'P(X=0)', 'P(lucro)', 'MAX WINs'], reports.map(r => [names[r.mode], r.count, r.cost, fmt(r.meanReturnBaseBets), pct(r.rtp), r.confidence95Approx.map(pct).join(' a '), fmt(r.standardDeviationBaseBets), pct(1 - r.nonzeroReturnFrequency), pct(r.profitFrequency), r.maxWinCount])),
  table(['Modo', 'P10', 'P25', 'Mediana', 'P75', 'P90', 'P95', 'P99', 'P99,9', 'Máximo observado'], reports.map(r => [names[r.mode], ...Object.values(r.quantiles).map(v => fmt(v))])),
  'Percentis em múltiplos de B por entrada completa. Os quantis usam o valor ordenado de índice floor((N−1)p), sem interpolação.',
  table(['Modo', 'Parcela dos prémios no top 1%', 'Parcela no top 0,1%', 'Assimetria (momento padronizado)'], reports.map(r => [names[r.mode], pct(r.top1PercentPayoutShare), pct(r.top01PercentPayoutShare), fmt(r.skewnessMoment)])),
  '## Distribuição empírica dos X pagos — aposta base',
  'Intervalos [a;b[ incluem a e excluem b. Zero é isolado; ]0;1[ exclui os dois limites. O teto de 10.000× fica na última linha. Cada célula é probabilidade / contribuição ao RTP em pontos percentuais. As contribuições somam o RTP do modo; não são percentagens dentro dos ganhos.',
  table(['X = prémio / B', ...reports.map(r => names[r.mode])], reports[0].histogramBaseBets.map((b, i) => [b.label, ...reports.map(r => `${pct(r.histogramBaseBets[i].probability)} / ${fmt(r.histogramBaseBets[i].rtpContribution * 100)} pp`)])),
  '## Distribuição por custo efetivamente pago',
  'Y = X/C. Para comparar risco de compra entre modos: Y < 1 é prejuízo, Y = 1 é empate, Y > 1 é lucro. Mesmos intervalos, agora em múltiplos do custo.',
  table(['Y = prémio / custo', ...reports.map(r => names[r.mode])], reports[0].histogramCostMultiples.map((b, i) => [b.label, ...reports.map(r => pct(r.histogramCostMultiples[i].probability))])),
  '## Decomposição do RTP base/Hunt',
  table(['Entrada', 'Prémios no spin base (pp)', 'Bónus Normal (pp)', 'Bónus Super (pp)', 'Bónus Secret (pp)'], reports.filter(r => ['base', 'hunt'].includes(r.mode)).map(r => [names[r.mode], ...['base', 'common', 'super', 'secret'].map(m => fmt(r.contributionsRtp[m] * 100))])),
  table(['Entrada', 'Bónus', 'Entradas observadas', 'Frequência por entrada', '1 em N observado', 'Prémio médio só do bónus em B'], reports.filter(r => ['base', 'hunt'].includes(r.mode)).flatMap(r => Object.entries(r.natural).map(([m, n]) => [names[r.mode], names[m], n.count, pct(n.count / r.count), n.count ? fmt(r.count / n.count) : 'Não estimável', n.count ? fmt(n.bonusPaid / n.count) : 'Não estimável']))),
  'As médias condicionais de bónus naturais raros são muito instáveis; zero observações não significa probabilidade zero. O spin base já pago partilha o teto de 10.000× com o bónus, pelo que não se deve substituir automaticamente o prémio natural pela média das compras.',
  '## Retriggers, cascatas e magia medidos',
  table(['Modo', 'Spins totais', 'Cascatas/entrada', 'Magias/entrada', 'P(hit por spin)', 'Maior nível de magia', 'Maior duração de bónus'], reports.map(r => [names[r.mode], r.spins, fmt(r.cascades / r.count), fmt(r.magicActivations / r.count), pct(r.hitSpinFrequency), r.maxMagicLevel, r.maxBonusDuration])),
  table(['Compra', 'Eventos 2 scatters', 'Eventos 3 scatters', 'Eventos/compra', 'P(≥1 retrigger)', 'Spins adicionados/compra', 'P(pedidos chegam a 10)'], reports.filter(r => !['base', 'hunt'].includes(r.mode)).map(r => [names[r.mode], r.retriggersByScatters[2], r.retriggersByScatters[3], fmt(r.retriggers / r.count), pct(r.anyRetriggerFrequency), fmt(r.addedSpins / r.count), pct(r.bonusReachedWildCapFrequency)])),
  'P(pedidos chegam a 10) mede o progresso de magia registado pelo simulador, não garante dez wilds simultâneos efetivamente colocados. Eventos/compra pode ultrapassar 1; P(≥1 retrigger) conta compras distintas.',
  '## Leitura analítica para melhorar RTP',
  'Apenas mudar o preço C, mantendo a geração, transforma RTP por RTP_novo = E[X]/C_novo. Para alvo r, C_novo = E[X]/r. A tabela seguinte é uma conta sobre esta amostra, não uma proposta aplicada; preços do motor são inteiros e sujeitos aos máximos.',
  table(['Compra', 'Preço atual', 'E[X]', 'Preço contínuo para 97%', 'Teto permitido'], reports.filter(r => !['base', 'hunt'].includes(r.mode)).map(r => [names[r.mode], r.cost, fmt(r.meanReturnBaseBets), fmt(r.meanReturnBaseBets / .97), { common: 100, super: 250, secret: 800 }[r.mode]])),
  'O custo Hunt também altera a análise do retorno por entrada, mas o contrato mantém custo 4×. Para base, custo é 1×. Pesos, cópias e entradas naturais são alavancas permitidas; pagamentos, XP, teto de wilds, evolução e scatters de retrigger estão fixados. As alterações de cópias têm efeitos não lineares: alteram clusters, cascatas, XP, magia e quantidade de oportunidades de scatter. Não é válido assumir que reduzir cópias 15% reduz RTP 15%, ou que bónus é apenas 12 vezes a média de um spin isolado.',
  'Para uma solução analítica exata seria necessário modelar o estado do tabuleiro (incluindo conectividade, wilds e seus multiplicadores), XP, progresso de magia, scatters, spins restantes e prémio acumulado até ao teto. Não há independência entre casas nem entre cascatas. A distribuição empírica serve para decompor o problema; a raridade dos prémios grandes limita conclusões a partir destas amostras. Escolher parâmetros com estas seeds exige depois uma amostra independente para validação.',
  '## Ficheiros e reprodução',
  'Fontes: [configuração](src/config.js), [motor](src/engine.js), [simulador](src/simulation.js), [amostra original](rtp-reduced-copies-15-v19-validation.json).',
  'Reproduzir nesta pasta: `node scripts/analyze-math.js`. Exportações: [JSON completo](analise-matematica-v19.json) e [frequências exatas em CSV](distribuicao-pagamentos-v19.csv). O CSV tem uma linha por valor distinto de retorno e modo; a soma de count é N e a soma de rtp_contribution é o RTP.',
];
// Verify the displayed progression against the actual implementation.
for (const mode of ['common', 'super', 'secret']) {
  let previous;
  for (let k = 1; k <= 10; k++) {
    previous = magicParameters(mode, k, null, config, previous);
    assert.equal(previous.requested, Math.min(10, mode === 'secret' ? 2 * k : k + 1));
    assert.equal(previous.multiplier, mode === 'secret' ? 4 * k - 2 : mode === 'super' ? 2 * k : k);
  }
}
writeFileSync(new URL('../analise-matematica-v19.json', import.meta.url), JSON.stringify({ purpose: 'analysis-of-existing-sample-not-certification', config, configHash: hash, reports }, null, 2) + '\n');
writeFileSync(new URL('../distribuicao-pagamentos-v19.csv', import.meta.url), csv.join('\n') + '\n');
writeFileSync(new URL('../analise-matematica-v19.md', import.meta.url), parts.join('\n\n') + '\n');
