# Direção visual e sonora

Atelier Casino: feltro verde profundo, madeira escura, latão discreto, marfim e luz quente. No blackjack, Manrope e Cormorant Garamond locais em WOFF2 latino com licenças OFL incluídas; Georgia/system-ui nos SVG e como fallback. Sem pedidos de fontes a terceiros em execução. Interface portuguesa, foco visível e controlos HTML independentes do WebGL.

Blackjack: cinco lugares sobre a própria mesa semicircular, avatares redondos e mãos junto de cada lugar, sem painéis de lugares abaixo da mesa. Cartas vetoriais redesenhadas com pips, índices grandes e figuras; verso Atelier Casino bordô/dourado em SVG, também aplicado à capa do deck e à hole card. Decisões flutuantes: Carta verde, Parar vermelho, Dobrar dourado e Dividir azul; total junto à mão ativa. Dealer sem personagem. Não se usam imagens de outra slot.

As fichas da mesa são cilindros 3D com faces, rebordo e faixas, criados a partir de denominações cuja soma é o valor real de cada aposta/mão/seguro. Posicionamento obtido projetando os marcadores responsivos na superfície 3D; não são símbolos HTML nem fotografias. Split e double alteram as pilhas. O dealer recolhe as apostas e entrega os retornos em movimentos 3D, com textos/som distintos para blackjack, vitória normal, dealer rebentado, empate, derrota e mão rebentada. A liquidação é automática, sem confirmação de resumo; o motor/carteira confirma o valor antes da animação e não se inicia outra ronda automaticamente.

Seletor de fichas ornamentais com valor inscrito, sem legenda repetida: 0,20/0,50/1/5/10/25/50/100/500. Botões bordô/dourado com bordas duplas e acentos de cor por ação, inspirados no verso do baralho. O bloco introdutório é substituído por logótipo centrado; saldo ao lado do seletor. Cada evento atualiza a carta e o total imediatamente e aguarda a sua leitura antes de apresentar a jogada seguinte do dealer; só depois começa o pagamento.

Roleta: aro/pista de madeira e latão, rotor com 37 compartimentos, separadores, spindle e bola. Tapete HTML com plenos/externas e seletor de combinações, para evitar precisão subpixel em toque. Uma única ordem da roda liga motor, textura e trajetória. O resultado matemático é confirmado antes de animar.

Áudio original procedural: fichas, cartas, seleção, erro, resultado, blackjack, bust, empate e bola; música opcional como acorde ambiente discreto. Sem ficheiros de terceiros ou alegações «no copyright». Volumes independentes persistentes, desbloqueio por gesto e suspensão com página oculta. Animação e áudio não são autoridade financeira.

Perfis: DPR máximo 1,6, redução para 0,8 se mais de 12 dos últimos 30 frames excederem 32 ms após 45 amostras; sem sombras dinâmicas caras. Render apenas quando a cena muda ou anima. Movimento reduzido disponível e preferência inicial do sistema respeitada. Os modelos não pretendem fotorrealismo nem simulação física autoritativa.
