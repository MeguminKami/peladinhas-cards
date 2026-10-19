# Escolhe o teu caminho! — update implementado

> Registo histórico de 18 de outubro de 2026. As regras, limitações e resultados abaixo pertencem a essa etapa. Para o código local atual, consultar a [referência dos percursos](../reference/player-paths.md), o [catálogo v4](../reference/path-mission-catalogue.md) e a [interface validada em 19 de outubro](path-interface-2026-10-19.md). Esta nota não reexecuta testes nem comprova publicação.

Data: 18 de outubro de 2026, Europe/Lisbon.

[← Documentação](../README.md) · plano histórico ausente desta cópia · [Referência funcional](../reference/player-paths.md) · [Conceitos atuais em código](../../js/path-card-designs.js)

## Resultado local

O update foi implementado no frontend e no backend. Não houve deploy, recálculo de dados de produção, auditoria de jogos cloud nem validação num aparelho físico. As alterações já existentes na árvore de trabalho foram preservadas.

A entrada em Missões tem composição própria, ilustração e estado atual; o próprio perfil mantém o acesso. O seletor apresenta uma especialização de cada vez, com ativação explícita, e o tutorial fica ao lado da ação principal. Os nós mostram avanço e recompensa sem ramos Consistência/Ousadia ou ligações cruzadas.

Cada especialização tem 15 nós, ou 25 em GR. O teto de recompensas é próprio desta origem: +15 por atributo e +25 a GR, mantendo 99 como máximo apresentado. Cada nó tem 100%; o excedente passa aos seguintes, incluindo vários completados numa tentativa. No fim do percurso, fica registado sem criar boosts adicionais.

As três propostas usam as raridades existentes. O sorteio pode produzir Ícone/150% e Ultimate/200%; os boosts continuam limitados por nó. Um reroll diário global renova apenas o trio escolhido, com reposição à meia-noite de Lisboa. A dificuldade usa pontos efetivamente entregues, incluindo fusões, e entra em metas finais desde +10.

As fusões surgem quando há um marco relevante, indicam a outra especialização a melhorar e desbloqueiam com o marco 5 em ambas. Ativar unifica as entradas de origem no seletor, sem apagar dados. Cada fusão tem três focos e cinco nós de combinação; os focos individuais continuam independentes. As 15 cartas mantêm os IDs e têm conceitos, silhuetas, composição vetorial e materiais distintos, também revistos em escala de cinzentos.

## Jogos e votos autoritativos

- `gameAction` valida papéis/capacidades, dados e transições, protege o singleton `gameFlow/open` e congela a preparação na mesma transação que abre o jogo. Não usa a hora agendada como substituto da abertura. Só um jogo pode abrir, mesmo com pedidos concorrentes.
- Não há encerramento automático de jogos antigos. A gestão mostra o jogo aberto e a sua ligação, permite guardar rascunhos e bloqueia outra abertura. A associação privada duradoura impede reutilizar um jogo já contado, incluindo após a tentativa sair do histórico compacto.
- Uma missão preparada pode ser substituída ou removida sem perder progresso, fora do bloqueio. No fecho, uma tentativa vai para apuramento imediato se for só golos, assistências ou vitória; se exigir avaliações, permanece em `pending`. Outra preparação pode coexistir.
- Os nós que podem receber excedente ficam reservados. A reserva segue também cadeias antigas com nós já concluídos; a aceitação verifica o alcance da proposta inteira para não sobrepor duas tentativas.
- O fecho conserva contribuições individuais e dados numéricos compactos, com um hash canónico do jogo completo. Correções posteriores suspendem o percurso para revisão em vez de alterar silenciosamente a base do apuramento.
- `feedbackAction` e `correctRating` escrevem o voto e a sua revisão completa com timestamp de commit, atomicamente. A primeira edição de um voto anterior ao histórico guarda uma baseline.
- Às 48 horas de `closedAt`, o apuramento reconstrói os votos válidos no corte. Não usa a média mais recente nem decide cedo ao chegar a sete votos. Exclui rascunhos, N/A, duplicados, valores inválidos, participantes alheios e submissões anteriores ao fecho.
- Com pelo menos sete votos em cada critério, avalia a meta; sem amostra, cancela sem perder progresso. Edições posteriores não mudam o resultado desta tentativa. O navegador mostra contagem e votos; o relógio do servidor decide.
- O cliente já não escreve jogos ou feedback diretamente. As regras também protegem o singleton e o histórico dos votos, inclusive perante um administrador no navegador. O histórico privado de votos não é exposto ao jogador.

## Compatibilidade e cálculos

A estrutura de estado continua compatível com `PATH_VERSION = 1`, com campos aditivos. Propostas usam `proposalVersion: 3`. O migrador conserva metas, percentagens, IDs, raridades, avanços e elegibilidade anterior à carta; não dá um sorteio gratuito.

Tentativas ainda não apuradas passam às regras confirmadas de sete votos/48 horas. Uma preparação antiga já associada a um jogo é movida para `pending`, conservando a ligação e uma cópia da proposta anterior para auditoria; não pode desaparecer quando o jogador prepara outra missão. O prazo continua contado desde o fecho original. A ausência de evidência suficiente cancela sem perda de progresso. Resultados já apurados e cartas adquiridas não são reabertos.

Uma associação antiga não permite inventar uma hora de abertura que a versão anterior não gravou; fica marcada como legado. Para novos jogos, o congelamento é atómico. Votos antigos sem revisão só permitem reconstruir a versão que ainda existe e é anterior ao corte, ou uma baseline preservada numa edição posterior; não se inventam versões históricas ausentes.

O cálculo partilhado de recompensas passou de +10/+20 para +15/+25 nesta origem. Publicar os consumidores desse cálculo e do catálogo/runtime partilhados, não apenas os endpoints novos. Cartas abertas podem ser atualizadas pelo fluxo existente de reconstrução de histórico, se necessário; não foi executado recálculo cloud. Os snapshots de semanas fechadas permanecem protegidos.

## Validação executada

- `npm.cmd test`: 129 testes de lógica passaram, incluindo percursos, migração, reservas, fusões, limites, excedente, raridades, meia-noite de Lisboa e corte das avaliações.
- Backend no emulador Firestore: 54 casos de regressão passaram num projeto demo limpo, mais 11 casos específicos de percursos e fluxo de jogos. Foram executados diretamente com `node --test --test-concurrency=1`; não se afirma execução do wrapper de deploy Firebase.
- Cobertura específica: duas aberturas concorrentes, congelamento antes da hora agendada, troca de preparação, bloqueio durante o jogo, apuramento numérico, sete votos sem decisão antecipada, janela de 48 horas, baseline de edição tardia, cancelamento com seis votos, preparação paralela, revisão de dados corrigidos, N/A, privacidade, reroll concorrente, entregas idempotentes e carta final com stats no teto.
- `tests/firestore.rules.test.js`: 36 casos passaram. A validação de campos/transições de jogos e feedback foi transportada para testes das Functions; os testes de regras confirmam a nova fronteira de escrita e mantêm os testes de leitura privada.
- `node tests/paths.mjs` e `node tests/game-layout.mjs`: passaram. Primeira ativação, tutorial, alteração da preparação, três propostas, erro/repetição, raridades, fusões, origens retiradas do seletor, contador/votos, aviso de outro jogo aberto, foco e teclado, redução de movimento e larguras 1440/768/390/320 px.
- Quatro temas revistos. Corrigidas quebras de nomes no seletor pequeno e a densidade da navegação superior com nomes longos em desktop.
- `npm.cmd run check` e `npm.cmd run build:hosting`: passaram.
- `npm.cmd run test:docs`: executado; mantém dez referências históricas a `docs/deploy-feedback-fixes.md` e `docs/reports/experience-review.md`, ausentes desta cópia. As ligações novas não constam dos erros. Não se recriaram relatórios antigos sem evidência.

As capturas em `test-results/paths/` incluem primeira entrada, tutorial, seletor móvel, raridades, falha, carta final, fusão unificada, contagem/votos e uma comparação das 15 cartas a cores e monocromática. A gestão do jogo tem capturas `test-results/game-open-notice-*.png`. São artefactos locais, não prova de publicação ou de validação em telemóveis físicos.

## Publicação seletiva

O código não é só frontend: são necessárias Functions e regras. A configuração atual usa o codebase `peladinhas`; o comando abaixo identifica explicitamente os 51 consumidores exportados dos módulos partilhados deste conjunto de alterações, incluindo os novos `gameAction`/`feedbackAction`, a correção de votos e o motor de percursos. Não publica Storage nem índices.

Antes da publicação, consultar os jogos cloud já abertos e resolver manualmente eventuais duplicados; esta sessão não os consultou nem alterou. Publicar o conjunto de backend/regras antes do frontend e carregar a nova versão da aplicação, porque os clientes antigos não podem continuar a gravar jogos/feedback diretamente.

```powershell
npx.cmd firebase deploy --project pedalinhas-cards --only "firestore:rules,functions:peladinhas:ackPushNotification,functions:peladinhas:adminMessage,functions:peladinhas:claimMission,functions:peladinhas:cleanupPushDeliveries,functions:peladinhas:closeCardWeek,functions:peladinhas:closeEvents,functions:peladinhas:correctRating,functions:peladinhas:deleteGame,functions:peladinhas:ensureGameCards,functions:peladinhas:ensureHistory,functions:peladinhas:eventAction,functions:peladinhas:feedbackAction,functions:peladinhas:gameAction,functions:peladinhas:getEvent,functions:peladinhas:getPath,functions:peladinhas:initializeOvrPresets,functions:peladinhas:listEvents,functions:peladinhas:maintenanceAction,functions:peladinhas:maintenanceRead,functions:peladinhas:onCommunityRating,functions:peladinhas:onEventNotifications,functions:peladinhas:onFeedback,functions:peladinhas:onGame,functions:peladinhas:onGameNotifications,functions:peladinhas:onInitialRating,functions:peladinhas:onNotificationPush,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:onPlayerPosition,functions:peladinhas:onTicketClosed,functions:peladinhas:onTicketMessage,functions:peladinhas:openCardWeek,functions:peladinhas:pathAction,functions:peladinhas:pushDeviceAction,functions:peladinhas:ratingSubmissionStatus,functions:peladinhas:rebuildHistory,functions:peladinhas:rebuildLeague,functions:peladinhas:refreshCardCollection,functions:peladinhas:renameGameTeam,functions:peladinhas:saveOvrPreset,functions:peladinhas:saveOvrWeights,functions:peladinhas:saveTheme,functions:peladinhas:saveWeeklyCardPhoto,functions:peladinhas:scheduledNotifications,functions:peladinhas:selectWeeklyCard,functions:peladinhas:sendRatingReminders,functions:peladinhas:settlePaths,functions:peladinhas:systemCleanup,functions:peladinhas:systemHeartbeat,functions:peladinhas:ticketAction,functions:peladinhas:voteEvent"
npm.cmd run deploy:frontend
```

Não executar `deploy:backend` ou `deploy` por defeito: incluem áreas adicionais. Após a publicação, confirmar logs, testar uma abertura/fecho controlada e verificar uma tentativa real. Um build e estes testes locais não comprovam deploy.
