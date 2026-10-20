# Rever a dificuldade das missões

Usar este procedimento quando houver novos jogos ou se notar um desequilíbrio. A revisão é manual: analisar, explicar e só depois alterar os parâmetros. Não há tarefa automática a mudar objetivos.

## Recolher e comparar

Com uma sessão Firebase autorizada, executar na raiz do projeto:

```powershell
npm.cmd run audit:path-difficulty -- --team-size 5 --output test-results/path-current.json
npm.cmd run audit:path-difficulty -- --team-size 5 --compare docs/reports/path-goals-2026-10-19.json --output test-results/path-comparison.json
```

O script só lê `games`, `gameSummaries`, `games/{id}/feedback` e `games/{id}/pathVoteRevisions`. Guarda apenas agregados, sem nomes, IDs de jogadores/jogos ou votos individuais. Não altera Firestore. `--team-size` aceita 5 a 12; sem esta opção inclui todos os formatos. Comparar formatos separadamente antes de generalizar uma meta de 5x5 para equipas maiores.

Usar `goalDifficulty.statistics` para distribuições, médias, histogramas, limiares e combinações numéricas; golos de equipa e sofridos usam duas observações por jogo, não uma por jogador. Usar `goalDifficulty.missions` para a missão completa, por modelo, fase e dificuldade. As participações não representam jogadores distintos e não são observações independentes.

Nas combinações com estrelas, o script reconstrói os votos às 48 horas. Janelas ainda abertas ficam em `windowPending`; falta de amostra fica em `waiting`; posições não elegíveis ficam em `cancelled`. A percentagem usa apenas `success + failure`; sem casos elegíveis é `null`, nunca 0%. As avaliações no campo superior `ratings` são os resumos atuais, não o corte histórico: não as usar para decidir o sucesso de uma combinação. Esta simulação usa os registos de jogo disponíveis hoje; correções posteriores ao jogo podem mudar os resultados entre consultas.

`comparison` guarda condições antigas/novas, denominadores e percentagens. Uma diferença pode resultar de novos jogos, correções ou novas metas; não a atribuir automaticamente à calibração. Preservar o JSON anterior e guardar a nova análise com outra data/revisão.

## Decidir e implementar

1. Apresentar número de jogos, formatos, cobertura das avaliações e frequências observadas. Não tratar dois jogos como probabilidades definitivas nem inventar dificuldade de GR sem posições elegíveis.
2. Avaliar a missão inteira. Não multiplicar percentagens de condições: golos, vitória, equipa e avaliações podem estar relacionados. Identificar condições triviais, nunca atingidas e combinações iguais em dificuldades diferentes.
3. Explicar as alterações propostas antes de editar. Considerar as três fases, a raridade de cada percurso/fusão e as alternativas disponíveis.
4. Editar `js/path-difficulty.js` e atualizar `PATH_DIFFICULTY_REVISION`. Repetir a auditoria para comparar; registar resultados e limitações num relatório datado, executar `node scripts/update-path-catalogue.mjs` para atualizar os 270 exemplos a partir do código e ligar o relatório no índice.
5. Executar `node --test tests/path-variety.test.js tests/paths.test.js tests/path-window.test.js`, o teste dirigido `tests/path-variety.backend.test.js` num emulador Firestore demo, e `npm.cmd run test:docs`. Fazer build antes de publicar.

As metas aplicam-se apenas a propostas novas. Preservar propostas reveladas, tentativas escolhidas, progresso, recompensas e semanas fechadas. Não é necessária migração ou recálculo. Missões/eventos manuais continuam a usar os alvos definidos pelo administrador; a auditoria não os reescreve.

## Publicação

O módulo é partilhado. Publicar os sete consumidores do servidor e depois o frontend:

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:getPath,functions:peladinhas:pathAction,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:settlePaths,functions:peladinhas:gameAction,functions:peladinhas:feedbackAction"
npm.cmd run deploy:frontend
```

As regras e índices não mudam. Comandos e testes locais não confirmam publicação.
