# Remoção da penalização por inatividade · 26/10/2026

As cartas atuais deixam de perder OVR por ausência, independentemente de configurações antigas. A contagem de ausências permanece informativa. Os atributos já não eram penalizados diretamente por este mecanismo.

`calculateInactivity` devolve sempre penalização zero. A fórmula que aceita penalizações guardadas continua disponível para auditoria e comparação de cartas históricas. Semanas fechadas não são reescritas.

Os três parâmetros de inatividade foram retirados da manutenção e do esquema ativo. Rascunhos de clientes antigos continuam a ser aceites; esses parâmetros são descartados na validação e normalização, impedindo reativação acidental.

## Validação local

- 65 testes de lógica, progressão, política e organização da manutenção passaram.
- O teste de backend de inatividade passou no emulador Firestore com projeto `demo-peladinhas-backend`: fecho e reabertura de jogos contam ausências, sem desconto de OVR.
- Testes de browser da manutenção passaram nos três temas, a 320/390/768/1440 px, incluindo teclado, rascunhos e simulação. Captura móvel inspecionada; os controlos de inatividade já não aparecem.
- Documentação validada com `npm.cmd run test:docs`.

Não foram executados deploy, recálculo real ou novas leituras da base de dados real neste trabalho.

## Publicação e atualização das cartas

O cálculo é partilhado pelo frontend e pelas Functions que criam/recalculam cartas, capturam referências de jogos ou desencadeiam esses processos. A configuração partilhada também é usada pela manutenção. Publicar ambos:

```powershell
npm.cmd run deploy:frontend
npx.cmd firebase deploy --only "functions:peladinhas:onCommunityRating,functions:peladinhas:onPlayerPosition,functions:peladinhas:onInitialRating,functions:peladinhas:onFeedback,functions:peladinhas:processFeedback,functions:peladinhas:onGame,functions:peladinhas:saveOvrWeights,functions:peladinhas:rebuildHistory,functions:peladinhas:closeCardWeek,functions:peladinhas:openCardWeek,functions:peladinhas:ensureHistory,functions:peladinhas:refreshCardCollection,functions:peladinhas:selectWeeklyCard,functions:peladinhas:rebuildLeague,functions:peladinhas:deleteGame,functions:peladinhas:saveWeeklyCardPhoto,functions:peladinhas:correctRating,functions:peladinhas:eventAction,functions:peladinhas:voteEvent,functions:peladinhas:closeEvents,functions:peladinhas:getEvent,functions:peladinhas:listEvents,functions:peladinhas:claimMission,functions:peladinhas:getPath,functions:peladinhas:pathAction,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:settlePaths,functions:peladinhas:gameAction,functions:peladinhas:feedbackAction,functions:peladinhas:ratingWaiverAction,functions:peladinhas:maintenanceRead,functions:peladinhas:maintenanceAction,functions:peladinhas:systemHeartbeat,functions:peladinhas:saveTheme,functions:peladinhas:ensureGameCards,functions:peladinhas:getHome"
```

Depois, executar **Recalcular liga** na administração para retirar descontos já guardados nas cartas abertas. As cartas fechadas mantêm os valores originais. A recuperação do desconto pode aparecer como subida de OVR na comparação com a semana anterior; não representa ganho de atributos por um jogo.
