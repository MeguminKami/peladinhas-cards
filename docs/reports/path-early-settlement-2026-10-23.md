# ETC: sucesso antecipado garantido — 23/10/2026

Atualização de 23/10: a hipótese para cada voto em falta passa de zero para **duas estrelas**, mantendo sete votos reais por critério, média atual suficiente, verificação horária e entrega definitiva. Notas reais de zero ou uma estrela continuam permitidas, mas não retiram uma entrega já efetuada. O resultado regista `missingVoteStars: 2`; tentativas pendentes usam a nova regra sem alterar metas ou prazos e resultados históricos conservam a regra original.

Validação desta atualização: 45 testes de lógica dos percursos/quorum e nove testes de integração no emulador aprovados; `test:paths` aprovado nas quatro larguras e temas, com captura móvel inspecionada; `test:docs` aprovado. O emulador desta atualização usou temporariamente a porta 8387, sem acesso à cloud. A configuração temporária foi removida. Os resultados da primeira implementação abaixo referem-se à validação anterior da regra a zero.

## Comportamento implementado

As tentativas com avaliações podem concluir na verificação horária antes das 48 horas. Exigem sete avaliações **reais** válidas em cada critério e sucesso assumindo duas estrelas em todos os votos em falta. O denominador conserva todos os participantes distintos, incluindo autoavaliação e suplentes. A prova usa somas inteiras dos votos, sem arredondar médias para decidir limiares. Médias entre critérios, comparações estritas e condições numéricas são avaliadas em conjunto pelo mesmo avaliador da missão.

Em GR, a antecipação exige autoavaliação numérica, para não antecipar uma tentativa que uma autoavaliação N/A ainda em falta poderia invalidar. Dispensas continuam a contar para o quorum final existente, mas não substituem sete votos reais na antecipação nem retiram participantes da projeção a duas estrelas.

Sem prova suficiente, aguarda o prazo original. Não antecipa falhas nem cancelamentos por falta de votos. Às 48 horas mantém a reconstrução histórica, sucesso/falha com amostra suficiente e cancelamento sem perda quando falta amostra.

O sucesso entregue é definitivo perante novas avaliações e edições. `earlySettlement`, `evaluatedAt` e `guaranteedRatings` ficam no resultado para auditoria; a entrega e o arquivo usam a transação e as chaves idempotentes existentes. Correções dos dados do jogo continuam sujeitas ao mecanismo de revisão administrativa já existente.

## Tentativas em curso e leituras

Não há nova versão obrigatória nem migração cloud. A próxima verificação das tentativas pendentes de janela v3 (propostas v3/v4) já aplica a regra, preservando metas, avanços, jogo associado e prazo original. Resultados entregues e semanas fechadas não são reabertos ou recalculados.

Antes do prazo, cada transação consulta apenas o feedback dirigido ao jogador nos jogos fechados com tentativas pendentes que usam avaliações. Não depende do resumo horário, não consulta revisões históricas nessa fase e não cria um trigger por voto. Depois do prazo, mantém a consulta ao histórico de revisões para reconstruir o corte. Estas são leituras de execução futuras do código; o desenvolvimento não consultou Firebase ou Storage reais.

## Validação local

- `npm.cmd test`: 185 testes aprovados, incluindo sete votos mínimos, limites exatos, médias, condições mistas, suplentes, autoavaliação GR e dispensas.
- `npm.cmd run test:paths`: aprovado; desktop e larguras 768/390/320 px, teclado, redução de movimento e temas. Capturas da missão em avaliação inspecionadas em desktop e telemóvel, sem corte ou overflow horizontal.
- O teste `tests/path-early-settlement.backend.test.js` usa exclusivamente emulador com projeto `demo-`: tentativas já pendentes v3/v4, seis votos ainda à espera, sétimo voto que garante sucesso, ausência de resumo publicado, preparação seguinte preservada e entrega única que resiste a novos votos/edições.
- Regressão de backend: 18 testes aprovados nos ficheiros `path-early-settlement.backend`, `paths.backend`, `path-variety.backend` e `game-flow.backend`. Foi usada uma cópia temporária da configuração com Firestore na porta 8287, pois as portas anteriores estavam ocupadas; a cópia foi removida após os testes.
- `npm.cmd run test:docs`: 62 documentos e 390 referências locais válidas.

O novo teste está incluído em `npm.cmd run test:backend`. A configuração padrão usa a porta 8086; se estiver ocupada, usar uma cópia local da configuração com portas livres, mantendo um projeto `demo-` e apenas Firestore emulado.

## Publicação necessária

Não foi executado deploy nem verificada configuração cloud. Publicar o frontend e os consumidores dos módulos partilhados de percursos/jogo:

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:getPath,functions:peladinhas:pathAction,functions:peladinhas:onPathGame,functions:peladinhas:onPathSummary,functions:peladinhas:settlePaths,functions:peladinhas:gameAction,functions:peladinhas:feedbackAction,functions:peladinhas:ratingWaiverAction"
npm.cmd run deploy:frontend
```

Após a publicação, as tentativas existentes são verificadas na próxima execução horária. Não é necessário relançar missões, recalcular semanas fechadas, publicar regras ou criar índices.

[Referência funcional](../reference/player-paths.md#avaliações-48-horas-e-sete-votos).
