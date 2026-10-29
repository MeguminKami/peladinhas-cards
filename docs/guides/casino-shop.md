# Loja do casino

## Loja da conta

O botão **Loja do casino** no salão abre o catálogo dentro do casino. O saldo apresentado soma carteira e Vault; as compras gastam primeiro a Vault. O preço e o requisito de OVR são definidos pelo catálogo do servidor. O OVR usado é o de `weeklyCards/{uid}`; sem carta registada, o requisito não é cumprido.

A compra usa `casinoSession`, confirma as jogadas pendentes e grava o débito e a conquista permanente em `cardCollections/{uid}` na mesma transação. Uma resposta perdida pode ser recuperada sem nova cobrança. Compras concorrentes da mesma carta só atribuem uma unidade. O acabamento pode ser escolhido na coleção do perfil; as semanas fechadas mantêm os seus snapshots. A compra não aumenta atributos.

Abrir a loja consulta a carteira, sessão, carta semanal e coleção do próprio jogador. As jogadas normais não ganham leituras adicionais. Uma compra nova acrescenta a escrita da coleção às escritas existentes de carteira e sessão. Mantêm-se as leituras de política e utilizador e as tentativas internas por contenção. Não há listeners da loja nem pesquisas de coleções completas.

Validar com `node --test tests/casino-store.test.js tests/casino-shop.test.js`, `node tests/casino-store.mjs` e `npm.cmd run test:casino:backend`. Publicar primeiro `npx.cmd firebase deploy --only functions:peladinhas:casinoSession` e depois `npm.cmd run deploy:frontend`. Não há migração de compras de demonstração para contas reais.

## Laboratório separado

A demonstração soma o saldo de teste da carteira e da Vault. As compras gastam primeiro a Vault e depois a carteira; o laboratório permite definir os dois valores separadamente. Esta carteira de demonstração continua independente da Vault real do jogador no salão. Para os detalhes da implementação, consultar o [relatório da Vault](../reports/casino-vault-2026-10-29.md).

A loja está integrada no site em `#/shop`. O menu superior, o menu Mais no telemóvel, o convite do casino no início e o salão têm acessos à loja. Usa a sessão, o tema, os ícones e a carteira DJC do site. O endereço antigo `assets/casino/shop/` redireciona para a rota principal em produção; no servidor de fixtures mantém a demonstração isolada para testes de arte.

## Catálogo e propriedade

Todas as edições seguem o conteúdo da carta oficial: país, posição, OVR, oito atributos (VEL, FIN, PAS, DRI, DEF, FIS, GR e RES), evolução permanente e playstyles. As cartas normais e da loja partilham [as regras de conteúdo](../../js/card-player-content.js); só muda o desenho. Valores ausentes não são preenchidos com o OVR.

A fotografia ocupa a mesma área quadrada em todas as edições. O foco, zoom e modo de ajuste guardados são aplicados dentro desse quadrado; as coordenadas e dimensões da carta normal não deslocam a fotografia para fora dele. Sem fotografia, usa-se o avatar padrão. Comprar disponibiliza a edição em **Perfil → Escolher carta**, sem a selecionar automaticamente.

O catálogo estático em [casino-shop-catalog.js](../../js/casino-shop-catalog.js) contém 17 edições: oito metais, cinco jogos e quatro premium do Futebol de Bairro. Consultá-lo e filtrar cartas não faz pedidos à base de dados.

| Edição | OVR mínimo | DJC |
| --- | ---: | ---: |
| Bronze Forjado | 50 | 1 000 |
| Prata Reflexo | 65 | 2 500 |
| Ouro Reserva | 75 | 4 000 |
| Platina | 85 | 5 000 |
| Paládio | 88 | 8 000 |
| Irídio | 90 | 12 000 |
| Ródio | 93 | 18 000 |
| Ósmio | 95 | 25 000 |
| Blackjack | 75 | 5 000 |
| Cardoso Road | 75 | 6 500 |
| Roleta Europeia | 75 | 7 500 |
| Futebol de Bairro | 75 | 9 000 |
| RIFT//CORE | 75 | 12 000 |
| P1 · Talento de Bronze | 70 | 8 000 |
| P2 · Velocidade de Prata | 70 | 10 000 |
| P3 · Maestro de Ouro | 70 | 12 000 |
| P4 · Rainha da Final | 70 | 15 000 |

Comprar desbloqueia um acabamento permanente para o comprador; não altera OVR nem atributos. A primeira compra revela a edição no álbum público da liga, mas não a atribui gratuitamente aos outros jogadores. Os detentores e as datas são derivados dos prémios permanentes já carregados em `cardCollections`. Não há uma consulta por edição ou por detentor.

O catálogo de tipos do ADMIN inclui as 17 edições, com arte, OVR e preço. O álbum mostra uma carta por descobrir até existir uma compra. O renderer comum permite apresentar as edições compradas no perfil e na escolha de carta semanal. As semanas fechadas não são reescritas. As coleções anteriores da demonstração, guardadas no navegador, não são convertidas em compras da conta.

## Compra e carteira

[getCasinoShop e buyCasinoCard](../../functions/casino-shop.js) usam as mesmas verificações de identidade, conta, revogação de sessão, App Check e modo global da carteira do casino. O servidor determina o preço e confirma a carta oficial da semana em `weeklyCards`, o OVR e o saldo confirmado em `casinoWallets`. Um pedido não pode escolher o preço, o saldo, o jogador ou os atributos.

A compra é uma transação de quatro documentos: carteira, coleção, carta semanal e histórico da semana anterior. Debita `preço × 100` unidades internas, regista um movimento da loja e acrescenta um prémio permanente com origem `casino-shop`. A propriedade é o recibo duradouro: repetir o pedido ou perder a resposta não volta a debitar. Uma falha não deixa débito sem carta nem carta sem débito. Conquistas anteriores e campos da coleção são preservados.

Antes de abrir a loja, a carteira local recupera e confirma lotes pendentes. Não se joga nesta página. Ao sair, o fecho da sessão aplica o delta de jogo, sem substituir o saldo atualizado pela compra. Num dispositivo diferente, o saldo confirmado no servidor continua a ser a autoridade; lotes de jogo ainda não enviados não são saldo disponível da loja.

A GUI apresenta confirmação com o preço, cancelamento, estado de compra, sucesso e erro. O saldo atualizado e a propriedade vêm da resposta da compra. Não há polling ou listeners adicionais para a loja.

## Leituras

- Catálogo, filtros, arte e preços: zero leituras.
- `getCasinoShop`: quatro documentos de domínio, mais os controlos de identidade/política da infraestrutura existente.
- `buyCasinoCard`: quatro documentos por tentativa da transação, mais os mesmos controlos. Conflitos podem repetir a transação.
- Entrada/saída: operações normais de sincronização da carteira local, que leem carteira e sessão. A loja não sincroniza de novo a cada filtro ou pré-visualização.
- Álbum e detentores: zero consultas adicionais às que a liga já usa para carregar as coleções. A compra invalida a cache local da liga; o próximo destino carrega o estado atualizado. O mecanismo existente de cache do início já acompanha alterações em `cardCollections`.

Não foi necessário alterar regras ou índices: as coleções e carteiras continuam sem escrita direta pelo cliente. As cartas não ficam guardadas em `users`, nem se pesquisa o histórico de jogos para abrir a loja.

## Desenvolvimento e verificação

Usar dados locais. Iniciar `node scripts/dev-server.mjs --port 8082` e abrir `http://localhost:8082/#/shop`. As fixtures de conta, carteira e coleções são independentes dos dados reais.

- Catálogo/render: `node --test tests/casino-shop.test.js tests/card-catalog.test.js`.
- Backend emulado: `npm.cmd run test:casino:shop:backend`.
- Integração visual e compra com fixtures: `npm.cmd run test:casino:shop:ui` com o servidor local acima ativo.
- Demonstração isolada de arte: `node tests/casino-shop.mjs`.
- Documentação: `npm.cmd run test:docs`.

Os testes de navegador bloqueiam serviços Firebase reais. Os acabamentos P1–P4 são SVG/CSS próprios, descritos no [relatório de direção de arte](../reports/casino-premium-art-2026-10-27.md).

## Publicação

Publicar primeiro as duas funções novas e depois o frontend:

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:getCasinoShop,functions:peladinhas:buyCasinoCard"
npm.cmd run deploy:frontend
```

Não é necessário recalcular OVR, migrar coleções ou alterar semanas fechadas. A integração não é confirmação de deploy: só fica disponível no site publicado depois de executar os dois passos.
