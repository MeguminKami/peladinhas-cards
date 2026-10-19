# Update dos percursos — primeira etapa

> Registo histórico de 18 de outubro de 2026. As regras, limitações e resultados abaixo pertencem a essa etapa. Para o código local atual, consultar a [referência dos percursos](../reference/player-paths.md), o [catálogo v4](../reference/path-mission-catalogue.md) e a [interface validada em 19 de outubro](path-interface-2026-10-19.md). Esta nota não reexecuta testes nem comprova publicação.

Data: 18 de outubro de 2026, Europe/Lisbon.

[← Documentação](../README.md) · plano histórico ausente desta cópia · [Referência funcional](../reference/player-paths.md)

## Estado

Registo histórico da primeira etapa; consultar o [update concluído e validado localmente](path-update-2026-10-18.md) para o estado atual. As limitações abaixo descrevem apenas essa etapa inicial.

Implementação parcial local. Não houve deploy nem validação cloud. O plano aprovado não está concluído. Esta etapa melhora a apresentação e entrega a base de progressão, propostas e reroll; mantém temporariamente o fluxo anterior de associação/apuramento dos jogos.

## Implementado nesta etapa

- Entrada própria em Missões, com tipografia expressiva, percurso vetorial, objetivo atual e ação para continuar, sem duplicar o cabeçalho genérico da categoria.
- Um percurso visível, seletor em popup e escolha de navegação guardada pelo servidor. Explorar não substitui uma tentativa preparada. Tutorial com ícones e passos ao lado da ação principal, foco contido e fecho por Escape.
- Nós únicos maiores, sem grelha Consistência/Ousadia nem ligações cruzadas. Cada nó integra avanço, estado e recompensa. Percursos de 15 nós, ou 25 a GR, em capítulos de cinco.
- Limites próprios de +15 por atributo e +25 a GR, independentes das outras origens. O cálculo partilhado continua a limitar a stat apresentada a 99.
- Cada nó tem 100%. O excedente percorre os nós seguintes da mesma especialização; pode concluir vários, nunca atravessa uma fusão nem passa para outro atributo. No fim do percurso o excedente é registado e explicado, sem recompensa adicional.
- Entregas por nó na mesma transação, IDs estáveis e teto recalculado com as entregas anteriores do mesmo apuramento. Idempotência em reprocessamentos.
- Propostas normais de 25/50/100%, com a terceira proposta a poder surgir como Ícone/150% (4%) ou Ultimate/200% (1%). As raridades usam o componente visual existente; não alteram pontos por nó.
- Dificuldade calculada pelos pontos efetivamente atribuídos por esta origem, incluindo fusões. Patamares em +5 e +10. A fase final pode propor 5 golos ou 4,5★ na dificuldade superior; assistências não ultrapassam duas. Os valores vêm de uma tabela inicial baseada no relatório de calibração, não de aprendizagem automática.
- Um reroll diário global por jogador, com dia calculado em Lisboa. Renovar um trio não altera os restantes nem o avanço. Propostas têm de estar reveladas; repetir pedidos ou abrir noutra sessão não repõe o saldo. O servidor serializa pedidos concorrentes.
- Após uma tentativa apurada, as propostas consumidas são retiradas e a interface sugere o próximo nó elegível.

## Compatibilidade

Os IDs dos nós antigos continuam reconhecidos. Nós, ofertas, tentativas, histórico e cartas anteriores não são apagados. Novas escolhas usam apenas a rota principal; propostas antigas do ramo alternativo continuam acessíveis numa secção recolhida do seletor. A nova proposta tem `proposalVersion: 2`; propostas já guardadas não são regeneradas ao atualizar.

Uma tentativa antiga na etapa 10 mantém a elegibilidade à carta que tinha quando foi escolhida. Propostas novas de especialização têm a carta no último nó, 15 ou 25. O prémio especial não duplica uma carta já entregue. O catálogo de cartas continua a usar os mesmos IDs.

O formato do estado continua compatível com `PATH_VERSION = 1`; `rerollDay`, `completedNodeIds`, `finalOverflow`, `rewards` e `proposalVersion` são aditivos. Esta compatibilidade não substitui a migração necessária para o futuro formato com tentativas pendentes paralelas.

O novo teto afeta os cálculos futuros das cartas abertas. Se existirem entregas antigas path acima do teto anterior, uma reconstrução da carta aberta pode passar a apresentar mais desses pontos. Não se executou recálculo de dados existentes. Os snapshots de semanas fechadas devem continuar preservados pelo fluxo atual de `buildHistory`.

## Falta implementar

- Bloqueio atómico no instante de abertura do próximo jogo, alteração livre da missão antes desse momento e proteção global de um único jogo aberto.
- Várias tentativas em avaliação em paralelo com preparação para o próximo jogo; reserva dos nós afetados.
- Histórico de versões dos votos escrito atomicamente com submissões/edições; reconstrução dos votos válidos no instante exato das 48 horas.
- Contagem visível das 48 horas, mínimo de sete votos por critério e cancelamento sem perda de progresso quando faltar amostra. **O código atual ainda usa o apuramento anterior, com duas avaliações e sem janela de 48 horas.** Não se afirma implementação desse requisito.
- Substituir a restrição provisória do reroll durante qualquer tentativa ativa pelo bloqueio aprovado associado ao jogo.
- Descobertas contextuais, ativação e unificação das fusões, com focos locais e origens retiradas do seletor principal. As dependências anteriores das fusões continuam ativas.
- Direção artística individual das 15 cartas, com conceitos, silhuetas e composições distintos. Nesta etapa mantêm-se os desenhos existentes.
- Migração completa e testes de integração destes novos fluxos antes de declarar o update concluído.

## Validação local

- `npm.cmd test`: 119 testes passaram, incluindo 12 de domínio dos percursos.
- Quatro testes de integração dos percursos passaram no emulador Firestore: associação/apuramento e revisão anteriores; reroll concorrente e persistente; recompensas de vários nós com teto e reprocessamento; carta preservada numa tentativa antiga.
- `node tests/paths.mjs`: passou. Entrada por Missões/perfil, nó único, três propostas com raridade, reroll, tutorial, erro/repetição, teclado, redução de movimento, quatro larguras e quatro temas.
- Interface inspecionada por capturas em desktop e telemóvel. Testes verificam ausência de overflow horizontal em 1440/768/390/320 px; verificam foco após ações e Escape no tutorial.
- `npm.cmd run check` e `npm.cmd run build:hosting`: passaram.
- `npm.cmd run test:docs`: mantém dez ligações antigas em falta para `docs/deploy-feedback-fixes.md` e `docs/reports/experience-review.md`; as ligações novas desta etapa não constam dos erros.
- As capturas ficam em `test-results/paths/`, incluindo entrada em Missões, tutorial, percurso, falha, temas e carta final. São artefactos locais, não prova de publicação nem de validação em aparelho físico.

## Publicação seletiva desta etapa

O backend precisa de publicação: reroll, geração das propostas, transporte de percentagem e limites das entregas não são lógica apenas de frontend. O cálculo comum também é usado nos consumidores de reconstrução de cartas e eventos abaixo. Não houve alteração às regras nem aos índices nesta etapa.

Este comando assume que a primeira versão dos percursos já está publicada. Caso contrário, consultar também a [publicação da versão inicial](player-paths-2026-10-18.md), incluindo as regras privadas de `pathStates`; o estado cloud não foi verificado.

Publicar os consumidores do servidor antes do frontend. Não executar publicação completa de funções por defeito.

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:getPath,functions:peladinhas:pathAction,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:settlePaths,functions:peladinhas:onCommunityRating,functions:peladinhas:onPlayerPosition,functions:peladinhas:onInitialRating,functions:peladinhas:onFeedback,functions:peladinhas:onGame,functions:peladinhas:saveOvrWeights,functions:peladinhas:rebuildHistory,functions:peladinhas:closeCardWeek,functions:peladinhas:openCardWeek,functions:peladinhas:ensureHistory,functions:peladinhas:refreshCardCollection,functions:peladinhas:selectWeeklyCard,functions:peladinhas:rebuildLeague,functions:peladinhas:deleteGame,functions:peladinhas:saveWeeklyCardPhoto,functions:peladinhas:eventAction,functions:peladinhas:voteEvent,functions:peladinhas:closeEvents,functions:peladinhas:getEvent,functions:peladinhas:listEvents,functions:peladinhas:claimMission,functions:peladinhas:maintenanceAction,functions:peladinhas:systemHeartbeat"
npm.cmd run deploy:frontend
```
