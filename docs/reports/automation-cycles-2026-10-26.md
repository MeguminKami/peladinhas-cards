# Ciclos de atualização — 26/10/2026

[← Documentação](../README.md) · [Procedimento e comportamento](../reference/automation-cycles.md)

## Alteração implementada

Apuramentos de missões, percursos, eventos, avaliações, cartas e lembretes passam para as 08:00, 12:00, 17:00 e 22:00 de Lisboa e para o fecho de um jogo. Cada ciclo consulta os dados atuais elegíveis. O apuramento posterior não prolonga prazos nem altera o corte das 48 horas ou semanas fechadas.

Os endpoints existentes entram num coordenador com lease e checkpoint por execução. As filas de jogos, avaliações comunitárias e notificações preservam gerações recebidas durante o processamento. Consultar páginas deixa de reconstruir históricos ou apurar missões. A publicação de cartas partilha um contexto no fim do ciclo, depois das recompensas.

Votar num evento moderno deixa de consultar todos os votos e jogos para recalcular a classificação. Reclamar uma missão usa o progresso já publicado, sem voltar a percorrer os jogos, com leitura do documento de entrega para proteger pedidos concorrentes.

A limpeza mantém frequência diária, às 08:00. Temporizadores internos de partidas interativas e validações necessárias às ações não são apuramentos de missões/cartas e conservam o seu funcionamento.

## Validação local

Resultados de 26/10/2026:

- Testes puros: 205 passaram.
- Bateria geral do backend: 96 de 97 passaram; o único caso pendente foi a reclamação concorrente de uma missão. Depois de agrupar esses pedidos por instância e manter a proteção transacional da entrega, os 18 testes de eventos passaram na repetição dirigida, incluindo esse caso. Os 97 cenários ficaram assim cobertos por resultados aprovados.
- Segurança de leituras e agrupamento de trabalho: oito testes e o verificador de isolamento passaram.
- Interface de avaliações e manutenção: passou em 1440, 768, 390 e 320 px, com teclado e movimento reduzido. Capturas desktop e móvel foram inspecionadas.
- Verificação de sintaxe dos módulos e ligações da documentação: passaram.

As fixtures inserem checks explícitos onde os testes antigos pressupunham apuramento imediato. Cada ficheiro backend usa um namespace demo próprio, para não consumir filas de outros testes. Relógios históricos são compatibilizados com os timestamps reais do emulador e com a limpeza de fixtures.

Não foram consultados Firestore ou Storage reais. A redução faturada em produção não foi medida. Nenhum deploy foi executado.

## Publicação seletiva

O runtime é partilhado pelas seguintes 62 Functions. O comando `npm.cmd run deploy:cycles` contém os respetivos seletores e não publica regras, índices ou Storage:

- `ackPushNotification`
- `adminMessage`
- `casinoSession`
- `claimMission`
- `cleanupPushDeliveries`
- `closeCardWeek`
- `closeEvents`
- `communityRatingAction`
- `completePasswordRecovery`
- `correctRating`
- `deleteGame`
- `ensureGameCards`
- `ensureHistory`
- `eventAction`
- `feedbackAction`
- `gameAction`
- `getCasinoWallet`
- `getEvent`
- `getHome`
- `getPath`
- `grantCasinoCoins`
- `initializeOvrPresets`
- `listEvents`
- `maintenanceAction`
- `maintenanceRead`
- `onCasinoGame`
- `onCommunityRating`
- `onEventNotifications`
- `onFeedback`
- `onGame`
- `onGameNotifications`
- `onInitialRating`
- `onNotificationPush`
- `onPathGame`
- `onPathSummary`
- `onPlayerPosition`
- `onTicketClosed`
- `onTicketMessage`
- `openCardWeek`
- `passwordRecoveryAction`
- `pathAction`
- `processFeedback`
- `pushDeviceAction`
- `ratingSubmissionStatus`
- `ratingWaiverAction`
- `rebuildHistory`
- `rebuildLeague`
- `refreshCardCollection`
- `renameGameTeam`
- `saveOvrPreset`
- `saveOvrWeights`
- `saveTheme`
- `saveWeeklyCardPhoto`
- `scheduledNotifications`
- `selectWeeklyCard`
- `sendRatingReminders`
- `settleCasinoSlot`
- `settlePaths`
- `systemCleanup`
- `systemHeartbeat`
- `ticketAction`
- `voteEvent`

Comando equivalente definido no script:

```powershell
npx.cmd firebase deploy --project pedalinhas-cards --only "functions:peladinhas:ackPushNotification,functions:peladinhas:adminMessage,functions:peladinhas:casinoSession,functions:peladinhas:claimMission,functions:peladinhas:cleanupPushDeliveries,functions:peladinhas:closeCardWeek,functions:peladinhas:closeEvents,functions:peladinhas:communityRatingAction,functions:peladinhas:completePasswordRecovery,functions:peladinhas:correctRating,functions:peladinhas:deleteGame,functions:peladinhas:ensureGameCards,functions:peladinhas:ensureHistory,functions:peladinhas:eventAction,functions:peladinhas:feedbackAction,functions:peladinhas:gameAction,functions:peladinhas:getCasinoWallet,functions:peladinhas:getEvent,functions:peladinhas:getHome,functions:peladinhas:getPath,functions:peladinhas:grantCasinoCoins,functions:peladinhas:initializeOvrPresets,functions:peladinhas:listEvents,functions:peladinhas:maintenanceAction,functions:peladinhas:maintenanceRead,functions:peladinhas:onCasinoGame,functions:peladinhas:onCommunityRating,functions:peladinhas:onEventNotifications,functions:peladinhas:onFeedback,functions:peladinhas:onGame,functions:peladinhas:onGameNotifications,functions:peladinhas:onInitialRating,functions:peladinhas:onNotificationPush,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:onPlayerPosition,functions:peladinhas:onTicketClosed,functions:peladinhas:onTicketMessage,functions:peladinhas:openCardWeek,functions:peladinhas:passwordRecoveryAction,functions:peladinhas:pathAction,functions:peladinhas:processFeedback,functions:peladinhas:pushDeviceAction,functions:peladinhas:ratingSubmissionStatus,functions:peladinhas:ratingWaiverAction,functions:peladinhas:rebuildHistory,functions:peladinhas:rebuildLeague,functions:peladinhas:refreshCardCollection,functions:peladinhas:renameGameTeam,functions:peladinhas:saveOvrPreset,functions:peladinhas:saveOvrWeights,functions:peladinhas:saveTheme,functions:peladinhas:saveWeeklyCardPhoto,functions:peladinhas:scheduledNotifications,functions:peladinhas:selectWeeklyCard,functions:peladinhas:sendRatingReminders,functions:peladinhas:settleCasinoSlot,functions:peladinhas:settlePaths,functions:peladinhas:systemCleanup,functions:peladinhas:systemHeartbeat,functions:peladinhas:ticketAction,functions:peladinhas:voteEvent"
```

Depois, publicar o frontend com `npm.cmd run deploy:frontend`. Não é necessário recalcular dados existentes nem reabrir semanas fechadas. Os primeiros ciclos criam os resultados guardados em falta; objetivos sem snapshot aguardam esse primeiro processamento.
