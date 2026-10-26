# Cartas vistas

A página `#/players/cards` abre por «Cartas», imediatamente depois de Missões na navegação de PC e telemóvel. Tickets fica como ícone acessível à direita de Temas. O catálogo apresenta edições nativas por patamar de prestígio e as edições personalizadas com atribuição comprovada. A preview em `design/cartas-vistas.html` permanece independente e não é incluída no hosting.

## Dados e cobertura

O catálogo reutiliza os dados de `loadLeague`: `cardCollections`, recompensas de eventos, cartas semanais, comparação com a semana anterior e jogadores calculados. Não faz leituras adicionais nem consultas por edição ou detentor. `assembleLeague` conserva essas fontes para o modelo do catálogo.

As atribuições expiradas continuam a contar. Recompensas pendentes, futuras ou revogadas são ignoradas. Detentores são deduplicados por UID; uma edição aparece uma vez. As datas são atribuições documentadas, não uma garantia da primeira descoberta. As coleções existentes podem substituir a data de uma carta temporária numa nova atribuição.

Não se infere uma passagem por Bronze a partir de uma carta Ouro. As cartas base contam apenas quando aparecem nas fontes carregadas. A cobertura de antigas cartas base pode ser incompleta, porque o carregamento normal não lê todo o `users/{uid}/cardHistory`. As edições personalizadas sem atribuição nem definição pública carregada não podem ser enumeradas. Uma recompensa antiga sem critério guardado apresenta apenas a origem; não se inventam metas.

Para recuperar o passado, o próximo passo é uma operação administrativa limitada que leia os snapshots históricos existentes e grave um resumo de edições e detentores da liga. Deve ser autorizada antes de consultar a cloud, dimensionada pelo número de snapshots e idempotente. Não deve recalcular OVR, alterar snapshots ou reabrir semanas fechadas. Este trabalho não executa essa recuperação nem cria dados históricos.

## Requisitos e manutenção

`js/card-catalog-rules.js` é um espelho de apresentação de `CARD_CRITERIA` em `functions/card-unlock-rules.js`; o teste de paridade falha se divergirem. Não avalia elegibilidade. Ao alterar condições no servidor, atualizar o espelho e os resumos em `js/card-catalog-model.js`. Os limites base seguem `calculateBaseCard`. Durações de época e ano usam a política vigente. Percursos têm missões escolhidas dinamicamente: o catálogo descreve a atribuição e remete a condição para a prova escolhida, sem reconstruir tentativas privadas.

## Validação e publicação

Executar `npm.cmd run test:card-catalog`, `npm.cmd run check`, `npm.cmd run test:docs` e `npm.cmd run build:hosting`.

O teste de navegador usa fixtures locais, verifica quatro temas e larguras de 320, 390, 768 e 1440 px, alinhamento, filtros, ficha, nomes longos e teclado. Capturas ficam em `test-results/card-catalog`.

Esta implementação altera apenas o frontend. Publicação: `npm.cmd run deploy:frontend`. Não exige recalcular dados nem publicar funções ou regras.
