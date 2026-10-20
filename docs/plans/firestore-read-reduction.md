# Plano para reduzir leituras do Firestore

Data: 19/10/2026; atualizado em 20/10/2026. Estado: implementação local validada; publicação e medição posterior em produção por executar.

Resultados e limitações no [relatório datado](../reports/firestore-read-reduction-2026-10-19.md): feedback **7 713 → 682**, resumo de 20 missões **385 → 49**, histórico recente **766 → 7** e fecho agendado sem trabalho vencido **647 → 44** leituras SDK. As percentagens são específicas destes cenários de emulador, não do total diário cloud.

As caixas assinaladas representam entregas locais. As restantes exigem observação cloud ou uma alteração estrutural adicional; não estão implicitamente concluídas. O diagnóstico inicial abaixo conserva a situação observada antes desta implementação. Desenvolvimento, testes e auditorias já têm as proteções descritas nos [guias atualizados](../guides/development.md).

[← Documentação](../README.md) · [Desenvolvimento](../guides/development.md) · [Testes](../guides/testing.md) · [Publicação](../guides/deployment.md)

## Objetivo

Impedir consumo acidental de produção durante o desenvolvimento e reduzir as leituras necessárias para navegar, consultar missões e processar avaliações. Preservar cálculos, permissões, recompensas e semanas fechadas.

Executar por fases pequenas, medindo cada alteração antes de avançar. Este plano não autoriza desligar automações, alterar dados reais ou executar deploy.

## Diagnóstico inicial e limites da evidência

Na imagem apresentada, o dia 19/10 regista aproximadamente 488 mil leituras, das quais 438 mil excedem a quota gratuita indicada de 50 mil.

A consulta de métricas realizada em 19/10/2026 cobriu **18/10 às 22:28:51 UTC até 19/10 às 22:28:51 UTC**, correspondendo a 23:28:51 em Lisboa em ambos os dias. Esta janela de 24 horas não coincide exatamente com o dia do gráfico.

| Métrica observada nessa janela | Valor |
| --- | ---: |
| Leituras de documentos, somando as categorias devolvidas | 508 362 |
| Leituras da categoria `QUERY` | 404 573 |
| Leituras da categoria `LOOKUP` | 93 572 |
| Leituras da categoria `NOT_FOUND` | 10 217 |
| Pedidos a `getEvent`, excluindo respostas HTTP 204 de preflight | 3 426 |
| Pedidos a `ensureHistory`, excluindo respostas HTTP 204 | 199 |
| Execuções bem-sucedidas de `onFeedback` | 307 |
| Execuções bem-sucedidas de `onCommunityRating` | 193 |
| Operações `Commit` com estado `ABORTED`, na série da base `(default)` | 3 709 |

As séries com recursos antigos e atuais não devem ser somadas entre si quando representam a mesma operação. As métricas de Cloud Run e Cloud Functions também não devem ser somadas como se fossem pedidos independentes. Contagens de pedidos, execuções e leituras são grandezas diferentes.

**Confirmado no código:**

- [O servidor de desenvolvimento](../../scripts/dev-server.mjs) serve os ficheiros atuais. [A inicialização Firebase](../../js/firebase.js) usa a configuração real, sem selecionar automaticamente emuladores em localhost.
- Os testes visuais recentes do Card Lab substituem dados, autenticação e Firebase por fixtures; não reproduzem o acesso real à base.
- `test:backend` usa um projeto `demo-` com o emulador. A proteção dentro de cada ficheiro de teste ainda não é uniforme.
- [O carregamento da aplicação](../../js/app.js) pode atualizar dados ao navegar quando a cache tem mais de 30 segundos e pode chamar `ensureHistory` após cinco minutos. Não é um polling automático a cada 30 segundos.
- [O resumo de missões](../../js/missions.js) consulta detalhes de vários eventos. [Os detalhes de objetivos](../../functions/event-management.js) podem consultar jogos, resumos e recompensas novamente.
- [O processamento de feedback](../../functions/index.js) pode recalcular todos os participantes. `buildHistory` consulta contexto global, avaliações e histórico; [a coleção de cartas](../../functions/card-collection.js) pode voltar a carregar esse contexto para cada jogador.
- As tarefas de abertura/fecho da semana têm uma proteção por ciclo em [policy-runtime.js](../../functions/policy-runtime.js). A frequência de 15 minutos, por si só, não prova um recálculo completo em todas as execuções.
- Scripts de auditoria e as pesquisas de recuperação da Goleador DBS fizeram leituras reais. Repetir a recolha em vez de reutilizar os resultados acrescenta consumo evitável.

**Ainda por determinar:** a parcela atribuível ao desenvolvimento, aos jogadores, a cada função e às repetições de transações. O volume observado torna consultas repetidas e recálculos candidatos prioritários, mas não demonstra a sua contribuição exata. É necessário considerar as revisões efetivamente publicadas, além do código local.

## Ordem de execução

| Fase | Prioridade | Entrega | Critério para avançar |
| --- | --- | --- | --- |
| 1 | P0 | Desenvolvimento e testes isolados | Zero acessos a serviços de produção nos cenários locais |
| 2 | P0 | Diagnósticos com recolha reutilizável e medição | Investigação repetida a partir do mesmo ficheiro sem novas leituras |
| 3 | P1 | Resumo de missões e navegação económicos | Sem um pedido de detalhe por missão no carregamento do resumo |
| 4 | P1 | Recálculos sem repetição de contexto | Leituras globais não se multiplicam pelo número de participantes |
| 5 | P2 | Automações e concorrência ajustadas | Menos leituras em repouso e repetições, sem atrasar entregas |

## Fase 1 — Isolar desenvolvimento e testes

- [x] Definir modos explícitos: fixtures para trabalho visual; emuladores para integração; produção apenas por escolha explícita.
- [x] Fazer o arranque local falhar com uma mensagem clara se o modo escolhido não estiver disponível. Não permitir fallback silencioso para produção.
- [x] Separar a configuração local da configuração publicada. Evitar depender de editar manualmente `js/config.js` antes de cada sessão.
- [x] Ligar Auth, Firestore, Functions e Storage aos emuladores quando usados; a ausência de um deles não pode encaminhar chamadas para o serviço real.
- [x] Usar projeto `demo-` em integração. Introduzir um bloqueio comum antes da inicialização do Admin SDK, verificando emulador e projeto, inclusive na execução direta de um teste.
- [x] Acrescentar uma barreira de rede nos testes visuais: uma tentativa de acesso a endpoints reais de Firebase deve falhar o teste, mesmo que uma fixture deixe de ser aplicada.
- [x] Documentar os modos e os comandos implementados em desenvolvimento e testes. Identificar claramente uma sessão autorizada de produção.

Validação: iniciar com emuladores disponíveis, indisponíveis e parcialmente configurados; simular configuração real e uma fixture ausente; confirmar que nenhum caso de falha inicia tráfego para produção. Verificar também que a versão publicada continua a usar os serviços corretos.

## Fase 2 — Diagnosticar uma vez e analisar localmente

- [x] Inventariar scripts que consultam produção, indicando coleções, filtros, paginação e eventuais escritas. Distinguir auditoria de reparação.
- [x] Separar a recolha da análise. Uma recolha guarda um snapshot datado; alterações ao relatório ou às hipóteses reutilizam esse ficheiro.
- [ ] Limitar a recolha ao período, utilizadores e campos necessários. Uma projeção de campos reduz dados transferidos, mas não deve ser apresentada como redução automática de leituras faturadas.
- [x] Exigir âmbito explícito para recolhas completas. Não iniciar uma nova leitura global em cada execução do relatório.
- [x] Guardar snapshots fora do Git, com retenção definida, sem tokens nem credenciais e com o mínimo de dados pessoais necessário.
- [x] Preferir métricas do Cloud Monitoring para frequência, volume e erros, sem ler documentos apenas para acompanhar consumo.
- [x] Registar por cenário: pedidos, documentos devolvidos, leituras estimadas, chamadas de funções e repetições de transações. Distinguir estimativa local de medição cloud.
- [x] Definir um orçamento de investigação antes de consultas extensas. A reutilização local deve produzir zero novas leituras.

Validação: gerar dois relatórios diferentes a partir do mesmo snapshot, com rede bloqueada. Confirmar que scripts de diagnóstico não executam reparações por defeito.

## Fase 3 — Reduzir carregamentos e consultas de missões

- [ ] Medir uma sessão de referência: entrar, abrir início, navegar para Card Lab, visitar Missões e regressar. Contar operações por página e por mudança de rota.
- [ ] Separar dados globais relativamente estáveis dos dados necessários apenas à página atual.
- [x] Retirar do resumo a necessidade de chamar `getEvent` individualmente para cada missão. Avaliar uma resposta agregada de resumo, reaproveitando o contexto uma única vez por pedido.
- [x] Reservar detalhes administrativos, votos e auditorias para os ecrãs que os usam. O resumo do início não precisa de carregar o detalhe de gestão.
- [x] Definir cache por utilizador, permissões e revisão dos dados. Deduplicar pedidos simultâneos e invalidar após ações relevantes, mudança de conta ou alterações de acesso. Mantida a cache existente por sessão e a sua invalidação; sem introduzir cache global de resultados.
- [ ] Fazer a atualização após uma gravação afetar apenas os dados necessários, quando possível, em vez de recarregar toda a liga.
- [x] Rever `ensureHistory`: evitar reconstruir histórico apenas porque houve navegação ou um novo carregamento da página, sem perder a atualização necessária da carta.
- [x] Manter no servidor a validação de progresso e de reclamação de recompensas; a cache do resumo não pode autorizar prémios.

Aceitação: duplicar o número de missões não duplica as leituras globais de jogos e resumos; navegar dentro da validade da cache não volta a carregar os mesmos dados; alterações reais aparecem após a invalidação adequada. Testar dois utilizadores e os papéis ADMIN, DBS e membro para evitar reutilização indevida de dados.

## Fase 4 — Tornar os recálculos proporcionais à alteração

- [x] Construir um mapa de dependências para `onFeedback`, `onCommunityRating`, `onInitialRating`, `onGame`, `ensureHistory` e para todos os consumidores dos módulos de cálculo alterados.
- [x] Reutilizar um contexto consistente por operação ou lote, em vez de executar `collectionContext` para cada jogador.
- [x] Reaproveitar agregados válidos e antecipar verificações que permitam sair sem trabalho, desde que a correção dos dados fique garantida. O contexto ainda lê as coleções globais uma vez; eliminar essa leitura inicial exige outra fase.
- [x] Agrupar alterações próximas do mesmo jogo ou jogador, com revisão e execução idempotente. Não criar uma espera que atrase a confirmação de uma avaliação ao utilizador. Agrupamento por instância, sem deduplicação distribuída.
- [x] Definir o comportamento quando chega uma alteração durante um recálculo: o trabalho novo não pode perder-se nem ser marcado como já processado.
- [x] Evitar escritas quando o resultado não mudou. Antes de as remover, verificar se outros consumidores dependem delas para invalidar caches ou iniciar tarefas.
- [x] Reduzir leituras repetidas e escritas dentro das operações; preservar as verificações que protegem concorrência e entrega única de recompensas. A duração e os conflitos cloud continuam por medir.
- [x] Preservar integralmente semanas fechadas. Qualquer migração ou reconstrução de dados existentes exige um procedimento separado, datado e com âmbito definido.

Aceitação: os resultados de atributos, OVR, elegibilidade, cartas e recompensas coincidem com os casos de referência. Um lote de avaliações não provoca uma leitura global por participante e por gravação. Eventos duplicados, fora de ordem e concorrentes não duplicam prémios nem perdem atualizações.

## Fase 5 — Afinar automações e concorrência

- [ ] Medir separadamente o consumo sem utilizadores ativos e o consumo causado por ações.
- [x] Rever `settlePaths`, `closeEvents`, `systemHeartbeat`, `scheduledNotifications` e `refreshCardCollection`: otimizado o fecho de eventos e a escrita de coleções. Mantidos os sweeps de recuperação e frequências; limites e motivos documentados no relatório.
- [ ] Preservar as proteções por ciclo da semana e confirmar que existem nas funções publicadas. Uma frequência configurada não equivale a trabalho efetivamente executado.
- [ ] Localizar quais as transações responsáveis pelos estados `ABORTED`; não atribuir todos os conflitos à mesma função sem evidência.
- [ ] Só alterar frequências depois de definir a tolerância de atraso de cada funcionalidade. Documentar impacto em abertura de jogos, missões, notificações e recompensas.

Aceitação: a execução sem trabalho pendente tem custo pequeno e previsível; prazos e entregas continuam corretos; métricas de repetições e leituras por operação melhoram sem aumento de erros.

## Validação e comparação

Executar primeiro com fixtures e emuladores. O arranque local já está protegido. Os cenários adicionais são `npm.cmd run test:read-safety` e `npm.cmd run test:reads`.

```powershell
npm.cmd run check
npm.cmd run test:docs
npm.cmd test
npm.cmd run test:backend
npm.cmd run test:rules
npm.cmd run test:navigation
```

Escolher adicionalmente os testes de missões, percursos, eventos e cartas afetados por cada fase, conforme o [guia de testes](../guides/testing.md). Acrescentar testes de orçamento de leituras que falhem quando uma consulta global se repete por missão ou participante.

| Cenário | Verificação principal |
| --- | --- |
| Edição visual com fixtures | Nenhum pedido a serviços reais; aspeto e interações preservados |
| Navegação repetida | Cache e deduplicação funcionam; sem recargas globais desnecessárias |
| Resumo com mais missões | Contexto global partilhado; sem pedido individual de detalhe por missão |
| Várias avaliações no mesmo jogo | Resultados equivalentes, trabalho agrupado e sem perda de alterações |
| Transações concorrentes | Sem prémios duplicados; menos releituras e conflitos |
| Semana fechada | Dados históricos permanecem inalterados |
| Sessão sem atividade | Custo das automações separado do custo de navegação |

Registar uma linha de base por cenário antes da alteração e repetir o mesmo conjunto de dados depois. Definir metas numéricas por operação após essa medição. Não prometer ficar abaixo de 50 mil leituras/dia sem considerar atividade e crescimento da liga.

Após publicação autorizada, comparar janelas equivalentes de 24 horas e acompanhar durante sete dias. Normalizar também por utilizador ativo, avaliação submetida e consulta de missões. Não usar apenas o total diário: pode diminuir por haver menos atividade.

## Publicação, observação e reversão

- Publicar uma fase de cada vez, depois dos testes correspondentes e de revisão do âmbito.
- Para frontend, usar o script existente `npm.cmd run deploy:frontend` quando houver autorização de publicação.
- No backend, levantar **todas** as funções consumidoras dos módulos partilhados alterados e preparar um comando seletivo com os seletores `functions:peladinhas:NOME`. A lista final depende da implementação; não recomendar deploy completo por defeito.
- Se houver alterações a regras ou índices, incluir apenas os seletores necessários. Não assumir que vão ser necessários nesta proposta.
- Verificar índices necessários antes de depender das novas consultas; não remover verificações de autorização para reduzir leituras.
- Anotar a revisão publicada e o início da janela de observação. Build, testes e capturas locais não confirmam deploy nem redução de consumo em produção.
- Preparar a reversão de cada fase e compatibilidade de contratos de API, tarefas pendentes e caches. Reverter código não deve reverter nem apagar recompensas válidas.

## Critério de conclusão

- [x] Desenvolvimento e testes não contactam produção por acidente nos cenários validados.
- [x] Diagnósticos reutilizam recolhas locais e têm âmbito explícito.
- [x] Há comparação reproduzível de leituras por operação, antes/depois.
- [x] Resumos e recálculos deixam de multiplicar consultas globais.
- [x] Permissões, cálculos, semanas fechadas, missões e recompensas passam os testes.
- [x] Relatório datado distingue o que foi implementado, testado localmente, verificado na cloud e efetivamente publicado.
- [ ] Redução em produção confirmada em janelas comparáveis, sem regressões funcionais.

## Referências externas

- [Faturação de consultas, listeners e leituras de regras](https://firebase.google.com/docs/firestore/pricing).
- [Projetos demo e ligação aos emuladores](https://firebase.google.com/docs/emulator-suite/connect_firestore).
- [Concorrência e repetição de transações](https://firebase.google.com/docs/firestore/transaction-data-contention).
