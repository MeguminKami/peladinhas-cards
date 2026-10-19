# Autoavaliação sem guarda-redes — 19/10/2026

## Diagnóstico e correção dos dados

A auditoria real de leitura encontrou cinco autoavaliações submetidas com `goalkeeping: null` no primeiro jogo, encerrado em 15/10/2026. Os cinco resumos públicos ainda guardavam estrelas e não estavam marcados como não elegíveis. Existiam seis avaliações externas numéricas de GR para esses jogadores. Recalcular os votos com o código local produziu `null` nos cinco casos: a regra autoritativa já existia, mas os resumos guardados estavam desatualizados.

Executado `node scripts/audit-goalkeeping.mjs --repair` em produção às 15:18:56 UTC. Corrigiu apenas `goalkeeping: null`, `goalkeepingEligible: false` e `ratingCounts.goalkeeping: 0` nos cinco jogadores do primeiro resumo. A gravação usou máscara dos campos e precondição da versão do documento. Preservou votos, outras dimensões, contagens, jogadores e campos do resumo, utilizadores e cartas semanais fechadas. Não executou recálculo global de cartas ou recompensas.

Nova auditoria às 15:19:17 UTC confirmou **zero** resumos afetados ainda com estrelas ou elegibilidade de GR e zero correções pendentes. O segundo jogo não tinha autoavaliações submetidas N/A de GR. Não houve deploy de funções ou frontend nesta sessão.

## Proteções locais

A autoavaliação submetida «Não jogou à baliza» prevalece sobre todas as estrelas externas desse jogo, incluindo anteriores. `calculateGameAggregate`, `onFeedback` e o corte histórico dos percursos já aplicam a regra. Rascunhos não alteram resultados oficiais; 0 estrelas continua a ser uma avaliação válida, diferente de não aplicável.

O fallback de coleções passa a reconstruir resumos antigos sem elegibilidade explícita ou com GR incoerente, devolvendo também a elegibilidade e zero votos de GR quando excluído. As missões/eventos de estrelas rejeitam `goalkeepingEligible: false` mesmo perante estrelas/contagens antigas incoerentes. As outras dimensões continuam a contar. Propostas e metas escolhidas não são reescritas.

## Verificação

Passaram 150 testes gerais e 22 de integração no emulador Firestore. Incluem votos externos anteriores à autoavaliação N/A, correções administrativas, missões de estrelas nos seis modos relevantes, fallback de coleções e correção idempotente com IDs que exigem escape no caminho de campos. A correção preserva campos não relacionados e repetir não grava novamente o resumo. Não há alterações de layout.

## Procedimento reutilizável

```powershell
node scripts/audit-goalkeeping.mjs
node scripts/audit-goalkeeping.mjs --repair
```

O primeiro comando apenas consulta. O segundo escreve só os campos GR desatualizados em resumos com autoavaliação N/A submetida; não toca nos votos nem nas cartas. Usa a sessão Firebase autorizada e mostra apenas agregados, sem nomes ou IDs. Em testes, `FIRESTORE_EMULATOR_HOST` exige `GCLOUD_PROJECT` demo. Se ocorrer conflito de versão, repetir a auditoria antes de voltar a corrigir. Uma nova autoavaliação/correção deve provocar o recálculo normal pelo trigger publicado.

## Publicação seletiva pendente

```powershell
npm.cmd run deploy:goalkeeping
npm.cmd run deploy:frontend
```

O primeiro script executa `npx.cmd firebase deploy --project pedalinhas-cards --only "functions:peladinhas:…"` com a lista explícita em `package.json`, sem deploy completo. Consumidores diretos e indiretos dos módulos partilhados:

- Histórico/coleções: `onCommunityRating`, `onPlayerPosition`, `onInitialRating`, `onFeedback`, `onGame`, `saveOvrWeights`, `rebuildHistory`, `closeCardWeek`, `openCardWeek`, `ensureHistory`, `refreshCardCollection`, `selectWeeklyCard`, `rebuildLeague`, `deleteGame`, `saveWeeklyCardPhoto`; incluir `correctRating` para publicar a proteção de correção administrativa existente localmente.
- Eventos: `eventAction`, `voteEvent`, `closeEvents`, `getEvent`, `listEvents`, `claimMission`.
- Percursos e sincronização de jogos: `getPath`, `pathAction`, `onPathGame`, `onPathSummary`, `settlePaths`, `gameAction`, `feedbackAction`.
- Manutenção com recálculo: `maintenanceAction`, `systemHeartbeat`.

O cálculo de eventos também é usado pelo navegador, pelo que é necessário publicar frontend. As regras e índices não mudam. Os cinco resumos foram corrigidos; estas novas proteções de código ainda precisam de publicação. Recalcular um jogador/jogo após publicação apenas se for necessário atualizar projeções correntes; preservar semanas fechadas.
