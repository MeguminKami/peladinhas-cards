# Guia de evolução e progressão v2 · 26/10/2026

## Entrega

Em **Jogadores**, o acesso **(i) Como as tuas estatísticas mudam** abre `#/players/evolution`. A página usa os temas, tipografia e ícones da aplicação, uma composição inspirada num quadro tático, uma curva de contribuições e explicações expansíveis. O simulador funciona inteiramente no navegador e usa o motor partilhado, com pesos de posição de referência. Não acrescenta consultas à base de dados.

O guia distingue base, jogos e recompensas; explica a comparação semanal, inatividade, posição, arredondamento e versões históricas. Não apresenta a base como congelada: as avaliações da comunidade continuam a poder alterá-la. A análise de Jonas no snapshot local encontrou 77 → 81 OVR pela combinação de novas avaliações e recompensas; sem os dois votos novos e sem recompensas o recálculo é 77; com votos novos e sem recompensas é 80; com tudo é 81. Não foi necessária uma nova leitura real para esta análise.

## Motor implementado

[`game-progression.js`](../../js/game-progression.js) implementa o modelo equilibrado com controlo: comparação gradual, bónus próprios de contribuições, modulação por resultado/margem, perdas em maus jogos mesmo numa vitória e desaceleração no topo. A [referência funcional](../reference/progression.md) descreve os valores.

Os tetos e o orçamento de +2,5 OVR exatos aplicam-se **antes** do fator de resultado. Este ajuste em relação ao primeiro protótipo impede um empate de beneficiar um atributo por causa de uma distribuição diferente no teto. As perdas conservam a sua modulação própria. O caso de Vitor, forçando apenas a data para o novo modelo, mantém +3,24625 em Finalização, +0,442 em Defesa e zero em GR; o seu jogo real de 25/10 permanece na fórmula anterior.

Ativação: jogos com data de fecho desde **26/10/2026 às 00:00 UTC**. A `settings/system` existente não é escrita: o baseline versionado introduz defaults 2,6/5/0,6 nessa data, preservando configurações anteriores. Configurações explícitas posteriores podem voltar a ajustar velocidade, ganho e perda máximos. Jogos sem data conservam a compatibilidade anterior. O voto tardio não altera a data da versão do jogo.

`utils.js` escolhe o motor pela data; `player-calculation.js` continua a combinar base, jogos e recompensas. `functions/index.js` grava `base-plus-growth-v2` quando o replay inclui jogos v2. Semanas fechadas são preservadas. A auditoria OVR liga ao guia e deixa de apresentar a fórmula antiga como regra universal.

## Validação local

- `npm.cmd test`: **199 testes passaram**, incluindo seis testes dedicados à transição, políticas futuras, cenário de Vitor, contribuições, N/A, ordem de resultados, limites por posição e travão de elite.
- Integração Firestore num projeto demo em emulador: o trigger publica ganhos v2, uma correção para jogo fraco perdido publica perdas, e uma carta fechada continua intacta.
- `npm.cmd run test:progression-guide`: acesso por Jogadores e URL direto, simulador, derrota, empate, perdas, reposição, teclado e foco, movimento reduzido e os três temas a **320/390/768/1440 px**. Sem overflow horizontal. Capturas de desktop e telemóvel inspecionadas; corrigidas a quebra dos números de secção e opções longas nos selects.
- `npm.cmd run check`: sintaxe ES Modules válida.
- `npm.cmd run build:hosting`: frontend e PWA gerados com sucesso, incluindo o guia e o motor novo. Foi necessário instalar as dependências já fixadas no lockfile da slot, sem alterar a sua configuração ou matemática.
- `npm.cmd run test:docs`: ligações da documentação verificadas.

Nenhum deploy, recálculo real ou escrita cloud foi executado. Estes resultados não comprovam publicação.

## Deploy seletivo e atualização

```powershell
npm.cmd run deploy:frontend
npm.cmd run deploy:progression
```

O segundo script executa o comando seletivo seguinte, incluindo os consumidores que recalculam cartas ou desencadeiam esse cálculo e as ferramentas de manutenção:

```powershell
npx.cmd firebase deploy --project pedalinhas-cards --only "functions:peladinhas:onCommunityRating,functions:peladinhas:onPlayerPosition,functions:peladinhas:onInitialRating,functions:peladinhas:onFeedback,functions:peladinhas:processFeedback,functions:peladinhas:onGame,functions:peladinhas:saveOvrWeights,functions:peladinhas:rebuildHistory,functions:peladinhas:closeCardWeek,functions:peladinhas:openCardWeek,functions:peladinhas:ensureHistory,functions:peladinhas:refreshCardCollection,functions:peladinhas:selectWeeklyCard,functions:peladinhas:rebuildLeague,functions:peladinhas:deleteGame,functions:peladinhas:saveWeeklyCardPhoto,functions:peladinhas:correctRating,functions:peladinhas:eventAction,functions:peladinhas:voteEvent,functions:peladinhas:closeEvents,functions:peladinhas:getEvent,functions:peladinhas:listEvents,functions:peladinhas:claimMission,functions:peladinhas:getPath,functions:peladinhas:pathAction,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:settlePaths,functions:peladinhas:gameAction,functions:peladinhas:feedbackAction,functions:peladinhas:ratingWaiverAction,functions:peladinhas:maintenanceRead,functions:peladinhas:maintenanceAction,functions:peladinhas:systemHeartbeat,functions:peladinhas:saveTheme,functions:peladinhas:ensureGameCards,functions:peladinhas:getHome"
```

Depois, executar **Recalcular liga** na administração para atualizar as cartas abertas e remover descontos antigos de inatividade ainda guardados. Jogos desde a ativação usam v2; os anteriores mantêm v1. Não são necessárias mudanças de regras Firestore, índices ou Storage. O deploy não congela a base comunitária nem transforma as simulações antigas em resultados reais.
