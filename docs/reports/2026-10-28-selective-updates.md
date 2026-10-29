# Atualizações seletivas — 28–29 de outubro de 2026

[← Documentação](../README.md) · [Procedimento e publicação](../reference/automation-cycles.md)

## Objetivos

- Preservar os ciclos das 08:00, 12:00, 17:00 e 22:00 de Lisboa e o processamento no fecho do jogo.
- Saltar tarefas sem alterações nem prazos vencidos, sem adiar recompensas para outro ciclo.
- Recalcular cartas apenas dos jogadores afetados entre verificações de calendário.
- Restringir leituras de recompensas aos jogadores/pré-requisitos necessários.
- Preservar pendências concorrentes, recuperação após falhas e semanas fechadas.
- Validar com dados locais/emuladores; não consultar nem publicar na cloud.

## Dependências

| Entrada | Consumidores |
| --- | --- |
| Jogo, resultado, participantes, resumo e avaliações processadas | Percursos, objetivos, cartas dos participantes, notificações |
| Avaliação inicial/comunidade | Carta do jogador, elegibilidade da coleção |
| Recompensa atribuída/revogada/expirada | Carta do destinatário, pré-requisitos e orçamento de recompensas pendentes |
| Evento/configuração/voto | Apuramento, abertura/fecho, notificações |
| Política/pesos globais | Consumidores da configuração; reconstrução global quando necessária |
| Calendário | Períodos repetíveis, semana, coleções sazonais, expirações e lembretes |

As tarefas usam versões duráveis. Uma alteração durante a execução não é reconhecida como processada por uma geração anterior. As dependências produzidas pelo ciclo são sinalizadas antes das tarefas seguintes, sem depender da chegada de triggers assíncronos.

## Validação

Implementação integrada em 29/10/2026:

- O ciclo coordenado usa os checkpoints incrementais; uma invalidação do início no fim do ciclo já não volta a enfileirar a manutenção global.
- Cartas e percursos têm filas por jogador com tokens e prazos. Atualizações individuais das cartas usam leituras diretas de perfis e consultas de recompensas por UID.
- A captura do equilíbrio de um jogo lê perfis, avaliações iniciais, votos comunitários e recompensas apenas dos participantes.
- Expirações têm fila própria, com inicialização automática única dos documentos antigos. Recompensas processadas deixam de ser relidas em todas as verificações.
- Objetivos/notificações consultam os pré-requisitos necessários. Atribuições consultam históricos dos participantes e entregas adiadas partilham o histórico por jogador.
- Atribuições e expirações sinalizam dependências dentro da transação; resumos processados sinalizam consumidores antes das etapas seguintes. Cartas continuam a ser publicadas depois das recompensas no mesmo ciclo.
- A consulta de recuperação dos eventos inclui apenas fechados com entrega incompleta, além dos ativos; o índice correspondente está declarado.

Resultados locais de 29/10/2026:

- 36 cenários de regressão aprovados em emulador: coordenação, eventos, missões, recompensas, início e fluxo dos jogos.
- 14 cenários finais aprovados em emulador: coordenação, percursos e cinco cenários seletivos. Há sobreposição entre estas execuções; não representam 50 testes diferentes.
- Os cenários seletivos proíbem leituras globais de `users`/`eventRewards` na atualização individual e de `pathStates` no processamento individual. Verificam pendências concorrentes, compatibilidade das expirações antigas, entrega adiada com atualização da carta no mesmo ciclo e preservação de um prazo perante um sinal sem jogadores afetados.
- Verificação de sintaxe ES Modules e ligações da documentação aprovadas.

Os testes adicionais estão integrados em `npm.cmd run test:cycles`. Não foram usados dados reais, não foi executado deploy e não existe medição da poupança faturada. Continuam a existir contextos partilhados quando necessários e verificações globais na inicialização, nas mudanças de configuração/calendário e na preparação FUTTIES sem votação criada.

O comando `npm.cmd run deploy:selective-updates` publica seletivamente os 65 consumidores do runtime abrangidos e `firestore:indexes`, incluindo os três triggers de invalidação do início. Não publica frontend, regras ou Storage. Não é necessário recalcular a liga nem reabrir semanas fechadas.
