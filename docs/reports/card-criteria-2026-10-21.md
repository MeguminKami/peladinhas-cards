# Ajuste das conquistas de cartas — 21/10/2026

## Regras implementadas

O mínimo das conquistas passa para sete avaliações por jogo e por critério usado. O requisito da carta oficial continua separado: três avaliações iniciais externas. A votação FUTTIES mantém o seu mínimo de votos; a candidatura passa a exigir jogos com a nova amostra de sete avaliações.

| Carta | Alteração |
| --- | --- |
| Melhor em Campo | Nota geral ≥4,5; comparação entre jogadores com sete avaliações válidas. Empates contam. |
| Maestro, Goleador e A muralha | Média do respetivo critério ≥4,4 nos últimos três jogos válidos. |
| Motor da equipa | Média de Físico ≥4,6 nos últimos três jogos válidos. |
| Mãos seguras | Duas notas de GR ≥4,3 entre as últimas três válidas disponíveis. |
| FUT HEROES | Vitória contra adversário ≥3 OVR superior, nota geral **superior a** 3,6 e pelo menos um golo **ou** assistência. Sem percentagem de participação. |
| Carnaval · FUT BIRTHDAY | Primeiras cinco participações todas avaliadas, média geral ≥3,6 e pelo menos uma nota ≥4,0. |
| SHAPESHIFTERS | Mantém dois jogos em cada uma de duas posições; média geral ≥3,6 em ambas. |
| Supernova | Mantém seis golos+assistências e nota geral ≥4,5; retira a participação mínima de 60%. |
| Eclipse | Mantém duas vitórias nas últimas seis participações e nota geral ≥4,2; diferença de OVR passa a ≥1,2. |
| Glacial | Três participações consecutivas como GR, todas com avaliação válida desse critério, com média de GR ≥4,0. Sem limite de golos sofridos nem nota mínima individual adicional. Uma participação noutra posição ou sem amostra interrompe a sequência. |
| TOTS / TOTY | Média geral ≥3,8; mantêm seis/doze jogos, posições, classificação e desempates. |

As restantes condições e validades mantêm-se. A [referência das conquistas](../reference/card-unlocks.md) contém as condições completas.

## Coerência e dados existentes

`CARD_MINIMUM_RATINGS` centraliza a amostra em `js/card-achievements.js`. `functions/card-unlock-rules.js` concentra os critérios e a identificação de Melhor em Campo, reutilizada nos resumos e na coleção. Médias são estabilizadas a doze casas decimais antes da comparação para que, por exemplo, 3,8 em doze jogos não seja rejeitado por um erro binário de arredondamento.

O contexto da coleção reavalia a marca de Melhor em Campo mesmo nos resumos já completos, sem novas leituras de feedback apenas para essa marca. A versão da cache do início foi alterada para não reutilizar resultados anteriores à atualização.

Conquistas já entregues não são revogadas automaticamente. Novas conquistas seguem estes requisitos nos próximos recálculos; os prazos usam as datas originais. Ciclos já apurados e cartas de semanas fechadas mantêm-se preservados. Não foi executado recálculo de dados reais nem consultado Firebase ou Storage de produção.

## Validação local

- 164 testes de lógica passaram, incluindo os limites exatos, notas abaixo do mínimo, seis/sete avaliações, primeira janela de cinco participações e interrupção da sequência de GR.
- Emulador: Melhor em Campo com sete avaliações, concorrente com nota superior e apenas seis avaliações, normalização de resumos antigos, persistência da coleção e prémios por posição.
- A carta oficial continua com o seu requisito próprio, verificado na integração existente.

## Publicação

```powershell
npm.cmd run deploy:card-rules
npm.cmd run deploy:frontend
```

O primeiro comando usa seletores explícitos para os consumidores dos cálculos, critérios e coleção, incluindo `getHome`; não publica regras nem índices. A lista exata consta do script em `package.json`. O frontend também deve ser publicado porque a amostra partilhada e a apresentação das cartas usam os módulos atualizados. Esta atualização ainda não foi publicada.

Seletores (35 funções): `onCommunityRating`, `onPlayerPosition`, `onInitialRating`, `onFeedback`, `onGame`, `saveOvrWeights`, `rebuildHistory`, `closeCardWeek`, `openCardWeek`, `ensureHistory`, `refreshCardCollection`, `selectWeeklyCard`, `rebuildLeague`, `deleteGame`, `saveWeeklyCardPhoto`, `correctRating`, `eventAction`, `voteEvent`, `closeEvents`, `getEvent`, `listEvents`, `claimMission`, `getPath`, `pathAction`, `onPathGame`, `onPathSummary`, `settlePaths`, `gameAction`, `feedbackAction`, `maintenanceAction`, `systemHeartbeat`, `saveTheme`, `ensureGameCards`, `maintenanceRead`, `getHome`.
