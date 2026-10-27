# Loja do casino · desenvolvimento local

A loja está disponível no servidor de fixtures. Iniciar com `npm.cmd run dev:casino`, abrir `http://localhost:8081/#/casino` e escolher **Loja de cartas · Pré-visualização local**. Acesso direto: `http://localhost:8081/assets/casino/shop/`.

O catálogo está em [casino-shop-catalog.js](../../js/casino-shop-catalog.js). Há 13 edições à venda: oito metais e cinco jogos. Bronze, prata e ouro especiais custam 1 000, 2 500 e 4 000 DJC. As outras edições começam em 5 000 DJC. Todas têm OVR mínimo; comprar desbloqueia o acabamento, sem aumentar atributos. O retrato é ilustrativo e mostra o OVR mínimo da edição, independentemente do OVR introduzido no laboratório.

| Metal   | OVR mínimo |    DJC |
| ------- | ---------: | -----: |
| Bronze  |         50 |  1 000 |
| Prata   |         65 |  2 500 |
| Ouro    |         75 |  4 000 |
| Platina |         85 |  5 000 |
| Paládio |         88 |  8 000 |
| Irídio  |         90 | 12 000 |
| Ródio   |         93 | 18 000 |
| Ósmio   |         95 | 25 000 |

Os três primeiros requisitos acompanham os limites inferiores dos metais da liga definidos em `calculateBaseCard` e `BASE_EDITIONS`. A progressão de prestígio pertence à loja; não altera o cálculo de OVR nem as cartas base da liga.

As cartas dos jogos são Blackjack (80 OVR), Cardoso Road (82), Roleta Europeia (85), Futebol de Bairro (88) e RIFT//CORE (90). Os desenhos partilham a posição do OVR, nome, posição e atributos, com materiais e cenários próprios. A lupa abre uma pré-visualização ampliada, operável por teclado e fechável com Escape. As antigas edições Fundadores, Visão de Jogo e Royal deixam de estar à venda, mas continuam visíveis em **A minha coleção** se já tiverem sido compradas localmente.

O laboratório permite mudar saldo e OVR para testar falhas. A compra valida os dados apenas no clique, guarda saldo e propriedade numa única entrada de armazenamento local e usa Web Locks para serializar compras entre abas. Uma carta comprada fica desativada e aparece em **A minha coleção**, incluindo depois de recarregar. Os avisos desaparecem após 6,5 segundos e também podem ser fechados.

Esta fase é uma demonstração: os 30 000 DJC iniciais são fictícios. As compras persistem neste navegador enquanto os dados locais forem conservados; não representam propriedade permanente na conta, nem são partilhadas com a carteira dos jogos. Não há SDK Firebase, pedidos à base de dados ou ao Storage nesta página. O acesso pelo casino só aparece em modo fixtures.

Antes de disponibilizar compras reais é necessário implementar uma transação de servidor que confirme saldo, OVR e propriedade, debite uma única vez e integre o desbloqueio permanente na coleção. Também será necessário coordenar a compra com as sessões abertas da carteira do casino. A publicação do frontend, por si só, não implementa essa integração.

Verificação local: `node --test tests/casino-shop.test.js`. Para testar a interface, iniciar `node scripts/dev-server.mjs --port 8082` e executar `node tests/casino-shop.mjs`. O teste bloqueia serviços Firebase reais e guarda capturas em `artifacts/casino-shop/`.

Validação em 27/10/2026: compra, limites exatos dos oito metais, saldo, duplicação, persistência e conservação de compras anteriores passaram. Interface inspecionada em desktop e telemóvel; capturas e ausência de overflow verificadas a 320, 390, 768 e 1440 px. Pré-visualização ampliada testada com Enter/Escape e regresso do foco ao botão. Sem deploy nem validação de compras reais.
