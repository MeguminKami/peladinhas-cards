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

Ao regressar à página ou recuperar a ligação, o listener volta a ligar-se e só pede `getHome` se uma versão mudou ou o prazo `validUntil` passou. Não existe polling de dados do início enquanto nada muda.

Nas restantes páginas, `js/app.js` guarda o último modelo completo. Ao navegar, lê as duas versões (`homeSignals/global` e a pessoal) e reutiliza o modelo enquanto não mudarem, até 5 minutos; voltar ao início também reutiliza a resposta de `getHome` nas mesmas condições. As atualizações explícitas depois de guardar (`ctx.refresh`) recarregam sempre, porque os triggers atualizam as versões de forma assíncrona. As missões de avaliação pós-jogo usam uma contagem agregada por jogo (`raterId`, `submitted`, `targetId`) em vez de ler cada avaliação. Relógios locais de contagem decrescente e a rotação do pódio não fazem leituras Firestore.

## Tempo e recuperação

As tarefas `closeEvents`, `settlePaths`, `scheduledNotifications`, `systemHeartbeat`, `closeCardWeek`, `openCardWeek`, `processFeedback` e `refreshCardCollection` entram num ciclo coordenado às 08:00, 12:00, 17:00 e 22:00 de Lisboa (`0 8,12,17,22 * * *`) e no fecho de um jogo. Entregas do scheduler para o mesmo instante partilham o checkpoint, executando o trabalho uma vez. O calendário semanal mantém os prazos configurados; a materialização ocorre no ciclo seguinte. [Funcionamento dos ciclos](automation-cycles.md).

Cada ciclo verifica alterações e prazos antes de consultar dados de domínio. As filas agrupam jogos, cartas e percursos dos jogadores afetados; os checkpoints incrementais também são usados pelo ciclo coordenado. Os checkpoints do ciclo impedem repetir entregas duplicadas. Publicar cartas não volta a enfileirar o seu próprio cálculo. As dependências produzidas durante o ciclo são sinalizadas antes dos consumidores seguintes, incluindo a carta de uma recompensa acabada de entregar.

Reconstruir o início não apura eventos ou tentativas pessoais. O servidor apresenta o último progresso publicado. Os prazos continuam validados nas ações; o processamento posterior não prolonga elegibilidade nem reinicia as 48 horas. Execuções administrativas explícitas continuam disponíveis.

Há leituras de metadados, consultas e validações das ações. A redução de ciclos não elimina todo o consumo cloud nem fornece, por si só, uma percentagem de poupança faturada.

## Manutenção

As reconstruções usam uma promessa partilhada por instância e um lease Firestore entre instâncias. Um erro liberta o lease; uma alteração durante o cálculo permanece pendente. Os triggers podem chegar várias vezes ou fora de ordem: cada invalidação recebe uma versão nova, sem reverter a versão para um identificador antigo. A semântica de entrega está descrita na [documentação Firebase](https://firebase.google.com/docs/functions/firestore-events).

Os resultados são comprimidos com gzip. Acima de 850 000 bytes em base64, o servidor entrega o resultado sem o persistir, evitando ultrapassar o limite do documento. Essa proteção preserva a funcionalidade, mas deixa de proporcionar a mesma redução de leituras para esse resultado.

Ao alterar cálculos ou a estrutura dos resultados, incrementar `HOME_CACHE_VERSION` em `functions/home-cache.js` e publicar `getHome` com os consumidores efetivamente alterados. Nunca expor o contexto comprimido diretamente ao cliente. Os documentos são criados quando necessários; não é preciso recalcular a liga nem modificar semanas fechadas para introduzir esta cache.

Depois da publicação, comparar janelas equivalentes de utilização no console. Separar aquecimento, alterações reais, listeners, tarefas e navegação; a medição local de documentos pelo SDK não substitui a faturação cloud.

O pódio Performance recebe os agregados de todos os jogadores desde o último fecho semanal, incluindo os jogos anteriores à abertura das cartas. O período é contínuo entre fechos, segundo o calendário configurado. [Cálculo e validação](../reports/performance-week-2026-10-22.md).
