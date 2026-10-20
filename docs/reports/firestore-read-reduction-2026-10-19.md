# Redução de leituras Firestore — 19–20/10/2026

[← Documentação](../README.md) · [Plano e pendências](../plans/firestore-read-reduction.md) · [Desenvolvimento](../guides/development.md) · [Diagnósticos](../guides/firestore-read-diagnostics.md)

Estado: implementação iniciada em 19/10 e validação concluída em 20/10/2026, em fixtures/emulador. **Sem deploy, alteração de dados reais ou confirmação de redução em produção.** A janela cloud referida no plano foi recolhida antes desta implementação; não é uma medição posterior.

## Resultado medido

Comparação reproduzível entre o commit `056c32e` e o código local, com os mesmos dados, relógio e operações. O contador acompanha leituras SDK de documentos, consultas e tentativas de transação, contando pelo menos uma leitura em consultas vazias. Não é uma reprodução da fatura: não contabiliza leituras de entradas de índices ou regras nem o paralelismo entre instâncias cloud.

| Operação | Antes | Depois | Leituras evitadas | Redução |
| --- | ---: | ---: | ---: | ---: |
| Uma submissão de feedback com recálculo de 10 jogadores | 7 713 | 682 | 7 031 | 91,2% |
| Resumo de 20 missões | 385 | 49 | 336 | 87,3% |
| `ensureHistory` com histórico recente e carta atual | 766 | 7 | 759 | 99,1% |
| `closeEvents`, sem entregas vencidas, com arquivo acumulado | 647 | 44 | 603 | 93,2% |

O primeiro cenário contém 10 jogadores, 4 jogos fechados e 400 avaliações submetidas. O cenário de resumo contém 20 missões abertas. O último acrescenta 200 eventos já encerrados/com prémios entregues e 200 recompensas com expiração futura. Não extrapolar este cenário para tarefas com prémios efetivamente vencidos ou competições em curso.

Os pedidos SDK passaram de 354 para 157 no feedback e de 306 para 27 no resumo. Pedidos e documentos lidos são métricas diferentes. Os dez resultados finais de atributos, OVR e IDs de cartas especiais coincidem integralmente com a referência. Os testes backend cobrem adicionalmente elegibilidade, recompensas, concorrência e semanas fechadas.

Reproduzir:

```powershell
npm.cmd run test:read-safety
npm.cmd run test:reads
```

Os resultados detalhados ficam em `test-results/read-budget-baseline.json` e `test-results/read-budget-optimized.json`, ignorados pelo Git. O benchmark usa Firestore local na porta 8090 e projeto `demo-peladinhas-read-budget`, limpando apenas esse projeto demo entre cenários. A referência antiga é extraída do Git para uma pasta ignorada; a credencial sintética é gerada durante o teste, sem abrir credenciais reais.

## Implementação

- Desenvolvimento: fixtures por defeito; emuladores por escolha explícita; produção local apenas através de `dev:production`. O frontend publicado mantém a configuração real. Auth, Firestore, Functions e Storage apontam todos para os emuladores no modo de integração.
- Testes: guarda comum antes da inicialização Admin, exigindo projeto demo/emulador; barreira de rede nos browsers; configuração CLI isolada e debug desativado. Um pedido real faz o teste falhar, mesmo se uma fixture tiver sido esquecida.
- Auditorias: sete scripts passam a reutilizar snapshots por defeito; recolha exige `--live`, âmbito e orçamento. Escritas requerem também `--repair`; emuladores demo mantêm reparações locais. Retenção, dados pessoais e limites do contador estão no guia de diagnósticos.
- Missões: `listEvents` pode devolver os resumos necessários ao início/Missões. Uma operação partilha eventos, jogos e recompensas, sem auditoria administrativa nem um `getEvent` por missão. Resumos de progresso incluem apenas o utilizador autenticado; reclamar prémios mantém a validação autoritativa em transação. O cliente mantém compatibilidade com backend antigo através de fallback.
- Recálculos: um contexto por lote partilha as coleções globais e o feedback de cada jogo entre participantes; concorrência limitada a três jogadores por grupo. Não há cache global de resultados entre utilizadores ou invocações.
- Atualizações concorrentes: feedback do mesmo jogo e avaliações comunitárias do mesmo jogador partilham trabalho dentro da instância. Uma alteração que chega durante o cálculo força uma nova passagem; todos os chamadores aguardam o resultado. Falhas continuam elegíveis para retry. Instâncias distintas continuam independentes.
- Escritas: resumos de jogo, coleção de cartas, histórico, estado e carta semanal não são regravados quando os dados semânticos são iguais. `updatedAt` sozinho não força a escrita. As verificações transacionais de fecho e bloqueio permanecem.
- Navegação: `ensureHistory` sai quando o histórico tem menos de cinco minutos e semana, fase e bloqueio correspondem à carta publicada. Os triggers continuam a processar alterações reais; a reconstrução explícita continua disponível.
- Tarefas: `closeEvents` consulta eventos ativos ou ainda sem entrega, recompensas já vencidas e só carrega jogos/resumos quando uma competição objetiva precisa de ranking. A verificação de entregas antigas deixa de ler todo o arquivo de eventos encerrados. Frequências e prazos não mudam.

Não se executou migração nem recálculo de produção. As otimizações são compatíveis com os dados existentes e não exigem reescrever semanas fechadas. As consultas novas usam filtros simples e ramos OR sobre campos isolados; não se alteraram regras nem índices compostos do projeto.

## Pensamento sobre o impacto diário

O maior multiplicador era repetir contexto e feedback para cada jogador. Com dez participantes, o trabalho global passa a ser pago uma vez por lote, mantendo as leituras individuais necessárias. No resumo, acrescentar missões deixa de repetir todas as consultas globais. No desenvolvimento visual e em análises repetidas de snapshots, o custo Firestore passa a zero.

Não é correto multiplicar os 307 triggers observados por 7 031 e afirmar que foram poupadas milhões de leituras: os dados reais podem ser menores, as instâncias sobrepõem trabalho e não sabemos qual revisão produziu toda a janela. Também não é correto aplicar os 99,1% de `ensureHistory` a pedidos com histórico ausente ou desatualizado.

Para dar escala, usando apenas como hipótese uma redução média de **90% na parcela afetada**, sobre as 508 362 leituras observadas na janela inicial:

| Parcela das leituras que beneficia | Poupança hipotética/dia | Total hipotético/dia |
| --- | ---: | ---: |
| 25% | cerca de 114 mil | cerca de 394 mil |
| 50% | cerca de 229 mil | cerca de 280 mil |
| 75% | cerca de 343 mil | cerca de 165 mil |

Estes valores são cenários, não previsões confirmadas. Ainda não há base para prometer menos de 50 mil leituras/dia. A validação real deve comparar sete dias após publicação com atividade equivalente, normalizando por jogador ativo, submissão e consulta de missões. Separar janelas sem utilizadores para medir automações. Não foram feitas novas consultas a documentos de produção para esta validação local.

## Validação e limites

Validados: 154 testes de lógica, 73 testes backend em emulador limpo, 37 testes de regras, seis testes unitários de isolamento/deduplicação/replay/orçamento e teste de browser da barreira de rede. Navegação e detalhes de eventos passaram em 320/390/768/1440 px; o fluxo push e o teste PWA também passaram. As suites de orçamento comparam quatro operações antes/depois e validam a privacidade e equivalência dos resumos para ADMIN, DBS e membro. Estes testes não confirmam configuração cloud, índices publicados ou entrega push num aparelho real.

A primeira repetição contra um emulador que continha dados de uma execução anterior gerou conflitos de fixtures; a suite foi repetida num projeto demo limpo e passou. A regressão da alteração final à consulta de fecho de eventos passou os 17 testes de eventos.

Continuam deliberadamente fora de uma conclusão cloud:

- Atribuição exata dos 3 709 `ABORTED` e da parcela de consumo proveniente do desenvolvimento.
- Custo real de `settlePaths`, notificações e heartbeat sem utilizadores. Foram revistos: o heartbeat já filtra prémios pendentes; percursos conservam o sweep de recuperação e notificações precisam de contexto para objetivos/rankings. Não se retirou essa recuperação nem se atrasaram entregas sem evidência.
- Separação completa do carregamento global por rota. A cache de 30 segundos, a deduplicação e a invalidação por sessão/ações existentes foram preservadas; não se alongou a validade indiscriminadamente para reduzir consumo à custa de frescura.
- Filtragem mais estreita de cada auditoria: o orçamento limita recolhas, mas `--scope` não altera os filtros do script. Não afirmar que uma leitura global ficou seletiva por ter recebido um rótulo.

## Publicação seletiva e reversão

### Reforço de 20/10/2026 após novo relato de consumo

O detalhe de eventos ainda atualizava a cada 5 segundos, mesmo em separadores escondidos, e permitia sobrepor pedidos lentos. Passou para 60 segundos, apenas com página visível, ligação disponível e sem pedido pendente. Ao sair da página, a atualização é cancelada e respostas tardias são ignoradas. O carregamento inicial e as ações explícitas continuam imediatos. Numa hora continuamente visível, são até 60 atualizações periódicas em vez de 720 (cerca de 92% menos pedidos periódicos, não uma redução medida de leituras totais). Os resultados podem demorar até um minuto a refletir alterações de outros jogadores.

O bloqueio local foi alargado a endereços privados IPv4/IPv6, nomes locais e acesso por ficheiro. Os testes de isolamento passaram: seis casos de segurança existentes, dois casos novos de atualização periódica e browser com fixtures/barreira de produção. Estes testes não consultam documentos cloud. O relato de 100 mil leituras do dia não foi atribuído a uma função ou ao desenvolvimento: não se recolheram novas métricas nem documentos de produção. As otimizações anteriores continuam sem publicação confirmada neste relatório.

Estas alterações adicionais afetam apenas frontend e ferramentas/testes locais. Não exigem migração nem recálculo. A publicação das otimizações anteriores de backend continua a exigir o comando seletivo abaixo.

Regressão adicional: `npm.cmd run test:event-details` passou nas larguras 1440/768/390/320 px; `npm.cmd run test:docs` validou 43 documentos e 327 referências. A alteração não modifica a composição visual do detalhe.

Publicar primeiro backend e depois frontend para ativar os resumos agregados. O script abaixo chama `npx.cmd firebase deploy --project pedalinhas-cards --only` com seletores explícitos `functions:peladinhas:NOME`; não publica todas as Functions, regras ou índices.

```powershell
npm.cmd run deploy:read-reduction
npm.cmd run deploy:frontend
```

Consumidores incluídos no script, por causa dos módulos partilhados de histórico, coleção, eventos e callbacks de recálculo:

| Grupo | Funções selecionadas |
| --- | --- |
| Avaliações e jogos | `onCommunityRating`, `onPlayerPosition`, `onInitialRating`, `onFeedback`, `onGame`, `gameAction`, `feedbackAction`, `correctRating`, `deleteGame` |
| Histórico e cartas | `saveOvrWeights`, `rebuildHistory`, `closeCardWeek`, `openCardWeek`, `ensureHistory`, `refreshCardCollection`, `selectWeeklyCard`, `rebuildLeague`, `saveWeeklyCardPhoto` |
| Eventos e missões | `eventAction`, `voteEvent`, `closeEvents`, `getEvent`, `listEvents`, `claimMission` |
| Percursos | `getPath`, `pathAction`, `onPathGame`, `onPathSummary`, `settlePaths` |
| Manutenção | `maintenanceAction`, `systemHeartbeat` |

Registar a revisão e hora de publicação, comparar janelas equivalentes e observar erros, atraso de prémios, leituras e retries durante sete dias. Para reverter, republicar o código anterior apenas nos mesmos consumidores e no frontend. Não apagar nem desfazer prémios válidos. O fallback cliente permite publicar as duas partes separadamente; enquanto o backend antigo estiver ativo, a redução do resumo não se concretiza.
