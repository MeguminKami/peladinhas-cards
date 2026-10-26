# Resultados medidos — 24/10/2026

Aposta de referência: 0,20 créditos. Cada amostra é uma ronda completa, incluindo todos os free spins derivados. Cada linha da tabela tem seed própria, guardada no JSON correspondente. Os intervalos são IC95 normais aproximados.

## Configuração ativa 0.3.1 — novos poderes e recalibração

P4 soma +2/+3/+5 ao global inicial ×1; P3 sorteia uniformemente uma quantidade de 2 a 10 normais para converter em P3; P1 mantém ×2 por wild, multiplicando o global nas linhas em que participa. P2 permanece igual. A calibração ajustou apenas fatores estáticos: base ×2,72, normal ×11,77, superior ×3.

| Modalidade | Amostras | RTP medido | IC95 (%) | Rondas no teto |
|---|---:|---:|---|---:|
| Base com bónus naturais | 1 000 000 | 63,6749% | 61,6653–65,6846 | 0 |
| Compra normal | 100 000 | 65,4642% | 64,2092–66,7192 | 1 |
| Compra superior | 100 000 | 65,5495% | 64,5875–66,5115 | 0 |

Relatórios `validation-*-v031.json`, hash `0a3def66ce9a7a5f107b68dc05a099e4246a37a0a11c9a3b7d8057c1b523d53d`. O lote usa seeds novas relativamente à medição usada para escolher os fatores. Os intervalos são aproximados e a cauda rara exige mais amostras. Todas as modalidades ficaram entre 60% e 70% no lote, sem demonstrar um RTP teórico exato.

Antes da recalibração, os novos poderes com os fatores antigos (0.3.0) mediram 104,3249%, 118,1255% e 335,6787%; relatórios `powers-*-v030.json` e snapshot `config-v030.json`. Os resultados das versões abaixo são históricos.

## Configuração histórica 0.2.2 — roubo nas quatro direções

Roubo acima, abaixo, esquerda e direita, sem diagonais nem ligação entre margens. Fatores estáticos de pagamento: base ×3, normal ×21,4 e superior ×16. Nova validação com seeds independentes da configuração usada para escolher os fatores:

| Modalidade | Amostras | RTP medido | IC95 (%) | Maior retorno observado |
|---|---:|---:|---|---:|
| Base com bónus naturais | 1 000 000 | 65,4403% | 64,2667–66,6139 | 2 589,30× |
| Compra normal | 100 000 | 64,8720% | 64,5578–65,1862 | 2 387,45× |
| Compra superior | 100 000 | 64,8378% | 64,2017–65,4739 | 9 760,80× |

Relatórios `validation-*-v022.json`, configuração completa `config-v022.json`, hash `47d1b1e47eae7d36ea803ea7e6b68705fdbcb4cb21b346159819270e308ba8c3`. Nenhuma ronda atingiu o teto neste lote. A alcançabilidade do teto também é verificada por teste determinístico com símbolos geráveis; ausência de ocorrência nesta amostra não significa impossibilidade.

Antes do ajuste, a correção da direita isolada (0.2.1) mediu 68,7142%, 66,8639% e 76,9606%, respetivamente. Esses relatórios estão em `validation-*-v021.json`. O superior excedia o intervalo pedido, pelo que os fatores dos bónus foram reduzidos explicitamente na 0.2.2. Os resultados abaixo são históricos.

## Proposta inicial 0.1.0 — sem calibração

| Modalidade | Amostras | RTP medido | IC95 (%) |
|---|---:|---:|---|
| Base com bónus naturais | 1 000 000 | 14,7022% | 14,6139–14,7905 |
| Compra normal, custo 90× | 100 000 | 2,8247% | 2,8111–2,8382 |
| Compra superior, custo 220× | 100 000 | 3,3669% | 3,3366–3,3972 |

Relatórios: `base-1000000.json`, `normal-100000.json`, `superior-100000.json`. Configuração original em `initial-config.json`. O hash identifica a configuração original antes de introduzir fatores por modo.

A hipótese inicial ficou muito longe dos 96% então pretendidos. O normal devolveu em média 2,5422× a aposta e o superior 7,4072×, perante custos de 90× e 220×. Além disso, os pagamentos base contribuíram apenas 13,6337 pontos percentuais. São resultados dos símbolos gerados, não uma escolha prévia de prémio.

## Configuração 0.2.0 — alvo revisto pelo utilizador para 60–70%

Alvo central 65%. Mantidos preços, pesos e poderes. Introduzidos fatores fixos de pagamento: base ×3, normal ×22 e superior ×19, antes do arredondamento e do teto. Isto é uma alteração explícita da tabela efetiva de pagamentos por modo.

Primeiro lote de calibração:

| Modalidade | Amostras | RTP medido | IC95 (%) |
|---|---:|---:|---|
| Base | 1 000 000 | 66,8630% | 65,3380–68,3881 |
| Compra normal | 100 000 | 64,8052% | 64,5050–65,1055 |
| Compra superior | 100 000 | 65,1200% | 64,5402–65,6997 |

Lote independente de validação, sem novos ajustes:

| Modalidade | Amostras | RTP medido | IC95 (%) | Maior retorno observado |
|---|---:|---:|---|---:|
| Base | 1 000 000 | 65,4149% | 64,3399–66,4899 | 1 394,85× |
| Compra normal | 100 000 | 64,6059% | 64,3000–64,9118 | 3 120,45× |
| Compra superior | 100 000 | 65,2314% | 64,6088–65,8541 | 10 000× |

Relatórios `calibration-*-v02.json` e `validation-*-v02.json`. Todos usam a mesma configuração, hash `7228f2778cf37b656dc0e8687ed590090264b60ef45ec14f52a151211c6db998`.

Na validação, o bónus normal pagou em média 58,1453× e o superior 143,5091× a aposta. O superior atingiu o teto em 3 das 100 000 compras; isto demonstra que o teto é alcançável, mas a amostra é pequena para estimar essa frequência com precisão. As outras modalidades não atingiram o teto nesse lote.

## Interpretação e limites

- As três modalidades ficaram no intervalo pedido nos lotes de calibração e validação. Isso não prova um RTP teórico exato de 65%.
- Os resultados reportados são para aposta de 0,20. A CLI suporta toda a escada e reproduz o arredondamento de cada aposta; é necessária validação adicional por aposta para quantificar esse efeito.
- São precisas mais seeds e amostras para caracterizar a cauda rara e a volatilidade com maior segurança.
- A tabela relativa original é preservada, mas os fatores por modo mudam o seu valor efetivo. Esses fatores devem constar das regras na futura interface.
- Os quantis exportados são faixas, não valores pontuais. Os totais exatos em cêntimos e a soma de quadrados estão nos JSON para auditoria.
- Os ficheiros `.log` são apenas cópias da saída de terminal; os JSON são os relatórios estruturados.
