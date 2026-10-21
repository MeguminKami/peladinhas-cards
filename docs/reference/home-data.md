# Início atualizado com menos leituras

[← Documentação](../README.md) · [Diagnósticos](../guides/firestore-read-diagnostics.md) · [Validação de 21/10/2026](../reports/home-read-cache-2026-10-21.md)

## Carregamento

O início chama `getHome`. O servidor reutiliza um contexto da liga e guarda, separadamente, o resultado de cada jogador: cartas do pódio, carta pessoal, estatísticas, jogos recentes e missões próprias. `js/league-model.js` e `js/mission-model.js` contêm os mesmos cálculos usados no carregamento completo; a cache não introduz outra fórmula.

A resposta contém uma projeção explícita dos jogadores, sem avaliações individuais nem campos de acesso de terceiros. O utilizador autenticado recebe o seu próprio perfil. A autorização, desativação e revogação de sessão são verificadas em cada pedido, incluindo quando existe cache.

O modelo do início não serve para calcular estatísticas noutras páginas. Ao navegar para uma área que precisa do histórico completo, `js/app.js` exige esse carregamento. As atualizações explícitas depois de guardar mantêm a invalidação anterior.

## Deteção de alterações

| Documento | Finalidade e acesso |
| --- | --- |
| `homeSignals/global` | Versão dos dados partilhados e versão separada do contexto das cartas; leitura individual por contas ativas. |
| `homeSignals/{uid}` | Versão pessoal; leitura apenas pelo próprio. |
| `eventSignals/{eventId}` | Alterações de votos desse evento; apenas a versão é legível por contas ativas. |
| `homeCache/league` | Contexto comprimido, exclusivo do servidor. |
| `homeCache/player-{uid}` | Resultado pessoal comprimido, exclusivo do servidor. |
| `maintenanceSignals/{job}` | Versão das entradas relevantes de cada tarefa; exclusivo do servidor. |
| `maintenanceRuns/{job}` | Checkpoint, próximo prazo e lease da tarefa; exclusivo do servidor. |

`onHomeSource`, `onHomeFeedback` e `onHomeVote` invalidam as versões após escritas relevantes. Alterar apenas `updatedAt` não invalida. Marcar uma expiração como processada também não volta a invalidar as cartas. Um voto atualiza o evento e o votante, sem recalcular o contexto das cartas. Escolher um percurso atualiza o respetivo jogador, sem percorrer os eventos da liga.

No início, o navegador observa apenas as versões global e pessoal. Num evento em direto, observa a versão global e a desse evento. Pedidos próximos são agrupados; respostas de uma página ou sessão abandonada são descartadas. As notificações também desligam o seu listener quando a página fica escondida. Web Push continua independente da página.

Ao regressar à página ou recuperar a ligação, verifica-se o servidor. Não existe polling de dados do início enquanto nada muda. Relógios locais de contagem decrescente e a rotação do pódio não fazem leituras Firestore.

## Tempo e recuperação

As tarefas `closeEvents`, `settlePaths`, `scheduledNotifications`, `systemHeartbeat`, `closeCardWeek` e `openCardWeek` usam `0 * * * *`, em Lisboa. `refreshCardCollection` mantém `15 * * * *`. O fecho semanal continua às 18h de quarta-feira e a abertura às 12h de quinta-feira.

Eventos, percursos, coleção e lembretes têm checkpoints duradouros. Sem alteração das respetivas entradas e antes do próximo prazo, o trabalho termina depois de consultar metadados, sem enumerar as coleções. Os checkpoints incluem limites de datas, início/fim de eventos, expiração de recompensas e prazos conhecidos; os lembretes incluem a manhã e a janela de feedback. Publicar cartas não volta a enfileirar o seu próprio cálculo.

Ao reconstruir o início, o servidor reconcilia eventos pendentes através desse checkpoint e apura uma tentativa pessoal cujo prazo de avaliação já terminou. Os prazos continuam validados no servidor; a cadência horária não prolonga elegibilidade nem reinicia as 48 horas. Execuções manuais de tarefas, sem `incremental`, continuam a executar o trabalho explicitamente solicitado.

Há leituras mínimas dos metadados e verificações temporais mesmo sem jogadores presentes. O objetivo é eliminar varrimentos repetidos, não prometer consumo cloud nulo.

## Manutenção

As reconstruções usam uma promessa partilhada por instância e um lease Firestore entre instâncias. Um erro liberta o lease; uma alteração durante o cálculo permanece pendente. Os triggers podem chegar várias vezes ou fora de ordem: cada invalidação recebe uma versão nova, sem reverter a versão para um identificador antigo. A semântica de entrega está descrita na [documentação Firebase](https://firebase.google.com/docs/functions/firestore-events).

Os resultados são comprimidos com gzip. Acima de 850 000 bytes em base64, o servidor entrega o resultado sem o persistir, evitando ultrapassar o limite do documento. Essa proteção preserva a funcionalidade, mas deixa de proporcionar a mesma redução de leituras para esse resultado.

Ao alterar cálculos ou a estrutura dos resultados, incrementar `HOME_CACHE_VERSION` em `functions/home-cache.js` e publicar `getHome` com os consumidores efetivamente alterados. Nunca expor o contexto comprimido diretamente ao cliente. Os documentos são criados quando necessários; não é preciso recalcular a liga nem modificar semanas fechadas para introduzir esta cache.

Depois da publicação, comparar janelas equivalentes de utilização no console. Separar aquecimento, alterações reais, listeners, tarefas e navegação; a medição local de documentos pelo SDK não substitui a faturação cloud.
