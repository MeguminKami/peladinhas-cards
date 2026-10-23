# Recompensa de missão encerrada — 21 de outubro de 2026

A consulta autorizada a `users`, `events` e `eventRewards` devolveu dois documentos: o jogador Jonas e a missão «Revelação de um jogo noturno». A consulta de recompensas não devolveu documentos. Não foram consultados jogos nem Storage e não foram alterados dados reais.

A missão terminou em 19 de outubro de 2026 com Jonas elegível e progresso de 100% na classificação guardada, mas sem recompensa registada. O servidor exigia uma missão aberta para reclamar e a página escondia a ação depois do encerramento.

A correção permite reclamar missões únicas (`cadence: once`) encerradas, usando exclusivamente a classificação guardada pelo servidor. Não recalcula resultados com jogos posteriores. Preserva participantes, requisitos, orçamento e entrega única por período. Missões canceladas e missões recorrentes encerradas continuam bloqueadas. A classificação de vencedores passa a incluir a entrega tardia.

Não é necessário recalcular dados nem reabrir a missão ou semanas fechadas. Após publicação, Jonas pode abrir a missão no histórico e receber a recompensa, sujeito às regras de orçamento em vigor. Nenhuma entrega nem publicação foi executada nesta investigação.

Publicação necessária: frontend e funções `getEvent` e `claimMission`. A alteração de detalhes também é usada por `listEvents`, que deve acompanhar a publicação.

Verificação local: teste de interface `node tests/event-details.mjs`, com larguras de 1440, 768, 390 e 320 px, foco por teclado e movimento reduzido. O teste de servidor em `tests/events.backend.test.js` cobre o resultado guardado, pedidos concorrentes, entrega única e rejeição de participantes inelegíveis, externos, missões canceladas e recorrentes encerradas.

Resultados em 21 de outubro de 2026: 18 testes de servidor passaram no emulador Firestore com projeto `demo-peladinhas-mission`; teste de interface passou, com inspeção das capturas de desktop e telemóvel; `npm.cmd run test:docs` passou com 55 documentos e 363 referências locais válidas.
