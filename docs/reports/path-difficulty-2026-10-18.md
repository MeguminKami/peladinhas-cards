# Calibração dos percursos — 18 de outubro de 2026

Estado: análise e proposta de equilíbrio. Não altera os limites, missões ou interface implementados. Sem deploy.

## Dados consultados

Consulta apenas de leitura às coleções `games` e `gameSummaries` da liga, em 18 de outubro de 2026 às 12:30, Europe/Lisbon. O script reutilizável `scripts/audit-path-difficulty.mjs` apresenta apenas agregados, sem nomes, votos individuais ou credenciais.

A amostra contém dois jogos encerrados e 20 participações, não necessariamente 20 jogadores distintos. É insuficiente para estimar probabilidades de sucesso estáveis ou estabelecer metas definitivas por posição.

| Golos individuais num jogo | Participações que atingiram a meta | Percentagem observada |
| --- | --- | --- |
| Pelo menos 1 | 17 / 20 | 85% |
| Pelo menos 2 | 7 / 20 | 35% |
| Pelo menos 3 | 3 / 20 | 15% |
| Pelo menos 4 | 2 / 20 | 10% |
| Pelo menos 5 | 0 / 20 | 0% |

A mediana foi um golo; o máximo, quatro. Nas assistências, a mediana foi zero e o máximo foi dois.

Em Ataque/Finalização, dez participações tinham pelo menos sete votos válidos: 40% atingiram 3,5★, 30% atingiram 4★ e nenhuma atingiu 4,5★. Considerando todas as amostras, incluindo as com menos votos, a mediana foi 3,375★ e o máximo foi aproximadamente 4,67★. Não confundir esse máximo com uma exibição elegível para as novas missões de sete votos.

Sete votos por critério estavam disponíveis em metade das participações para Ataque, Passe, Defesa, Físico e Atitude. Em Atitude, 90% das amostras elegíveis chegaram a 4★ e 10% a 4,5★. O mesmo limiar numérico tem dificuldades diferentes por critério.

Os valores globais de avaliações GR não bastam para calibrar missões de guarda-redes: é necessário cruzar posição registada, elegibilidade e amostra mínima antes de fechar essas metas.

## Direção de equilíbrio proposta

O utilizador sugeriu elevar a margem para +15 e aumentar progressivamente a dificuldade, com exemplos finais de cinco golos ou 4,5★ em Finalização. Interpretação proposta para discussão: +15 por atributo de campo, exclusivo deste sistema, mantendo +20 em GR até indicação diferente. Estes limites ainda não foram alterados no código.

- Pontos iniciais: metas acessíveis para aprender o sistema.
- Pontos intermédios: maior exigência, evitando que a missão acessível permita chegar ao final com a dificuldade inicial.
- Pontos finais: três/quatro golos, avaliações elevadas ou combinações justificadas pelos dados. Reservar cinco golos e 4,5★ em Finalização para opções excecionais, sem os tornar a única forma de concluir um nó.
- A dificuldade considera os pontos já conquistados no atributo, incluindo as fusões, e não diminui por mudar de percurso.
- Calibrar critérios separadamente. Não aplicar automaticamente um requisito de Atitude a Finalização, Defesa ou GR.
- Conservar propostas reveladas até consumo ou reroll, com regras e versão guardadas na tentativa; alterações futuras de equilíbrio não substituem silenciosamente uma missão já escolhida.
- Rever os patamares quando existir uma amostra maior, por exemplo depois de mais dez jogos encerrados. Evitar ajustes automáticos de metas após cada jogo.

Esta análise não implementa ainda o novo desenho de fusões, propostas persistentes por escolha, reroll diário global, missões de até 200%, janela de avaliações ou mínimo de sete votos. A implementação anterior usa as regras descritas na [referência funcional](../reference/player-paths.md).
