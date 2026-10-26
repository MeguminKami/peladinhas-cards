# Diagnóstico de variações de OVR · 26/10/2026

Auditoria de leitura autorizada pelo utilizador, sem alterações na base de dados ou publicação. Foram lidos 436 documentos: 425 na recolha principal e 11 na confirmação da política e das cartas publicadas. As análises seguintes reutilizaram snapshots locais ignorados pelo Git.

## O que pode alterar a carta

O coordenador [`calculatePlayerCard`](../../js/player-calculation.js) reconstrói a carta a partir dos dados atuais; não parte dos atributos da carta fechada anterior.

| Origem | Atributos | OVR | Quando acontece |
| --- | --- | --- | --- |
| Autoavaliação inicial submetida/editada | Sobe ou desce a base | Acompanha a base | Trigger `onInitialRating` |
| Avaliação da comunidade submetida/editada/eliminada | Muda a média e eventualmente o peso da autoavaliação | Pode variar sem participação em jogos | `onCommunityRating` recalcula a base e reproduz os jogos |
| Feedback de jogos, incluindo antigos | Altera a progressão por dimensão | Acompanha os atributos | Fila de feedback publicada por `processFeedback`, hora a hora |
| Resultado, margem, golos, assistências e referências das equipas | Alteram os deltas dos jogos elegíveis | Acompanha os atributos | Fecho, correção, recálculo ou eliminação de jogos |
| Recompensas de eventos e missões | Bónus temporários ou permanentes; revogação e expiração podem retirar bónus | Acompanha os atributos | Entrega/revogação e atualização da carta |
| Percursos | Pontos permanentes por nó, sujeitos aos limites próprios | Acompanha os atributos | Apuramento e entrega da recompensa |
| Inatividade | Não altera atributos | Desconta OVR após quatro jogos consecutivos sem participar, com limite de 10 | Recálculo após jogos da liga; regressar à participação remove a penalização |
| Posição principal/pesos do OVR | A posição e os pesos também entram no cálculo da progressão ao reproduzir jogos | Alteram a ponderação final | `onPlayerPosition`, `saveOvrWeights` ou recálculo |
| Mudanças das regras de cálculo | Podem alterar base, progressão e recompensas | Podem alterar o resultado sem novo jogo | Recalcular a carta aberta com o código/política aplicáveis |

O arredondamento dos atributos e do OVR pode fazer uma mudança decimal atravessar um ponto inteiro. A seleção de aparência é cosmética. Abrir a semana cria um novo snapshot com o cálculo atual; fechar preserva os valores. Semanas anteriores fechadas são conservadas. As setas semanais excluem bónus temporários, mas incluem mudanças da base e recompensas permanentes: não medem exclusivamente desempenho em campo.

Implementações: [`utils.js`](../../js/utils.js), [`event-rules.js`](../../js/event-rules.js), [`weekly-comparison.js`](../../js/weekly-comparison.js) e [`functions/index.js`](../../functions/index.js).

## Período correto e ausentes

O período de desempenho começa no fecho anterior, quarta-feira 21/10 às 18:00 de Lisboa. Inclui o jogo encerrado nessa noite e o jogo encerrado em 25/10. A abertura das cartas na quinta-feira às 12:00 não é o início do período de desempenho.

O script antigo usava a abertura como início e classificava indevidamente Tomás e outros participantes de quarta-feira como ausentes. Foi corrigido para usar [`performanceWeek`](../../js/performance-week.js). Isso era um erro da ferramenta de diagnóstico; não prova um erro equivalente na interface.

As dez cartas publicadas dos jogadores ausentes dos dois jogos coincidiram integralmente com o recálculo local dos 12 atributos e do OVR, usando a política real recolhida:

| Jogador | Semana anterior | Publicado atual | Variação | Novas avaliações externas | Penalização anterior → atual |
| --- | ---: | ---: | ---: | ---: | --- |
| Pedro | 51 | 49 | −2 | 1 | 0 → 2 |
| Adão D. | 61 | 58 | −3 | 1 | 0 → 2 |
| Rocha | 67 | 60 | −7 | 1 | 0 → 2 |
| João Oliveira | 60 | 55 | −5 | 3 | 0 → 0 |
| Martim | 61 | 64 | +3 | 1 | 0 → 0 |
| Sandro | 52 | 49 | −3 | 2 | 0 → 2 |
| David Silva | 72 | 66 | −6 | 2 | 0 → 2 |
| IMA | 70 | 69 | −1 | 1 | 0 → 0 |
| Anão Ferreira | 51 | 49 | −2 | 0 | 0 → 2 |
| André Meireles | 69 | 67 | −2 | 1 | 0 → 0 |

Nenhum destes dez mudou de posição principal entre os snapshots comparados.

### Martim: causa isolada do +3

Passou de 12 para 13 avaliações externas completas. Sem a avaliação adicional, mantendo os restantes dados atuais, o recálculo resulta em **61 OVR**; incluindo-a, resulta nos **64 OVR publicados**. A base sobe em todos os atributos, por exemplo velocidade 56 → 60, finalização 50 → 54 e guarda-redes 72 → 74. Os atributos finais incluem também a progressão anterior. Não houve participação nos dois jogos, mudança de posição ou penalização de inatividade. O peso da autoavaliação passou de 4% para 4,06%, devido ao resto da divisão das percentagens externas.

### Descidas

Anão Ferreira conserva os atributos e perde exatamente dois pontos por quatro ausências consecutivas. Nos restantes casos, a base também mudou. Exemplos: Rocha recalcula para 65 sem o novo voto e para 60 com ele, ambos já com a penalização atual; João Oliveira recalcula para 60 sem os três novos votos e para 55 com eles. Estas simulações removem votos novos, mas não recuperam versões antigas de votos editados: o snapshot não é um histórico completo de cada avaliação.

## Conclusão e validação

O +3 confirmado de um ausente é explicado pela alteração da base comunitária. Não foi identificado um erro aritmético nas dez cartas verificadas. Se o objetivo de produto é que a evolução semanal reflita apenas jogos e recompensas, a regra atual permite um comportamento diferente e requer uma decisão explícita sobre congelar/separar a base e a comparação semanal. Não se alterou essa regra nesta investigação.

Validação local: 19 testes passaram em `node --test tests/progression.test.js tests/performance-week.test.js`. A auditoria complementar também foi repetida a partir do cache, sem novas leituras cloud. Não foram consultados logs de execução ou versões publicadas de Functions; a coincidência dos resultados não comprova a versão de código instalada.

Ferramentas: [`audit-weekly-growth.mjs`](../../scripts/audit-weekly-growth.mjs) e [`audit-weekly-ovr-causes.mjs`](../../scripts/audit-weekly-ovr-causes.mjs). A segunda requer a recolha local da primeira e usa o mesmo mecanismo de snapshots e orçamento; sem `--live`, não acede à cloud.
