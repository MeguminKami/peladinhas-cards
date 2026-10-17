# Publicar as correções de avaliações e dos ecrãs móveis

O cálculo partilhado exclui guarda-redes quando a autoavaliação submetida indica que o jogador não foi à baliza. A publicação inclui os consumidores desse cálculo: resumos de jogos, evolução de cartas, histórico, coleção e entregas de recompensas que recalculam jogadores. As regras impedem novas notas numéricas de colegas nesse critério.

Executar na raiz do projeto:

```powershell
npx.cmd firebase deploy --project pedalinhas-cards --only "firestore:rules,functions:peladinhas:onCommunityRating,functions:peladinhas:onPlayerPosition,functions:peladinhas:onInitialRating,functions:peladinhas:onFeedback,functions:peladinhas:onGame,functions:peladinhas:saveOvrWeights,functions:peladinhas:rebuildHistory,functions:peladinhas:closeCardWeek,functions:peladinhas:openCardWeek,functions:peladinhas:ensureHistory,functions:peladinhas:refreshCardCollection,functions:peladinhas:selectWeeklyCard,functions:peladinhas:rebuildLeague,functions:peladinhas:deleteGame,functions:peladinhas:correctRating,functions:peladinhas:saveWeeklyCardPhoto,functions:peladinhas:eventAction,functions:peladinhas:closeEvents,functions:peladinhas:claimMission"
npm.cmd run deploy:frontend
```

Depois da publicação, usar **Administração → Manutenção → Recalcular liga** para atualizar os resumos e as cartas em evolução que já tinham notas de guarda-redes incompatíveis com a autoavaliação. As cartas de semanas fechadas mantêm-se bloqueadas.

O frontend inclui resultados de eventos e missões adaptados ao telemóvel, os contadores de golos e assistências alinhados, o texto do pódio à direita e o convite de notificações no início. O popup só pede a permissão do sistema após o toque no botão; «Agora não» adia o convite durante sete dias.

Este documento contém instruções de publicação. Não confirma que tenham sido executadas.
