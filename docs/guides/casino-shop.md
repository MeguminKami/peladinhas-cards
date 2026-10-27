# Loja de cartas do casino

A loja está integrada no site em `#/shop`. O menu superior, o menu Mais no telemóvel, o convite do casino no início e o salão têm acessos à loja. Usa a sessão, o tema, os ícones e a carteira DJC do site. O endereço antigo `assets/casino/shop/` redireciona para a rota principal em produção; no servidor de fixtures mantém a demonstração isolada para testes de arte.

## Catálogo e propriedade

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

A compra é uma transação de três documentos: carteira, coleção e carta semanal. Debita `preço × 100` unidades internas, regista um movimento da loja e acrescenta um prémio permanente com origem `casino-shop`. A propriedade é o recibo duradouro: repetir o pedido ou perder a resposta não volta a debitar. Uma falha não deixa débito sem carta nem carta sem débito. Conquistas anteriores e campos da coleção são preservados.

Antes de abrir a loja, a carteira local recupera e confirma lotes pendentes. Não se joga nesta página. Ao sair, o fecho da sessão aplica o delta de jogo, sem substituir o saldo atualizado pela compra. Num dispositivo diferente, o saldo confirmado no servidor continua a ser a autoridade; lotes de jogo ainda não enviados não são saldo disponível da loja.

A GUI apresenta confirmação com o preço, cancelamento, estado de compra, sucesso e erro. O saldo atualizado e a propriedade vêm da resposta da compra. Não há polling ou listeners adicionais para a loja.

## Leituras

- Catálogo, filtros, arte e preços: zero leituras.
- `getCasinoShop`: três documentos de domínio, mais os controlos de identidade/política da infraestrutura existente.
- `buyCasinoCard`: três documentos por tentativa da transação, mais os mesmos controlos. Conflitos podem repetir a transação.
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
