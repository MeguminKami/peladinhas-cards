# RIFT//CORE — distribuição e verificação rift-4.3

A distribuição foi reconstruída a pedido do utilizador. **Os RTPs aceites da versão 3 não validam esta versão.** O alvo histórico de 96% é uma referência, não uma certificação nem um resultado garantido. A última coluna abaixo só passa se todo o IC95% estiver dentro de 95,90%–96,10%.

Configuração SHA256: `8e1d2b694063f08cdc32a27a67de48958cc42c354ee82187a73b8cb298c4af39`. Motor/configuração SHA256: `c856b06ae3faae758012fb6c66a67298607a4c6981af4fdc51ad9a3eeebbec0d`.

| Modalidade | Versão | Rondas | Seeds | Cobrado CR | Pago CR | RTP observado | IC 95% | Critério 96% |
|---|---|---|---|---|---|---|---|---|
| base | rift-4.3 | 100 000 | 4 | 100 000 | 98 437,29 | 98,43729% | 91,23845%–105,63613% | Não confirmado |
| hunt | rift-4.3 | 100 000 | 4 | 300 000 | 314 588,99 | 104,863% | 98,82761%–110,89838% | Não confirmado |
| core | rift-4.3 | 100 000 | 4 | 7 900 000 | 7 385 169,51 | 93,48316% | 89,85659%–97,10973% | Não confirmado |
| rift | rift-4.3 | 100 000 | 4 | 24 000 000 | 22 858 511,38 | 95,2438% | 93,28886%–97,19873% | Não confirmado |
| overdrive | rift-4.3 | 100 000 | 4 | 80 400 000 | 77 153 990,17 | 95,96267% | 93,12389%–98,80145% | Não confirmado |

## Modelo de sorteio

Cada célula elegível é um sorteio independente. As mesmas probabilidades aplicam-se a todas as seis colunas, cinco linhas e refills de um modo. Não existem pesos dominantes por coluna, quotas, símbolos obrigatórios por tipo normal, rejeição de resultados válidos, ajuste por saldo/perdas/perfil ou X previamente sorteado. Os premiums são progressivamente menos frequentes.

| Símbolo | Base | Hunt | CORE FS | RIFT FS | OVERDRIVE FS |
|---|---|---|---|---|---|
| NEON SHARD | 15,904% | 15,4208% | 15,872% | 15,856% | 15,84% |
| PLASMA CELL | 14,91% | 14,457% | 14,88% | 14,865% | 14,85% |
| QUANTUM BATTERY | 13,916% | 13,4932% | 13,888% | 13,874% | 13,86% |
| CYBER CIRCUIT | 12,922% | 12,5294% | 12,896% | 12,883% | 12,87% |
| ENERGY BOLT | 11,928% | 11,5656% | 11,904% | 11,892% | 11,88% |
| CYBER DRONE | 9,94% | 9,638% | 9,92% | 9,91% | 9,9% |
| PHANTOM HELMET | 7,455% | 7,2285% | 7,44% | 7,4325% | 7,425% |
| NEON PANTHER | 5,467% | 5,3009% | 5,456% | 5,4505% | 5,445% |
| RIFT KEY | 3,976% | 3,8552% | 3,968% | 3,964% | 3,96% |
| REACTOR HEART | 2,982% | 2,8914% | 2,976% | 2,973% | 2,97% |
| RIFT WILD | 0,6% | 3,62% | 0,8% | 0,9% | 1% |

As percentagens são por posição não Scatter, antes de poderes. Wild é sorteado com a chance indicada; se não sair, sorteia-se o pagador pelos pesos [16, 15, 14, 13, 12, 10, 7.5, 5.5, 4, 3], iguais em todas as colunas. Hunt custa 3×, recebe exatamente +50% relativo nas massas K>0 de Scatters e tem a sua chance fixa de Wild declarada. CORE/OVERDRIVE têm chances de Wild/poderes próprias, sempre fixas.

Scatters são sorteados por quantidade inicial K, distribuídos por colunas distintas e linhas uniformes; no máximo um por coluna. Nunca saem em refill/cópia/poder e permanecem como barreiras de queda. Isto é a exceção explícita ao sorteio independente de pagadores.

| K | Base | Hunt | FS (ambos os bónus) |
|---|---|---|---|
| 0 | 77,1675% | 65,75125% | 80% |
| 1 | 15% | 22,5% | 13% |
| 2 | 6% | 9% | 5% |
| 3 | 1,8% | 2,7% | 1,9% |
| 4 | 0,03% | 0,045% | 0,09% |
| 5 | 0,0022% | 0,0033% | 0,009% |
| 6 | 0,0003% | 0,00045% | 0,001% |

## Paytable real — X da aposta por way

| Símbolo | 3 colunas | 4 colunas | 5 colunas | 6 colunas |
|---|---|---|---|---|
| NEON SHARD | 0,05 | 0,0505 | 0,051 | 0,052 |
| PLASMA CELL | 0,055 | 0,0556 | 0,0561 | 0,0572 |
| QUANTUM BATTERY | 0,06 | 0,0606 | 0,0612 | 0,0624 |
| CYBER CIRCUIT | 0,065 | 0,0657 | 0,0663 | 0,0676 |
| ENERGY BOLT | 0,07 | 0,0707 | 0,0714 | 0,0728 |
| CYBER DRONE | 0,075 | 0,117 | 0,2925 | 0,78 |
| PHANTOM HELMET | 0,078 | 0,182 | 0,4875 | 1,3 |
| NEON PANTHER | 0,1105 | 0,2925 | 0,78 | 2,275 |
| RIFT KEY | 0,1625 | 0,4875 | 1,3 | 3,9 |
| REACTOR HEART | 0,26 | 0,78 | 2,275 | 7,8 |

Ways são da esquerda, desde a primeira coluna, em 3–6 colunas consecutivas; só se paga a extensão mais longa de cada símbolo. O avaliador enumera combinações naturais e resolve cada via exclusivamente Wild uma única vez na interpretação mais favorável. Vias distintas podem partilhar Wilds. Exemplo: Wild nas três primeiras colunas e Shard na quarta pode produzir a via natural de quatro colunas e uma via exclusivamente Wild resolvida noutro tipo; não repete três/quatro do mesmo símbolo. Um oráculo independente de caminhos verifica montantes e posições removidas.

Pagamentos usam unidades inteiras de tabela (1/10000 da aposta), multiplicadores e liquidação half-up em cêntimos por cascata. Grupos simultâneos recebem repartições dos cêntimos efetivamente creditados cuja soma é exata; uma contribuição inferior a um cêntimo não é mostrada como um cêntimo extra. A grelha paga é verificada contra os 30 elementos renderizados antes de destacar/remover. O saldo visível acompanha a apresentação, embora o resultado confirmado já esteja persistido para recuperação.

## Regras e compras

RIFT ASCENSION: compra intermédia exclusiva, 10 FS, global inicial ×3, +1 por cada 3 vitórias acumuladas entre FS, máximo ×50; retrigger +5 com 3+ Scatters, até 40 FS. Poderes entre CORE e OVERDRIVE; sem Wild preparatório obrigatório. A compra coloca 4 portais mas inicia explicitamente RIFT; entradas naturais mantêm 4→CORE e 5/6→OVERDRIVE.

Preservam-se grelha 6×5, 15 625 ways, cascata ×1,×1,×2,×2…×10, CORE 8 FS/global ×1/+1 por 3 vitórias até ×25/retrigger +4, OVERDRIVE 12 FS/global ×5/+1 por 3 vitórias até ×100/Wild preparatório/retrigger +6, teto 40 FS e max win 25 000× sobre a ronda completa. O prémio usa o global anterior ao aumento. Efeitos ×25/×50 do OVERDRIVE continuam no próximo FS.

Compras disponíveis diretamente, sem opção para “ativar compras”: CORE **79×**, RIFT ASCENSION **240×**, OVERDRIVE **804×** da aposta-base. O seletor de aposta existe também dentro da compra. Escolher/cancelar não cobra; só confirmar cobra. Ativação tem 4 portais no CORE ou 5/6 no OVERDRIVE, sem outro débito, prémio base ou FS contado. Preços derivados do retorno exploratório médio/0,96 e arredondados a unidades realmente cobráveis. A disponibilidade não torna possível uma compra concorrente com uma ronda ativa.

| Perfil | Mega / Storm / Surge / Link | Pulse na oportunidade elegível |
|---|---|---|
| base | 0,17% / 1,3% / 1,9% / 1,3% | 4% |
| hunt | 0,22% / 1,8% / 2,4% / 1,8% | 12% |
| core | 0,6% / 3% / 5% / 4% | 20% |
| rift | 0,8% / 4% / 6% / 5% | 25% |
| overdrive | 1% / 5% / 7% / 6% | 30% |

Chances de poderes são por oportunidade válida, não uma frequência garantida por spin. Pulse apenas na 3.ª/6.ª/etc. cascata vencedora.

## Frequências e cauda

| Modo | Algum pagamento | Lucro > custo | Cascatas/ronda | Variância retorno/custo | Caps observados |
|---|---|---|---|---|---|
| base | 68,168% | 15,353% | 1,32429 | 134,90016 | 0 / 100 000 |
| hunt | 77,654% | 14,664% | 1,79703 | 80,5283 | 0 / 100 000 |
| core | 99,996% | 16,745% | 12,5084 | 16,69946 | 1 / 100 000 |
| rift | 99,999% | 19,178% | 16,54585 | 9,94837 | 11 / 100 000 |
| overdrive | 100% | 22,734% | 24,94188 | 4,38503 | 99 / 100 000 |

Cap observado é uma contagem, não uma probabilidade certificada; zero observações não significa impossibilidade.

| Faixa X (aposta-base) | base | hunt | core | rift | overdrive |
|---|---|---|---|---|---|
| 0 ≤ X < 1 | 84,488% | 67,297% | 1,349% | 0,026% | 0% |
| 1 ≤ X < 3 | 10,64% | 18,002% | 7,633% | 0,297% | 0% |
| 3 ≤ X < 5 | 2,227% | 5,267% | 8,75% | 0,949% | 0,001% |
| 5 ≤ X < 15 | 1,93% | 6,194% | 28,775% | 10,679% | 0,057% |
| 15 ≤ X < 40 | 0,51% | 2,12% | 24,739% | 24,737% | 2,195% |
| 40 ≤ X < 100 | 0,141% | 0,745% | 15,193% | 25,721% | 14,147% |
| 100 ≤ X < 250 | 0,044% | 0,267% | 8,109% | 19,112% | 27,664% |
| 250 ≤ X < 1000 | 0,016% | 0,098% | 4,507% | 14,402% | 37,705% |
| 1000 ≤ X < 5000 | 0,004% | 0,01% | 0,864% | 3,691% | 16,132% |
| 5000 ≤ X < 25000 | 0% | 0% | 0,08% | 0,375% | 2% |
| 25000 ≤ X < ∞ | 0% | 0% | 0,001% | 0,011% | 0,099% |

### Bónus naturais e comprados — dados condicionais

| Origem | Tipo | Modo | Entradas | Frequência | Ganho médio condicional | FS médios | FS P50/P90/P99 | Retriggers | Caps |
|---|---|---|---|---|---|---|---|---|---|
| base | natural | core | 27 | 0,027% | 98,77074× | 8,2963 | 8/8/16 | 2 | 0 |
| base | natural | overdrive | 1 | 0,001% | 1119,11× | 12 | 12/12/12 | 0 | 0 |
| hunt | natural | core | 33 | 0,033% | 125,3397× | 8,84848 | 8/12/16 | 7 | 0 |
| hunt | natural | overdrive | 3 | 0,003% | 253,51667× | 12 | 12/12/12 | 0 | 0 |
| core | purchased | core | 100000 | 100% | 73,8517× | 8,69823 | 8/12/16 | 17457 | 1 |
| rift | purchased | rift | 100000 | 100% | 228,58511× | 11,11047 | 10/15/20 | 22217 | 11 |
| overdrive | purchased | overdrive | 100000 | 100% | 771,5399× | 13,63965 | 12/18/24 | 27411 | 99 |

Não se inventa RTP autónomo de FS dividindo por zero. O ganho condicional acima é o prémio de FS em X da aposta-base. A duração é medida em FS executados, não segundos de animação dependentes da velocidade. As distribuições completas por modo/origem estão no JSON.

| Origem | Base/cascatas no retorno | FS no retorno | CORE natural no retorno | OVERDRIVE natural no retorno |
|---|---|---|---|---|
| base | 94,65137% | 3,78592% | 2,66681% | 1,11911% |
| hunt | 103,23074% | 1,63225% | 1,37874% | 0,25352% |
| core | 0% | 93,48316% | 0% | 0% |
| rift | 0% | 95,2438% | 0% | 0% |
| overdrive | 0% | 95,96267% | 0% | 0% |

| Origem | Modo | Poder/evento | N | Ativações/spin desse modo |
|---|---|---|---|---|
| base | base | WILD SURGE | 4424 | 0,04424 |
| base | base | NEON STORM | 3065 | 0,03065 |
| base | base | RIFT LINK | 2953 | 0,02953 |
| base | base | MEGA WILD DROP | 389 | 0,00389 |
| base | base | REACTOR PULSE | 685 | 0,00685 |
| base | core | NEON STORM | 17 | 0,07589 |
| base | core | MEGA WILD DROP | 4 | 0,01786 |
| base | core | WILD SURGE | 39 | 0,17411 |
| base | core | RIFT LINK | 17 | 0,07589 |
| base | core | REACTOR PULSE | 9 | 0,04018 |
| base | core | CORE EVOLUTION | 1 | 0,00446 |
| base | overdrive | CORE IMPULSE | 12 | 1 |
| base | overdrive | NEON STORM | 1 | 0,08333 |
| base | overdrive | RIFT LINK | 2 | 0,16667 |
| base | overdrive | REACTOR PULSE | 3 | 0,25 |
| base | overdrive | WILD SURGE | 2 | 0,16667 |
| base | overdrive | MEGA WILD DROP | 2 | 0,16667 |
| hunt | base | MEGA WILD DROP | 611 | 0,00611 |
| hunt | base | RIFT LINK | 5079 | 0,05079 |
| hunt | base | NEON STORM | 4947 | 0,04947 |
| hunt | base | WILD SURGE | 6758 | 0,06758 |
| hunt | base | REACTOR PULSE | 3543 | 0,03543 |
| hunt | core | NEON STORM | 26 | 0,08904 |
| hunt | core | RIFT LINK | 31 | 0,10616 |
| hunt | core | WILD SURGE | 34 | 0,11644 |
| hunt | core | MEGA WILD DROP | 8 | 0,0274 |
| hunt | core | REACTOR PULSE | 11 | 0,03767 |
| hunt | core | CORE EVOLUTION | 1 | 0,00342 |
| hunt | overdrive | CORE IMPULSE | 36 | 1 |
| hunt | overdrive | WILD SURGE | 7 | 0,19444 |
| hunt | overdrive | RIFT LINK | 6 | 0,16667 |
| hunt | overdrive | REACTOR PULSE | 1 | 0,02778 |
| hunt | overdrive | NEON STORM | 2 | 0,05556 |
| hunt | overdrive | MEGA WILD DROP | 3 | 0,08333 |
| core | core | MEGA WILD DROP | 12440 | 0,0143 |
| core | core | NEON STORM | 63725 | 0,07326 |
| core | core | REACTOR PULSE | 35602 | 0,04093 |
| core | core | WILD SURGE | 106132 | 0,12202 |
| core | core | RIFT LINK | 84872 | 0,09757 |
| core | core | CORE EVOLUTION | 1500 | 0,00172 |
| rift | rift | WILD SURGE | 166334 | 0,14971 |
| rift | rift | NEON STORM | 110712 | 0,09965 |
| rift | rift | MEGA WILD DROP | 22034 | 0,01983 |
| rift | rift | RIFT LINK | 137675 | 0,12391 |
| rift | rift | REACTOR PULSE | 60070 | 0,05407 |
| overdrive | overdrive | CORE IMPULSE | 1363965 | 1 |
| overdrive | overdrive | RIFT LINK | 231639 | 0,16983 |
| overdrive | overdrive | NEON STORM | 193193 | 0,14164 |
| overdrive | overdrive | WILD SURGE | 269454 | 0,19755 |
| overdrive | overdrive | REACTOR PULSE | 113891 | 0,0835 |
| overdrive | overdrive | MEGA WILD DROP | 38300 | 0,02808 |

## Apostas representativas e método

| Aposta | Modo | Rondas | Cobrado | Pago | RTP | IC95% |
|---|---|---|---|---|---|---|
| 1 | base | 100 000 | 100 000 | 98 437,29 | 98,43729% | 91,23845%–105,63613% |
| 1 | hunt | 100 000 | 300 000 | 314 588,99 | 104,863% | 98,82761%–110,89838% |
| 1 | core | 100 000 | 7 900 000 | 7 385 169,51 | 93,48316% | 89,85659%–97,10973% |
| 1 | rift | 100 000 | 24 000 000 | 22 858 511,38 | 95,2438% | 93,28886%–97,19873% |
| 1 | overdrive | 100 000 | 80 400 000 | 77 153 990,17 | 95,96267% | 93,12389%–98,80145% |

A aposta mínima é medida: os cêntimos arredondados podem mudar o retorno em relação a aposta 1. Os testes verificam o pagamento real com um oráculo BigInt, não assumem equivalência de floats ou igualdade entre apostas.

Validação usa o motor da GUI com captura visual desligada; testes verificam grelhas, RNG e pagamentos iguais. Cada unidade é uma ronda inteira, incluindo todos os FS/retriggers. Lotes são retomáveis e nunca cortam uma cascata/bónus em curso. Nenhum lote com erro é usado. Seeds derivam de SHA256(stage|identidade|modo|aposta|lote), independentes da seed exploratória 0x41424344. IC95% une o intervalo normal de rondas ao t conservador de médias de lotes; não trata cascatas/FS como observações independentes. Caudas raras e amostras pequenas limitam a conclusão.

Lotes: 20. Soma de durações dos workers (inclui contenção, não é tempo de CPU medido): 400,73426 s. Fontes: reports/validation-rift-v4 (20).

### Reproduzir / prolongar

```powershell
node scripts/validate-rtp.mjs --out=reports/validation-rift-v4 --stage=validation-rift-v4 --rounds=100000 --modes=base,hunt,core,rift,overdrive --workers=4
node scripts/validate-rtp.mjs --out=reports/validation-rift-stakes-v4 --stage=validation-rift-stakes-v4 --rounds=100000 --bets=0.1 --workers=2
node scripts/report-rtp-v4.mjs
npm.cmd test
```

Aumentar --rounds, mantendo diretório/stage/batch, calcula só lotes em falta. A confirmação estatística de 96% não é inferida de uma passagem pontual por esse número. A versão 3 aceite fica arquivada em reports/rtp-v3.json e no ZIP anterior.
