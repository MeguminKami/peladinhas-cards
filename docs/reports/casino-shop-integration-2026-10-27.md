# Integração da loja no site principal

27/10/2026. Implementação concluída e verificada localmente; sem leituras do Firebase/Storage reais e sem deploy.

## Âmbito entregue

1. Rota `#/shop` com sessão e cabeçalho do site, temas, navegação superior e acesso pelo menu Mais.
2. Botões para a loja no convite do casino no início e no salão.
3. Marca DJC partilhada entre casino, carteira da loja, preços e confirmação.
4. Dezassete edições no catálogo do ADMIN e no álbum público. No álbum, ficam por descobrir até existir um detentor. A descoberta pública não concede propriedade aos restantes jogadores.
5. Compra permanente com confirmação, cancelamento, estado de carregamento, erros e saldo/propriedade devolvidos pelo servidor.
6. Validação de identidade, conta, política, carta oficial semanal, OVR e saldo; preço exclusivamente determinado pelo catálogo do servidor.
7. Débito e prémio permanentes na mesma transação, sem duplicação em repetições ou concorrência.
8. Propriedade integrada nas coleções, seleção de carta e renderer comum, incluindo fotografia e enquadramento semanal. Sem alterar atributos ou semanas fechadas.
9. Detentores derivados das coleções que a liga já carrega: sem consulta por carta ou por jogador, sem polling e sem listeners adicionais.
10. Fecho da carteira do casino aguardado antes de entrar na loja. O fecho posterior da sessão preserva o débito da compra.

Durante a regressão do ADMIN foi corrigida a perda da identificação do projeto no Card Lab ao trocar de modelo; criar uma composição ou guardar cópia continua a ser uma ação explícita. O acesso de edição foi identificado por «Editar no Card Lab». As edições da loja são acabamentos próprios; o catálogo do ADMIN apresenta-as, sem as encaminhar para o editor de composições genéricas.

## Verificação

- 33 testes de catálogo, conquistas, economia e sessões: passaram.
- Cinco testes de backend no Firestore local: passaram. Cobrem concorrência, repetição, adulteração de preço, saldo e OVR, carta oficial em falta, conta desativada, propriedade, seleção e histórico fechado.
- Teste da loja integrada: passou em 320, 390, 768, 1024 e 1440 px, sem overflow. Inclui cabeçalho, DJC, confirmação/cancelamento, compra, descoberta, detentor e dezassete pré-visualizações no ADMIN.
- O teste integrado confirma uma chamada `getCasinoShop` para abrir e uma `buyCasinoCard` para a compra efetiva; filtros e cancelamento não acrescentam consultas da loja.
- Testes existentes do álbum público, coleções/ADMIN/Card Lab e demonstração isolada: passaram.
- Saldos grandes, identidade longa, fotografia, foco visível e movimento reduzido: verificados localmente. Temas escuro e claro inspecionados.
- Sintaxe ES Modules e documentação: passaram.
- `npm.cmd run build:hosting`: passou; geração local da pasta de Hosting e da PWA.

As capturas estão em `artifacts/casino-shop/integrated-*.png` e `artifacts/casino-shop/long-values-*.png`. Uma build ou captura não confirma publicação nem comportamento com dados reais.

## Leituras e publicação

Cada operação da loja lê três documentos de domínio: carteira, coleção e carta semanal. Somam-se os controlos de identidade/política e a entrada/saída normal da carteira local. As transações podem repetir leituras quando existe conflito. O catálogo público reaproveita as fontes e o mecanismo de invalidação existentes.

Não foram alteradas regras, índices nem cálculos partilhados de OVR. Não há migração de compras fictícias do navegador, recálculo de jogadores ou reescrita de semanas fechadas.

Funções novas a publicar: `getCasinoShop` e `buyCasinoCard`. Publicar primeiro essas funções e depois o frontend, conforme o [guia da loja](../guides/casino-shop.md#publicação). A configuração e os dados cloud não foram consultados nem confirmados nesta tarefa.
