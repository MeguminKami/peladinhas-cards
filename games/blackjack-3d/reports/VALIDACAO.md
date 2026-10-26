# Validação — 26 de outubro de 2026

Uniformização das fichas: os dois jogos usam a mesma fonte de desenho, paleta por valor, tipografia, materiais e proporções 3D. Seletores com o mesmo SVG e dimensões nos dois viewports, mantendo a distribuição e contabilidade próprias de cada jogo. Código comum incluído integralmente em cada pacote autónomo.

Afinação posterior do blackjack: Reset, Limpar, Repetir e Jogar colocados no mesmo dock das decisões, sobre o chão prolongado da mesa. Reset desfaz a última alteração do lugar em foco; Limpar remove as fichas desse lugar. Foco visual com halo dourado e sem legenda textual. Revisão visual em 1440 e 390 px, TypeScript e builds standalone/SDK verificados; regressões de interação e apresentação executadas nos dois viewports.

Revisão posterior da roleta: fichas/controlos integrados no tapete, sem timeline e painéis de resumo. Reset global independentemente do foco, Desfazer global, Repetir/Dobrar/Jogar, combinações no diálogo «Apostas». Ficha física agregada por posição com total exato, incluindo 50+50=100 e total misto 100,50; pagamentos voltam a agregar após os movimentos. A suite específica verifica limpeza da mesa, undo do Reset, retorno visual/contabilístico e recuperação de carteira nos dois viewports. Os erros permanecem visíveis; a barra normal de mensagens foi retirada da apresentação visual.

## Funcionalidade

- TypeScript estrito: sem erros.
- 39 testes de motores/carteiras/fichas/apresentação passaram. Cobrem ases, S17, naturais, peek, seguro ganho/perdido, bust, double, DAS, split de ases, resplit, limites, ordem em cinco lugares, 208 IDs físicos, seed contínua, serialização, comandos duplicados e carteiras com timeout após aplicar operação. A soma das denominações das fichas 3D foi verificada em mais de 15000 montantes. A projeção de apresentação preserva a ordem real de distribuição, expõe o 21 do jogador antes de revelar/comprar cartas do dealer e não anuncia resultados/retornos antecipados.
- Suites individuais: 17 testes no blackjack e 11 na roleta. A suite transversal adiciona os testes de carteira/concorrência.
- 44 testes de browser passaram: Microsoft Edge headless, viewports 1440×1000 e 390×844. Cobrem lugares sobre a mesa, decisões flutuantes, seguro/split/double, teclado, cartas ocultas, reload, pagamentos idempotentes, apostas completas da roleta, mute e fallback. Verificam as fichas 3D em quatro mãos e seguro, movimento de recolha/pagamento, liquidação automática e textos dos resultados. O teste temporal vê a carta e o total 21 enquanto a hole card permanece fechada, sem pagamento visível, antes das compras do dealer. Os novos valores 0,50/10/50/500 geram exatamente as respetivas denominações. A interação direta verifica entrada pelo + sem apostar, colocação pela zona do lugar, foco, undo/reset independentes e reload. A apresentação premium verifica logótipo centrado, ausência de legendas de valor duplicadas, saldo ao lado do seletor, fonte local efetivamente carregada e ausência de overflow mobile.
- Geometria Three.js real: 37 números × 3 ângulos iniciais × 2 viewports = 222 chegadas verificadas, com skip e resize. Todos os centros de bolso coincidiram com a posição final da bola. Teste matemático adicional verifica continuidade em 185 trajetórias, com 1000 intervalos cada.
- SDK: montagem, liquidação no host fictício, destruição e destruição enquanto o pedido de saldo está pendente.
- Builds estáticas e bibliotecas SDK ESM compiladas separadamente. Aviso de bundle >500 kB do Three.js registado; gzip JavaScript standalone aproximadamente 153 kB blackjack e 142 kB roleta, além do CSS. Manrope e Cormorant Garamond são WOFF2 locais latinos, aproximadamente 62,5 kB combinados, com licenças OFL distribuídas.

A roleta premium acrescenta cobertura direta no tapete, fichas 3D instanciadas, recolha física de perdas, retorno parcial/equilibrado sem falso push, pagamento automático, escada 0,10 compatível com 0,50 e recuperação de carteira aplicada antes do timeout. Ver ROULETTE_PREMIUM.md para os cenários e a simulação atualizada.

## Matemática e simulação

Enumeradas as 157 apostas em cada um dos 37 resultados: 5809 liquidações exatas. Todas retornam 36 unidades para 37 apostadas no conjunto equiprovável. Zero perde em todas as externas; sobreposições somam retornos sem duplicar a stake.

Simulação: 100000 rondas × 3 seeds por jogo, 600000 rondas totais, sem ajustar probabilidades. Relatório JSON inclui seeds, versões, denominadores e IC 95% por ronda completa.

Roleta, aposta fixa no vermelho: retornos observados 97,212%, 97,526%, 97,436%; teórico 97,2973%.

Blackjack, política declarada de comprar abaixo de 17/parar em 17+, sem seguro/split/double: 94,713%, 93,749%, 94,6975%. Não é estratégia básica; estes números não representam um RTP universal da mesa.

## Apresentação e desempenho

Revisão visual desktop e mobile efetuada, incluindo cartas, mesa, roda, tapete e definições. Modelos/texturas/áudio originais procedurais; sem assets de outra slot. Relatório de recursos e licença MIT do Three.js incluídos.

Baseline anterior às revisões premium: medição headless com SwiftShader e viewport 1440×1000, sem outros testes de browser concorrentes: blackjack com 5×4 mãos, 4 cartas por mão e 6 do dealer, todas visíveis (fixture de render, não ronda financeira), 109 draw calls, 24 geometrias e 60 texturas; p95 66,7 ms, p99 666,6 ms, 92 amostras. Estes valores não descrevem os novos renderers completos. Roleta antiga: 12 draw calls, 12 geometrias, 2 texturas; p95 50,1 ms, p99 233,3 ms, 109 amostras. Inclui arranque, compilação de shaders e redução automática para DPR 0,8. O relatório é diagnóstico de callbacks/renderização em software, não FPS certificados no ecrã.

**A meta de 60 FPS não está certificada nem foi atingida nestas medições headless.** Falta profiler de CPU/GPU/memória no dispositivo físico final, com áudio e efeitos ativos. O utilizador pode exportar métricas da própria sessão pelo Histórico. Sem promessa de mínimo com base em média/headless.

## Integração e limites

Standalone local e SDK disponíveis. O contrato de carteira foi testado com host fictício, não com um backend externo (não foi fornecido). O website deve autenticar e serializar por jogador, implementar idempotência/atomicidade e impor segurança no servidor. A bridge valida origem e janela; nenhum serviço foi publicado.

Estados são guardados por jogador/origem. Uma alteração já persistida noutra aba é rejeitada; exclusão distribuída continua a ser responsabilidade do backend. Falhas ambíguas ficam bloqueadas com o mesmo candidato e ID, sem novo sorteio. Não há sincronização entre dispositivos. Limites de localStorage e intervenção do utilizador no armazenamento continuam a ser limitações do modo local.

Não há dealer humano, física autoritativa de pagamentos, multiplayer, apostas anunciadas complexas nem estratégia básica validada. O fallback 2D é identificado. Os ZIPs não incluem dependências, sessões, browser, caches ou capturas.

Auditoria de fichas/pagamentos: 33.226 liquidações exatas adicionais e 10 cenários browser desktop/mobile passaram. Ver ROULETTE_PAYOUT_AUDIT.md: sem erro nos pagamentos; corrigida a face inclinada que atravessava o corpo 3D, aumentados os valores e o contraste das fichas.

Integração do website: 39 testes lógicos/contrato/RPC e 24 cenários browser afetados verificados em desktop/mobile, incluindo uso dos SDKs compilados com uma carteira partilhada, saldo zero, recusa sem aplicação, timeout e IDs únicos. Sem nomes/símbolos de moeda na interface. Ver WEBSITE_INTEGRATION.md e INTEGRAR_COM_AI.md. Endpoints do website simulados nos testes, sem ligação a um backend externo.
