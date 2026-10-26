# Casino: Cardoso Road e reset · 26/10/2026

[Guia do casino](../guides/casino.md)

## Resultado publicado

Os cinco jogos foram reconstruídos a partir das fontes atuais em `games`. Cardoso Road usa a carteira Djabucoin partilhada, guarda saldo e ronda atomicamente no dispositivo e confirma os totais online no fim da ronda e ao sair. A preview isolada mantém os créditos demo, sem os importar para o casino.

A nova edição `official-2026-10-26-cardoso-reset` começa com 250 DJC. Snapshots, bónus e jogadas pendentes da edição anterior ficam isolados e não podem ser retomados; o arquivo antigo não foi apagado fisicamente. O reset não altera os jogos de futebol da liga nem semanas fechadas.

O validador da Noite de Glória foi alinhado com `games/futebol/src/config.ts`, versão 0.7.0. A matemática do jogo não foi modificada nesta integração. O módulo partilhado é consumido pelas cinco funções `casinoSession`, `getCasinoWallet`, `grantCasinoCoins`, `settleCasinoSlot` e `onCasinoGame`.

O rosto nas quatro poses e a capa do catálogo foram gerados com as duas fotografias fornecidas pelo utilizador. [Recursos e prompts finais](../../games/cardoso-road/ART-2026-10-26.md). [Original da capa](../../design/casino/cardoso-road.png).

## Validação local

- Suite geral: 204 testes aprovados antes do teste adicional de reset; suite dirigida final: 25 testes aprovados.
- Backend: 7 testes aprovados num emulador Firestore local, incluindo carteiras, concorrência, recibos, permissões e recompensas de futebol.
- Casino: catálogo, temas, teclado, movimento reduzido, jogadas locais, checkpoints e recuperação aprovados com fixtures.
- Blackjack e Roleta: carteira partilhada, rondas, limites, repetição, concorrência e recuperação aprovados.
- Cardoso Road: aposta, repetição do mesmo pedido, recuperação após reabrir, levantamento, derrota e integração do saldo aprovados.
- Catálogo e Cardoso Road inspecionados a 320, 390, 768 e 1440 px; sem overflow horizontal. Capturas em `test-results/cardoso-*`.
- Ligações da documentação verificadas com `npm.cmd run test:docs`.

## Execução cloud autorizada

O utilizador autorizou explicitamente o reset para saldo final de 250, a limpeza lógica do progresso e leituras limitadas a 500 documentos de `users`, 500 de `casinoWallets` e 500 para verificação. Não foram consultadas fotografias ou objetos de Storage.

`scripts/reset-casino.mjs` consultou 25 utilizadores e 13 carteiras, inicializou as 25 contas e verificou 25 carteiras com exatamente 25 000 centésimos (250 DJC), às 19:29:12 UTC. Total: **63 leituras**, dentro do limite de 1 500. A escrita utilizou precondições para não sobrescrever alterações concorrentes. O snapshot local não é publicado.

## Publicação executada

`npm.cmd run deploy:backend` publicou funções, regras Firestore, índices e regras Storage com sucesso. Uma limitação temporária de quota foi recuperada pelo Firebase CLI.

A publicação final incluiu Hosting e as cinco funções do casino para incorporar o alinhamento com a versão 0.7.0. O Firebase confirmou as cinco atualizações e a release de Hosting.

Depois da publicação, os hashes SHA-256 obtidos por HTTP coincidiram com os ficheiros locais de economia, catálogo, carteira, aplicação Cardoso Road, poses e capa. Esta verificação apenas descarregou ficheiros estáticos; não executou a app autenticada nem fez leituras adicionais de Firestore.

Site publicado: https://pedalinhas-cards.web.app/#/casino
