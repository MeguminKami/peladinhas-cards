# Migração das funcionalidades

`src/features/FeatureRoutes.tsx` adapta os serviços existentes aos componentes React. O acesso Firebase e as regras de negócio continuam nos módulos existentes; os componentes não escrevem HTML nem ligam eventos manualmente ao DOM. `game-domain.ts` e `ovr-audit-domain.js` contêm projeções puras extraídas da implementação de referência.

Áreas integradas: jogos e equipas, sorteio e equilíbrio, resultado/golos/assistências, estrelas, avaliações iniciais e pós-jogo, missões, listagem e votação de eventos antigos, eventos geridos, apoio, notificações, catálogo de cartas, fotografia semanal e auditoria OVR. A administração e o editor de eventos são integrados pelos respetivos agentes em `admin.tsx`, `event-admin.tsx` e `managed-event.tsx`.

O contrato de rascunhos preserva a fila serial e o debounce de 450 ms. `flushRatingDrafts()` deve ser aguardado antes de mudar de rota, identidade, perspetiva ou terminar sessão. O hook também limpa os temporizadores e descarrega alterações pendentes quando desmonta. O prazo de edição reutiliza `canEditRating` e `ratingEditDeadline`; não é reiniciado ao gravar.

## Validação

`node tests/react-features.mjs` executa Vite em modo de teste e usa apenas fixtures locais. O browser bloqueia pedidos HTTPS e service workers. O teste cria um jogo, atribui jogadores, guarda, abre e encerra com um golo; verifica as posições históricas e a posição da secção de estrelas. Avalia colegas e o próprio, submete e reabre as avaliações dentro do prazo. Exercita a gravação inicial, fotografia semanal por URL/teclado, auditoria OVR e catálogo de cartas. Verifica ausência de overflow em 1440, 768, 390 e 320 px e grava as respetivas capturas em `artifacts/migration/feature-flows/`.

O teste distingue zero estrelas de uma dimensão não preenchida e permite guarda-redes não aplicável. A navegação imediata após editar um atributo verifica que a fila de rascunhos é descarregada.

As imagens do teste funcional usam um jogo criado durante a execução; não constituem uma comparação pixel a pixel com as referências. A matriz de comparação é mantida pelo agente de fidelidade em `docs/migration-fidelity.md`. Não foram usados dados de produção.

Fixtures atualizadas: `ticketAction` cobre criar, responder e fechar definitivamente; `claimMission` cobre elegibilidade, periodo, limite e entrega idempotente; o voto substitui a escolha anterior. A suite verifica apoio completo, objetivo incompleto, entrega elegivel, chamadas repetidas sem duplicar a recompensa e estado depois de recarregar. Os mocks complementam os testes de transacoes e permissoes em `tests/backend.test.js` e `tests/events.backend.test.js`.

16/10/2026: recuperados os sete fluxos aprovados e corrigido este registo desatualizado. O hook de rascunhos propaga falhas para impedir submissao ou navegacao silenciosa depois de uma gravacao falhada. Autosave, gravacao manual e desmontagem tratam a rejeicao. O teste adicional confirma erro, preservacao do rascunho zero e nova tentativa com sucesso. Reposto AdminMenu depois do titulo nas paginas administrativas de avaliacao inicial, foto semanal, auditoria OVR e catalogo de cartas.

Validacao desta continuacao: `node tests/react-features.mjs` aprovado (7 etapas; sem erros de browser; larguras 1440, 768, 390 e 320 px). O carregamento de imagens externas permanece bloqueado: a fotografia usa URL e teclado, sem validar processamento binario de uma imagem real. Sem dados reais ou deploy.

Integracao do guard de navegacao validada: hash revertido apos falha de gravacao, formulario e rascunho preservados; depois de nova tentativa bem sucedida a navegacao avanca. TypeScript aprovado (`npm.cmd run typecheck`).

Recaptura adicional: AdminMenu reposto tambem em #/admin/support, atraves de prop explicita exclusiva da rota administrativa; typecheck aprovado. Comparacao visual atribuida ao agente de fidelidade.
