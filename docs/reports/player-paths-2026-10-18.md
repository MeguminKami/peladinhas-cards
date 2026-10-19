# Escolhe o teu caminho! — implementação e validação

> Registo histórico de 18 de outubro de 2026. As regras, limitações e resultados abaixo pertencem a essa etapa. Para o código local atual, consultar a [referência dos percursos](../reference/player-paths.md), o [catálogo v4](../reference/path-mission-catalogue.md) e a [interface validada em 19 de outubro](path-interface-2026-10-19.md). Esta nota não reexecuta testes nem comprova publicação.

Data: 18 de outubro de 2026, Europe/Lisbon.

[← Documentação](../README.md) · [Funcionamento](../reference/player-paths.md) · plano histórico ausente desta cópia

## Entregue localmente

- Categoria própria em Missões com ícone de percurso e missão atual; botão no perfil do proprietário; página `#/missions/path`.
- Doze caminhos independentes com dez etapas e duas alternativas por etapa; três fusões opcionais entre especializações.
- Propostas aleatórias persistidas pelo servidor, uma tentativa ativa, próxima participação como janela, avanço por dificuldade e reinício apenas do nó falhado.
- Consistência com 25/50/100% e Ousadia com metas superiores e 40/75/100%.
- Limites exclusivos desta origem: +10 por atributo e +20 em GR, independentes de eventos e restantes missões. Cada entrega tem no máximo +1 em três atributos; o valor apresentado continua limitado a 99.
- Quinze novas cartas vetoriais permanentes, pré-visualização, celebração e integração na seleção existente.
- Transações, auditoria, histórico de tentativas separado, proteção contra pedidos repetidos e sorteios por desistência.
- Revisão de jogos corrigidos em `#/admin/paths`, com motivo obrigatório para conservar a conquista e permitir continuar.
- Mapa e propostas responsivos, foco por teclado, estados de espera/erro/falha/conquista, animações e redução de movimento.

## Validação local

- `npm.cmd test`: 114 testes passaram, incluindo sete testes de regras dos percursos.
- `npm.cmd run test:paths`: passou. Navegação por Missões e perfil, bifurcações, dependências de fusões, três propostas, aceitação, recuperação de erro, teclado, movimento reduzido, estados de falha e revelação da carta.
- Layout inspecionado renderizado em 1440, 768, 390 e 320 px; quatro temas verificados e sem overflow horizontal nos testes. Corrigida interferência de um seletor tipográfico na pré-visualização da carta.
- `npm.cmd run test:activities`: passou, incluindo agrupamento, calendário, filtros, teclado e quatro larguras.
- Testes de servidor executados no emulador Firestore local: a execução de regressão validou 42 casos; os dois casos que falharam foram corrigidos e reexecutados com sucesso (limite de pedidos no teste do catálogo expandido e reutilização de fixtures entre execuções). O teste específico cobre concorrência, falsificação de propostas, idempotência, correções e carta permanente mesmo com o teto próprio esgotado.
- Teste específico de regras de Firestore passou: estado privado, tentativas acessíveis ao proprietário, auditoria administrativa e rejeição de escrita direta por jogador e administrador.
- `npm.cmd run check` e `npm.cmd run build:hosting` passaram; frontend/PWA gerados localmente.
- A suite geral de UI parou num título antigo do pódio (`Melhores da semana`) que já não corresponde à interface atual (`No topo da liga`). A suite da coleção verificou os materiais distintos das 34 edições e depois falhou numa expectativa de edição de projetos existentes do Card Lab; esse fluxo não foi alterado neste trabalho. Não se declara aprovação destas duas suites completas.
- A execução completa das regras encontrou um erro interno do emulador numa regra preexistente (`MaximumExpressions` seguido de falha de recursos de localização Java), após passar o novo teste. A execução foi interrompida; não se declara aprovação da suite completa de regras.
- `npm.cmd run test:docs` encontra dez referências antigas a `docs/deploy-feedback-fixes.md` e `docs/reports/experience-review.md`, que não existem nesta cópia. A documentação nova mantém ligações válidas; não se recriaram relatórios antigos sem evidência.

As capturas de validação são geradas em `test-results/paths/`, incluindo desktop, larguras móveis, temas, falha e carta final. São artefactos locais, não prova de publicação.

## Limites da versão

- As metas iniciais são parâmetros de produto; precisam de acompanhamento com o uso real da liga.
- A validação por estrelas usa um snapshot quando existem duas avaliações por critério. Votos posteriores não reabrem a tentativa automaticamente.
- Correções dos dados do jogo suspendem o percurso para revisão. A ação administrativa disponível conserva a conquista; esta versão não revoga automaticamente a cadeia de nós dependentes.
- Uma tentativa sem avaliações suficientes pode ser abandonada depois de o jogo encerrar, reiniciando o nó.
- O processamento lê o estado dos percursos e os jogos da liga; foi desenhado para a escala atual da comunidade. Monitorizar volume e duração antes de expandir para várias ligas.
- Não foi executado deploy, nem verificada a configuração cloud ou a experiência em aparelhos físicos.

## Publicação

O frontend e as regras não são suficientes: o motor e as recompensas são autoritativos no backend. Publicar o backend e as regras antes do frontend.

Os módulos partilhados alterados incluem o cálculo de recompensas, catálogo/políticas de cartas e runtime de funções. O comando identifica explicitamente os consumidores exportados dessa infraestrutura; não publica Storage nem índices e não usa o deploy geral do projeto.

```powershell
npx.cmd firebase deploy --only "firestore:rules,functions:peladinhas:ackPushNotification,functions:peladinhas:adminMessage,functions:peladinhas:claimMission,functions:peladinhas:cleanupPushDeliveries,functions:peladinhas:closeCardWeek,functions:peladinhas:closeEvents,functions:peladinhas:correctRating,functions:peladinhas:deleteGame,functions:peladinhas:ensureGameCards,functions:peladinhas:ensureHistory,functions:peladinhas:eventAction,functions:peladinhas:getEvent,functions:peladinhas:getPath,functions:peladinhas:initializeOvrPresets,functions:peladinhas:listEvents,functions:peladinhas:maintenanceAction,functions:peladinhas:maintenanceRead,functions:peladinhas:onCommunityRating,functions:peladinhas:onEventNotifications,functions:peladinhas:onFeedback,functions:peladinhas:onGame,functions:peladinhas:onGameNotifications,functions:peladinhas:onInitialRating,functions:peladinhas:onNotificationPush,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:onPlayerPosition,functions:peladinhas:onTicketClosed,functions:peladinhas:onTicketMessage,functions:peladinhas:openCardWeek,functions:peladinhas:pathAction,functions:peladinhas:pushDeviceAction,functions:peladinhas:ratingSubmissionStatus,functions:peladinhas:rebuildHistory,functions:peladinhas:rebuildLeague,functions:peladinhas:refreshCardCollection,functions:peladinhas:renameGameTeam,functions:peladinhas:saveOvrPreset,functions:peladinhas:saveOvrWeights,functions:peladinhas:saveTheme,functions:peladinhas:saveWeeklyCardPhoto,functions:peladinhas:scheduledNotifications,functions:peladinhas:selectWeeklyCard,functions:peladinhas:sendRatingReminders,functions:peladinhas:settlePaths,functions:peladinhas:systemCleanup,functions:peladinhas:systemHeartbeat,functions:peladinhas:ticketAction,functions:peladinhas:voteEvent"
npm.cmd run deploy:frontend
```

As cinco funções novas são `getPath`, `pathAction`, `onPathGame`, `onPathSummary` e `settlePaths`. Confirmar os respetivos logs após publicação e fazer uma tentativa de teste controlada. Não existe migração retroativa de pontos a executar: as novas entregas começam em zero e os snapshots de semanas fechadas permanecem intactos.
