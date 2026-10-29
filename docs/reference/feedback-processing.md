# Processamento das avaliações

[← Documentação](../README.md) · [Ciclos de atualização](automation-cycles.md) · [Percursos](player-paths.md)

As avaliações e as revisões são guardadas imediatamente. Os resultados derivados são publicados às **08:00, 12:00, 17:00 e 22:00 de Lisboa**, e no encerramento de um jogo, usando os dados mais recentes elegíveis pelas regras do sistema.

## Fila de trabalho

Os escritores de avaliações submetidas registam uma geração em `feedbackWork/{gameId}` na mesma transação. Alterações de rascunho ou timestamps sem mudança de valores não criam outra geração. `onFeedback` cobre também escritas antigas, edições e eliminações, sem voltar a enfileirar gerações já registadas pelos escritores atuais.

`processFeedback` consulta entradas pendentes em lotes de 50 jogos. O ciclo drena os lotes, calcula resumos e revê percursos associados. A geração é confirmada apenas depois desse trabalho; alterações recebidas entretanto conservam a entrada pendente. As cartas são publicadas no final, depois de missões, eventos e recompensas, com um contexto partilhado.

Sem entradas pendentes, esta fila não consulta jogos ou avaliações brutas. Consultas vazias, checkpoints, validações e outros passos continuam a ter custo. Não existe uma percentagem de poupança cloud medida para esta alteração.

Avaliações comunitárias submetidas usam `communityWork/{uid}`. As avaliações iniciais e a posição atual são lidas na publicação das cartas; os seus triggers deixam de reconstruir históricos. A aplicação deixa de chamar `ensureHistory` ao navegar.

## Prazos e percursos

Os prazos continuam validados na ação. Um evento terminado aguarda o próximo ciclo; isso não permite votar depois do prazo nem incluir jogos fora do período definido.

O ETC mantém a associação ao próximo jogo e o prazo original de 48 horas. Antes do prazo, a antecipação exige sete votos reais por critério e sucesso atribuindo duas estrelas aos votos em falta. Depois do prazo, usa as versões elegíveis até ao corte original. Informação mais recente não altera a janela de elegibilidade nem resultados definitivos. [Regras completas](player-paths.md#avaliações-48-horas-e-sete-votos).

Semanas fechadas permanecem preservadas. Correções, dispensas e eliminações de jogos refletem-se no ciclo seguinte. Operações administrativas explicitamente destinadas a reconstruir dados continuam disponíveis.

## Validação e publicação

`npm.cmd run test:cycles` verifica coordenação, falhas, duplicações, publicação e consultas sem apuramento, com dados sintéticos em emulador. `npm.cmd run test:feedback-hourly` continua a testar a fila; o nome histórico não representa a cadência atual.

Para a implementação atual com filas seletivas, publicar com `npm.cmd run deploy:selective-updates`, que inclui os consumidores partilhados, triggers de invalidação e índices. Esta otimização não exige frontend. Não é necessário reconstruir a liga nem reabrir semanas fechadas. Os primeiros ciclos inicializam as filas e criam os resultados guardados em falta. [Âmbito e custo da inicialização](automation-cycles.md#publicação).
