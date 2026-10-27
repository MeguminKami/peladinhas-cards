# Avaliações nulas e autorização administrativa · 27/10/2026

A comunidade passa a excluir médias iguais ou inferiores a 1,9/20. A primeira submissão fica `invalid`, com uma tentativa consumida e sem janela de edição. A classificação é gravada na transação da submissão; o resumo comunitário é atualizado antes da resposta, incluindo repetições de transporte. A publicação das cartas mantém os ciclos existentes.

O ADMIN apresenta **Nula**, filtro **Nulas** e **Dar mais uma tentativa**. A consulta `listCommunityRatingsForAdmin` classifica também avaliações antigas sem alterar documentos numa leitura. Mantém a consulta à coleção comunitária que o painel já fazia; o limite numérico permanece apenas no servidor. Os timestamps são devolvidos em ISO para preservar os prazos de edição no browser.

`grantCommunityRatingRetry` exige capacidade administrativa `ratings`, regista autor, data e auditoria, e concede uma única revisão `required`, com token novo e prazo configurado contado desde a autorização. Concessões concorrentes não renovam a oportunidade. A submissão definitiva passa a `accepted` ou `ignored`; ambas ficam bloqueadas. Revisões automáticas antigas sem `reviewGrantedAt` também deixam de ser editáveis até autorização. Votos antigos nulos não podem contornar o fluxo submetendo novos valores pelo callable.

O autor recebe os avisos sem indicação do limiar. A missão de revisão surge apenas após autorização. O painel atualiza as missões após a concessão. Em telemóvel, cada linha da tabela apresenta campos com labels e ações separadas, em vez de comprimir as colunas até uma letra por linha.

## Validação local em 27/10/2026

- `npm.cmd test`: 207 testes passaram, incluindo limite inclusivo, exclusão de estados nulos e bloqueio sem autorização.
- Sete testes backend passaram num emulador Firestore com projeto `demo-`: nulidade de 1,0 antes de qualquer ciclo, resumo imediato, autorização e permissões, avaliações antigas, uma única concessão concorrente, rascunhos, submissão final, idempotência e preservação de cartas fechadas. A porta habitual estava ocupada; foi usada uma configuração temporária local com Firestore em 8096.
- `npm.cmd run test:community-review`: passou com fixtures locais, filtros, estado Nula, formulário bloqueado antes da autorização, erro recuperável, botão operado por teclado com foco visível, missão atualizada e bloqueio final. Capturas inspecionadas em desktop e em 320/390/768 px; avisos também verificados em três temas, com redução de movimento.
- Sintaxe dos módulos alterados e `git diff --check` verificados. Ligações verificadas com `npm.cmd run test:docs`.

Estes resultados não confirmam a configuração publicada nem o estado de um jogador real.

## Dados existentes e publicação

Não foram consultados nem alterados dados reais. A indicação de 1,0 ativo feita pelo utilizador não foi auditada na cloud. Depois de publicar, o painel identifica esse tipo de avaliação como nula. Os agregados e cartas já guardados podem exigir **Recalcular** no jogador afetado, ou **Recalcular liga**, para remover contribuições antigas. Esta operação real não foi executada; semanas fechadas mantêm os seus valores.

Publicar os três endpoints comunitários, o painel/frontend e os consumidores dos módulos partilhados: agregação comunitária, histórico e coleção, edição de feedback, missões do início, manutenção e ciclos. Não há alteração de regras, índices ou Storage nesta tarefa.

Comandos seletivos, a partir da raiz do projeto:

```powershell
$communityNullFunctions = @(
  'communityRatingAction', 'grantCommunityRatingRetry', 'listCommunityRatingsForAdmin',
  'getHome', 'correctRating', 'feedbackAction', 'gameAction', 'ratingWaiverAction',
  'onCommunityRating', 'onGame', 'processFeedback', 'rebuildHistory', 'rebuildLeague',
  'saveOvrWeights', 'closeCardWeek', 'openCardWeek', 'ensureHistory', 'ensureGameCards',
  'refreshCardCollection', 'selectWeeklyCard', 'saveWeeklyCardPhoto', 'saveTheme',
  'deleteGame', 'closeEvents', 'settlePaths', 'scheduledNotifications',
  'maintenanceRead', 'maintenanceAction', 'systemHeartbeat'
)
$communityNullSelectors = ($communityNullFunctions | ForEach-Object { "functions:peladinhas:$_" }) -join ','
npx.cmd firebase deploy --only "$communityNullSelectors"
npm.cmd run deploy:frontend
```

Os comandos são instruções de publicação; não foram executados. A lista inclui os schedulers que entram no ciclo partilhado e os escritores de jogos que o invocam. Não usar um deploy completo por omissão.
