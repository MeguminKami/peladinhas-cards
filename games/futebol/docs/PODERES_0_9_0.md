# Poderes — configuração 0.9.4

Atualização de 29/10/2026: o Passe Curto procura **outro P1**, excluindo a carta que forneceu o poder. Havendo destino, mantém o caminho mínimo ortogonal, preservando todos os Wilds. Sem outro P1, sorteia uniformemente uma de **8 direções**, incluindo diagonais, e remata em linha reta até à margem ou ao primeiro premium (P1–P4) ou Wild. O obstáculo entra no percurso da animação mas não é convertido. Converte os normais atravessados para P1; Scatters atravessados são preservados, como no passe normal. Não há ligação entre margens; uma direção que sai imediatamente da grelha não converte posições. Os alvos de passe são do tabuleiro inicial; bloqueios do remate usam o tabuleiro no momento da ativação. Wilds nunca são removidos em nenhuma das duas interações.

O evento distingue `passKind` (pass/shot) e guarda rota/direção; a apresentação mostra Passe ou Remate Livre e anima essa rota, sem novo sorteio. Sessões 0.9.3 migram preservando saldo, RNG, resultados e estado ativo. Novas jogadas usam 0.9.4; RTP ainda não medido. Restantes regras mantidas.

## Histórico 0.9.3

Atualização de 29/10/2026: **Passe Curto** escolhe uniformemente um P1 do tabuleiro inicial e leva a bola pelo caminho ortogonal mais curto a partir do Wild. O percurso inclui origem e destino; empates são sorteados uniformemente entre os caminhos mínimos. Todas as posições percorridas que não sejam Wild, Scatter ou já P1 são convertidas para P1, incluindo outros premiums. Wilds e Scatters são preservados no percurso. O destino pode ser a própria fonte adjacente; nesse caso pode não haver novas conversões. Não cria roubos em cadeia nem altera o global. A animação percorre a rota registada no evento e revela as conversões por ordem; modo reduzido aplica o resultado diretamente.

Sessões 0.9.2 migram preservando saldo, RNG, estado ativo e resultados confirmados; próximas jogadas usam 0.9.3. Restantes probabilidades, preços e pagamentos mantidos. RTP da 0.9.3 ainda não medido; resultados anteriores não validam esta versão.

## Histórico 0.9.2

Atualização de 29/10/2026: no bónus de 3 Scatters, aumento relativo de **25%** na chance de roubo (40% → **50%**) e na chance de Wild por posição livre (50/1035 → 25/414 = **6,038647%**). Pesos N1…W: `18672,16727,14393,12059,6224,4279,2723,1556,4925`, total 81558. Preservadas as proporções entre não-Wilds, a compra 90×, os outros bónus e a tabela de pagamentos. Sessões 0.9.1 migram preservando saldo, RNG e resultados confirmados; próximas jogadas usam 0.9.2. RTP desta versão ainda não medido; resultados anteriores abaixo são históricos.

## Histórico 0.9.1

Atualização de 29/10/2026: bónus normal com roubo **40%** (antes 35%) e peso Wild 50/1035, **4,8309%** por posição livre (antes 45/1030, 4,3689%). Proporções relativas dos restantes símbolos mantidas.

Pagamentos de combinações de **6 símbolos reduzidos 10%**; os de **4 símbolos cerca de 10%**, com arredondamento ao inteiro mais próximo da unidade de centésimo da aposta usada na configuração. Valores N1…P4 para 4 símbolos: `9,11,14,18,36,45,63,90`; para 6: `90,126,180,270,540,720,1080,1800`. Os pagamentos de 3 e 5 símbolos não mudam. A tabela é partilhada: afeta base, Hunt e os três bónus. Preços, fatores fixos de pagamento e poderes mantidos.

Sessões 0.9.0 migram conservando saldo, RNG, rondas em curso e resultados confirmados; próximas jogadas usam 0.9.1. Não recalcular históricos. A atualização não confirma estabilização perto dos 100% nem mede o RTP total do base/Hunt.

## Medição 0.9.1 — 29/10/2026

100 000 compras por bónus, duas seeds de 50 000, aposta base 0,20, custo no denominador e teto/retriggers incluídos. [Lotes, seeds e hash](../reports/poderes-0.9.1-100k-compras.json).

| Compra | RTP observado | IC95 aproximado | RTP anterior 0.9.0 |
|---|---:|---:|---:|
| 3 Scatters / 90× | 74,31% | 72,86–75,75% | 62,74% |
| 4 Scatters / 220× | 167,02% | 163,90–170,14% | 181,68% |
| 5 Scatters / 450× | 240,71% | 237,82–243,60% | 260,23% |

A mudança melhora o normal e reduz os retornos dos dois superiores, mas estes continuam acima de 100%. Medições de seeds independentes; comparação não é uma diferença exata de RTP teórico. Base/Hunt e naturais isolados não foram simulados nesta atualização. Suite lógica anterior à adição do teste novo: 61 testes passaram; teste dirigido adicional verifica 50/1035 intervalos de Wild e fronteira exata de roubo a 40%. TypeScript verificado. Sem mudança de layout, consulta cloud ou deploy.

## Histórico 0.9.0

Implementado e simulado localmente em 29/10/2026. Substitui os poderes P1, P2 e P3 da [0.8.2](LENDAS_0_8_0.md). Não ajusta preços, tabela de pagamentos, fatores fixos por modo, Scatters, sticky, duração ou teto para procurar um RTP.

## Regras

- **P1 · Passe Curto:** converte um símbolo normal N1–N4 ortogonalmente adjacente ao Wild numa carta P1. Alvo uniforme entre os normais disponíveis; sem alvo, não converte. Não cria Wilds, não altera o global e não multiplica linhas. Um passe em bronze substitui o antigo emblema ×2. Cartas e fotografias dos jogadores mantidas.
- **P2 · Arranque Explosivo:** sorteia 1 ou 2 novos Wilds, 50% para cada quantidade. Alvos uniformes sem reposição entre cima, baixo, esquerda e direita do Wild, excluindo Wilds e Scatters. Se houver menos alvos, cria apenas os possíveis; não há diagonais nem ligação entre margens. Os Wilds criados não roubam nem ficam sticky. Emblema com quatro direções e trajetórias para os alvos reais.
- **P3 · Passes de Maestro:** destino único por spin, uniforme entre P1/P2/P4. A carta P3 que forneceu o poder é convertida à parte, sem gastar a quota ponderada de 2–10 outros alvos. Escolha sem reposição entre posições não Wild, incluindo premiums e Scatters; fontes P3 ficam reservadas fora da quota. Fonte partilhada por vários Wilds é convertida uma vez; cada ativação mantém a sua quota de outros alvos. Se P2 já transformou a fonte em Wild, esse Wild é preservado. O destino exclui P3 para a fonte mudar efetivamente; interpretação adotada e explicitada durante o trabalho.
- **P4:** mantém incrementos aditivos +2/+3/+5 e global persistente entre FS.

Todos os roubos são decididos no tabuleiro inicial. Aplicação: P1, P2, P3 e P4; uma fonte convertida não cancela um roubo já decidido. Scatters iniciais continuam a determinar bónus/retriggers mesmo convertidos. Avaliação apenas depois das alterações de símbolos; global aplicado uma vez, sem multiplicador local P1.

Os eventos registam alvos reais, quantidade pedida e, no P3, `sourceTargets` separados para auditar a quota. A apresentação consome esses eventos, incluindo a conversão bronze do P1 e a fonte extra do P3. Movimento reduzido e interrupção não mudam resultados.

## Persistência e publicação

Sessões 0.8.2 migram preservando saldo, RNG, ronda em curso, sticky, global, retrigger pendente e resultados confirmados. Próximas jogadas usam 0.9.0; históricos não são recalculados. A referência matemática anterior e os seus relatórios são históricos.

Motor, avaliador e apresentação são distribuídos no frontend, incluindo o iframe integrado. Sem função cloud de jogo ou alteração a regras/índices. Publicação seletiva na raiz: `npm.cmd run deploy:pending -- --only hosting`.

## Simulação local — 29/10/2026

100 000 compras completas **por bónus**, duas seeds independentes de 50 000 por modo, aposta base 0,20 créditos. Custo da compra no denominador; inclui retriggers, arredondamento e teto acumulado de 10 000× a aposta base. [Relatório com seeds, hash da configuração e lotes](../reports/poderes-0.9.0-100k-compras.json).

| Compra | Custo | RTP observado | IC95 aproximado | Prémio médio / aposta base | Com lucro | Teto |
|---|---:|---:|---:|---:|---:|---:|
| 3 Scatters | 90× | 62,74% | 61,48–64,01% | 56,47× | 11,18% | 7 / 100 000 |
| 4 Scatters | 220× | 181,68% | 178,36–185,00% | 399,69× | 25,41% | 588 / 100 000 |
| 5 Scatters | 450× | 260,23% | 257,17–263,29% | 1171,05× | 39,04% | 3024 / 100 000 |

RTP empírico destas compras, não RTP teórico, garantia por sessão nem validação do jogo base ou do Hunt. As caudas raras limitam a precisão; IC95 normal aproximado por ronda. Não houve calibração para 98%/100%; resultados anteriores não devem ser misturados.

Verificação lógica: suite local com 61 testes, incluindo fronteira 50/50, quatro direções, falta de espaço, proteção dos Scatters/Wilds, P1 sem amplificação, quota P3 e fontes partilhadas, restauro, idempotência e teto. TypeScript local verificado. Sem consulta à cloud nem deploy.

Validação visual local: animações P1/P2/P3 verificadas a 1280 e 390 px, com capturas inspecionadas e correspondência entre alvos apresentados e tabuleiro final do motor. Sem overflow horizontal. Build local passou.
