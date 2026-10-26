# Progressão justa · brainstorm e simulações · 26/10/2026

Análise experimental, sem alteração das regras de produção, publicação ou novas leituras cloud. Usa os snapshots locais de 26/10/2026 e o último jogo de Vitor. Substitui o primeiro ensaio como proposta de discussão, não como regra aprovada.

## Recomendação

Separar quatro componentes: qualidade do desempenho por dimensão, ações decisivas, resultado/margem e desaceleração por nível. A vitória não deve gerar melhorias sozinha; um mau vencedor pode perder atributos. Um bom derrotado pode melhorar, mas menos do que com o mesmo desempenho numa vitória. Golos compensam a finalização e parcialmente o drible, sem salvar defesa ou físico fracos. Não marcar não significa não contribuir: as avaliações de passe, defesa, físico e atitude continuam a premiar essas funções.

Estabilizar também a base comunitária. Se a base continuar a ser revista livremente, pode absorver ganhos reais do jogo independentemente da qualidade da fórmula.

## Opções comparadas

| Modelo | Velocidade | Orçamento de desempenho por atributo | Escala dos bónus | Perda máxima por atributo |
| --- | ---: | ---: | ---: | ---: |
| Conservador | 2,2 | 2,8 | 1 | 0,4 |
| Equilibrado | 2,6 | 3,2 | 1,25 | 0,6 |
| Generoso | 3 | 3,6 | 1,5 | 0,7 |
| Equilibrado com controlo | 2,6 | 3,2 | 1,25 | 0,6 |

O último acrescenta um limite de +2,5 pontos exatos de OVR provenientes de ganhos num jogo e desaceleração adicional a partir de 90 em cada atributo. Recomenda-se como próximo candidato a calibrar. O teto de OVR é de progressão do jogo, não de recompensas externas ou alterações de base, e o OVR apresentado pode subir três inteiros devido ao arredondamento.

## Fórmula experimental reproduzível

- Nota absoluta neutra: 3 estrelas na dimensão correspondente. Nota >3 gera uma componente positiva; nota <3 gera uma componente negativa, inclusive em vitórias. N/A não gera delta.
- Vantagem relativa: multiplicador até +15% por superar colegas e +5% por superar adversários; cada diferença positiva é limitada a uma estrela.
- Desvantagem face aos colegas: não há redução adicional até −0,75; conserva 85% a −1, 50% a −1,5 e 25% a −2. Interpolação linear. Uma nota absoluta ≥3,5 conserva no mínimo 75%. Não se aplica simultaneamente outra dedução pela mesma desvantagem.
- Componente positiva de desempenho: `min(3,2, max(0, nota−3) × 2,6 × vantagem_relativa) × fator_desvantagem`.
- Bónus de quantidade antes de escala: 0 → 0; 1 → 0,30; 2 → 0,35; 3 → 0,40; 4 → 0,60; 5 → 0,80; 6 → 1,15; depois +0,10 até ao teto 1,50 aos 10. O modelo equilibrado multiplica estes valores por 1,25.
- Golos alimentam finalização; assistências alimentam passe. Drible recebe 25% da soma dos dois bónus, com teto 0,5 antes do resultado e patamar. Os restantes atributos não recebem bónus automáticos por ações ofensivas.
- Qualidade do bónus individual: conserva 25% com nota ≤2 e sobe linearmente para 100% com nota ≥3,5. Uma desvantagem relativa não apaga uma contribuição registada, mas uma avaliação absoluta muito baixa limita a sua recompensa.
- Resultado positivo: vitória por 1/3/5+ → fatores 0,92/0,96/1; empate → 0,75; derrota por 1/3/5+ → 0,60/0,50/0,40. A margem satura em cinco golos e não multiplica o bónus outra vez noutro ponto.
- Ganho: `min(5, (desempenho + bónus individual) × fator_resultado) × patamar`.
- Patamar: <75 → 1; 75–85 → 0,7; 85–90 → 0,4; ≥90 → `0,12 × (99−atributo)/9`. Valores exatos, sem arredondamento entre jogos.
- Perda: `min(0,6, max(0, 3−nota) × 0,5 × fator_perda × referência)`. Fator de perda: vitória 0,75; empate 1; derrota `1,10 + 0,08 × min(5, margem absoluta)`. Referência até +10% se estiver abaixo dos colegas. Perdas não recebem o patamar dos ganhos, para não proteger artificialmente jogadores de OVR alto de maus jogos.
- Delta: ganho menos perda, limitado ao intervalo 0–99 do atributo. Assim, contribuições podem compensar uma dimensão fraca sem resgatar outras dimensões.
- Teto de OVR do jogo: se a soma ponderada dos deltas positivos exceder 2,5, reduzir proporcionalmente esses deltas. Os negativos mantêm-se. Usar os pesos da posição do jogador, sem recompensas nem penalizações históricas.

Os valores são parâmetros de design, não limiares estatisticamente validados para a liga.

## Vitor: mesmo estado imediatamente antes do jogo

O último jogo tem ataque 4,5, passe 3,5, defesa 3,1667, físico 3,8333, atitude 4,1667 e GR 3; seis golos, uma assistência e vitória por sete. A média apresentada sem GR é 3,9167. O recálculo atual dá o mesmo teto elevado a várias dimensões por combinar vitória, margem, nota e bónus.

| Atributo | Ganho atual no recálculo | Equilibrado com controlo |
| --- | ---: | ---: |
| Velocidade | +2,90 | +1,62 |
| Finalização | +3,50 | +3,25 |
| Passe | +3,00 | +1,69 |
| Drible | +3,50 | +2,56 |
| Defesa | +2,20 | +0,44 |
| Físico | +3,00 | +2,32 |
| Guarda-redes | +1,94 | 0 |
| Resistência | +3,28 | +3,17 |
| Visão de jogo | +2,96 | +1,32 |
| Posicionamento | +2,20 | +0,44 |
| Jogo de equipa | +2,96 | +1,32 |
| Compostura | +3,26 | +2,22 |

Os ganhos da proposta são inferiores ao motor atual em várias dimensões. O objetivo é concentrar a recompensa no que fez bem e distinguir contribuições, não aumentar todos os ganhos existentes. Não usar uma redução nominal de ganho para esconder alterações de base.

Com a base comunitária atual, o estado reconstruído antes do jogo é 73 OVR: conservador termina em 74; equilibrado, generoso e equilibrado com controlo terminam em 75. O motor atual recalcula para 76. Esta comparação mantém a mesma base, posição, recompensas e estado anterior; não é uma comparação com a carta semanal de 76.

### Contrafactual com base estável

Removendo apenas os dois votos comunitários novos, mantendo os restantes dados e as recompensas, o estado anterior é **76 OVR**. A proposta equilibrada com controlo termina em **78 OVR**. Neste estado, os ganhos são: finalização +3,25; drible +2,56; velocidade +1,62; passe +1,18; defesa +0,44; físico +2,32; GR 0; resistência +2,22; visão +0,92; posicionamento +0,31; equipa +1,32; compostura +2,22.

É uma simulação da retirada dos votos novos, não a implementação de congelamento da base nem uma recuperação integral de versões históricas de avaliações. Os valores diferentes em alguns atributos resultam de estarem noutro patamar no início do jogo.

### O mesmo jogo com resultados diferentes

Mantendo exatamente as notas, contribuições, referências e estado anterior do cenário base atual, alterando apenas resultado e margem:

| Resultado | Parcela de ganho conservada | Finalização |
| --- | ---: | ---: |
| Vitória por 7 | 100% | +3,25 |
| Vitória por 1 | 92% | +2,99 |
| Empate | 75% | +2,43 |
| Derrota por 1 | 60% | +1,95 |
| Derrota por 3 | 50% | +1,62 |
| Derrota por 5+ | 40% | +1,30 |

O OVR inteiro pode coincidir em dois cenários, apesar de os deltas exatos serem distintos. Os decimais acumulam nos jogos seguintes. Os contrafactuais isolam o fator resultado; não presumem que as avaliações reais permaneceriam iguais numa derrota.

### Quantidade de golos, mantendo o resto igual

| Golos | Ganho de Finalização da proposta |
| --- | ---: |
| 0 | +2,24 |
| 1 | +2,50 |
| 2 | +2,55 |
| 3 | +2,59 |
| 4 | +2,77 |
| 5 | +2,94 |
| 6 | +3,25 |
| 8 | +3,42 |
| 10+ | +3,50 |

O ganho sem golos vem da avaliação de ataque 4,5 e do resultado. Golos acrescentam uma recompensa distinta; não são a única via de evolução.

## Maus jogos e compensações

Exemplos com atributo inicial 80, colegas/adversários com 3,5 e margem três; sem golos/assistências:

| Nota da dimensão | Vitória | Derrota |
| --- | ---: | ---: |
| 2 | −0,41 | −0,60 |
| 2,5 | −0,21 | −0,37 |
| 3 | 0 | 0 |
| 3,5 | +0,87 | +0,45 |
| 4 | +1,92 | +1,00 |

Com nota 2,5 e seis golos numa vitória por três, finalização passa de −0,21 para +0,28; defesa continua −0,21. Com nota 2 e seis golos, a finalização ainda perde aproximadamente 0,17: marcar não apaga totalmente uma avaliação muito fraca. Um defesa com nota 4 e sem golos ganha nos seus atributos de defesa; ausência de golos não é ausência de contributo.

## Comportamento ao longo de 20 jogos

Sequências sintéticas de um AV, com todos os atributos inicialmente iguais, referências 3,5 e GR N/A. Não incluem novas avaliações comunitárias, recompensas ou alterações de posição. São ensaios de stress, não previsões:

| Sequência | OVR inicial | Após 5 | Após 10 | Após 20 |
| --- | ---: | ---: | ---: | ---: |
| Nota 3,2; zero contribuições; sempre vence por três | 60 | 62 | 65 | 70 |
| Nota 3,8; 2 golos/1 assistência; sempre vence por três | 60 | 72 | 81 | 91 |
| Nota 4,4; 6 golos/2 assistências; sempre vence por três | 60 | 73 | 84 | 93 |
| Nota 2,3; zero contribuições; sempre perde por três | 60 | 57 | 55 | 50 |
| Ciclo misto, 40% vitórias/20% empates/40% derrotas | 60 | 65 | 70 | 78 |
| Nota 4,4; 6 golos/2 assistências; sempre vence por três | 90 | 92 | 93 | 95 |

O ciclo misto repete notas 3,8/2,5/4/3,2/2,8, golos 2/0/4/1/0 e assistências 1/0/2/1/0. Os ganhos continuam consideráveis em sequências boas. O teto global aproxima jogos bons e excecionais nos patamares baixos; convém decidir se isso é desejável antes de o fixar. A distribuição real de notas deve informar o ponto neutro: se a liga atribuir quase sempre ≥3,8, o crescimento agregado continuará alto.

## Limitações e próximas decisões

- O protótipo mantém os patamares 75/85/90; as suas transições ainda podem causar variações abruptas. Uma curva contínua seria uma alternativa.
- Não usa força pré-jogo das equipas para relativizar uma derrota. Esse fator poderia reduzir a penalização de perder contra uma equipa muito superior, mas exigiria referências consistentes e congeladas antes do jogo.
- Não aplica confiança estatística por número de votos nem normalização por tempo jogado. Golos/assistências dependem de registo correto. Não acrescentar esses pesos sem dados suficientes.
- GR estável com nota 3 não torna todos os critérios de GR perfeitos; a recompensa a guarda-redes precisa também de cenários próprios.
- O congelamento da base precisa de uma regra de entrada e revisão. Não foi implementado nesta análise.
- Uma versão aprovada deve entrar em vigor numa data explícita e não reavaliar silenciosamente jogos antigos. Preservar semanas fechadas.

Reprodução: `node scripts/audit-player-game-impact.mjs "Vitor Rocha"` e `node scripts/brainstorm-progression-models.mjs`, com os snapshots locais anteriores. No PowerShell, guardar JSON com `| Out-File -Encoding utf8` para evitar UTF-16 implícito. O segundo comando grava resultados em `test-results/firestore-audits/progression-brainstorm.json`.

Validação do protótipo: 16.800 verificações de ordenação vitória ≥ empate ≥ derrota ≥ derrota larga, limites de deltas e monotonicidade de golos, em quatro modelos, vários níveis, notas e contribuições. Isto valida propriedades do ensaio; não prova que a calibração seja justa em todas as situações da liga.
