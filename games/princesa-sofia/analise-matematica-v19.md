# Matemática e distribuição de pagamentos — v19

Configuração: sofia-reduced-copies-15-v19. Hash SHA-256: 12feeecc96c1cae80b60b29f0bd3746cab3f38853d108e2c75a310eff90b676e. Análise local da amostra de 2026-10-31, reproduzida com as mesmas seeds; não é uma validação independente, calibração adicional ou certificação. Nenhum parâmetro do jogo foi alterado.

## Unidades e método

B = aposta base; X = prémio bruto total / B, somando todas as cascatas, bónus e retriggers de uma entrada completa. C = custo da entrada em B; Y = X/C é o retorno por custo pago. Lucro líquido em B = X − C. RTP = E[X]/C = E[Y]. Um bónus comprado é uma observação completa, não um free spin. O prémio da tabela e os X abaixo são retornos brutos, não lucros.

A distribuição de X não é uma normal/gaussiana: tem massa em zero, suporte não negativo, assimetria e cauda longa, limitada pelo MAX WIN. Os intervalos de confiança apresentados aproximam a incerteza da média; não descrevem a distribuição dos prémios individuais nem garantem cobertura de eventos raros.

Motor: grelha 6 × 5; clusters ortogonais com pelo menos cinco posições (incluindo wilds ligados); diagonais não ligam. Um wild pode participar em grupos de símbolos diferentes. Remoções partilhadas acontecem uma vez. Gravidade conserva sobreviventes; novas posições usam as mesmas regras de sorteio e cópia. Não há uma probabilidade configurada por tamanho de cluster: ela emerge destes processos dependentes.

## Custos, limites e barras

| Modo | Custo C | XP | Spins iniciais | MAX WIN / custo |
| --- | --- | --- | --- | --- |
| Base | 1× | 40 | 1 + eventual bónus | 10 000× |
| Hunt | 4× | 40 | 1 + eventual bónus | 2500× |
| Normal | 29× | 25 | 12 | 344,8276× |
| Super | 103× | 20 | 12 | 97,0874× |
| Secret | 754× | 17 | 12 | 13,2626× |

Preços máximos permitidos: Normal 100×, Super 250×, Secret 800×. MAX WIN = 10.000× B por entrada completa, incluindo bónus e retriggers. Ao atingir o teto, termina sem novos preenchimentos/retriggers. XP e magia base/Hunt continuam ativos a 40 XP; só a barra visual foi retirada. A liquidação acumula centésimos de aposta e arredonda para baixo uma única vez nas unidades de crédito.

## Símbolos e pagamentos partilhados

| Símbolo | Peso PPM | P(símbolo | não scatter) | 5 | 6–7 | 8–10 | 11–13 | 14–17 | 18+ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N1 | 155000 | 15,5% | 0,1× | 0,2× | 0,5× | 1× | 2× | 5× |
| N2 | 137000 | 13,7% | 0,1× | 0,2× | 0,5× | 1× | 2× | 5× |
| N3 | 120000 | 12% | 0,1× | 0,2× | 0,5× | 1× | 2× | 10× |
| N4 | 103000 | 10,3% | 0,2× | 0,4× | 0,7× | 1,5× | 3× | 10× |
| N5 | 120000 | 12% | 0,2× | 0,4× | 0,7× | 1,5× | 3× | 10× |
| P1 | 85000 | 8,5% | 0,5× | 0,8× | 1,5× | 3× | 10× | 50× |
| P2 | 95000 | 9,5% | 0,5× | 0,8× | 1,5× | 3× | 10× | 50× |
| P3 | 80000 | 8% | 0,8× | 1,2× | 2,5× | 5× | 15× | 75× |
| P4 | 65000 | 6,5% | 0,8× | 1,2× | 2,5× | 5× | 15× | 100× |
| P5 | 40000 | 4% | 1× | 1,5× | 5× | 10× | 25× | 150× |

Esta tabela é única para base, Hunt e os três bónus, antes dos multiplicadores dos wilds. Pesos somam 1.000.000. P(símbolo num sorteio) = (1 − q_scatter) × peso/1.000.000. Uma posição preenchida por cópia não executa um novo sorteio; estes pesos não são a ocupação final de cada casa. N5 tem o mesmo peso de N3 e P2 é mais frequente que P1; todos os premium são mais raros que qualquer normal.

## Cópias vizinhas — todos os modos

| Parâmetro | Normais | Premium |
| --- | --- | --- |
| Primeira cópia p | 59,5% | 60,35% |
| Segunda cópia condicionada à primeira r | 43,35% | 43,35% |
| Só original: 1−p | 40,5% | 39,65% |
| Original + 1: p(1−r) | 33,7068% | 34,1883% |
| Original + 2: pr | 25,7933% | 26,1617% |
| E[células geradas] = 1+p+pr | 1,8529 | 1,8651 |

As últimas quatro linhas pressupõem vizinhos livres para ambas as cópias. A primeira escolhe uniformemente um vizinho ortogonal livre do original; a segunda escolhe um vizinho livre da primeira cópia. Sem espaço, a cópia falha. Máximo de duas cópias por sorteio, sem recursão. Preenchimento por coluna, da esquerda para a direita, de baixo para cima; cópias podem ocupar casas que ainda seriam sorteadas.

## Scatters por posição sorteada

| Próximo scatter | Base PPM / % | Hunt PPM / % | Normal PPM / % | Super PPM / % | Secret PPM / % |
| --- | --- | --- | --- | --- | --- |
| 1 | 30100 / 3,01% | 72692 / 7,2692% | 18000 / 1,8% | 18000 / 1,8% | 18000 / 1,8% |
| 2 | 20100 / 2,01% | 48542 / 4,8542% | 4300 / 0,43% | 4200 / 0,42% | 3400 / 0,34% |
| 3 | 17800 / 1,78% | 42987 / 4,2987% | 23000 / 2,3% | 21000 / 2,1% | 18000 / 1,8% |
| 4 | 1500 / 0,15% | 3623 / 0,3623% | 0 / 0% | 0 / 0% | 0 / 0% |
| 5 | 400 / 0,04% | 966 / 0,0966% | 0 / 0% | 0 / 0% | 0 / 0% |

Hunt custa 4× e multiplica as probabilidades base por 2,415, arredondadas ao PPM mais próximo. O aumento aplica-se também aos refills do spin base; o bónus obtido usa probabilidades normais do seu modo. Cada scatter atualiza imediatamente a contagem. Máximo de cinco no base/Hunt e três nos bónus, incluindo cascatas. Não há sorteio antecipado da quantidade. Scatters sobrevivem às cascatas e não pagam prémio próprio.

| Contagem no fim do spin completo | Base/Hunt | Durante qualquer bónus |
| --- | --- | --- |
| 0–1 | Sem entrada | Sem retrigger |
| 2 | Sem entrada | +2 spins |
| 3 | Normal: 12 spins | +4 spins |
| 4 | Super: 12 spins | Não gerável |
| 5 | Secret: 12 spins | Não gerável |

Gatilhos são contagens exatas, avaliadas uma vez depois de todas as cascatas e magias; contagens não acumulam entre spins. Retriggers não promovem o bónus. Os PPM são probabilidades condicionais por posição, não probabilidades de bónus/retrigger por entrada.

## XP — independente dos escalões de pagamento

| Regulares no cluster | 5 | 6–7 | 8–10 | 11–14 | 15–17 | 18+ |
| --- | --- | --- | --- | --- | --- | --- |
| Normais | 3 | 5 | 7 | 9 | 11 | 13 |
| Premium | 5 | 7 | 9 | 11 | 13 | 15 |

Menos de cinco regulares dá zero XP, mesmo quando wilds completam um cluster vencedor. Somam-se os XP dos hits de cada cascata; multiplicadores monetários não multiplicam XP. Após remover, aplicar gravidade e preencher, se XP ≥ barra, ocorre uma magia e todo o excesso de XP é descartado. No base/Hunt, XP e nível reiniciam no fim do spin; no bónus persistem entre spins. Um novo bónus começa a zero. Os wilds não persistem para o tabuleiro inicial do spin seguinte.

## Magia e multiplicadores

| Regra | Base/Hunt | Normal | Super | Secret |
| --- | --- | --- | --- | --- |
| Primeira magia | 1/2/3 wilds: 50%/35%/15% | 2 wilds ×1 | 2 wilds ×2 | 2 wilds ×2 |
| Evolução por magia seguinte | Novo sorteio 1/2/3, sem multiplicador | +1 wild / +1× | +1 wild / +2× | +2 wilds / +4× |
| No limite de 10 | Só cabe o espaço livre | Só +1× | Só +2× | Só +4× |

| Ativação k | Normal: pedidos / multiplicador | Super: pedidos / multiplicador | Secret: pedidos / multiplicador |
| --- | --- | --- | --- |
| 1 | 2 / ×1 | 2 / ×2 | 2 / ×2 |
| 2 | 3 / ×2 | 3 / ×4 | 4 / ×6 |
| 3 | 4 / ×3 | 4 / ×6 | 6 / ×10 |
| 4 | 5 / ×4 | 5 / ×8 | 8 / ×14 |
| 5 | 6 / ×5 | 6 / ×10 | 10 / ×18 |
| 6 | 7 / ×6 | 7 / ×12 | 10 / ×22 |
| 7 | 8 / ×7 | 8 / ×14 | 10 / ×26 |
| 8 | 9 / ×8 | 9 / ×16 | 10 / ×30 |
| 9 | 10 / ×9 | 10 / ×18 | 10 / ×34 |
| 10 | 10 / ×10 | 10 / ×20 | 10 / ×38 |

Detalhe executável relevante: «pedidos» é o número de novos wilds que a ativação tenta colocar, não um objetivo de wilds totais no tabuleiro. Colocados = min(pedidos, 10 − sobreviventes, posições regulares elegíveis). A posição é escolhida uniformemente sem reposição entre os regulares; scatters não são substituídos. Todos os wilds sobreviventes do bónus são atualizados para max(multiplicador anterior, multiplicador da magia). A contagem pedida e o multiplicador persistem no bónus, mesmo que não caibam todos os wilds pedidos.

No bónus: multiplicador do hit = soma dos multiplicadores dos wilds ligados; sem wild, vale 1. Exemplo: wilds ×2 e ×3 dão ×5, não ×6. Base/Hunt: wilds são substitutos sem multiplicador monetário. Um ecrã só de wilds/scatters paga uma vez como P5; respeitando o limite de scatters teria pelo menos 25 wilds e portanto escalão 18+. Máximo de dez wilds gerados em jogo; a situação de ecrã completo só de wilds/scatters não é alcançável com esses limites.

Vetores de evolução, em PPM (cada sorteio atual é determinístico):

| Bónus | Ganho wild +1/+2/+3 | Ganho × +1/+2/+3/+4 | Sorteios por recompensa |
| --- | --- | --- | --- |
| Normal | 1000000/0/0 | 1000000/0/0/0 | 1 |
| Super | 1000000/0/0 | 0/1000000/0/0 | 1 |
| Secret | 0/1000000/0 | 0/0/0/1000000 | 1 |

## RTP e dispersão observados

| Modo | N | C | E[X] em B | RTP | IC95% aproximado RTP | Desvio-padrão X | P(X=0) | P(lucro) | MAX WINs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Base | 100000 | 1 | 0,8236 | 82,3615% | 79,2626% a 85,4604% | 4,9998 | 29,815% | 20,002% | 0 |
| Hunt | 100000 | 4 | 2,9264 | 73,1608% | 69,586% a 76,7357% | 23,0706 | 29,297% | 11,128% | 0 |
| Normal | 10000 | 29 | 19,1832 | 66,1491% | 64,4863% a 67,8119% | 24,6022 | 0% | 16,2% | 0 |
| Super | 10000 | 103 | 64,0091 | 62,1447% | 59,6792% a 64,6102% | 129,5653 | 0% | 15,58% | 0 |
| Secret | 10000 | 754 | 837,474 | 111,0708% | 107,5386% a 114,603% | 1358,8242 | 0% | 30,51% | 29 |

| Modo | P10 | P25 | Mediana | P75 | P90 | P95 | P99 | P99,9 | Máximo observado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Base | 0 | 0 | 0,3 | 0,9 | 1,6 | 2,3 | 7,8 | 41,1 | 1067,1 |
| Hunt | 0 | 0 | 0,4 | 1,1 | 6 | 14,6 | 44,1 | 156,3 | 5963,5 |
| Normal | 4,8 | 7,3 | 11,9 | 21,6 | 39,6 | 55,9 | 124,2 | 278,8 | 520,7 |
| Super | 6,7 | 12,9 | 29,3 | 67,9 | 145,2 | 228,5 | 520,7 | 1704,8 | 4977,8 |
| Secret | 17,9 | 65,1 | 272,4 | 1016,5 | 2355,2 | 3577,8 | 6570,8 | 10 000 | 10 000 |

Percentis em múltiplos de B por entrada completa. Os quantis usam o valor ordenado de índice floor((N−1)p), sem interpolação.

| Modo | Parcela dos prémios no top 1% | Parcela no top 0,1% | Assimetria (momento padronizado) |
| --- | --- | --- | --- |
| Base | 28,995% | 10,6454% | 120,6385 |
| Hunt | 32,8933% | 11,1584% | 177,8639 |
| Normal | 9,658% | 1,8681% | 5,972 |
| Super | 14,5383% | 3,9039% | 12,5957 |
| Secret | 10,1374% | 1,1941% | 3,0873 |

## Distribuição empírica dos X pagos — aposta base

Intervalos [a;b[ incluem a e excluem b. Zero é isolado; ]0;1[ exclui os dois limites. O teto de 10.000× fica na última linha. Cada célula é probabilidade / contribuição ao RTP em pontos percentuais. As contribuições somam o RTP do modo; não são percentagens dentro dos ganhos.

| X = prémio / B | Base | Hunt | Normal | Super | Secret |
| --- | --- | --- | --- | --- | --- |
| 0 | 29,815% / 0 pp | 29,297% / 0 pp | 0% / 0 pp | 0% / 0 pp | 0% / 0 pp |
| ]0; 1[ | 46,685% / 19,6475 pp | 41,724% / 4,3176 pp | 0,03% / 0,0008 pp | 0,01% / 0,0001 pp | 0,02% / 0 pp |
| [1; 2[ | 16,816% / 22,4162 pp | 13,821% / 4,5795 pp | 0,24% / 0,0139 pp | 0,31% / 0,005 pp | 0,29% / 0,0006 pp |
| [2; 5[ | 5,276% / 13,9871 pp | 4,491% / 3,1502 pp | 10,23% / 1,3408 pp | 5,09% / 0,185 pp | 2,17% / 0,0102 pp |
| [5; 10[ | 0,582% / 3,9666 pp | 3,456% / 6,4509 pp | 30,53% / 7,8242 pp | 12,78% / 0,915 pp | 3,42% / 0,0328 pp |
| [10; 20[ | 0,473% / 6,5936 pp | 3,812% / 13,4611 pp | 31,26% / 15,2305 pp | 19,33% / 2,7377 pp | 5,09% / 0,0995 pp |
| [20; 50[ | 0,281% / 8,2413 pp | 2,597% / 19,4536 pp | 21,27% / 22,1422 pp | 28,94% / 9,1377 pp | 9,71% / 0,4418 pp |
| [50; 100[ | 0,055% / 3,5665 pp | 0,576% / 9,7501 pp | 4,87% / 11,0621 pp | 17,42% / 11,8941 pp | 11,37% / 1,0912 pp |
| [100; 250[ | 0,014% / 2,0186 pp | 0,194% / 7,0978 pp | 1,42% / 6,8368 pp | 11,82% / 17,493 pp | 16,09% / 3,5568 pp |
| [250; 500[ | 0,001% / 0,2706 pp | 0,022% / 1,723 pp | 0,14% / 1,5184 pp | 3,21% / 10,2977 pp | 13,3% / 6,2914 pp |
| [500; 1000[ | 0,001% / 0,5864 pp | 0,008% / 1,3593 pp | 0,01% / 0,1796 pp | 0,87% / 5,5766 pp | 13,22% / 12,6251 pp |
| [1000; 2500[ | 0,001% / 1,0671 pp | 0,001% / 0,3269 pp | 0% / 0 pp | 0,19% / 2,846 pp | 16,24% / 34,7529 pp |
| [2500; 5000[ | 0% / 0 pp | 0% / 0 pp | 0% / 0 pp | 0,03% / 1,0569 pp | 6,85% / 31,5604 pp |
| [5000; 10000[ | 0% / 0 pp | 0,001% / 1,4909 pp | 0% / 0 pp | 0% / 0 pp | 1,94% / 16,7619 pp |
| [10000; +inf[ | 0% / 0 pp | 0% / 0 pp | 0% / 0 pp | 0% / 0 pp | 0,29% / 3,8462 pp |

## Distribuição por custo efetivamente pago

Y = X/C. Para comparar risco de compra entre modos: Y < 1 é prejuízo, Y = 1 é empate, Y > 1 é lucro. Mesmos intervalos, agora em múltiplos do custo.

| Y = prémio / custo | Base | Hunt | Normal | Super | Secret |
| --- | --- | --- | --- | --- | --- |
| 0 | 29,815% | 29,297% | 0% | 0% | 0% |
| ]0; 1[ | 46,685% | 59,512% | 83,75% | 84,41% | 69,49% |
| [1; 2[ | 16,816% | 2,58% | 11,59% | 9,76% | 12,82% |
| [2; 5[ | 5,276% | 5,212% | 3,97% | 4,82% | 13,17% |
| [5; 10[ | 0,582% | 2,231% | 0,59% | 0,82% | 3,82% |
| [10; 20[ | 0,473% | 0,829% | 0,1% | 0,13% | 0,7% |
| [20; 50[ | 0,281% | 0,283% | 0% | 0,06% | 0% |
| [50; 100[ | 0,055% | 0,044% | 0% | 0% | 0% |
| [100; 250[ | 0,014% | 0,01% | 0% | 0% | 0% |
| [250; 500[ | 0,001% | 0,001% | 0% | 0% | 0% |
| [500; 1000[ | 0,001% | 0% | 0% | 0% | 0% |
| [1000; 2500[ | 0,001% | 0,001% | 0% | 0% | 0% |
| [2500; 5000[ | 0% | 0% | 0% | 0% | 0% |
| [5000; 10000[ | 0% | 0% | 0% | 0% | 0% |
| [10000; +inf[ | 0% | 0% | 0% | 0% | 0% |

## Decomposição do RTP base/Hunt

| Entrada | Prémios no spin base (pp) | Bónus Normal (pp) | Bónus Super (pp) | Bónus Secret (pp) |
| --- | --- | --- | --- | --- |
| Base | 57,9999 | 23,9499 | 0,4117 | 0 |
| Hunt | 13,5062 | 53,7285 | 4,4204 | 1,5058 |

| Entrada | Bónus | Entradas observadas | Frequência por entrada | 1 em N observado | Prémio médio só do bónus em B |
| --- | --- | --- | --- | --- | --- |
| Base | Normal | 1277 | 1,277% | 78,3085 | 18,7548 |
| Base | Super | 10 | 0,01% | 10 000 | 41,17 |
| Base | Secret | 0 | 0% | Não estimável | Não estimável |
| Hunt | Normal | 11007 | 11,007% | 9,0851 | 19,5252 |
| Hunt | Super | 263 | 0,263% | 380,2281 | 67,2297 |
| Hunt | Secret | 2 | 0,002% | 50 000 | 3011,55 |

As médias condicionais de bónus naturais raros são muito instáveis; zero observações não significa probabilidade zero. O spin base já pago partilha o teto de 10.000× com o bónus, pelo que não se deve substituir automaticamente o prémio natural pela média das compras.

## Retriggers, cascatas e magia medidos

| Modo | Spins totais | Cascatas/entrada | Magias/entrada | P(hit por spin) | Maior nível de magia | Maior duração de bónus |
| --- | --- | --- | --- | --- | --- | --- |
| Base | 116014 | 1,2501 | 0,0347 | 69,8976% | 9 | 22 |
| Hunt | 241104 | 2,7302 | 0,3049 | 69,5625% | 9 | 22 |
| Normal | 125164 | 15,2336 | 2,6732 | 70,3565% | 8 | 24 |
| Super | 124738 | 15,9549 | 3,4078 | 70,4428% | 12 | 22 |
| Secret | 124523 | 17,4307 | 4,1641 | 70,4561% | 13 | 24 |

| Compra | Eventos 2 scatters | Eventos 3 scatters | Eventos/compra | P(≥1 retrigger) | Spins adicionados/compra | P(pedidos chegam a 10) |
| --- | --- | --- | --- | --- | --- | --- |
| Normal | 1838 | 372 | 0,221 | 19,32% | 0,5164 | 0% |
| Super | 1731 | 319 | 0,205 | 18,03% | 0,4738 | 0,08% |
| Secret | 1670 | 305 | 0,1975 | 17,08% | 0,456 | 37,19% |

P(pedidos chegam a 10) mede o progresso de magia registado pelo simulador, não garante dez wilds simultâneos efetivamente colocados. Eventos/compra pode ultrapassar 1; P(≥1 retrigger) conta compras distintas.

## Leitura analítica para melhorar RTP

Apenas mudar o preço C, mantendo a geração, transforma RTP por RTP_novo = E[X]/C_novo. Para alvo r, C_novo = E[X]/r. A tabela seguinte é uma conta sobre esta amostra, não uma proposta aplicada; preços do motor são inteiros e sujeitos aos máximos.

| Compra | Preço atual | E[X] | Preço contínuo para 97% | Teto permitido |
| --- | --- | --- | --- | --- |
| Normal | 29 | 19,1832 | 19,7765 | 100 |
| Super | 103 | 64,0091 | 65,9887 | 250 |
| Secret | 754 | 837,474 | 863,3753 | 800 |

O custo Hunt também altera a análise do retorno por entrada, mas o contrato mantém custo 4×. Para base, custo é 1×. Pesos, cópias e entradas naturais são alavancas permitidas; pagamentos, XP, teto de wilds, evolução e scatters de retrigger estão fixados. As alterações de cópias têm efeitos não lineares: alteram clusters, cascatas, XP, magia e quantidade de oportunidades de scatter. Não é válido assumir que reduzir cópias 15% reduz RTP 15%, ou que bónus é apenas 12 vezes a média de um spin isolado.

Para uma solução analítica exata seria necessário modelar o estado do tabuleiro (incluindo conectividade, wilds e seus multiplicadores), XP, progresso de magia, scatters, spins restantes e prémio acumulado até ao teto. Não há independência entre casas nem entre cascatas. A distribuição empírica serve para decompor o problema; a raridade dos prémios grandes limita conclusões a partir destas amostras. Escolher parâmetros com estas seeds exige depois uma amostra independente para validação.

## Ficheiros e reprodução

Fontes: [configuração](src/config.js), [motor](src/engine.js), [simulador](src/simulation.js), [amostra original](rtp-reduced-copies-15-v19-validation.json).

Reproduzir nesta pasta: `node scripts/analyze-math.js`. Exportações: [JSON completo](analise-matematica-v19.json) e [frequências exatas em CSV](distribuicao-pagamentos-v19.csv). O CSV tem uma linha por valor distinto de retorno e modo; a soma de count é N e a soma de rtp_contribution é o RTP.
