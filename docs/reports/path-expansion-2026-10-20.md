# Expansão dos percursos — 20/10/2026

[Referência dos percursos](../reference/player-paths.md) · [Catálogo gerado](../reference/path-mission-catalogue.md)

## Implementação

270 modelos, 18 por cada especialização e fusão. Os níveis intermédio/superior mantêm 17 nas quatro especializações que excluem vitória isolada. Foram preservados os 120 modelos anteriores e acrescentados dez por percurso, com avaliação geral, média entre critérios, comparação estrita, posição/participação, não perder, empate, derrota com desempenho, jogo sem sofrer e combinações com ações/produção coletiva.

Os contadores históricos e sequências do editor não foram importados como períodos: cada tentativa continua limitada ao próximo jogo. Marcar, assistir e contribuir num jogo já correspondem às variantes «jogo a marcar/assistir/contribuir». Uma vitória com estrelas e uma média dos últimos jogos reduzem-se ao único jogo da tentativa. O motor admite as cinco posições registadas. Posição diferente, falta de sete votos ou GR inelegível cancelam preservando progresso. Médias não dispensam amostra por critério. Os limites de golos mantêm a calibração manual de 19/10; esta expansão não afirma nova calibração estatística nem consulta cloud.

Ofertas v4 guardadas, aceites e congeladas continuam intactas. Os modelos novos aparecem nos sorteios futuros e no reroll normal; não há migração destrutiva nem recálculo de semanas fechadas. A raridade e o avanço mantêm as regras existentes. Um objetivo de derrota exige também desempenho; a equipa perder isoladamente não basta.

## Verificação local

- `npm.cmd test`: 155 testes passaram. Cobrem todos os modelos nas três fases e três dificuldades, condições e limites, média compensada versus mínimos individuais, comparação estrita, votos insuficientes, avaliação geral, posições, resultados e ausência de resultado válido. Sorteios verificam alcance dos 18 modelos, ausência de equivalências e avanço compatível com implicações reconhecidas; compatibilidade dos estados antigos preservada.
- Firestore demo: três testes de integração com ofertas do servidor, congelamento, idempotência e apuramento dos objetivos antigos, média, avaliação geral e comparação estrita; amostras insuficientes cancelam sem perder progresso.
- Interface: propostas com média e avaliação geral renderizadas; quatro temas e larguras 1440/768/390/320, teclado e redução de movimento. Capturas desktop/telemóvel inspecionadas, sem cortes nem overflow horizontal.
- Catálogo regenerado pelo script; `npm.cmd run test:docs` validou 37 documentos e 298 referências. `npm.cmd run check` passou.

## Publicação

Não foi executado deploy nem alterado qualquer dado cloud nesta tarefa. Publicar frontend e as sete funções que consomem o motor partilhado:

```powershell
npm.cmd run deploy:frontend
npx.cmd firebase deploy --only "functions:peladinhas:getPath,functions:peladinhas:pathAction,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:settlePaths,functions:peladinhas:gameAction,functions:peladinhas:feedbackAction"
```
