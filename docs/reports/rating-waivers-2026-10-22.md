# Anular votos em falta — 22/10/2026

[Documentação](../README.md) · [Processamento de avaliações](../reference/feedback-processing.md)

## Comportamento implementado

Em Jogos → Avaliações, junto ao botão de lembrete de cada participante, o administrador pode escolher **Anular votos em falta**. Uma confirmação explica o efeito. A linha distingue avaliações realmente enviadas, votos anulados e a obrigação pendente. A ação inversa **Repor votos** retoma essa obrigação. Não são enviadas mensagens pelo ato de anular.

A dispensa vale apenas para aquele participante naquele jogo e só cobre as avaliações que ele não enviou. Avaliações submetidas mantêm-se; rascunhos não entram nas médias. Se o jogador enviar uma avaliação posteriormente, a nota real substitui o crédito da dispensa para esse destinatário, sem duplicar o mínimo.

Exemplo: seis avaliações reais e uma dispensada satisfazem um mínimo de sete; a média continua calculada sobre as seis notas. `count` e `ratingCounts` continuam a contar apenas avaliações reais, incluindo na tabela de estatísticas. O novo `ratingQuorumCounts` é usado apenas nos mínimos de cartas, Melhor em Campo, missões, eventos e ETC. Sem uma nota real finita, não há média nem conquista por avaliação.

«Não foi à baliza» na autoavaliação continua a excluir GR, independentemente de dispensas. As avaliações iniciais/comunitárias para a primeira carta não são alteradas por esta funcionalidade.

## Processamento e histórico

O callable `ratingWaiverAction` exige capacidade de gestão de jogos ou avaliações, valida o participante e o jogo encerrado e grava a alteração e auditoria numa transação. Pedidos repetidos são idempotentes. Os intervalos em `games/{id}.ratingWaivers` preservam a data da dispensa e da reposição. Não são criados documentos de feedback fictícios.

A mesma transação agenda `feedbackWork/{gameId}`. O processamento continua de hora a hora; mudanças apenas nas dispensas não iniciam agregação em `onGame` nem uma leitura imediata de votos em `onPathGame`. As consultas normais do modal continuam manuais. A dispensa remove a obrigação de lembrete e a tarefa de avaliação pendente do início.

No ETC, só contam dispensas em vigor no prazo original de 48 horas. Uma dispensa posterior não recupera uma tentativa encerrada. Repor votos não apaga notas reais, não revoga automaticamente prémios já entregues e não reabre semanas fechadas. Não há recálculo global nem migração obrigatória; jogos anteriores sem dispensas mantêm o modelo existente.

## Validação local

- Testes de lógica: mínimos com dispensas, médias preservadas, substituição por voto real, rascunhos, GR excluído, intervalos históricos, ausência de notas e compatibilidade com resumos antigos.
- Emulador demo: permissões, participante inválido, idempotência, auditoria, fila horária, ausência de feedback fictício e reversão. Verifica seis notas reais, mínimo efetivo de sete e média inalterada após processar.
- Regressão local: fluxos de jogo/avaliação, coleções e fila de feedback. Os testes não acedem a produção.
- Browser com fixtures: confirmação e reposição nas larguras 320, 390, 768 e 1440 px, com inspeção de capturas desktop/telemóvel. Ações mantêm 44 px, nomes acessíveis, foco e ausência de overflow.

Resultado local em 22/10/2026: 175 testes de lógica, 18 testes backend no emulador e browser nos quatro temas/larguras passaram. O foco é preservado nas atualizações do modal, incluindo depois de tentar novamente, mantendo a tecla Escape funcional.

`npm.cmd run test:rating-waivers` executa a lógica e o browser. O teste `tests/rating-waiver.backend.test.js` exige `FIRESTORE_EMULATOR_HOST` local e projeto `demo-*`; nunca apontar ao projeto real.

## Publicação

Executar **`npm.cmd run deploy:rating-waivers`** e **`npm.cmd run deploy:frontend`**. O primeiro script publica seletivamente as 42 funções consumidoras indicadas abaixo; não publica regras, índices ou Storage. Não foi executado deploy nem feita qualquer leitura cloud nesta implementação.


Funções selecionadas: `onCommunityRating`, `onPlayerPosition`, `onInitialRating`, `onFeedback`, `onGame`, `saveOvrWeights`, `rebuildHistory`, `closeCardWeek`, `openCardWeek`, `ensureHistory`, `refreshCardCollection`, `selectWeeklyCard`, `rebuildLeague`, `deleteGame`, `saveWeeklyCardPhoto`, `correctRating`, `eventAction`, `voteEvent`, `closeEvents`, `getEvent`, `listEvents`, `claimMission`, `getPath`, `pathAction`, `onPathGame`, `onPathSummary`, `settlePaths`, `gameAction`, `feedbackAction`, `maintenanceAction`, `systemHeartbeat`, `saveTheme`, `ensureGameCards`, `maintenanceRead`, `getHome`, `processFeedback`, `ratingWaiverAction`, `ratingSubmissionStatus`, `sendRatingReminders`, `scheduledNotifications`, `onGameNotifications`, `onEventNotifications`.
